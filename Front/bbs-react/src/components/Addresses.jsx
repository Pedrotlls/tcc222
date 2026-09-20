import { useEffect, useRef, useState } from 'react';
import { request } from '../services/api';
import './addresses.css';
import { emptyAddress } from "../utils/address";
export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    request('/enderecos').then(data => { if (active) setAddresses(data); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  async function change(action, message) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setDraft(null); setNotice(message); setRevision(v => v + 1); }
    catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function cep() {
    const code = draft.cep.replace(/\D/g, '');
    if (code.length !== 8) { setError('Informe um CEP com 8 dígitos.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${code}/json/`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error();
      const data = await res.json(); if (data.erro) throw new Error();
      setDraft(d => ({ ...d, cep: code, rua: data.logradouro || '', bairro: data.bairro || '', cidade: data.localidade || '', uf: data.uf || '' }));
    } catch { setError('Consulta indisponível. Preencha o endereço manualmente.'); }
    finally { setBusy(false); }
  }
  return <section className="address-book" aria-label="Meus endereços">
    <p>Salve até 10 endereços, como casa e trabalho. O principal será sugerido no checkout.</p>
    {error && <p className="bbs-error" role="alert">{error}<button disabled={busy} onClick={() => { setError(''); setRevision(v => v + 1); }}>Tentar novamente</button></p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Carregando endereços…</p> : <div className="address-grid">
      {addresses.map(a => <article className="address-card" key={a.id}>
        <h3>{a.apelido} {a.principal && <span className="bbs-tag">Principal</span>}</h3>
        <p>{a.rua}, {a.numero}{a.complemento && ` · ${a.complemento}`}</p>
        <p>{a.bairro} · {a.cidade}/{a.uf}<br/>CEP {a.cep}</p>
        <div className="bbs-actions">
          <button disabled={busy} onClick={() => {setDraft({...a}); setError(''); setNotice('');}}>Editar endereço</button>
          {!a.principal && <button disabled={busy} onClick={() => change(() => request('/enderecos/'+a.id, {method:'PUT', body:{...a,principal:true}}), 'Endereço principal atualizado.')}>Tornar principal</button>}
          <button disabled={busy} onClick={() => { if(window.confirm('Excluir este endereço salvo? Os pedidos anteriores serão preservados.')) change(() => request('/enderecos/'+a.id,{method:'DELETE'}),'Endereço excluído.'); }}>Excluir endereço</button>
        </div>
      </article>)}
      {!addresses.length && <p>Você ainda não tem endereços salvos.</p>}
    </div>}
    {!draft && <button className="bbs-primary" disabled={busy || loading || addresses.length>=10} onClick={() => {setDraft(emptyAddress());setError('');setNotice('');}}>+ Novo endereço</button>}
    {draft && <form className="bbs-form address-form" onSubmit={e => {e.preventDefault();change(() => request('/enderecos'+(draft.id?'/'+draft.id:''),{method:draft.id?'PUT':'POST',body:draft}),'Endereço salvo.');}}>
      <h3>{draft.id?'Editar endereço':'Novo endereço'}</h3>
      <fieldset disabled={busy}>
        <div className="address-fields">{[['apelido','Apelido',40,2],['cep','CEP',9,8],['rua','Rua / Logradouro',120,2],['numero','Número',20,1],['complemento','Complemento (opcional)',100,0],['bairro','Bairro',80,2],['cidade','Cidade',80,2],['uf','UF',2,2]].map(([key,label,max,min]) => <label key={key}>{label}<input name={key} value={draft[key] || ''} required={min>0} minLength={min} maxLength={max} onChange={e => setDraft(d => ({...d,[key]:key==='uf'?e.target.value.toUpperCase():e.target.value}))}/></label>)}</div>
        <button type="button" onClick={cep}>Buscar CEP</button>
        <label className="address-check"><input type="checkbox" checked={draft.principal} onChange={e => setDraft(d => ({...d,principal:e.target.checked}))}/>Usar como endereço principal</label>
        <div className="bbs-actions"><button className="bbs-primary">{busy?'Salvando…':'Salvar endereço'}</button><button type="button" onClick={() => setDraft(null)}>Cancelar edição</button></div>
      </fieldset>
    </form>}
  </section>;
}
