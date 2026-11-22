// =============================================================
//  CONFIGURAÇÃO — o único arquivo que você precisa editar.
//  Passo a passo completo no README.md.
// =============================================================
export const CONFIG = {
  // Nome que aparece no topo do app
  nome: 'Atelier',
  subtitulo: 'de langues',

  // 1) Cole aqui o objeto firebaseConfig do seu projeto Firebase
  //    (Console do Firebase › Configurações do projeto › Seus apps › Web).
  //    Enquanto ficar null, o app funciona só neste aparelho (sem sincronizar).
  firebase: null,
  // Exemplo de como fica depois de colar:
  // firebase: {
  //   apiKey: "AIza...",
  //   authDomain: "meu-atelier.firebaseapp.com",
  //   projectId: "meu-atelier",
  //   storageBucket: "meu-atelier.appspot.com",
  //   messagingSenderId: "1234567890",
  //   appId: "1:1234567890:web:abc123"
  // },

  // 2) E-mails que podem criar/editar lições na nuvem (o seu).
  //    Use o mesmo e-mail no arquivo firestore.rules.
  admins: ['seu-email@gmail.com'],
};
