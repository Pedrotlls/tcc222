import { useCart } from "../context/CartContext";
export default function Header({ abrirConta, usuario, abrirFavoritos }) {
  const {totalQty,setIsOpen} = useCart();
  return <header className="bbs-header">
    <a className="sf-brand" href="#home" aria-label="BBS início"><span className="bbs-logo">BBS<span>.</span></span><small>BITS BYTES STORE</small></a>
    <nav aria-label="Navegação principal"><a href="#home">Início</a><a href="#produtos">Produtos</a><a href="/mobile">Mobile</a><button className="sf-favorites-button" onClick={abrirFavoritos}>♡ Favoritos</button>
      <button className="sf-account-button" onClick={abrirConta}>{usuario?.perfil === "ADMIN" ? "Administração" : usuario ? "Minha conta" : "Entrar / Cadastrar"}</button>
      <button className="sf-cart-button" onClick={() => setIsOpen(true)} aria-label={`Carrinho (${totalQty})`}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 3h3l3 13h11l3-10H6M9 20h.01M18 20h.01" strokeLinecap="round"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>Carrinho <span>{totalQty}</span></button>
    </nav>
  </header>;
}
