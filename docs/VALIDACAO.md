# Validação da entrega

## Executado no ambiente de edição

- Frontend: npm test — 5 testes aprovados (carrinho, limites, descontos, CSRF e propagação de erros).
- Frontend: npm run lint — aprovado.
- Frontend: npm run build — aprovado.
- Testes de navegador/visuais não foram executados; não presumir aprovação do roteiro manual.

## Backend: pendente de execução

O Maven não conseguiu baixar o parent Spring Boot 3.3.5: resolução de DNS de repo.maven.apache.org indisponível no ambiente. Portanto, a compilação e os testes de integração Java **não estão confirmados localmente**.

CommerceTests inclui cenários de autorização, CSRF, preço calculado no servidor, idempotência, estoque insuficiente, cancelamento, isolamento entre clientes, login/sessão e transições de status.
BbsApplicationTests valida inicialização do contexto em H2 de teste.
O workflow Validacao BBS executa testes Java e frontend no GitHub. Confira o resultado na aba Checks do PR antes de integrar à main; a presença do arquivo de workflow não significa que ele já passou.

Não colocar o projeto em uso comercial. As limitações estão no README.
