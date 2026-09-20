// Executado pelo CI contra Spring Boot + SQL Server descartável, sem mocks da API.
// Não use contra o banco do laboratório: cria contas, produtos e pedidos de teste.
const { chromium, request } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BBS_E2E_URL || 'http://127.0.0.1:5173';
const password = 'ClienteE2e_2026!';
const adminEmail = process.env.BBS_ADMIN_EMAIL;
const adminPassword = process.env.BBS_ADMIN_PASSWORD;
if (process.env.BBS_E2E !== 'true' || !adminEmail || !adminPassword) {
  throw new Error('Use apenas no ambiente descartável de CI, com BBS_E2E=true e credenciais de teste.');
}
fs.mkdirSync('test-results', { recursive: true });
async function api(ctx, path, method = 'GET', data) {
  const { csrf } = await (await ctx.get(base + '/api/auth/session')).json();
  const res = await ctx.fetch(base + '/api' + path, { method, data, headers: { 'X-CSRF-TOKEN': csrf } });
  assert(res.ok(), `${method} ${path}: ${res.status()} ${await res.text()}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}
async function loginApi(ctx, email, senha) { return api(ctx, '/auth/login', 'POST', { email, senha }); }
async function loginUi(page, email, senha, mobile = false) {
  await page.goto(base + (mobile ? '/mobile' : '/'));
  await page.getByRole('button', { name: mobile ? 'Abrir minha conta' : 'Entrar / Cadastrar', exact: true }).click();
  const form = page.locator('dialog[open]');
  await form.getByLabel('E-mail', { exact: true }).fill(email);
  await form.getByLabel('Senha', { exact: true }).fill(senha);
  await form.getByRole('button', { name: 'Entrar', exact: true }).click();
  await form.getByRole('button', { name: 'Editar perfil', exact: true }).waitFor();
}
async function noOverflow(page, target = 'html') {
  assert(await page.locator(target).evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${target}: rolagem horizontal inesperada`);
}
async function verifyPersistence() {
  const saved = JSON.parse(fs.readFileSync('test-results/persistencia.json', 'utf8'));
  const ctx = await request.newContext();
  try {
    await loginApi(ctx, saved.email, password);
    const enderecos = await api(ctx, '/enderecos');
    assert(enderecos.some(e => e.id === saved.enderecoId && e.principal));
    const favoritos = await api(ctx, '/favoritos');
    assert(favoritos.some(p => p.id === saved.produtoId));
    const pedidos = await api(ctx, '/pedidos');
    assert.equal(pedidos.length, 2);
    const entregue = pedidos.find(p => p.id === saved.pedidoId);
    assert.equal(entregue.status, 'ENTREGUE');
    assert.equal(entregue.historico.length, 4);
    assert.equal(entregue.itens.length, 1);
    assert.equal(pedidos.find(p => p.id === saved.canceladoId).status, 'CANCELADO');
    await loginApi(ctx, adminEmail, adminPassword);
    assert.equal((await api(ctx, '/produtos/' + saved.produtoId)).estoque, 4);
    console.log('PASS: contas, favoritos, pedidos, histórico e estoque preservados após repetir a migração e reiniciar a API SQL Server.');
  } finally { await ctx.dispose(); }
}
async function run() {
  if (process.argv.includes('--verify')) return verifyPersistence();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  let desktop, phone;
  try {
    desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (const page of [desktop, phone]) { page.setDefaultTimeout(15000); page.on('pageerror', e => errors.push(e.message)); }
    await loginUi(desktop, adminEmail, adminPassword);
    const email = `mobile-${Date.now()}@teste.local`;
    await desktop.getByRole('button', { name: 'Clientes e usuários', exact: true }).click();
    await desktop.getByRole('button', { name: '+ Cadastrar cliente', exact: true }).click();
    const clienteForm = desktop.getByRole('dialog', { name: 'Cadastrar cliente', exact: true });
    await clienteForm.getByLabel('Nome', { exact: true }).fill('Cliente Mobile');
    await clienteForm.getByLabel('E-mail', { exact: true }).fill(email);
    await clienteForm.getByLabel('Senha inicial', { exact: true }).fill(password);
    await clienteForm.getByRole('button', { name: 'Cadastrar cliente', exact: true }).click();
    await desktop.getByRole('cell', { name: email, exact: true }).waitFor();
    assert.equal((await api(desktop.request, '/auth/session')).usuario.perfil, 'ADMIN');
    const p1 = await api(desktop.request, '/produtos', 'POST', { nome: 'SSD NVMe E2E', descricao: 'SSD de teste, 1 TB, conexão NVMe.', tipo: 'ssd', preco: 399.90, estoque: 5, ativo: true });
    const p2 = await api(desktop.request, '/produtos', 'POST', { nome: 'Placa de vídeo E2E', descricao: 'GPU de teste, 8 GB.', tipo: 'gpu', preco: 1999.90, estoque: 15, ativo: true });
    await desktop.getByRole('button', { name: 'Gerenciar produtos ↗', exact: true }).click();
    await desktop.getByRole('button', { name: 'Ver estoque baixo', exact: true }).click();
    await desktop.getByRole('row').filter({ hasText: p1.nome }).waitFor();
    assert.equal(await desktop.getByRole('row').filter({ hasText: p2.nome }).count(), 0);
    await desktop.screenshot({ path: 'test-results/admin-estoque.png', fullPage: true });
    await desktop.getByRole('button', { name: 'Mostrar todos', exact: true }).click();
    await desktop.getByRole('button', { name: '+ Novo produto', exact: true }).click();
    const editor = desktop.getByRole('dialog', { name: 'Novo produto', exact: true });
    await editor.getByLabel('Nome do produto', { exact: true }).fill('Mouse CRUD E2E');
    await editor.getByLabel('Descrição', { exact: true }).fill('Produto temporário de teste');
    await editor.getByLabel('Preço (R$)', { exact: true }).fill('99.90');
    await editor.getByLabel('Estoque', { exact: true }).fill('8');
    await editor.getByLabel('Categoria', { exact: true }).selectOption('mouse');
    await editor.locator('input[type=file]').setInputFiles({ name: 'teste.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') });
    await editor.getByRole('button', { name: 'Criar produto', exact: true }).click();
    const mouseRow = desktop.getByRole('row').filter({ hasText: 'Mouse CRUD E2E' });
    await mouseRow.waitFor();
    const uploaded = (await api(desktop.request, '/produtos')).find(p => p.nome === 'Mouse CRUD E2E');
    assert(uploaded.imgUrl.startsWith('/api/imagens/'));
    assert((await desktop.request.get(base + uploaded.imgUrl)).ok());
    await mouseRow.getByRole('button', { name: 'Editar', exact: true }).click();
    const edit = desktop.getByRole('dialog', { name: 'Editar produto', exact: true });
    await edit.getByLabel('Estoque', { exact: true }).fill('12');
    await edit.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await mouseRow.getByText('12 un.', { exact: true }).waitFor();
    await mouseRow.getByRole('button', { name: 'Desativar Mouse CRUD E2E', exact: true }).click();
    await mouseRow.getByRole('button', { name: 'Ativar Mouse CRUD E2E', exact: true }).waitFor();
    await mouseRow.getByRole('button', { name: 'Ativar Mouse CRUD E2E', exact: true }).click();
    await mouseRow.getByRole('button', { name: 'Excluir Mouse CRUD E2E', exact: true }).click();
    await desktop.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    await mouseRow.waitFor({ state: 'detached' });
    await desktop.getByRole('button', { name: '← Visão geral e pedidos', exact: true }).click();
    await desktop.screenshot({ path: 'test-results/admin-painel.png', fullPage: true });
    await loginUi(phone, email, password, true);
    await phone.getByRole('button', { name: 'Meus endereços', exact: true }).click();
    await phone.getByRole('button', { name: '+ Novo endereço', exact: true }).click();
    for (const [name, value] of Object.entries({ Apelido: 'Casa', CEP: '06400000', 'Rua / Logradouro': 'Rua de teste', Número: '10', Bairro: 'Centro', Cidade: 'Barueri', UF: 'SP' })) {
      await phone.getByLabel(name, { exact: true }).fill(value);
    }
    await phone.getByRole('button', { name: 'Salvar endereço', exact: true }).click();
    await phone.locator('.address-card').getByRole('heading').filter({hasText:'Casa'}).waitFor();
    const enderecoSalvo = (await api(phone.request, '/enderecos'))[0];
    assert(enderecoSalvo.principal);
    const trabalho = await api(phone.request, '/enderecos', 'POST', {...enderecoSalvo, id:undefined, apelido:'Trabalho',principal:true, numero:'20'});
    await api(phone.request, '/enderecos/'+enderecoSalvo.id, 'PUT', {...enderecoSalvo, principal:true});
    await api(phone.request, '/enderecos/'+trabalho.id, 'DELETE');
    await phone.locator('dialog[open]').getByRole('button', { name: 'Fechar', exact: true }).click();
    const ssd = phone.locator('.bbs-product').filter({ has: phone.getByRole('heading', { name: p1.nome, exact: true }) });
    const gpu = phone.locator('.bbs-product').filter({ has: phone.getByRole('heading', { name: p2.nome, exact: true }) });
    await ssd.getByRole('button', { name: 'Adicionar aos favoritos: ' + p1.nome, exact: true }).click();
    await ssd.getByRole('button', { name: 'Remover dos favoritos: ' + p1.nome, exact: true }).waitFor();
    await phone.reload();
    await phone.getByRole('button', { name: 'Remover dos favoritos: ' + p1.nome, exact: true }).waitFor();
    await noOverflow(phone);
    await phone.screenshot({ path: 'test-results/mobile-catalogo.png', fullPage: true });
    await ssd.getByLabel('Comparar produto', { exact: true }).check();
    await gpu.getByLabel('Comparar produto', { exact: true }).check();
    await phone.getByRole('button', { name: 'Comparar', exact: true }).click();
    const comparison = phone.getByRole('dialog', { name: 'Comparar produtos', exact: true });
    await comparison.getByRole('columnheader', { name: p1.nome, exact: true }).waitFor();
    await comparison.getByRole('columnheader', { name: p2.nome, exact: true }).waitFor();
    await noOverflow(phone, 'dialog[open]');
    await comparison.getByRole('button', { name: 'Fechar', exact: true }).click();
    await phone.getByRole('button', { name: 'Limpar', exact: true }).click();
    await ssd.getByRole('button', { name: 'Adicionar ao carrinho', exact: true }).click();
    await phone.locator('#cart-sidebar.open').waitFor();
    await phone.getByRole('button', { name: 'Finalizar Pedido', exact: true }).click();
    await phone.getByRole('button', { name: 'Continuar para entrega →', exact: true }).click();
    await phone.getByLabel('Endereço salvo', { exact:true }).selectOption(String(enderecoSalvo.id));
    assert.equal(await phone.getByLabel('Rua / Logradouro', {exact:true}).inputValue(), 'Rua de teste');
    await phone.getByRole('button', { name: 'Continuar para pagamento →', exact: true }).click();
    await phone.getByRole('heading', { name: 'Forma de pagamento', exact: true }).waitFor();
    for (const modalidade of ['Crédito', 'Débito', 'Boleto', 'PIX']) await phone.getByRole('radio', { name: new RegExp(modalidade) }).check();
    await noOverflow(phone, '.bbs-checkout');
    await phone.screenshot({ path: 'test-results/mobile-checkout.png', fullPage: true });
    await phone.getByRole('button', { name: 'Confirmar pedido demonstrativo', exact: true }).click();
    await phone.getByRole('heading', { name: 'Pedido registrado!', exact: true }).waitFor();
    const pedido = (await api(phone.request, '/pedidos'))[0];
    assert.equal(pedido.total, 374.81); // 399,90 - 39,99 + 14,90
    assert.equal(pedido.historico.length, 1);
    assert.equal(await phone.evaluate(() => localStorage.getItem('bbs_cart_draft')), '{}');
    await phone.getByRole('button', { name: 'Voltar à loja', exact: true }).click();
    const segundoPayload = { itens: [{ produtoId: p1.id, quantidade: 1 }], chave: 'segundo-' + Date.now(), entrega: 'normal', pagamento: 'pix', endereco: { cep: '06400000', rua: 'Rua de teste', numero: '10', bairro: 'Centro', cidade: 'Barueri', uf: 'SP' } };
    const segundo = await api(phone.request, '/pedidos', 'POST', segundoPayload);
    assert.equal((await api(phone.request, '/pedidos', 'POST', segundoPayload)).id, segundo.id);
    await phone.getByRole('button', { name: 'Abrir minha conta', exact: true }).click();
    phone.once('dialog', dialog => dialog.accept());
    await phone.locator('.bbs-order').filter({ has: phone.getByRole('heading', { name: 'Pedido #' + segundo.id, exact: true }) }).getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
    await phone.locator('.bbs-order').filter({ hasText: 'Pedido #' + segundo.id }).getByText('CANCELADO', { exact: true }).first().waitFor();
    await phone.locator('dialog[open]').getByRole('button', { name: 'Fechar', exact: true }).click();
    await desktop.getByRole('button', { name: '↻ Atualizar', exact: true }).click();
    const order = desktop.locator('.bbs-order').filter({ has: desktop.getByRole('heading', { name: 'Pedido #' + pedido.id, exact: true }) });
    for (const estado of ['separando', 'enviado', 'entregue']) await order.getByRole('button', { name: 'Marcar ' + estado, exact: true }).click();
    await order.getByText('ENTREGUE', { exact: true }).first().waitFor();
    await order.locator('summary').click();
    await desktop.screenshot({ path: 'test-results/admin-historico.png', fullPage: true });
    const denied = await api(desktop.request, '/produtos/' + p1.id);
    assert.equal(denied.estoque, 4);
    const entregue = (await api(phone.request, '/pedidos')).find(p => p.id === pedido.id);
    assert.equal(entregue.historico.length, 4);
    assert.equal(entregue.itens.length, 1);
    const another = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    another.on('pageerror', e => errors.push(e.message));
    await loginUi(another, email, password);
    await another.locator('dialog[open]').getByRole('button', { name: 'Fechar', exact: true }).click();
    await another.getByRole('button', { name: '♡ Favoritos', exact: true }).click();
    await another.getByRole('button', { name: 'Remover dos favoritos: ' + p1.nome, exact: true }).waitFor();
    assert.equal(await another.locator('.bbs-product').count(), 1);
    await noOverflow(another);
    await another.screenshot({ path: 'test-results/desktop-loja.png', fullPage: true });
    fs.writeFileSync('test-results/persistencia.json', JSON.stringify({ email, enderecoId: enderecoSalvo.id, produtoId: p1.id, pedidoId: pedido.id, canceladoId: segundo.id }));
    assert.deepEqual(errors, []);
    console.log('PASS: cliente cadastrado pelo admin, sessão mantida, produto com imagem, edição, status, exclusão, estoque baixo, favoritos entre dispositivos, comparação, compra mobile, cotação, desconto, idempotência, cancelamento, estoque e histórico SQL Server.');
  } catch (error) {
    for (const [name, page] of [['desktop', desktop], ['mobile', phone]]) if (page) {
      await page.screenshot({ path: `test-results/falha-${name}.png`, fullPage: true }).catch(() => {});
      fs.writeFileSync(`test-results/falha-${name}.html`, await page.content());
    }
    throw error;
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
