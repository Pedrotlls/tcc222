import { createPortal } from "react-dom";
import { useCart } from "../context/CartContext";
import { checkCompatibility } from "../utils/compatibility";
import "./cart-mobile.css";

const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Cart({ abrirCheckout, mobile = false }) {
  const {
    cart, cartOrder, changeQty, subtotal, isOpen, setIsOpen,
    syncError, syncBusy, reload,
  } = useCart();

  if (!isOpen) return null;

  const items = cartOrder.map(id => ({ id, item: cart[id] })).filter(row => row.item);
  const warnings = checkCompatibility(items.map(row => row.item));
  const finalizar = () => {
    if (!items.length || syncBusy) return;
    setIsOpen(false);
    abrirCheckout();
  };

  const conteudo = <>
    <div className={mobile ? "mobile-cart-backdrop" : "cart-backdrop"} onClick={() => setIsOpen(false)} aria-hidden="true" />
    <aside id="cart-sidebar" className={`cart-drawer ${mobile ? "cart-drawer-mobile" : ""}`} role="dialog" aria-modal="true" aria-label="Meu carrinho">
      <header className="cart-header">
        <div><span className="cart-kicker">BITS BYTES STORE</span><h2>Meu carrinho <small>({items.reduce((n, row) => n + row.item.qty, 0)} itens)</small></h2></div>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Fechar carrinho">×</button>
      </header>

      {syncError && <div className="cart-sync-error" role="alert"><span>{syncError}</span><button type="button" onClick={reload}>Tentar novamente</button></div>}
      {syncBusy && <p className="cart-sync-status" role="status">Atualizando seu carrinho…</p>}

      <div className="cart-drawer-content">
        {warnings.length > 0 && <section className="cart-compatibility" aria-label="Compatibilidade do setup">
          <strong>Verificação do setup</strong>
          {warnings.map((warning, i) => <p key={i} className={warning.level}>{warning.title}: {warning.detail}</p>)}
          <small>Confira as especificações do fabricante antes da compra.</small>
        </section>}

        {items.length === 0 ? <div className="cart-empty">
          <span aria-hidden="true">🛒</span><h3>Seu carrinho está vazio</h3>
          <p>Explore o catálogo e adicione os produtos que deseja.</p>
          <button type="button" onClick={() => setIsOpen(false)}>Continuar comprando</button>
        </div> : <div className="cart-items-list" id="cart-items">
          {items.map(({ id, item }) => <article className="cart-item" key={id}>
            {item.img ? <img src={item.img} alt="" onError={e => { e.currentTarget.style.visibility = "hidden"; }} /> : <span className="cart-item-placeholder">BBS</span>}
            <div className="cart-item-info">
              <strong>{item.name}</strong>
              <span>{money(item.price)} / un.</span>
              <b>{money(item.price * item.qty)}</b>
            </div>
            <div className="cart-qty-controls" aria-label={`Quantidade de ${item.name}`}>
              <button type="button" className="cart-qty-btn" aria-label={`Diminuir ${item.name}`} disabled={syncBusy} onClick={() => changeQty(id, -1)}>−</button>
              <output aria-live="polite">{item.qty}</output>
              <button type="button" className="cart-qty-btn cart-qty-add" aria-label={`Adicionar ${item.name}`} disabled={syncBusy || item.qty >= (item.max ?? 99)} onClick={() => changeQty(id, 1)}>+</button>
              <button type="button" className="cart-qty-remove" disabled={syncBusy} onClick={() => changeQty(id, -item.qty)}>Remover</button>
            </div>
          </article>)}
        </div>}
      </div>

      <footer className="cart-drawer-footer">
        <p>O frete e os descontos serão calculados na próxima etapa.</p>
        <div className="cart-subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
        <button type="button" className="cart-checkout-button" disabled={!items.length || syncBusy} onClick={finalizar}>
          {syncBusy ? "Sincronizando…" : "Continuar para entrega"}
        </button>
        <small>Ambiente demonstrativo · Nenhum pagamento real</small>
      </footer>
    </aside>
  </>;

  // A experiência mobile usa um portal direto no body: evita que transforms,
  // overflow ou stacking contexts da moldura do telefone cortem o carrinho.
  return mobile ? createPortal(<div className="mobile-cart-layer">{conteudo}</div>, document.body) : conteudo;
}
