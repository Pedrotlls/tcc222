import { useCart } from "../context/CartContext";
export default function Header({ abrirConta, usuario }) {
  const {totalQty,setIsOpen} = useCart();
  return <header className="bbs-header">
    <a className="bbs-logo" href="#home" aria-label="BBS início">BBS</a>
    <nav aria-label="Navegação principal"><a href="#produtos">Produtos</a><a href="#sobre">Sobre</a>
      <button onClick={abrirConta}>{usuario?.perfil === "ADMIN" ? "Administração" : usuario ? "Minha conta" : "Entrar / Cadastrar"}</button>
      <button onClick={() => setIsOpen(true)}>Carrinho ({totalQty})</button>
    </nav>
  </header>;
}
