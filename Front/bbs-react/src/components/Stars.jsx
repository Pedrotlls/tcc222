import "./feedback.css";
import { descricaoNota, formatarNota } from "../utils/feedback";

/**
 * Estrelas somente leitura: o preenchimento acompanha a média (ex.: 4,3 de 5 preenche 86%).
 * texto=false esconde o "4,3 (12)" ao lado; rotulo substitui a descrição lida por leitores de tela.
 */
export default function Stars({ media = 0, total = 0, texto = true, rotulo }) {
  const pct = Math.max(0, Math.min(100, (Number(media) / 5) * 100));
  return <div className="fb-stars" role="img" aria-label={rotulo || descricaoNota(media, total)}>
    <span className="fb-stars-track" aria-hidden="true">★★★★★<span className="fb-stars-fill" style={{ width: `${pct}%` }}>★★★★★</span></span>
    {texto && <span className="fb-stars-text" aria-hidden="true">{total ? `${formatarNota(media)} (${total})` : "Sem avaliações"}</span>}
  </div>;
}
