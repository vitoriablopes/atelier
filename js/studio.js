// Estúdio: criar/editar, ordenar, exportar/importar lições; modelo do código; prompt; backup
import { parseLesson, BLOCK_TYPES, slugify, LEVELS, LEVEL_NAMES, levelIndex } from './parser.js';
import { esc, toast, confirmBox, copyText, download, langInfo, plural, modal, LANGS } from './util.js';
import { Store, saveLesson, deleteLesson, exportAll, importAll } from './store.js';
import { LESSONS, lessonById, placeAtEnd, moveLesson, rebuild } from './data.js';
import { renderBlock, teardown } from './lesson.js';
import { SNIPPETS, ORDER, TEMPLATE, HEADER, META_DOC, buildPrompt, buildLibraryPrompt, LIB_TEMPLATE } from './modelo.js';

let tab = 'licoes';
let draft = null; // {id, origem, titulo, codigo}
const selected = new Set();

export function renderStudio(view, { go, params = {} }) {
  if (params.tab === 'prompt-biblioteca') { tab = 'prompt'; PF.kind = 'biblioteca'; }
  else if (params.tab === 'novo-texto') { tab = 'editor'; draft = newLibDraft(); }
  else if (params.tab) tab = params.tab;
  if (params.edit) { const L = lessonById(params.edit); if (L) { draft = { id: L.id, origem: L.origem, titulo: L.origem === 'arquivo' ? L.titulo : (Store.lessons[L.origem][L.id]?.titulo || ''), codigo: L.codigo }; tab = 'editor'; } }
  const tabs = [['licoes', 'Lições'], ['editor', draft?.id ? 'Editar lição' : 'Nova lição'], ['prompt', 'Prompt para IA'], ['modelo', 'Modelo do código'], ['backup', 'Backup']];
  view.innerHTML = `<div class="${tab === 'editor' ? '' : 'wrap'} fade-in">
    <div class="page-head"><div class="kicker">Estúdio</div><h1>Estúdio de <em class="it">lições</em></h1>
      <p>${Store.configured ? (Store.lessonTarget === 'nuvem' ? 'Você está conectada como administradora: as lições e a ordem da trilha salvas aqui vão para a nuvem e aparecem em todos os aparelhos.' : Store.user ? 'Sua conta não está na lista de administradoras (config.js): lições ficam só neste aparelho.' : 'Entre na sua conta (Ajustes) para salvar lições na nuvem. Sem entrar, elas ficam só neste aparelho.') : 'Sincronização desligada: as lições criadas aqui ficam neste aparelho. Para publicar para todos os aparelhos, coloque o arquivo na pasta licoes/ do site ou configure o Firebase.'}</p></div>
    <div class="seg" style="margin-bottom:22px;flex-wrap:wrap">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div data-body></div></div>`;
  view.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { if (b.dataset.tab === 'editor' && tab !== 'editor' && !draft) draft = newDraft(); tab = b.dataset.tab; renderStudio(view, { go }); }));
  const body = view.querySelector('[data-body]');
  ({ licoes: tabLessons, editor: tabEditor, modelo: tabModelo, prompt: tabPrompt, backup: tabBackup })[tab](body, { go, view });
}
const newLibDraft = () => ({ id: '', origem: Store.lessonTarget, titulo: '', codigo: LIB_TEMPLATE.replace('@idioma: fr', '@idioma: ' + (Store.state.perfil.idioma || 'fr')) + '\n' });
const newDraft = () => ({ id: '', origem: Store.lessonTarget, titulo: '', codigo: `@idioma: ${Store.state.perfil.idioma || 'fr'}\n@nivel: A1\n@unidade: \n@temas: \n@gramatica: \n@tempo: 15\n@descricao: \n\n` });

// ---------------------------------------------------------------
//  Lista de lições: ordem, seleção, exportar/importar
// ---------------------------------------------------------------
const SRC = { nuvem: 'nuvem', local: 'este aparelho', arquivo: 'arquivo do site' };
const groupOf = (k) => { const [lang, kind, lv] = k.split('|'); return LESSONS.filter((L) => L.lang === lang && L.nivel === lv && (L.tipo === 'biblioteca') === (kind === 'bib')); };
function tabLessons(body, { go, view }) {
  const byLang = {};
  LESSONS.forEach((L) => ((byLang[L.lang] ||= {})[(L.tipo === 'biblioteca' ? 'bib|' : 'lic|') + L.nivel] ||= []).push(L));
  for (const id of [...selected]) if (!lessonById(id)) selected.delete(id);
  const rerender = () => renderStudio(view, { go });

  body.innerHTML = `
    <div class="card row between" style="margin-bottom:18px;position:sticky;top:8px;z-index:5">
      <div class="row"><label class="row nowrap" style="gap:8px;cursor:pointer"><input type="checkbox" data-all ${selected.size && selected.size === LESSONS.length ? 'checked' : ''}> <span>Selecionar todas</span></label>
        <span class="small muted" data-count>${plural(selected.size, 'selecionada', 'selecionadas')}</span></div>
      <div class="row">
        <button class="btn sm" data-export ${selected.size ? '' : 'disabled'}>Exportar selecionadas</button>
        <label class="btn sm">Importar lições<input type="file" multiple accept=".json,.txt,application/json,text/plain" data-import hidden></label>
        <button class="btn sm" data-newlib>+ Texto da biblioteca</button>
        <button class="btn sm primary" data-new>+ Nova lição</button>
      </div>
    </div>
    ${LESSONS.length ? Object.entries(byLang).map(([lang, levels]) => `<h2 style="margin:8px 0 12px">${esc(langInfo(lang).nome)}</h2>
      ${Object.keys(levels).sort((a, b) => a.slice(0, 3).localeCompare(b.slice(0, 3)) * -1 || levelIndex(a.slice(4)) - levelIndex(b.slice(4))).map((gk) => { const lv = gk.slice(4), bib = gk.startsWith('bib'); return `<div class="card" style="margin-bottom:14px">
        <div class="row between"><h3>${bib ? '<span class="chip sage">❧ Biblioteca</span> ' : ''}${lv ? `<span class="chip lav">${lv}</span> ` : ''}${esc(LEVEL_NAMES[lv])}</h3>
          <label class="small row nowrap" style="gap:6px;cursor:pointer"><input type="checkbox" data-lvl="${esc(lang + '|' + gk)}" ${levels[gk].every((L) => selected.has(L.id)) ? 'checked' : ''}> grupo inteiro</label></div>
        ${levels[gk].map((L, i, arr) => `<div class="lesson-row">
          <input type="checkbox" data-sel="${esc(L.id)}" ${selected.has(L.id) ? 'checked' : ''} aria-label="Selecionar ${esc(L.titulo)}">
          <span class="muted small" style="width:1.6em;text-align:right">${i + 1}.</span>
          <div class="grow"><div><b>${esc(L.titulo)}</b> ${L.parsed.warnings.length ? `<span class="chip butter tiny" title="${esc(L.parsed.warnings.map((w) => 'linha ' + w.line + ': ' + w.msg).join('\n'))}">${plural(L.parsed.warnings.length, 'aviso')}</span>` : ''}</div>
            <div class="small muted">${L.meta.unidade ? esc(L.meta.unidade) + ' · ' : ''}${plural(L.parsed.blocks.length, 'bloco')} · <span class="src">${SRC[L.origem]}</span></div></div>
          <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="1" title="Descer" ${i === arr.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn sm" data-edit="${esc(L.id)}">${L.origem === 'arquivo' ? 'Copiar e editar' : 'Editar'}</button>
          <button class="btn ghost sm" data-open="${esc(L.id)}">Abrir</button>
          ${L.origem !== 'arquivo' ? `<button class="btn ghost sm danger" data-del="${esc(L.id)}">Excluir</button>` : ''}</div>`).join('')}</div>`; }).join('')}`).join('')
      : `<div class="card empty"><span class="orn">✒</span>Nenhuma lição ainda. Crie a primeira ou importe um pacote de lições.</div>`}
    <p class="small muted">Lições novas entram no fim da trilha do nível delas; use ↑ ↓ para reordenar. Lições da pasta <code>licoes/</code> do site podem ser reordenadas, mas só são editadas pelo GitHub.</p>`;

  const sync = () => {
    body.querySelector('[data-count]').textContent = plural(selected.size, 'selecionada', 'selecionadas');
    body.querySelector('[data-export]').disabled = !selected.size;
    body.querySelector('[data-all]').checked = selected.size && selected.size === LESSONS.length;
    body.querySelectorAll('[data-sel]').forEach((c) => (c.checked = selected.has(c.dataset.sel)));
    body.querySelectorAll('[data-lvl]').forEach((c) => { c.checked = groupOf(c.dataset.lvl).every((L) => selected.has(L.id)); });
  };
  body.querySelector('[data-all]').onchange = (e) => { selected.clear(); if (e.target.checked) LESSONS.forEach((L) => selected.add(L.id)); sync(); };
  body.querySelectorAll('[data-sel]').forEach((c) => (c.onchange = () => { c.checked ? selected.add(c.dataset.sel) : selected.delete(c.dataset.sel); sync(); }));
  body.querySelectorAll('[data-lvl]').forEach((c) => (c.onchange = () => { groupOf(c.dataset.lvl).forEach((L) => (c.checked ? selected.add(L.id) : selected.delete(L.id))); sync(); }));
  body.querySelector('[data-new]').onclick = () => { draft = newDraft(); tab = 'editor'; rerender(); };
  body.querySelector('[data-newlib]').onclick = () => { draft = newLibDraft(); tab = 'editor'; rerender(); };
  body.querySelector('[data-export]').onclick = () => exportSelected();
  body.querySelector('[data-import]').onchange = (e) => { importFiles([...e.target.files], rerender); e.target.value = ''; };

  body.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const id = t.dataset.edit || t.dataset.open || t.dataset.del || t.dataset.mv;
    const L = id && lessonById(id); if (!L) return;
    if (t.dataset.mv) { await moveLesson(L.id, +t.dataset.d); rerender(); }
    else if (t.dataset.edit) {
      draft = { id: L.origem === 'arquivo' ? '' : L.id, origem: L.origem === 'arquivo' ? Store.lessonTarget : L.origem, titulo: L.origem === 'arquivo' ? L.titulo + ' (cópia)' : Store.lessons[L.origem][L.id]?.titulo || '', codigo: L.codigo };
      tab = 'editor'; rerender();
    } else if (t.dataset.open) go((L.tipo === 'biblioteca' ? '#leitura/' : '#licao/') + L.id);
    else if (t.dataset.del) {
      if (await confirmBox(`Excluir a lição <b>${esc(L.titulo)}</b>? O progresso já feito fica guardado.`, { ok: 'Excluir', danger: true })) { await deleteLesson(L.id, L.origem); selected.delete(L.id); toast('Lição excluída'); rerender(); }
    }
  });
}

function exportSelected() {
  const ls = LESSONS.filter((L) => selected.has(L.id));
  const pack = {
    app: 'atelier', tipo: 'pacote-de-licoes', versao: 1, criado: new Date().toISOString(),
    licoes: ls.map((L) => ({ id: L.id, titulo: L.titulo, idioma: L.lang, nivel: L.nivel, codigo: withTitle(L) })),
  };
  const langs = [...new Set(ls.map((L) => L.lang))].join('-');
  download(`licoes-${langs}-${ls.length}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(pack, null, 1), 'application/json');
  toast(`${plural(ls.length, 'lição exportada', 'lições exportadas')} ✓`);
}
/** Garante que o código leve o título dentro dele (para quem receber). */
function withTitle(L) {
  const code = L.codigo || '';
  if (/^\s*@titulo\s*:/im.test(code)) return code.replace(/^(\s*@titulo\s*:).*$/im, `$1 ${L.titulo}`);
  return `@titulo: ${L.titulo}\n` + code;
}

async function importFiles(files, done) {
  const items = [];
  for (const f of files) {
    const text = await f.text();
    if (/\.json$/i.test(f.name) || /^\s*[{[]/.test(text)) {
      try {
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : data.licoes || [];
        if (!list.length) { toast(`${f.name}: nenhuma lição encontrada`); continue; }
        list.forEach((l) => l && l.codigo && items.push({ titulo: l.titulo || '', codigo: l.codigo, de: f.name }));
      } catch (e) { toast(`${f.name}: arquivo inválido`, 4000); }
    } else items.push({ titulo: '', codigo: text, de: f.name });
  }
  if (!items.length) return;
  items.forEach((it) => {
    it.p = parseLesson(it.codigo, { titulo: it.titulo });
    it.titulo = it.p.meta.titulo || it.titulo || it.de.replace(/\.[^.]+$/, '');
    it.dup = LESSONS.find((L) => L.lang === it.p.meta.idioma && L.titulo.trim().toLowerCase() === it.titulo.trim().toLowerCase());
    it.ok = it.p.blocks.length > 0;
  });
  modal(`<div class="stack"><h2>Importar lições</h2>
    <label class="row nowrap" style="gap:8px"><input type="checkbox" data-iall checked> <b>Selecionar todas</b> <span class="small muted">(${items.length})</span></label>
    <div class="stack-s" style="max-height:46vh;overflow:auto">${items.map((it, i) => `<label class="row nowrap" style="gap:10px;align-items:flex-start;cursor:pointer;padding:6px 0;border-bottom:1px solid var(--line)">
      <input type="checkbox" data-i="${i}" ${it.ok ? 'checked' : 'disabled'} style="margin-top:6px">
      <div class="grow"><div><b>${esc(it.titulo)}</b></div><div class="small muted">${it.p.meta.tipo === 'biblioteca' ? '❧ Biblioteca · ' : ''}${esc(langInfo(it.p.meta.idioma).nome)} · ${it.p.meta.nivel || 'Extras'} · ${plural(it.p.blocks.length, 'bloco')}${it.dup ? ' · <span style="color:var(--rose-d)">já existe uma com esse título</span>' : ''}${!it.ok ? ' · <span style="color:var(--bad)">sem blocos válidos</span>' : ''}</div></div></label>`).join('')}</div>
    ${items.some((it) => it.dup) ? `<div class="stack-s"><div class="small"><b>Quando já existir uma lição com o mesmo título:</b></div>
      <label class="row nowrap small" style="gap:8px"><input type="radio" name="dup" value="copia" checked> manter as duas (a importada vira uma lição nova)</label>
      <label class="row nowrap small" style="gap:8px"><input type="radio" name="dup" value="substituir"> substituir a existente (exceto arquivos do site)</label></div>` : ''}
    <p class="small muted" style="margin:0">As lições entram no fim da trilha do nível delas${Store.lessonTarget === 'nuvem' ? ', na nuvem' : ', neste aparelho'}.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-go>Importar</button></div></div>`,
  (m, close) => {
    const boxes = [...m.querySelectorAll('[data-i]')];
    m.querySelector('[data-iall]').onchange = (e) => boxes.forEach((b) => !b.disabled && (b.checked = e.target.checked));
    m.querySelector('[data-go]').onclick = async () => {
      const mode = m.querySelector('input[name=dup]:checked')?.value || 'copia';
      const chosen = boxes.filter((b) => b.checked).map((b) => items[+b.dataset.i]);
      if (!chosen.length) return toast('Nenhuma lição selecionada.');
      m.querySelector('[data-go]').disabled = true;
      let n = 0;
      try {
        for (const it of chosen) {
          const replace = mode === 'substituir' && it.dup && it.dup.origem !== 'arquivo';
          const id = replace ? it.dup.id : slugify(it.titulo) + '-' + Math.random().toString(36).slice(2, 6);
          const target = replace ? it.dup.origem : Store.lessonTarget;
          await saveLesson({ id, titulo: it.titulo, codigo: it.codigo }, target);
          if (!replace) await placeAtEnd(id);
          n++;
        }
        toast(`${plural(n, 'lição importada', 'lições importadas')} ✓`);
      } catch (e) { console.error(e); toast('Erro ao importar: ' + e.message, 5000); }
      close(); done?.();
    };
  });
}

// ---------------------------------------------------------------
//  Editor
// ---------------------------------------------------------------
function tabEditor(body, { go, view }) {
  draft ||= newDraft();
  body.innerHTML = `<div class="editor">
    <div class="stack">
      <div><label class="lbl">Título da lição</label><input class="input" data-title value="${esc(draft.titulo)}" placeholder="Ex.: Au café"></div>
      <div><label class="lbl">Inserir bloco</label><div class="snip">${ORDER.map((k) => `<button class="chip t-${k}" data-snip="${k}">${BLOCK_TYPES[k].icon} ${BLOCK_TYPES[k].label}</button>`).join('')}</div></div>
      <div><label class="lbl">Código da lição</label><textarea class="textarea code-area" data-code spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off">${esc(draft.codigo)}</textarea></div>
      <div data-warns></div>
      <div class="row">
        <button class="btn primary" data-save>Salvar ${(draft.id ? draft.origem : Store.lessonTarget) === 'nuvem' ? 'na nuvem' : 'neste aparelho'}</button>
        <button class="btn" data-dl title="Baixar como arquivo para a pasta licoes/ do site">Baixar .txt</button>
        <button class="btn ghost" data-cancel>Fechar</button>
      </div>
      <p class="tiny muted" style="margin:0">Dica: com <code>@tipo: biblioteca</code> no topo, o texto vai para a Biblioteca em vez da Trilha.</p>
    </div>
    <div class="preview card soft"><div class="caps muted" style="margin-bottom:12px">Pré-visualização</div><div data-prev></div></div>
  </div>`;
  const ta = body.querySelector('[data-code]'), ti = body.querySelector('[data-title]');
  const prev = body.querySelector('[data-prev]'), warns = body.querySelector('[data-warns]');
  let t;
  const refresh = () => {
    draft.codigo = ta.value; draft.titulo = ti.value;
    const p = parseLesson(ta.value, { titulo: ti.value });
    warns.innerHTML = p.warnings.length ? `<ul class="warns">${p.warnings.map((w) => `<li class="${w.level}" data-line="${w.line}"><b>Linha ${w.line}:</b> ${esc(w.msg)}</li>`).join('')}</ul>` : `<div class="small" style="color:var(--sage-d)">✓ Tudo certo: ${plural(p.blocks.length, 'bloco')}, ${plural(p.words.length, 'palavra')}.</div>`;
    teardown();
    const ctx = { lang: p.meta.idioma, preview: true, lesson: { id: 'preview', titulo: p.meta.titulo } };
    const m = p.meta;
    prev.innerHTML = `<h2>${esc(m.titulo || 'Sem título')}</h2>
      <div class="row" style="margin:8px 0 16px">${m.tipo === 'biblioteca' ? '<span class="chip sage">❧ Biblioteca</span>' : ''}<span class="chip lav">${m.nivel || 'Extras'}</span><span class="chip">${esc(langInfo(m.idioma).nome)}</span>${m.unidade ? `<span class="chip">${esc(m.unidade)}</span>` : ''}
        ${m.temas.map((x) => `<span class="chip sage">${esc(x)}</span>`).join('')}${m.gramatica.map((x) => `<span class="chip butter">§ ${esc(x)}</span>`).join('')}</div>` +
      p.blocks.map((b, i) => `<div class="card" style="margin-bottom:14px" data-pb="${i}"></div>`).join('');
    p.blocks.forEach((b, i) => {
      const r = renderBlock(b, ctx); const el = prev.querySelector(`[data-pb="${i}"]`);
      el.innerHTML = r.html; try { r.mount?.(el); } catch (e) { console.warn(e); }
    });
  };
  ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 350); });
  ti.addEventListener('input', () => { clearTimeout(t); t = setTimeout(refresh, 350); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); } });
  warns.addEventListener('click', (e) => {
    const li = e.target.closest('[data-line]'); if (!li) return;
    const n = +li.dataset.line; const lines = ta.value.split('\n');
    const pos = lines.slice(0, n - 1).join('\n').length + (n > 1 ? 1 : 0);
    ta.focus(); ta.setSelectionRange(pos, pos + (lines[n - 1] || '').length);
    ta.scrollTop = Math.max(0, (n - 5) * 22.4);
  });
  body.querySelectorAll('[data-snip]').forEach((b) => (b.onclick = () => {
    const code = '\n' + SNIPPETS[b.dataset.snip].code + '\n';
    const s = ta.selectionStart ?? ta.value.length;
    const atLineStart = s === 0 || ta.value[s - 1] === '\n';
    ta.setRangeText((atLineStart ? '' : '\n') + code, s, ta.selectionEnd, 'end');
    ta.focus(); refresh();
  }));
  body.querySelector('[data-save]').onclick = async () => {
    const p = parseLesson(ta.value, { titulo: ti.value });
    if (!ti.value.trim() && !p.meta.titulo) return toast('Dê um título à lição.');
    if (!p.blocks.length) return toast('A lição precisa de pelo menos um bloco.');
    const errs = p.warnings.filter((w) => w.level === 'erro');
    if (errs.length && !(await confirmBox(`Há ${plural(errs.length, 'erro')} — os itens com erro não vão aparecer. Salvar mesmo assim?`))) return;
    try {
      const isNew = !draft.id;
      const old = !isNew && lessonById(draft.id);
      const target = isNew ? Store.lessonTarget : draft.origem;
      const id = draft.id || slugify(ti.value || p.meta.titulo) + '-' + Date.now().toString(36).slice(-4);
      await saveLesson({ id, titulo: ti.value.trim(), codigo: ta.value }, target);
      // nova lição, ou mudou de nível/idioma → vai para o fim da trilha do nível
      if (isNew || !old || old.nivel !== (p.meta.nivel || '') || old.lang !== p.meta.idioma) await placeAtEnd(id);
      draft = { ...draft, id, origem: target };
      toast(target === 'nuvem' ? 'Salva na nuvem ✓' : 'Salva neste aparelho ✓');
      renderStudio(view, { go });
    } catch (e) { console.error(e); toast('Não foi possível salvar: ' + e.message, 5000); }
  };
  body.querySelector('[data-dl]').onclick = () => {
    let code = ta.value;
    if (ti.value.trim() && !/^\s*@titulo\s*:/im.test(code)) code = `@titulo: ${ti.value.trim()}\n` + code;
    download(slugify(ti.value || 'licao') + '.txt', code);
  };
  body.querySelector('[data-cancel]').onclick = () => { draft = null; tab = 'licoes'; renderStudio(view, { go }); };
  refresh();
}

// ---------------------------------------------------------------
//  Modelo, prompt, backup
// ---------------------------------------------------------------
function tabModelo(body) {
  body.innerHTML = `<div class="card stack">
    <div class="row between"><h2>Modelo completo</h2><div class="row"><button class="btn sm" data-copy>Copiar modelo</button><button class="btn sm" data-dl>Baixar .txt</button></div></div>
    <p class="muted" style="margin:0">Uma lição é texto puro: metadados (linhas <code>@</code>) e blocos (<code>== TIPO | título</code>). Só aparecem os blocos que você colocar; repita qualquer tipo quantas vezes quiser, na ordem que quiser.</p>
    <pre class="ref">${esc(TEMPLATE)}</pre></div>
    <h2 style="margin:30px 0 14px">Referência</h2>
    <div class="card stack"><h3>Metadados (início da lição)</h3><pre class="ref">${esc(HEADER)}</pre>
      <div class="tbl-wrap rich"><table class="ref-table">${META_DOC.map(([k, d]) => `<tr><td><code>${esc(k)}</code></td><td class="small">${esc(d)}</td></tr>`).join('')}</table></div></div>
    ${ORDER.map((k) => `<div class="card stack" style="margin-top:14px"><div class="row"><span class="chip t-${k}">${BLOCK_TYPES[k].icon}</span><h3>${esc(SNIPPETS[k].titulo)}</h3><div class="grow"></div><button class="btn xs" data-c="${k}">Copiar</button></div>
      <pre class="ref">${esc(SNIPPETS[k].code)}</pre><ul class="small">${SNIPPETS[k].explica.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
    <div class="card stack" style="margin-top:14px"><div class="row"><span class="chip sage">❧</span><h3>Texto da Biblioteca</h3><div class="grid"></div><button class="btn xs" data-libcopy>Copiar</button></div>
      <p class="small muted" style="margin:0">Mesmo formato das lições, com <code>@tipo: biblioteca</code> no topo. O leitor mostra o texto inteiro (com modos “Texto”, “Parágrafo a parágrafo” e “Lado a lado”), e os outros blocos aparecem depois, como glossário, notas e compreensão.</p>
      <pre class="ref">${esc(LIB_TEMPLATE)}</pre></div>
    <div class="card stack" style="margin-top:14px"><h3>Válido em qualquer bloco</h3><ul class="small">
      <li><code>@fonte: Nome da obra | https://link</code> — mostra a fonte em letras pequenas embaixo do bloco (obrigatória em TEXTO).</li>
      <li><code>// comentário</code> — linha ignorada.</li><li><code>**negrito**</code>, <code>*itálico*</code>, <code>{palavra|significado}</code> e <code>((trecho|explicação gramatical))</code>.</li></ul></div>`;
  body.querySelector('[data-libcopy]').onclick = () => copyText(LIB_TEMPLATE);
  body.querySelector('[data-copy]').onclick = () => copyText(TEMPLATE);
  body.querySelector('[data-dl]').onclick = () => download('modelo-de-licao.txt', TEMPLATE);
  body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => copyText(SNIPPETS[b.dataset.c].code)));
}

const PF = { kind: 'licao', idioma: '', nivel: 'A1', unidade: '', temas: '', gramatica: '', tempo: '20', extra: '', material: '', trecho: '', palavras: '', glosas: '10–20', adaptar: false, notas: true, compreensao: true };
function tabPrompt(body) {
  PF.idioma ||= Store.state.perfil.idioma || 'fr';
  const langs = [...new Set([...Object.keys(LANGS), ...(Store.state.perfil.idiomas || [])])];
  const lib = PF.kind === 'biblioteca';
  const inp = (k, label, ph, extra = '') => `<div><label class="lbl">${label}</label><input class="input" data-pf="${k}" value="${esc(PF[k] || '')}" placeholder="${esc(ph)}" ${extra}></div>`;
  const chk = (k, label) => `<label class="switch small"><input type="checkbox" data-pc="${k}" ${PF[k] ? 'checked' : ''}><span class="tg"></span>${label}</label>`;
  body.innerHTML = `<div class="seg" style="margin-bottom:16px" data-kind><button data-k="licao" class="${!lib ? 'on' : ''}">✎ Criar uma lição</button><button data-k="biblioteca" class="${lib ? 'on' : ''}">❧ Formatar texto para a Biblioteca</button></div>
    <div class="grid g2" style="align-items:start">
    <div class="card stack"><h2>${lib ? 'Formatar um material' : 'Monte o pedido'}</h2>
      <p class="muted small" style="margin:0">${lib ? 'Preencha, copie o prompt e mande para o Claude ou o ChatGPT <b>junto com o link ou o PDF</b> do material. Cole a resposta em <b>Nova lição</b> (ela vai sozinha para a Biblioteca) ou salve como .txt e use <b>Importar lições</b>.' : 'Preencha, copie o prompt e cole no Claude ou no ChatGPT. Depois cole a resposta em <b>Nova lição</b> (ou salve como .txt e use <b>Importar lições</b>).'}</p>
      <div class="grid g2">
        <div><label class="lbl">Idioma</label><select class="select" data-pf="idioma">${langs.map((l) => `<option value="${l}" ${PF.idioma === l ? 'selected' : ''}>${esc(langInfo(l).nome)}</option>`).join('')}</select></div>
        <div><label class="lbl">Nível</label><select class="select" data-pf="nivel">${[...LEVELS, 'extra'].map((l) => `<option value="${l}" ${PF.nivel === l ? 'selected' : ''}>${l === 'extra' ? 'Extra (sem nível)' : l + ' · ' + LEVEL_NAMES[l]}</option>`).join('')}</select></div>
      </div>
      ${lib ? `${inp('material', 'Material (link)', 'https://… — ou deixe vazio e anexe o PDF na conversa')}
        ${inp('trecho', 'Qual parte', 'ex.: capítulo 1, páginas 3–5, o texto todo')}
        ${inp('palavras', 'Palavras para destacar', 'ex.: néanmoins, se rendre compte, ou deixe vazio')}
        ${inp('gramatica', 'Tópicos gramaticais para destacar', 'ex.: subjonctif, pronoms relatifs')}
        ${inp('glosas', 'Quantas palavras destacar (aprox.)', '10–20')}
        <div class="stack-s">${chk('adaptar', 'Adaptar o texto ao nível (em vez de copiar fiel)')}${chk('notas', 'Incluir notas de gramática')}${chk('compreensao', 'Incluir perguntas de compreensão')}</div>`
      : `${inp('temas', 'Tema(s)', 'ex.: comida, restaurante, viagem')}
        ${inp('gramatica', 'Tópico(s) gramatical(is)', 'ex.: passé composé com avoir, negação')}
        <div class="grid g2">${inp('unidade', 'Unidade (opcional)', 'ex.: 2 · Em viagem')}${inp('tempo', 'Duração (min)', '20', 'inputmode="numeric"')}</div>`}
      <div><label class="lbl">Pedidos extras (opcional)</label><textarea class="textarea" data-pf="extra" style="min-height:80px" placeholder="${lib ? 'ex.: mantenha os diálogos; destaque falsos cognatos' : 'ex.: inclua um vídeo; foque em escuta'}">${esc(PF.extra)}</textarea></div>
    </div>
    <div class="card stack"><div class="row between"><h2>Prompt</h2><button class="btn sm primary" data-copy>Copiar prompt</button></div>
      <pre class="ref" style="white-space:pre-wrap;max-height:70vh;overflow:auto" data-out></pre></div></div>`;
  const out = body.querySelector('[data-out]');
  const full = () => (PF.kind === 'biblioteca' ? buildLibraryPrompt : buildPrompt)({ ...PF, idiomaNome: langInfo(PF.idioma).nome });
  const upd = () => { out.textContent = full(); };
  body.querySelectorAll('[data-pf]').forEach((el) => { const h = () => { PF[el.dataset.pf] = el.value; upd(); }; el.addEventListener('input', h); el.addEventListener('change', h); });
  body.querySelectorAll('[data-pc]').forEach((el) => (el.onchange = () => { PF[el.dataset.pc] = el.checked; upd(); }));
  body.querySelector('[data-kind]').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) { PF.kind = b.dataset.k; tabPrompt(body); } };
  body.querySelector('[data-copy]').onclick = () => copyText(full());
  upd();
}

function tabBackup(body, { go, view }) {
  const localCount = Object.keys(Store.lessons.local).length;
  body.innerHTML = `<p class="muted">Para passar lições para outras pessoas, use <b>Lições › Exportar selecionadas</b>. O backup abaixo guarda também o seu progresso.</p>
    <div class="grid g2">
    <div class="card stack"><h3>Exportar backup</h3><p class="muted small" style="margin:0">Seu progresso, cartões, caderno e as lições criadas no app.</p>
      <div><button class="btn" data-exp>Baixar backup (.json)</button></div></div>
    <div class="card stack"><h3>Importar backup</h3><p class="muted small" style="margin:0">Restaura um backup. Lições com o mesmo id são substituídas.</p>
      <div><label class="btn">Escolher arquivo<input type="file" accept=".json,application/json" data-imp hidden></label></div></div>
    ${Store.lessonTarget === 'nuvem' && localCount ? `<div class="card stack"><h3>Enviar lições deste aparelho</h3><p class="muted small" style="margin:0">${plural(localCount, 'lição está', 'lições estão')} só neste aparelho.</p><div><button class="btn sage" data-up>Enviar para a nuvem</button></div></div>` : ''}
  </div>`;
  body.querySelector('[data-exp]').onclick = () => download(`atelier-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportAll(), null, 1), 'application/json');
  body.querySelector('[data-imp]').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.tipo === 'pacote-de-licoes') { importFiles([f], () => renderStudio(view, { go })); return; }
      await importAll(data); toast('Backup importado ✓');
    } catch (err) { toast('Não deu: ' + err.message, 5000); }
  };
  body.querySelector('[data-up]')?.addEventListener('click', async () => {
    for (const L of Object.values(Store.lessons.local)) { await saveLesson(L, 'nuvem'); await deleteLesson(L.id, 'local'); await placeAtEnd(L.id); }
    toast('Lições enviadas ✓'); renderStudio(view, { go });
  });
}
