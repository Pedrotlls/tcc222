import { createContext, useContext, useReducer, useState, useEffect, useCallback, useRef } from "react";
import { cartReducer, readCart } from "./cartState";
import { request, session } from "../services/api";
const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [cart,dispatch]=useReducer(cartReducer,undefined,readCart);
  const cartRef=useRef(cart);
  const owner=useRef(undefined);
  const epoch=useRef(0);
  const version=useRef(-1);
  const pending=useRef(Promise.resolve());
  const [usuarioId,setUsuarioId]=useState(null);
  const [syncError,setSyncError]=useState("");
  const [syncBusy,setSyncBusy]=useState(false);
  const [freteGlobal,setFreteGlobal]=useState(0);
  const [freteInfo,setFreteInfo]=useState("");
  const [isOpen,setIsOpen]=useState(false);
  useEffect(() => {
    cartRef.current=cart;
    // Apenas o carrinho de visitante é armazenado neste navegador.
    if(!owner.current)try {localStorage.setItem("bbs_cart_draft",JSON.stringify(cart));} catch { /* Modo privado. */ }
  },[cart]);
  const receive=useCallback((data,generation)=>{
    if(generation!==epoch.current || data.versao<version.current)return;
    version.current=data.versao;dispatch({type:"replace",cart:data.itens});setSyncError("");
  },[]);
  const sincronizarUsuario=useCallback(id=>{
    if(owner.current===id)return;
    const anterior=owner.current;owner.current=id;setUsuarioId(id);const generation=++epoch.current;version.current=-1;
    if(!id){setSyncBusy(false);setSyncError("");if(anterior){dispatch({type:"clear"});try{localStorage.removeItem("bbs_cart_draft");}catch{/* Modo privado. */}}return;}
    const draft=anterior?{}:cartRef.current;
    setSyncBusy(true);
    const bootstrap=(async()=>{
      if(Object.keys(draft).length){
        try {
          const data=await request("/carrinho/importar",{method:"POST",body:Object.entries(draft).map(([produtoId,p])=>({produtoId:Number(produtoId),quantidade:p.qty}))});
          receive(data,generation);if(generation===epoch.current)localStorage.removeItem("bbs_cart_draft");
        } catch(e) {
          receive(await request("/carrinho"),generation);
          if(generation===epoch.current)setSyncError(e.message+" Seu rascunho de visitante foi preservado neste navegador.");
        }
      } else receive(await request("/carrinho"),generation);
    })().catch(e=>{if(generation===epoch.current)setSyncError(e.message);})
      .finally(()=>{if(generation===epoch.current && pending.current===bootstrap)setSyncBusy(false);});
    pending.current=bootstrap;
  },[receive]);
  const reload=useCallback(async()=>{
    const generation=epoch.current;await pending.current;
    if(!owner.current || generation!==epoch.current)return;
    try{receive(await request("/carrinho"),generation);}catch(e){if(generation===epoch.current)setSyncError(e.message);}
  },[receive]);
  useEffect(()=>{
    if(!usuarioId)return;
    let stream,closed=false;
    const open=async()=>{
      try{
        const data=await session();if(closed || !data.usuario)return;
        stream=new EventSource((import.meta.env?.VITE_API_BASE || "/api")+"/carrinho/eventos",{withCredentials:true});
        stream.addEventListener("carrinho",reload);
      }catch{/* A consulta periódica mantém recuperação da conexão. */}
    };
    open();const timer=setInterval(reload,10000);window.addEventListener("focus",reload);
    return ()=>{closed=true;stream?.close();clearInterval(timer);window.removeEventListener("focus",reload);};
  },[usuarioId,reload]);
  const change=useCallback((id,delta)=>{
    const generation=epoch.current;setSyncBusy(true);
    const job=pending.current.then(async()=>{
      if(generation!==epoch.current)return;
      receive(await request("/carrinho",{method:"PATCH",body:{produtoId:Number(id),delta}}),generation);
    }).catch(e=>{if(generation===epoch.current)setSyncError(e.message);})
      .finally(()=>{if(generation===epoch.current && pending.current===job)setSyncBusy(false);});
    pending.current=job;
  },[receive]);
  const addToCart=useCallback((id,name,price,img,stock) => {
    if(owner.current)change(id,1);else dispatch({type:"add",id,name,price,img,stock});setIsOpen(true);
  },[change]);
  const changeQty=useCallback((id,delta) => {if(owner.current)change(id,delta);else dispatch({type:"qty",id,delta});},[change]);
  const limparCarrinho=useCallback(() => {dispatch({type:"clear"});setFreteGlobal(0);setFreteInfo("");setIsOpen(false);try{localStorage.setItem("bbs_cart_draft","{}");}catch{/* Modo privado. */}if(owner.current)reload();},[reload]);
  const cartOrder=Object.keys(cart);
  const totalQty=cartOrder.reduce((n,id) => n+cart[id].qty,0);
  const subtotal=cartOrder.reduce((n,id) => n+cart[id].qty*cart[id].price,0);
  return <CartContext.Provider value={{cart,cartOrder,totalQty,subtotal,total:subtotal+freteGlobal,freteGlobal,setFreteGlobal,freteInfo,setFreteInfo,isOpen,setIsOpen,addToCart,changeQty,limparCarrinho,sincronizarUsuario,syncError,syncBusy,reload}}>{children}</CartContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useCart(){return useContext(CartContext);}
