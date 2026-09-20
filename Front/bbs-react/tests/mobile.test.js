import test from 'node:test';
import assert from 'node:assert/strict';
import {criarChavePedido} from '../src/utils/checkout.js';
test('checkout usa identificador nativo em contexto seguro',()=>{
  assert.equal(criarChavePedido({randomUUID:()=> 'uuid-nativo'}),'uuid-nativo');
});
test('checkout funciona por IP HTTP sem randomUUID e produz chave aceita pela API',()=>{
  const key=criarChavePedido({getRandomValues:values=>values.fill(171)});
  assert.equal(key,'ab'.repeat(16));
  assert.match(key,/^[a-zA-Z0-9-]{8,80}$/);
});
