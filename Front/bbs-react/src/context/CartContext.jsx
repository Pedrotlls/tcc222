import { createContext, useContext, useReducer, useState, useEffect, useCallback } from "react";
import { cartReducer, readCart } from "./cartState";
const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [cart,dispatch]=useReducer(cartReducer,undefined,readCart);
  const [freteGlobal,setFreteGlobal]=useState(0);
  const [freteInfo,setFreteInfo]=useState("");
  const [isOpen,setIsOpen]=useState(false);
  useEffect(() => {
    try {localStorage.setItem("bbs_cart_draft",JSON.stringify(cart));} catch { /* Navegacao privada pode impedir salvar o rascunho. */ }
  },[cart]);
  const addToCart=useCallback((id,name,price,img,stock) => {
    dispatch({type:"add",id,name,price,img,stock});setIsOpen(true);
  },[]);
  const changeQty=useCallback((id,delta) => dispatch({type:"qty",id,delta}),[]);
  const limparCarrinho=useCallback(() => {dispatch({type:"clear"});setFreteGlobal(0);setFreteInfo("");setIsOpen(false);},[]);
  const cartOrder=Object.keys(cart);
  const totalQty=cartOrder.reduce((n,id) => n+cart[id].qty,0);
  const subtotal=cartOrder.reduce((n,id) => n+cart[id].qty*cart[id].price,0);
  return <CartContext.Provider value={{cart,cartOrder,totalQty,subtotal,total:subtotal+freteGlobal,freteGlobal,setFreteGlobal,freteInfo,setFreteInfo,isOpen,setIsOpen,addToCart,changeQty,limparCarrinho}}>{children}</CartContext.Provider>;
}
// Mantem o contrato de importacao dos componentes existentes; esse modulo compartilha o hook e o provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useCart(){return useContext(CartContext);}
