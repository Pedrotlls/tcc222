// Funções puras do feedback dos produtos (sem React), cobertas por tests/feedback.test.js.

/** Transforma a lista de /avaliacoes/resumo em { [produtoId]: { media, total } }. */
export function indexarResumo(lista) {
  return Object.fromEntries((lista || []).map(r => [r.produtoId, { media: Number(r.media), total: Number(r.total) }]));
}

/** Acrescenta media e totalAvaliacoes a cada produto (0 quando ainda não há avaliações). */
export function comNotas(produtos, resumo) {
  return produtos.map(p => ({ ...p, media: resumo[p.id]?.media ?? 0, totalAvaliacoes: resumo[p.id]?.total ?? 0 }));
}

/** 4.5 -> "4,5" */
export function formatarNota(media) {
  return Number(media).toFixed(1).replace(".", ",");
}

/** Texto acessível para leitores de tela. */
export function descricaoNota(media, total) {
  if (!total) return "Ainda sem avaliações";
  return `Nota ${formatarNota(media)} de 5, ${total} ${total === 1 ? "avaliação" : "avaliações"}`;
}

/** Média simples das notas de uma lista de avaliações. */
export function mediaDe(avaliacoes) {
  return avaliacoes.length ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length : 0;
}

/** Quantidade de avaliações por nota, de 5 a 1 (usada nas barras de distribuição). */
export function distribuicao(avaliacoes) {
  return [5, 4, 3, 2, 1].map(nota => ({ nota, quantidade: avaliacoes.filter(a => a.nota === nota).length }));
}

/** Aplica o retorno de um voto (contagens + meu voto) na avaliação correspondente, sem mutar a lista. */
export function aplicarVotos(avaliacoes, id, votos) {
  return avaliacoes.map(a => a.id === id ? { ...a, uteis: votos.uteis, naoUteis: votos.naoUteis, meuVoto: votos.meuVoto ?? null } : a);
}

/** Próximo voto ao clicar: repetir o mesmo voto o remove (null); caso contrário define o novo. */
export function proximoVoto(atual, clicado) {
  return atual === clicado ? null : clicado;
}

/** Filtra produtos pela nota média mínima; 0 = sem filtro. Produtos sem avaliação ficam de fora quando há filtro. */
export function filtrarPorNota(produtos, minima) {
  return Number(minima) > 0 ? produtos.filter(p => (p.media || 0) >= Number(minima)) : produtos;
}
