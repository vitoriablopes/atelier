// Biblioteca: textos para ler com palavras clicáveis, destaques gramaticais e tradução por parágrafo
import { BLOCK_TYPES, LEVEL_NAMES, levelIndex, plain, wordKey } from './parser.js';
import { esc, inline, sayBtn, plural, fmtDate, toast, langInfo } from './util.js';
import * as TTS from './speech.js';
import { Store, save } from './store.js';
import { libraryOf, lessonById, lookup, cardStatus, introduce, bump } from './data.js';
import { renderBlock, teardown, openGloss, pickSentence } from './lesson.js';
import { recBtn } from './voice.js';

const LF = { nivel: '', tema: '', lido: '' };
let mode = 'texto'; // texto | paragrafo | lado

function glossStats(L) {
  const words = new Set();
  L.parsed.blocks.filter((b) => b.type === 'texto').forEach((b) => b.paras.forEach((p) => {
    for (const m of p.fr.matchAll(/\{([^{}|]+?)(?:\|[^{}]*)?\}/g)) words.add(m[1].trim().toLowerCase());
  }));
  let known = 0;
  for (const w of words) { const e = lookup(L.lang, w); if (e && cardStatus(e.key) !== 'nova') known++; }
  return { total: words.size, known };
}
const wordCount = (L) => L.parsed.blocks.filter((b) => b.type === 'texto').reduce((a, b) => a + b.paras.reduce((x, p) => x + plain(p.fr).split(/\s+/).length, 0), 0);

export function renderLibrary(v, { go }) {
  const lang = Store.state.perfil.idioma;
  const all = libraryOf(lang);
  const lidos = Store.state.progresso.lidos || {};
  const temas = [...new Set(all.flatMap((L) => L.meta.temas))].sort((a, b) => a.localeCompare(b, 'pt'));
  const niveis = [...new Set(all.map((L) => L.nivel))].sort((a, b) => levelIndex(a) - levelIndex(b));
  const ls = all.filter((L) => (!LF.nivel || L.nivel === LF.nivel || (LF.nivel === 'extra' && !L.nivel)) && (!LF.tema || L.meta.temas.includes(LF.tema)) && (!LF.lido || (LF.lido === 'sim') === !!lidos[L.id]));
  const sel = (name, opts, label) => `<select class="select" data-lf="${name}"><option value="">${label}</option>${opts.map(([val, t]) => `<option value="${esc(val)}" ${LF[name] === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  v.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="kicker">Biblioteca · ${esc(langInfo(lang).nome)}</div><h1>Para <em class="it">ler</em> com calma</h1>
    <p>Textos de verdade, com as palavras-chave para tocar, destaques de gramática e tradução por parágrafo quando você quiser.</p></div>
    ${all.length ? `<div class="filters" style="margin-bottom:18px">${sel('nivel', niveis.map((n) => [n || 'extra', n ? n + ' · ' + LEVEL_NAMES[n] : 'Extras']), 'Todos os níveis')}${temas.length ? sel('tema', temas.map((t) => [t, t]), 'Todos os temas') : ''}${sel('lido', [['nao', 'para ler'], ['sim', 'já lidos']], 'Lidos e não lidos')}</div>` : ''}
    ${!all.length ? `<div class="card empty stack"><span class="orn">❧</span><div>A biblioteca de ${esc(langInfo(lang).nome.toLowerCase())} ainda está vazia.</div>
      <div class="small">Dê um link ou PDF para a IA com o prompt pronto, cole a resposta no Estúdio e o texto aparece aqui.</div>
      <div class="row" style="justify-content:center"><button class="btn primary" data-studio-tab="prompt-biblioteca">Prompt da biblioteca</button><button class="btn" data-studio-tab="novo-texto">Colar um texto</button></div></div>`
      : !ls.length ? '<div class="card empty">Nenhum texto com esses filtros.</div>' : ''}
    <div class="lib-grid">${ls.map((L) => {
      const g = glossStats(L), w = wordCount(L), lido = lidos[L.id];
      return `<div class="card lib-card" role="button" tabindex="0" data-read="${esc(L.id)}">
        <div class="row between"><span class="lvl ${L.nivel ? '' : 'extra'}" style="height:28px;min-width:38px;font-size:1rem">${L.nivel || '✦'}</span>${lido ? '<span class="status dominada">lido ✓</span>' : ''}</div>
        <h3 style="margin-top:12px">${esc(L.titulo)}</h3>
        ${L.meta.autor || L.meta.obra ? `<div class="small muted it">${esc([L.meta.autor, L.meta.obra].filter(Boolean).join(', '))}</div>` : ''}
        ${L.meta.descricao ? `<p class="small" style="margin:8px 0 0">${inline(L.meta.descricao, { gloss: false })}</p>` : ''}
        <div class="blocks-mini" style="margin-top:10px">${L.meta.temas.map((t) => `<span class="tag-tema">${esc(t)}</span>`).join('')}${L.meta.gramatica.map((t) => `<span class="tag-gram">§ ${esc(t)}</span>`).join('')}</div>
        <div class="small muted" style="margin-top:auto;padding-top:12px">${plural(w, 'palavra')}${L.meta.tempo ? ' · ≈ ' + L.meta.tempo + ' min' : ''}${g.total ? ` · você conhece ${g.known}/${g.total} destaques` : ''}</div>
        ${g.total ? `<div class="progress" style="margin-top:6px"><i style="width:${Math.round((g.known / g.total) * 100)}%"></i></div>` : ''}
      </div>`;
    }).join('')}</div></div>`;
  v.querySelectorAll('[data-lf]').forEach((s) => (s.onchange = () => { LF[s.dataset.lf] = s.value; renderLibrary(v, { go }); }));
  v.querySelectorAll('[data-read]').forEach((c) => {
    c.onclick = () => go('#leitura/' + c.dataset.read);
    c.onkeydown = (e) => e.key === 'Enter' && go('#leitura/' + c.dataset.read);
  });
}

export function openReading(v, id, { go }) {
  teardown();
  const L = lessonById(id);
  if (!L) { v.innerHTML = `<div class="empty" data-notfound><span class="orn">❧</span>Texto não encontrado (ou ainda carregando).<div style="margin-top:14px"><button class="btn" data-goto="biblioteca">Voltar à biblioteca</button></div></div>`; return; }
  const m = L.meta, lang = L.lang;
  const ctx = { lang, lesson: L, onExDone: () => {} };
  const textos = L.parsed.blocks.filter((b) => b.type === 'texto');
  const outros = L.parsed.blocks.filter((b) => b.type !== 'texto');
  const lido = Store.state.progresso.lidos?.[L.id];
  const fontes = [...m.fontes, ...textos.flatMap((b) => b.fontes || [])];

  const paraHtml = (b, bi) => b.paras.map((p, i) => `<div class="lib-para" data-p="${bi}:${i}">
      <div class="lib-fr"><div class="para-tools">${sayBtn(p.fr, { lang, size: 'sm', title: 'Ouvir' })}${recBtn(p.fr, { lang })}<button class="icon-btn sm" data-savefrase="${bi}:${i}" title="Salvar uma frase nos cartões">＋</button></div><p>${inline(p.fr)}</p></div>
      ${p.pt ? `<div class="lib-pt">${inline(p.pt, { gloss: false })}</div>` : ''}</div>`).join('');

  const draw = () => {
    teardown();
    const g = glossStats(L);
    v.innerHTML = `<div class="reader fade-in mode-${mode}">
      <div class="lesson-top"><button class="icon-btn" data-back title="Voltar">✕</button>
        <div class="seg grow" style="flex:0 1 auto" data-mode>${[['texto', 'Texto'], ['paragrafo', 'Por parágrafo'], ['lado', 'Lado a lado']].map(([k, l]) => `<button data-m="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="grow"></div><button class="btn sm" data-readall>▶ Ouvir</button></div>
      <article class="card reader-card">
        <div class="caps muted">${m.nivel ? esc(m.nivel) + ' · ' + esc(LEVEL_NAMES[m.nivel]) : 'Extra'}${m.tempo ? ' · ≈ ' + m.tempo + ' min' : ''}</div>
        <h1 style="margin-top:6px">${esc(L.titulo)}</h1>
        ${m.autor || m.obra ? `<div class="it muted" style="font-size:1.1em">${esc([m.autor, m.obra].filter(Boolean).join(', '))}</div>` : ''}
        ${m.descricao ? `<p style="margin:10px 0 0">${inline(m.descricao, { gloss: false })}</p>` : ''}
        <div class="row" style="margin-top:12px">${m.temas.map((t) => `<span class="chip sage">${esc(t)}</span>`).join('')}${m.gramatica.map((t) => `<span class="chip butter">§ ${esc(t)}</span>`).join('')}</div>
        <div class="legend small muted"><span><span class="gloss" style="pointer-events:none">palavra</span> toque para ver o significado</span><span><span class="gloss gram" style="pointer-events:none">trecho</span> destaque de gramática</span><span><span class="gloss seen" style="pointer-events:none">palavra</span> já está nos seus cartões</span>${g.total ? `<span>· você conhece <b>${g.known}</b> de ${g.total} destaques</span>` : ''}</div>
        <hr class="orn">
        ${textos.map((b, bi) => `${b.title ? `<h2 class="lib-sec">${inline(b.title, { gloss: false })}</h2>` : ''}<div class="lib-text">${paraHtml(b, bi)}</div>`).join('')}
        ${fontes.length ? `<div class="fonte">${fontes.map((f) => `Fonte: ${esc(f.nome || '')}${f.url ? `${f.nome ? ' — ' : ''}<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a>` : ''}`).join('<br>')}</div>` : ''}
      </article>
      ${outros.map((b, i) => `<div class="card block-card" style="margin-top:18px" data-ob="${i}"></div>`).join('')}
      <div class="row" style="justify-content:center;margin:26px 0">${lido ? `<span class="muted">Lido em ${fmtDate(lido)} ✓</span><button class="btn ghost sm" data-unread>desmarcar</button>` : `<button class="btn primary lg" data-done>Marcar como lido ✓</button>`}</div>
    </div>`;
    outros.forEach((b, i) => { const r = renderBlock(b, ctx); const el = v.querySelector(`[data-ob="${i}"]`); el.innerHTML = r.html; r.mount?.(el); });
    v.querySelectorAll('.gloss').forEach((x) => { const e = !x.classList.contains('gram') && lookup(lang, x.dataset.w); if (e && cardStatus(e.key) !== 'nova') x.classList.add('seen'); });
    v.querySelector('[data-back]').onclick = () => go('#biblioteca');
    v.querySelector('[data-mode]').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { mode = b.dataset.m; const y = scrollY; draw(); scrollTo(0, y); } };
    v.querySelector('.reader-card').addEventListener('click', (e) => { const g = e.target.closest('.gloss'); if (g) openGloss(g, lang, L.id); bump(); });
    v.querySelectorAll('[data-savefrase]').forEach((x) => (x.onclick = () => { const [bi, i] = x.dataset.savefrase.split(':').map(Number); const p = textos[bi].paras[i]; pickSentence(p.fr, p.pt, ctx); }));
    const ra = v.querySelector('[data-readall]');
    ra.onclick = () => {
      if (ra.dataset.on) { TTS.stop(); return; }
      const paras = [...v.querySelectorAll('.lib-para')];
      const items = textos.flatMap((b) => b.paras.map((p) => ({ text: plain(p.fr) })));
      ra.dataset.on = 1; ra.textContent = '■ Parar';
      TTS.speakSeq(items, { lang, gap: 600, onLine: (i) => paras.forEach((p, k) => p.classList.toggle('reading-now', k === i)) })
        .finally(() => { delete ra.dataset.on; ra.textContent = '▶ Ouvir'; paras.forEach((p) => p.classList.remove('reading-now')); });
    };
    v.querySelector('[data-done]')?.addEventListener('click', () => {
      (Store.state.progresso.lidos ||= {})[L.id] = Date.now(); save('progresso');
      const keys = L.parsed.words.map((w) => wordKey(lang, w.fr));
      if (keys.length) introduce(keys, L.id);
      toast(keys.length ? `Lido ✓ ${plural(keys.length, 'palavra do glossário foi', 'palavras do glossário foram')} para os cartões` : 'Lido ✓');
      draw();
    });
    v.querySelector('[data-unread]')?.addEventListener('click', () => { delete Store.state.progresso.lidos[L.id]; save('progresso'); draw(); });
  };
  draw();
}
