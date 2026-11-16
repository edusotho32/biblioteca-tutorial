import { expect, test } from "bun:test";
import { api, apiForm, testAuthor } from "#tests/api";
import { FAKE_JPEG, imageForm, JPEG, PNG } from "#tests/images";
import { getObject } from "../../../../infrastructure/storage";
import { authorshipIntegration } from "../../../../integration/authorshipIntegration";
import { ServiceUnavailable } from "../../../../shared/errors";
import { MAX_IMAGE_BYTES } from "../../../../shared/images";
import { photoKey } from "../../infrastructure/photos";
import { removeAuthorPhoto } from "./removeAuthorPhoto";
import { uploadAuthorPhoto } from "./uploadAuthorPhoto";

/*
 * Testes de aceite da atividade. Cada um começa como test.todo: o bun test lista,
 * mas não executa. Quando implementar a parte que um teste cobre, troque
 * test.todo por test e rode a suíte. Não altere o que os testes esperam.
 */

const sendPhoto = (id: number, bytes: Uint8Array, name = "foto.png", type = "image/png") =>
  apiForm("PUT", `/autores/${id}/foto`, imageForm("foto", bytes, name, type));

const authorById = async (id: number) => (await api("GET", `/autores/${id}`)).json();

test("UC26: a chave da foto pertence ao módulo Autoria", () => {
  expect(photoKey(7)).toBe("autoria/autores/7/foto");
});

test("UC26: envia a foto, devolve fotoUrl e serve os mesmos bytes", async () => {
  const author = await testAuthor();
  const response = await sendPhoto(author.id, PNG);
  expect(response.status).toBe(200);
  const { fotoUrl } = await response.json();
  expect(fotoUrl).toMatch(new RegExp(`^/api/autores/${author.id}/foto\\?v=\\d+$`));

  const photo = await api("GET", fotoUrl.replace(/^\/api/, ""));
  expect(photo.status).toBe(200);
  expect(photo.headers.get("Content-Type")).toBe("image/png");
  expect(new Uint8Array(await photo.arrayBuffer())).toEqual(PNG);
  expect((await authorById(author.id)).fotoUrl).toBe(fotoUrl);
  expect(await getObject(photoKey(author.id))).not.toBeNull();
});

test("UC26: trocar a foto substitui o objeto e muda a fotoUrl", async () => {
  const author = await testAuthor();
  const first = (await (await sendPhoto(author.id, PNG)).json()).fotoUrl;
  await Bun.sleep(5);
  const second = (await (await sendPhoto(author.id, JPEG, "foto.jpg", "image/jpeg")).json()).fotoUrl;
  expect(second).not.toBe(first);
  const photo = await api("GET", `/autores/${author.id}/foto`);
  expect(photo.headers.get("Content-Type")).toBe("image/jpeg");
  expect(new Uint8Array(await photo.arrayBuffer())).toEqual(JPEG);
});

test("UC26: recusa o que não é imagem (400), o que passa de 2 MB (413) e autor inexistente (404)", async () => {
  const author = await testAuthor();
  expect((await sendPhoto(author.id, FAKE_JPEG, "foto.jpg", "image/jpeg")).status).toBe(400);
  const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
  big.set(PNG);
  expect((await sendPhoto(author.id, big)).status).toBe(413);
  expect((await sendPhoto(2147483647, PNG)).status).toBe(404);
  // nada disso deixou foto para trás
  expect((await authorById(author.id)).fotoUrl).toBeNull();
  expect((await api("GET", `/autores/${author.id}/foto`)).status).toBe(404);
  expect((await api("GET", "/autores/2147483647/foto")).status).toBe(404);
  expect(await getObject(photoKey(author.id))).toBeNull();
});

test("UC26: remover a foto zera fotoUrl e apaga o objeto do bucket", async () => {
  const author = await testAuthor();
  await sendPhoto(author.id, PNG);
  expect((await api("DELETE", `/autores/${author.id}/foto`)).status).toBe(204);
  expect((await authorById(author.id)).fotoUrl).toBeNull();
  expect((await api("GET", `/autores/${author.id}/foto`)).status).toBe(404);
  expect(await getObject(photoKey(author.id))).toBeNull();
  expect((await api("DELETE", "/autores/2147483647/foto")).status).toBe(404);
});

test("UC26: sem RustFS, 503 e o autor continua como estava", async () => {
  const author = await testAuthor();
  const image = { bytes: PNG, type: "image/png" as const };
  await expect(uploadAuthorPhoto(author.id, image, authorshipIntegration, { client: null })).rejects.toBeInstanceOf(ServiceUnavailable);
  expect((await authorById(author.id)).fotoUrl).toBeNull();

  await sendPhoto(author.id, PNG);
  await expect(removeAuthorPhoto(author.id, null)).rejects.toBeInstanceOf(ServiceUnavailable);
  expect((await authorById(author.id)).fotoUrl).not.toBeNull();
});

test("UC26: enviar e remover a foto invalidam o cache da busca de autores", async () => {
  const author = await testAuthor();
  const search = async () => {
    const response = await api("GET", `/autores?q=${encodeURIComponent(author.nome)}`);
    return { cache: response.headers.get("X-Cache"), authors: await response.json() as { fotoUrl: string | null }[] };
  };
  await search();
  expect((await search()).cache).toBe("HIT");

  await sendPhoto(author.id, PNG);
  const afterUpload = await search();
  expect(afterUpload.cache).toBe("MISS");
  expect(afterUpload.authors[0]!.fotoUrl).not.toBeNull();

  expect((await search()).cache).toBe("HIT");
  expect((await api("DELETE", `/autores/${author.id}/foto`)).status).toBe(204);
  const afterRemove = await search();
  expect(afterRemove.cache).toBe("MISS");
  expect(afterRemove.authors[0]!.fotoUrl).toBeNull();
});

test("UC08: excluir o autor apaga a foto do bucket", async () => {
  const author = await testAuthor();
  await sendPhoto(author.id, PNG);
  expect(await getObject(photoKey(author.id))).not.toBeNull();
  expect((await api("DELETE", `/autores/${author.id}`)).status).toBe(204);
  expect(await getObject(photoKey(author.id))).toBeNull();
});

/*
 * =============================================================================
 * 07 Para discutir — Respostas
 * =============================================================================
 *
 * 1. A ordem das escritas.
 *    - No envio: gravamos o objeto no RustFS antes de atualizar a coluna no Postgres.
 *      Se o processo morrer entre as duas etapas, sobra um arquivo no bucket sem
 *      referência no banco (um objeto órfão), mas o autor continua consistente
 *      (sem foto ou com a versão anterior). Na ordem inversa (banco antes do objeto),
 *      se o processo morresse no meio, o Postgres registraria uma data apontando para
 *      um arquivo inexistente no storage, quebrando a interface do usuário com 404.
 *    - Na remoção: zeramos a coluna no Postgres antes de apagar o objeto no RustFS.
 *      Se o processo morrer entre as duas, para o usuário a foto já sumiu com sucesso
 *      (a coluna é NULL) e resta apenas um arquivo órfão no storage. Na ordem inversa,
 *      se o processo morresse após apagar o objeto mas antes do UPDATE, o banco ainda
 *      teria a data ativa e geraria requisições para um arquivo que já não existe.
 *    - Um dos estragos é aceitável porque objetos órfãos no storage são apenas
 *      desperdício de espaço físico (podem ser limpos assincronamente). O outro
 *      estrago é inaceitável porque quebra a integridade referencial da aplicação,
 *      gerando erros visíveis de imagem corrompida/404 em runtime.
 *
 * 2. Objetos órfãos.
 *    - Situações que geram órfãos:
 *      a) Falha ou término do processo após o putObject no RustFS e antes do COMMIT no Postgres;
 *      b) Falha no RustFS ou na rede durante o discardObject após remoção da foto ou exclusão do autor
 *         (como o discardObject roda após o COMMIT e engole erros para não falhar a transação);
 *      c) Exclusão concorrente do autor durante o upload da foto.
 *    - Identificação e limpeza: uma rotina periódica (cron/job em lote) pode listar
 *      os objetos no bucket com client.list({ prefix: "autoria/autores/" }), extrair
 *      o identificador do autor da chave (autoria/autores/:id/foto) e consultar o Postgres:
 *      SELECT id FROM autores WHERE id = ${id} AND foto_atualizada_em IS NOT NULL.
 *      Se o autor não existir ou a coluna for nula, o objeto pode ser descartado.
 *    - Cuidado essencial: a rotina precisa checar a data de modificação/criação do objeto
 *      no storage. Objetos muito recentes (ex: menos de 1 hora ou 24 horas) devem ser
 *      ignorados para não excluir uma foto cujo upload acabou de ocorrer e cuja transação
 *      no banco ainda está em andamento.
 *
 * 3. Tudo passa pelo backend.
 *    - fotoUrl: em vez de uma rota interna do backend (/api/autores/:id/foto?v=...),
 *      a URL passaria a ser uma URL pública absoluta pré-assinada gerada para o subdomínio
 *      de mídia/CDN (ex: https://midia.biblioteca.com/autoria/autores/7/foto?X-Amz-Signature=...).
 *    - Cache-Control e ?v=: o controle de cache passaria para os cabeçalhos das respostas
 *      diretas do S3/CDN. O ?v= deixaria de ser necessário se a própria assinatura ou chave
 *      for efêmera/única, ou se a CDN suportar invalidação por hash/etags.
 *    - Decisão de acesso e prazo: o backend continua decidindo QUEM pode ver (gerando a URL
 *      assinada apenas para clientes autorizados), enquanto o storage/S3 e a CDN impõem
 *      POR QUANTO TEMPO o link é válido, validando a expiração da assinatura criptográfica.
 *
 * 4. Chave fixa ou chave nova.
 *    - Chave fixa (autoria/autores/:id/foto) com versão no ?v=:
 *      A foto antiga é sobrescrita no mesmo local pelo putObject, evitando acúmulo de
 *      arquivos velhos no bucket. O cache do navegador é renovado via query string (?v=).
 *      Em caso de envios concorrentes, o último putObject sobrescreve o conteúdo e o
 *      UPDATE que vencer no banco define a versão final.
 *    - Chave nova a cada envio (com hash ou timestamp na chave e guardada no Postgres):
 *      A foto antiga continua no storage até que uma rotina a exclua explicitamente.
 *      O cache do navegador torna-se imutável de verdade (nova URL = novo recurso,
 *      sem dependência de query string). Em envios simultâneos, o banco define a chave
 *      vencedora atomicamente, e a chave derrotada fica órfã no bucket aguardando expurgo.
 *
 * 5. A foto é um dado pessoal (LGPD).
 *    - Outras cópias que continuam existindo além do bucket:
 *      a) Cache local no navegador de quem já visualizou a foto (com max-age de 1 ano e immutable);
 *      b) Proxies reversos, bordas de CDN e caches intermediários de rede;
 *      c) Snapshots e volumes físicos persistentes (ex: volume rustfsdata);
 *      d) Cópias de segurança (backups completos e incrementais do storage);
 *      e) Logs do servidor web que armazenem requisições ou caches efêmeros de proxy.
 *    - Para atender a um pedido de exclusão da LGPD em um sistema real, o processo deve:
 *      expurgar o objeto do bucket primário, invalidar/purgar todos os caches de borda (CDN),
 *      garantir que futuras requisições respondam 404/410 impedindo revalidação, e aplicar
 *      políticas documentadas de rotação e expurgo de backups ou destruição de chave criptográfica
 *      (crypto-shredding) onde a imagem gravada não possa mais ser decifrada.
 */
