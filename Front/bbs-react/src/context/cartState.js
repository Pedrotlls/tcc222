// Carrinho e um rascunho local; precos/estoque finais sao sempre validados na API.
export function cartReducer(cart, action) {
  if(action.type === "clear") return {};
  const id = String(action.id);
  if(action.type === "add") {
    const max = Math.max(0,Math.min(99,Number(action.stock ?? 99)));
    const qty = Math.min(max,(cart[id]?.qty || 0) + 1);
    if(qty < 1) return cart;
    return {...cart,[id]:{name:action.name,price:action.price,img:action.img,qty,max}};
  }
  if(action.type === "qty" && cart[id]) {
    const qty=Math.min(cart[id].max ?? 99,cart[id].qty + action.delta);
    if(qty <= 0) {const next={...cart};delete next[id];return next;}
    return {...cart,[id]:{...cart[id],qty}};
  }
  return cart;
}
export function readCart() {
  try {
    const draft=JSON.parse(localStorage.getItem("bbs_cart_draft") || "{}");
    if(!draft || typeof draft !== "object" || Array.isArray(draft)) return {};
    return Object.fromEntries(Object.entries(draft).filter(([id,p]) => /^\d+$/.test(id) && p &&
      typeof p.name === "string" && Number.isFinite(p.price) && p.price >= 0 &&
      Number.isInteger(p.qty) && p.qty > 0 && p.qty <= 99));
  } catch {return {};}
}
