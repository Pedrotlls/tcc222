import "./brindes.css";
import { situacaoBrindes } from "../utils/brindes";

const fmt = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Faixas de brinde. compacto = só a barra de progresso (carrinho); pedido = só os liberados (pedido finalizado). */
export default function Brindes({ valor, compacto = false, pedido = false }) {
  const s = situacaoBrindes(valor);
  const mensagem = !s.liberados.length ? "Adicione produtos ao carrinho para liberar brindes."
    : s.proximo ? `Faltam ${fmt(s.faltam)} para liberar o ${s.proximo.nome}.` : "Parabéns! Você liberou todos os brindes.";
  if (pedido) {
    if (!s.liberados.length) return null;
    return <section className="br-box" aria-label="Brindes do pedido"><h3 className="br-title">Brindes liberados</h3>
      <ul className="br-grid">{s.liberados.map(b => <li key={b.nome} className="br-item br-on"><img src={b.img} alt="" loading="lazy" /><b>{b.nome}</b></li>)}</ul>
      <p className="br-note">Brindes demonstrativos: nesta versão acadêmica nada é cobrado nem enviado.</p></section>;
  }
  return <section className={"br-box" + (compacto ? " br-compact" : "")} aria-label="Brindes por valor de compra">
    <h3 className="br-title">Seus brindes <small>{s.liberados.length}/{s.itens.length}</small></h3>
    <div className="br-bar" role="progressbar" aria-label="Progresso para o próximo brinde" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.progresso}><i style={{ width: `${s.progresso}%` }} /></div>
    <p className="br-msg" role="status">{mensagem}</p>
    {!compacto && <>
      <ul className="br-grid">{s.itens.map(b => <li key={b.nome} className={"br-item " + (b.liberado ? "br-on" : "br-off")}>
        <img src={b.img} alt="" loading="lazy" /><b>{b.nome}</b><small>{b.sub}</small>
        <span className="br-tag">{b.liberado ? "✓ Liberado" : "🔒 Bloqueado"}</span></li>)}</ul>
      <p className="br-note">O valor considera só os produtos (sem frete e descontos). Brindes demonstrativos: nada é cobrado nem enviado nesta versão acadêmica.</p></>}
  </section>;
}
