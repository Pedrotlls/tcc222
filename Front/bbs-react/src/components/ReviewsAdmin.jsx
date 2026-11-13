import { useEffect, useState } from "react";
import { request } from "../services/api";
import Stars from "./Stars";
import { formatarNota, mediaDe } from "../utils/feedback";
import "./feedback.css";

/** Moderação: o administrador vê todas as avaliações dos produtos, filtra e remove conteúdo inadequado. */
export default function ReviewsAdmin() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nota, setNota] = useState("");
  const [busca, setBusca] = useState("");
  const [removendo, setRemovendo] = useState(null);

  useEffect(() => {
    let active = true;
    request("/admin/avaliacoes" + (nota ? `?nota=${nota}` : ""))
      .then(data => { if (active) { setItems(data); setError(""); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [nota]);

  async function remover(avaliacao) {
    setBusy(true); setError("");
    try {
      await request(`/admin/avaliacoes/${avaliacao.id}`, { method: "DELETE" });
      setItems(lista => lista.filter(a => a.id !== avaliacao.id));
      setRemovendo(null);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis = items.filter(a => !termo || `${a.produto} ${a.autor} ${a.comentario}`.toLocaleLowerCase("pt-BR").includes(termo));
  const criticas = visiveis.filter(a => a.nota <= 2).length;

  return <section aria-label="Moderação de avaliações">
    <p className="reports-intro">Acompanhe o feedback dos clientes e remova avaliações ofensivas ou inadequadas. A remoção é definitiva e apaga também os votos recebidos.</p>
    {error && <p className="bbs-error" role="alert">{error}</p>}
    <div className="bbs-stats">
      <div><b>{visiveis.length}</b><span>Avaliações listadas</span></div>
      <div><b>{visiveis.length ? formatarNota(mediaDe(visiveis)) : "—"}</b><span>Nota média da lista</span></div>
      <div><b>{criticas}</b><span>Críticas (nota 1 ou 2)</span></div>
    </div>
    <div className="fb-admin-filters">
      <label>Buscar avaliação<input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Produto, cliente ou comentário" /></label>
      <label>Nota<select value={nota} onChange={e => { setLoading(true); setNota(e.target.value); }}>
        <option value="">Todas as notas</option>
        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} estrela{n > 1 ? "s" : ""}</option>)}
      </select></label>
    </div>
    {loading ? <p role="status">Carregando avaliações…</p> : !visiveis.length ? <p>Nenhuma avaliação encontrada.</p> :
      <div className="bbs-table-wrap"><table className="bbs-table fb-admin-table">
        <thead><tr><th>Produto</th><th>Cliente</th><th>Nota</th><th>Comentário</th><th>Data</th><th>Votos</th><th>Ação</th></tr></thead>
        <tbody>{visiveis.map(a => <tr key={a.id}>
          <td>{a.produto}</td>
          <td>{a.autor}</td>
          <td><Stars media={a.nota} total={1} texto={false} rotulo={`Nota ${a.nota} de 5`} /><small>{a.nota}/5</small></td>
          <td className="fb-admin-comment">{a.comentario}</td>
          <td>{new Date(a.criadoEm + "Z").toLocaleDateString("pt-BR")}</td>
          <td className="fb-nowrap">👍 {a.uteis} · 👎 {a.naoUteis}</td>
          <td>{removendo === a.id ? <div className="fb-confirm" role="alert">
            <span>Remover?</span>
            <button className="fb-danger" disabled={busy} onClick={() => remover(a)}>Confirmar remoção</button>
            <button disabled={busy} onClick={() => setRemovendo(null)}>Cancelar</button>
          </div> : <button disabled={busy} onClick={() => setRemovendo(a.id)} aria-label={`Remover avaliação de ${a.autor} sobre ${a.produto}`}>Remover</button>}</td>
        </tr>)}</tbody>
      </table></div>}
    <p className="reports-footnote">Mostra as 300 avaliações mais recentes. Use a nota ou a busca para localizar conteúdo específico.</p>
  </section>;
}
