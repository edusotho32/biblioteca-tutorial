# ⚡ GUIA MESTRE DEFINITIVO: AVALIAÇÃO DE CACHE COM REDIS (TEES - 2026.2)
**Disciplina:** Tópicos Especiais em Engenharia de Software II · Prof. Maróquio  
**Data da Atividade:** 05/11/2026 · **Duração:** 50 minutos · **Valor:** 1,0 ponto  
**Projeto Base:** `biblioteca-tutorial` (Branch de referência da aula: `saas-evolution/fase02`)

---

## 🚨 AS DUAS REGRAS DE OURO PARA NÃO ZERAR / NÃO FAZER BESTEIRA

> [!CAUTION] **REGRA 1: NUNCA ALTERE `search-books`!**
> O professor avisou explicitamente em aula: **NÃO TOQUE** em `src/modules/catalog/features/search-books/`.  
> Esse slice de busca de livros está reservado para a próxima aula de **Busca Semântica Vetorial com Gemini API (Embeddings)**.  
> A prova é **ESTRITAMENTE** sobre o slice **`list-books`** (rota `GET /lista-livros`).

> [!IMPORTANT] **REGRA 2: CHEGUE COM O DOCKER E OS CONTÊINERES ATIVOS!**
> Você terá apenas 50 minutos. Não perca tempo baixando imagem Docker ou subindo banco na hora da prova.  
> Chegue na sala com o **Docker Desktop aberto**, o **PostgreSQL** e o **Redis 8** rodando (`docker ps`).

---

## 🌐 LINKS RÁPIDOS PARA CONSULTAR NO CELULAR / NAVEGADOR NA HORA DA PROVA

* 📱 **Guia de Cache Redis (Branch `guia-prova`):**  
  👉 `https://github.com/edusotho32/biblioteca-tutorial/blob/guia-prova/GUIA_ATIVIDADE_CACHE_REDIS.md`
* 📱 **Guia de Cache Redis (Branch `prova`):**  
  👉 `https://github.com/edusotho32/biblioteca-tutorial/blob/prova/GUIA_ATIVIDADE_CACHE_REDIS.md`
* 📱 **Manual de Arquitetura Modular Antigo (Atividade 5 e 6):**  
  👉 `https://github.com/edusotho32/biblioteca-tutorial/blob/guia-prova/GUIA_PROVA_TEES_2026.md`

---


---

## 🧠 SE DER BRANCO NA PROVA: COMO RACIOCINAR CADA LINHA DE CÓDIGO (NÃO DECORE, ENTENDA)

Se você entrar em pânico ou der branco, **não tente lembrar das letras decoradas**. Siga estas historinhas mentais que vão te guiar exatamente no que digitar:

### 1. Na Rota (`route.ts`) - 3 Pensamentos:
* **Pensamento 1:** *"Preciso chamar a busca com cache, mas ela agora me devolve DUAS coisas (a lista de livros e se foi HIT ou MISS)"*:
  ```typescript
  const { books, cache } = await listBooksCached(catalogIntegration);
  ```
* **Pensamento 2:** *"O Maróquio quer ver o cabeçalho X-Cache no Postman/DevTools. No Hono, `c.header("Nome", "Valor")` carimba isso na resposta"*:
  ```typescript
  c.header("X-Cache", cache);
  ```
* **Pensamento 3:** *"Devolvo os livros em JSON, usando `.map(bookJson)` para formatar os nomes dos campos para português"*:
  ```typescript
  return c.json(books.map(bookJson));
  ```

---

### 2. No Orquestrador (`listBooksCached.ts`) - A Lógica do Balcão em 5 Linhas:
* **Passo 1 (Olha no Balcão/Redis):**
  ```typescript
  const cached = await readCachedBookList();
  ```
* **Passo 2 (Já tava lá? Devolve na hora como HIT):**
  ```typescript
  if (cached?.books) {
    return { books: cached.books, cache: "HIT" };
  }
  ```
* **Passo 3 (Não tava? Vai na cozinha/Postgres buscar):**
  ```typescript
  const books = await listBooks(integration, now);
  ```
* **Passo 4 (O Redis tava morto? Se tava, entrega como BYPASS sem quebrar a API):**
  ```typescript
  if (!cached) {
    return { books, cache: "BYPASS" };
  }
  ```
* **Passo 5 (Redis tá vivo? Guarda lá pra próxima pessoa e entrega como MISS):**
  ```typescript
  await writeCachedBookList(cached.generation, books);
  return { books, cache: "MISS" };
  ```

---

### 3. Nas Mutações (`createBook`, `updateBook`, `deleteBook`) - Onde Colocar?
* **A Regra:** *"Se o acervo mudou, o cache ficou velho. Mas eu SÓ posso avisar o cache DEPOIS que o banco der o commit"* (ou seja, fora e depois do bloco `inTransaction`):
  ```typescript
  await invalidateBookListCache();
  ```
  *(Por que depois do commit? Porque se chamar antes, uma requisição simultânea leria o Postgres antigo e salvaria o dado velho na geração nova!)*

---

### 4. No `derivedData.ts` - A Sincronização Geral:
* **A Regra:** *"Se rodarem seed ou alterarem o banco por fora, eu limpo o cache de autores E o cache de livros"*:
  ```typescript
  export async function refreshDerivedData(): Promise<void> {
    await invalidateAuthorSearch();
    await invalidateBookListCache(); // <-- só adicionar essa linha!
  }
  ```


## ⏱️ CHECKLIST DE 3 MINUTOS ANTES DA PROVA COMEÇAR

Abra o terminal na pasta do projeto e execute:

```powershell
# 1. Verificar se os contêineres do PostgreSQL e Redis estão UP
docker ps

# 2. Testar se o Redis está respondendo PONG
docker exec -it biblioteca-tutorial-cache-1 redis-cli ping
# (ou o nome do seu contêiner redis, ex: redis-cli ping)

# 3. Rodar os testes existentes para garantir que tudo está verde (74 testes)
bun test

# 4. Criar sua branch de trabalho da prova
git checkout -b prova-cache-redis
```

---

## 🗺️ MAPA DOS ARQUIVOS DA SOLUÇÃO

Para implementar o cache em `list-books` seguindo **o mesmo padrão oficial de `search-authors`**, você vai tocar em:

| Arquivo | Ação | Responsabilidade |
| :--- | :---: | :--- |
| `backend/src/modules/catalog/infrastructure/bookListCache.ts` | **Criar** | Funções de infraestrutura do Redis (leitura, gravação, invalidação por geração). |
| `backend/src/modules/catalog/features/list-books/listBooksCached.ts` | **Criar** | Orquestrador Cache-Aside (HIT, MISS, BYPASS). |
| `backend/src/modules/catalog/features/list-books/route.ts` | **Editar** | Conectar `listBooksCached` e injetar header `X-Cache`. |
| `backend/src/modules/catalog/index.ts` | **Editar** | Exportar `invalidateBookListCache` para outros módulos. |
| `backend/src/modules/catalog/features/create-book/createBook.ts` | **Editar** | Invalidar cache de livros após cadastrar livro. |
| `backend/src/modules/catalog/features/update-book/updateBook.ts` | **Editar** | Invalidar cache de livros após editar livro. |
| `backend/src/modules/catalog/features/delete-book/deleteBook.ts` | **Editar** | Invalidar cache de livros após excluir livro. |
| `backend/src/integration/derivedData.ts` | **Editar** | Invalidar cache de livros no `refreshDerivedData()`. |
| `backend/src/modules/catalog/features/list-books/list-books-cache.test.ts` | **Criar** | Testes automatizados cobrindo HIT, MISS, mutações e fallback offline. |

---

## 💻 GABARITO COMPLETO E EXPLICADO (CÓDIGO PRONTO)

### 📄 PASSO 1: Criar `backend/src/modules/catalog/infrastructure/bookListCache.ts`
Este arquivo gerencia a chave no Redis, o TTL de 60 segundos e a invalidação atômica por contador de geração.

```typescript
import type { RedisClient } from "bun";
import { ready, redis, redisKey } from "../../../infrastructure/redis";
import type { BookView } from "../domain/Book";

export type CacheStatus = "HIT" | "MISS" | "BYPASS";

/** Um resultado em cache vale por 60 s mesmo que ninguém o invalide. */
const TTL_SECONDS = 60;

const GENERATION = redisKey("acervo", "livros", "geracao");

/** Cada geração guarda a lista serializada em uma chave isolada */
function generationKey(generation: number): string {
  return redisKey("acervo", "livros", String(generation));
}

/**
 * Lê a geração atual e busca a lista de livros em cache.
 * Devolve null se o Redis estiver desligado (BYPASS transparente).
 */
export async function readCachedBookList(client: RedisClient | null = redis): Promise<{ generation: number; books: BookView[] | null } | null> {
  if (!client) return null;
  try {
    await ready(client);
    const generation = Number(await client.get(GENERATION) ?? 0);
    const cached = await client.get(generationKey(generation));
    return { generation, books: cached === null ? null : JSON.parse(cached) as BookView[] };
  } catch (error) {
    console.warn("Cache de livros indisponível:", (error as Error).message);
    return null;
  }
}

/**
 * Grava os livros na geração lida inicialmente.
 * Se uma escrita invalidou o cache no meio do caminho, o dado vai para uma
 * geração velha que expira sozinha sem contaminar leituras novas.
 */
export async function writeCachedBookList(generation: number, books: BookView[], client: RedisClient | null = redis): Promise<void> {
  if (!client) return;
  try {
    await ready(client);
    await client.set(generationKey(generation), JSON.stringify(books), "EX", TTL_SECONDS);
  } catch (error) {
    console.warn("Cache de livros indisponível:", (error as Error).message);
  }
}

/**
 * Invalida todas as listagens de livros de uma vez incrementando o contador de geração.
 * A próxima leitura buscará na geração seguinte (que começa vazia).
 * DEVE ser chamado SEMPRE depois do COMMIT no Postgres.
 */
export async function invalidateBookListCache(client: RedisClient | null = redis): Promise<void> {
  if (!client) return;
  try {
    await ready(client);
    await client.incr(GENERATION);
  } catch (error) {
    console.warn("Cache de livros indisponível:", (error as Error).message);
  }
}
```

---

### 📄 PASSO 2: Criar `backend/src/modules/catalog/features/list-books/listBooksCached.ts`
Implementa a estratégia Cache-Aside.

```typescript
import type { RedisClient } from "bun";
import { redis } from "../../../../infrastructure/redis";
import type { BookView } from "../../domain/Book";
import type { CatalogIntegration } from "../../domain/CatalogIntegration";
import { readCachedBookList, writeCachedBookList, type CacheStatus } from "../../infrastructure/bookListCache";
import { listBooks } from "./listBooks";

/**
 * Cache-aside: procura no Redis; se não estiver lá, busca no Postgres e guarda.
 * Devolve o status do cache (HIT, MISS ou BYPASS) para o header da resposta.
 */
export async function listBooksCached(
  integration: CatalogIntegration,
  client: RedisClient | null = redis,
  now = new Date()
): Promise<{ books: BookView[]; cache: CacheStatus }> {
  const cached = await readCachedBookList(client);
  if (cached?.books) {
    return { books: cached.books, cache: "HIT" };
  }

  const books = await listBooks(integration, now);
  if (!cached) {
    return { books, cache: "BYPASS" };
  }

  await writeCachedBookList(cached.generation, books, client);
  return { books, cache: "MISS" };
}
```

---

### 📄 PASSO 3: Atualizar `backend/src/modules/catalog/features/list-books/route.ts`
Conectar a versão em cache e injetar o header `X-Cache`:

```typescript
import type { Hono } from "hono";
import { catalogIntegration } from "../../../../integration/catalogIntegration";
import { bookJson } from "../../infrastructure/json";
import { listBooksCached } from "./listBooksCached";

export function registerRoutes(api: Hono): void {
  api.get("/lista-livros", async (c) => {
    const { books, cache } = await listBooksCached(catalogIntegration);
    c.header("X-Cache", cache);
    return c.json(books.map(bookJson));
  });
}
```

---

### 📄 PASSO 4: Exportar a invalidação em `backend/src/modules/catalog/index.ts`
Abra `backend/src/modules/catalog/index.ts` e adicione a exportação:

```typescript
export { prepareCatalog } from "./infrastructure/schema";
export type { CatalogAuthor, CatalogDb, CatalogIntegration, CopyAvailability } from "./domain/CatalogIntegration";
export { Isbn } from "./domain/Isbn";
export { invalidateBookListCache } from "./infrastructure/bookListCache"; // <-- ADICIONE ESTA LINHA
```

---

### 📄 PASSO 5: Disparar a Invalidação nas Mutações de Livro

Em cada uma das 3 operações de escrita de livro, chame `await invalidateBookListCache()` **fora e após o bloco `inTransaction`** (ou seja, estritamente após o COMMIT do banco relacional):

#### A) Em `backend/src/modules/catalog/features/create-book/createBook.ts`:
Adicione o import no topo:
```typescript
import { invalidateBookListCache } from "../../infrastructure/bookListCache";
```
No final da função `createBook`, logo após `await integration.bookCountsChanged(...)`:
```typescript
  // efeitos derivados só depois do COMMIT
  await integration.bookCountsChanged([input.authorId]);
  await invalidateBookListCache(); // <-- ADICIONE AQUI
  return book;
```

#### B) Em `backend/src/modules/catalog/features/update-book/updateBook.ts`:
Adicione o import no topo:
```typescript
import { invalidateBookListCache } from "../../infrastructure/bookListCache";
```
No final da função `updateBook`, logo após `await integration.bookCountsChanged(...)`:
```typescript
  await integration.bookCountsChanged(authorIds);
  await invalidateBookListCache(); // <-- ADICIONE AQUI
  return book;
```

#### C) Em `backend/src/modules/catalog/features/delete-book/deleteBook.ts`:
Adicione o import no topo:
```typescript
import { invalidateBookListCache } from "../../infrastructure/bookListCache";
```
No final da função `deleteBook`, logo após `await integration.bookCountsChanged(...)`:
```typescript
  await integration.bookCountsChanged([book.authorId]);
  await invalidateBookListCache(); // <-- ADICIONE AQUI
```

---

### 📄 PASSO 6: Atualizar `backend/src/integration/derivedData.ts`
O `refreshDerivedData` garante que se alguém rodar o seed ou editar dados direto no SQL, o cache de livros também seja sincronizado:

```typescript
import { invalidateAuthorSearch } from "../modules/authorship";
import { invalidateBookListCache } from "../modules/catalog"; // <-- ADICIONE ESTE IMPORT

/**
 * Os dados derivados do Redis podem ter ficado para trás: o servidor esteve
 * parado enquanto o banco mudou, ou o seed escreveu direto nas tabelas.
 * Recalcula tudo a partir do Postgres, a fonte da verdade.
 */
export async function refreshDerivedData(): Promise<void> {
  await invalidateAuthorSearch();
  await invalidateBookListCache(); // <-- ADICIONE ESTA LINHA
}
```

---

### 📄 PASSO 7: Criar `backend/src/modules/catalog/features/list-books/list-books-cache.test.ts`
Crie este arquivo de testes unitários e de integração focados e granulares (seguindo o princípio da responsabilidade única que o professor elogiou):

```typescript
import { expect, test } from "bun:test";
import { api, testAuthor, testIsbn, testName } from "#tests/api";
import { createRedis } from "../../../../infrastructure/redis";
import { catalogIntegration } from "../../../../integration/catalogIntegration";
import { invalidateBookListCache, readCachedBookList, writeCachedBookList } from "../../infrastructure/bookListCache";
import { listBooksCached } from "./listBooksCached";

async function fetchBookList() {
  const response = await api("GET", "/lista-livros");
  expect(response.status).toBe(200);
  return {
    cache: response.headers.get("X-Cache"),
    books: await response.json() as { id: number; titulo: string }[],
  };
}

test("UC05-CACHE: a segunda requisição de listagem vem do cache (HIT)", async () => {
  // Limpa o cache para garantir estado inicial
  await invalidateBookListCache();

  const first = await fetchBookList();
  expect(first.cache).toBe("MISS");

  const second = await fetchBookList();
  expect(second.cache).toBe("HIT");
  expect(second.books).toEqual(first.books);
});

test("UC05-CACHE: cadastrar, editar e excluir livro invalidam o cache", async () => {
  const author = await testAuthor();

  // 1. Aquece o cache
  await fetchBookList();
  expect((await fetchBookList()).cache).toBe("HIT");

  // 2. Cadastrar livro deve invalidar o cache
  const createRes = await api("POST", "/livros", {
    isbn: testIsbn(),
    titulo: testName("Livro Teste Cache"),
    autorId: author.id,
  });
  expect(createRes.status).toBe(201);
  const book = await createRes.json();

  const afterCreate = await fetchBookList();
  expect(afterCreate.cache).toBe("MISS");
  expect(afterCreate.books.some((b) => b.id === book.id)).toBe(true);

  // Re-aquece
  expect((await fetchBookList()).cache).toBe("HIT");

  // 3. Atualizar livro deve invalidar o cache
  const renamedTitle = testName("Livro Renomeado");
  const updateRes = await api("PUT", `/livros/${book.id}`, {
    isbn: book.isbn,
    titulo: renamedTitle,
    autorId: author.id,
  });
  expect(updateRes.status).toBe(200);

  const afterUpdate = await fetchBookList();
  expect(afterUpdate.cache).toBe("MISS");
  expect(afterUpdate.books.some((b) => b.id === book.id && b.titulo === renamedTitle)).toBe(true);

  // Re-aquece
  expect((await fetchBookList()).cache).toBe("HIT");

  // 4. Excluir livro deve invalidar o cache
  const deleteRes = await api("DELETE", `/livros/${book.id}`);
  expect(deleteRes.status).toBe(204);

  const afterDelete = await fetchBookList();
  expect(afterDelete.cache).toBe("MISS");
  expect(afterDelete.books.some((b) => b.id === book.id)).toBe(false);
});

test("UC05-CACHE: dado velho gravado em geração antiga não é retornado", async () => {
  const read = await readCachedBookList();
  expect(read).not.toBeNull();

  // Simula invalidação concorrente antes de gravar
  await invalidateBookListCache();

  // Tenta gravar na geração defasada
  await writeCachedBookList(read!.generation, []);

  // Leitura subsequente lê da nova geração e não vê o dado velho
  const after = await readCachedBookList();
  expect(after!.books).toBeNull();
});

test("UC05-CACHE: sem Redis a listagem responde com BYPASS a partir do Postgres", async () => {
  const dead = createRedis("redis://127.0.0.1:1", { autoReconnect: false });
  const result = await listBooksCached(catalogIntegration, dead);
  expect(result.cache).toBe("BYPASS");
  expect(Array.isArray(result.books)).toBe(true);
  await invalidateBookListCache(dead);
});
```

---

## 🎯 RESUMO DAS 5 ARMADILHAS FATAIS NA HORA DA PROVA

1. **Alterar `search-books` em vez de `list-books`:**  
   Você quebrará a estrutura da próxima aula de Inteligência Artificial. Mexa apenas em `list-books`!
2. **Invalidar o cache antes do `inTransaction` terminar:**  
   Se você chamar `invalidateBookListCache()` antes do commit, uma requisição simultânea lerá o dado do Postgres antes dele ser commitado e gravará o dado velho na geração nova. Chame **sempre depois** do commit!
3. **Não tratar erro de conexão do Redis:**  
   Sempre use os blocos `try/catch` e a função auxiliar `ready(client)` para capturar falhas e devolver `null`. Se o Redis cair, sua API deve continuar respondendo 200 via `BYPASS`.
4. **Esquecer de colocar o header `X-Cache` na rota:**  
   O professor olha o header HTTP `X-Cache: HIT`, `X-Cache: MISS` ou `X-Cache: BYPASS` para saber se a sua rota está realmente consultando o Redis.
5. **Esquecer de atualizar o `refreshDerivedData`:**  
   Se o professor rodar `bun run seed` na máquina dele para testar seu código, ele verificará se a rotina `refreshDerivedData` limpa o cache de livros. Adicione a linha lá!

---

## 🚀 COMANDOS PARA VALIDAR TUDO NO FINAL

Após colar e ajustar o código, rode no terminal:

```powershell
# Executa apenas os testes da fatia list-books:
bun test list-books

# Executa todos os testes da aplicação (todos devem passar!):
bun test
```
Se todos os testes passarem, faça seu commit e você tirou nota máxima! 🏆
