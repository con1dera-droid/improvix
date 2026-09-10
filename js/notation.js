/**
 * ImprovisaLab — notação (Etapa 2)
 *
 * Recebe uma sequência de nomes de nota (classes de altura, sem oitava —
 * o que o motor de teoria e o gerador de fraseados produzem) e "realiza"
 * uma oitava real para cada uma (condução de vozes simples: sempre a
 * oitava mais próxima da nota anterior), depois converte isso em:
 *   - tablatura (violão/guitarra e baixo)
 *   - posição numa pauta simplificada (para partitura)
 *   - cifra (nomes das notas em sequência)
 */
(function (root, factory) {
  var theory = (typeof module !== 'undefined' && module.exports) ? require('./theory.js') : root.IL.theory;
  var mod = factory(theory);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.notation = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory) {
  'use strict';

  var NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  // Afinação padrão, do bordão (grave) para a prima (aguda). Números = MIDI.
  var TUNINGS = {
    guitarra: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    baixo: [28, 33, 38, 43],            // E1 A1 D2 G2
    teclado: null
  };

  var INSTRUMENT_CENTER = {
    guitarra: 62,
    baixo: 41,
    teclado: 64
  };

  function nearestMidiForPitchClass(pc, prevMidi) {
    var best = null, bestDist = Infinity;
    for (var k = 0; k <= 10; k++) {
      var candidate = 12 * k + pc;
      var dist = Math.abs(candidate - prevMidi);
      if (dist < bestDist) { bestDist = dist; best = candidate; }
    }
    return best;
  }

  /** Dá uma oitava real (MIDI) para cada nome de nota, seguindo a anterior. */
  function realizeMidiSequence(noteNames, startMidi) {
    var prev = startMidi;
    return noteNames.map(function (name) {
      var pc = theory.pitchClassOf(name);
      var midi = nearestMidiForPitchClass(pc, prev);
      prev = midi;
      return { name: name, midi: midi };
    });
  }

  function realizeForInstrument(noteNames, instrument) {
    var center = INSTRUMENT_CENTER[instrument] || 60;
    return realizeMidiSequence(noteNames, center);
  }

  /** Converte uma sequência já realizada (com MIDI) em tablatura. */
  function toTab(realized, instrument) {
    var strings = TUNINGS[instrument];
    if (!strings) return null;
    var prevString = null;
    var prevFret = 5;
    var tab = realized.map(function (note) {
      var candidates = [];
      strings.forEach(function (openMidi, sIdx) {
        var fret = note.midi - openMidi;
        if (fret >= 0 && fret <= 15) candidates.push({ string: sIdx, fret: fret });
      });
      if (candidates.length === 0) {
        // fallback: usa a corda mais grave, permitindo estourar um pouco o traste
        var fallbackFret = Math.max(0, note.midi - strings[0]);
        candidates.push({ string: 0, fret: fallbackFret });
      }
      candidates.sort(function (a, b) {
        var costA = Math.abs(a.fret - prevFret) + (a.string === prevString ? 0 : 0.5);
        var costB = Math.abs(b.fret - prevFret) + (b.string === prevString ? 0 : 0.5);
        return costA - costB;
      });
      var chosen = candidates[0];
      prevString = chosen.string;
      prevFret = chosen.fret;
      return { name: note.name, string: chosen.string, fret: chosen.fret };
    });
    return tab; // string: 0 = corda mais grave
  }

  /** Posição de uma nota numa pauta simplificada de clave de sol (0 = linha de baixo, E4). */
  function staffPosition(name, midi) {
    var letter = name.charAt(0).toUpperCase();
    var letterIdx = NOTE_LETTERS.indexOf(letter);
    var octave = Math.floor(midi / 12) - 1;
    var absoluteIdx = octave * 7 + letterIdx;
    var referenceIdx = 4 * 7 + NOTE_LETTERS.indexOf('E'); // E4 = linha de baixo
    return absoluteIdx - referenceIdx;
  }

  function accidentalOf(name) {
    if (name.indexOf('#') >= 0) return '#';
    if (name.indexOf('b') >= 0) return 'b';
    return '';
  }

  /** Gera um SVG simples (string) com a pauta e as notas em sequência. */
  function toStaffSVG(realized) {
    var width = 60 + realized.length * 50;
    var height = 160;
    var staffTop = 60;
    var lineGap = 10; // px por posição (meia distância entre linhas)
    var bottomLineY = staffTop + 40; // linha 1 (E4)

    function yFor(pos) { return bottomLineY - pos * lineGap; }

    var lines = '';
    for (var i = 0; i < 5; i++) {
      var y = bottomLineY - i * (lineGap * 2);
      lines += '<line x1="40" y1="' + y + '" x2="' + (width - 20) + '" y2="' + y +
        '" stroke="var(--staff-line, #5c6c8f)" stroke-width="1"/>';
    }

    var notesSvg = '';
    realized.forEach(function (note, i) {
      var x = 70 + i * 50;
      var pos = staffPosition(note.name, note.midi);
      var y = yFor(pos);
      var acc = accidentalOf(note.name);

      var ledger = '';
      if (pos < 0) {
        for (var p = -2; p >= pos; p -= 2) {
          var ly = yFor(p);
          ledger += '<line x1="' + (x - 10) + '" y1="' + ly + '" x2="' + (x + 10) + '" y2="' + ly + '" stroke="var(--staff-line, #5c6c8f)" stroke-width="1"/>';
        }
      } else if (pos > 8) {
        for (var p2 = 10; p2 <= pos; p2 += 2) {
          var ly2 = yFor(p2);
          ledger += '<line x1="' + (x - 10) + '" y1="' + ly2 + '" x2="' + (x + 10) + '" y2="' + ly2 + '" stroke="var(--staff-line, #5c6c8f)" stroke-width="1"/>';
        }
      }

      notesSvg += ledger;
      if (acc) {
        notesSvg += '<text x="' + (x - 16) + '" y="' + (y + 4) + '" font-size="14" fill="var(--staff-note, #e7ecf7)">' + acc + '</text>';
      }
      notesSvg += '<ellipse cx="' + x + '" cy="' + y + '" rx="6" ry="4.5" fill="var(--staff-note, #e7ecf7)"/>';
      notesSvg += '<text x="' + x + '" y="' + (y + 22) + '" font-size="10" text-anchor="middle" fill="var(--staff-label, #94a3c4)">' + note.name + '</text>';
    });

    return '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" width="100%" height="' + height + '">' +
      '<text x="10" y="' + (bottomLineY - 25) + '" font-size="26" fill="var(--staff-label, #94a3c4)">𝄞</text>' +
      lines + notesSvg + '</svg>';
  }

  return {
    realizeForInstrument: realizeForInstrument,
    toTab: toTab,
    toStaffSVG: toStaffSVG,
    staffPosition: staffPosition,
    TUNINGS: TUNINGS
  };
});
