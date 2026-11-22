// Motor de exercícios (usado nas lições e no Caderno de erros)
import { EX_LABELS, checkAnswer, plain, normAnswer } from './parser.js';
import { esc, inline, shuffle, sayBtn, langInfo } from './util.js';
import * as TTS from './speech.js';
import { addItem, bump } from './data.js';

/**
 * runExercises(el, items, {lang, onDone(results), onAnswer(item, ok, given), retryWrong})
 */
export function runExercises(el, items, opts = {}) {
  const lang = opts.lang || 'fr';
  const queue = items.map((it, i) => ({ it, i, retry: false }));
  const results = new Map();
  let pos = 0, firstPassLen = queue.length, retryAdded = false;
  let st = null;

  function next() {
    pos++;
    if (pos >= queue.length && opts.retryWrong !== false && !retryAdded) {
      retryAdded = true;
      const wrong = [...results.entries()].filter(([, r]) => !r.ok).map(([i]) => i);
      wrong.forEach((i) => queue.push({ it: items[i], i, retry: true }));
    }
    if (pos >= queue.length) return finish();
    show();
  }
  function finish() {
    const arr = items.map((it, i) => ({ it, ok: results.get(i)?.ok || false, okRetry: results.get(i)?.okRetry || false }));
    const ok = arr.filter((r) => r.ok).length;
    el.innerHTML = `<div class="end fade-in"><div class="orn">✿</div>
      <h2>${ok === items.length ? 'Impecável!' : ok >= items.length * 0.7 ? 'Muito bem!' : 'Bom treino!'}</h2>
      <p class="muted">Você acertou <b>${ok}</b> de ${items.length} de primeira.${arr.some((r) => !r.ok && r.okRetry) ? ' Os que errou, refez na revisão.' : ''}</p></div>`;
    opts.onDone?.(arr);
  }

  function show() {
    const { it, retry } = queue[pos];
    st = { answered: false, sel: null, it };
    const total = queue.length;
    const head = `<div class="ex-head"><span class="caps">${retry ? 'Revendo um erro · ' : ''}${esc(EX_LABELS[it.type] || 'Exercício')}${it._rev && opts.source !== false ? ` <span class="chip butter" style="font-variant:normal;letter-spacing:0">↺ revisão · ${esc(it._rev)}</span>` : ''}</span><span class="small">${Math.min(pos + 1, total)} / ${total}</span></div>`;
    el.innerHTML = `<div class="fade-in">${head}<div class="ex-body"></div><div class="fb-slot"></div>
      <div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn primary lg" data-ex-go disabled>Verificar</button></div></div>`;
    const body = el.querySelector('.ex-body');
    const go = el.querySelector('[data-ex-go]');
    const R = RENDER[it.type] || RENDER.escrever;
    st.api = R(body, it, { lang, ready: (v = true) => { if (!st.answered) go.disabled = !v; }, autoCheck: () => check() });
    go.onclick = () => (st.answered ? next() : check());
    el.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !go.disabled) { e.preventDefault(); go.click(); }
    };
    setTimeout(() => body.querySelector('input:not([disabled]), textarea')?.focus({ preventScroll: true }), 60);
  }

  function check() {
    if (st.answered) return;
    const { it, i, retry } = queue[pos];
    const res = st.api.check();
    if (res == null) return;
    st.answered = true;
    bump();
    addItem(res.ok);
    if (!retry) results.set(i, { ok: res.ok });
    else if (res.ok) results.get(i).okRetry = true;
    if (!retry) opts.onAnswer?.(it, res.ok, res.given || '');
    const fb = el.querySelector('.fb-slot');
    const showAns = !res.ok && res.correct ? `<div>Resposta: <b>${inline(res.correct, { gloss: false })}</b></div>` : '';
    const note = res.note ? `<div class="small">${esc(res.note)}${res.ok && res.correct ? ` — <b>${inline(res.correct, { gloss: false })}</b>` : ''}</div>` : '';
    fb.innerHTML = `<div class="feedback ${res.ok ? 'ok' : 'bad'}"><div class="t">${res.ok ? pickPraise() : 'Ainda não.'}</div>${showAns}${note}
      ${it.explain ? `<div class="small" style="margin-top:6px">${inline(it.explain, { gloss: false })}</div>` : ''}</div>`;
    const go = el.querySelector('[data-ex-go]');
    go.disabled = false; go.textContent = pos + 1 >= queue.length && (retryAdded || ![...results.values()].some((r) => !r.ok)) ? 'Concluir' : 'Próximo';
    go.focus({ preventScroll: true });
    fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  show();
  return { stop: () => TTS.stop() };
}

const PRAISE = ['Isso!', 'Exato.', 'Perfeito.', 'Muito bem.', 'Certinho.', 'Bravo !', 'Parfait !', 'Très bien !'];
const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

function accentBar(lang, target) {
  const acc = langInfo(lang).acentos;
  if (!acc) return '';
  return `<div class="row" style="gap:4px;margin-top:8px">${acc.split(' ').map((c) => `<button type="button" class="chip" data-ins="${c}">${c}</button>`).join('')}</div>`;
}
function wireAccents(root) {
  let last = root.querySelector('input, textarea');
  root.addEventListener('focusin', (e) => { if (e.target.matches('input, textarea')) last = e.target; });
  root.addEventListener('mousedown', (e) => { if (e.target.closest('[data-ins]')) e.preventDefault(); });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ins]'); if (!b || !last) return;
    const s = last.selectionStart ?? last.value.length, en = last.selectionEnd ?? s;
    last.value = last.value.slice(0, s) + b.dataset.ins + last.value.slice(en);
    last.setSelectionRange(s + b.dataset.ins.length, s + b.dataset.ins.length);
    last.dispatchEvent(new Event('input', { bubbles: true }));
    last.focus();
  });
}
const ctxHtml = (it) => (it.ctx ? `<div class="ex-ctx">${inline(it.ctx, { gloss: false })}</div>` : '');
const hintHtml = (it) => (it.hint ? `<button type="button" class="btn ghost xs" data-hint>Dica</button><span class="small muted" data-hint-t hidden> ${esc(it.hint)}</span>` : '');
function wireHint(body) {
  body.querySelector('[data-hint]')?.addEventListener('click', (e) => { e.target.hidden = true; body.querySelector('[data-hint-t]').hidden = false; });
}

const RENDER = {
  escolha(body, it, ctx) { return choice(body, it, ctx, false); },
  ouvir(body, it, ctx) { return choice(body, it, ctx, true); },

  escrever(body, it, ctx) { return typed(body, it, ctx, false); },
  traduzir(body, it, ctx) { return typed(body, it, ctx, false); },
  ditado(body, it, ctx) { return typed(body, it, ctx, true); },

  vf(body, it, ctx) {
    body.innerHTML = `<div class="ex-prompt">${inline(it.prompt, { gloss: false })} ${sayBtn(it.prompt, { lang: ctx.lang, size: 'sm' })}</div>${ctxHtml(it)}
      <div class="vf"><button class="opt" data-v="1">Verdadeiro</button><button class="opt" data-v="0">Falso</button></div>`;
    let sel = null;
    body.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
      if (body.dataset.done) return;
      sel = b.dataset.v === '1';
      body.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('sel', x === b));
      ctx.ready(); ctx.autoCheck();
    });
    return {
      check() {
        if (sel == null) return null;
        body.dataset.done = 1;
        const ok = sel === it.truth;
        body.querySelectorAll('[data-v]').forEach((x) => { x.disabled = true; const v = x.dataset.v === '1'; if (v === it.truth) x.classList.add('ok'); else if (v === sel) x.classList.add('bad'); });
        return { ok, given: sel ? 'verdadeiro' : 'falso', correct: it.truth ? 'Verdadeiro' : 'Falso' };
      },
    };
  },

  completar(body, it, ctx) {
    const parts = it.text.split(/\[\[(\d+)\]\]/);
    let html = '';
    parts.forEach((p, i) => {
      if (i % 2 === 0) html += inline(p, { gloss: false });
      else html += `<input class="blank" data-b="${p}" autocomplete="off" autocapitalize="off" spellcheck="false" size="${Math.max(6, (it.blanks[+p][0] || '').length + 2)}" ${it.chips ? 'readonly' : ''}>`;
    });
    body.innerHTML = `${it.instr ? `<div class="muted">${esc(it.instr)}</div>` : ''}<div class="fill-text">${html}</div>${ctxHtml(it)}
      ${it.chips ? `<div class="row" style="margin-top:14px">${shuffle(it.chips).map((c) => `<button class="tok" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : accentBar(ctx.lang)}
      <div style="margin-top:8px">${hintHtml(it)}</div>`;
    wireHint(body); if (!it.chips) wireAccents(body);
    const inputs = [...body.querySelectorAll('.blank')];
    const upd = () => ctx.ready(inputs.every((i) => i.value.trim()));
    inputs.forEach((i) => i.addEventListener('input', upd));
    body.querySelectorAll('[data-chip]').forEach((b) => b.onclick = () => { inputs[0].value = b.dataset.chip; body.querySelectorAll('[data-chip]').forEach((x) => x.classList.toggle('sel', x === b)); upd(); });
    return {
      check() {
        let all = true, note = '';
        const given = [];
        inputs.forEach((inp) => {
          const r = checkAnswer(inp.value, it.blanks[+inp.dataset.b]);
          given.push(inp.value);
          inp.classList.add(r.ok ? 'ok' : 'bad'); inp.readOnly = true;
          if (!r.ok) all = false; else if (r.note) note = r.note;
        });
        const full = plain(it.text.replace(/\[\[(\d+)\]\]/g, (m, n) => it.blanks[+n][0]));
        return { ok: all, given: given.join(' / '), correct: full, note: all ? note : '' };
      },
    };
  },

  ordenar(body, it, ctx) {
    let order = shuffle(it.tokens.map((t, i) => i));
    if (order.every((v, i) => v === i) && order.length > 1) order = [...order.slice(1), order[0]];
    const chosen = [];
    body.innerHTML = `<div class="ex-prompt" style="font-size:1.3rem">${esc(it.instr || 'Monte a frase na ordem certa')}</div>${ctxHtml(it)}
      <div class="tokens target" data-target></div><div class="tokens" data-pool></div>`;
    const tgt = body.querySelector('[data-target]'), pool = body.querySelector('[data-pool]');
    const draw = () => {
      tgt.innerHTML = chosen.map((i, k) => `<button class="tok" data-rm="${k}">${esc(it.tokens[i])}</button>`).join('') || '<span class="muted small" style="padding:8px">Toque nas palavras abaixo…</span>';
      pool.innerHTML = order.map((i) => `<button class="tok" data-add="${i}" ${chosen.includes(i) ? 'disabled' : ''}>${esc(it.tokens[i])}</button>`).join('');
      ctx.ready(chosen.length === it.tokens.length);
    };
    body.addEventListener('click', (e) => {
      if (body.dataset.done) return;
      const a = e.target.closest('[data-add]'), r = e.target.closest('[data-rm]');
      if (a) chosen.push(+a.dataset.add); else if (r) chosen.splice(+r.dataset.rm, 1); else return;
      draw();
    });
    draw();
    return {
      check() {
        body.dataset.done = 1;
        const given = chosen.map((i) => it.tokens[i]).join(' ');
        const ok = normAnswer(given) === normAnswer(it.tokens.join(' '));
        tgt.style.borderColor = ok ? 'var(--ok)' : 'var(--bad)';
        if (ok) TTS.speak(it.tokens.join(' '), { lang: ctx.lang });
        return { ok, given, correct: it.tokens.join(' ') };
      },
    };
  },

  associar(body, it, ctx) {
    const L = shuffle(it.pairs.map((p, i) => i)), Rr = shuffle(it.pairs.map((p, i) => i));
    let sel = null, mistakes = 0, done = new Set();
    body.innerHTML = `<div class="ex-prompt" style="font-size:1.3rem">${esc(it.prompt || 'Associe os pares')}</div>
      <div class="pairs"><div class="stack-s">${L.map((i) => `<button class="pair" data-l="${i}" style="width:100%">${inline(it.pairs[i][0], { gloss: false })}</button>`).join('')}</div>
      <div class="stack-s">${Rr.map((i) => `<button class="pair" data-r="${i}" style="width:100%">${inline(it.pairs[i][1], { gloss: false })}</button>`).join('')}</div></div>`;
    body.addEventListener('click', (e) => {
      const b = e.target.closest('.pair'); if (!b || b.classList.contains('done')) return;
      if (b.dataset.l != null) {
        sel = +b.dataset.l;
        body.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('sel', x === b));
        TTS.speak(plain(it.pairs[sel][0]), { lang: ctx.lang });
        return;
      }
      if (sel == null) return;
      const r = +b.dataset.r;
      if (r === sel) {
        done.add(r);
        body.querySelector(`[data-l="${r}"]`).classList.add('done'); b.classList.add('done');
        body.querySelector(`[data-l="${r}"]`).classList.remove('sel'); sel = null;
        if (done.size === it.pairs.length) { ctx.ready(); ctx.autoCheck(); }
      } else {
        mistakes++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400);
      }
    });
    return { check() { return { ok: mistakes <= 1, given: `${mistakes} erro(s)`, correct: '', note: mistakes === 1 ? 'Um pequeno tropeço, mas valeu.' : '' }; } };
  },
};

function choice(body, it, ctx, listen) {
  const opts = shuffle(it.options);
  body.innerHTML = listen
    ? `<div class="row" style="margin-bottom:10px"><button class="play-big" data-p>▶</button><button class="btn sm" data-ps>Mais devagar</button></div>
       <div class="ex-prompt" data-reveal style="display:none">${inline(it.prompt, { gloss: false })}</div><div class="muted">Ouça e escolha a alternativa correta.</div>`
    : `<div class="ex-prompt">${inline(it.prompt, { gloss: false })}</div>${ctxHtml(it)}`;
  body.innerHTML += `<div class="opts">${opts.map((o, i) => `<button class="opt" data-o="${i}"><span class="k">${i + 1}</span><span>${inline(o.text, { gloss: false })}</span></button>`).join('')}</div>`;
  let sel = null;
  if (listen) {
    const say = (speed) => TTS.speak(plain(it.prompt), { lang: ctx.lang, speed });
    body.querySelector('[data-p]').onclick = () => say();
    body.querySelector('[data-ps]').onclick = () => say('lenta');
    setTimeout(() => say(), 250);
  }
  const choose = (i) => {
    if (body.dataset.done) return;
    sel = i;
    body.querySelectorAll('[data-o]').forEach((x) => x.classList.toggle('sel', +x.dataset.o === i));
    ctx.ready();
  };
  body.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => choose(+b.dataset.o)));
  body.tabIndex = -1;
  body.addEventListener('keydown', (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= opts.length) choose(n - 1); });
  setTimeout(() => body.focus({ preventScroll: true }), 50);
  return {
    check() {
      if (sel == null) return null;
      body.dataset.done = 1;
      const ok = opts[sel].ok;
      body.querySelectorAll('[data-o]').forEach((x) => { x.disabled = true; const o = opts[+x.dataset.o]; if (o.ok) x.classList.add('ok'); else if (+x.dataset.o === sel) x.classList.add('bad'); });
      body.querySelector('[data-reveal]')?.style.removeProperty('display');
      return { ok, given: opts[sel].text, correct: opts.find((o) => o.ok).text };
    },
  };
}

function typed(body, it, ctx, dictation) {
  body.innerHTML = dictation
    ? `<div class="row" style="margin-bottom:12px"><button class="play-big" data-p>▶</button><button class="btn sm" data-ps>Mais devagar</button><span class="muted small">Escreva exatamente o que ouvir.</span></div>`
    : `<div class="ex-prompt">${inline(it.prompt, { gloss: false })}</div>${ctxHtml(it)}`;
  body.innerHTML += `<input class="input big-input" data-in autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Sua resposta…">${accentBar(ctx.lang)}<div style="margin-top:8px">${hintHtml(it)}</div>`;
  wireHint(body); wireAccents(body);
  const inp = body.querySelector('[data-in]');
  inp.addEventListener('input', () => ctx.ready(!!inp.value.trim()));
  if (dictation) {
    const say = (speed) => TTS.speak(plain(it.prompt), { lang: ctx.lang, speed });
    body.querySelector('[data-p]').onclick = () => say();
    body.querySelector('[data-ps]').onclick = () => say('lenta');
    setTimeout(() => say(), 250);
  }
  return {
    check() {
      const r = checkAnswer(inp.value, it.accept);
      inp.readOnly = true;
      inp.style.borderColor = r.ok ? 'var(--ok)' : 'var(--bad)';
      return { ok: r.ok, given: inp.value, correct: r.best, note: r.note };
    },
  };
}
