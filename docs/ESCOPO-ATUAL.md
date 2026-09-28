# Escopo web e mobile — atualização de 28/09/2026

A BBS é uma loja acadêmica de hardware. O cenário apresentado no TCC considera uma operação que depende de planilhas, anotações e atendimento pelas redes sociais; o sistema demonstra a centralização de catálogo, clientes, estoque e pedidos. O levantamento não constitui comprovação de uma empresa real operando esse processo.

## Entrega implementada

| Requisito | Implementação |
| --- | --- |
| RF01_WEB | Vitrine por categoria e marca, busca com sugestões, filtro de preço máximo, ordenação, detalhes e avaliações de compradores |
| RF02_WEB | Cadastro, edição de perfil, validação de e-mail e CPF quando informado, tokens, privilégios de administrador |
| RF03_WEB | Carrinho multitem, quantidades, cupons, frete estimado e checkout demonstrativo |
| RF04_WEB | Produtos e imagens, marcas, estoque, ativação, clientes, cupons e status de pedidos no admin |
| RF05_MOB | `/mobile`, navegação inferior, filtros e sugestões adaptados à tela |
| RF06_MOB | Mesmo carrinho da conta, cupons, endereços e fluxo de compra |
| RF07_MOB | Pedidos, histórico de status e código único de acompanhamento interno |
| RF08_MOB | Contas compartilhadas pela mesma API; carrinho salvo no SQL Server, notificações SSE e recuperação por consulta periódica |

O mobile é uma aplicação web responsiva, não APK. Cada navegador faz seu próprio login; credenciais não são transmitidas entre aparelhos. Após entrar na mesma conta, ambos acessam os mesmos dados.

## Regras implementadas

- Login obrigatório para finalizar pedido (L.P.); permissões verificadas no servidor.
- Quantidades e disponibilidade verificadas com locks no checkout, baixa transacional e estoque não negativo (L.P./B.D.). Adicionar ao carrinho não reserva estoque.
- Preços, frete e descontos são recalculados pela API (L.P.). O cliente não escolhe o total.
- Cupons: percentual de 1 a 50%, validade em UTC, limite total de usos, ativação administrativa e consumo na mesma transação do pedido (L.P./B.D.). Cupom substitui desconto por PIX/boleto. Cancelamento não devolve uso; reenvio idempotente não consome novamente.
- Cada pedido recebe um código UUID único para acompanhamento na BBS (L.P./B.D.). Não representa rastreio dos Correios/transportadora.
- E-mail, CEP, CPF informado e demais campos passam por validação no servidor (L.P.). CPF é opcional no protótipo e não é devolvido nas listas/API de usuário.
- Status operacionais: RECEBIDO → SEPARANDO → ENVIADO → ENTREGUE. Admin altera; cliente pode cancelar RECEBIDO. CANCELADO repõe estoque uma vez. Não há status PAGO real.
- Produtos com pedidos não são apagados; devem ser desativados. Exclusão de produto sem histórico continua disponível no CRUD.
- Uma avaliação por cliente/produto, somente após pedido não cancelado. Enviar novamente atualiza a avaliação. Comentários são exibidos como texto e não HTML.
- Carrinho de visitante fica local. Ao entrar, a API combina itens com o carrinho da conta usando a maior quantidade por produto, para não duplicar em tentativas repetidas; sempre respeita estoque. Pedido confirmado limpa o carrinho compartilhado.
- SSE avisa navegadores conectados após confirmar a transação; consulta a cada dez segundos e ao voltar à aba recupera eventos perdidos. Não se promete latência zero em rede indisponível. SSE nesta implantação usa uma instância de API; múltiplas instâncias exigem um mecanismo compartilhado de eventos.

## Requisitos não funcionais: metas e evidências

| Requisito | Situação verificável |
| --- | --- |
| RNF01 — consultas até 3 segundos | Meta de desempenho, depende do volume, rede e servidor; requer medição na implantação escolhida |
| RNF02 — senhas protegidas | Hash BCrypt; tokens aleatórios protegidos por hash no SQL Server e cookies HttpOnly. Senha não usa criptografia reversível |
| RNF03 — nuvem 24/7 | Pendente de provedor, implantação e monitoramento; execução local não comprova disponibilidade |
| RNF04 — múltiplos usuários | Locks/transações e isolamento de contas implementados; capacidade máxima e escalabilidade dependem de teste de carga e infraestrutura |

Pagamentos, promoções por modalidade, frete e entrega são demonstrativos. Integração de cobrança, transportadora real e hospedagem não devem constar como concluídas sem contratação/configuração e homologação.

## Instalação e tabelas

Pare a API; execute `05_tokens_autenticacao.sql` e `06_escopo_loja.sql` após as migrações anteriores. O 06 preserva os dados existentes e pode ser repetido. A aplicação valida o esquema ao iniciar.

Tabelas: produto, bbs_usuario, bbs_compra, bbs_compra_item, bbs_compra_historico, bbs_favorito, bbs_endereco, bbs_sessao_token, bbs_cupom, bbs_avaliacao e bbs_carrinho_item.
