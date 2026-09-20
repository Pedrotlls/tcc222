# Validação da entrega BBS

## Resultado confirmado

Execução aprovada em 18/09/2026, conferida em 20/09/2026:
[GitHub Actions — 35406920922](https://github.com/Pedrotlls/tcc222/actions/runs/35406920922).

Código validado: `4bd8fc4c6c987121e516f16e8f7332877f86eb85`, branch `codex/bbs-completo`.
Os ajustes de documentação posteriores não alteram o código validado.

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Frontend | Aprovado | 14 testes, ESLint e build Vite |
| Backend | Aprovado | Compilação Java 17 e 17 testes Maven com H2 |
| Migrações SQL Server | Aprovado | Scripts 01, 03 e 04; repetição sem perder registros |
| API com SQL Server | Aprovado | Inicialização com validação do esquema real |
| Navegador desktop e mobile | Aprovado | Chromium, desktop 1440×1000 e mobile 390×844 |
| Persistência após reinício | Aprovado | Contas, endereços, favoritos, pedidos, histórico e estoque |

O ambiente SQL Server foi um contêiner descartável SQL Server 2022 Developer no GitHub Actions. Não foi utilizado o banco da escola. A API respondeu de verdade aos testes do navegador, sem simulação das respostas HTTP.

## Fluxos exercitados no navegador

- Login do administrador e cadastro de cliente mantendo a sessão administrativa.
- Cadastro de produto com upload de imagem, edição, ativação/desativação e exclusão.
- Filtro de estoque baixo e consulta dos produtos cadastrados.
- Login do cliente no mobile e cadastro de endereço pela interface.
- Segundo endereço, troca do principal e exclusão pela API, com índice único SQL Server.
- Endereço salvo selecionado e preenchido no checkout.
- Favoritos preservados após recarregar e entre navegador mobile e desktop.
- Comparação de dois produtos, sem rolagem horizontal da página.
- Compra mobile com cotação, seleção das quatro modalidades e desconto PIX.
- Pedido persistido e carrinho limpo após a confirmação.
- Reenvio idempotente, cancelamento pelo cliente e reposição do estoque.
- Mudanças RECEBIDO → SEPARANDO → ENVIADO → ENTREGUE e histórico com quatro eventos.
- Repetição das migrações, reinício da API e leitura dos mesmos registros.

Os testes Java também verificam CSRF, permissões administrativas, isolamento entre clientes, endereço de outra conta, validação de dados, limite de endereços, preservação da entrega dos pedidos após excluir o endereço e rejeição de estoque insuficiente. Os testes do frontend cobrem carrinho, quantidades, filtros, comparação e chave de pedido no acesso HTTP por IP.

## Evidências

O artefato `bbs-desktop-mobile-sqlserver`, na execução acima, contém capturas de catálogo desktop, catálogo mobile, checkout mobile, painel administrativo, estoque e histórico, além dos logs da API antes e depois do reinício. A retenção do artefato é de 14 dias, até 02/10/2026; baixe as evidências antes dessa data se for anexá-las à apresentação.

As capturas foram revisadas. Os produtos e contas que aparecem nelas são dados fictícios criados pelo teste; não são dados da escola.

## Conferência no laboratório

A validação automatizada não substitui a instalação no computador de apresentação:

1. Fazer backup do SQL Server e da pasta de uploads.
2. Com a API parada, aplicar 03 e 04. Em banco novo, aplicar antes o 01; o 02 é opcional.
3. Iniciar Spring Boot no Spring Tools e o frontend no VS Code.
4. Conferir o fluxo de apresentação em `docs/APRESENTACAO.md`.
5. Abrir `/mobile` em um aparelho físico na mesma rede e confirmar se a escola permite a comunicação entre dispositivos.

Pagamentos e frete continuam acadêmicos. A interface mobile é web, não APK. Testes de carga e uso comercial não foram homologados. A documentação Word foi atualizada em 20/09/2026 com os endereços implementados, o DER das sete tabelas, os manuais e estas evidências. Os campos pessoais não informados continuam identificados para preenchimento pelos integrantes.
