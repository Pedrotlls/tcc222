// Centavos evitam acumulo de erro binario na estimativa do navegador.
export function calcularTotais(subtotal, entrega, pagamento) {
  const cents = Math.round(Number(subtotal) * 100);
  const freight = entrega === "expresso" ? 2990 : 1590;
  const percent = pagamento === "pix" ? 10 : pagamento === "boleto" ? 7 : 0;
  const discount = Math.round(cents * percent / 100);
  return { frete: freight / 100, desconto: discount / 100, total: (cents + freight - discount) / 100 };
}
