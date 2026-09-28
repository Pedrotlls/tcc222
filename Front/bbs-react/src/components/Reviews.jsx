import { useEffect, useState } from "react";
import { request } from "../services/api";
export default function Reviews({produtoId,usuario,abrirConta}){
  const [items,setItems]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;request('/avaliacoes/'+produtoId).then(data=>{if(active)setItems(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[produtoId]);
  async function save(e){e.preventDefault();const form=e.currentTarget;setBusy(true);setError('');try{const d=Object.fromEntries(new FormData(form));await request('/avaliacoes/'+produtoId,{method:'PUT',body:{nota:Number(d.nota),comentario:d.comentario}});setItems(await request('/avaliacoes/'+produtoId));form.reset();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section className="product-reviews"><h3>Avaliações {items.length>0 && `· ${(items.reduce((s,a)=>s+a.nota,0)/items.length).toFixed(1)}/5`}</h3>
    {error && <p className="bbs-error" role="alert">{error}</p>}{loading?<p role="status">Carregando avaliações…</p>:items.length===0?<p>Seja o primeiro a avaliar após registrar sua compra.</p>:items.map(a=><article className="bbs-order" key={a.id}><b>{a.autor} · {a.nota}/5</b><p>{a.comentario}</p><small>{new Date(a.criadoEm+'Z').toLocaleDateString('pt-BR')}</small></article>)}
    {usuario?<form className="bbs-form" onSubmit={save}><h4>Sua avaliação</h4><p>Uma avaliação por produto, disponível para quem registrou uma compra não cancelada. Enviar novamente atualiza seu comentário.</p><label>Nota<select name="nota" defaultValue="5">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} estrela{n>1?'s':''}</option>)}</select></label><label>Comentário<textarea name="comentario" required maxLength={1000}/></label><button disabled={busy}>Salvar avaliação</button></form>:<button onClick={abrirConta}>Entrar para avaliar</button>}
  </section>;
}
