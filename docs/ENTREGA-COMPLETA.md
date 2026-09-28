# Atualização completa BBS

## Instalar no projeto existente

1. Pare a API no Spring Tools e o Vite no VS Code. Guarde cópia dos arquivos que editou no PC e backup do banco.
2. Atualize a branch `codex/bbs-completo` pelo Git, conforme os comandos abaixo. Os caminhos continuam `tcc222/Front/bbs-react` e `tcc222/Back/bbs`. Se usar o ZIP da branch pelo GitHub, extraia e mescle Front, Back, database e docs; deixar o ZIP na pasta não atualiza o programa.
3. No SSMS do mesmo servidor usado pela API, execute **database/03_atualizar_funcionalidades.sql** e depois **database/04_enderecos_clientes.sql** e **database/05_tokens_autenticacao.sql**. Preserva contas, produtos e pedidos. Banco novo: primeiro execute o 01; o 02 é opcional para exemplos.
4. No Spring Tools, selecione o projeto, pressione F5 e rode **BbsApplication → Run As → Spring Boot App**. Mantenha as variáveis de banco e administrador já configuradas.
5. No VS Code, terminal em **Front/bbs-react**: `npm ci` e depois `npm run dev`. Abra **http://localhost:5173** e atualize com Ctrl+F5.

Na pasta `tcc222`, com suas alterações locais preservadas:

```bash
git fetch origin
git switch codex/bbs-completo
git pull --ff-only origin codex/bbs-completo
```

Se o Git avisar que há alterações ou divergência, preserve os arquivos e resolva o aviso; não use reset forçado. A versão com código validado é `4bd8fc4`; commits posteriores podem atualizar somente os guias.

## Funcionalidades

| Área | O que demonstrar |
| --- | --- |
| Loja | Busca, categoria, ordenação, detalhes, imagens, comparação de até três produtos |
| Conta | Cadastro, login, saída, edição de nome/senha, endereços salvos e favoritos entre dispositivos |
| Carrinho | Quantidades, remoção e rascunho mantido no navegador |
| Checkout | Revisão, endereço, ViaCEP opcional, frete regional, modalidades e descontos demonstrativos |
| Pedidos | SQL Server, controle de estoque, consulta, cancelamento e histórico de status |
| Admin | Painel, filtros, cadastro de cliente, CRUD/imagens, ativação e estoque baixo |
| Mobile | Catálogo, favoritos, comparação, conta, carrinho, compra e pedidos em `/mobile` |

Favoritos pertencem à conta. Comparação e limite visual de estoque baixo são controles da tela. Carrinho é local a cada navegador. Contas, endereços, favoritos, produtos, pedidos e histórico ficam no SQL Server; arquivos de imagens ficam nos uploads do backend.

## Abrir no celular

1. Computador e celular na mesma rede.
2. Frontend: `npm run dev -- --host 0.0.0.0`.
3. Windows: `ipconfig`. Anote o IPv4 da conexão usada.
4. Celular: **http://IP-DO-PC:5173/mobile**. Deixe API e Vite abertos.

No computador: **http://localhost:5173/mobile**. É uma tela web funcional, não um APK. Se a rede escolar bloquear comunicação entre aparelhos, apresente pelo navegador do PC usando F12 → Ctrl+Shift+M. Não use localhost no celular para acessar o computador.

## Consultar os dados

```sql
USE apibbs;
SELECT id,nome,email,perfil FROM dbo.bbs_usuario;
SELECT id,nome,preco,estoque,ativo FROM dbo.produto;
SELECT id,usuario_id,status,total,criado_em FROM dbo.bbs_compra;
SELECT * FROM dbo.bbs_compra_item;
SELECT * FROM dbo.bbs_favorito;
SELECT * FROM dbo.bbs_endereco;
SELECT * FROM dbo.bbs_compra_historico ORDER BY compra_id,ordem;
```

Pedidos antigos entram no histórico como IMPORTADO, sem data de transição desconhecida. Alterações futuras recebem sua data real. Admin: RECEBIDO → SEPARANDO → ENVIADO → ENTREGUE; cancelamento antes do envio. Cliente: cancela somente RECEBIDO. Cancelar repõe estoque uma vez.

## Escopo

Projeto acadêmico integrado com SQL Server. Pagamentos não geram cobranças ou comprovantes válidos. Frete é estimativa por UF, itens e modalidade, sem API de transportadora. O comparador mostra dados cadastrados, sem garantir compatibilidade de componentes. Resultados de testes: [VALIDACAO.md](VALIDACAO.md); roteiro: [APRESENTACAO.md](APRESENTACAO.md).

## Endereços salvos

Com a API parada, execute `database/04_enderecos_clientes.sql` depois do 03, inclusive em banco novo. A migração pode ser repetida e preserva os registros existentes. Na conta, abra **Meus endereços** para cadastrar, editar, excluir e definir o principal. O checkout carrega o principal e permite selecionar outro ou salvar um novo. Cada cliente acessa apenas seus endereços; pedidos guardam uma cópia da entrega e não mudam quando o cadastro é editado.

## Atualização de autenticação — 28/09/2026

Login com token de acesso (15 minutos) e renovação automática, limitada a oito horas desde o login. A tela **Acessos e segurança** funciona no desktop e no mobile, permite encerrar um acesso ou sair de todos. Trocar a senha encerra os outros acessos. Contas e senhas existentes são preservadas. Execute o script 05 com a API parada; veja [TOKENS.md](TOKENS.md).
