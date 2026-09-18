import { useId } from "react";

// Ilustrações vetoriais de categoria; nunca representam a foto de um modelo real.
export default function HardwareArt({ tipo = "gpu" }) {
  const id = useId().replace(/:/g, "");
  const metal = `url(#metal-${id})`;
  const accent = `url(#accent-${id})`;
  function fan(x, y, size = 49) {
    return <g transform={`translate(${x} ${y})`}>
      <circle r={size} fill="#0c1018" stroke="#667085" strokeWidth="2"/>
      <circle r={size-7} fill="none" stroke="#242d3c" strokeWidth="2"/>
      {Array.from({length:9},(_,i)=><path key={i} d={`M 0 -8 Q ${size*.8} ${-size} ${size*.82} -8 Q ${size*.5} 5 9 5 Z`} transform={`rotate(${i*40})`} fill={metal} stroke="#546174" strokeWidth=".5"/>)}
      <circle r="13" fill="#161e2c" stroke="#758094"/><circle r="4" fill="#ff5269"/>
    </g>;
  }
  let art;
  if (tipo === "gpu") art = <g transform="translate(16 32)">
    <path d="M8 39 40 22h264l24 22v117H8Z" fill={metal} stroke="#728097" strokeWidth="2"/>
    <path d="M13 45h307M15 152h306" stroke="#ff4c68" strokeWidth="4"/>
    <path d="M37 24 24 42M298 24l20 18" stroke="#c4cbd4" strokeWidth="3"/>
    {fan(85,98)}{fan(243,98)}
    <path d="m154 54 24 44-24 44h30l-23-44 23-44Z" fill="#737f92"/>
    <rect x="36" y="162" width="123" height="9" fill="#bea367"/>
    {Array.from({length:16},(_,i)=><path key={i} d={`M${40+i*7} 162v9`} stroke="#64522d"/>)}
    <path d="M3 30v151h13" fill="none" stroke="#9ba4b2" strokeWidth="5"/>
    <text x="172" y="37" fill="#c4cbd4" fontSize="7" textAnchor="middle" letterSpacing="3">GRAPHICS</text>
  </g>;
  else if (tipo === "cpu") art = <g transform="translate(103 39) rotate(-8 77 77)">
    <rect width="154" height="154" rx="8" fill="#213630" stroke="#70a18a" strokeWidth="2"/>
    {Array.from({length:12},(_,i)=><g key={i} stroke="#c9ac6b" strokeWidth="4"><path d={`M${12+i*12} -7v7M${12+i*12} 154v7M-7 ${12+i*12}h7M154 ${12+i*12}h7`}/></g>)}
    <rect x="17" y="17" width="120" height="120" rx="9" fill={metal} stroke="#c0c6d1" strokeWidth="2"/>
    <text x="77" y="74" fill="#fff" fontSize="27" fontWeight="800" textAnchor="middle">BBS</text><text x="77" y="94" fill="#ff7187" fontSize="9" letterSpacing="4" textAnchor="middle">PROCESSOR</text>
    <path d="M40 113h75" stroke="#687385"/>
  </g>;
  else if (tipo === "ram" || tipo === "ssd") art = <g transform="translate(36 79) rotate(-9 144 40)">
    <rect width="288" height="79" rx="8" fill="#172a28" stroke="#63847c" strokeWidth="2"/>
    <rect x="15" y="69" width="253" height="13" fill="#bda765"/>
    {Array.from({length:32},(_,i)=><path key={i} d={`M${19+i*8} 70v12`} stroke="#665b37"/>)}
    <path d="M140 69h8v15h-8" fill="#101418"/>
    {tipo === "ram" ? <>{[18,83,148,213].map(x=><rect key={x} x={x} y="17" width="53" height="40" rx="3" fill={metal} stroke="#637080"/>)}<path d="M0 5h288" stroke={accent} strokeWidth="7"/></> : <><rect x="18" y="12" width="178" height="48" rx="4" fill={metal}/><text x="36" y="44" fill="#fff" fontSize="21" fontWeight="800">BBS NVMe</text><rect x="212" y="18" width="53" height="39" fill="#111823" stroke="#626d7d"/></>}
  </g>;
  else if (tipo === "mouse") art = <g transform="translate(121 24) rotate(-12 60 95)"><path d="M60 0C11 0 0 38 0 99s15 97 60 97 60-35 60-97S109 0 60 0Z" fill={metal} stroke="#7f899a" strokeWidth="2"/><path d="M60 2v76M5 79h110" stroke="#091018" strokeWidth="3"/><rect x="54" y="26" width="12" height="30" rx="6" fill="#ff5269"/><path d="M14 116c0 40 14 64 46 64s46-24 46-64" stroke={accent} strokeWidth="3" fill="none"/><text x="60" y="136" fill="#ccd3dd" fontSize="15" textAnchor="middle" fontWeight="800">BBS</text></g>;
  else if (tipo === "headset") art = <g transform="translate(94 24)"><path d="M12 130V83a74 74 0 0 1 148 0v47" fill="none" stroke="#9aa4b5" strokeWidth="20"/><path d="M12 84a74 74 0 0 1 148 0" fill="none" stroke="#ff5269" strokeWidth="5"/><rect y="102" width="40" height="77" rx="17" fill={metal} stroke="#7a879a"/><rect x="132" y="102" width="40" height="77" rx="17" fill={metal} stroke="#7a879a"/><path d="M153 172v24h-43" fill="none" stroke="#7a879a" strokeWidth="6"/></g>;
  else if (tipo === "monitor" || tipo === "teclado" || tipo === "mousepad") art = tipo === "monitor" ? <g transform="translate(31 25)"><rect width="298" height="164" rx="9" fill={metal} stroke="#718096" strokeWidth="2"/><rect x="10" y="10" width="278" height="140" rx="3" fill="#151525"/><path d="m10 145 100-115 70 91 108-74" fill="none" stroke={accent} strokeWidth="7"/><path d="M150 164v32m-55 4h110" stroke="#818b9a" strokeWidth="9"/></g> : <g transform="translate(27 66) rotate(-7 153 60)"><rect width="306" height="115" rx="12" fill={metal} stroke="#8c97a9"/>{tipo === "teclado" ? Array.from({length:4},(_,row)=><g key={row}>{Array.from({length:13},(_,i)=><rect key={i} x={11+i*22} y={10+row*24} width="17" height="17" rx="3" fill="#101722" stroke={row===3?"#ff5269":"#525d70"}/>)}</g>) : <><path d="M10 10h286v95H10Z" stroke={accent} fill="none"/><text x="153" y="70" fill="#ff5269" textAnchor="middle" fontSize="35" fontWeight="800">BBS</text></>}</g>;
  else art = <g transform="translate(105 15)"><rect width="150" height="208" rx="12" fill={metal} stroke="#7f8a9c" strokeWidth="2"/><path d="M15 10h120v186H15Z" fill="#0e1420" stroke="#546071"/>{fan(75,62,39)}{fan(75,151,39)}<path d="M6 18v170" stroke={accent} strokeWidth="4"/></g>;
  return <svg viewBox="0 0 360 240" fill="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#566174"/><stop offset=".4" stopColor="#252e3d"/><stop offset="1" stopColor="#121923"/></linearGradient><linearGradient id={`accent-${id}`}><stop stopColor="#ff416c"/><stop offset="1" stopColor="#ff7d36"/></linearGradient></defs>
    {art}
  </svg>;
}
