import test from 'node:test';
import assert from 'node:assert/strict';
import {criarBase,responder,CONTEXTO_INICIAL} from '../src/chatbot/engine.js';
import {parseOrcamento} from '../src/chatbot/texto.js';
import {extrairSpecs} from '../src/chatbot/specs.js';
import {verificarPar} from '../src/chatbot/compat.js';
import {cotarFrete} from '../src/chatbot/frete.js';
import {montarPC} from '../src/chatbot/montagem.js';

// Mesmos produtos do DataSeeder.java (formato devolvido por /produtos/ativos).
const p=(id,nome,descricao,preco,estoque,tipo)=>({id,nome,descricao,preco,estoque,tipo,ativo:true});
const PRODUTOS=[
  p(1,'RTX 3060','Nvidia PCYES; fonte recomendada 550W',2199,10,'gpu'),
  p(2,'RTX 4070 SUPER','NVIDIA GeForce 12GB GDDR6X; fonte recomendada 650W',4499.99,8,'gpu'),
  p(3,'NVIDIA RTX 4090','GPU 24GB GDDR6X para jogos em 4K; fonte recomendada 850W',11999.99,5,'gpu'),
  p(4,'Core i3 14100F','Intel; socket LGA1700',699.99,15,'cpu'),
  p(5,'AMD Ryzen 5 5600','Processador 6-Core AM4; socket AM4',929.99,12,'cpu'),
  p(6,'HyperX 16GB','Kingston DDR4 3200MHz; memória DDR4',1099.99,20,'ram'),
  p(7,'SSD NV2 1TB','Kingston NVMe M.2',750,18,'ssd'),
  p(8,'SSD NV3 1TB','Kingston NVMe M.2',900,14,'ssd'),
  p(9,'B550M Gaming X','Gigabyte; socket AM4; memória DDR4; formato Micro-ATX',1700,7,'mae'),
  p(10,'Corsair CV550','Fonte 550W 80 Plus Bronze',499.99,25,'fonte'),
  p(11,'Hyper 212 Black','Cooler Master Air Tower 120mm; sockets AM4 e LGA1700',279.99,30,'cooler'),
  p(12,'Corsair 4000D RGB','Mid Tower ATX; suporta ATX, Micro-ATX e Mini-ITX; Vidro Temperado',799.99,9,'gabinete'),
  p(13,'Monitor LG 27" 144Hz','LG UltraGear IPS Full HD',1499.99,11,'monitor'),
  p(14,'Logitech G502 Hero','Mouse Gamer 25.600 DPI',399.99,22,'mouse'),
  p(15,'Redragon Kumara K552','Teclado Mecânico TKL RGB',249.99,17,'teclado'),
  p(16,'Redragon Flick XL','Mousepad Extended 80x30cm',129.99,35,'mousepad'),
  p(17,'HyperX Cloud II','Headset Gamer 7.1 Surround',549.99,13,'headset'),
];
const base=criarBase(PRODUTOS,{1:{media:4.5,total:2}});
const ask=(msg,ctx=CONTEXTO_INICIAL,extra={})=>responder(msg,base,ctx,extra);
const id=nome=>base.produtos.find(x=>x.nome===nome);

test('orçamento é lido de várias formas e ignora specs soltas',()=>{
  assert.equal(parseOrcamento('tenho R$ 5.000'),5000);
  assert.equal(parseOrcamento('uns 3 mil'),3000);
  assert.equal(parseOrcamento('2,5k'),2500);
  assert.equal(parseOrcamento('até 3000'),3000);
  assert.equal(parseOrcamento('orçamento de 4500 reais'),4500);
  assert.equal(parseOrcamento('fonte 650W com 16GB'),null);
  assert.equal(parseOrcamento('9000',{aceitarNumeroSolto:true}),9000);
});

test('especificações são extraídas do catálogo real',()=>{
  assert.equal(id('Core i3 14100F').specs.socket,'LGA1700');
  assert.equal(id('AMD Ryzen 5 5600').specs.socket,'AM4');
  assert.equal(id('B550M Gaming X').specs.formato,'matx');
  assert.equal(id('Corsair CV550').specs.watts,550);
  assert.equal(id('HyperX 16GB').specs.ddr,'DDR4');
  assert.equal(id('RTX 4070 SUPER').specs.fonteRecomendadaW,650);
  assert.equal(extrairSpecs({nome:'Ryzen 7 7800X3D',tipo:'cpu'}).socket,'AM5');
});

test('CPU × placa-mãe: socket diferente é incompatível, igual é compatível',()=>{
  const e=x=>({tipo:x.tipo,nome:x.nome,specs:x.specs});
  assert.equal(verificarPar(e(id('Core i3 14100F')),e(id('B550M Gaming X'))).status,'incompativel');
  assert.equal(verificarPar(e(id('AMD Ryzen 5 5600')),e(id('B550M Gaming X'))).status,'compativel');
});

test('fonte: 4070 SUPER não roda com 550W, 3060 roda',()=>{
  const a=ask('RTX 4070 SUPER roda com Corsair CV550?');
  assert.match(a.texto,/❌/);
  const b=ask('RTX 3060 funciona com a Corsair CV550?');
  assert.match(b.texto,/✅/);
  assert.doesNotMatch(b.texto,/❌/);
});

test('pergunta de compatibilidade pelo chat',()=>{
  const r=ask('i3 14100F combina com B550M?');
  assert.match(r.texto,/❌/);
  assert.match(r.texto,/LGA1700/);
  const ok=ask('Ryzen 5 5600 e B550M Gaming X são compatíveis?');
  assert.match(ok.texto,/✅/);
});

test('"o que combina" lista só itens compatíveis do catálogo',()=>{
  const r=ask('qual placa-mãe combina com o Ryzen 5 5600?');
  assert.deepEqual(r.produtos,[9]);
  const f=ask('qual fonte para RTX 4070 SUPER?');
  assert.match(f.texto,/650 W/);
  assert.ok(!f.produtos.includes(10),'CV550 não serve');
});

test('frete replica as regras do backend',()=>{
  assert.equal(cotarFrete({uf:'SP',subtotal:100,quantidade:1}).valor,14.9);
  assert.equal(cotarFrete({uf:'SP',subtotal:100,quantidade:1,modalidade:'expresso'}).valor,30.59);
  assert.equal(cotarFrete({uf:'SP',subtotal:3500,quantidade:1}).valor,0);
  assert.equal(cotarFrete({uf:'BA',subtotal:100,quantidade:3}).valor,37.9);
  assert.equal(cotarFrete({uf:'XX',subtotal:100}),null);
  const r=ask('qual o frete para o RJ?',CONTEXTO_INICIAL,{carrinho:{subtotal:200,quantidade:1}});
  assert.match(r.texto,/R\$\s?19,90/);
  const sem=ask('quanto é o frete?');
  assert.equal(sem.contexto.aguardando,'uf');
  assert.match(ask('SP',sem.contexto).texto,/R\$\s?14,90/);
});

test('montar PC respeita orçamento e compatibilidade',()=>{
  const r=montarPC(9000,base);
  assert.ok(!r.impossivel);
  assert.ok(r.total<=9000);
  const tipos=r.itens.map(i=>i.tipo);
  for(const t of ['cpu','mae','ram','gpu','ssd','fonte','gabinete'])assert.ok(tipos.includes(t),t);
  const baixo=montarPC(5000,base);
  assert.ok(baixo.impossivel);
  assert.ok(baixo.minimo>5000);
});

test('"monte um pc" pergunta o orçamento e entende a resposta',()=>{
  const a=ask('monte um pc gamer');
  assert.equal(a.contexto.aguardando,'orcamento');
  const b=ask('9000',a.contexto);
  assert.match(b.texto,/Montagem para/);
  assert.equal(b.contexto.aguardando,null);
  assert.ok(b.produtos.length>=7);
  assert.match(ask('monte um pc de R$ 5.000').texto,/não consigo fechar/);
});

test('preço, estoque e avaliações de um produto',()=>{
  const r=ask('quanto custa a RTX 3060?');
  assert.deepEqual(r.produtos,[1]);
  assert.match(r.texto,/2\.199,00/);
  assert.match(r.texto,/4,5 de 5/);
  assert.match(ask('e tem em estoque?',r.contexto).texto,/em estoque/);
});

test('recomendação por categoria e orçamento',()=>{
  const r=ask('melhor placa de vídeo até R$ 3.000');
  assert.deepEqual(r.produtos,[1]);
  const b=ask('processador mais barato');
  assert.equal(b.produtos[0],4);
  assert.match(ask('placa de vídeo até 1000').texto,/Não há/);
});

test('comparar dois produtos',()=>{
  const r=ask('compare RTX 3060 e RTX 4070 SUPER');
  assert.deepEqual([...r.produtos].sort(),[1,2]);
  assert.match(r.texto,/Diferença de preço/);
});

test('perguntas da loja: pagamento, cupom, cancelamento, garantia',()=>{
  assert.match(ask('aceita pix?').texto,/10% de desconto/);
  assert.match(ask('como uso um cupom?').texto,/Aplicar cupom/);
  assert.match(ask('quero cancelar meu pedido').texto,/RECEBIDO/);
  assert.match(ask('tem garantia?').texto,/acadêmico/);
});

test('saudação, ajuda, agradecimento e mensagem desconhecida',()=>{
  assert.match(ask('oi').texto,/Olá/);
  assert.ok(ask('ajuda').sugestoes.length>0);
  assert.match(ask('valeu!').texto,/Por nada/);
  assert.match(ask('asdkjh qwe').texto,/Não entendi/);
  assert.match(ask('   ').texto,/Posso ajudar/);
});

test('catálogo vazio não quebra o chatbot',()=>{
  const vazia=criarBase([]);
  assert.match(responder('monte um pc de 9000',vazia).texto,/não consigo fechar/);
  assert.match(responder('placa de vídeo até 3000',vazia).texto,/Não tenho/);
});
