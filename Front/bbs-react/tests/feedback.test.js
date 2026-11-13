import test from 'node:test';
import assert from 'node:assert/strict';
import {aplicarVotos,comNotas,descricaoNota,distribuicao,filtrarPorNota,formatarNota,indexarResumo,mediaDe,proximoVoto} from '../src/utils/feedback.js';
import {catalogView} from '../src/components/catalogView.js';

test('resumo da API vira índice por produto e é aplicado aos produtos',()=>{
  const resumo=indexarResumo([{produtoId:1,media:4.5,total:12},{produtoId:3,media:'2.0',total:'1'}]);
  assert.deepEqual(resumo[1],{media:4.5,total:12});
  assert.deepEqual(resumo[3],{media:2,total:1});
  const produtos=[{id:1,nome:'A'},{id:2,nome:'B'}];
  const com=comNotas(produtos,resumo);
  assert.equal(com[0].media,4.5);assert.equal(com[0].totalAvaliacoes,12);
  assert.equal(com[1].media,0);assert.equal(com[1].totalAvaliacoes,0);
  assert.equal(produtos[0].media,undefined,'não muta a lista original');
  assert.deepEqual(indexarResumo(undefined),{});
});
test('nota é formatada em português e descrita para leitores de tela',()=>{
  assert.equal(formatarNota(4.5),'4,5');assert.equal(formatarNota(3),'3,0');
  assert.equal(descricaoNota(4.5,12),'Nota 4,5 de 5, 12 avaliações');
  assert.equal(descricaoNota(5,1),'Nota 5,0 de 5, 1 avaliação');
  assert.equal(descricaoNota(0,0),'Ainda sem avaliações');
});
test('média e distribuição consideram todas as notas de 5 a 1',()=>{
  const lista=[{nota:5},{nota:5},{nota:3},{nota:1}];
  assert.equal(mediaDe(lista),3.5);assert.equal(mediaDe([]),0);
  assert.deepEqual(distribuicao(lista),[{nota:5,quantidade:2},{nota:4,quantidade:0},{nota:3,quantidade:1},{nota:2,quantidade:0},{nota:1,quantidade:1}]);
  assert.deepEqual(distribuicao([]).map(d=>d.quantidade),[0,0,0,0,0]);
});
test('votar repete = remove; votar diferente = troca',()=>{
  assert.equal(proximoVoto(null,true),true);
  assert.equal(proximoVoto(true,true),null);
  assert.equal(proximoVoto(true,false),false);
  assert.equal(proximoVoto(false,false),null);
});
test('retorno do voto atualiza só a avaliação votada',()=>{
  const lista=[{id:1,uteis:0,naoUteis:0,meuVoto:null},{id:2,uteis:3,naoUteis:1,meuVoto:true}];
  const nova=aplicarVotos(lista,1,{uteis:1,naoUteis:0,meuVoto:true});
  assert.deepEqual(nova[0],{id:1,uteis:1,naoUteis:0,meuVoto:true});
  assert.equal(nova[1],lista[1]);
  assert.equal(lista[0].uteis,0,'não muta a lista original');
  assert.equal(aplicarVotos(lista,2,{uteis:2,naoUteis:1}).find(a=>a.id===2).meuVoto,null,'voto removido volta a null');
});
test('filtro de nota mínima esconde quem não alcança e quem ainda não tem avaliações',()=>{
  const produtos=[{id:1,media:4.6},{id:2,media:3.9},{id:3,media:0},{id:4}];
  assert.deepEqual(filtrarPorNota(produtos,'4').map(p=>p.id),[1]);
  assert.deepEqual(filtrarPorNota(produtos,3).map(p=>p.id),[1,2]);
  assert.equal(filtrarPorNota(produtos,'').length,4);
  assert.equal(filtrarPorNota(produtos,0).length,4);
});
test('ordenar por melhor avaliados: média, depois quantidade, depois nome; sem avaliação por último',()=>{
  const produtos=[
    {id:1,nome:'Zeta',tipo:'gpu',preco:1,media:4.5,totalAvaliacoes:2},
    {id:2,nome:'Alfa',tipo:'cpu',preco:1,media:4.5,totalAvaliacoes:10},
    {id:3,nome:'Beta',tipo:'gpu',preco:1,media:0,totalAvaliacoes:0},
    {id:4,nome:'Gama',tipo:'ram',preco:1,media:5,totalAvaliacoes:1},
    {id:5,nome:'Alpha sem nota',tipo:'ram',preco:1},
  ];
  const {groups,filtered}=catalogView(produtos,'','','nota');
  assert.deepEqual(filtered.map(p=>p.id),[4,2,1,5,3]);
  assert.equal(groups.length,1);assert.equal(groups[0].tag,'CATÁLOGO · POR AVALIAÇÃO');
  assert.deepEqual(catalogView(produtos,'','gpu','nota').groups[0].items.map(p=>p.id),[1,3]);
});
