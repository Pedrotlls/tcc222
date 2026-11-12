# Recuperação de senha e relatórios BBS

## Responsabilidades dos ambientes

| Ambiente | Responsabilidade | Funções |
| --- | --- | --- |
| Web público | Escolher e comparar hardware | Catálogo por categoria/marca, filtros e sugestões, detalhes, avaliações, comparação, favoritos e checkout |
| Web administrativo | Operar e analisar a loja | Produtos/imagens/estoque, cadastro de clientes, cupons, status de pedidos, relatório por período e exportação CSV |
| Mobile web `/mobile` | Comprar e acompanhar com poucos toques | Mesma conta/carrinho, checkout, atalhos para endereços e acessos, resumo do carrinho, último pedido, favoritos e recuperação de senha |
| API e SQL Server | Aplicar regras e persistir os dados | Autorização, validação, cálculo do total, estoque, tokens, carrinho, pedidos e recuperação |

Os atalhos não substituem a autorização: a API decide quem pode administrar e a qual cliente cada registro pertence. Web e mobile usam a mesma API. O mobile mantém as funções de compra da Web e não é um APK.

## O que é o token

É uma credencial temporária criada após o login. O navegador envia essa credencial a cada operação; a API identifica o usuário e suas permissões. Não é a senha nem um pagamento.

Na BBS, o token fica em cookie HttpOnly, inacessível ao JavaScript. O acesso dura 15 minutos e pode ser renovado dentro do limite absoluto de oito horas. Sair, trocar a senha ou encerrar um acesso revoga as credenciais correspondentes. No banco são guardados hashes; não é usado JWT.

O link de recuperação usa **outro token**, válido por 15 minutos e uma única vez. Ele permite escolher uma nova senha; não faz login automaticamente. Ao redefinir, todos os acessos anteriores são encerrados. Links anteriores também perdem validade se a senha foi alterada.

## Instalação

1. Pare a API e faça backup do banco e uploads.
2. Atualize a branch `codex/bbs-completo`.
3. Se o banco está atualizado até o script 06, execute `database/07_recuperacao_senha.sql` no SSMS. Em banco novo: 01, 03, 04, 05, 06 e 07. O 02 é opcional. São doze tabelas.
4. No Spring Tools, Maven → Update Project para baixar a dependência de e-mail; o Maven Wrapper também está no projeto. A rede da escola precisa permitir baixar dependências.
5. Rode BbsApplication. No frontend: `npm ci` e `npm run dev` em `Front/bbs-react`.

## Configurar o envio de e-mail

O restante da loja funciona sem SMTP. Até configurar, “Esqueci minha senha” informa que o serviço está indisponível; não fornece links na tela nem no console.

Preencha as variáveis abaixo no arquivo local `Back/bbs/application.properties` (ao lado do pom.xml, ignorado pelo Git). Não altere o arquivo de recursos da aplicação. Environment do Spring Tools tem prioridade.

| Variável | Valor |
| --- | --- |
| BBS_RECOVERY_ENABLED | true após configurar o remetente |
| BBS_PUBLIC_URL | URL pública HTTPS da loja; em teste local http://localhost:5173/ |
| BBS_MAIL_FROM | Endereço autorizado pelo serviço SMTP |
| BBS_SMTP_HOST | Servidor informado pelo provedor |
| BBS_SMTP_PORT | Porta do provedor, normalmente 587 com STARTTLS |
| BBS_SMTP_USER | Usuário SMTP |
| BBS_SMTP_PASSWORD | Credencial SMTP fornecida pelo provedor |
| BBS_SMTP_AUTH | true |
| BBS_SMTP_TLS | true |

Não envie credenciais ao GitHub. A URL é fixa e não é construída a partir de cabeçalhos enviados pelo usuário. HTTP só é aceito para localhost/127.0.0.1; no celular físico, o link deve apontar para uma publicação HTTPS acessível. A configuração acima usa STARTTLS; consulte o provedor se ele exigir outro modo. A entrega em caixa postal real depende de configurar e homologar o SMTP.

O endpoint responde da mesma forma para conta existente ou inexistente e agenda o envio sem esperar o SMTP. A fila local comporta 100 solicitações com dois trabalhadores. Solicitações são limitadas a dez por IP em 15 minutos e a um envio por conta por minuto; confirmações são limitadas a trinta por IP em 15 minutos. Limites em memória são por instância e reiniciam com a API; implantação distribuída exige controle compartilhado. Falha SMTP não muda a senha; o usuário pode tentar depois. Logs não contêm token, e-mail ou senha.

Rotas públicas com CSRF: `POST /auth/recuperacao` recebe email; `POST /auth/recuperacao/confirmar` recebe token e senha. A tabela `bbs_recuperacao_senha` possui um registro por usuário, hash do token, hash da credencial, criação, expiração e indicador de uso. O script 07 é repetível e preserva contas.

## Relatórios administrativos

Abra Minha conta → Relatórios de vendas. Escolha data inicial e final (até 366 dias), clique em Consultar período e, se desejar, Exportar CSV. O arquivo abre no Excel e usa o período efetivamente consultado.

O painel mostra pedidos não cancelados, valor total com frete e descontos, ticket médio, quantidade de cancelamentos, distribuição por status, movimento diário e os dez produtos com mais unidades. Cancelados ficam fora dos valores e ranking. O subtotal do produto no ranking não inclui frete/descontos do pedido. As datas usam os registros da API. Os valores são demonstrativos e não comprovam receita ou pagamento real.

A rota `GET /admin/relatorios?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` exige ADMIN. O CSV não exporta dados pessoais e protege células contra interpretação como fórmula. Nomes de produtos vêm do histórico; mudanças no catálogo não recalculam compras antigas.

## Roteiro para o professor

1. Explorar catálogo Web e comparar dois produtos.
2. Entrar na mesma conta em desktop e mobile e mostrar o carrinho sincronizado.
3. No mobile, usar o atalho Endereços, confirmar compra e consultar o último pedido.
4. No admin, atualizar status e consultar relatório por período; exportar CSV.
5. Demonstrar Acessos e segurança e revogar uma sessão de outro navegador.
6. Com SMTP previamente configurado, solicitar recuperação, abrir o link e escolher nova senha; mostrar que acessos anteriores encerraram.

## Limites da entrega

Testes automatizados não substituem aceitação no aparelho/rede da escola. Nuvem 24/7, meta de três segundos, testes de carga, backups operacionais e entrega SMTP real dependem da implantação. Pagamento, frete e rastreio continuam demonstrativos.

Referências: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html) e [Spring Boot — Mail](https://docs.spring.io/spring-boot/3.3/appendix/application-properties/).
