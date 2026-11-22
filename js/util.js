import { plain } from './parser.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const plural = (n, s, p) => `${n} ${n === 1 ? s : p || s + 's'}`;
export const fmtDate = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export const LANGS = {
  fr: { nome: 'Francês', nativo: 'français', ola: ['Bonjour', 'Bonsoir'], acentos: 'é è ê ë à â ç ù û ü î ï ô œ æ « »' },
  ja: { nome: 'Japonês', nativo: '日本語', ola: ['こんにちは', 'こんばんは'], acentos: '' },
  es: { nome: 'Espanhol', nativo: 'español', ola: ['Hola', 'Buenas noches'], acentos: 'á é í ó ú ñ ü ¿ ¡' },
  it: { nome: 'Italiano', nativo: 'italiano', ola: ['Buongiorno', 'Buonasera'], acentos: 'à è é ì ò ù' },
  de: { nome: 'Alemão', nativo: 'Deutsch', ola: ['Guten Tag', 'Guten Abend'], acentos: 'ä ö ü ß' },
  en: { nome: 'Inglês', nativo: 'English', ola: ['Good morning', 'Good evening'], acentos: '' },
  ko: { nome: 'Coreano', nativo: '한국어', ola: ['안녕하세요', '안녕하세요'], acentos: '' },
  zh: { nome: 'Chinês', nativo: '中文', ola: ['你好', '晚上好'], acentos: '' },
  ru: { nome: 'Russo', nativo: 'русский', ola: ['Здравствуйте', 'Добрый вечер'], acentos: '' },
  nl: { nome: 'Holandês', nativo: 'Nederlands', ola: ['Goedendag', 'Goedenavond'], acentos: 'é ë ï ó' },
  ca: { nome: 'Catalão', nativo: 'català', ola: ['Bon dia', 'Bona nit'], acentos: 'à è é í ï ò ó ú ü ç ·' },
  la: { nome: 'Latim', nativo: 'latine', ola: ['Salve', 'Salve'], acentos: 'ā ē ī ō ū' },
};
export const langInfo = (l) => LANGS[l] || { nome: String(l || '?').toUpperCase(), nativo: l, ola: ['Olá', 'Olá'], acentos: '' };

// ---------- toast / modal ----------
let toastT;
export function toast(msg, ms = 2600) {
  $('.toast')?.remove(); clearTimeout(toastT);
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  toastT = setTimeout(() => el.remove(), ms);
}
export function modal(html, mount) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal card" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(bg);
  mount?.(bg.firstElementChild, close);
  return close;
}
export function confirmBox(msg, { ok = 'Confirmar', danger = false } = {}) {
  return new Promise((res) => {
    modal(`<div class="stack"><p style="margin:0">${msg}</p><div class="row" style="justify-content:flex-end">
      <button class="btn ghost" data-close>Cancelar</button><button class="btn ${danger ? 'rose' : 'primary'}" data-ok>${ok}</button></div></div>`,
    (el, close) => {
      el.querySelector('[data-ok]').onclick = () => { close(); res(true); };
      el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => res(false)));
    });
  });
}
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); toast('Copiado ✓'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copiado ✓'); } catch (e2) { toast('Não consegui copiar — selecione e copie manualmente.'); }
    ta.remove();
  }
}
export function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- texto com marcação ----------
/** {palavra|significado} → glossário clicável; **negrito**, *itálico*, quebras de linha. */
export function inline(s, { gloss = true } = {}) {
  let t = esc(s);
  t = t.replace(/\{([^{}|]+?)(?:\|([^{}]*))?\}/g, (m, w, mean) =>
    gloss ? `<button type="button" class="gloss" data-w="${w.trim()}" data-m="${(mean || '').trim()}">${w.trim()}</button>` : w);
  t = t.replace(/\(\(([^()|]+?)(?:\|([^()]*?))?\)\)/g, (m, w, note) =>
    gloss ? `<button type="button" class="gloss gram" data-w="${w.trim()}" data-g="${(note || '').trim()}">${w.trim()}</button>` : w);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  return t.replace(/\n/g, '<br>');
}

export function sayBtn(text, { lang, size = '', speed = '', title = 'Ouvir', icon = '▶' } = {}) {
  const p = plain(text);
  if (!p) return '';
  return `<button type="button" class="icon-btn ${size}" data-say="${esc(p)}"${lang ? ` data-lang="${esc(lang)}"` : ''}${speed ? ` data-speed="${speed}"` : ''} title="${esc(title)}" aria-label="${esc(title)}">${icon}</button>`;
}

export function richHtml(nodes, lang) {
  return nodes.map((n) => {
    switch (n.k) {
      case 'h': return `<h3>${inline(n.text)}</h3>`;
      case 'p': return `<p>${inline(n.lines.join('\n'))}</p>`;
      case 'tip': return `<div class="callout tip"><span class="ic">✧</span><div>${inline(n.text)}</div></div>`;
      case 'warn': return `<div class="callout warn"><span class="ic">!</span><div>${inline(n.text)}</div></div>`;
      case 'ex': return `<div class="ex-line">${sayBtn(n.fr, { lang, size: 'sm' })}<div><div class="fr">${inline(n.fr)}</div>${n.pt ? `<div class="pt">${inline(n.pt)}</div>` : ''}</div></div>`;
      case 'list': return `<${n.ordered ? 'ol' : 'ul'}>${n.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${n.ordered ? 'ol' : 'ul'}>`;
      case 'table': {
        const rows = n.rows.map((r, i) => {
          const tag = n.head && i === 0 ? 'th' : 'td';
          return `<tr>${r.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>`;
        });
        return `<div class="tbl-wrap"><table>${rows.join('')}</table></div>`;
      }
    }
    return '';
  }).join('');
}

// ---------- imagens ----------
/** Aceita link https://, emoji ou img:nome (arquivo na pasta imagens/ do site). */
export function imgHtml(ref, { cls = 'vimg', alt = '' } = {}) {
  const t = String(ref || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return `<img class="${cls}" src="${esc(t)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer" data-fallback>`;
  if (/^img:/i.test(t)) {
    const name = t.slice(4).trim();
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(name);
    const src = 'imagens/' + (hasExt ? name : name + '.jpg');
    const alts = hasExt ? '' : ['png', 'webp', 'jpeg', 'gif', 'svg'].map((e) => `imagens/${name}.${e}`).join(',');
    return `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" data-fallback data-alts="${esc(alts)}">`;
  }
  return `<div class="emoji" aria-hidden="true">${esc(t)}</div>`;
}
// imagem que não carregou → tenta extensões alternativas → placeholder
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-fallback')) return;
  const alts = (img.dataset.alts || '').split(',').filter(Boolean);
  if (alts.length) { img.dataset.alts = alts.slice(1).join(','); img.src = alts[0]; return; }
  const ph = document.createElement('div');
  ph.className = 'img-missing ' + (img.className || '');
  ph.textContent = 'Imagem indisponível';
  img.replaceWith(ph);
}, true);
