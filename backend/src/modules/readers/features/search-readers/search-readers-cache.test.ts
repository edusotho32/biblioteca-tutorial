import { expect, test } from "bun:test";
import { api, testName } from "#tests/api";
import { testReader, testCpf } from "#tests/reader-fixtures";
import { createRedis } from "../../../../infrastructure/redis";
import { sql } from "../../../../infrastructure/postgres";
import { PostgresReaderRepository } from "../../infrastructure/PostgresReaderRepository";
import { invalidateReaderSearchCache, readCachedSearch, writeCachedSearch } from "../../infrastructure/searchCache";
import { searchReadersCached } from "./searchReadersCached";

type ReaderJson = Awaited<ReturnType<typeof testReader>>;

async function search(q?: string) {
  const url = q !== undefined ? `/leitores?q=${encodeURIComponent(q)}` : "/leitores";
  const response = await api("GET", url);
  expect(response.status).toBe(200);
  return {
    cache: response.headers.get("X-Cache"),
    readers: (await response.json()) as ReaderJson[],
  };
}

test("UC10: a segunda busca pelo mesmo termo vem do cache", async () => {
  const reader = await testReader();
  const first = await search(reader.nome);
  expect(first.cache).toBe("MISS");

  const second = await search(reader.nome);
  expect(second.cache).toBe("HIT");
  expect(second.readers).toEqual(first.readers);
});

test("UC10: termos com espaços ou maiúsculas compartilham o cache", async () => {
  const reader = await testReader();
  const term = reader.nome;

  const first = await search(term.toUpperCase());
  expect(first.cache).toBe("MISS");

  const second = await search(`  ${term.toLowerCase()}  `);
  expect(second.cache).toBe("HIT");
  expect(second.readers).toEqual(first.readers);
});

test("UC10: busca sem query e com query vazia compartilham o cache", async () => {
  await search("");
  const warm = await search();
  expect(warm.cache).toBe("HIT");
});

test("UC10: cadastrar, editar e excluir leitor invalidam o cache", async () => {
  await search("");
  expect((await search("")).cache).toBe("HIT");

  const reader = await testReader();
  const afterCreate = await search("");
  expect(afterCreate.cache).toBe("MISS");
  expect(afterCreate.readers.some(r => r.id === reader.id)).toBe(true);

  const renamed = testName("Leitor");
  const updateRes = await api("PUT", `/leitores/${reader.id}`, {
    nome: renamed,
    cpf: reader.cpf,
    email: reader.email,
    telefone: reader.telefone,
  });
  expect(updateRes.status).toBe(200);

  const afterUpdate = await search(renamed);
  expect(afterUpdate.cache).toBe("MISS");
  expect(afterUpdate.readers.some(r => r.id === reader.id && r.nome === renamed)).toBe(true);

  const deleteRes = await api("DELETE", `/leitores/${reader.id}`);
  expect(deleteRes.status).toBe(204);

  const afterDelete = await search(renamed);
  expect(afterDelete.cache).toBe("MISS");
  expect(afterDelete.readers.some(r => r.id === reader.id)).toBe(false);
});

test("UC10: resultado gravado em geração antiga não é lido", async () => {
  const term = testName("Termo");
  const read = await readCachedSearch(term);
  expect(read!.readers).toBeNull();

  await invalidateReaderSearchCache();
  await writeCachedSearch(term, read!.generation, [
    { id: 9999, name: "Velho", cpf: "123", email: "a@a.com", phone: "123" },
  ]);

  expect((await readCachedSearch(term))!.readers).toBeNull();
});

test("UC10: sem Redis a busca responde BYPASS a partir do Postgres", async () => {
  const dead = createRedis("redis://127.0.0.1:1", { autoReconnect: false });
  const repo = new PostgresReaderRepository(sql);
  const result = await searchReadersCached("qualquer", repo, dead);
  expect(result.cache).toBe("BYPASS");
  expect(Array.isArray(result.readers)).toBe(true);
  await invalidateReaderSearchCache(dead);
});


test("UC10: depois de um seed (POST /seed), a proxima busca eh MISS", async () => {
  await search("");
  expect((await search("")).cache).toBe("HIT");

  const seedRes = await api("POST", "/seed");
  expect(seedRes.status).toBe(200);

  const afterSeed = await search("");
  expect(afterSeed.cache).toBe("MISS");
});

/*
 * ============================================================================
 * 06 Para discutir
 * ============================================================================
 *
 * 1. Valeu a pena? A busca de autores faz 1 + N consultas; a de leitores, uma só.
 *    O que o cache economiza aqui? Em que situação ele passaria a compensar?
 *    R: Leitores não tem o problema 1+N de Autores, mas sua busca executa filtros
 *       com ILIKE em múltiplos campos (nome, email, cpf formatado e dígitos) e
 *       deserialização de objetos no Node/Bun. O cache economiza conexões, I/O e
 *       CPU do PostgreSQL em requisições repetidas (como a navegação padrão sem termo
 *       ao abrir a página). Ele compensa expressivamente sob alta carga concorrente
 *       (muitas buscas/segundo) ou tabelas volumosas onde o ILIKE faz sequential scan.
 *
 * 2. Dados pessoais no Redis (LGPD):
 *    R: O Redis armazena CPF, e-mail e telefone em memória e sem criptografia por padrão.
 *       O TTL de 60 segundos e a ausência de persistência em disco (volume) limitam o tempo
 *       de exposição de dados legados, mas ampliam a superfície de ataque para qualquer
 *       serviço ou pessoa com acesso ao Redis em tempo real. Em um sistema de produção,
 *       o ideal seria cachear somente os identificadores (IDs) ou aplicar criptografia/pseudonimização
 *       no payload do cache e isolar o Redis com ACLs e rede interna restrita.
 *
 * 3. Por que geração, e não DEL?
 *    R: Em concorrência, se usássemos apenas DEL: uma busca pode ler o banco relacional
 *       antes de uma escrita, a escrita altera o banco e dá DEL na chave, e depois a busca antiga
 *       grava o resultado defasado no cache, gerando inconsistência permanente até nova alteração
 *       ou expiração de TTL. Com gerações (INCR geração), o resultado antigo é gravado na chave
 *       da geração anterior e nunca mais será lido por consultas subsequentes, blindando contra
 *       race conditions sem lock distribuído.
 *
 * 4. Invalidar tudo vs invalidar só os termos afetados:
 *    R: Invalidar apenas termos afetados exigiria rastrear todas as buscas anteriores que
 *       continham aquele leitor (índice reverso no Redis de leitorId -> termos), aumentando a
 *       complexidade de escrita, o consumo de memória e a fragilidade a falhas parciais.
 *       A invalidação por geração é simples, atômica (O(1)), robusta e garante coerência imediata.
 */
