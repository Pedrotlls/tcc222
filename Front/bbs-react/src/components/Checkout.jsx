import { useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import Modal from "./Modal";
import { request } from "../services/api";
import { calcularTotais } from "../utils/checkout";
const fmt = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function Checkout({ fechar, onComplete }) {
  const { cart, cartOrder, subtotal, limparCarrinho } = useCart();
  const [step, setStep] = useState(1);
  const [endereco, setEndereco] = useState({ cep:"", rua:"", numero:"", complemento:"", bairro:"", cidade:"", uf:"" });
  const [entrega, setEntrega] = useState("normal");
  const [pagamento, setPagamento] = useState("pix");
  const [cotacao, setCotacao] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pedido, setPedido] = useState(null);
  const [chave] = useState(() => crypto.randomUUID());
  const lock = useRef(false);
  const totais = calcularTotais(subtotal, cotacao?.valor, pagamento);
  const itens = cartOrder.filter(id => cart[id]).map(id => ({produtoId:Number(id),quantidade:cart[id].qty}));
  function campo(key, label, maxLength, minLength = 1) {
    return <label>{label}<input value={endereco[key]} maxLength={maxLength} minLength={minLength} required={key !== "complemento"}
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
        chave, entrega, pagamento, endereco:{...endereco,cep:endereco.cep.replace(/\D/g,"")},
        itens
      }});
      setPedido(result); limparCarrinho(); onComplete();
    } catch(e) {setError(e.message);}
    finally {lock.current=false;setBusy(false);}
  }
  return <Modal title={pedido ? "Pedido registrado" : "Finalizar pedido"} fechar={() => {if(!busy) fechar();}}>
    <p className="bbs-notice">DEMONSTRAÇÃO ACADÊMICA · Nenhum pagamento real. Não informe dados de cartão.</p>
    {error && <p role="alert" className="bbs-error">{error}</p>}
    {pedido ? <div className="bbs-success"><h3>Pedido #{pedido.id}</h3><p>O pedido foi salvo na API e o estoque foi atualizado.</p><p>Total confirmado pelo servidor: <strong>{fmt(pedido.total)}</strong></p><p>Acompanhe ou cancele em Minha conta.</p><button onClick={fechar}>Voltar à loja</button></div> :
    cartOrder.length === 0 ? <p>Seu carrinho está vazio.</p> : <>
      <p>Etapa {step} de 3 · {["","Revisão","Entrega","Confirmação"][step]}</p>
      {step === 1 && <><ul>{cartOrder.filter(id => cart[id]).map(id => <li key={id}>{cart[id].qty}× {cart[id].name} — {fmt(cart[id].price*cart[id].qty)}</li>)}</ul><p>Subtotal: {fmt(subtotal)}</p><button className="bbs-primary" onClick={() => setStep(2)}>Continuar para entrega</button></>}
      {step === 2 && <form className="bbs-form" onSubmit={e => {e.preventDefault(); if(endereco.cep.replace(/\D/g,"").length!==8){setError("CEP deve ter 8 dígitos.");return;}cotar();}}>
        <div className="bbs-actions">{campo("cep","CEP",9,8)}<button type="button" disabled={busy} onClick={buscarCep}>{busy?"Consultando…":"Buscar CEP"}</button></div>
        <div className="bbs-fields">{campo("rua","Rua",120,2)}{campo("numero","Número",20)}{campo("complemento","Complemento (opcional)",100)}{campo("bairro","Bairro",80,2)}{campo("cidade","Cidade",80,2)}{campo("uf","UF",2,2)}</div>
        <label>Modalidade de entrega<select value={entrega} onChange={e => {setEntrega(e.target.value);setCotacao(null);}}><option value="normal">Normal</option><option value="expresso">Expresso</option></select></label>
        <p>O servidor estima o frete pela UF, quantidade de itens, valor do carrinho e modalidade. Não é tarifa de transportadora.</p>
        <div className="bbs-actions"><button type="button" onClick={() => setStep(1)}>Voltar</button><button className="bbs-primary" disabled={busy}>Continuar</button></div>
      </form>}
      {step === 3 && <div className="bbs-form">
        <label>Modalidade simulada<select disabled={busy} value={pagamento} onChange={e => setPagamento(e.target.value)}><option value="pix">PIX — desconto de 10%</option><option value="boleto">Boleto — desconto de 7%</option><option value="credito">Crédito — sem desconto</option><option value="debito">Débito — sem desconto</option></select></label>
        <p>{endereco.rua}, {endereco.numero} — {endereco.cidade}/{endereco.uf}</p>
        <p>Destino: {cotacao?.regiao} · Prazo estimado: {cotacao?.prazoMin} a {cotacao?.prazoMax} dias úteis</p>
        <p>Subtotal: {fmt(subtotal)} · Frete: {cotacao?.gratis ? "Grátis" : fmt(totais.frete)} · Desconto: {fmt(totais.desconto)}</p>
        <p>{cotacao?.regra}</p>
        <h3>Total estimado: {fmt(totais.total)}</h3><p>A API confirma os preços atuais e valida o estoque ao salvar.</p>
        <div className="bbs-actions"><button disabled={busy} onClick={() => {setCotacao(null);setStep(2);}}>Voltar</button><button disabled={busy || !cotacao} className="bbs-primary" onClick={confirmar}>{busy ? "Registrando…" : "Confirmar pedido demonstrativo"}</button></div>
      </div>}
    </>}
  </Modal>;
}
