import { useState, useEffect, useRef } from "react";
import Modal from "./Modal";
import { request, session, logout } from "../services/api";
import "./admin.css";
import Addresses from "./Addresses";
import OrderHistory from "./OrderHistory";
import "./features.css";
const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const steps = { RECEBIDO: ["SEPARANDO", "CANCELADO"], SEPARANDO: ["ENVIADO", "CANCELADO"], ENVIADO: ["ENTREGUE"], ENTREGUE: [], CANCELADO: [] };
export default function Account({ usuario, onUsuario, fechar, abrirProdutos, onChange }) {
  const [cadastro, setCadastro] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tab, setTab] = useState("pedidos");
  const [loading, setLoading] = useState(Boolean(usuario));
  const [revision, setRevision] = useState(0);
  const [novoCliente,setNovoCliente] = useState(false);
  const [clienteErro,setClienteErro] = useState("");
  const [clienteSalvando,setClienteSalvando] = useState(false);
  const [clienteAviso,setClienteAviso] = useState("");
  const clienteLock = useRef(false);
  const [filtroPedido,setFiltroPedido]=useState("");
  const [statusPedido,setStatusPedido]=useState("");
  const [buscaCliente,setBuscaCliente]=useState("");
  const admin = usuario?.perfil === "ADMIN";
  useEffect(() => {
    if (!usuario) return;
    let active = true;
    Promise.all([request(admin ? "/admin/pedidos" : "/pedidos"), admin ? request("/admin/clientes") : Promise.resolve([])])
      .then(([orders, people]) => { if (active) { setPedidos(orders); setClientes(people); setError(""); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [usuario, admin, revision]);
  async function entrar(e) {
    e.preventDefault(); setBusy(true); setError("");
    const dados = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (cadastro) await request("/auth/registro", { method: "POST", body: dados });
      const user = await request("/auth/login", { method: "POST", body: dados });
      await session(); setLoading(true); onUsuario(user);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function sair() {
    setBusy(true);
    try { await logout(); onUsuario(null); fechar(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function perfil(e) {
    e.preventDefault();setBusy(true);setError("");
    const form=e.currentTarget;
    try {
      const updated=await request("/auth/perfil",{method:"PUT",body:Object.fromEntries(new FormData(form))});
      onUsuario(updated);form.reset();setTab("pedidos");
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function status(pedido, value) {
    if (value === "CANCELADO" && !window.confirm("Cancelar este pedido e devolver os itens ao estoque?")) return;
    setBusy(true); setError("");
    try {
      const updated = await request(admin ? "/admin/pedidos/" + pedido.id + "/status" : "/pedidos/" + pedido.id + "/cancelar",
        { method: "PATCH", ...(admin ? { body: { status: value } } : {}) });
      setPedidos(old => old.map(p => p.id === updated.id ? updated : p)); onChange();
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  const validos = pedidos.filter(p => p.status !== "CANCELADO");
  const pedidosVisiveis=pedidos.filter(p=>(!statusPedido || p.status===statusPedido) && `${p.id} ${p.clienteNome} ${p.clienteEmail}`.toLowerCase().includes(filtroPedido.trim().toLowerCase()));
  const clientesVisiveis=clientes.filter(c=>`${c.nome} ${c.email}`.toLowerCase().includes(buscaCliente.trim().toLowerCase()));
  async function cadastrarCliente(e) {
    e.preventDefault(); if(clienteLock.current) return;
    clienteLock.current=true;setClienteSalvando(true);setClienteErro("");
    try {
      const cliente=await request("/admin/clientes",{method:"POST",body:Object.fromEntries(new FormData(e.currentTarget))});
      setClientes(old=>[...old,cliente]);setNovoCliente(false);setClienteAviso("Cliente cadastrado. Ele já pode entrar com o e-mail e a senha inicial.");
    } catch(err) {setClienteErro(err.message);}
    finally {clienteLock.current=false;setClienteSalvando(false);}
  }
  return <Modal className={admin ? "adm-dashboard" : ""} title={usuario ? (admin ? "Administração BBS" : "Minha conta") : (cadastro ? "Criar conta" : "Entrar na BBS")} fechar={fechar}>
    {error && <p className="bbs-error" role="alert">{error}</p>}
    {!usuario ? <form className="bbs-form" onSubmit={entrar}>
      {cadastro && <label>Nome<input name="nome" required minLength={2} maxLength={100} autoComplete="name" /></label>}
      <label>E-mail<input name="email" type="email" required maxLength={150} autoComplete="username" /></label>
      <label>Senha<input name="senha" type="password" required minLength={cadastro ? 8 : 1} maxLength={64} autoComplete={cadastro ? "new-password" : "current-password"} /></label>
      <button className="bbs-primary" disabled={busy}>{busy ? "Aguarde…" : cadastro ? "Cadastrar e entrar" : "Entrar"}</button>
      <button type="button" disabled={busy} onClick={() => {setCadastro(!cadastro);setError("");}}>{cadastro ? "Já tenho conta" : "Quero criar uma conta"}</button>
      <p>Projeto acadêmico. Use dados fictícios para a apresentação.</p>
    </form> : <>
      <div className={admin ? "adm-layout" : "account-layout"}>
      <div className={admin ? "adm-sidebar" : "bbs-actions"}>
        {admin && <div className="adm-brand">BBS<span>PAINEL DE CONTROLE</span></div>}
        <div className="adm-user"><b>{usuario.nome}</b><small>{usuario.email}</small></div>
        <button aria-pressed={tab==="pedidos"} onClick={() => setTab("pedidos")}>{admin ? "Visão geral e pedidos" : "Meus pedidos"}</button>
        {admin && <><button aria-pressed={tab==="clientes"} onClick={() => setTab("clientes")}>Clientes e usuários</button><button onClick={abrirProdutos}>Gerenciar produtos ↗</button></>}
        <button aria-pressed={tab==="enderecos"} onClick={() => setTab("enderecos")}>Meus endereços</button>
        <button aria-pressed={tab==="perfil"} onClick={() => setTab("perfil")}>Editar perfil</button>
        {admin && <button onClick={fechar}>← Voltar à loja</button>}
        <button disabled={busy} onClick={sair}>Sair</button>
      </div>
      <div className={admin ? "adm-content" : "account-content"}>
      <div className="adm-page-heading"><div><small>{admin ? "ADMINISTRAÇÃO / " : "MINHA CONTA / "}{tab.toUpperCase()}</small><h2>{tab==="enderecos"?"Meus endereços":tab==="perfil"?"Seu perfil":tab==="clientes"?"Clientes e usuários":admin?"Visão geral":"Meus pedidos"}</h2></div><button disabled={busy || loading} onClick={() => {setLoading(true);setRevision(v => v+1);}}>↻ Atualizar</button></div>
      {tab === "enderecos" ? <Addresses/> : tab === "perfil" ? <form className="bbs-form" onSubmit={perfil}>
        <label>Nome<input name="nome" defaultValue={usuario.nome} required minLength={2} maxLength={100}/></label>
        <p>Preencha as duas senhas apenas se quiser alterar sua senha.</p>
        <label>Senha atual<input type="password" name="senhaAtual" autoComplete="current-password" maxLength={64}/></label>
        <label>Nova senha<input type="password" name="novaSenha" autoComplete="new-password" minLength={8} maxLength={64}/></label>
        <button disabled={busy}>Salvar perfil</button>
      </form> : loading ? <p role="status">Carregando registros…</p> : tab === "clientes" ? <><div className="feature-order-filters"><label>Buscar cliente<input type="search" value={buscaCliente} onChange={e=>setBuscaCliente(e.target.value)} placeholder="Nome ou e-mail"/></label></div><div className="bbs-table-wrap"><table className="bbs-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th></tr></thead><tbody>{clientesVisiveis.map(c => <tr key={c.id}><td>{c.nome}</td><td>{c.email}</td><td>{c.perfil}</td></tr>)}</tbody></table></div>{!clientesVisiveis.length && <p>Nenhum usuário encontrado.</p>}</> : <>
        {admin && <div className="bbs-stats"><div><b>{pedidos.length}</b><span>Pedidos registrados</span></div><div><b>{money(validos.reduce((s,p) => s+Number(p.total),0))}</b><span>Valor demonstrativo não cancelado</span></div><div><b>{clientes.filter(c => c.perfil === "CLIENTE").length}</b><span>Clientes</span></div></div>}
        <div className="adm-section-heading"><h3>Pedidos recentes</h3><span>{pedidosVisiveis.length} de {pedidos.length} registro(s)</span></div>
        <div className="feature-order-filters"><label>{admin?"Pedido, cliente ou e-mail":"Número do pedido"}<input type="search" value={filtroPedido} onChange={e=>setFiltroPedido(e.target.value)}/></label><label>Status<select value={statusPedido} onChange={e=>setStatusPedido(e.target.value)}><option value="">Todos</option>{Object.keys(steps).map(s=><option key={s}>{s}</option>)}</select></label></div>
        {!pedidosVisiveis.length && <p className="adm-empty">Nenhum pedido encontrado. Limpe os filtros ou finalize uma compra para vê-la aqui.</p>}
        {pedidosVisiveis.map(p => <article className="bbs-order" key={p.id}>
          <div className="bbs-actions"><h3>Pedido #{p.id}</h3><span className={`bbs-tag adm-status-${p.status.toLowerCase()}`}>{p.status}</span></div>
          <p>{new Date(p.criadoEm).toLocaleString("pt-BR")} · {admin ? p.clienteNome + " · " + p.clienteEmail : "Compra demonstrativa"}</p>
          <p>{p.endereco}</p>
          <ul>{p.itens.map(i => <li key={i.produtoId}>{i.quantidade}× {i.nome} — {money(i.preco * i.quantidade)}</li>)}</ul>
          <p>Frete: {money(p.frete)} · Desconto: {money(p.desconto)} · <strong>Total: {money(p.total)}</strong></p>
          <p>Modalidade: {p.pagamento}. Sem cobrança, boleto válido ou comprovação de pagamento.</p>
          <OrderHistory pedido={p}/>
          <div className="bbs-actions">{(admin ? steps[p.status] || [] : p.status === "RECEBIDO" ? ["CANCELADO"] : []).map(s => <button disabled={busy} key={s} onClick={() => status(p,s)}>{s === "CANCELADO" ? "Cancelar pedido" : "Marcar " + s.toLowerCase()}</button>)}</div>
        </article>)}
      </>}
      {admin && tab==="clientes" && <div className="adm-client-create"><button className="adm-primary" onClick={()=>{setClienteErro("");setNovoCliente(true);}}>+ Cadastrar cliente</button>{clienteAviso && <p className="adm-success" role="status">{clienteAviso}</p>}</div>}
      </div></div>
    </>}
    {admin && novoCliente && <Modal className="adm-editor" title="Cadastrar cliente" fechar={()=>{if(!clienteSalvando)setNovoCliente(false);}}>
      <p>Crie uma conta de cliente. Sua sessão de administrador permanece aberta.</p>
      {clienteErro && <p className="bbs-error" role="alert">{clienteErro}</p>}
      <form className="bbs-form" onSubmit={cadastrarCliente}>
        <label>Nome<input name="nome" minLength={2} maxLength={100} required autoComplete="off" disabled={clienteSalvando}/></label>
        <label>E-mail<input name="email" type="email" maxLength={150} required autoComplete="off" disabled={clienteSalvando}/></label>
        <label>Senha inicial<input name="senha" type="password" minLength={8} maxLength={64} required autoComplete="new-password" disabled={clienteSalvando}/></label>
        <p>O cliente pode alterar a senha em Minha conta. Use dados fictícios na demonstração.</p>
        <button className="adm-primary" disabled={clienteSalvando}>{clienteSalvando?"Cadastrando…":"Cadastrar cliente"}</button>
      </form>
    </Modal>}
  </Modal>;
}
