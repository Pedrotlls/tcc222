// Montagem de PC dentro de um orçamento, usando só produtos ativos e em estoque, sempre com componentes compatíveis.
import { STATUS, fonteNecessaria, verificarPar } from "./compat.js";

const ordemPreco = (a, b) => a.preco - b.preco;
const ok = r => r && r.status !== STATUS.NAO && r.status !== STATUS.INCERTO;
const LIMITE_AVALIACOES = 300_000;

/** Produtos de um tipo, disponíveis, do mais barato ao mais caro. */
function disponiveis(base, tipo) {
  return base.produtos.filter(p => p.tipo === tipo && p.ativo !== false && p.estoque > 0).sort(ordemPreco);
}

/**
 * Busca a melhor montagem até o orçamento. "Melhor" privilegia a placa de vídeo e o processador.
 * Retorna { itens, total, sobra, avisos } ou { impossivel, motivo, minimo? }.
 */
export function montarPC(orcamento, base) {
  const tipos = ["cpu", "mae", "ram", "ssd", "fonte", "gabinete"];
  const lista = Object.fromEntries([...tipos, "gpu"].map(t => [t, disponiveis(base, t)]));
  const faltando = tipos.filter(t => !lista[t].length);
  if (faltando.length) return { impossivel: true, motivo: `no catálogo atual não há ${faltando.join(", ")} em estoque para fechar a montagem` };
  const usaGpu = lista.gpu.length > 0;
  const gpus = usaGpu ? lista.gpu : [null];

  let melhor = null, menorTotal = Infinity, avaliacoes = 0;
  let excluidasPorFonte = 0;

  for (const cpu of lista.cpu) {
    for (const mae of lista.mae) {
      if (!ok(verificarPar(cpu, mae))) continue;
      for (const ram of lista.ram) {
        if (!ok(verificarPar(ram, mae)) || !ok(verificarPar(ram, cpu))) continue;
        for (const gpu of gpus) {
          const necessaria = gpu ? fonteNecessaria({ gpu, cpu })?.watts ?? null : null;
          for (const fonte of lista.fonte) {
            if (gpu && necessaria && fonte.specs.watts && fonte.specs.watts < necessaria) { excluidasPorFonte++; continue; }
            if (gpu && !fonte.specs.watts) continue;
            for (const gab of lista.gabinete) {
              if (!ok(verificarPar(mae, gab)) || (gpu && verificarPar(gpu, gab)?.status === STATUS.NAO)) continue;
              const ssd = lista.ssd[0];
              const total = cpu.preco + mae.preco + ram.preco + (gpu?.preco ?? 0) + fonte.preco + gab.preco + ssd.preco;
              if (++avaliacoes > LIMITE_AVALIACOES) break;
              if (total < menorTotal) menorTotal = total;
              if (total > orcamento) continue;
              const pontos = (gpu?.preco ?? 0) + 0.6 * cpu.preco + 0.2 * ram.preco;
              if (!melhor || pontos > melhor.pontos || (pontos === melhor.pontos && total < melhor.total))
                melhor = { pontos, total, cpu, mae, ram, gpu, fonte, gab, ssd };
            }
          }
        }
      }
    }
  }

  if (!melhor) {
    if (menorTotal === Infinity) return { impossivel: true, motivo: "não consegui combinar peças compatíveis com o que há em estoque" };
    return { impossivel: true, motivo: "o orçamento não cobre a configuração compatível mais barata", minimo: Math.round(menorTotal * 100) / 100 };
  }

  // Com a sobra, melhora o SSD escolhido (maior capacidade) sem estourar o orçamento.
  let ssd = melhor.ssd, total = melhor.total;
  for (const candidato of lista.ssd) {
    const novo = total - ssd.preco + candidato.preco;
    if (novo <= orcamento && (candidato.specs.capacidadeGb ?? 0) > (ssd.specs.capacidadeGb ?? 0)) { total = novo; ssd = candidato; }
  }

  const itens = [["cpu", melhor.cpu], ["mae", melhor.mae], ["ram", melhor.ram], ["gpu", melhor.gpu], ["ssd", ssd], ["fonte", melhor.fonte], ["gabinete", melhor.gab]]
    .filter(([, produto]) => produto).map(([tipo, produto]) => ({ tipo, produto }));
  const avisos = [];
  if (usaGpu && excluidasPorFonte && lista.gpu.some(g => g.preco > melhor.gpu.preco))
    avisos.push("Placas de vídeo mais fortes ficaram de fora porque não há fonte em estoque com potência suficiente para elas.");
  if (!usaGpu) avisos.push("Não há placa de vídeo em estoque; a montagem usa apenas o processador.");
  return { itens, total: Math.round(total * 100) / 100, sobra: Math.round((orcamento - total) * 100) / 100, avisos };
}
