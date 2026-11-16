# Brindes por valor de compra

Faixas **acumulativas**, calculadas no front pelo valor dos produtos (sem frete e sem descontos de PIX/boleto/cupom), em desktop e mobile:

| Valor dos produtos | Brinde |
|---|---|
| Qualquer compra | Adesivo BBS |
| a partir de R$ 500 | Chaveiro BBS |
| a partir de R$ 1.500 | Mousepad BBS |
| a partir de R$ 3.000 | Garrafa BBS |
| a partir de R$ 6.000 | Moletom BBS |

Onde aparece: barra de progresso no carrinho ("Faltam R$ X para o próximo brinde"), faixas liberadas/bloqueadas na revisão do pedido e brindes liberados na tela "Pedido registrado!". O chatbot também responde sobre brindes.

**Limite honesto:** é demonstrativo. O brinde não é gravado no pedido, cobrado nem enviado (o backend não tem essa regra). Código: `src/utils/brindes.js`, `src/components/Brindes.jsx`, teste em `tests/brindes.test.js`. As imagens estão em `public/brinde-*.png`.
