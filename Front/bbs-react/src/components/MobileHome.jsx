import ProductList from "./ProductList";
import { useCart } from "../context/CartContext";
import HardwareArt from "./HardwareArt";
import "./mobile.css";

export default function MobileHome({usuario,abrirConta,versao,favoritesOnly,onFavoritesOnly}) {
  const {totalQty,setIsOpen} = useCart();
  return <div className="mobile-shell">
    <header className="mobile-header"><a href="/mobile" aria-label="BBS mobile início">BBS<span>.</span></a><span>SEU SETUP NA MÃO</span><button onClick={abrirConta} aria-label="Abrir minha conta">{usuario?usuario.nome.slice(0,1).toUpperCase():"Entrar"}</button></header>
    <main id="home" className="sf-store mobile-screen">
      <section className="mobile-welcome"><small>{usuario?`Olá, ${usuario.nome.split(" ")[0]}!`:"BEM-VINDO À BBS"}</small><h1>Qual é o seu<br/><em>próximo upgrade?</em></h1><p>Explore, escolha e monte seu setup.</p><div className="mobile-hero-art"><HardwareArt tipo="gpu"/></div><a href="#produtos">Explorar catálogo ↗</a></section>
      <p className="mobile-demo">Loja acadêmica · Sem pagamentos ou entregas reais</p>
      <ProductList versao={versao} usuario={usuario} abrirConta={abrirConta} favoritesOnly={favoritesOnly} onFavoritesOnly={onFavoritesOnly}/>
      <section className="mobile-account-card"><h2>Seu pedido está aqui.</h2><p>Entre na sua conta para acompanhar os pedidos e atualizar seu perfil.</p><button onClick={abrirConta}>Abrir minha conta →</button></section>
      <a className="mobile-desktop-link" href="/">Abrir versão desktop ↗</a>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
      <a href="#home"><span aria-hidden="true">⌂</span>Início</a>
      <a href="#produtos" onClick={()=>onFavoritesOnly(false)}><span aria-hidden="true">▦</span>Catálogo</a>
      <a href="#produtos" onClick={()=>onFavoritesOnly(true)}><span aria-hidden="true">♡</span>Favoritos</a>
      <button onClick={()=>setIsOpen(true)} aria-label={`Abrir carrinho com ${totalQty} itens`}><span aria-hidden="true">▤<b>{totalQty}</b></span>Carrinho</button>
      <button onClick={abrirConta}><span aria-hidden="true">◎</span>Conta</button>
    </nav>
  </div>;
}
