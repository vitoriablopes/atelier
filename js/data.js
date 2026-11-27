// Dados derivados: lições analisadas, dicionário, repetição espaçada, atividade.
import { parseLesson, wordKey, keyOf, deaccent, plain, levelIndex, LEVELS } from './parser.js';
import { Store, save, saveOrder } from './store.js';
import { dayKey } from './util.js';

const parseCache = new Map();
export let LESSONS = [];       // todas as lições (todos os idiomas), ordenadas
export let DICT = new Map();   // key → entrada

export let LEVEL_DOCS = new Map(); // "lang|nivel" → lição do tipo nivel (nome, objetivos, marco, complementos)

export function rebuild() {
  // Mesma id em mais de um lugar: nuvem > aparelho > arquivo do site (a versão editada vence a original).
  const byId = new Map();
  for (const src of ['arquivo', 'local', 'nuvem']) for (const L of Object.values(Store.lessons[src])) {
    const prev = byId.get(L.id);
    byId.set(L.id, { ...L, original: prev?.original || (prev?.origem === 'arquivo' ? prev : null) });
  }
  const all = [...byId.values()];
  const parsedAll = all.map((L) => {
    const ck = L.id + '|' + (L.atualizado || 0) + '|' + (L.codigo || '').length + '|' + (L.titulo || '');
    let parsed = parseCache.get(ck);
    if (!parsed) { parsed = parseLesson(L.codigo || '', { titulo: L.titulo || '' }); parseCache.set(ck, parsed); }
    const ordem = Store.order[L.id] ?? L.ordem ?? parsed.meta.ordem ?? (L.posicao != null ? 500 + L.posicao : 900);
    return { ...L, parsed, meta: parsed.meta, titulo: parsed.meta.titulo || L.titulo || 'Sem título', lang: parsed.meta.idioma || 'fr', nivel: parsed.meta.nivel || '', tipo: parsed.meta.tipo || 'licao', codigoAula: parsed.meta.codigo || '', ordem };
  });
  LEVEL_DOCS = new Map();
  parsedAll.filter((L) => L.tipo === 'nivel').forEach((L) => LEVEL_DOCS.set(L.lang + '|' + L.nivel, L));
  LESSONS = parsedAll.filter((L) => L.tipo !== 'nivel' && L.parsed.blocks.length)
    .sort((a, b) => levelIndex(a.nivel) - levelIndex(b.nivel) || a.ordem - b.ordem || byCode(a, b) || a.titulo.localeCompare(b.titulo, 'pt'));

  DICT = new Map();
  for (const L of LESSONS) {
    for (const w of L.parsed.words) {
      const key = wordKey(L.lang, w.fr);
      let e = DICT.get(key);
      if (!e) { e = { key, ...w, lang: L.lang, licoes: [], temas: new Set(), subtemas: new Set(), niveis: new Set(), gramatica: new Set(), salva: false }; DICT.set(key, e); }
      else { for (const f of ['img', 'classe', 'ex', 'exPt', 'nota']) if (!e[f] && w[f]) e[f] = w[f]; }
      if (!e.licoes.includes(L.id)) e.licoes.push(L.id);
      L.meta.temas.forEach((t) => e.temas.add(t));
      if (L.nivel) e.niveis.add(L.nivel);
      if (!e.nivel || levelIndex(L.nivel) < levelIndex(e.nivel)) e.nivel = L.nivel;
      if (w.subtema) e.subtemas.add(w.subtema);
      if (L.meta.unidade) e.unidade ||= L.meta.unidade;
    }
  }
  const salvas = Store.state.caderno?.salvas || {};
  for (const [key, s] of Object.entries(salvas)) {
    if (!DICT.has(key)) DICT.set(key, { key, fr: s.fr, pt: s.pt, img: '', classe: s.classe || '', ex: s.ex || '', exPt: '', nota: '', lang: s.lang || 'fr', licoes: s.licao ? [s.licao] : [], temas: new Set(['salvas por mim']), subtemas: new Set(), niveis: new Set(lessonById(s.licao)?.nivel ? [lessonById(s.licao).nivel] : []), nivel: lessonById(s.licao)?.nivel || '', salva: true });
    else DICT.get(key).salva = true;
  }
}

/** Lições da trilha (sem os textos da biblioteca). */
export const byCode = (a, b) => (a.codigoAula && b.codigoAula ? a.codigoAula.localeCompare(b.codigoAula, 'pt', { numeric: true }) : a.codigoAula ? -1 : b.codigoAula ? 1 : 0);
export const levelDocs = () => [...LEVEL_DOCS.values()];
/** Informações do nível: nome, objetivos, marco e complementos (do arquivo de nível, se houver). */
export function levelInfoOf(lang, lv) {
  const D = LEVEL_DOCS.get(lang + '|' + lv);
  const listOf = (type) => (D?.parsed.blocks.filter((b) => b.type === type) || []).flatMap((b) => b.nodes.flatMap((n) => (n.k === 'list' ? n.items : n.k === 'p' ? [n.lines.join(' ')] : n.text ? [n.text] : [])));
  const goals = listOf('objetivos');
  return {
    doc: D || null,
    nome: D?.meta.titulo || '',
    descricao: D?.meta.descricao || '',
    objetivos: goals.length ? goals : LEVEL_GOALS[lv] || [],
    marco: listOf('marco').join(' '),
    complementos: listOf('complementos'),
  };
}
export const lessonsOf = (lang) => LESSONS.filter((L) => L.lang === lang && L.tipo === 'licao');
export const batteriesOf = (lang) => LESSONS.filter((L) => L.lang === lang && L.tipo === 'exercicios');
export const libraryOf = (lang) => LESSONS.filter((L) => L.lang === lang && L.tipo === 'biblioteca');
export const levelsOf = (lang) => [...new Set(lessonsOf(lang).map((L) => L.nivel))].sort((a, b) => levelIndex(a) - levelIndex(b));

// ---------------- Ordem dentro de cada nível ----------------
/** Coloca a lição no fim da trilha do nível dela. */
export async function placeAtEnd(id) {
  rebuild();
  const L = lessonById(id); if (!L) return;
  const peers = LESSONS.filter((x) => x.lang === L.lang && x.nivel === L.nivel && x.tipo === L.tipo && x.id !== id);
  // fixa a ordem atual das outras (1..n) e põe esta em n+1
  const changes = {};
  peers.forEach((x, k) => { if (Store.order[x.id] !== k + 1) changes[x.id] = k + 1; });
  changes[id] = peers.length + 1;
  await saveOrder(changes);
}
/** Move a lição dentro do nível: dir = -1 (subir), 1 (descer), 'topo' ou 'fim'. */
export async function moveLesson(id, dir) {
  const L = lessonById(id); if (!L) return;
  const list = LESSONS.filter((x) => x.lang === L.lang && x.nivel === L.nivel && x.tipo === L.tipo);
  const i = list.indexOf(L);
  let j = dir === 'topo' ? 0 : dir === 'fim' ? list.length - 1 : i + dir;
  if (j < 0 || j >= list.length || j === i) return;
  list.splice(i, 1); list.splice(j, 0, L);
  const changes = {};
  list.forEach((x, k) => { changes[x.id] = k + 1; });
  await saveOrder(changes);
}
export const lessonById = (id) => LESSONS.find((L) => L.id === id) || [...LEVEL_DOCS.values()].find((L) => L.id === id);
export const dictOf = (lang) => [...DICT.values()].filter((e) => e.lang === lang);
/** Idiomas do app: os que a pessoa escolheu estudar + os que têm lições. */
export const languages = () => [...new Set([...(Store.state.perfil?.idiomas || []), ...LESSONS.map((L) => L.lang)])];

const ARTICLES = /^(le|la|les|l'|l’|un|une|des|du|de la|de l'|el|los|las|il|lo|gli|der|die|das|the|a|an)\s*/i;
export const sortKey = (fr) => deaccent(plain(fr).toLowerCase().replace(ARTICLES, '')).replace(/^[^a-z0-9]+/, '');

/** Procura uma palavra do texto no dicionário (com/sem artigo). */
export function lookup(lang, w) {
  const k = wordKey(lang, w);
  if (DICT.has(k)) return DICT.get(k);
  const bare = sortKey(w);
  for (const e of DICT.values()) if (e.lang === lang && sortKey(e.fr) === bare) return e;
  return null;
}

// ---------------- Repetição espaçada ----------------
const DAY = 86400000;
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64, 128, 256];
const srs = () => Store.state.srs.cards;

export function cardStatus(key) {
  const c = srs()[key];
  if (!c) return Store.state.progresso.vistas[key] ? 'vista' : 'nova';
  if (c.b <= 2) return 'aprendendo';
  if (c.b <= 4) return 'revisando';
  return 'dominada';
}
export const STATUS_LABEL = { nova: 'não vista', vista: 'vista', aprendendo: 'aprendendo', revisando: 'revisando', dominada: 'dominada' };

export function introduce(keys, lessonId) {
  const now = Date.now();
  let n = 0;
  for (const k of keys) {
    if (!Store.state.progresso.vistas[k]) { Store.state.progresso.vistas[k] = now; n++; }
    if (!srs()[k]) srs()[k] = { b: 0, d: now, r: 0, l: 0 };
  }
  if (keys.length) { save('progresso'); save('srs'); }
  return n;
}

/** q: 0 errei · 1 difícil · 2 bom · 3 fácil */
export function nextInterval(key, q) {
  const c = srs()[key] || { b: 0 };
  if (q === 0) return { b: 1, ms: 10 * 60000 };
  if (q === 1) { const b = Math.max(1, c.b); return { b, ms: Math.max(0.5, INTERVALS[b] * 0.5) * DAY }; }
  const b = Math.min(INTERVALS.length - 1, c.b + (q === 3 ? 2 : 1));
  return { b, ms: INTERVALS[b] * DAY };
}
export function rate(key, q) {
  const now = Date.now();
  const c = srs()[key] || { b: 0, r: 0, l: 0 };
  const { b, ms } = nextInterval(key, q);
  srs()[key] = { b, d: now + ms, r: (c.r || 0) + 1, l: (c.l || 0) + (q === 0 ? 1 : 0), u: now };
  Store.state.progresso.vistas[key] ||= now;
  save('srs');
}
export function markWrong(key) {
  const c = srs()[key];
  if (c) { c.d = Date.now(); c.l = (c.l || 0) + 1; save('srs'); }
}
export const fmtInterval = (ms) => {
  if (ms < 3600000) return Math.round(ms / 60000) + ' min';
  if (ms < DAY) return Math.round(ms / 3600000) + ' h';
  const d = Math.round(ms / DAY);
  return d < 31 ? d + (d === 1 ? ' dia' : ' dias') : Math.round(d / 30) + ' mês' + (d >= 60 ? 'es' : '');
};
export function dueKeys(lang) {
  const now = Date.now();
  return Object.entries(srs()).filter(([k, c]) => c.d <= now && DICT.get(k)?.lang === lang).sort((a, b) => a[1].d - b[1].d).map(([k]) => k);
}

// ---------------- Atividade / constância ----------------
export function dayRec(d = dayKey()) {
  const D = Store.state.progresso.dias;
  return (D[d] ||= { min: 0, itens: 0 });
}
export function addItem(ok) {
  dayRec().itens++;
  const st = Store.state.progresso.stats;
  st.ex = (st.ex || 0) + 1; if (ok) st.ok = (st.ok || 0) + 1;
  save('progresso');
}
export function streak() {
  const D = Store.state.progresso.dias;
  const active = (k) => D[k] && (D[k].min > 0 || D[k].itens > 0);
  let n = 0; const d = new Date();
  if (!active(dayKey(d))) d.setDate(d.getDate() - 1);
  while (active(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

let activeUntil = 0, acc = 0;
export const bump = () => { activeUntil = Date.now() + 90000; };
setInterval(() => {
  if (document.visibilityState !== 'visible' || Date.now() > activeUntil) return;
  acc += 15;
  if (acc >= 60) { acc = 0; dayRec().min++; save('progresso'); }
}, 15000);

// ---------------- Progresso de lição ----------------
export function lessonProg(id) { return Store.state.progresso.licoes[id] || null; }
export function lessonPct(L) {
  const p = lessonProg(L.id);
  if (!p) return 0;
  if (p.status === 'concluida') return 100;
  return Math.round(((p.feitos || []).length / L.parsed.blocks.length) * 100);
}
export function setLessonProg(id, patch) {
  const P = Store.state.progresso.licoes;
  P[id] = { ...(P[id] || { feitos: [], inicio: Date.now() }), ...patch };
  save('progresso');
  return P[id];
}
export function wordKeysOfLesson(L) {
  return [...new Set(L.parsed.words.map((w) => wordKey(L.lang, w.fr)))];
}
export { keyOf };


// ---------------- Exercícios: estatísticas e revisão misturada ----------------
/** Todos os exercícios de uma lista de lições, com id estável e a lição de origem. */
export function exercisesOf(lessons) {
  const out = [];
  for (const L of lessons) {
    L.parsed.blocks.forEach((b) => {
      if (b.type !== 'exercicios') return;
      b.items.forEach((it, i) => out.push({ ...it, _id: `${L.id}#${b.idx}#${i}`, _lid: L.id, _rev: L.titulo }));
    });
  }
  return out;
}
export const exId = (L, b, it) => `${L.id}#${b.idx}#${b.items.indexOf(it)}`;
export function recordEx(id, ok) {
  if (!id) return;
  const S = (Store.state.progresso.exStats ||= {});
  const r = (S[id] ||= { ok: 0, bad: 0 });
  ok ? r.ok++ : r.bad++; r.t = Date.now();
  save('progresso');
}
/** Sorteia exercícios de lições já estudadas, priorizando os que você errou e os mais antigos. */
export function pickMixed(lang, n, { exclude = null } = {}) {
  const studied = lessonsOf(lang).filter((L) => L.id !== exclude && (lessonProg(L.id)?.status === 'concluida' || (lessonProg(L.id)?.feitos || []).length));
  const pool = exercisesOf(studied);
  const S = Store.state.progresso.exStats || {};
  const now = Date.now();
  const weighted = pool.map((it) => {
    const r = S[it._id];
    const days = r?.t ? (now - r.t) / 86400000 : 14;
    return { it, w: Math.max(0.2, 1 + 3 * (r?.bad || 0) - 0.5 * (r?.ok || 0) + days / 7) };
  });
  const out = [];
  while (out.length < n && weighted.length) {
    const total = weighted.reduce((a, x) => a + x.w, 0);
    let r = Math.random() * total, k = 0;
    while (k < weighted.length - 1 && (r -= weighted[k].w) > 0) k++;
    out.push(weighted.splice(k, 1)[0].it);
  }
  return out;
}

// ---------------- Objetivos por nível (descrições próprias, inspiradas no QECR) ----------------
export const LEVEL_GOALS = {
  A0: ['Reconhecer os sons e a escrita do idioma', 'Cumprimentar, agradecer e dizer seu nome', 'Usar números, cores e palavras do dia a dia', 'Entender frases prontas muito curtas'],
  A1: ['Apresentar-se e apresentar alguém', 'Fazer e responder perguntas simples (onde mora, do que gosta, o que tem)', 'Entender frases do cotidiano ditas devagar', 'Preencher um formulário e escrever um bilhete curto'],
  A2: ['Falar da rotina, da família e do trabalho', 'Contar o que fez recentemente', 'Resolver compras, transporte e restaurante', 'Entender mensagens e textos curtos e diretos'],
  B1: ['Se virar na maioria das situações de viagem', 'Contar experiências, planos e sonhos', 'Dar e justificar opiniões de forma simples', 'Entender o essencial de textos e falas claras sobre temas conhecidos'],
  B2: ['Conversar com fluência e naturalidade com nativos', 'Entender textos complexos e discussões da sua área', 'Escrever textos claros e detalhados defendendo um ponto de vista', 'Acompanhar notícias, séries e palestras'],
  C1: ['Entender textos longos e exigentes, inclusive o que está implícito', 'Expressar-se com fluência sem procurar palavras', 'Usar o idioma com flexibilidade no estudo e no trabalho', 'Escrever textos bem estruturados sobre temas complexos'],
  C2: ['Entender praticamente tudo o que lê e ouve', 'Resumir e argumentar com precisão a partir de várias fontes', 'Perceber nuances finas de sentido', 'Expressar-se com naturalidade em qualquer situação'],
  '': ['Lições livres, para explorar no seu ritmo'],
};

// ---------------- Gênero dos substantivos ----------------
const ART = {
  fr: [[/^(le|un)\s/i, 'm'], [/^(la|une)\s/i, 'f']],
  es: [[/^(el|un)\s/i, 'm'], [/^(la|una)\s/i, 'f']],
  it: [[/^(il|lo|un|uno|i|gli)\s/i, 'm'], [/^(la|una|le)\s/i, 'f']],
  pt: [[/^(o|um|os)\s/i, 'm'], [/^(a|uma|as)\s/i, 'f']],
  de: [[/^(der|ein)\s/i, 'm'], [/^(die|eine)\s/i, 'f'], [/^das\s/i, 'n']],
};
export function genderOf(e) {
  if (!e) return '';
  const c = ' ' + deaccent(e.classe || '').toLowerCase() + ' ';
  if (/[\s.(]f[.\s)]|fem/.test(c)) return 'f';
  if (/[\s.(]m[.\s)]|masc/.test(c)) return 'm';
  if (/[\s.(]n[.\s)]|neut/.test(c)) return 'n';
  for (const [re, g] of ART[e.lang] || []) if (re.test(plain(e.fr))) return g;
  return '';
}
export const gcls = (e) => (Store.state.perfil.generoCores === false ? '' : genderOf(e) ? ' g-' + genderOf(e) : '');

// ---------------- Frases (cartões com lacuna) ----------------
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
export const sentenceKey = (lang, fr) => 'frase:' + lang + ':' + hash(plain(fr).toLowerCase());
export function sentencePool(lang) {
  const out = [];
  for (const [k, f] of Object.entries(Store.state.caderno.frases || {})) if ((f.lang || 'fr') === lang) out.push({ key: k, fr: f.fr, pt: f.pt || '', alvo: f.alvo || '', origem: f.titulo || 'salva por você' });
  for (const e of DICT.values()) {
    if (e.lang !== lang || !e.ex || cardStatus(e.key) === 'nova') continue;
    out.push({ key: sentenceKey(lang, e.ex), fr: e.ex, pt: e.exPt || '', alvo: plain(e.fr).replace(ARTICLES, ''), origem: 'exemplo de “' + plain(e.fr) + '”' });
  }
  const seen = new Set();
  return out.filter((x) => (seen.has(x.key) ? false : seen.add(x.key)));
}
export function saveSentence(lang, fr, pt, meta = {}) {
  const C = Store.state.caderno;
  (C.frases ||= {})[sentenceKey(lang, fr)] = { fr: plain(fr), pt: plain(pt || ''), lang, t: Date.now(), ...meta };
  save('caderno');
}
