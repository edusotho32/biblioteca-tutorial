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
