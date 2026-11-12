import { useState } from "react";
function formatCpf(value) {
  const d=value.replace(/\\D/g,"").slice(0,11);
  return d.replace(/^(\\d{3})(\\d)/,"$1.$2").replace(/^(\\d{3})\\.(\\d{3})(\\d)/,"$1.$2.$3").replace(/\\.(\\d{3})(\\d{1,2})$/,".$1-$2");
}
function validCpf(value) {
  const d=value.replace(/\\D/g,"");
  if(d.length!==11 || /^(\\d)\\1{10}$/.test(d)) return false;
  for(let n=9;n<=10;n++){
    let sum=0;for(let i=0;i<n;i++)sum+=Number(d[i])*(n+1-i);
    const digit=(sum*10)%11%10;
    if(digit!==Number(d[n]))return false;
  }
  return true;
}
export default function CpfField({label="CPF",name="cpf",required=false,defaultValue=""}) {
  const [value,setValue]=useState(formatCpf(defaultValue));
  const digits=value.replace(/\\D/g,"");
  const valid=digits.length===11 && validCpf(value);
  const invalid=digits.length===11 && !valid;
  return <label className="bbs-cpf-field">{label}
    <input name={name} value={value} onChange={e=>setValue(formatCpf(e.target.value))} inputMode="numeric" autoComplete="off" maxLength={14} placeholder="000.000.000-00" required={required} aria-invalid={invalid} />
    {digits.length===0 ? <small>Digite os 11 números do CPF.</small> : valid ? <small className="cpf-valid" role="status">✓ CPF válido</small> : invalid ? <small className="cpf-invalid" role="alert">✕ CPF inválido. Confira os números.</small> : <small>{digits.length}/11 números</small>}
  </label>;
}