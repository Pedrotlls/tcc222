# Atualização visual da BBS

Este pacote muda somente a página principal. Não recria o banco, não altera produtos cadastrados e não substitui o checkout.

## Aplicar no computador

1. Faça uma cópia dos arquivos atuais antes de substituir, principalmente se você os editou.
2. Extraia o ZIP. Abra a pasta extraída e copie a pasta `Front`.
3. Cole essa pasta dentro de `tcc222`, no mesmo local em que já existem `Front`, `Back` e `database`.
4. Aceite mesclar as pastas e substituir os arquivos. Não apague a pasta `Front` original.
5. Confira se existe `tcc222/Front/bbs-react/src/storefront.css`.
6. Com a API rodando, execute `npm run dev` na pasta `Front/bbs-react` e atualize o navegador com Ctrl + F5.

Não deixe os arquivos dentro de uma pasta extra como `tcc222/BBS-visual-novo/Front`.

## O que mudou

- Abertura com ilustração vetorial de placa de vídeo, animação leve e botão para explorar o catálogo.
- Navegação, contador do carrinho, atalhos de categorias e filtros integrados.
- Seções por categoria com títulos e cores próprias.
- Busca, ordenação e filtragem preservadas. Ao ordenar por preço sem categoria selecionada, a lista fica única para manter a ordem global.
- Ilustrações de categoria para produtos sem foto, sempre identificadas como ilustração. Fotos válidas cadastradas continuam aparecendo.
- Ajustes de largura, textos longos, telas pequenas e movimento reduzido.
- Rodapé, apresentação do projeto e acesso à conta.

## Fotos dos produtos

Os blocos antigos com “BBS” apareciam porque o produto não possuía uma imagem válida em `imgUrl`. O novo visual não inventa fotos de modelos: usa uma ilustração genérica. Para exibir o produto real, edite seu endereço de imagem no cadastro administrativo. Nome, preço, descrição e estoque continuam vindo da API.

## Validação

Build, lint e testes automatizados de API/carrinho/frete/organização do catálogo executados localmente. A inspeção visual em navegador não pôde ser concluída neste ambiente porque o download do Chromium falhou. Conferir desktop e celular na instalação local.
