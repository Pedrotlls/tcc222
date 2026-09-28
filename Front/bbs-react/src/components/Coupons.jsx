import { useEffect, useState } from "react";
import { request } from "../services/api";
export default function Coupons(){
  const [items,setItems]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;request("/admin/cupons").then(data=>{if(active)setItems(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  async function save(e){
    e.preventDefault();const form=e.currentTarget;setBusy(true);setError("");
    const d=Object.fromEntries(new FormData(form));
    try{
      await request("/admin/cupons",{method:"POST",body:{...d,percentual:Number(d.percentual),limiteUsos:Number(d.limiteUsos),validade:new Date(d.validade).toISOString().slice(0,-1)}});
      setItems(await request("/admin/cupons"));form.reset();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function toggle(c){setBusy(true);setError("");try{const updated=await request("/admin/cupons/"+c.codigo,{method:"PATCH",body:{ativo:!c.ativo}});setItems(old=>old.map(i=>i.codigo===c.codigo?updated:i));}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <section>{error && <p className="bbs-error" role="alert">{error}</p>}<form className="bbs-form" onSubmit={save}>
    <h3>Novo cupom</h3><label>Código do cupom<input name="codigo" required pattern="[A-Za-z0-9-]{3,30}" maxLength={30} placeholder="Ex.: BBS15"/></label>
    <label>Desconto percentual<input name="percentual" type="number" min="1" max="50" required/></label>
    <label>Limite de usos<input name="limiteUsos" type="number" min="1" max="1000000" required/></label>
    <label>Válido até<input name="validade" type="datetime-local" required/></label>
    <p>O cupom substitui o desconto da modalidade de pagamento. O uso é contabilizado ao registrar o pedido; cancelamento não devolve o uso.</p>
    <button disabled={busy}>Cadastrar cupom</button>
  </form><div className="bbs-table-wrap"><table className="bbs-table"><thead><tr><th>Código</th><th>Desconto</th><th>Usos</th><th>Validade</th><th>Status</th></tr></thead><tbody>{items.map(c=><tr key={c.codigo}><td>{c.codigo}</td><td>{c.percentual}%</td><td>{c.usos}/{c.limiteUsos}</td><td>{new Date(c.validade+'Z').toLocaleString('pt-BR')}</td><td><button disabled={busy} onClick={()=>toggle(c)}>{c.ativo?'Desativar':'Ativar'} {c.codigo}</button></td></tr>)}</tbody></table></div></section>;
}
