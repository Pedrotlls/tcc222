import test from 'node:test';
import assert from 'node:assert/strict';
import {BRINDES,situacaoBrindes} from '../src/utils/brindes.js';

test('carrinho vazio não libera brinde e indica o primeiro nível',()=>{
  const s=situacaoBrindes(0);
  assert.equal(s.liberados.length,0);
  assert.equal(s.proximo.nome,'Chaveiro BBS');
});
test('faixas são acumulativas e comparadas no valor exato',()=>{
  assert.deepEqual(situacaoBrindes(100).liberados.map(b=>b.nome),['Adesivo BBS']);
  assert.equal(situacaoBrindes(499.99).liberados.length,1);
  assert.equal(situacaoBrindes(500).liberados.length,2);
  assert.equal(situacaoBrindes(1500).liberados.length,3);
  assert.equal(situacaoBrindes(3000).liberados.length,4);
  assert.equal(situacaoBrindes(6000).liberados.length,5);
});
test('falta e progresso até o próximo brinde',()=>{
  const s=situacaoBrindes(1000);
  assert.equal(s.proximo.nome,'Mousepad BBS');
  assert.equal(s.faltam,500);
  assert.equal(s.progresso,50);
  const max=situacaoBrindes(9000);
  assert.equal(max.proximo,null);assert.equal(max.faltam,0);assert.equal(max.progresso,100);
});
test('valores inválidos não quebram',()=>{
  assert.equal(situacaoBrindes(undefined).liberados.length,0);
  assert.equal(situacaoBrindes(-50).liberados.length,0);
  assert.equal(situacaoBrindes('abc').liberados.length,0);
  assert.equal(BRINDES.length,5);
});
