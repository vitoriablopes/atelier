# Atelier de langues

Um "Duolingo" mais calmo e adulto: leitura com glossário, escuta lida pelo próprio navegador (3 velocidades, transcrição e tradução), gramática explícita, exercícios variados, cartões com revisão espaçada, dicionário, caderno de erros e um Estúdio para criar lições colando um código de texto.

Funciona no celular e no computador, pode ser **instalado como app** pelo navegador e funciona offline. Com o Firebase configurado, o progresso sincroniza entre aparelhos.

---

## 1. Publicar no GitHub Pages (≈ 5 min)

1. No GitHub, crie um repositório **público** (ex.: `atelier`).
2. Clique em **Add file › Upload files** e arraste **todo o conteúdo desta pasta** (o `index.html` tem que ficar na raiz do repositório, junto com as pastas `css`, `js`, `fonts`, `icons`, `licoes`, `imagens`). Clique em **Commit changes**.
3. Vá em **Settings › Pages**. Em *Source* escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
4. Em 1–2 minutos o site fica em `https://SEU-USUARIO.github.io/atelier/`.

Pronto: o app já funciona, salvando o progresso **no aparelho**. Para sincronizar entre celular e computador, faça a parte 2.

## 2. Ligar a sincronização com Firebase (≈ 10 min, uma vez só)

O Firebase é gratuito para esse uso (plano Spark, sem cartão).

1. Entre em <https://console.firebase.google.com> › **Adicionar projeto** (pode desligar o Google Analytics).
2. **Authentication** › *Vamos começar* › aba **Método de login**:
   - ative **Google** (escolha seu e-mail de suporte) e
   - ative **E-mail/senha** (opcional, como alternativa).
3. Ainda em Authentication › **Configurações › Domínios autorizados** › **Adicionar domínio**: `SEU-USUARIO.github.io`.
4. **Firestore Database** › *Criar banco de dados* › local `southamerica-east1 (São Paulo)` › **modo de produção**.
   Depois, na aba **Regras**, apague tudo, cole o conteúdo do arquivo `firestore.rules` **trocando `SEU-EMAIL@gmail.com` pelo seu e-mail** e clique em **Publicar**.
5. Clique na engrenagem › **Configurações do projeto** › em *Seus apps* clique no ícone **</>** (Web), dê um apelido e registre (não precisa marcar Hosting). Copie o objeto `firebaseConfig`.
6. No GitHub, abra `js/config.js` › lápis (editar) e:
   - cole o objeto no lugar de `firebase: null` (fica `firebase: { apiKey: "...", ... },`);
   - em `admins`, coloque o seu e-mail.
   Clique em **Commit changes**.
7. Abra o site, vá em **Ajustes › Entrar com Google**. Faça o mesmo no celular. Pronto — tudo sincroniza.

> A `apiKey` do Firebase não é secreta: quem protege os dados são as regras do passo 4.

## 3. Instalar como app no celular

- **Android (Chrome):** abra o site › menu **⋮** › **Instalar app** (ou pelo botão em *Ajustes › Instalar app*).
- **iPhone (Safari):** botão **Compartilhar** › **Adicionar à Tela de Início**.

## 4. Adicionar lições

O formato completo está em **`MODELO-DE-LICAO.md`** (e dentro do app, em **Estúdio › Modelo do código**). Há três jeitos:

1. **Pelo app (o mais fácil):** *Estúdio › Nova lição* › título + código › **Salvar**. Logada como administradora, a lição vai para a nuvem e aparece em todos os aparelhos. A pré-visualização mostra avisos com o número da linha.
2. **Por arquivo no GitHub:** crie `licoes/minha-licao.txt` e acrescente o nome do arquivo em `licoes/indice.json`:
   ```json
   ["01-au-cafe.txt", "02-minha-licao.txt"]
   ```
3. **Com IA:** *Estúdio › Prompt para IA* — escolha idioma, nível, temas e tópicos gramaticais e copie o prompt pronto para o Claude/ChatGPT.
4. **Curso inteiro em lotes:** *Estúdio › Prompt para IA › Curso inteiro em lotes (.zip)* — cole a ementa (uma aula por linha: código, gramática, tema), copie o prompt e a IA entrega as aulas em arquivos `.zip`, por lotes.
5. **Importando:** *Estúdio › Lições › Importar arquivos* aceita vários `.zip`, `.txt` e `.json` de uma vez (ou arraste para a página), e você escolhe quais importar. *Colar lições* aceita várias aulas separadas por `===== ARQUIVO: nome.txt =====`. Uma aula com o mesmo `@codigo` substitui a antiga e mantém o progresso.

### Editar depois
- Qualquer aula pode ser editada (Estúdio › Lições › Editar, ou o botão ✎ dentro da aula). Aulas que vieram com o site viram uma "versão editada", e *Restaurar original* desfaz.
- **Trilha › Editar trilha**: mude nível e unidade de cada aula, reordene (↑ ↓ ⤒ ⤓), renomeie unidades e edite nome, objetivos, marco de conclusão e conteúdos complementares de cada nível.

### Exercícios
Baterias avulsas de exercícios (interpretação de texto, conjugação, pronomes, transformar, corrigir…) ficam na aba **Exercícios**. *Gerar bateria com IA* monta o prompt: você escolhe os tipos, o foco (tópicos gramaticais das suas aulas, um nível ou geral), a quantidade e detalhes. Cole a resposta em *Colar bateria*.

### Níveis e ordem
Cada lição tem `@nivel:` (A0, A1, A2, B1, B2, C1, C2 ou `extra`). A Trilha é separada por nível, e lições sem nível vão para **Extras**. Uma lição nova entra no fim do seu nível; para reordenar, use **Trilha › Organizar ordem** ou as setas ↑ ↓ em *Estúdio › Lições*.

### Passar lições para outras pessoas
*Estúdio › Lições*: marque as lições (ou "Selecionar todas" / "nível inteiro" e desmarque as que não quiser) › **Exportar selecionadas**. Sai um arquivo `.json` que a outra pessoa importa em *Importar lições* no app dela.

### Biblioteca
Textos para ler (contos, notícias, poemas…) ficam na aba **Biblioteca**: são lições com `@tipo: biblioteca` no topo. Para montar um a partir de um link ou PDF, use *Estúdio › Prompt para IA › Formatar texto para a Biblioteca*, mande o prompt para a IA **junto com o material** e cole a resposta em *Nova lição* (ou importe o .txt). Há um exemplo incluído: *La Cigale et la Fourmi* (La Fontaine, domínio público).

### Revisão, provas e nivelamento
- **Revisão misturada** (Hoje): exercícios das lições já estudadas, priorizando os que você errou. Cada bloco de exercícios de uma lição também traz 1–2 exercícios antigos.
- **Teste de nivelamento** (Trilha): sobe de nível enquanto você acerta 60% ou mais e sugere por onde começar.
- **Prova do nível** (Trilha, em cada nível): até 15 questões, aprovação com 80%.
- **Objetivos** de cada nível aparecem embaixo do título do nível.

### Pronúncia, frases e gênero
- 🎙 em pronúncia, expressões, escutas, textos e dicionário: grave sua voz, compare com o modelo e (no Chrome/Edge) use **Falar para conferir**.
- ＋ ao lado de parágrafos e falas salva uma frase. Elas vão para *Cartões › Frases* (com uma palavra escondida para completar), junto com as frases de exemplo do vocabulário.
- Substantivos ganham cor por gênero (masculino, feminino, neutro), pelo artigo ou pela classe (`subst. m.`, `subst. f.`). Dá para desligar em *Ajustes*.

### Imagens
- Link direto de imagem: `https://…/foto.jpg`
- Emoji: `🥐`
- Arquivo seu: suba para a pasta `imagens/` do repositório e use `img:nome-do-arquivo.jpg`

### Outros idiomas
No seletor de idioma (topo da barra lateral, ou do celular) há **Adicionar idioma**. As lições de cada idioma usam `@idioma: es` (ou `it`, `de`, `en`, `ja`…). Cada idioma tem trilha, cartões e dicionário próprios, e o app escolhe sozinho a melhor voz instalada para ele (dá para trocar em *Ajustes › Voz*).

## 5. Atualizar o site depois

Para colocar uma versão nova, suba os arquivos novos por cima dos antigos, **menos o `js/config.js`** (ele tem a sua configuração do Firebase). Depois recarregue o app duas vezes.

## 6. Estrutura

```
index.html            página do app
manifest.webmanifest  instalação como app
sw.js                 funcionamento offline
firestore.rules       regras do banco (copiar para o Firebase)
css/                  estilos e fontes
fonts/                EB Garamond e Cormorant Garamond (sem depender do Google Fonts)
js/config.js          ← o único arquivo de configuração
js/parser.js          leitor do formato de lição
js/…                  resto do app
licoes/               lições em arquivo + indice.json
imagens/              suas imagens (img:nome.jpg)
```
