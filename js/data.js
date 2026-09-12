/**
 * ImprovisaLab — dados de teoria musical (Etapa 1)
 * Notas, escalas, qualidades de acorde, campo harmônico e recomendações.
 * Arquivo sem dependências, funciona no navegador (window.IL) e no Node
 * (module.exports), para poder ser testado com `node tests/theory.test.js`.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.data = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  // Semitons de cada letra "natural" a partir de C
  var LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  // Chaves consideradas "de sustenido" (usadas para decidir como grafar
  // acidentes quando o usuário digita uma nota sem contexto de tonalidade).
  var SHARP_TONICS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];

  /**
   * Escalas de 7 notas (modos), pentatônicas e escalas simétricas.
   * `steps`: quantos "passos de letra" (na sequência C D E F G A B) acima da
   *          tônica cada grau está.
   * `semitones`: quantos semitons acima da tônica cada grau está.
   * Os dois juntos permitem grafar a nota certa (ex.: F# em vez de Gb).
   */
  var SCALES = {
    jonio: {
      label: 'Jônio (Maior)',
      curta: 'Jônio',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 5, 7, 9, 11]
    },
    dorico: {
      label: 'Dórico',
      curta: 'Dórico',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 5, 7, 9, 10]
    },
    frigio: {
      label: 'Frígio',
      curta: 'Frígio',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 5, 7, 8, 10]
    },
    lidio: {
      label: 'Lídio',
      curta: 'Lídio',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 6, 7, 9, 11]
    },
    mixolidio: {
      label: 'Mixolídio',
      curta: 'Mixolídio',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 5, 7, 9, 10]
    },
    eolio: {
      label: 'Eólio (menor natural)',
      curta: 'Eólio',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 5, 7, 8, 10]
    },
    locrio: {
      label: 'Lócrio',
      curta: 'Lócrio',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 5, 6, 8, 10]
    },
    alterada: {
      label: 'Alterada (super-Lócrio)',
      curta: 'Alterada',
      // grafada como 1 b9 #9 3 #11 b13 b7 (as tensões do dominante alterado)
      steps: [0, 1, 1, 2, 3, 5, 6],
      semitones: [0, 1, 3, 4, 6, 8, 10]
    },
    pentatonica_maior: {
      label: 'Pentatônica maior',
      curta: 'Pent. maior',
      steps: [0, 1, 2, 4, 5],
      semitones: [0, 2, 4, 7, 9]
    },
    pentatonica_menor: {
      label: 'Pentatônica menor',
      curta: 'Pent. menor',
      steps: [0, 2, 3, 4, 6],
      semitones: [0, 3, 5, 7, 10]
    },
    diminuta: {
      label: 'Diminuta (tom-semitom)',
      curta: 'Diminuta',
      steps: [0, 1, 2, 3, 4, 5, 5, 6],
      semitones: [0, 2, 3, 5, 6, 8, 9, 11]
    },
    tons_inteiros: {
      label: 'Tons inteiros',
      curta: 'Tons inteiros',
      // grafada 1 9 3 #11 #5 b7 (as notas do dominante 7(#5)): G A B C# D# F
      steps: [0, 1, 2, 3, 4, 6],
      semitones: [0, 2, 4, 6, 8, 10]
    },

    // ---- Modos da escala menor melódica (Etapa "fraseados melhores") ----
    // Nomes seguem a nomenclatura usada nos métodos brasileiros de harmonia
    // (Chediak e similares): jônio b3, dórico b2, lídio aumentado, lídio b7,
    // mixolídio b13, lócrio 9 (= eólio b5) e superlócrio (a "alterada").
    menor_melodica: {
      label: 'Menor melódica (jônio b3)',
      curta: 'Menor melódica',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 5, 7, 9, 11]
    },
    dorico_b2: {
      label: 'Dórico b2',
      curta: 'Dórico b2',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 5, 7, 9, 10]
    },
    lidio_aumentado: {
      label: 'Lídio aumentado',
      curta: 'Lídio #5',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 6, 8, 9, 11]
    },
    lidio_b7: {
      label: 'Lídio b7 (lídio dominante)',
      curta: 'Lídio b7',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 6, 7, 9, 10]
    },
    mixolidio_b13: {
      label: 'Mixolídio b13',
      curta: 'Mixolídio b13',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 5, 7, 8, 10]
    },
    locrio_9: {
      label: 'Lócrio 9 (eólio b5)',
      curta: 'Lócrio 9',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 5, 6, 8, 10]
    },

    // ---- Menor harmônica e seu 5º modo ----
    menor_harmonica: {
      label: 'Menor harmônica',
      curta: 'Menor harm.',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 5, 7, 8, 11]
    },
    frigio_maior: {
      label: 'Mixolídio b9 b13 (frígio maior, 5º modo da menor harmônica)',
      curta: 'Mixo b9 b13',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 4, 5, 7, 8, 10]
    },

    // ---- Simétrica dominante (semitom-tom) ----
    dom_dim: {
      label: 'Dominante-diminuta (semitom-tom)',
      curta: 'Dom-dim',
      steps: [0, 1, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 4, 6, 7, 9, 10]
    },

    // ---- Escalas bebop: 8 notas, com uma nota de passagem cromática que faz
    // as notas do acorde caírem nos tempos fortes numa linha de colcheias ----
    bebop_dominante: {
      label: 'Bebop dominante (mixolídio + 7M de passagem)',
      curta: 'Bebop dom.',
      steps: [0, 1, 2, 3, 4, 5, 6, 6],
      semitones: [0, 2, 4, 5, 7, 9, 10, 11]
    },
    bebop_maior: {
      label: 'Bebop maior (jônio + #5 de passagem)',
      curta: 'Bebop maior',
      steps: [0, 1, 2, 3, 4, 4, 5, 6],
      semitones: [0, 2, 4, 5, 7, 8, 9, 11]
    },
    bebop_dorico: {
      label: 'Bebop menor (dórico + 7M de passagem)',
      curta: 'Bebop menor',
      steps: [0, 1, 2, 3, 4, 5, 6, 6],
      semitones: [0, 2, 3, 5, 7, 9, 10, 11]
    },

    // ---- Blues ----
    blues_menor: {
      label: 'Blues (pentatônica menor + b5)',
      curta: 'Blues',
      steps: [0, 2, 3, 4, 4, 6],
      semitones: [0, 3, 5, 6, 7, 10]
    },
    blues_maior: {
      label: 'Blues maior (pentatônica maior + b3)',
      curta: 'Blues maior',
      steps: [0, 1, 2, 2, 4, 5],
      semitones: [0, 2, 3, 4, 7, 9]
    },
    blues_9: {
      label: 'Blues completa (9 notas)',
      curta: 'Blues 9 notas',
      steps: [0, 1, 2, 2, 3, 4, 4, 5, 6],
      semitones: [0, 2, 3, 4, 5, 6, 7, 9, 10]
    },

    // ---- Demais modos da menor harmônica ----
    locrio_13: {
      label: 'Lócrio 13 (2º modo da menor harmônica)',
      curta: 'Lócrio 13',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 5, 6, 9, 10]
    },
    jonio_5aum: {
      label: 'Jônio #5 (3º modo da menor harmônica)',
      curta: 'Jônio #5',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 5, 8, 9, 11]
    },
    dorico_11aum: {
      label: 'Dórico #11 (romena, 4º modo da menor harmônica)',
      curta: 'Dórico #11',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 6, 7, 9, 10]
    },
    lidio_9aum: {
      label: 'Lídio #9 (6º modo da menor harmônica)',
      curta: 'Lídio #9',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 3, 4, 6, 7, 9, 11]
    },

    // ---- Outras escalas de 7 notas ----
    harmonica_maior: {
      label: 'Harmônica maior (maior com b6)',
      curta: 'Harm. maior',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 4, 5, 7, 8, 11]
    },
    hungara_menor: {
      label: 'Húngara menor (cigana menor)',
      curta: 'Húngara menor',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 2, 3, 6, 7, 8, 11]
    },
    dupla_harmonica: {
      label: 'Dupla harmônica (bizantina / árabe)',
      curta: 'Dupla harm.',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 4, 5, 7, 8, 11]
    },
    napolitana_menor: {
      label: 'Napolitana menor',
      curta: 'Napolitana m.',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 5, 7, 8, 11]
    },
    napolitana_maior: {
      label: 'Napolitana maior',
      curta: 'Napolitana M.',
      steps: [0, 1, 2, 3, 4, 5, 6],
      semitones: [0, 1, 3, 5, 7, 9, 11]
    },

    // ---- Bebop (menor melódica e menor harmônica) ----
    bebop_melodico: {
      label: 'Bebop menor melódica (+ #5 de passagem)',
      curta: 'Bebop mel.',
      steps: [0, 1, 2, 3, 4, 4, 5, 6],
      semitones: [0, 2, 3, 5, 7, 8, 9, 11]
    },
    bebop_harmonico: {
      label: 'Bebop menor harmônica (+ b7 de passagem)',
      curta: 'Bebop harm.',
      steps: [0, 1, 2, 3, 4, 5, 6, 6],
      semitones: [0, 2, 3, 5, 7, 8, 10, 11]
    },

    // ---- Simétricas e sintéticas ----
    aumentada: {
      label: 'Aumentada (simétrica de 6 notas)',
      curta: 'Aumentada',
      steps: [0, 2, 2, 4, 4, 6],
      semitones: [0, 3, 4, 7, 8, 11]
    },
    prometheus: {
      label: 'Prometheus (mística)',
      curta: 'Prometheus',
      steps: [0, 1, 2, 3, 5, 6],
      semitones: [0, 2, 4, 6, 9, 10]
    },
    cromatica: {
      label: 'Cromática (as 12 notas)',
      curta: 'Cromática',
      steps: [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6],
      semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    },

    // ---- Pentatônicas (ocidentais e japonesas) ----
    pentatonica_dominante: {
      label: 'Pentatônica dominante (mixolídia)',
      curta: 'Pent. dominante',
      steps: [0, 1, 2, 4, 6],
      semitones: [0, 2, 4, 7, 10]
    },
    hirajoshi: {
      label: 'Hirajoshi (japonesa)',
      curta: 'Hirajoshi',
      steps: [0, 1, 2, 4, 5],
      semitones: [0, 2, 3, 7, 8]
    },
    kumoi: {
      label: 'Kumoi (japonesa)',
      curta: 'Kumoi',
      steps: [0, 1, 2, 4, 5],
      semitones: [0, 2, 3, 7, 9]
    },
    in_sen: {
      label: 'In sen (japonesa)',
      curta: 'In sen',
      steps: [0, 1, 3, 4, 6],
      semitones: [0, 1, 5, 7, 10]
    },
    iwato: {
      label: 'Iwato (japonesa)',
      curta: 'Iwato',
      steps: [0, 1, 3, 4, 6],
      semitones: [0, 1, 5, 6, 10]
    }
  };

  /**
   * Nota característica de cada modo — a que o diferencia das escalas
   * "vizinhas" e que vale a pena destacar numa frase (ex.: a 6ª maior do
   * dórico, a #4 do lídio). Formato: [passosDeLetra, semitons] a partir da
   * tônica, mais o nome do intervalo.
   */
  var CHARACTERISTIC_NOTE = {
    jonio: [[6, 11], '7ª maior'],
    dorico: [[5, 9], '6ª maior'],
    frigio: [[1, 1], '2ª menor'],
    lidio: [[3, 6], '4ª aumentada'],
    mixolidio: [[6, 10], '7ª menor'],
    eolio: [[5, 8], '6ª menor'],
    locrio: [[1, 1], '2ª menor'],
    menor_melodica: [[6, 11], '7ª maior'],
    dorico_b2: [[1, 1], '2ª menor'],
    lidio_aumentado: [[4, 8], '5ª aumentada'],
    lidio_b7: [[3, 6], '4ª aumentada'],
    mixolidio_b13: [[5, 8], '13ª menor'],
    locrio_9: [[1, 2], '9ª maior'],
    alterada: [[1, 1], '9ª menor'],
    menor_harmonica: [[6, 11], '7ª maior'],
    frigio_maior: [[1, 1], '9ª menor'],
    dom_dim: [[1, 1], '9ª menor'],
    diminuta: [[6, 11], '7ª maior'],
    locrio_13: [[5, 9], '13ª (6ª maior)'],
    jonio_5aum: [[4, 8], '5ª aumentada'],
    dorico_11aum: [[3, 6], '4ª aumentada'],
    lidio_9aum: [[1, 3], '9ª aumentada'],
    harmonica_maior: [[5, 8], '6ª menor'],
    hungara_menor: [[3, 6], '4ª aumentada'],
    dupla_harmonica: [[1, 1], '2ª menor'],
    napolitana_menor: [[1, 1], '2ª menor'],
    napolitana_maior: [[1, 1], '2ª menor'],
    bebop_melodico: [[6, 11], '7ª maior'],
    bebop_harmonico: [[6, 11], '7ª maior']
  };

  /**
   * Qualidades de acorde reconhecidas pelo analisador.
   * `intervals`: pares [passosDeLetra, semitons] a partir da fundamental,
   *              usados tanto para gerar as notas do acorde quanto arpejos.
   * `hasSeventh` / `hasNinth`: ajudam a decidir o que mostrar no arpejo.
   */
  var QUALITIES = {
    major: { label: 'maior', short: '', intervals: [[0, 0], [2, 4], [4, 7]] },
    minor: { label: 'menor', short: 'm', intervals: [[0, 0], [2, 3], [4, 7]] },
    dim: { label: 'diminuto', short: 'dim', intervals: [[0, 0], [2, 3], [4, 6]] },
    aug: { label: 'aumentado', short: 'aug', intervals: [[0, 0], [2, 4], [4, 8]] },
    power5: { label: 'power chord', short: '5', intervals: [[0, 0], [4, 7]] },
    sus2: { label: 'sus2', short: 'sus2', intervals: [[0, 0], [1, 2], [4, 7]] },
    sus4: { label: 'sus4', short: 'sus4', intervals: [[0, 0], [3, 5], [4, 7]] },
    major6: { label: 'maior com 6ª', short: '6', intervals: [[0, 0], [2, 4], [4, 7], [5, 9]] },
    minor6: { label: 'menor com 6ª', short: 'm6', intervals: [[0, 0], [2, 3], [4, 7], [5, 9]] },
    major7: { label: 'maior com 7ª maior', short: 'maj7', intervals: [[0, 0], [2, 4], [4, 7], [6, 11]], hasSeventh: true },
    minor7: { label: 'menor com 7ª menor', short: 'm7', intervals: [[0, 0], [2, 3], [4, 7], [6, 10]], hasSeventh: true },
    dominant7: { label: 'dominante (7ª menor)', short: '7', intervals: [[0, 0], [2, 4], [4, 7], [6, 10]], hasSeventh: true },
    minMaj7: { label: 'menor com 7ª maior', short: 'm(maj7)', intervals: [[0, 0], [2, 3], [4, 7], [6, 11]], hasSeventh: true },
    dim7: { label: 'diminuto com 7ª diminuta', short: 'dim7', intervals: [[0, 0], [2, 3], [4, 6], [6, 9]], hasSeventh: true },
    m7b5: { label: 'meio-diminuto', short: 'm7b5', intervals: [[0, 0], [2, 3], [4, 6], [6, 10]], hasSeventh: true },
    major9: { label: 'maior com 9ª', short: 'maj9', intervals: [[0, 0], [2, 4], [4, 7], [6, 11], [1, 2]], hasSeventh: true, hasNinth: true },
    minor9: { label: 'menor com 9ª', short: 'm9', intervals: [[0, 0], [2, 3], [4, 7], [6, 10], [1, 2]], hasSeventh: true, hasNinth: true },
    dominant9: { label: 'dominante com 9ª', short: '9', intervals: [[0, 0], [2, 4], [4, 7], [6, 10], [1, 2]], hasSeventh: true, hasNinth: true },
    add9: { label: 'maior com 9ª adicionada', short: 'add9', intervals: [[0, 0], [2, 4], [4, 7], [1, 2]] },
    // Acrescentadas junto com a leitura da cifra brasileira (7/4, 7(#5), 7(b5), 7M(#5))
    dominant7sus4: { label: 'dominante com 4ª suspensa', short: '7sus4', intervals: [[0, 0], [3, 5], [4, 7], [6, 10]], hasSeventh: true },
    dominant7sharp5: { label: 'dominante com 5ª aumentada', short: '7(#5)', intervals: [[0, 0], [2, 4], [4, 8], [6, 10]], hasSeventh: true },
    dominant7flat5: { label: 'dominante com 5ª diminuta', short: '7(b5)', intervals: [[0, 0], [2, 4], [4, 6], [6, 10]], hasSeventh: true },
    augMaj7: { label: 'maior com 7ª maior e 5ª aumentada', short: '7M(#5)', intervals: [[0, 0], [2, 4], [4, 8], [6, 11]], hasSeventh: true }
  };

  // Grau (algarismo romano) e função por grau da escala, em tonalidade maior
  // e em tonalidade menor natural. Índice 0 = grau I/i.
  var MAJOR_KEY = {
    romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    functions: ['Tônica', 'Subdominante', 'Tônica relativa', 'Subdominante', 'Dominante', 'Tônica relativa', 'Dominante'],
    qualities: ['major7', 'minor7', 'minor7', 'major7', 'dominant7', 'minor7', 'm7b5'],
    scaleOfDegree: ['jonio', 'jonio', 'jonio', 'jonio', 'jonio', 'jonio', 'jonio']
  };

  var MINOR_KEY = {
    romans: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
    functions: ['Tônica', 'Subdominante', 'Tônica relativa', 'Subdominante', 'Dominante', 'Subdominante', 'Dominante'],
    qualities: ['minor7', 'm7b5', 'major7', 'minor7', 'minor7', 'major7', 'dominant7'],
    scaleOfDegree: ['eolio', 'eolio', 'eolio', 'eolio', 'eolio', 'eolio', 'eolio']
  };

  /**
   * Relação acorde–escala ("escala de acorde"). Devolve uma lista ordenada
   * de chaves de SCALES, da mais indicada para a menos.
   *
   * Regras resumidas da relação acorde-escala ensinada nos métodos de
   * harmonia brasileiros (cifra no padrão Chediak) e nos materiais de
   * improvisação jazzística (escalas da maior natural, da menor melódica,
   * da menor harmônica e a simétrica dominante):
   *   - 7M: jônio no I grau, lídio nos demais (e sempre que houver #11);
   *   - m7: dórico no ii e em qualquer m7 "de passagem", frígio no iii,
   *         eólio no vi / i; m6 e m(7M) pedem a menor melódica;
   *   - m7(b5): lócrio no grau diatônico, lócrio 9 nos demais;
   *   - 7: mixolídio quando resolve num acorde maior; mixolídio b9 b13
   *        (5º modo da menor harmônica) quando resolve num acorde menor;
   *        lídio b7 no SubV7, no IV7 e no bVII7; alterada em 7(alt) e
   *        7(#9 b13); dominante-diminuta em 7(b9)/7(13 b9); tons inteiros
   *        em 7(#5)/7(b5); as tensões escritas na cifra mandam primeiro;
   *   - °: diminuta (tom-semitom).
   *
   * `ctx` (opcional): { tensions: [...], resolvesToMinor, isSubV,
   *                     isBackdoor, isBluesDominant, isIV7 }
   */
  function scalesForChord(qualityKey, romanDegree, mode, ctx) {
    ctx = ctx || {};
    var t = ctx.tensions || [];
    function has(x) { return t.indexOf(x) >= 0; }
    var roman = romanDegree || '';
    var isTonic = /^(I|i)$/.test(roman);

    switch (qualityKey) {
      case 'major7':
      case 'major9':
      case 'add9':
      case 'major6':
      case 'major':
        if (has('#11')) return ['lidio', 'jonio', 'pentatonica_maior'];
        if (has('#5')) return ['lidio_aumentado', 'lidio', 'tons_inteiros'];
        if (roman === 'I') return ['jonio', 'lidio', 'pentatonica_maior'];
        if (roman === 'III' && mode === 'menor') return ['jonio', 'lidio', 'pentatonica_maior'];
        if (roman === 'VII' && mode === 'menor') return ['mixolidio', 'lidio', 'pentatonica_maior'];
        return ['lidio', 'jonio', 'pentatonica_maior'];
      case 'augMaj7':
        return ['lidio_aumentado', 'tons_inteiros'];
      case 'aug':
        return ['tons_inteiros', 'lidio_aumentado'];
      case 'minMaj7':
        return ['menor_melodica', 'menor_harmonica'];
      case 'minor6':
        return ['menor_melodica', 'dorico', 'pentatonica_menor'];
      case 'minor7':
      case 'minor9':
      case 'minor':
        if (has('b13') || has('b6')) return ['eolio', 'dorico', 'pentatonica_menor'];
        if (has('7M')) return ['menor_melodica', 'menor_harmonica'];
        if (roman === 'iii' || roman === 'v') return ['frigio', 'eolio', 'pentatonica_menor'];
        if (roman === 'vi' || (roman === 'i' && mode === 'menor')) return ['eolio', 'dorico', 'pentatonica_menor'];
        return ['dorico', 'eolio', 'pentatonica_menor'];
      case 'dominant7sus4':
        return has('b9') ? ['dorico_b2', 'frigio', 'mixolidio'] : ['mixolidio', 'dorico', 'pentatonica_menor'];
      case 'dominant7sharp5':
        return (has('b9') || has('#9')) ? ['alterada', 'tons_inteiros'] : ['tons_inteiros', 'alterada'];
      case 'dominant7flat5':
        return ['tons_inteiros', 'lidio_b7', 'alterada'];
      case 'dominant7':
      case 'dominant9':
        if (has('alt') || (has('#9') && has('b13')) || (has('#9') && has('#5'))) return ['alterada', 'dom_dim', 'frigio_maior'];
        if (has('b9') && has('b13')) return ['frigio_maior', 'alterada', 'dom_dim'];
        if (has('b9') || has('#9')) return ['dom_dim', 'frigio_maior', 'alterada'];
        if (has('#11') || has('b5')) return ['lidio_b7', 'mixolidio', 'tons_inteiros'];
        if (has('b13')) return ['mixolidio_b13', 'frigio_maior', 'alterada'];
        if (ctx.isIV7) return ['lidio_b7', 'mixolidio', 'blues_menor'];
        if (ctx.isSubV || ctx.isBackdoor || ctx.isNonResolving) return ['lidio_b7', 'mixolidio', 'alterada'];
        if (ctx.isBluesDominant) return ['mixolidio', 'blues_menor', 'bebop_dominante'];
        if (ctx.resolvesToMinor) return ['frigio_maior', 'mixolidio_b13', 'alterada'];
        return ['mixolidio', 'alterada', 'bebop_dominante'];
      case 'm7b5':
        if (has('9')) return ['locrio_9', 'locrio'];
        return (roman === 'vii°' || roman === 'ii°' || ctx.isIIcad) ? ['locrio', 'locrio_9'] : ['locrio_9', 'locrio'];
      case 'dim7':
      case 'dim':
        return ['diminuta'];
      case 'sus4':
        return ['mixolidio', 'jonio'];
      case 'sus2':
        return ['jonio', 'mixolidio'];
      case 'power5':
        return isTonic ? ['pentatonica_maior', 'pentatonica_menor'] : ['pentatonica_menor', 'pentatonica_maior'];
      default:
        return ['jonio'];
    }
  }

  /**
   * Escala bebop "irmã" de uma escala de acorde (usada pelo gerador de
   * fraseados para linhas de colcheias com as notas do acorde nos tempos).
   */
  var BEBOP_FOR_SCALE = {
    jonio: 'bebop_maior',
    lidio: 'bebop_maior',
    mixolidio: 'bebop_dominante',
    dorico: 'bebop_dorico'
  };

  return {
    NOTE_LETTERS: NOTE_LETTERS,
    LETTER_SEMITONES: LETTER_SEMITONES,
    SHARP_TONICS: SHARP_TONICS,
    SCALES: SCALES,
    QUALITIES: QUALITIES,
    MAJOR_KEY: MAJOR_KEY,
    MINOR_KEY: MINOR_KEY,
    CHARACTERISTIC_NOTE: CHARACTERISTIC_NOTE,
    BEBOP_FOR_SCALE: BEBOP_FOR_SCALE,
    scalesForChord: scalesForChord
  };
});
