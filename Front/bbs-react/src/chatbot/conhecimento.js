// Base de conhecimento usada quando a descrição do produto não traz a especificação.
// Valores aproximados, publicados pelos fabricantes; o chatbot sempre avisa quando usa esta base.

/** Chipsets de placa-mãe -> socket e memória aceita. */
export const CHIPSETS = {
  AM4: ["a320", "b350", "x370", "a520", "b450", "x470", "b550", "x570"],
  AM5: ["a620", "b650e", "b650", "x670e", "x670", "b840", "b850", "x870e", "x870"],
  LGA1700: ["h610", "b660", "h670", "z690", "b760", "h770", "z790"],
  LGA1200: ["h410", "b460", "h470", "z490", "h510", "b560", "h570", "z590"],
  LGA1151: ["h110", "b150", "h170", "z170", "b250", "h270", "z270", "h310", "b360", "b365", "h370", "z370", "z390"],
  LGA1851: ["h810", "b860", "z890", "w880"],
};

/** Tipo de memória por socket. LGA1700 existe em placas DDR4 e DDR5, então depende do modelo. */
export const DDR_POR_SOCKET = {
  AM4: ["DDR4"], AM5: ["DDR5"], LGA1151: ["DDR4"], LGA1200: ["DDR4"], LGA1700: ["DDR4", "DDR5"], LGA1851: ["DDR5"],
};

export const SOCKETS = ["AM4", "AM5", "LGA1151", "LGA1200", "LGA1700", "LGA1851"];

export const FORMATOS = {
  itx: { rotulo: "Mini-ITX", tamanho: 1 },
  matx: { rotulo: "Micro-ATX", tamanho: 2 },
  atx: { rotulo: "ATX", tamanho: 3 },
  eatx: { rotulo: "E-ATX", tamanho: 4 },
};

/** GPUs: [consumo da placa em W, fonte recomendada em W]. */
export const GPUS = {
  "gtx 1650": [75, 300], "gtx 1660": [120, 450], "gtx 1660 super": [125, 450], "gtx 1660 ti": [120, 450],
  "rtx 2060": [160, 500], "rtx 2060 super": [175, 550], "rtx 2070": [175, 550], "rtx 2070 super": [215, 650],
  "rtx 2080": [215, 650], "rtx 2080 super": [250, 650], "rtx 2080 ti": [250, 650],
  "rtx 3050": [130, 550], "rtx 3060": [170, 550], "rtx 3060 ti": [200, 600], "rtx 3070": [220, 650],
  "rtx 3070 ti": [290, 750], "rtx 3080": [320, 750], "rtx 3080 ti": [350, 750], "rtx 3090": [350, 750],
  "rtx 4060": [115, 550], "rtx 4060 ti": [160, 550], "rtx 4070": [200, 650], "rtx 4070 super": [220, 650],
  "rtx 4070 ti": [285, 700], "rtx 4070 ti super": [285, 700], "rtx 4080": [320, 750], "rtx 4080 super": [320, 750],
  "rtx 4090": [450, 850],
  "rtx 5050": [130, 550], "rtx 5060": [145, 550], "rtx 5060 ti": [180, 600], "rtx 5070": [250, 650],
  "rtx 5070 ti": [300, 750], "rtx 5080": [360, 850], "rtx 5090": [575, 1000],
  "rx 6500 xt": [107, 400], "rx 6600": [132, 450], "rx 6600 xt": [160, 500], "rx 6650 xt": [180, 500],
  "rx 6700 xt": [230, 650], "rx 6750 xt": [250, 650], "rx 6800": [250, 550], "rx 6800 xt": [300, 750],
  "rx 6900 xt": [300, 850], "rx 7600": [165, 550], "rx 7600 xt": [190, 600], "rx 7700 xt": [245, 700],
  "rx 7800 xt": [263, 700], "rx 7900 gre": [260, 700], "rx 7900 xt": [315, 750], "rx 7900 xtx": [355, 800],
  "rx 9060 xt": [160, 450], "rx 9070": [220, 650], "rx 9070 xt": [304, 750],
};

/** Chave da tabela a partir de um texto já normalizado ("rtx 4070 super"), ou null. */
export function chaveGpu(textoNormalizado) {
  const m = textoNormalizado.match(/\b(rtx|gtx|rx|arc)\s*(\d{3,4})\s*(ti super|ti|super|xtx|xt|gre)?(?![a-z0-9])/);
  if (!m) return null;
  const chave = `${m[1]} ${m[2]}${m[3] ? " " + m[3] : ""}`;
  return GPUS[chave] ? chave : null;
}

/** Procura "rtx 4070 super" etc. dentro de um texto normalizado; devolve { chave, trecho } ou null. */
export function acharGpu(textoNormalizado) {
  const m = textoNormalizado.match(/\b(?:rtx|gtx|rx|arc)\s*\d{3,4}\s*(?:ti super|ti|super|xtx|xt|gre)?(?![a-z0-9])/);
  if (!m) return null;
  const chave = chaveGpu(m[0]);
  return chave ? { chave, trecho: m[0].trim() } : null;
}

/** Consumo máximo estimado do processador (W), de forma conservadora, quando a descrição não informa o TDP. */
export function potenciaCpuEstimada({ marca, linha, sufixo = "" }) {
  const k = /k/.test(sufixo);
  if (marca === "amd") return { 3: 100, 5: 100, 7: 130, 9: 200 }[linha] ?? 130;
  if (marca === "intel") return { 3: 110, 5: k ? 190 : 150, 7: k ? 253 : 220, 9: 253 }[linha] ?? 150;
  return 150;
}

/** Fonte mínima: soma de CPU + GPU + 100 W do restante, com 20% de folga, arredondada para cima em 50 W. */
export function fonteMinima(cpuW, gpuW) {
  return Math.ceil(((cpuW + gpuW + 100) * 1.2) / 50) * 50;
}
