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
test("total usa a cotacao devolvida pela API e o desconto da modalidade",() => {
  assert.deepEqual(calcularTotais(100,14.9,"pix"),{frete:14.9,desconto:10,total:104.9});
  assert.deepEqual(calcularTotais(100,53.69,"boleto"),{frete:53.69,desconto:7,total:146.69});
  assert.deepEqual(calcularTotais(100,14.9,"credito"),{frete:14.9,desconto:0,total:114.9});
  assert.equal(calcularTotais(19.99,14.9,"pix").desconto,2);
});
