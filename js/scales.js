/**
 * IMPROVIX — Biblioteca de Escalas (motor)
 *
 * Catálogo completo das escalas do sistema, agrupadas por família, com:
 *   - as notas no tom escolhido (grafia limpa, sem acidentes dobrados);
 *   - os graus de cada nota (para o diagrama do braço e do teclado);
 *   - o acorde que a escala "desenha" (1-3-5-7 dentro dela);
 *   - exercícios de treino calculados (escala, terças, 4 notas por grau,
 *     arpejo, padrão 1-2-3-5), prontos para partitura, tablatura e áudio.
 *
 * Os textos de cada escala (sonoridade, notas-alvo, notas a evitar, onde
 * usar) ficam em js/scale-info.js.
 * Funciona no navegador (window.IL.scales) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var theory = isNode ? require('./theory.js') : root.IL.theory;
  var data = isNode ? require('./data.js') : root.IL.data;
  var lib = isNode ? require('./library.js') : (root.IL && root.IL.library);
  var mod = factory(theory, data, lib);
  if (isNode) module.exports = mod;
  root.IL = root.IL || {};
  root.IL.scales = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory, DATA, library) {
  'use strict';

  var KEYS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var MAJOR = [0, 2, 4, 5, 7, 9, 11];

  var GROUPS = [
    { label: 'Modos da escala maior', keys: ['jonio', 'dorico', 'frigio', 'lidio', 'mixolidio', 'eolio', 'locrio'] },
    { label: 'Modos da menor melódica', keys: ['menor_melodica', 'dorico_b2', 'lidio_aumentado', 'lidio_b7', 'mixolidio_b13', 'locrio_9', 'alterada'] },
    { label: 'Modos da menor harmônica', keys: ['menor_harmonica', 'locrio_13', 'jonio_5aum', 'dorico_11aum', 'frigio_maior', 'lidio_9aum'] },
    { label: 'Bebop (8 notas)', keys: ['bebop_dominante', 'bebop_maior', 'bebop_dorico', 'bebop_melodico', 'bebop_harmonico'] },
    { label: 'Pentatônicas e blues', keys: ['pentatonica_maior', 'pentatonica_menor', 'pentatonica_dominante', 'blues_menor', 'blues_maior', 'blues_9'] },
    { label: 'Simétricas', keys: ['dom_dim', 'diminuta', 'tons_inteiros', 'aumentada', 'cromatica'] },
    { label: 'Exóticas e sintéticas', keys: ['harmonica_maior', 'hungara_menor', 'dupla_harmonica', 'napolitana_menor', 'napolitana_maior', 'prometheus'] },
    { label: 'Japonesas', keys: ['hirajoshi', 'kumoi', 'in_sen', 'iwato'] }
  ];

  function pcOf(n) { return theory.pitchClassOf(n); }
  function allKeys() { return [].concat.apply([], GROUPS.map(function (g) { return g.keys; })); }

  /** Respelling: troca acidentes dobrados (F##, Bbb) pelo enarmônico simples. */
  function simplify(name) {
    var p = theory.parseNoteName(name);
    if (!p || Math.abs(p.accidental) < 2) return name;
    return (p.accidental > 0 ? SHARP_NAMES : FLAT_NAMES)[p.pitchClass];
  }

  var ENH = { 'C#': 'Db', 'Db': 'C#', 'D#': 'Eb', 'Eb': 'D#', 'F#': 'Gb', 'Gb': 'F#', 'G#': 'Ab', 'Ab': 'G#', 'A#': 'Bb', 'Bb': 'A#' };
  function weight(names) {
    return names.reduce(function (a, n) { var acc = n.slice(1); return a + acc.length + (acc.length > 1 ? 5 : 0); }, 0);
  }
  /** Escolhe entre C#/Db (etc.) a grafia que gera menos acidentes nessa escala. */
  function bestTonic(tonic, scaleKey) {
    var alt = ENH[tonic];
    if (!alt) return tonic;
    return weight(theory.scaleNotes(alt, scaleKey)) < weight(theory.scaleNotes(tonic, scaleKey)) ? alt : tonic;
  }

  function degreeLabel(pcRel, steps) {
    var diff = pcRel - MAJOR[steps];
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    var acc = diff === 0 ? '' : (diff < 0 ? new Array(-diff + 1).join('b') : new Array(diff + 1).join('#'));
    return acc + (steps + 1);
  }

  /**
   * Notas da escala no tom: [{ name, pc, degree, root }] + o tom já com a
   * melhor grafia.
   */
  function notesFor(tonic, scaleKey) {
    var sc = DATA.SCALES[scaleKey];
    var t = bestTonic(tonic, scaleKey);
    var names = theory.scaleNotes(t, scaleKey).map(simplify);
    return {
      tonic: t,
      notes: names.map(function (n, i) {
        return { name: n, pc: pcOf(n), degree: degreeLabel(sc.semitones[i], sc.steps[i]), root: i === 0 };
      })
    };
  }

  /** Acorde que a escala desenha (1-3-5-7 dentro dela), com a cifra. */
  function chordOf(tonic, scaleKey) {
    var info = notesFor(tonic, scaleKey);
    // Quando a escala já tem acorde definido no motor de fraseados, usa ele
    // (é a cifra "certa" — ex.: alterada = 7alt, não m7(b5)).
    var mi = library && library.MODE_INFO && library.MODE_INFO[scaleKey];
    if (mi) {
      var tns = mi.tones ? mi.tones.map(function (iv) { return simplify(theory.noteAt(info.tonic, iv[0], iv[1])); })
        : theory.chordTones(info.tonic, mi.q).map(simplify);
      return { root: info.tonic, tones: tns, symbol: info.tonic + mi.suffix };
    }
    if (scaleKey === 'cromatica') {
      return { root: info.tonic, tones: theory.chordTones(info.tonic, 'dominant7'), symbol: info.tonic + '7 (serve em qualquer acorde)' };
    }
    // Sem acorde definido: monta 1-3-5-7 com as notas que a escala tem.
    var ns = info.notes;
    var rel = {};
    ns.forEach(function (x) { rel[((x.pc - pcOf(info.tonic)) % 12 + 12) % 12] = x.name; });
    var has = function (x) { return rel[x] !== undefined; };
    var third = has(4) ? 4 : (has(3) ? 3 : (has(5) ? 5 : (has(2) ? 2 : null)));
    var fifth = has(7) ? 7 : (has(6) ? 6 : (has(8) ? 8 : null));
    var sev = has(10) ? 10 : (has(11) ? 11 : (has(9) && third === 3 ? 9 : null));
    var tones = [info.tonic];
    [third, fifth, sev].forEach(function (r) { if (r !== null && rel[r] && tones.indexOf(rel[r]) < 0) tones.push(rel[r]); });
    var suffix = '';
    if (third === 4 && fifth === 7 && sev === 11) suffix = '7M';
    else if (third === 4 && fifth === 7 && sev === 10) suffix = '7';
    else if (third === 3 && fifth === 7 && sev === 10) suffix = 'm7';
    else if (third === 3 && fifth === 7 && sev === 11) suffix = 'm(7M)';
    else if (third === 3 && fifth === 6 && sev === 10) suffix = 'm7(b5)';
    else if (third === 3 && fifth === 6 && sev === 9) suffix = '°';
    else if (third === 4 && fifth === 8 && sev === 11) suffix = '7M(#5)';
    else if (third === 4 && fifth === 8 && sev === 10) suffix = '7(#5)';
    else if (third === 3 && fifth === 7 && sev === 9) suffix = 'm6';
    else if (third === 4 && fifth === 7 && sev === 9) suffix = '6';
    else if (third === 3 && fifth === 7) suffix = 'm';
    else if (third === 4 && fifth === 7) suffix = '';
    else if (third === 5 && sev === 10) suffix = '7/4';
    else if (third === 5) suffix = 'sus4';
    else if (third === 2) suffix = 'sus2';
    else if (third === 4 && sev === 10 && fifth === 6) suffix = '7(#11)';
    else suffix = '5';
    if (SPECIAL_SUFFIX[scaleKey]) suffix = SPECIAL_SUFFIX[scaleKey];
    else if (suffix === '7M' && has(6) && !has(5)) suffix = '7M(#11)';
    else if (suffix === '7' && has(6) && !has(5)) suffix = '7(#11)';
    var symbol = info.tonic + suffix;
    // se a cifra tem notas que cabem na escala, usa as notas dela (fica mais
    // fiel do que o 1-3-5-7 "cru")
    var fromSymbol = theory.chordNotes ? theory.chordNotes(symbol).map(simplify) : [];
    var scalePcs = ns.map(function (x) { return x.pc; });
    if (fromSymbol.length >= 3 && fromSymbol.every(function (x) { return scalePcs.indexOf(pcOf(x)) >= 0; })) tones = fromSymbol;
    return { root: info.tonic, tones: tones, symbol: symbol };
  }

  // Cifra "de fábrica" das escalas sem acorde definido no motor de fraseados.
  var SPECIAL_SUFFIX = {
    aumentada: '7M(#5)', prometheus: '7(#11)', dupla_harmonica: '7M', harmonica_maior: '7M',
    hungara_menor: 'm(7M)', napolitana_menor: 'm(7M)', napolitana_maior: 'm6', lidio_9aum: '7M(#11)',
    dorico_11aum: 'm7', jonio_5aum: '7M(#5)', locrio_13: 'm7(b5)', blues_9: '7',
    bebop_melodico: 'm6', bebop_harmonico: 'm(7M)', pentatonica_dominante: '7',
    hirajoshi: 'm', kumoi: 'm6', in_sen: '7/4', iwato: '7/4(b5)'
  };

  // ---------------------------------------------------------------------
  // Exercícios de treino (calculados a partir da escala)
  // ---------------------------------------------------------------------

  var LOW = 55, HIGH = 84;

  function ladderOf(names) {
    var out = [];
    for (var oct = 2; oct <= 7; oct++) {
      names.forEach(function (n) {
        out.push({ name: n, midi: oct * 12 + pcOf(n) });
      });
    }
    out.sort(function (a, b) { return a.midi - b.midi; });
    return out;
  }

  function startIndex(ladder, tonicPc) {
    var best = 0, bd = Infinity;
    ladder.forEach(function (n, i) {
      if (n.midi % 12 !== tonicPc) return;
      var d = Math.abs(n.midi - 60);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /** Completa o último compasso com pausa, para a partitura fechar certo. */
  function fecharCompasso(evs) {
    var total = evs.reduce(function (a, e) { return a + e.dur; }, 0);
    var falta = Math.ceil(total / 4 - 1e-6) * 4 - total;
    if (falta > 1e-6) {
      var last = evs[evs.length - 1];
      last.dur += falta > 2 ? falta - 2 : falta;
      var t2 = evs.reduce(function (a, e) { return a + e.dur; }, 0);
      var resto = Math.ceil(t2 / 4 - 1e-6) * 4 - t2;
      if (resto > 1e-6) evs.push({ rest: true, dur: resto, onset: t2 });
    }
    return evs;
  }

  /** Eventos a partir de índices numa "escada" de notas (escala ou arpejo). */
  function toEvents(idxs, ladder, dur, lastLong) {
    return toEventsDe(idxs.map(function (ix) {
      return ladder[Math.max(0, Math.min(ladder.length - 1, ix))];
    }), dur, lastLong);
  }

  /** Eventos a partir de notas já resolvidas ({name, midi}) — usado pelos
      exercícios cromáticos, que saem da escala. */
  function toEventsDe(notas, dur, lastLong) {
    var onset = 0;
    var evs = notas.map(function (n, i) {
      var d = (lastLong && i === notas.length - 1) ? Math.max(dur, 1) : dur;
      var ev = { name: n.name, midi: n.midi, onset: onset, dur: d, triplet: Math.abs(d - 1 / 3) < 1e-6 };
      onset += d;
      return ev;
    });
    return fecharCompasso(evs);
  }

  // ---- notas fora da escala (cromatismo) ----
  var LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  /**
   * Nome do semitom abaixo de uma nota, grafado como o músico escreveria:
   * E -> Eb, Eb -> D, F# -> F, F -> E, C -> B.
   */
  function semitomAbaixo(nome) {
    if (nome.indexOf('b') > 0) {
      var li = LETRAS.indexOf(nome.charAt(0));
      return LETRAS[(li + 6) % 7];              // Eb -> D, Ab -> G
    }
    if (nome.indexOf('#') > 0) return nome.charAt(0);   // F# -> F
    if (nome === 'F' || nome === 'C') return nome === 'F' ? 'E' : 'B';
    return nome.charAt(0) + 'b';                // E -> Eb, D -> Db
  }

  function notaAbaixo(n) { return { name: semitomAbaixo(n.name), midi: n.midi - 1 }; }

  /** Vizinha da escala logo acima / logo abaixo de uma altura. */
  function escalaAcima(ladder, midi) {
    for (var i = 0; i < ladder.length; i++) if (ladder[i].midi > midi) return ladder[i];
    return ladder[ladder.length - 1];
  }
  function escalaAbaixo(ladder, midi) {
    for (var j = ladder.length - 1; j >= 0; j--) if (ladder[j].midi < midi) return ladder[j];
    return ladder[0];
  }

  /** Exercícios prontos para a escala no tom. */
  function exercisesFor(tonic, scaleKey) {
    var info = notesFor(tonic, scaleKey);
    var names = info.notes.map(function (n) { return n.name; });
    var n = names.length;
    var ladder = ladderOf(names);
    var s0 = startIndex(ladder, pcOf(info.tonic));
    // desloca para o âmbito confortável
    while (ladder[s0].midi < LOW && s0 + n < ladder.length) s0 += n;
    while (ladder[s0 + n] && ladder[s0 + n].midi > HIGH) s0 -= n;

    var out = [];
    var seq, i, j;
    var G1 = 'A escala e o desenho dela';
    var G1b = 'Sequências com salto';
    var G1c = 'Intervalos';
    var G2 = 'Padrões de 4 notas';
    var G3 = 'Arpejo e notas-alvo';
    var G4 = 'Cromatismo — a linguagem do jazz';

    // 1) a escala subindo e descendo
    seq = [];
    for (i = 0; i <= n; i++) seq.push(s0 + i);
    for (i = n - 1; i >= 0; i--) seq.push(s0 + i);
    out.push({
      id: 'escala', grupo: G1, title: 'A escala subindo e descendo',
      dica: 'Toque devagar, com o metrônomo, dizendo o nome (ou o grau) de cada nota.',
      events: toEvents(seq, ladder, 0.5, true)
    });

    // 2) terças (pares) — 1-3-2-4-3-5… e a volta 7-5-6-4-5-3…
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 2); }
    for (i = n - 1; i >= 0; i--) { seq.push(s0 + i + 2); seq.push(s0 + i); }
    out.push({
      id: 'tercas', grupo: G1, title: 'Em terças (1-3-2-4-3-5… e a volta)',
      dica: 'Cada par salta dois graus da escala: é o exercício que mais ajuda a ouvir o modo, e desenvolve a visão intervalar.',
      events: toEvents(seq, ladder, 0.5, true)
    });

    // 3) sequência de 3 notas: 1-2-3, 2-3-4, 3-4-5… (tercinas)
    seq = [];
    for (i = 0; i < n; i++) for (j = 0; j < 3; j++) seq.push(s0 + i + j);
    seq.push(s0 + n);
    out.push({
      id: 'seq3', grupo: G1, title: 'Sequência de 3 notas (1-2-3, 2-3-4, 3-4-5…)',
      dica: 'Em tercinas: comece em cada grau e toque as três notas seguidas da escala, até fechar a oitava.',
      events: toEvents(seq, ladder, 1 / 3, true)
    });

    // 4) sequência com bordadura: 1-2-3-2, 2-3-4-3, 3-4-5-4…
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 1); seq.push(s0 + i + 2); seq.push(s0 + i + 1); }
    seq.push(s0 + n);
    out.push({
      id: 'seq1232', grupo: G1, title: 'Sequência 1-2-3-2 (2-3-4-3, 3-4-5-4…)',
      dica: 'Sobe três graus e volta um: a nota que volta é a bordadura, e é ela que dá o balanço da frase.',
      events: toEvents(seq, ladder, 0.25, true)
    });

    // 5) quatro notas por grau
    seq = [];
    for (i = 0; i < n; i++) for (j = 0; j < 4; j++) seq.push(s0 + i + j);
    out.push({
      id: 'quatro', grupo: G1, title: 'Quatro notas por grau (1-2-3-4, 2-3-4-5…)',
      dica: 'Semicolcheias: comece em cada grau e toque as quatro notas seguintes da escala.',
      events: toEvents(seq, ladder, 0.25, false)
    });

    // 5b) grupos de 5 notas
    seq = [];
    for (i = 0; i < n; i++) for (j = 0; j < 5; j++) seq.push(s0 + i + j);
    out.push({
      id: 'grupos5', grupo: G1, title: 'Grupos de 5 (1-2-3-4-5, 2-3-4-5-6…)',
      dica: 'Cinco notas por grau. Como 5 não cabe redondo no compasso, o começo do grupo vai andando dentro do tempo — e é justamente isso que tira o sotaque de exercício.',
      events: toEvents(seq, ladder, 0.25, false)
    });

    // ---- Sequências com salto ----
    // 1-2-5, 2-3-6, 3-4-7…
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 1); seq.push(s0 + i + 4); }
    seq.push(s0 + n);
    out.push({
      id: 'seq125', grupo: G1b, title: 'Sequência 1-2-5 (2-3-6, 3-4-7…)',
      dica: 'Dois graus seguidos e um salto de quinta. O salto é o que faz a frase deixar de parecer escala.',
      events: toEvents(seq, ladder, 1 / 3, true)
    });

    // 1-2-4-3 em cada grau
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 1); seq.push(s0 + i + 3); seq.push(s0 + i + 2); }
    out.push({
      id: 'seq1243', grupo: G1b, title: 'Padrão 1-2-4-3 em cada grau',
      dica: 'Sobe dois graus, pula o terceiro e volta nele. Esse "pula e volta" é uma das células mais usadas no bebop.',
      events: toEvents(seq, ladder, 0.25, false)
    });

    // 1-3-2-4 em cada grau
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 2); seq.push(s0 + i + 1); seq.push(s0 + i + 3); }
    out.push({
      id: 'seq1324', grupo: G1b, title: 'Padrão 1-3-2-4 (2-4-3-5, 3-5-4-6…)',
      dica: 'Terça, volta um grau, terça de novo: dá um zigue-zague que soa muito melhor do que a escala reta.',
      events: toEvents(seq, ladder, 0.25, false)
    });

    // 1-3-5-2 em cada grau
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 2); seq.push(s0 + i + 4); seq.push(s0 + i + 1); }
    out.push({
      id: 'seq1352', grupo: G1b, title: 'Padrão 1-3-5-2 (2-4-6-3, 3-5-7-4…)',
      dica: 'Sobe pela tríade e cai no 2º grau. Célula excelente: soa como arpejo, mas termina numa nota de tensão.',
      events: toEvents(seq, ladder, 0.25, false)
    });

    // ---- Intervalos ----
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 3); }
    for (i = n - 1; i >= 0; i--) { seq.push(s0 + i + 3); seq.push(s0 + i); }
    out.push({
      id: 'quartas', grupo: G1c, title: 'Em quartas (1-4-2-5-3-6…) e a volta',
      dica: 'Quartas dão aquele som aberto, moderno — a marca do jazz dos anos 60 em diante.',
      events: toEvents(seq, ladder, 0.5, true)
    });

    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 4); }
    for (i = n - 1; i >= 0; i--) { seq.push(s0 + i + 4); seq.push(s0 + i); }
    out.push({
      id: 'quintas', grupo: G1c, title: 'Em quintas (1-5-2-6-3-7…) e a volta',
      dica: 'Salto maior ainda: obriga a mão a atravessar o braço e o ouvido a segurar o desenho da escala.',
      events: toEvents(seq, ladder, 0.5, true)
    });

    // 6) padrão 1-2-3-5 por grau
    if (n >= 5) {
      seq = [];
      for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 1); seq.push(s0 + i + 2); seq.push(s0 + i + 4); }
      out.push({
        id: 'digital', grupo: G2, title: 'Padrão 1-2-3-5 em cada grau',
        dica: 'O "padrão digital" clássico do jazz: quatro notas por grau, sempre 1-2-3-5 dentro da escala.',
        events: toEvents(seq, ladder, 0.5, false)
      });

      // 7) o mesmo padrão descendo: 5-3-2-1
      seq = [];
      for (i = n - 1; i >= 0; i--) { seq.push(s0 + i + 4); seq.push(s0 + i + 2); seq.push(s0 + i + 1); seq.push(s0 + i); }
      out.push({
        id: 'digital_desce', grupo: G2, title: 'O mesmo padrão descendo (5-3-2-1)',
        dica: 'Todo padrão tem que ser estudado nos dois sentidos — descendo é sempre mais difícil, e é o que falta na maioria dos solos.',
        events: toEvents(seq, ladder, 0.5, false)
      });

      // 8) padrão de 4 notas deslocando o início:
      //    1-2-3-5, 2-3-5-6, 3-5-6-1, 5-6-1-2 — uma janela de 4 notas
      //    correndo pelo desenho 1-2-3-5-6 (em escalas de 5 notas, pela escala toda).
      var sub = n >= 6 ? [0, 1, 2, 4, 5] : [0, 1, 2, 3, 4];
      var subNames = sub.map(function (k) { return names[k % n]; });
      var subLadder = ladderOf(subNames);
      var b0 = startIndex(subLadder, pcOf(info.tonic));
      while (subLadder[b0].midi < LOW && b0 + 5 < subLadder.length) b0 += 5;
      while (subLadder[b0 + 7] && subLadder[b0 + 7].midi > HIGH) b0 -= 5;
      if (b0 >= 0 && subLadder[b0 + 7]) {
        seq = [];
        for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) seq.push(b0 + i + j);
        out.push({
          id: 'quatro_desloca', grupo: G2, title: 'Padrão de 4 notas deslocando o início (1-2-3-5, 2-3-5-6, 3-5-6-1…)',
          dica: 'Mesmo desenho, começando cada vez uma nota adiante. Só com esse deslocamento saem dezenas de frases diferentes.',
          events: toEvents(seq, subLadder, 0.5, false), ladderName: 'sub'
        });
      }
    }

    // 9) arpejo do acorde da escala
    var ch = chordOf(tonic, scaleKey);
    var arp = ladderOf(ch.tones);
    var a0 = startIndex(arp, pcOf(ch.root));
    while (arp[a0].midi < LOW && a0 + ch.tones.length < arp.length) a0 += ch.tones.length;
    seq = [];
    for (i = 0; i <= ch.tones.length; i++) seq.push(a0 + i);
    for (i = ch.tones.length - 1; i >= 0; i--) seq.push(a0 + i);
    out.push({
      id: 'arpejo', grupo: G3, title: 'Arpejo do acorde da escala (' + ch.symbol + ')',
      dica: 'As notas do acorde são os "pontos de descanso": termine suas frases nelas.',
      events: toEvents(seq, arp, 0.5, true), ladderName: 'arpejo'
    });

    // 9b) arpejos de 7ª em cada grau: 1-3-5-7, 2-4-6-1, 3-5-7-2…
    if (n >= 7) {
      seq = [];
      for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 2); seq.push(s0 + i + 4); seq.push(s0 + i + 6); }
      out.push({
        id: 'arpejos7', grupo: G3, title: 'Arpejos de 7ª em cada grau (1-3-5-7, 2-4-6-1…)',
        dica: 'Um arpejo de quatro notas nascendo em cada grau da escala. É o exercício que mais aproxima a escala da harmonia: cada grupo é um acorde do campo harmônico.',
        events: toEvents(seq, ladder, 0.25, false)
      });
    }

    // 10) escala + arpejo na mesma frase: 1-2-3-4-5-3-1 e 1-2-3-5-7-5-3-1
    if (n >= 7) {
      seq = [0, 1, 2, 3, 4, 2, 0, 0, 1, 2, 4, 6, 4, 2, 0].map(function (k) { return s0 + k; });
      out.push({
        id: 'escala_arpejo', grupo: G3, title: 'Escala + arpejo (1-2-3-4-5-3-1 → 1-2-3-5-7-5-3-1)',
        dica: 'A primeira metade é escala, a segunda é arpejo: misturar os dois na mesma frase é o que faz o solo soar "falado" em vez de exercício.',
        events: toEvents(seq, ladder, 0.5, true)
      });
    }

    // ---- Cromatismo: aproximar e cercar as notas do acorde ----
    // As notas do acorde na oitava confortável, para servirem de alvo.
    var alvos = [];
    ch.tones.forEach(function (nome) {
      var pc = pcOf(nome);
      for (var k = 0; k < ladder.length; k++) {
        if (ladder[k].midi % 12 === pc && ladder[k].midi >= ladder[s0].midi && ladder[k].midi <= ladder[s0].midi + 14) {
          alvos.push({ name: nome, midi: ladder[k].midi }); break;
        }
      }
      // a nota do acorde pode não estar na escala (raro): calcula pela tônica
      if (!alvos.length || alvos[alvos.length - 1].name !== nome) {
        var base = ladder[s0].midi;
        var m = base + (((pc - base % 12) % 12) + 12) % 12;
        alvos.push({ name: nome, midi: m });
      }
    });

    if (alvos.length >= 3 && scaleKey !== 'cromatica') {
      // aproximação cromática de baixo: dois semitons antes de cada nota-alvo
      var aprox = [];
      alvos.forEach(function (a) {
        var b1 = notaAbaixo(a);        // meio tom abaixo
        var b2 = notaAbaixo(b1);       // um tom abaixo
        aprox.push(b2, b1, a);
      });
      out.push({
        id: 'cromatico', grupo: G4, title: 'Aproximação cromática das notas do acorde',
        dica: 'Duas notas cromáticas subindo até cada nota do acorde (ex.: D – Eb – E para chegar na 3ª). É assim que se entra numa nota-alvo sem soar "escala".',
        events: toEventsDe(aprox, 1 / 3, true)
      });

      // cerco (enclosure): vizinha de cima, cromática, vizinha de baixo, alvo
      var cerco = [];
      alvos.forEach(function (a) {
        var acima = escalaAcima(ladder, a.midi);
        var passo = acima.midi - a.midi;
        if (passo >= 2) {
          // a de cima está a um tom: desce cromaticamente por ela
          cerco.push(acima, notaAbaixo(acima), escalaAbaixo(ladder, a.midi), a);
        } else {
          // a de cima já está a meio tom: o cromatismo vem por baixo
          var abaixo1 = notaAbaixo(a);
          cerco.push(acima, abaixo1, escalaAbaixo(ladder, abaixo1.midi), a);
        }
      });
      out.push({
        id: 'cerco', grupo: G4, title: 'Cerco (enclosure) das notas do acorde',
        dica: 'Cerca a nota-alvo por cima e por baixo antes de cair nela (ex.: em C, para chegar na 3ª: F – Eb – D – E). É o recurso mais reconhecível do vocabulário bebop.',
        events: toEventsDe(cerco, 0.25, true)
      });
    }

    // 11) notas-alvo: tônica → 3ª → 5ª → 7ª em notas longas
    var alvo = [];
    [0, 2, 4, 6].forEach(function (k) { if (k < n) alvo.push(s0 + k); });
    if (alvo.length >= 3) {
      out.push({
        id: 'alvo', grupo: G3, title: 'Notas-alvo em notas longas',
        dica: 'Segure cada nota do acorde por um compasso e ouça como ela soa dentro da escala.',
        events: toEvents(alvo.concat([s0 + n]), ladder, 2, false)
      });
    }

    // Mantém os grupos na ordem pedagógica, independentemente da ordem em que
    // os exercícios foram montados acima (senão um grupo apareceria duas vezes).
    var ORDEM = [G1, G1b, G1c, G2, G3, G4];
    out = out.map(function (ex, i) { return { ex: ex, i: i }; })
      .sort(function (a, b) {
        var da = ORDEM.indexOf(a.ex.grupo), db = ORDEM.indexOf(b.ex.grupo);
        return da === db ? a.i - b.i : da - db;
      })
      .map(function (x) { return x.ex; });

    out.forEach(function (ex) {
      if (scaleKey === 'cromatica') { ex.chords = []; return; }
      ex.chords = [{ beat: 0, beats: ex.events.reduce(function (a, e) { return a + e.dur; }, 0), root: ch.root, tones: ch.tones, symbol: ch.symbol }];
    });
    return out;
  }

  /** Busca por nome (sem acento) entre todas as escalas. */
  function search(q) {
    var norm = function (t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
    var s = norm(q || '').trim();
    var list = allKeys();
    if (!s) return list;
    return list.filter(function (k) {
      return norm(DATA.SCALES[k].label + ' ' + DATA.SCALES[k].curta + ' ' + k).indexOf(s) >= 0;
    });
  }

  return {
    KEYS: KEYS,
    GROUPS: GROUPS,
    allKeys: allKeys,
    notesFor: notesFor,
    chordOf: chordOf,
    exercisesFor: exercisesFor,
    search: search,
    bestTonic: bestTonic
  };
});
