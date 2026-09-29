# Frontend BBS

Execute esta pasta junto com Back/bbs. Instruções completas no [README principal](../../README.md).

```bash
npm ci
npm test
npm run lint
npm run build
npm run dev
```

Porta de desenvolvimento 5173; API Java na 8080 pelo proxy /api. Node 22.12+ da linha 22.
src/components/Checkout.jsx é o checkout atual. legacy/Checkout.jsx não é usado nem publicado.
A API é a fonte dos produtos, contas e pedidos; não existe fallback de banco fictício no navegador.
