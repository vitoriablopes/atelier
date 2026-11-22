// Gravar a própria voz, comparar com o modelo e conferir a pronúncia (reconhecimento de fala do navegador)
import { esc, modal, toast } from './util.js';
import { plain, deaccent } from './parser.js';
import * as TTS from './speech.js';
import { bump } from './data.js';

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
export const canRecognize = () => !!SR;

export function recBtn(text, { lang, size = 'sm' } = {}) {
  if (!canRecord() && !canRecognize()) return '';
  return `<button type="button" class="icon-btn ${size}" data-rec="${esc(plain(text))}"${lang ? ` data-lang="${esc(lang)}"` : ''} title="Gravar e comparar minha pronúncia" aria-label="Gravar minha voz">🎙</button>`;
}

const norm = (s) => deaccent(String(s).toLowerCase()).replace(/[’']/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
/** Compara palavra por palavra (subsequência comum mais longa). */
function compare(target, heard) {
  const a = norm(target), b = norm(heard);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Set(); let i = 0, j = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { hit.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return { words: a, hit, pct: a.length ? Math.round((hit.size / a.length) * 100) : 0 };
}

export function openRecorder(text, lang) {
  let stream = null, rec = null, chunks = [], url = '', timer = null, recog = null;
  const stopAll = () => {
    try { rec?.state === 'recording' && rec.stop(); } catch (e) {}
    stream?.getTracks().forEach((t) => t.stop()); stream = null;
    try { recog?.abort(); } catch (e) {}
    clearTimeout(timer); TTS.stop();
  };
  const close = modal(`<div class="stack recorder">
    <div class="caps muted">Pratique a pronúncia</div>
    <div class="rec-phrase">${esc(text)}</div>
    <div class="row"><button class="btn sm" data-m>▶ Ouvir modelo</button><button class="btn sm" data-ms>½ Devagar</button></div>
    ${canRecord() ? `<div class="rec-row"><button class="rec-btn" data-r aria-label="Gravar">●</button><div class="grow small muted" data-rs>Toque para gravar sua voz (até 15 s).</div><button class="btn sm" data-me disabled>▶ Minha voz</button></div>` : ''}
    ${canRecognize() ? `<div class="stack-s"><button class="btn sm lav" data-sr>🗣 Falar para conferir</button><div data-sres></div></div>` : '<p class="tiny muted" style="margin:0">A conferência automática da pronúncia funciona no Chrome e no Edge.</p>'}
    <div class="row" style="justify-content:flex-end"><button class="btn" data-close>Fechar</button></div></div>`, (m) => {
    m.querySelector('[data-m]').onclick = () => TTS.speak(text, { lang });
    m.querySelector('[data-ms]').onclick = () => TTS.speak(text, { lang, speed: 'lenta' });
    const rbtn = m.querySelector('[data-r]'), rs = m.querySelector('[data-rs]'), me = m.querySelector('[data-me]');
    if (rbtn) rbtn.onclick = async () => {
      if (rec?.state === 'recording') { rec.stop(); return; }
      try {
        TTS.stop();
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = []; rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = () => {
          stream?.getTracks().forEach((t) => t.stop()); stream = null; clearTimeout(timer);
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
          rbtn.classList.remove('on'); rbtn.textContent = '●';
          rs.textContent = 'Gravado! Compare com o modelo.'; me.disabled = false; bump();
        };
        rec.start(); rbtn.classList.add('on'); rbtn.textContent = '■'; rs.textContent = 'Gravando… toque de novo para parar.';
        timer = setTimeout(() => rec?.state === 'recording' && rec.stop(), 15000);
      } catch (e) { toast('Não consegui acessar o microfone. Verifique a permissão do navegador.', 5000); }
    };
    if (me) me.onclick = () => { if (url) new Audio(url).play().catch(() => {}); };
    const srb = m.querySelector('[data-sr]'), out = m.querySelector('[data-sres]');
    if (srb) srb.onclick = () => {
      TTS.stop();
      recog = new SR();
      recog.lang = TTS.LANG_TTS[lang] || lang; recog.interimResults = false; recog.maxAlternatives = 3;
      srb.disabled = true; srb.textContent = '🗣 Ouvindo… fale a frase';
      recog.onresult = (ev) => {
        const alts = [...ev.results[0]].map((r) => r.transcript);
        const best = alts.map((h) => ({ h, c: compare(text, h) })).sort((x, y) => y.c.pct - x.c.pct)[0];
        const c = best.c;
        out.innerHTML = `<div class="feedback ${c.pct >= 80 ? 'ok' : 'bad'}" style="margin-top:4px"><div class="t">${c.pct >= 95 ? 'Perfeito!' : c.pct >= 80 ? 'Muito bem!' : c.pct >= 50 ? 'Quase lá' : 'Tente de novo'} · ${c.pct}%</div>
          <div class="rec-words">${c.words.map((w, i) => `<span class="${c.hit.has(i) ? 'hit' : 'miss'}">${esc(w)}</span>`).join(' ')}</div>
          <div class="small muted">O navegador entendeu: “${esc(best.h)}”</div></div>`;
        bump();
      };
      recog.onerror = (ev) => { out.innerHTML = `<p class="small" style="color:var(--bad)">${ev.error === 'not-allowed' ? 'Permita o microfone para conferir.' : ev.error === 'no-speech' ? 'Não ouvi nada — tente de novo.' : 'Não deu para conferir agora.'}</p>`; };
      recog.onend = () => { srb.disabled = false; srb.textContent = '🗣 Falar para conferir'; };
      try { recog.start(); } catch (e) { srb.disabled = false; }
    };
  });
  // fecha microfone quando o modal some
  const obs = new MutationObserver(() => { if (!document.querySelector('.recorder')) { stopAll(); if (url) URL.revokeObjectURL(url); obs.disconnect(); } });
  obs.observe(document.body, { childList: true });
  return close;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rec]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  openRecorder(b.dataset.rec, b.dataset.lang || document.documentElement.dataset.lang || 'fr');
}, true);
