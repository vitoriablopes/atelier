// Player de lição + renderizadores de cada tipo de bloco
import { BLOCK_TYPES, EX_LABELS, plain, wordKey, LEVEL_NAMES } from './parser.js';
import { esc, inline, richHtml, sayBtn, imgHtml, toast, plural, fmtDate, modal } from './util.js';
import { recBtn } from './voice.js';
import * as TTS from './speech.js';
import { Store, save } from './store.js';
import { runExercises } from './exercises.js';
import { lessonById, lessonProg, setLessonProg, introduce, bump, lookup, cardStatus, wordKeysOfLesson, rebuild, LESSONS, pickMixed, exId, recordEx, saveSentence, gcls, sentenceKey } from './data.js';

let cleanup = [];
const onCleanup = (f) => cleanup.push(f);
export function teardown() { cleanup.forEach((f) => { try { f(); } catch (e) {} }); cleanup = []; TTS.stop(); closePop(); }

// ---------------------------------------------------------------
//  Blocos
// ---------------------------------------------------------------
export function blockHeader(b) {
  const T = BLOCK_TYPES[b.type];
  return `<div class="block-label t-${b.type}"><span class="ic">${T.icon}</span><div><div class="k">${T.label}</div>${b.title ? `<h2>${inline(b.title, { gloss: false })}</h2>` : ''}</div></div>`;
}
function fontesHtml(b) {
  if (!b.fontes?.length) return '';
  return `<div class="fonte">${b.fontes.map((f) => `Fonte: ${esc(f.nome || '')}${f.url ? `${f.nome ? ' — ' : ''}<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}`).join('<br>')}</div>`;
}

/** Retorna {html, mount(el)} para um bloco. ctx = {lang, lesson, onExDone, preview} */
export function renderBlock(b, ctx) {
  const R = BLOCKS[b.type] || BLOCKS.nota;
  const r = R(b, ctx);
  return { html: `<div class="t-${b.type}">${blockHeader(b)}${r.html}${fontesHtml(b)}</div>`, mount: r.mount };
}

const BLOCKS = {
  texto(b, ctx) {
    const showTr = Store.state.perfil.traducao;
    const hasTr = b.paras.some((p) => p.pt);
    const html = `<div class="row" style="margin:-6px 0 16px">
        <button class="btn sm" data-read-all>▶ Ler o texto</button>
        ${hasTr ? `<label class="switch small"><input type="checkbox" data-tr ${showTr ? 'checked' : ''}><span class="tg"></span>Tradução</label>` : ''}
        <span class="muted tiny">Toque nas palavras destacadas para ver o significado.</span></div>
      <div class="reading">${b.paras.map((p, i) => `<div class="para"><div class="para-tools">${sayBtn(p.fr, { lang: ctx.lang, size: 'sm', title: 'Ouvir parágrafo' })}${sayBtn(p.fr, { lang: ctx.lang, size: 'sm', speed: 'lenta', icon: '½', title: 'Ouvir devagar' })}${ctx.preview ? '' : `<button class="icon-btn sm" data-savefrase="${i}" title="Salvar uma frase nos cartões">＋</button>`}</div>
        <p>${inline(p.fr)}</p>${p.pt ? `<div class="tr" ${showTr ? '' : 'hidden'}>${inline(p.pt, { gloss: false })}</div>` : ''}</div>`).join('')}</div>`;
    return {
      html,
      mount(el) {
        el.querySelector('[data-tr]')?.addEventListener('change', (e) => el.querySelectorAll('.reading .tr').forEach((t) => (t.hidden = !e.target.checked)));
        el.querySelectorAll('[data-savefrase]').forEach((x) => (x.onclick = () => { const p = b.paras[+x.dataset.savefrase]; pickSentence(p.fr, p.pt, ctx); }));
        const btn = el.querySelector('[data-read-all]');
        btn.onclick = () => {
          if (btn.dataset.on) { TTS.stop(); return; }
          btn.dataset.on = 1; btn.textContent = '■ Parar';
          const paras = [...el.querySelectorAll('.para')];
          TTS.speakSeq(b.paras.map((p) => ({ text: plain(p.fr) })), {
            lang: ctx.lang, gap: 600,
            onLine: (i) => { paras.forEach((p, k) => (p.style.background = k === i ? 'color-mix(in srgb, var(--rose) 30%, transparent)' : '')); if (i < 0) { delete btn.dataset.on; btn.textContent = '▶ Ler o texto'; } },
          }).then(() => { delete btn.dataset.on; btn.textContent = '▶ Ler o texto'; paras.forEach((p) => (p.style.background = '')); });
        };
        markSeenGlosses(el, ctx.lang);
      },
    };
  },

  audio(b, ctx) {
    const st = { speed: Store.state.perfil.vel || 'normal', showT: false, showTr: false, cur: -1, playing: false };
    const voiceOf = (sp) => { const i = b.speakers.indexOf(sp); return i < 0 ? 0 : i; };
    const pitchOf = (sp) => { const i = b.speakers.indexOf(sp); return i <= 0 ? 1 : [1, 1.12, 0.9, 1.06][i % 4]; };
    const html = `<div class="player">
        <button class="play-big" data-play aria-label="Tocar">▶</button>
        <div class="grow stack-s">
          <div class="seg" data-speed>${TTS.SPEEDS.map((s) => `<button data-s="${s.id}" class="${s.id === st.speed ? 'on' : ''}">${s.label}</button>`).join('')}</div>
          <div class="row" style="gap:16px">
            <label class="switch small"><input type="checkbox" data-t><span class="tg"></span>Transcrição</label>
            ${b.items.some((i) => i.pt) ? `<label class="switch small"><input type="checkbox" data-trn><span class="tg"></span>Tradução</label>` : ''}
          </div>
        </div>
      </div>
      <div class="lines" data-lines></div>`;
    return {
      html,
      mount(el) {
        const lines = el.querySelector('[data-lines]');
        const play = el.querySelector('[data-play]');
        const draw = () => {
          if (!st.showT && !st.showTr) {
            lines.innerHTML = `<div class="listen-first">Ouça primeiro sem ler. Depois revele a transcrição e confira.<br><span class="tiny">${plural(b.items.length, 'fala', 'falas')}${b.speakers.length ? ' · ' + b.speakers.map(esc).join(', ') : ''}</span></div>`;
            return;
          }
          lines.innerHTML = b.items.map((it, i) => `<div class="line-item ${i === st.cur ? 'cur' : ''}" data-line="${i}">
              ${it.speaker ? `<div class="who">${esc(it.speaker)}</div>` : ''}
              <div class="grow">${st.showT ? `<div class="fr">${inline(it.fr)}</div>` : ''}${st.showTr && it.pt ? `<div class="pt">${inline(it.pt, { gloss: false })}</div>` : ''}</div>
              <div class="row nowrap" style="gap:6px"><button class="icon-btn sm" data-one="${i}" title="Ouvir esta fala">▶</button>${recBtn(it.fr, { lang: ctx.lang })}${ctx.preview ? '' : `<button class="icon-btn sm" data-sv="${i}" title="Salvar esta frase nos cartões">＋</button>`}</div></div>`).join('');
          markSeenGlosses(lines, ctx.lang);
        };
        const setCur = (i) => {
          st.cur = i;
          lines.querySelectorAll('.line-item').forEach((x) => x.classList.toggle('cur', +x.dataset.line === i));
          if (i >= 0) lines.querySelector(`[data-line="${i}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        };
        const seq = (from = 0, only = false) => {
          const items = (only ? [b.items[from]] : b.items.slice(from)).map((it) => ({ text: plain(it.fr), voiceIdx: voiceOf(it.speaker), pitch: pitchOf(it.speaker) }));
          st.playing = true; play.textContent = '■'; play.classList.add('playing');
          TTS.speakSeq(items, { lang: ctx.lang, speed: st.speed, onLine: (i) => setCur(i < 0 ? -1 : i + from) })
            .finally(() => { st.playing = false; play.textContent = '▶'; setCur(-1); bump(); });
        };
        play.onclick = () => (st.playing ? TTS.stop() : seq(0));
        el.querySelector('[data-speed]').onclick = (e) => {
          const s = e.target.closest('[data-s]'); if (!s) return;
          st.speed = s.dataset.s;
          el.querySelectorAll('[data-s]').forEach((x) => x.classList.toggle('on', x === s));
          if (st.playing) { const c = Math.max(0, st.cur); TTS.stop(); setTimeout(() => seq(c), 80); }
        };
        el.querySelector('[data-t]').onchange = (e) => { st.showT = e.target.checked; draw(); };
        const trn = el.querySelector('[data-trn]');
        if (trn) trn.onchange = (e) => { st.showTr = e.target.checked; draw(); };
        lines.addEventListener('click', (e) => {
          const o = e.target.closest('[data-one]'); if (o) { e.stopPropagation(); seq(+o.dataset.one, true); return; }
          const sv = e.target.closest('[data-sv]'); if (sv) { const it = b.items[+sv.dataset.sv]; saveSentence(ctx.lang, it.fr, it.pt, { titulo: ctx.lesson?.titulo, licao: ctx.lesson?.id }); toast('Frase salva nos cartões ✿'); }
        });
        draw();
        onCleanup(() => TTS.stop());
      },
    };
  },

  gramatica: rich, cultura: rich, nota: rich, resumo: rich, objetivos: rich, marco: rich, complementos: rich,

  vocab(b, ctx) {
    const html = `<p class="muted small" style="margin-top:-6px">Toque no cartão para virar.${ctx.preview ? '' : ' Ao continuar, estas palavras entram na sua revisão.'}</p>
      <div class="vcards">${b.items.map((w, i) => `<div role="button" tabindex="0" class="flip${gcls({ ...w, lang: ctx.lang })}" data-flip="${i}"><div class="in">
        <div class="f">${imgHtml(w.img, { alt: w.fr })}<div class="w">${inline(w.fr, { gloss: false })}</div>${w.classe ? `<div class="tiny muted">${esc(w.classe)}</div>` : ''}<span class="lis">${sayBtn(w.fr, { lang: ctx.lang, size: 'sm' })}</span></div>
        <div class="b"><div class="tr">${inline(w.pt, { gloss: false })}</div>${w.ex ? `<div class="exs">${inline(w.ex, { gloss: false })}${w.exPt ? `<br><span style="opacity:.75">${inline(w.exPt, { gloss: false })}</span>` : ''}</div>` : ''}${w.nota ? `<div class="tiny">${inline(w.nota, { gloss: false })}</div>` : ''}${w.ex ? `<span class="lis">${sayBtn(w.ex, { lang: ctx.lang, size: 'sm', title: 'Ouvir exemplo' })}</span>` : ''}</div>
      </div></div>`).join('')}</div>`;
    return {
      html,
      mount(el) {
        el.querySelectorAll('[data-flip]').forEach((c) => {
          c.addEventListener('click', (e) => { if (e.target.closest('[data-say]')) return; c.classList.toggle('on'); bump(); });
          c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('on'); } });
        });
      },
    };
  },

  expressoes(b, ctx) {
    return {
      html: b.items.map((w) => `<div class="expr">${sayBtn(w.fr, { lang: ctx.lang })}<div class="grow"><div class="fr">${inline(w.fr, { gloss: false })}</div><div>${inline(w.pt, { gloss: false })}</div>${w.nota ? `<div class="small muted">${inline(w.nota, { gloss: false })}</div>` : ''}</div>${sayBtn(w.fr, { lang: ctx.lang, size: 'sm', speed: 'lenta', icon: '½', title: 'Ouvir devagar' })}${recBtn(w.fr, { lang: ctx.lang })}</div>`).join(''),
    };
  },

  conjugacao(b, ctx) {
    const say = (r) => {
      const pr = r.pron.split('/')[0].trim();
      const f = r.forma.split('/')[0].trim();
      if (ctx.lang === 'fr' && /^je$/i.test(pr) && /^[aeiouyhéèêàâîôû]/i.test(f)) return "j'" + f;
      return pr + ' ' + f;
    };
    const html = `${b.verbo ? `<p style="margin-top:-6px"><b style="font-size:1.2em">${esc(b.verbo)}</b>${b.verboPt ? ` — <i>${esc(b.verboPt)}</i>` : ''}${b.tempo ? ` <span class="chip lav">${esc(b.tempo)}</span>` : ''}</p>` : ''}
      <div class="row" style="margin-bottom:10px"><button class="btn sm" data-all>▶ Ouvir tudo</button><button class="btn sm sage" data-train>Treinar de memória</button></div>
      <div class="rich conj"><div class="tbl-wrap"><table>${b.rows.map((r, i) => `<tr><td class="muted" style="width:28%">${esc(r.pron)}</td><td class="forma" data-cell="${i}">${esc(r.forma)}</td><td class="small muted">${esc(r.pt)}</td><td style="width:44px">${sayBtn(say(r), { lang: ctx.lang, size: 'sm' })}</td></tr>`).join('')}</table></div></div>
      <div data-check-row hidden class="row" style="justify-content:flex-end"><button class="btn primary sm" data-check>Verificar</button></div>`;
    return {
      html,
      mount(el) {
        el.querySelector('[data-all]').onclick = () => TTS.speakSeq(b.rows.map((r) => ({ text: say(r) })), { lang: ctx.lang, gap: 450 });
        el.querySelector('[data-train]').onclick = (e) => {
          const training = e.target.dataset.on = e.target.dataset.on ? '' : '1';
          e.target.textContent = training ? 'Mostrar formas' : 'Treinar de memória';
          el.querySelector('[data-check-row]').hidden = !training;
          el.querySelectorAll('[data-cell]').forEach((c) => {
            const r = b.rows[+c.dataset.cell];
            c.innerHTML = training ? `<input data-inp="${c.dataset.cell}" autocomplete="off" autocapitalize="off" spellcheck="false">` : esc(r.forma);
          });
          el.querySelector('[data-inp]')?.focus();
        };
        el.querySelector('[data-check]').onclick = () => {
          let ok = 0;
          el.querySelectorAll('[data-inp]').forEach((i) => {
            const r = b.rows[+i.dataset.inp];
            const good = r.forma.split('/').map((x) => x.trim().toLowerCase()).includes(i.value.trim().toLowerCase().replace(/[’]/g, "'"));
            i.classList.toggle('ok', good); i.classList.toggle('bad', !good); if (good) ok++;
          });
          toast(`${ok} de ${b.rows.length} certas`); bump();
        };
      },
    };
  },

  pronuncia(b, ctx) {
    return {
      html: `<p class="muted small" style="margin-top:-6px">Ouça e repita em voz alta. “3×” toca devagar três vezes, com pausa para você repetir.</p>` +
        b.items.map((it, i) => `<div class="pron"><div class="grow"><div class="fr">${inline(it.fr, { gloss: false })}</div>${it.ipa ? `<div class="ipa">${esc(it.ipa)}</div>` : ''}${it.dica ? `<div class="small muted">${inline(it.dica, { gloss: false })}</div>` : ''}</div>
          ${sayBtn(it.fr, { lang: ctx.lang })}${sayBtn(it.fr, { lang: ctx.lang, speed: 'lenta', icon: '½', title: 'Devagar' })}<button class="btn sm" data-x3="${i}">3×</button>${recBtn(it.fr, { lang: ctx.lang, size: '' })}</div>`).join(''),
      mount(el) {
        el.addEventListener('click', (e) => {
          const x = e.target.closest('[data-x3]'); if (!x) return;
          const t = plain(b.items[+x.dataset.x3].fr);
          TTS.speakSeq([{ text: t }, { text: t }, { text: t }], { lang: ctx.lang, speed: 'lenta', gap: 1800 }); bump();
        });
      },
    };
  },

  escrita(b, ctx) {
    const key = (ctx.lesson?.id || 'x') + ':' + b.idx;
    const saved = Store.state.caderno.escritas[key]?.texto || '';
    return {
      html: `<div class="rich"><p>${inline(b.prompt, { gloss: false })}</p></div>
        <textarea class="textarea" data-w placeholder="Escreva aqui…" spellcheck="false" style="font-size:1.1rem;min-height:140px">${esc(saved)}</textarea>
        <div data-acc></div>
        ${b.checklist.length ? `<div class="stack-s" style="margin-top:14px"><div class="caps muted">Autoavaliação</div>${b.checklist.map((c) => `<label class="row nowrap" style="gap:10px;cursor:pointer"><input type="checkbox"><span>${inline(c, { gloss: false })}</span></label>`).join('')}</div>` : ''}
        ${b.model ? `<div style="margin-top:16px"><button class="btn sm lav" data-model>Ver um modelo de resposta</button><div data-m hidden class="ex-line" style="margin-top:10px">${sayBtn(b.model, { lang: ctx.lang, size: 'sm' })}<div><div class="fr">${inline(b.model, { gloss: false })}</div>${b.modelPt ? `<div class="pt">${inline(b.modelPt, { gloss: false })}</div>` : ''}</div></div></div>` : ''}
        <p class="tiny muted" style="margin-top:10px">Seu texto fica guardado no Caderno.</p>`,
      mount(el) {
        const ta = el.querySelector('[data-w]');
        let t;
        if (ctx.preview) return;
        ta.addEventListener('input', () => {
          bump(); clearTimeout(t);
          t = setTimeout(() => {
            Store.state.caderno.escritas[key] = { texto: ta.value, t: Date.now(), licao: ctx.lesson?.id, titulo: ctx.lesson?.titulo, enunciado: b.prompt };
            save('caderno');
          }, 800);
        });
        el.querySelector('[data-model]')?.addEventListener('click', (e) => { el.querySelector('[data-m]').hidden = false; e.target.remove(); });
      },
    };
  },

  imagem(b, ctx) {
    return { html: `<div class="gallery">${b.images.map((s) => imgHtml(s, { alt: b.title || '' })).join('')}</div>${b.caption ? `<p style="margin-top:12px">${inline(b.caption)}</p>` : ''}`, mount: (el) => markSeenGlosses(el, ctx.lang) };
  },

  video(b) {
    return {
      html: b.videos.map((v) => `<div class="video" style="margin-bottom:12px"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?rel=0${v.start ? '&start=' + v.start : ''}" title="Vídeo" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`).join('') +
        (b.caption ? `<p>${inline(b.caption)}</p>` : ''),
    };
  },

  links(b) {
    return { html: `<ul class="rich" style="padding-left:1.2em">${b.items.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a></li>`).join('')}</ul>` };
  },

  exercicios(b, ctx) {
    if (ctx.preview) {
      return { html: `<ol class="rich">${b.items.map((it) => `<li><span class="chip butter">${esc(EX_LABELS[it.type])}</span> ${inline(it.prompt || it.text || '', { gloss: false })}
        <div class="small muted">${exAnswerSummary(it)}</div></li>`).join('')}</ol>` };
    }
    return {
      html: `<div data-ex></div>`,
      mount(el) {
        const own = b.items.map((it) => ({ ...it, _id: exId(ctx.lesson, b, it), _lid: ctx.lesson.id }));
        const extra = ctx.lesson && !ctx.noMix && ctx.lesson.tipo !== 'exercicios' ? pickMixed(ctx.lang, own.length >= 4 ? 2 : 1, { exclude: ctx.lesson.id }) : [];
        const r = runExercises(el.querySelector('[data-ex]'), [...own, ...extra], {
          lang: ctx.lang,
          onAnswer: (it, ok, given) => { recordEx(it._id, ok); if (!ok) recordError(it, given, ctx); else clearError(it, ctx); },
          onDone: (arr) => ctx.onExDone?.(b, arr),
        });
        onCleanup(r.stop);
      },
    };
  },
};

function rich(b, ctx) { return { html: `<div class="rich">${richHtml(b.nodes, ctx.lang)}</div>`, mount: (el) => markSeenGlosses(el, ctx.lang) }; }

export function exAnswerSummary(it) {
  switch (it.type) {
    case 'escolha': case 'ouvir': return '✓ ' + esc(it.options.filter((o) => o.ok).map((o) => plain(o.text)).join(' / '));
    case 'completar': case 'conjugar': case 'pronome': return '✓ ' + esc(it.blanks.map((b) => b.join(' | ')).join(' ; '));
    case 'ordenar': return '✓ ' + esc(it.tokens.join(' '));
    case 'associar': return esc(it.pairs.map((p) => p.join(' = ')).join(' · '));
    case 'vf': return '✓ ' + (it.truth ? 'verdadeiro' : 'falso');
    default: return '✓ ' + esc((it.accept || []).join(' | '));
  }
}

// ---------- caderno de erros ----------
export const errId = (it, lessonId) => (lessonId || '') + '::' + it.type + '::' + (it.prompt || it.text || '').slice(0, 120);
export { recordError, clearError };
function recordError(it, given, ctx) {
  const C = Store.state.caderno;
  const lid = it._lid || ctx.lesson?.id;
  const id = errId(it, lid);
  const ex = JSON.stringify(it); // texto: o Firestore não aceita listas dentro de listas
  C.erros = C.erros.filter((e) => e.id !== id);
  C.erros.unshift({ id, licao: lid || '', titulo: it._rev || ctx.lesson?.titulo || '', lang: ctx.lang, ex, dado: given, t: Date.now() });
  C.erros = C.erros.slice(0, 300);
  save('caderno');
}
function clearError(it, ctx) {
  const C = Store.state.caderno;
  const id = errId(it, it._lid || ctx.lesson?.id);
  const n = C.erros.length;
  C.erros = C.erros.filter((e) => e.id !== id);
  if (C.erros.length !== n) save('caderno');
}

// ---------- glossário (popover) ----------
function markSeenGlosses(el, lang) {
  el.querySelectorAll('.gloss').forEach((g) => {
    const e = lookup(lang, g.dataset.w);
    if (e && cardStatus(e.key) !== 'nova') g.classList.add('seen');
  });
}
let popEl = null;
export function closePop() { popEl?.remove(); popEl = null; document.querySelectorAll('.gloss.on').forEach((g) => g.classList.remove('on')); }
export function openGloss(btn, lang, lessonId) {
  closePop();
  btn.classList.add('on');
  const w = btn.dataset.w, given = btn.dataset.m;
  if (btn.classList.contains('gram')) {
    popEl = document.createElement('div'); popEl.className = 'pop';
    popEl.innerHTML = `<div class="caps muted small">Gramática</div><div class="row nowrap between"><div class="w" style="font-size:1.35rem">${esc(w)}</div>${sayBtn(w, { lang })}</div>
      <div class="m">${btn.dataset.g ? inline(btn.dataset.g, { gloss: false }) : '<span class="muted">Trecho em destaque.</span>'}</div>
      <div class="row" style="justify-content:flex-end;margin-top:8px"><button class="btn ghost xs" data-x>Fechar</button></div>`;
    placePop(btn); popEl.querySelector('[data-x]').onclick = closePop; return;
  }
  const e = lookup(lang, w);
  const mean = given || e?.pt || '';
  const key = wordKey(lang, w);
  const saved = Store.state.caderno.salvas[key] || (e && e.salva);
  popEl = document.createElement('div');
  popEl.className = 'pop';
  popEl.innerHTML = `<div class="row nowrap between"><div class="w">${esc(w)}</div>${sayBtn(w, { lang })}</div>
    ${mean ? `<div class="m">${inline(mean, { gloss: false })}</div>` : '<div class="m muted">Sem significado cadastrado.</div>'}
    ${e && e.fr.toLowerCase() !== w.toLowerCase() ? `<div class="small muted">No dicionário: <b>${esc(e.fr)}</b> — ${esc(e.pt)}</div>` : ''}
    ${e?.classe ? `<div class="tiny muted">${esc(e.classe)}</div>` : ''}
    ${e?.ex ? `<div class="small" style="margin-top:6px"><i>${inline(e.ex, { gloss: false })}</i></div>` : ''}
    <div class="row" style="margin-top:12px;justify-content:space-between">
      ${e && !e.salva ? `<span class="status ${cardStatus(e.key)}">no dicionário</span>` : saved ? '<span class="status dominada">salva nos seus cartões</span>' : mean ? '<button class="btn xs sage" data-save>+ Salvar nos meus cartões</button>' : '<span></span>'}
      <button class="btn ghost xs" data-x>Fechar</button></div>`;
  placePop(btn);
  popEl.querySelector('[data-x]').onclick = closePop;
  popEl.querySelector('[data-save]')?.addEventListener('click', () => {
    Store.state.caderno.salvas[key] = { fr: w, pt: plain(mean), lang, licao: lessonId || '', t: Date.now() };
    save('caderno'); rebuild(); introduce([key]);
    toast('Salva nos seus cartões ✿'); closePop();
  });
  TTS.speak(w, { lang });
}
function placePop(btn) {
  document.body.appendChild(popEl);
  const r = btn.getBoundingClientRect();
  const pw = popEl.offsetWidth, ph = popEl.offsetHeight;
  const left = Math.min(window.innerWidth - pw - 12, Math.max(12, r.left + r.width / 2 - pw / 2));
  let top = r.bottom + 8;
  if (top + ph > window.innerHeight - 12) top = r.top - ph - 8;
  popEl.style.left = left + 'px'; popEl.style.top = Math.max(12, top) + 'px';
}
document.addEventListener('click', (e) => {
  if (popEl && !popEl.contains(e.target) && !e.target.closest('.gloss')) closePop();
});

// ---------- salvar frase de um parágrafo ----------
export function pickSentence(fr, pt, ctx) {
  const sents = plain(fr).match(/[^.!?…]+[.!?…]+["»”)]*|[^.!?…]+$/g)?.map((x) => x.trim()).filter((x) => x.length > 1) || [plain(fr)];
  const onlyOne = sents.length === 1;
  modal(`<div class="stack"><h3>Salvar frase nos cartões</h3>
    <p class="small muted" style="margin:0">Ela vai para o modo <b>Frases</b> dos Cartões, com uma palavra escondida para você completar.</p>
    <div class="stack-s">${sents.map((x, i) => `<label class="row nowrap" style="gap:10px;align-items:flex-start;cursor:pointer"><input type="radio" name="fr" value="${i}" ${i === 0 ? 'checked' : ''} style="margin-top:6px"><span>${esc(x)}</span></label>`).join('')}</div>
    <div><label class="lbl">Tradução (opcional)</label><input class="input" data-pt value="${onlyOne ? esc(plain(pt || '')) : ''}" placeholder="${onlyOne ? '' : esc(plain(pt || '').slice(0, 80))}"></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div></div>`, (m, close) => {
    m.querySelector('[data-ok]').onclick = () => {
      const i = +m.querySelector('input[name=fr]:checked').value;
      saveSentence(ctx.lang, sents[i], m.querySelector('[data-pt]').value, { titulo: ctx.lesson?.titulo, licao: ctx.lesson?.id });
      close(); toast('Frase salva nos cartões ✿');
    };
  });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });

// ---------------------------------------------------------------
//  Player
// ---------------------------------------------------------------
export function openLesson(view, id, { go }) {
  teardown();
  const L = lessonById(id);
  if (!L) { view.innerHTML = `<div class="empty" data-notfound><span class="orn">❦</span>Lição não encontrada (ou ainda carregando).<div style="margin-top:14px"><button class="btn" onclick="location.hash='#trilha'">Voltar à trilha</button></div></div>`; return; }
  const blocks = L.parsed.blocks;
  const prog = lessonProg(L.id);
  const S = { i: -1, start: Date.now(), ex: { ok: 0, total: 0 }, newWords: 0, exDone: new Set() };

  const ctx = { lang: L.lang, lesson: L, onExDone: (b, arr) => { S.ex.ok += arr.filter((r) => r.ok).length; S.ex.total += arr.length; S.exDone.add(b.idx); updateFoot(); } };

  function render() {
    teardown();
    window.scrollTo({ top: 0 });
    if (S.i < 0) return renderIntro();
    if (S.i >= blocks.length) return renderEnd();
    const b = blocks[S.i];
    const feitos = new Set(lessonProg(L.id)?.feitos || []);
    const r = renderBlock(b, ctx);
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Sair da lição">✕</button>
        <div class="steps">${blocks.map((x, k) => `<button title="${esc(BLOCK_TYPES[x.type].label)}${x.title ? ' — ' + esc(x.title) : ''}" data-step="${k}" class="${k === S.i ? 'cur' : feitos.has(k) ? 'done' : ''}"></button>`).join('')}</div>
        <span class="small muted">${S.i + 1}/${blocks.length}</span></div>
      <div class="card block-card" data-block>${r.html}</div>
      <div class="lesson-foot"><button class="btn ghost" data-prev>${S.i > 0 ? '← Anterior' : '← Início'}</button><button class="btn primary lg" data-next>Continuar →</button></div>
    </div>`;
    r.mount?.(view.querySelector('[data-block]'));
    view.querySelector('[data-close]').onclick = () => go('#trilha');
    view.querySelector('[data-prev]').onclick = () => { S.i--; render(); };
    view.querySelector('[data-next]').onclick = () => complete();
    view.querySelectorAll('[data-step]').forEach((s) => (s.onclick = () => { S.i = +s.dataset.step; render(); }));
    view.querySelector('[data-block]').addEventListener('click', (e) => { const g = e.target.closest('.gloss'); if (g) openGloss(g, L.lang, L.id); bump(); });
    setLessonProg(L.id, { passo: S.i, status: lessonProg(L.id)?.status === 'concluida' ? 'concluida' : 'andamento' });
    updateFoot();
  }
  function updateFoot() {
    const b = blocks[S.i]; const nx = view.querySelector('[data-next]');
    if (!b || !nx) return;
    if (b.type === 'exercicios' && !S.exDone.has(b.idx)) { nx.textContent = 'Pular →'; nx.classList.remove('primary'); }
    else { nx.textContent = S.i === blocks.length - 1 ? 'Concluir ✓' : 'Continuar →'; nx.classList.add('primary'); }
  }
  function complete() {
    const b = blocks[S.i];
    const p = lessonProg(L.id) || { feitos: [] };
    const feitos = new Set(p.feitos || []);
    if (!(b.type === 'exercicios' && !S.exDone.has(b.idx))) feitos.add(S.i);
    if (b.type === 'vocab' || b.type === 'expressoes') S.newWords += introduce(b.items.map((w) => wordKey(L.lang, w.fr)), L.id);
    setLessonProg(L.id, { feitos: [...feitos] });
    bump();
    S.i++; render();
  }
  function renderIntro() {
    const p = lessonProg(L.id);
    const m = L.meta;
    const feitos = new Set(p?.feitos || []);
    view.innerHTML = `<div class="lesson-shell fade-in">
      <div class="lesson-top"><button class="icon-btn" data-close title="Voltar">✕</button><div class="grow"></div>${Store.isAdmin ? '<button class="btn sm" data-editme>✎ Editar aula</button>' : ''}</div>
      <div class="card block-card stack">
        <div class="caps muted">${m.nivel ? esc(m.nivel) + ' · ' + esc(LEVEL_NAMES[m.nivel]) : 'Lição extra'}${m.unidade ? ' · ' + esc(m.unidade) : ''}</div>
        <h1>${esc(L.titulo)}</h1>
        ${m.descricao ? `<p style="margin:0;font-size:1.1em">${inline(m.descricao, { gloss: false })}</p>` : ''}
        <div class="row">${m.tempo ? `<span class="chip">≈ ${m.tempo} min</span>` : ''}${L.parsed.words.length ? `<span class="chip">${plural(L.parsed.words.length, 'palavra')}</span>` : ''}</div>
        ${m.temas.length ? `<div class="row"><span class="caps muted small">Temas</span>${m.temas.map((t) => `<span class="chip sage">${esc(t)}</span>`).join('')}</div>` : ''}
        ${m.gramatica.length ? `<div class="row"><span class="caps muted small">Gramática</span>${m.gramatica.map((t) => `<span class="chip butter">§ ${esc(t)}</span>`).join('')}</div>` : ''}
        <hr class="orn">
        <div class="stack-s">${blocks.map((b, k) => `<button class="row nowrap btn ghost" style="justify-content:flex-start;width:100%;border-radius:12px;padding:8px 10px" data-jump="${k}">
          <span class="chip t-${b.type}" style="min-width:34px;justify-content:center">${BLOCK_TYPES[b.type].icon}</span>
          <span class="grow" style="text-align:left;white-space:normal">${esc(BLOCK_TYPES[b.type].label)}${b.title ? ` · <i>${inline(b.title, { gloss: false })}</i>` : ''}</span>${feitos.has(k) ? '<span style="color:var(--sage-d)">✓</span>' : ''}</button>`).join('')}</div>
        <div class="row" style="justify-content:flex-end;margin-top:12px">
          ${p && p.passo > 0 && p.status !== 'concluida' ? `<button class="btn" data-restart>Recomeçar</button><button class="btn primary lg" data-go="${p.passo}">Continuar de onde parei</button>` : `<button class="btn primary lg" data-go="0">${p?.status === 'concluida' ? 'Refazer lição' : 'Começar'}</button>`}
        </div>
        ${p?.status === 'concluida' ? `<p class="small muted" style="text-align:right;margin:0">Concluída em ${fmtDate(p.concluidaEm)}${p.melhor != null ? ` · melhor resultado ${p.melhor}%` : ''}</p>` : ''}
      </div></div>`;
    view.querySelector('[data-close]').onclick = () => go('#trilha');
    view.querySelector('[data-editme]')?.addEventListener('click', () => go('#estudio', { edit: L.id }));
    view.querySelectorAll('[data-jump]').forEach((x) => (x.onclick = () => { S.i = +x.dataset.jump; render(); }));
    view.querySelector('[data-go]').onclick = (e) => { S.i = +e.target.dataset.go; render(); };
    view.querySelector('[data-restart]')?.addEventListener('click', () => { setLessonProg(L.id, { feitos: [], passo: 0 }); S.i = 0; render(); });
  }
  function renderEnd() {
    const pct = S.ex.total ? Math.round((S.ex.ok / S.ex.total) * 100) : null;
    const p = lessonProg(L.id) || {};
    setLessonProg(L.id, { status: 'concluida', concluidaEm: Date.now(), passo: 0, melhor: pct == null ? p.melhor ?? null : Math.max(pct, p.melhor || 0), vezes: (p.vezes || 0) + 1 });
    const mins = Math.max(1, Math.round((Date.now() - S.start) / 60000));
    const idx = LESSONS.findIndex((x) => x.id === L.id);
    const next = LESSONS.slice(idx + 1).find((x) => x.lang === L.lang);
    view.innerHTML = `<div class="lesson-shell fade-in"><div class="card end stack">
      <div class="orn">❦</div><h1>Leçon terminée</h1><p class="muted" style="margin:0">${esc(L.titulo)}</p>
      <div class="grid g3" style="margin:22px 0 8px">
        <div class="card flat stat"><div class="v">${pct == null ? '—' : pct + '%'}</div><div class="k">acertos de primeira</div></div>
        <div class="card flat stat"><div class="v">${S.newWords}</div><div class="k">palavras novas na revisão</div></div>
        <div class="card flat stat"><div class="v">${mins}</div><div class="k">${mins === 1 ? 'minuto' : 'minutos'}</div></div>
      </div>
      <div class="row" style="justify-content:center">
        ${L.parsed.words.length ? `<button class="btn sage" data-rev>Treinar as palavras desta lição</button>` : ''}
        <button class="btn" data-back>Voltar à trilha</button>
        ${next ? `<button class="btn primary" data-next>Próxima: ${esc(next.titulo)} →</button>` : ''}
      </div></div></div>`;
    view.querySelector('[data-back]').onclick = () => go('#trilha');
    view.querySelector('[data-next]')?.addEventListener('click', () => go('#licao/' + next.id));
    view.querySelector('[data-rev]')?.addEventListener('click', () => go('#cartoes', { licao: L.id }));
  }
  render();
}
