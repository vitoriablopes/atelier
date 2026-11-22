# Modelo do código de lição

Uma lição é **texto puro**. O app lê esse texto e monta sozinho a leitura com palavras clicáveis, a escuta com 3 velocidades, a gramática, os cartões, os exercícios etc.

**Regras gerais**

- O começo tem **metadados** (linhas que começam com `@`).
- Cada bloco começa com uma linha `== TIPO | título` (o título é opcional) e vai até o próximo `==`.
- **Só aparecem na lição os blocos que você colocar**, na ordem em que você colocar. Pode repetir qualquer tipo quantas vezes quiser (ex.: dois TEXTOS, três EXERCICIOS).
- O tipo pode ser escrito com ou sem acento, maiúsculo ou minúsculo (`GRAMATICA`, `Gramática`).
- Linhas que começam com `//` são comentários (ignoradas).
- Em qualquer bloco: `**negrito**`, `*itálico*`, `{palavra|significado}` (palavra clicável) e `((trecho|explicação))` (destaque de gramática, em amarelo).
- Em qualquer bloco: `@fonte: Nome da obra, Autor | https://link` mostra a fonte em letra pequena embaixo do bloco. **Em TEXTO a fonte é obrigatória** (para textos seus: `@fonte: Texto original`).

## 1. Metadados

```
@titulo: Título da lição
@idioma: fr
@nivel: A1
@unidade: 1 · Nome da unidade
@temas: tema1, tema2
@gramatica: tópico gramatical 1, tópico gramatical 2
@tempo: 15
@descricao: Uma frase dizendo o que a aluna vai aprender.
```

| campo | para que serve |
|---|---|
| `@titulo` | Título. Se você preencher o campo "Título" no Estúdio, ele tem prioridade. |
| `@idioma` | fr, es, it, de, en, ja, ko, zh, ru, nl… Define o curso (seletor de idioma) e a voz da leitura. |
| `@nivel` | A0, A1, A2, B1, B2, C1 ou C2. A trilha é separada por nível. Use "extra" (ou deixe sem) para lições extras. |
| `@unidade` | Opcional. Agrupa lições dentro do nível. |
| `@temas` | Temas da lição (comida, viagem…), separados por vírgula. Filtros na Trilha, Cartões e Dicionário. |
| `@gramatica` | Tópicos gramaticais (passé composé, artigos…), separados por vírgula. Filtro na Trilha. |
| `@tempo` | Duração estimada, em minutos. |
| `@descricao` | Uma frase sobre o objetivo da lição. |
| `@tipo` | Só para textos da Biblioteca: "@tipo: biblioteca". Sem isso, é uma lição da Trilha. |
| `@autor / @obra` | Biblioteca: autor(a) e obra de onde o texto foi tirado. |
| `@fonte` | Fonte geral (obra, página, link). Também pode ir dentro de cada bloco TEXTO. |

Níveis: **A0** Primeiros passos · **A1** Iniciante · **A2** Básico · **B1** Intermediário · **B2** Intermediário avançado · **C1** Avançado · **C2** Proficiente · **extra** (ou sem `@nivel`) vai para *Extras*.

Na Trilha, as lições ficam separadas por nível. Uma lição nova (criada ou importada) entra **no fim** do seu nível; depois você pode reordenar com ↑ ↓ (Trilha › Organizar ordem, ou Estúdio › Lições).

## 2. Blocos

### 2.1 TEXTO — leitura com palavras destacadas

```
== TEXTO | Título do texto
Primeiro parágrafo com uma {palavra|significado} destacada e outra {palavra}.
~ Tradução do primeiro parágrafo (opcional).

Segundo parágrafo. Linha em branco separa parágrafos.
~ Tradução do segundo parágrafo.
@fonte: Nome da obra, Autor (ano) | https://link-da-fonte
```

- {palavra|significado} vira palavra clicável que mostra o significado e lê em voz alta.
- {palavra} sem significado busca a palavra no dicionário das lições.
- Linha começando com ~ é a tradução do parágrafo (botão "Tradução").
- @fonte: é obrigatória em textos — nome da obra e/ou link, separados por |. Para textos seus: "@fonte: Texto original".
- ((trecho|explicação)) marca um trecho de gramática: aparece sublinhado em amarelo e mostra a explicação ao tocar.
- **negrito** e *itálico* funcionam em todos os blocos.

### 2.2 AUDIO — escuta (o próprio app lê o texto)

```
== AUDIO | Título da escuta
Pessoa A: Frase que será lida em voz alta. = Tradução da frase.
Pessoa B: Resposta da outra pessoa. = Tradução.
Frase sem personagem também funciona. = Tradução.
@fonte: Diálogo original
```

- Cada linha é uma fala. "Nome:" no começo é opcional (cada personagem ganha um tom de voz diferente).
- " = " separa a fala da tradução (opcional).
- No app: 3 velocidades (lenta, normal, rápida), mostrar/ocultar transcrição e tradução, e ouvir fala por fala.

### 2.3 GRAMATICA — explicação

```
== GRAMATICA | Nome do ponto gramatical
Parágrafo de explicação com **negrito** e *itálico*.
> Frase de exemplo no idioma. = Tradução do exemplo.

### Subtítulo
| coluna 1 | coluna 2 | coluna 3 |
|---|---|---|
| a | b | c |

- item de lista
- outro item

! Dica: aparece num quadro amarelo.
!! Atenção: aparece num quadro rosa.
```

- > exemplo = tradução → linha de exemplo com botão de ouvir.
- Tabelas com | ; a linha |---| logo depois da primeira transforma ela em cabeçalho.
- ### subtítulo · - lista · 1. lista numerada · ! dica · !! atenção.

### 2.4 CONJUGACAO — tabela de verbo com treino

```
== CONJUGACAO | vouloir — presente
@verbo: vouloir = querer
@tempo: présent
je | veux = eu quero
tu | veux = você quer
il / elle | veut = ele / ela quer
nous | voulons = nós queremos
vous | voulez = vocês querem
ils / elles | veulent = eles / elas querem
```

- "pronome | forma = tradução". Tem botão "Treinar de memória" que esconde as formas.

### 2.5 VOCAB — cartões de vocabulário (vão para Cartões e Dicionário)

```
== VOCAB | Nome do grupo de palavras
// campos: palavra | tradução | imagem | classe | exemplo = tradução do exemplo | nota
le café | o café | ☕ | subst. m. | Je bois un café. = Eu bebo um café.
la gare | a estação | https://link-da-imagem.jpg | subst. f.
chaud | quente | img:chaud.jpg | adj.
merci | obrigado(a)
```

- Campos separados por |. Só os dois primeiros são obrigatórios; use - para pular um campo.
- Imagem: um link https:// de imagem, um emoji, ou img:nome.jpg (arquivo na pasta imagens/ do site).
- O título do bloco vira um "tema" para filtrar nos Cartões e no Dicionário.

### 2.6 EXPRESSOES — frases prontas (também vão para Cartões e Dicionário)

```
== EXPRESSOES | Título
expressão no idioma = tradução | nota opcional
s'il vous plaît = por favor | formal
```

- Uma expressão por linha: "expressão = tradução", e "| nota" se quiser.

### 2.7 PRONUNCIA — sons e repetição

```
== PRONUNCIA | O som [y]
tu | [ty] | Diga "i" com os lábios em bico.
la rue | [la ʁy] | Dica opcional.
```

- "palavra | transcrição fonética | dica". Botões: ouvir, ouvir devagar e repetir 3×.

### 2.8 CULTURA — nota cultural

```
== CULTURA | Título
Texto livre, com a mesma formatação da GRAMATICA.
- listas, > exemplos, tabelas, ! dicas…
```

- Igual à GRAMATICA, com outra cor.

### 2.9 NOTA — observação curta

```
== NOTA | Título
Qualquer observação, com a mesma formatação da GRAMATICA.
```

- Igual à GRAMATICA, com outra cor.

### 2.10 IMAGEM — imagem com legenda

```
== IMAGEM | Título
https://link-da-imagem.jpg
Legenda com {palavras|destacadas} se quiser.
@fonte: Autor da foto | https://link
```

- Uma ou mais linhas de imagem (link https://, img:nome.jpg ou emoji); o resto vira legenda.

### 2.11 VIDEO — vídeo do YouTube

```
== VIDEO | Título
https://www.youtube.com/watch?v=XXXXXXXXXXX
Legenda opcional.
@fonte: Nome do canal | https://link
```

- Aceita links youtube.com/watch, youtu.be e shorts (com ?t=segundos para começar num ponto).

### 2.12 EXERCICIOS — prática (9 tipos)

```
== EXERCICIOS | Prática
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
```

- Cada exercício começa com [tipo]. * = alternativa certa, - = errada, = = resposta aceita (várias com |), > = explicação, ~ = contexto, ? = dica.
- [completar]: lacunas com [[resposta|alternativa]] dentro da frase, ou ___ com "= resp1 ; resp2" (uma por lacuna, separadas por ;), ou ___ com alternativas * e -.
- [ordenar]: escreva as partes NA ORDEM CERTA separadas por / — o app embaralha.
- [vf]: = verdadeiro ou = falso.
- Na correção, o app perdoa maiúsculas, pontuação e apóstrofo; acento faltando ou 1 letra trocada conta como "quase".
- Os que a aluna erra voltam no fim do bloco e ficam no Caderno de erros.

### 2.13 ESCRITA — produção livre com autoavaliação

```
== ESCRITA | Sua vez
Enunciado: o que a aluna deve escrever.
? Item da lista de autoavaliação
? Outro item
= Modelo de resposta no idioma.
~ Tradução do modelo.
```

- O texto escrito fica salvo no Caderno. ? = item de checklist, = modelo (revelado num botão), ~ tradução do modelo.

### 2.14 RESUMO — pontos-chave no fim

```
== RESUMO
- **ponto 1** = explicação curta
- ponto 2
```

- Mesma formatação da GRAMATICA; os itens de lista aparecem com ✓.

### 2.15 LINKS — para ir além

```
== LINKS | Para ir além
Nome do recurso | https://link
Outro recurso | https://outro-link
```

- "nome | link" por linha.

## 3. Como o app corrige as respostas

- Ignora maiúsculas/minúsculas, pontuação, aspas e espaços extras.
- Acento faltando, apóstrofo trocado ou uma letra errada (em palavras de 5+ letras) contam como **acerto com aviso** ("Quase!").
- Para aceitar várias respostas, separe com `|`: `= l'addition | addition`.
- Exercícios errados voltam no fim do bloco e ficam guardados no **Caderno de erros**.
- As palavras dos blocos **VOCAB** e **EXPRESSOES** entram nos **Cartões** (revisão espaçada) e no **Dicionário** quando a aluna passa por esses blocos.

## 4. Modelo em branco (todos os blocos)

```
// MODELO DE LIÇÃO — copie, troque o conteúdo e apague os blocos que não usar.
// Linhas que começam com // são comentários e são ignoradas.
// Você pode repetir qualquer bloco quantas vezes quiser, na ordem que quiser.
@titulo: Título da lição
@idioma: fr
@nivel: A1
@unidade: 1 · Nome da unidade
@temas: tema1, tema2
@gramatica: tópico gramatical 1, tópico gramatical 2
@tempo: 15
@descricao: Uma frase dizendo o que a aluna vai aprender.

== TEXTO | Título do texto
Primeiro parágrafo com uma {palavra|significado} destacada e outra {palavra}.
~ Tradução do primeiro parágrafo (opcional).

Segundo parágrafo. Linha em branco separa parágrafos.
~ Tradução do segundo parágrafo.
@fonte: Nome da obra, Autor (ano) | https://link-da-fonte

== AUDIO | Título da escuta
Pessoa A: Frase que será lida em voz alta. = Tradução da frase.
Pessoa B: Resposta da outra pessoa. = Tradução.
Frase sem personagem também funciona. = Tradução.
@fonte: Diálogo original

== GRAMATICA | Nome do ponto gramatical
Parágrafo de explicação com **negrito** e *itálico*.
> Frase de exemplo no idioma. = Tradução do exemplo.

### Subtítulo
| coluna 1 | coluna 2 | coluna 3 |
|---|---|---|
| a | b | c |

- item de lista
- outro item

! Dica: aparece num quadro amarelo.
!! Atenção: aparece num quadro rosa.

== CONJUGACAO | vouloir — presente
@verbo: vouloir = querer
@tempo: présent
je | veux = eu quero
tu | veux = você quer
il / elle | veut = ele / ela quer
nous | voulons = nós queremos
vous | voulez = vocês querem
ils / elles | veulent = eles / elas querem

== VOCAB | Nome do grupo de palavras
// campos: palavra | tradução | imagem | classe | exemplo = tradução do exemplo | nota
le café | o café | ☕ | subst. m. | Je bois un café. = Eu bebo um café.
la gare | a estação | https://link-da-imagem.jpg | subst. f.
chaud | quente | img:chaud.jpg | adj.
merci | obrigado(a)

== EXPRESSOES | Título
expressão no idioma = tradução | nota opcional
s'il vous plaît = por favor | formal

== PRONUNCIA | O som [y]
tu | [ty] | Diga "i" com os lábios em bico.
la rue | [la ʁy] | Dica opcional.

== CULTURA | Título
Texto livre, com a mesma formatação da GRAMATICA.
- listas, > exemplos, tabelas, ! dicas…

== NOTA | Título
Qualquer observação, com a mesma formatação da GRAMATICA.

== IMAGEM | Título
https://link-da-imagem.jpg
Legenda com {palavras|destacadas} se quiser.
@fonte: Autor da foto | https://link

== VIDEO | Título
https://www.youtube.com/watch?v=XXXXXXXXXXX
Legenda opcional.
@fonte: Nome do canal | https://link

== EXERCICIOS | Prática
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

== ESCRITA | Sua vez
Enunciado: o que a aluna deve escrever.
? Item da lista de autoavaliação
? Outro item
= Modelo de resposta no idioma.
~ Tradução do modelo.

== RESUMO
- **ponto 1** = explicação curta
- ponto 2

== LINKS | Para ir além
Nome do recurso | https://link
Outro recurso | https://outro-link
```

## 5. Exemplo completo (lição "Au café", já incluída no site)

```
// Lição de exemplo — mostra todos os tipos de bloco.
// Linhas que começam com // são comentários e são ignoradas.
@titulo: Au café
@idioma: fr
@nivel: A1
@unidade: 1 · Le quotidien
@temas: comida, café, cotidiano
@gramatica: verbo vouloir (presente), artigos indefinidos, pedir com educação (je voudrais)
@tempo: 20
@descricao: Pedir algo num café com educação e conhecer o verbo vouloir.

== TEXTO | Un matin à Paris
Ce matin, Claire entre dans un petit {café|café (o lugar)} près de la {gare|estação de trem}. Il fait froid et elle a {envie de|vontade de} quelque chose de chaud.
~ Esta manhã, Claire entra em um pequeno café perto da estação de trem. Está frio e ela tem vontade de algo quente.

Le {serveur|garçom} est très {gentil|gentil, simpático}. Claire {commande|pede} un {café crème|café com leite} et un {croissant}. Elle {paie|paga} trois euros cinquante.
~ O garçom é muito gentil. Claire pede um café com leite e um croissant. Ela paga três euros e cinquenta.
@fonte: Texto original, escrito para esta lição

== AUDIO | Au comptoir
Serveur: Bonjour madame, qu'est-ce que je vous sers ? = Bom dia, senhora, o que vou lhe servir?
Claire: Bonjour ! Je voudrais un café crème, s'il vous plaît. = Bom dia! Eu gostaria de um café com leite, por favor.
Serveur: Et avec ceci ? = E o que mais?
Claire: Un croissant, s'il vous plaît. C'est combien ? = Um croissant, por favor. Quanto é?
Serveur: Trois euros cinquante. = Três euros e cinquenta.
Claire: Voilà. Merci, bonne journée ! = Aqui está. Obrigada, bom dia!
@fonte: Diálogo original, escrito para esta lição

== GRAMATICA | Pedir com educação: je voudrais
Em francês, para pedir algo com educação usamos **je voudrais** (eu gostaria), e não *je veux* (eu quero), que soa direto demais.
> Je voudrais un thé, s'il vous plaît. = Eu gostaria de um chá, por favor.
> Je voudrais l'addition. = Eu gostaria da conta.

### Artigos indefinidos
| | masculino | feminino |
|---|---|---|
| singular | un café | une baguette |
| plural | des cafés | des baguettes |

! Dica: *s'il vous plaît* é a forma educada (vous); com amigos se diz *s'il te plaît*.
!! Atenção: em francês há espaço antes de ? ! : e ;

== CONJUGACAO | vouloir — presente
@verbo: vouloir = querer
@tempo: présent
je | veux = eu quero
tu | veux = você quer (informal)
il / elle | veut = ele / ela quer
nous | voulons = nós queremos
vous | voulez = vocês querem / o senhor quer
ils / elles | veulent = eles / elas querem

== VOCAB | Au café
le café | o café | ☕ | subst. m. | Je bois un café le matin. = Eu bebo um café de manhã.
le croissant | o croissant | 🥐 | subst. m. | Un croissant, s'il vous plaît. = Um croissant, por favor.
le thé | o chá | 🍵 | subst. m.
l'eau | a água | 💧 | subst. f. | Une carafe d'eau, s'il vous plaît. = Uma jarra de água, por favor. | Feminino: l'eau est froide.
le serveur | o garçom | - | subst. m. | - | Feminino: la serveuse.
l'addition | a conta | 🧾 | subst. f. | L'addition, s'il vous plaît ! = A conta, por favor!
chaud | quente | 🔥 | adj. | Le café est chaud. = O café está quente.

== EXPRESSOES | Para sobreviver no café
s'il vous plaît = por favor | formal ou para várias pessoas
et avec ceci ? = e o que mais? | o garçom pergunta se você quer algo mais
c'est combien ? = quanto é?
bonne journée = tenha um bom dia | ao se despedir, durante o dia

== PRONUNCIA | O som do "u" francês
tu | [ty] | Diga "i" com os lábios em bico, como para assobiar.
du café | [dy kafe] | O "u" não é o nosso "u".
bonjour | [bɔ̃ʒuʁ] | "ou" francês = nosso "u".

== CULTURA | O café francês
Na França, um *café* sozinho é um espresso pequeno. Se quiser leite, peça um **café crème** ou um **café au lait** (mais comum em casa).
- Beber no balcão (*au comptoir*) costuma ser mais barato do que na mesa.
- É educado sempre começar com *Bonjour* antes de pedir.

== EXERCICIOS | Prática
[escolha] Qual é a forma mais educada de pedir um café?
* Je voudrais un café, s'il vous plaît.
- Je veux un café.
- Donne-moi un café.
> "Je voudrais" (eu gostaria) é a forma educada de pedir.

[ouvir] Je voudrais un thé, s'il vous plaît.
* Eu gostaria de um chá, por favor.
- Eu gostaria de um café, por favor.
- Eu quero a conta, por favor.

[completar] Bonjour ! Je [[voudrais]] un croissant, s'il vous [[plaît|plait]].
~ Bom dia! Eu gostaria de um croissant, por favor.

[completar] Nous ___ deux cafés.
* voulons
- voulez
- veux
> Com "nous", vouloir fica "voulons".

[escrever] Como se diz "a conta" em francês?
= l'addition | addition
? Começa com "l'a…"

[traduzir] Quanto é?
= C'est combien ? | Combien ça coûte ?

[ordenar] Je / voudrais / un café / s'il vous plaît
~ Eu gostaria de um café, por favor.

[associar] Associe as palavras
le thé = o chá
l'eau = a água
le serveur = o garçom
chaud = quente

[ditado] Un café crème, s'il vous plaît.

[vf] Claire paie trois euros cinquante.
= verdadeiro
> Está no texto: "Elle paie trois euros cinquante."

== ESCRITA | Sua vez
Escreva 2 ou 3 frases pedindo algo num café em Paris.
? Começar com "Bonjour"
? Usar "je voudrais"
? Terminar com "s'il vous plaît" ou "merci"
= Bonjour ! Je voudrais un thé et un croissant, s'il vous plaît. Merci !
~ Bom dia! Eu gostaria de um chá e um croissant, por favor. Obrigada!

== RESUMO
- **Je voudrais** + coisa = pedir com educação.
- **S'il vous plaît** = por favor (formal).
- **C'est combien ?** = quanto é?
- Vouloir: je veux, tu veux, il veut, nous voulons, vous voulez, ils veulent.
```

## 6. Biblioteca (textos para ler)

Um texto da Biblioteca usa o mesmo formato, com `@tipo: biblioteca` no topo. Ele aparece na aba **Biblioteca** (não na Trilha), com três modos de leitura: **Texto** (só o original, palavras clicáveis), **Por parágrafo** (cada parágrafo seguido da tradução) e **Lado a lado**. Os blocos depois do texto (glossário, notas, compreensão) aparecem no fim. Ao marcar como lido, as palavras do glossário vão para os Cartões.

```
@tipo: biblioteca
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
= falso
```

### Prompt para a IA formatar um material (link ou PDF)

No app: **Estúdio › Prompt para IA › Formatar texto para a Biblioteca** (com campos para o link, o trecho, as palavras e os tópicos gramaticais em destaque). Versão para preencher à mão:

```
Vou te enviar um material (link ou PDF). Pegue o texto dele e formate para a BIBLIOTECA do meu app de idiomas, no formato abaixo. Responda APENAS com o código, dentro de um único bloco de código, sem comentários antes ou depois.

MATERIAL: [cole o link aqui ou anexe o PDF]
TRECHO: [o texto todo / capítulo 1 / páginas 3–5…]
IDIOMA DO TEXTO: [código: fr / es / it / de / en / ja…]
NÍVEL: [A0–C2 ou extra]
PALAVRAS QUE QUERO EM DESTAQUE: [liste aqui, ou "escolha você"]
TÓPICOS GRAMATICAIS QUE QUERO EM DESTAQUE: [ex.: subjuntivo, pronomes relativos, ou "escolha você"]

O QUE FAZER:
1. Copie o texto do material com fidelidade, mantendo a divisão original em parágrafos (não resuma nem simplifique). Textos longos: divida em vários blocos "== TEXTO | título da parte" (por capítulo ou seção).
2. Logo abaixo de CADA parágrafo, escreva "~ " + a tradução fiel para o português do Brasil.
3. Destaque cerca de 10–20 palavras ou expressões no texto com {palavra|tradução no contexto} — primeiro as que eu pedi, depois as mais úteis para o nível. Não destaque a mesma palavra mais de uma vez no mesmo parágrafo.
4. Marque os trechos que exemplificam os tópicos gramaticais pedidos com ((trecho exato do texto|explicação curta em português do ponto gramatical)).
5. Depois do texto, crie "== VOCAB | Glossário" com as palavras destacadas: "palavra no idioma | tradução | - | classe (ex.: subst. m., verbo, adj.) | frase do texto = tradução". Coloque o artigo nos substantivos (le/la, el/la, der/die/das…).
6. Crie "== GRAMATICA | Notas de leitura" explicando brevemente cada tópico gramatical destacado, com "> exemplo do texto = tradução".
7. Crie "== EXERCICIOS | Compreensão" com 5–8 questões sobre o texto ([escolha] com "* certa" e "- erradas", [vf] com "= verdadeiro" ou "= falso", [escrever] com "= resposta").

FONTE E DIREITOS AUTORAIS:
- Preencha @autor, @obra e @fonte (obra, capítulo/página e o link, separados por |). A fonte é obrigatória.
- Se o material for protegido por direitos autorais e você não puder reproduzi-lo por inteiro, avise numa linha "// AVISO: …" no topo do código e formate só um trecho curto, ou faça um resumo original no idioma, deixando isso claro na @descricao.

FORMATO (copie esta estrutura):
@tipo: biblioteca
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
= falso

REGRAS GERAIS: metadados no topo, um por linha (@tipo: biblioteca é obrigatório). Cada bloco começa com "== TIPO | título". Linha em branco separa parágrafos. **negrito** e *itálico* são permitidos. Não use { } nem (( )) para outra coisa.
```

## 7. Prompt para gerar lições com IA

No app: **Estúdio › Prompt para IA** — você preenche idioma, nível, temas e tópicos gramaticais e copia o prompt pronto. Versão com colchetes para preencher à mão:

```
Você vai escrever uma lição de idioma no formato de texto do meu app de estudos. Responda APENAS com o código da lição, dentro de um único bloco de código, sem comentários antes ou depois.

IDIOMA: [código: fr / es / it / de / en / ja…]
NÍVEL: [A0 / A1 / A2 / B1 / B2 / C1 / C2 / extra]
TEMA(S): [ex.: comida, restaurante]
TÓPICO(S) GRAMATICAL(IS): [ex.: passé composé com avoir]
UNIDADE: [opcional, ex.: 2 · Em viagem]
DURAÇÃO: [ex.: 20] minutos

MÉTODO (siga nesta ordem): 1) input compreensível — um TEXTO curto e/ou um AUDIO (diálogo) no nível pedido, com 6–12 palavras-chave destacadas como {palavra|significado}; 2) GRAMATICA explícita e curta sobre os tópicos gramaticais pedidos, com exemplos tirados do texto; 3) VOCAB com 8–15 palavras do texto (com exemplo e tradução); 4) EXERCICIOS variados (10–14), do reconhecimento para a produção: escolha/ouvir → completar/associar → ordenar/escrever/traduzir/ditado; 5) ESCRITA curta com modelo; 6) RESUMO. Use CONJUGACAO, EXPRESSOES, PRONUNCIA ou CULTURA quando fizer sentido. Explicações em português do Brasil; conteúdo no idioma estudado, adequado ao nível (A0 = primeiras palavras e frases prontas; C2 = textos autênticos e nuances).

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
  Opcionais em qualquer exercício: "> explicação", "~ contexto", "? dica".
```
