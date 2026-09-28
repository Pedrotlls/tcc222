import test from 'node:test';
import assert from 'node:assert/strict';
let serial=0;
const api=()=>import(`../src/services/api.js?test=${++serial}`);
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('restaura login com refresh sem expor tokens ao JavaScript',async()=>{
  const original=globalThis.fetch;let renewed=false;
  globalThis.fetch=async(url,options)=>{
    assert.equal(options.credentials,'include');
    if(url.endsWith('/auth/refresh')) {assert.equal(options.headers['X-CSRF-TOKEN'],'csrf');renewed=true;return response({ok:true});}
    return response({csrf:'csrf',renovavel:true,usuario:renewed?{id:1}:null});
  };
  try {assert.equal((await (await api()).session()).usuario.id,1);assert(renewed);}
  finally {globalThis.fetch=original;}
});
test('401 simultâneos fazem uma renovação e repetem cada operação uma vez',async()=>{
  const original=globalThis.fetch;let renewed=false,refreshes=0,calls=0;
  globalThis.fetch=async(url)=>{
    if(url.endsWith('/auth/session'))return response({csrf:'csrf',renovavel:true,usuario:null});
    if(url.endsWith('/auth/refresh')){refreshes++;await new Promise(resolve=>setTimeout(resolve,5));renewed=true;return response({ok:true});}
    calls++;return renewed?response([]):response({},401);
  };
  try {
    const client=await api();await Promise.all([client.request('/pedidos'),client.request('/favoritos')]);
    assert.equal(refreshes,1);assert.equal(calls,4);
  } finally {globalThis.fetch=original;}
});
test('credenciais inválidas não tentam renovar outra conta',async()=>{
  const original=globalThis.fetch;let refreshes=0;
  globalThis.fetch=async(url)=>{
    if(url.endsWith('/auth/session'))return response({csrf:'csrf',usuario:null});
    if(url.endsWith('/auth/refresh'))refreshes++;
    return response({message:'E-mail ou senha incorretos.'},401);
  };
  try {await assert.rejects((await api()).request('/auth/login',{method:'POST',body:{}}),/incorretos/);assert.equal(refreshes,0);}
  finally {globalThis.fetch=original;}
});
test('CSRF expirado repete somente requisição recusada pelo filtro',async()=>{
  const original=globalThis.fetch;let calls=0,sessions=0;
  globalThis.fetch=async(url)=>{
    if(url.endsWith('/auth/session')){sessions++;return response({csrf:'novo',usuario:{id:1}});}
    calls++;return calls===1?response({code:'CSRF_INVALID'},403):response({id:10});
  };
  try {assert.equal((await (await api()).request('/pedidos',{method:'POST',body:{}})).id,10);assert.equal(calls,2);assert.equal(sessions,2);}
  finally {globalThis.fetch=original;}
});
test('erro de rede não repete a compra nem apaga a conta',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url)=>{
    if(url.endsWith('/auth/session'))return response({csrf:'novo',usuario:{id:1}});
    calls++;throw new TypeError('network');
  };
  try {await assert.rejects((await api()).request('/pedidos',{method:'POST',body:{}}),/API indisponível/);assert.equal(calls,1);}
  finally {globalThis.fetch=original;}
});
