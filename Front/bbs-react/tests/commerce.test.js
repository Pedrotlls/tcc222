import test from "node:test";
import assert from "node:assert/strict";
import { cartReducer } from "../src/context/cartState.js";
import { calcularTotais } from "../src/utils/checkout.js";
test("adicionar respeita estoque e preserva outros itens",() => {
  let cart=cartReducer({}, {type:"add",id:1,name:"SSD",price:100,img:"",stock:1});
  cart=cartReducer(cart,{type:"add",id:1,name:"SSD",price:100,img:"",stock:1});
  assert.equal(cart[1].qty,1);
  const next=cartReducer(cart,{type:"add",id:2,name:"RAM",price:50,img:"",stock:3});
  assert.equal(next[1].qty,1);assert.equal(next[2].qty,1);assert.equal(cart[2],undefined);
});
test("remover ultima unidade e limpar nao deixam itens fantasmas",() => {
  const c=cartReducer({}, {type:"add",id:1,name:"SSD",price:100,stock:2});
  assert.deepEqual(cartReducer(c,{type:"qty",id:1,delta:-1}),{});
  assert.deepEqual(cartReducer(c,{type:"clear"}),{});
});
test("quantidade nao excede estoque e produto sem estoque nao entra",() => {
  const c=cartReducer({}, {type:"add",id:1,name:"SSD",price:100,stock:1});
  assert.equal(cartReducer(c,{type:"qty",id:1,delta:1})[1].qty,1);
  assert.deepEqual(cartReducer({}, {type:"add",id:2,stock:0}),{});
});
test("precos demonstrativos: PIX normal, boleto expresso e cartao",() => {
  assert.deepEqual(calcularTotais(100,"normal","pix"),{frete:15.9,desconto:10,total:105.9});
  assert.deepEqual(calcularTotais(100,"expresso","boleto"),{frete:29.9,desconto:7,total:122.9});
  assert.deepEqual(calcularTotais(100,"normal","credito"),{frete:15.9,desconto:0,total:115.9});
  assert.equal(calcularTotais(19.99,"normal","pix").desconto,2);
});
