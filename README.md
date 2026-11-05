# 🚨 PROVA PRÁTICA TEES (05/11/2026): GUIA RÁPIDO DE CACHE COM REDIS

👉 **[CLIQUE AQUI PARA ABRIR O GUIA DEFINITIVO DA PROVA DE CACHE REDIS (list-books)](GUIA_ATIVIDADE_CACHE_REDIS.md)** 👈

* **Atividade:** Implementação de Cache com Redis na feature `list-books` (`/lista-livros`).
* **Valor:** 1,0 ponto | **Tempo:** 50 minutos | **Regra:** Não mexer em `search-books`!
* **Links Diretos:**
  * [GUIA_ATIVIDADE_CACHE_REDIS.md (Gabarito Completo Passo a Passo)](GUIA_ATIVIDADE_CACHE_REDIS.md)
  * [PROMPT_ANTIGRAVITY_PREPARAR_PC.md (Preparação Automática do PC Backup via Antigravity)](PROMPT_ANTIGRAVITY_PREPARAR_PC.md)
  * [GUIA_PROVA_TEES_2026.md (Manual Antigo de Arquitetura Modular)](GUIA_PROVA_TEES_2026.md)

---

# Biblioteca — uma feature, 53 fases

Tópicos Especiais em Engenharia de Software II · Ifes 2026.2

Um cadastro de livros construído em 53 passos, da API ingênua ao monólito
modular. O mesmo caso de uso atravessa o percurso inteiro: cada fase muda a forma
do código sem mudar o que ele faz, e a fase seguinte cobra o preço da anterior.

## Comece aqui

```bash
git clone https://github.com/maroquio/biblioteca-tutorial
cd biblioteca-tutorial
open .docs/tutorial-aluno.html
```

O tutorial traz as 53 fases em sequência, com o código pronto para copiar.
Este branch (`main`) tem o código no estado final, ao fim da fase 53.

## Caderno de Estudos e Referência Técnica

Para documentação detalhada sobre a arquitetura de Fatias Verticais, convenções de camadas e estudos práticos das atividades do laboratório, consulte o [Manual de Arquitetura Modular](MANUAL_ARQUITETURA_MODULAR.md).

## Uma branch por fase

Cada fase tem uma branch com o código **concluído** até ela e o enunciado em
`.docs/task.html`.

```bash
git checkout fase10             # o projeto ao fim da fase 10
git diff fase09 fase10          # exatamente o que a fase 10 mudou
git log --oneline fase10        # as dez fases até aqui
```

| Marco | Branches |
|---|---|
| Preparação | `fase01` – `fase08` |
| A API ingênua | `fase09` – `fase19` |
| A dor | `fase20` – `fase23` |
| A primeira reação | `fase24` – `fase30` |
| O domínio | `fase31` – `fase37` |
| Ports, casos de uso, payoff | `fase38` – `fase45` |
| Fatias e módulos | `fase46` – `fase53` |

## Requisitos

[Bun](https://bun.sh) 1.2 ou mais novo. Nenhum banco a instalar: o SQLite vem
embutido no Bun, e o arquivo é criado na primeira execução.

```bash
bun install
bun run dev
```