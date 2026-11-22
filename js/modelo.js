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
  ['@tipo', 'Só para textos da Biblioteca: "@tipo: biblioteca". Sem isso, é uma lição da Trilha.'],
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
    titulo: 'EXERCICIOS — prática (9 tipos)',
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
> Por quê.`,
    explica: [
      'Cada exercício começa com [tipo]. * = alternativa certa, - = errada, = = resposta aceita (várias com |), > = explicação, ~ = contexto, ? = dica.',
      '[completar]: lacunas com [[resposta|alternativa]] dentro da frase, ou ___ com "= resp1 ; resp2" (uma por lacuna, separadas por ;), ou ___ com alternativas * e -.',
      '[ordenar]: escreva as partes NA ORDEM CERTA separadas por / — o app embaralha.',
      '[vf]: = verdadeiro ou = falso.',
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
