// =============================================================
//  Parser do formato de lição (.txt) → objeto de lição
//  Usado pelo app no navegador e testável em Node.
// =============================================================

export const BLOCK_TYPES = {
  texto:      { label: 'Leitura',       icon: '❦' },
  audio:      { label: 'Escuta',        icon: '♪' },
  gramatica:  { label: 'Gramática',     icon: '§' },
  vocab:      { label: 'Vocabulário',   icon: '✿' },
  expressoes: { label: 'Expressões',    icon: '❝' },
  exercicios: { label: 'Prática',       icon: '✎' },
  conjugacao: { label: 'Conjugação',    icon: '⁂' },
  pronuncia:  { label: 'Pronúncia',     icon: '◌' },
  cultura:    { label: 'Cultura',       icon: '❧' },
  nota:       { label: 'Nota',          icon: '✧' },
  escrita:    { label: 'Escrita',       icon: '✒' },
  imagem:     { label: 'Imagem',        icon: '▣' },
  video:      { label: 'Vídeo',         icon: '▷' },
  resumo:     { label: 'Resumo',        icon: '✓' },
  links:      { label: 'Para ir além',  icon: '↗' },
};

const TYPE_ALIASES = {
  texto: 'texto', leitura: 'texto', text: 'texto', historia: 'texto',
  audio: 'audio', escuta: 'audio', dialogo: 'audio', ouvir: 'audio',
  gramatica: 'gramatica', grammar: 'gramatica', regra: 'gramatica',
  vocab: 'vocab', vocabulario: 'vocab', palavras: 'vocab', flashcards: 'vocab',
  expressoes: 'expressoes', expressao: 'expressoes', frases: 'expressoes',
  exercicios: 'exercicios', exercicio: 'exercicios', pratica: 'exercicios', quiz: 'exercicios',
  conjugacao: 'conjugacao', verbo: 'conjugacao', conjugar: 'conjugacao',
  pronuncia: 'pronuncia', fonetica: 'pronuncia',
  cultura: 'cultura',
  nota: 'nota', dica: 'nota', observacao: 'nota',
  escrita: 'escrita', producao: 'escrita', redacao: 'escrita',
  imagem: 'imagem', imagens: 'imagem', foto: 'imagem',
  video: 'video',
  resumo: 'resumo', revisao: 'resumo',
  links: 'links', recursos: 'links', referencias: 'links',
};

const EX_ALIASES = {
  escolha: 'escolha', multipla: 'escolha', 'multipla-escolha': 'escolha', opcoes: 'escolha', mc: 'escolha',
  ouvir: 'ouvir', escuta: 'ouvir',
  escrever: 'escrever', resposta: 'escrever', pergunta: 'escrever',
  traduzir: 'traduzir', traducao: 'traduzir',
  completar: 'completar', lacuna: 'completar', lacunas: 'completar',
  ordenar: 'ordenar', montar: 'ordenar', ordem: 'ordenar',
  associar: 'associar', pares: 'associar', ligar: 'associar',
  ditado: 'ditado',
  vf: 'vf', 'verdadeiro-falso': 'vf', 'verdadeiro-ou-falso': 'vf', 'v/f': 'vf',
};

export const EX_LABELS = {
  escolha: 'Escolha a alternativa', ouvir: 'Ouça e escolha', escrever: 'Escreva',
  traduzir: 'Traduza', completar: 'Complete', ordenar: 'Monte a frase',
  associar: 'Associe os pares', ditado: 'Ditado — ouça e escreva', vf: 'Verdadeiro ou falso?',
};

export const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const LEVEL_NAMES = {
  A0: 'Primeiros passos', A1: 'Iniciante', A2: 'Básico', B1: 'Intermediário',
  B2: 'Intermediário avançado', C1: 'Avançado', C2: 'Proficiente', '': 'Extras',
};
export const levelIndex = (n) => { const i = LEVELS.indexOf(n); return i < 0 ? 99 : i; };

const META_ALIASES = {
  tipo: 'tipo', formato: 'tipo', autor: 'autor', autora: 'autor', obra: 'obra', livro: 'obra',
  gramatica: 'gramatica', topico: 'gramatica', topicos: 'gramatica', topicogramatical: 'gramatica',
  topicosgramaticais: 'gramatica', gramatical: 'gramatica', grammar: 'gramatica',
  titulo: 'titulo', title: 'titulo',
  idioma: 'idioma', lingua: 'idioma', lang: 'idioma',
  nivel: 'nivel', level: 'nivel',
  unidade: 'unidade', modulo: 'unidade',
  ordem: 'ordem',
  temas: 'temas', tema: 'temas', tags: 'temas', topicos: 'temas',
  tempo: 'tempo', duracao: 'tempo',
  descricao: 'descricao', resumo: 'descricao', objetivo: 'descricao',
  id: 'id',
};

export function deaccent(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
export function keyOf(s) {
  return deaccent(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function slugify(s) { return keyOf(s).slice(0, 60) || 'licao'; }

/** Remove a marcação inline ({a|b}, **b**, *i*) — para TTS e comparações. */
export function plain(s) {
  return String(s ?? '')
    .replace(/\(\(([^()|]+?)(\|[^()]*?)?\)\)/g, '$1')
    .replace(/\{([^{}|]+)(\|[^{}]*)?\}/g, '$1')
    .replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
}

/** Chave de palavra no dicionário (mantém acentos: ou ≠ où). */
export function wordKey(lang, fr) {
  return (lang || 'fr') + '|' + plain(fr).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
}

const isBlank = (l) => !l.text.trim();
const isUrl = (s) => /^https?:\/\/\S+$/i.test(s.trim());
const EMOJI_RE = /\p{Extended_Pictographic}/u;
export function isImageRef(s) {
  const t = String(s || '').trim();
  return !!t && (isUrl(t) || (EMOJI_RE.test(t) && t.length <= 16) || /^img:/i.test(t));
}

// Divide "a = b" na primeira ocorrência de " = "
function splitEq(s) {
  const i = s.indexOf(' = ');
  if (i < 0) return [s.trim(), ''];
  return [s.slice(0, i).trim(), s.slice(i + 3).trim()];
}
const splitAlts = (s) => s.split(/\s+\|\s+|\s*\|\s*/).map((x) => x.trim()).filter(Boolean);

// -------------------------------------------------------------
export function parseLesson(source, opts = {}) {
  const warnings = [];
  const warn = (line, msg, level = 'aviso') => warnings.push({ line, msg, level });
  const raw = String(source ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
  const lines = raw.map((text, i) => ({ text: text.replace(/\s+$/, ''), n: i + 1 }))
    .filter((l) => !/^\s*\/\//.test(l.text));

  const meta = { titulo: '', idioma: 'fr', nivel: '', unidade: '', ordem: null, temas: [], gramatica: [], tempo: null, descricao: '', id: '', tipo: 'licao', autor: '', obra: '', fontes: [] };
  const blocks = [];
  let cur = null;

  for (const l of lines) {
    const t = l.text.trim();
    const bm = t.match(/^==+\s*([^|=]+?)\s*(?:\|\s*(.*?))?\s*=*$/);
    if (bm) {
      const k = keyOf(bm[1]).replace(/-/g, '');
      let type = TYPE_ALIASES[k];
      if (!type) { warn(l.n, `Tipo de bloco desconhecido "${bm[1]}" — mostrado como Nota.`); type = 'nota'; }
      cur = { type, title: (bm[2] || '').trim(), line: l.n, lines: [] };
      blocks.push(cur);
      continue;
    }
    if (!cur) {
      if (!t) continue;
      const mm = t.match(/^@\s*([\wÀ-ÿ\-]+)\s*:\s*(.*)$/);
      if (mm && /^(fonte|source|credito|credit)$/i.test(deaccent(mm[1]))) { meta.fontes.push(parseFonte(mm[2])); continue; }
      if (mm) {
        const key = META_ALIASES[keyOf(mm[1]).replace(/-/g, '')];
        const val = mm[2].trim();
        if (key === 'nivel') {
          if (/^(extra|extras|livre|sem nivel|-)$/i.test(deaccent(val).trim())) { meta.nivel = ''; meta.extra = true; continue; }
          const n = deaccent(val).toUpperCase().replace(/\s+/g, '').match(/^(PRE-?A1|[ABC][0-2])/);
          const lv = n ? (n[1].startsWith('PRE') ? 'A0' : n[1]) : '';
          if (!LEVELS.includes(lv)) warn(l.n, `Nível "${val}" não reconhecido — use A0, A1, A2, B1, B2, C1, C2 ou extra.`);
          else meta.nivel = lv;
          continue;
        }
        if (!key) { warn(l.n, `Metadado desconhecido "@${mm[1]}" ignorado.`); continue; }
        if (key === 'temas' || key === 'gramatica') meta[key] = [...meta[key], ...val.split(/[,;]/).map((x) => x.trim()).filter(Boolean)];
        else if (key === 'ordem' || key === 'tempo') meta[key] = parseFloat(val.replace(',', '.')) || null;
        else if (key === 'idioma') meta.idioma = val.toLowerCase().slice(0, 5) || 'fr';
        else if (key === 'tipo') meta.tipo = /^(biblioteca|leitura|library|texto|livro)/.test(keyOf(val)) ? 'biblioteca' : 'licao';
        else meta[key] = val;
      } else warn(l.n, 'Linha fora de qualquer bloco foi ignorada (comece blocos com "== TIPO | título").');
      continue;
    }
    const fm = t.match(/^@\s*(fonte|source|credito|credit)\s*:\s*(.*)$/i);
    if (fm) { (cur.fontes ||= []).push(parseFonte(fm[2])); continue; }
    cur.lines.push(l);
  }

  if (opts.titulo) meta.titulo = opts.titulo;
  if (!meta.titulo) warn(1, 'Lição sem título (use o campo Título ou @titulo:).');
  if (!meta.nivel && !meta.extra && !warnings.some((w) => /Nível/.test(w.msg))) warn(1, 'Lição sem @nivel: ela vai para "Extras" (use A0–C2, ou "@nivel: extra" para não ver este aviso).');
  if (!blocks.length) warn(1, 'Nenhum bloco encontrado. Comece um bloco com "== TEXTO | título".', 'erro');

  const lang = meta.idioma;
  const words = [];
  const out = [];
  blocks.forEach((b, bi) => {
    const P = PARSERS[b.type];
    const data = P(b, warn, { lang, meta });
    const block = { type: b.type, title: b.title, line: b.line, idx: bi, fontes: b.fontes || [], ...data };
    if (b.type === 'texto' && !block.fontes.length && !meta.fontes.length) warn(b.line, 'Texto sem fonte: adicione "@fonte: Nome da obra | https://link" (ou "@fonte: Texto original").');
    if (block.empty) { warn(b.line, `Bloco ${BLOCK_TYPES[b.type].label} está vazio — ignorado.`); return; }
    if (block.items && (b.type === 'vocab' || b.type === 'expressoes')) {
      block.items.forEach((w) => words.push({ ...w, subtema: b.title }));
    }
    out.push(block);
  });
  out.forEach((b, i) => (b.idx = i));

  if (meta.tipo === 'biblioteca' && !out.some((b) => b.type === 'texto')) warn(1, 'Texto da biblioteca sem bloco == TEXTO.', 'erro');
  return { meta, blocks: out, words, warnings, ok: !warnings.some((w) => w.level === 'erro') };
}

function parseFonte(v) {
  const parts = v.split(/\s*\|\s*/).filter(Boolean);
  const url = parts.find((x) => isUrl(x)) || '';
  return { nome: parts.filter((x) => x !== url).join(' · '), url };
}

// ---------- parsers por tipo ---------------------------------

function paragraphs(lines) {
  const out = []; let cur = [];
  for (const l of lines) {
    if (isBlank(l)) { if (cur.length) out.push(cur), (cur = []); }
    else cur.push(l);
  }
  if (cur.length) out.push(cur);
  return out;
}

function parseRich(lines, warn) {
  const nodes = [];
  let para = null, list = null, table = null;
  const flush = () => { para = null; list = null; table = null; };
  for (const l of lines) {
    const t = l.text.trim();
    if (!t) { flush(); continue; }
    let m;
    if ((m = t.match(/^#{2,4}\s+(.*)$/))) { flush(); nodes.push({ k: 'h', text: m[1] }); continue; }
    if ((m = t.match(/^!!\s*(.*)$/))) { flush(); nodes.push({ k: 'warn', text: m[1] }); continue; }
    if ((m = t.match(/^!\s*(.*)$/))) { flush(); nodes.push({ k: 'tip', text: m[1] }); continue; }
    if ((m = t.match(/^>\s*(.*)$/))) { flush(); const [fr, pt] = splitEq(m[1]); nodes.push({ k: 'ex', fr, pt }); continue; }
    if (t.startsWith('|')) {
      para = null; list = null;
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) { if (table && table.rows.length === 1) table.head = true; continue; }
      if (!table) { table = { k: 'table', rows: [], head: false }; nodes.push(table); }
      table.rows.push(cells); continue;
    }
    if ((m = t.match(/^(?:[-•·]|\d+[.)])\s+(.*)$/))) {
      para = null; table = null;
      const ordered = /^\d/.test(t);
      if (!list || list.ordered !== ordered) { list = { k: 'list', ordered, items: [] }; nodes.push(list); }
      list.items.push(m[1]); continue;
    }
    list = null; table = null;
    if (!para) { para = { k: 'p', lines: [] }; nodes.push(para); }
    para.lines.push(t);
  }
  return nodes;
}

const PARSERS = {
  texto(b, warn) {
    const paras = paragraphs(b.lines).map((ls) => {
      const fr = [], pt = [];
      ls.forEach((l) => { const t = l.text.trim(); if (t.startsWith('~')) pt.push(t.slice(1).trim()); else fr.push(t); });
      return { fr: fr.join('\n'), pt: pt.join('\n') };
    }).filter((p) => p.fr);
    return { paras, empty: !paras.length };
  },

  audio(b, warn) {
    const items = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      if (t.startsWith('~')) { if (items.length) items[items.length - 1].pt = t.slice(1).trim(); continue; }
      let speaker = '', rest = t;
      const sm = t.match(/^([^\s:=~][^:=]{0,24}[^\s:=]|[^\s:=~]):\s+(.+)$/);
      if (sm && !/^https?$/i.test(sm[1])) { speaker = sm[1].trim(); rest = sm[2]; }
      const [fr, pt] = splitEq(rest);
      items.push({ speaker, fr, pt, line: l.n });
    }
    const speakers = [...new Set(items.map((i) => i.speaker).filter(Boolean))];
    return { items, speakers, empty: !items.length };
  },

  gramatica(b, warn) { const nodes = parseRich(b.lines, warn); return { nodes, empty: !nodes.length }; },
  cultura(b, warn) { const nodes = parseRich(b.lines, warn); return { nodes, empty: !nodes.length }; },
  nota(b, warn) { const nodes = parseRich(b.lines, warn); return { nodes, empty: !nodes.length }; },
  resumo(b, warn) { const nodes = parseRich(b.lines, warn); return { nodes, empty: !nodes.length }; },

  vocab(b, warn, ctx) {
    const items = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      const f = t.split('|').map((x) => x.trim()).map((x) => (x === '-' ? '' : x));
      if (f.length < 2 || !f[0] || !f[1]) { warn(l.n, 'Vocabulário precisa de pelo menos "palavra | tradução".'); continue; }
      const [ex, exPt] = splitEq(f[4] || '');
      let img = f[2] || '';
      if (img && !isImageRef(img)) { warn(l.n, `"${img}" não parece imagem (link https://, emoji ou img:nome).`); img = ''; }
      items.push({ fr: f[0], pt: f[1], img, classe: f[3] || '', ex, exPt, nota: f[5] || '', lang: ctx.lang, line: l.n });
    }
    return { items, empty: !items.length };
  },

  expressoes(b, warn, ctx) {
    const items = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      const parts = t.split(/\s+\|\s+/);
      const [fr, pt] = splitEq(parts[0]);
      if (!pt) { warn(l.n, 'Expressão precisa de "expressão = tradução".'); continue; }
      items.push({ fr, pt, img: '', classe: 'expressão', ex: '', exPt: '', nota: parts[1] || '', lang: ctx.lang, line: l.n });
    }
    return { items, empty: !items.length };
  },

  conjugacao(b, warn) {
    let verbo = '', verboPt = '', tempo = '';
    const rows = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      let m;
      if ((m = t.match(/^@\s*verbo\s*:\s*(.*)$/i))) { [verbo, verboPt] = splitEq(m[1]); continue; }
      if ((m = t.match(/^@\s*tempo\s*:\s*(.*)$/i))) { tempo = m[1].trim(); continue; }
      const f = t.split('|').map((x) => x.trim());
      if (f.length < 2) { warn(l.n, 'Conjugação: use "pronome | forma" (ex.: je | veux).'); continue; }
      const [forma, pt] = splitEq(f[1]);
      rows.push({ pron: f[0], forma, pt: pt || f[2] || '' });
    }
    return { verbo, verboPt, tempo, rows, empty: !rows.length };
  },

  pronuncia(b, warn) {
    const items = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      const f = t.split('|').map((x) => x.trim());
      items.push({ fr: f[0], ipa: f[1] || '', dica: f[2] || '' });
    }
    return { items, empty: !items.length };
  },

  escrita(b, warn) {
    const prompt = [], checklist = [], model = [], modelPt = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      if (t.startsWith('?')) checklist.push(t.slice(1).trim());
      else if (t.startsWith('=')) model.push(t.slice(1).trim());
      else if (t.startsWith('~')) modelPt.push(t.slice(1).trim());
      else prompt.push(t);
    }
    if (!prompt.length) warn(b.line, 'Escrita sem enunciado.');
    return { prompt: prompt.join('\n'), checklist, model: model.join('\n'), modelPt: modelPt.join('\n'), empty: !prompt.length };
  },

  imagem(b, warn) {
    const images = [], caption = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      if (isImageRef(t)) images.push(t); else caption.push(t);
    }
    if (!images.length) warn(b.line, 'Bloco de imagem sem imagem (use um link https://, img:nome ou emoji).');
    return { images, caption: caption.join('\n'), empty: !images.length };
  },

  video(b, warn) {
    const videos = [], caption = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      const id = youtubeId(t);
      if (id) videos.push({ id, start: ytStart(t) }); else if (isUrl(t)) warn(l.n, 'Só vídeos do YouTube podem ser incorporados.'); else caption.push(t);
    }
    return { videos, caption: caption.join('\n'), empty: !videos.length };
  },

  links(b, warn) {
    const items = [];
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      const f = t.split(/\s*\|\s*/);
      const url = f.find((x) => isUrl(x));
      if (!url) { warn(l.n, 'Link sem endereço https://'); continue; }
      const name = f.find((x) => x && x !== url) || url;
      items.push({ name, url });
    }
    return { items, empty: !items.length };
  },

  exercicios(b, warn) {
    const items = [];
    let cur = null;
    const finish = () => { if (cur) { const ok = validateEx(cur, warn); if (ok) items.push(cur); } cur = null; };
    for (const l of b.lines) {
      const t = l.text.trim(); if (!t) continue;
      const hm = t.match(/^\[([^\]]+)\]\s*(.*)$/);
      if (hm && !t.startsWith('[[')) {
        finish();
        const k = keyOf(hm[1]);
        const type = EX_ALIASES[k] || EX_ALIASES[k.replace(/-/g, '')];
        if (!type) warn(l.n, `Tipo de exercício desconhecido "[${hm[1]}]" — tratado como [escrever].`);
        cur = { type: type || 'escrever', prompt: hm[2].trim(), options: [], answers: [], pairs: [], explain: '', ctx: '', hint: '', line: l.n };
        continue;
      }
      if (!cur) { warn(l.n, 'Linha antes do primeiro exercício (comece com [tipo]).'); continue; }
      let m;
      if ((m = t.match(/^\*\s+(.*)$/))) cur.options.push({ text: m[1], ok: true });
      else if ((m = t.match(/^-\s+(.*)$/))) cur.options.push({ text: m[1], ok: false });
      else if ((m = t.match(/^=\s*(.*)$/))) cur.answers.push(m[1]);
      else if ((m = t.match(/^>\s*(.*)$/))) cur.explain += (cur.explain ? '\n' : '') + m[1];
      else if ((m = t.match(/^~\s*(.*)$/))) cur.ctx += (cur.ctx ? '\n' : '') + m[1];
      else if ((m = t.match(/^\?\s*(.*)$/))) cur.hint = m[1];
      else if (cur.type === 'associar' && t.includes(' = ')) { const [a, c] = splitEq(t); cur.pairs.push([a, c]); }
      else if (!cur.prompt) cur.prompt = t;
      else cur.prompt += '\n' + t;
    }
    finish();
    return { items, empty: !items.length };
  },
};

function validateEx(ex, warn) {
  const n = ex.line;
  switch (ex.type) {
    case 'escolha': case 'ouvir':
      if (ex.options.length < 2) { warn(n, `[${ex.type}] precisa de 2+ alternativas (* certa, - errada).`, 'erro'); return false; }
      if (!ex.options.some((o) => o.ok)) { warn(n, `[${ex.type}] sem alternativa correta (marque com *).`, 'erro'); return false; }
      if (ex.type === 'ouvir' && !ex.prompt) { warn(n, '[ouvir] precisa da frase que será lida.', 'erro'); return false; }
      return true;
    case 'escrever': case 'traduzir':
      if (!ex.answers.length) { warn(n, `[${ex.type}] sem resposta (= resposta | alternativa).`, 'erro'); return false; }
      ex.accept = ex.answers.flatMap(splitAlts);
      return true;
    case 'ditado':
      if (!ex.prompt) { warn(n, '[ditado] precisa da frase.', 'erro'); return false; }
      ex.accept = ex.answers.length ? ex.answers.flatMap(splitAlts) : [plain(ex.prompt)];
      return true;
    case 'completar': {
      // Forma 1: lacunas inline [[resposta|alternativa]]
      const inline = [...ex.prompt.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => splitAlts(m[1]));
      if (inline.length) {
        let i = 0;
        ex.text = ex.prompt.replace(/\[\[([^\]]+)\]\]/g, () => `[[${i++}]]`);
        ex.blanks = inline;
      } else {
        const count = (ex.prompt.match(/_{3,}/g) || []).length;
        if (!count) { warn(n, '[completar] sem lacuna: use ___ ou [[resposta]].', 'erro'); return false; }
        let i = 0;
        ex.text = ex.prompt.replace(/_{3,}/g, () => `[[${i++}]]`);
        if (ex.answers.length) {
          const parts = ex.answers.join(' ; ').split(/\s*;\s*/).filter(Boolean);
          ex.blanks = parts.map(splitAlts);
        } else if (count === 1 && ex.options.some((o) => o.ok)) {
          ex.blanks = [ex.options.filter((o) => o.ok).map((o) => o.text)];
        } else ex.blanks = [];
        if (ex.blanks.length !== count) { warn(n, `[completar] tem ${count} lacuna(s) e ${ex.blanks.length} resposta(s) (separe lacunas com ;).`, 'erro'); return false; }
      }
      ex.chips = ex.options.length ? ex.options.map((o) => o.text) : null;
      return true;
    }
    case 'ordenar': {
      const src = ex.answers.length ? ex.answers[0] : ex.prompt;
      const tokens = src.split(/\s+\/\s+|\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
      if (tokens.length < 2) { warn(n, '[ordenar] separe as partes com " / " na ordem correta.', 'erro'); return false; }
      ex.tokens = tokens;
      if (ex.answers.length) ex.instr = ex.prompt;
      return true;
    }
    case 'associar':
      if (ex.pairs.length < 2) { warn(n, '[associar] precisa de 2+ linhas "a = b".', 'erro'); return false; }
      return true;
    case 'vf': {
      const a = keyOf(ex.answers[0] || '');
      if (!a) { warn(n, '[vf] sem resposta (= verdadeiro ou = falso).', 'erro'); return false; }
      ex.truth = /^(v|verdadeiro|vrai|true|sim|certo|c)$/.test(a);
      if (!ex.truth && !/^(f|falso|faux|false|nao|errado|e)$/.test(a)) { warn(n, `[vf] resposta "${ex.answers[0]}" não reconhecida.`, 'erro'); return false; }
      return true;
    }
  }
  return true;
}

export function youtubeId(s) {
  const m = String(s).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}
function ytStart(s) {
  const m = String(s).match(/[?&]t=(\d+)/);
  return m ? +m[1] : 0;
}

// ---------- correção de respostas ---------------------------

export function normAnswer(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»“”"]/g, '')
    .replace(/[  ]/g, ' ')
    .replace(/[.,!?¿¡;:…()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/** Compara resposta com aceitas → {ok, exact, note, best} */
export function checkAnswer(given, accepted) {
  const g = normAnswer(given);
  if (!g) return { ok: false, exact: false, note: '', best: accepted[0] };
  for (const a of accepted) if (normAnswer(a) === g) return { ok: true, exact: true, note: '', best: a };
  for (const a of accepted) if (deaccent(normAnswer(a)) === deaccent(g)) return { ok: true, exact: false, note: 'Quase! Atenção aos acentos.', best: a };
  const noAp = (x) => deaccent(x).replace(/'\s*/g, ' ').replace(/\s+/g, ' ').trim();
  for (const a of accepted) if (noAp(normAnswer(a)) === noAp(g)) return { ok: true, exact: false, note: 'Quase! Atenção ao apóstrofo.', best: a };
  for (const a of accepted) {
    const A = deaccent(normAnswer(a)), G = deaccent(g);
    if (A.length >= 5 && lev(A, G) <= (A.length > 14 ? 2 : 1)) return { ok: true, exact: false, note: 'Quase! Pequeno erro de digitação.', best: a };
  }
  return { ok: false, exact: false, note: '', best: accepted[0] };
}
