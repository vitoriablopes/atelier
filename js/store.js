// =============================================================
//  Dados: lições (arquivos do site + nuvem + aparelho) e progresso.
//  Sem Firebase configurado → tudo fica no aparelho (localStorage).
//  Com Firebase → login (Google ou e-mail) sincroniza entre aparelhos.
// =============================================================
import { CONFIG } from './config.js';

const FB = '10.12.2';
const LS = 'atelier:';
const DOC_NAMES = ['perfil', 'progresso', 'srs', 'caderno'];
export const DEFAULTS = {
  perfil: { nome: '', meta: 15, idioma: 'fr', idiomas: ['fr'], generoCores: true, vozes: {}, vel: 'normal', fonte: 'm', traducao: false, tema: 'claro' },
  progresso: { licoes: {}, dias: {}, vistas: {}, recordes: {}, stats: { ex: 0, ok: 0 }, exStats: {}, provas: {}, nivelamento: {}, lidos: {} },
  srs: { cards: {} },
  caderno: { erros: [], escritas: {}, salvas: {}, frases: {} },
};

const clone = (o) => JSON.parse(JSON.stringify(o));
const lsGet = (k, d) => { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { console.warn('localStorage cheio?', e); } };
const merge = (def, v) => {
  const o = { ...clone(def), ...(v || {}) };
  for (const k of Object.keys(def)) if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) o[k] = { ...def[k], ...(v?.[k] || {}) };
  return o;
};

const listeners = {};
export const on = (ev, fn) => ((listeners[ev] ||= new Set()).add(fn), () => listeners[ev].delete(fn));
const emit = (ev, d) => listeners[ev]?.forEach((f) => { try { f(d); } catch (e) { console.error(e); } });

export const Store = {
  configured: !!CONFIG.firebase,
  user: null,          // {uid, email, nome, foto}
  status: 'local',     // local | conectando | sincronizado | pendente | offline | erro
  error: '',
  state: {},
  lessons: { arquivo: {}, nuvem: {}, local: {} },
  order: {},           // id da lição → posição dentro do seu nível
  orderSrc: { local: {}, nuvem: null },
  fileLessonsLoaded: false,
  get isAdmin() {
    if (!this.configured) return true;
    return !!(this.user && CONFIG.admins.map((e) => e.toLowerCase()).includes((this.user.email || '').toLowerCase()));
  },
  get lessonTarget() { return this.configured && this.isAdmin && this.user ? 'nuvem' : 'local'; },
};

let fb = null;          // módulos do Firebase
let unsubs = [];
const timers = {};
const scope = () => (Store.user ? 'u:' + Store.user.uid + ':' : 'local:');

function loadLocalState() {
  for (const n of DOC_NAMES) Store.state[n] = merge(DEFAULTS[n], lsGet(scope() + n, null));
}

export function save(name) {
  const d = Store.state[name];
  d._t = Date.now();
  lsSet(scope() + name, d);
  emit('change', name);
  if (fb && Store.user) {
    clearTimeout(timers[name]);
    timers[name] = setTimeout(() => pushDoc(name), 1200);
    setStatus('pendente');
  }
}

async function pushDoc(name) {
  if (!fb || !Store.user) return;
  const { doc, setDoc } = fb.fs;
  clearTimeout(timers[name]); timers[name] = null;
  try {
    await setDoc(doc(fb.db, 'usuarios', Store.user.uid, 'estado', name), clone(Store.state[name]));
    if (!Object.values(timers).some(Boolean)) setStatus(navigator.onLine ? 'sincronizado' : 'offline');
  } catch (e) {
    console.error(e); Store.error = e.message; setStatus('erro');
  }
}

function setStatus(s) { if (Store.status !== s) { Store.status = s; emit('status', s); } }

// ---------------- Lições ----------------
export async function loadFileLessons() {
  try {
    const r = await fetch('licoes/indice.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('sem índice');
    const list = await r.json();
    const files = (Array.isArray(list) ? list : list.licoes || []).map((x) => (typeof x === 'string' ? x : x.arquivo)).filter(Boolean);
    const out = {};
    await Promise.all(files.map(async (f, i) => {
      try {
        const t = await (await fetch('licoes/' + f, { cache: 'no-cache' })).text();
        const id = 'arq-' + f.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-');
        out[id] = { id, titulo: '', codigo: t, ordem: null, origem: 'arquivo', arquivo: f, posicao: i, atualizado: 0 };
      } catch (e) { console.warn('Falha ao carregar', f, e); }
    }));
    Store.lessons.arquivo = out;
  } catch (e) { Store.lessons.arquivo = {}; }
  Store.fileLessonsLoaded = true;
  emit('lessons');
}

function loadLocalLessons() {
  Store.lessons.local = lsGet('licoes', {});
  Store.orderSrc.local = lsGet('ordem', {});
  mergeOrder();
}
function mergeOrder() {
  // a ordem da nuvem (definida pela administradora) vale para todos; a local cobre lições só deste aparelho
  Store.order = { ...Store.orderSrc.local, ...(Store.orderSrc.nuvem || {}) };
}

/** Salva o mapa de ordem (id → posição). Na nuvem se for a administradora logada; senão, no aparelho. */
export async function saveOrder(changes) {
  const cloud = Store.lessonTarget === 'nuvem';
  if (cloud) {
    Store.orderSrc.nuvem = { ...(Store.orderSrc.nuvem || {}), ...changes };
    mergeOrder(); emit('lessons');
    const { doc, setDoc } = fb.fs;
    await setDoc(doc(fb.db, 'config', 'ordem'), { mapa: Store.orderSrc.nuvem, atualizado: Date.now() });
  } else {
    Store.orderSrc.local = { ...Store.orderSrc.local, ...changes };
    lsSet('ordem', Store.orderSrc.local);
    mergeOrder(); emit('lessons');
  }
}

export async function saveLesson({ id, titulo, codigo, ordem }, target = Store.lessonTarget) {
  const now = Date.now();
  id = id || 'l' + now.toString(36);
  const data = { id, titulo, codigo, ordem: ordem ?? null, atualizado: now };
  if (target === 'nuvem') {
    const { doc, setDoc } = fb.fs;
    Store.lessons.nuvem[id] = { ...data, origem: 'nuvem' };
    emit('lessons');
    await setDoc(doc(fb.db, 'licoes', id), data);
  } else {
    Store.lessons.local[id] = { ...data, origem: 'local' };
    lsSet('licoes', Store.lessons.local);
    emit('lessons');
  }
  return id;
}

export async function deleteLesson(id, origem) {
  if (origem === 'nuvem') {
    const { doc, deleteDoc } = fb.fs;
    delete Store.lessons.nuvem[id]; emit('lessons');
    await deleteDoc(doc(fb.db, 'licoes', id));
  } else if (origem === 'local') {
    delete Store.lessons.local[id];
    lsSet('licoes', Store.lessons.local);
    emit('lessons');
  }
}

export async function setLessonOrder(id, origem, ordem) {
  const L = Store.lessons[origem]?.[id];
  if (!L) return;
  await saveLesson({ ...L, ordem }, origem);
}

// ---------------- Auth ----------------
export async function signInGoogle() {
  const { GoogleAuthProvider, signInWithPopup } = fb.auth;
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(fb.authI, p);
}
export async function signInEmail(email, senha, criar = false) {
  const A = fb.auth;
  if (criar) await A.createUserWithEmailAndPassword(fb.authI, email, senha);
  else await A.signInWithEmailAndPassword(fb.authI, email, senha);
}
export async function resetPassword(email) { await fb.auth.sendPasswordResetEmail(fb.authI, email); }
export async function signOut() { await fb.auth.signOut(fb.authI); }

function subscribeUser() {
  unsubs.forEach((u) => u()); unsubs = [];
  if (!Store.user) return;
  const { doc, onSnapshot, getDoc, setDoc } = fb.fs;
  setStatus('conectando');
  let pending = DOC_NAMES.length;
  for (const n of DOC_NAMES) {
    const ref = doc(fb.db, 'usuarios', Store.user.uid, 'estado', n);
    let first = true;
    unsubs.push(onSnapshot(ref, { includeMetadataChanges: false }, async (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const remote = snap.exists() ? snap.data() : null;
      if (!remote && snap.metadata.fromCache) return; // espera a resposta do servidor antes de decidir
      const local = Store.state[n];
      if (first) {
        first = false;
        // Primeiro login neste aparelho: se a nuvem estiver vazia, envia o que já existe aqui.
        if (!remote) {
          const guest = lsGet('local:' + n, null);
          if (guest && guest._t && (!local._t || guest._t > local._t)) Store.state[n] = merge(DEFAULTS[n], guest);
          if (Store.state[n]._t) pushDoc(n);
        }
        if (--pending === 0) setStatus(navigator.onLine ? 'sincronizado' : 'offline');
      }
      if (remote && (remote._t || 0) > (local._t || 0) && !timers[n]) {
        Store.state[n] = merge(DEFAULTS[n], remote);
        lsSet(scope() + n, Store.state[n]);
        emit('change', n);
      } else if (remote && (local._t || 0) > (remote._t || 0) && !timers[n]) {
        pushDoc(n);
      }
    }, (err) => { console.error(err); Store.error = err.message; setStatus('erro'); }));
  }
}

function subscribeLessons() {
  const { collection, onSnapshot, doc } = fb.fs;
  onSnapshot(doc(fb.db, 'config', 'ordem'), (snap) => {
    Store.orderSrc.nuvem = snap.exists() ? snap.data().mapa || {} : null;
    mergeOrder(); emit('lessons');
  }, (err) => console.warn('ordem', err));
  onSnapshot(collection(fb.db, 'licoes'), (snap) => {
    const out = {};
    snap.forEach((d) => { out[d.id] = { ...d.data(), id: d.id, origem: 'nuvem' }; });
    Store.lessons.nuvem = out;
    emit('lessons');
  }, (err) => { console.warn('licoes', err); });
}

async function initFirebase() {
  setStatus('conectando');
  const base = `https://www.gstatic.com/firebasejs/${FB}/`;
  const [app, auth, fs] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
  ]);
  const a = app.initializeApp(CONFIG.firebase);
  let db;
  try {
    db = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch (e) { db = fs.getFirestore(a); }
  const authI = auth.getAuth(a);
  fb = { app: a, auth, fs, db, authI };
  subscribeLessons();
  auth.onAuthStateChanged(authI, (u) => {
    Store.user = u ? { uid: u.uid, email: u.email, nome: u.displayName || '', foto: u.photoURL || '' } : null;
    loadLocalState();
    if (Store.user && !Store.state.perfil.nome && Store.user.nome) Store.state.perfil.nome = Store.user.nome.split(' ')[0];
    if (!Store.user) setStatus('local');
    subscribeUser();
    emit('auth', Store.user);
    emit('change', '*');
  });
  window.addEventListener('online', () => Store.user && setStatus('sincronizado'));
  window.addEventListener('offline', () => Store.user && setStatus('offline'));
}

export async function init() {
  loadLocalState();
  loadLocalLessons();
  await loadFileLessons();
  if (Store.configured) {
    try { await initFirebase(); }
    catch (e) { console.error(e); Store.error = 'Não foi possível carregar o Firebase: ' + e.message; setStatus('erro'); }
  }
}

// ---------------- Backup ----------------
export function exportAll() {
  return {
    app: 'atelier', versao: 1, exportado: new Date().toISOString(),
    estado: clone(Store.state),
    licoes: Object.values({ ...Store.lessons.local, ...Store.lessons.nuvem }).map(({ id, titulo, codigo, ordem }) => ({ id, titulo, codigo, ordem })),
  };
}
export async function importAll(data, { estado = true, licoes = true } = {}) {
  if (!data || data.app !== 'atelier') throw new Error('Arquivo de backup inválido.');
  if (estado && data.estado) for (const n of DOC_NAMES) if (data.estado[n]) { Store.state[n] = merge(DEFAULTS[n], data.estado[n]); save(n); }
  if (licoes && Array.isArray(data.licoes)) for (const l of data.licoes) await saveLesson(l);
  emit('change', '*');
}
export async function resetProgress() {
  for (const n of ['progresso', 'srs', 'caderno']) { Store.state[n] = clone(DEFAULTS[n]); save(n); }
}
