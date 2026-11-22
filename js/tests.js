// Teste de nivelamento, prova de fim de nível e sessão de revisão misturada
import { LEVELS, LEVEL_NAMES, levelIndex } from './parser.js';
import { esc, shuffle, plural, langInfo } from './util.js';
import { Store, save } from './store.js';
import { runExercises } from './exercises.js';
import { lessonsOf, exercisesOf, pickMixed, recordEx, LEVEL_GOALS } from './data.js';
import { recordError, clearError, teardown } from './lesson.js';

const PASS = 0.8;   // prova do nível
const PLACE = 0.6;  // nivelamento

function shell(v, title, sub, back) {
  teardown();
  v.innerHTML = `<div class="lesson-shell fade-in"><div class="lesson-top"><button class="icon-btn" data-x title="Sair">✕</button><div class="grow"><div class="caps muted">${esc(title)}</div>${sub ? `<div class="small muted" data-sub>${esc(sub)}</div>` : ''}</div></div>
    <div class="card block-card" data-run data-busy></div></div>`;
  v.querySelector('[data-x]').onclick = back;
  return v.querySelector('[data-run]');
}
const pool = (lang, lvl) => exercisesOf(lessonsOf(lang).filter((L) => L.nivel === lvl)).filter((it) => it.type !== 'associar' || it.pairs.length <= 5);

/** Sessão de revisão misturada (exercícios de lições já estudadas). */
export function mixedSession(v, { go, n = 10 }) {
  const lang = Store.state.perfil.idioma;
  const items = pickMixed(lang, n);
  const run = shell(v, 'Revisão misturada', 'Exercícios das lições que você já estudou, com prioridade para os que você errou.', () => go('#hoje'));
  if (!items.length) { run.innerHTML = `<div class="empty">Estude pelo menos uma lição para liberar a revisão misturada.</div>`; return; }
  runExercises(run, items, {
    lang,
    onAnswer: (it, ok, given) => { recordEx(it._id, ok); if (!ok) recordError(it, given, { lang }); else clearError(it, { lang }); },
    onDone: () => run.insertAdjacentHTML('beforeend', `<div class="row" style="justify-content:center"><button class="btn" data-goto="hoje">Voltar</button><button class="btn primary" data-again>Mais uma rodada</button></div>`),
  });
  run.addEventListener('click', (e) => { if (e.target.closest('[data-again]')) mixedSession(v, { go, n }); });
}

/** Prova de fim de nível: até 15 exercícios de todas as lições do nível, sem segunda chance. */
export function levelExam(v, lvl, { go }) {
  const lang = Store.state.perfil.idioma;
  const items = shuffle(pool(lang, lvl)).slice(0, 15);
  const run = shell(v, `Prova do nível ${lvl} · ${LEVEL_NAMES[lvl]}`, `${plural(items.length, 'questão', 'questões')} · aprovação com ${PASS * 100}%`, () => go('#trilha'));
  if (items.length < 3) { run.innerHTML = `<div class="empty">Este nível ainda tem poucos exercícios para uma prova (mínimo 3).</div>`; return; }
  runExercises(run, items, {
    lang, retryWrong: false,
    onAnswer: (it, ok, given) => { recordEx(it._id, ok); if (!ok) recordError(it, given, { lang }); else clearError(it, { lang }); },
    onDone: (arr) => {
      const nota = Math.round((arr.filter((r) => r.ok).length / arr.length) * 100);
      const passou = nota >= PASS * 100;
      const P = (Store.state.progresso.provas ||= {});
      const k = lang + '|' + lvl;
      P[k] = { nota: Math.max(nota, P[k]?.nota || 0), ultima: nota, passou: passou || !!P[k]?.passou, t: Date.now() };
      save('progresso');
      const next = LEVELS[LEVELS.indexOf(lvl) + 1];
      run.innerHTML = `<div class="end stack"><div class="orn">${passou ? '✦' : '❦'}</div><h1>${passou ? `Nível ${lvl} concluído!` : 'Quase lá'}</h1>
        <p class="muted" style="margin:0">Você fez <b>${nota}%</b>. ${passou ? (next ? `Pode seguir para o ${next} com confiança.` : '') : `Revise as lições do ${lvl} (os erros foram para o Caderno) e tente de novo.`}</p>
        ${passou ? `<div class="small muted">${LEVEL_GOALS[lvl].map((g) => '✓ ' + esc(g)).join('<br>')}</div>` : ''}
        <div class="row" style="justify-content:center"><button class="btn" data-goto="trilha">Voltar à trilha</button>${!passou ? '<button class="btn primary" data-goto="caderno">Ver meus erros</button>' : ''}</div></div>`;
    },
  });
}

/** Teste de nivelamento: sobe de nível enquanto você acerta ≥ 60%. */
export function placementTest(v, { go }) {
  const lang = Store.state.perfil.idioma;
  const levels = [...new Set(lessonsOf(lang).map((L) => L.nivel).filter(Boolean))].sort((a, b) => levelIndex(a) - levelIndex(b)).filter((l) => pool(lang, l).length);
  const run = shell(v, `Teste de nivelamento · ${langInfo(lang).nome}`, '', () => go('#trilha'));
  if (!levels.length) { run.innerHTML = `<div class="empty">Ainda não há exercícios suficientes nas lições para montar o teste.</div>`; return; }
  const results = [];
  const intro = () => {
    run.innerHTML = `<div class="stack" style="text-align:center;padding:20px 0"><div class="orn" style="font-size:2rem;color:var(--rose-d)">❦</div><h1>Por onde começar?</h1>
      <p class="muted" style="margin:0">São até 6 perguntas por nível, começando pelo ${levels[0]}. Se você acertar ${PLACE * 100}% ou mais, passa para o próximo. Sem pressão: é só para sugerir o seu ponto de partida.</p>
      <div><button class="btn primary lg" data-start>Começar</button></div></div>`;
    run.querySelector('[data-start]').onclick = () => step(0);
  };
  const step = (k) => {
    const lvl = levels[k];
    const items = shuffle(pool(lang, lvl)).slice(0, 6);
    v.querySelector('[data-sub]')?.remove();
    v.querySelector('.lesson-top .grow').insertAdjacentHTML('beforeend', `<div class="small muted" data-sub>Nível ${lvl} · ${LEVEL_NAMES[lvl]} (${k + 1} de ${levels.length})</div>`);
    runExercises(run, items, {
      lang, retryWrong: false, source: false,
      onDone: (arr) => {
        const pct = arr.filter((r) => r.ok).length / arr.length;
        results.push({ lvl, pct });
        if (pct >= PLACE && k + 1 < levels.length) return step(k + 1);
        finish(pct >= PLACE && k + 1 >= levels.length ? null : lvl);
      },
    });
  };
  const finish = (lvl) => {
    const rec = lvl || levels[levels.length - 1];
    (Store.state.progresso.nivelamento ||= {})[lang] = { nivel: rec, acimaDe: !lvl, t: Date.now(), res: results.map((r) => ({ n: r.lvl, p: Math.round(r.pct * 100) })) };
    save('progresso');
    run.innerHTML = `<div class="end stack"><div class="orn">✿</div><h1>Comece pelo ${rec}</h1>
      <p class="muted" style="margin:0">${!lvl ? `Você foi bem em todos os níveis disponíveis! Siga pelo ${rec} ou pela biblioteca.` : results.length > 1 ? `Você foi bem até o ${results[results.length - 2].lvl}; o ${rec} é o seu ponto ideal para continuar.` : `O ${rec} é o seu ponto de partida ideal.`}</p>
      <div class="small">${results.map((r) => `<span class="chip ${r.pct >= PLACE ? 'sage' : 'rose'}">${r.lvl}: ${Math.round(r.pct * 100)}%</span>`).join(' ')}</div>
      <div class="row" style="justify-content:center"><button class="btn primary" data-golvl>Ir para o ${rec}</button></div></div>`;
    run.querySelector('[data-golvl]').onclick = () => go('#trilha', { nivel: rec });
  };
  intro();
}
