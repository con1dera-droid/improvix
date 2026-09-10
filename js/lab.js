/**
 * ImprovisaLab — Laboratório (Etapa 5, parte 3)
 *
 * Primeiro experimento do Laboratório: um gerador de progressões prontas
 * para praticar, por estilo (Jazz, Blues, Pop, Modal). Cada modelo é
 * definido como uma lista de graus (afastamento em relação à tônica
 * escolhida, em "passos de letra" + semitons — o mesmo jeito que
 * js/theory.js usa para soletrar notas corretamente) e uma qualidade de
 * acorde. Isso permite representar tanto graus diatônicos quanto graus
 * emprestados (ex.: bVII) com a grafia certa (Bb, não A#).
 *
 * Exclusivo do plano Pro — quem decide isso é a tela (js/auth-ui.js), não
 * este módulo, que só gera progressões.
 *
 * Funciona no navegador (window.IL.lab) e no Node (testes).
 */
(function (root, factory) {
  var deps = (typeof module !== 'undefined' && module.exports)
    ? { theory: require('./theory.js'), data: require('./data.js') }
    : { theory: root.IL.theory, data: root.IL.data };
  var mod = factory(deps.theory, deps.data);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.lab = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory, data) {
  'use strict';

  // grau: { letterSteps, semitones } — afastamento da tônica escolhida.
  var I = { letterSteps: 0, semitones: 0 };
  var bII = { letterSteps: 1, semitones: 1 };
  var II = { letterSteps: 1, semitones: 2 };
  var bIII = { letterSteps: 2, semitones: 3 };
  var III = { letterSteps: 2, semitones: 4 };
  var IV = { letterSteps: 3, semitones: 5 };
  var V = { letterSteps: 4, semitones: 7 };
  var bVI = { letterSteps: 5, semitones: 8 };
  var VI = { letterSteps: 5, semitones: 9 };
  var bVII = { letterSteps: 6, semitones: 10 };
  var VII = { letterSteps: 6, semitones: 11 };

  function grau(deg, quality, roman) {
    return { letterSteps: deg.letterSteps, semitones: deg.semitones, quality: quality, roman: roman };
  }

  var CATEGORIES = [
    { key: 'jazz', label: 'Jazz' },
    { key: 'blues', label: 'Blues' },
    { key: 'pop', label: 'Pop/Rock' },
    { key: 'modal', label: 'Modal (empréstimo)' }
  ];

  var PROGRESSION_TEMPLATES = [
    {
      id: 'jazz-ii-v-i',
      category: 'jazz',
      mode: 'maior',
      label: 'ii–V–I (o cadenciamento mais comum do jazz)',
      explanation: 'A cadência mais comum do repertório de jazz: o ii7 puxa para o ' +
        'V7 (dominante), que resolve no Imaj7. Ótima para treinar o encadeamento ' +
        'de arpejos e a resolução da 3ª do V7 na 3ª do Imaj7.',
      chords: [grau(II, 'minor7', 'ii7'), grau(V, 'dominant7', 'V7'), grau(I, 'major7', 'Imaj7')]
    },
    {
      id: 'jazz-i-vi-ii-v',
      category: 'jazz',
      mode: 'maior',
      label: 'I–vi–ii–V (giro/turnaround clássico)',
      explanation: 'O "giro" mais tocado em standards: sai do Imaj7, passa pelo vi7 ' +
        '(tônica relativa) e pelo ii7, e fecha no V7 — pronto para repetir do início.',
      chords: [grau(I, 'major7', 'Imaj7'), grau(VI, 'minor7', 'vi7'), grau(II, 'minor7', 'ii7'), grau(V, 'dominant7', 'V7')]
    },
    {
      id: 'jazz-iii-vi7-ii-v',
      category: 'jazz',
      mode: 'maior',
      label: 'iii–VI7–ii–V (giro com dominante secundário)',
      explanation: 'Variação mais "esperta" do giro: o VI vira dominante secundário ' +
        '(V7/ii), criando um puxão cromático extra antes do ii7–V7 de sempre.',
      chords: [grau(III, 'minor7', 'iii7'), grau(VI, 'dominant7', 'VI7'), grau(II, 'minor7', 'ii7'), grau(V, 'dominant7', 'V7')]
    },
    {
      id: 'blues-12-bar',
      category: 'blues',
      mode: 'maior',
      label: 'Blues de 12 compassos',
      explanation: 'A forma mais tradicional do blues: I7 e IV7 alternando nos ' +
        'primeiros 8 compassos, e o "turnaround" V7–IV7–I7–V7 fechando o ciclo. ' +
        'Todos os acordes são dominantes (7), mesmo o I e o IV — é isso que dá o ' +
        '"tempero" do blues.',
      chords: [
        grau(I, 'dominant7', 'I7'), grau(IV, 'dominant7', 'IV7'), grau(I, 'dominant7', 'I7'), grau(I, 'dominant7', 'I7'),
        grau(IV, 'dominant7', 'IV7'), grau(IV, 'dominant7', 'IV7'), grau(I, 'dominant7', 'I7'), grau(I, 'dominant7', 'I7'),
        grau(V, 'dominant7', 'V7'), grau(IV, 'dominant7', 'IV7'), grau(I, 'dominant7', 'I7'), grau(V, 'dominant7', 'V7')
      ]
    },
    {
      id: 'pop-i-v-vi-iv',
      category: 'pop',
      mode: 'maior',
      label: 'I–V–vi–IV ("a progressão pop")',
      explanation: 'A progressão mais usada da música pop/rock das últimas décadas ' +
        '— dá pra cantar dezenas de músicas famosas em cima dela.',
      chords: [grau(I, 'major', 'I'), grau(V, 'major', 'V'), grau(VI, 'minor', 'vi'), grau(IV, 'major', 'IV')]
    },
    {
      id: 'pop-vi-iv-i-v',
      category: 'pop',
      mode: 'maior',
      label: 'vi–IV–I–V (mesma progressão, começando pela relativa)',
      explanation: 'Os mesmos quatro acordes do "I–V–vi–IV", só que começando pela ' +
        'tônica relativa (vi) — dá um ar mais melancólico à mesma harmonia.',
      chords: [grau(VI, 'minor', 'vi'), grau(IV, 'major', 'IV'), grau(I, 'major', 'I'), grau(V, 'major', 'V')]
    },
    {
      id: 'modal-mixolidio',
      category: 'modal',
      mode: 'maior',
      label: 'I–bVII–IV–I (empréstimo do Mixolídio)',
      explanation: 'Empresta o bVII do modo Mixolídio (comum em rock/funk) em vez ' +
        'do vii° diatônico — repare que a análise abaixo marca o bVII como fora ' +
        'do campo harmônico da tonalidade maior: é exatamente esse "choque" ' +
        'controlado que dá a sonoridade modal.',
      chords: [grau(I, 'major', 'I'), grau(bVII, 'major', 'bVII'), grau(IV, 'major', 'IV'), grau(I, 'major', 'I')]
    },
    {
      id: 'modal-eolio',
      category: 'modal',
      mode: 'menor',
      label: 'i–bVI–bVII–i (empréstimo do Eólio/menor natural)',
      explanation: 'Progressão menor bem comum (rock/metal/trilha sonora): tônica ' +
        'menor, bVI e bVII maiores subindo em direção à tônica de novo — os dois ' +
        'graus emprestados do menor natural dão o clima mais "sombrio".',
      chords: [grau(I, 'minor', 'i'), grau(bVI, 'major', 'bVI'), grau(bVII, 'major', 'bVII'), grau(I, 'minor', 'i')]
    }
  ];

  function templatesByCategory(category) {
    if (!category || category === 'todas') return PROGRESSION_TEMPLATES.slice();
    return PROGRESSION_TEMPLATES.filter(function (t) { return t.category === category; });
  }

  function randomTemplate(category) {
    var pool = templatesByCategory(category);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function templateById(id) {
    for (var i = 0; i < PROGRESSION_TEMPLATES.length; i++) {
      if (PROGRESSION_TEMPLATES[i].id === id) return PROGRESSION_TEMPLATES[i];
    }
    return null;
  }

  /** Gera a progressão de um modelo numa tonalidade escolhida. */
  function realizeTemplate(template, tonicName) {
    var chords = template.chords.map(function (c) {
      var root = theory.noteAt(tonicName, c.letterSteps, c.semitones);
      var short = data.QUALITIES[c.quality].short;
      return { root: root, quality: c.quality, roman: c.roman, symbol: root + short };
    });
    return {
      template: template,
      tonic: tonicName,
      mode: template.mode,
      chords: chords,
      progressionText: chords.map(function (c) { return c.symbol; }).join(' | ')
    };
  }

  function generateRandom(tonicName, category) {
    var template = randomTemplate(category);
    if (!template) return null;
    return realizeTemplate(template, tonicName);
  }

  return {
    CATEGORIES: CATEGORIES,
    PROGRESSION_TEMPLATES: PROGRESSION_TEMPLATES,
    templatesByCategory: templatesByCategory,
    templateById: templateById,
    randomTemplate: randomTemplate,
    realizeTemplate: realizeTemplate,
    generateRandom: generateRandom
  };
});
