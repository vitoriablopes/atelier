// Exercícios: baterias avulsas (interpretação de texto, conjugação, pronomes…) com filtros e correção
import { EX_LABELS, LEVEL_NAMES, levelIndex } from './parser.js';
import { esc, inline, plural, fmtDate, toast, langInfo } from './util.js';
import { Store, save } from './store.js';
import { batteriesOf, lessonById, bump } from './data.js';
import { renderBlock, teardown, openGloss } from './lesson.js';
import { importFiles, pasteLessons } from './studio.js';

const PF = { nivel: '', gram: '', tipo: '', feito: '' };
const typesOf = (L) => {
  const t = new Set();
  L.parsed.blocks.forEach((b) => b.type === 'exercicios' && b.items.forEach((it) => t.add(it.type)));
  if (L.parsed.blocks.some((b) => b.type === 'texto')) t.add('interpretacao');
  return [...t];
};
const LABEL = { ...EX_LABELS, interpretacao: 'Interpretação de texto' };
const nItems = (L) => L.parsed.blocks.reduce((a, b) => a + (b.type === 'exercicios' ? b.items.length : 0), 0);

export function renderPractice(v, { go }) {
  const lang = Store.state.perfil.idioma;
  const all = batteriesOf(lang);
  const R = Store.state.progresso.baterias || {};
  const niveis = [...new Set(all.map((L) => L.nivel))].sort((a, b) => levelIndex(a) - levelIndex(b));
  const grams = [...new Set(all.flatMap((L) => L.meta.gramatica))].sort((a, b) => a.localeCompare(b, 'pt'));
  const tipos = [...new Set(all.flatMap(typesOf))];
  const ls = all.filter((L) => (!PF.nivel || L.nivel === (PF.nivel === 'geral' ? '' : PF.nivel)) && (!PF.gram || L.meta.gramatica.includes(PF.gram))
    && (!PF.tipo || typesOf(L).includes(PF.tipo)) && (!PF.feito || (PF.feito === 'sim') === !!R[L.id]));
  const sel = (name, opts, label) => `<select class="select" data-pf="${name}"><option value="">${label}</option>${opts.map(([val, t]) => `<option value="${esc(val)}" ${PF[name] === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  v.innerHTML = `<div class="wrap fade-in"><div class="page-head"><div class="kicker">Exercícios · ${esc(langInfo(lang).nome)}</div><h1>Baterias de <em class="it">exercícios</em></h1>
    <p>Treino focado: interpretação de texto, conjugação, pronomes e o que mais você pedir. Gere com IA, importe e pratique quantas vezes quiser.</p></div>
    <div class="row" style="margin-bottom:16px">
      <button class="btn primary" data-studio-tab="prompt-exercicios">✦ Gerar bateria com IA</button>
      <button class="btn" data-paste>Colar bateria</button>
      <label class="btn">Importar arquivos<input type="file" multiple accept=".zip,.json,.txt,application/zip,application/json,text/plain" data-import hidden></label>
    </div>
    ${all.length ? `<div class="filters" style="margin-bottom:18px">${sel('nivel', niveis.map((n) => [n || 'geral', n ? n + ' · ' + LEVEL_NAMES[n] : 'Geral (sem nível)']), 'Todos os níveis')}
      ${grams.length ? sel('gram', grams.map((g) => [g, g]), 'Todos os tópicos gramaticais') : ''}
      ${tipos.length ? sel('tipo', tipos.map((t) => [t, LABEL[t] || t]), 'Todos os tipos') : ''}
      ${sel('feito', [['nao', 'não feitas'], ['sim', 'já feitas']], 'Feitas e não feitas')}</div>` : ''}
    ${!all.length ? `<div class="card empty stack"><span class="orn">✎</span><div>Nenhuma bateria de exercícios de ${esc(langInfo(lang).nome.toLowerCase())} ainda.</div>
      <div class="small">Clique em <b>Gerar bateria com IA</b>: escolha os tipos de exercício e o tópico gramatical (ou um nível inteiro), copie o prompt, mande para a IA e cole a resposta aqui.</div></div>`
      : !ls.length ? '<div class="card empty">Nenhuma bateria com esses filtros.</div>' : ''}
    <div class="lib-grid">${ls.map((L) => {
      const r = R[L.id];
      return `<div class="card lib-card" role="button" tabindex="0" data-run="${esc(L.id)}">
        <div class="row between"><span class="lvl ${L.nivel ? '' : 'extra'}" style="height:28px;min-width:38px;font-size:1rem">${L.nivel || '✦'}</span>${r ? `<span class="status ${r.melhor >= 80 ? 'dominada' : 'aprendendo'}">melhor ${r.melhor}%</span>` : ''}</div>
        <h3 style="margin-top:12px">${esc(L.titulo)}</h3>
        ${L.meta.descricao ? `<p class="small" style="margin:6px 0 0">${inline(L.meta.descricao, { gloss: false })}</p>` : ''}
        <div class="blocks-mini" style="margin-top:10px">${L.meta.gramatica.map((t) => `<span class="tag-gram">§ ${esc(t)}</span>`).join('')}${typesOf(L).map((t) => `<span>${esc(LABEL[t] || t)}</span>`).join('')}</div>
        <div class="small muted" style="margin-top:auto;padding-top:12px">${plural(nItems(L), 'questão', 'questões')}${L.meta.tempo ? ' · ≈ ' + L.meta.tempo + ' min' : ''}${r ? ' · feita ' + plural(r.vezes || 1, 'vez', 'vezes') : ''}</div>
      </div>`;
    }).join('')}</div></div>`;
  const rerender = () => renderPractice(v, { go });
  v.querySelectorAll('[data-pf]').forEach((s) => (s.onchange = () => { PF[s.dataset.pf] = s.value; rerender(); }));
  v.querySelector('[data-paste]').onclick = () => pasteLessons(rerender);
  v.querySelector('[data-import]').onchange = (e) => { importFiles([...e.target.files], rerender); e.target.value = ''; };
  v.querySelectorAll('[data-run]').forEach((c) => {
    c.onclick = () => go('#bateria/' + c.dataset.run);
    c.onkeydown = (e) => e.key === 'Enter' && go('#bateria/' + c.dataset.run);
  });
}

export function openBattery(v, id, { go }) {
  teardown();
  const L = lessonById(id);
  if (!L) { v.innerHTML = `<div class="empty" data-notfound><span class="orn">✎</span>Bateria não encontrada (ou ainda carregando).<div style="margin-top:14px"><button class="btn" data-goto="exercicios">Voltar</button></div></div>`; return; }
  const m = L.meta, lang = L.lang;
  const exBlocks = L.parsed.blocks.filter((b) => b.type === 'exercicios');
  const score = { ok: 0, total: 0, done: new Set() };
  const ctx = {
    lang, lesson: L, noMix: true,
    onExDone: (b, arr) => {
      if (score.done.has(b.idx)) return;
      score.done.add(b.idx); score.ok += arr.filter((r) => r.ok).length; score.total += arr.length;
      if (score.done.size === exBlocks.length) finish();
    },
  };
  const finish = () => {
    const nota = score.total ? Math.round((score.ok / score.total) * 100) : 0;
    const B = (Store.state.progresso.baterias ||= {});
    const prev = B[L.id];
    B[L.id] = { nota, melhor: Math.max(nota, prev?.melhor || 0), vezes: (prev?.vezes || 0) + 1, t: Date.now() };
    save('progresso');
    const box = v.querySelector('[data-final]');
    box.innerHTML = `<div class="card end stack"><div class="orn">${nota >= 80 ? '✦' : '❦'}</div><h1>${nota >= 90 ? 'Excelente!' : nota >= 70 ? 'Muito bem!' : 'Bom treino!'}</h1>
      <p class="muted" style="margin:0">Você acertou <b>${score.ok}</b> de ${score.total} de primeira (${nota}%).${prev ? ` Seu melhor resultado: ${B[L.id].melhor}%.` : ''}${score.ok < score.total ? ' Os erros foram para o Caderno.' : ''}</p>
      <div class="row" style="justify-content:center"><button class="btn" data-goto="exercicios">Outras baterias</button><button class="btn primary" data-again>Refazer</button></div></div>`;
    box.querySelector('[data-again]').onclick = () => openBattery(v, id, { go });
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  v.innerHTML = `<div class="reader fade-in">
    <div class="lesson-top"><button class="icon-btn" data-back title="Voltar">✕</button><div class="grow"></div>${Store.isAdmin ? '<button class="btn ghost sm" data-editme>✎ Editar</button>' : ''}</div>
    <div class="card block-card stack">
      <div class="caps muted">${m.nivel ? esc(m.nivel) + ' · ' + esc(LEVEL_NAMES[m.nivel]) : 'Geral'}${m.tempo ? ' · ≈ ' + m.tempo + ' min' : ''} · ${plural(nItems(L), 'questão', 'questões')}</div>
      <h1>${esc(L.titulo)}</h1>
      ${m.descricao ? `<p style="margin:0">${inline(m.descricao, { gloss: false })}</p>` : ''}
      <div class="row">${m.gramatica.map((t) => `<span class="chip butter">§ ${esc(t)}</span>`).join('')}${m.temas.map((t) => `<span class="chip sage">${esc(t)}</span>`).join('')}</div>
    </div>
    ${L.parsed.blocks.map((b, i) => `<div class="card block-card" style="margin-top:18px" data-bb="${i}"></div>`).join('')}
    <div data-final style="margin-top:18px"></div>
  </div>`;
  L.parsed.blocks.forEach((b, i) => { const r = renderBlock(b, ctx); const el = v.querySelector(`[data-bb="${i}"]`); el.innerHTML = r.html; r.mount?.(el); });
  v.querySelector('[data-back]').onclick = () => go('#exercicios');
  v.querySelector('[data-editme]')?.addEventListener('click', () => go('#estudio', { edit: L.id }));
  v.querySelector('.reader').addEventListener('click', (e) => { const g = e.target.closest('.gloss'); if (g) openGloss(g, lang, L.id); bump(); });
}
