// Estúdio: criar/editar, ordenar, exportar/importar lições; modelo do código; prompt; backup
import { parseLesson, BLOCK_TYPES, slugify, LEVELS, LEVEL_NAMES, levelIndex, setMeta } from './parser.js';
import { readZip, writeZip, splitPasted } from './zip.js';
import { esc, toast, confirmBox, copyText, download, langInfo, plural, modal, LANGS } from './util.js';
import { Store, saveLesson, deleteLesson, exportAll, importAll } from './store.js';
import { LESSONS, lessonById, placeAtEnd, moveLesson, rebuild, levelDocs } from './data.js';
import { renderBlock, teardown } from './lesson.js';
import { SNIPPETS, ORDER, TEMPLATE, HEADER, META_DOC, buildPrompt, buildLibraryPrompt, buildCoursePrompt, buildExercisePrompt, EX_KINDS, LIB_TEMPLATE, LEVEL_TEMPLATE } from './modelo.js';

let tab = 'licoes';
let draft = null; // {id, origem, titulo, codigo}
const selected = new Set();

export function renderStudio(view, { go, params = {} }) {
  if (params.tab === 'prompt-biblioteca') { tab = 'prompt'; PF.kind = 'biblioteca'; }
  else if (params.tab === 'prompt-exercicios') { tab = 'prompt'; PF.kind = 'exercicios'; }
  else if (params.tab === 'prompt-curso') { tab = 'prompt'; PF.kind = 'curso'; }
  else if (params.tab === 'novo-texto') { tab = 'editor'; draft = newLibDraft(); }
  else if (params.tab) tab = params.tab;
  if (params.edit) { const L = lessonById(params.edit); if (L) { draft = editDraftOf(L); tab = 'editor'; } }
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
const allItems = () => [...LESSONS, ...levelDocs()];
const groupOf = (k) => {
  const [lang, kind, lv] = k.split('|');
  if (kind === 'niv') return levelDocs().filter((L) => L.lang === lang);
  const tipo = { bib: 'biblioteca', exe: 'exercicios', lic: 'licao' }[kind];
  return LESSONS.filter((L) => L.lang === lang && L.nivel === lv && L.tipo === tipo);
};
/** Abre uma lição (qualquer origem) no editor. Aulas do site são editadas como uma versão que substitui a original. */
export function editDraftOf(L) {
  const stored = Store.lessons[L.origem]?.[L.id];
  return { id: L.id, origem: L.origem === 'arquivo' ? Store.lessonTarget : L.origem, titulo: L.origem === 'arquivo' ? '' : stored?.titulo || '', codigo: L.codigo };
}
function tabLessons(body, { go, view }) {
  const byLang = {};
  LESSONS.forEach((L) => ((byLang[L.lang] ||= {})[({ biblioteca: 'bib|', exercicios: 'exe|' }[L.tipo] || 'lic|') + L.nivel] ||= []).push(L));
  levelDocs().forEach((L) => ((byLang[L.lang] ||= {})['niv|'] ||= []).push(L));
  for (const id of [...selected]) if (!lessonById(id)) selected.delete(id);
  const rerender = () => renderStudio(view, { go });
  const total = allItems().length;
  const gOrder = (k) => ({ lic: 0, exe: 1, bib: 2, niv: 3 })[k.slice(0, 3)];
  const gTitle = (gk, lv) => gk.startsWith('niv') ? '<span class="chip lav">⚑ Níveis</span> objetivos e marcos' : `${gk.startsWith('bib') ? '<span class="chip sage">❧ Biblioteca</span> ' : gk.startsWith('exe') ? '<span class="chip butter">✎ Exercícios</span> ' : ''}${lv ? `<span class="chip lav">${lv}</span> ` : ''}${esc(LEVEL_NAMES[lv])}`;

  body.innerHTML = `
    <div class="card row between" style="margin-bottom:18px;position:sticky;top:8px;z-index:5">
      <div class="row"><label class="row nowrap" style="gap:8px;cursor:pointer"><input type="checkbox" data-all ${selected.size && selected.size === total ? 'checked' : ''}> <span>Selecionar todas</span></label>
        <span class="small muted" data-count>${plural(selected.size, 'selecionada', 'selecionadas')}</span></div>
      <div class="row">
        <button class="btn sm" data-export ${selected.size ? '' : 'disabled'}>Exportar selecionadas</button>
        <label class="btn sm" title=".zip, .txt ou .json — vários de uma vez">Importar arquivos<input type="file" multiple accept=".zip,.json,.txt,application/zip,application/json,text/plain" data-import hidden></label>
        <button class="btn sm" data-paste>Colar lições</button>
        <button class="btn sm" data-newlib>+ Texto da biblioteca</button>
        <button class="btn sm primary" data-new>+ Nova lição</button>
      </div>
    </div>
    <div class="dropzone small muted" data-drop>Arraste aqui arquivos <b>.zip</b>, <b>.txt</b> ou <b>.json</b> para importar vários de uma vez.</div>
    ${total ? Object.entries(byLang).map(([lang, levels]) => `<h2 style="margin:8px 0 12px">${esc(langInfo(lang).nome)}</h2>
      ${Object.keys(levels).sort((a, b) => gOrder(a) - gOrder(b) || levelIndex(a.slice(4)) - levelIndex(b.slice(4))).map((gk) => { const lv = gk.slice(4); return `<div class="card" style="margin-bottom:14px">
        <div class="row between"><h3>${gTitle(gk, lv)}</h3>
          <label class="small row nowrap" style="gap:6px;cursor:pointer"><input type="checkbox" data-lvl="${esc(lang + '|' + gk)}" ${levels[gk].every((L) => selected.has(L.id)) ? 'checked' : ''}> grupo inteiro</label></div>
        ${levels[gk].map((L, i, arr) => `<div class="lesson-row">
          <input type="checkbox" data-sel="${esc(L.id)}" ${selected.has(L.id) ? 'checked' : ''} aria-label="Selecionar ${esc(L.titulo)}">
          <span class="muted small" style="min-width:1.6em;text-align:right">${L.tipo === 'nivel' ? L.nivel : L.codigoAula ? esc(L.codigoAula) : i + 1 + '.'}</span>
          <div class="grow"><div><b>${esc(L.tipo === 'nivel' ? (L.meta.titulo || LEVEL_NAMES[L.nivel]) : L.titulo)}</b> ${L.parsed.warnings.length ? `<span class="chip butter tiny" title="${esc(L.parsed.warnings.map((w) => 'linha ' + w.line + ': ' + w.msg).join('\n'))}">${plural(L.parsed.warnings.length, 'aviso')}</span>` : ''}</div>
            <div class="small muted">${L.meta.unidade ? esc(L.meta.unidade) + ' · ' : ''}${plural(L.parsed.blocks.length, 'bloco')} · <span class="src">${SRC[L.origem]}</span>${L.original ? ' <span class="src" style="background:var(--butter)">versão editada</span>' : ''}</div></div>
          ${L.tipo !== 'nivel' ? `<button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="-1" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn sm" data-mv="${esc(L.id)}" data-d="1" title="Descer" ${i === arr.length - 1 ? 'disabled' : ''}>↓</button>` : ''}
          <button class="btn sm" data-edit="${esc(L.id)}">Editar</button>
          ${L.tipo !== 'nivel' ? `<button class="btn ghost sm" data-open="${esc(L.id)}">Abrir</button>` : ''}
          ${L.original ? `<button class="btn ghost sm" data-restore="${esc(L.id)}" title="Apaga a versão editada e volta ao arquivo do site">Restaurar original</button>` : L.origem !== 'arquivo' ? `<button class="btn ghost sm danger" data-del="${esc(L.id)}">Excluir</button>` : ''}</div>`).join('')}</div>`; }).join('')}`).join('')
      : `<div class="card empty"><span class="orn">✒</span>Nenhuma lição ainda. Crie a primeira ou importe um .zip de lições.</div>`}
    <p class="small muted">Lições novas entram no fim da trilha do nível delas (aulas com <code>@codigo</code> ficam na ordem do código). Use ↑ ↓ ou <b>Trilha › Editar trilha</b> para reorganizar. Aulas que vieram com o site também podem ser editadas: a sua versão passa a valer, e “Restaurar original” desfaz.</p>`;

  const sync = () => {
    body.querySelector('[data-count]').textContent = plural(selected.size, 'selecionada', 'selecionadas');
    body.querySelector('[data-export]').disabled = !selected.size;
    body.querySelector('[data-all]').checked = selected.size && selected.size === total;
    body.querySelectorAll('[data-sel]').forEach((c) => (c.checked = selected.has(c.dataset.sel)));
    body.querySelectorAll('[data-lvl]').forEach((c) => { c.checked = groupOf(c.dataset.lvl).every((L) => selected.has(L.id)); });
  };
  body.querySelector('[data-all]').onchange = (e) => { selected.clear(); if (e.target.checked) allItems().forEach((L) => selected.add(L.id)); sync(); };
  body.querySelectorAll('[data-sel]').forEach((c) => (c.onchange = () => { c.checked ? selected.add(c.dataset.sel) : selected.delete(c.dataset.sel); sync(); }));
  body.querySelectorAll('[data-lvl]').forEach((c) => (c.onchange = () => { groupOf(c.dataset.lvl).forEach((L) => (c.checked ? selected.add(L.id) : selected.delete(L.id))); sync(); }));
  body.querySelector('[data-new]').onclick = () => { draft = newDraft(); tab = 'editor'; rerender(); };
  body.querySelector('[data-newlib]').onclick = () => { draft = newLibDraft(); tab = 'editor'; rerender(); };
  body.querySelector('[data-export]').onclick = () => exportSelected();
  body.querySelector('[data-import]').onchange = (e) => { importFiles([...e.target.files], rerender); e.target.value = ''; };
  body.querySelector('[data-paste]').onclick = () => pasteLessons(rerender);
  const dz = body.querySelector('[data-drop]');
  ['dragenter', 'dragover'].forEach((ev) => body.addEventListener(ev, (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); dz.classList.add('on'); } }));
  ['dragleave', 'drop'].forEach((ev) => body.addEventListener(ev, () => dz.classList.remove('on')));
  body.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) { e.preventDefault(); importFiles([...e.dataTransfer.files], rerender); } });

  body.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const id = t.dataset.edit || t.dataset.open || t.dataset.del || t.dataset.mv || t.dataset.restore;
    const L = id && lessonById(id); if (!L) return;
    if (t.dataset.mv) { await moveLesson(L.id, +t.dataset.d); rerender(); }
    else if (t.dataset.edit) { draft = editDraftOf(L); tab = 'editor'; rerender(); }
    else if (t.dataset.open) go(({ biblioteca: '#leitura/', exercicios: '#bateria/' }[L.tipo] || '#licao/') + L.id);
    else if (t.dataset.restore) {
      if (await confirmBox(`Apagar a sua versão de <b>${esc(L.titulo)}</b> e voltar ao arquivo original do site?`, { ok: 'Restaurar' })) { await deleteLesson(L.id, L.origem); toast('Original restaurado'); rerender(); }
    } else if (t.dataset.del) {
      if (await confirmBox(`Excluir <b>${esc(L.titulo)}</b>? O progresso já feito fica guardado.`, { ok: 'Excluir', danger: true })) { await deleteLesson(L.id, L.origem); selected.delete(L.id); toast('Excluída'); rerender(); }
    }
  });
}

// ---------- exportar ----------
const fileNameOf = (L) => L.tipo === 'nivel' ? `_nivel-${L.lang}-${L.nivel || 'extra'}.txt` : `${L.codigoAula ? L.codigoAula + '-' : ''}${slugify(L.titulo)}.txt`;
function exportSelected() {
  const ls = allItems().filter((L) => selected.has(L.id));
  modal(`<div class="stack"><h2>Exportar ${plural(ls.length, 'lição', 'lições')}</h2>
    <p class="small muted" style="margin:0">Para passar para outra pessoa (ou guardar). Ela importa em <b>Estúdio › Lições › Importar arquivos</b>.</p>
    <button class="btn primary" data-z>Baixar .zip (um .txt por lição)</button>
    <button class="btn" data-j>Baixar .json (pacote único)</button>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Fechar</button></div></div>`, (m, close) => {
    const langs = [...new Set(ls.map((L) => L.lang))].join('-');
    const base = `licoes-${langs}-${ls.length}-${new Date().toISOString().slice(0, 10)}`;
    m.querySelector('[data-z]').onclick = () => {
      const used = new Set();
      const files = ls.map((L) => { let n = fileNameOf(L), k = 2; while (used.has(n)) n = fileNameOf(L).replace(/\.txt$/, `-${k++}.txt`); used.add(n); return { name: n, text: withTitle(L) }; });
      const a = document.createElement('a'); a.href = URL.createObjectURL(writeZip(files)); a.download = base + '.zip'; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      close(); toast(`${plural(ls.length, 'lição exportada', 'lições exportadas')} ✓`);
    };
    m.querySelector('[data-j]').onclick = () => {
      const pack = { app: 'atelier', tipo: 'pacote-de-licoes', versao: 1, criado: new Date().toISOString(), licoes: ls.map((L) => ({ id: L.id, titulo: L.titulo, idioma: L.lang, nivel: L.nivel, codigo: withTitle(L) })) };
      download(base + '.json', JSON.stringify(pack, null, 1), 'application/json');
      close(); toast(`${plural(ls.length, 'lição exportada', 'lições exportadas')} ✓`);
    };
  });
}
/** Garante que o código leve o título dentro dele (para quem receber). */
function withTitle(L) {
  const code = L.codigo || '';
  if (L.tipo === 'nivel' || !L.titulo) return code;
  return setMeta(code, 'titulo', L.titulo);
}

// ---------- importar ----------
export function pasteLessons(done) {
  modal(`<div class="stack"><h2>Colar lições</h2>
    <p class="small muted" style="margin:0">Cole uma lição, ou várias separadas por linhas <code>===== ARQUIVO: nome.txt =====</code> (é o formato que a IA usa quando não consegue gerar o .zip).</p>
    <textarea class="textarea code-area" data-t style="min-height:40vh" spellcheck="false" placeholder="===== ARQUIVO: A0.01-salutations.txt =====&#10;@titulo: …"></textarea>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-ok>Continuar</button></div></div>`, (m, close) => {
    m.querySelector('[data-ok]').onclick = () => {
      const entries = splitPasted(m.querySelector('[data-t]').value);
      if (!entries.length) return toast('Nada para importar.');
      close(); importEntries(entries, done);
    };
  });
}

/** Lê arquivos soltos: .zip (com .txt/.json dentro), .txt e .json. */
export async function importFiles(files, done) {
  const entries = [];
  for (const f of files) {
    try {
      if (/\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed') {
        const inner = await readZip(f);
        inner.filter((x) => /\.(txt|json|md)$/i.test(x.name)).forEach((x) => entries.push({ name: x.name, text: x.text(), de: f.name }));
        if (!inner.length) toast(`${f.name}: zip vazio`);
      } else entries.push({ name: f.name, text: await f.text(), de: f.name });
    } catch (e) { console.error(e); toast(`${f.name}: ${e.message}`, 5000); }
  }
  importEntries(entries, done);
}

function importEntries(entries, done) {
  const items = [];
  for (const en of entries) {
    const text = en.text || '';
    if (/\.json$/i.test(en.name) || /^\s*[{[]/.test(text)) {
      try {
        const data = JSON.parse(text);
        const list = Array.isArray(data) ? data : data.licoes || [];
        list.forEach((l) => l && l.codigo && items.push({ titulo: l.titulo || '', codigo: l.codigo, de: en.name }));
      } catch (e) { toast(`${en.name}: arquivo inválido`, 4000); }
    } else if (text.trim()) {
      // um .txt colado pode conter várias lições com separadores
      const parts = /={3,}\s*ARQUIVO\s*:/i.test(text) ? splitPasted(text) : [{ name: en.name, text }];
      parts.forEach((p) => items.push({ titulo: '', codigo: p.text, de: p.name }));
    }
  }
  if (!items.length) { toast('Nenhuma lição encontrada.'); return; }
  items.forEach((it, i) => {
    it.i = i;
    it.p = parseLesson(it.codigo, { titulo: it.titulo });
    const m = it.p.meta;
    it.titulo = m.tipo === 'nivel' ? `Nível ${m.nivel || '?'}${m.titulo ? ' · ' + m.titulo : ''}` : m.titulo || it.titulo || it.de.replace(/\.[^.]+$/, '');
    it.nivel = m.nivel; it.lang = m.idioma; it.code = m.codigo;
    if (m.tipo === 'nivel') it.dup = levelDocs().find((L) => L.lang === m.idioma && L.nivel === m.nivel);
    else it.dup = (m.codigo && LESSONS.find((L) => L.lang === m.idioma && L.codigoAula && L.codigoAula.toLowerCase() === m.codigo.toLowerCase()))
      || LESSONS.find((L) => L.lang === m.idioma && L.titulo.trim().toLowerCase() === (m.titulo || it.titulo).trim().toLowerCase());
    it.dupBy = it.dup ? (m.tipo === 'nivel' ? 'nível' : m.codigo && it.dup.codigoAula?.toLowerCase() === m.codigo.toLowerCase() ? 'código' : 'título') : '';
    it.ok = m.tipo === 'nivel' ? it.p.blocks.length > 0 : it.p.blocks.length > 0;
    it.errs = it.p.warnings.filter((w) => w.level === 'erro').length;
  });
  const sortKey = (it) => [it.p.meta.tipo === 'nivel' ? 0 : 1, levelIndex(it.nivel), it.code || '~', it.i];
  items.sort((a, b) => { const A = sortKey(a), B = sortKey(b); return A[0] - B[0] || A[1] - B[1] || A[2].localeCompare(B[2], 'pt', { numeric: true }) || A[3] - B[3]; });
  const anyDup = items.some((it) => it.dup);
  modal(`<div class="stack"><h2>Importar ${plural(items.length, 'lição', 'lições')}</h2>
    <label class="row nowrap" style="gap:8px"><input type="checkbox" data-iall checked> <b>Selecionar todas</b></label>
    <div class="stack-s" style="max-height:48vh;overflow:auto">${items.map((it, k) => `<label class="row nowrap" style="gap:10px;align-items:flex-start;cursor:pointer;padding:6px 0;border-bottom:1px solid var(--line)">
      <input type="checkbox" data-i="${k}" ${it.ok ? 'checked' : 'disabled'} style="margin-top:6px">
      <div class="grow"><div>${it.code ? `<span class="muted small">${esc(it.code)}</span> ` : ''}<b>${esc(it.titulo)}</b></div>
        <div class="small muted">${({ biblioteca: '❧ Biblioteca · ', nivel: '⚑ Nível · ', exercicios: '✎ Exercícios · ' })[it.p.meta.tipo] || ''}${esc(langInfo(it.lang).nome)} · ${it.nivel || 'Extras'} · ${plural(it.p.blocks.length, 'bloco')}
        ${it.p.warnings.length ? ` · <span title="${esc(it.p.warnings.map((w) => 'linha ' + w.line + ': ' + w.msg).join('\n'))}" style="color:${it.errs ? 'var(--bad)' : 'var(--butter-d)'}">${plural(it.p.warnings.length, 'aviso')}${it.errs ? ` (${it.errs} com erro)` : ''}</span>` : ''}
        ${it.dup ? ` · <span style="color:var(--rose-d)">já existe (mesmo ${it.dupBy})</span>` : ''}${!it.ok ? ' · <span style="color:var(--bad)">sem blocos válidos</span>' : ''}</div></div></label>`).join('')}</div>
    ${anyDup ? `<div class="stack-s"><div class="small"><b>Quando a lição já existir:</b></div>
      <label class="row nowrap small" style="gap:8px"><input type="radio" name="dup" value="substituir" checked> substituir pela importada (mantém o progresso e a posição na trilha)</label>
      <label class="row nowrap small" style="gap:8px"><input type="radio" name="dup" value="copia"> manter as duas</label>
      <label class="row nowrap small" style="gap:8px"><input type="radio" name="dup" value="pular"> não importar essas</label></div>` : ''}
    <p class="small muted" style="margin:0">Entram ${Store.lessonTarget === 'nuvem' ? 'na nuvem' : 'neste aparelho'}, no fim do nível de cada uma, na ordem do <code>@codigo</code>.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-go>Importar</button></div></div>`,
  (m, close) => {
    const boxes = [...m.querySelectorAll('[data-i]')];
    m.querySelector('[data-iall]').onchange = (e) => boxes.forEach((b) => !b.disabled && (b.checked = e.target.checked));
    m.querySelector('[data-go]').onclick = async () => {
      const mode = m.querySelector('input[name=dup]:checked')?.value || 'copia';
      const chosen = boxes.filter((b) => b.checked).map((b) => items[+b.dataset.i]).filter((it) => !(it.dup && mode === 'pular'));
      if (!chosen.length) return toast('Nenhuma lição para importar.');
      const btn = m.querySelector('[data-go]'); btn.disabled = true;
      let n = 0;
      try {
        for (const it of chosen) {
          btn.textContent = `Importando ${n + 1}/${chosen.length}…`;
          const isLevel = it.p.meta.tipo === 'nivel';
          const replace = isLevel || (mode === 'substituir' && it.dup);
          const id = isLevel ? (it.dup?.id || `nivel-${it.lang}-${it.nivel || 'extra'}`) : replace ? it.dup.id : slugify((it.code ? it.code + '-' : '') + it.titulo) + '-' + Math.random().toString(36).slice(2, 6);
          const target = Store.lessonTarget;
          await saveLesson({ id, titulo: '', codigo: it.codigo }, target);
          if (replace && it.dup && it.dup.origem !== target && it.dup.origem !== 'arquivo') await deleteLesson(it.dup.id, it.dup.origem).catch(() => {});
          const lvChanged = replace && it.dup && (it.dup.nivel !== it.nivel || it.dup.lang !== it.lang);
          if (!isLevel && (!replace || lvChanged)) await placeAtEnd(id);
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
    if (!ti.value.trim() && !p.meta.titulo && p.meta.tipo !== 'nivel') return toast('Dê um título à lição.');
    if (!p.blocks.length) return toast('A lição precisa de pelo menos um bloco.');
    const errs = p.warnings.filter((w) => w.level === 'erro');
    if (errs.length && !(await confirmBox(`Há ${plural(errs.length, 'erro')} — os itens com erro não vão aparecer. Salvar mesmo assim?`))) return;
    try {
      const isNew = !draft.id;
      const old = !isNew && lessonById(draft.id);
      const target = isNew ? Store.lessonTarget : draft.origem;
      const id = draft.id || (p.meta.tipo === 'nivel' ? (levelDocs().find((L) => L.lang === p.meta.idioma && L.nivel === p.meta.nivel)?.id || `nivel-${p.meta.idioma}-${p.meta.nivel || 'extra'}`) : slugify((p.meta.codigo ? p.meta.codigo + '-' : '') + (ti.value || p.meta.titulo)) + '-' + Date.now().toString(36).slice(-4));
      await saveLesson({ id, titulo: ti.value.trim(), codigo: ta.value }, target);
      // nova lição, ou mudou de nível/idioma → vai para o fim da trilha do nível
      if (p.meta.tipo !== 'nivel' && (isNew || !old || old.nivel !== (p.meta.nivel || '') || old.lang !== p.meta.idioma)) await placeAtEnd(id);
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
    <div class="card stack" style="margin-top:14px"><div class="row"><span class="chip butter">✎</span><h3>Bateria de exercícios</h3></div>
      <p class="small muted" style="margin:0">Com <code>@tipo: exercicios</code>, a lição vira uma bateria na aba <b>Exercícios</b>. Use blocos <code>== EXERCICIOS</code> (e <code>== TEXTO</code> antes, para interpretação). Tipos extras: <code>[conjugar]</code> (verbo entre [[ ]] e o infinitivo entre parênteses), <code>[pronome]</code>, <code>[transformar]</code> e <code>[corrigir]</code>.</p>
      <pre class="ref">${esc(`@tipo: exercicios
@titulo: Passé composé — prática
@idioma: fr
@nivel: A2
@gramatica: passé composé

== EXERCICIOS | Conjugação
[conjugar] Hier, nous [[avons mangé]] (manger, passé composé) au restaurant.
> Manger usa o auxiliar avoir.

[pronome] Tu connais Marie ? Oui, je [[la]] connais.
> "La" substitui Marie (objeto direto feminino).

[corrigir] Elle a allé au marché.
= Elle est allée au marché
> Aller usa être, e o particípio concorda: allée.`)}</pre></div>
    <div class="card stack" style="margin-top:14px"><div class="row"><span class="chip lav">⚑</span><h3>Arquivo de nível</h3><div class="grow"></div><button class="btn xs" data-lvcopy>Copiar</button></div>
      <p class="small muted" style="margin:0">Define o nome, os objetivos, o marco de conclusão e os conteúdos complementares de um nível (também dá para editar direto em <b>Trilha › Editar trilha</b>).</p>
      <pre class="ref">${esc(LEVEL_TEMPLATE)}</pre></div>
    <div class="card stack" style="margin-top:14px"><h3>Válido em qualquer bloco</h3><ul class="small">
      <li><code>@fonte: Nome da obra | https://link</code> — mostra a fonte em letras pequenas embaixo do bloco (obrigatória em TEXTO).</li>
      <li><code>// comentário</code> — linha ignorada.</li><li><code>**negrito**</code>, <code>*itálico*</code>, <code>{palavra|significado}</code> e <code>((trecho|explicação gramatical))</code>.</li></ul></div>`;
  body.querySelector('[data-libcopy]').onclick = () => copyText(LIB_TEMPLATE);
  body.querySelector('[data-lvcopy]').onclick = () => copyText(LEVEL_TEMPLATE);
  body.querySelector('[data-copy]').onclick = () => copyText(TEMPLATE);
  body.querySelector('[data-dl]').onclick = () => download('modelo-de-licao.txt', TEMPLATE);
  body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => copyText(SNIPPETS[b.dataset.c].code)));
}

const PF = { kind: 'licao', idioma: '', nivel: 'A1', unidade: '', temas: '', gramatica: '', tempo: '20', extra: '', material: '', trecho: '', palavras: '', glosas: '10–20', adaptar: false, notas: true, compreensao: true, ementa: '', lote: '3', plano: true, nivelDoc: true, revisao: true, exTipos: ['interpretacao', 'conjugar'], escopo: 'topico', topicos: [], outroTopico: '', exNivel: 'A1', quantidade: '20', detalhes: '' };
function tabPrompt(body) {
  PF.idioma ||= Store.state.perfil.idioma || 'fr';
  const langs = [...new Set([...Object.keys(LANGS), ...(Store.state.perfil.idiomas || [])])];
  if (PF.kind === 'curso') return tabCoursePrompt(body, langs);
  if (PF.kind === 'exercicios') return tabExercisePrompt(body, langs);
  const lib = PF.kind === 'biblioteca';
  const inp = (k, label, ph, extra = '') => `<div><label class="lbl">${label}</label><input class="input" data-pf="${k}" value="${esc(PF[k] || '')}" placeholder="${esc(ph)}" ${extra}></div>`;
  const chk = (k, label) => `<label class="switch small"><input type="checkbox" data-pc="${k}" ${PF[k] ? 'checked' : ''}><span class="tg"></span>${label}</label>`;
  body.innerHTML = `${kindSeg()}
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

const kindSeg = () => `<div class="seg" style="margin-bottom:16px;flex-wrap:wrap" data-kind><button data-k="licao" class="${PF.kind === 'licao' ? 'on' : ''}">✎ Uma lição</button><button data-k="curso" class="${PF.kind === 'curso' ? 'on' : ''}">▤ Curso inteiro em lotes (.zip)</button><button data-k="exercicios" class="${PF.kind === 'exercicios' ? 'on' : ''}">✎ Bateria de exercícios</button><button data-k="biblioteca" class="${PF.kind === 'biblioteca' ? 'on' : ''}">❧ Texto para a Biblioteca</button></div>`;

function tabExercisePrompt(body, langs) {
  const topics = [...new Set(LESSONS.filter((L) => L.lang === PF.idioma).flatMap((L) => L.meta.gramatica))].sort((a, b) => a.localeCompare(b, 'pt'));
  PF.topicos = PF.topicos.filter((t) => topics.includes(t));
  const radio = (v, label) => `<label class="row nowrap small" style="gap:8px;cursor:pointer"><input type="radio" name="escopo" value="${v}" ${PF.escopo === v ? 'checked' : ''}> ${label}</label>`;
  body.innerHTML = `${kindSeg()}
    <div class="grid g2" style="align-items:start">
    <div class="card stack"><h2>Bateria de exercícios</h2>
      <p class="muted small" style="margin:0">Escolha o que treinar, copie o prompt e mande para a IA. Depois cole a resposta em <b>Exercícios › Colar bateria</b> (ou importe o .txt).</p>
      <div><label class="lbl">Idioma</label><select class="select" data-pf="idioma" style="max-width:240px">${langs.map((l) => `<option value="${l}" ${PF.idioma === l ? 'selected' : ''}>${esc(langInfo(l).nome)}</option>`).join('')}</select></div>
      <div><label class="lbl">Tipos de exercício</label><div class="row" style="gap:6px">${Object.entries(EX_KINDS).map(([k, v]) => `<button type="button" class="chip ${PF.exTipos.includes(k) ? 'on' : ''}" data-tipo="${k}">${esc(v.nome)}</button>`).join('')}</div></div>
      <div class="stack-s"><label class="lbl" style="margin:0">Foco</label>
        ${radio('topico', 'Tópico(s) gramatical(is) específico(s)')}
        ${PF.escopo === 'topico' ? `<div style="padding-left:24px" class="stack-s">${topics.length ? `<div class="row" style="gap:6px">${topics.map((t) => `<button type="button" class="chip ${PF.topicos.includes(t) ? 'butter' : ''}" data-top="${esc(t)}">§ ${esc(t)}</button>`).join('')}</div>` : '<div class="small muted">Nenhum tópico nas suas lições deste idioma ainda — escreva abaixo.</div>'}
          <input class="input" data-pf="outroTopico" value="${esc(PF.outroTopico)}" placeholder="outro tópico (opcional), ex.: pronomes COD e COI"></div>` : ''}
        ${radio('nivel', 'Geral de um nível')}
        ${radio('geral', 'Completamente geral')}
      </div>
      ${PF.escopo !== 'geral' ? `<div><label class="lbl">Nível</label><select class="select" data-pf="exNivel" style="max-width:240px">${LEVELS.map((l) => `<option value="${l}" ${PF.exNivel === l ? 'selected' : ''}>${l} · ${LEVEL_NAMES[l]}</option>`).join('')}</select></div>` : ''}
      <div><label class="lbl">Quantidade de questões</label><div class="seg" data-qtd>${['10', '15', '20', '30'].map((n) => `<button data-q="${n}" class="${PF.quantidade === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div><label class="lbl">Mais detalhes (opcional)</label><textarea class="textarea" data-pf="detalhes" style="min-height:80px" placeholder="ex.: só verbos irregulares; frases sobre viagem; foco em être × avoir">${esc(PF.detalhes)}</textarea></div>
    </div>
    <div class="card stack"><div class="row between"><h2>Prompt</h2><button class="btn sm primary" data-copy>Copiar prompt</button></div>
      <pre class="ref" style="white-space:pre-wrap;max-height:70vh;overflow:auto" data-out></pre></div></div>`;
  const full = () => buildExercisePrompt({
    idioma: PF.idioma, idiomaNome: langInfo(PF.idioma).nome, tipos: PF.exTipos, escopo: PF.escopo, nivel: PF.exNivel,
    topicos: [...PF.topicos, ...PF.outroTopico.split(/[;,]/).map((x) => x.trim()).filter(Boolean)], quantidade: PF.quantidade, detalhes: PF.detalhes,
  });
  const out = body.querySelector('[data-out]');
  const upd = () => { out.textContent = full(); };
  const again = () => tabPrompt(body);
  body.querySelectorAll('[data-pf]').forEach((el) => { const h = () => { PF[el.dataset.pf] = el.value; if (el.dataset.pf === 'idioma') again(); else upd(); }; el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', h); });
  body.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => { const k = b.dataset.tipo; PF.exTipos = PF.exTipos.includes(k) ? PF.exTipos.filter((x) => x !== k) : [...PF.exTipos, k]; b.classList.toggle('on'); upd(); }));
  body.querySelectorAll('[data-top]').forEach((b) => (b.onclick = () => { const k = b.dataset.top; PF.topicos = PF.topicos.includes(k) ? PF.topicos.filter((x) => x !== k) : [...PF.topicos, k]; b.classList.toggle('butter'); upd(); }));
  body.querySelectorAll('input[name=escopo]').forEach((r) => (r.onchange = () => { PF.escopo = r.value; again(); }));
  body.querySelector('[data-qtd]').onclick = (e) => { const b = e.target.closest('[data-q]'); if (b) { PF.quantidade = b.dataset.q; body.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b)); upd(); } };
  body.querySelector('[data-kind]').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) { PF.kind = b.dataset.k; tabPrompt(body); } };
  body.querySelector('[data-copy]').onclick = () => { if (!PF.exTipos.length) return toast('Escolha pelo menos um tipo de exercício.'); copyText(full()); };
  upd();
}

function tabCoursePrompt(body, langs) {
  const chk = (k, label) => `<label class="switch small"><input type="checkbox" data-pc="${k}" ${PF[k] ? 'checked' : ''}><span class="tg"></span>${label}</label>`;
  const rows = PF.ementa.split('\n').filter((l) => /^\s*[A-C][0-2](\.|-)\w+/i.test(l));
  body.innerHTML = `${kindSeg()}
    <div class="grid g2" style="align-items:start">
    <div class="card stack"><h2>Curso a partir da ementa</h2>
      <p class="muted small" style="margin:0">Cole a ementa (uma aula por linha: <b>código · gramática · tema</b>, e depois os conteúdos complementares e o marco). A IA primeiro mostra o plano, depois entrega as aulas em lotes de arquivos <b>.zip</b>. Importe cada zip em <b>Lições › Importar arquivos</b> — pode importar todos de uma vez no fim.</p>
      <div class="grid g2">
        <div><label class="lbl">Idioma</label><select class="select" data-pf="idioma">${langs.map((l) => `<option value="${l}" ${PF.idioma === l ? 'selected' : ''}>${esc(langInfo(l).nome)}</option>`).join('')}</select></div>
        <div><label class="lbl">Aulas por lote</label><select class="select" data-pf="lote">${[2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${String(PF.lote) === String(n) ? 'selected' : ''}>${n}${n === 3 ? ' (recomendado)' : ''}</option>`).join('')}</select></div>
      </div>
      <div><label class="lbl">Ementa</label><textarea class="textarea code-area" data-pf="ementa" style="min-height:34vh;white-space:pre-wrap" spellcheck="false" placeholder="A0.01&#9;Pronomes pessoais sujeitos&#9;Saudações e despedidas&#10;A0.02&#9;Verbo être no presente&#9;Identidade pessoal&#10;…&#10;&#10;Conteúdos complementares obrigatórios&#10;- Alfabeto…&#10;Marco de conclusão: …">${esc(PF.ementa)}</textarea>
        <div class="tiny muted" data-rows>${rows.length ? `${plural(rows.length, 'aula reconhecida', 'aulas reconhecidas')} → ${Math.ceil(rows.length / (parseInt(PF.lote, 10) || 3))} lote(s)` : ''}</div></div>
      <div><label class="lbl">Duração de cada aula (min)</label><input class="input" data-pf="tempo" value="${esc(PF.tempo)}" inputmode="numeric" style="max-width:120px"></div>
      <div class="stack-s">${chk('plano', 'Mostrar o plano do curso antes e esperar meu “ok”')}${chk('nivelDoc', 'Criar o arquivo do nível (objetivos, marco, complementos)')}${chk('revisao', 'Criar uma aula de revisão no fim do nível')}</div>
      <div><label class="lbl">Pedidos extras (opcional)</label><textarea class="textarea" data-pf="extra" style="min-height:70px" placeholder="ex.: personagens fixos ao longo do curso; diálogos em Paris">${esc(PF.extra)}</textarea></div>
    </div>
    <div class="card stack"><div class="row between"><h2>Prompt</h2><button class="btn sm primary" data-copy>Copiar prompt</button></div>
      <pre class="ref" style="white-space:pre-wrap;max-height:70vh;overflow:auto" data-out></pre>
      <div class="small muted">Funciona melhor em uma IA que cria arquivos (ChatGPT com análise de dados, ou Claude com criação de arquivos). Se ela não conseguir, as aulas vêm em blocos com <code>===== ARQUIVO: … =====</code> — copie tudo e use <b>Lições › Colar lições</b>.</div></div></div>`;
  const out = body.querySelector('[data-out]');
  const full = () => buildCoursePrompt({ ...PF, nivel: PF.nivelDoc, idiomaNome: langInfo(PF.idioma).nome });
  const upd = () => {
    out.textContent = full();
    const n = PF.ementa.split('\n').filter((l) => /^\s*[A-C][0-2](\.|-)\w+/i.test(l)).length;
    body.querySelector('[data-rows]').textContent = n ? `${plural(n, 'aula reconhecida', 'aulas reconhecidas')} → ${Math.ceil(n / (parseInt(PF.lote, 10) || 3))} lote(s)` : '';
  };
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
