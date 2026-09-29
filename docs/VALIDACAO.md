# Validação da entrega BBS

## Resultado confirmado em 29/09/2026

Execução aprovada: [GitHub Actions — 36576461265](https://github.com/Pedrotlls/tcc222/actions/runs/36576461265).
Código validado: `f511b9df519040f6d36fd0d5a620a301c4a7466a`, branch `codex/bbs-completo`.
Alterações posteriores exclusivamente documentais não modificam esse código.

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Frontend | Aprovado | 23 testes, ESLint e build Vite |
| Backend | Aprovado | Java 17; 44 testes Maven com H2, sem falhas |
| Migrações SQL Server | Aprovado | Scripts 01, 03, 04, 05, 06 e 07, inclusive repetição |
| API com SQL Server | Aprovado | Inicialização e validação do esquema real |
| Navegador desktop e mobile | Aprovado | Chromium, desktop 1440×1000 e mobile 390×844 |
| Persistência após reinício | Aprovado | Autenticação, carrinho, avaliações, uso do cupom e registros comerciais |

O banco de teste foi um contêiner descartável SQL Server 2022 Developer no GitHub Actions. Não foi usado o banco da escola. O navegador chamou a API real, sem simular as respostas HTTP. A atualização também aprovou relatórios, exportação CSV, atalhos mobile e recuperação de senha com servidor SMTP local de teste. A primeira tentativa identificou que abrir o link de recuperação na mesma aba não atualizava a tela; o tratamento de mudança de fragmento foi corrigido e o fluxo completo foi aprovado.

## Fluxos exercitados no navegador

- Recuperação de senha: solicitação pela interface, link de uso único, abertura na mesma aba, redefinição e novo login; acessos anteriores revogados e reuso do link rejeitado.
- Relatórios: período, totais, cancelados fora dos valores, ranking e download CSV.
- Atalhos mobile para endereços, pedidos e segurança, com resumo do carrinho e último pedido.
- Login administrativo; cadastro de cliente com CPF; sessão do administrador preservada.
- Criação de cupom pela interface, com percentual, validade e limite de usos.
- CRUD de produto com imagem; ativação, estoque baixo e exclusão permitida.
- Busca no mobile com filtros de marca e preço máximo.
- Login na mesma conta em dois navegadores, com carrinho compartilhado e alteração de quantidade refletida no outro aparelho.
- Endereços salvos, definição de principal, seleção no checkout e isolamento por conta.
- Favoritos entre navegadores, comparação e ausência de overflow horizontal nos pontos verificados.
- Compra mobile, frete estimado, modalidades de pagamento e aplicação de cupom de 20%.
- Total de R$ 334,82: R$ 399,90 − R$ 79,98 + R$ 14,90. O cupom substitui o desconto PIX.
- Pedido com código interno único; carrinho vazio nos dois navegadores após a confirmação.
- Avaliação publicada após compra e consultada em outra sessão.
- Confirmação idempotente, cancelamento, reposição única de estoque e histórico de estados.
- Renovação do acesso ao remover somente o cookie de acesso; listagem de sessões.
- Repetição de migrações, reinício da API e recuperação do token, carrinho, avaliação, cupom e pedidos.

Os testes Java verificam também expiração, rotação e reuso de token, revogação, troca de senha, CSRF, autorização, CPF, compra exigida para avaliação, limite/validade de cupons, isolamento do carrinho e importação idempotente. Esses testes não equivalem a um ensaio de carga de múltiplas instâncias.

## Evidências e limites

O artefato `bbs-desktop-mobile-sqlserver` contém capturas e logs da API, com retenção de 14 dias. As capturas do novo painel, relatórios, catálogo e atalhos mobile foram revisadas. São dados fictícios do teste. O arquivo de estado autenticado e a caixa SMTP de teste, que contêm credenciais temporárias, são excluídos dos artefatos.

A documentação Word de 29/09/2026 registra o escopo, as doze tabelas, tokens, manuais e evidências. As tabelas de descrição dos problemas foram preservadas. Os campos pessoais não informados permanecem para preenchimento pelos integrantes.

## Instalação e aceitação no laboratório

1. Fazer backup do SQL Server, uploads e alterações locais.
2. Parar a API e aplicar as migrações ausentes: 03, 04, 05, 06 e 07. Em banco novo, começar pelo 01; o 02 é opcional.
3. Conferir `Back/bbs/application.properties` ou Environment do Spring Tools. O arquivo local é ignorado pelo Git; variáveis antigas têm prioridade.
4. Iniciar API no Spring Tools e frontend no VS Code; seguir `docs/APRESENTACAO.md`.
5. Abrir `/mobile` em aparelho físico na rede permitida e repetir o fluxo de apresentação.

Pendentes: configuração e entrega por provedor SMTP real, aceitação na rede/aparelho da escola, escolha e configuração de hospedagem, medição da meta de três segundos e capacidade sob carga. SSE usa uma instância de API, com recuperação periódica a cada dez segundos. O mobile é web, não APK. Pagamentos, frete e acompanhamento são acadêmicos; não há cobrança nem rastreio real de transportadora.

Histórico: a execução `35406920922`, em 18/09/2026, aprovou a versão anterior com 14 testes frontend e 17 Java; ela não é a evidência das novas funcionalidades.

Para os novos recursos, instalação do script 07 e configuração opcional de e-mail, consulte [Recuperação e relatórios](RECUPERACAO-E-RELATORIOS.md).
