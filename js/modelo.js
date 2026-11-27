// Modelo do código de lição, trechos prontos por bloco e prompt para gerar lições com IA.

export const HEADER = `@titulo: Título da lição
@idioma: fr
@nivel: A1
@unidade: 1 · Nome da unidade
@temas: tema1, tema2
@gramatica: tópico gramatical 1, tópico gramatical 2
@tempo: 15
@descricao: Uma frase dizendo o que a aluna vai aprender.`;

export const META_DOC = [
  ['@titulo', 'Título. Se você preencher o campo "Título" no Estúdio, ele tem prioridade.'],
  ['@idioma', 'fr, es, it, de, en, ja, ko, zh, ru, nl… Define o curso (seletor de idioma) e a voz da leitura.'],
  ['@nivel', 'A0, A1, A2, B1, B2, C1 ou C2. A trilha é separada por nível. Use "extra" (ou deixe sem) para lições extras.'],
  ['@unidade', 'Opcional. Agrupa lições dentro do nível.'],
  ['@temas', 'Temas da lição (comida, viagem…), separados por vírgula. Filtros na Trilha, Cartões e Dicionário.'],
  ['@gramatica', 'Tópicos gramaticais (passé composé, artigos…), separados por vírgula. Filtro na Trilha.'],
  ['@tempo', 'Duração estimada, em minutos.'],
  ['@descricao', 'Uma frase sobre o objetivo da lição.'],
  ['@codigo', 'Opcional. Código da aula na ementa (ex.: A0.01). Define a ordem dentro do nível e permite substituir a aula ao reimportar.'],
  ['@tipo', 'Sem isso, é uma lição da Trilha. "biblioteca" = texto da Biblioteca; "exercicios" = bateria de exercícios; "nivel" = arquivo com nome, objetivos e marco de um nível.'],
  ['@autor / @obra', 'Biblioteca: autor(a) e obra de onde o texto foi tirado.'],
  ['@fonte', 'Fonte geral (obra, página, link). Também pode ir dentro de cada bloco TEXTO.'],
];

export const LIB_TEMPLATE = `@tipo: biblioteca
@titulo: Título do texto
@idioma: fr
@nivel: B1
@autor: Nome do(a) autor(a)
@obra: Nome do livro, site ou jornal
@fonte: Obra, capítulo/página | https://link-do-material
@temas: tema1, tema2
@gramatica: tópico em destaque 1, tópico em destaque 2
@tempo: 10
@descricao: Uma frase sobre o texto.

== TEXTO | Capítulo ou parte 1
Primeiro parágrafo no original, com {palavras|tradução no contexto} clicáveis e ((um trecho de gramática|explicação curta do ponto gramatical)).
~ Tradução do primeiro parágrafo.

Segundo parágrafo.
~ Tradução do segundo parágrafo.

== TEXTO | Parte 2 (opcional — use vários blocos para capítulos)
Mais parágrafos…
~ Tradução.

== VOCAB | Glossário
le mot | a palavra | - | subst. m. | Une phrase du texte avec le mot. = Uma frase do texto com a palavra.

== GRAMATICA | Notas de leitura (opcional)
Explicação dos pontos gramaticais destacados, com > exemplos tirados do texto = tradução.

== EXERCICIOS | Compreensão (opcional)
[escolha] Pergunta sobre o texto?
* resposta certa
- errada
[vf] Afirmação sobre o texto.
= falso`;

export const SNIPPETS = {
  texto: {
    titulo: 'TEXTO — leitura com palavras destacadas',
    code: `== TEXTO | Título do texto
Primeiro parágrafo com uma {palavra|significado} destacada e outra {palavra}.
~ Tradução do primeiro parágrafo (opcional).

Segundo parágrafo. Linha em branco separa parágrafos.
~ Tradução do segundo parágrafo.
@fonte: Nome da obra, Autor (ano) | https://link-da-fonte`,
    explica: [
      '{palavra|significado} vira palavra clicável que mostra o significado e lê em voz alta.',
      '{palavra} sem significado busca a palavra no dicionário das lições.',
      'Linha começando com ~ é a tradução do parágrafo (botão "Tradução").',
      '@fonte: é obrigatória em textos — nome da obra e/ou link, separados por |. Para textos seus: "@fonte: Texto original".',
      '((trecho|explicação)) marca um trecho de gramática: aparece sublinhado em amarelo e mostra a explicação ao tocar.',
      '**negrito** e *itálico* funcionam em todos os blocos.',
    ],
  },
  audio: {
    titulo: 'AUDIO — escuta (o próprio app lê o texto)',
    code: `== AUDIO | Título da escuta
Pessoa A: Frase que será lida em voz alta. = Tradução da frase.
Pessoa B: Resposta da outra pessoa. = Tradução.
Frase sem personagem também funciona. = Tradução.
@fonte: Diálogo original`,
    explica: [
      'Cada linha é uma fala. "Nome:" no começo é opcional (cada personagem ganha um tom de voz diferente).',
      '" = " separa a fala da tradução (opcional).',
      'No app: 3 velocidades (lenta, normal, rápida), mostrar/ocultar transcrição e tradução, e ouvir fala por fala.',
    ],
  },
  gramatica: {
    titulo: 'GRAMATICA — explicação',
    code: `== GRAMATICA | Nome do ponto gramatical
Parágrafo de explicação com **negrito** e *itálico*.
> Frase de exemplo no idioma. = Tradução do exemplo.

### Subtítulo
| coluna 1 | coluna 2 | coluna 3 |
|---|---|---|
| a | b | c |

- item de lista
- outro item

! Dica: aparece num quadro amarelo.
!! Atenção: aparece num quadro rosa.`,
    explica: [
      '> exemplo = tradução → linha de exemplo com botão de ouvir.',
      'Tabelas com | ; a linha |---| logo depois da primeira transforma ela em cabeçalho.',
      '### subtítulo · - lista · 1. lista numerada · ! dica · !! atenção.',
    ],
  },
  vocab: {
    titulo: 'VOCAB — cartões de vocabulário (vão para Cartões e Dicionário)',
    code: `== VOCAB | Nome do grupo de palavras
// campos: palavra | tradução | imagem | classe | exemplo = tradução do exemplo | nota
le café | o café | ☕ | subst. m. | Je bois un café. = Eu bebo um café.
la gare | a estação | https://link-da-imagem.jpg | subst. f.
chaud | quente | img:chaud.jpg | adj.
merci | obrigado(a)`,
    explica: [
      'Campos separados por |. Só os dois primeiros são obrigatórios; use - para pular um campo.',
      'Imagem: um link https:// de imagem, um emoji, ou img:nome.jpg (arquivo na pasta imagens/ do site).',
      'O título do bloco vira um "tema" para filtrar nos Cartões e no Dicionário.',
    ],
  },
  expressoes: {
    titulo: 'EXPRESSOES — frases prontas (também vão para Cartões e Dicionário)',
    code: `== EXPRESSOES | Título
expressão no idioma = tradução | nota opcional
s'il vous plaît = por favor | formal`,
    explica: ['Uma expressão por linha: "expressão = tradução", e "| nota" se quiser.'],
  },
  exercicios: {
    titulo: 'EXERCICIOS — prática (13 tipos)',
    code: `== EXERCICIOS | Prática
[escolha] Pergunta?
* alternativa correta
- alternativa errada
- outra errada
> Explicação mostrada depois de responder (opcional).

[ouvir] Frase que será lida em voz alta.
* tradução correta
- tradução errada
- outra errada

[completar] Je [[voudrais]] un café, s'il vous [[plaît|plait]].
~ Tradução ou contexto (opcional).

[completar] Nous ___ deux cafés.
* voulons
- voulez
- veux

[escrever] Como se diz "a conta"?
= l'addition | addition
? Dica opcional (aparece num botão).

[traduzir] Quanto é?
= C'est combien ? | Combien ça coûte ?

[ordenar] Je / voudrais / un café / s'il vous plaît
~ Eu gostaria de um café, por favor.

[associar] Associe
le thé = o chá
l'eau = a água
chaud = quente

[ditado] Frase que será lida e deve ser escrita.

[vf] Afirmação sobre o texto.
= verdadeiro
> Por quê.

[conjugar] Hier, nous [[avons mangé]] (manger, passé composé) au restaurant.

[pronome] Tu connais Marie ? Oui, je [[la]] connais.

[transformar] Passe para a negativa: Je mange du pain.
= Je ne mange pas de pain

[corrigir] Elle a allé au marché.
= Elle est allée au marché
> Aller usa o auxiliar être.`,
    explica: [
      'Cada exercício começa com [tipo]. * = alternativa certa, - = errada, = = resposta aceita (várias com |), > = explicação, ~ = contexto, ? = dica.',
      '[completar]: lacunas com [[resposta|alternativa]] dentro da frase, ou ___ com "= resp1 ; resp2" (uma por lacuna, separadas por ;), ou ___ com alternativas * e -.',
      '[ordenar]: escreva as partes NA ORDEM CERTA separadas por / — o app embaralha.',
      '[vf]: = verdadeiro ou = falso.',
      '[conjugar] e [pronome] funcionam como [completar]: a resposta vai entre [[ ]]; no [conjugar], ponha o infinitivo (e o tempo) entre parênteses depois da lacuna.',
      '[transformar] e [corrigir] funcionam como [escrever]: instrução/frase na linha e "= resposta | alternativas".',
      'Na correção, o app perdoa maiúsculas, pontuação e apóstrofo; acento faltando ou 1 letra trocada conta como "quase".',
      'Os que a aluna erra voltam no fim do bloco e ficam no Caderno de erros.',
    ],
  },
  conjugacao: {
    titulo: 'CONJUGACAO — tabela de verbo com treino',
    code: `== CONJUGACAO | vouloir — presente
@verbo: vouloir = querer
@tempo: présent
je | veux = eu quero
tu | veux = você quer
il / elle | veut = ele / ela quer
nous | voulons = nós queremos
vous | voulez = vocês querem
ils / elles | veulent = eles / elas querem`,
    explica: ['"pronome | forma = tradução". Tem botão "Treinar de memória" que esconde as formas.'],
  },
  pronuncia: {
    titulo: 'PRONUNCIA — sons e repetição',
    code: `== PRONUNCIA | O som [y]
tu | [ty] | Diga "i" com os lábios em bico.
la rue | [la ʁy] | Dica opcional.`,
    explica: ['"palavra | transcrição fonética | dica". Botões: ouvir, ouvir devagar e repetir 3×.'],
  },
  cultura: {
    titulo: 'CULTURA — nota cultural',
    code: `== CULTURA | Título
Texto livre, com a mesma formatação da GRAMATICA.
- listas, > exemplos, tabelas, ! dicas…`,
    explica: ['Igual à GRAMATICA, com outra cor.'],
  },
  nota: {
    titulo: 'NOTA — observação curta',
    code: `== NOTA | Título
Qualquer observação, com a mesma formatação da GRAMATICA.`,
    explica: ['Igual à GRAMATICA, com outra cor.'],
  },
  escrita: {
    titulo: 'ESCRITA — produção livre com autoavaliação',
    code: `== ESCRITA | Sua vez
Enunciado: o que a aluna deve escrever.
? Item da lista de autoavaliação
? Outro item
= Modelo de resposta no idioma.
~ Tradução do modelo.`,
    explica: ['O texto escrito fica salvo no Caderno. ? = item de checklist, = modelo (revelado num botão), ~ tradução do modelo.'],
  },
  imagem: {
    titulo: 'IMAGEM — imagem com legenda',
    code: `== IMAGEM | Título
https://link-da-imagem.jpg
Legenda com {palavras|destacadas} se quiser.
@fonte: Autor da foto | https://link`,
    explica: ['Uma ou mais linhas de imagem (link https://, img:nome.jpg ou emoji); o resto vira legenda.'],
  },
  video: {
    titulo: 'VIDEO — vídeo do YouTube',
    code: `== VIDEO | Título
https://www.youtube.com/watch?v=XXXXXXXXXXX
Legenda opcional.
@fonte: Nome do canal | https://link`,
    explica: ['Aceita links youtube.com/watch, youtu.be e shorts (com ?t=segundos para começar num ponto).'],
  },
  resumo: {
    titulo: 'RESUMO — pontos-chave no fim',
    code: `== RESUMO
- **ponto 1** = explicação curta
- ponto 2`,
    explica: ['Mesma formatação da GRAMATICA; os itens de lista aparecem com ✓.'],
  },
  links: {
    titulo: 'LINKS — para ir além',
    code: `== LINKS | Para ir além
Nome do recurso | https://link
Outro recurso | https://outro-link`,
    explica: ['"nome | link" por linha.'],
  },
};

export const ORDER = ['texto', 'audio', 'gramatica', 'conjugacao', 'vocab', 'expressoes', 'pronuncia', 'cultura', 'nota', 'imagem', 'video', 'exercicios', 'escrita', 'resumo', 'links'];

export const TEMPLATE = `// MODELO DE LIÇÃO — copie, troque o conteúdo e apague os blocos que não usar.
// Linhas que começam com // são comentários e são ignoradas.
// Você pode repetir qualquer bloco quantas vezes quiser, na ordem que quiser.
${HEADER}

${ORDER.map((k) => SNIPPETS[k].code).join('\n\n')}
`;

const PROMPT_RULES = `MÉTODO (siga nesta ordem): 1) input compreensível — um TEXTO curto e/ou um AUDIO (diálogo) no nível pedido, com 6–12 palavras-chave destacadas como {palavra|significado}; 2) GRAMATICA explícita e curta sobre os tópicos gramaticais pedidos, com exemplos tirados do texto; 3) VOCAB com 8–15 palavras do texto (com exemplo e tradução); 4) EXERCICIOS variados (10–14), do reconhecimento para a produção: escolha/ouvir → completar/associar → ordenar/escrever/traduzir/ditado; 5) ESCRITA curta com modelo; 6) RESUMO. Use CONJUGACAO, EXPRESSOES, PRONUNCIA ou CULTURA quando fizer sentido. Explicações em português do Brasil; conteúdo no idioma estudado, adequado ao nível (A0 = primeiras palavras e frases prontas; C2 = textos autênticos e nuances).

REGRAS DO FORMATO:
- Começa com metadados, um por linha: @titulo:, @idioma:, @nivel: (A0, A1, A2, B1, B2, C1, C2 ou extra), @unidade:, @temas: (temas separados por vírgula), @gramatica: (tópicos gramaticais separados por vírgula), @tempo: (minutos), @descricao:.
- Cada bloco começa com "== TIPO | título". Tipos: TEXTO, AUDIO, GRAMATICA, VOCAB, EXPRESSOES, EXERCICIOS, CONJUGACAO, PRONUNCIA, CULTURA, NOTA, ESCRITA, IMAGEM, VIDEO, RESUMO, LINKS. Pode repetir tipos.
- Todo TEXTO precisa terminar com "@fonte: nome da obra/autor | link" (ou "@fonte: Texto original" se você escreveu). Não copie trechos longos de obras protegidas por direitos autorais: escreva textos originais ou use obras em domínio público, citando a fonte.
- TEXTO: parágrafos separados por linha em branco; "~ tradução" logo abaixo de cada parágrafo.
- AUDIO: uma fala por linha, "Nome: frase = tradução".
- GRAMATICA/CULTURA/NOTA/RESUMO: texto com **negrito**, *itálico*, "### subtítulo", "- lista", tabelas com | (linha |---| depois do cabeçalho), "> exemplo = tradução", "! dica", "!! atenção".
- VOCAB: "palavra | tradução | imagem | classe | exemplo = tradução do exemplo | nota" (use - para campo vazio; imagem pode ser um emoji ou link https:// de imagem livre de direitos).
- EXPRESSOES: "expressão = tradução | nota".
- CONJUGACAO: "@verbo: infinitivo = tradução", "@tempo: nome do tempo", depois "pronome | forma = tradução".
- PRONUNCIA: "palavra | [IPA] | dica".
- ESCRITA: enunciado; "? item de autoavaliação"; "= modelo"; "~ tradução do modelo".
- EXERCICIOS: cada um começa com [tipo]:
  [escolha] pergunta + linhas "* certa" e "- errada";
  [ouvir] frase no idioma + "* tradução certa" e "- erradas";
  [completar] frase com lacunas [[resposta|alternativa aceita]];
  [escrever] pergunta + "= resposta | alternativa";
  [traduzir] frase em português + "= tradução | alternativa";
  [ordenar] partes na ordem correta separadas por " / " + "~ tradução";
  [associar] instrução + linhas "a = b";
  [ditado] frase no idioma;
  [vf] afirmação + "= verdadeiro" ou "= falso".
  Opcionais em qualquer exercício: "> explicação", "~ contexto", "? dica".`;

/** Monta o prompt para IA a partir do formulário do Estúdio (ou com colchetes, se vazio). */
export function buildPrompt(f = {}) {
  const v = (x, ph) => (x && String(x).trim()) || ph;
  const nivel = f.nivel === 'extra' ? 'extra (lição extra, sem nível)' : v(f.nivel, '[A0 / A1 / A2 / B1 / B2 / C1 / C2 / extra]');
  return `Você vai escrever uma lição de idioma no formato de texto do meu app de estudos. Responda APENAS com o código da lição, dentro de um único bloco de código, sem comentários antes ou depois.

IDIOMA: ${f.idioma ? f.idioma + (f.idiomaNome ? ` (${f.idiomaNome}) — use @idioma: ${f.idioma}` : '') : '[código: fr / es / it / de / en / ja…]'}
NÍVEL: ${nivel}
TEMA(S): ${v(f.temas, '[ex.: comida, restaurante]')}
TÓPICO(S) GRAMATICAL(IS): ${v(f.gramatica, '[ex.: passé composé com avoir]')}
UNIDADE: ${v(f.unidade, '[opcional, ex.: 2 · Em viagem]')}
DURAÇÃO: ${v(f.tempo, '[ex.: 20]')} minutos${f.extra && f.extra.trim() ? `\nPEDIDOS EXTRAS: ${f.extra.trim()}` : ''}

${PROMPT_RULES}`;
}
export const PROMPT = buildPrompt();


/** Prompt para a IA formatar um material (link/PDF) para a Biblioteca. */
export function buildLibraryPrompt(f = {}) {
  const v = (x, ph) => (x && String(x).trim()) || ph;
  const nivel = f.nivel === 'extra' ? 'extra' : v(f.nivel, '[A0–C2 ou extra]');
  const glosas = v(f.glosas, '10–20');
  return `Vou te enviar um material (link ou PDF). Pegue o texto dele e formate para a BIBLIOTECA do meu app de idiomas, no formato abaixo. Responda APENAS com o código, dentro de um único bloco de código, sem comentários antes ou depois.

MATERIAL: ${v(f.material, '[cole o link aqui ou anexe o PDF]')}
TRECHO: ${v(f.trecho, '[o texto todo / capítulo 1 / páginas 3–5…]')}
IDIOMA DO TEXTO: ${f.idioma ? f.idioma + (f.idiomaNome ? ` (${f.idiomaNome}) — use @idioma: ${f.idioma}` : '') : '[código: fr / es / it / de / en / ja…]'}
NÍVEL: ${nivel}
PALAVRAS QUE QUERO EM DESTAQUE: ${v(f.palavras, '[liste aqui, ou "escolha você"]')}
TÓPICOS GRAMATICAIS QUE QUERO EM DESTAQUE: ${v(f.gramatica, '[ex.: subjuntivo, pronomes relativos, ou "escolha você"]')}
${f.extra && f.extra.trim() ? `OUTRAS INSTRUÇÕES: ${f.extra.trim()}\n` : ''}
O QUE FAZER:
1. Copie o texto do material com fidelidade, mantendo a divisão original em parágrafos${f.adaptar ? ' — mas ADAPTE o vocabulário e as estruturas ao nível pedido, mantendo o sentido' : ' (não resuma nem simplifique)'}. Textos longos: divida em vários blocos "== TEXTO | título da parte" (por capítulo ou seção).
2. Logo abaixo de CADA parágrafo, escreva "~ " + a tradução fiel para o português do Brasil.
3. Destaque cerca de ${glosas} palavras ou expressões no texto com {palavra|tradução no contexto} — primeiro as que eu pedi, depois as mais úteis para o nível. Não destaque a mesma palavra mais de uma vez no mesmo parágrafo.
4. Marque os trechos que exemplificam os tópicos gramaticais pedidos com ((trecho exato do texto|explicação curta em português do ponto gramatical)).
5. Depois do texto, crie "== VOCAB | Glossário" com as palavras destacadas: "palavra no idioma | tradução | - | classe (ex.: subst. m., verbo, adj.) | frase do texto = tradução". Coloque o artigo nos substantivos (le/la, el/la, der/die/das…).
${f.notas !== false ? '6. Crie "== GRAMATICA | Notas de leitura" explicando brevemente cada tópico gramatical destacado, com "> exemplo do texto = tradução".\n' : ''}${f.compreensao !== false ? '7. Crie "== EXERCICIOS | Compreensão" com 5–8 questões sobre o texto ([escolha] com "* certa" e "- erradas", [vf] com "= verdadeiro" ou "= falso", [escrever] com "= resposta").\n' : ''}
FONTE E DIREITOS AUTORAIS:
- Preencha @autor, @obra e @fonte (obra, capítulo/página e o link, separados por |). A fonte é obrigatória.
- Se o material for protegido por direitos autorais e você não puder reproduzi-lo por inteiro, avise numa linha "// AVISO: …" no topo do código e formate só um trecho curto, ou faça um resumo original no idioma, deixando isso claro na @descricao.

FORMATO (copie esta estrutura):
${LIB_TEMPLATE}

REGRAS GERAIS: metadados no topo, um por linha (@tipo: biblioteca é obrigatório). Cada bloco começa com "== TIPO | título". Linha em branco separa parágrafos. **negrito** e *itálico* são permitidos. Não use { } nem (( )) para outra coisa.`;
}
export const LIB_PROMPT = buildLibraryPrompt();

// ---------------------------------------------------------------
//  Curso inteiro a partir de uma ementa, em lotes, num .zip
// ---------------------------------------------------------------
export const LEVEL_TEMPLATE = `@tipo: nivel
@idioma: fr
@nivel: A0
@titulo: Nome do nível (ex.: Primeiros passos)
@descricao: Uma frase sobre o nível.

== OBJETIVOS
- O que a aluna consegue fazer ao fim do nível (3–6 itens)

== MARCO
O marco de conclusão do nível, em uma ou duas frases.

== COMPLEMENTOS
- Conteúdo complementar 1 (ex.: alfabeto e nomes das letras)
- Conteúdo complementar 2`;

/** Prompt para a IA gerar várias aulas a partir de uma ementa, em lotes, entregues em .zip. */
export function buildCoursePrompt(f = {}) {
  const v = (x, ph) => (x && String(x).trim()) || ph;
  const lote = Math.max(1, parseInt(f.lote, 10) || 3);
  const lang = f.idioma ? f.idioma + (f.idiomaNome ? ` (${f.idiomaNome}) — use @idioma: ${f.idioma} em todos os arquivos` : '') : '[código: fr / es / it / de / en / ja…]';
  return `Você vai montar um CURSO para o meu app de idiomas a partir da ementa abaixo. Cada aula vira um arquivo .txt no formato do app, e os arquivos são entregues em .zip, em LOTES, para manter a qualidade.

IDIOMA: ${lang}
DURAÇÃO DE CADA AULA: ${v(f.tempo, '20')} minutos
AULAS POR LOTE: ${lote}
${f.extra && f.extra.trim() ? `OUTRAS INSTRUÇÕES: ${f.extra.trim()}\n` : ''}
EMENTA:
"""
${v(f.ementa, '[cole aqui a ementa: uma aula por linha, no formato CÓDIGO <tab> TÓPICO GRAMATICAL <tab> TEMA, e depois os conteúdos complementares e o marco de conclusão]')}
"""

COMO LER A EMENTA
- Cada linha "CÓDIGO — tópico gramatical — tema" (separados por tab, | ou ;) é UMA aula. O código vai no metadado @codigo e define o nível (A0.03 → @nivel: A0) e a ordem.
- O tópico gramatical da linha é o foco da GRAMATICA da aula e vai em @gramatica. O tema da linha guia o texto, o diálogo e o vocabulário e vai em @temas (2–4 palavras-chave).
- "Conteúdos complementares" (ex.: pronúncia) devem ser TODOS cobertos ao longo das aulas, em ordem lógica, 1 ou 2 por aula, sem tomar o lugar da gramática principal (use o bloco PRONUNCIA, NOTA ou CULTURA para eles).
- "Marco de conclusão" é o objetivo final do nível: as aulas devem convergir para ele${f.revisao !== false ? ', e a aula de revisão final treina exatamente esse marco' : ''}.

ETAPA 1 — PLANO${f.plano !== false ? ' (faça isto primeiro e ESPERE meu "ok" antes de escrever as aulas)' : ' (faça e já siga para os lotes)'}
Responda com uma tabela: código | título (curto, no idioma estudado) | gramática | tema | conteúdo complementar da aula | 8–15 palavras novas principais | gênero do texto/diálogo. Garanta progressão real: cada aula só usa a gramática já vista ou a da própria aula; o vocabulário das aulas anteriores é reciclado; nenhuma palavra nova se repete como "nova" em duas aulas. Diga como as aulas ficarão divididas em lotes de ${lote}.

ETAPA 2 — LOTES
- Para cada lote, crie um arquivo .zip para download chamado "curso-<idioma>-<nível>-lote<N>.zip", com UM arquivo .txt (UTF-8) por aula, nomeado "<código>-<slug-do-título>.txt" (ex.: A0.01-salutations.txt). Sem pastas dentro do zip.
${f.nivel !== false ? '- No PRIMEIRO lote, inclua também o arquivo do nível, "_nivel-<idioma>-<nível>.txt", no formato de nível abaixo (objetivos, marco de conclusão e conteúdos complementares tirados da ementa).\n' : ''}${f.revisao !== false ? '- No ÚLTIMO lote, inclua uma aula de revisão do nível, código "<nível>.R" (ex.: A0.R), que retoma toda a gramática e o vocabulário do nível e termina com uma ESCRITA que cumpre o marco de conclusão.\n' : ''}- Depois de cada lote, liste as aulas entregues e pare. Continue só quando eu disser "próximo".
- Se você NÃO conseguir criar arquivos, entregue cada aula em um bloco de código separado, cada um precedido da linha exata
  ===== ARQUIVO: <nome-do-arquivo>.txt =====
  (o app importa colando o texto inteiro assim).
- Se precisar corrigir uma aula depois, gere de novo o arquivo com o MESMO @codigo: o app substitui a antiga.

QUALIDADE — igual à de uma aula feita sozinha
- Não encurte, não resuma e não simplifique as aulas por estarem em lote. Cada aula deve ser completa por si só.
- Se o lote ficar grande demais para manter essa qualidade, entregue menos aulas naquele lote e avise.
- Confira cada arquivo antes de entregar: metadados completos, blocos com "== TIPO | título", exercícios com resposta, fonte em todo TEXTO, e nada fora do formato.

METADADOS DE CADA AULA (no topo do arquivo, um por linha)
@titulo: (curto, no idioma estudado)
@codigo: (o código da ementa, ex.: A0.01)
@idioma: ${f.idioma || '<código>'}
@nivel: (do código, ex.: A0)
@unidade: (opcional — só se a ementa agrupar aulas; senão omita)
@temas: (2–4 palavras-chave do tema da linha, separadas por vírgula)
@gramatica: (o tópico gramatical da linha, resumido — a vírgula separa tópicos diferentes, então não liste exemplos aqui; ex.: "pronomes pessoais sujeitos")
@tempo: ${v(f.tempo, '20')}
@descricao: (uma frase sobre o objetivo da aula)

FORMATO DO ARQUIVO DE NÍVEL
${LEVEL_TEMPLATE}

${PROMPT_RULES}`;
}
export const COURSE_PROMPT = buildCoursePrompt();

// ---------------------------------------------------------------
//  Baterias de exercícios
// ---------------------------------------------------------------
export const EX_KINDS = {
  interpretacao: { nome: 'Interpretação de texto', regra: 'Um ou dois textos curtos e originais no nível pedido ("== TEXTO | título", parágrafos com "~ tradução" logo abaixo e "@fonte: Texto original" no fim), cada um seguido de um bloco "== EXERCICIOS | Interpretação" com 4–6 perguntas [escolha] (e [vf], se fizer sentido) sobre o texto.' },
  conjugar: { nome: 'Conjugar o verbo (tempo verbal)', regra: '[conjugar] frase com a forma verbal certa entre [[ ]] e, logo depois, o infinitivo e o tempo entre parênteses. Ex.: "Hier, nous [[avons mangé]] (manger, passé composé) au restaurant." Formas alternativas aceitas com |.' },
  pronome: { nome: 'Completar com o pronome', regra: '[pronome] frase com o pronome certo entre [[ ]]; aceite variações com |. Ex.: "Tu connais Marie ? Oui, je [[la]] connais." Se ajudar, diga entre parênteses a que ele se refere.' },
  completar: { nome: 'Completar lacunas', regra: '[completar] frase com uma ou mais lacunas [[resposta|alternativa]].' },
  escolha: { nome: 'Múltipla escolha', regra: '[escolha] pergunta ou frase com ___, depois "* certa" e 2–3 "- erradas" (distratores plausíveis, de erros típicos de brasileiros).' },
  traduzir: { nome: 'Traduzir', regra: '[traduzir] frase em português e "= tradução | outras traduções corretas".' },
  transformar: { nome: 'Transformar a frase', regra: '[transformar] instrução + frase (ex.: "Passe para a negativa: Je mange du pain.") e "= resposta | alternativas".' },
  corrigir: { nome: 'Corrigir o erro', regra: '[corrigir] frase com UM erro do foco pedido e "= frase corrigida | alternativas"; a explicação ("> …") diz qual era o erro.' },
  ordenar: { nome: 'Ordenar a frase', regra: '[ordenar] partes da frase NA ORDEM CERTA separadas por " / " e "~ tradução".' },
  associar: { nome: 'Associar pares', regra: '[associar] instrução e 4–6 linhas "a = b".' },
  ditado: { nome: 'Ditado', regra: '[ditado] frase no idioma (o app lê e a aluna escreve).' },
  vf: { nome: 'Verdadeiro ou falso', regra: '[vf] afirmação e "= verdadeiro" ou "= falso".' },
};

/** Prompt para a IA gerar uma bateria de exercícios. */
export function buildExercisePrompt(f = {}) {
  const tipos = (f.tipos?.length ? f.tipos : ['conjugar', 'escolha']).filter((t) => EX_KINDS[t]);
  const lang = f.idioma ? f.idioma + (f.idiomaNome ? ` (${f.idiomaNome}) — use @idioma: ${f.idioma}` : '') : '[código do idioma]';
  const topicos = (f.topicos || []).filter(Boolean);
  const foco = f.escopo === 'geral'
    ? 'GERAL — revisão de gramática e vocabulário de vários níveis, das questões mais fáceis para as mais difíceis.'
    : f.escopo === 'nivel'
      ? `REVISÃO GERAL DO NÍVEL ${f.nivel || '[nível]'} — os principais pontos de gramática e vocabulário típicos desse nível, bem distribuídos.`
      : `TÓPICO(S) GRAMATICAL(IS): ${topicos.length ? topicos.join('; ') : '[escreva o tópico]'} — no nível ${f.nivel || '[nível]'}.`;
  const nivelMeta = f.escopo === 'geral' ? 'extra' : f.nivel || '<nível>';
  const gramMeta = f.escopo === 'topico' && topicos.length ? topicos.join(', ') : f.escopo === 'nivel' ? `revisão ${f.nivel || ''}`.trim() : 'revisão geral';
  return `Crie uma BATERIA DE EXERCÍCIOS para o meu app de idiomas, no formato de texto abaixo. Responda APENAS com o código, dentro de um único bloco de código, sem comentários antes ou depois.

IDIOMA: ${lang}
FOCO: ${foco}
TIPOS DE EXERCÍCIO: ${tipos.map((t) => EX_KINDS[t].nome).join(', ')}
QUANTIDADE: cerca de ${f.quantidade || 20} questões no total, bem distribuídas entre os tipos${tipos.includes('interpretacao') ? ' (as perguntas de interpretação contam)' : ''}.
${f.detalhes && f.detalhes.trim() ? `DETALHES: ${f.detalhes.trim()}\n` : ''}
QUALIDADE
- Toda questão treina o foco pedido, com frases naturais, corretas e adequadas ao nível, em contextos variados do dia a dia.
- Do mais fácil ao mais difícil. Não repita frases nem estruturas.
- TODA questão tem uma explicação curta em português na linha "> …" (por que a resposta é essa; nos erros, a regra).
- Nas respostas abertas, aceite todas as formas corretas com | (contrações, ordem alternativa). Os acentos fazem parte da resposta.
- Distratores plausíveis, baseados em erros comuns de falantes de português.
- Confira cada resposta antes de entregar.

FORMATO
@tipo: exercicios
@titulo: (título curto em português, ex.: "Passé composé — conjugação e pronomes")
@idioma: ${f.idioma || '<código>'}
@nivel: ${nivelMeta}
@gramatica: ${gramMeta}
@temas: (opcional, 1–3 temas dos contextos usados)
@tempo: (minutos estimados)
@descricao: (uma frase sobre o que a bateria treina)

Depois, um bloco "== EXERCICIOS | <nome do tipo>" para cada tipo pedido (ex.: "== EXERCICIOS | Conjugação"), com as questões uma após a outra. Cada questão começa com [tipo] na linha.

SINTAXE DE CADA TIPO PEDIDO
${tipos.map((t) => `- ${EX_KINDS[t].nome}: ${EX_KINDS[t].regra}`).join('\n')}
- Em qualquer questão (opcional): "~ contexto ou tradução" e "? dica". A explicação "> …" é obrigatória.

EXEMPLO DE ESTRUTURA
@tipo: exercicios
@titulo: Exemplo
@idioma: fr
@nivel: A2
@gramatica: passé composé

== EXERCICIOS | Conjugação
[conjugar] Hier soir, je [[suis allée|suis allé]] (aller, passé composé) au cinéma.
> Aller forma o passé composé com être, e o particípio concorda com o sujeito.

== EXERCICIOS | Múltipla escolha
[escolha] Nous ___ trop mangé hier.
* avons
- sommes
- avez
> Manger usa o auxiliar avoir: nous avons mangé.`;
}
