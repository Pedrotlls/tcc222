// Extração de especificações a partir de nome + descrição cadastrados (e da base de conhecimento).
import { normalizar } from "./texto.js";
import { CHIPSETS, DDR_POR_SOCKET, GPUS, acharGpu, potenciaCpuEstimada } from "./conhecimento.js";

const RE_SOCKET = /\b(am4|am5|lga ?1151|lga ?1200|lga ?1700|lga ?1851)\b/g;

/** Todos os sockets citados no texto normalizado, em ordem e sem repetição. */
export function socketsNoTexto(n) {
  return [...new Set([...n.matchAll(RE_SOCKET)].map(m => m[1].toUpperCase().replace(" ", "")))];
}

export function chipsetNoTexto(n) {
  for (const [socket, lista] of Object.entries(CHIPSETS)) {
    for (const chip of lista) {
      if (new RegExp(String.raw`\b${chip}(?=[a-z]?\b)`).test(n)) return { chipset: chip, socket };
    }
  }
  return null;
}

/** Tipo(s) de memória citados: ["DDR4"], ["DDR5"] ou ambos. */
export function ddrNoTexto(n) {
  return [...new Set([...n.matchAll(/\bddr([345])\b/g)].map(m => "DDR" + m[1]))];
}

/** Chaves de formato de placa/gabinete presentes no texto: itx, matx, atx, eatx. */
export function formatosNoTexto(n) {
  const achados = new Set();
  let resto = n;
  // E-ATX exige hífen ou junto ("e-atx", "eatx"); "ATX e Micro-ATX" não pode virar E-ATX.
  if (/\be-atx\b|\beatx\b|\bextended atx\b/.test(resto)) { achados.add("eatx"); resto = resto.replace(/\be-atx\b|\beatx\b|\bextended atx\b/g, " "); }
  if (/\bmicro[- ]?atx\b|\bm-?atx\b/.test(resto)) { achados.add("matx"); resto = resto.replace(/\bmicro[- ]?atx\b|\bm-?atx\b/g, " "); }
  if (/\bmini[- ]?itx\b|\bitx\b/.test(resto)) { achados.add("itx"); resto = resto.replace(/\bmini[- ]?itx\b|\bitx\b/g, " "); }
  if (/\batx\b/.test(resto)) achados.add("atx");
  return [...achados];
}

/** Família de CPU a partir do texto normalizado: socket, geração/série e potência estimada. */
export function cpuNoTexto(n) {
  let m = n.match(/\bryzen\s*(?:ai\s*)?([3579])\s*(\d{4,5})\s*(x3d|xt|x|gt|g|f)?\b/);
  if (m) {
    const serie = Number(m[2][0]);
    const socket = serie <= 5 ? "AM4" : "AM5";
    return { trecho: m[0].trim(), marca: "amd", linha: Number(m[1]), serie, socket, sufixo: m[3] || "" };
  }
  m = n.match(/\bcore\s*ultra\s*([3579])\s*(\d{3})([a-z]{0,2})\b/);
  if (m) return { trecho: m[0].trim(), marca: "intel", linha: Number(m[1]), geracao: 15, socket: "LGA1851", sufixo: m[3] };
  m = n.match(/\bi([3579])\s*-?\s*(\d{4,5})([a-z]{0,2})\b/);
  if (m) {
    const modelo = m[2];
    const geracao = modelo.length === 5 ? Number(modelo.slice(0, 2)) : Number(modelo[0]);
    const socket = geracao >= 12 ? "LGA1700" : geracao >= 10 ? "LGA1200" : geracao >= 6 ? "LGA1151" : null;
    return { trecho: m[0].trim(), marca: "intel", linha: Number(m[1]), geracao, socket, sufixo: m[3] || "" };
  }
  return null;
}

const primeiro = (n, re) => { const m = n.match(re); return m ? Number(m[1]) : null; };

/**
 * Especificações conhecidas de um produto. Cada chave só existe quando foi encontrada.
 * inferidos lista as chaves que vieram da base de conhecimento (não do texto cadastrado).
 */
export function extrairSpecs({ nome = "", marca = "", descricao = "", tipo = "" }) {
  const n = normalizar(`${nome} ${marca} ${descricao}`);
  const specs = {};
  const inferidos = [];
  const inferir = chave => inferidos.push(chave);

  if (tipo === "cpu") {
    const cpu = cpuNoTexto(n);
    const explicitos = socketsNoTexto(n);
    if (explicitos.length) specs.socket = explicitos[0];
    else if (cpu?.socket) { specs.socket = cpu.socket; inferir("socket"); }
    if (cpu?.geracao) specs.geracao = cpu.geracao;
    if (cpu?.serie) specs.serie = cpu.serie;
    const ddr = ddrNoTexto(n);
    if (ddr.length) specs.ddrAceita = ddr;
    else if (specs.socket && DDR_POR_SOCKET[specs.socket]) { specs.ddrAceita = DDR_POR_SOCKET[specs.socket]; inferir("ddrAceita"); }
    const tdp = primeiro(n, /\btdp\D{0,10}(\d{2,3})\s?w\b/);
    if (tdp) specs.consumoW = Math.round(tdp * 1.4);
    else if (cpu) { specs.consumoW = potenciaCpuEstimada(cpu); inferir("consumoW"); }
    const nucleos = primeiro(n, /\b(\d{1,2})\s?-?\s?(?:core|cores|nucleos)\b/);
    if (nucleos) specs.nucleos = nucleos;
  }

  if (tipo === "mae") {
    const chip = chipsetNoTexto(n);
    if (chip) specs.chipset = chip.chipset;
    const explicitos = socketsNoTexto(n);
    if (explicitos.length) specs.socket = explicitos[0];
    else if (chip) { specs.socket = chip.socket; inferir("socket"); }
    const ddr = ddrNoTexto(n);
    if (ddr.length) specs.ddrAceita = ddr;
    else if (specs.socket && specs.socket !== "LGA1700" && DDR_POR_SOCKET[specs.socket]) { specs.ddrAceita = DDR_POR_SOCKET[specs.socket]; inferir("ddrAceita"); }
    const formatos = formatosNoTexto(n);
    if (formatos.length) specs.formato = formatos[0];
    else if (/\bb\d{3}m\b|\b[abhxz]\d{3}m\b/.test(n)) { specs.formato = "matx"; inferir("formato"); }
    if (/\bm\.?2\b|\bnvme\b/.test(n)) specs.temM2 = true;
  }

  if (tipo === "ram") {
    const ddr = ddrNoTexto(n);
    if (ddr.length) specs.ddr = ddr[0];
    const kit = n.match(/\b(\d)\s?x\s?(\d{1,3})\s?gb\b/);
    specs.capacidadeGb = kit ? Number(kit[1]) * Number(kit[2]) : primeiro(n, /\b(\d{1,3})\s?gb\b/);
    if (specs.capacidadeGb === null) delete specs.capacidadeGb;
    const mhz = primeiro(n, /\b(\d{4})\s?(?:mhz|mt\/s)\b/);
    if (mhz) specs.mhz = mhz;
  }

  if (tipo === "gpu") {
    const modelo = acharGpu(n);
    const tabela = modelo ? GPUS[modelo.chave] : null;
    const recomendada = primeiro(n, /\bfonte\s+(?:recomendada|minima|sugerida)\D{0,12}(\d{3,4})\s?w\b/);
    if (recomendada) specs.fonteRecomendadaW = recomendada;
    else if (tabela) { specs.fonteRecomendadaW = tabela[1]; inferir("fonteRecomendadaW"); }
    const tdp = primeiro(n, /\b(?:tdp|consumo)\D{0,10}(\d{2,3})\s?w\b/);
    if (tdp) specs.consumoW = tdp;
    else if (tabela) { specs.consumoW = tabela[0]; inferir("consumoW"); }
    if (modelo) specs.modelo = modelo.chave;
    const vram = primeiro(n, /\b(\d{1,2})\s?gb\s?(?:gddr|hbm)/);
    if (vram) specs.vramGb = vram;
    const comprimento = primeiro(n, /\bcomprimento\D{0,15}(\d{3})\s?mm\b/);
    if (comprimento) specs.comprimentoMm = comprimento;
  }

  if (tipo === "fonte") {
    let watts = primeiro(n, /\b(\d{3,4})\s?w\b/);
    if (!watts) {
      const modelo = n.match(/\b[a-z]{1,4}[- ]?(\d{3,4})\b/);
      const guess = modelo ? Number(modelo[1]) : null;
      if (guess >= 300 && guess <= 2000) { watts = guess; inferir("watts"); }
    }
    if (watts) specs.watts = watts;
    const cert = n.match(/\b80\s?plus\s?(white|bronze|silver|gold|platinum|titanium)\b/);
    if (cert) specs.certificacao = cert[1];
  }

  if (tipo === "cooler") {
    const sockets = socketsNoTexto(n);
    if (sockets.length) specs.sockets = sockets;
    const altura = primeiro(n, /\baltura\D{0,12}(\d{2,3})\s?mm\b/);
    if (altura) specs.alturaMm = altura;
    if (/\b(water|watercooler|agua|liquid\w*)\b/.test(n)) specs.liquido = true;
  }

  if (tipo === "gabinete") {
    const formatos = formatosNoTexto(n);
    if (formatos.length) specs.formatos = formatos;
    const gpuMax = primeiro(n, /\b(?:placa de video|gpu|vga)\D{0,20}(\d{3})\s?mm\b/);
    if (gpuMax) specs.gpuMaxMm = gpuMax;
    const coolerMax = primeiro(n, /\bcooler\D{0,20}(\d{3})\s?mm\b/);
    if (coolerMax) specs.coolerMaxMm = coolerMax;
  }

  if (tipo === "ssd") {
    if (/\bnvme\b/.test(n)) specs.interface = "NVMe";
    else if (/\bsata\b/.test(n)) specs.interface = "SATA";
    const cap = n.match(/\b(\d+(?:[.,]\d+)?)\s?(tb|gb)\b/);
    if (cap) specs.capacidadeGb = Math.round(Number(cap[1].replace(",", ".")) * (cap[2] === "tb" ? 1000 : 1));
  }

  if (tipo === "monitor") {
    const pol = primeiro(n, /\b(\d{2})\s?(?:pol|polegadas|inch)\b/) ?? primeiro(nome.toLowerCase(), /\b(\d{2})\s?(?:"|”)/);
    if (pol) specs.polegadas = pol;
    const hz = primeiro(n, /\b(\d{2,3})\s?hz\b/);
    if (hz) specs.hz = hz;
    const res = n.match(/\b(4k|uhd|qhd|1440p|2k|full ?hd|fhd|1080p)\b/);
    if (res) specs.resolucao = res[1];
  }

  specs.inferidos = inferidos;
  return specs;
}

/** Texto curto com as especificações mais úteis de um produto, para respostas e comparações. */
export function resumoSpecs(tipo, specs) {
  const partes = [];
  const rot = { eatx: "E-ATX", atx: "ATX", matx: "Micro-ATX", itx: "Mini-ITX" };
  if (tipo === "cpu") {
    if (specs.socket) partes.push(`socket ${specs.socket}`);
    if (specs.ddrAceita) partes.push(specs.ddrAceita.join("/"));
    if (specs.nucleos) partes.push(`${specs.nucleos} núcleos`);
  } else if (tipo === "mae") {
    if (specs.socket) partes.push(`socket ${specs.socket}`);
    if (specs.chipset) partes.push(specs.chipset.toUpperCase());
    if (specs.ddrAceita) partes.push(specs.ddrAceita.join("/"));
    if (specs.formato) partes.push(rot[specs.formato]);
  } else if (tipo === "ram") {
    if (specs.ddr) partes.push(specs.ddr);
    if (specs.capacidadeGb) partes.push(`${specs.capacidadeGb} GB`);
    if (specs.mhz) partes.push(`${specs.mhz} MHz`);
  } else if (tipo === "gpu") {
    if (specs.vramGb) partes.push(`${specs.vramGb} GB`);
    if (specs.fonteRecomendadaW) partes.push(`fonte recomendada ${specs.fonteRecomendadaW} W`);
  } else if (tipo === "fonte") {
    if (specs.watts) partes.push(`${specs.watts} W`);
    if (specs.certificacao) partes.push(`80 Plus ${specs.certificacao}`);
  } else if (tipo === "cooler") {
    if (specs.sockets) partes.push(`sockets ${specs.sockets.join(", ")}`);
  } else if (tipo === "gabinete") {
    if (specs.formatos) partes.push(`aceita ${specs.formatos.map(f => rot[f]).join(", ")}`);
  } else if (tipo === "ssd") {
    if (specs.interface) partes.push(specs.interface);
    if (specs.capacidadeGb) partes.push(specs.capacidadeGb >= 1000 ? `${specs.capacidadeGb / 1000} TB` : `${specs.capacidadeGb} GB`);
  } else if (tipo === "monitor") {
    if (specs.polegadas) partes.push(`${specs.polegadas}"`);
    if (specs.resolucao) partes.push(specs.resolucao.toUpperCase());
    if (specs.hz) partes.push(`${specs.hz} Hz`);
  }
  return partes.join(" · ");
}
