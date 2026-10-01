import type { Hono } from "hono";
import type { UseCases } from "../../../../composition";
import { parseCorrecaoDeTitulo } from "./input";

export function register(routes: Hono, useCases: UseCases): void {
  routes.patch("/livros/:id/titulo", async (contexto) => {
    const input = parseCorrecaoDeTitulo(
      contexto.req.param(),
      await contexto.req.json(),
    );

    const corrigirTitulo = (useCases as any).corrigirTitulo;
    return contexto.json(corrigirTitulo.execute(input), 200);
  });
}