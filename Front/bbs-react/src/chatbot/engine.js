// Motor do chatbot da BBS: entende a pergunta, consulta o catálogo e responde com regras (sem IA externa).
import { formatarBRL, normalizar, parseOrcamento, plural } from "./texto.js";
import { NOME_TIPO, NOME_TIPO_SINGULAR, categoriasDoTexto, criarBase, disponivel, entidadesDaMensagem } from "./catalogo.js";
import { ICONE, STATUS, compativeisCom, fonteNecessaria, verificarMontagem } from "./compat.js";
import { FRETE_GRATIS_A_PARTIR_DE, cotarFrete, ufDoTexto } from "./frete.js";
import { montarPC } from "./montagem.js";
import { resumoSpecs } from "./specs.js";

export { criarBase };

export const SUGESTOES_INICIAIS = ["Monte um PC gamer", "Essa placa de vídeo roda com minha fonte?", "Qual o frete para SP?", "Melhor placa de vídeo até R$ 3.000"];
export const CONTEXTO_INICIAL = Object.freeze({ aguardando: null, produtoIds: [], categoria: null, uf: null });

const resposta = (texto, contexto, extra = {}) => ({ texto, produtos: [], sugestoes: [], contexto, ...extra });
const linhaProduto = p => `• ${p.nome} — ${formatarBRL(p.preco)}${disponivel(p) ? "" : " (indisponível)"}`;
const has = (n, re) => re.test(n);

// Alvos de compatibilidade por tipo ("o que combina com X").
const ALVOS = {
  cpu: ["mae"], mae: ["cpu", "ram", "gabinete"], ram: ["mae"], gpu: ["fonte", "gabinete"], fonte: ["gpu"],
  cooler: ["cpu", "gabinete"], gabinete: ["mae", "gpu", "cooler"], ssd: ["mae"],
};

const COMPAT_PALAVRAS = /\b(compativel|compativeis|incompativel|incompatibilidade|compatibilidade|combina\w*|funciona\w*|roda\w*|serve\w*|aceita\w*|encaixa\w*|da certo|rola|suporta\w*|casa com|junto)\b/;

function descreverResultado(r) {
  const linhas = [`${ICONE[r.status]} ${r.resumo}`];
  for (const d of r.detalhes) linhas.push(`   ${d}`);
  for (const a of r.avisos) linhas.push(`   ⚠️ ${a}`);
  return linhas.join("\n");
}

function respostaMontagem(orcamento, base, contexto) {
  const novo = { ...contexto, aguardando: null };
  const r = montarPC(orcamento, base);
  if (r.impossivel) {
    const min = r.minimo ? ` A montagem compatível mais barata que consigo fechar hoje custa ${formatarBRL(r.minimo)}.` : "";
    return resposta(`Com ${formatarBRL(orcamento)} não consigo fechar um PC completo: ${r.motivo}.${min}`, novo, { sugestoes: r.minimo ? [`Monte um PC de ${formatarBRL(r.minimo).replace("R$ ", "R$ ")}`] : [] });
  }
  const verif = verificarMontagem(r.itens.map(i => ({ tipo: i.tipo, nome: i.produto.nome, specs: i.produto.specs, produto: i.produto })));
  const linhas = r.itens.map(i => `• ${NOME_TIPO_SINGULAR[i.tipo] ?? i.tipo}: ${i.produto.nome} — ${formatarBRL(i.produto.preco)}`);
  const extras = [...r.avisos];
  for (const x of verif.resultados) extras.push(...x.avisos);
  const texto = [
    `Montagem para ${formatarBRL(orcamento)} (peças ativas e em estoque, todas compatíveis entre si):`,
    ...linhas,
    `Total: ${formatarBRL(r.total)} — sobra ${formatarBRL(r.sobra)}.`,
    ...(extras.length ? ["", ...extras.map(a => `⚠️ ${a}`)] : []),
    "", "Não inclui teclado, mouse, monitor nem frete. Priorizei placa de vídeo e processador dentro do orçamento.",
  ].join("\n");
  return resposta(texto, novo, { produtos: r.itens.map(i => i.produto.id), sugestoes: ["Qual o frete para SP?", "Essa montagem é compatível?"] });
}

function respostaCompat(entidades, mensagem, base, contexto, categorias) {
  const n = normalizar(mensagem);
  if (entidades.length >= 2) {
    const v = verificarMontagem(entidades);
    if (v.resultados.length) {
      const titulo = { compativel: "Tudo compatível ✅", incompativel: "Encontrei incompatibilidade ❌", atencao: "Compatível, mas com pontos de atenção ⚠️", indeterminado: "Não consegui confirmar tudo ❓" }[v.geral];
      const cats = entidades.filter(e => e.avulso).map(e => e.nome);
      const nota = cats.length ? `\n\nConsiderei "${cats.join('", "')}" como modelo genérico (não é um produto da loja).` : "";
      return resposta(`${titulo}\n\n${v.resultados.map(descreverResultado).join("\n\n")}${nota}`, contexto, {
        produtos: entidades.filter(e => e.produto).map(e => e.produto.id),
      });
    }
  }
  if (entidades.length >= 1) {
    const alvo = entidades[0];
    const pedidos = categorias.filter(c => c !== alvo.tipo && (ALVOS[alvo.tipo] ?? []).includes(c));
    const tipos = pedidos.length ? pedidos : (ALVOS[alvo.tipo] ?? []);
    if (!tipos.length) return null;
    const partes = [], ids = [];
    // Nota de potência para GPU: ajuda mesmo sem fonte citada.
    if (alvo.tipo === "gpu" && tipos.includes("fonte")) {
      const f = fonteNecessaria({ gpu: alvo, cpu: null });
      if (f) partes.push(`Para ${alvo.nome}, a recomendação é de pelo menos ${f.watts} W de fonte (${f.origem}).`);
    }
    for (const tipo of tipos) {
      const cands = base.produtos.filter(p => p.tipo === tipo && disponivel(p));
      if (!cands.length) { partes.push(`Não há ${NOME_TIPO[tipo]} em estoque no momento.`); continue; }
      const r = compativeisCom(alvo, cands);
      const bons = [...r.ok, ...r.atencao].sort((a, b) => a.candidato.preco - b.candidato.preco).slice(0, 4);
      if (bons.length) {
        partes.push(`${NOME_TIPO[tipo][0].toUpperCase()}${NOME_TIPO[tipo].slice(1)} que combinam com ${alvo.nome}:\n${bons.map(x => `${linhaProduto(x.candidato)}${x.resultado.status === STATUS.ATENCAO ? " ⚠️" : ""}`).join("\n")}`);
        ids.push(...bons.map(x => x.candidato.id));
      } else if (r.incertos.length) partes.push(`Não consegui confirmar compatibilidade de ${NOME_TIPO[tipo]} com ${alvo.nome} só pelas descrições do catálogo.`);
      else partes.push(`Nenhum(a) ${NOME_TIPO_SINGULAR[tipo]} do catálogo é compatível com ${alvo.nome}.`);
      if (r.incompativeis.length && bons.length) partes.push(`(${r.incompativeis.length} ${plural(r.incompativeis.length, "item foi descartado", "itens foram descartados")} por incompatibilidade.)`);
    }
    if (partes.length) return resposta(partes.join("\n\n"), contexto, { produtos: ids.slice(0, 6), sugestoes: [] });
  }
  void n;
  return null;
}

function respostaFrete(mensagem, extra, contexto, produtos) {
  const n = normalizar(mensagem);
  const uf = ufDoTexto(mensagem) ?? contexto.uf;
  const subtotal = extra.carrinho?.subtotal ?? produtos[0]?.preco ?? 0;
  const quantidade = extra.carrinho?.quantidade ?? 1;
  if (!uf) return resposta("Para estimar o frete preciso do estado (UF) de entrega. Para qual estado você quer calcular?", { ...contexto, aguardando: "uf" }, { sugestoes: ["SP", "RJ", "BA", "RS"] });
  const novo = { ...contexto, uf, aguardando: null };
  const normal = cotarFrete({ uf, subtotal, quantidade, modalidade: "normal" });
  const expresso = cotarFrete({ uf, subtotal, quantidade, modalidade: "expresso" });
  if (!normal) return resposta("Não reconheci esse estado. Informe a sigla (SP, RJ, MG...) ou o nome do estado.", { ...contexto, aguardando: "uf" });
  const dias = c => `${c.prazoMin}${c.prazoMax !== c.prazoMin ? ` a ${c.prazoMax}` : ""} dias úteis`;
  const base = extra.carrinho?.quantidade ? `seu carrinho (${quantidade} ${plural(quantidade, "item", "itens")}, ${formatarBRL(subtotal)})` : produtos[0] ? `${produtos[0].nome} (${formatarBRL(subtotal)})` : "1 item, sem considerar valor de compra";
  const linhas = [
    `Frete estimado para ${normal.regiao} (${uf}) — ${base}:`,
    `• Normal: ${normal.gratis ? "grátis" : formatarBRL(normal.valor)} — ${dias(normal)}`,
    `• Expresso: ${formatarBRL(expresso.valor)} — ${dias(expresso)}`,
  ];
  if (!normal.gratis) linhas.push(`Frete normal grátis em compras a partir de ${formatarBRL(FRETE_GRATIS_A_PARTIR_DE)}.`);
  linhas.push("", "É uma estimativa acadêmica: a BBS é um projeto de TCC e não usa transportadora real. O valor final é calculado no checkout.");
  void n;
  return resposta(linhas.join("\n"), novo);
}

const FAQ = [
  [/\b(pagamento|pagar|pix|boleto|cartao|credito|debito|parcel\w*|forma de pagamento)\b/, () =>
    "Formas de pagamento no checkout:\n• PIX — 10% de desconto\n• Boleto — 7% de desconto\n• Crédito e débito — sem desconto\n\nImportante: os pagamentos são demonstrativos (QR Code e boleto fictícios), pois a BBS é um projeto acadêmico sem cobrança real."],
  [/\b(brindes?|mimos?|ganhar|ganha|presentes?)\b/, () =>
    "Brindes por valor dos produtos (sem frete e descontos), acumulativos:\n• Qualquer compra: Adesivo BBS\n• A partir de R$ 500: Chaveiro BBS\n• A partir de R$ 1.500: Mousepad BBS\n• A partir de R$ 3.000: Garrafa BBS\n• A partir de R$ 6.000: Moletom BBS\n\nVocê acompanha o progresso no carrinho e no checkout. São brindes demonstrativos: nada é cobrado nem enviado nesta versão acadêmica."],
  [/\b(cupom|cupons|desconto|promocao|codigo promocional)\b/, () =>
    "Cupons: digite o código no checkout e clique em \"Aplicar cupom\". Eles dão de 1% a 50%, têm validade e limite de usos, e substituem o desconto de PIX/boleto (não acumulam)."],
  [/\b(cancel\w*|desistir|arrepend\w*)\b/, () =>
    "Você pode cancelar o pedido em Minha conta › Meus pedidos enquanto ele estiver com status RECEBIDO. Depois que começa a ser separado, o cancelamento não está disponível pelo site. Ao cancelar, o estoque dos itens é reposto."],
  [/\b(rastre\w*|status|acompanhar|onde esta|meu pedido|pedidos?|entrega do pedido)\b/, () =>
    "Acompanhe em Minha conta › Meus pedidos: o status segue RECEBIDO → SEPARANDO → ENVIADO → ENTREGUE e o histórico mostra cada mudança. O código do pedido é interno da BBS e não é um rastreio dos Correios."],
  [/\b(garantia|troca|devolu\w*|defeito|assistencia|reembolso)\b/, () =>
    "Garantia, trocas e devoluções não estão implementadas neste sistema — a BBS é um projeto acadêmico. Em uma loja real, vale conferir a garantia do fabricante e o prazo legal de arrependimento de 7 dias (CDC) para compras online."],
  [/\b(login|entrar|cadastr\w*|criar conta|senha|esqueci|recuperar|minha conta|sessoes?)\b/, () =>
    "Para comprar é preciso ter conta. Clique em Entrar/Cadastrar no topo. Se esqueceu a senha, use \"Esqueci minha senha\" na tela de login. Em Minha conta você gerencia dados, endereços, pedidos e sessões ativas."],
  [/\b(estoque|reserv\w*)\b/, () =>
    "O estoque é conferido no checkout. Adicionar ao carrinho não reserva a peça: se acabar antes de você finalizar, o pedido não é concluído."],
  [/\b(avalia\w*|nota|estrelas?|review|comentario)\b/, () =>
    "Cada produto mostra a média de estrelas. Para avaliar, abra o produto (precisa estar logado e ter um pedido não cancelado dele). Dá para editar ou excluir a sua avaliação e marcar as dos outros como úteis ou não."],
];

function respostaAjuda(contexto) {
  return resposta("Posso ajudar com:\n• Compatibilidade (CPU × placa-mãe, memória, fonte × placa de vídeo, gabinete, cooler)\n• Preços, estoque e avaliações dos produtos\n• Recomendações por orçamento e montagem de PC\n• Frete, pagamento, cupons e pedidos\n\nExemplos: \"i5-12400F combina com B550M?\", \"qual fonte para RTX 4070?\", \"monte um PC de R$ 9.000\".", contexto, { sugestoes: SUGESTOES_INICIAIS });
}

function infoProduto(p) {
  const s = resumoSpecs(p.tipo, p.specs);
  const nota = p.totalAvaliacoes ? `${String(p.media.toFixed(1)).replace(".", ",")} de 5 (${p.totalAvaliacoes} ${plural(p.totalAvaliacoes, "avaliação", "avaliações")})` : "sem avaliações ainda";
  const estoque = p.ativo === false ? "indisponível" : p.estoque > 0 ? `${p.estoque} em estoque${p.estoque <= 3 ? " (poucas unidades)" : ""}` : "sem estoque";
  return `${p.nome} — ${formatarBRL(p.preco)}\n${s ? `Especificações: ${s}\n` : ""}Disponibilidade: ${estoque}\nAvaliação: ${nota}`;
}

function recomendar(categorias, orcamento, n, base, contexto) {
  const tipo = categorias[0];
  const barato = has(n, /\b(barat\w*|economic\w*|custo[- ]beneficio|em conta|mais em conta|menor preco)\b/);
  let cands = base.produtos.filter(p => p.tipo === tipo && disponivel(p));
  if (!cands.length) return resposta(`Não tenho ${NOME_TIPO[tipo]} em estoque agora.`, contexto);
  if (orcamento) cands = cands.filter(p => p.preco <= orcamento);
  if (!cands.length) {
    const menor = base.produtos.filter(p => p.tipo === tipo && disponivel(p)).sort((a, b) => a.preco - b.preco)[0];
    return resposta(`Não há ${NOME_TIPO[tipo]} até ${formatarBRL(orcamento)}. O mais barato é ${menor.nome} por ${formatarBRL(menor.preco)}.`, { ...contexto, categoria: tipo }, { produtos: [menor.id] });
  }
  const ordenados = [...cands].sort(barato ? (a, b) => a.preco - b.preco : (a, b) => b.media - a.media || b.preco - a.preco);
  const top = (barato ? ordenados : ordenados.some(p => p.totalAvaliacoes) ? ordenados : [...cands].sort((a, b) => b.preco - a.preco)).slice(0, 3);
  const criterio = barato ? "menor preço" : top.some(p => p.totalAvaliacoes) ? "melhor avaliação" : "mais potentes (preço como referência de desempenho)";
  const intro = `${NOME_TIPO[tipo][0].toUpperCase()}${NOME_TIPO[tipo].slice(1)}${orcamento ? ` até ${formatarBRL(orcamento)}` : ""} — ordenado por ${criterio}:`;
  const linhas = top.map(p => `${linhaProduto(p)}${p.totalAvaliacoes ? ` · ★ ${String(p.media.toFixed(1)).replace(".", ",")}` : ""}${resumoSpecs(p.tipo, p.specs) ? `\n   ${resumoSpecs(p.tipo, p.specs)}` : ""}`);
  return resposta([intro, ...linhas].join("\n"), { ...contexto, categoria: tipo, produtoIds: top.map(p => p.id) }, { produtos: top.map(p => p.id) });
}

/**
 * Responde a uma mensagem. base = criarBase(produtos, resumoNotas); contexto = retorno anterior (memória curta);
 * extra = { carrinho: { subtotal, quantidade } }.
 */
export function responder(mensagem, base, contexto = CONTEXTO_INICIAL, extra = {}) {
  const original = String(mensagem ?? "").trim();
  const n = normalizar(original);
  if (!n) return respostaAjuda(contexto);

  // Perguntas pendentes: orçamento ou UF.
  if (contexto.aguardando === "orcamento") {
    const v = parseOrcamento(original, { aceitarNumeroSolto: true });
    if (v) return respostaMontagem(v, base, contexto);
  }
  if (contexto.aguardando === "uf") {
    const uf = ufDoTexto(original) ?? (/^[a-z]{2}$/i.test(original) ? original.toUpperCase() : null);
    if (uf) return respostaFrete(original, extra, { ...contexto, uf }, []);
  }
  const ctx = { ...contexto, aguardando: null };

  if (has(n, /^(oi+|ola|opa|e ai|eae|bom dia|boa tarde|boa noite|hey|hello|salve)\b/) && n.split(" ").length <= 4)
    return resposta("Olá! Sou o assistente da BBS. Tiro dúvidas sobre compatibilidade de peças, preços, estoque, frete e monto PC dentro do seu orçamento. O que você precisa?", ctx, { sugestoes: SUGESTOES_INICIAIS });
  if (has(n, /\b(obrigad\w*|valeu|vlw|thanks|brigad\w*)\b/) && n.split(" ").length <= 5)
    return resposta("Por nada! Se surgir outra dúvida, é só chamar. 🙂", ctx);
  if (has(n, /^(ajuda|help|menu|o que (voce|vc) (faz|sabe)|como funciona|comandos)\b/) || has(n, /\bo que (voce|vc) (faz|sabe|pode)\b/)) return respostaAjuda(ctx);

  const { produtos: achados, entidades } = entidadesDaMensagem(original, base);
  const categorias = categoriasDoTexto(original);
  const orcamento = parseOrcamento(original);

  // Montar PC.
  if (has(n, /\b(monte|montar|montagem|montando|build|config\w*|pc completo|pc gamer|computador completo)\b/) && has(n, /\b(pc|computador|setup|maquina|gamer)\b/)) {
    if (orcamento) return respostaMontagem(orcamento, base, ctx);
    return resposta("Claro! Qual o seu orçamento total para o PC (sem periféricos)? Ex.: R$ 9.000.", { ...ctx, aguardando: "orcamento" }, { sugestoes: ["R$ 6.000", "R$ 9.000", "R$ 12.000"] });
  }

  // Frete.
  if (has(n, /\b(frete|entrega|prazo|envio|chega|cep)\b/) && !has(n, /\b(pedido|rastre\w*)\b/))
    return respostaFrete(original, extra, ctx, achados);

  // Fonte necessária sem produto (ex.: "qual fonte para rtx 4070").
  const compatPedida = has(n, COMPAT_PALAVRAS) || has(n, /\bqual (fonte|placa|memoria|gabinete|cooler|processador)\b/) || has(n, /\bpreciso de (uma )?fonte\b/);
  const pergFonte = has(n, /\bfonte\b/) && entidades.some(e => e.tipo === "gpu" || e.tipo === "cpu");
  if (entidades.length >= 2 || (entidades.length === 1 && (compatPedida || pergFonte))) {
    const r = respostaCompat(entidades, original, base, ctx, categorias);
    if (r) return { ...r, contexto: { ...r.contexto, produtoIds: achados.map(p => p.id) } };
  }

  // Comparar produtos.
  if (achados.length >= 2 && has(n, /\b(compar\w*|vs|versus|diferenca|melhor|ou)\b/)) {
    const [a, b] = achados;
    const linhas = [a, b].map(p => `${p.nome}\n   Preço: ${formatarBRL(p.preco)} · ${disponivel(p) ? "em estoque" : "indisponível"}${p.totalAvaliacoes ? ` · ★ ${String(p.media.toFixed(1)).replace(".", ",")}` : ""}${resumoSpecs(p.tipo, p.specs) ? `\n   ${resumoSpecs(p.tipo, p.specs)}` : ""}`);
    const dif = Math.abs(a.preco - b.preco);
    return resposta(`Comparação:\n\n${linhas.join("\n\n")}\n\nDiferença de preço: ${formatarBRL(dif)} (${(a.preco < b.preco ? a : b).nome} é mais barato).`, { ...ctx, produtoIds: [a.id, b.id] }, { produtos: [a.id, b.id] });
  }

  // Produto citado: preço, estoque, detalhes.
  if (achados.length) {
    const p = achados[0];
    return resposta(infoProduto(p), { ...ctx, produtoIds: [p.id], categoria: p.tipo }, { produtos: achados.slice(0, 3).map(x => x.id), sugestoes: [`O que combina com ${p.nome.split(" ").slice(0, 3).join(" ")}?`, "Qual o frete para SP?"] });
  }

  // Recomendação por categoria / orçamento.
  if (categorias.length && (orcamento || has(n, /\b(melhor|barat\w*|recomend\w*|indica\w*|sugest\w*|qual|quais|opcoes|tem|custo|economic\w*|mostra\w*|quero|preciso)\b/)))
    return recomendar(categorias, orcamento, n, base, ctx);
  if (!categorias.length && orcamento && ctx.categoria) return recomendar([ctx.categoria], orcamento, n, base, ctx);

  // Acompanhamento: "e o preço?" sobre o último produto.
  if (ctx.produtoIds?.length && n.split(" ").length <= 6 && has(n, /\b(preco|quanto|custa|valor|estoque|tem|avalia\w*|nota)\b/)) {
    const p = base.porId.get(ctx.produtoIds[0]);
    if (p) return resposta(infoProduto(p), ctx, { produtos: [p.id] });
  }

  // Perguntas de loja (pagamento, cupom, pedido...).
  for (const [re, fn] of FAQ) if (re.test(n)) return resposta(fn(), ctx);

  if (categorias.length) return recomendar(categorias, null, n, base, ctx);

  return resposta("Não entendi bem. Posso ajudar com compatibilidade de peças, preços e estoque, recomendações por orçamento, montagem de PC, frete e pedidos. Tente algo como \"RTX 4060 roda com fonte de 500W?\".", ctx, { sugestoes: SUGESTOES_INICIAIS });
}
