/**
 * ImprovisaLab — ficha de cada escala / modo
 *
 * Para cada escala da Biblioteca: fórmula em graus (1 2 b3 4 5 6 b7),
 * intervalos na nomenclatura brasileira (Tôn 2M 3m 4J 5J 6M 7m), desenho de
 * tons e semitons, de onde a escala vem, a sonoridade, a nota
 * característica e onde usar.
 *
 * A fórmula e os intervalos são CALCULADOS a partir de js/data.js (steps +
 * semitones), então nunca ficam em desacordo com o motor; os textos são
 * escritos à mão.
 * Funciona no navegador (window.IL.scaleInfo) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var data = isNode ? require('./data.js') : root.IL.data;
  var mod = factory(data);
  if (isNode) module.exports = mod;
  root.IL = root.IL || {};
  root.IL.scaleInfo = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (DATA) {
  'use strict';

  // Semitons de cada grau na escala maior (a régua das fórmulas).
  var MAJOR = [0, 2, 4, 5, 7, 9, 11];
  var PERFECT = { 1: true, 4: true, 5: true };

  function accidental(diff) {
    if (diff === 0) return '';
    return diff < 0 ? new Array(-diff + 1).join('b') : new Array(diff + 1).join('#');
  }

  function intervalName(deg, diff) {
    if (deg === 1 && diff === 0) return 'Tôn';
    if (PERFECT[deg]) return deg + ({ '-2': 'dim', '-1': 'dim', 0: 'J', 1: 'aum' })[diff];
    return deg + ({ '-2': 'dim', '-1': 'm', 0: 'M', 1: 'aum' })[diff];
  }

  /** [{ degree: 'b3', interval: '3m', semitones: 3, step: 2 }, ...] */
  function formula(scaleKey) {
    var sc = DATA.SCALES[scaleKey];
    if (!sc) return [];
    return sc.steps.map(function (st, i) {
      var semis = sc.semitones[i];
      var diff = semis - MAJOR[st];
      if (diff > 6) diff -= 12;
      if (diff < -6) diff += 12;
      var deg = st + 1;
      return { degree: accidental(diff) + deg, interval: intervalName(deg, diff), semitones: semis, step: st };
    });
  }

  /** Desenho de tons e semitons: 'T – ST – T – ...' (T½ = um tom e meio). */
  function stepPattern(scaleKey) {
    var sc = DATA.SCALES[scaleKey];
    if (!sc) return [];
    var s = sc.semitones.concat([12]);
    var out = [];
    for (var i = 1; i < s.length; i++) {
      var d = s[i] - s[i - 1];
      out.push(d === 1 ? 'ST' : d === 2 ? 'T' : d === 3 ? 'T½' : d + ' st');
    }
    return out;
  }

  /**
   * Textos. `hl`: semitons (a partir da tônica) das notas que dão a cara da
   * escala — ficam destacados na fórmula. `tensoes`: a mesma escala lida como
   * tensões do acorde, quando essa leitura é a usual (dominantes alterados).
   */
  var INFO = {
    jonio: {
      origem: '1º modo da escala maior — é a própria escala maior.',
      acorde: '7M (ou 6)',
      som: 'Clara, estável, "resolvida". É a régua de todas as outras fórmulas: cada modo é descrito pelo que muda em relação a ela.',
      carac: 'A 7ª maior (7M). A 4ª justa fica meio tom acima da 3ª do acorde e soa como "nota a evitar" em tempo forte — use de passagem.',
      uso: 'Acorde I7M da tonalidade (C7M em C maior). Pop, bossa nova, baladas, música erudita.',
      hl: [11]
    },
    dorico: {
      origem: '2º modo da escala maior (Ré dórico = notas de Dó maior começando em Ré).',
      acorde: 'm7 (m6, m7(9))',
      som: 'Menor, mas luminoso e "aberto" — menos triste que o eólio. Soa moderno, funkeado e modal.',
      carac: 'A 6ª maior (6M): é o que separa o dórico do eólio (menor natural), que tem 6ª menor.',
      uso: 'IIm7 do II–V–I (Dm7 em C maior); vamps menores de um acorde só no jazz modal, funk, soul, rock latino.',
      hl: [9]
    },
    frigio: {
      origem: '3º modo da escala maior.',
      acorde: 'm7 (também sus4(b9))',
      som: 'Escuro, tenso, com cara "espanhola"/flamenca.',
      carac: 'A 2ª menor (b2): a nota logo meio tom acima da tônica. É o eólio com a 2ª abaixada.',
      uso: 'IIIm7 (Em7 em C maior), vamps modais, flamenco, metal, sonoridades árabes.',
      hl: [1]
    },
    lidio: {
      origem: '4º modo da escala maior.',
      acorde: '7M(#11)',
      som: 'Maior, brilhante, "flutuante" e sonhador — muito usado em trilhas de cinema.',
      carac: 'A 4ª aumentada (#4 = #11). Troca a 4ª "a evitar" do jônio por uma tensão bonita: é o jônio com a 4ª levantada.',
      uso: 'IV7M (F7M em C maior) e qualquer acorde 7M que não seja o I; jazz moderno, fusion, trilhas.',
      hl: [6]
    },
    mixolidio: {
      origem: '5º modo da escala maior.',
      acorde: '7 (dominante)',
      som: 'Maior com um toque "bluesy" e nordestino: tem a energia do acorde dominante.',
      carac: 'A 7ª menor (b7): é o jônio com a 7ª abaixada. A 4ª justa (11) é a "nota a evitar" em tempo forte.',
      uso: 'V7 do II–V–I (G7 em C maior); blues, rock, funk, baião e forró.',
      hl: [10]
    },
    eolio: {
      origem: '6º modo da escala maior — a escala menor natural (relativa menor).',
      acorde: 'm7',
      som: 'Menor "triste", melancólico — o menor padrão do pop e do rock.',
      carac: 'A 6ª menor (b6): é o que separa o eólio do dórico. Tem também b3 e b7.',
      uso: 'VIm7 (Am7 em C maior), tônica de músicas em tom menor; rock, pop, metal, baladas.',
      hl: [8]
    },
    locrio: {
      origem: '7º modo da escala maior.',
      acorde: 'm7(b5) (meio-diminuto)',
      som: 'Instável e sombrio — a própria tônica não tem 5ª justa.',
      carac: 'A 2ª menor (b2) junto com a 5ª diminuta (b5). Na prática, sobre o m7(b5) o lócrio 9 costuma soar melhor.',
      uso: 'VIIm7(b5) e IIm7(b5) do II–V menor (Bm7(b5) → E7 → Am).',
      hl: [1, 6]
    },
    menor_melodica: {
      origem: '1º modo da menor melódica (jônio b3): a escala maior com a 3ª abaixada.',
      acorde: 'm(7M) (ou m6)',
      som: 'Menor sofisticado, "jazzístico", de suspense — a metade de cima é igual à escala maior.',
      carac: 'A 7ª maior (e a 6ª maior) sobre um acorde menor.',
      uso: 'Tônica menor Im(7M) e Im6; jazz, bossa nova, trilhas.',
      hl: [3, 11]
    },
    dorico_b2: {
      origem: '2º modo da menor melódica.',
      acorde: '7/4(b9) (sus4 com b9)',
      som: 'Escuro e suspenso, entre o frígio e o dórico.',
      carac: 'A 2ª menor (b2) junto com a 6ª maior: é o dórico com a 2ª abaixada.',
      uso: 'Acordes sus4(b9) (G7/4(b9)); jazz modal.',
      hl: [1, 9]
    },
    lidio_aumentado: {
      origem: '3º modo da menor melódica.',
      acorde: '7M(#5)',
      som: 'Muito brilhante, etéreo e instável.',
      carac: 'A 5ª aumentada (#5) junto com a #4: é o lídio com a 5ª levantada.',
      uso: 'Acordes 7M(#5); jazz moderno, trilhas.',
      hl: [6, 8]
    },
    lidio_b7: {
      origem: '4º modo da menor melódica (também chamado lídio dominante ou "escala nordestina").',
      acorde: '7(#11)',
      som: 'Dominante brilhante, sem a "nota a evitar" — o som do baião e do forró.',
      carac: 'A 4ª aumentada (#11) num acorde dominante: é o mixolídio com a 4ª levantada.',
      uso: 'Dominantes que não resolvem uma 5ª abaixo: SubV7 (Db7 → C7M), IV7 do blues, bVII7; baião, forró, jazz.',
      hl: [6, 10]
    },
    mixolidio_b13: {
      origem: '5º modo da menor melódica (também chamado escala hindu).',
      acorde: '7(b13)',
      som: 'Dominante "agridoce": maior embaixo, menor em cima.',
      carac: 'A 13ª menor (b6) sobre um acorde maior: é o mixolídio com a 6ª abaixada.',
      uso: 'V7 indo para acorde menor (E7 → Am7); jazz, MPB.',
      hl: [8]
    },
    locrio_9: {
      origem: '6º modo da menor melódica (eólio b5).',
      acorde: 'm7(b5)',
      som: 'Meio-diminuto mais suave e cantável que o lócrio.',
      carac: 'A 9ª maior (2M) sobre o m7(b5): evita o b2 "duro" do lócrio.',
      uso: 'IIm7(b5) do II–V menor (Bm7(b5) → E7 → Am).',
      hl: [2, 6]
    },
    alterada: {
      origem: '7º modo da menor melódica (superlócrio). Truque: é a menor melódica meio tom acima (G alterada = Ab menor melódica).',
      acorde: '7alt',
      som: 'Tensão máxima — todas as tensões alteradas ao mesmo tempo, pedindo resolução.',
      carac: 'Tem b9, #9, #11 e b13, com 3ª maior e 7ª menor — e nenhuma 5ª justa.',
      uso: 'V7 alterado resolvendo no I (G7alt → C7M ou Cm7); jazz, bebop moderno, fusion.',
      tensoes: '1 b9 #9 3 #11 b13 b7',
      hl: [1, 3, 6, 8]
    },
    menor_harmonica: {
      origem: 'A escala menor natural com a 7ª levantada (para ter um V7 de verdade).',
      acorde: 'm(7M)',
      som: 'Menor dramático, "clássico" e com cara oriental.',
      carac: 'A 7ª maior junto com a 6ª menor: entre as duas há um salto de um tom e meio (2ª aumentada).',
      uso: 'Tônica menor Im(7M); música erudita, tango, metal neoclássico.',
      hl: [8, 11]
    },
    frigio_maior: {
      origem: '5º modo da menor harmônica.',
      acorde: '7(b9/b13)',
      som: 'Espanhol, flamenco, árabe — dramático.',
      carac: 'A 9ª menor (b9) junto com a 3ª maior (e a 13ª menor).',
      uso: 'V7 que resolve em acorde menor (E7(b9) → Am); flamenco, música árabe e judaica, choro, metal.',
      tensoes: '1 b9 3 4 5 b13 b7',
      hl: [1, 4, 8]
    },
    dom_dim: {
      origem: 'Escala simétrica de 8 notas, alternando semitom e tom (só existem 3 dessas).',
      acorde: '7(b9) ou 7(13/b9)',
      som: 'Dominante tenso e cheio de cor: b9 e #9 junto com 13 e 5ª justa.',
      carac: 'Semitom–tom a partir da tônica; o desenho se repete a cada 3 semitons (as mesmas notas servem para G7, Bb7, Db7 e E7).',
      uso: 'V7(b9) e 7(13/b9); jazz, bebop moderno.',
      tensoes: '1 b9 #9 3 #11 5 13 b7',
      hl: [1, 3, 9]
    },
    diminuta: {
      origem: 'Escala simétrica de 8 notas, alternando tom e semitom.',
      acorde: '° (diminuto)',
      som: 'Tensa e cheia de suspense — sem centro tonal claro.',
      carac: 'Tom–semitom a partir da tônica: cada nota do acorde diminuto ganha uma nota um tom acima.',
      uso: 'Acordes diminutos (de passagem, #IV°, VII°); jazz, choro.',
      hl: [2, 5, 8, 11]
    },
    tons_inteiros: {
      origem: 'Escala simétrica de 6 notas, só com tons inteiros (só existem 2 dessas).',
      acorde: '7(#5) (ou 7(#11/b13))',
      som: 'Sonhadora, "sem chão", impressionista.',
      carac: 'Só tons inteiros: não tem 4ª nem 5ª justas; tem 3ª maior, #11 e #5.',
      uso: 'Dominantes com #5 (G7(#5) → C7M); trilhas de "sonho", impressionismo, jazz.',
      tensoes: '1 9 3 #11 #5 b7',
      hl: [6, 8]
    },
    bebop_dominante: {
      origem: 'Mixolídio + a 7ª maior de passagem (8 notas).',
      acorde: '7',
      som: 'O som do bebop (Charlie Parker): linhas de colcheias que "encaixam" no compasso.',
      carac: 'A 7M cromática entre a b7 e a tônica: descendo em colcheias a partir de uma nota do acorde, 1-3-5-b7 caem nos tempos fortes.',
      uso: 'V7 e linhas de colcheias em II–V–I; bebop, swing, jazz.',
      hl: [11]
    },
    bebop_maior: {
      origem: 'Jônio + a #5 (b6) de passagem (8 notas).',
      acorde: '6 ou 7M',
      som: 'Maior, "swingado", típico do bebop e do swing.',
      carac: 'A nota cromática entre a 5ª e a 6ª: descendo em colcheias, as notas do acorde de 6 (1-3-5-6) caem nos tempos fortes.',
      uso: 'Acorde de tônica (C6, C7M); bebop, swing.',
      hl: [8]
    },
    bebop_dorico: {
      origem: 'Dórico + a 7ª maior de passagem (8 notas).',
      acorde: 'm7',
      som: 'Menor e fluente — o dórico com o "encaixe" do bebop.',
      carac: 'A 7M cromática entre a b7 e a tônica: descendo em colcheias, 1-b3-5-b7 caem nos tempos fortes.',
      uso: 'IIm7 do II–V–I; bebop, jazz.',
      hl: [11]
    },
    pentatonica_maior: {
      origem: 'Escala maior sem a 4ª e a 7ª (5 notas).',
      acorde: '6 (serve em 7M e 7)',
      som: 'Aberta, alegre, "country"/folk — sem nenhuma nota que brigue com o acorde.',
      carac: 'Não tem semitons: sem a 4ª e a 7ª, nenhuma nota fica meio tom acima de uma nota do acorde.',
      uso: 'Acordes maiores; country, pop, rock, MPB, blues em tom maior.',
      hl: [9]
    },
    pentatonica_menor: {
      origem: 'Escala menor natural sem a 2ª e a 6ª (5 notas).',
      acorde: 'm7 (e todo o blues)',
      som: 'O som do rock e do blues — a primeira escala de quase todo guitarrista.',
      carac: 'Só 5 notas (1 b3 4 5 b7) e dois intervalos de tom e meio: soa bem em qualquer lugar do acorde menor.',
      uso: 'Acordes menores e o blues inteiro (A pentatônica menor sobre A7, D7 e E7); rock, blues, funk.',
      hl: [3, 10]
    },
    blues_menor: {
      origem: 'Pentatônica menor + a b5 ("blue note").',
      acorde: '7 (blues)',
      som: 'O blues em pessoa: sujo, expressivo, pede bend e vibrato.',
      carac: 'A b5 (blue note), cromática entre a 4ª e a 5ª.',
      uso: 'Blues (sobre I7, IV7 e V7), rock, jazz, funk.',
      hl: [6]
    },
    blues_maior: {
      origem: 'Pentatônica maior + a b3 ("blue note").',
      acorde: '7 (blues em tom maior)',
      som: 'Blues "alegre", com sotaque country e de gospel.',
      carac: 'A b3 (blue note), cromática subindo para a 3ª maior.',
      uso: 'Blues em tom maior, country, rock sulista, jazz.',
      hl: [3]
    }
  };

  /** Ficha completa (sem as notas no tom — isso a tela calcula com o motor). */
  function get(scaleKey) {
    var sc = DATA.SCALES[scaleKey];
    var inf = INFO[scaleKey];
    if (!sc || !inf) return null;
    var f = formula(scaleKey);
    var hl = inf.hl || [];
    f.forEach(function (x) { x.highlight = hl.indexOf(x.semitones) >= 0; });
    return {
      key: scaleKey,
      label: sc.label,
      formula: f,
      formulaText: f.map(function (x) { return x.degree; }).join(' '),
      intervalsText: f.map(function (x) { return x.interval; }).join(' '),
      steps: stepPattern(scaleKey),
      notesCount: f.length,
      origem: inf.origem,
      acorde: inf.acorde,
      som: inf.som,
      carac: inf.carac,
      uso: inf.uso,
      tensoes: inf.tensoes || null
    };
  }

  return { INFO: INFO, formula: formula, stepPattern: stepPattern, get: get };
});
