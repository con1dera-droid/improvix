/**
 * ImprovisaLab — Biblioteca de Escalas (motor)
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

  function toEvents(idxs, ladder, dur, lastLong) {
    var onset = 0;
    var evs = idxs.map(function (ix, i) {
      var n = ladder[Math.max(0, Math.min(ladder.length - 1, ix))];
      var d = (lastLong && i === idxs.length - 1) ? Math.max(dur, 1) : dur;
      var ev = { name: n.name, midi: n.midi, onset: onset, dur: d, triplet: Math.abs(d - 1 / 3) < 1e-6 };
      onset += d;
      return ev;
    });
    // completa o último compasso com pausa
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
    var seq;

    // 1) a escala subindo e descendo
    seq = [];
    for (var i = 0; i <= n; i++) seq.push(s0 + i);
    for (i = n - 1; i >= 0; i--) seq.push(s0 + i);
    out.push({
      id: 'escala', title: 'A escala subindo e descendo',
      dica: 'Toque devagar, com o metrônomo, dizendo o nome (ou o grau) de cada nota.',
      events: toEvents(seq, ladder, 0.5, true)
    });

    // 2) terças (pares)
    seq = [];
    for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 2); }
    for (i = n - 1; i >= 0; i--) { seq.push(s0 + i + 2); seq.push(s0 + i); }
    out.push({
      id: 'tercas', title: 'Em terças (dois graus de cada vez)',
      dica: 'Cada par salta dois graus da escala: é o exercício que mais ajuda a ouvir o modo.',
      events: toEvents(seq, ladder, 0.5, true)
    });

    // 3) quatro notas por grau
    seq = [];
    for (i = 0; i < n; i++) for (var j = 0; j < 4; j++) seq.push(s0 + i + j);
    out.push({
      id: 'quatro', title: 'Quatro notas por grau (1-2-3-4, 2-3-4-5…)',
      dica: 'Semicolcheias: comece em cada grau e toque as quatro notas seguintes da escala.',
      events: toEvents(seq, ladder, 0.25, false)
    });

    // 4) arpejo do acorde da escala
    var ch = chordOf(tonic, scaleKey);
    var arp = ladderOf(ch.tones);
    var a0 = startIndex(arp, pcOf(ch.root));
    while (arp[a0].midi < LOW && a0 + ch.tones.length < arp.length) a0 += ch.tones.length;
    seq = [];
    for (i = 0; i <= ch.tones.length; i++) seq.push(a0 + i);
    for (i = ch.tones.length - 1; i >= 0; i--) seq.push(a0 + i);
    out.push({
      id: 'arpejo', title: 'Arpejo do acorde da escala (' + ch.symbol + ')',
      dica: 'As notas do acorde são os "pontos de descanso": termine suas frases nelas.',
      events: toEvents(seq, arp, 0.5, true), ladderName: 'arpejo'
    });

    // 5) padrão 1-2-3-5 por grau
    if (n >= 5) {
      seq = [];
      for (i = 0; i < n; i++) { seq.push(s0 + i); seq.push(s0 + i + 1); seq.push(s0 + i + 2); seq.push(s0 + i + 4); }
      out.push({
        id: 'digital', title: 'Padrão 1-2-3-5 em cada grau',
        dica: 'O "padrão digital" clássico do jazz: quatro notas por grau, sempre 1-2-3-5 dentro da escala.',
        events: toEvents(seq, ladder, 0.5, false)
      });
    }

    // 6) notas-alvo: tônica → 3ª → 5ª → 7ª em notas longas
    var alvo = [];
    [0, 2, 4, 6].forEach(function (k) { if (k < n) alvo.push(s0 + k); });
    if (alvo.length >= 3) {
      out.push({
        id: 'alvo', title: 'Notas-alvo em notas longas',
        dica: 'Segure cada nota do acorde por um compasso e ouça como ela soa dentro da escala.',
        events: toEvents(alvo.concat([s0 + n]), ladder, 2, false)
      });
    }

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
