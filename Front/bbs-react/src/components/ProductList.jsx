import { useState, useEffect } from "react";
import { listarProdutosAtivos } from "../services/produtosService";
import { useCart } from "../context/CartContext";
import Modal from "./Modal";
const cats = {gpu:"Placas de vídeo",cpu:"Processadores",ram:"Memória RAM",ssd:"SSDs",mae:"Placas-mãe",fonte:"Fontes",cooler:"Coolers",gabinete:"Gabinetes",monitor:"Monitores",mouse:"Mouses",teclado:"Teclados",mousepad:"Mousepads",headset:"Headsets"};
const money = v => Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function ProductImage({p}) {
  const [failed, setFailed] = useState(false);
  return !p.imgUrl || failed ? <div className="bbs-product-fallback" role="img" aria-label={p.nome}>BBS<span>{cats[p.tipo] || "Hardware"}</span></div> :
    <img src={p.imgUrl} alt={p.nome} loading="lazy" onError={() => setFailed(true)} />;
}
export default function ProductList({ versao }) {
  const {addToCart,cart} = useCart();
  const [produtos,setProdutos] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [busca,setBusca] = useState("");
  const [categoria,setCategoria] = useState("");
  const [ordem,setOrdem] = useState("nome");
  const [selected,setSelected] = useState(null);
  useEffect(() => {
    let active = true;
    listarProdutosAtivos().then(data => {if(active){setProdutos(data);setError("");}})
      .catch(e => {if(active) setError(e.message);})
      .finally(() => {if(active) setLoading(false);});
    return () => {active=false;};
  },[versao,retry]);
  const filtered=produtos.filter(p => (!categoria || p.tipo === categoria) &&
    (p.nome+" "+(p.descricao||"")).toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a,b) => ordem === "preco" ? a.preco-b.preco : ordem === "maior" ? b.preco-a.preco : a.nome.localeCompare(b.nome));
  function comprar(p) { addToCart(p.id,p.nome,Number(p.preco),p.imgUrl || "",p.estoque);setSelected(null); }
  function indisponivel(p) { return !p.ativo || p.estoque <= (cart[p.id]?.qty || 0); }
  return <section id="produtos" aria-label="Catálogo">
    <div className="bbs-filters">
      <label>Buscar produto<input type="search" placeholder="Nome ou descrição" value={busca} onChange={e => setBusca(e.target.value)}/></label>
      <label>Categoria<select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{[...new Set(produtos.map(p => p.tipo).filter(Boolean))].map(c => <option key={c} value={c}>{cats[c]||c}</option>)}</select></label>
      <label>Ordenar<select value={ordem} onChange={e => setOrdem(e.target.value)}><option value="nome">Nome A–Z</option><option value="preco">Menor preço</option><option value="maior">Maior preço</option></select></label>
    </div>
    {loading ? <p className="bbs-info" role="status">Carregando catálogo…</p> : error ? <div className="bbs-info"><p className="bbs-error" role="alert">{error}</p><button onClick={() => {setLoading(true);setRetry(v => v+1);}}>Tentar novamente</button></div> : <>
      <p className="bbs-result-count">{filtered.length} produto(s) encontrado(s)</p>
      {!filtered.length && <p className="bbs-info">Nenhum produto corresponde aos filtros. Tente outra busca.</p>}
      <div className="bbs-product-grid">{filtered.map(p => <article className="bbs-product" key={p.id}>
        <button className="bbs-product-image" onClick={() => setSelected(p)} aria-label={"Ver detalhes de "+p.nome}><ProductImage key={p.imgUrl} p={p}/></button>
        <span className="bbs-product-category">{cats[p.tipo]||p.tipo||"Hardware"}</span>
        <h3>{p.nome}</h3><p>{(p.descricao||"").slice(0,100)}</p><strong>{money(p.preco)}</strong>
        <span>{p.estoque>0 ? p.estoque+" em estoque" : "Indisponível"}</span>
        <button className="bbs-buy" disabled={indisponivel(p)} onClick={() => comprar(p)}>{indisponivel(p) ? "Limite de estoque" : "Adicionar ao carrinho"}</button>
        <button className="bbs-details" onClick={() => setSelected(p)}>Ver detalhes</button>
      </article>)}</div>
    </>}
    {selected && <Modal title={selected.nome} fechar={() => setSelected(null)}><div className="bbs-detail-image"><ProductImage p={selected}/></div><p>{selected.descricao||"Sem descrição adicional."}</p><p>Categoria: {cats[selected.tipo]||selected.tipo||"Hardware"} · Estoque: {selected.estoque}</p><h3>{money(selected.preco)}</h3><button className="bbs-primary" disabled={indisponivel(selected)} onClick={() => comprar(selected)}>Adicionar ao carrinho</button></Modal>}
  </section>;
}
