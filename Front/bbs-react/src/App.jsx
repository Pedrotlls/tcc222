import { useEffect, useState } from "react";
import Header from "./components/Header";
import ProductList from "./components/ProductList";
import Cart from "./components/Cart";
import AdminPage from "./components/AdminPage";
import Checkout from "./components/Checkout";
import Account from "./components/Account";
import { session } from "./services/api";
import "./commerce.css";
import "./storefront.css";
import HardwareArt from "./components/HardwareArt";
import MobileHome from "./components/MobileHome";

export default function App() {
  const mobile = window.location.pathname.replace(/\/$/, "") === "/mobile";
  const [usuario, setUsuario] = useState(null);
  const [retomarCompra,setRetomarCompra] = useState(false);
  const [screen, setScreen] = useState(null);
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState("");
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const changed = () => setVersao(v => v + 1);
  useEffect(() => {
    let active = true;
    session().then(data => {if(active) setUsuario(data.usuario);}).catch(() => {if(active) setAviso("API indisponível. Inicie o backend para acessar a loja.");});
    const expired = () => {setUsuario(null);setScreen("conta");setAviso("Sua sessão expirou. Entre novamente.");};
    window.addEventListener("bbs-session-expired", expired);
    return () => {active=false;window.removeEventListener("bbs-session-expired",expired);};
  }, []);
  function checkout() {
    if(!usuario) {setRetomarCompra(true);setAviso("Entre ou crie uma conta. Seu carrinho será mantido.");setScreen("conta");}
    else setScreen("checkout");
  }
  return <>
    {!mobile && <Header abrirConta={() => setScreen("conta")} usuario={usuario} abrirFavoritos={()=>{setFavoritesOnly(true);document.getElementById("produtos")?.scrollIntoView();}} />}
    {aviso && mobile && <div className="bbs-notice" role="status">{aviso}<button onClick={()=>setAviso("")}>Fechar aviso</button></div>}
    {mobile ? <MobileHome usuario={usuario} abrirConta={()=>setScreen("conta")} versao={versao} favoritesOnly={favoritesOnly} onFavoritesOnly={setFavoritesOnly}/> : <>
    <main id="home" className="sf-store">
      <section className="sf-hero" aria-labelledby="sf-title">
        <div className="sf-hero-copy"><span className="sf-eyebrow"><i/> BITS BYTES STORE · HARDWARE & PERFORMANCE</span><h1 id="sf-title">Seu setup.<br/>Seu próximo <em>nível.</em></h1><p>Mais desempenho para jogar, criar e ir além.<br/>Encontre as peças para montar um setup com a sua cara.</p><div className="sf-hero-actions"><a className="sf-cta" href="#produtos">Explorar produtos <span>↗</span></a><a className="sf-secondary" href="#sobre">Conheça a BBS →</a></div><small>Projeto acadêmico · Sem vendas ou pagamentos reais</small></div>
        <div className="sf-hero-art"><div className="sf-orbit sf-orbit-one"/><div className="sf-orbit sf-orbit-two"/><span className="sf-art-kicker">BUILD YOUR NEXT LEVEL</span><div className="sf-hero-hardware"><HardwareArt tipo="gpu"/></div><div className="sf-art-caption"><span>01 / GRAPHICS</span><span>Ilustração conceitual</span></div><div className="sf-hero-chip"><span>CPU · GPU · RAM</span><strong>O upgrade começa com você.</strong></div></div>
      </section>
      <div className="sf-feature-strip"><div><span>01</span><p><b>Monte do seu jeito</b><small>Componentes e periféricos em um só lugar</small></p></div><div><span>02</span><p><b>Frete por destino</b><small>Estimativa por UF no checkout</small></p></div><div><span>03</span><p><b>Seu pedido, na sua conta</b><small>Consulte o histórico e acompanhe o status</small></p></div></div>
      {aviso && <div className="bbs-notice" role="status">{aviso}<button onClick={() => setAviso("")}>Fechar aviso</button></div>}
      <ProductList versao={versao} usuario={usuario} abrirConta={()=>setScreen("conta")} favoritesOnly={favoritesOnly} onFavoritesOnly={setFavoritesOnly}/>
      <section id="sobre" className="sf-about"><div><span className="sf-eyebrow">FEITA POR QUEM CURTE TECNOLOGIA</span><h2>Não é só hardware.<br/>É o seu próximo projeto.</h2></div><div><p>A Bits Bytes Store nasceu como um projeto de TCC para conectar tecnologia e experiência de compra: do catálogo ao acompanhamento do pedido.</p><p>Uma loja demonstrativa, com cadastro, estoque e pedidos integrados ao SQL Server. Sem vendas, cobranças ou entregas reais.</p><a href="#produtos">Conheça o catálogo ↗</a></div></section>
      <section id="contato" className="sf-contact"><div><span className="sf-eyebrow">TUDO SOB CONTROLE</span><h2>E o seu pedido?</h2><p>Veja seus pedidos e gerencie seu perfil em Minha conta.</p></div><button onClick={() => setScreen("conta")}>Abrir minha conta ↗</button></section>
    </main>
    <footer className="sf-footer"><a href="#home" className="sf-footer-logo">BBS.</a><span>Bits Bytes Store · TCC 2026</span><small>Ambiente demonstrativo · Nenhum pagamento real</small><a href="#home">Voltar ao topo ↑</a></footer>
    </>}
    <Cart abrirCheckout={checkout} />
    {screen === "conta" && <Account usuario={usuario} onUsuario={u => {setUsuario(u);setAviso("");if(u && retomarCompra){setRetomarCompra(false);setScreen("checkout");}}} fechar={() => {setScreen(null);setRetomarCompra(false);}} abrirProdutos={() => setScreen("admin")} onChange={changed} />}
    {screen === "checkout" && usuario && <Checkout fechar={() => setScreen(null)} onComplete={changed}/>}
    {screen === "admin" && usuario?.perfil === "ADMIN" && <AdminPage fechar={() => {changed();setScreen("conta");}} onProdutoSalvo={changed} />}
  </>;
}
