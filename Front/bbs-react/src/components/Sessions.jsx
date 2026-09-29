import { useEffect, useState } from "react";
import { request, logout } from "../services/api";
export default function Sessions({ onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request("/auth/sessoes").then(data => { if(active) setItems(data); })
      .catch(e => { if(active) setError(e.message); })
      .finally(() => { if(active) setLoading(false); });
    return () => { active=false; };
  }, []);
  async function revoke(item) {
    setBusy(true);setError("");
    try {
      if(item.atual) { await logout();onLogout(); }
      else {
        await request("/auth/sessoes/" + item.id, {method:"DELETE"});
        setItems(await request("/auth/sessoes"));
      }
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function all() {
    if(!window.confirm("Sair da conta em todos os computadores e celulares?")) return;
    setBusy(true);setError("");
    try {await logout(true);onLogout();}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  const date = value => new Date(value + "Z").toLocaleString("pt-BR");
  return <section className="account-sessions">
    <p>Veja os acessos ativos da sua conta. Ao terminar no computador da escola, clique em Sair.</p>
    {error && <p role="alert" className="bbs-error">{error}</p>}
    {loading ? <p role="status">Carregando acessos…</p> : items.map(item => <article className="bbs-order" key={item.id}>
      <h3>{item.atual ? "Este navegador" : "Outro acesso"}</h3>
      <p>Token emitido em {date(item.criadoEm)}</p>
      <p>Acesso permitido até {date(item.expiraEm)}</p>
      <button disabled={busy} onClick={() => revoke(item)}>{item.atual ? "Sair deste navegador" : "Encerrar acesso"}</button>
    </article>)}
    {!loading && <button disabled={busy} onClick={all}>Sair de todos os dispositivos</button>}
  </section>;
}
