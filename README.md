# Bits Bytes Store — TCC 2026

Loja acadêmica de hardware em React, Spring Boot e **SQL Server**.
O frontend roda no **VS Code** e o backend no **Spring Tools**.
Pedidos, frete e modalidades de pagamento são demonstrativos: não existe cobrança ou entrega real.

## Preparar e executar

Siga o [guia SQL Server + Spring Tools + VS Code](database/LEIA-ME.md).

1. No SSMS, execute [01_criar_banco.sql](database/01_criar_banco.sql) e depois [03_atualizar_funcionalidades.sql](database/03_atualizar_funcionalidades.sql) e [04_enderecos_clientes.sql](database/04_enderecos_clientes.sql). Se o banco já funciona, pare a API e execute 03 e 04.
2. Opcional: execute [02_produtos_exemplo.sql](database/02_produtos_exemplo.sql).
3. No Spring Tools, importe Back/bbs como Existing Maven Project.
4. Configure DB_URL, DB_USER, DB_PASSWORD e as credenciais iniciais BBS_ADMIN_EMAIL/BBS_ADMIN_PASSWORD conforme o guia.
5. Execute BbsApplication como Spring Boot App (porta 8080).
6. No VS Code, abra Front/bbs-react e execute:

```bash
npm ci
npm run dev
```

Abra http://localhost:5173. O proxy /api encaminha as chamadas para o backend.
Requisitos: JDK 17, Node 22.12+ da linha 22, SQL Server e acesso à internet para baixar dependências.
As imagens enviadas ficam em Back/bbs/uploads/imagens. Mantenha cópias dessa pasta e backup do banco.
H2 é usado pelos testes automatizados; a entrega usa SQL Server com validação de esquema.
A pasta Front/SLA e Front/bbs-react/legacy são versões anteriores, não executadas pela aplicação atual.

## O que foi implementado

- Catálogo vindo da API, busca, categoria, ordenação e detalhes.
- Carrinho como rascunho no dispositivo, com limites de quantidade.
- Cadastro, login/logout, sessão HttpOnly, CSRF, edição de nome e senha.
- Endereços salvos por cliente, principal, seleção no checkout e retomada da compra após login.
- Administração autorizada no backend.
- CRUD de produtos, imagens JPG/PNG/GIF/WEBP de até 5 MB, ativação/desativação.
- Produtos com histórico devem ser desativados; a exclusão é bloqueada.
- Checkout integrado: pedidos e itens persistidos, histórico individual e painel administrativo.
- Preços, usuário, desconto, frete e total calculados no servidor.
- PIX simulado: 10% de desconto; boleto: 7%; crédito/débito: sem desconto.
- Cotação acadêmica de frete por UF/região, quantidade de itens, valor do carrinho e modalidade.
- Frete normal grátis a partir de R$ 3.500; entrega expressa custa mais e reduz o prazo estimado.
- Confirmação idempotente, transações e bloqueios para controlar estoque.
- Cancelamento com estorno de estoque; acompanhamento de status.
- Consulta opcional ao ViaCEP e preenchimento manual quando indisponível.
- Indicadores, lista de clientes/usuários, documentação e testes.
- Cadastro de clientes pelo administrador sem trocar sua sessão; busca de clientes e pedidos.
- Favoritos persistidos na conta entre desktop e celular; comparação de até três produtos.
- Alerta e filtro de estoque baixo com limite ajustável.
- Histórico de mudanças de status com data e origem, para cliente e admin.
- Loja, admin e checkout com estilos próprios; tela mobile funcional em **/mobile**.

Atualização de instalação existente e demonstração no celular: [ENTREGA-COMPLETA.md](docs/ENTREGA-COMPLETA.md).

Os modelos persistidos são Produto, Usuario (com favoritos) e Compra (com Item e Evento), além de EnderecoSalvo. Os modelos POJO antigos foram preservados como legado, sem migração automática de seus dados.

## Validar

No frontend:

```bash
npm test
npm run lint
npm run build
```

No backend: `mvnw.cmd test` no Windows ou `sh mvnw test` no Linux/macOS.
Os testes Maven usam perfil test e H2 em memória. O workflow também executa testes de navegador com SQL Server em contêiner descartável, sem acessar o banco da escola.
O workflow Validacao BBS também prepara SQL Server 2022 descartável e executa Chromium/Playwright com frontend e API reais, incluindo persistência após reiniciar a API e repetir a migração. Confira o resultado do seu commit em [VALIDACAO.md](docs/VALIDACAO.md).

Para testar o build local: mantenha a API ligada e execute npm run preview; abra http://localhost:4173.
Publicar apenas dist não publica a API Java. Hospedagem externa requer backend, SQL Server, HTTPS e proxy /api.

## Limites

- Não é um e-commerce comercial: a cotação não vem de transportadora e o projeto não integra gateway, envio de e-mail, recuperação por e-mail ou emissão fiscal.
- Use dados fictícios. O cadastro não verifica a propriedade do e-mail.
- Alterar a senha não revoga automaticamente sessões em outros dispositivos.
- Uso público requer revisão de segurança, rate limiting, confirmação de e-mail, recuperação segura, revogação de sessões, HTTPS e backups.
- O script 03 atualiza esta versão preservando dados; esquemas legados diferentes podem precisar de adaptação.
- Uma senha de banco foi removida da configuração, mas ainda existe no histórico Git anterior. Troque-a se estiver em uso. O histórico não foi reescrito.
- Algumas imagens dependem de sites externos; a interface exibe fallback se falharem.
- O mobile é uma tela web funcional, acessada pelo navegador. Não gera APK, notificações push ou pedidos offline.
- Consulte a validação e os Checks do PR para os testes executados; confira também a configuração local e a rede da escola.

Documentos: [arquitetura e endpoints](docs/ARQUITETURA.md), [apresentação](docs/APRESENTACAO.md), [validação](docs/VALIDACAO.md).

## Endereços salvos

Com a API parada, execute `database/04_enderecos_clientes.sql` depois do 03, inclusive em banco novo. A migração pode ser repetida e preserva os registros existentes. Na conta, abra **Meus endereços** para cadastrar, editar, excluir e definir o principal. O checkout carrega o principal e permite selecionar outro ou salvar um novo. Cada cliente acessa apenas seus endereços; pedidos guardam uma cópia da entrega e não mudam quando o cadastro é editado.
