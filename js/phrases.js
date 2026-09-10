/**
 * ImprovisaLab — gerador de fraseados (Etapa 2)
 *
 * Gera, para cada acorde de uma progressão já analisada (ver theory.js),
 * uma frase melódica idiomática (não é sorteio aleatório: cada categoria
 * usa um desenho melódico real de improvisação) e uma frase final de
 * "resolução" ligando o último acorde de volta ao primeiro.
 *
 * Funciona no navegador (window.IL.phrases) e no Node (testes).
 */
(function (root, factory) {
  var theory = (typeof module !== 'undefined' && module.exports) ? require('./theory.js') : root.IL.theory;
  var mod = factory(theory);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.phrases = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory) {
  'use strict';

  var CATEGORY_LABELS = {
    melodica: 'melódica',
    blues: 'blue',
    conectando: 'conectando',
    tensao: 'tensão',
    resolucao: 'resolução'
  };

  var LEVEL_CATEGORIES = {
    iniciante: ['melodica', 'blues'],
    intermediario: ['melodica', 'blues', 'conectando', 'resolucao'],
    avancado: ['melodica', 'blues', 'conectando', 'tensao', 'resolucao']
  };

  function categoryForFunction(functionLabel) {
    switch (functionLabel) {
      case 'Tônica': return 'melodica';
      case 'Tônica relativa': return 'blues';
      case 'Subdominante': return 'conectando';
      case 'Dominante': return 'tensao';
      case 'Dominante secundário': return 'tensao';
      default: return 'conectando';
    }
  }

  function allowedCategory(cat, level) {
    var allowed = LEVEL_CATEGORIES[level] || LEVEL_CATEGORIES.avancado;
    return allowed.indexOf(cat) >= 0 ? cat : 'melodica';
  }

  function withPaddedArpeggio(tones) {
    return tones.length >= 4 ? tones : tones.concat([tones[0]]);
  }

  function melodicPhrase(chord) {
    var scaleKey = chord.scales[0] ? chord.scales[0].key : 'jonio';
    var scale = theory.scaleNotes(chord.root, scaleKey);
    if (scale.length < 6) scale = theory.scaleNotes(chord.root, 'jonio');
    var idx = [2, 3, 4, 5, 4, 3, 2, 0];
    return idx.map(function (i) { return scale[i % scale.length]; });
  }

  function bluesPhrase(chord) {
    var pent = theory.scaleNotes(chord.root, 'pentatonica_menor'); // root, b3, 4, 5, b7
    var blue = theory.noteAt(chord.root, 4, 6); // 5ª bemol ("blue note")
    return [pent[0], pent[1], pent[2], blue, pent[3], pent[1], pent[0], pent[4]];
  }

  function conectandoPhrase(chord, nextRoot) {
    var tones = withPaddedArpeggio(chord.tones);
    var seq = [tones[0], tones[1], tones[2], tones[3], tones[2], tones[1], tones[0]];
    if (nextRoot) {
      seq[seq.length - 1] = theory.noteAt(nextRoot, -1, -1); // aproximação cromática por baixo
    }
    return seq;
  }

  function tensaoPhrase(chord) {
    var entry = chord.scales.filter(function (s) { return s.key === 'alterada'; })[0] ||
      chord.scales.filter(function (s) { return s.key === 'mixolidio'; })[0];
    var scaleKey = entry ? entry.key : 'mixolidio';
    var scale = theory.scaleNotes(chord.root, scaleKey);
    return scale.slice(0, 7).concat([chord.root]);
  }

  function resolucaoPhrase(lastChord, targetRoot) {
    var tones = withPaddedArpeggio(lastChord.tones);
    var seventh = tones[3];
    var upper = theory.noteAt(targetRoot, 1, 1);
    var lower = theory.noteAt(targetRoot, -1, -1);
    return [seventh, upper, lower, targetRoot];
  }

  function explanationFor(cat, chord, notes, scaleLabel, targetChord) {
    switch (cat) {
      case 'melodica':
        return 'Começa na 3ª do ' + chord.symbol + ' (' + notes[0] + '), sobe até o 6º grau da escala de ' +
          chord.root + ' ' + scaleLabel + ' e resolve na tônica (' + notes[notes.length - 1] + ').';
      case 'blues':
        return 'Usa a pentatônica menor de ' + chord.symbol + ' com a "blue note" (' + notes[3] +
          ', 5ª bemol) para o efeito de blues.';
      case 'conectando':
        return 'Percorre o arpejo do ' + chord.symbol + ' (fundamental-3ª-5ª-7ª) e termina com uma nota ' +
          'de aproximação cromática, preparando o próximo acorde.';
      case 'tensao':
        return 'Sobe pela escala ' + scaleLabel + ' inteira sobre o ' + chord.symbol +
          ', destacando as tensões, e resolve na fundamental.';
      case 'resolucao':
        return 'Sai da 7ª do ' + chord.symbol + ' e usa um cerco cromático (por cima e por baixo) até a ' +
          'fundamental do próximo acorde (' + (targetChord ? targetChord.symbol : '') + ').';
      default:
        return '';
    }
  }

  /**
   * Gera os fraseados de uma progressão já analisada por
   * theory.analyzeProgression(...). `level`: iniciante|intermediario|avancado.
   */
  function generatePhrases(analysisResult, level) {
    var chords = analysisResult.chords.filter(function (c) { return !c.error; });
    if (chords.length === 0) return [];

    var phrases = chords.map(function (chord, i) {
      var idealCat = categoryForFunction(chord.function);
      var cat = allowedCategory(idealCat, level);
      var nextRoot = (cat === 'conectando' && chords[i + 1]) ? chords[i + 1].root : null;

      var notes, scaleLabel;
      if (cat === 'blues') {
        notes = bluesPhrase(chord);
        scaleLabel = 'Pentatônica menor (com blue note)';
      } else if (cat === 'conectando') {
        notes = conectandoPhrase(chord, nextRoot);
        scaleLabel = 'Arpejo do acorde';
      } else if (cat === 'tensao') {
        notes = tensaoPhrase(chord);
        var altEntry = chord.scales.filter(function (s) { return s.key === 'alterada'; })[0];
        scaleLabel = altEntry ? altEntry.label : (chord.scales[0] ? chord.scales[0].label : 'Mixolídio');
      } else {
        notes = melodicPhrase(chord);
        scaleLabel = chord.scales[0] ? chord.scales[0].label : 'Jônio (Maior)';
      }

      return {
        index: i + 1,
        chord: chord,
        chordSymbol: chord.symbol,
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat],
        title: 'Frase ' + (i + 1) + ' – ' + chord.symbol + ' (' + CATEGORY_LABELS[cat] + ')',
        scaleLabel: scaleLabel,
        notes: notes,
        explanation: explanationFor(cat, chord, notes, scaleLabel)
      };
    });

    if (chords.length > 1 && (level === 'intermediario' || level === 'avancado')) {
      var last = chords[chords.length - 1];
      var first = chords[0];
      var notes = resolucaoPhrase(last, first.root);
      var idx = phrases.length + 1;
      phrases.push({
        index: idx,
        chord: last,
        chordSymbol: last.symbol + ' → ' + first.symbol,
        category: 'resolucao',
        categoryLabel: CATEGORY_LABELS.resolucao,
        title: 'Frase ' + idx + ' – Resolução (' + last.symbol + ' → ' + first.symbol + ')',
        scaleLabel: 'Cromatismo (cerco à fundamental)',
        notes: notes,
        explanation: explanationFor('resolucao', last, notes, null, first)
      });
    }

    return phrases;
  }

  return {
    CATEGORY_LABELS: CATEGORY_LABELS,
    categoryForFunction: categoryForFunction,
    generatePhrases: generatePhrases
  };
});
