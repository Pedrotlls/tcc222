# Chatbot BBS (assistente de dúvidas)

Botão flutuante "Dúvidas?" em todas as telas (desktop e `/mobile`). **Roda 100% no navegador, sem IA externa nem chave de API**: usa regras e o catálogo real (`/produtos/ativos`) e as notas (`/avaliacoes/resumo`), carregados na primeira abertura.

## O que ele responde
| Tema | Exemplo |
|---|---|
| Compatibilidade | "i3 14100F combina com B550M?", "RTX 4070 SUPER roda com a CV550?", "qual placa-mãe combina com o Ryzen 5 5600?" |
| Fonte necessária | "qual fonte para RTX 4070 SUPER?" |
| Preço, estoque, avaliação | "quanto custa a RTX 3060?", "e tem em estoque?" |
| Recomendação | "melhor placa de vídeo até R$ 3.000", "processador mais barato" |
| Comparação | "compare RTX 3060 e RTX 4070 SUPER" |
| Montar PC | "monte um PC de R$ 9.000" (ou "monte um PC" e ele pergunta o orçamento) |
| Frete | "frete para o RJ?" (usa o carrinho, se houver) |
| Loja | pagamento, cupom, cancelamento, acompanhamento, conta, avaliações |

Os cartões de produto têm estrelas e **Adicionar ao carrinho**.

## Regras de compatibilidade (`src/chatbot/compat.js`)
Socket CPU × placa-mãe (com aviso de BIOS), DDR4/DDR5 (RAM × placa × CPU), fonte (maior entre a recomendação do fabricante e consumo estimado CPU+GPU+100 W com folga de 20%), formato da placa × gabinete, coolers por socket, M.2/SSD. As especificações são **extraídas do nome/descrição** dos produtos; quando algo não aparece, o bot diz "não consegui confirmar" em vez de chutar. Por isso descrições como "socket AM4", "DDR4", "fonte recomendada 650W" ajudam muito ao cadastrar produtos.

## Limites honestos
- Frete usa as mesmas regras de `FreteService.java`: é estimativa acadêmica.
- Pagamentos, garantia e entrega são demonstrativos; o bot avisa isso.
- Não tem memória entre sessões (só o contexto curto da conversa aberta).
- A montagem considera só produtos ativos e em estoque, e não inclui periféricos nem frete.

## Arquivos
`src/chatbot/` (engine, catalogo, compat, frete, montagem, specs, conhecimento, texto), `src/components/ChatWidget.jsx` + `chatbot.css`, `tests/chatbot.test.js`. O antigo `Front/SLA/chatbot.js` foi substituído por este.
