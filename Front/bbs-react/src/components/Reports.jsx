import { useEffect, useState } from "react";
import { request } from "../services/api";
import { reportCsv, localDate } from "../utils/reports";
const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function Reports() {
  const [inicio,setInicio]=useState(()=>localDate(new Date(new Date().getFullYear(),new Date().getMonth(),1)));
  const [fim,setFim]=useState(()=>localDate());
  const [periodo,setPeriodo]=useState(()=>({inicio,fim}));
  const [report,setReport]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    request(`/admin/relatorios?${new URLSearchParams(periodo)}`).then(data=>{if(active)setReport(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[periodo]);
  function consultar(e){e.preventDefault();setLoading(true);setError("");setReport(null);setPeriodo({inicio,fim});}
  function exportar(){const url=URL.createObjectURL(new Blob([reportCsv(report)],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`BBS-vendas-${report.inicio}-${report.fim}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const maior=Math.max(1,...(report?.produtos||[]).map(p=>p.unidades));
  return <section className="reports-panel" aria-label="Relatório de vendas">
    <p className="reports-intro">Acompanhe os pedidos do período, identifique os produtos mais vendidos e exporte os resultados.</p>
    <form className="report-filters" onSubmit={consultar}><label>Data inicial<input type="date" value={inicio} max={fim} required onChange={e=>setInicio(e.target.value)}/></label><label>Data final<input type="date" value={fim} min={inicio} required onChange={e=>setFim(e.target.value)}/></label><button className="adm-primary" disabled={loading}>Consultar período</button><button type="button" onClick={exportar} disabled={loading || !report}>Exportar CSV ↓</button></form>
    {error && <p className="bbs-error" role="alert">{error}</p>}{loading && <p role="status">Carregando relatório…</p>}
    {report && <><div className="report-metrics"><div><span>Valor dos pedidos</span><strong>{money(report.valor)}</strong><small>Com frete e descontos</small></div><div><span>Pedidos válidos</span><strong>{report.pedidos}</strong><small>Exclui cancelamentos</small></div><div><span>Ticket médio</span><strong>{money(report.ticketMedio)}</strong><small>Por pedido válido</small></div><div><span>Cancelamentos</span><strong>{report.cancelados}</strong><small>No período selecionado</small></div></div>
    <div className="report-columns"><section className="report-card"><span className="report-eyebrow">TOP 10 DO PERÍODO</span><h3>Produtos mais vendidos</h3>{!report.produtos.length?<p>Nenhuma venda no período.</p>:report.produtos.map((p,i)=><div className="report-ranking" key={p.id}><span>{String(i+1).padStart(2,'0')}</span><div><b>{p.nome}</b><div className="report-bar"><i style={{width:`${p.unidades/maior*100}%`}}/></div></div><strong>{p.unidades}<small>un.</small></strong></div>)}</section><section className="report-card"><span className="report-eyebrow">ANDAMENTO</span><h3>Distribuição dos pedidos</h3>{!Object.keys(report.estados).length?<p>Nenhum pedido encontrado.</p>:Object.entries(report.estados).map(([status,n])=><div className="report-status" key={status}><span className={`bbs-tag adm-status-${status.toLowerCase()}`}>{status}</span><strong>{n}</strong></div>)}</section></div>
    <section className="report-card"><h3>Movimento por dia</h3><div className="bbs-table-wrap"><table className="bbs-table"><thead><tr><th>Data</th><th>Pedidos válidos</th><th>Valor dos pedidos</th></tr></thead><tbody>{report.dias.map(d=><tr key={d.data}><td>{d.data.split('-').reverse().join('/')}</td><td>{d.pedidos}</td><td>{money(d.valor)}</td></tr>)}</tbody></table></div>{!report.dias.length && <p>Sem movimento no período.</p>}</section>
    <p className="reports-footnote">Valores demonstrativos, sem comprovação de pagamento. Cancelados ficam fora do total e do ranking. O ranking usa quantidades e subtotais de produtos; as datas seguem o registro da API.</p></>}
  </section>;
}
