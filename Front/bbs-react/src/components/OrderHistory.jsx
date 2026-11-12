export default function OrderHistory({pedido}) {
  return <details className="feature-history"><summary>Histórico do pedido</summary>
    {!pedido.historico?.length ? <p>Este pedido não tem alterações registradas nesta versão.</p> : <ol>{pedido.historico.map((h,i)=><li key={i}><span className="feature-history-dot"/><div><strong>{h.status}</strong><small>{h.ocorridoEm?new Date(h.ocorridoEm).toLocaleString("pt-BR"):"Situação anterior à atualização · data não registrada"}{h.origem!=="IMPORTADO"?` · ${h.origem==="ADMIN"?"Administração":"Cliente"}`:""}</small></div></li>)}</ol>}
  </details>;
}
