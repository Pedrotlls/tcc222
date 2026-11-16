// Utilidades de texto do chatbot: normalização, valores em reais e formatação.

/** minúsculas, sem acentos, sem pontuação irrelevante e sem espaços repetidos. */
export function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9$.,+\-/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palavras do texto já normalizado; hífens e barras separam (i5-12400 -> i5, 12400). */
export function tokens(valor) {
  return normalizar(valor).replace(/[-/+,;:!?()]/g, " ").split(" ").filter(Boolean);
}

export function formatarBRL(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "2.000,50" -> 2000.5; "2.000" -> 2000; "2,5" -> 2.5; "2000" -> 2000. */
function numeroBR(texto) {
  let s = texto.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const NUM = String.raw`(\d[\d.]*(?:,\d{1,2})?)`;

/**
 * Extrai um valor em reais de frases como "até R$ 5.000", "3 mil", "2,5k", "orçamento de 4500".
 * Números soltos (650W, 16GB, 12400) só valem depois de palavras de orçamento ou quando aceitarNumeroSolto = true.
 */
export function parseOrcamento(texto, { aceitarNumeroSolto = false } = {}) {
  const n = normalizar(texto);
  let valor = null;
  let m;
  if ((m = n.match(new RegExp(String.raw`r\$\s*${NUM}`)))) valor = numeroBR(m[1]);
  else if ((m = n.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/))) valor = numeroBR(m[1].replace(".", ",")) * 1000;
  else if ((m = n.match(new RegExp(String.raw`${NUM}\s*(?:reais|real|conto|contos|pila|pilas)\b`)))) valor = numeroBR(m[1]);
  else if ((m = n.match(new RegExp(String.raw`\b(?:ate|orcamento|budget|maximo|abaixo de|menos de|por volta de|cerca de|uns|gastar|investir|tenho|dispo\w*)\s*(?:de|r\$|uns|um|cerca de)?\s*${NUM}(?![\w])`)))) valor = numeroBR(m[1]);
  else if ((m = n.match(new RegExp(String.raw`\b(?:pc|computador|setup|maquina|build|montagem|gamer)\s+(?:gamer\s+)?(?:de|por|com|ate)\s*${NUM}(?![\w])`)))) valor = numeroBR(m[1]);
  else if (aceitarNumeroSolto && (m = n.match(new RegExp(String.raw`^\D*${NUM}\D*$`)))) valor = numeroBR(m[1]);
  return valor !== null && valor >= 100 && valor <= 1_000_000 ? Math.round(valor * 100) / 100 : null;
}

/** Plural simples para mensagens: plural(2,"item","itens"). */
export function plural(n, singular, pluralTexto) {
  return n === 1 ? singular : pluralTexto;
}
