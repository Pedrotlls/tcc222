const BASE = import.meta.env?.VITE_API_BASE || "/api";
let csrf;
let sessionRequest;
export async function session() {
  if (!sessionRequest) sessionRequest = fetch(BASE + "/auth/session", { credentials: "include" })
    .then(async response => {
      if (!response.ok) throw new Error("Não foi possível iniciar a sessão.");
      const data = await response.json();
      csrf = data.csrf;
      return data;
    }).finally(() => { sessionRequest = null; });
  return sessionRequest;
}
export async function request(path, options = {}) {
  const method = options.method || "GET";
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
    if (response.status === 401) {
      csrf = undefined;
      window.dispatchEvent(new Event("bbs-session-expired"));
    }
    if (response.status === 403) csrf = undefined;
    throw new Error(data.message || (response.status === 401 ? "Entre na sua conta para continuar." :
      response.status === 403 ? "Acesso negado ou sessão expirada. Entre novamente." : "Não foi possível concluir a operação."));
  }
  if (response.status === 204) return null;
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}
export async function logout() {
  await request("/auth/logout", { method: "POST" });
  csrf = undefined;
}
