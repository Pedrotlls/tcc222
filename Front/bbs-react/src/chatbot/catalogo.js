// Liga a mensagem do cliente ao catálogo: base de produtos, produtos/categorias citados e componentes avulsos.
import { normalizar, tokens } from "./texto.js";
import { acharGpu } from "./conhecimento.js";
import { chipsetNoTexto, cpuNoTexto, ddrNoTexto, extrairSpecs, formatosNoTexto, socketsNoTexto } from "./specs.js";

export const NOME_TIPO = {
  gpu: "placas de vídeo", cpu: "processadores", ram: "memórias RAM", ssd: "SSDs", mae: "placas-mãe", fonte: "fontes",
  cooler: "coolers", gabinete: "gabinetes", monitor: "monitores", mouse: "mouses", teclado: "teclados", mousepad: "mousepads",
  headset: "headsets", webcam: "webcams", microfone: "microfones", cadeira: "cadeiras", controle: "controles", acessorios: "acessórios",
};
export const NOME_TIPO_SINGULAR = {
  gpu: "placa de vídeo", cpu: "processador", ram: "memória RAM", ssd: "SSD", mae: "placa-mãe", fonte: "fonte", cooler: "cooler",
  gabinete: "gabinete", monitor: "monitor", mouse: "mouse", teclado: "teclado", mousepad: "mousepad", headset: "headset",
};

/** Normaliza o catálogo da API e acrescenta especificações, notas e termos de busca. */
export function criarBase(produtos = [], resumo = {}) {
  const lista = produtos.map(p => {
    const tipo = p.tipo || "outros";
    const nota = resumo[p.id] ?? {};
    return {
      ...p, tipo, preco: Number(p.preco), estoque: Number(p.estoque ?? 0),
      specs: extrairSpecs({ nome: p.nome, marca: p.marca ?? "", descricao: p.descricao ?? "", tipo }),
      media: nota.media ?? 0, totalAvaliacoes: nota.total ?? 0,
      tokensNome: tokens(`${p.nome} ${p.marca ?? ""}`),
    };
  });
  return { produtos: lista, porId: new Map(lista.map(p => [p.id, p])) };
}

export const disponivel = p => p.ativo !== false && p.estoque > 0;

const GENERICOS = new Set(["placa", "video", "de", "da", "do", "memoria", "processador", "gamer", "gaming", "ssd", "rgb", "com", "para", "mouse",
  "teclado", "monitor", "fonte", "cooler", "gabinete", "headset", "kit", "pro", "nvme", "mid", "tower", "black", "white"]);
const MARCAS = new Set(["amd", "intel", "nvidia", "geforce", "radeon", "kingston", "corsair", "gigabyte", "logitech", "redragon", "lg", "asus", "msi", "samsung", "wd", "crucial", "cooler", "master", "hyperx"]);
const CAPACIDADE = /^\d+(gb|tb|mhz|w|hz|mm)$/;

const significativo = t => t.length >= 2 && !GENERICOS.has(t);
/** Token que identifica o modelo: tem dígito (4060, nv2, 14100f), exceto capacidades; ou palavra rara de 5+ letras que não é marca. */
const distintivo = t => (/\d/.test(t) && !CAPACIDADE.test(t) && t.length >= 2 && !/^\d{1,2}$/.test(t)) || (/^[a-z]{5,}$/.test(t) && !MARCAS.has(t) && !GENERICOS.has(t));

function pontuar(produto, msgTokens) {
  const sig = produto.tokensNome.filter(significativo);
  if (!sig.length) return { pontos: 0, distintivo: false };
  let soma = 0, achouDistintivo = false;
  for (const t of sig) {
    let valor = 0;
    if (msgTokens.has(t)) valor = 1;
    else if (t.length >= 4) for (const m of msgTokens) if (m.length >= 4 && (t.startsWith(m) || m.startsWith(t)) && /\d/.test(m)) { valor = 0.7; break; }
    if (valor && distintivo(t)) achouDistintivo = true;
    soma += valor;
  }
  return { pontos: soma / sig.length, distintivo: achouDistintivo };
}

/** Produtos do catálogo citados na mensagem (por nome/modelo), do mais provável ao menos provável. */
export function acharProdutos(mensagem, base) {
  const msgTokens = new Set(tokens(mensagem));
  const candidatos = base.produtos.map(p => ({ p, ...pontuar(p, msgTokens) })).filter(x => x.distintivo && x.pontos >= 0.5);
  candidatos.sort((a, b) => b.pontos - a.pontos);
  if (!candidatos.length) return [];
  // Quando o melhor é exato e outros são parciais da mesma família, mantém só os próximos do topo.
  const topo = candidatos[0].pontos;
  return candidatos.filter(c => c.pontos >= topo - 0.35).map(c => c.p);
}

const CATEGORIAS = [
  ["mousepad", /\bmouse ?pads?\b/],
  ["mae", /\bplacas?[- ]?maes?\b|\bmotherboards?\b|\bmobos?\b/],
  ["gpu", /\bplacas? de video\b|\bplacas? graficas?\b|\bgpus?\b|\bvga\b|\bplacas? de video\b/],
  ["cpu", /\bprocessad\w+|\bcpus?\b/],
  ["ram", /\bmemorias?\b|\bram\b|\bpentes?\b/],
  ["ssd", /\bssds?\b|\bnvme\b|\barmazenamento\b|\bhds?\b/],
  ["fonte", /\bfontes?\b|\bpsu\b/],
  ["cooler", /\bcoolers?\b|\bwater ?coolers?\b|\brefrigeracao\b/],
  ["gabinete", /\bgabinetes?\b|\bcases?\b/],
  ["monitor", /\bmonitor(?:es)?\b/],
  ["mouse", /\bmouses?\b/],
  ["teclado", /\bteclados?\b/],
  ["headset", /\bheadsets?\b|\bfones?\b/],
  ["webcam", /\bwebcams?\b/],
  ["microfone", /\bmicrofones?\b/],
  ["cadeira", /\bcadeiras?\b/],
  ["controle", /\bcontroles?\b|\bjoysticks?\b/],
];

/** Categorias da loja citadas na mensagem (ex.: ["gpu", "fonte"]). */
export function categoriasDoTexto(mensagem) {
  const n = normalizar(mensagem);
  return CATEGORIAS.filter(([, re]) => re.test(n)).map(([tipo]) => tipo);
}

const maiusculas = s => s.toUpperCase().replace(/\s+/g, " ");
const ent = (tipo, nome, specs, extra = {}) => ({ tipo, nome, specs: { inferidos: [], ...specs }, avulso: true, ...extra });

/**
 * Componentes citados que não estão no catálogo ("rtx 4070", "b550", "fonte de 550w", "ddr4").
 * Só cria avulsos para os tipos que ainda não foram resolvidos por produtos do catálogo.
 */
export function entidadesAvulsas(mensagem, tiposJaResolvidos = new Set()) {
  const n = normalizar(mensagem);
  const saida = [];
  if (!tiposJaResolvidos.has("gpu")) {
    const g = acharGpu(n);
    if (g) saida.push(ent("gpu", maiusculas(g.trecho), extrairSpecs({ nome: g.trecho, tipo: "gpu" })));
  }
  if (!tiposJaResolvidos.has("cpu")) {
    const c = cpuNoTexto(n);
    if (c) saida.push(ent("cpu", maiusculas(c.trecho), extrairSpecs({ nome: c.trecho, tipo: "cpu" })));
  }
  if (!tiposJaResolvidos.has("mae")) {
    const chip = chipsetNoTexto(n);
    const sockets = socketsNoTexto(n);
    const pedeMae = /\bplacas?[- ]?mae\b|\bmobo\b|\bmotherboard\b/.test(n);
    if (chip) {
      const formatos = formatosNoTexto(n);
      saida.push(ent("mae", `placa-mãe ${chip.chipset.toUpperCase()}`, extrairSpecs({ nome: `${chip.chipset} ${formatos[0] ?? ""} ${ddrNoTexto(n).join(" ")}`, tipo: "mae" })));
    } else if (pedeMae && sockets.length) {
      saida.push(ent("mae", `placa-mãe ${sockets[0]}`, extrairSpecs({ nome: `socket ${sockets[0]} ${ddrNoTexto(n).join(" ")}`, tipo: "mae" })));
    }
  }
  if (!tiposJaResolvidos.has("fonte") && /\bfonte\b/.test(n)) {
    const w = n.match(/\b(\d{3,4})\s?w\b/);
    if (w) saida.push(ent("fonte", `fonte de ${w[1]} W`, { watts: Number(w[1]) }));
  }
  if (!tiposJaResolvidos.has("ram") && /\b(memoria|ram|pente)\b/.test(n)) {
    const ddr = ddrNoTexto(n);
    if (ddr.length === 1) saida.push(ent("ram", `memória ${ddr[0]}`, { ddr: ddr[0] }));
  }
  return saida;
}

/** Entidade de comparação a partir de um produto da base. */
export function entidadeDeProduto(p) {
  return { tipo: p.tipo, nome: p.nome, specs: p.specs, produto: p };
}

/** Produtos e componentes avulsos citados, prontos para as regras de compatibilidade. */
export function entidadesDaMensagem(mensagem, base) {
  const produtos = acharProdutos(mensagem, base);
  // Um produto por tipo (o mais provável); os demais ficam como alternativas.
  const porTipo = new Map();
  for (const p of produtos) if (!porTipo.has(p.tipo)) porTipo.set(p.tipo, p);
  const doCatalogo = [...porTipo.values()].map(entidadeDeProduto);
  const avulsas = entidadesAvulsas(mensagem, new Set(porTipo.keys()));
  return { produtos, entidades: [...doCatalogo, ...avulsas] };
}
