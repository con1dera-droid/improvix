/**
 * IMPROVIX — ficha de cada escala / modo
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

  /** Desenho de tons e semitons: 'T – ST – T – ...' (T½ = tom e meio, 2T = dois tons). */
  function stepPattern(scaleKey) {
    var sc = DATA.SCALES[scaleKey];
    if (!sc) return [];
    var s = sc.semitones.concat([12]);
    var out = [];
    for (var i = 1; i < s.length; i++) {
      var d = s[i] - s[i - 1];
      out.push(d === 1 ? 'ST' : d === 2 ? 'T' : d === 3 ? 'T½' : d === 4 ? '2T' : d === 5 ? '2T½' : d + ' st');
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
      alvo: '1, 3, 5 e 7M. Comece e termine frases na 3ª ou na 7M: são elas que dizem "maior".',
      evitar: '4ª justa (11). Fica meio tom acima da 3ª e "apaga" o acorde. Só de passagem, em tempo fraco.',
      acordes: 'C7M, C6, C7M(9), Cadd9',
      treino: 'Toque a escala e pare sempre na 3ª (E) e na 7M (B). Depois arpeje 1-3-5-7 e resolva na 3ª.',
      hl: [11]
    },
    dorico: {
      origem: '2º modo da escala maior (Ré dórico = notas de Dó maior começando em Ré).',
      acorde: 'm7 (m6, m7(9))',
      som: 'Menor, mas luminoso e "aberto" — menos triste que o eólio. Soa moderno, funkeado e modal.',
      carac: 'A 6ª maior (6M): é o que separa o dórico do eólio (menor natural), que tem 6ª menor.',
      uso: 'IIm7 do II–V–I (Dm7 em C maior); vamps menores de um acorde só no jazz modal, funk, soul, rock latino.',
      alvo: '1, b3, 5, b7 e a 6ª maior — a 6ª é a nota que dá o "sotaque" dórico.',
      evitar: 'Nenhuma nota é proibida. A 4ª pode soar parada em cima da b3: prefira passar por ela.',
      acordes: 'Dm7, Dm6, Dm7(9), Dm7(11), Dm13',
      treino: 'Toque a escala parando na 6ª maior (B no Ré dórico) e compare com o eólio (Bb): é esse meio tom que muda tudo.',
      hl: [9]
    },
    frigio: {
      origem: '3º modo da escala maior.',
      acorde: 'm7 (também sus4(b9))',
      som: 'Escuro, tenso, com cara "espanhola"/flamenca.',
      carac: 'A 2ª menor (b2): a nota logo meio tom acima da tônica. É o eólio com a 2ª abaixada.',
      uso: 'IIIm7 (Em7 em C maior), vamps modais, flamenco, metal, sonoridades árabes.',
      alvo: '1, b3, 5, b7 e a b2 (b9) — a b2 é o tempero, use-a resolvendo na tônica.',
      evitar: 'A b2 em nota longa sobre acorde menor "briga" com a fundamental: prefira usá-la de passagem ou caindo na tônica.',
      acordes: 'Em7, Esus4(b9), E7/4(b9), Em(b9)',
      treino: 'Faça frases curtas b2 → 1 (F → E). Esse meio tom é o som flamenco.',
      hl: [1]
    },
    lidio: {
      origem: '4º modo da escala maior.',
      acorde: '7M(#11)',
      som: 'Maior, brilhante, "flutuante" e sonhador — muito usado em trilhas de cinema.',
      carac: 'A 4ª aumentada (#4 = #11). Troca a 4ª "a evitar" do jônio por uma tensão bonita: é o jônio com a 4ª levantada.',
      uso: 'IV7M (F7M em C maior) e qualquer acorde 7M que não seja o I; jazz moderno, fusion, trilhas.',
      alvo: '1, 3, 5, 7M e a #11 — a #11 é a nota que faz o lídio soar lídio.',
      evitar: 'Nenhuma nota a evitar. A única armadilha é a 4ª justa: ela não existe aqui — se você tocar, volta a soar jônio.',
      acordes: 'F7M(#11), F7M(9), F6(9)',
      treino: 'Toque a tríade de Sol (a tríade do 2º grau) por cima de F7M: sai o som lídio pronto.',
      hl: [6]
    },
    mixolidio: {
      origem: '5º modo da escala maior.',
      acorde: '7 (dominante)',
      som: 'Maior com um toque "bluesy" e nordestino: tem a energia do acorde dominante.',
      carac: 'A 7ª menor (b7): é o jônio com a 7ª abaixada. A 4ª justa (11) é a "nota a evitar" em tempo forte.',
      uso: 'V7 do II–V–I (G7 em C maior); blues, rock, funk, baião e forró.',
      alvo: '1, 3, 5 e b7 — o par 3ª + b7 é o que define o dominante (o trítono).',
      evitar: '4ª justa (11): meio tom acima da 3ª. Use de passagem; se quiser segurá-la, toque o acorde como sus4.',
      acordes: 'G7, G7(9), G7(13), G9',
      treino: 'Arpeje 3-5-b7-9 (B-D-F-A) e resolva na 3ª do acorde seguinte.',
      hl: [10]
    },
    eolio: {
      origem: '6º modo da escala maior — a escala menor natural (relativa menor).',
      acorde: 'm7',
      som: 'Menor "triste", melancólico — o menor padrão do pop e do rock.',
      carac: 'A 6ª menor (b6): é o que separa o eólio do dórico. Tem também b3 e b7.',
      uso: 'VIm7 (Am7 em C maior), tônica de músicas em tom menor; rock, pop, metal, baladas.',
      alvo: '1, b3, 5 e b7. A b6 é o "drama": boa para nota longa quando você quer peso.',
      evitar: 'A b6 sobre um acorde m6 ou m7 com 13 natural não combina; nesse caso o dórico é a escolha.',
      acordes: 'Am7, Am, Am7(11), Am(b13)',
      treino: 'Alterne frases no eólio e no dórico sobre o mesmo Am7 e ouça a diferença entre F e F#.',
      hl: [8]
    },
    locrio: {
      origem: '7º modo da escala maior.',
      acorde: 'm7(b5) (meio-diminuto)',
      som: 'Instável e sombrio — a própria tônica não tem 5ª justa.',
      carac: 'A 2ª menor (b2) junto com a 5ª diminuta (b5). Na prática, sobre o m7(b5) o lócrio 9 costuma soar melhor.',
      uso: 'VIIm7(b5) e IIm7(b5) do II–V menor (Bm7(b5) → E7 → Am).',
      alvo: '1, b3, b5 e b7 — são as quatro notas do acorde.',
      evitar: 'A b2 (b9) em tempo forte soa dura sobre o m7(b5). Se quiser 9ª, troque para o lócrio 9.',
      acordes: 'Bm7(b5), Bø',
      treino: 'Arpeje 1-b3-b5-b7 e resolva meio tom abaixo, na 3ª do dominante seguinte.',
      hl: [1, 6]
    },
    menor_melodica: {
      origem: '1º modo da menor melódica (jônio b3): a escala maior com a 3ª abaixada.',
      acorde: 'm(7M) (ou m6)',
      som: 'Menor sofisticado, "jazzístico", de suspense — a metade de cima é igual à escala maior.',
      carac: 'A 7ª maior (e a 6ª maior) sobre um acorde menor.',
      uso: 'Tônica menor Im(7M) e Im6; jazz, bossa nova, trilhas.',
      alvo: '1, b3, 5, 6 e 7M — a 7M é o que dá o clima de suspense.',
      evitar: 'Nenhuma. Cuidado só ao tocar 7M sobre um acorde m7 comum (que pede b7).',
      acordes: 'Cm(7M), Cm6, Cm6(9)',
      treino: 'Toque a escala e pare na 7M; depois desça b3-2-1 para sentir a tensão resolver.',
      hl: [3, 11]
    },
    dorico_b2: {
      origem: '2º modo da menor melódica.',
      acorde: '7/4(b9) (sus4 com b9)',
      som: 'Escuro e suspenso, entre o frígio e o dórico.',
      carac: 'A 2ª menor (b2) junto com a 6ª maior: é o dórico com a 2ª abaixada.',
      uso: 'Acordes sus4(b9) (G7/4(b9)); jazz modal.',
      alvo: '1, 4, 5, b7 e a 6ª maior.',
      evitar: 'A 3ª não existe aqui: é um som suspenso. Se tocar a 3ª maior, vira outro acorde.',
      acordes: 'D7/4(b9), Dsus4(b9), Dm7(b9)',
      treino: 'Toque a tríade menor do 4º grau por cima do acorde sus: sai o som pronto.',
      hl: [1, 9]
    },
    lidio_aumentado: {
      origem: '3º modo da menor melódica.',
      acorde: '7M(#5)',
      som: 'Muito brilhante, etéreo e instável.',
      carac: 'A 5ª aumentada (#5) junto com a #4: é o lídio com a 5ª levantada.',
      uso: 'Acordes 7M(#5); jazz moderno, trilhas.',
      alvo: '1, 3, #5 e 7M — a #5 substitui a 5ª justa.',
      evitar: '5ª justa: não existe nessa escala; tocá-la desfaz o som aumentado.',
      acordes: 'C7M(#5), C7M(#5/#11)',
      treino: 'Arpeje 1-3-#5-7M e resolva no acorde seguinte pela 3ª.',
      hl: [6, 8]
    },
    lidio_b7: {
      origem: '4º modo da menor melódica (também chamado lídio dominante ou "escala nordestina").',
      acorde: '7(#11)',
      som: 'Dominante brilhante, sem a "nota a evitar" — o som do baião e do forró.',
      carac: 'A 4ª aumentada (#11) num acorde dominante: é o mixolídio com a 4ª levantada.',
      uso: 'Dominantes que não resolvem uma 5ª abaixo: SubV7 (Db7 → C7M), IV7 do blues, bVII7; baião, forró, jazz.',
      alvo: '1, 3, #11, 5, 13 e b7 — todas soam bem, inclusive a #11 em nota longa.',
      evitar: 'Nenhuma. A 4ª justa é que não pertence a esta escala.',
      acordes: 'C7(#11), C9(#11), C13(#11)',
      treino: 'Toque a tríade maior do 2º grau (D sobre C7) — é o atalho para o som lídio b7.',
      hl: [6, 10]
    },
    mixolidio_b13: {
      origem: '5º modo da menor melódica (também chamado escala hindu).',
      acorde: '7(b13)',
      som: 'Dominante "agridoce": maior embaixo, menor em cima.',
      carac: 'A 13ª menor (b6) sobre um acorde maior: é o mixolídio com a 6ª abaixada.',
      uso: 'V7 indo para acorde menor (E7 → Am7); jazz, MPB.',
      alvo: '1, 3, 5, b7 e a b13 — a b13 é a cor que puxa para o menor.',
      evitar: '13 natural (6ª maior) não existe aqui; se tocar, o som vira mixolídio comum.',
      acordes: 'C7(b13), C7(9/b13)',
      treino: 'Compare a mesma frase com 13 e com b13 sobre um V7 que vai para acorde menor.',
      hl: [8]
    },
    locrio_9: {
      origem: '6º modo da menor melódica (eólio b5).',
      acorde: 'm7(b5)',
      som: 'Meio-diminuto mais suave e cantável que o lócrio.',
      carac: 'A 9ª maior (2M) sobre o m7(b5): evita o b2 "duro" do lócrio.',
      uso: 'IIm7(b5) do II–V menor (Bm7(b5) → E7 → Am).',
      alvo: '1, b3, b5, b7 e a 9ª maior.',
      evitar: 'Nenhuma. É justamente a versão "sem nota a evitar" do lócrio.',
      acordes: 'Bm7(b5), Bm7(b5/9), Bø(9)',
      treino: 'Arpeje b3-b5-b7-9 e resolva na 3ª do V7 seguinte.',
      hl: [2, 6]
    },
    alterada: {
      origem: '7º modo da menor melódica (superlócrio). Truque: é a menor melódica meio tom acima (G alterada = Ab menor melódica).',
      acorde: '7alt',
      som: 'Tensão máxima — todas as tensões alteradas ao mesmo tempo, pedindo resolução.',
      carac: 'Tem b9, #9, #11 e b13, com 3ª maior e 7ª menor — e nenhuma 5ª justa.',
      uso: 'V7 alterado resolvendo no I (G7alt → C7M ou Cm7); jazz, bebop moderno, fusion.',
      alvo: '3 e b7 (as notas-guia) e qualquer tensão alterada: b9, #9, #11, b13.',
      evitar: '5ª justa e 13 natural não existem aqui. Sobre um V7 que não vai resolver, essa escala soa "solta".',
      acordes: 'G7alt, G7(b9/#9), G7(#9/b13)',
      treino: 'Toque a menor melódica meio tom acima do dominante (Ab menor melódica sobre G7) e resolva na 3ª do acorde seguinte.',
      tensoes: '1 b9 #9 3 #11 b13 b7',
      hl: [1, 3, 6, 8]
    },
    menor_harmonica: {
      origem: 'A escala menor natural com a 7ª levantada (para ter um V7 de verdade).',
      acorde: 'm(7M)',
      som: 'Menor dramático, "clássico" e com cara oriental.',
      carac: 'A 7ª maior junto com a 6ª menor: entre as duas há um salto de um tom e meio (2ª aumentada).',
      uso: 'Tônica menor Im(7M); música erudita, tango, metal neoclássico.',
      alvo: '1, b3, 5 e 7M. A b6 é forte como nota de tensão que desce para a 5ª.',
      evitar: 'A 7M sobre um acorde m7 comum soa errada: essa escala é para acordes m(7M) ou para o V7(b9) do tom menor.',
      acordes: 'Am(7M), Am(7M/9), E7(b9) (o V do tom)',
      treino: 'Toque o salto b6 → 7M (F → G#) devagar: é ele que dá o sabor da escala.',
      hl: [8, 11]
    },
    frigio_maior: {
      origem: '5º modo da menor harmônica.',
      acorde: '7(b9/b13)',
      som: 'Espanhol, flamenco, árabe — dramático.',
      carac: 'A 9ª menor (b9) junto com a 3ª maior (e a 13ª menor).',
      uso: 'V7 que resolve em acorde menor (E7(b9) → Am); flamenco, música árabe e judaica, choro, metal.',
      alvo: '3 e b7, mais a b9 e a b13 como tensões.',
      evitar: '9ª maior e 13 natural não pertencem a esta escala; a 4ª justa também só serve de passagem.',
      acordes: 'E7(b9), E7(b9/b13), E7(b13)',
      treino: 'Desça b9 → 1 (F → E) várias vezes: é a marca do som espanhol.',
      tensoes: '1 b9 3 4 5 b13 b7',
      hl: [1, 4, 8]
    },
    dom_dim: {
      origem: 'Escala simétrica de 8 notas, alternando semitom e tom (só existem 3 dessas).',
      acorde: '7(b9) ou 7(13/b9)',
      som: 'Dominante tenso e cheio de cor: b9 e #9 junto com 13 e 5ª justa.',
      carac: 'Semitom–tom a partir da tônica; o desenho se repete a cada 3 semitons (as mesmas notas servem para G7, Bb7, Db7 e E7).',
      uso: 'V7(b9) e 7(13/b9); jazz, bebop moderno.',
      alvo: '3, b7, b9, #9 e 13 — todas as notas do acorde com as tensões dele.',
      evitar: 'Nenhuma. Só lembre: a 13 natural e a b9 juntas são o "cheiro" da escala.',
      acordes: 'G7(b9), G7(13/b9), G7(#9)',
      treino: 'Toque arpejos diminutos subindo de 3 em 3 semitons: todos cabem dentro dela.',
      tensoes: '1 b9 #9 3 #11 5 13 b7',
      hl: [1, 3, 9]
    },
    diminuta: {
      origem: 'Escala simétrica de 8 notas, alternando tom e semitom.',
      acorde: '° (diminuto)',
      som: 'Tensa e cheia de suspense — sem centro tonal claro.',
      carac: 'Tom–semitom a partir da tônica: cada nota do acorde diminuto ganha uma nota um tom acima.',
      uso: 'Acordes diminutos (de passagem, #IV°, VII°); jazz, choro.',
      alvo: '1, b3, b5 e bb7 (as notas do acorde diminuto).',
      evitar: 'Nenhuma nota é proibida, mas em acorde não-diminuto ela soa fora.',
      acordes: 'C°, C°7, Cdim7',
      treino: 'Toque o arpejo diminuto e acrescente a nota um tom acima de cada nota dele.',
      hl: [2, 5, 8, 11]
    },
    tons_inteiros: {
      origem: 'Escala simétrica de 6 notas, só com tons inteiros (só existem 2 dessas).',
      acorde: '7(#5) (ou 7(#11/b13))',
      som: 'Sonhadora, "sem chão", impressionista.',
      carac: 'Só tons inteiros: não tem 4ª nem 5ª justas; tem 3ª maior, #11 e #5.',
      uso: 'Dominantes com #5 (G7(#5) → C7M); trilhas de "sonho", impressionismo, jazz.',
      alvo: '3, b7, #11 e #5.',
      evitar: '5ª justa e 4ª justa não existem; tocá-las tira o efeito.',
      acordes: 'G7(#5), G7(#5/#11), G+7',
      treino: 'Suba a escala em terças maiores: como tudo é tom inteiro, o desenho se repete sozinho.',
      tensoes: '1 9 3 #11 #5 b7',
      hl: [6, 8]
    },
    bebop_dominante: {
      origem: 'Mixolídio + a 7ª maior de passagem (8 notas).',
      acorde: '7',
      som: 'O som do bebop (Charlie Parker): linhas de colcheias que "encaixam" no compasso.',
      carac: 'A 7M cromática entre a b7 e a tônica: descendo em colcheias a partir de uma nota do acorde, 1-3-5-b7 caem nos tempos fortes.',
      uso: 'V7 e linhas de colcheias em II–V–I; bebop, swing, jazz.',
      alvo: '1, 3, 5 e b7 nos tempos fortes.',
      evitar: 'A 4ª justa continua sendo de passagem; e a 7M só vale como nota cromática, nunca segurada.',
      acordes: 'G7, G7(9), G13',
      treino: 'Desça oito colcheias a partir da tônica e confira: as notas do acorde caem nos tempos 1, 2, 3 e 4.',
      hl: [11]
    },
    bebop_maior: {
      origem: 'Jônio + a #5 (b6) de passagem (8 notas).',
      acorde: '6 ou 7M',
      som: 'Maior, "swingado", típico do bebop e do swing.',
      carac: 'A nota cromática entre a 5ª e a 6ª: descendo em colcheias, as notas do acorde de 6 (1-3-5-6) caem nos tempos fortes.',
      uso: 'Acorde de tônica (C6, C7M); bebop, swing.',
      alvo: '1, 3, 5 e 6 (o acorde de sexta).',
      evitar: 'A #5 é só passagem. A 4ª justa continua "nota a evitar" em tempo forte.',
      acordes: 'C6, C7M, C6(9)',
      treino: 'Toque a escala descendo do 1 e pare na 6ª: é o som de "fim de frase" do swing.',
      hl: [8]
    },
    bebop_dorico: {
      origem: 'Dórico + a 7ª maior de passagem (8 notas).',
      acorde: 'm7',
      som: 'Menor e fluente — o dórico com o "encaixe" do bebop.',
      carac: 'A 7M cromática entre a b7 e a tônica: descendo em colcheias, 1-b3-5-b7 caem nos tempos fortes.',
      uso: 'IIm7 do II–V–I; bebop, jazz.',
      alvo: '1, b3, 5 e b7.',
      evitar: 'A 7M é só de passagem: segurada, ela contradiz o acorde m7.',
      acordes: 'Dm7, Dm6, Dm9',
      treino: 'Desça do 1 em colcheias e emende no V7 com a mesma pulsação.',
      hl: [11]
    },
    pentatonica_maior: {
      origem: 'Escala maior sem a 4ª e a 7ª (5 notas).',
      acorde: '6 (serve em 7M e 7)',
      som: 'Aberta, alegre, "country"/folk — sem nenhuma nota que brigue com o acorde.',
      carac: 'Não tem semitons: sem a 4ª e a 7ª, nenhuma nota fica meio tom acima de uma nota do acorde.',
      uso: 'Acordes maiores; country, pop, rock, MPB, blues em tom maior.',
      alvo: '1, 2 (9), 3, 5 e 6 (13) — todas são seguras.',
      evitar: 'Nenhuma. É a escala "sem erro" do acorde maior.',
      acordes: 'C, C6, C7M, C7',
      treino: 'Toque a pentatônica maior começando de cada uma das 5 notas: são as 5 posições no braço.',
      hl: [9]
    },
    pentatonica_menor: {
      origem: 'Escala menor natural sem a 2ª e a 6ª (5 notas).',
      acorde: 'm7 (e todo o blues)',
      som: 'O som do rock e do blues — a primeira escala de quase todo guitarrista.',
      carac: 'Só 5 notas (1 b3 4 5 b7) e dois intervalos de tom e meio: soa bem em qualquer lugar do acorde menor.',
      uso: 'Acordes menores e o blues inteiro (A pentatônica menor sobre A7, D7 e E7); rock, blues, funk.',
      alvo: '1, b3, 5 e b7 — a 4ª serve de apoio e de bend.',
      evitar: 'Nenhuma. Sobre acorde maior, a b3 é "blue note" — soa bem se você a puxar (bend) para a 3ª.',
      acordes: 'Am7, Am, A7 (blues), A5',
      treino: 'Faça bend da 4ª para a 5ª e da b3 para a 3ª: é o vocabulário básico do blues.',
      hl: [3, 10]
    },
    blues_menor: {
      origem: 'Pentatônica menor + a b5 ("blue note").',
      acorde: '7 (blues)',
      som: 'O blues em pessoa: sujo, expressivo, pede bend e vibrato.',
      carac: 'A b5 (blue note), cromática entre a 4ª e a 5ª.',
      uso: 'Blues (sobre I7, IV7 e V7), rock, jazz, funk.',
      alvo: '1, b3, 4, 5 e b7 — a b5 é passagem expressiva.',
      evitar: 'A b5 segurada em tempo forte soa "fora": ela existe para passar rápido ou para o bend.',
      acordes: 'A7, A7(9), Am7, A5',
      treino: 'Suba 4 → b5 → 5 devagar e depois rápido: esse deslize é a marca do blues.',
      hl: [6]
    },
    blues_maior: {
      origem: 'Pentatônica maior + a b3 ("blue note").',
      acorde: '7 (blues em tom maior)',
      som: 'Blues "alegre", com sotaque country e de gospel.',
      carac: 'A b3 (blue note), cromática subindo para a 3ª maior.',
      uso: 'Blues em tom maior, country, rock sulista, jazz.',
      alvo: '1, 2, 3, 5 e 6 — a b3 é o tempero que resolve na 3ª.',
      evitar: 'A b3 segurada sobre acorde maior soa errada: ela precisa resolver na 3ª.',
      acordes: 'A7, A, A6, A9',
      treino: 'Alterne blues maior e blues menor no mesmo acorde: é o que os bluesmen fazem o tempo todo.',
      hl: [3]
    },
    blues_9: {
      origem: 'Pentatônica menor + a b5 + a 3ª maior e a 2ª (as duas escalas de blues juntas: 9 notas).',
      acorde: '7 (blues)',
      som: 'O "blues completo": junta o blues menor e o blues maior num só desenho.',
      carac: 'Tem b3 e 3 ao mesmo tempo, além da b5: é o cromatismo típico do blues.',
      uso: 'Blues, rock, funk, jazz — sobre qualquer acorde dominante do blues.',
      alvo: '1, 3, 5 e b7 (o acorde), com b3 e b5 como blue notes de passagem.',
      evitar: 'b3 e b5 seguradas em tempo forte soam fora: elas existem para passar ou para bend.',
      acordes: 'A7, A9, A13',
      treino: 'Suba b3 → 3 e 4 → b5 → 5 em colcheias: o blues inteiro mora nesses dois movimentos.',
      hl: [3, 4, 6]
    },
    locrio_13: {
      origem: '2º modo da menor harmônica.',
      acorde: 'm7(b5)',
      som: 'Meio-diminuto com uma cor mais clara por causa da 13 natural.',
      carac: 'A 13 (6ª maior) num acorde meio-diminuto, junto com a b2.',
      uso: 'IIm7(b5) do II–V menor, quando você quer a 13 natural em vez da b13.',
      alvo: '1, b3, b5, b7 e a 13.',
      evitar: 'A b2 (b9) em tempo forte soa dura; use-a caindo na tônica.',
      acordes: 'Bm7(b5), Bm7(b5/13)',
      treino: 'Compare com o lócrio comum: só muda a 6ª (b6 → 6).',
      hl: [1, 9]
    },
    jonio_5aum: {
      origem: '3º modo da menor harmônica.',
      acorde: '7M(#5)',
      som: 'Maior e "levitando", por causa da 5ª aumentada.',
      carac: 'A #5 dentro de uma escala maior comum.',
      uso: 'Acordes 7M(#5) dentro de tom menor (o III grau da menor harmônica).',
      alvo: '1, 3, #5 e 7M.',
      evitar: '5ª justa: não existe aqui. A 4ª justa segue como nota de passagem.',
      acordes: 'C7M(#5), C+7M',
      treino: 'Arpeje 1-3-#5-7M e resolva descendo meio tom na 5ª do acorde seguinte.',
      hl: [8]
    },
    dorico_11aum: {
      origem: '4º modo da menor harmônica (também chamada romena ou dórico ucraniano).',
      acorde: 'm7(#11) / 7(#11)',
      som: 'Menor com um brilho oriental — dórico com a 4ª levantada.',
      carac: 'A #11 dentro de um contexto menor, com 6ª maior e b7.',
      uso: 'Acordes menores em música do leste europeu, klezmer, cigana, e como cor sobre m7.',
      alvo: '1, b3, 5, b7, mais a #11 e a 6ª maior.',
      evitar: 'Nenhuma. Cuidado só em jazz "puro": a #11 sobre m7 é uma cor forte.',
      acordes: 'Dm7(#11), Dm6(#11)',
      treino: 'Toque a escala parando na #11 e depois resolva na 5ª.',
      hl: [6, 9]
    },
    lidio_9aum: {
      origem: '6º modo da menor harmônica.',
      acorde: '7M(#9) / 7M(#11)',
      som: 'Brilhante e exótico ao mesmo tempo: lídio com a 2ª aumentada.',
      carac: 'A #9 (2ª aumentada) dentro de uma escala maior com #11.',
      uso: 'Acordes 7M com cor exótica; trilhas, metal sinfônico, jazz moderno.',
      alvo: '1, 3, 5, 7M, com #9 e #11 como tensões.',
      evitar: 'A 9ª maior não existe aqui; se usá-la, o som volta a ser lídio comum.',
      acordes: 'C7M(#11), C7M(#9/#11)',
      treino: 'Toque o salto 1 → #9 (C → D#) e depois a #11: são as duas cores da escala.',
      hl: [3, 6]
    },
    harmonica_maior: {
      origem: 'A escala maior com a 6ª abaixada.',
      acorde: '7M (com b13)',
      som: 'Maior com um toque dramático — como se a escala maior "olhasse" para o menor.',
      carac: 'A b6 dentro de uma escala maior: gera o mesmo salto de tom e meio da menor harmônica (b6 → 7M).',
      uso: 'Acordes 7M com b13; música erudita, trilha, jazz moderno. O 5º modo dela é ótimo sobre V7(b9).',
      alvo: '1, 3, 5 e 7M; a b6 é a cor.',
      evitar: '13 natural (6ª maior) não existe aqui: é a b6 que dá o caráter.',
      acordes: 'C7M, C7M(b13)',
      treino: 'Toque a escala maior e depois esta: só muda uma nota (A → Ab).',
      hl: [8, 11]
    },
    hungara_menor: {
      origem: 'Menor harmônica com a 4ª levantada (cigana menor).',
      acorde: 'm(7M) / m6',
      som: 'Muito dramático e "cigano": tem dois saltos de tom e meio.',
      carac: 'A #4 junto com a b6 e a 7M.',
      uso: 'Música cigana e húngara, metal neoclássico, trilha; sobre acordes menores de tônica.',
      alvo: '1, b3, 5 e 7M; a #4 e a b6 são as cores.',
      evitar: 'Nenhuma proibida, mas os dois saltos grandes pedem cuidado com o fraseado.',
      acordes: 'Am(7M), Am6, Am(7M/#11)',
      treino: 'Suba devagar b3 → #4 → 5 e b6 → 7M: são os dois intervalos que dão o sotaque.',
      hl: [6, 8, 11]
    },
    dupla_harmonica: {
      origem: 'Escala maior com b2 e b6 (bizantina, árabe, "double harmonic").',
      acorde: '7M (com b9 e b13)',
      som: 'Som árabe/oriental marcante — dois saltos de tom e meio.',
      carac: 'A b2 e a b6 dentro de uma escala com 3ª e 7ª maiores.',
      uso: 'Música árabe, judaica, flamenco, metal oriental; sobre acorde maior de tônica.',
      alvo: '1, 3, 5 e 7M; a b2 e a b6 são o tempero.',
      evitar: 'Nenhuma proibida. Em jazz comum, a b2 sobre acorde maior soa estranha se segurada.',
      acordes: 'C7M, C7M(b9/b13)',
      treino: 'Toque b2 → 1 e b6 → 5: esses dois movimentos já soam "orientais".',
      hl: [1, 8, 11]
    },
    napolitana_menor: {
      origem: 'Menor harmônica com a 2ª abaixada.',
      acorde: 'm(7M)',
      som: 'Menor sério e antigo, com a b2 dando um peso extra.',
      carac: 'A b2 dentro de uma escala menor com 7M.',
      uso: 'Música erudita, trilha e metal; sobre acordes menores de tônica.',
      alvo: '1, b3, 5 e 7M.',
      evitar: 'Nenhuma proibida; a b2 pede resolução na tônica.',
      acordes: 'Cm(7M), Cm(7M/b9)',
      treino: 'Compare com a menor harmônica: só muda a 2ª (D → Db).',
      hl: [1, 11]
    },
    napolitana_maior: {
      origem: 'Menor melódica com a 2ª abaixada.',
      acorde: 'm(7M) / m6',
      som: 'Menor sofisticado e flutuante, com a b2 e a 6ª maior.',
      carac: 'A b2 junto com 6ª e 7ª maiores.',
      uso: 'Jazz moderno e música erudita; sobre acordes menores de tônica.',
      alvo: '1, b3, 5, 6 e 7M.',
      evitar: 'Nenhuma. A b2 funciona melhor como nota curta, resolvendo na tônica.',
      acordes: 'Cm6, Cm(7M), Cm6(9)',
      treino: 'Toque a menor melódica e depois esta: a única diferença é a 2ª.',
      hl: [1, 9, 11]
    },
    bebop_melodico: {
      origem: 'Menor melódica + a #5 de passagem (8 notas).',
      acorde: 'm6 / m(7M)',
      som: 'O "encaixe" do bebop aplicado ao menor de jazz.',
      carac: 'A nota cromática entre a 5ª e a 6ª: descendo em colcheias, 1-b3-5-6 caem nos tempos fortes.',
      uso: 'Acordes m6 e m(7M); bebop, jazz.',
      alvo: '1, b3, 5 e 6.',
      evitar: 'A #5 é só passagem, nunca segurada.',
      acordes: 'Cm6, Cm(7M), Cm6(9)',
      treino: 'Desça oito colcheias da tônica e confira que as notas do acorde caem nos tempos.',
      hl: [8]
    },
    bebop_harmonico: {
      origem: 'Menor harmônica + a b7 de passagem (8 notas).',
      acorde: 'm(7M)',
      som: 'Menor dramático com fluência de bebop.',
      carac: 'A b7 cromática entre a b6 e a 7M: descendo, as notas do acorde caem nos tempos fortes.',
      uso: 'Tônica menor no jazz e no choro; também sobre o V7(b9) do tom.',
      alvo: '1, b3, 5 e 7M.',
      evitar: 'A b7 é passagem: segurada, ela desfaz o som da menor harmônica.',
      acordes: 'Cm(7M), Cm(7M/9)',
      treino: 'Desça da tônica em colcheias e emende no V7(b9) do tom.',
      hl: [10, 11]
    },
    aumentada: {
      origem: 'Escala simétrica de 6 notas, alternando 3ª menor e semitom.',
      acorde: '7M(#5) / tríades aumentadas',
      som: 'Misteriosa e "espelhada": o desenho se repete a cada 4 semitons.',
      carac: 'Alterna 1 tom e meio com meio tom; contém duas tríades aumentadas e várias tríades maiores/menores.',
      uso: 'Acordes aumentados e 7M(#5); jazz moderno (Coltrane), trilhas.',
      alvo: '1, 3, #5 e 7M.',
      evitar: 'Não tem 2ª, 4ª nem 5ª justa: é um som deliberadamente "sem chão".',
      acordes: 'C7M(#5), C+, E7M(#5), Ab7M(#5)',
      treino: 'Toque tríades maiores subindo de 4 em 4 semitons (C, E, Ab): todas cabem nela.',
      hl: [3, 4, 8, 11]
    },
    prometheus: {
      origem: 'Escala sintética de 6 notas (Scriabin), com #11 e b7 sem 5ª justa.',
      acorde: '7(#11) sem 5ª',
      som: 'Flutuante e moderna, entre o lídio b7 e os tons inteiros.',
      carac: 'Tem 3ª maior, #11, 13 e b7 — e nenhuma 5ª justa.',
      uso: 'Cor moderna sobre dominantes; impressionismo, jazz moderno, trilhas.',
      alvo: '3, b7, #11 e 13.',
      evitar: '5ª justa e 4ª justa não existem; a escala perde a graça se você as acrescentar.',
      acordes: 'C7(#11), C13(#11)',
      treino: 'Toque em quartas empilhadas: a escala foi feita para esse tipo de sonoridade.',
      hl: [6, 9]
    },
    cromatica: {
      origem: 'Todas as 12 notas, de meio em meio tom.',
      acorde: 'qualquer acorde (como passagem)',
      som: 'Não tem centro: serve como material de passagem e de exercício técnico.',
      carac: 'Todos os intervalos são de meio tom.',
      uso: 'Ligações cromáticas, cercos, exercícios de mecânica e leitura.',
      alvo: 'As notas do acorde do momento — as outras servem para chegar nelas.',
      evitar: 'Nenhuma "proibida", mas parar numa nota fora do acorde soa errado: o cromatismo precisa resolver.',
      acordes: 'qualquer um',
      treino: 'Toque cromático de um tempo para o outro sempre caindo numa nota do acorde no tempo forte.',
      hl: [1, 3, 6, 8, 10]
    },
    pentatonica_dominante: {
      origem: 'Pentatônica maior com a 7ª menor (mixolídia).',
      acorde: '7',
      som: 'A pentatônica "com cara de dominante" — ótima para blues, rock e fusion.',
      carac: 'Troca a 6ª da pentatônica maior pela b7.',
      uso: 'Acordes dominantes (I7 do blues, V7 modal); rock, funk, fusion.',
      alvo: '1, 3, 5 e b7 — a 2ª (9) é a nota de apoio.',
      evitar: 'Nenhuma. Sobre acorde maior com 7M, a b7 soa fora.',
      acordes: 'C7, C9, C13',
      treino: 'Toque essa pentatônica sobre cada acorde do blues: ela se encaixa nos três.',
      hl: [10]
    },
    hirajoshi: {
      origem: 'Pentatônica japonesa, com b3 e b6.',
      acorde: 'm (menor)',
      som: 'Som japonês, contemplativo — dois saltos grandes e dois meios-tons.',
      carac: 'Só 5 notas: 1, 2, b3, 5 e b6.',
      uso: 'Acordes menores; música japonesa, trilha, rock instrumental.',
      alvo: '1, b3 e 5.',
      evitar: 'Nenhuma. A b6 é a cor mais forte — use-a resolvendo na 5ª.',
      acordes: 'Cm, Cm(b13), Cm7',
      treino: 'Toque só as 5 notas em ordem e pare na b6 antes de descer para a 5ª.',
      hl: [3, 8]
    },
    kumoi: {
      origem: 'Pentatônica japonesa, com b3 e 6ª maior.',
      acorde: 'm6 / m7',
      som: 'Japonesa, porém mais clara que a hirajoshi — parece uma pentatônica menor "dórica".',
      carac: 'Tem b3 com 6ª maior e nenhuma 4ª.',
      uso: 'Acordes menores (m6, m7); trilha, jazz modal, música japonesa.',
      alvo: '1, b3, 5 e 6.',
      evitar: 'Nenhuma; a ausência da 4ª e da b7 é o que dá o som limpo.',
      acordes: 'Cm6, Cm7, Cm6(9)',
      treino: 'Toque sobre um vamp de Cm6: cada nota cai bem.',
      hl: [3, 9]
    },
    in_sen: {
      origem: 'Pentatônica japonesa, com b2 e sem 3ª.',
      acorde: 'sus4 / 7sus4(b9)',
      som: 'Suspensa e sombria — sem 3ª, com b2.',
      carac: 'Tem b2 e 4ª, mas nenhuma 3ª: o acorde fica suspenso.',
      uso: 'Acordes sus; música japonesa, trilha, jazz modal.',
      alvo: '1, 4, 5 e b7.',
      evitar: 'A 3ª não existe: acrescentá-la desfaz o caráter suspenso.',
      acordes: 'Csus4, C7sus4(b9), C7/4',
      treino: 'Alterne 1 e b2 e descanse na 4ª: é o som "japonês" imediato.',
      hl: [1]
    },
    iwato: {
      origem: 'Pentatônica japonesa, com b2 e b5.',
      acorde: 'm7(b5) / sus(b9)',
      som: 'A mais tensa das japonesas: b2 e b5 juntas.',
      carac: 'Tem b2, 4ª, b5 e b7 — nenhuma 3ª.',
      uso: 'Acordes meio-diminutos e suspensos; trilha, música japonesa, jazz moderno.',
      alvo: '1, 4, b5 e b7.',
      evitar: 'Nenhuma 3ª nem 5ª justa: é um som deliberadamente instável.',
      acordes: 'Cm7(b5), C7sus4(b9)',
      treino: 'Toque devagar e deixe a b5 soar antes de resolver na 4ª.',
      hl: [1, 6]
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
      alvo: inf.alvo,
      evitar: inf.evitar,
      acordes: inf.acordes,
      treino: inf.treino || null,
      tensoes: inf.tensoes || null
    };
  }

  return { INFO: INFO, formula: formula, stepPattern: stepPattern, get: get };
});
