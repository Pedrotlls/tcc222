import { useEffect, useRef } from "react";
/** Dialog nativo: foco contido, Escape e retorno do foco ao controle de origem. */
export default function Modal({ title, fechar, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const before = document.activeElement;
    element.showModal();
    return () => { element.close(); before?.focus(); };
  }, []);
  return <dialog ref={ref} className="bbs-dialog" onCancel={e => { e.preventDefault(); fechar(); }} aria-label={title}>
    <div className="bbs-dialog-heading"><h2>{title}</h2><button aria-label="Fechar" onClick={fechar}>×</button></div>
    {children}
  </dialog>;
}
