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
  // Só existe para instrumentos com trastes/cordas soltas fixas (onde faz
  // sentido mostrar tablatura). Sopros e cordas friccionadas (arco) tocam
  // uma nota de cada vez e usam partitura/cifra, não tablatura.
  var TUNINGS = {
    guitarra: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    violao: [40, 45, 50, 55, 59, 64],   // mesma afinação padrão da guitarra
    baixo: [28, 33, 38, 43],            // E1 A1 D2 G2
    teclado: null,
    sax: null,
    trompete: null,
    violino: null,
    flauta: null
  };

  // Centro de tessitura (MIDI) usado para "realizar" a oitava de cada nota —
  // mantém a linha melódica dentro da faixa confortável de cada instrumento.
  // Aqui trabalhamos sempre em tom concertante (soa como está escrito); sax
  // e trompete são instrumentos transpositores na partitura tradicional
  // deles, mas isso fica para uma etapa futura — por ora o áudio e as notas
  // mostradas já soam/estão certas, só a "leitura transposta" de quem toca
  // sax/trompete fica de fora.
  var INSTRUMENT_CENTER = {
    guitarra: 62,
    violao: 62,
    baixo: 41,
    teclado: 64,
    sax: 65,      // sax alto, região confortável em torno de F4
    trompete: 70, // trompete, região confortável em torno de Bb4
    violino: 69,  // cordas soltas G3 D4 A4 E5, centro perto de A4
    flauta: 72    // flauta transversal, região confortável em torno de C5
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

  /**
   * Realiza a oitava de cada nota para o instrumento. Se a frase já traz as
   * alturas absolutas (`midi`, gerado por js/phrases.js — preserva o desenho
   * real da linha, com saltos de 6ª, arpejos etc.), só desloca a frase
   * inteira em oitavas para cair na região confortável do instrumento.
   * Sem `midi`, usa a condução "nota mais próxima da anterior".
   */
  function realizeForInstrument(noteNames, instrument, midi) {
    var center = INSTRUMENT_CENTER[instrument] || 60;
    if (midi && midi.length === noteNames.length) {
      var mean = midi.reduce(function (a, b) { return a + b; }, 0) / midi.length;
      var shift = 12 * Math.round((center - mean) / 12);
      return noteNames.map(function (name, i) { return { name: name, midi: midi[i] + shift }; });
    }
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

  /**
   * Partitura COM RITMO (usada pela Biblioteca de Fraseados): colcheias com
   * colchete (barra), semicolcheias, tercinas com o "3", semínimas, mínimas,
   * pausas, pontos de aumento, barras de compasso e cifras em cima.
   * `events`: [{name, midi, dur, onset, rest, triplet}] (tempos em semínimas).
   * `opts.chords`: [{beat, symbol}]; `opts.beatsPerBar` (padrão 4).
   */
  function toRhythmStaffSVG(events, opts) {
    opts = opts || {};
    var bpb = opts.beatsPerBar || 4;
    var total = events.reduce(function (a, e) { return Math.max(a, e.onset + e.dur); }, 0);
    var nBars = Math.max(1, Math.ceil(total / bpb - 1e-6));
    var pxBeat = 62, left = 58, barPad = 14;
    function xAt(beat) { var bar = Math.min(nBars - 1, Math.floor(beat / bpb + 1e-6)); return left + beat * pxBeat + bar * barPad + 14; }
    var width = xAt(nBars * bpb) + 10;
    var height = 215;
    var staffTop = 95, gap = 10;
    var bottomLineY = staffTop + 40;
    var midY = bottomLineY - 4 * gap;
    var ink = 'var(--staff-note, #e7ecf7)', lineC = 'var(--staff-line, #5c6c8f)', label = 'var(--staff-label, #94a3c4)';
    function yFor(pos) { return bottomLineY - pos * gap; }
    var out = '';

    for (var i = 0; i < 5; i++) {
      var ly = bottomLineY - i * gap * 2;
      out += '<line x1="40" y1="' + ly + '" x2="' + (width - 8) + '" y2="' + ly + '" stroke="' + lineC + '" stroke-width="1"/>';
    }
    out += '<text x="10" y="' + (bottomLineY - 25) + '" font-size="26" fill="' + label + '">𝄞</text>';
    for (var b = 1; b <= nBars; b++) {
      var bx = xAt(b * bpb) - barPad / 2 - 8;
      if (b === nBars) bx = width - 10;
      out += '<line x1="' + bx + '" y1="' + (bottomLineY - 40) + '" x2="' + bx + '" y2="' + bottomLineY + '" stroke="' + lineC + '" stroke-width="' + (b === nBars ? 2.5 : 1) + '"/>';
    }
    (opts.chords || []).forEach(function (ch) {
      out += '<text x="' + (xAt(ch.beat) - 6) + '" y="16" font-size="13" font-weight="700" fill="' + ink + '">' + ch.symbol + '</text>';
    });

    // Posições e hastes
    var notes = events.map(function (e) {
      if (e.rest) return { e: e, x: xAt(e.onset) };
      var pos = staffPosition(e.name, e.midi);
      return { e: e, x: xAt(e.onset), pos: pos, y: yFor(pos) };
    });

    // Agrupa figuras menores que a semínima dentro do mesmo tempo (colchete).
    var groups = [], cur = null;
    notes.forEach(function (n) {
      var e = n.e;
      var shortNote = !e.rest && e.dur < 1 - 1e-6;
      var beatIdx = Math.floor(e.onset + 1e-6);
      if (shortNote && cur && cur.beat === beatIdx && cur.triplet === !!e.triplet) cur.items.push(n);
      else if (shortNote) { cur = { beat: beatIdx, triplet: !!e.triplet, items: [n] }; groups.push(cur); }
      else cur = null;
      if (e.rest) cur = null;
    });

    function ledger(n) {
      var s2 = '', p;
      if (n.pos < 0) for (p = -2; p >= n.pos; p -= 2) s2 += '<line x1="' + (n.x - 10) + '" y1="' + yFor(p) + '" x2="' + (n.x + 10) + '" y2="' + yFor(p) + '" stroke="' + lineC + '"/>';
      if (n.pos > 8) for (p = 10; p <= n.pos; p += 2) s2 += '<line x1="' + (n.x - 10) + '" y1="' + yFor(p) + '" x2="' + (n.x + 10) + '" y2="' + yFor(p) + '" stroke="' + lineC + '"/>';
      return s2;
    }

    function head(n) {
      var e = n.e, s2 = ledger(n);
      var acc = accidentalOf(e.name);
      if (acc) {
        var accTxt = e.name.slice(1).replace(/#/g, '♯').replace(/b/g, '♭');
        s2 += '<text x="' + (n.x - 11) + '" y="' + (n.y + 4) + '" font-size="13" text-anchor="end" fill="' + ink + '">' + accTxt + '</text>';
      }
      var hollow = e.dur >= 2 - 1e-6;
      s2 += '<ellipse cx="' + n.x + '" cy="' + n.y + '" rx="6" ry="4.5" transform="rotate(-20 ' + n.x + ' ' + n.y + ')" ' +
        (hollow ? 'fill="none" stroke="' + ink + '" stroke-width="1.6"' : 'fill="' + ink + '"') + '/>';
      var dotted = [0.75, 1.5, 3].some(function (d) { return Math.abs(e.dur - d) < 1e-6; });
      if (dotted) s2 += '<circle cx="' + (n.x + 10) + '" cy="' + (n.y - (n.pos % 2 === 0 ? 4 : 0)) + '" r="1.8" fill="' + ink + '"/>';
      s2 += '<text x="' + n.x + '" y="' + (bottomLineY + 42) + '" font-size="9.5" text-anchor="middle" fill="' + label + '">' + e.name + '</text>';
      return s2;
    }

    function stem(n, up, endY) {
      var sx = up ? n.x + 5.5 : n.x - 5.5;
      return '<line x1="' + sx + '" y1="' + n.y + '" x2="' + sx + '" y2="' + endY + '" stroke="' + ink + '" stroke-width="1.3"/>';
    }

    var inGroup = {};
    groups.forEach(function (g) {
      g.items.forEach(function (n) { inGroup[n.e.onset.toFixed(4)] = true; });
      var avg = g.items.reduce(function (a, n) { return a + n.pos; }, 0) / g.items.length;
      var up = avg < 4;
      var beamY = up ? Math.min.apply(null, g.items.map(function (n) { return n.y; })) - 30
        : Math.max.apply(null, g.items.map(function (n) { return n.y; })) + 30;
      g.items.forEach(function (n) { out += head(n) + stem(n, up, beamY); });
      var x0 = g.items[0].x + (up ? 5.5 : -5.5), x1 = g.items[g.items.length - 1].x + (up ? 5.5 : -5.5);
      if (g.items.length === 1) {
        // colcheia/semicolcheia solta: bandeirola
        var fy = beamY, dir = up ? 1 : -1;
        out += '<path d="M' + x0 + ' ' + fy + ' q 8 ' + (8 * dir) + ' 6 ' + (18 * dir) + '" fill="none" stroke="' + ink + '" stroke-width="1.6"/>';
        if (g.items[0].e.dur <= 0.25 + 1e-6) out += '<path d="M' + x0 + ' ' + (fy + 7 * dir) + ' q 8 ' + (8 * dir) + ' 6 ' + (18 * dir) + '" fill="none" stroke="' + ink + '" stroke-width="1.6"/>';
      } else {
        out += '<line x1="' + x0 + '" y1="' + beamY + '" x2="' + x1 + '" y2="' + beamY + '" stroke="' + ink + '" stroke-width="4"/>';
        var y2 = beamY + (up ? 7 : -7);
        for (var k = 0; k < g.items.length; k++) {
          var n = g.items[k];
          if (n.e.dur > 0.25 + 1e-6) continue;
          var nx = n.x + (up ? 5.5 : -5.5);
          var nb = g.items[k + 1], pb = g.items[k - 1];
          if (nb && nb.e.dur <= 0.25 + 1e-6) out += '<line x1="' + nx + '" y1="' + y2 + '" x2="' + (nb.x + (up ? 5.5 : -5.5)) + '" y2="' + y2 + '" stroke="' + ink + '" stroke-width="4"/>';
          else if (!(pb && pb.e.dur <= 0.25 + 1e-6)) {
            var stub = nb ? 9 : -9;
            out += '<line x1="' + nx + '" y1="' + y2 + '" x2="' + (nx + stub) + '" y2="' + y2 + '" stroke="' + ink + '" stroke-width="4"/>';
          }
        }
      }
      if (g.triplet) {
        var tx = (x0 + x1) / 2, ty = up ? beamY - 7 : beamY + 15;
        out += '<text x="' + tx + '" y="' + ty + '" font-size="11" font-style="italic" text-anchor="middle" fill="' + label + '">3</text>';
      }
    });

    notes.forEach(function (n) {
      var e = n.e;
      if (e.rest) {
        var x = n.x;
        if (e.dur >= 2 - 1e-6) out += '<rect x="' + (x - 6) + '" y="' + (midY - 5) + '" width="12" height="5" fill="' + ink + '"/>';
        else if (e.dur >= 1 - 1e-6) out += '<path d="M' + (x - 2) + ' ' + (midY - 13) + ' l6 7 l-5 5 l6 7 q-7 -3 -5 5" fill="none" stroke="' + ink + '" stroke-width="2"/>';
        else out += '<circle cx="' + (x - 2) + '" cy="' + (midY - 5) + '" r="2.6" fill="' + ink + '"/><path d="M' + (x - 2) + ' ' + (midY - 5) + ' q4 2 6 -2 l-5 14" fill="none" stroke="' + ink + '" stroke-width="1.5"/>';
        return;
      }
      if (inGroup[e.onset.toFixed(4)]) return;
      out += head(n);
      if (e.dur < 4 - 1e-6) {
        var up2 = n.pos < 4;
        out += stem(n, up2, up2 ? n.y - 32 : n.y + 32);
      }
    });

    return '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:' + width + 'px" height="' + height + '">' + out + '</svg>';
  }

  /** Desloca a frase inteira em oitavas para ler bem na clave de sol (centro em B4). */
  function centerForStaff(events) {
    var ns = events.filter(function (e) { return !e.rest; });
    if (!ns.length) return events;
    var mean = ns.reduce(function (a, e) { return a + e.midi; }, 0) / ns.length;
    var shift = 12 * Math.round((71 - mean) / 12);
    return events.map(function (e) { return e.rest ? e : Object.assign({}, e, { midi: e.midi + shift }); });
  }

  return {
    toRhythmStaffSVG: toRhythmStaffSVG,
    centerForStaff: centerForStaff,
    realizeForInstrument: realizeForInstrument,
    toTab: toTab,
    toStaffSVG: toStaffSVG,
    staffPosition: staffPosition,
    TUNINGS: TUNINGS
  };
});
