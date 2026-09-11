# SQL Server + Spring Tools + VS Code

## 1. Criar o banco no SSMS

1. Abra o SQL Server Management Studio e conecte ao seu servidor.
2. Abra **01_criar_banco.sql** e clique em Executar (F5).
3. Confirme as quatro tabelas no banco **apibbs**.
4. Opcionalmente, execute **02_produtos_exemplo.sql** para adicionar cinco produtos fictícios.

O script cria apenas tabelas ausentes. Não altera o formato de tabelas antigas.
Se apibbs já existir com outro esquema, faça backup e compare os campos antes de adaptar.
O script usa os nomes snake_case do Hibernate e valores monetários DECIMAL(16,2).
Não cria login SQL nem atribui permissões ao servidor. Use o login SQL do laboratório autorizado a acessar apibbs.
O banco deve estar no esquema dbo. A aplicação usa validação de esquema, sem criar tabelas automaticamente.

## 2. Importar no Spring Tools

- File → Import → Maven → Existing Maven Projects.
- Selecione **Back/bbs**, marque pom.xml e finalize.
- Clique direito no projeto → Maven → Update Project.
- Use JDK 17 em Project Properties → Java Build Path.
- Run → Run Configurations → Spring Boot App → configuração de BbsApplication.
- Na aba **Environment**, adicione:

| Variável | Valor |
| --- | --- |
| SPRING_PROFILES_ACTIVE | sqlserver |
| DB_URL | jdbc:sqlserver://localhost:1433;databaseName=apibbs;encrypt=true;trustServerCertificate=true |
| DB_USER | Seu login SQL do laboratório |
| DB_PASSWORD | Senha desse login SQL |
| BBS_ADMIN_EMAIL | admin@bbs.local |
| BBS_ADMIN_PASSWORD | Uma senha própria com 12 a 64 caracteres |

DB_USER/DB_PASSWORD acessam o banco. BBS_ADMIN_EMAIL/BBS_ADMIN_PASSWORD criam a conta administrativa **da loja**. São coisas diferentes.
A senha inicial da loja não redefine uma conta já existente.
Use a opção de acrescentar variáveis ao ambiente, sem substituir o ambiente inteiro.
Não envie senhas ao GitHub nem compartilhe configurações de execução com senhas.
A URL acima usa certificado confiado somente para conexão de laboratório local.
Se o servidor não for localhost ou usar outra porta, ajuste DB_URL conforme a instalação do laboratório.

Clique Apply → Run. Espere a mensagem de inicialização na porta 8080.
O perfil padrão também é sqlserver; a variável o deixa explícito para a equipe.

## 3. Rodar o frontend no VS Code

Abra **Front/bbs-react** e no terminal execute:

```bash
npm ci
npm run dev
```

Abra http://localhost:5173. Mantenha o Spring Tools executando a API.
Use Node 22.12+ da linha 22.
Entre como administrador usando o e-mail e a senha que você configurou.

## 4. Erros comuns

- **Connection refused / TCP/IP connection failed:** confirme se o serviço SQL Server está ligado, se TCP/IP está habilitado e qual porta ele usa.
- **Login failed:** confira DB_USER, DB_PASSWORD, o modo de autenticação configurado e o acesso do login ao banco.
- **Cannot open database apibbs:** confirme a execução do primeiro script e o acesso do login a esse banco.
- **Schema-validation / missing table:** execute o script completo no servidor apontado pela URL, no esquema dbo.
- **Missing column / wrong column type:** existe uma tabela de outra versão; este script não migra estruturas anteriores.
- **Could not resolve placeholder DB_URL:** inclua as variáveis na configuração de execução e reinicie.
- **Could not resolve dependencies:** deixe o Maven terminar o download e confira a rede/proxy da escola.
- **Catálogo vazio:** execute o segundo script ou cadastre produtos como administrador.

Não rode os scripts no H2. O H2 é reservado aos testes automatizados, que ativam o perfil test.

## Verificação e referências

Os scripts foram conferidos com os modelos Java, mas ainda não executados em um SQL Server real neste ambiente.
Depois de subir o backend, crie um cliente e um pedido, reinicie a API e confirme a persistência.
Não marque o banco como validado antes dessa execução.

Referência da sintaxe: [Microsoft — CREATE TABLE](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-transact-sql).
