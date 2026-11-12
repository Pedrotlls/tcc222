import { useEffect, useState } from "react";
import { request } from "../services/api";
import { useCart } from "../context/CartContext";
const money=n=>Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function MobileSummary({usuario,versao,abrirConta}) {
  const {totalQty,subtotal,setIsOpen,syncBusy}=useCart();
  const [data,setData]=useState(null),[error,setError]=useState("");
  useEffect(()=>{
    if(!usuario)return;
    let active=true;
    function load(){request("/pedidos").then(p=>{if(active){setData({id:usuario.id,pedido:p[0]});setError("");}}).catch(()=>{if(active)setError("Não foi possível atualizar seu último pedido.");});}
    load();window.addEventListener("focus",load);
    return ()=>{active=false;window.removeEventListener("focus",load);};
  },[usuario,versao]);
  const pedido=data?.id===usuario?.id?data?.pedido:null;
  return <section className="mobile-summary" aria-label="Atalhos da sua conta">
    <div className="mobile-quick-actions"><button onClick={()=>abrirConta("pedidos")}><span aria-hidden="true">↗</span><b>Pedidos</b><small>Acompanhe aqui</small></button><button onClick={()=>abrirConta("enderecos")}><span aria-hidden="true">⌖</span><b>Endereços</b><small>Entrega pronta</small></button><button onClick={()=>abrirConta("sessoes")}><span aria-hidden="true">◎</span><b>Segurança</b><small>Seus acessos</small></button></div>
    {totalQty>0 && <button className="mobile-cart-resume" onClick={()=>setIsOpen(true)}><span><small>CONTINUE SUA ESCOLHA</small><b>{totalQty} {totalQty===1?"item":"itens"} no carrinho</b></span><span><b>{money(subtotal)}</b><small>{syncBusy?"Sincronizando…":"Ver carrinho →"}</small></span></button>}
    {usuario && pedido && <button className="mobile-last-order" onClick={()=>abrirConta("pedidos")}><span><small>ÚLTIMO PEDIDO · #{pedido.id}</small><b>{pedido.status.replaceAll('_',' ')}</b><small>{pedido.itens.length} produto(s) · {money(pedido.total)}</small></span><span aria-hidden="true">↗</span></button>}
    {usuario && error && <p role="status">{error}</p>}
  </section>;
}
