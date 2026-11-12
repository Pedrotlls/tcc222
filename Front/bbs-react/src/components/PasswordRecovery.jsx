import { useState } from "react";
import Modal from "./Modal";
import { request } from "../services/api";
export default function PasswordRecovery({ token = "", fechar, onReset }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  async function submit(event) {
    event.preventDefault();if(busy)return;
    const data=Object.fromEntries(new FormData(event.currentTarget));
    if(token && data.senha!==data.confirmacao){setError("As senhas precisam ser iguais.");return;}
    setBusy(true);setError("");
    try {
      const result=await request(token?"/auth/recuperacao/confirmar":"/auth/recuperacao",{method:"POST",body:token?{token,senha:data.senha}:{email:data.email}});
      setMessage(result.message);if(token)onReset();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <Modal className="recovery-dialog" title={token?"Criar nova senha":"Recuperar acesso"} fechar={fechar}>
    <div className="recovery-symbol" aria-hidden="true">↗</div>
    <p>{token?"Escolha uma nova senha. Os acessos anteriores serão encerrados para proteger sua conta.":"Esqueceu sua senha? Informe seu e-mail para receber um link de recuperação."}</p>
    {error && <p className="bbs-error" role="alert">{error}</p>}
    {message ? <><p className="recovery-success" role="status">{message}</p><button className="bbs-primary" onClick={fechar}>Voltar ao login</button></> : <form className="bbs-form" onSubmit={submit}>
      {token?<><label>Nova senha<input name="senha" type="password" autoComplete="new-password" minLength={8} maxLength={64} required/></label><label>Confirmar nova senha<input name="confirmacao" type="password" autoComplete="new-password" minLength={8} maxLength={64} required/></label><small>Use de 8 a 64 caracteres. Não reutilize sua senha de outros serviços.</small></>:<label>E-mail da conta<input name="email" type="email" autoComplete="email" maxLength={150} required/></label>}
      <button className="bbs-primary" disabled={busy}>{busy?"Aguarde…":token?"Salvar nova senha":"Enviar link de recuperação"}</button>
    </form>}
  </Modal>;
}
