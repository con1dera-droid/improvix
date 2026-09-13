/**
 * ImprovisaLab — Biblioteca de Fraseados
 *
 * Gera frases (licks) de 1 ou 2 compassos para qualquer escala/modo, em
 * qualquer tom, em vários estilos — Bebop (estilo Parker), Jazz moderno,
 * Blues, Modal/Fusion, Rock/Pentatônica e Baião/Nordestino — com ritmo de
 * verdade (colcheias, tercinas, pausas, nota longa no fim).
 *
 * Nenhuma frase vem pronta de livro: cada uma é CALCULADA combinando
 * "células" de vocabulário (arpejo circular, arpejo 3-5-7-9, escala bebop,
 * grupeto, cerco, passagem cromática, 1-2-3-5, trifonia sus2, tríade de
 * tensão, pentatônica superposta, quartas, blue note...) e depois passa por
 * um filtro de musicalidade (notas do acorde nos tempos fortes, cromatismo
 * sempre resolvendo por semitom/tom, saltos compensados, contorno com um
 * ponto culminante, âmbito confortável, resolução numa nota estável).
 * Para cada frase o motor sorteia dezenas de candidatas e fica com a melhor.
 *
 * Tudo é determinístico por semente: a frase nº 37 de "G mixolídio, bebop,
 * avançado" é sempre a mesma, e dá para pedir quantas páginas quiser.
 *
 * Funciona no navegador (window.IL.library) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var theory = isNode ? require('./theory.js') : root.IL.theory;
  var data = isNode ? require('./data.js') : root.IL.data;
  var phrases = isNode ? require('./phrases.js') : root.IL.phrases;
  var articulation = isNode ? require('./articulation.js') : root.IL.articulation;
  var mod = factory(theory, data, phrases, articulation);
  if (isNode) module.exports = mod;
  root.IL = root.IL || {};
  root.IL.library = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory, DATA, phrasesMod, ART) {
  'use strict';

  var U = phrasesMod.util;
  var LOW = 52, HIGH = 86;

  // ---------------------------------------------------------------------
  // Aleatoriedade com semente (reprodutível)
  // ---------------------------------------------------------------------

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function pickWeighted(rng, pairs) {
    var total = 0, i;
    for (i = 0; i < pairs.length; i++) total += pairs[i][1];
    var r = rng() * total;
    for (i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r <= 0) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }

  function pcOf(name) { return theory.pitchClassOf(name); }
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function N(name, midi) { return { name: name, midi: midi }; }

  // ---------------------------------------------------------------------
  // Tons, escalas e o acorde de cada escala
  // ---------------------------------------------------------------------

  // Ordem do ciclo de 4ªs (como os livros de padrões pedem para estudar).
  var KEYS_CYCLE = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];
  var KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Acorde "natural" de cada escala e, nos dominantes, para onde ele resolve.
  // resolve: [passosDeLetra, semitons] da fundamental do acorde de chegada.
  var MODE_INFO = {
    jonio: { q: 'major7', suffix: '7M' },
    lidio: { q: 'major7', suffix: '7M(#11)' },
    dorico: { q: 'minor7', suffix: 'm7' },
    frigio: { q: 'minor7', suffix: 'm7' },
    eolio: { q: 'minor7', suffix: 'm7' },
    locrio: { q: 'm7b5', suffix: 'm7(b5)' },
    mixolidio: { q: 'dominant7', suffix: '7', resolve: [3, 5], rq: 'major7', rs: '7M' },
    menor_melodica: { q: 'minMaj7', suffix: 'm(7M)' },
    dorico_b2: { q: 'dominant7sus4', suffix: '7/4(b9)', resolve: [3, 5], rq: 'minor7', rs: 'm7' },
    lidio_aumentado: { q: 'augMaj7', suffix: '7M(#5)' },
    lidio_b7: { q: 'dominant7', suffix: '7(#11)', resolve: [-1, -1], rq: 'major7', rs: '7M' },
    mixolidio_b13: { q: 'dominant7', suffix: '7(b13)', resolve: [3, 5], rq: 'minor7', rs: 'm7' },
    locrio_9: { q: 'm7b5', suffix: 'm7(b5)' },
    // no 7alt a 5ª justa não existe: o "arpejo do acorde" usa 1-3-#5(b13)-b7
    alterada: { q: 'dominant7', suffix: '7alt', resolve: [3, 5], rq: 'major7', rs: '7M', tones: [[0, 0], [2, 4], [5, 8], [6, 10]] },
    menor_harmonica: { q: 'minMaj7', suffix: 'm(7M)' },
    frigio_maior: { q: 'dominant7', suffix: '7(b9/b13)', resolve: [3, 5], rq: 'minor7', rs: 'm7' },
    dom_dim: { q: 'dominant7', suffix: '7(b9)', resolve: [3, 5], rq: 'major7', rs: '7M' },
    diminuta: { q: 'dim7', suffix: '°' },
    tons_inteiros: { q: 'dominant7sharp5', suffix: '7(#5)', resolve: [3, 5], rq: 'major7', rs: '7M' },
    bebop_dominante: { q: 'dominant7', suffix: '7', resolve: [3, 5], rq: 'major7', rs: '7M' },
    bebop_maior: { q: 'major6', suffix: '6' },
    bebop_dorico: { q: 'minor7', suffix: 'm7' },
    pentatonica_maior: { q: 'major6', suffix: '6' },
    pentatonica_menor: { q: 'minor7', suffix: 'm7' },
    blues_menor: { q: 'dominant7', suffix: '7' },
    blues_maior: { q: 'dominant7', suffix: '7' }
  };

  var SCALE_GROUPS = [
    { label: 'Modos da escala maior', keys: ['jonio', 'dorico', 'frigio', 'lidio', 'mixolidio', 'eolio', 'locrio'] },
    { label: 'Modos da menor melódica', keys: ['menor_melodica', 'dorico_b2', 'lidio_aumentado', 'lidio_b7', 'mixolidio_b13', 'locrio_9', 'alterada'] },
    { label: 'Menor harmônica', keys: ['menor_harmonica', 'frigio_maior'] },
    { label: 'Simétricas', keys: ['dom_dim', 'diminuta', 'tons_inteiros'] },
    { label: 'Bebop', keys: ['bebop_dominante', 'bebop_maior', 'bebop_dorico'] },
    { label: 'Pentatônicas e blues', keys: ['pentatonica_maior', 'pentatonica_menor', 'blues_menor', 'blues_maior'] }
  ];

  // Grafia do tom: para cada escala escolhe entre os enarmônicos (Db/C#,
  // Gb/F#...) o que gera MENOS acidentes — ninguém quer ler "Bbb" ou "Fbb".
  var ENHARMONIC = { 'Db': 'C#', 'C#': 'Db', 'Eb': 'D#', 'D#': 'Eb', 'Gb': 'F#', 'F#': 'Gb', 'Ab': 'G#', 'G#': 'Ab', 'Bb': 'A#', 'A#': 'Bb', 'B': 'Cb', 'Cb': 'B', 'E': 'Fb', 'Fb': 'E' };
  function accidentalWeight(names) {
    return names.reduce(function (acc, n) {
      var a = n.slice(1);
      return acc + a.length + (a.length > 1 ? 4 : 0);
    }, 0);
  }
  function bestSpelling(tonic, scaleKey) {
    var alt = ENHARMONIC[tonic];
    if (!alt) return tonic;
    var info = MODE_INFO[scaleKey];
    var a = theory.scaleNotes(tonic, scaleKey).concat(theory.chordTones(tonic, info.q));
    var b = theory.scaleNotes(alt, scaleKey).concat(theory.chordTones(alt, info.q));
    if (info.resolve) {
      a.push(theory.noteAt(tonic, info.resolve[0], info.resolve[1]));
      b.push(theory.noteAt(alt, info.resolve[0], info.resolve[1]));
    }
    return accidentalWeight(b) < accidentalWeight(a) ? alt : tonic;
  }

  var FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // Reescreve só o que atrapalha a leitura: dobrados (Abb, D##) e Cb/Fb/E#/B#
  // que não pertencem à própria escala.
  function respell(name, keep) {
    var acc = name.slice(1);
    var odd = acc.length > 1 || ['Cb', 'Fb', 'E#', 'B#'].indexOf(name) >= 0;
    if (!odd || (keep[name] && acc.length === 1)) return name;
    var pc = pcOf(name);
    return (acc.charAt(0) === '#' ? SHARP_NAMES : FLAT_NAMES)[pc];
  }

  var DIATONIC_MODES = ['jonio', 'dorico', 'frigio', 'lidio', 'mixolidio', 'eolio', 'locrio'];

  // ---------------------------------------------------------------------
  // Ritmo
  // ---------------------------------------------------------------------

  var TOKENS = {
    e: { dur: 0.5 }, q: { dur: 1 }, h: { dur: 2 }, dq: { dur: 1.5 }, de: { dur: 0.75 }, s: { dur: 0.25 },
    t: { dur: 1 / 3, triplet: true, tuplet: 3 },
    x: { dur: 1 / 6, triplet: true, tuplet: 6 },
    er: { dur: 0.5, rest: true }, qr: { dur: 1, rest: true }, hr: { dur: 2, rest: true }
  };
  function R(str) { return str.split(' ').map(function (k) { var t = TOKENS[k]; return { dur: t.dur, rest: !!t.rest, triplet: !!t.triplet, tuplet: t.tuplet || null }; }); }

  // ---------------------------------------------------------------------
  // Estilos
  // ---------------------------------------------------------------------

  var STYLES = {
    bebop: {
      label: 'Bebop (estilo Parker)',
      bpm: 132, swing: true, repeatsOk: false, strongChordTones: true,
      rhythms: {
        iniciante: ['q e e q e e', 'e e e e q q'],
        intermediario: ['e e e e e e e e', 'er e e e e e e e', 'e e t t t e e e e'],
        avancado: ['er e e e e e e e', 'e e e e e e e e', 'e e t t t e e e e', 't t t e e e e e e', 'e e e e t t t e e',
          'er e e e e e q', 'e e e e er e e e', 'q er e t t t e e']
      },
      landing: 'h hr',
      cells: [['arpUp', 3], ['arpExtUp', 3], ['scaleDown', 4], ['bebopDown', 5], ['parker', 5], ['turn', 3],
        ['enclose', 4], ['chromPass', 3], ['digital', 2], ['neighbor', 1], ['arpDown', 2], ['tensionTriad', 2]],
      intro: 'Linha de colcheias com swing, notas do acorde nos tempos fortes e cromatismo de passagem'
    },
    jazz: {
      label: 'Jazz moderno',
      bpm: 120, swing: true, repeatsOk: false, strongChordTones: true, extTones: true,
      rhythms: {
        iniciante: ['q e e q e e', 'e e e e q q'],
        intermediario: ['e e e e e e e e', 'q e e e e e e', 'e e t t t e e q'],
        avancado: ['e e e e e e e e', 'q e e e e e e', 'e e t t t e e q', 't t t t t t e e e e', 'er e e e q e e']
      },
      landing: 'h hr',
      cells: [['arpExtUp', 4], ['tensionTriad', 4], ['superPent', 4], ['quartal', 3], ['sus2', 3], ['scaleUp', 2],
        ['enclose', 2], ['scaleDown', 2], ['digital', 2]],
      intro: 'Arpejos a partir da 3ª, tríades de tensão, pentatônicas superpostas e quartas'
    },
    blues: {
      label: 'Blues',
      bpm: 92, swing: true, repeatsOk: true, strongChordTones: false,
      rhythms: {
        iniciante: ['q q e e q', 'e e q q q'],
        intermediario: ['er e e e q e er', 'e e q er e q', 'q t t t e e q', 'er e e e e e q'],
        avancado: ['er e e e q e er', 't t t q t t t e e', 'q t t t e e q', 'er e t t t e e q', 'er e e e e e q']
      },
      landing: 'q qr hr',
      cells: [['pentDown', 4], ['pentGroup3', 3], ['blueSlide', 4], ['bluePass', 3], ['repeat', 2], ['neighbor', 1], ['arpDown', 2]],
      intro: 'Pergunta e resposta, notas repetidas, blue note e a 3ª "escorregando" da menor para a maior'
    },
    modal: {
      label: 'Modal / Fusion',
      bpm: 104, swing: false, repeatsOk: false, strongChordTones: false,
      rhythms: {
        iniciante: ['q e e q e e', 'q q e e q'],
        intermediario: ['e e e e e e e e', 'q e e q e e', 't t t t t t e e q'],
        avancado: ['e e e e e e e e', 't t t t t t e e q', 'q e e q e e', 's s s s s s s s e e q', 'q er e e e e e']
      },
      landing: 'h hr',
      cells: [['sus2', 4], ['quartal', 4], ['charNote', 4], ['scaleUp', 2], ['scaleDown', 2], ['pentGroup3', 2], ['arpUp', 1]],
      intro: 'Trifonias sus2, quartas e a nota característica do modo em evidência'
    },
    rock: {
      label: 'Rock / Pentatônica',
      bpm: 96, swing: false, repeatsOk: true, strongChordTones: false,
      rhythms: {
        iniciante: ['q q e e q', 'e e e e q q'],
        intermediario: ['e e e e e e q', 't t t t t t q q', 'e e q e e q'],
        avancado: ['s s s s s s s s e e q', 't t t t t t t t t q', 'e e e e e e q', 'e e e e er e q']
      },
      landing: 'h hr',
      cells: [['pentGroup3', 5], ['pentDown', 4], ['pentUp', 2], ['repeat', 2], ['bluePass', 2], ['neighbor', 1]],
      intro: 'Pentatônica em grupos de 3 e 4 notas, com repetição e a blue note como passagem'
    },
    fusion: {
      label: 'Fusion — sweep picking (inspirado em Gambale)',
      bpm: 92, swing: false, repeatsOk: false, strongChordTones: true, extTones: true, fusion: true,
      rhythms: {
        iniciante: ['e e e e e e q', 't t t t t t q q'],
        intermediario: ['s s s s s s s s e e q', 't t t t t t t t t q', 's s s s e e s s s s q'],
        avancado: ['x x x x x x x x x x x x s s s s q', 's s s s s s s s s s s s q', 'x x x x x x s s s s x x x x x x q',
          't t t s s s s x x x x x x q', 'er s s s s s s s s s s q']
      },
      landing: 'h hr',
      cells: [['sweepUp', 5], ['sweepDown', 4], ['superSweep', 4], ['threeNps', 5], ['slideShift', 2], ['enclose', 2],
        ['arpExtUp', 2], ['tensionTriad', 1], ['arpUp', 1], ['scaleUp', 1], ['scaleDown', 1]],
      intro: 'Arpejos varridos (uma nota por corda, numa só palhetada), arpejos superpostos do modo, escalas com 3 notas por corda com palhetada econômica e legato, e troca de posição por slide — a linguagem de guitarra fusion associada a Frank Gambale'
    },
    baiao: {
      label: 'Baião / Nordestino',
      bpm: 100, swing: false, repeatsOk: true, strongChordTones: false,
      rhythms: {
        iniciante: ['e q e e q e', 'q e e q e e'],
        intermediario: ['e q e e q e', 'de s e e de s e e', 's e s e e s e s e e'],
        avancado: ['de s e e de s e e', 's e s e e s e s e e', 'e q e e q e']
      },
      landing: 'q qr hr',
      cells: [['scaleDown', 3], ['scaleUp', 3], ['charNote', 4], ['arpUp', 2], ['neighbor', 2], ['repeat', 2]],
      intro: 'Síncope do baião e a nota característica do modo (a b7 do mixolídio, a #4 do lídio b7) bem marcada'
    },
    // Estudo intervalado: a escala tocada em saltos fixos (2ªs, 3ªs, 4ªs...).
    // Não passa pelo sorteio de células — é gerado por intervalPhrase().
    intervalado: {
      label: 'Intervalado (2ªs, 3ªs, 4ªs... na escala)',
      bpm: 96, swing: false, repeatsOk: false, strongChordTones: false,
      rhythms: { iniciante: ['e e e e e e e e'], intermediario: ['e e e e e e e e'], avancado: ['e e e e e e e e'] },
      landing: 'h hr',
      cells: [],
      intro: 'Estudo intervalado: a escala inteira tocada em saltos fixos, para ouvir e digitar cada intervalo dentro do modo',
      intervalic: true
    }
  };

  // ---------------------------------------------------------------------
  // Estilo "Intervalado"
  // ---------------------------------------------------------------------
  var INTERVAL_NAMES = { 2: '2ªs', 3: '3ªs', 4: '4ªs', 5: '5ªs', 6: '6ªs', 7: '7ªs' };
  var INTERVAL_WORD = { 2: 'segundas', 3: 'terças', 4: 'quartas', 5: 'quintas', 6: 'sextas', 7: 'sétimas' };
  // Desenhos: como cada par (ou trio) de notas é tocado enquanto a linha anda
  // pela escala — sobe no 1º compasso e volta no 2º (arco), para caber no braço.
  var INTERVAL_SHAPES = {
    pares: { label: 'em pares (nota de baixo → nota de cima)', min: 0, size: 2 },
    invertido: { label: 'em pares invertidos (nota de cima → nota de baixo)', min: 1, size: 2 },
    alternado: { label: 'alternando a direção a cada par', min: 1, size: 2 },
    empilhado: { label: 'empilhado em grupos de 3 (tercinas)', min: 2, size: 3 }
  };
  var SHAPE_ORDER = ['pares', 'invertido', 'alternado', 'empilhado'];

  /** Frase intervalada nº i. opts.interval: 2..7 ou 'todos'. */
  function intervalPhrase(c, i, level, bars, interval, tonic) {
    var lv = LEVEL_IDX[level];
    var allowed = level === 'iniciante' ? [2, 3] : (level === 'intermediario' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7]);
    var iv = interval && interval !== 'todos' ? Number(interval) : allowed[i % allowed.length];
    var shapes = SHAPE_ORDER.filter(function (k) { return INTERVAL_SHAPES[k].min <= lv; });
    var cycleLen = interval && interval !== 'todos' ? 1 : allowed.length;
    var shapeKey = shapes[Math.floor(i / cycleLen) % shapes.length];
    if (shapeKey === 'empilhado' && iv >= 6) shapeKey = 'alternado'; // 6ªs/7ªs empilhadas passariam de duas oitavas
    var shape = INTERVAL_SHAPES[shapeKey];
    var descending = Math.floor(i / (cycleLen * shapes.length)) % 2 === 1; // metade das frases começa descendo
    var ladder = c.scale;
    var nScale = c.scaleNames.length;
    var k = Math.min(iv - 1, nScale - 1); // passos na escala (em pentatônicas o salto é limitado)
    var perBar = shape.size === 3 ? 4 : 4; // 4 grupos por compasso
    var groups = bars * perBar;
    // grau de partida: fundamental na região média
    var rootIdx = 0, best = Infinity;
    ladder.forEach(function (n, idx) {
      if (pcOf(n.name) === pcOf(c.root)) { var d = Math.abs(n.midi - (descending ? 74 : 62)); if (d < best) { best = d; rootIdx = idx; } }
    });
    var seq = [];
    for (var g = 0; g < groups; g++) {
      // arco: sobe no 1º compasso e volta no 2º (ou o contrário, se descendo)
      var pos = bars === 2 ? (g <= perBar ? g : 2 * perBar - g) : g; // 0 1 2 3 4 3 2 1
      var base = rootIdx + (descending ? -pos : pos);
      var idxs;
      if (shape.size === 3) idxs = [base, base + k, base + 2 * k];
      else if (shapeKey === 'pares' && k === 1) idxs = [base + 1, base]; // 2ªs "em pares" repetiriam nota: desce o par
      else if (shapeKey === 'pares') idxs = [base, base + k];
      else if (shapeKey === 'invertido') idxs = [base + k, base];
      else idxs = g % 2 === 0 ? [base, base + k] : [base + k, base];
      if (descending && shape.size === 3) idxs = idxs.reverse();
      // nunca repete a nota que acabou de tocar: inverte o grupo se precisar
      if (seq.length && (idxs[0] - seq[seq.length - 1]) % nScale === 0) idxs = idxs.slice().reverse();
      idxs.forEach(function (ix) { seq.push(ix); });
    }
    // encaixa no âmbito: desloca por oitavas (nScale passos) se precisar
    var shift = 0;
    function mid(ix) { var j = Math.max(0, Math.min(ladder.length - 1, ix + shift)); return ladder[j].midi; }
    for (var tries = 0; tries < 4; tries++) {
      var lo = Math.min.apply(null, seq.map(mid)), hi = Math.max.apply(null, seq.map(mid));
      if (lo < LOW + 3) shift += nScale; else if (hi > HIGH - 2) shift -= nScale; else break;
    }
    var dur = shape.size === 3 ? 1 / 3 : 0.5;
    var events = [];
    var onset = 0;
    seq.forEach(function (ix) {
      var n = ladder[Math.max(0, Math.min(ladder.length - 1, ix + shift))];
      var ev = { name: n.name, midi: n.midi, dur: dur, onset: onset, triplet: dur < 0.4 };
      if (dur < 0.4) ev.tuplet = 3;
      events.push(ev);
      onset += dur;
    });
    // chegada: a nota do acorde de chegada mais próxima da última nota
    var land = c.resolve || { root: c.root, tones: c.tones };
    var lastMidi = events[events.length - 1].midi;
    var target = null, bd = Infinity;
    U.buildLadder(land.tones).forEach(function (n) {
      var d = Math.abs(n.midi - lastMidi);
      if (d === 0) d = 6; // prefere mover-se
      if (d < bd && n.midi >= LOW && n.midi <= HIGH) { bd = d; target = n; }
    });
    events.push({ name: target.name, midi: target.midi, dur: 2, onset: onset, triplet: false, landing: true });
    events.push({ rest: true, dur: 2, onset: onset + 2, triplet: false });
    var seven = nScale === 7;
    var example = seq.slice(0, shape.size * 2).map(function (ix) { return ladder[Math.max(0, Math.min(ladder.length - 1, ix + shift))].name; });
    var ivLabel = seven ? INTERVAL_NAMES[iv] : 'saltos de ' + k + ' nota' + (k > 1 ? 's' : '') + ' da escala';
    var explanation = 'A escala ' + DATA.SCALES[c.scaleKey].label.toLowerCase() + ' de ' + tonic + ' tocada em ' +
      (seven ? INTERVAL_WORD[iv] + ' diatônicas' : ivLabel) + ', ' + shape.label + (bars === 2 ? (descending ? ', descendo e voltando (arco)' : ', subindo e voltando (arco)') : (descending ? ', descendo' : ', subindo')) +
      ': ' + example.join('–') + '… ' + (seven ? 'Cada salto fica dentro do modo, então o tamanho exato muda (' +
      (iv === 3 ? 'terças maiores e menores' : iv === 4 ? 'quartas justas e a aumentada/diminuta' : iv === 5 ? 'quintas justas e a diminuta' : iv === 2 ? 'tons e semitons' : iv === 6 ? 'sextas maiores e menores' : 'sétimas maiores e menores') +
      ') — é isso que treina o ouvido para o som do modo.' : 'Como a escala não tem 7 notas, o salto é contado em notas da escala.') + ' No fim repousa em ' + target.name + ', nota do ' + (c.resolve ? c.resolve.symbol : c.symbol) + '.';
    return { events: events, target: target, interval: iv, shapeKey: shapeKey, ivLabel: ivLabel, explanation: explanation };
  }

  // Nível mínimo de cada célula.
  var CELL_LEVEL = {
    arpUp: 0, arpDown: 0, scaleDown: 0, scaleUp: 0, neighbor: 0, pentDown: 0, pentUp: 0, repeat: 0, charNote: 0,
    turn: 1, enclose: 1, digital: 1, sus2: 1, pentGroup3: 1, arpExtUp: 1, blueSlide: 1, bluePass: 1, chromPass: 1,
    parker: 2, tensionTriad: 2, quartal: 2, superPent: 2, bebopDown: 2, stepToTone: 0,
    sweepUp: 1, sweepDown: 1, threeNps: 1, slideShift: 1, superSweep: 2,
    digital1243: 1, digital1324: 1, digital1352: 1, arp7grau: 2, quintas: 1
  };
  var LEVEL_IDX = { iniciante: 0, intermediario: 1, avancado: 2 };

  var CELL_LABEL = {
    arpUp: 'arpejo ascendente', arpDown: 'arpejo descendente', scaleDown: 'escala descendo por grau', scaleUp: 'escala subindo por grau',
    neighbor: 'bordadura (nota vizinha)', pentDown: 'pentatônica descendo', pentUp: 'pentatônica subindo', repeat: 'nota repetida',
    charNote: 'nota característica do modo', turn: 'grupeto (volta em torno da nota)', enclose: 'cerco a uma nota do acorde',
    digital: 'célula 1-2-3-5', sus2: 'trifonia sus2 (1-2-5)', pentGroup3: 'pentatônica em grupos de 3', arpExtUp: 'arpejo com a 9ª (estrutura superior)',
    blueSlide: 'blue note: 3ª menor escorregando para a maior', bluePass: 'blue note (b5) de passagem', chromPass: 'passagem cromática',
    parker: 'arpejo circular (Parker)', tensionTriad: 'tríade de tensão', quartal: 'arpejo em quartas', superPent: 'pentatônica superposta',
    digital1243: 'célula 1-2-4-3', digital1324: 'célula 1-3-2-4', digital1352: 'célula 1-3-5-2',
    arp7grau: 'arpejo de 7ª nascendo no grau', quintas: 'quintas diatônicas',
    bebopDown: 'escala bebop descendente', stepToTone: 'passo até a nota do acorde',
    sweepUp: 'arpejo varrido subindo (sweep, uma nota por corda)', sweepDown: 'arpejo varrido descendo (sweep)',
    threeNps: 'escala com 3 notas por corda (palhetada econômica/legato)', slideShift: 'slide para trocar de posição',
    superSweep: 'arpejo superposto varrido'
  };

  // Roteiros: desenhos de frase típicos de cada estilo (arco sobe-e-desce,
  // cerco + arpejo, arpejo circular encadeado, grupeto + escala...). A
  // semente escolhe o roteiro e os detalhes; o filtro escolhe a melhor versão.
  // start: região em que a frase começa (low/mid/high).
  var ROTEIROS = {
    bebop: [
      { cells: ['arpUp', 'bebopDown'], start: 'low' },
      { cells: ['arpExtUp', 'scaleDown', 'stepToTone'], start: 'low' },
      { cells: ['bebopDown', 'arpUp'], start: 'high' },
      { cells: ['enclose', 'arpExtUp', 'scaleDown'], start: 'mid' },
      { cells: ['parker', 'stepToTone', 'parker'], start: 'high' },
      { cells: ['turn', 'bebopDown'], start: 'high' },
      { cells: ['turn', 'scaleDown', 'arpUp'], start: 'mid' },
      { cells: ['tensionTriad', 'scaleDown', 'stepToTone'], start: 'mid' },
      { cells: ['digital', 'scaleDown', 'chromPass'], start: 'low' },
      { cells: ['arpUp', 'scaleDown', 'chromPass'], start: 'low' },
      { cells: ['scaleDown', 'arpUp', 'neighbor'], start: 'high' },
      { cells: ['digital1243', 'scaleDown', 'chromPass'], start: 'low' },
      { cells: ['enclose', 'digital1324', 'stepToTone'], start: 'mid' },
      { cells: ['digital1352', 'enclose'], start: 'low' },
      { cells: ['arp7grau', 'scaleDown', 'chromPass'], start: 'low' }
    ],
    jazz: [
      { cells: ['arpExtUp', 'superPent'], start: 'low' },
      { cells: ['tensionTriad', 'scaleDown'], start: 'mid' },
      { cells: ['quartal', 'scaleDown', 'sus2'], start: 'low' },
      { cells: ['sus2', 'sus2', 'scaleDown'], start: 'low' },
      { cells: ['superPent', 'enclose'], start: 'high' },
      { cells: ['arpExtUp', 'scaleDown', 'digital'], start: 'low' },
      { cells: ['arpUp', 'scaleDown', 'arpUp'], start: 'low' },
      { cells: ['arp7grau', 'scaleDown', 'sus2'], start: 'low' },
      { cells: ['digital1352', 'scaleDown', 'enclose'], start: 'low' },
      { cells: ['quintas', 'scaleDown'], start: 'low' }
    ],
    blues: [
      { cells: ['blueSlide', 'pentDown', 'repeat'], start: 'mid' },
      { cells: ['pentGroup3'], start: 'high' },
      { cells: ['bluePass', 'pentDown'], start: 'mid' },
      { cells: ['repeat', 'blueSlide', 'arpDown'], start: 'mid' },
      { cells: ['pentDown', 'repeat', 'neighbor'], start: 'high' }
    ],
    modal: [
      { cells: ['sus2', 'sus2', 'charNote'], start: 'low' },
      { cells: ['quartal', 'scaleDown'], start: 'low' },
      { cells: ['charNote', 'scaleUp', 'quartal'], start: 'mid' },
      { cells: ['pentGroup3', 'charNote'], start: 'high' },
      { cells: ['scaleUp', 'charNote', 'scaleDown'], start: 'low' },
      { cells: ['quintas', 'charNote'], start: 'low' },
      { cells: ['digital1324', 'scaleDown', 'charNote'], start: 'mid' }
    ],
    rock: [
      { cells: ['pentGroup3', 'pentDown'], start: 'high' },
      { cells: ['repeat', 'pentDown', 'bluePass'], start: 'high' },
      { cells: ['pentUp', 'pentGroup3'], start: 'low' },
      { cells: ['pentDown', 'repeat', 'pentUp'], start: 'high' }
    ],
    fusion: [
      { cells: ['sweepUp', 'threeNps'], start: 'low' },
      { cells: ['threeNps', 'sweepDown'], start: 'high' },
      { cells: ['superSweep', 'slideShift', 'threeNps'], start: 'low' },
      { cells: ['threeNps', 'slideShift', 'sweepUp'], start: 'low' },
      { cells: ['sweepUp', 'sweepDown', 'enclose'], start: 'low' },
      { cells: ['superSweep', 'sweepDown'], start: 'low' },
      { cells: ['sweepUp', 'slideShift', 'sweepDown'], start: 'low' },
      { cells: ['arp7grau', 'threeNps'], start: 'low' },
      { cells: ['digital1352', 'sweepUp'], start: 'low' },
      { cells: ['quintas', 'threeNps'], start: 'low' }
    ],
    baiao: [
      { cells: ['charNote', 'scaleDown', 'repeat'], start: 'mid' },
      { cells: ['arpUp', 'scaleDown', 'charNote'], start: 'low' },
      { cells: ['digital1243', 'scaleDown', 'charNote'], start: 'low' },
      { cells: ['repeat', 'neighbor', 'scaleDown'], start: 'high' },
      { cells: ['scaleUp', 'charNote', 'scaleDown'], start: 'low' }
    ]
  };

  // ---------------------------------------------------------------------
  // Contexto da frase
  // ---------------------------------------------------------------------

  function hasMajorThird(names, root) { var p = mod12(pcOf(root) + 4); return names.some(function (n) { return pcOf(n) === p; }); }

  // A pentatônica usada nas células fica dentro da escala escolhida (no blues
  // e no rock a blue note continua valendo); se sobrar pouca coisa, usa a escala.
  function pentInScale(pentNames, scaleNames, style) {
    if (style === 'blues' || style === 'rock') return pentNames;
    var pcs = scaleNames.map(pcOf);
    var inside = pentNames.filter(function (n) { return pcs.indexOf(pcOf(n)) >= 0; });
    return inside.length >= 4 ? inside : scaleNames;
  }

  function buildCtx(root, scaleKey, style, level) {
    var info = MODE_INFO[scaleKey];
    var tones = info.tones
      ? info.tones.map(function (iv) { return theory.noteAt(root, iv[0], iv[1]); })
      : theory.chordTones(root, info.q);
    var scaleNames = theory.scaleNotes(root, scaleKey);
    var scaleL = U.buildLadder(scaleNames);
    var ninth = null;
    scaleNames.forEach(function (n) { if (mod12(pcOf(n) - pcOf(root)) === 2) ninth = n; });
    var extNames = tones.slice();
    if (ninth && extNames.indexOf(ninth) < 0) extNames.push(ninth);
    var bebopKey = DATA.BEBOP_FOR_SCALE[scaleKey] || (scaleKey.indexOf('bebop') === 0 ? scaleKey : null);
    var pentKey = hasMajorThird(scaleNames, root) ? 'pentatonica_maior' : 'pentatonica_menor';
    if (style === 'blues' || style === 'rock') {
      pentKey = (info.q.indexOf('dominant') === 0 || !hasMajorThird(scaleNames, root)) ? 'blues_menor' : 'blues_maior';
    }
    var chordSym = { root: root, quality: info.q, tones: tones };
    var sp = level === 'avancado' ? U.superPentFor(chordSym, scaleKey) : null;
    var charEntry = DATA.CHARACTERISTIC_NOTE[scaleKey];
    var resolve = null;
    if (info.resolve) {
      var rRoot = theory.noteAt(root, info.resolve[0], info.resolve[1]);
      resolve = { root: rRoot, quality: info.rq, symbol: rRoot + info.rs, tones: theory.chordTones(rRoot, info.rq) };
    }
    var tonePcs = tones.map(pcOf);
    var extPcs = extNames.map(pcOf);
    var scalePcs = scaleNames.map(pcOf);
    return {
      root: root, scaleKey: scaleKey, info: info, style: style, level: level,
      symbol: root + info.suffix,
      tones: tones, scaleNames: scaleNames,
      scale: scaleL,
      arp: U.buildLadder(tones),
      arpExt: U.buildLadder(extNames),
      bebop: bebopKey ? U.buildLadder(theory.scaleNotes(root, bebopKey)) : null,
      bebopKey: bebopKey,
      pentKey: pentKey,
      pent: U.buildLadder(pentInScale(theory.scaleNotes(root, pentKey), scaleNames, style)),
      superPent: sp,
      charName: charEntry ? theory.noteAt(root, charEntry[0][0], charEntry[0][1]) : null,
      charLabel: charEntry ? charEntry[1] : null,
      resolve: resolve,
      isTone: function (m) { return tonePcs.indexOf(mod12(m)) >= 0; },
      isExt: function (m) { return extPcs.indexOf(mod12(m)) >= 0; },
      inScale: function (m) { return scalePcs.indexOf(mod12(m)) >= 0; }
    };
  }

  // ---------------------------------------------------------------------
  // Células de vocabulário: recebem a última nota e devolvem as seguintes
  // (ou null se não se aplicam naquele ponto).
  // ---------------------------------------------------------------------

  function run(ladder, from, dir, n) {
    var out = [], cur = from;
    for (var i = 0; i < n; i++) { cur = U.stepFrom(ladder, cur.midi, dir); out.push(cur); }
    return out;
  }

  function nextGroupId(meta) { meta.groups = (meta.groups || 0) + 1; return meta.groups; }

  // Sweep: notas do arpejo, uma por corda, numa direção; no topo pode ter
  // hammer-on + pull-off na mesma corda (o "virar" do arpejo).
  function sweep(ladder, last, dir, rng, meta) {
    var id = nextGroupId(meta);
    var k = 3 + Math.floor(rng() * 3);
    var out = [], cur = last;
    for (var i = 0; i < k; i++) {
      cur = U.stepFrom(ladder, cur.midi, dir);
      var n = N(cur.name, cur.midi);
      n.tabHint = { sweep: id, dir: dir };
      out.push(n);
    }
    if (dir > 0 && rng() < 0.65) {
      var top = U.stepFrom(ladder, cur.midi, 1);
      if (top.midi - cur.midi <= 5) {
        var h = N(top.name, top.midi); h.art = 'h'; h.tabHint = { sweep: id, dir: dir };
        out.push(h);
        if (rng() < 0.7) { var p = N(cur.name, cur.midi); p.art = 'p'; p.tabHint = { sweep: id, dir: -1 }; out.push(p); }
      }
    }
    meta.sweeps = (meta.sweeps || 0) + 1;
    return out;
  }

  // "Pensar o modo como arpejos": o arpejo de 7ª construído sobre a 3ª, a 5ª
  // ou a 7ª da escala (ex.: sobre C7M/jônio → Em7, G7, Bm7(b5); sobre
  // Dm7/dórico → F7M, Am7, C7).
  var DEGREE_NAME = { 2: '3ª', 4: '5ª', 6: '7ª' };
  function chordSymbolFromNames(names) {
    var r = pcOf(names[0]);
    var iv = names.map(function (n) { return mod12(pcOf(n) - r); });
    var third = iv[1], fifth = iv[2], sev = iv[3];
    var q = '';
    if (third === 4 && fifth === 7) q = sev === 11 ? '7M' : (sev === 10 ? '7' : '');
    else if (third === 3 && fifth === 7) q = sev === 10 ? 'm7' : (sev === 11 ? 'm(7M)' : 'm');
    else if (third === 3 && fifth === 6) q = sev === 10 ? 'm7(b5)' : '°';
    else if (third === 4 && fifth === 8) q = '7M(#5)';
    else q = '(' + iv.join('-') + ')';
    return names[0] + q;
  }
  function superArpeggio(c, rng) {
    if (c.scaleNames.length !== 7) return null;
    var d = pick(rng, [2, 4, 6]);
    var names = [0, 2, 4, 6].map(function (k) { return c.scaleNames[(d + k) % 7]; });
    return { names: names, symbol: chordSymbolFromNames(names), degree: DEGREE_NAME[d], ladder: U.buildLadder(names) };
  }

  var CELLS = {
    arpUp: function (c, last, rng) { return run(c.arp, last, 1, 2 + Math.floor(rng() * 2)); },
    arpDown: function (c, last, rng) { return run(c.arp, last, -1, 2 + Math.floor(rng() * 2)); },
    arpExtUp: function (c, last) {
      if (!c.isTone(last.midi)) return null;
      return run(c.arpExt, last, 1, 3);
    },
    scaleDown: function (c, last, rng) { return run(c.scale, last, -1, 2 + Math.floor(rng() * 3)); },
    scaleUp: function (c, last, rng) { return run(c.scale, last, 1, 2 + Math.floor(rng() * 3)); },
    bebopDown: function (c, last, rng) {
      if (!c.bebop || !c.isTone(last.midi)) return null;
      return run(c.bebop, last, -1, 3 + Math.floor(rng() * 3));
    },
    parker: function (c, last) {
      if (DIATONIC_MODES.indexOf(c.scaleKey) < 0 && c.scaleKey.indexOf('bebop') !== 0) return null;
      if (!c.isTone(last.midi)) return null;
      var down = last.midi > 64;
      var p1 = down ? U.stepFrom(c.scale, last.midi, -5) : U.stepFrom(c.scale, last.midi, 2);
      return [p1, U.stepFrom(c.scale, p1.midi, 2), U.stepFrom(c.scale, p1.midi, 4)];
    },
    turn: function (c, last) {
      var up = U.stepFrom(c.scale, last.midi, 1);
      var low = c.level === 'iniciante' ? U.stepFrom(c.scale, last.midi, -1) : U.chromBelow(last);
      return [up, last, low, last];
    },
    neighbor: function (c, last) { return [U.stepFrom(c.scale, last.midi, 1), last]; },
    enclose: function (c, last, rng) {
      var target = U.stepFrom(c.arp, last.midi, rng() < 0.5 ? 1 : -1);
      if (Math.abs(target.midi - last.midi) > 7) return null;
      var above = U.stepFrom(c.scale, target.midi, 1);
      if (above.midi - target.midi > 2 || (c.level === 'avancado' && rng() < 0.4)) above = U.chromAbove(target);
      var below = U.chromBelow(target);
      if (above.midi === last.midi) return [below, target];
      return [above, below, target];
    },
    chromPass: function (c, last) {
      var ct = U.stepFrom(c.arp, last.midi, -1);
      var d = last.midi - ct.midi;
      if (d === 2) return [N(theory.noteAt(ct.name, 1, 1), ct.midi + 1), ct];
      if (d === 3) {
        var mid = U.stepFrom(c.scale, last.midi, -1);
        if (mid.midi === last.midi - 1 || mid.midi === last.midi - 2) {
          return mid.midi === ct.midi + 1 ? [mid, ct] : [mid, N(theory.noteAt(ct.name, 1, 1), ct.midi + 1), ct];
        }
      }
      return null;
    },
    digital: function (c, last) {
      var rel = mod12(last.midi - pcOf(c.root));
      if (rel !== 0 && rel !== 7) return null;
      return [U.stepFrom(c.scale, last.midi, 1), U.stepFrom(c.scale, last.midi, 2), U.stepFrom(c.scale, last.midi, 4)];
    },
    sus2: function (c, last) {
      if (c.scaleNames.length !== 7) return null;
      return [U.stepFrom(c.scale, last.midi, 1), U.stepFrom(c.scale, last.midi, 4)];
    },
    // ---- células dos métodos clássicos de padrões (1-2-4-3, 1-3-2-4, 1-3-5-2,
    // arpejo de 7ª por grau e quintas diatônicas) ----
    digital1243: function (c, last) {
      if (c.scaleNames.length !== 7) return null;
      return [U.stepFrom(c.scale, last.midi, 1), U.stepFrom(c.scale, last.midi, 3), U.stepFrom(c.scale, last.midi, 2)];
    },
    digital1324: function (c, last) {
      if (c.scaleNames.length !== 7) return null;
      return [U.stepFrom(c.scale, last.midi, 2), U.stepFrom(c.scale, last.midi, 1), U.stepFrom(c.scale, last.midi, 3)];
    },
    digital1352: function (c, last) {
      if (c.scaleNames.length !== 7) return null;
      return [U.stepFrom(c.scale, last.midi, 2), U.stepFrom(c.scale, last.midi, 4), U.stepFrom(c.scale, last.midi, 1)];
    },
    arp7grau: function (c, last) {
      // 1-3-5-7 nascendo no grau onde a linha está (cada grupo é um acorde do
      // campo harmônico da escala)
      if (c.scaleNames.length !== 7) return null;
      return [U.stepFrom(c.scale, last.midi, 2), U.stepFrom(c.scale, last.midi, 4), U.stepFrom(c.scale, last.midi, 6)];
    },
    quintas: function (c, last, rng) {
      if (c.scaleNames.length !== 7) return null;
      var dir = rng() < 0.6 ? 1 : -1;
      var a = U.stepFrom(c.scale, last.midi, dir * 4);
      var b = U.stepFrom(c.scale, last.midi, dir);
      return [a, b, U.stepFrom(c.scale, b.midi, dir * 4)];
    },
    tensionTriad: function (c, last) {
      var offs = U.TENSION_ARPEGGIO[c.scaleKey];
      if (!offs) return null;
      var r = pcOf(c.root);
      var pcs = offs.map(function (o) { return mod12(r + o); });
      var t1 = U.findPc(c.scale, last.midi, pcs[0], 1) || U.findPc(c.scale, last.midi, pcs[0], -1);
      if (!t1 || Math.abs(t1.midi - last.midi) > 5) t1 = U.findPc(c.scale, last.midi, pcs[0], -1);
      if (!t1) return null;
      var t2 = U.findPc(c.scale, t1.midi, pcs[1], 1);
      var t3 = t2 ? U.findPc(c.scale, t2.midi, pcs[2], 1) : null;
      if (!t2 || !t3) return null;
      return [t1, t2, t3];
    },
    superPent: function (c, last, rng) {
      if (!c.superPent) return null;
      var L = c.superPent.ladder;
      var dir = rng() < 0.5 ? 1 : -1;
      return run(L, last, dir, 3 + Math.floor(rng() * 2));
    },
    quartal: function (c, last, rng) {
      // pilha de 4ªs JUSTAS dentro da escala (o "bloco quartal")
      var dir = rng() < 0.6 ? 1 : -1;
      var a = U.findPc(c.scale, last.midi + 5 * dir - dir, mod12(last.midi + 5 * dir), dir);
      if (!a || Math.abs(a.midi - last.midi) !== 5) return null;
      var b = U.findPc(c.scale, a.midi + 5 * dir - dir, mod12(a.midi + 5 * dir), dir);
      if (!b || Math.abs(b.midi - a.midi) !== 5) return [a];
      return [a, b];
    },
    pentDown: function (c, last, rng) { return run(c.pent, last, -1, 2 + Math.floor(rng() * 3)); },
    pentUp: function (c, last, rng) { return run(c.pent, last, 1, 2 + Math.floor(rng() * 3)); },
    pentGroup3: function (c, last) {
      var a0 = U.nearestInLadder(c.pent, last.midi);
      var a1 = U.stepFrom(c.pent, a0.midi, -1), a2 = U.stepFrom(c.pent, a1.midi, -1), a3 = U.stepFrom(c.pent, a2.midi, -1);
      var seq = a0.midi === last.midi ? [a1, a2, a1, a2, a3] : [a0, a1, a2, a1, a2, a3];
      return seq;
    },
    blueSlide: function (c, last) {
      if (!hasMajorThird(c.tones, c.root)) return null;
      var third = theory.noteAt(c.root, 2, 4);
      var t = N(third, 0);
      var best = null;
      for (var o = 3; o <= 7; o++) { var m = o * 12 + pcOf(third); if (Math.abs(m - last.midi) <= 6 && (!best || Math.abs(m - last.midi) < Math.abs(best - last.midi))) best = m; }
      if (best === null) return null;
      t.midi = best;
      var b3 = N(theory.noteAt(c.root, 2, 3), best - 1);
      var r = U.stepFrom(c.arp, best, -1);
      return [b3, t, r];
    },
    bluePass: function (c, last, rng) {
      var r = pcOf(c.root);
      var four = U.findPc(c.scale, last.midi + 7, mod12(r + 5), -1) || U.findPc(c.pent, last.midi + 7, mod12(r + 5), -1);
      if (!four || Math.abs(four.midi - last.midi) > 7) return null;
      var b5 = N(theory.noteAt(c.root, 4, 6), four.midi + 1);
      var five = N(theory.noteAt(c.root, 4, 7), four.midi + 2);
      return rng() < 0.5 ? [four, b5, five] : [five, b5, four];
    },
    repeat: function (c, last) { return [last]; },

    // ---- Fusion (sweep picking, 3 notas por corda, slides) ----
    sweepUp: function (c, last, rng, meta) { return sweep(c.arp, last, 1, rng, meta); },
    sweepDown: function (c, last, rng, meta) { return sweep(c.arp, last, -1, rng, meta); },
    superSweep: function (c, last, rng, meta) {
      var sup = superArpeggio(c, rng);
      if (!sup) return null;
      meta.superArp = meta.superArp || sup;
      return sweep(sup.ladder, last, 1, rng, meta);
    },
    threeNps: function (c, last, rng, meta) {
      if (c.scaleNames.length < 7) return null;
      var dir = last.midi > 66 ? -1 : 1;
      var groups = 2 + (rng() < 0.4 ? 1 : 0);
      var legato = rng() < 0.55;
      var id = nextGroupId(meta);
      var out = [], cur = last;
      for (var i = 0; i < groups * 3; i++) {
        cur = U.stepFrom(c.scale, cur.midi, dir);
        var n = N(cur.name, cur.midi);
        n.tabHint = { nps3: id, pos: i % 3 };
        if (legato && i % 3 > 0) n.art = dir > 0 ? 'h' : 'p';
        out.push(n);
      }
      meta.legato = meta.legato || legato;
      return out;
    },
    slideShift: function (c, last, rng) {
      var n = U.stepFrom(c.scale, last.midi, rng() < 0.5 ? 2 : -2);
      if (Math.abs(n.midi - last.midi) > 5) return null;
      var o = N(n.name, n.midi);
      o.art = 'sl';
      return [o];
    },
    stepToTone: function (c, last, rng) {
      var d = U.stepFrom(c.scale, last.midi, -1), u = U.stepFrom(c.scale, last.midi, 1);
      if (c.isTone(d.midi) && (!c.isTone(u.midi) || rng() < 0.6)) return [d];
      if (c.isTone(u.midi)) return [u];
      return null;
    },
    charNote: function (c, last) {
      if (!c.charName) return null;
      var ch = U.findPc(c.scale, last.midi - 7, pcOf(c.charName), 1);
      if (!ch || Math.abs(ch.midi - last.midi) > 7 || ch.midi === last.midi) return null;
      var low = U.stepFrom(c.scale, ch.midi, -1);
      return [ch, low, ch];
    }
  };

  // ---------------------------------------------------------------------
  // Aproximação da nota de chegada
  // ---------------------------------------------------------------------

  var APPROACH_LEVEL = {
    iniciante: ['grau'],
    intermediario: ['grau', 'crom', 'cerco'],
    avancado: ['cerco', 'crom', 'cercoCrom', 'duplaCrom', 'grau']
  };
  // O som modal pede o modo "puro": sem cromatismo na chegada.
  var MODAL_APPROACH = ['grau', 'grau2'];
  var APPROACH_LABEL = {
    grau: 'chega por grau conjunto', grau2: 'chega por grau conjunto, sem sair do modo', crom: 'chega por cromatismo (meio tom abaixo)',
    cerco: 'faz um cerco (nota da escala por cima e cromática por baixo)',
    cercoCrom: 'faz um cerco cromático (meio tom acima e abaixo)', duplaCrom: 'chega por aproximação cromática dupla'
  };

  function approachNotes(kind, c, prev, t) {
    var above = prev.midi > t.midi;
    // No blues/rock, a nota meio tom abaixo da 3ª maior é a 3ª menor (blue note), não a #2.
    if ((c.style === 'blues' || c.style === 'rock') && mod12(t.midi - pcOf(c.root)) === 4 && (kind === 'crom' || kind === 'cerco')) {
      var b3 = N(theory.noteAt(c.root, 2, 3), t.midi - 1);
      return kind === 'crom' ? [U.stepFrom(c.scale, t.midi, -2), b3] : [U.stepFrom(c.scale, t.midi, 1), b3];
    }
    switch (kind) {
      case 'grau': return [U.stepFrom(c.scale, t.midi, above ? 1 : -1)];
      case 'grau2': return [U.stepFrom(c.scale, t.midi, above ? 2 : -2), U.stepFrom(c.scale, t.midi, above ? 1 : -1)];
      case 'crom': return [U.stepFrom(c.scale, t.midi, -2), U.chromBelow(t)];
      case 'cerco': {
        var up = U.stepFrom(c.scale, t.midi, 1);
        if (up.midi - t.midi > 2) up = U.chromAbove(t);
        return [up, U.chromBelow(t)];
      }
      case 'cercoCrom': return above ? [U.chromBelow(t), U.chromAbove(t)] : [U.chromAbove(t), U.chromBelow(t)];
      case 'duplaCrom': return above ? [U.chromAbove2(t), U.chromAbove(t)] : [U.chromBelow2(t), U.chromBelow(t)];
      default: return null;
    }
  }

  // ---------------------------------------------------------------------
  // Geração de uma frase candidata
  // ---------------------------------------------------------------------

  function landingChoices(c) {
    var ch = c.resolve || { root: c.root, tones: c.tones, quality: c.info.q, symbol: c.symbol };
    var t = ch.tones;
    var ninth = theory.noteAt(ch.root, 1, 2);
    if (ch.quality === 'dim7') return [[t[1], 3], [t[0], 2]];
    if (ch.quality === 'm7b5') return [[t[1], 4], [t[3], 2]];
    var list = [[t[1], 5], [t[2], 3], [ninth, 2]];
    if (!c.resolve) list.push([t[0], 1]);
    if (ch.quality === 'major6' && t[3]) list.push([t[3], 2]);
    return list;
  }

  function placeNear(name, midi) {
    var pc = pcOf(name), best = null;
    for (var o = 3; o <= 7; o++) {
      var m = o * 12 + pc;
      if (m < LOW || m > HIGH) continue;
      if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
    }
    return N(name, best === null ? 60 + pc : best);
  }

  function allowedRoteiros(style, level) {
    return (ROTEIROS[style] || []).filter(function (r) {
      return r.cells.every(function (k) { return CELL_LEVEL[k] <= LEVEL_IDX[level]; });
    });
  }

  function candidate(c, style, level, bars, rng, forced) {
    var st = STYLES[style];
    var rhythmList = st.rhythms[level] || st.rhythms.avancado;
    var slots = [];
    var rhythmNames = [];
    for (var b = 0; b < bars; b++) {
      var rn = pick(rng, rhythmList);
      rhythmNames.push(rn);
      slots = slots.concat(R(rn));
    }
    var landing = R(st.landing);
    var noteSlots = slots.filter(function (s) { return !s.rest; }).length;

    // Roteiro (desenho da frase) permitido no nível, ou células livres.
    var roteiros = allowedRoteiros(style, level);
    var roteiro = forced !== undefined ? forced : (roteiros.length && rng() < 0.8 ? pick(rng, roteiros) : null);

    // Nota inicial: uma nota do acorde (3ª de preferência) na região do roteiro.
    var region = roteiro ? roteiro.start : pick(rng, ['low', 'mid', 'high']);
    var center = { low: 58, mid: 64, high: 71 }[region] + Math.floor(rng() * 5);
    var startName = pickWeighted(rng, [[c.tones[1] || c.tones[0], 4], [c.tones[2] || c.tones[0], 3], [c.tones[3] || c.tones[0], 2], [c.tones[0], 2]]);
    var start = placeNear(startName, center);

    var approachLen = LEVEL_IDX[level] === 0 ? 1 : (rng() < 0.25 ? 1 : 2);
    var bodyLen = Math.max(1, noteSlots - approachLen);

    var pool = st.cells.filter(function (p) { return CELL_LEVEL[p[0]] <= LEVEL_IDX[level]; });
    var notes = [start];
    var used = [];
    var guard = 0;
    var meta = {};
    function applyCell(key) {
      var out = CELLS[key](c, notes[notes.length - 1], rng, meta);
      if (!out || !out.length) return false;
      used.push(key);
      notes = notes.concat(out.map(function (n) {
        var o = N(n.name, n.midi);
        if (n.art) o.art = n.art;
        if (n.tabHint) o.tabHint = n.tabHint;
        return o;
      }));
      return true;
    }
    if (roteiro) {
      roteiro.cells.forEach(function (key) {
        if (notes.length >= bodyLen) return;
        applyCell(key);
      });
    }
    while (notes.length < bodyLen && guard++ < 30) {
      var key = pickWeighted(rng, pool);
      if (key === 'repeat' && !st.repeatsOk) continue;
      applyCell(key);
    }
    notes = notes.slice(0, bodyLen);

    // Nota de chegada (nota longa) e a aproximação que liga a linha a ela
    // sem salto: testa os tipos permitidos e as oitavas vizinhas.
    var landName = pickWeighted(rng, landingChoices(c));
    var prev = notes[notes.length - 1];
    var levelKinds = style === 'modal' ? MODAL_APPROACH : APPROACH_LEVEL[level];
    var kinds = levelKinds.filter(function (k) { return approachLen === 1 ? k === 'grau' : k !== 'grau'; });
    if (!kinds.length) kinds = ['grau'];
    var base = placeNear(landName, prev.midi);
    var targets = [base, N(base.name, base.midi - 12), N(base.name, base.midi + 12)].filter(function (t) { return t.midi >= LOW && t.midi <= HIGH; });
    var bestApp = null, bestCost = Infinity;
    kinds.forEach(function (kind) {
      targets.forEach(function (t) {
        var app = approachNotes(kind, c, prev, t);
        if (!app) return;
        var seq = [prev].concat(app, [t]);
        var cost = rng() * 2, rep = false;
        for (var q = 1; q < seq.length; q++) {
          var d = Math.abs(seq[q].midi - seq[q - 1].midi);
          if (d === 0) rep = true;
          cost += Math.max(0, d - 2) * (q === 1 ? 1 : 2);
        }
        if (rep) cost += 50;
        if (t.midi === prev.midi) cost += 50;
        if (app.length > 1 && app[1].midi === prev.midi) cost += 8;
        if (cost < bestCost) { bestCost = cost; bestApp = { kind: kind, notes: app, target: t }; }
      });
    });
    var approachKind = bestApp.kind;
    var target = bestApp.target;
    notes = notes.concat(bestApp.notes).slice(0, noteSlots);
    while (notes.length < noteSlots) notes.push(U.stepFrom(c.scale, notes[notes.length - 1].midi, -1));

    // Monta os eventos com ritmo.
    var events = [];
    var onset = 0, k = 0;
    slots.forEach(function (s) {
      if (s.rest) events.push({ rest: true, dur: s.dur, onset: onset, triplet: false });
      else {
        var n = notes[k++];
        var ev = { name: n.name, midi: n.midi, dur: s.dur, onset: onset, triplet: s.triplet };
        if (s.tuplet) ev.tuplet = s.tuplet;
        if (n.art) ev.art = n.art;
        if (n.tabHint) ev.tabHint = n.tabHint;
        events.push(ev);
      }
      onset += s.dur;
    });
    landing.forEach(function (s, i) {
      if (s.rest) events.push({ rest: true, dur: s.dur, onset: onset, triplet: false });
      else events.push({ name: target.name, midi: target.midi, dur: s.dur, onset: onset, triplet: false, landing: true });
      onset += s.dur;
    });

    return { events: events, used: used, approachKind: approachKind, target: target, rhythmNames: rhythmNames, startName: startName, meta: meta };
  }

  // ---------------------------------------------------------------------
  // Filtro de musicalidade
  // ---------------------------------------------------------------------

  function score(c, cand, style) {
    var st = STYLES[style];
    var ev = cand.events.filter(function (e) { return !e.rest; });
    var s = 0, i;
    var bodyCount = ev.length - 1;
    var landChord = c.resolve;
    for (i = 0; i < ev.length; i++) {
      var e = ev[i];
      var m = e.midi;
      var isLanding = !!e.landing;
      var inScale = isLanding ? true : c.inScale(m);
      var strong = Math.abs(e.onset - Math.round(e.onset)) < 1e-6;
      if (!isLanding && strong) {
        if (st.strongChordTones) s += (st.extTones ? c.isExt(m) : c.isTone(m)) ? 2 : (inScale ? -1 : -4);
        else s += inScale ? 0.5 : -3;
      }
      if (!inScale && i + 1 < ev.length) {
        var d = Math.abs(ev[i + 1].midi - m);
        var ok = d >= 1 && d <= 2;
        if (!ok && i + 2 < ev.length) ok = Math.abs(ev[i + 2].midi - m) <= 2 && Math.abs(ev[i + 1].midi - m) <= 3;
        if (!ok) s -= 10;
      }
      if (!inScale && i + 1 >= ev.length) s -= 10;
      // cromatismo que vira a "terça errada" (3M num acorde menor, 3m num maior) soa estranho fora do blues
      if (!inScale && style !== 'blues' && style !== 'rock') {
        var rel = mod12(m - pcOf(c.root));
        var minorChord = c.tones.some(function (t) { return mod12(pcOf(t) - pcOf(c.root)) === 3; });
        if ((minorChord && rel === 4) || (!minorChord && rel === 3 && !strong)) s -= 3;
      }
      if (i > 0) {
        var iv = ev[i].midi - ev[i - 1].midi;
        var a = Math.abs(iv);
        if (a === 0) s -= st.repeatsOk ? 0.5 : 5;
        if (a > 9) s -= 6;
        if (a >= 6 && a <= 9 && i + 1 < ev.length && Math.abs(ev[i + 1].midi - ev[i].midi) > 4) s -= 1.5;
        if (a > 12) s -= 20;
        if (i > 1) {
          var prevIv = ev[i - 1].midi - ev[i - 2].midi;
          if (Math.abs(prevIv) >= 6 && Math.abs(iv) >= 5 && (iv > 0) === (prevIv > 0)) s -= 2.5;
          if (Math.abs(prevIv) >= 6 && Math.abs(iv) <= 2 && (iv > 0) !== (prevIv > 0)) s += 1; // salto compensado
        }
      }
    }
    var midis = ev.map(function (e) { return e.midi; });
    var hi = Math.max.apply(null, midis), lo = Math.min.apply(null, midis);
    if (hi - lo > 14) s -= (hi - lo - 14) * 1.5;
    if (hi - lo > 22) s -= 100; // fora do âmbito tocável: descarta
    if (hi > HIGH || lo < LOW) s -= 8;
    if (midis.filter(function (m) { return m === hi; }).length === 1) s += 2;
    var changes = 0;
    for (i = 2; i < midis.length; i++) {
      var d1 = midis[i - 1] - midis[i - 2], d2 = midis[i] - midis[i - 1];
      if (d1 !== 0 && d2 !== 0 && (d1 > 0) !== (d2 > 0)) changes++;
    }
    if (changes === 0) s -= 4; else if (changes >= 2) s += 2;
    var last2 = Math.abs(midis[midis.length - 1] - midis[midis.length - 2]);
    if (last2 >= 1 && last2 <= 2) s += 3; else if (last2 > 5) s -= 3;
    var runLen = 1, maxRun = 1;
    for (i = 1; i < midis.length; i++) {
      var step = Math.abs(midis[i] - midis[i - 1]);
      if (step >= 1 && step <= 2) { runLen++; maxRun = Math.max(maxRun, runLen); } else runLen = 1;
    }
    if (maxRun >= 7 && style !== 'rock') s -= 3;
    var distinct = {};
    for (i = 1; i < midis.length; i++) distinct[Math.abs(midis[i] - midis[i - 1])] = true;
    if (Object.keys(distinct).length >= 4) s += 1.5;
    return s / Math.max(1, bodyCount / 8);
  }

  // ---------------------------------------------------------------------
  // Explicação
  // ---------------------------------------------------------------------

  function degreeOf(c, name, chordRoot, tones) {
    var labels = ['fundamental', '3ª', '5ª', '7ª'];
    var i = tones.indexOf(name);
    if (i >= 0) return labels[i] || 'nota do acorde';
    if (mod12(pcOf(name) - pcOf(chordRoot)) === 2) return '9ª';
    if (mod12(pcOf(name) - pcOf(chordRoot)) === 9) return '6ª';
    return 'nota';
  }

  function explain(c, cand, style) {
    var st = STYLES[style];
    var ev = cand.events;
    var first = ev.filter(function (e) { return !e.rest; })[0];
    var parts = [];
    var startsOff = ev[0].rest;
    parts.push((startsOff ? 'Começa no contratempo' : 'Começa no tempo 1') + ' na ' + degreeOf(c, first.name, c.root, c.tones) +
      ' do ' + c.symbol + ' (' + first.name + ').');
    var seen = {};
    var labels = cand.used.filter(function (k) { if (seen[k]) return false; seen[k] = true; return true; }).map(function (k) {
      if (k === 'superPent' && c.superPent) return 'a ' + c.superPent.label + ' (' + c.superPent.why + ')';
      if (k === 'tensionTriad') return (U.TENSION_DESC[c.scaleKey] || 'uma tríade de tensão');
      if (k === 'charNote' && c.charName) return 'a nota característica do modo, ' + c.charName + ' (' + c.charLabel + ')';
      if (k === 'bebopDown' && c.bebopKey) return 'a ' + DATA.SCALES[c.bebopKey].label.toLowerCase() + ' descendo';
      if (k === 'superSweep' && cand.meta && cand.meta.superArp) {
        var sa = cand.meta.superArp;
        return 'arpejo de ' + sa.symbol + ' varrido sobre o ' + c.symbol + ' (é o arpejo que nasce na ' + sa.degree + ' da escala — "o modo pensado como arpejos")';
      }
      if (k === 'threeNps' && cand.meta) return 'escala com 3 notas por corda ' + (cand.meta.legato ? 'em legato (hammer-on subindo, pull-off descendo)' : 'com palhetada econômica');
      return CELL_LABEL[k];
    });
    if (labels.length) parts.push('Vocabulário: ' + labels.join(', ') + '.');
    if (ev.some(function (e) { return e.tuplet === 6; })) parts.push('Usa sextinas (seis notas por tempo), o "motor" rítmico dos arpejos varridos.');
    else if (ev.some(function (e) { return e.triplet; })) parts.push('Tem uma tercina (três notas num tempo), típica dos grupetos do jazz.');
    var landChord = c.resolve ? c.resolve : { root: c.root, tones: c.tones, symbol: c.symbol };
    parts.push('No fim ' + APPROACH_LABEL[cand.approachKind] + ' e ' + (c.resolve ? 'resolve' : 'repousa') + ' em ' + cand.target.name +
      ', a ' + degreeOf(c, cand.target.name, landChord.root, landChord.tones) + ' do ' + landChord.symbol + ', com nota longa.');
    parts.push(st.intro + '.');
    return parts.join(' ');
  }

  // ---------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------

  /**
   * Gera `count` frases a partir do índice `start`.
   * opts: { scaleKey, tonic ('todos' ou nota), style, level, bars (1|2), start, count, candidates }
   */
  function generate(opts) {
    var scaleKey = opts.scaleKey || 'mixolidio';
    var style = STYLES[opts.style] ? opts.style : 'bebop';
    var level = LEVEL_IDX[opts.level] !== undefined ? opts.level : 'intermediario';
    var bars = opts.bars === 2 ? 2 : 1;
    var start = opts.start || 0;
    // `rodada` deixa o botão "Gerar frases" dar um conjunto novo a cada clique
    // sem perder o determinismo: a rodada 0 é sempre a mesma coisa, a rodada 1
    // também, e assim por diante.
    var rodada = Math.max(0, Math.floor(opts.rodada || 0));
    var count = opts.count || 12;
    var tries = opts.candidates || 28;
    var out = [];
    var seenSig = {};
    for (var i = start; i < start + count; i++) {
      var tonic = bestSpelling(opts.tonic && opts.tonic !== 'todos' ? opts.tonic : KEYS_CYCLE[i % 12], scaleKey);
      var seedBase = [scaleKey, opts.tonic || 'todos', style, level, bars, i].join('|') +
        (rodada ? '|r' + rodada : '');
      var c = buildCtx(tonic, scaleKey, style, level);
      if (STYLES[style].intervalic) {
        var ip = intervalPhrase(c, i, level, bars, opts.interval, tonic);
        var ipKeep = {};
        c.scaleNames.concat(c.tones, c.resolve ? c.resolve.tones : []).forEach(function (n) { ipKeep[n] = true; });
        ip.events.forEach(function (e) { if (!e.rest) e.name = respell(e.name, ipKeep); });
        var ipNotes = ip.events.filter(function (e) { return !e.rest; });
        var ipChords = [{ beat: 0, symbol: c.symbol, root: c.root, tones: c.tones, beats: bars * 4 }];
        ipChords.push(c.resolve ? { beat: bars * 4, symbol: c.resolve.symbol, root: c.resolve.root, tones: c.resolve.tones, beats: 4 }
          : { beat: bars * 4, symbol: c.symbol, root: c.root, tones: c.tones, beats: 4 });
        out.push({
          index: i + 1,
          id: hashStr(seedBase + '|iv' + (opts.interval || 'todos')).toString(36),
          tonic: tonic, scaleKey: scaleKey, scaleLabel: DATA.SCALES[scaleKey].label,
          style: style, styleLabel: STYLES[style].label, level: level, bars: bars,
          chordSymbol: c.symbol, resolveSymbol: c.resolve ? c.resolve.symbol : null,
          title: 'Frase ' + (i + 1) + ' — ' + c.symbol + (c.resolve ? ' → ' + c.resolve.symbol : '') + ' · ' + DATA.SCALES[scaleKey].curta + ' em ' + ip.ivLabel,
          events: ip.events,
          notes: ipNotes.map(function (e) { return e.name; }),
          midi: ipNotes.map(function (e) { return e.midi; }),
          chords: ipChords,
          bpm: STYLES[style].bpm, swing: STYLES[style].swing,
          cells: ['intervalo_' + ip.interval, ip.shapeKey],
          interval: ip.interval,
          scalePcs: c.scaleNames.map(pcOf),
          score: 0,
          explanation: ip.explanation
        });
        continue;
      }
      var best = null, bestScore = -Infinity;
      // Cada frase recebe um roteiro próprio (variedade na página); a maior
      // parte das candidatas segue esse roteiro e algumas são livres.
      var rots = allowedRoteiros(style, level);
      var rot = rots.length ? rots[(hashStr(seedBase) + i) % rots.length] : null;
      var attempt = 0;
      do {
        best = null; bestScore = -Infinity;
        var total = tries;
        for (var t = 0; t < total; t++) {
          var rng = makeRng(hashStr(seedBase + '#' + attempt + '#' + t));
          var cand = candidate(c, style, level, bars, rng, (t < Math.ceil(tries * 0.75) && attempt === 0) ? rot : null);
          var sc = score(c, cand, style);
          if (sc > bestScore) { bestScore = sc; best = cand; }
          if (t === total - 1 && bestScore < 6 && total < tries * 3) total += tries; // combinação difícil: sorteia mais
        }
        var sig = tonic + ':' + best.events.map(function (e) { return (e.rest ? 'r' : e.name) + '/' + e.dur.toFixed(2); }).join(',');
        attempt++;
      } while (seenSig[sig] && attempt < 6);
      seenSig[sig] = true;
      var keep = {};
      c.scaleNames.concat(c.tones, c.resolve ? c.resolve.tones : []).forEach(function (n) { keep[n] = true; });
      best.events.forEach(function (e) { if (!e.rest) e.name = respell(e.name, keep); });
      best.target = N(respell(best.target.name, keep), best.target.midi);
      var notesOnly = best.events.filter(function (e) { return !e.rest; });
      var chords = [{ beat: 0, symbol: c.symbol, root: c.root, tones: c.tones, beats: bars * 4 }];
      var landBeat = bars * 4;
      var land = c.resolve ? { beat: landBeat, symbol: c.resolve.symbol, root: c.resolve.root, tones: c.resolve.tones, beats: 4 }
        : { beat: landBeat, symbol: c.symbol, root: c.root, tones: c.tones, beats: 4 };
      chords.push(land);
      out.push({
        index: i + 1,
        id: hashStr(seedBase).toString(36),
        tonic: tonic,
        scaleKey: scaleKey,
        scaleLabel: DATA.SCALES[scaleKey].label,
        style: style,
        styleLabel: STYLES[style].label,
        level: level,
        bars: bars,
        chordSymbol: c.symbol,
        resolveSymbol: c.resolve ? c.resolve.symbol : null,
        title: 'Frase ' + (i + 1) + ' — ' + c.symbol + (c.resolve ? ' → ' + c.resolve.symbol : '') + ' · ' + DATA.SCALES[scaleKey].curta,
        events: best.events,
        notes: notesOnly.map(function (e) { return e.name; }),
        midi: notesOnly.map(function (e) { return e.midi; }),
        chords: chords,
        bpm: STYLES[style].bpm,
        swing: STYLES[style].swing,
        cells: best.used,
        scalePcs: c.scaleNames.map(pcOf),
        score: Math.round(bestScore * 10) / 10,
        explanation: explain(c, best, style)
      });
    }
    return out;
  }

  /**
   * Articulações (bend, hammer-on, pull-off, slide, vibrato) e dinâmica da
   * frase para um instrumento — determinístico por frase + instrumento.
   */
  var artCache = {};
  function articulateFor(phrase, instrument) {
    var key = phrase.id + '|' + phrase.index + '|' + instrument;
    if (artCache[key]) return artCache[key];
    var fam = ART.FAMILY[instrument] || 'fretted';
    var base = phrase.events.map(function (e) {
      var o = Object.assign({}, e);
      if (fam === 'keys') { delete o.art; delete o.bendFrom; }
      return o;
    });
    // Notas de sweep e de 3-notas-por-corda já têm a articulação certa (a
    // palhetada é o que define o som): não recebem ligados extras.
    var locked = [];
    base.forEach(function (e, i) { if (e.tabHint && !e.art) locked.push(i); });
    var ev = ART.articulate(base, {
      style: phrase.style, level: phrase.level, instrument: instrument,
      rng: makeRng(hashStr(key)), scalePcs: phrase.scalePcs, noLegatoIdx: locked
    });
    artCache[key] = ev;
    return ev;
  }

  function styleList() { return Object.keys(STYLES).map(function (k) { return { key: k, label: STYLES[k].label }; }); }

  // Escala sugerida ao trocar de estilo.
  var STYLE_DEFAULT_SCALE = { bebop: 'bebop_dominante', jazz: 'dorico', blues: 'blues_menor', modal: 'dorico', rock: 'pentatonica_menor', baiao: 'mixolidio', fusion: 'mixolidio', intervalado: 'jonio' };

  return {
    KEYS: KEYS,
    KEYS_CYCLE: KEYS_CYCLE,
    bestSpelling: bestSpelling,
    SCALE_GROUPS: SCALE_GROUPS,
    MODE_INFO: MODE_INFO,
    STYLES: STYLES,
    STYLE_DEFAULT_SCALE: STYLE_DEFAULT_SCALE,
    styleList: styleList,
    articulateFor: articulateFor,
    INTERVAL_NAMES: INTERVAL_NAMES,
    ROTEIROS: ROTEIROS,
    CELL_LABEL: CELL_LABEL,
    generate: generate
  };
});
