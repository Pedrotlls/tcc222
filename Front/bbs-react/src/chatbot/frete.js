// Cotação de frete: mesmas regras de Back/bbs/.../service/FreteService.java (estimativa acadêmica, sem transportadora).
import { normalizar } from "./texto.js";

const REGIOES = {
  SP: { regiao: "São Paulo", base: 1490, prazo: 2 },
  SUDESTE: { regiao: "Sudeste", base: 1990, prazo: 3, ufs: ["RJ", "MG", "ES"] },
  SUL: { regiao: "Sul", base: 2490, prazo: 4, ufs: ["PR", "SC", "RS"] },
  CENTRO_OESTE: { regiao: "Centro-Oeste", base: 2890, prazo: 5, ufs: ["DF", "GO", "MT", "MS"] },
  NORDESTE: { regiao: "Nordeste", base: 3490, prazo: 7, ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  NORTE: { regiao: "Norte", base: 4290, prazo: 9, ufs: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"] },
};
export const FRETE_GRATIS_A_PARTIR_DE = 3500;

export function regiaoDaUF(uf) {
  const u = String(uf ?? "").trim().toUpperCase();
  if (u === "SP") return REGIOES.SP;
  return Object.values(REGIOES).find(r => r.ufs?.includes(u)) ?? null;
}

/**
 * Cotação em centavos exatos. Retorna null para UF inválida.
 * modalidade: "normal" | "expresso"; subtotal em reais.
 */
export function cotarFrete({ uf, subtotal = 0, quantidade = 1, modalidade = "normal" }) {
  const r = regiaoDaUF(uf);
  if (!r || !["normal", "expresso"].includes(modalidade) || quantidade < 1) return null;
  const gratis = modalidade === "normal" && Math.round(subtotal * 100) >= FRETE_GRATIS_A_PARTIR_DE * 100;
  let cent = gratis ? 0 : r.base + 150 * Math.max(0, quantidade - 1);
  let min = r.prazo, max = r.prazo + 3;
  if (modalidade === "expresso") {
    cent = Math.floor((cent * 165 + 50) / 100) + 600; // x1,65 + R$ 6,00, arredondando meio-centavo para cima
    min = Math.max(1, Math.floor(r.prazo / 2));
    max = Math.max(min + 1, r.prazo);
  }
  return { valor: cent / 100, prazoMin: min, prazoMax: max, regiao: r.regiao, gratis };
}

const NOMES_UF = {
  AC: "acre", AL: "alagoas", AP: "amapa", AM: "amazonas", BA: "bahia", CE: "ceara", DF: "distrito federal", ES: "espirito santo",
  GO: "goias", MA: "maranhao", MT: "mato grosso", MS: "mato grosso do sul", MG: "minas gerais", PA: "para", PB: "paraiba",
  PR: "parana", PE: "pernambuco", PI: "piaui", RJ: "rio de janeiro", RN: "rio grande do norte", RS: "rio grande do sul",
  RO: "rondonia", RR: "roraima", SC: "santa catarina", SP: "sao paulo", SE: "sergipe", TO: "tocantins",
};
const REGIAO_PARA_UF = { sudeste: "MG", sul: "PR", nordeste: "BA", norte: "PA", "centro oeste": "GO", "centro-oeste": "GO" };

/** UF citada na mensagem: nome do estado, região ou sigla em maiúsculas (ex.: "para RJ"). */
export function ufDoTexto(mensagemOriginal) {
  const n = normalizar(mensagemOriginal);
  // Nomes mais longos primeiro: "mato grosso do sul" antes de "mato grosso"; "rio grande do norte" antes de "rio grande do sul".
  const nomes = Object.entries(NOMES_UF).sort((a, b) => b[1].length - a[1].length);
  for (const [uf, nome] of nomes) {
    // "para" também é preposição: só vale como estado quando escrito "Pará" ou depois de "no/do/em/ao/de".
    if (uf === "PA" && !/pará/i.test(mensagemOriginal) && !/\b(no|do|em|ao|de|estado) para\b/.test(n)) continue;
    if (new RegExp(String.raw`\b${nome}\b`).test(n)) return uf;
  }
  for (const [regiao, uf] of Object.entries(REGIAO_PARA_UF)) if (new RegExp(String.raw`\b${regiao}\b`).test(n)) return uf;
  const sigla = String(mensagemOriginal).match(/\b([A-Z]{2})\b/g)?.find(s => regiaoDaUF(s));
  return sigla ?? null;
}
