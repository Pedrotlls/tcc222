import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogView} from '../src/components/catalogView.js';

const products=[
  {id:1,tipo:'gpu',nome:'Placa BBS',descricao:'Vídeo para jogos',preco:1500},
  {id:2,tipo:'cpu',nome:'Processador BBS',descricao:'Computação',preco:700},
  {id:3,tipo:'gpu',nome:'Outra placa',descricao:'Compacta',preco:900},
  {id:4,tipo:null,nome:'Acessório',preco:20},
];
test('catálogo agrupado mantém GPU antes de CPU e inclui itens sem tipo',()=>{
  const {groups,filtered}=catalogView(products,'','','nome');
  assert.deepEqual(groups.map(g=>g.id),['gpu','cpu','outros']);
  assert.equal(filtered.length,4);
  assert.equal(groups[0].items.length,2);
});
test('busca combina categoria e descrição, ignorando maiúsculas e espaços externos',()=>{
  const {filtered}=catalogView(products,' VÍDEO ','gpu','nome');
  assert.deepEqual(filtered.map(p=>p.id),[1]);
});
test('ordenação por preço é global quando nenhuma categoria está selecionada',()=>{
  const {groups}=catalogView(products,'','','preco');
  assert.equal(groups.length,1);
  assert.deepEqual(groups[0].items.map(p=>p.id),[4,2,3,1]);
  assert.deepEqual(catalogView(products,'','','maior').filtered.map(p=>p.id),[1,3,2,4]);
});
test('ordenação por preço dentro da categoria não inclui outros produtos',()=>{
  const {groups}=catalogView(products,'','gpu','preco');
  assert.equal(groups[0].id,'gpu');
  assert.deepEqual(groups[0].items.map(p=>p.id),[3,1]);
});
test('busca sem resultado e categoria desconhecida são tratadas',()=>{
  assert.equal(catalogView(products,'inexistente','','nome').groups.length,0);
  assert.equal(catalogView([{id:5,tipo:'nova',nome:'Novo',preco:1}],'','','nome').groups[0].name,'nova');
  assert.equal(catalogView(products,'','outros','nome').filtered[0].id,4);
});
test('preparar visualização não modifica a lista original',()=>{
  const before=JSON.stringify(products);
  catalogView(products,'','','maior');
  assert.equal(JSON.stringify(products),before);
});
