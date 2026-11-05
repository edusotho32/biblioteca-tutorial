# 📚 ATIVIDADE OFICIAL: CACHE NA BUSCA DE LEITORES (TEES II - IFES)

**Professor:** Ricardo Maróquio  
**Branch da Atividade:** `atividade-cache-leitores`  
**Referência:** Cache de Autores (`src/modules/authorship/`)

---

## 🚨 NÃO EXCLUA SEU FORK!
Seu fork `edusotho32/biblioteca-tutorial` já está 100% configurado, sincronizado com o do professor e pronto para a entrega!

---

## 🎯 RESUMO DO ENUNCIADO OFICIAL DO MARÓQUIO

Nos passos 01 a 03 da aula, a busca de autores (UC06) ganhou um cache no Redis com invalidação por geração.  
Agora é a sua vez: **leve o mesmo padrão para a busca de leitores (UC10)**, sozinho, partindo do código de referência que já está no projeto.

### 📋 As 5 Diferenças Críticas de Leitores em Relação a Autores:
1. **Onde fica o COMMIT:** Em Leitores, quem abre a transação é a rota (`create-reader/route.ts`, `update-reader/route.ts`, `delete-reader/route.ts`). A invalidação `invalidateReaderSearchCache()` **DEVE FICAR NA ROTA**, logo após o `await inTransaction(...)`.
2. **A chave tem dono:** O prefixo da chave é `leitores` (`redisKey("leitores", "buscas", ...)`). Em `backend/scripts/check-boundaries.ts`, registrar `leitores: "readers"` no `KEY_OWNERS`.
3. **Alguém escreve direto na tabela (Seed):** O seed escreve via SQL direto. A rotina `refreshDerivedData()` em `backend/src/integration/derivedData.ts` deve chamar `invalidateReaderSearchCache()`.
4. **O termo buscado:** `GET /api/leitores` e `GET /api/leitores?q=` caem no mesmo lugar. Normalizar o termo com `(term ?? "").trim().toLocaleLowerCase("pt-BR")`.
5. **Classe com repositório:** O caso de uso `SearchReaders` é uma classe que recebe `ReaderRepository`. O cache envolve a busca original.

---

## 🗺️ MAPA DOS ARQUIVOS DA ATIVIDADE

```text
backend/
├── scripts/
│   └── check-boundaries.ts              <-- ✏️ EDITAR: adicionar 'leitores: "readers"' em KEY_OWNERS
└── src/
    ├── integration/
    │   └── derivedData.ts               <-- ✏️ EDITAR: adicionar invalidateReaderSearchCache()
    └── modules/
        └── readers/                     <-- 📁 TUDO DA ATIVIDADE FICA AQUI!
            ├── index.ts                 <-- ✏️ EDITAR: exportar invalidateReaderSearchCache
            ├── infrastructure/
            │   └── searchCache.ts       <-- 📄 CRIAR: funções Redis (HSETEX com geração)
            └── features/
                ├── create-reader/
                │   └── route.ts         <-- ✏️ EDITAR: invalidar cache após inTransaction
                ├── update-reader/
                │   └── route.ts         <-- ✏️ EDITAR: invalidar cache após inTransaction
                ├── delete-reader/
                │   └── route.ts         <-- ✏️ EDITAR: invalidar cache após inTransaction
                └── search-readers/
                    ├── route.ts         <-- ✏️ EDITAR: adicionar cabeçalho X-Cache
                    ├── searchReadersCached.ts      <-- 📄 CRIAR: orquestrador Cache-Aside
                    └── search-readers-cache.test.ts <-- 📄 CRIAR: testes automatizados
```

---

## 🚀 PASSO A PASSO DA IMPLEMENTAÇÃO

### PASSO 1: Registrar Dono da Chave em `backend/scripts/check-boundaries.ts`
No objeto `KEY_OWNERS`:
```typescript
const KEY_OWNERS: Record<string, string> = {
  autoria: "authorship",
  acervo: "catalog",
  leitores: "readers", // <-- ADICIONAR ESTA LINHA
};
```

---

### PASSO 2: Criar `backend/src/modules/readers/infrastructure/searchCache.ts`
```typescript
import type { RedisClient } from "bun";
import { ready, redis, redisKey } from "../../../infrastructure/redis";
import type { Reader } from "../domain/Reader";

export type CacheStatus = "HIT" | "MISS" | "BYPASS";

const TTL_SECONDS = 60;
const GENERATION = redisKey("leitores", "buscas", "geracao");

function generationHash(generation: number): string {
  return redisKey("leitores", "buscas", String(generation));
}

function field(term: string): string {
  return `q:${(term ?? "").trim().toLocaleLowerCase("pt-BR")}`;
}

export async function readCachedSearch(
  term: string,
  client: RedisClient | null = redis,
): Promise<{ generation: number; readers: Reader[] | null } | null> {
  if (!client) return null;
  try {
    await ready(client);
    const generation = Number((await client.get(GENERATION)) ?? 0);
    const cached = await client.hget(generationHash(generation), field(term));
    return { generation, readers: cached === null ? null : (JSON.parse(cached) as Reader[]) };
  } catch (error) {
    console.warn("Cache de leitores indisponível:", (error as Error).message);
    return null;
  }
}

export async function writeCachedSearch(
  term: string,
  generation: number,
  readers: Reader[],
  client: RedisClient | null = redis,
): Promise<void> {
  if (!client) return;
  try {
    await ready(client);
    await client.send("HSETEX", [
      generationHash(generation),
      "EX",
      String(TTL_SECONDS),
      "FIELDS",
      "1",
      field(term),
      JSON.stringify(readers),
    ]);
  } catch (error) {
    console.warn("Cache de leitores indisponível:", (error as Error).message);
  }
}

export async function invalidateReaderSearchCache(client: RedisClient | null = redis): Promise<void> {
  if (!client) return;
  try {
    await ready(client);
    await client.incr(GENERATION);
  } catch (error) {
    console.warn("Cache de leitores indisponível:", (error as Error).message);
  }
}
```

---

### PASSO 3: Criar `backend/src/modules/readers/features/search-readers/searchReadersCached.ts`
```typescript
import type { RedisClient } from "bun";
import { redis } from "../../../../infrastructure/redis";
import type { Reader } from "../../domain/Reader";
import type { ReaderRepository } from "../../domain/ReaderRepository";
import { readCachedSearch, writeCachedSearch, type CacheStatus } from "../../infrastructure/searchCache";
import { SearchReaders } from "./SearchReaders";

export async function searchReadersCached(
  term: string | undefined,
  repository: ReaderRepository,
  client: RedisClient | null = redis,
): Promise<{ readers: Reader[]; cache: CacheStatus }> {
  const normalizedTerm = term ?? "";
  const cached = await readCachedSearch(normalizedTerm, client);
  if (cached?.readers) return { readers: cached.readers, cache: "HIT" };
  const readers = await new SearchReaders(repository).execute(term);
  if (!cached) return { readers, cache: "BYPASS" };
  await writeCachedSearch(normalizedTerm, cached.generation, readers, client);
  return { readers, cache: "MISS" };
}
```

---

### PASSO 4: Atualizar `backend/src/modules/readers/features/search-readers/route.ts`
```typescript
import type { Hono } from "hono";
import { sql } from "../../../../infrastructure/postgres";
import { parsePositiveId } from "../../../../shared/http";
import { readerJson } from "../../infrastructure/json";
import { PostgresReaderRepository } from "../../infrastructure/PostgresReaderRepository";
import { SearchReaders } from "./SearchReaders";
import { searchReadersCached } from "./searchReadersCached";

/** UC10: busca leitores e consulta um leitor. */
export function registerRoutes(api: Hono): void {
  api.get("/leitores", async c => {
    const { readers, cache } = await searchReadersCached(c.req.query("q"), new PostgresReaderRepository(sql));
    c.header("X-Cache", cache);
    return c.json(readers.map(readerJson));
  });
  api.get("/leitores/:id", async c => {
    const reader = await new SearchReaders(new PostgresReaderRepository(sql)).get(parsePositiveId(c.req.param("id")));
    return c.json(readerJson(reader));
  });
}
```

---

### PASSO 5: Exportar em `backend/src/modules/readers/index.ts`
Adicionar no final:
```typescript
export { invalidateReaderSearchCache } from "./infrastructure/searchCache";
```

---

### PASSO 6: Invalidação nas Mutações (Após `inTransaction`)
1. **`backend/src/modules/readers/features/create-reader/route.ts`**:
```typescript
import { invalidateReaderSearchCache } from "../../infrastructure/searchCache";
// ...
const reader = await inTransaction(tx => new CreateReader(new PostgresReaderRepository(tx)).execute(body));
await invalidateReaderSearchCache();
return c.json(readerJson(reader), 201);
```

2. **`backend/src/modules/readers/features/update-reader/route.ts`**:
```typescript
import { invalidateReaderSearchCache } from "../../infrastructure/searchCache";
// ...
const reader = await inTransaction(tx => new UpdateReader(new PostgresReaderRepository(tx)).execute(id, body));
await invalidateReaderSearchCache();
return c.json(readerJson(reader));
```

3. **`backend/src/modules/readers/features/delete-reader/route.ts`**:
```typescript
import { invalidateReaderSearchCache } from "../../infrastructure/searchCache";
// ...
await inTransaction(tx => new DeleteReader(new PostgresReaderRepository(tx), new PostgresReaderHistory(tx)).execute(id));
await invalidateReaderSearchCache();
return c.body(null, 204);
```

4. **`backend/src/integration/derivedData.ts`**:
```typescript
import { invalidateAuthorSearch } from "../modules/authorship";
import { invalidateReaderSearchCache } from "../modules/readers";

export async function refreshDerivedData(): Promise<void> {
  await invalidateAuthorSearch();
  await invalidateReaderSearchCache();
}
```

---

### PASSO 7: Criar `backend/src/modules/readers/features/search-readers/search-readers-cache.test.ts`
```typescript
import { expect, test } from "bun:test";
import { api, testCpf, testEmail, testName } from "#tests/api";
import { createRedis } from "../../../../infrastructure/redis";
import { sql } from "../../../../infrastructure/postgres";
import { PostgresReaderRepository } from "../../infrastructure/PostgresReaderRepository";
import { invalidateReaderSearchCache, readCachedSearch, writeCachedSearch } from "../../infrastructure/searchCache";
import { searchReadersCached } from "./searchReadersCached";

async function search(q?: string) {
  const url = q !== undefined ? `/leitores?q=${encodeURIComponent(q)}` : "/leitores";
  const response = await api("GET", url);
  expect(response.status).toBe(200);
  return { cache: response.headers.get("X-Cache"), readers: (await response.json()) as { id: number; nome: string }[] };
}

async function createReader(nome: string) {
  const res = await api("POST", "/leitores", {
    nome,
    cpf: testCpf(),
    email: testEmail(),
    telefone: "(27) 99999-0000",
  });
  expect(res.status).toBe(201);
  return (await res.json()) as { id: number; nome: string; cpf: string };
}

test("UC10: a segunda busca vem do cache", async () => {
  const name = testName("Leitor");
  const reader = await createReader(name);

  const first = await search(name);
  expect(first.cache).toBe("MISS");

  const second = await search(name);
  expect(second.cache).toBe("HIT");
  expect(second.readers.some(r => r.id === reader.id)).toBe(true);
});

test("UC10: termos com espaços ou maiúsculas compartilham o cache", async () => {
  const name = testName("Ana Paula");
  await createReader(name);

  const first = await search(name.toUpperCase());
  expect(first.cache).toBe("MISS");

  const second = await search(`  ${name.toLowerCase()}  `);
  expect(second.cache).toBe("HIT");
  expect(second.readers).toEqual(first.readers);
});

test("UC10: cadastrar, editar e excluir leitor invalidam o cache", async () => {
  await search("");
  expect((await search("")).cache).toBe("HIT");

  const reader = await createReader(testName("Leitor"));
  const afterCreate = await search("");
  expect(afterCreate.cache).toBe("MISS");

  const renamed = testName("Leitor Renomeado");
  const updateRes = await api("PUT", `/leitores/${reader.id}`, {
    nome: renamed,
    cpf: reader.cpf,
    email: testEmail(),
    telefone: "(27) 98888-1111",
  });
  expect(updateRes.status).toBe(200);

  const afterUpdate = await search("");
  expect(afterUpdate.cache).toBe("MISS");

  const deleteRes = await api("DELETE", `/leitores/${reader.id}`);
  expect(deleteRes.status).toBe(204);

  const afterDelete = await search("");
  expect(afterDelete.cache).toBe("MISS");
});

test("UC10: resultado velho gravado numa geração antiga não é lido", async () => {
  const term = testName("Termo");
  const read = await readCachedSearch(term);
  expect(read!.readers).toBeNull();

  await invalidateReaderSearchCache();
  await writeCachedSearch(term, read!.generation, [{ id: 9999, name: "Velho", cpf: "123", email: "a@a.com", phone: "123" }]);

  expect((await readCachedSearch(term))!.readers).toBeNull();
});

test("UC10: sem Redis a busca responde do Postgres", async () => {
  const dead = createRedis("redis://127.0.0.1:1", { autoReconnect: false });
  const repo = new PostgresReaderRepository(sql);
  const result = await searchReadersCached("qualquer", repo, dead);
  expect(result.cache).toBe("BYPASS");
  expect(Array.isArray(result.readers)).toBe(true);
  await invalidateReaderSearchCache(dead);
});
```

---

## 🏆 COMANDOS DE VALIDAÇÃO E ENTREGA:

```powershell
# 1. Validar fronteiras de módulos:
cd backend
bun run check-boundaries
cd ..

# 2. Rodar todos os testes no Docker:
docker compose -f infra/compose.yaml run --rm test

# 3. Entregar no GitHub:
git add -A
git commit -m "feat: cachear a busca de leitores no Redis com invalidação por geração"
git push -u origin atividade-cache-leitores
```
