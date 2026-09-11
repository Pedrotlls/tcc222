import { useEffect, useState } from "react";
import Header from "./components/Header";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import AdminPage from "./components/AdminPage";
import Checkout from "./components/Checkout";
import Account from "./components/Account";
import { session } from "./services/api";
import "./commerce.css";

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [screen, setScreen] = useState(null);
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState("");
  const changed = () => setVersao(v => v + 1);
  useEffect(() => {
    let active = true;
    session().then(data => {if(active) setUsuario(data.usuario);}).catch(() => {if(active) setAviso("API indisponível. Inicie o backend para acessar a loja.");});
    const expired = () => {setUsuario(null);setScreen("conta");setAviso("Sua sessão expirou. Entre novamente.");};
    window.addEventListener("bbs-session-expired", expired);
    return () => {active=false;window.removeEventListener("bbs-session-expired",expired);};
  }, []);
  function checkout() {
    if(!usuario) {setAviso("Entre ou crie uma conta. Seu carrinho será mantido.");setScreen("conta");}
    else setScreen("checkout");
  }
  return <>
    <Header abrirConta={() => setScreen("conta")} usuario={usuario} />
    <main id="home">
      <div className="bbs-intro"><span>Bits Bytes Store</span><h1>Seu próximo upgrade começa aqui.</h1><p>Hardware, periféricos e componentes para montar o seu setup.</p><small>Loja demonstrativa do TCC · Sem vendas ou pagamentos reais</small></div>
      {aviso && <div className="bbs-notice" role="status">{aviso}<button onClick={() => setAviso("")}>Fechar aviso</button></div>}
      <ProductList versao={versao} />
      <section id="sobre" className="bbs-info"><h2>Sobre a BBS</h2><p>A Bits Bytes Store é um projeto acadêmico de e-commerce de hardware, com catálogo, carrinho, gestão de produtos e acompanhamento de pedidos.</p></section>
      <section id="contato" className="bbs-info"><h2>Atendimento demonstrativo</h2><p>Acompanhe seu pedido e solicite o cancelamento pela área Minha conta. O projeto não possui atendimento comercial, entrega real ou envio de e-mails.</p><button onClick={() => setScreen("conta")}>Abrir minha conta</button></section>
    </main>
    <footer className="bbs-info">BBS · Projeto de conclusão de curso · 2026</footer>
    <Cart abrirCheckout={checkout} />
    {screen === "conta" && <Account usuario={usuario} onUsuario={u => {setUsuario(u);setAviso("");}} fechar={() => setScreen(null)} abrirProdutos={() => setScreen("admin")} onChange={changed} />}
    {screen === "checkout" && usuario && <Checkout fechar={() => setScreen(null)} onComplete={changed}/>}
    {screen === "admin" && usuario?.perfil === "ADMIN" && <AdminPage fechar={() => {changed();setScreen("conta");}} onProdutoSalvo={changed} />}
  </>;
}
