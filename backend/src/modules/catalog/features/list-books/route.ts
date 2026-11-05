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
