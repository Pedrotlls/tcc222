export function toggleComparison(ids,id) {
  if(ids.includes(id)) return ids.filter(value=>value!==id);
  return ids.length<3?[...ids,id]:ids;
}
