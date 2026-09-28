# Login por tokens — BBS

## Atualizar no computador da escola

1. Pare a API no Spring Tools e atualize a branch `codex/bbs-completo`.
2. No SSMS, execute `database/05_tokens_autenticacao.sql`. Banco novo: 01, 03, 04 e 05, nessa ordem. O 02 só adiciona exemplos.
3. Se as variáveis ainda não estiverem configuradas, copie `Back/bbs/application.properties.example` para `Back/bbs/application.properties`, ao lado de `pom.xml`. Preencha DB_URL, DB_USER e DB_PASSWORD. Não substitua o arquivo de `src/main/resources`.
4. Para criar o primeiro administrador, preencha BBS_ADMIN_EMAIL e uma BBS_ADMIN_PASSWORD de 12 a 64 caracteres (até 72 bytes). Se a conta já existe, a senha do cadastro é mantida; a senha de criação não é reaplicada. Pode deixar BBS_ADMIN_PASSWORD vazio depois da criação.
5. Run As → Spring Boot App. No frontend, `npm ci` se as dependências mudaram e `npm run dev`. Atualize o navegador. Faça login novamente depois desta atualização.

O arquivo local foi adicionado ao .gitignore. Ele acompanha uma cópia manual da pasta, mas não um clone pelo Git. Variáveis em Run Configurations → Environment têm prioridade sobre esse arquivo. A conexão precisa corresponder ao SQL Server do computador. Copiar código/configuração não transfere o banco nem as contas.

## Comportamento

- Token de acesso: 15 minutos.
- Token de renovação: oito horas, limite absoluto desde o login; a renovação não prolonga indefinidamente esse prazo.
- Ambos são tokens **opacos** aleatórios de 256 bits, não JWT. Não contêm nome, senha ou perfil.
- Cookies HttpOnly, SameSite=Strict, path=/; o JavaScript não recebe os tokens nem os grava no localStorage.
- O banco guarda somente SHA-256 dos tokens, vínculo com usuário, família, datas e revogação. A senha continua BCrypt.
- Cada renovação invalida o par anterior e emite outro na mesma família. Reutilizar um refresh já consumido revoga a família.
- Logout revoga a família inteira e apaga cookies. Trocar a senha revoga todos os acessos anteriores e emite um par para o navegador atual.
- Minha conta → Acessos e segurança: listar acessos próprios, encerrar outro acesso e sair de todos. Um cliente não pode listar ou revogar os de outra conta.
- Cookies e registros SQL permitem manter autenticação após reiniciar a API, dentro do prazo. A aplicação recupera o CSRF antes de renovar.
- Registros vencidos são eliminados no próximo login. Os registros consumidos permanecem até o vencimento para detectar reuso.
- Requisições concorrentes na mesma aba compartilham a renovação. Quando disponível, Web Locks também coordena abas. Em navegadores sem Web Locks, renovações de abas exatamente simultâneas podem exigir novo login por proteção contra reuso.

O backend busca o perfil atual no banco em cada requisição e continua exigindo ADMIN nas rotas administrativas. CSRF permanece obrigatório em todas as mutações, inclusive login, refresh e logout. O frontend só repete uma operação após 401 ou uma rejeição explícita de CSRF pelo filtro; não repete compras por falha de rede.

## Endpoints novos

| Método | Caminho | Regra |
| --- | --- | --- |
| POST | /auth/refresh | Cookie de renovação válido + CSRF; gira o par |
| GET | /auth/sessoes | Acessos ativos da própria conta; sem hashes/tokens |
| DELETE | /auth/sessoes/{id} | Dono + CSRF; revoga a família |
| POST | /auth/logout-todos | Autenticado + CSRF; revoga todos os acessos da conta |

`GET /auth/session` retorna usuário, CSRF e indicador `renovavel`, sem revelar o refresh. Login mantém o formato anterior da resposta (usuário), enviando tokens em Set-Cookie. Esta API atende o mobile web `/mobile`; não é um contrato OAuth nem um aplicativo nativo.

## SQL Server

A nova tabela `bbs_sessao_token` contém id, usuario_id (FK), familia, acesso_hash, renovacao_hash, credencial_hash, criado_em, acesso_expira_em, expira_em e revogado. Datas em UTC. Índices em hashes (únicos), usuário, família e vencimento. O script 05 é repetível e não apaga contas, produtos ou pedidos.

Para demonstrar sem expor hashes:

```sql
SELECT id, usuario_id, criado_em, acesso_expira_em, expira_em, revogado
FROM dbo.bbs_sessao_token ORDER BY id DESC;
```

## Configuração e apresentação

Os tempos ficam em `app.auth.access-seconds` e `app.auth.refresh-seconds`. Para publicação HTTPS, configure `BBS_COOKIE_SECURE=true`. O padrão false permite a demonstração HTTP em localhost/rede escolar. A tela mobile usa o mesmo backend via proxy Vite; o SQL Server não é acessado pelo celular diretamente.

Roteiro: login no PC e no mobile; abrir Acessos e segurança; encerrar um dos acessos; observar que as próximas operações daquele navegador exigem login; trocar senha e verificar revogação dos demais. Ao terminar em computador compartilhado, clique em Sair.

Base técnica: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
