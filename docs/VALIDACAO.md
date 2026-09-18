# Validação da entrega — atualização de 18/09/2026

- Frontend: testes, lint e build executados localmente; resultados finais registrados após a integração.
- Backend: nova suíte inclui endereços privados, principal único, validação, limite e preservação da entrega no histórico.
- SQL Server: workflow executa migrações 01, 03 e 04, repete migrações, inicia a API com validação de esquema, testa navegador desktop/mobile e reinicia a API para conferir persistência.

O Maven local não conseguiu baixar dependências por falha de resolução de repo.maven.apache.org. A compilação Java e os testes SQL Server desta atualização precisam do resultado do GitHub Actions; não são comprovados por testes anteriores.

## Laboratório

Guardar backup do banco e uploads; aplicar 03 e 04 com API parada; iniciar Spring Tools e VS Code. Demonstrar cadastro pelo admin, vários produtos no carrinho, login obrigatório, endereços salvos, frete, pedido, carrinho limpo e acompanhamento. Abrir /mobile no celular na mesma rede. Pagamentos e frete continuam demonstrativos.
