/**
 * IMPROVIX — motor de teoria musical (Etapa 1)
 *
 * Funções puras (sem DOM), reaproveitáveis no navegador (window.IL.theory)
 * e no Node (para os testes automáticos em tests/theory.test.js).
 */
(function (root, factory) {
  var deps = (typeof module !== 'undefined' && module.exports)
    ? require('./data.js')
    : root.IL.data;
  var mod = factory(deps);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.theory = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (DATA) {
  'use strict';

  var NOTE_LETTERS = DATA.NOTE_LETTERS;
  var LETTER_SEMITONES = DATA.LETTER_SEMITONES;

  function mod12(n) {
    return ((n % 12) + 12) % 12;
  }

  /** "F#" -> {letter:'F', accidental:1, pitchClass:6} / "Bb" -> {letter:'B',accidental:-1,pitchClass:10} */
  function parseNoteName(name) {
    var m = /^([A-Ga-g])(#{1,2}|b{1,2}|x)?$/.exec(name.trim());
    if (!m) return null;
    var letter = m[1].toUpperCase();
    var accToken = m[2] || '';
    var accidental = 0;
    if (accToken === 'x') accidental = 2;
    else {
      for (var i = 0; i < accToken.length; i++) {
        accidental += accToken[i] === '#' ? 1 : -1;
      }
    }
    var pitchClass = mod12(LETTER_SEMITONES[letter] + accidental);
    return { letter: letter, accidental: accidental, pitchClass: pitchClass };
  }

  function accidentalString(n) {
    if (n === 0) return '';
    return (n > 0 ? '#' : 'b').repeat(Math.abs(n));
  }

  /**
   * Retorna o nome da nota que fica `semitones` semitons e `letterSteps`
   * "passos de letra" acima de `rootName`, escolhendo o acidente (# ou b)
   * que faz a grafia bater com o intervalo pedido (grafia por intervalo,
   * não só por classe de altura cromática).
   */
  function noteAt(rootName, letterSteps, semitones) {
    var root = parseNoteName(rootName);
    if (!root) throw new Error('Nota inválida: ' + rootName);
    var rootLetterIdx = NOTE_LETTERS.indexOf(root.letter);
    var n = NOTE_LETTERS.length;
    var targetLetterIdx = ((rootLetterIdx + letterSteps) % n + n) % n;
    var targetLetter = NOTE_LETTERS[targetLetterIdx];
    var naturalTargetPitch = LETTER_SEMITONES[targetLetter];
    var desiredPitch = mod12(root.pitchClass + semitones);

    var bestDiff = null;
    [-2, -1, 0, 1, 2].forEach(function (candidate) {
      if (mod12(naturalTargetPitch + candidate) === desiredPitch) {
        if (bestDiff === null || Math.abs(candidate) < Math.abs(bestDiff)) {
          bestDiff = candidate;
        }
      }
    });
    if (bestDiff === null) bestDiff = 0; // segurança, não deve acontecer
    return targetLetter + accidentalString(bestDiff);
  }

  function pitchClassOf(noteName) {
    var n = parseNoteName(noteName);
    return n ? n.pitchClass : null;
  }

  /** Gera as notas de uma escala a partir da tônica. */
  function scaleNotes(tonicName, scaleKey) {
    var scale = DATA.SCALES[scaleKey];
    if (!scale) throw new Error('Escala desconhecida: ' + scaleKey);
    return scale.steps.map(function (steps, i) {
      return noteAt(tonicName, steps, scale.semitones[i]);
    });
  }

  /** Gera as notas de um acorde (fundamental + intervalos da qualidade). */
  function chordTones(rootName, qualityKey) {
    var quality = DATA.QUALITIES[qualityKey];
    if (!quality) throw new Error('Qualidade de acorde desconhecida: ' + qualityKey);
    return quality.intervals.map(function (pair) {
      return noteAt(rootName, pair[0], pair[1]);
    });
  }

  // --- Análise de acorde (parser de cifra) ---------------------------------

  // Ordem importa: padrões mais específicos primeiro. Aplicados sobre a
  // parte "principal" da cifra, já sem baixo (/E) e sem parênteses.
  // Aceita tanto a cifra internacional (Cmaj7, Cm7b5, C7alt) quanto a
  // brasileira no padrão Chediak (C7M, Cm7(b5), C°, G7/4, Cm(7M), C6(9)).
  var CHORD_PATTERNS = [
    [/^(m7b5|m7-5|min7b5|ø7?|Ø7?)/, 'm7b5'],
    [/^(mmaj7|mMaj7|mM7|minMaj7|m7M|m7\+(?![0-9])|mΔ7?|m\/maj7)/, 'minMaj7'],
    [/^(dim7|°7|o7)/, 'dim7'],
    [/^(dim|°|o)(?![a-zA-Z0-9])/, 'dim7'], // no padrão Chediak, "°" já inclui a 7ª diminuta
    [/^(maj9|Maj9|M9|Δ9|7M9)/, 'major9'],
    [/^(maj13|maj11|Maj13|Maj11|M13|M11)/, 'major7'],
    [/^(maj7|Maj7|M7|Δ7|Δ|7M|7\+(?![0-9])|7maj)/, 'major7'],
    [/^(m6|min6|-6)/, 'minor6'],
    [/^(m9|min9|-9)/, 'minor9'],
    [/^(m11|min11|-11|m13|min13|-13)/, 'minor7'],
    [/^(m7|min7|-7)/, 'minor7'],
    [/^(m(?!aj)|min|-)(?![a-zA-Z])/, 'minor'],
    [/^(7sus4|7sus|9sus4|9sus|13sus4|13sus)/, 'dominant7sus4'],
    [/^(13|11)/, 'dominant7'],
    [/^(9)/, 'dominant9'],
    [/^(7)/, 'dominant7'],
    [/^(69|6)/, 'major6'],
    [/^(add9|add2)/, 'add9'],
    [/^(sus2|2)(?![0-9])/, 'sus2'],
    [/^(sus4|sus|4)(?![0-9])/, 'sus4'],
    [/^(aug|\+)/, 'aug'],
    [/^(5)/, 'power5'],
    [/^(maj|M)(?![a-zA-Z0-9])/, 'major']
  ];

  // Normaliza uma tensão escrita de várias formas ("+5", "5+", "-9", "9-",
  // "11+", "maj7"...) para a grafia usada internamente.
  function normalizeTension(tok) {
    var x = tok.trim();
    if (!x) return null;
    if (/^(alt|alt\.)$/i.test(x)) return 'alt';
    if (/^(7M|maj7|M7|Δ)$/.test(x)) return '7M';
    if (/^(sus4?|4)$/.test(x)) return '4';
    if (/^add(9|2)$/.test(x)) return '9';
    var m = /^([#b+\-]?)(\d{1,2})([#b+\-]?)$/.exec(x);
    if (!m) return null;
    var acc = m[1] || m[3] || '';
    if (acc === '+') acc = '#';
    if (acc === '-') acc = 'b';
    var num = m[2];
    if (num === '2') num = '9';
    if (num === '6' && acc === 'b') num = '13';
    if (num === '6' && !acc) return '6';
    if (num === '7') return acc === '#' ? '7M' : null; // "7" dentro de parênteses não é tensão
    if (['5', '9', '11', '13'].indexOf(num) < 0) return null;
    return acc + num;
  }

  // Extrai tensões de um trecho sem parênteses, ex.: "b9#11", "#5b9", "13".
  function tensionsFromRun(run) {
    var out = [];
    var re = /(alt|[#b+\-]?(?:13|11|9|5|4))/g;
    var m;
    while ((m = re.exec(run)) !== null) {
      var n = normalizeTension(m[1]);
      if (n) out.push(n);
    }
    return out;
  }

  /**
   * Interpreta uma cifra e devolve { root, quality, symbol, bass, tensions }
   * ou null se não conseguir reconhecer a fundamental.
   * Exemplos aceitos: Gmaj7, G7M, Bbm7b5, Bbm7(b5), Bø, F#7, G7(b9), G7(#11),
   * G7(b13), G7alt, G7/4, G7(4), C6(9), C6/9, Cm(7M), C°, C7M(#11), D7/F#.
   */
  function parseChordSymbol(raw) {
    var symbol = (raw || '').trim().replace(/º/g, '°').replace(/[–—−]/g, '-');
    if (!symbol) return null;
    var m = /^([A-Ga-g])(#{1,2}|b{1,2})?/.exec(symbol);
    if (!m) return null;
    var root = m[1].toUpperCase() + (m[2] || '');
    if (!parseNoteName(root)) return null;
    var rest = symbol.slice(m[0].length).replace(/\s+/g, '');

    // Baixo invertido: "/E", "/F#", "/Bb" no final.
    var bass = null;
    var bm = /\/([A-Ga-g](?:#|b)?)$/.exec(rest);
    if (bm) {
      bass = bm[1].charAt(0).toUpperCase() + bm[1].slice(1);
      rest = rest.slice(0, bm.index);
    }
    // Tensões entre parênteses: "(b9)", "(b9/b13)", "(9, #11)".
    var tensions = [];
    rest = rest.replace(/\(([^)]*)\)/g, function (all, inner) {
      inner.split(/[,\/\s]+/).forEach(function (tok) {
        var n = normalizeTension(tok);
        if (n) tensions.push(n);
      });
      return '';
    });
    // "/4", "/9" fora de parênteses (ex.: G7/4, C6/9, C7/9) = tensão, não baixo.
    rest = rest.replace(/\/([#b+\-]?\d+)/g, function (all, tok) {
      var n = normalizeTension(tok);
      if (n) tensions.push(n);
      return '';
    });

    var quality = 'major';
    var tail = '';
    if (rest !== '') {
      var matched = false;
      for (var i = 0; i < CHORD_PATTERNS.length; i++) {
        var pm = CHORD_PATTERNS[i][0].exec(rest);
        if (pm) {
          quality = CHORD_PATTERNS[i][1];
          tail = rest.slice(pm[0].length);
          if (/^(9|11|13)/.test(pm[0]) && quality !== 'dominant9') tensions.push(pm[0].replace(/sus4?/, '').slice(0, 2));
          if (/^(m11|min11|-11)$/.test(pm[0])) tensions.push('11');
          if (/^(m13|min13|-13)$/.test(pm[0])) tensions.push('13');
          if (/^(maj13|Maj13|M13)$/.test(pm[0])) tensions.push('13');
          if (/^(maj11|Maj11|M11)$/.test(pm[0])) tensions.push('#11');
          if (pm[0] === '69') tensions.push('9');
          matched = true;
          break;
        }
      }
      if (!matched) tail = rest;
      tensionsFromRun(tail).forEach(function (x) { tensions.push(x); });
    }

    // Remove duplicadas mantendo a ordem.
    tensions = tensions.filter(function (x, idx) { return x && tensions.indexOf(x) === idx; });
    function has(x) { return tensions.indexOf(x) >= 0; }

    // Regras de combinação qualidade + tensões (cifra brasileira).
    if (quality === 'minor' && has('7M')) quality = 'minMaj7';
    if (quality === 'minor7' && has('b5')) quality = 'm7b5';
    if ((quality === 'dominant7' || quality === 'dominant9') && has('4')) quality = 'dominant7sus4';
    if ((quality === 'dominant7' || quality === 'dominant9') && !has('alt')) {
      if (has('#5') && !has('b9') && !has('#9')) quality = 'dominant7sharp5';
      else if (has('b5') && !has('b9') && !has('#9')) quality = 'dominant7flat5';
    }
    if (quality === 'major7' && has('#5')) quality = 'augMaj7';
    if (quality === 'major' && has('#5')) quality = 'aug';
    if (quality === 'major' && has('4')) quality = 'sus4';
    if (quality === 'major' && has('9') && tensions.length === 1) quality = 'add9';
    if (quality === 'major7' && has('9') && tensions.length === 1) quality = 'major9';
    if (quality === 'minor7' && has('9') && tensions.length === 1) quality = 'minor9';
    if (quality === 'dominant7' && has('9') && tensions.length === 1) quality = 'dominant9';
    if (quality === 'dominant9' && tensions.indexOf('9') < 0) tensions.unshift('9');

    return { root: root, quality: quality, symbol: symbol, bass: bass, tensions: tensions };
  }

  // --- Notas que formam um acorde (a partir da cifra) ----------------------

  // Tensões → [passos de letra, semitons] a partir da fundamental.
  var TENSION_SPELL = {
    'b9': [1, 1], '9': [1, 2], '#9': [1, 3], '11': [3, 5], '#11': [3, 6], 'b13': [5, 8], '13': [5, 9]
  };

  /**
   * Notas do acorde na ordem 1-3-5-7 + tensões, a partir da cifra.
   * Ex.: "C7" → [C, E, G, Bb]; "G7(b9)" → [G, B, D, F, Ab];
   * "G7alt" → [G, B, F, Ab, A#, C#, Eb] (sem 5ª justa); "C6(9)" → [C, E, G, A, D].
   * Devolve [] se a cifra não for reconhecida.
   */
  function chordNotes(symbol) {
    var p = null;
    try { p = parseChordSymbol(symbol); } catch (e) { p = null; }
    if (!p || !DATA.QUALITIES[p.quality]) return [];
    var notes = chordTones(p.root, p.quality);
    var tens = p.tensions.slice();
    if (tens.indexOf('alt') >= 0 && p.quality.indexOf('dominant') === 0) {
      // 7alt: 1, 3, b7 + b9, #9, #11, b13 (a 5ª justa sai)
      var fifth = noteAt(p.root, 4, 7);
      notes = notes.filter(function (n) { return n !== fifth; });
      tens = ['b9', '#9', '#11', 'b13'];
    }
    var pcs = notes.map(pitchClassOf);
    tens.forEach(function (t) {
      var sp = TENSION_SPELL[t];
      if (!sp) return;
      var n = noteAt(p.root, sp[0], sp[1]);
      if (pcs.indexOf(pitchClassOf(n)) >= 0) return;
      notes.push(n);
      pcs.push(pitchClassOf(n));
    });
    return notes;
  }

  /** "C – E – G – Bb" (ou com baixo: "C – E – G – Bb, baixo E"). Aceita "G7 → C7M". */
  function chordNotesText(symbol, sep) {
    sep = sep || ' – ';
    return String(symbol || '').split(/\s*→\s*/).map(function (part) {
      var ns = chordNotes(part);
      if (!ns.length) return '';
      var p = parseChordSymbol(part);
      return ns.join(sep) + (p && p.bass ? ', baixo ' + p.bass : '');
    }).filter(Boolean).join('  →  ');
  }

  // --- Transposição de cifras ----------------------------------------------

  var NOMES_SUSTENIDO = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var NOMES_BEMOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  /**
   * Troca só a fundamental (e o baixo invertido) de uma cifra, mantendo o
   * resto do texto exatamente como está: "Am7(b5)" vira "Cm7(b5)", "D7/F#"
   * vira "F7/A". O deslocamento vem em passos de letra + semitons (como em
   * `noteAt`), que é o que garante a grafia certa — de G para Bb, o Em7 vira
   * Gm7, e não um "F##m7" qualquer.
   */
  function transposeChordSymbol(symbol, letterSteps, semitones, preferBemol) {
    var texto = String(symbol == null ? '' : symbol).trim();
    if (!texto) return texto;
    var m = /^([A-Ga-g])(#{1,2}|b{1,2})?/.exec(texto);
    if (!m || !parseNoteName(m[1].toUpperCase() + (m[2] || ''))) return texto;

    function mover(nome) {
      var novo;
      try { novo = noteAt(nome, letterSteps, semitones); } catch (e) { return nome; }
      // Grafia dura de ler (dobrado, ou E#/B#/Cb/Fb): troca pelo enarmônico
      // simples, na preferência do tom de destino. Transpor de Eb para F#,
      // por exemplo, é uma segunda aumentada no papel — sem isto o C7M viraria
      // "D#7M" em vez do "Eb7M" que qualquer músico escreveria.
      if (/##|bb|x/.test(novo) || /^(E#|B#|Cb|Fb)$/.test(novo)) {
        var pc = pitchClassOf(novo);
        novo = (preferBemol ? NOMES_BEMOL : NOMES_SUSTENIDO)[pc] || novo;
      }
      return novo;
    }

    var raiz = mover(m[1].toUpperCase() + (m[2] || ''));
    var resto = texto.slice(m[0].length);
    // baixo invertido no fim ("/F#"); "/4" e "/9" são tensões e ficam quietos
    resto = resto.replace(/\/([A-Ga-g](?:#{1,2}|b{1,2})?)\s*$/, function (all, nota) {
      return '/' + mover(nota.charAt(0).toUpperCase() + nota.slice(1));
    });
    return raiz + resto;
  }

  /**
   * Transpõe uma progressão escrita ("Gmaj7 | Em7 | Am7 | D7") de uma
   * tonalidade para outra, preservando os separadores e o que o usuário
   * escreveu em cada cifra.
   */
  function transposeProgression(texto, deTonica, paraTonica) {
    var de = parseNoteName(deTonica || ''), para = parseNoteName(paraTonica || '');
    if (!texto || !de || !para) return texto;
    var passos = ((NOTE_LETTERS.indexOf(para.letter) - NOTE_LETTERS.indexOf(de.letter)) % 7 + 7) % 7;
    var semitons = mod12(para.pitchClass - de.pitchClass);
    if (!passos && !semitons) return texto;
    var bemol = (paraTonica || '').indexOf('b') >= 0 || paraTonica === 'F';
    return String(texto).split('|').map(function (parte) {
      var espacoIni = /^\s*/.exec(parte)[0], espacoFim = /\s*$/.exec(parte)[0];
      var cifra = parte.trim();
      if (!cifra) return parte;
      return espacoIni + transposeChordSymbol(cifra, passos, semitons, bemol) + espacoFim;
    }).join('|');
  }

  // --- Campo harmônico -----------------------------------------------------

  function keyDataFor(mode) {
    return mode === 'menor' ? DATA.MINOR_KEY : DATA.MAJOR_KEY;
  }

  /** Constrói os 7 graus diatônicos de uma tonalidade. */
  function buildDiatonicField(tonicName, mode) {
    var scaleKey = mode === 'menor' ? 'eolio' : 'jonio';
    var degreeRoots = scaleNotes(tonicName, scaleKey);
    var keyData = keyDataFor(mode);
    return degreeRoots.map(function (root, i) {
      return {
        index: i,
        root: root,
        roman: keyData.romans[i],
        function: keyData.functions[i],
        quality: keyData.qualities[i]
      };
    });
  }

  /** Constrói a tríade a partir da 3ª de um acorde (técnica de arpejo substituto). */
  function triadFromThird(rootName, qualityKey) {
    var quality = DATA.QUALITIES[qualityKey];
    var intervals = quality.intervals;
    if (intervals.length < 3) return null; // precisa de pelo menos 3ª e 5ª
    var third = intervals[1], fifth = intervals[2], seventh = intervals[3];
    var thirdNote = noteAt(rootName, third[0], third[1]);
    var stepTo5 = fifth[0] - third[0];
    var semiTo5 = fifth[1] - third[1];
    var fifthFromThird = noteAt(thirdNote, stepTo5, semiTo5);
    var topNote, stepToTop, semiToTop;
    if (seventh) {
      stepToTop = seventh[0] - third[0];
      semiToTop = seventh[1] - third[1];
    } else {
      // sem sétima: fecha a tríade repetindo a fundamental oitava acima
      stepToTop = 7 - third[0];
      semiToTop = 12 - third[1];
    }
    topNote = noteAt(thirdNote, stepToTop, semiToTop);

    // Classifica a tríade resultante (maior/menor/dim/aug) pelos semitons.
    var s1 = mod12(semiTo5), s2 = mod12(semiToTop - semiTo5);
    var triadQuality = 'major';
    if (s1 === 3 && s2 === 3) triadQuality = 'dim';
    else if (s1 === 3 && s2 === 4) triadQuality = 'minor';
    else if (s1 === 4 && s2 === 3) triadQuality = 'major';
    else if (s1 === 4 && s2 === 4) triadQuality = 'aug';

    return {
      root: thirdNote,
      quality: triadQuality,
      notes: [thirdNote, fifthFromThird, topNote]
    };
  }

  var TRIAD_QUALITY_LABEL = { major: '', minor: 'm', dim: 'dim', aug: 'aug' };

  // Agrupa qualidades de acorde em "famílias" para decidir se um acorde
  // realmente corresponde ao grau diatônico da mesma fundamental, ou se é
  // só uma coincidência de fundamental (ex.: A7 não é o "vi" de C maior,
  // mesmo tendo a mesma fundamental que o Am7 diatônico).
  function familyOf(qualityKey) {
    if (['major', 'major6', 'major7', 'major9', 'add9'].indexOf(qualityKey) >= 0) return 'majorish';
    if (['minor', 'minor6', 'minor7', 'minor9', 'minMaj7'].indexOf(qualityKey) >= 0) return 'minorish';
    if (['dominant7', 'dominant9', 'dominant7sus4', 'dominant7sharp5', 'dominant7flat5'].indexOf(qualityKey) >= 0) return 'dominant';
    if (qualityKey === 'm7b5') return 'halfdim';
    if (qualityKey === 'dim' || qualityKey === 'dim7') return 'dim';
    return 'loose'; // sus, aug, power5: aceitos em qualquer grau (aproximação)
  }

  /**
   * Analisa uma progressão de acordes dentro de uma tonalidade.
   * `chordSymbols`: array de strings, ex.: ["Gmaj7","Em7","Am7","D7"]
   * `tonicName` + `mode` ("maior"|"menor"): tonalidade escolhida pelo usuário.
   * `level`: "iniciante" | "intermediario" | "avancado" — controla quantas
   *          escalas/arpejos são sugeridos.
   *
   * Cada acorde é analisado olhando também para o acorde SEGUINTE (para onde
   * ele resolve), como na análise funcional: um G7 que vai para C é V7 de um
   * acorde maior (mixolídio), um E7 que vai para Am é V7 de um acorde menor
   * (mixolídio b9 b13), um Db7 que vai para C é SubV7 (lídio b7), um C#°
   * entre C e Dm é diminuto de passagem, e assim por diante.
   */
  function analyzeProgression(chordSymbols, tonicName, mode, level) {
    var field = buildDiatonicField(tonicName, mode);
    var otherMode = mode === 'menor' ? 'maior' : 'menor';
    var parallelField = buildDiatonicField(tonicName, otherMode);
    var tonicPc = pitchClassOf(tonicName);
    var scaleLimit = level === 'iniciante' ? 1 : (level === 'intermediario' ? 2 : 3);
    var showSubArpeggio = level !== 'iniciante';

    var items = chordSymbols.map(function (raw) { return { raw: raw, parsed: parseChordSymbol(raw) }; });
    var validCount = items.filter(function (it) { return it.parsed; }).length;

    // Próximo acorde válido (dá a volta para o primeiro: progressões de
    // estudo costumam ser tocadas em loop, então o último acorde "resolve"
    // no primeiro).
    function nextParsed(i) {
      if (validCount < 2) return null;
      for (var k = 1; k <= items.length; k++) {
        var it = items[(i + k) % items.length];
        if (it.parsed) return it.parsed;
      }
      return null;
    }

    function degreeIndexOf(pc) {
      return field.findIndex(function (d) { return pitchClassOf(d.root) === pc; });
    }

    // Grau "cromático" em algarismo romano (ex.: C# em Dó maior = #I).
    function chromaticRoman(pc) {
      function plain(idx) { return field[idx].roman.replace('°', '').toUpperCase(); }
      var same = degreeIndexOf(pc);
      if (same >= 0) return plain(same);
      var below = degreeIndexOf(mod12(pc - 1));
      if (below >= 0) return '#' + plain(below);
      var above = degreeIndexOf(mod12(pc + 1));
      if (above >= 0) return 'b' + plain(above);
      return '';
    }

    var chords = items.map(function (item, i) {
      var raw = item.raw;
      var parsed = item.parsed;
      if (!parsed) {
        return { raw: raw, error: 'Não foi possível reconhecer o acorde "' + raw + '".' };
      }
      var pc = pitchClassOf(parsed.root);
      var fam = familyOf(parsed.quality);
      var isDominantish = fam === 'dominant';
      var next = nextParsed(i);
      var nextPc = next ? pitchClassOf(next.root) : null;
      var nextFam = next ? familyOf(next.quality) : null;
      var resolvesByFifth = next ? mod12(nextPc - pc) === 5 : false;
      var resolvesHalfStepDown = next ? mod12(pc - nextPc) === 1 : false;
      var nextIsMinorish = nextFam === 'minorish' || nextFam === 'halfdim';

      var directIndex = degreeIndexOf(pc);
      var compatible = directIndex >= 0 &&
        (fam === 'loose' || fam === familyOf(field[directIndex].quality));

      var ctx = { tensions: parsed.tensions || [] };
      var roman, functionLabel, isDiatonic, note = '';

      if (compatible) {
        isDiatonic = true;
        roman = field[directIndex].roman;
        functionLabel = field[directIndex].function;
        if (isDominantish && resolvesByFifth && nextIsMinorish) ctx.resolvesToMinor = true;
      } else {
        isDiatonic = false;
        var secIndex = field.findIndex(function (d) { return pitchClassOf(d.root) === mod12(pc - 7); });
        if (mode === 'menor' && directIndex === 4 && isDominantish) {
          // Dominante "emprestado" da menor harmônica — uso muito comum.
          roman = 'V';
          functionLabel = 'Dominante';
          note = 'Dominante emprestado da escala menor harmônica (o V natural da menor natural seria m7).';
          ctx.resolvesToMinor = true;
        } else if (isDominantish && resolvesHalfStepDown) {
          var targetIdx = degreeIndexOf(nextPc);
          var targetRoman = targetIdx >= 0 ? field[targetIdx].roman : null;
          roman = (targetRoman && targetIdx !== 0) ? 'SubV7/' + targetRoman : 'SubV7';
          functionLabel = 'SubV7 (substituto do dominante)';
          note = 'Substituto trítono: faz o papel de dominante e resolve meio tom abaixo, em ' + next.root + '.';
          ctx.isSubV = true;
        } else if (isDominantish && mode === 'maior' && directIndex === 0 && !resolvesByFifth) {
          roman = 'I7';
          functionLabel = 'Tônica';
          note = 'I7: tônica com 7ª menor, sonoridade típica do blues (não está preparando outro acorde).';
          ctx.isBluesDominant = true;
        } else if (isDominantish && mode === 'maior' && directIndex === 3 && !resolvesByFifth) {
          roman = 'IV7';
          functionLabel = 'Subdominante';
          note = 'IV7: subdominante com 7ª menor (blues/MPB). Não resolve como dominante — a #11 (lídio b7) é da própria tonalidade.';
          ctx.isIV7 = true;
          ctx.isBluesDominant = true;
        } else if (isDominantish && mode === 'maior' && mod12(pc - tonicPc) === 10) {
          roman = 'bVII7';
          functionLabel = 'Empréstimo modal';
          note = 'Dominante "backdoor" (empréstimo do modo menor): costuma resolver direto no I.';
          ctx.isBackdoor = true;
        } else if (isDominantish && secIndex >= 0 && (resolvesByFifth || !next)) {
          roman = 'V/' + field[secIndex].roman;
          functionLabel = 'Dominante secundário';
          note = 'Empréstimo: resolve para ' + field[secIndex].roman + '.';
          var targetFam = familyOf(field[secIndex].quality);
          if (targetFam === 'minorish' || targetFam === 'halfdim') ctx.resolvesToMinor = true;
        } else if ((fam === 'minorish' || fam === 'halfdim') && next && familyOf(next.quality) === 'dominant' && resolvesByFifth) {
          // II cadencial: m7 ou m7(b5) que prepara um dominante (ex.: F#m7(b5) → B7 → Em).
          var domTargetIdx = degreeIndexOf(mod12(nextPc + 5));
          roman = domTargetIdx > 0 ? 'II/' + field[domTargetIdx].roman : 'II cad.';
          functionLabel = 'II cadencial';
          note = 'II cadencial: prepara o dominante ' + next.root + (domTargetIdx > 0 ? ' (que vai para o ' + field[domTargetIdx].roman + ')' : '') + '.';
          ctx.isIIcad = true;
        } else if (fam === 'dim' && next && mod12(nextPc - pc) === 1) {
          roman = chromaticRoman(pc) + '°';
          functionLabel = 'Diminuto de passagem';
          note = 'Diminuto de passagem ascendente: liga o acorde anterior a ' + next.root + ', meio tom acima.';
        } else if (fam === 'dim' && next && mod12(pc - nextPc) === 1) {
          roman = chromaticRoman(pc) + '°';
          functionLabel = 'Diminuto de passagem';
          note = 'Diminuto de passagem descendente: desce meio tom até ' + next.root + '.';
        } else if (fam === 'dim' && next && nextPc === pc) {
          roman = chromaticRoman(pc) + '°';
          functionLabel = 'Diminuto auxiliar';
          note = 'Diminuto auxiliar: mesma fundamental do acorde seguinte, "enfeitando" a chegada nele.';
        } else {
          // Empréstimo modal: acorde que pertence ao campo da tonalidade
          // homônima (ex.: Fm, Ab7M ou Bb7M em Dó maior vêm de Dó menor).
          var parIdx = parallelField.findIndex(function (d) { return pitchClassOf(d.root) === pc; });
          var parFam = parIdx >= 0 ? familyOf(parallelField[parIdx].quality) : null;
          var bothMajorLike = (fam === 'majorish' || fam === 'dominant') && (parFam === 'majorish' || parFam === 'dominant');
          var parCompatible = parIdx >= 0 && (fam === 'loose' || fam === parFam || bothMajorLike);
          if (parCompatible) {
            var r = parallelField[parIdx].roman;
            // Grau alterado em relação à tonalidade escolhida recebe "b"/"#".
            var diff = mod12(pc - pitchClassOf(field[parIdx].root));
            if (diff === 11) r = 'b' + r;
            else if (diff === 1) r = '#' + r;
            roman = r + (isDominantish ? '7' : '');
            functionLabel = 'Empréstimo modal';
            if (isDominantish && !resolvesByFifth) ctx.isNonResolving = true;
            note = 'Acorde de empréstimo modal: vem do campo harmônico de ' + tonicName + ' ' + otherMode + '.';
          } else {
            roman = chromaticRoman(pc) || '—';
            if (isDominantish && !resolvesByFifth) ctx.isNonResolving = true;
            functionLabel = 'Cromático / empréstimo';
            note = 'Acorde fora do campo harmônico de ' + tonicName + ' ' + mode + '.';
          }
        }
      }

      var tones = chordTones(parsed.root, parsed.quality);
      var qualityDef = DATA.QUALITIES[parsed.quality];

      var allScaleKeys = DATA.scalesForChord(parsed.quality, roman, mode, ctx);
      var scaleKeys = allScaleKeys.slice(0, scaleLimit);
      var scales = scaleKeys.map(function (key) {
        return {
          key: key,
          label: DATA.SCALES[key].label,
          notes: scaleNotes(parsed.root, key)
        };
      });

      var ownArpeggio = {
        label: 'Arpejo do acorde (' + parsed.root + parsed.symbol.slice(parsed.root.length) + ')',
        notes: tones
      };
      var arpeggios = [ownArpeggio];
      if (showSubArpeggio) {
        var sub = triadFromThird(parsed.root, parsed.quality);
        if (sub) {
          arpeggios.push({
            label: 'Arpejo substituto (tríade a partir da 3ª): ' + sub.root + TRIAD_QUALITY_LABEL[sub.quality],
            notes: sub.notes
          });
        }
      }

      // Nota-alvo: a 3ª do acorde (ou a 4ª/5ª quando não há 3ª, ex. sus/power).
      var targetNote, targetLabel;
      if (parsed.quality === 'sus4' || parsed.quality === 'dominant7sus4') { targetNote = tones[1]; targetLabel = '4ª'; }
      else if (parsed.quality === 'sus2') { targetNote = tones[1]; targetLabel = '9ª (2ª)'; }
      else if (parsed.quality === 'power5') { targetNote = tones[1]; targetLabel = '5ª'; }
      else { targetNote = tones[1]; targetLabel = '3ª'; }

      return {
        raw: raw,
        root: parsed.root,
        quality: parsed.quality,
        qualityLabel: qualityDef.label,
        symbol: parsed.root + parsed.symbol.slice(parsed.root.length),
        bass: parsed.bass,
        tensions: parsed.tensions || [],
        roman: roman,
        function: functionLabel,
        isDiatonic: isDiatonic,
        note: note,
        context: ctx,
        tones: tones,
        scales: scales,
        allScaleKeys: allScaleKeys,
        arpeggios: arpeggios,
        targetNote: targetNote,
        targetLabel: targetLabel
      };
    });

    return {
      tonic: tonicName,
      mode: mode,
      field: field,
      chords: chords
    };
  }

  return {
    mod12: mod12,
    parseNoteName: parseNoteName,
    noteAt: noteAt,
    pitchClassOf: pitchClassOf,
    scaleNotes: scaleNotes,
    chordTones: chordTones,
    parseChordSymbol: parseChordSymbol,
    chordNotes: chordNotes,
    chordNotesText: chordNotesText,
    transposeChordSymbol: transposeChordSymbol,
    transposeProgression: transposeProgression,
    familyOf: familyOf,
    buildDiatonicField: buildDiatonicField,
    triadFromThird: triadFromThird,
    analyzeProgression: analyzeProgression
  };
});
