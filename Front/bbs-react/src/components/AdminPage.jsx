import { useState, useEffect, useRef } from "react";
import { request } from "../services/api";
import Modal from "./Modal";
import "./admin.css";
import {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  alternarStatusProduto,
} from "../services/produtosService";

const CATEGORIAS = [
  { id: "gpu",      label: "Placas de Vídeo"   },
  { id: "cpu",      label: "Processadores"      },
  { id: "ram",      label: "Memória RAM"         },
  { id: "ssd",      label: "SSDs"               },
  { id: "mae",      label: "Placas Mãe"         },
  { id: "fonte",    label: "Fontes"             },
  { id: "cooler",   label: "Coolers"            },
  { id: "gabinete", label: "Gabinetes"          },
  { id: "monitor",  label: "Monitores"          },
  { id: "mouse",    label: "Mouses"             },
  { id: "teclado",  label: "Teclados"           },
  { id: "mousepad", label: "Mousepads"          },
  { id: "headset",  label: "Headsets & Outros"  },
];

const FORM_VAZIO = {
  nome: "",
  descricao: "",
  preco: "",
  estoque: "",
  tipo: "",
  ativo: true,
};

const fmt = v =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminPage({ fechar, onProdutoSalvo }) {
  // AdminPage: UI/Fluxo de CRUD de produtos
  // - Carrega lista no montar (listarProdutos)
  // - Permite criar/editar com ou sem upload de imagem
  // - Permite alternar status (ativo/inativo) e deletar
  // Integração com backend via produtosService.js.
  // ==========================
  // AdminPage (BBS Admin)
  // ==========================
  // Este componente é a “página do administrador” para CRUD de produtos.
  // Ele não faz persistência por conta própria: tudo que muda no banco
  // acontece via chamadas HTTP para o backend Spring.
  //
  // Como funciona (fluxo didático do usuário):
  // 1) Ao montar (useEffect → carregar):
  //    - faz GET do catálogo (lista de produtos) no backend.
  // 2) A UI permite filtrar na tela (somente lógica local em React).
  // 3) Criar produto:
  //    - Sem imagem: POST /produtos (payload JSON)
  //    - Com imagem: POST /produtos/com-imagem (multipart/form-data)
  //    - O backend recebe o MultipartFile, salva em disco e devolve imgUrl.
  // 4) Editar produto:
  //    - Sem trocar a imagem: PUT /produtos/{id} (mantém imgUrl atual)
  //    - Com nova imagem: PUT /produtos/{id}/com-imagem (multipart)
  // 5) Alternar status (Ativo/Inativo):
  //    - PATCH /produtos/{id}/status (só inverte o campo ativo no banco)
  // 6) Remover produto:
  //    - DELETE /produtos/{id}
  //
  // Pontos importantes de integração:
  // - As rotas REST são do backend em /produtos.
  // - As chamadas “de produtos” (GET/POST/PUT/PATCH/DELETE) ficam
  //   encapsuladas no produtosService.js.
  // - Upload de imagem é feito aqui em funções auxiliares usando FormData + fetch.
  //
  const [produtos, setProdutos]           = useState([]);

  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const [loading, setLoading]             = useState(true);
  const [erro, setErro]                   = useState("");
  const [sucesso, setSucesso]             = useState("");
  const [form, setForm]                   = useState(FORM_VAZIO);
  const [editandoId, setEditandoId]       = useState(null);
  const [modalAberto, setModalAberto]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busca, setBusca]                 = useState("");
  const [estoqueBaixo,setEstoqueBaixo]=useState(false);
  const [limiteEstoque,setLimiteEstoque]=useState(5);

  // ── Estado de upload de imagem ──────────────────────────────────────────────
  // imagemArquivo  → File selecionado pelo usuário (enviado ao back-end)
  // imagemPreview  → URL local para exibir o preview sem precisar fazer upload antes
  // imgUrlExistente → URL que já estava salva no banco (usada quando não seleciona arquivo novo)
  const [imagemArquivo, setImagemArquivo]   = useState(null);
  const [imagemPreview, setImagemPreview]   = useState("");
  const [imgUrlExistente, setImgUrlExistente] = useState("");
  const inputFileRef = useRef(null);

  useEffect(() => { carregar(); }, []);
  useEffect(() => () => { if (imagemPreview.startsWith("blob:")) URL.revokeObjectURL(imagemPreview); }, [imagemPreview]);

  async function carregar() {
    setLoading(true);
    setErro("");
    try {
      const data = await listarProdutos();
      setProdutos(Array.isArray(data) ? data : Array.from(data));
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique se o Spring Boot está rodando na porta 8080.");
    } finally {
      setLoading(false);
    }
  }

  function flash(msg) {
    setSucesso(msg);
    setTimeout(() => setSucesso(""), 3500);
  }

  // Limpa os estados de imagem ao abrir o modal
  function resetImagem() {
    setImagemArquivo(null);
    setImagemPreview("");
    setImgUrlExistente("");
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setErro("");
    resetImagem();
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setForm({
      nome:      produto.nome      ?? "",
      descricao: produto.descricao ?? "",
      preco:     produto.preco     ?? "",
      estoque:   produto.estoque   ?? "",
      tipo:      produto.tipo      ?? "",
      ativo:     produto.ativo     ?? true,
    });
    setEditandoId(produto.id);
    setErro("");
    resetImagem();
    // Guarda a URL que já existe no banco para usar como fallback
    setImgUrlExistente(produto.imgUrl ?? "");
    // Exibe a imagem atual como preview inicial
    setImagemPreview(produto.imgUrl ?? "");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro("");
    resetImagem();
  }

  // Chamado quando o usuário seleciona um arquivo no <input type="file">
  function handleArquivoSelecionado(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    // Valida tipo de arquivo
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro("Formato inválido. Use JPG, PNG, WEBP ou GIF.");
      return;
    }

    // Valida tamanho (máx 5MB)
    if (arquivo.size > 5 * 1024 * 1024) {
      setErro("A imagem deve ter no máximo 5MB.");
      return;
    }

    setErro("");
    setImagemArquivo(arquivo);

    // Gera preview local usando URL temporária (não faz upload ainda)
    const urlLocal = URL.createObjectURL(arquivo);
    setImagemPreview(urlLocal);
  }

  function removerImagem() {
    setImagemArquivo(null);
    setImagemPreview("");
    setImgUrlExistente("");
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro("O campo Nome é obrigatório."); return; }
    if (!form.preco || !Number.isFinite(Number(form.preco)) || Number(form.preco) <= 0) { setErro("Informe um preço positivo."); return; }
    if (!Number.isInteger(Number(form.estoque)) || Number(form.estoque) < 0) {setErro("Estoque deve ser um inteiro não negativo.");return;}
    if (savingLock.current) return;
    savingLock.current = true; setSaving(true);

    try {
      if (editandoId) {
        // ── EDIÇÃO ────────────────────────────────────────────────────────────
        // Se o usuário selecionou um arquivo novo → envia multipart/form-data
        // Se não selecionou → envia JSON com a imgUrl que já existia no banco
        if (imagemArquivo) {
          await atualizarProdutoComImagem(editandoId, form, imagemArquivo);
        } else {
          await atualizarProduto(editandoId, {
            nome:      form.nome.trim(),
            descricao: form.descricao.trim(),
            preco:     parseFloat(Number(form.preco).toFixed(2)),
            estoque:   form.estoque !== "" ? parseInt(form.estoque) : 0,
            imgUrl:    imgUrlExistente,   // mantém a URL que já estava no banco
            tipo:      form.tipo,
            ativo:     form.ativo,
          });
        }
        flash("✅ Produto atualizado com sucesso!");
      } else {
        // ── CRIAÇÃO ───────────────────────────────────────────────────────────
        if (imagemArquivo) {
          await criarProdutoComImagem(form, imagemArquivo);
        } else {
          await criarProduto({
            nome:      form.nome.trim(),
            descricao: form.descricao.trim(),
            preco:     parseFloat(Number(form.preco).toFixed(2)),
            estoque:   form.estoque !== "" ? parseInt(form.estoque) : 0,
            imgUrl:    "",
            tipo:      form.tipo,
            ativo:     form.ativo,
          });
        }
        flash("✅ Produto criado com sucesso!");
      }
      fecharModal();
      onProdutoSalvo?.();
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally { savingLock.current = false; setSaving(false); }
  }

  async function confirmarDeletar(id) {
    try {
      await deletarProduto(id);
      setConfirmDelete(null);
      flash("🗑️ Produto removido.");
      onProdutoSalvo?.();
      carregar();
    } catch (e) {
      setErro(e.message);
      setConfirmDelete(null);
    }
  }

  async function toggleStatus(produto) {
    try {
      const atualizado = await alternarStatusProduto(produto.id);
      setProdutos(prev =>
        prev.map(p => p.id === produto.id ? { ...p, ativo: atualizado.ativo } : p)
      );
      onProdutoSalvo?.();
      flash(atualizado.ativo ? "✅ Produto ativado!" : "⚠️ Produto desativado!");
    } catch (e) {
      setErro(e.message);
    }
  }

  const baixos=produtos.filter(p=>p.ativo && Number(p.estoque)<=limiteEstoque);
  const produtosFiltrados = (estoqueBaixo?baixos:produtos).filter(p =>
    (p.nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.descricao ?? "").toLowerCase().includes(busca.toLowerCase()));

  return <Modal className="adm-dashboard adm-products" title="Produtos · Administração BBS" fechar={() => {if(!saving) fechar();}}>
    <div className="adm-layout">
      <aside className="adm-sidebar">
        <div className="adm-brand">BBS<span>PAINEL DE CONTROLE</span></div>
        <small className="adm-nav-label">GERENCIAMENTO</small>
        <button onClick={fechar}>← Visão geral e pedidos</button>
        <button aria-pressed={!estoqueBaixo} onClick={()=>setEstoqueBaixo(false)}>Produtos</button>
        <button aria-pressed={estoqueBaixo} onClick={()=>setEstoqueBaixo(v=>!v)}>Estoque baixo {loading?"":`(${baixos.length})`}</button>
        <p className="adm-sidebar-note">Catálogo, imagens e disponibilidade da sua loja.</p>
      </aside>
      <div className="adm-content">
        <div className="adm-page-heading"><div><small>ADMINISTRAÇÃO / CATÁLOGO</small><h1>Produtos</h1><p>Organize o catálogo e mantenha seu estoque atualizado.</p></div><button className="adm-primary" onClick={abrirNovo}>+ Novo produto</button></div>
        {sucesso && <p className="adm-success" role="status">{sucesso}</p>}
        {erro && !modalAberto && <p className="bbs-error" role="alert">{erro}</p>}
        <div className="adm-metrics">
          <div><span>Total cadastrado</span><b>{loading?"—":produtos.length}</b><small>Produtos no catálogo</small></div>
          <div><span>Visíveis na loja</span><b>{loading?"—":produtos.filter(p=>p.ativo).length}</b><small>Produtos ativos</small></div>
          <div><span>Fora da vitrine</span><b>{loading?"—":produtos.filter(p=>!p.ativo).length}</b><small>Produtos inativos</small></div>
        </div>
        <div className="adm-toolbar"><label>Buscar produto<input type="search" placeholder="Nome ou descrição…" value={busca} onChange={e=>setBusca(e.target.value)}/></label><span>{produtosFiltrados.length} resultado(s)</span><button disabled={loading} onClick={carregar}>↻ Atualizar</button></div>
        <div className="feature-stock-alert"><div><b>{baixos.length} produto(s) ativo(s) com estoque baixo</b><p>Inclui produtos esgotados. Edite o produto para repor a quantidade.</p></div><label>Alertar até <input type="number" min="0" max="1000" value={limiteEstoque} onChange={e=>setLimiteEstoque(Math.max(0,Math.min(1000,Number(e.target.value)||0)))}/> unidades</label><button aria-pressed={estoqueBaixo} onClick={()=>setEstoqueBaixo(v=>!v)}>{estoqueBaixo?"Mostrar todos":"Ver estoque baixo"}</button></div>
        {loading ? <p className="adm-empty" role="status">Carregando produtos…</p> :
          !produtosFiltrados.length ? <div className="adm-empty"><h3>{busca?"Nenhum resultado":"Seu catálogo começa aqui"}</h3><p>{busca?"Tente outro nome ou descrição.":"Cadastre seu primeiro produto para exibi-lo na loja."}</p>{!busca && <button className="adm-primary" onClick={abrirNovo}>+ Adicionar produto</button>}</div> :
          <div className="adm-table-wrap" tabIndex="0" aria-label="Tabela de produtos, role horizontalmente para ver todas as colunas"><table className="adm-table"><thead><tr>{["Produto","Categoria","Preço","Estoque","Status","Ações"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>
          {produtosFiltrados.map(p=><tr key={p.id}>
            <td><div className="adm-product-cell">{p.imgUrl?<img src={p.imgUrl} alt="" onError={e=>{e.currentTarget.style.visibility="hidden";}}/>:<span className="adm-product-placeholder">BBS</span>}<div><b>{p.nome}</b><small>#{p.id} · {p.descricao || "Sem descrição"}</small></div></div></td>
            <td>{CATEGORIAS.find(c=>c.id===p.tipo)?.label || p.tipo || "Sem categoria"}</td>
            <td className="adm-price">{fmt(p.preco)}</td>
            <td><span className={"adm-badge "+(p.estoque<=5?"adm-badge-warning":"")}>{p.estoque ?? 0} un.</span></td>
            <td><button className={"adm-status-button "+(p.ativo?"is-active":"is-inactive")} onClick={()=>toggleStatus(p)} aria-label={`${p.ativo?"Desativar":"Ativar"} ${p.nome}`}>{p.ativo?"● Ativo":"○ Inativo"}</button></td>
            <td><div className="adm-row-actions"><button onClick={()=>abrirEdicao(p)}>Editar</button><button className="adm-danger" onClick={()=>setConfirmDelete(p)} aria-label={`Excluir ${p.nome}`}>Excluir</button></div></td>
          </tr>)}</tbody></table></div>}
      </div>
    </div>
    {modalAberto && <Modal className="adm-editor" title={editandoId?"Editar produto":"Novo produto"} fechar={()=>{if(!saving) fecharModal();}}>
      <p className="adm-editor-intro">Preencha os dados que aparecerão no catálogo.</p>
      {erro && <p className="bbs-error" role="alert">{erro}</p>}
      <form onSubmit={e=>{e.preventDefault();salvar();}}>
        <fieldset disabled={saving} className="adm-editor-fields">
          <label className="adm-full">Nome do produto<input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} required maxLength={150} placeholder="Ex.: Placa de vídeo RTX 4060"/></label>
          <label className="adm-full">Descrição<textarea rows={3} maxLength={4000} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Características e especificações"/></label>
          <label>Preço (R$)<input type="number" min="0.01" step="0.01" required value={form.preco} onChange={e=>setForm(f=>({...f,preco:e.target.value}))}/></label>
          <label>Estoque<input type="number" min="0" max="1000000" step="1" required value={form.estoque} onChange={e=>setForm(f=>({...f,estoque:e.target.value}))}/></label>
          <label className="adm-full">Categoria<select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option value="">Selecione uma categoria</option>{CATEGORIAS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <div className="adm-full adm-upload">
            <label htmlFor="adm-product-image">Imagem do produto <small>JPG, PNG, WEBP ou GIF · Até 5 MB</small></label>
            {imagemPreview && <img src={imagemPreview} alt="Prévia do produto"/>}
            <input id="adm-product-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" ref={inputFileRef} onChange={handleArquivoSelecionado}/>
            {(imagemPreview || imgUrlExistente) && <button type="button" onClick={removerImagem}>Remover imagem</button>}
          </div>
          <label className="adm-full adm-toggle"><input type="checkbox" checked={form.ativo} onChange={e=>setForm(f=>({...f,ativo:e.target.checked}))}/><span>Ativo na loja<small>Desmarque para ocultar o produto da vitrine.</small></span></label>
        </fieldset>
        <div className="adm-editor-actions"><button type="button" disabled={saving} onClick={fecharModal}>Cancelar</button><button className="adm-primary" disabled={saving}>{saving?"Salvando…":editandoId?"Salvar alterações":"Criar produto"}</button></div>
      </form>
    </Modal>}
    {confirmDelete && <Modal className="adm-editor adm-confirm" title="Excluir produto?" fechar={()=>setConfirmDelete(null)}>
      <p>Você está excluindo <strong>{confirmDelete.nome}</strong>. Esta ação será enviada ao banco de dados.</p><p>Se quiser apenas retirá-lo da vitrine, use o botão de status para desativá-lo.</p>
      <div className="adm-editor-actions"><button onClick={()=>setConfirmDelete(null)}>Manter produto</button><button className="adm-danger" onClick={()=>confirmarDeletar(confirmDelete.id)}>Confirmar exclusão</button></div>
    </Modal>}
  </Modal>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções auxiliares de upload (definidas fora do componente para clareza)
// Montam um FormData com o arquivo + campos do produto e chamam o back-end.
// O back-end salva a imagem em disco e devolve a URL pública no campo imgUrl.
// ─────────────────────────────────────────────────────────────────────────────

async function criarProdutoComImagem(form, arquivo) {
  const fd = new FormData();
  fd.append("imagem", arquivo);                    // arquivo binário
  fd.append("nome",      form.nome.trim());
  fd.append("descricao", form.descricao.trim());
  fd.append("preco",     parseFloat(Number(form.preco).toFixed(2)));
  fd.append("estoque",   form.estoque !== "" ? parseInt(form.estoque) : 0);
  fd.append("tipo",      form.tipo);
  fd.append("ativo",     form.ativo);

  return request("/produtos/com-imagem", {
    method: "POST",
    // NÃO define Content-Type → o browser define automaticamente com boundary
    body: fd,
  });

}

async function atualizarProdutoComImagem(id, form, arquivo) {
  const fd = new FormData();
  fd.append("imagem", arquivo);
  fd.append("nome",      form.nome.trim());
  fd.append("descricao", form.descricao.trim());
  fd.append("preco",     parseFloat(Number(form.preco).toFixed(2)));
  fd.append("estoque",   form.estoque !== "" ? parseInt(form.estoque) : 0);
  fd.append("tipo",      form.tipo);
  fd.append("ativo",     form.ativo);

  return request(`/produtos/${id}/com-imagem`, {
    method: "PUT",
    body: fd,
  });

}
