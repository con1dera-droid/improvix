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
      steps: [0, 1, 2, 3, 4, 5, 6],
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
      steps: [0, 1, 2, 3, 4, 5],
      semitones: [0, 2, 4, 6, 8, 10]
    }
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
    add9: { label: 'maior com 9ª adicionada', short: 'add9', intervals: [[0, 0], [2, 4], [4, 7], [1, 2]] }
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

  // Recomendações de escala por qualidade de acorde + contexto de grau.
  // Cada entrada retorna uma lista ordenada (a mais "de dentro" primeiro).
  function scalesForChord(qualityKey, romanDegree, mode) {
    var isTonic = /^(I|i)$/.test(romanDegree);
    var isSubdominantIV = romanDegree === 'IV';
    switch (qualityKey) {
      case 'major7':
      case 'major9':
      case 'add9':
      case 'major6':
      case 'major':
        return isSubdominantIV
          ? ['lidio', 'jonio', 'pentatonica_maior']
          : ['jonio', 'lidio', 'pentatonica_maior'];
      case 'minor7':
      case 'minor9':
      case 'minor6':
      case 'minor':
        if (romanDegree === 'ii' || romanDegree === 'ii°') {
          return ['dorico', 'eolio', 'pentatonica_menor'];
        }
        if (romanDegree === 'iii') {
          return ['frigio', 'eolio', 'pentatonica_menor'];
        }
        return ['eolio', 'dorico', 'pentatonica_menor'];
      case 'dominant7':
      case 'dominant9':
        return ['mixolidio', 'alterada', 'pentatonica_menor'];
      case 'm7b5':
        return ['locrio', 'eolio'];
      case 'dim7':
      case 'dim':
        return ['diminuta'];
      case 'minMaj7':
        return ['eolio', 'diminuta'];
      case 'aug':
        return ['tons_inteiros'];
      case 'sus4':
      case 'sus2':
        return ['mixolidio', 'jonio'];
      case 'power5':
        return isTonic ? ['pentatonica_maior', 'pentatonica_menor'] : ['pentatonica_menor', 'pentatonica_maior'];
      default:
        return ['jonio'];
    }
  }

  return {
    NOTE_LETTERS: NOTE_LETTERS,
    LETTER_SEMITONES: LETTER_SEMITONES,
    SHARP_TONICS: SHARP_TONICS,
    SCALES: SCALES,
    QUALITIES: QUALITIES,
    MAJOR_KEY: MAJOR_KEY,
    MINOR_KEY: MINOR_KEY,
    scalesForChord: scalesForChord
  };
});
