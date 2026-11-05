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
  now = new Date(),
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
