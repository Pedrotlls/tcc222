# Arquitetura e contratos

## Fluxo

React → /api (proxy Vite) → Spring Security → Controllers → Services → Repositories JPA → H2 ou SQL Server.
O backend serve as imagens gravadas em disco. Não precisa usar a pasta Front/SLA.

## Responsabilidades

| Camada | Responsabilidade |
| --- | --- |
| App / Header | Navegação e identificação da sessão |
| ProductList | Catálogo, busca, categoria, ordenação, detalhes |
| CartContext / cartState | Rascunho de compra e quantidades no dispositivo |
| Checkout | Coletar endereço e modalidade, enviar IDs/quantidades e chave |
| Account | Login, cadastro, perfil, histórico e administração de pedidos |
| AdminPage | CRUD e imagens de produtos |
| api.js | Cookies, CSRF, respostas e erros |
| SecurityConfig / AuthController | Identidade, sessão, senha BCrypt e autorização |
| CompraService | Regra de preço/frete, idempotência, locks, baixa e estorno de estoque |
| ProdutoController | CRUD, validação, arquivos e proteção de exclusão de histórico |
| ApiErrors | Erros controlados sem SQL/stacktrace |

## Dados

- Produto: nome, descrição, preço, estoque, categoria, imagem, status ativo.
- Usuario: nome, e-mail único normalizado, hash de senha e perfil.
- Compra: dono, chave idempotente por usuário, endereço, modalidade, status e totais.
- Compra.Item: snapshot de produto, nome, preço e quantidade.
- O histórico não muda quando o produto é editado.
- Senhas, números de cartão, CVV e códigos de pagamento nunca são gravados em pedidos.
- O preço estimado do carrinho pode mudar se o administrador atualizar o catálogo; a API usa o preço atual.
- Pedidos RECEBIDOS já reservam/baixam estoque. Cancelamento devolve uma única vez.
- Exclusão de produto com histórico é bloqueada; desativação mantém os registros.

## Endpoints

Prefixo visto pelo navegador: /api. Na API Java, não há esse prefixo.

| Método | Rota | Acesso / ação |
| --- | --- | --- |
| GET | /auth/session | Público: token CSRF e usuário atual, se houver |
| POST | /auth/registro | Público + CSRF: cadastrar cliente |
| POST | /auth/login | Público + CSRF: iniciar sessão |
| POST | /auth/logout | Autenticado + CSRF: encerrar sessão |
| PUT | /auth/perfil | Autenticado + CSRF: editar nome/senha própria |
| GET | /produtos/ativos | Catálogo público |
| GET | /produtos | Administrador: todos os produtos |
| GET | /produtos/{id} | Administrador: um produto |
| GET | /produtos/buscar/{texto} | Administrador: busca na API |
| POST | /produtos | Administrador + CSRF: criar |
| PUT | /produtos/{id} | Administrador + CSRF: editar |
| DELETE | /produtos/{id} | Administrador + CSRF: excluir sem histórico |
| PATCH | /produtos/{id}/status | Administrador + CSRF: alternar ativo |
| POST | /produtos/com-imagem | Administrador + CSRF: criar com arquivo |
| PUT | /produtos/{id}/com-imagem | Administrador + CSRF: editar com arquivo |
| GET | /imagens/{arquivo} | Imagem pública |
| GET | /pedidos | Apenas pedidos do usuário atual |
| POST | /pedidos | Autenticado + CSRF: registrar compra |
| PATCH | /pedidos/{id}/cancelar | Dono + CSRF: cancelar RECEBIDO |
| GET | /admin/pedidos | Administrador: todos os pedidos |
| GET | /admin/clientes | Administrador: clientes e usuários, sem senha |
| PATCH | /admin/pedidos/{id}/status | Administrador + CSRF: transição válida |

A interface administrativa não permite promover usuários ou apagar o histórico de clientes. A conta administrativa inicial é configurada pelo operador.

## Pedido de exemplo

```json
{
  "chave": "id-unico-do-checkout",
  "itens": [{"produtoId": 1, "quantidade": 1}],
  "entrega": "normal",
  "pagamento": "pix",
  "endereco": {
    "cep": "01001000", "rua": "Praça de exemplo", "numero": "10",
    "complemento": "", "bairro": "Centro", "cidade": "São Paulo", "uf": "SP"
  }
}
```

Primeiro obtenha o token em /auth/session. Em mutações, envie X-CSRF-TOKEN e mantenha o cookie de sessão. Um cliente não pode escolher o dono, o total ou o perfil administrativo enviando campos extras.

## Status permitidos

RECEBIDO → SEPARANDO → ENVIADO → ENTREGUE.
RECEBIDO e SEPARANDO podem ir para CANCELADO pelo administrador.
O dono só pode cancelar RECEBIDO. Estados finais não retornam.
Repetir o estado atual não causa nova baixa ou novo estorno.
