import { useState, useEffect } from "react";
import { listarProdutosAtivos } from "../services/produtosService";
import { useCart } from "../context/CartContext";
import Modal from "./Modal";
import HardwareArt from "./HardwareArt";
import { categories, catalogView } from "./catalogView";
import useFavorites from "./useFavorites";
import {toggleComparison} from "../utils/comparison";
import "./features.css";
const cats = Object.fromEntries(Object.entries(categories).map(([id,c])=>[id,c.name]));
const money = v => Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function ProductImage({p}) {
  const [failed, setFailed] = useState(false);
  return !p.imgUrl || failed ? <div className="sf-product-art" role="img" aria-label={`Ilustração de ${cats[p.tipo] || "hardware"}; foto do produto não cadastrada`}><HardwareArt tipo={p.tipo}/><span>Ilustração da categoria</span></div> :
    <img src={p.imgUrl} alt={p.nome} loading="lazy" onError={() => setFailed(true)} />;
}
export default function ProductList({ versao, usuario, abrirConta, favoritesOnly=false, onFavoritesOnly=()=>{} }) {
  const {addToCart,cart} = useCart();
  const [produtos,setProdutos] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [retry,setRetry] = useState(0);
  const [busca,setBusca] = useState("");
  const [categoria,setCategoria] = useState("");
  const [ordem,setOrdem] = useState("nome");
  const [selected,setSelected] = useState(null);
  const favorites=useFavorites(usuario,abrirConta);
  const [compareIds,setCompareIds]=useState([]);
  const [comparing,setComparing]=useState(false);
  useEffect(() => {
    let active = true;
    listarProdutosAtivos().then(data => {if(active){setProdutos(data);setError("");}})
      .catch(e => {if(active) setError(e.message);})
      .finally(() => {if(active) setLoading(false);});
    return () => {active=false;};
  },[versao,retry]);
  const source=favoritesOnly?favorites.items:produtos;
  const comparisonSource=[...new Map([...favorites.items,...produtos].map(p=>[p.id,p])).values()];
  const comparison=compareIds.map(id=>comparisonSource.find(p=>p.id===id)).filter(Boolean);
  const {filtered,groups}=catalogView(source,busca,categoria,ordem);
  const available=[...new Set(source.map(p=>p.tipo || "outros"))];
  function comprar(p) { addToCart(p.id,p.nome,Number(p.preco),p.imgUrl || "",p.estoque);setSelected(null); }
  function indisponivel(p) { return !p.ativo || p.estoque <= (cart[p.id]?.qty || 0); }
  return <section id="produtos" aria-label="Catálogo">
    <div className="sf-catalog-heading"><div><span className="sf-eyebrow">ESCOLHA SEU PRÓXIMO UPGRADE</span><h2>Explore o <span>hardware.</span></h2></div><p>Do primeiro componente ao setup completo.</p></div>
    <div className="feature-tabs"><button aria-pressed={!favoritesOnly} onClick={()=>onFavoritesOnly(false)}>Todo o catálogo</button><button aria-pressed={favoritesOnly} onClick={()=>{onFavoritesOnly(true);setCategoria("");}}>♡ Meus favoritos {usuario?`(${favorites.items.length})`:""}</button></div>
    {favoritesOnly && !usuario && <div className="bbs-notice"><p>Entre para acessar seus favoritos em qualquer dispositivo.</p><button onClick={abrirConta}>Entrar na minha conta</button></div>}
    {favoritesOnly && favorites.loading && <p role="status">Carregando favoritos…</p>}
    {favorites.error && <div role="alert" className="bbs-error">{favorites.error} <button onClick={favorites.retry}>Tentar carregar favoritos novamente</button></div>}
    <div className="sf-category-nav" aria-label="Filtrar por categoria">
      <button className={!categoria?"active":""} aria-pressed={!categoria} onClick={()=>setCategoria("")}><span className="sf-all-icon" aria-hidden="true">▦</span>Todo o catálogo</button>
      {Object.entries(categories).filter(([id])=>available.includes(id)).map(([id,c])=><button key={id} className={categoria===id?"active":""} aria-pressed={categoria===id} onClick={()=>setCategoria(categoria===id?"":id)}><HardwareArt tipo={id}/>{c.name}</button>)}
    </div>
    <div className="bbs-filters">
      <label>Buscar produto<input type="search" placeholder="Nome ou descrição" value={busca} onChange={e => setBusca(e.target.value)}/></label>
      <label>Categoria<select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{available.map(c => <option key={c} value={c}>{cats[c]||(c==="outros"?"Outros":c)}</option>)}</select></label>
      <label>Ordenar<select value={ordem} onChange={e => setOrdem(e.target.value)}><option value="nome">Nome A–Z</option><option value="preco">Menor preço</option><option value="maior">Maior preço</option></select></label>
    </div>
    {loading ? <p className="bbs-info" role="status">Carregando catálogo…</p> : error ? <div className="bbs-info"><p className="bbs-error" role="alert">{error}</p><button onClick={() => {setLoading(true);setRetry(v => v+1);}}>Tentar novamente</button></div> : <>
      <div className="sf-results"><p className="bbs-result-count" role="status">{filtered.length} produto(s) encontrado(s)</p>{(busca || categoria || ordem!=="nome") && <button onClick={()=>{setBusca("");setCategoria("");setOrdem("nome");}}>Limpar filtros ×</button>}</div>
      {!filtered.length && <div className="sf-empty"><h3>{favoritesOnly?"Nenhum favorito encontrado.":"Nenhum produto por aqui."}</h3><p>{favoritesOnly?"Use o coração nos produtos para salvar na sua conta, ou limpe os filtros.":"Tente outro nome ou escolha uma categoria diferente."}</p></div>}
      {groups.map(group=><section className="sf-category-section" key={group.id} style={{"--category-accent":group.accent}} aria-labelledby={`category-${group.id}`}>
      <div className="sf-section-heading"><span className="sf-heading-line"/><div><h2 id={`category-${group.id}`}>{group.name}</h2><p>{group.tag}</p></div><span className="sf-heading-line"/></div>
      <div className="bbs-product-grid">{group.items.map(p => <article className="bbs-product" key={p.id}>
        <div className="feature-card-top"><span className={`sf-stock ${!p.ativo || p.estoque<=0?"unavailable":""}`}>{!p.ativo || p.estoque<=0?"Indisponível":p.estoque<=5?"Últimas unidades":"Disponível"}</span><button className="feature-heart" disabled={favorites.pending!==null || favorites.loading || Boolean(favorites.error)} aria-pressed={favorites.items.some(f=>f.id===p.id)} aria-label={`${favorites.items.some(f=>f.id===p.id)?"Remover dos":"Adicionar aos"} favoritos: ${p.nome}`} onClick={()=>favorites.toggle(p)}>{favorites.items.some(f=>f.id===p.id)?"♥":"♡"}</button></div>
        <button className="bbs-product-image" onClick={() => setSelected(p)} aria-label={"Ver detalhes de "+p.nome}><ProductImage key={p.imgUrl} p={p}/></button>
        <span className="bbs-product-category">{cats[p.tipo]||p.tipo||"Hardware"}</span>
        <h3 title={p.nome}>{p.nome}</h3><p>{(p.descricao||"").slice(0,100)}</p><strong>{money(p.preco)}</strong>
        <span>{p.estoque>0 ? p.estoque+" em estoque" : "Indisponível"}</span>
        <button className="bbs-buy" disabled={indisponivel(p)} onClick={() => comprar(p)}>{indisponivel(p) ? "Limite de estoque" : "Adicionar ao carrinho"}</button>
        <button className="bbs-details" onClick={() => setSelected(p)}>Ver detalhes</button>
        <label className="feature-compare-check"><input type="checkbox" checked={compareIds.includes(p.id)} disabled={!compareIds.includes(p.id) && compareIds.length>=3} onChange={()=>setCompareIds(ids=>toggleComparison(ids,p.id))}/>Comparar produto</label>
      </article>)}</div></section>)}
    </>}
    {selected && <Modal title={selected.nome} fechar={() => setSelected(null)}><div className="bbs-detail-image"><ProductImage p={selected}/></div><p>{selected.descricao||"Sem descrição adicional."}</p><p>Categoria: {cats[selected.tipo]||selected.tipo||"Hardware"} · Estoque: {selected.estoque}</p><h3>{money(selected.preco)}</h3><button className="bbs-primary" disabled={indisponivel(selected)} onClick={() => comprar(selected)}>Adicionar ao carrinho</button></Modal>}
    {comparison.length>0 && <div className="feature-compare-bar"><span>{comparison.length}/3 selecionados</span><button disabled={comparison.length<2} onClick={()=>setComparing(true)}>Comparar</button><button onClick={()=>setCompareIds([])}>Limpar</button></div>}
    {comparing && <Modal className="feature-comparison" title="Comparar produtos" fechar={()=>setComparing(false)}><p>Dados cadastrados no catálogo. Compare até três produtos; a descrição apresenta as especificações informadas.</p><div className="feature-table-scroll"><table><thead><tr><th>Característica</th>{comparison.map(p=><th key={p.id}>{p.nome}</th>)}</tr></thead><tbody>
      <tr><th>Imagem</th>{comparison.map(p=><td key={p.id}><div className="feature-compare-image"><ProductImage p={p}/></div></td>)}</tr>
      {[['Categoria',p=>cats[p.tipo]||p.tipo||'Não informada'],['Preço',p=>money(p.preco)],['Disponibilidade',p=>p.ativo&&p.estoque>0?`${p.estoque} em estoque`:'Indisponível'],['Descrição / especificações',p=>p.descricao||'Não informadas']].map(([label,value])=><tr key={label}><th>{label}</th>{comparison.map(p=><td key={p.id}>{value(p)}</td>)}</tr>)}
      <tr><th>Comprar</th>{comparison.map(p=><td key={p.id}><button disabled={indisponivel(p)} onClick={()=>{comprar(p);setComparing(false);}}>Adicionar ao carrinho</button></td>)}</tr>
    </tbody></table></div></Modal>}
  </section>;
}
