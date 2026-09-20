import { request } from "./api";
// O backend e a unica fonte de verdade. Falhas nao viram dados locais ficticios.
export const listarProdutos = () => request("/produtos");
export const listarProdutosAtivos = () => request("/produtos/ativos");
export const buscarProduto = id => request("/produtos/" + id);
export const criarProduto = produto => request("/produtos", { method: "POST", body: produto });
export const atualizarProduto = (id, produto) => request("/produtos/" + id, { method: "PUT", body: produto });
export const deletarProduto = id => request("/produtos/" + id, { method: "DELETE" });
export const alternarStatusProduto = id => request("/produtos/" + id + "/status", { method: "PATCH" });
