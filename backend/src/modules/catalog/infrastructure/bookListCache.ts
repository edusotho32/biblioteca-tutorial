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
