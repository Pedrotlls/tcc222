import { useEffect, useState } from "react";
import { request } from "../services/api";
import Stars from "./Stars";
import { aplicarVotos, distribuicao, formatarNota, mediaDe, proximoVoto } from "../utils/feedback";
import "./feedback.css";

/**
 * Feedback de um produto: nota média, distribuição, avaliações com votos "útil / não útil"
 * e formulário para avaliar, editar ou excluir a própria avaliação.
 * onChange avisa o catálogo para atualizar as estrelas dos cards.
 */
export default function Reviews({ produtoId, usuario, abrirConta, onChange }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ordem, setOrdem] = useState("recentes");
  const [versao, setVersao] = useState(0);
  const [editando, setEditando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  useEffect(() => {
    let active = true;
    request(`/avaliacoes/${produtoId}?ordem=${ordem}`)
      .then(data => { if (active) { setItems(data); setError(""); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [produtoId, ordem, versao, usuario?.id]);

  const recarregar = () => setVersao(v => v + 1);
  const minha = items.find(a => a.minha);
  const media = mediaDe(items);

  async function salvar(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form));
    setBusy(true); setError("");
    try {
      await request(`/avaliacoes/${produtoId}`, { method: "PUT", body: { nota: Number(d.nota), comentario: d.comentario } });
      setEditando(false);
      recarregar(); onChange?.();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function excluir() {
    setBusy(true); setError("");
    try {
      await request(`/avaliacoes/${produtoId}`, { method: "DELETE" });
      setConfirmarExclusao(false); setEditando(false);
      recarregar(); onChange?.();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function votar(avaliacao, util) {
    if (!usuario) { abrirConta(); return; }
    const novo = proximoVoto(avaliacao.meuVoto, util);
    setBusy(true); setError("");
    try {
      const votos = novo === null
        ? await request(`/avaliacoes/${avaliacao.id}/voto`, { method: "DELETE" })
        : await request(`/avaliacoes/${avaliacao.id}/voto`, { method: "PUT", body: { util: novo } });
      setItems(lista => aplicarVotos(lista, avaliacao.id, votos));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const mostrarFormulario = usuario && (!minha || editando);

  return <section className="product-reviews" aria-label="Avaliações do produto">
    <h3>Avaliações</h3>
    {error && <p className="bbs-error" role="alert">{error}</p>}
    {loading ? <p role="status">Carregando avaliações…</p> : items.length === 0 ? <p>Seja o primeiro a avaliar após registrar sua compra.</p> : <>
      <div className="fb-summary">
        <div className="fb-score"><strong>{formatarNota(media)}</strong><Stars media={media} total={items.length} texto={false} /><small>{items.length} {items.length === 1 ? "avaliação" : "avaliações"}</small></div>
        <div className="fb-bars" aria-label="Distribuição das notas">
          {distribuicao(items).map(({ nota, quantidade }) => <div className="fb-bar" key={nota}>
            <span>{nota} ★</span><i><b style={{ width: `${quantidade / items.length * 100}%` }} /></i><span>{quantidade}</span>
          </div>)}
        </div>
      </div>
      <div className="fb-toolbar">
        <span>{items.length} {items.length === 1 ? "comentário" : "comentários"}</span>
        <label>Ordenar avaliações
          <select value={ordem} onChange={e => setOrdem(e.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="uteis">Mais úteis</option>
          </select>
        </label>
      </div>
      {items.map(a => <article className={`fb-review ${a.minha ? "fb-mine" : ""}`} key={a.id}>
        <div className="fb-review-head">
          <b>{a.autor} · {a.nota}/5 {a.minha && <span className="fb-badge">Sua avaliação</span>}</b>
          <Stars media={a.nota} total={1} texto={false} rotulo={`Nota ${a.nota} de 5`} />
        </div>
        <p>{a.comentario}</p>
        <small>{new Date(a.criadoEm + "Z").toLocaleDateString("pt-BR")}</small>
        {a.minha ? <>
          <small>{a.uteis} {a.uteis === 1 ? "pessoa achou" : "pessoas acharam"} útil · {a.naoUteis} não {a.naoUteis === 1 ? "achou" : "acharam"} útil</small>
          <div className="fb-actions">
            {confirmarExclusao ? <div className="fb-confirm" role="alert">
              <span>Excluir sua avaliação e os votos recebidos?</span>
              <button className="fb-danger" disabled={busy} onClick={excluir}>Confirmar exclusão</button>
              <button disabled={busy} onClick={() => setConfirmarExclusao(false)}>Manter avaliação</button>
            </div> : <>
              <button disabled={busy} onClick={() => setEditando(v => !v)} aria-pressed={editando}>{editando ? "Cancelar edição" : "Editar minha avaliação"}</button>
              <button className="fb-danger" disabled={busy} onClick={() => setConfirmarExclusao(true)}>Excluir minha avaliação</button>
            </>}
          </div>
        </> : <div className="fb-votes" role="group" aria-label={`Esta avaliação de ${a.autor} foi útil?`}>
          <span>Esta avaliação foi útil?</span>
          <button disabled={busy} aria-pressed={a.meuVoto === true} onClick={() => votar(a, true)}>👍 Sim ({a.uteis})</button>
          <button disabled={busy} aria-pressed={a.meuVoto === false} onClick={() => votar(a, false)}>👎 Não ({a.naoUteis})</button>
        </div>}
      </article>)}
    </>}
    {mostrarFormulario ? <form key={minha ? `editar-${minha.id}-${minha.criadoEm}` : "nova"} className="bbs-form fb-form" onSubmit={salvar}>
      <h4>{minha ? "Editar sua avaliação" : "Sua avaliação"}</h4>
      <p>Uma avaliação por produto, disponível para quem registrou uma compra não cancelada. Enviar novamente atualiza seu comentário.</p>
      <label>Nota<select name="nota" defaultValue={minha?.nota ?? 5}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrela{n > 1 ? "s" : ""}</option>)}</select></label>
      <label>Comentário<textarea name="comentario" required maxLength={1000} defaultValue={minha?.comentario ?? ""} /></label>
      <div className="fb-form-actions">
        <button disabled={busy}>Salvar avaliação</button>
        {minha && <button type="button" disabled={busy} onClick={() => setEditando(false)}>Cancelar</button>}
      </div>
    </form> : !usuario && <button onClick={abrirConta}>Entrar para avaliar</button>}
  </section>;
}
