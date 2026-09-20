# Tela mobile e cadastro de clientes

## Instalar a atualização

Copie as pastas Front e Back do pacote para dentro de tcc222, mesclando e substituindo os arquivos. Não exclua as pastas originais. Faça backup se você editou esses arquivos localmente. O pacote inclui os visuais anteriores para manter todas as dependências consistentes.

Na versão completa atual, pare a API e execute **database/03_atualizar_funcionalidades.sql** no SSMS. O cadastro usa dbo.bbs_usuario; favoritos e histórico usam duas tabelas novas. Pressione F5 no projeto Spring Tools e rode BbsApplication. Consulte [ENTREGA-COMPLETA.md](ENTREGA-COMPLETA.md).

## Abrir no computador

Na pasta Front/bbs-react execute npm run dev. Acesse http://localhost:5173/mobile.

Essa é uma tela web própria para celular. Compartilha login, catálogo, banco e pedidos com o desktop. Tem navegação inferior, busca, filtros, detalhes, carrinho, conta e checkout. Pode ser demonstrada no navegador do computador com a simulação de celular (F12 e Ctrl+Shift+M).

## Abrir no celular real

1. Conecte computador e celular à mesma rede.
2. Na pasta Front/bbs-react execute: npm run dev -- --host 0.0.0.0
3. No terminal do Windows, rode ipconfig e localize o Endereço IPv4 da conexão usada.
4. No celular, abra http://IP-DO-PC:5173/mobile. Por exemplo, http://192.168.1.20:5173/mobile (substitua pelo seu IP).
5. Mantenha a API no Spring Tools e o terminal do Vite abertos.

O frontend encaminha /api para localhost:8080 no computador; não troque o endereço do backend para o IP do celular. Redes escolares podem impedir a comunicação entre dispositivos; nesse caso, use a simulação de celular no computador ou uma rede local permitida. Se o Windows pedir, permita o Node na rede privada; não desative o firewall inteiro.

Não use localhost no celular: esse endereço apontaria para o próprio aparelho. Contas e pedidos são compartilhados pelo banco, mas o carrinho é um rascunho local e fica separado em cada navegador.

## Cadastro pelo administrador

Entre como administrador, abra Clientes e usuários e clique em Cadastrar cliente. Preencha nome, e-mail e senha inicial. O cliente poderá entrar normalmente e alterar sua senha em Minha conta.

POST /admin/clientes exige administrador e token CSRF. O perfil CLIENTE é fixado no servidor. A senha é armazenada como hash BCrypt e não é devolvida. O cadastro não troca a sessão do administrador.

## Validação

Consulte [VALIDACAO.md](VALIDACAO.md) para os resultados da versão atual. O workflow cobre Java, frontend e fluxo no navegador com SQL Server descartável; isso não testa o firewall ou a rede Wi-Fi da escola.
