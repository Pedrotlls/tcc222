import test from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,reportCsv} from '../src/utils/reports.js';
test('CSV impede fórmulas e escapa separadores e aspas em nomes de produtos',()=>{
  assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('SSD; "1TB"'),'"SSD; ""1TB"""');
  assert.equal(csvCell(' @SUM(A1)'),'"\' @SUM(A1)"');
});
test('CSV usa o período efetivamente consultado e inclui cancelamentos separados',()=>{
  const csv=reportCsv({inicio:'2026-09-01',fim:'2026-09-28',pedidos:2,cancelados:1,valor:200,ticketMedio:100,dias:[{data:'2026-09-25',pedidos:2,valor:200}],produtos:[{nome:'SSD',unidades:2,subtotal:180}]});
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"Cancelados";"1"'));assert.ok(csv.includes('"SSD";"2";"180"'));
});
