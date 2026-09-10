/**
 * ImprovisaLab — motor de teoria musical (Etapa 1)
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
    var targetLetterIdx = (rootLetterIdx + letterSteps) % NOTE_LETTERS.length;
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

  // Ordem importa: padrões mais específicos primeiro.
  var CHORD_PATTERNS = [
    [/^(maj9|Maj9|M9|Δ9)/, 'major9'],
    [/^(maj7|Maj7|M7|Δ7|Δ)/, 'major7'],
    [/^(maj13|maj11|M13|M11)/, 'major7'],
    [/^(maj6|6\/9|69)/, 'major6'],
    [/^(maj)$/, 'major'],
    [/^(m\(maj7\)|mMaj7|mM7|minMaj7|m\/maj7)/, 'minMaj7'],
    [/^(m7b5|m7-5|min7b5|ø7?)/, 'm7b5'],
    [/^(dim7|°7|o7)/, 'dim7'],
    [/^(dim|°|o)(?![a-zA-Z0-9])/, 'dim'],
    [/^(m6|min6|-6)/, 'minor6'],
    [/^(m9|min9|-9)/, 'minor9'],
    [/^(m11|min11|-11|m13|min13|-13)/, 'minor7'],
    [/^(m7|min7|-7)/, 'minor7'],
    [/^(m(?!aj)|min|-)(?![a-zA-Z])/, 'minor'],
    [/^(9)/, 'dominant9'],
    [/^(13|11)/, 'dominant7'],
    [/^(7)/, 'dominant7'],
    [/^(6)/, 'major6'],
    [/^(add9)/, 'add9'],
    [/^(sus4|sus)/, 'sus4'],
    [/^(sus2)/, 'sus2'],
    [/^(aug|\+)/, 'aug'],
    [/^(5)/, 'power5']
  ];

  /**
   * Interpreta uma cifra (ex.: "Gmaj7", "Bbm7b5", "F#7") e devolve
   * { root, quality, symbol } ou null se não conseguir reconhecer.
   */
  function parseChordSymbol(raw) {
    var symbol = (raw || '').trim();
    if (!symbol) return null;
    var m = /^([A-Ga-g])(#{1,2}|b{1,2})?/.exec(symbol);
    if (!m) return null;
    var root = m[1].toUpperCase() + (m[2] || '');
    var rest = symbol.slice(m[0].length).trim();

    var quality = 'major';
    if (rest === '') {
      quality = 'major';
    } else {
      for (var i = 0; i < CHORD_PATTERNS.length; i++) {
        if (CHORD_PATTERNS[i][0].test(rest)) {
          quality = CHORD_PATTERNS[i][1];
          break;
        }
      }
    }
    if (!parseNoteName(root)) return null;
    return { root: root, quality: quality, symbol: symbol };
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
    if (['dominant7', 'dominant9'].indexOf(qualityKey) >= 0) return 'dominant';
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
   */
  function analyzeProgression(chordSymbols, tonicName, mode, level) {
    var field = buildDiatonicField(tonicName, mode);
    var scaleLimit = level === 'iniciante' ? 1 : (level === 'intermediario' ? 2 : 3);
    var showSubArpeggio = level !== 'iniciante';

    var chords = chordSymbols.map(function (raw) {
      var parsed = parseChordSymbol(raw);
      if (!parsed) {
        return { raw: raw, error: 'Não foi possível reconhecer o acorde "' + raw + '".' };
      }
      var pc = pitchClassOf(parsed.root);
      var directIndex = field.findIndex(function (d) { return pitchClassOf(d.root) === pc; });
      var compatible = directIndex >= 0 &&
        (familyOf(parsed.quality) === 'loose' || familyOf(parsed.quality) === familyOf(field[directIndex].quality));

      var roman, functionLabel, isDiatonic, note = '';
      if (compatible) {
        isDiatonic = true;
        roman = field[directIndex].roman;
        functionLabel = field[directIndex].function;
      } else {
        isDiatonic = false;
        var isDominantish = parsed.quality.indexOf('dominant') === 0;
        if (mode === 'menor' && directIndex === 4 && isDominantish) {
          // Dominante "emprestado" da menor harmônica — uso muito comum.
          roman = 'V';
          functionLabel = 'Dominante';
          note = 'Dominante emprestado da escala menor harmônica (o V natural da menor natural seria m7).';
        } else {
          // Tenta reconhecer dominante secundário: raiz = 5ª acima de algum grau.
          var secIndex = field.findIndex(function (d) {
            return pitchClassOf(d.root) === mod12(pc - 7);
          });
          if (isDominantish && secIndex >= 0 && secIndex !== 4) {
            roman = 'V/' + field[secIndex].roman;
            functionLabel = 'Dominante secundário';
            note = 'Empréstimo: resolve para ' + field[secIndex].roman + '.';
          } else {
            roman = '—';
            functionLabel = 'Cromático / empréstimo';
            note = 'Acorde fora do campo harmônico de ' + tonicName + ' ' + mode + '.';
          }
        }
      }

      var tones = chordTones(parsed.root, parsed.quality);
      var qualityDef = DATA.QUALITIES[parsed.quality];

      var scaleKeys = DATA.scalesForChord(parsed.quality, roman.replace('V/', ''), mode).slice(0, scaleLimit);
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
      if (parsed.quality === 'sus4') { targetNote = tones[1]; targetLabel = '4ª'; }
      else if (parsed.quality === 'sus2') { targetNote = tones[1]; targetLabel = '9ª (2ª)'; }
      else if (parsed.quality === 'power5') { targetNote = tones[1]; targetLabel = '5ª'; }
      else { targetNote = tones[1]; targetLabel = '3ª'; }

      return {
        raw: raw,
        root: parsed.root,
        quality: parsed.quality,
        qualityLabel: qualityDef.label,
        symbol: parsed.root + parsed.symbol.slice(parsed.root.length),
        roman: roman,
        function: functionLabel,
        isDiatonic: isDiatonic,
        note: note,
        tones: tones,
        scales: scales,
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
    buildDiatonicField: buildDiatonicField,
    triadFromThird: triadFromThird,
    analyzeProgression: analyzeProgression
  };
});
