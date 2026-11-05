# 🤖 PROMPT MESTRE PARA O ANTIGRAVITY (PREPARAÇÃO AUTOMÁTICA DO PC BACKUP)

> **Instrução para o Eduardo:**  
> Quando você abrir o Antigravity no outro computador, copie e cole apenas esta frase no chat:  
> 💬 **`Antigravity, leia o arquivo PROMPT_ANTIGRAVITY_PREPARAR_PC.md e prepare este computador do zero para a prova de 20 pontos de Cache Redis!`**

---

## 🎯 INSTRUÇÕES PARA O AGENTE ANTIGRAVITY NO NOVO COMPUTADOR

Olá, Antigravity! Você está configurando um computador de backup para o estudante Eduardo Soares Thomaz realizar uma avaliação prática de 20 pontos na disciplina **Tópicos Especiais em Engenharia de Software II (Prof. Maróquio)** no IFES.

Sua missão é executar automaticamente os 6 passos abaixo para deixar o ambiente pré-aquecido, compilado e com **100% dos testes verdes** (`79 pass, 0 fail`), para que o Eduardo não perca tempo baixando imagens Docker na sala de aula.

---

### PASSO 1: Verificar se o Docker Engine está rodando
Execute no terminal do sistema:
```bash
docker ps
```
* Se o Docker responder com a lista de contêineres, avance para o Passo 2.
* Se der erro de conexão com a API do Docker, avise imediatamente o Eduardo para abrir o **Docker Desktop** e aguardar a inicialização da engine.

---

### PASSO 2: Subir os contêineres do PostgreSQL 18 e Redis 8
Execute no diretório raiz do projeto:
```bash
docker compose -f infra/compose.yaml up -d db redis
```
Aguarde até que os serviços `db` e `redis` fiquem com status `healthy`.

---

### PASSO 3: Garantir a criação do banco de testes (`biblioteca_test`)
O contêiner do Postgres sobe com o banco `biblioteca`, mas a suíte de testes do Bun exige o banco `biblioteca_test`.  
Execute:
```bash
docker exec biblioteca-tutorial-db-1 createdb -U biblioteca biblioteca_test 2>$null || true
```
*(Se o banco já existir, o comando apenas segue em frente).*

---

### PASSO 4: Testar a conectividade do Redis 8
Execute:
```bash
docker exec biblioteca-tutorial-redis-1 redis-cli ping
```
Deve retornar: `PONG`.

---

### PASSO 5: Garantir que a feature de Cache em `list-books` está aplicada
Verifique se os seguintes arquivos estão presentes e atualizados no projeto:
1. `backend/src/modules/catalog/infrastructure/bookListCache.ts`
2. `backend/src/modules/catalog/features/list-books/listBooksCached.ts`
3. `backend/src/modules/catalog/features/list-books/route.ts` (chamando `listBooksCached` com `c.header("X-Cache", cache)`)
4. Invalidação `await invalidateBookListCache()` adicionada pós-commit em:
   * `backend/src/modules/catalog/features/create-book/createBook.ts`
   * `backend/src/modules/catalog/features/update-book/updateBook.ts`
   * `backend/src/modules/catalog/features/delete-book/deleteBook.ts`
   * `backend/src/integration/derivedData.ts`
5. Testes em:
   * `backend/src/modules/catalog/features/list-books/list-books-cache.test.ts`

*(Caso algum desses arquivos não esteja presente ou tenha sido clonado da branch original sem cache, consulte o código completo e gabarito em `GUIA_ATIVIDADE_CACHE_REDIS.md` e aplique-o).*

---

### PASSO 6: Baixar imagens, pré-compilar e validar a suíte completa
Execute o comando oficial de teste do projeto:
```bash
docker compose -f infra/compose.yaml run --rm --build test
```
Esse comando vai:
1. Baixar a imagem base do Bun.
2. Pré-compilar os assets do frontend e dependências.
3. Rodar todos os testes automatizados.

**Critério de Sucesso Obrigatório:**
A saída deve registrar:
```text
79 pass
0 fail
506 expect() calls
```

---

### PASSO 7: Feedback Final ao Eduardo
Assim que os testes passarem com 100% de sucesso, informe ao Eduardo:
1. Que o computador de backup está **100% aquecido, testado e com 79 testes verdes**.
2. Que as imagens do Docker já estão no cache local do HD (não precisará de internet na sala).
3. Mostre o link do guia mestre para ele manter aberto no navegador:  
   👉 `https://github.com/edusotho32/biblioteca-tutorial/blob/main/GUIA_ATIVIDADE_CACHE_REDIS.md`
