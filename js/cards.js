// Cartões: revisão espaçada + modos de jogo
import { plain, checkAnswer, LEVEL_NAMES, levelIndex } from './parser.js';
import { esc, inline, imgHtml, sayBtn, shuffle, plural, toast } from './util.js';
import * as TTS from './speech.js';
import { Store, save } from './store.js';
import { DICT, dictOf, lessonsOf, lessonById, cardStatus, STATUS_LABEL, rate, nextInterval, fmtInterval, dueKeys, markWrong, bump, addItem, sortKey, gcls, sentencePool } from './data.js';
import { deaccent } from './parser.js';

export const MODES = {
  cartao:  { nome: 'Cartões', desc: 'Vire e avalie o quanto lembrou. Alimenta a revisão espaçada.', ic: '❀' },
  escolha: { nome: 'Escolha rápida', desc: 'Quatro alternativas, combo a cada acerto seguido.', ic: '✦' },
  escrever:{ nome: 'Escrever', desc: 'Veja a tradução e escreva a palavra.', ic: '✒' },
  ouvir:   { nome: 'Ouvir e escrever', desc: 'Ouça a palavra e escreva o que ouviu.', ic: '♪' },
  relogio: { nome: 'Contra o relógio', desc: '60 segundos de escolha rápida. Bata seu recorde!', ic: '◷' },
  frases:  { nome: 'Frases', desc: 'Complete a palavra que falta em frases que você salvou e nos exemplos do vocabulário.', ic: '❝' },
};

let F = { licao: '', unidade: '', tema: '', classe: '', status: '', nivel: '', dir: 'fr' };
export function setFilter(f) { F = { ...F, licao: '', unidade: '', tema: '', classe: '', status: '', nivel: '', ...f }; }

function deck(lang) {
  return dictOf(lang).filter((e) =>
    (!F.licao || e.licoes.includes(F.licao)) &&
    (!F.nivel || e.niveis?.has(F.nivel)) &&
    (!F.unidade || e.unidade === F.unidade || e.licoes.some((id) => lessonById(id)?.meta.unidade === F.unidade)) &&
    (!F.tema || e.temas.has(F.tema) || e.subtemas.has(F.tema)) &&
    (!F.classe || e.classe === F.classe) &&
    (!F.status || cardStatus(e.key) === F.status || (F.status === 'salva' && e.salva)));
}

export function renderCards(view, { go }) {
  const lang = Store.state.perfil.idioma;
  const all = dictOf(lang);
  const due = dueKeys(lang);
  const frases = sentencePool(lang);
  const frasesDue = frases.filter((f) => (Store.state.srs.cards[f.key]?.d || 0) <= Date.now());
  if (!all.length && !frases.length) {
    view.innerHTML = `<div class="wrap"><div class="page-head"><div class="kicker">Cartões</div><h1>Seus cartões</h1></div>
      <div class="card empty"><span class="orn">✿</span>Ainda não há vocabulário. As palavras dos blocos <b>VOCAB</b> e <b>EXPRESSOES</b> das lições aparecem aqui.</div></div>`;
    return;
  }
  const ls = lessonsOf(lang);
  const unidades = [...new Set(ls.map((l) => l.meta.unidade).filter(Boolean))];
  const niveis = [...new Set(all.flatMap((e) => [...(e.niveis || [])]))].sort((a, b) => levelIndex(a) - levelIndex(b));
  const temas = [...new Set(all.flatMap((e) => [...e.temas, ...e.subtemas]))].sort((a, b) => a.localeCompare(b, 'pt'));
  const classes = [...new Set(all.map((e) => e.classe).filter(Boolean))].sort();
  const d = deck(lang);
  const counts = { nova: 0, vista: 0, aprendendo: 0, revisando: 0, dominada: 0 };
  all.forEach((e) => counts[cardStatus(e.key)]++);
  const sel = (name, opts, label) => `<select class="select" data-f="${name}"><option value="">${label}</option>${opts.map(([v, t]) => `<option value="${esc(v)}" ${F[name] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;

  view.innerHTML = `<div class="wrap fade-in">
    <div class="page-head"><div class="kicker">Cartões</div><h1>Memória em <em class="it">flor</em></h1>
      <p>Revisão espaçada: cada palavra volta no momento certo, antes de você esquecer.</p></div>
    <div class="grid g3">
      <button class="card deck-card" data-review style="background:linear-gradient(135deg,var(--rose),var(--peach));border:0" ${due.length ? '' : 'disabled'}>
        <div class="caps">Revisão do dia</div><div class="n">${due.length}</div><div class="small">${due.length ? 'cartões esperando por você' : 'Tudo em dia ✿ volte amanhã'}</div></button>
      <div class="card stat"><div class="v">${counts.aprendendo + counts.revisando}</div><div class="k">em aprendizado</div></div>
      <div class="card stat"><div class="v">${counts.dominada}</div><div class="k">dominadas · de ${all.length}</div></div>
    </div>
    <hr class="orn">
    <h2 style="margin-bottom:12px">Treino livre</h2>
    <div class="filters" style="margin-bottom:14px">
      ${niveis.length ? sel('nivel', niveis.map((n) => [n, n + ' · ' + LEVEL_NAMES[n]]), 'Todos os níveis') : ''}
      ${sel('licao', ls.map((l) => [l.id, (l.nivel ? l.nivel + ' · ' : '') + l.titulo]), 'Todas as lições')}
      ${unidades.length ? sel('unidade', unidades.map((u) => [u, u]), 'Todas as unidades') : ''}
      ${sel('tema', temas.map((t) => [t, t]), 'Todos os temas')}
      ${classes.length ? sel('classe', classes.map((c) => [c, c]), 'Todas as classes') : ''}
      ${sel('status', [['nova', 'não vistas'], ['vista', 'vistas'], ['aprendendo', 'aprendendo'], ['revisando', 'revisando'], ['dominada', 'dominadas'], ['salva', 'salvas por mim']], 'Qualquer status')}
      <div class="seg" data-dir><button data-d="fr" class="${F.dir === 'fr' ? 'on' : ''}">Idioma → PT</button><button data-d="pt" class="${F.dir === 'pt' ? 'on' : ''}">PT → Idioma</button></div>
    </div>
    <p class="muted small">${plural(d.length, 'cartão', 'cartões')} neste baralho${d.length < 4 ? ' · alguns jogos precisam de pelo menos 4' : ''}.</p>
    <div class="grid g3">${Object.entries(MODES).map(([k, m]) => `<button class="card deck-card" data-mode="${k}" ${(k === 'frases' ? !frases.length : !d.length || (k !== 'cartao' && d.length < (k === 'escrever' || k === 'ouvir' ? 1 : 4))) ? 'disabled style="opacity:.5"' : ''}>
      <div style="font-size:1.5rem">${m.ic}</div><h3>${m.nome}</h3><div class="small muted">${m.desc}</div>
      ${k === 'frases' ? `<div class="tiny" style="margin-top:6px">${plural(frases.length, 'frase')}${frasesDue.length ? ` · <b>${frasesDue.length}</b> para revisar` : ''}</div>` : Store.state.progresso.recordes[k] ? `<div class="tiny" style="margin-top:6px">Recorde: <b>${Store.state.progresso.recordes[k]}</b></div>` : ''}</button>`).join('')}</div>
  </div>`;

  view.querySelectorAll('[data-f]').forEach((s) => (s.onchange = () => { F[s.dataset.f] = s.value; renderCards(view, { go }); }));
  view.querySelector('[data-dir]').onclick = (e) => { const b = e.target.closest('[data-d]'); if (b) { F.dir = b.dataset.d; renderCards(view, { go }); } };
  view.querySelector('[data-review]').onclick = () => play(view, { go, mode: 'srs', cards: due.slice(0, 60).map((k) => DICT.get(k)).filter(Boolean), lang });
  view.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => {
    const m = b.dataset.mode;
    if (m === 'frases') {
      const cards = [...shuffle(frasesDue), ...shuffle(frases.filter((f) => !frasesDue.includes(f)))].slice(0, 15);
      return play(view, { go, mode: 'frases', cards, lang });
    }
    let cards = shuffle(d);
    if (m === 'cartao') cards = cards.sort((a, b) => (Store.state.srs.cards[a.key]?.d || 0) - (Store.state.srs.cards[b.key]?.d || 0)).slice(0, 40);
    else if (m !== 'relogio') cards = cards.slice(0, 20);
    play(view, { go, mode: m, cards, lang, pool: d.length >= 4 ? d : dictOf(lang) });
  }));
}

// -------------------------------------------------------------
function play(view, { go, mode, cards, lang, pool }) {
  pool = pool && pool.length >= 4 ? pool : dictOf(lang);
  const G = { i: 0, score: 0, combo: 0, maxCombo: 0, ok: 0, bad: 0, queue: [...cards], again: new Set(), t0: Date.now(), left: 60, timer: null };
  const dir = mode === 'ouvir' ? 'fr' : F.dir;
  const front = (e) => (dir === 'fr' ? e.fr : e.pt);
  const back = (e) => (dir === 'fr' ? e.pt : e.fr);

  function frame(inner) {
    const total = mode === 'relogio' ? null : G.queue.length;
    view.innerHTML = `<div class="game fade-in">
      <div class="game-top"><button class="icon-btn" data-quit title="Sair">✕</button>
        ${mode === 'relogio' ? `<div class="timer" data-timer>${G.left}s</div><div class="grow"></div>` : `<div class="grow progress"><i style="width:${(G.i / total) * 100}%"></i></div><span class="small muted">${Math.min(G.i + 1, total)}/${total}</span>`}
        ${!['cartao', 'srs', 'frases'].includes(mode) ? `<div class="combo">${G.combo >= 3 ? '×' + mult() : ''}</div><div class="timer" style="font-size:1.2rem">${G.score}</div>` : ''}
      </div>${inner}</div>`;
    view.querySelector('[data-quit]').onclick = () => { stopTimer(); TTS.stop(); end(true); };
  }
  const mult = () => 1 + Math.floor(G.combo / 3);
  const stopTimer = () => clearInterval(G.timer);

  function next() {
    bump();
    if (mode === 'relogio') { if (G.i >= G.queue.length) { G.queue.push(...shuffle(cards)); } }
    else if (G.i >= G.queue.length) return end();
    const e = G.queue[G.i];
    if (mode === 'cartao' || mode === 'srs') return showCard(e);
    if (mode === 'escolha' || mode === 'relogio') return showChoice(e);
    if (mode === 'frases') return showCloze(e);
    return showTyped(e);
  }

  function showCard(e) {
    frame(`<div class="card big-card" data-card>${imgHtml(e.img, { alt: '' })}<div class="w${dir === 'fr' ? gcls(e) : ''}">${inline(front(e), { gloss: false })}</div>
      ${dir === 'fr' ? `<div style="margin-top:12px">${sayBtn(e.fr, { lang })}</div>` : ''}
      <div class="small muted" style="margin-top:14px" data-hint>Toque para ver a resposta · espaço</div><div data-ans></div></div>
      <div class="rate" data-rate hidden>${[['Errei', 0, 'var(--bad-bg)'], ['Difícil', 1, 'var(--butter)'], ['Bom', 2, 'var(--sage)'], ['Fácil', 3, 'var(--sky)']].map(([l, q, c]) => `<button data-q="${q}" style="background:${c}">${l}<small>${fmtInterval(nextInterval(e.key, q).ms)}</small></button>`).join('')}</div>`);
    if (dir === 'fr') TTS.speak(plain(e.fr), { lang });
    const card = view.querySelector('[data-card]');
    const reveal = () => {
      if (card.dataset.open) return; card.dataset.open = 1;
      view.querySelector('[data-hint]').remove();
      view.querySelector('[data-ans]').innerHTML = `<div class="ans"><div style="font-size:1.4rem" class="${dir === 'pt' ? gcls(e) : ''}">${inline(back(e), { gloss: false })}</div>
        ${dir === 'pt' ? `<div style="margin-top:8px">${sayBtn(e.fr, { lang })}</div>` : ''}
        ${e.classe ? `<div class="tiny muted">${esc(e.classe)}</div>` : ''}${e.ex ? `<div class="small" style="margin-top:8px"><i>${inline(e.ex, { gloss: false })}</i>${e.exPt ? `<br><span class="muted">${inline(e.exPt, { gloss: false })}</span>` : ''}</div>` : ''}</div>`;
      view.querySelector('[data-rate]').hidden = false;
      if (dir === 'pt') TTS.speak(plain(e.fr), { lang });
    };
    card.onclick = (ev) => { if (!ev.target.closest('[data-say]')) reveal(); };
    view.querySelector('[data-rate]').onclick = (ev) => {
      const b = ev.target.closest('[data-q]'); if (!b) return;
      const q = +b.dataset.q;
      rate(e.key, q);
      if (q === 0) { G.bad++; if (!G.again.has(e.key)) { G.again.add(e.key); G.queue.push(e); } } else G.ok++;
      G.i++; next();
    };
    keyHandler = (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); reveal(); }
      if (card.dataset.open && ['1', '2', '3', '4'].includes(ev.key)) view.querySelector(`[data-q="${+ev.key - 1}"]`)?.click();
    };
  }

  function showChoice(e) {
    const distract = shuffle(pool.filter((x) => x.key !== e.key && back(x) !== back(e)));
    const same = distract.filter((x) => x.classe && x.classe === e.classe);
    const opts = shuffle([e, ...[...same, ...distract].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3)]);
    frame(`<div class="card big-card" style="min-height:200px;cursor:default">${imgHtml(e.img)}<div class="w${dir === 'fr' ? gcls(e) : ''}">${inline(front(e), { gloss: false })}</div>${dir === 'fr' ? `<div style="margin-top:10px">${sayBtn(e.fr, { lang })}</div>` : ''}</div>
      <div class="opts">${opts.map((o, i) => `<button class="opt" data-o="${i}"><span class="k">${i + 1}</span>${inline(back(o), { gloss: false })}</button>`).join('')}</div>`);
    if (mode === 'relogio' && !G.timer) startTimer();
    if (dir === 'fr' && mode !== 'relogio') TTS.speak(plain(e.fr), { lang });
    let done = false;
    const choose = (i) => {
      if (done) return; done = true;
      const ok = opts[i].key === e.key;
      view.querySelectorAll('[data-o]').forEach((b) => { b.disabled = true; const o = opts[+b.dataset.o]; if (o.key === e.key) b.classList.add('ok'); else if (+b.dataset.o === i) b.classList.add('bad'); });
      result(e, ok);
      setTimeout(() => { G.i++; next(); }, ok ? (mode === 'relogio' ? 350 : 650) : 1300);
    };
    view.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => choose(+b.dataset.o)));
    keyHandler = (ev) => { const n = parseInt(ev.key, 10); if (n >= 1 && n <= opts.length) choose(n - 1); };
  }

  function showTyped(e) {
    const listen = mode === 'ouvir';
    const target = e.fr;
    const promptTxt = listen ? '' : e.pt;
    frame(`<div class="card big-card" style="min-height:200px;cursor:default">${listen ? `<button class="play-big" data-p>▶</button><div class="small muted" style="margin-top:10px">Escreva o que ouvir</div>` : `${imgHtml(e.img)}<div class="w">${inline(promptTxt, { gloss: false })}</div>`}</div>
      <input class="input big-input" style="margin-top:14px" data-in autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escreva aqui e aperte Enter">
      <div data-fb></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-skip>Não sei</button><button class="btn primary" data-ok>Verificar</button></div>`);
    const inp = view.querySelector('[data-in]');
    setTimeout(() => inp.focus(), 50);
    if (listen) { const p = view.querySelector('[data-p]'); p.onclick = () => TTS.speak(plain(e.fr), { lang }); setTimeout(() => p.click(), 200); }
    let done = false;
    const accept = [plain(target)];
    if (target === e.fr) accept.push(plain(e.fr).replace(/^(le|la|les|l'|l’|un|une|des|el|los|las|il|lo|gli|der|die|das)\s*/i, ''));
    const verify = (skip) => {
      if (done) { G.i++; return next(); }
      done = true;
      const r = skip ? { ok: false } : checkAnswer(inp.value, accept);
      inp.readOnly = true;
      view.querySelector('[data-fb]').innerHTML = `<div class="feedback ${r.ok ? 'ok' : 'bad'}"><div class="t">${r.ok ? 'Isso!' : 'Era:'}</div>${r.ok && !r.note ? '' : `<div style="font-size:1.2rem"><b>${inline(target, { gloss: false })}</b></div>`}${r.note ? `<div class="small">${esc(r.note)}</div>` : ''}${listen ? `<div class="small muted">${inline(e.pt, { gloss: false })}</div>` : ''}</div>`;
      result(e, r.ok);
      if (!listen || !r.ok) TTS.speak(plain(e.fr), { lang });
      view.querySelector('[data-ok]').textContent = 'Próximo →';
      view.querySelector('[data-skip]').remove();
    };
    view.querySelector('[data-ok]').onclick = () => verify(false);
    view.querySelector('[data-skip]').onclick = () => verify(true);
    keyHandler = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); verify(false); } };
  }

  function showCloze(e) {
    const toks = plain(e.fr).split(/(\s+)/);
    const isWord = (t) => /\p{L}{3,}/u.test(t);
    const nk = (t) => deaccent(t.toLowerCase().replace(/[^\p{L}'’-]/gu, ''));
    let idx = -1;
    if (e.alvo) { const a = nk(e.alvo.split(/\s+/).pop()); idx = toks.findIndex((t) => nk(t) === a || nk(t).replace(/^[a-z]+['’]/, '') === a); }
    if (idx < 0) { const cands = toks.map((t, i) => [t, i]).filter(([t]) => isWord(t)).sort((a, b) => b[0].length - a[0].length).slice(0, 3); idx = cands.length ? cands[Math.floor(Math.random() * cands.length)][1] : -1; }
    const raw = idx >= 0 ? toks[idx] : '';
    const m = raw.match(/^([^\p{L}]*)(.*?)([^\p{L}]*)$/u) || ['', '', raw, ''];
    const answer = m[2];
    const before = toks.slice(0, idx).join('') + (m[1] || ''), after = (m[3] || '') + toks.slice(idx + 1).join('');
    frame(`<div class="card big-card" style="min-height:220px;cursor:default"><div class="fill-text" style="font-size:1.45rem">${esc(before)}<input class="blank" data-in size="${Math.max(5, answer.length + 1)}" autocomplete="off" autocapitalize="off" spellcheck="false">${esc(after)}</div>
      ${e.pt ? `<div class="muted it" style="margin-top:12px">${esc(e.pt)}</div>` : ''}<div class="tiny muted" style="margin-top:10px">${esc(e.origem || '')}</div></div>
      <div data-fb></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" data-hint>Dica</button><button class="btn ghost" data-skip>Não sei</button><button class="btn primary" data-ok>Verificar</button></div>`);
    const inp = view.querySelector('[data-in]');
    setTimeout(() => inp.focus(), 50);
    let done = false;
    view.querySelector('[data-hint]').onclick = (ev) => { inp.placeholder = answer.slice(0, Math.ceil(answer.length / 3)) + '…'; ev.target.remove(); };
    const verify = (skip) => {
      if (done) { G.i++; return next(); }
      done = true;
      const r = skip ? { ok: false } : checkAnswer(inp.value, [answer]);
      inp.readOnly = true; inp.classList.add(r.ok ? 'ok' : 'bad');
      if (!r.ok || r.note) inp.value = answer;
      view.querySelector('[data-fb]').innerHTML = `<div class="feedback ${r.ok ? 'ok' : 'bad'}"><div class="t">${r.ok ? 'Isso!' : 'Era: ' + esc(answer)}</div>${r.note ? `<div class="small">${esc(r.note)}</div>` : ''}</div>`;
      addItem(r.ok); if (r.ok) G.ok++; else G.bad++;
      rate(e.key, r.ok ? 2 : 0);
      TTS.speak(plain(e.fr), { lang });
      view.querySelector('[data-ok]').textContent = 'Próximo →';
      view.querySelector('[data-skip]')?.remove(); view.querySelector('[data-hint]')?.remove();
    };
    view.querySelector('[data-ok]').onclick = () => verify(false);
    view.querySelector('[data-skip]').onclick = () => verify(true);
    keyHandler = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); verify(false); } };
  }

  function result(e, ok) {
    addItem(ok);
    if (ok) { G.ok++; G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.score += 10 * mult(); }
    else { G.bad++; G.combo = 0; markWrong(e.key); }
  }
  function startTimer() {
    G.timer = setInterval(() => {
      if (!view.querySelector('.game')) return stopTimer();
      G.left--; const t = view.querySelector('[data-timer]'); if (t) t.textContent = G.left + 's';
      if (G.left <= 0) { stopTimer(); end(); }
    }, 1000);
  }
  function end(quit) {
    keyHandler = null;
    const R = Store.state.progresso.recordes;
    let rec = false;
    if (!['cartao', 'srs', 'frases'].includes(mode) && G.score > (R[mode] || 0) && !quit) { R[mode] = G.score; rec = true; save('progresso'); }
    if (quit && G.ok + G.bad === 0) return renderCards(view, { go });
    const total = G.ok + G.bad;
    view.innerHTML = `<div class="game fade-in"><div class="card end stack">
      <div class="orn">${rec ? '✦' : '✿'}</div><h1>${rec ? 'Novo recorde!' : mode === 'srs' ? 'Revisão feita' : 'Fim de rodada'}</h1>
      <div class="grid g3" style="margin:16px 0">
        ${!['cartao', 'srs', 'frases'].includes(mode) ? `<div class="card flat stat"><div class="v">${G.score}</div><div class="k">pontos</div></div>` : ''}
        <div class="card flat stat"><div class="v">${total ? Math.round((G.ok / total) * 100) : 0}%</div><div class="k">acertos</div></div>
        <div class="card flat stat"><div class="v">${['cartao', 'srs', 'frases'].includes(mode) ? total : G.maxCombo}</div><div class="k">${mode === 'frases' ? 'frases' : mode === 'cartao' || mode === 'srs' ? 'cartões' : 'maior sequência'}</div></div>
      </div>
      <div class="row" style="justify-content:center"><button class="btn" data-back>Voltar aos cartões</button>${mode !== 'srs' ? '<button class="btn primary" data-again>Jogar de novo</button>' : ''}</div>
    </div></div>`;
    view.querySelector('[data-back]').onclick = () => renderCards(view, { go });
    view.querySelector('[data-again]')?.addEventListener('click', () => play(view, { go, mode, cards: shuffle(cards), lang, pool }));
  }
  next();
}

let keyHandler = null;
document.addEventListener('keydown', (e) => {
  if (!keyHandler) return;
  if (e.target.matches('input, textarea, select') && e.key !== 'Enter') return;
  if (!document.querySelector('.game')) { keyHandler = null; return; }
  keyHandler(e);
});
