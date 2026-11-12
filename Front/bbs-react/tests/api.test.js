import test from "node:test";
import assert from "node:assert/strict";
import { request, session } from "../src/services/api.js";
test("sessao e mutacao transportam cookie e CSRF; erro nao vira sucesso",async () => {
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async (url,opts) => {
    calls.push({url,opts});
    return new Response(JSON.stringify(url.endsWith("/auth/session") ? {csrf:"test-csrf",usuario:null} : {id:1}),{status:200});
  };
  try {
    await session();
    const result=await request("/pedidos",{method:"POST",body:{chave:"pedido-test"}});
    assert.equal(result.id,1);assert.equal(calls[1].url,"/api/pedidos");
    assert.equal(calls[1].opts.headers.get("X-CSRF-TOKEN"),"test-csrf");
    assert.equal(calls[1].opts.credentials,"include");
    assert.equal(JSON.parse(calls[1].opts.body).chave,"pedido-test");
    globalThis.fetch=async () => new Response('{"message":"Sem estoque"}',{status:400});
    await assert.rejects(request("/pedidos",{method:"POST",body:{}}),/Sem estoque/);
  } finally {globalThis.fetch=original;}
});
