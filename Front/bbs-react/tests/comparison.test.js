import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleComparison} from '../src/utils/comparison.js';
test('comparador aceita até 3 itens, remove seleção e não modifica a lista anterior',()=>{
  const ids=[1,2];
  assert.deepEqual(toggleComparison(ids,3),[1,2,3]);
  assert.deepEqual(toggleComparison([1,2,3],4),[1,2,3]);
  assert.deepEqual(toggleComparison([1,2,3],2),[1,3]);
  assert.deepEqual(ids,[1,2]);
});
