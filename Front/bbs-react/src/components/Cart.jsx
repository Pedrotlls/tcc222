// ============================================================
//  Cart.jsx  —  Sidebar do carrinho de compras
//  Painel lateral que desliza da direita com os itens do carrinho,
//  subtotal e botão de finalizar pedido.
// ============================================================

import { useCart } from "../context/CartContext";

export default function Cart({ abrirCheckout }) {
  // Cart.jsx: Sidebar do carrinho (version principal)
  // - Mostra itens do carrinho (via CartContext)
  // - Mostra o subtotal; o frete é cotado no checkout
  // - Ao finalizar, chama abrirCheckout() para abrir o fluxo de compra.
  // Dados e funções do contexto global do carrinho
  const {
    cart,           // Objeto com todos os itens { [id]: { name, price, img, qty } }
    cartOrder,      // Array de IDs na ordem de inserção
    changeQty,      // Função para incrementar/decrementar quantidade
    subtotal,       // Total dos produtos; frete ainda não cotado
    isOpen,         // Sidebar visível (true) ou oculta (false)
    setIsOpen,
  } = useCart();

  return (
    <>
      {/* Overlay escuro atrás da sidebar: clicar aqui fecha o carrinho.
          Só renderizado quando isOpen é true. */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.6)", // fundo semitransparente escuro
            zIndex: 3999,
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────
          cart-sidebar → classe CSS do index.css que controla a
          animação de slide (translateX). A classe "open" ativa a
          transição de fora para dentro da tela. */}
      <aside id="cart-sidebar" className={isOpen ? "open" : ""}>

        {/* Cabeçalho da sidebar com título e botão fechar (×) */}
        <div className="cart-header">
          <h2>Meu Setup</h2>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none", border: "none", color: "white",
              fontSize: "2.5rem", cursor: "pointer", lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* ── Lista de itens ──────────────────────────────────
            Scroll vertical independente para não travar o footer */}
        <div className="cart-items-list" id="cart-items">
          {cartOrder.length === 0 ? (
            // Mensagem quando o carrinho está vazio
            <p style={{ color: "#888", padding: "20px", textAlign: "center" }}>
              Carrinho vazio
            </p>
          ) : (
            cartOrder.map(id => {
              const item = cart[id];
              if (!item) return null;
              return (
                <div key={id} className="cart-item">
                  {/* Miniatura do produto */}
                  {item.img && <img src={item.img} alt={item.name} width={60} onError={e => {e.currentTarget.style.display="none";}} />}

                  {/* Nome e preço */}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: "bold" }}>{item.name}</p>
                    <p style={{ margin: 0, color: "#ff416c" }}>
                      {item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>

                  {/* Controles de quantidade: -, contador, +, lixeira */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button aria-label={"Diminuir " + item.name} onClick={() => changeQty(id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button aria-label={"Aumentar " + item.name} disabled={item.qty >= (item.max ?? 99)} onClick={() => changeQty(id, +1)}>+</button>
                    {/* Remove o item inteiro decrementando toda a quantidade */}
                    <button aria-label={"Remover " + item.name} onClick={() => changeQty(id, -item.qty)}>🗑</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer: frete + total + botão finalizar ─────────
            Fundo escuro levemente translúcido, separado por borda superior */}
        <div
          className="cart-footer"
          style={{
            padding: "30px",
            borderTop: "1px solid var(--glass-border)",
            background: "rgba(0,0,0,0.3)", // camada escura sobre o fundo
          }}
        >
          <p style={{ color: "#bbb", lineHeight: 1.6 }}>
            O frete será calculado no checkout conforme CEP/UF, quantidade,
            valor do carrinho e modalidade.
          </p>

          {/* Total em destaque (fonte maior, negrito) */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontWeight: "700", fontSize: "1.4rem", marginBottom: "20px",
          }}>
            <span>Subtotal:</span>
            <span>{subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>

          {/* Botão Finalizar Pedido: fecha a sidebar e abre o Checkout.
              btn-buy → classe CSS do index.css com gradiente e hover animado. */}
          <button
            className="btn-buy"
            onClick={() => {
              if (cartOrder.length === 0) {
                alert("Adicione produtos ao carrinho!");
                return;
              }
              setIsOpen(false);   // fecha a sidebar
              abrirCheckout();    // chama a função recebida via props para abrir o Checkout
            }}
            style={{
              width: "100%", padding: "20px", borderRadius: "12px",
              fontSize: "1.1rem", fontWeight: "bold", cursor: "pointer", border: "none",
            }}
          >
            Finalizar Pedido
          </button>
        </div>
      </aside>
    </>
  );
}
