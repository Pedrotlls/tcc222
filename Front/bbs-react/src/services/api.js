const BASE = import.meta.env?.VITE_API_BASE || "/api";
let csrf;
let sessionRequest;
let refreshRequest;
async function readSession() {
  const response = await fetch(BASE + "/auth/session", { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível iniciar a sessão.");
  const data = await response.json();
  csrf = data.csrf;
  return data;
}
async function refresh() {
  if (!refreshRequest) {
    const renew = async () => {
      // Outra aba pode ter renovado os cookies enquanto aguardávamos o lock.
      const current = await readSession();
      if (current.usuario) return true;
      if (!current.renovavel) return false;
      const response = await fetch(BASE + "/auth/refresh", {
        method: "POST", credentials: "include", headers: { "X-CSRF-TOKEN": csrf },
      });
      if (response.status === 401) return false;
      if (!response.ok) throw new Error("Não foi possível renovar a sessão. Tente novamente.");
      return true;
    };
    refreshRequest = (globalThis.navigator?.locks
      ? navigator.locks.request("bbs-token-refresh", renew) : renew())
      .finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}
export async function session() {
  if (!sessionRequest) sessionRequest = (async () => {
    const current = await readSession();
    if (!current.usuario && current.renovavel && await refresh()) return readSession();
    return current;
  })().finally(() => { sessionRequest = null; });
  return sessionRequest;
}
export async function request(path, options = {}, retried = false, csrfRetried = false) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  if (!["GET", "HEAD"].includes(method)) {
    if (!csrf) await session();
    headers.set("X-CSRF-TOKEN", csrf);
  }
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  let response;
  try { response = await fetch(BASE + path, { ...options, method, headers, body, credentials: "include" }); }
  catch { throw new Error("API indisponível. Verifique a conexão e tente novamente; seus dados não foram apagados."); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // Só repetimos requisições recusadas antes de chegar ao controller.
    if (response.status === 403 && data.code === "CSRF_INVALID" && !csrfRetried) {
      await readSession();
      return request(path, options, retried, true);
    }
    if (response.status === 401 && path !== "/auth/login") {
      if (!retried && await refresh()) return request(path, options, true, csrfRetried);
      csrf = undefined;
      window.dispatchEvent(new Event("bbs-session-expired"));
    }
    throw new Error(data.message || (response.status === 401 ? "Entre na sua conta para continuar." :
      response.status === 403 ? "Acesso negado." : "Não foi possível concluir a operação."));
  }
  if (response.status === 204) return null;
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}
export async function logout(all = false) {
  await request(all ? "/auth/logout-todos" : "/auth/logout", { method: "POST" });
  csrf = undefined;
}
