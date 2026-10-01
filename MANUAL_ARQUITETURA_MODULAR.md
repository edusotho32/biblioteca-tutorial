# 📘 Manual de Referência e Padrões: Arquitetura Modular em TypeScript
**Tópicos Especiais em Engenharia de Software II · Ifes**  
*Guia de Arquitetura de Fatias Verticais, Resolução de Módulos e Caderno de Estudos Práticos*

> **Princípio Orientador:** No modelo de arquitetura por Fatias Verticais (*Vertical Slice Architecture*), a implementação é guiada pela composição de camadas estritas: Domínio puro, Interfaces de persistência (Portas), Implementação de infraestrutura (Adaptadores), Validação de entrada (*Input*), Mapeamento de saída (*Output DTO*), Caso de uso orquestrador (*Application Service*) e Borda HTTP (*Route*).

---

## 🌐 1. Links Rápidos para Consulta Técnica

* 🔗 **Manual Técnico (Branch `guia-prova`):**  
  👉 **`https://github.com/edusotho32/biblioteca-tutorial/blob/guia-prova/GUIA_PROVA_TEES_2026.md`**
* 🔗 **Manual Técnico (Branch `prova`):**  
  👉 **`https://github.com/edusotho32/biblioteca-tutorial/blob/prova/GUIA_PROVA_TEES_2026.md`**

---

## 🖥️ 2. Procedimento de Inicialização do Ambiente de Laboratório

Ao iniciar o desenvolvimento no ambiente local:

1. **Instalação das dependências e checagem de tipos:**
   ```bash
   bun install
   ```

2. **Visualização do roteiro de atividades no navegador:**
   ```bash
   start atividade5.html
   # ou para a atividade 6:
   start atividade6.html
   ```
   *(Caso o comando `start` não seja suportado pelo terminal, abra o arquivo `.html` diretamente via gerenciador de arquivos).*

3. **Criação da branch de trabalho:**
   ```bash
   git checkout -b feature/implementacao-modulo
   ```

---

## 🧭 3. Matriz de Decomposição Arquitetural

Mapeamento da semântica dos componentes conforme os padrões de projeto adotados na disciplina:

| Classificação no Roteiro | Categoria | Responsabilidade Arquitetural | Caminho de Destino no Projeto |
| :--- | :---: | :--- | :--- |
| **"Comportamento da entidade"** | `edição` ou `novo` | Regras de negócio puras e métodos de domínio | `src/modules/<modulo>/domain/<Entidade>.ts` |
| **"Contrato de persistência"** | `edição` ou `novo` | Porta de persistência (Interface sem SQL) | `src/modules/<modulo>/domain/<Entidade>Repository.ts` |
| **"Implementação no SQLite"** | `edição` ou `novo` | Adaptador de persistência com queries SQL | `src/modules/<modulo>/infrastructure/Sqlite<Entidade>Repository.ts` |
| **"Entrada da fatia"** | `arquivo novo` | Extração, coerção de tipos e validação de input | `src/modules/<modulo>/features/<acao>/input.ts` |
| **"Formato de saída do módulo"** | `edição` ou `novo` | Mapeador para Data Transfer Object (DTO) | `src/modules/<modulo>/output.ts` |
| **"Orquestração do caso de uso"** | `arquivo novo` | Caso de uso / Application Service (404, 409, persistência) | `src/modules/<modulo>/features/<acao>/<CasoDeUso>.ts` |
| **"Borda HTTP da fatia"** | `arquivo novo` | Adaptador de entrada HTTP utilizando Hono | `src/modules/<modulo>/features/<acao>/route.ts` |
| **"Dublê do repositório"** | `edição` | Implementação em memória para suíte de testes unitários | `tests/doubles.ts` (classe `InMemory...`) |
| **"Ponte entre vocabulários"** | `arquivo novo` | Adaptador desacoplador entre módulos (*Ports & Adapters*) | `src/adapters/<NomeDaPonte>.ts` |

---

## 🏢 4. Resolução de Dependências e Convenções de Módulos (Imports Relativos)

Para garantir o encapsulamento estrito e evitar importações circulares ou quebra de fronteiras:

* **Nível 1 (`./`):** Arquivos residentes no mesmo diretório da fatia vertical (ex: `./input` a partir de `route.ts` ou do caso de uso).
* **Nível 2 (`../../`):** Raiz do módulo correspondente (ex: `../../output` ou `../../domain/LivroRepository`).
* **Nível 4 (`../../../../`):** Núcleo transversal compartilhado da aplicação (`src/shared/`):
  * **Tipos Identificadores:** `from "../../../../shared/identifiers"` (`LivroId`, `AutorId`, `AvaliacaoId`)
  * **Utilitários de Validação:** `from "../../../../shared/validation"` (`getBodyAsObject`, `getFieldAsText`, etc.)
  * **Erros de Aplicação / HTTP:** `from "../../../../shared/errors"` (`NotFound`, `RuleConflict`)

> 💡 **Princípio da Consistência de Referência:** Caso surja dúvida quanto a uma assinatura de importação, utilize como referência estrutural as fatias preexistentes do sistema, como `src/modules/acervo/features/cadastrar-livro/CadastrarLivro.ts` ou `input.ts`.

---

## 📘 5. Estudo Prático de Referência 1: Mutação de Estado em Módulo Existente (Atividade 5)

Roteiro completo de implementação para extensão de capacidade do módulo de acervo (atualização de título):

### Bloco 01 (`edição`) · `src/modules/acervo/domain/Livro.ts`
Adicionar o método de domínio na classe `Livro`:
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
Atualizar importação na linha 1:
```typescript
import type { AutorId, LivroId } from "../../../shared/identifiers";
```
Adicionar os contratos na interface `LivroRepository`:
```typescript
  findById(id: LivroId): Livro | null;
  updateTitulo(livro: Livro): void;
```

### Bloco 03 (`edição`) · `src/modules/acervo/infrastructure/SqliteLivroRepository.ts`
Atualizar importação na linha 5:
```typescript
import { AutorId, LivroId } from "../../../shared/identifiers";
```
Implementar os métodos na classe `SqliteLivroRepository`:
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
Definição de tipos e validação de requisição da fatia:
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
Especificação do DTO de resposta:
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
Orquestrador de regra de aplicação (Caso de Uso):
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
Adaptador de entrada HTTP (Borda da fatia):
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
Atualização do dublê em memória (`InMemoryLivroRepository`):
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

### Integração no Roteador e na Raiz de Composição:
1. **Em `src/modules/acervo/routes.ts`:**
   ```typescript
   import { register as registerCorrigirTitulo } from "./features/corrigir-titulo/route";
   // dentro de criarRotasDeAcervo:
   registerCorrigirTitulo(routes, useCases);
   ```

2. **Em `src/composition.ts`:**
   ```typescript
   import { CorrigirTitulo } from "./modules/acervo/features/corrigir-titulo/CorrigirTitulo";

   // Em export type UseCases:
   corrigirTitulo: CorrigirTitulo;

   // No retorno de buildUseCases():
   corrigirTitulo: new CorrigirTitulo(livros),
   ```

---

## 📕 6. Estudo Prático de Referência 2: Integração de Novo Módulo Desacoplado (Atividade 6)

Roteiro completo de implementação para novo módulo autônomo com isolamento de contexto (*Ports & Adapters*):

### Bloco 01 (`edição`) · `src/shared/identifiers.ts`
```typescript
export class AvaliacaoId extends Identifier {}
```

### Bloco 02 (`arquivo novo`) · `src/modules/avaliacoes/domain/Avaliacao.ts`
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

### Bloco 10 (`arquivo novo` e `edição`) · Porta de Consulta no Acervo
1. Criar `src/modules/acervo/ConsultaDeLivros.ts`:
```typescript
export interface ConsultaDeLivros {
  existeNumeroRegistro(numeroRegistro: string): boolean;
}
```
2. Em `src/modules/acervo/infrastructure/SqliteLivroRepository.ts`, implementar `ConsultaDeLivros`:
```typescript
  existeNumeroRegistro(numeroRegistro: string): boolean {
    return db.query("SELECT 1 FROM livros WHERE numero_registro = ?")
      .get(numeroRegistro) !== null;
  }
```

### Bloco 11 (`arquivo novo`) · Adaptador Entre Módulos (*Adapter*)
Criar `src/adapters/AcervoComoConsultaDeAvaliacoes.ts`:
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

## 🔮 7. Padrões de Extensibilidade Arquitetural (Cenários Complementares)

Orientações para extensões funcionais adicionais respeitando os limites arquiteturais:

### Padrão A: Operações Destrutivas ou Alterações de Estado (`DELETE` ou `PATCH`)
* **Exemplo de Caso de Uso:** Cancelamento, Desativação ou Exclusão de Entidade.
* **Passos Arquiteturais:**
  1. No Domínio (`domain/<Entidade>.ts`): Método imutável de transição de estado (`cancelar(): Entidade` ou `desativar(): Entidade`).
  2. No Repositório (`domain/<Entidade>Repository.ts`): Método declarativo de persistência (`delete(id: Id): void` ou `updateStatus(entidade: Entidade): void`).
  3. Na Infraestrutura (`infrastructure/Sqlite...Repository.ts`): Execução SQL correspondente (`DELETE FROM ... WHERE id = ?`).
  4. Na Fatia (`features/<acao>/`): Criação isolada de `input.ts`, `<CasoDeUso>.ts` e `route.ts`.
  5. Registro no Roteador, na Raiz de Composição (`composition.ts`) e no Dublê (`doubles.ts`).

### Padrão B: Criação de Novo Módulo de Domínio com Dependências Externas
* **Exemplo de Caso de Uso:** Módulo de Empréstimos, Leitores ou Reservas.
* **Passos Arquiteturais:**
  1. Identificador tipado em `src/shared/identifiers.ts`.
  2. Estrutura de três camadas em `src/modules/<modulo>/` (`domain`, `features`, `infrastructure`).
  3. Inicialização de schema em `infrastructure/tables.ts` e repositório SQLite.
  4. **Isolamento de Banco:** Caso o novo módulo necessite consultar entidades externas, definir uma porta local no módulo chamador (`domain/Consulta...ts`) e implementar o adaptador correspondente em `src/adapters/`.

### Padrão C: Consultas Parametrizadas e Filtragem (`GET /recursos?filtro=...`)
* **Exemplo de Caso de Uso:** Pesquisa por categoria, status ou busca textual com paginação.
* **Passos Arquiteturais:** Utilizar como modelo a fatia existente `src/modules/acervo/features/buscar-livro/`, reutilizando as convenções de extração de query params em `input.ts`.

---

## 🔌 8. Checklist de Integração do Sistema (*Composition Root*)

Após a implementação das fatias, validar a integração dos seguintes pontos:

1. **Roteamento HTTP:**
   Em `src/modules/<modulo>/routes.ts`, importar a função `register` da nova fatia e invocá-la na inicialização do roteador:
   ```typescript
   registerNovaFatia(routes, useCases);
   ```

2. **Raiz de Composição (*Dependency Injection*):**
   Em `src/composition.ts`:
   * Adicionar a tipagem no `export type UseCases`:
     ```typescript
     minhaAcao: MinhaClasseUseCase;
     ```
   * Instanciar a dependência no retorno de `buildUseCases`:
     ```typescript
     minhaAcao: new MinhaClasseUseCase(repositorio, ...);
     ```

3. **Suíte de Testes Unitários (*Test Doubles*):**
   Em `tests/doubles.ts`, adicionar os métodos correspondentes na classe `InMemory...Repository`.

4. **Persistência e Auditoria de Fronteiras (Em caso de Novo Módulo):**
   * Em `src/server.ts`, invocar a criação de tabelas: `create...Tables()`.
   * Em `scripts/check-boundaries.ts`, registrar a propriedade da nova tabela no dicionário `TABELAS`.

---

## 🏁 9. Protocolo de Garantia de Qualidade e Conformidade Arquitetural

Executar a tríade de verificação no terminal:

```bash
# 1. Verificação estática de tipos e importações:
bun x tsc --noEmit

# 2. Execução da suíte de testes de unidade e integração:
bun test

# 3. Auditoria automatizada de fronteiras e ownership de banco:
bun run verificar
```

A aprovação unânime das três ferramentas confirma que o sistema atende integralmente aos requisitos de integridade de tipos, correção funcional e estrita aderência arquitetural.
