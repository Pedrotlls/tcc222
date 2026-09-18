export const categories = {
  gpu: {name:"Placas de vídeo",tag:"GPU · GRAPHICS",accent:"#ff526c"},
  cpu: {name:"Processadores",tag:"CPU · COMPUTING",accent:"#ff8b48"},
  ram: {name:"Memória RAM",tag:"RAM · PERFORMANCE",accent:"#b395ff"},
  ssd: {name:"SSDs",tag:"SSD · STORAGE",accent:"#4fd7ce"},
  mae: {name:"Placas-mãe",tag:"MOTHERBOARD · CONNECTION",accent:"#ffbd68"},
  fonte: {name:"Fontes",tag:"PSU · POWER",accent:"#71cf92"},
  cooler: {name:"Coolers",tag:"COOLING · AIRFLOW",accent:"#72b9ff"},
  gabinete: {name:"Gabinetes",tag:"CASE · BUILD",accent:"#b395ff"},
  monitor: {name:"Monitores",tag:"DISPLAY · VISION",accent:"#4fd7ce"},
  mouse: {name:"Mouses",tag:"MOUSE · PRECISION",accent:"#ff8b48"},
  teclado: {name:"Teclados",tag:"KEYBOARD · CONTROL",accent:"#b395ff"},
  mousepad: {name:"Mousepads",tag:"DESK · SETUP",accent:"#ff526c"},
  headset: {name:"Headsets",tag:"AUDIO · IMMERSION",accent:"#72b9ff"},
};

export function catalogView(products, search, category, order) {
  const filtered = products.filter(p => (!category || (p.tipo || "outros") === category) &&
    `${p.nome} ${p.descricao || ""}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))
    .sort((a,b) => order === "preco" ? a.preco-b.preco : order === "maior" ? b.preco-a.preco : a.nome.localeCompare(b.nome,"pt-BR"));
  // Ao ordenar por preço, uma lista única mantém a ordem global solicitada.
  if (order !== "nome" && !category) return {filtered,groups:[{id:"resultados",name:"Seu próximo upgrade",tag:"CATÁLOGO · POR PREÇO",accent:"#ff526c",items:filtered}]};
  const ids = [...new Set([...Object.keys(categories),...filtered.map(p=>p.tipo || "outros")])];
  return {filtered,groups:ids.map(id=>({id,...(categories[id] || {name:id==="outros"?"Mais para o seu setup":id,tag:"BBS · HARDWARE",accent:"#ff526c"}),items:filtered.filter(p=>(p.tipo || "outros")===id)})).filter(g=>g.items.length)};
}
