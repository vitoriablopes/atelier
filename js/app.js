import { CONFIG } from './config.js';
import { BLOCK_TYPES, EX_LABELS, plain, wordKey, LEVELS, LEVEL_NAMES, levelIndex, setMeta } from './parser.js';
import * as S from './store.js';
import { Store, save, on } from './store.js';
import * as TTS from './speech.js';
import { $, $$, esc, inline, sayBtn, imgHtml, toast, modal, confirmBox, plural, fmtDate, dayKey, LANGS, langInfo, pick } from './util.js';
import { rebuild, LESSONS, DICT, lessonsOf, libraryOf, dictOf, languages, lessonById, lessonPct, lessonProg, cardStatus, STATUS_LABEL, dueKeys, streak, dayRec, sortKey, bump, moveLesson, placeAtEnd, LEVEL_GOALS, exercisesOf, gcls, genderOf, sentencePool, levelInfoOf, levelDocs } from './data.js';
import { renderLibrary, openReading } from './library.js';
import { renderPractice, openBattery } from './practice.js';
import { mixedSession, levelExam, placementTest } from './tests.js';
import './voice.js';
import { openLesson, teardown, openGloss, exAnswerSummary } from './lesson.js';
import { renderCards, setFilter } from './cards.js';
import { renderStudio } from './studio.js';
import { runExercises } from './exercises.js';

const view = () => $('#view');
const NAV = [
  ['hoje', 'Hoje', '☼'], ['trilha', 'Trilha', '❦'], ['exercicios', 'Exercícios', '✎'], ['biblioteca', 'Biblioteca', '❧'], ['cartoes', 'Cartões', '✿'],
  ['dicionario', 'Dicionário', 'Aa'], ['caderno', 'Caderno', '✐'], ['estudio', 'Estúdio', '✒'], ['ajustes', 'Ajustes', '⚙'],
];
const MORE = ['exercicios', 'dicionario', 'caderno', 'estudio', 'ajustes'];
let current = '', routeName = '';
let pending = {};
export function go(hash, params = {}) { pending = params; if (location.hash === hash) route(); else location.hash = hash; }

// ---------------------------------------------------------------
function applyPrefs() {
  const p = Store.state.perfil;
  document.documentElement.dataset.fonte = p.fonte || 'm';
  document.documentElement.dataset.tema = p.tema || 'claro';
  document.documentElement.dataset.lang = p.idioma || 'fr';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', p.tema === 'noite' ? '#2b2421' : '#f8f2ea');
  TTS.setPrefs({ voices: p.vozes || {}, speed: p.vel || 'normal' });
  // idioma ativo precisa existir
  if (!p.idiomas?.length) p.idiomas = [p.idioma || 'fr'];
  if (!languages().includes(p.idioma)) p.idioma = languages()[0] || 'fr';
}

function shell() {
  const due = dueKeys(Store.state.perfil.idioma).length;
  const nameBlock = `<div class="name">${esc(CONFIG.nome)}</div><div class="sub">${esc(CONFIG.subtitulo)}</div>`;
  const langSel = `<button class="lang-btn" data-langpick title="Trocar ou adicionar idioma"><span class="code">${esc(Store.state.perfil.idioma.toUpperCase())}</span>${esc(langInfo(Store.state.perfil.idioma).nome)} <span class="muted">▾</span></button>`;
  $('#side').innerHTML = `<div class="brand">${nameBlock}${langSel ? `<div style="margin-top:12px">${langSel}</div>` : ''}</div>
    ${NAV.map(([k, l, ic]) => `<a class="nav-link ${current === k ? 'on' : ''}" href="#${k}"><span class="ic">${ic}</span>${l}${k === 'cartoes' && due ? `<span class="badge">${due}</span>` : ''}</a>`).join('')}
    <div class="spacer"></div><div class="sync">${syncLabel()}</div>`;
  $('#topbar').innerHTML = `<div class="name">${esc(CONFIG.nome)}</div><div class="row">${langSel}<button class="icon-btn" data-goto="ajustes" title="Ajustes">⚙</button></div>`;
  const tabs = [['hoje', 'Hoje', '☼'], ['trilha', 'Trilha', '❦'], ['biblioteca', 'Leitura', '❧'], ['cartoes', 'Cartões', '✿'], ['mais', 'Mais', '⋯']];
  $('#tabbar').innerHTML = tabs.map(([k, l, ic]) => `<button data-tab="${k}" class="${current === k || (k === 'mais' && MORE.includes(current)) ? 'on' : ''}"><span class="ic">${ic}</span>${l}${k === 'cartoes' && due ? `<span class="badge">${due}</span>` : ''}</button>`).join('');

}
function syncLabel() {
  if (!Store.configured) return `<span class="dot"></span>Só neste aparelho`;
  const m = { local: ['', 'Não conectada'], conectando: ['warn', 'Conectando…'], sincronizado: ['ok', 'Sincronizado'], pendente: ['warn', 'Salvando…'], offline: ['warn', 'Offline — salvo aqui'], erro: ['err', 'Erro de sincronização'] }[Store.status] || ['', ''];
  return `<span class="dot ${m[0]}"></span>${m[1]}${Store.user ? `<span class="tiny" style="margin-left:auto;opacity:.7">${esc((Store.user.email || '').split('@')[0])}</span>` : ''}`;
}

document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-say]');
  if (s) { e.preventDefault(); bump(); s.classList.add('playing'); TTS.speak(s.dataset.say, { lang: s.dataset.lang || Store.state.perfil.idioma, speed: s.dataset.speed || undefined }).finally(() => s.classList.remove('playing')); return; }
  const g = e.target.closest('[data-goto]'); if (g) { go('#' + g.dataset.goto); return; }
  const st = e.target.closest('[data-studio-tab]'); if (st) { go('#estudio', { tab: st.dataset.studioTab }); return; }
  if (e.target.closest('[data-langpick]')) { langPicker(); return; }
  const a = e.target.closest('a.nav-link'); if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); return; }
  const t = e.target.closest('#tabbar [data-tab]');
  if (t) {
    if (t.dataset.tab === 'mais') {
      modal(`<div class="stack-s">${NAV.filter(([k]) => MORE.includes(k)).map(([k, l, ic]) => `<button class="nav-link" style="width:100%" data-goto="${k}" data-close><span class="ic">${ic}</span>${l}</button>`).join('')}</div>`);
    } else go('#' + t.dataset.tab);
  }
});

// ---------------------------------------------------------------
//  Idiomas
// ---------------------------------------------------------------
export function setLanguage(l) {
  const p = Store.state.perfil;
  p.idiomas = [...new Set([...(p.idiomas || []), l])];
  p.idioma = l; save('perfil'); applyPrefs(); route();
}
function langPicker() {
  const p = Store.state.perfil;
  const langs = languages();
  const others = Object.keys(LANGS).filter((l) => !langs.includes(l));
  modal(`<div class="stack"><h2>Idioma</h2>
    <div class="stack-s">${langs.map((l) => { const n = lessonsOf(l).length; return `<button class="nav-link ${l === p.idioma ? 'on' : ''}" style="width:100%" data-pick="${l}" data-close><span class="code-chip">${esc(l.toUpperCase())}</span>${esc(langInfo(l).nome)} <span class="small muted" style="margin-left:auto">${plural(n, 'lição', 'lições')}</span></button>`; }).join('')}</div>
    <hr class="orn" style="margin:6px 0">
    <div><label class="lbl">Adicionar um idioma</label>
      <div class="row nowrap"><select class="select grow" data-add>${others.map((l) => `<option value="${l}">${esc(langInfo(l).nome)} (${langInfo(l).nativo})</option>`).join('')}<option value="__outro">Outro (código ISO)…</option></select><button class="btn primary" data-addgo>Adicionar</button></div>
      <input class="input" data-code placeholder="código do idioma, ex.: sv, pl, el, ar, he, tr" style="margin-top:8px" hidden maxlength="5"></div>
    <p class="small muted" style="margin:0">Cada idioma tem trilha, cartões e dicionário próprios. As lições de um idioma usam <code>@idioma: código</code> (ex.: <code>@idioma: es</code>).</p></div>`, (m, close) => {
    m.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => setLanguage(b.dataset.pick)));
    const sel = m.querySelector('[data-add]'), code = m.querySelector('[data-code]');
    sel.onchange = () => { code.hidden = sel.value !== '__outro'; if (!code.hidden) code.focus(); };
    m.querySelector('[data-addgo]').onclick = () => {
      const l = sel.value === '__outro' ? code.value.trim().toLowerCase() : sel.value;
      if (!/^[a-z]{2,3}(-[a-z]{2})?$/.test(l)) return toast('Use um código de idioma, ex.: sv, pl, ar');
      close(); setLanguage(l); toast(`${langInfo(l).nome} adicionado ✓`);
    };
  });
}

// ---------------------------------------------------------------
function route(keepScroll) {
  const h = location.hash.replace(/^#/, '') || 'hoje';
  const [name, arg] = h.split('/');
  teardown();
  document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
  const params = pending; pending = {};
  current = { licao: 'trilha', prova: 'trilha', nivelamento: 'trilha', leitura: 'biblioteca', revisao: 'hoje', bateria: 'exercicios' }[name] || name;
  routeName = name;
  document.body.classList.toggle('focus', ['licao', 'prova', 'nivelamento', 'revisao'].includes(name));
  shell();
  const v = view();
  v.onkeydown = null;
  if (name === 'licao') { openLesson(v, decodeURIComponent(arg || ''), { go }); return; }
  if (name === 'leitura') { openReading(v, decodeURIComponent(arg || ''), { go }); window.scrollTo({ top: 0 }); return; }
  if (name === 'revisao') { mixedSession(v, { go }); return; }
  if (name === 'bateria') { openBattery(v, decodeURIComponent(arg || ''), { go }); window.scrollTo({ top: 0 }); return; }
  if (name === 'prova') { levelExam(v, decodeURIComponent(arg || ''), { go }); return; }
  if (name === 'nivelamento') { placementTest(v, { go }); return; }
  if (name === 'cartoes' && params.licao) setFilter({ licao: params.licao });
  const R = { hoje: renderHome, trilha: renderTrail, biblioteca: (el) => renderLibrary(el, { go }), exercicios: (el) => renderPractice(el, { go }), cartoes: (el) => renderCards(el, { go }), dicionario: renderDict, caderno: renderNotebook, estudio: (el) => renderStudio(el, { go, params }), ajustes: renderSettings }[name] || renderHome;
  const y = window.scrollY;
  R(v, params);
  window.scrollTo({ top: keepScroll === true ? y : 0 });
}
const LIVE = new Set(['hoje', 'trilha', 'biblioteca', 'exercicios', 'dicionario', 'caderno', 'ajustes']);
function refreshIfIdle() {
  shell();
  if (LIVE.has(routeName) && !document.activeElement?.matches('input, textarea, select') && !document.querySelector('.modal-bg, .pop, [data-busy]')) route(true);
}

// ---------------------------------------------------------------
//  Hoje
// ---------------------------------------------------------------
function renderHome(v) {
  const p = Store.state.perfil, lang = p.idioma, li = langInfo(lang);
  const ls = lessonsOf(lang);
  const h = new Date().getHours();
  const hello = li.ola[h >= 18 || h < 5 ? 1 : 0];
  const rec = dayRec();
  const goal = p.meta || 15;
  const pct = Math.min(100, Math.round((rec.min / goal) * 100));
  const due = dueKeys(lang).length;
  const st = streak();
  const doing = ls.find((L) => lessonProg(L.id)?.status === 'andamento') || ls.find((L) => !lessonProg(L.id)) || null;
  const dict = dictOf(lang);
  const seen = dict.filter((e) => cardStatus(e.key) !== 'nova').length;
  const mastered = dict.filter((e) => cardStatus(e.key) === 'dominada').length;
  const done = ls.filter((L) => lessonProg(L.id)?.status === 'concluida').length;
  const stats = Store.state.progresso.stats;
  const withEx = dict.filter((e) => e.ex);
  const phrase = withEx.length ? withEx[(new Date().getDate() + new Date().getMonth() * 31) % withEx.length] : null;
  const studied = ls.filter((L) => lessonProg(L.id));
  const mixN = exercisesOf(studied).length;
  const place = Store.state.progresso.nivelamento?.[lang];
  const placeable = new Set(ls.filter((L) => L.nivel).map((L) => L.nivel)).size > 1;
  const lib = libraryOf(lang), libRead = lib.filter((L) => Store.state.progresso.lidos?.[L.id]).length;

  // calendário (16 semanas)
  const days = []; const d0 = new Date(); d0.setDate(d0.getDate() - (7 * 15 + d0.getDay()));
  for (let i = 0; i < 16 * 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); days.push(d); }
  const D = Store.state.progresso.dias;
  const lvl = (k) => { const r = D[k]; if (!r) return 0; const m = r.min + r.itens / 4; return m <= 0 ? 0 : m < goal * 0.34 ? 1 : m < goal * 0.67 ? 2 : m < goal ? 3 : 4; };
  const todayK = dayKey();

  v.innerHTML = `<div class="wrap fade-in stack-l">
    <div class="hello"><div class="page-head" style="margin-bottom:0"><div class="kicker">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${esc(hello)}${p.nome ? `, <em>${esc(p.nome)}</em>` : ''}.</h1></div></div>
    ${Store.configured && !Store.user ? `<div class="banner"><span style="font-size:1.4rem">☁</span><div class="grow">Entre na sua conta para sincronizar o progresso entre celular e computador.</div><button class="btn sm" data-goto="ajustes">Entrar</button></div>` : ''}
    ${!ls.length ? emptyLang(lang) : ''}
    ${doing ? `<button class="card hero-lesson lesson-card" data-open="${esc(doing.id)}">
      <div class="grow"><div class="caps">${lessonProg(doing.id) ? 'Continuar' : 'Próxima lição'}${doing.meta.unidade ? ' · ' + esc(doing.meta.unidade) : ''}</div>
      <div class="h">${esc(doing.titulo)}</div>${doing.meta.descricao ? `<div class="small" style="margin-top:4px">${inline(doing.meta.descricao, { gloss: false })}</div>` : ''}
      <div class="progress" style="margin-top:12px;background:rgba(255,255,255,.5)"><i style="width:${lessonPct(doing)}%"></i></div></div>
      <span class="btn primary">${lessonProg(doing.id) ? 'Continuar' : 'Começar'} →</span></button>` : ''}
    <div class="grid g2">
      <div class="card row nowrap" style="gap:20px"><div class="ring" style="--p:${pct}"><div><div><b>${rec.min}</b><span class="tiny muted">de ${goal} min</span></div></div></div>
        <div class="stack-s"><div class="caps muted">Meta de hoje</div><div>${pct >= 100 ? 'Meta cumprida. <i>Très bien !</i>' : rec.min ? 'Bom ritmo, continue.' : 'Que tal começar com uma revisão curtinha?'}</div>
        <div class="small muted">${st ? `Sequência de <b>${plural(st, 'dia')}</b>` : 'Comece sua sequência hoje'}</div></div></div>
      <button class="card deck-card row nowrap" data-goto="cartoes" style="gap:18px"><div class="n" style="color:var(--rose-d)">${due}</div><div><div class="caps muted">Revisão do dia</div><div>${due ? plural(due, 'cartão esperando', 'cartões esperando') : 'Nada pendente ✿'}</div></div></button>
    </div>
    ${ls.length ? `<div class="grid g2">
      <a class="card deck-card row nowrap" href="#revisao" style="gap:16px;text-decoration:none;${mixN ? '' : 'opacity:.55;pointer-events:none'}"><div style="font-size:1.8rem;color:var(--lav-d)">↺</div><div><div class="caps muted">Revisão misturada</div><div>${mixN ? 'Exercícios das lições anteriores, misturados' : 'Libera depois da primeira lição'}</div></div></a>
      ${!place && placeable ? `<a class="card deck-card row nowrap" href="#nivelamento" style="gap:16px;text-decoration:none"><div style="font-size:1.8rem;color:var(--rose-d)">◎</div><div><div class="caps muted">Teste de nivelamento</div><div>Descubra por qual nível começar</div></div></a>`
        : `<a class="card deck-card row nowrap" href="#biblioteca" style="gap:16px;text-decoration:none"><div style="font-size:1.8rem;color:var(--sage-d)">❧</div><div><div class="caps muted">Biblioteca</div><div>${!lib.length ? 'Textos para ler com calma' : lib.length - libRead ? plural(lib.length - libRead, 'texto para ler', 'textos para ler') : 'Tudo lido ✓ — que tal um texto novo?'}</div></div></a>`}
    </div>` : ''}
    <div class="grid g4">
      <div class="card stat"><div class="v">${done}<span class="small muted">/${ls.length}</span></div><div class="k">lições concluídas</div></div>
      <div class="card stat"><div class="v">${seen}</div><div class="k">palavras vistas</div></div>
      <div class="card stat"><div class="v">${mastered}</div><div class="k">palavras dominadas</div></div>
      <div class="card stat"><div class="v">${stats.ex ? Math.round((stats.ok / stats.ex) * 100) + '%' : '—'}</div><div class="k">acertos em exercícios</div></div>
    </div>
    <div class="card"><div class="row between" style="margin-bottom:12px"><div class="caps muted">Constância · 16 semanas</div><div class="tiny muted">${Object.values(D).reduce((a, r) => a + (r.min || 0), 0)} min no total</div></div>
      <div class="heat">${days.map((d) => { const k = dayKey(d); return `<i class="l${lvl(k)} ${k === todayK ? 'today' : ''}" title="${d.toLocaleDateString('pt-BR')}: ${D[k]?.min || 0} min"></i>`; }).join('')}</div></div>
    ${phrase ? `<div class="card soft row nowrap" style="gap:16px">${sayBtn(phrase.ex, { lang })}<div><div class="caps muted">Une phrase pour aujourd'hui</div><div class="phrase">${inline(phrase.ex, { gloss: false })}</div>${phrase.exPt ? `<div class="muted small">${inline(phrase.exPt, { gloss: false })}</div>` : ''}</div></div>` : ''}
  </div>`;
  v.querySelector('[data-open]')?.addEventListener('click', (e) => go('#licao/' + e.currentTarget.dataset.open));
}

// ---------------------------------------------------------------
//  Trilha
// ---------------------------------------------------------------
function renderTrail(v, params) {
  const lang = Store.state.perfil.idioma;
  const all = lessonsOf(lang);
  const temas = [...new Set(all.flatMap((L) => L.meta.temas))].sort((a, b) => a.localeCompare(b, 'pt'));
  const grams = [...new Set(all.flatMap((L) => L.meta.gramatica))].sort((a, b) => a.localeCompare(b, 'pt'));
  const ls = all.filter((L) => (!TF.tema || L.meta.temas.includes(TF.tema)) && (!TF.gram || L.meta.gramatica.includes(TF.gram)));
  const filtering = TF.tema || TF.gram;
  const editing = TF.edit && Store.isAdmin && !filtering;
  const levels = {};
  ls.forEach((L) => (levels[L.nivel] ||= []).push(L));
  if (editing) levelDocs().filter((D) => D.lang === lang && !levels[D.nivel]).forEach((D) => (levels[D.nivel] = []));
  const order = Object.keys(levels).sort((a, b) => levelIndex(a) - levelIndex(b));
  const place = Store.state.progresso.nivelamento?.[lang];
  const placeable = new Set(all.filter((L) => L.nivel).map((L) => L.nivel)).size > 1;
  const provas = Store.state.progresso.provas || {};
  const units = [...new Set(all.map((L) => L.meta.unidade).filter(Boolean))];
  const ring = (pct) => pct > 0 && pct < 100 ? `<svg viewBox="0 0 60 60" width="60" height="60"><circle cx="30" cy="30" r="28" fill="none" stroke="var(--butter-d)" stroke-width="2.5" stroke-dasharray="${(pct / 100) * 176} 176" transform="rotate(-90 30 30)" stroke-linecap="round"/></svg>` : '';
  const sel = (name, opts, label) => `<select class="select" data-tf="${name}"><option value="">${label}</option>${opts.map((o) => `<option value="${esc(o)}" ${TF[name] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;

  v.innerHTML = `<div class="narrow fade-in"><div class="page-head"><div class="kicker">Trilha · ${esc(langInfo(lang).nome)}</div><h1>Seu <em class="it">caminho</em></h1>
    <p>${editing ? 'Modo de edição: mude o nível, a unidade e a ordem das aulas, renomeie unidades e edite os objetivos e o marco de cada nível.' : 'As lições separadas por nível. Abra qualquer uma e pule para qualquer parte.'}</p></div>
    ${all.length ? `<div class="filters" style="margin-bottom:22px">${!editing && temas.length ? sel('tema', temas, 'Todos os temas') : ''}${!editing && grams.length ? sel('gram', grams, 'Todos os tópicos gramaticais') : ''}
      ${Store.isAdmin ? `<button class="btn sm ${TF.edit ? 'primary' : ''}" data-edittrail ${filtering ? 'disabled title="Limpe os filtros para editar"' : ''}>${TF.edit ? '✓ Pronto' : '✎ Editar trilha'}</button>` : ''}</div>` : ''}
    ${!editing && all.length && placeable ? (place ? `<div class="banner" style="background:var(--sage);margin-bottom:20px"><span style="font-size:1.3rem">◎</span><div class="grow">Seu nível sugerido: <b>${place.nivel}</b> · ${esc(levelInfoOf(lang, place.nivel).nome || LEVEL_NAMES[place.nivel])}</div><a class="btn sm" href="#nivelamento">Refazer teste</a></div>`
      : `<div class="banner" style="margin-bottom:20px"><span style="font-size:1.3rem">◎</span><div class="grow">Não sabe por onde começar? Faça o <b>teste de nivelamento</b>.</div><a class="btn sm primary" href="#nivelamento">Fazer teste</a></div>`) : ''}
    ${!all.length ? emptyLang(lang) : !ls.length ? `<div class="card empty">Nenhuma lição com esse filtro.</div>` : ''}
    ${editing ? `<datalist id="units-list">${units.map((u) => `<option value="${esc(u)}">`).join('')}</datalist>` : ''}
    ${order.map((lv) => {
      const list = levels[lv];
      const info = levelInfoOf(lang, lv);
      const done = list.filter((L) => lessonProg(L.id)?.status === 'concluida').length;
      let lastUnit = null;
      const pr = provas[lang + '|' + lv];
      const nEx = lv ? exercisesOf(all.filter((L) => L.nivel === lv)).length : 0;
      return `<div class="unit" id="nivel-${lv || 'extra'}"><div class="unit-head">${lv ? `<span class="lvl">${lv}</span>` : '<span class="lvl extra">✦</span>'}<h2>${esc(info.nome || LEVEL_NAMES[lv])}</h2><span class="line"></span><span class="small muted">${done}/${list.length}</span></div>
        ${info.descricao ? `<p class="small muted" style="margin:-8px 0 8px">${inline(info.descricao, { gloss: false })}</p>` : ''}
        <details class="goals" ${editing ? 'open' : ''}><summary>${lv ? 'Ao fim deste nível você consegue…' : 'Sobre os extras'}</summary><ul>${info.objetivos.map((g) => `<li>${inline(g, { gloss: false })}</li>`).join('')}</ul>
          ${info.marco ? `<div class="marco"><b>⚑ Marco de conclusão:</b> ${inline(info.marco, { gloss: false })}</div>` : ''}
          ${info.complementos.length ? `<div style="margin-top:8px"><b class="small">Conteúdos complementares</b><ul>${info.complementos.map((g) => `<li>${inline(g, { gloss: false })}</li>`).join('')}</ul></div>` : ''}</details>
        <div class="level-head-actions">
          ${editing ? `<button class="btn xs lav" data-editlevel="${lv}">✎ Editar nível (nome, objetivos, marco)</button>` : ''}
          ${!editing && lv && nEx >= 3 && !filtering ? `${pr ? `<span class="status ${pr.passou ? 'dominada' : 'aprendendo'}">Prova: ${pr.nota}%${pr.passou ? ' ✓ aprovado' : ''}</span>` : ''}<a class="btn xs ${done === list.length && list.length && !pr?.passou ? 'primary' : ''}" href="#prova/${lv}">${pr ? 'Refazer prova do ' + lv : 'Prova do nível ' + lv}</a>` : ''}
        </div>
        <div class="stack-s">${!list.length ? '<div class="small muted">Nenhuma aula neste nível ainda.</div>' : ''}${list.map((L, i) => {
          const p = lessonProg(L.id); const pct = lessonPct(L);
          const cls = p?.status === 'concluida' ? 'done' : p ? 'doing' : '';
          const unitHead = L.meta.unidade && L.meta.unidade !== lastUnit ? `<div class="unit-sub row between">${esc((lastUnit = L.meta.unidade))}${editing ? `<button class="btn ghost xs" data-renameunit="${esc(L.meta.unidade)}">renomear unidade</button>` : ''}</div>` : '';
          if (!L.meta.unidade) lastUnit = null;
          return `${unitHead}<div class="card lesson-card ${editing ? 'editing' : ''}" role="button" tabindex="0" data-open="${esc(L.id)}" style="flex-wrap:wrap">
            <div class="lesson-num ${cls}">${ring(pct)}${cls === 'done' ? '✓' : i + 1}</div>
            <div class="grow"><div class="t">${L.codigoAula ? `<span class="muted small" style="font-family:var(--serif)">${esc(L.codigoAula)}</span> ` : ''}${esc(L.titulo)}</div>
            <div class="small muted">${L.meta.tempo ? '≈ ' + L.meta.tempo + ' min · ' : ''}${plural(L.parsed.blocks.length, 'parte')}${p?.melhor != null && p.status === 'concluida' ? ' · melhor ' + p.melhor + '%' : ''}</div>
            <div class="blocks-mini">${L.meta.temas.map((t) => `<span class="tag-tema">${esc(t)}</span>`).join('')}${L.meta.gramatica.map((t) => `<span class="tag-gram">§ ${esc(t)}</span>`).join('')}</div></div>
            ${editing ? '' : '<span class="muted">→</span>'}
            ${editing ? `<div class="edit-row"><div class="ctrls">
                <label class="small muted">Nível <select data-setlvl="${esc(L.id)}">${[...LEVELS, ''].map((x) => `<option value="${x}" ${x === L.nivel ? 'selected' : ''}>${x || 'Extras'}</option>`).join('')}</select></label>
                <label class="small muted">Unidade <input data-setunit="${esc(L.id)}" list="units-list" value="${esc(L.meta.unidade || '')}" placeholder="(nenhuma)" size="14"></label>
              </div><div class="ctrls">
                <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="topo" ${i === 0 ? 'disabled' : ''} title="Mover para o início do nível">⤒</button>
                <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Subir">↑</button>
                <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="1" ${i === list.length - 1 ? 'disabled' : ''} title="Descer">↓</button>
                <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="fim" ${i === list.length - 1 ? 'disabled' : ''} title="Mover para o fim do nível">⤓</button>
                <button class="btn xs" data-editlesson="${esc(L.id)}">✎ Editar aula</button></div></div>` : ''}
          </div>`;
        }).join('')}</div></div>`;
    }).join('')}
  </div>`;
  v.querySelectorAll('[data-tf]').forEach((s) => (s.onchange = () => { TF[s.dataset.tf] = s.value; TF.edit = false; renderTrail(v); }));
  if (params?.nivel) setTimeout(() => document.getElementById('nivel-' + params.nivel)?.scrollIntoView({ behavior: 'smooth' }), 80);
  v.querySelector('[data-edittrail]')?.addEventListener('click', () => { TF.edit = !TF.edit; renderTrail(v); });
  const keep = (fn) => async (...a) => { const y = scrollY; await fn(...a); renderTrail(v); scrollTo(0, y); };
  v.querySelectorAll('[data-open]').forEach((b) => {
    b.onclick = (e) => {
      if (editing) {
        const m = e.target.closest('[data-mv]'); if (m) { const d = m.dataset.d; keep(moveLesson)(m.dataset.mv, d === 'topo' || d === 'fim' ? d : +d); return; }
        const ed = e.target.closest('[data-editlesson]'); if (ed) { go('#estudio', { edit: ed.dataset.editlesson }); return; }
        return;
      }
      go('#licao/' + b.dataset.open);
    };
    b.onkeydown = (e) => { if (e.key === 'Enter' && !editing && e.target === b) go('#licao/' + b.dataset.open); };
  });
  v.querySelectorAll('[data-setlvl]').forEach((s) => (s.onchange = keep(async () => {
    const L = lessonById(s.dataset.setlvl);
    await patchLessonMeta(L, { nivel: s.value || 'extra' });
    rebuild(); await placeAtEnd(L.id);
    toast(`“${L.titulo}” foi para ${s.value || 'Extras'} ✓`);
  })));
  v.querySelectorAll('[data-setunit]').forEach((inp) => (inp.onchange = keep(async () => {
    const L = lessonById(inp.dataset.setunit);
    await patchLessonMeta(L, { unidade: inp.value.trim() });
    toast('Unidade atualizada ✓');
  })));
  v.querySelectorAll('[data-renameunit]').forEach((b) => (b.onclick = (e) => {
    e.stopPropagation();
    const old = b.dataset.renameunit;
    modal(`<div class="stack"><h3>Renomear unidade</h3><input class="input" data-n value="${esc(old)}"><p class="small muted" style="margin:0">Vale para todas as aulas desta unidade (${esc(langInfo(lang).nome)}).</p>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Renomear</button></div></div>`, (m, close) => {
      m.querySelector('[data-ok]').onclick = keep(async () => {
        const nv = m.querySelector('[data-n]').value.trim();
        close();
        for (const L of all.filter((x) => x.meta.unidade === old)) await patchLessonMeta(L, { unidade: nv });
        toast('Unidade renomeada ✓');
      });
    });
  }));
  v.querySelectorAll('[data-editlevel]').forEach((b) => (b.onclick = () => editLevel(lang, b.dataset.editlevel, () => renderTrail(v))));
}
const TF = { tema: '', gram: '', edit: false };

/** Reescreve metadados de uma aula e salva (aulas do site viram uma versão editada). */
async function patchLessonMeta(L, changes) {
  let code = L.codigo;
  for (const [k, val] of Object.entries(changes)) code = setMeta(code, k, val);
  const target = L.origem === 'arquivo' ? Store.lessonTarget : L.origem;
  await S.saveLesson({ id: L.id, titulo: Store.lessons[L.origem]?.[L.id]?.titulo || '', codigo: code }, target);
}

/** Editor do nível: nome, descrição, objetivos, marco de conclusão e conteúdos complementares. */
function editLevel(lang, lv, done) {
  const info = levelInfoOf(lang, lv);
  const D = info.doc;
  modal(`<div class="stack"><h2>${lv ? 'Nível ' + lv : 'Extras'} · ${esc(langInfo(lang).nome)}</h2>
    <div><label class="lbl">Nome do nível</label><input class="input" data-f="nome" value="${esc(info.nome)}" placeholder="${esc(LEVEL_NAMES[lv])}"></div>
    <div><label class="lbl">Descrição curta (opcional)</label><input class="input" data-f="desc" value="${esc(info.descricao)}"></div>
    <div><label class="lbl">Objetivos — um por linha</label><textarea class="textarea" data-f="obj" style="min-height:110px">${esc(info.objetivos.join('\n'))}</textarea></div>
    <div><label class="lbl">Marco de conclusão</label><textarea class="textarea" data-f="marco" style="min-height:70px" placeholder="ex.: conseguir produzir uma breve apresentação pessoal…">${esc(info.marco)}</textarea></div>
    <div><label class="lbl">Conteúdos complementares — um por linha</label><textarea class="textarea" data-f="comp" style="min-height:90px" placeholder="ex.: Alfabeto francês e nomes das letras">${esc(info.complementos.join('\n'))}</textarea></div>
    <div class="row between">${D ? '<button class="btn ghost sm danger" data-reset>Voltar ao padrão</button>' : '<span></span>'}<div class="row"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div></div></div>`, (m, close) => {
    const val = (k) => m.querySelector(`[data-f="${k}"]`).value.trim();
    const lines = (k) => val(k).split('\n').map((x) => x.replace(/^\s*[-•·]\s*/, '').trim()).filter(Boolean);
    m.querySelector('[data-ok]').onclick = async () => {
      const code = [`@tipo: nivel`, `@idioma: ${lang}`, `@nivel: ${lv || 'extra'}`, val('nome') ? `@titulo: ${val('nome')}` : '', val('desc') ? `@descricao: ${val('desc')}` : '', '',
        '== OBJETIVOS', ...lines('obj').map((x) => '- ' + x), '',
        ...(val('marco') ? ['== MARCO', val('marco'), ''] : []),
        ...(lines('comp').length ? ['== COMPLEMENTOS', ...lines('comp').map((x) => '- ' + x)] : [])].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
      const target = !D || D.origem === 'arquivo' ? Store.lessonTarget : D.origem;
      await S.saveLesson({ id: D?.id || `nivel-${lang}-${lv || 'extra'}`, titulo: '', codigo: code }, target);
      close(); toast('Nível atualizado ✓'); done?.();
    };
    m.querySelector('[data-reset]')?.addEventListener('click', async () => {
      if (D.origem === 'arquivo') return toast('Este nível vem de um arquivo do site — edite pelo GitHub.');
      await S.deleteLesson(D.id, D.origem); close(); toast('Nível voltou ao padrão'); done?.();
    });
  });
}
function emptyLang(lang) {
  return `<div class="card empty stack"><span class="orn">❦</span><div>Ainda não há lições de ${esc(langInfo(lang).nome.toLowerCase())}.</div>
    <div class="row" style="justify-content:center"><button class="btn primary" data-goto="estudio">Criar uma lição</button><button class="btn" data-studio-tab="prompt">Gerar com IA</button><button class="btn" data-studio-tab="licoes">Importar lições</button></div></div>`;
}

// ---------------------------------------------------------------
//  Dicionário
// ---------------------------------------------------------------
const DF = { q: '', status: '', licao: '', tema: '', classe: '', nivel: '', view: 'lista' };
function renderDict(v) {
  const lang = Store.state.perfil.idioma;
  const all = dictOf(lang).sort((a, b) => sortKey(a.fr).localeCompare(sortKey(b.fr), 'fr'));
  const ls = lessonsOf(lang);
  const temas = [...new Set(all.flatMap((e) => [...e.temas, ...e.subtemas]))].sort((a, b) => a.localeCompare(b, 'pt'));
  const classes = [...new Set(all.map((e) => e.classe).filter(Boolean))].sort();
  const niveis = [...new Set(all.flatMap((e) => [...(e.niveis || [])]))].sort((a, b) => levelIndex(a) - levelIndex(b));
  const seenN = all.filter((e) => cardStatus(e.key) !== 'nova').length;
  const sel = (name, opts, label) => `<select class="select" data-f="${name}"><option value="">${label}</option>${opts.map(([val, t]) => `<option value="${esc(val)}" ${DF[name] === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  v.innerHTML = `<div class="${DF.view === 'galeria' ? 'wrap' : 'narrow'} fade-in"><div class="page-head"><div class="kicker">Dicionário · ${esc(langInfo(lang).nome)}</div><h1>Todas as <em class="it">palavras</em></h1>
    <p>${plural(all.length, 'palavra')} das suas lições · <b>${seenN}</b> já vistas.</p></div>
    <div class="row nowrap search-row" style="margin-bottom:12px"><input class="input grow" data-q placeholder="Buscar em ${esc(langInfo(lang).nome.toLowerCase())} ou português…" value="${esc(DF.q)}">
      <div class="seg" data-view><button data-v="lista" class="${DF.view === 'lista' ? 'on' : ''}" title="Lista">☰ Lista</button><button data-v="galeria" class="${DF.view === 'galeria' ? 'on' : ''}" title="Galeria">▦ Galeria</button></div></div>
    <div class="filters">${sel('status', [['vistas', 'já vistas'], ['nova', 'não vistas'], ['aprendendo', 'aprendendo'], ['revisando', 'revisando'], ['dominada', 'dominadas'], ['salva', 'salvas por mim']], 'Vistas e não vistas')}
      ${niveis.length ? sel('nivel', niveis.map((n) => [n, n + ' · ' + LEVEL_NAMES[n]]), 'Todos os níveis') : ''}
      ${sel('licao', ls.map((l) => [l.id, (l.nivel ? l.nivel + ' · ' : '') + l.titulo]), 'Todas as aulas')}${sel('tema', temas.map((t) => [t, t]), 'Todos os temas')}${classes.length ? sel('classe', classes.map((c) => [c, c]), 'Todas as classes') : ''}
      <button class="btn ghost xs" data-clear>limpar filtros</button></div>
    <div class="row between" style="margin-top:10px"><div class="small muted" data-n></div>${Store.state.perfil.generoCores !== false ? '<div class="g-legend tiny"><span class="g-m">masculino</span><span class="g-f">feminino</span><span class="g-n">neutro</span></div>' : ''}</div>
    <div data-list></div></div>`;
  const list = v.querySelector('[data-list]');
  const norm = (s) => plain(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const draw = () => {
    const q = norm(DF.q.trim());
    const items = all.filter((e) => {
      const st = cardStatus(e.key);
      if (DF.status === 'vistas' && st === 'nova') return false;
      if (DF.status && !['vistas', 'salva'].includes(DF.status) && st !== DF.status) return false;
      if (DF.status === 'salva' && !e.salva) return false;
      if (DF.nivel && !e.niveis?.has(DF.nivel)) return false;
      if (DF.licao && !e.licoes.includes(DF.licao)) return false;
      if (DF.tema && !e.temas.has(DF.tema) && !e.subtemas.has(DF.tema)) return false;
      if (DF.classe && e.classe !== DF.classe) return false;
      return !q || norm(e.fr).includes(q) || norm(e.pt).includes(q);
    });
    v.querySelector('[data-n]').textContent = items.length === all.length ? '' : `${plural(items.length, 'palavra')} com esses filtros`;
    if (!items.length) { list.innerHTML = `<div class="empty">Nada encontrado.</div>`; return; }
    if (DF.view === 'galeria') {
      list.innerHTML = `<div class="dict-grid">${items.map((e) => { const st = cardStatus(e.key); return `<div class="card dict-tile ${st === 'nova' ? 'unseen' : ''}" data-k="${esc(e.key)}" role="button" tabindex="0">
        <div class="pic">${e.img ? imgHtml(e.img, { alt: plain(e.fr) }) : `<span class="ini">${esc((sortKey(e.fr)[0] || '·').toUpperCase())}</span>`}</div>
        <div class="fr${gcls(e)}">${inline(e.fr, { gloss: false })}</div><div class="pt">${inline(e.pt, { gloss: false })}</div>
        <div class="row between" style="margin-top:6px"><span class="status ${st}">${STATUS_LABEL[st]}</span>${sayBtn(e.fr, { lang, size: 'sm' })}</div></div>`; }).join('')}</div>`;
      return;
    }
    let last = '';
    list.innerHTML = items.map((e) => {
      const L = (sortKey(e.fr)[0] || '#').toUpperCase();
      const head = L !== last ? `<div class="dict-letter">${(last = L)}</div>` : '';
      const st = cardStatus(e.key);
      return `${head}<div class="dict-item ${st === 'nova' ? 'unseen' : ''}" data-k="${esc(e.key)}"><div class="thumb">${e.img ? imgHtml(e.img, { alt: plain(e.fr) }) : '<span class="muted" style="font-size:.9rem">' + esc(L) + '</span>'}</div>
        <div class="grow"><div class="fr${gcls(e)}">${inline(e.fr, { gloss: false })}</div><div class="pt">${inline(e.pt, { gloss: false })}${e.classe ? ` <span class="tiny muted">· ${esc(e.classe)}</span>` : ''}${e.nivel ? ` <span class="tiny muted">· ${e.nivel}</span>` : ''}</div></div>
        <span class="status ${st}">${STATUS_LABEL[st]}</span>${sayBtn(e.fr, { lang, size: 'sm' })}</div>`;
    }).join('');
  };
  v.querySelector('[data-q]').oninput = (e) => { DF.q = e.target.value; draw(); };
  v.querySelectorAll('[data-f]').forEach((s) => (s.onchange = () => { DF[s.dataset.f] = s.value; draw(); }));
  v.querySelector('[data-clear]').onclick = () => { Object.assign(DF, { q: '', status: '', licao: '', tema: '', classe: '', nivel: '' }); renderDict(v); };
  v.querySelector('[data-view]').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { DF.view = b.dataset.v; renderDict(v); } };
  list.onclick = (ev) => {
    if (ev.target.closest('[data-say]')) return;
    const it = ev.target.closest('[data-k]'); if (!it) return;
    const e = DICT.get(it.dataset.k);
    const st = cardStatus(e.key); const c = Store.state.srs.cards[e.key];
    modal(`<div class="stack">${e.img ? `<div class="dict-pic">${imgHtml(e.img, { alt: plain(e.fr) })}</div>` : ''}
      <div class="row nowrap between"><h2 style="font-size:2rem" class="${gcls(e)}">${inline(e.fr, { gloss: false })}</h2><div class="row">${sayBtn(e.fr, { lang })}${sayBtn(e.fr, { lang, speed: 'lenta', icon: '½' })}<button class="icon-btn" data-rec="${esc(plain(e.fr))}" data-lang="${esc(lang)}" title="Gravar minha voz">🎙</button></div></div>
      <div style="font-size:1.2rem">${inline(e.pt, { gloss: false })}</div>
      <div class="row">${e.nivel ? `<span class="chip lav">${e.nivel}</span>` : ''}${e.classe ? `<span class="chip">${esc(e.classe)}</span>` : ''}<span class="status ${st}">${STATUS_LABEL[st]}</span>${c ? `<span class="tiny muted">próxima revisão: ${c.d <= Date.now() ? 'hoje' : fmtDate(c.d)}</span>` : ''}</div>
      ${e.ex ? `<div class="ex-line">${sayBtn(e.ex, { lang, size: 'sm' })}<div><div class="fr">${inline(e.ex, { gloss: false })}</div>${e.exPt ? `<div class="pt">${inline(e.exPt, { gloss: false })}</div>` : ''}</div></div>` : ''}
      ${e.nota ? `<div class="callout tip"><span class="ic">✧</span><div>${inline(e.nota, { gloss: false })}</div></div>` : ''}
      <div class="small muted">Aprendida em: ${e.licoes.map((id) => lessonById(id)).filter(Boolean).map((L) => `<a href="#licao/${esc(L.id)}" data-close>${esc(L.titulo)}</a>`).join(', ') || '—'}${e.temas.size || e.subtemas.size ? `<br>Temas: ${[...e.temas, ...e.subtemas].map(esc).join(', ')}` : ''}</div>
      ${e.salva ? `<div><button class="btn sm ghost danger" data-unsave>Remover das minhas palavras salvas</button></div>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Fechar</button></div></div>`, (m, close) => {
      m.querySelector('[data-unsave]')?.addEventListener('click', () => { delete Store.state.caderno.salvas[e.key]; save('caderno'); rebuild(); close(); route(); });
    });
  };
  list.onkeydown = (ev) => { if (ev.key === 'Enter' && ev.target.matches('[data-k]')) ev.target.click(); };
  draw();
}

// ---------------------------------------------------------------
//  Caderno
// ---------------------------------------------------------------
let ctab = 'erros';
function renderNotebook(v) {
  const C = Store.state.caderno, lang = Store.state.perfil.idioma;
  const erros = C.erros.filter((e) => (e.lang || 'fr') === lang).map((e) => ({ ...e, ex: typeof e.ex === 'string' ? JSON.parse(e.ex) : e.ex }));
  const escritas = Object.entries(C.escritas).filter(([, w]) => w.texto?.trim()).sort((a, b) => b[1].t - a[1].t);
  const salvas = Object.entries(C.salvas).filter(([, s]) => (s.lang || 'fr') === lang);
  const frases = Object.entries(C.frases || {}).filter(([, f]) => (f.lang || 'fr') === lang).sort((a, b) => b[1].t - a[1].t);
  v.innerHTML = `<div class="narrow fade-in"><div class="page-head"><div class="kicker">Caderno</div><h1>Seu <em class="it">caderno</em></h1><p>Erros para revisar, seus textos e as palavras que você salvou.</p></div>
    <div class="seg" style="margin-bottom:20px"><button data-t="erros" class="${ctab === 'erros' ? 'on' : ''}">Erros (${erros.length})</button><button data-t="escritas" class="${ctab === 'escritas' ? 'on' : ''}">Escritas (${escritas.length})</button><button data-t="frases" class="${ctab === 'frases' ? 'on' : ''}">Frases (${frases.length})</button><button data-t="salvas" class="${ctab === 'salvas' ? 'on' : ''}">Palavras (${salvas.length})</button></div>
    <div data-b></div></div>`;
  v.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { ctab = b.dataset.t; renderNotebook(v); }));
  const b = v.querySelector('[data-b]');
  if (ctab === 'erros') {
    b.innerHTML = erros.length ? `<div class="row between" style="margin-bottom:14px"><span class="muted small">Acertou na revisão? O item sai do caderno.</span><button class="btn primary" data-redo>Refazer ${erros.length > 12 ? '12 erros' : 'todos'}</button></div>
      ${erros.map((e, i) => `<div class="card" style="margin-bottom:10px"><div class="row between"><span class="chip butter">${esc(EX_LABELS[e.ex.type] || '')}</span><span class="tiny muted">${esc(e.titulo || '')} · ${fmtDate(e.t)}</span></div>
        <div style="margin:8px 0 4px;font-size:1.1rem">${inline(e.ex.prompt || e.ex.text?.replace(/\[\[\d+\]\]/g, '___') || '', { gloss: false })}</div>
        <div class="small">Você: <span style="color:var(--bad)">${esc(e.dado || '—')}</span> · ${exAnswerSummary(e.ex)}</div>
        <div style="text-align:right"><button class="btn ghost xs" data-rm="${i}">remover</button></div></div>`).join('')}`
      : `<div class="card empty"><span class="orn">✿</span>Nenhum erro guardado. Os exercícios que você errar nas lições aparecem aqui.</div>`;
    b.querySelector('[data-redo]')?.addEventListener('click', () => {
      const batch = erros.slice(0, 12);
      v.innerHTML = `<div class="narrow"><div class="lesson-top"><button class="icon-btn" data-x>✕</button><div class="grow caps muted">Revisão de erros</div></div><div class="card block-card" data-run data-busy></div></div>`;
      v.querySelector('[data-x]').onclick = () => renderNotebook(v);
      runExercises(v.querySelector('[data-run]'), batch.map((e) => e.ex), {
        lang, retryWrong: false,
        onAnswer: (it, ok) => { if (ok) { const k = batch.find((e) => e.ex === it); C.erros = C.erros.filter((x) => x.id !== k.id); save('caderno'); } },
        onDone: () => { const r = v.querySelector('[data-run]'); r.insertAdjacentHTML('beforeend', `<div style="text-align:center"><button class="btn" data-back>Voltar ao caderno</button></div>`); r.querySelector('[data-back]').onclick = () => renderNotebook(v); },
      });
    });
    b.querySelectorAll('[data-rm]').forEach((x) => (x.onclick = () => { const e = erros[+x.dataset.rm]; C.erros = C.erros.filter((y) => y.id !== e.id); save('caderno'); renderNotebook(v); }));
  } else if (ctab === 'escritas') {
    b.innerHTML = escritas.length ? escritas.map(([k, w]) => `<div class="card stack-s" style="margin-bottom:12px"><div class="row between"><b>${esc(w.titulo || 'Lição')}</b><span class="tiny muted">${fmtDate(w.t)}</span></div>
      ${w.enunciado ? `<div class="small muted">${inline(w.enunciado, { gloss: false })}</div>` : ''}<div style="white-space:pre-wrap;font-size:1.08rem">${esc(w.texto)}</div>
      <div class="row" style="justify-content:flex-end">${sayBtn(w.texto, { lang, size: 'sm' })}<button class="btn ghost xs danger" data-delw="${esc(k)}">apagar</button></div></div>`).join('')
      : `<div class="card empty"><span class="orn">✒</span>Seus textos dos blocos de ESCRITA aparecem aqui.</div>`;
    b.querySelectorAll('[data-delw]').forEach((x) => (x.onclick = async () => { if (await confirmBox('Apagar este texto?', { ok: 'Apagar', danger: true })) { delete C.escritas[x.dataset.delw]; save('caderno'); renderNotebook(v); } }));
  } else if (ctab === 'frases') {
    b.innerHTML = frases.length ? `<div class="row between" style="margin-bottom:12px"><span class="small muted">Treine em Cartões › Frases.</span><button class="btn sm primary" data-goto="cartoes">Treinar frases</button></div><div class="card">${frases.map(([k, f]) => `<div class="dict-item" style="cursor:default"><div class="grow"><div style="font-size:1.1rem">${esc(f.fr)}</div>${f.pt ? `<div class="pt small">${esc(f.pt)}</div>` : ''}<div class="tiny muted">${esc(f.titulo || '')}</div></div>${sayBtn(f.fr, { lang, size: 'sm' })}<button class="btn ghost xs danger" data-delf="${esc(k)}">remover</button></div>`).join('')}</div>`
      : `<div class="card empty"><span class="orn">❀</span>Nos textos, escutas e na biblioteca, toque em ＋ para guardar uma frase.</div>`;
    b.querySelectorAll('[data-delf]').forEach((x) => (x.onclick = () => { delete C.frases[x.dataset.delf]; save('caderno'); renderNotebook(v); }));
  } else {
    b.innerHTML = salvas.length ? `<div class="card">${salvas.map(([k, s]) => `<div class="dict-item" style="cursor:default"><div class="grow"><div class="fr">${esc(s.fr)}</div><div class="pt">${esc(s.pt)}</div></div>${sayBtn(s.fr, { lang, size: 'sm' })}<button class="btn ghost xs danger" data-dels="${esc(k)}">remover</button></div>`).join('')}</div>`
      : `<div class="card empty"><span class="orn">❀</span>Nos textos, toque numa palavra destacada e em “Salvar nos meus cartões”.</div>`;
    b.querySelectorAll('[data-dels]').forEach((x) => (x.onclick = () => { delete C.salvas[x.dataset.dels]; save('caderno'); rebuild(); renderNotebook(v); }));
  }
}

// ---------------------------------------------------------------
//  Ajustes
// ---------------------------------------------------------------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (current === 'ajustes' || current === 'hoje') shell(); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

function renderSettings(v) {
  const p = Store.state.perfil, lang = p.idioma;
  const langs = languages();
  const voices = TTS.voicesFor(lang);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const seg = (name, opts) => `<div class="seg" data-seg="${name}">${opts.map(([v2, l]) => `<button data-v="${v2}" class="${String(p[name]) === String(v2) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  let account;
  if (!Store.configured) account = `<p style="margin:0">A sincronização ainda não foi ligada. Enquanto isso, tudo fica salvo <b>neste aparelho</b>.</p>
      <p class="small muted" style="margin:0">Para sincronizar celular e computador: crie um projeto gratuito no Firebase, ative o login com Google e o Firestore, e cole a configuração no arquivo <code>js/config.js</code>. O passo a passo está no README do repositório.</p>`;
  else if (!Store.user) account = `<p style="margin:0">Entre para sincronizar seu progresso em todos os aparelhos.</p>
      <div class="row"><button class="btn primary" data-google>Entrar com Google</button><button class="btn" data-emailbox>Entrar com e-mail</button></div>
      <form data-emailform hidden class="stack-s"><input class="input" type="email" name="email" placeholder="e-mail" autocomplete="email" required><input class="input" type="password" name="senha" placeholder="senha (mín. 6 caracteres)" autocomplete="current-password" required minlength="6">
        <div class="row"><button class="btn primary" type="submit">Entrar</button><button class="btn" type="button" data-create>Criar conta</button><button class="btn ghost sm" type="button" data-reset>Esqueci a senha</button></div></form>
      ${Store.error ? `<p class="small" style="color:var(--bad)">${esc(Store.error)}</p>` : ''}`;
  else account = `<div class="row">${Store.user.foto ? `<img src="${esc(Store.user.foto)}" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:50%">` : ''}<div class="grow"><b>${esc(Store.user.nome || Store.user.email)}</b><div class="small muted">${esc(Store.user.email || '')}${Store.isAdmin ? ' · administradora' : ''}</div></div><button class="btn sm" data-out>Sair</button></div>
      <div class="small">${syncLabel()}</div>`;

  v.innerHTML = `<div class="narrow fade-in stack-l"><div class="page-head" style="margin-bottom:0"><div class="kicker">Ajustes</div><h1>Do seu <em class="it">jeito</em></h1></div>
    <div class="card stack"><h3>Conta e sincronização</h3>${account}</div>
    <div class="card stack"><h3>Você</h3>
      <div><label class="lbl">Seu nome</label><input class="input" data-nome value="${esc(p.nome)}" placeholder="Como quer ser chamada?"></div>
      <div><label class="lbl">Meta diária</label>${seg('meta', [[5, '5 min'], [10, '10'], [15, '15'], [20, '20'], [30, '30'], [45, '45']])}</div>
      <div><label class="lbl">Idiomas que estudo</label><div class="row">${langs.map((l) => `<span class="chip ${l === lang ? 'on' : ''}" style="padding-right:6px"><button class="btn ghost xs" style="padding:0 4px;color:inherit" data-setlang="${l}">${esc(langInfo(l).nome)}</button>${lessonsOf(l).length || langs.length < 2 ? '' : `<button class="btn ghost xs" style="padding:0 4px;color:inherit" data-rmlang="${l}" title="Remover">×</button>`}</span>`).join('')}<button class="btn sm" data-langpick>+ Adicionar idioma</button></div></div>
    </div>
    <div class="card stack"><h3>Voz da leitura · ${esc(langInfo(lang).nome)}</h3>
      ${!TTS.supported() ? '<p class="small" style="color:var(--bad)">Este navegador não tem leitura em voz alta.</p>' : `
      <div><label class="lbl">Voz</label><div class="row nowrap"><select class="select grow" data-voz><option value="">Automática — melhor disponível${voices[0] ? ` (${esc(voices[0].name)})` : ''}</option>
        ${voices.map((vo) => `<option value="${esc(vo.name)}" ${p.vozes?.[lang] === vo.name ? 'selected' : ''}>${esc(vo.name)} · ${esc(vo.lang)}</option>`).join('')}</select>
        <button class="btn" data-test>▶ Testar</button></div>
        ${voices.length ? '' : `<p class="small" style="color:var(--bad)">Nenhuma voz de ${esc(langInfo(lang).nome.toLowerCase())} instalada neste aparelho.</p>`}</div>
      <div><label class="lbl">Velocidade padrão</label>${seg('vel', TTS.SPEEDS.map((s) => [s.id, s.label]))}</div>
      <details class="small"><summary style="cursor:pointer">Como deixar a pronúncia ainda melhor</summary><ul>
        <li><b>iPhone/iPad:</b> Ajustes › Acessibilidade › Conteúdo Falado › Vozes › ${esc(langInfo(lang).nome)} › baixe uma voz “Premium” ou “Aprimorada” (ex.: Amélie, Audrey, Thomas).</li>
        <li><b>Android:</b> instale/atualize “Serviços de fala do Google” e, em Configurações › Idioma › Saída de texto para voz, baixe a voz de ${esc(langInfo(lang).nome.toLowerCase())}.</li>
        <li><b>Computador:</b> no Microsoft Edge aparecem as vozes “Natural” (as melhores); no Chrome, as vozes “Google”.</li>
        <li>O app escolhe sozinho a melhor voz do idioma de cada lição. Depois de instalar uma voz nova, recarregue a página.</li></ul></details>`}
    </div>
    <div class="card stack"><h3>Aparência e leitura</h3>
      <div><label class="lbl">Tema</label>${seg('tema', [['claro', 'Dia'], ['noite', 'Noite']])}</div>
      <div><label class="lbl">Tamanho do texto</label>${seg('fonte', [['p', 'Pequeno'], ['m', 'Médio'], ['g', 'Grande']])}</div>
      <label class="switch"><input type="checkbox" data-trad ${p.traducao ? 'checked' : ''}><span class="tg"></span>Mostrar traduções dos textos por padrão</label>
      <label class="switch"><input type="checkbox" data-gen ${p.generoCores !== false ? 'checked' : ''}><span class="tg"></span>Cores por gênero nos substantivos (<span class="g-m">masc.</span> / <span class="g-f">fem.</span> / <span class="g-n">neutro</span>)</label>
    </div>
    <div class="card stack"><h3>Instalar como app</h3>
      ${isStandalone() ? '<p style="margin:0">✓ Você já está usando o app instalado.</p>' : installEvt ? '<p style="margin:0">Instale para abrir direto da tela inicial, em tela cheia e funcionando offline.</p><div><button class="btn primary" data-install>Instalar app</button></div>'
        : isIOS ? '<p style="margin:0">No Safari, toque em <b>Compartilhar</b> (□↑) e depois em <b>Adicionar à Tela de Início</b>.</p>'
        : '<p style="margin:0">No Chrome do celular: menu <b>⋮</b> › <b>Instalar app</b> (ou “Adicionar à tela inicial”). No computador: ícone de instalar na barra de endereço.</p>'}
    </div>
    <div class="card stack"><h3>Cuidado</h3><p class="small muted" style="margin:0">Apaga progresso, cartões e caderno (as lições ficam). Faça um backup no Estúdio antes, se quiser.</p><div><button class="btn danger" data-reset-all>Zerar meu progresso</button></div></div>
  </div>`;

  const upd = (k, val) => { p[k] = val; save('perfil'); applyPrefs(); };
  v.querySelector('[data-nome]').oninput = (e) => { p.nome = e.target.value; clearTimeout(window.__nt); window.__nt = setTimeout(() => save('perfil'), 600); };
  v.querySelectorAll('[data-seg]').forEach((sg) => (sg.onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const k = sg.dataset.seg; upd(k, k === 'meta' ? +b.dataset.v : b.dataset.v);
    sg.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  v.querySelectorAll('[data-setlang]').forEach((b) => (b.onclick = () => setLanguage(b.dataset.setlang)));
  v.querySelectorAll('[data-rmlang]').forEach((b) => (b.onclick = () => { p.idiomas = (p.idiomas || []).filter((x) => x !== b.dataset.rmlang); if (p.idioma === b.dataset.rmlang) p.idioma = languages().find((x) => x !== b.dataset.rmlang) || 'fr'; save('perfil'); applyPrefs(); route(true); }));
  v.querySelector('[data-voz]')?.addEventListener('change', (e) => { p.vozes = { ...(p.vozes || {}), [lang]: e.target.value }; if (!e.target.value) delete p.vozes[lang]; save('perfil'); applyPrefs(); });
  v.querySelector('[data-test]')?.addEventListener('click', () => {
    const sample = { fr: "Bonjour ! Je m'appelle Claire et j'apprends le français avec plaisir.", es: 'Hola, me llamo Clara y estudio español.', it: 'Ciao, mi chiamo Chiara e studio italiano.', de: 'Hallo, ich heiße Klara und lerne Deutsch.', en: 'Hello, my name is Claire and I love learning English.', ja: 'こんにちは。わたしは日本語を勉強しています。' }[lang] || 'Bonjour !';
    TTS.speak(sample, { lang });
  });
  v.querySelector('[data-trad]').onchange = (e) => upd('traducao', e.target.checked);
  v.querySelector('[data-gen]').onchange = (e) => upd('generoCores', e.target.checked);
  v.querySelector('[data-install]')?.addEventListener('click', async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderSettings(v); });
  v.querySelector('[data-reset-all]').onclick = async () => { if (await confirmBox('Zerar todo o progresso? Isso não pode ser desfeito.', { ok: 'Zerar', danger: true })) { await S.resetProgress(); toast('Progresso zerado'); route(); } };
  // conta
  const err = (e) => { const m = ({ 'auth/popup-closed-by-user': 'Janela fechada antes de concluir.', 'auth/unauthorized-domain': 'Domínio não autorizado no Firebase (Authentication › Configurações › Domínios autorizados).', 'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/email-already-in-use': 'Esse e-mail já tem conta — use Entrar.', 'auth/weak-password': 'Senha muito curta (mín. 6).' })[e.code] || e.message; toast(m, 5000); };
  v.querySelector('[data-google]')?.addEventListener('click', () => S.signInGoogle().catch(err));
  v.querySelector('[data-emailbox]')?.addEventListener('click', () => { v.querySelector('[data-emailform]').hidden = false; });
  const form = v.querySelector('[data-emailform]');
  form?.addEventListener('submit', (e) => { e.preventDefault(); S.signInEmail(form.email.value, form.senha.value).catch(err); });
  v.querySelector('[data-create]')?.addEventListener('click', () => { if (form.reportValidity()) S.signInEmail(form.email.value, form.senha.value, true).catch(err); });
  v.querySelector('[data-reset]')?.addEventListener('click', () => { if (!form.email.value) return toast('Digite seu e-mail primeiro.'); S.resetPassword(form.email.value).then(() => toast('Enviamos um e-mail para redefinir a senha.')).catch(err); });
  v.querySelector('[data-out]')?.addEventListener('click', () => S.signOut());
}

// ---------------------------------------------------------------
//  Início
// ---------------------------------------------------------------
async function boot() {
  on('lessons', () => { rebuild(); applyPrefs(); if (['licao', 'leitura', 'bateria'].includes(routeName) && document.querySelector('[data-notfound]')) route(); else refreshIfIdle(); });
  on('change', (n) => { if (n === 'caderno' || n === '*') rebuild(); if (n === 'perfil' || n === '*') applyPrefs(); if (n !== 'progresso' || current === 'hoje') refreshIfIdle(); else shell(); });
  on('status', () => { shell(); if (routeName === 'ajustes' && !document.activeElement?.matches('input')) route(true); });
  on('auth', () => { rebuild(); applyPrefs(); route(); });
  TTS.onVoices(() => { if (routeName === 'ajustes' && !document.activeElement?.matches('input, select')) route(true); });
  window.addEventListener('hashchange', () => route());
  await S.init();
  rebuild(); applyPrefs(); route();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
