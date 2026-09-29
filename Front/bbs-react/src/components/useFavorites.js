import {useEffect,useRef,useState} from "react";
import {request} from "../services/api";

export default function useFavorites(usuario,abrirConta) {
  const userId=usuario?.id;
  const [snapshot,setSnapshot]=useState({owner:null,items:[],error:""});
  const [revision,setRevision]=useState(0);
  const [pending,setPending]=useState(null);
  const lock=useRef(false);
  useEffect(()=>{
    if(!userId) return;
    let active=true;
    request("/favoritos").then(items=>{if(active)setSnapshot({owner:userId,items,error:""});})
      .catch(e=>{if(active)setSnapshot({owner:userId,items:[],error:e.message});});
    return ()=>{active=false;};
  },[userId,revision]);
  const items=snapshot.owner===userId?snapshot.items:[];
  const error=snapshot.owner===userId?snapshot.error:"";
  const loading=Boolean(userId && snapshot.owner!==userId);
  async function toggle(p) {
    if(!userId) {abrirConta();return;}
    if(lock.current || loading || error) return;
    lock.current=true;setPending(p.id);
    const saved=items.some(item=>item.id===p.id);
    try {
      const next=await request(`/favoritos/${p.id}`,{method:saved?"DELETE":"PUT"});
      setSnapshot({owner:userId,items:next,error:""});
    } catch(e) {setSnapshot({owner:userId,items,error:e.message});}
    finally {lock.current=false;setPending(null);}
  }
  return {items,error,loading,pending,toggle,retry:()=>setRevision(n=>n+1)};
}
