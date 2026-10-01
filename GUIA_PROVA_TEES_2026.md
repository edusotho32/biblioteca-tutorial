# 🛡️ PROTOCOLO DE GUERRA: GUIA MASTER TEES 2026.2
**Tópicos Especiais em Engenharia de Software · Prof. Maroquio (IFES)**

> **MANTRA DO SUCESSO:** O código já vem 100% pronto na tela do professor. Você é um **Arquiteto Montador**. Seu único trabalho é pegar as peças, colocar nas pastas certas, ligar os fios e rodar os testes. Mantenha a calma, você tem tudo nas mãos.

---

## 🌐 1. COMO ACESSAR ESTE GUIA NO LABORATÓRIO (Links Diretos)

No navegador do celular ou em uma aba ao lado no computador da faculdade:
* 🔗 **Link Direto (Branch `main`):**
  👉 **`https://github.com/edusotho32/biblioteca-tutorial/blob/main/GUIA_PROVA_TEES_2026.md`**
* 🔗 **Link Direto (Branch `guia-prova`):**
  👉 **`https://github.com/edusotho32/biblioteca-tutorial/blob/guia-prova/GUIA_PROVA_TEES_2026.md`**

---

## 🖥️ 2. OS PRIMEIROS 3 MINUTOS NO COMPUTADOR DA FACULDADE

1. **Abra o Terminal do VS Code** na pasta do projeto e rode:
   ```bash
   bun install
   ```
   *(Isso ativa o TypeScript e carrega todas as bibliotecas necessárias).*

2. **Abra a página do enunciado da prova no navegador:**
   ```bash
   start atividade5.html
   # ou se for a 6:
   start atividade6.html
   ```
   *(Se o comando `start` não abrir no terminal, abra a pasta pelo Windows Explorer e dê dois cliques no arquivo `.html`).*

3. **Crie a sua branch de trabalho limpa:**
   ```bash
   git checkout -b avaliacao-tees
   ```

---

## 🧭 3. O DECODIFICADOR UNIVERSAL: COMO LER QUALQUER ENUNCIADO DO MAROQUIO

Não importa se ele pedir Livro, Autor, Empréstimo, Usuário ou Nave Espacial. Olhe para a etiqueta e para o subtítulo do bloco:

| Se o Bloco Disser no Título... | Etiqueta | O que significa? | Onde esse código deve morar? |
| :--- | :---: | :--- | :--- |
| **"Comportamento da entidade"** | `edição` ou `novo` | Regra de negócio interna do objeto | `src/modules/<modulo>/domain/<Entidade>.ts` |
| **"Contrato de persistência"** | `edição` ou `novo` | Interface do Repositório (sem SQL) | `src/modules/<modulo>/domain/<Entidade>Repository.ts` |
| **"Implementação no SQLite"** | `edição` ou `novo` | Repositório real com comandos SQL | `src/modules/<modulo>/infrastructure/Sqlite<Entidade>Repository.ts` |
| **"Entrada da fatia"** | `arquivo novo` | Validação de JSON e parâmetros da URL | `src/modules/<modulo>/features/<acao>/input.ts` |
| **"Formato de saída do módulo"** | `edição` ou `novo` | Mapeador da resposta JSON (DTO) | `src/modules/<modulo>/output.ts` |
| **"Orquestração do caso de uso"** | `arquivo novo` | UseCase (aplica regras 404, 409, salva) | `src/modules/<modulo>/features/<acao>/<NomeDoCaso>.ts` |
| **"Borda HTTP da fatia"** | `arquivo novo` | Rota da internet usando o Hono | `src/modules/<modulo>/features/<acao>/route.ts` |
| **"Dublê do repositório"** | `edição` | Mock em memória para os testes passarem | `tests/doubles.ts` (classe `InMemory...`) |
| **"Ponte entre vocabulários"** | `arquivo novo` | Adapter que conecta dois módulos vizinhos | `src/adapters/<NomeDaPonte>.ts` |

---

## 🏢 4. A REGRA DO ELEVADOR PARA OS IMPORTS (Como nunca errar os `../`)

* **`./` (1 pontinho):** Arquivo na mesma pasta (ex: `./input` de dentro da fatia).
* **`../../` (2 subidas):** Sobe para a raiz do módulo (ex: `../../output` ou `../../domain/LivroRepository`).
* **`../../../../` (4 subidas):** Sai da fatia e vai até o `src/shared/`:
  * Para IDs (`LivroId`, `AutorId`): `from "../../../../shared/identifiers"`
  * Para Validação (`getBody...`, `getField...`): `from "../../../../shared/validation"`
  * Para Erros HTTP (`NotFound`, `RuleConflict`): `from "../../../../shared/errors"`

> 💡 **DICA DE OURO DO ESPIÃO:** Se tiver dúvida no import, abra o arquivo irmão mais velho `src/modules/acervo/features/cadastrar-livro/input.ts` ou `CadastrarLivro.ts` e copie a primeira linha! Os imports já estão todos escritos lá!

---

## 📘 5. GABARITO COMPLETO: ATIVIDADE 5 (CORRIGIR TÍTULO) — 10 PONTOS

### Bloco 01 (`edição`) · `src/modules/acervo/domain/Livro.ts`
Cole antes da última chave `}` da classe `Livro`:
```typescript
  comTitulo(titulo: string): Livro {
    return new Livro(
      this.id,
      this.numeroRegistro,
      this.isbn,
      titulo,
      this.autorId,
      this.dataCatalogacao,
    );
  }
```

### Bloco 02 (`edição`) · `src/modules/acervo/domain/LivroRepository.ts`
Na linha 1, troque o import para:
```typescript
import type { AutorId, LivroId } from "../../../shared/identifiers";
```
Dentro da `interface LivroRepository { ... }`, adicione:
```typescript
  findById(id: LivroId): Livro | null;
  updateTitulo(livro: Livro): void;
```

### Bloco 03 (`edição`) · `src/modules/acervo/infrastructure/SqliteLivroRepository.ts`
Na linha 5, troque o import para:
```typescript
import { AutorId, LivroId } from "../../../shared/identifiers";
```
Dentro da classe `SqliteLivroRepository`, adicione no final:
```typescript
  findById(id: LivroId): Livro | null {
    const row = db.query("SELECT * FROM livros WHERE id = ?")
      .get(id.value) as LivroRow | null;
    return row === null ? null : toLivro(row);
  }

  updateTitulo(livro: Livro): void {
    db.run("UPDATE livros SET titulo = ? WHERE id = ?", [
      livro.titulo,
      livro.id!.value,
    ]);
  }
```

### Bloco 04 (`arquivo novo`) · `src/modules/acervo/features/corrigir-titulo/input.ts`
Crie a pasta `corrigir-titulo` dentro de `src/modules/acervo/features/` e crie o arquivo `input.ts`:
```typescript
import {
  getBodyAsObject,
  getFieldAsPositiveInt,
  getFieldAsText,
} from "../../../../shared/validation";

export type CorrecaoDeTitulo = {
  id: number;
  titulo: string;
};

export function parseCorrecaoDeTitulo(
  params: { id?: string },
  body: unknown,
): CorrecaoDeTitulo {
  const data = getBodyAsObject(body);
  return {
    id: getFieldAsPositiveInt(params, "id"),
    titulo: getFieldAsText(data, "titulo"),
  };
}
```

### Bloco 05 (`edição`) · `src/modules/acervo/output.ts`
No final do arquivo, cole:
```typescript
export type TituloCorrigidoJson = {
  id: number;
  isbn: string;
  titulo: string;
};

export function tituloCorrigidoToJson(livro: Livro): TituloCorrigidoJson {
  return {
    id: livro.id!.value,
    isbn: livro.isbn.value,
    titulo: livro.titulo,
  };
}
```

### Bloco 06 (`arquivo novo`) · `src/modules/acervo/features/corrigir-titulo/CorrigirTitulo.ts`
Crie este arquivo dentro da pasta `corrigir-titulo`:
```typescript
import { LivroId } from "../../../../shared/identifiers";
import { NotFound, RuleConflict } from "../../../../shared/errors";
import type { LivroRepository } from "../../domain/LivroRepository";
import type { CorrecaoDeTitulo } from "./input";
import { tituloCorrigidoToJson, type TituloCorrigidoJson } from "../../output";

export class CorrigirTitulo {
  constructor(private readonly livros: LivroRepository) {}

  execute(input: CorrecaoDeTitulo): TituloCorrigidoJson {
    const id = new LivroId(input.id);
    const livro = this.livros.findById(id);
    if (!livro) throw new NotFound("Livro não encontrado");

    const corrigido = livro.comTitulo(input.titulo);
    const duplicado = this.livros.findByAutorId(livro.autorId).some(
      (outro) => !outro.id?.equals(id) && outro.mesmoTituloQue(corrigido.titulo),
    );
    if (duplicado) {
      throw new RuleConflict("Este autor já tem um livro com este título");
    }

    this.livros.updateTitulo(corrigido);
    return tituloCorrigidoToJson(corrigido);
  }
}
```

### Bloco 07 (`arquivo novo`) · `src/modules/acervo/features/corrigir-titulo/route.ts`
Crie este arquivo dentro da pasta `corrigir-titulo`:
```typescript
import type { Hono } from "hono";
import type { UseCases } from "../../../../composition";
import { parseCorrecaoDeTitulo } from "./input";

export function register(routes: Hono, useCases: UseCases): void {
  routes.patch("/livros/:id/titulo", async (contexto) => {
    const input = parseCorrecaoDeTitulo(
      contexto.req.param(),
      await contexto.req.json(),
    );
    return contexto.json(useCases.corrigirTitulo.execute(input), 200);
  });
}
```

### Bloco 08 (`edição`) · `tests/doubles.ts`
Abra `tests/doubles.ts`, ache a classe `InMemoryLivroRepository` e adicione no final dela:
```typescript
  findById(id: LivroId): Livro | null {
    return this.items.find((livro) => livro.id?.equals(id)) ?? null;
  }

  updateTitulo(livro: Livro): void {
    this.items = this.items.map((atual) =>
      atual.id?.equals(livro.id!) ? livro : atual,
    );
  }
```

### Ligações Finais da Atividade 5:
1. **Em `src/modules/acervo/routes.ts`:**
   Adicione o import:
   ```typescript
   import { register as registerCorrigirTitulo } from "./features/corrigir-titulo/route";
   ```
   E dentro da função `criarRotasDeAcervo`:
   ```typescript
   registerCorrigirTitulo(routes, useCases);
   ```

2. **Em `src/composition.ts`:**
   Importe no topo:
   ```typescript
   import { CorrigirTitulo } from "./modules/acervo/features/corrigir-titulo/CorrigirTitulo";
   ```
   No `type UseCases`:
   ```typescript
   export type UseCases = {
     cadastrarLivro: CadastrarLivro;
     buscarLivro: BuscarLivro;
     corrigirTitulo: CorrigirTitulo;
   };
   ```
   E no retorno de `buildUseCases`:
   ```typescript
   corrigirTitulo: new CorrigirTitulo(livros),
   ```

---

## 📕 6. GABARITO COMPLETO: ATIVIDADE 6 (MÓDULO AVALIAÇÕES) — 10 PONTOS

### Bloco 01 (`edição`) · `src/shared/identifiers.ts`
No final do arquivo, adicione:
```typescript
export class AvaliacaoId extends Identifier {}
```

### Bloco 02 (`arquivo novo`) · `src/modules/avaliacoes/domain/Avaliacao.ts`
Crie a pasta `src/modules/avaliacoes/domain/` e o arquivo `Avaliacao.ts`:
```typescript
import { InvalidValue } from "../../../shared/domain-errors";
import type { AvaliacaoId } from "../../../shared/identifiers";

export class Avaliacao {
  constructor(
    readonly id: AvaliacaoId | null,
    readonly numeroRegistro: string,
    readonly matricula: string,
    readonly nota: number,
    readonly comentario: string | null,
  ) {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw new InvalidValue("A nota deve ser um inteiro de 1 a 5");
    }
  }

  static registrar(
    numeroRegistro: string,
    matricula: string,
    nota: number,
    comentario: string | null,
  ): Avaliacao {
    return new Avaliacao(null, numeroRegistro, matricula, nota, comentario);
  }

  withId(id: AvaliacaoId): Avaliacao {
    return new Avaliacao(
      id, this.numeroRegistro, this.matricula, this.nota, this.comentario,
    );
  }
}
```

### Bloco 03a (`arquivo novo`) · `src/modules/avaliacoes/domain/AvaliacaoRepository.ts`
```typescript
import type { Avaliacao } from "./Avaliacao";

export interface AvaliacaoRepository {
  findByMatriculaELivro(
    matricula: string,
    numeroRegistro: string,
  ): Avaliacao | null;
  insert(avaliacao: Avaliacao): Avaliacao;
}
```

### Bloco 03b (`arquivo novo`) · `src/modules/avaliacoes/domain/ConsultaDeAcervo.ts`
```typescript
export interface ConsultaDeAcervo {
  existeNumeroRegistro(numeroRegistro: string): boolean;
}
```

### Bloco 04 (`arquivo novo`) · `src/modules/avaliacoes/features/registrar-avaliacao/input.ts`
Crie a pasta `src/modules/avaliacoes/features/registrar-avaliacao/` e o arquivo `input.ts`:
```typescript
import {
  getBodyAsObject,
  getFieldAsPositiveInt,
  getFieldAsText,
} from "../../../../shared/validation";

export type NovaAvaliacao = {
  numeroRegistro: string;
  matricula: string;
  nota: number;
  comentario: string | null;
};

export function parseNovaAvaliacao(body: unknown): NovaAvaliacao {
  const data = getBodyAsObject(body);
  return {
    numeroRegistro: getFieldAsText(data, "numeroRegistro"),
    matricula: getFieldAsText(data, "matricula"),
    nota: getFieldAsPositiveInt(data, "nota"),
    comentario: data.comentario == null
      ? null
      : getFieldAsText(data, "comentario"),
  };
}
```

### Bloco 05 (`arquivo novo`) · `src/modules/avaliacoes/output.ts`
```typescript
import type { Avaliacao } from "./domain/Avaliacao";

export type AvaliacaoJson = {
  id: number;
  numeroRegistro: string;
  matricula: string;
  nota: number;
  comentario: string | null;
};

export function avaliacaoToJson(avaliacao: Avaliacao): AvaliacaoJson {
  return {
    id: avaliacao.id!.value,
    numeroRegistro: avaliacao.numeroRegistro,
    matricula: avaliacao.matricula,
    nota: avaliacao.nota,
    comentario: avaliacao.comentario,
  };
}
```

### Bloco 06 (`arquivo novo`) · `src/modules/avaliacoes/features/registrar-avaliacao/RegistrarAvaliacao.ts`
```typescript
import { NotFound, RuleConflict } from "../../../../shared/errors";
import { Avaliacao } from "../../domain/Avaliacao";
import type { AvaliacaoRepository } from "../../domain/AvaliacaoRepository";
import type { ConsultaDeAcervo } from "../../domain/ConsultaDeAcervo";
import { avaliacaoToJson, type AvaliacaoJson } from "../../output";
import type { NovaAvaliacao } from "./input";

export class RegistrarAvaliacao {
  constructor(
    private readonly avaliacoes: AvaliacaoRepository,
    private readonly acervo: ConsultaDeAcervo,
  ) {}

  execute(input: NovaAvaliacao): AvaliacaoJson {
    if (!this.acervo.existeNumeroRegistro(input.numeroRegistro)) {
      throw new NotFound("Livro não encontrado");
    }
    if (this.avaliacoes.findByMatriculaELivro(
      input.matricula, input.numeroRegistro,
    )) {
      throw new RuleConflict("Leitor já avaliou este livro");
    }

    const avaliacao = this.avaliacoes.insert(Avaliacao.registrar(
      input.numeroRegistro,
      input.matricula,
      input.nota,
      input.comentario,
    ));
    return avaliacaoToJson(avaliacao);
  }
}
```

### Bloco 07 (`arquivo novo`) · `src/modules/avaliacoes/features/registrar-avaliacao/route.ts`
```typescript
import type { Hono } from "hono";
import type { UseCases } from "../../../../composition";
import { parseNovaAvaliacao } from "./input";

export function register(routes: Hono, useCases: UseCases): void {
  routes.post("/avaliacoes", async (contexto) => {
    const input = parseNovaAvaliacao(await contexto.req.json());
    const avaliacao = useCases.registrarAvaliacao.execute(input);
    contexto.header("Location", `/avaliacoes/${avaliacao.id}`);
    return contexto.json(avaliacao, 201);
  });
}
```

### Bloco 08 (`arquivo novo`) · `src/modules/avaliacoes/infrastructure/tables.ts`
Crie a pasta `src/modules/avaliacoes/infrastructure/` e o arquivo `tables.ts`:
```typescript
import { db } from "../../../infrastructure/db";

export function createAvaliacaoTables(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_registro TEXT NOT NULL,
      matricula TEXT NOT NULL,
      nota INTEGER NOT NULL,
      comentario TEXT,
      UNIQUE (numero_registro, matricula)
    );
  `);
}
```

### Bloco 09 (`arquivo novo`) · `src/modules/avaliacoes/infrastructure/SqliteAvaliacaoRepository.ts`
```typescript
import { db } from "../../../infrastructure/db";
import { AvaliacaoId } from "../../../shared/identifiers";
import { Avaliacao } from "../domain/Avaliacao";
import type { AvaliacaoRepository } from "../domain/AvaliacaoRepository";

type AvaliacaoRow = {
  id: number;
  numero_registro: string;
  matricula: string;
  nota: number;
  comentario: string | null;
};

function toAvaliacao(row: AvaliacaoRow): Avaliacao {
  return new Avaliacao(
    new AvaliacaoId(row.id), row.numero_registro,
    row.matricula, row.nota, row.comentario,
  );
}

export class SqliteAvaliacaoRepository implements AvaliacaoRepository {
  findByMatriculaELivro(
    matricula: string,
    numeroRegistro: string,
  ): Avaliacao | null {
    const row = db.query(`
      SELECT * FROM avaliacoes
      WHERE matricula = ? AND numero_registro = ?
    `).get(matricula, numeroRegistro) as AvaliacaoRow | null;
    return row === null ? null : toAvaliacao(row);
  }

  insert(avaliacao: Avaliacao): Avaliacao {
    const result = db.run(`
      INSERT INTO avaliacoes
        (numero_registro, matricula, nota, comentario)
      VALUES (?, ?, ?, ?)
    `, [
      avaliacao.numeroRegistro, avaliacao.matricula,
      avaliacao.nota, avaliacao.comentario,
    ]);
    return avaliacao.withId(new AvaliacaoId(Number(result.lastInsertRowid)));
  }
}
```

### Bloco 10 (`arquivo novo` e `edição`) · Consulta no Acervo
1. Crie o arquivo `src/modules/acervo/ConsultaDeLivros.ts`:
```typescript
export interface ConsultaDeLivros {
  existeNumeroRegistro(numeroRegistro: string): boolean;
}
```
2. Abra `src/modules/acervo/infrastructure/SqliteLivroRepository.ts`, importe `ConsultaDeLivros`, adicione `implements LivroRepository, ConsultaDeLivros` e cole o método:
```typescript
  existeNumeroRegistro(numeroRegistro: string): boolean {
    return db.query("SELECT 1 FROM livros WHERE numero_registro = ?")
      .get(numeroRegistro) !== null;
  }
```

### Bloco 11 (`arquivo novo`) · A Ponte entre Módulos
Crie o arquivo `src/adapters/AcervoComoConsultaDeAvaliacoes.ts`:
```typescript
import type { ConsultaDeLivros } from "../modules/acervo/ConsultaDeLivros";
import type { ConsultaDeAcervo } from "../modules/avaliacoes/domain/ConsultaDeAcervo";

export class AcervoComoConsultaDeAvaliacoes implements ConsultaDeAcervo {
  constructor(private readonly livros: ConsultaDeLivros) {}

  existeNumeroRegistro(numeroRegistro: string): boolean {
    return this.livros.existeNumeroRegistro(numeroRegistro);
  }
}
```

---

## 🔮 7. E SE ELE APLICAR ENUNCIADOS NOVOS HOJE? (3 Cenários Previstos)

O Maroquio só pode cobrar 3 tipos de variações arquiteturais. Veja como resolver cada uma:

### CENÁRIO A: Uma nova ação em módulo existente (ex: Cancelar/Excluir Livro)
* **O Enunciado:** *"API deve aceitar DELETE /livros/:id ou PATCH /livros/:id/cancelar"*.
* **Como resolver:** É o mesmo padrão exato da Atividade 5!
  1. `domain/Livro.ts`: método `cancelar(): Livro` ou `comStatus("CANCELADO")`.
  2. `domain/LivroRepository.ts`: método `delete(id: LivroId): void` ou `updateStatus(livro: Livro): void`.
  3. `infrastructure/SqliteLivroRepository.ts`: SQL `DELETE FROM livros WHERE id = ?`.
  4. Nova pasta em `features/cancelar-livro/`: com `input.ts`, `CancelarLivro.ts` e `route.ts`.
  5. Plugar em `acervo/routes.ts`, `composition.ts` e `tests/doubles.ts`.

### CENÁRIO B: Um Módulo Novo Inteiro (ex: Empréstimos ou Usuários)
* **O Enunciado:** *"Criar módulo de Empréstimos com POST /emprestimos (matricula, livroId)"*.
* **Como resolver:** É a cópia exata dos 11 passos da Atividade 6!
  1. Cria o ID em `src/shared/identifiers.ts` (`export class EmprestimoId extends Identifier {}`).
  2. Cria a pasta `src/modules/emprestimos/` com suas 3 camadas: `domain/`, `features/` e `infrastructure/`.
  3. Cria a tabela em `infrastructure/tables.ts` e o repositório SQLite.
  4. **A Ponte:** Se empréstimo precisa checar se o livro existe, cria a interface no acervo e a Ponte em `src/adapters/AcervoComoConsultaDeEmprestimos.ts` (idêntica ao `AutoriaComoConsulta.ts`!).

### CENÁRIO C: Consulta com Filtro (ex: Buscar Livros por Categoria)
* **O Enunciado:** *"API deve aceitar GET /livros?categoria=ficcao"*.
* **Como resolver:** Abra a pasta que já está pronta no projeto: `src/modules/acervo/features/buscar-livro/`. Ela já faz busca e paginação! É só copiar o modelo dela.

---

## 🔌 8. O CHECKLIST DAS LIGAÇÕES FINAIS (FASE 5)

Depois de colar todos os blocos, execute estes 4 passos:

1. **Ligar a Rota:**
   Abra `src/modules/<modulo>/routes.ts`.
   Importe a função `register` da nova fatia e chame ela dentro da função do roteador:
   `registerNovaFatia(routes, useCases);`

2. **Ligar a Composição:**
   Abra `src/composition.ts`.
   * No `type UseCases`, adicione: `minhaAcao: MinhaClasseUseCase;`
   * No retorno de `buildUseCases`, adicione: `minhaAcao: new MinhaClasseUseCase(repositorio, ...);`

3. **Ligar o Dublê:**
   Abra `tests/doubles.ts`. Ache a classe `InMemory...` do módulo e cole os métodos do Passo 8.

4. **Se for Módulo Novo:**
   * Registre a tabela em `src/server.ts` chamando `create...Tables()`.
   * Adicione o nome da tabela em `scripts/check-boundaries.ts`: `minha_tabela: "modulo_dono"`.

---

## 🏁 9. OS 3 COMANDOS ANTES DE ENTREGAR

Abra o terminal do VS Code e rode:
```bash
# 1. Garante zero erros de digitação e imports:
bun x tsc --noEmit

# 2. Garante que os testes funcionam:
bun test

# 3. Garante que o robô fiscal do Maroquio aprovou a arquitetura:
bun run verificar
```
Se os 3 comandos passarem sem erro: **sua nota máxima está garantida**.
Respira fundo, confie no processo e boa prova!
