# GUIA DE SOBREVIVÊNCIA E CONSULTA RÁPIDA: PROVA TEES
**Tópicos Especiais em Engenharia de Software 2026.2 · Prof. Maroquio (IFES)**

Este documento é a sua bússola completa para a prova prática. Leia com calma no GitHub pelo celular ou pelo VS Code do laboratório.

---

## 🖥️ 1. OS PRIMEIROS 2 MINUTOS NO COMPUTADOR DO LABORATÓRIO

1. **Abra o terminal** na pasta do projeto e rode o comando obrigatório:
   ```bash
   bun install
   ```
2. **Como abrir a página de instruções HTML no navegador:**
   No terminal do VS Code, digite:
   ```bash
   start atividade5.html
   # ou para a atividade 6:
   start atividade6.html
   ```
   *(Ou se preferir, abra a pasta no Windows Explorer, clique duas vezes no arquivo `.html` e ele abrirá no Chrome/Edge).*
3. **Crie uma branch de trabalho:**
   ```bash
   git checkout -b avaliacao-tees
   ```

---

## 🧭 2. O DECODIFICADOR FORENSE DE ENUNCIADOS (Como saber onde cada código vai)

O professor usa palavras acadêmicas. Use esta tabela para traduzir o título do bloco para o arquivo exato:

| O que está escrito no título do bloco | Plaquinha | Onde fica esse arquivo | Exemplo no Acervo | Exemplo em Avaliações |
| :--- | :---: | :--- | :--- | :--- |
| **"Comportamento da entidade"** | `edição` ou `novo` | `domain/<NomeDaEntidade>.ts` | `Livro.ts` | `Avaliacao.ts` |
| **"Contrato de persistência"** | `edição` ou `novo` | `domain/<Nome>Repository.ts` | `LivroRepository.ts` | `AvaliacaoRepository.ts` |
| **"Implementação da porta no SQLite"** | `edição` ou `novo` | `infrastructure/Sqlite<Nome>Repository.ts` | `SqliteLivroRepository.ts` | `SqliteAvaliacaoRepository.ts` |
| **"Entrada da fatia"** | `arquivo novo` | `features/<nome-da-acao>/input.ts` | `corrigir-titulo/input.ts` | `registrar-avaliacao/input.ts` |
| **"Formato de saída do módulo"** | `edição` ou `novo` | `src/modules/<modulo>/output.ts` | `acervo/output.ts` | `avaliacoes/output.ts` |
| **"Orquestração do caso de uso"** | `arquivo novo` | `features/<nome-da-acao>/<NomeCaso>.ts` | `CorrigirTitulo.ts` | `RegistrarAvaliacao.ts` |
| **"Borda HTTP da fatia"** | `arquivo novo` | `features/<nome-da-acao>/route.ts` | `corrigir-titulo/route.ts` | `registrar-avaliacao/route.ts` |
| **"Dublê do repositório"** | `edição` | `tests/doubles.ts` | `InMemoryLivroRepository` | `InMemoryAvaliacaoRepository` |
| **"Ponte entre vocabulários"** | `arquivo novo` | `src/adapters/<NomeDaPonte>.ts` | - | `AcervoComoConsultaDeAvaliacoes.ts` |

---

## 🕵️ 3. ONDE COPIAR CADA IMPORT SEM ADIVINHAR NADA (A Cola Aberta)

Você **NUNCA** precisa inventar caminhos nem contar pontinhos `../` de cabeça. Abra os arquivos irmãos que **JÁ ESTÃO PRONTOS** e copie o topo:

* **Para criar qualquer `input.ts`:**
  Abra: `src/modules/acervo/features/cadastrar-livro/input.ts`.
  Copie o topo dele (já vem com `getBodyAsObject`, `getFieldAsText`, etc.).
* **Para criar qualquer `route.ts`:**
  Abra: `src/modules/acervo/features/cadastrar-livro/route.ts`.
  Copie o topo dele (já vem com `Hono` e `UseCases`).
* **Para criar qualquer `UseCase.ts`:**
  Abra: `src/modules/acervo/features/cadastrar-livro/CadastrarLivro.ts`.
  Copie os imports de `NotFound`, `RuleConflict` e dos identificadores.
* **Para criar qualquer Ponte / Adapter:**
  Abra: `src/adapters/AutoriaComoConsulta.ts`.
  A estrutura da classe é idêntica! É só trocar "Autor" por "Livro".

---

## 🔮 4. PREVISÕES: O QUE ELE PODE PEDIR NA 2ª CHAMADA?

Se o professor mudar o tema hoje, ele só pode inventar **3 variações simples**. Veja como resolver cada uma:

### Variação A: Cancelar / Desativar / Excluir Livro (`DELETE` ou `PATCH`)
* **O que muda na Entidade:** Um método `desativar(): Livro` que muda um booleano `ativo = false` ou `comStatus("CANCELADO")`.
* **O que muda no Repositório:** Método `delete(id: LivroId): void` ou `updateStatus(livro: Livro): void`.
* **O que muda na Rota:** Verbo `DELETE /livros/:id` ou `PATCH /livros/:id/desativar`. O resto é idêntico à Atividade 5!

### Variação B: Outro Módulo Novo (ex: `leitores`, `usuarios` ou `emprestimos`)
* **A Regra de Ouro:** Segue rigorosamente os **mesmos 11 passos da Atividade 6**:
  1. Cria o ID em `shared/identifiers.ts`.
  2. Cria a pasta `src/modules/<novo-modulo>/`.
  3. Cria a entidade em `domain/`, as interfaces de repositório e a fatia com `input.ts`, `UseCase.ts` e `route.ts`.
  4. Se precisar consultar livro, cria uma interface no acervo e uma Ponte em `src/adapters/`.

### Variação C: Buscar Livro por Categoria ou Autor (`GET /livros?categoria=...`)
* **Como resolver:** Abra `src/modules/acervo/features/buscar-livro/`. Ela já faz exatamente isso com paginação e busca! Basta copiar o padrão existente.

---

## 🔌 5. O CHECKLIST DAS LIGAÇÕES FINAIS (Fase 5 - Vale 3 Pontos)

Depois de colar todos os blocos, faça esta fiação em 2 minutos:

1. **Ligar a rota no roteador do módulo:**
   Abra `src/modules/<modulo>/routes.ts`.
   Importe a função `register` da nova fatia e chame ela dentro da função `criarRotas...`:
   ```typescript
   registerNovaFatia(routes, useCases);
   ```
2. **Ligar a injeção de dependência na Composição:**
   Abra `src/composition.ts`.
   Adicione o novo caso de uso no `type UseCases` e instancie ele no retorno de `buildUseCases`:
   ```typescript
   novoCasoDeUso: new NovoCasoDeUso(repositorio, ...),
   ```
3. **Atualizar os Dublês de Teste:**
   Abra `tests/doubles.ts`. Cole os métodos falsos na classe `InMemory...` para o `bun test` não quebrar.
4. **Se for Módulo Novo:**
   * Registre a criação da tabela em `src/server.ts` chamando `create...Tables()`.
   * Adicione o nome da tabela no dicionário de `scripts/check-boundaries.ts`:
     `nova_tabela: "nome_do_modulo"`.

---

## 🏁 6. A TRÍADE DE VERIFICAÇÃO ANTES DE ENTREGAR

No terminal do VS Code, rode os 3 comandos:
```bash
# 1. Garante que não tem nenhum erro de TypeScript
bun x tsc --noEmit

# 2. Garante que todos os testes passaram
bun test

# 3. Garante que o robô do professor aprovou as fronteiras
bun run verificar
```
Passou verde nos 3? A nota máxima está no seu bolso. Respire fundo e boa prova!
