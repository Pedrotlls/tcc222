import { useCallback, useEffect, useRef, useState } from "react";
import "./chatbot.css";
import Stars from "./Stars";
import { useCart } from "../context/CartContext";
import { request } from "../services/api";
import { listarProdutosAtivos } from "../services/produtosService";
import { indexarResumo } from "../utils/feedback";
import { CONTEXTO_INICIAL, SUGESTOES_INICIAIS, criarBase, responder } from "../chatbot/engine";
import { formatarBRL } from "../chatbot/texto";

const BOAS_VINDAS = { id: 0, autor: "bot", texto: "Olá! Sou o assistente da BBS. Tiro dúvidas sobre compatibilidade de peças, preços, estoque e frete, e monto PC dentro do seu orçamento.", sugestoes: SUGESTOES_INICIAIS, produtos: [] };

/** Mensagens com **texto** simples: só quebra de linha, nada de HTML. */
function Texto({ children }) {
  return <p className="cb-texto">{children}</p>;
}

export default function ChatWidget({ mobile = false }) {
  const { addToCart, subtotal, totalQty } = useCart();
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([BOAS_VINDAS]);
  const [entrada, setEntrada] = useState("");
  const [base, setBase] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const contexto = useRef(CONTEXTO_INICIAL);
  const proximoId = useRef(1);
  const log = useRef(null);
  const campo = useRef(null);
  const botao = useRef(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro("");
    Promise.all([listarProdutosAtivos(), request("/avaliacoes/resumo").catch(() => [])])
      .then(([produtos, resumo]) => setBase(criarBase(Array.isArray(produtos) ? produtos : [], indexarResumo(resumo))))
      .catch(() => setErro("Não consegui carregar o catálogo agora."))
      .finally(() => setCarregando(false));
  }, []);

  // Carrega o catálogo só na primeira abertura.
  useEffect(() => {
    if (!aberto || base || carregando || erro) return;
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, [aberto, base, carregando, erro, carregar]);

  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [mensagens, aberto]);
  useEffect(() => { if (aberto) campo.current?.focus(); }, [aberto]);

  function fechar() { setAberto(false); botao.current?.focus(); }

  function enviar(texto) {
    const t = String(texto ?? "").trim().slice(0, 300);
    if (!t || !base) return;
    const resp = responder(t, base, contexto.current, { carrinho: totalQty ? { subtotal, quantidade: totalQty } : null });
    contexto.current = resp.contexto;
    const id = proximoId.current;
    proximoId.current += 2;
    setMensagens(m => [...m, { id, autor: "user", texto: t }, { id: id + 1, autor: "bot", texto: resp.texto, produtos: resp.produtos.map(i => base.porId.get(i)).filter(Boolean), sugestoes: resp.sugestoes }]);
    setEntrada("");
  }

  function limpar() { contexto.current = CONTEXTO_INICIAL; setMensagens([BOAS_VINDAS]); campo.current?.focus(); }
  const comprar = p => addToCart(p.id, p.nome, p.preco, p.imgUrl || "", p.estoque, { tipo: p.tipo, descricao: p.descricao, marca: p.marca });
  const ultima = mensagens[mensagens.length - 1];

  return <>
    <button ref={botao} type="button" className={"cb-fab" + (mobile ? " cb-mobile" : "")} aria-expanded={aberto} aria-controls="cb-painel" onClick={() => aberto ? fechar() : setAberto(true)}>
      <span aria-hidden="true">{aberto ? "✕" : "💬"}</span><span className="cb-fab-label">{aberto ? "Fechar chat" : "Dúvidas?"}</span>
    </button>
    {aberto && <section id="cb-painel" className={"cb-panel" + (mobile ? " cb-mobile" : "")} role="dialog" aria-label="Assistente BBS" onKeyDown={e => { if (e.key === "Escape") fechar(); }}>
      <header className="cb-head"><div><strong>Assistente BBS</strong><small>Respostas automáticas · projeto acadêmico</small></div><button type="button" onClick={limpar} aria-label="Limpar conversa">Limpar</button><button type="button" onClick={fechar} aria-label="Fechar chat">✕</button></header>
      <div className="cb-log" ref={log} role="log" aria-live="polite" aria-label="Conversa">
        {mensagens.map(m => <div key={m.id} className={"cb-msg cb-" + m.autor}>
          <Texto>{m.texto}</Texto>
          {m.produtos?.length > 0 && <ul className="cb-produtos">{m.produtos.map(p => <li key={p.id}>
            <div><strong>{p.nome}</strong><span className="cb-preco">{formatarBRL(p.preco)}</span><Stars media={p.media} total={p.totalAvaliacoes} /></div>
            <button type="button" disabled={p.ativo === false || p.estoque <= 0} onClick={() => comprar(p)}>{p.estoque > 0 ? "Adicionar ao carrinho" : "Sem estoque"}</button>
          </li>)}</ul>}
        </div>)}
        {carregando && <p className="cb-status" role="status">Carregando catálogo…</p>}
        {erro && <p className="cb-status" role="alert">{erro} <button type="button" onClick={carregar}>Tentar de novo</button></p>}
      </div>
      {ultima?.autor === "bot" && ultima.sugestoes?.length > 0 && <div className="cb-chips">{ultima.sugestoes.map(s => <button key={s} type="button" disabled={!base} onClick={() => enviar(s)}>{s}</button>)}</div>}
      <form className="cb-form" onSubmit={e => { e.preventDefault(); enviar(entrada); }}>
        <label className="cb-sr" htmlFor="cb-entrada">Sua pergunta</label>
        <input id="cb-entrada" ref={campo} value={entrada} maxLength={300} autoComplete="off" placeholder={base ? "Pergunte sobre peças, preços, frete…" : "Carregando…"} disabled={!base} onChange={e => setEntrada(e.target.value)} />
        <button type="submit" disabled={!base || !entrada.trim()}>Enviar</button>
      </form>
    </section>}
  </>;
}
