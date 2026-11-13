# Feedback dos produtos

Complementa as avaliações já existentes (nota de 1 a 5 + comentário, só após compra não cancelada, uma por cliente/produto).

## Instalação

Com a API parada, execute `database/08_feedback_produtos.sql` depois do 07 (repetível). Cria `bbs_avaliacao_voto`. Em banco novo: 01, 03, 04, 05, 06, 07 e 08; o 02 é opcional.

## O que o cliente vê

- **Estrelas nos cards** do catálogo (web e `/mobile`) e no detalhe do produto: média e quantidade de avaliações, ou "Sem avaliações".
- **Filtro "Nota mínima"** e ordenação **"Melhor avaliados"** (maior média, depois mais avaliações; produtos sem avaliação ficam por último).
- No detalhe: média, **distribuição por nota (5 a 1)**, ordenação das avaliações por **mais recentes** ou **mais úteis** e votos **👍 Sim / 👎 Não**.
- **Editar** (formulário já preenchido) e **excluir** a própria avaliação, com confirmação.

## Regras

- Voto: um por cliente/avaliação. Repetir o mesmo voto o remove; clicar no outro troca. Não é possível votar na própria avaliação. Visitantes veem as contagens e são levados ao login ao votar.
- Excluir a avaliação (pelo cliente ou pelo administrador) apaga também os votos dela.
- Mais úteis = saldo de votos (úteis menos não úteis); empate mantém a ordem mais recente. Considera as 100 avaliações mais recentes do produto.
- A API nunca devolve identificador nem e-mail do autor; só o primeiro nome.

## Administrador

**Administração → Avaliações de produtos**: lista as 300 mais recentes, filtra por nota e busca por produto, cliente ou comentário, mostra votos e remove com confirmação. A remoção é definitiva.

## Endpoints

Ver [ARQUITETURA.md](ARQUITETURA.md#endpoints). Novos: `GET /avaliacoes/resumo`, `DELETE /avaliacoes/{produtoId}`, `PUT|DELETE /avaliacoes/{id}/voto`, `GET /admin/avaliacoes`, `DELETE /admin/avaliacoes/{id}`.

## Testes

- Frontend: `tests/feedback.test.js` (resumo, formatação, distribuição, votos, filtro e ordenação por nota).
- Backend: cinco testes novos em `CommerceTests` (votos únicos e auto-voto, listagem/`minha`/ordem, resumo, exclusão com votos, moderação admin com autorização e CSRF).
- O workflow Validacao BBS aplica o script 08 (inclusive repetido) no SQL Server descartável e valida o esquema ao iniciar a API.
