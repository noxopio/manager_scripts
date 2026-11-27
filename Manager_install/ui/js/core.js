// Núcleo compartido: helpers DOM, API, estado y claves de localStorage. No importa nada (evita problemas de carga circular).
export const $ = (s) => document.querySelector(s);
export const state = { repos: [], selected: null, checked: new Set(), first: true, collapsed: new Set() };
export const STATUS_LABEL = { idle: 'inactivo', running: 'en curso', ok: 'terminado', error: 'error', stopped: 'detenido', stopping: 'deteniendo…' };
// Estado de compilación de un Run (el puerto se anuncia antes de que termine de compilar)
export const COMPILE_LABEL = { compiling: 'compilando…', ready: 'listo', failed: 'error de compilación' };
export const ACTION_LABEL = { pull: 'pull', install: 'install', updeps: 'updeps', run: 'run', status: 'status', commit: 'commit', push: 'push', checkout: 'checkout', newbranch: 'nueva rama' };

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

export async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-MFS': '1', ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
export const listName = () => $('#list').value || 'listRep.txt';
export const runCmdKey = () => 'mfs.runCmd.' + listName();
// Grupos plegados (## Nombre en el .txt), por lista y en este navegador
export const collapsedKey = () => 'mfs.collapsed.' + listName();
export function loadCollapsed() {
  try { state.collapsed = new Set(JSON.parse(localStorage.getItem(collapsedKey()) || '[]')); } catch { state.collapsed = new Set(); }
}
export function saveCollapsed() { localStorage.setItem(collapsedKey(), JSON.stringify([...state.collapsed])); }
export function saveRunCmd() {
  const value = $('#runCmd').value.trim();
  if (value) localStorage.setItem(runCmdKey(), value); else localStorage.removeItem(runCmdKey());
}

export function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const c of children) if (c != null) e.append(c);
  return e;
}

// Selección de repos
export const selectedNames = () => state.repos.map((r) => r.name).filter((n) => state.checked.has(n));
export const repoBy = (n) => state.repos.find((r) => r.name === n);
export const isBusy = (r) => r.status === 'running' || r.status === 'stopping';
