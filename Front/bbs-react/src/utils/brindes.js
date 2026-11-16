// Brindes progressivos: cada faixa de valor dos produtos libera mais um brinde (acumulativo).
// Demonstrativo: o brinde não é cobrado nem enviado; o objetivo é mostrar a regra de benefício da loja.
export const BRINDES = [
  { min: 0,    nome: "Adesivo BBS",  sub: "Qualquer compra",           img: "/brinde-adesivo.png" },
  { min: 500,  nome: "Chaveiro BBS", sub: "Compras a partir de R$ 500",   img: "/brinde-chaveiro.png" },
  { min: 1500, nome: "Mousepad BBS", sub: "Compras a partir de R$ 1.500", img: "/brinde-mousepad.png" },
  { min: 3000, nome: "Garrafa BBS",  sub: "Compras a partir de R$ 3.000", img: "/brinde-garrafa.png" },
  { min: 6000, nome: "Moletom BBS",  sub: "Compras a partir de R$ 6.000", img: "/brinde-moletom.png" },
];

/**
 * valor: soma dos produtos (sem frete e sem descontos), em reais.
 * Compara em centavos para não depender de erro de ponto flutuante.
 * Sem itens (valor 0) nada é liberado: o "Qualquer compra" exige ao menos um produto.
 */
export function situacaoBrindes(valor, lista = BRINDES) {
  const cent = Math.max(0, Math.round(Number(valor || 0) * 100));
  const itens = lista.map(b => ({ ...b, liberado: cent > 0 && cent >= b.min * 100 }));
  const liberados = itens.filter(b => b.liberado);
  const proximo = itens.find(b => !b.liberado && b.min > 0) ?? null;
  const faltam = proximo ? (proximo.min * 100 - cent) / 100 : 0;
  const anterior = [...liberados].reverse().find(b => b.min > 0)?.min ?? 0;
  const progresso = proximo ? Math.min(100, Math.max(0, Math.round(((cent / 100 - anterior) / (proximo.min - anterior)) * 100))) : 100;
  return { itens, liberados, proximo, faltam, progresso };
}
