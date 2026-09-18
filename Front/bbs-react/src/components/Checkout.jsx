import { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import Modal from "./Modal";
import "./checkout.css";
import "./addresses.css";
import { emptyAddress } from "../utils/address";
import { request } from "../services/api";
import { calcularTotais, criarChavePedido } from "../utils/checkout";
const fmt = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function Checkout({ fechar, onComplete }) {
  const { cart, cartOrder, subtotal, limparCarrinho } = useCart();
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [endereco, setEndereco] = useState({ cep:"", rua:"", numero:"", complemento:"", bairro:"", cidade:"", uf:"" });
  const [enderecos, setEnderecos] = useState([]);
  const [enderecoId, setEnderecoId] = useState('');
  const [carregandoEnderecos, setCarregandoEnderecos] = useState(true);
  const [salvarEndereco, setSalvarEndereco] = useState(true);
  const [apelido, setApelido] = useState('Casa');
  useEffect(() => {
    let active=true;
    request('/enderecos').then(lista => {
      if(!active) return;
      setEnderecos(lista);
      const principal=lista.find(e=>e.principal) || lista[0];
      if(principal) {setEndereco(principal);setEnderecoId(String(principal.id));}
    }).catch(e=>{if(active) setError(e.message);}).finally(()=>{if(active) setCarregandoEnderecos(false);});
    return ()=>{active=false;};
  }, []);
  const [entrega, setEntrega] = useState("normal");
  const [pagamento, setPagamento] = useState("pix");
  const [cotacao, setCotacao] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [chave] = useState(() => criarChavePedido());
  const lock = useRef(false);
  const totais = calcularTotais(subtotal, cotacao?.valor, pagamento);
  const itens = cartOrder.filter(id => cart[id]).map(id => ({produtoId:Number(id),quantidade:cart[id].qty}));
  function campo(key, label, maxLength, minLength = 1) {
    return <label>{label}<input readOnly={Boolean(enderecoId)} value={endereco[key]} maxLength={maxLength} minLength={minLength} required={key !== "complemento"}
      onChange={e => {setEndereco({...endereco,[key]:key === "uf" ? e.target.value.toUpperCase() : e.target.value});setCotacao(null);}} /></label>;
  }
  async function buscarCep() {
    const cep = endereco.cep.replace(/\D/g,"");
    if (cep.length !== 8) {setError("Informe um CEP de 8 dígitos.");return;}
    setBusy(true);setError("");
    try {
      const response = await fetch("https://viacep.com.br/ws/" + cep + "/json/", { signal: AbortSignal.timeout(8000) });
      if(!response.ok) throw new Error();
      const data = await response.json();
      if(data.erro) throw new Error();
      setEndereco(e => ({...e, cep, rua:data.logradouro || "", bairro:data.bairro || "", cidade:data.localidade || "", uf:data.uf || ""}));
      setCotacao(null);
    } catch {setError("CEP não encontrado ou consulta indisponível. Você pode preencher o endereço manualmente.");}
    finally {setBusy(false);}
  }
  async function cotar() {
    setBusy(true);setError("");setCotacao(null);
    try {
      if(!enderecoId && salvarEndereco) {
        const salvo=await request('/enderecos',{method:'POST',body:{...endereco,apelido,cep:endereco.cep.replace(/\D/g,'')}});
        setEnderecos(old=>[...old,salvo]);setEnderecoId(String(salvo.id));setEndereco(salvo);
      }
      const result=await request("/frete/cotacao",{method:"POST",body:{itens,uf:endereco.uf,entrega}});
      setCotacao(result);setStep(3);
    } catch(e) {setError(e.message);}
    finally {setBusy(false);}
  }
  async function confirmar() {
    if(lock.current) return;
    lock.current = true;setBusy(true);setError("");
    try {
      const result = await request("/pedidos", {method:"POST",body:{
        chave, entrega, pagamento, enderecoId:enderecoId?Number(enderecoId):null, endereco:{...endereco,cep:endereco.cep.replace(/\D/g,"")},
        itens
      }});
      setPedido(result); limparCarrinho(); onComplete();
    } catch(e) {setError(e.message);}
    finally {lock.current=false;setBusy(false);}
  }
  return <Modal className="bbs-checkout" title="Checkout BBS" fechar={() => {if(!busy) fechar();}}>
    <div className="ck-brand"><b>BBS</b><span>FINALIZAR COMPRA</span></div>
    <ol className="ck-progress" aria-label="Etapas da compra">
      {["Revisão","Entrega","Pagamento"].map((label,i) => <li key={label} className={step===i+1 ? "active" : step>i+1 ? "done" : ""} aria-current={step===i+1 ? "step" : undefined}><span>{step>i+1 ? "✓" : i+1}</span>{label}</li>)}
    </ol>
    <p className="ck-demo">DEMONSTRAÇÃO ACADÊMICA · Sem cobrança real. Não informe dados bancários.</p>
    {error && <p role="alert" className="bbs-error">{error}</p>}
    {pedido ? <section className="ck-success ck-card" role="status"><div className="ck-success-icon">✓</div><h2>Pedido registrado!</h2><p>Seu pedido foi salvo e o estoque foi atualizado.</p><strong className="ck-order-code">PEDIDO #{pedido.id}</strong><h3>{fmt(pedido.total)}</h3><p>Acompanhe o status em Minha conta. Nenhum pagamento foi realizado.</p><button className="ck-next" onClick={fechar}>Voltar à loja</button></section> :
    itens.length === 0 ? <section className="ck-card"><h2>Seu carrinho está vazio</h2><button className="ck-next" onClick={fechar}>Voltar à loja</button></section> :
    <div className="ck-layout">
      <div className="ck-main">
        {step === 1 && <>
          <section className="ck-card"><h2 className="ck-title">Revisão do pedido</h2>
            {cartOrder.filter(id => cart[id]).map(id => <div className="ck-item" key={id}>
              {cart[id].img && /^https?:|^\//.test(cart[id].img) ? <img src={cart[id].img} alt="" onError={e => {e.currentTarget.style.display="none";}}/> : <span className="ck-item-placeholder">BBS</span>}
              <div><h3>{cart[id].name}</h3><p>Quantidade: {cart[id].qty}</p></div><strong>{fmt(cart[id].price*cart[id].qty)}</strong>
            </div>)}
          </section>
          <div className="ck-nav"><button className="ck-prev" onClick={fechar}>← Voltar à loja</button><button className="ck-next" onClick={() => setStep(2)}>Continuar para entrega →</button></div>
        </>}
        {step === 2 && <form onSubmit={e => {e.preventDefault();if(endereco.cep.replace(/\D/g,"").length!==8){setError("CEP deve ter 8 dígitos.");return;}cotar();}}>
          <fieldset disabled={busy || carregandoEnderecos} className="ck-card ck-address"><legend className="ck-title">Endereço de entrega</legend>
            <div className="ck-saved"><label>Endereço salvo<select value={enderecoId} onChange={e=>{const id=e.target.value;setEnderecoId(id);setEndereco(enderecos.find(a=>String(a.id)===id)||emptyAddress());setCotacao(null);}}>
              <option value="">Novo endereço</option>{enderecos.map(a=><option key={a.id} value={a.id}>{a.apelido}{a.principal?' · Principal':''} — {a.rua}, {a.numero}</option>)}
            </select></label>{carregandoEnderecos && <p role="status">Carregando seus endereços…</p>}
            {enderecoId ? <p>Endereço preenchido da sua conta. Para alterar, use Meus endereços ou escolha Novo endereço.</p> : <><label className="address-check"><input type="checkbox" checked={salvarEndereco} onChange={e=>setSalvarEndereco(e.target.checked)}/>Salvar este endereço na minha conta</label>{salvarEndereco && <label>Apelido do endereço<input value={apelido} minLength={2} maxLength={40} required onChange={e=>setApelido(e.target.value)} placeholder="Casa, trabalho…"/></label>}</>}
            </div>
            <div className="ck-cep">{campo("cep","CEP",9,8)}<button type="button" className="ck-next" disabled={Boolean(enderecoId)} onClick={buscarCep}>{busy ? "Consultando…" : "Buscar CEP"}</button></div>
            <div className="ck-street">{campo("rua","Rua / Logradouro",120,2)}{campo("numero","Número",20)}</div>
            {campo("complemento","Complemento (opcional)",100)}
            <div className="ck-city">{campo("bairro","Bairro",80,2)}{campo("cidade","Cidade",80,2)}{campo("uf","UF",2,2)}</div>
          </fieldset>
          <fieldset disabled={busy} className="ck-card"><legend className="ck-title">Tipo de entrega</legend>
            {[["normal","Entrega normal","Frete econômico"],["expresso","Entrega expressa","Prazo estimado reduzido"]].map(([id,title,sub]) => <label key={id} className={"ck-choice "+(entrega===id?"selected":"")}><input type="radio" name="entrega" value={id} checked={entrega===id} onChange={() => {setEntrega(id);setCotacao(null);}}/><span><b>{title}</b><small>{sub}</small></span><em>Calcular por UF</em></label>)}
            <p className="ck-muted">Valor e prazo serão calculados pela API na próxima etapa. Estimativa acadêmica, não tarifa de transportadora.</p>
          </fieldset>
          <div className="ck-nav"><button type="button" disabled={busy} className="ck-prev" onClick={() => setStep(1)}>← Voltar</button><button className="ck-next" disabled={busy || carregandoEnderecos}>{busy?"Calculando frete…":"Continuar para pagamento →"}</button></div>
        </form>}
        {step === 3 && <>
          <section className="ck-card"><h2 className="ck-title">Forma de pagamento</h2>
            <div className="ck-payment-options">{[["pix","◇","PIX","10% de desconto"],["credito","▣","Crédito","Sem desconto"],["debito","▣","Débito","Sem desconto"],["boleto","▥","Boleto","7% de desconto"]].map(([id,icon,title,sub]) => <label key={id} className={"ck-choice "+(pagamento===id?"selected":"")}><input disabled={busy} type="radio" name="pagamento" checked={pagamento===id} onChange={() => setPagamento(id)}/><span className="ck-pay-icon" aria-hidden="true">{icon}</span><span><b>{title}</b><small>{sub}</small></span></label>)}</div>
            <div className="ck-payment-panel">
              {pagamento==="pix" ? <><div className="ck-payment-symbol">◇</div><h3>Pagamento via PIX</h3><p>10% de desconto aplicado ao subtotal.</p><span className="ck-simulation">SIMULAÇÃO · SEM QR CODE PAGÁVEL</span></> :
              pagamento==="boleto" ? <><div className="ck-barcode" aria-hidden="true"/><h3>Boleto bancário</h3><p>7% de desconto aplicado ao subtotal.</p><span className="ck-simulation">SIMULAÇÃO · NÃO É UM BOLETO</span></> :
              <><div className="ck-bank-card"><b>BBS</b><span>DEMONSTRAÇÃO</span><strong>•••• &nbsp; •••• &nbsp; •••• &nbsp; 0000</strong><small>CARTÃO FICTÍCIO · {pagamento==="credito"?"CRÉDITO":"DÉBITO"}</small></div><p>Não é necessário informar número, validade ou código de segurança.</p></>}
              <p className="ck-muted">Ao confirmar, apenas o pedido e a modalidade escolhida serão registrados. Não há processamento de pagamento.</p>
            </div>
          </section>
          <section className="ck-card"><h2 className="ck-title">Entrega</h2><p>{endereco.rua}, {endereco.numero} — {endereco.bairro}</p><p>{endereco.cidade}/{endereco.uf} · CEP {endereco.cep}</p><p className="ck-muted">{entrega==="expresso"?"Expresso":"Normal"} · {cotacao?.prazoMin} a {cotacao?.prazoMax} dias úteis · {cotacao?.regiao}</p></section>
          <div className="ck-nav"><button className="ck-prev" disabled={busy} onClick={() => {setCotacao(null);setStep(2);}}>← Voltar</button><button disabled={busy || !cotacao} className="ck-next" onClick={confirmar}>{busy?"Registrando…":"Confirmar pedido demonstrativo"}</button></div>
        </>}
      </div>
      <aside className="ck-summary ck-card" aria-label="Resumo do pedido"><h2 className="ck-title">Resumo do pedido</h2>
        {cartOrder.filter(id => cart[id]).map(id => <div className="ck-summary-item" key={id}><span>{cart[id].name} ×{cart[id].qty}</span><span>{fmt(cart[id].price*cart[id].qty)}</span></div>)}
        <dl><div><dt>Subtotal</dt><dd>{fmt(subtotal)}</dd></div><div><dt>Frete</dt><dd>{!cotacao?"A calcular":cotacao.gratis?"Grátis":fmt(totais.frete)}</dd></div><div className="ck-discount"><dt>Desconto {pagamento==="pix"?"PIX":pagamento==="boleto"?"boleto":""}</dt><dd>−{fmt(totais.desconto)}</dd></div><div className="ck-total"><dt>Total estimado</dt><dd>{fmt(totais.total)}</dd></div></dl>
        {!cotacao && <p className="ck-muted">Frete ainda não incluído.</p>}
        {totais.desconto>0 && <p className="ck-saving">Você economiza <b>{fmt(totais.desconto)}</b> nesta modalidade.</p>}
        <p className="ck-muted">Preços e estoque confirmados pelo servidor ao registrar o pedido.</p>
      </aside>
    </div>}
  </Modal>;
}
