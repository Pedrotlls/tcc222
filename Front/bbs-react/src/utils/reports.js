export function csvCell(value) {
  let text=String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function reportCsv(report) {
  const rows=[['Relatório BBS — pedidos demonstrativos'],['Início',report.inicio,'Fim',report.fim],['Pedidos não cancelados',report.pedidos],['Valor com frete e descontos',report.valor],['Ticket médio',report.ticketMedio],['Cancelados',report.cancelados],[],['Data','Pedidos','Valor']];
  for(const dia of report.dias)rows.push([dia.data,dia.pedidos,dia.valor]);
  rows.push([],['Produto','Unidades','Subtotal sem frete/desconto']);
  for(const produto of report.produtos)rows.push([produto.nome,produto.unidades,produto.subtotal]);
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
export function localDate(date=new Date()) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
