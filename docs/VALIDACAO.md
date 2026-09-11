# Validação da entrega

## Resultado confirmado no GitHub

[Execução 34559080415](https://github.com/Pedrotlls/tcc222/actions/runs/34559080415), commit f03ac877eda2df54d1bd0bf0ebb325547f857ab4:

- Frontend: npm ci, 5 testes, lint e build aprovados na versão anterior.
- Backend: compilação e testes Maven aprovados com JDK 17 e banco H2 em memória.
- Os testes de integração cobrem autorização, CSRF, preço calculado no servidor, idempotência, estoque, cancelamento, isolamento entre clientes, login/sessão e transições de status.

O frontend também passou localmente. O Maven local havia sido bloqueado pela resolução de DNS de repo.maven.apache.org; a execução no GitHub resolveu essa pendência de compilação/testes Java.

## Pendências do laboratório

- Executar database/01_criar_banco.sql no SQL Server real.
- Configurar a API no Spring Tools e confirmar validação do esquema SQL Server.
- Testar compra, cancelamento e persistência depois de reiniciar a API.
- Executar o roteiro manual de docs/APRESENTACAO.md em desktop e celular.
- Confirmar no novo workflow os testes da cotação regional.

Os testes H2 não comprovam o funcionamento do driver, esquema, autenticação ou comportamento concorrente no SQL Server. Testes de navegador/visuais não foram executados. Não colocar o projeto em uso comercial; as limitações estão no README.
