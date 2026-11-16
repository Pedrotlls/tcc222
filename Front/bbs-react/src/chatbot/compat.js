// Regras de compatibilidade entre componentes. Entidade = { tipo, nome, specs, produto? }.
import { FORMATOS, fonteMinima } from "./conhecimento.js";

export const STATUS = { OK: "compativel", NAO: "incompativel", ATENCAO: "atencao", INCERTO: "indeterminado" };
export const ICONE = { compativel: "✅", incompativel: "❌", atencao: "⚠️", indeterminado: "❓" };

const resultado = (regra, status, resumo, detalhes = [], avisos = []) => ({ regra, status, resumo, detalhes, avisos });
const rotuloFormato = k => FORMATOS[k]?.rotulo ?? k;
const faltou = (e, o) => `Não encontrei ${o} na descrição de ${e.nome}. Confira nas especificações do fabricante.`;

/** Fonte necessária para uma GPU (e CPU, quando conhecida): o maior entre a recomendação do fabricante e a estimativa de consumo. */
export function fonteNecessaria({ gpu, cpu }) {
  const g = gpu?.specs;
  const c = cpu?.specs;
  const recomendada = g?.fonteRecomendadaW ?? null;
  const estimada = g?.consumoW && c?.consumoW ? fonteMinima(c.consumoW, g.consumoW) : null;
  if (!recomendada && !estimada) return null;
  const watts = Math.max(recomendada ?? 0, estimada ?? 0);
  const origem = watts === recomendada ? "recomendação do fabricante da placa de vídeo" : "estimativa de consumo (CPU + GPU + restante, com folga de 20%)";
  return { watts, origem, recomendada, estimada };
}

function cpuMae(cpu, mae) {
  const a = cpu.specs.socket, b = mae.specs.socket;
  if (!a || !b) return resultado("cpu-mae", STATUS.INCERTO, `Não consegui confirmar o socket de ${!a ? cpu.nome : mae.nome}.`, [faltou(!a ? cpu : mae, "o socket")]);
  if (a !== b) return resultado("cpu-mae", STATUS.NAO, `${cpu.nome} usa socket ${a}, mas ${mae.nome} usa ${b}.`, ["Sockets diferentes não encaixam fisicamente."]);
  const avisos = [];
  const chip = mae.specs.chipset;
  if (a === "AM4" && cpu.specs.serie === 5 && ["a320", "b350", "x370", "b450", "x470"].includes(chip))
    avisos.push(`Ryzen série 5000 em placa ${chip.toUpperCase()} costuma exigir atualização de BIOS antes de funcionar.`);
  if (a === "LGA1700" && cpu.specs.geracao >= 13 && ["h610", "b660", "h670", "z690"].includes(chip))
    avisos.push(`Intel de ${cpu.specs.geracao}ª geração em placa ${chip.toUpperCase()} pode exigir atualização de BIOS.`);
  return resultado("cpu-mae", STATUS.OK, `${cpu.nome} e ${mae.nome} usam o mesmo socket (${a}).`, [], avisos);
}

function ramMae(ram, mae) {
  const tipo = ram.specs.ddr, aceita = mae.specs.ddrAceita;
  if (!tipo) return resultado("ram-mae", STATUS.INCERTO, `Não consegui confirmar o tipo de memória de ${ram.nome}.`, [faltou(ram, "o tipo (DDR4/DDR5)")]);
  if (!aceita?.length) {
    const lga1700 = mae.specs.socket === "LGA1700";
    return resultado("ram-mae", STATUS.INCERTO, `Não consegui confirmar se ${mae.nome} usa DDR4 ou DDR5.`,
      [lga1700 ? "Placas LGA1700 existem em versões DDR4 e DDR5; confira o modelo exato." : faltou(mae, "o tipo de memória")]);
  }
  if (!aceita.includes(tipo))
    return resultado("ram-mae", STATUS.NAO, `${ram.nome} é ${tipo}, mas ${mae.nome} aceita ${aceita.join("/")}.`, ["DDR4 e DDR5 têm encaixes diferentes e não são intercambiáveis."]);
  return resultado("ram-mae", STATUS.OK, `${ram.nome} (${tipo}) é aceita por ${mae.nome}.`);
}

function ramCpu(ram, cpu) {
  const tipo = ram.specs.ddr, aceita = cpu.specs.ddrAceita;
  if (!tipo || !aceita?.length) return resultado("ram-cpu", STATUS.INCERTO, "Não consegui confirmar o tipo de memória aceito pelo processador.");
  if (!aceita.includes(tipo)) return resultado("ram-cpu", STATUS.NAO, `${cpu.nome} suporta ${aceita.join("/")}, mas ${ram.nome} é ${tipo}.`);
  return resultado("ram-cpu", STATUS.OK, `${cpu.nome} suporta ${tipo}.`, aceita.length > 1 ? ["O processador aceita DDR4 e DDR5; quem define é a placa-mãe."] : []);
}

function fonteSistema(fonte, gpu, cpu) {
  const w = fonte.specs.watts;
  const base = gpu ? gpu.nome : cpu?.nome;
  if (!w) return resultado("fonte", STATUS.INCERTO, `Não encontrei a potência de ${fonte.nome}.`, [faltou(fonte, "a potência em watts")]);
  const req = gpu ? fonteNecessaria({ gpu, cpu }) : null;
  if (!req) return resultado("fonte", STATUS.INCERTO, `Não consegui estimar o consumo de ${base ?? "o sistema"}.`, ["Falta a potência recomendada da placa de vídeo na descrição."]);
  const detalhe = `Necessário: cerca de ${req.watts} W (${req.origem}). ${fonte.nome} entrega ${w} W.`;
  if (w >= req.watts)
    return resultado("fonte", STATUS.OK, `${fonte.nome} (${w} W) atende ${gpu.nome}${cpu ? ` com ${cpu.nome}` : ""}.`, [detalhe],
      w === req.watts ? ["Está exatamente no limite recomendado; para futuros upgrades, prefira mais folga."] : []);
  if (w >= req.watts * 0.9) return resultado("fonte", STATUS.ATENCAO, `${fonte.nome} (${w} W) fica um pouco abaixo do recomendado para ${gpu.nome}.`, [detalhe, "Pode funcionar, mas sem folga e com risco de desligamentos em carga alta."]);
  return resultado("fonte", STATUS.NAO, `${fonte.nome} (${w} W) é insuficiente para ${gpu.nome}.`, [detalhe]);
}

function maeGabinete(mae, gab) {
  const f = mae.specs.formato, lista = gab.specs.formatos;
  if (!f || !lista?.length) return resultado("mae-gabinete", STATUS.INCERTO, "Não consegui confirmar o formato da placa-mãe e do gabinete.", [!f ? faltou(mae, "o formato (ATX/Micro-ATX/Mini-ITX)") : faltou(gab, "os formatos aceitos")]);
  // Gabinete que aceita um formato também aceita os menores (ATX recebe Micro-ATX e Mini-ITX).
  const maior = Math.max(...lista.map(k => FORMATOS[k].tamanho));
  if (FORMATOS[f].tamanho <= maior) return resultado("mae-gabinete", STATUS.OK, `${gab.nome} comporta placa ${rotuloFormato(f)}.`);
  return resultado("mae-gabinete", STATUS.NAO, `${mae.nome} é ${rotuloFormato(f)}, maior do que o gabinete ${gab.nome} comporta (${lista.map(rotuloFormato).join(", ")}).`);
}

function gpuGabinete(gpu, gab) {
  const c = gpu.specs.comprimentoMm, m = gab.specs.gpuMaxMm;
  if (!c || !m) return resultado("gpu-gabinete", STATUS.INCERTO, "Não consegui confirmar se a placa de vídeo cabe no gabinete.", ["Confira o comprimento da placa de vídeo e o espaço máximo informado pelo gabinete."]);
  return c <= m ? resultado("gpu-gabinete", STATUS.OK, `${gpu.nome} (${c} mm) cabe em ${gab.nome} (até ${m} mm).`)
    : resultado("gpu-gabinete", STATUS.NAO, `${gpu.nome} tem ${c} mm e ${gab.nome} comporta até ${m} mm.`);
}

function coolerCpu(cooler, cpu) {
  const lista = cooler.specs.sockets, s = cpu.specs.socket;
  if (!lista?.length || !s) return resultado("cooler-cpu", STATUS.INCERTO, `Não consegui confirmar se ${cooler.nome} serve no socket de ${cpu.nome}.`, [faltou(!lista?.length ? cooler : cpu, "os sockets compatíveis")]);
  return lista.includes(s) ? resultado("cooler-cpu", STATUS.OK, `${cooler.nome} suporta o socket ${s} de ${cpu.nome}.`)
    : resultado("cooler-cpu", STATUS.NAO, `${cooler.nome} suporta ${lista.join(", ")}, mas ${cpu.nome} usa ${s}.`);
}

function coolerGabinete(cooler, gab) {
  const h = cooler.specs.alturaMm, m = gab.specs.coolerMaxMm;
  if (!h || !m) return resultado("cooler-gabinete", STATUS.INCERTO, "Não consegui confirmar se o cooler cabe no gabinete.", ["Confira a altura do cooler e o limite do gabinete."]);
  return h <= m ? resultado("cooler-gabinete", STATUS.OK, `${cooler.nome} (${h} mm) cabe em ${gab.nome} (até ${m} mm).`)
    : resultado("cooler-gabinete", STATUS.NAO, `${cooler.nome} tem ${h} mm e ${gab.nome} comporta até ${m} mm.`);
}

function ssdMae(ssd, mae) {
  if (ssd.specs.interface === "SATA") return resultado("ssd-mae", STATUS.OK, `SSD SATA funciona em qualquer placa-mãe com porta SATA.`);
  if (ssd.specs.interface !== "NVMe") return resultado("ssd-mae", STATUS.INCERTO, `Não consegui confirmar a interface de ${ssd.nome} (NVMe ou SATA).`);
  if (mae.specs.temM2) return resultado("ssd-mae", STATUS.OK, `${mae.nome} informa slot M.2, compatível com ${ssd.nome} (NVMe).`);
  return resultado("ssd-mae", STATUS.ATENCAO, `${ssd.nome} é NVMe M.2; não encontrei na descrição de ${mae.nome} se ela tem slot M.2 NVMe.`,
    ["A maioria das placas B450/B550/B650 e das Intel 10ª geração em diante tem; confira o manual."]);
}

const REGRAS = [
  ["cpu", "mae", cpuMae], ["ram", "mae", ramMae], ["ram", "cpu", ramCpu], ["mae", "gabinete", maeGabinete],
  ["gpu", "gabinete", gpuGabinete], ["cooler", "cpu", coolerCpu], ["cooler", "gabinete", coolerGabinete], ["ssd", "mae", ssdMae],
];

/** Compara dois componentes; null quando não existe regra entre os tipos. */
export function verificarPar(a, b) {
  const tipos = [a.tipo, b.tipo];
  if (tipos.includes("fonte") && (tipos.includes("gpu") || tipos.includes("cpu"))) {
    const fonte = a.tipo === "fonte" ? a : b, outro = a.tipo === "fonte" ? b : a;
    return outro.tipo === "gpu" ? fonteSistema(fonte, outro, null) : resultado("fonte", STATUS.INCERTO, "Para dimensionar a fonte preciso saber a placa de vídeo.", ["Me diga qual placa de vídeo será usada com esse processador."]);
  }
  for (const [x, y, regra] of REGRAS) {
    if (a.tipo === x && b.tipo === y) return regra(a, b);
    if (a.tipo === y && b.tipo === x) return regra(b, a);
  }
  return null;
}

/** Verifica todos os pares relevantes de uma lista de componentes (montagem). */
export function verificarMontagem(entidades) {
  const por = tipo => entidades.filter(e => e.tipo === tipo);
  const resultados = [];
  const cpus = por("cpu"), maes = por("mae"), rams = por("ram"), gpus = por("gpu"), fontes = por("fonte");
  const gabs = por("gabinete"), coolers = por("cooler"), ssds = por("ssd");
  for (const c of cpus) for (const m of maes) resultados.push(cpuMae(c, m));
  for (const r of rams) for (const m of maes) resultados.push(ramMae(r, m));
  if (!maes.length) for (const r of rams) for (const c of cpus) resultados.push(ramCpu(r, c));
  for (const f of fontes) for (const g of gpus) resultados.push(fonteSistema(f, g, cpus[0] ?? null));
  for (const m of maes) for (const g of gabs) resultados.push(maeGabinete(m, g));
  for (const gpu of gpus) for (const g of gabs) resultados.push(gpuGabinete(gpu, g));
  for (const c of coolers) for (const cpu of cpus) resultados.push(coolerCpu(c, cpu));
  for (const c of coolers) for (const g of gabs) resultados.push(coolerGabinete(c, g));
  for (const s of ssds) for (const m of maes) resultados.push(ssdMae(s, m));
  const geral = resultados.some(r => r.status === STATUS.NAO) ? STATUS.NAO
    : resultados.some(r => r.status === STATUS.ATENCAO || r.status === STATUS.INCERTO) ? STATUS.ATENCAO
    : resultados.length ? STATUS.OK : STATUS.INCERTO;
  return { geral, resultados };
}

/** Itens do catálogo (tipo alvo) compatíveis com uma entidade. Devolve { ok, atencao, incertos, incompativeis }. */
export function compativeisCom(entidade, candidatos) {
  const saida = { ok: [], atencao: [], incertos: [], incompativeis: [] };
  for (const c of candidatos) {
    const r = verificarPar(entidade, c);
    if (!r) continue;
    const chave = { compativel: "ok", atencao: "atencao", indeterminado: "incertos", incompativel: "incompativeis" }[r.status];
    saida[chave].push({ candidato: c, resultado: r });
  }
  return saida;
}
