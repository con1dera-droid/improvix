/**
 * IMPROVIX — notação (Etapa 2)
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
    // o acidente não muda a linha: B#4 soa como C5 mas é escrito no lugar do B4
    var acc = 0;
    for (var ai = 1; ai < name.length; ai++) acc += name.charAt(ai) === '#' ? 1 : (name.charAt(ai) === 'b' ? -1 : 0);
    var octave = Math.floor((midi - acc) / 12) - 1;
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
    // Largura do tempo cresce com a densidade (sextinas precisam de espaço).
    var perBeat = {};
    events.forEach(function (e) { var b = Math.floor(e.onset + 1e-6); perBeat[b] = (perBeat[b] || 0) + 1; });
    var dens = Math.max.apply(null, Object.keys(perBeat).map(function (k) { return perBeat[k]; }).concat([1]));
    var pxBeat = Math.max(62, dens * 19), left = 58, barPad = 14;
    function xAt(beat) { var bar = Math.min(nBars - 1, Math.floor(beat / bpb + 1e-6)); return left + beat * pxBeat + bar * barPad + 14; }
    var width = xAt(nBars * bpb) + 10;
    var extra = (opts.chords || []).length ? 16 : 0; // espaço para as notas do acorde embaixo da cifra
    var height = 215 + extra;
    var staffTop = 95 + extra, gap = 10;
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
      // notas que formam o acorde, embaixo da cifra
      var tones = theory && theory.chordNotesText ? theory.chordNotesText(ch.symbol, '-') : '';
      if (tones) out += '<text x="' + (xAt(ch.beat) - 6) + '" y="31" font-size="10" fill="' + label + '">(' + tones + ')</text>';
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
      var mark = '';
      if (e.art === 'h') mark = 'h';
      else if (e.art === 'p') mark = 'p';
      else if (e.art === 'sl') mark = 'sl.';
      else if (e.art === 'r') mark = 'r';
      else if (e.art === 'b') mark = 'b' + ((e.midi - e.bendFrom) === 1 ? '½' : '1');
      if (mark) s2 += '<text x="' + n.x + '" y="36" font-size="10" font-style="italic" text-anchor="middle" fill="var(--accent, #3b82f6)">' + mark + '</text>';
      if (e.vibrato) s2 += '<path d="M' + (n.x - 6) + ' 44 q 2 -3 4 0 t 4 0 t 4 0 t 4 0" fill="none" stroke="' + label + '" stroke-width="1.2"/>';
      if (e.accent) s2 += '<text x="' + n.x + '" y="' + (bottomLineY + 56) + '" font-size="11" text-anchor="middle" fill="' + label + '">&gt;</text>';
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
        out += '<text x="' + tx + '" y="' + ty + '" font-size="11" font-style="italic" text-anchor="middle" fill="' + label + '">' + (g.items[0].e.tuplet || 3) + '</text>';
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

  // ---------------------------------------------------------------------
  // Tablatura "inteligente": digitação por programação dinâmica
  // ---------------------------------------------------------------------

  var SAME_STRING = { h: true, p: true, sl: true, r: true };

  /**
   * Escolhe corda/casa para cada nota de uma frase com articulações:
   *   - hammer-on, pull-off, slide e release ficam na MESMA corda da nota anterior;
   *   - bend é digitado na nota de baixo (bendFrom) e nunca em corda solta;
   *   - notas marcadas com tabHint {sweep, dir} vão uma por corda, na direção
   *     do arpejo (sweep picking); {nps3} prefere 3 notas por corda;
   *   - no resto, minimiza deslocamentos de mão, pulos de corda e casas altas.
   * `events`: eventos já realizados (midi final do instrumento), com rests.
   * Devolve { notes: [{string, fret, bendFret, token, pick}], dropped: [índices] }
   * — `dropped` são articulações impossíveis naquela digitação (removidas).
   */
  function toTabEvents(events, instrument) {
    var strings = TUNINGS[instrument];
    if (!strings) return null;
    var notes = events.filter(function (e) { return !e.rest; });
    if (!notes.length) return { notes: [], dropped: [] };
    var maxFret = 17;

    var cands = notes.map(function (e) {
      var fingerMidi = e.art === 'b' && e.bendFrom !== undefined ? e.bendFrom : e.midi;
      var list = [];
      strings.forEach(function (open, s) {
        var f = fingerMidi - open;
        if (f < 0 || f > maxFret) return;
        if (e.art === 'b' && f === 0) return;
        list.push({ s: s, f: f, bf: e.art === 'b' ? e.midi - open : null });
      });
      if (!list.length) {
        var f0 = Math.max(0, fingerMidi - strings[0]);
        list.push({ s: 0, f: Math.min(f0, 24), bf: null });
      }
      return list;
    });

    function cost(pc, cc, pe, ce) {
      var c = 0;
      var ds = cc.s - pc.s;
      var sameStringNeeded = SAME_STRING[ce.art];
      if (sameStringNeeded && ds !== 0) c += 60;
      var sw = ce.tabHint && pe.tabHint && ce.tabHint.sweep !== undefined && ce.tabHint.sweep === pe.tabHint.sweep;
      if (sw && !sameStringNeeded) {
        var want = ce.tabHint.dir > 0 ? 1 : -1;
        if (ds !== want) c += 40;
      }
      var np = ce.tabHint && pe.tabHint && ce.tabHint.nps3 !== undefined && ce.tabHint.nps3 === pe.tabHint.nps3;
      var shift = (cc.f > 0 && pc.f > 0) ? Math.abs(cc.f - pc.f) : 0;
      if (ce.art === 'sl') c += 0; // slide é justamente para mudar de posição
      else if (ds === 0) c += shift > 4 ? 6 + shift : shift * 0.35;
      else c += shift > 4 ? 2 + (shift - 4) * 1.2 : shift * 0.25;
      c += Math.abs(ds) > 1 ? (Math.abs(ds) - 1) * 0.9 : 0;
      if (np) c += ds === 0 ? 0 : 0.4;
      if (cc.f === 0) c += 0.8;
      if (cc.f > 12) c += (cc.f - 12) * 0.25;
      return c;
    }

    // Viterbi
    var dp = [cands[0].map(function (c) { return { cost: Math.abs(c.f - 7) * 0.15 + (c.f === 0 ? 0.8 : 0), prev: -1 }; })];
    for (var i = 1; i < notes.length; i++) {
      dp.push(cands[i].map(function (cc) {
        var best = { cost: Infinity, prev: -1 };
        cands[i - 1].forEach(function (pc, j) {
          var v = dp[i - 1][j].cost + cost(pc, cc, notes[i - 1], notes[i]);
          if (v < best.cost) best = { cost: v, prev: j };
        });
        return best;
      }));
    }
    var last = dp[dp.length - 1];
    var bi = 0;
    last.forEach(function (d, j) { if (d.cost < last[bi].cost) bi = j; });
    var path = [];
    for (var k = notes.length - 1; k >= 0; k--) { path.unshift(cands[k][bi]); bi = dp[k][bi].prev; }

    var dropped = [];
    var out = path.map(function (c, idx) {
      var e = notes[idx];
      var art = e.art;
      if (idx > 0 && SAME_STRING[art] && path[idx - 1].s !== c.s) { dropped.push(idx); art = null; }
      if (idx === 0 && SAME_STRING[art]) { dropped.push(idx); art = null; }
      var tok = String(c.f);
      if (art === 'h') tok = 'h' + c.f;
      else if (art === 'p') tok = 'p' + c.f;
      else if (art === 'r') tok = 'r' + c.f;
      else if (art === 'sl') tok = (idx > 0 && path[idx - 1].f > c.f ? '\\' : '/') + c.f;
      else if (art === 'b' && c.bf !== null) tok = c.f + 'b' + c.bf;
      if (e.ghost && !art) tok = '(' + tok + ')';
      if (e.vibrato) tok += '~';
      return { string: c.s, fret: c.f, bendFret: c.bf, token: tok, art: art };
    });

    // Palhetada econômica/sweep: mudando para corda mais aguda = para baixo,
    // para corda mais grave = para cima; na mesma corda, alterna. Notas ligadas
    // (h, p, slide, release) não são palhetadas.
    var lastPick = null, lastString = null;
    out.forEach(function (n) {
      if (n.art && SAME_STRING[n.art]) { n.pick = ''; lastString = n.string; return; }
      var pk;
      if (lastPick === null) pk = 'D';
      else if (n.string > lastString) pk = 'D';
      else if (n.string < lastString) pk = 'U';
      else pk = lastPick === 'D' ? 'U' : 'D';
      n.pick = pk; lastPick = pk; lastString = n.string;
    });
    return { notes: out, dropped: dropped };
  }

  /** Texto da tablatura (monoespaçado) com linha de palhetada e legenda. */
  function renderTabText(events, tab, instrument) {
    var strings = TUNINGS[instrument];
    var six = strings.length === 6;
    var labels = six ? ['e', 'B', 'G', 'D', 'A', 'E'] : ['G', 'D', 'A', 'E'];
    var order = six ? [5, 4, 3, 2, 1, 0] : [3, 2, 1, 0];
    var rows = order.map(function () { return ''; });
    var pickRow = '';
    var k = 0;
    events.forEach(function (e) {
      if (e.rest) {
        rows = rows.map(function (r) { return r + '--'; });
        pickRow += '  ';
        return;
      }
      var n = tab.notes[k++];
      var w = Math.max(3, n.token.length + 1);
      order.forEach(function (s, ri) {
        var t = s === n.string ? n.token : '';
        rows[ri] += (t + '-'.repeat(w)).slice(0, w);
      });
      pickRow += ((n.pick || ' ') + ' '.repeat(w)).slice(0, w);
    });
    var lines = labels.map(function (l, i) { return l + '|' + rows[i] + '|'; });
    lines.push(' ' + ' ' + pickRow);
    return lines.join('\n');
  }

  /**
   * Prepara uma frase (eventos com articulações) para um instrumento: desloca
   * as oitavas para a tessitura dele e, se tiver traste, calcula a digitação;
   * articulações impossíveis naquela digitação são removidas (assim o que se
   * ouve é exatamente o que a tablatura mostra).
   * Devolve { events, tab } (tab = null em instrumentos sem traste).
   */
  function prepareForInstrument(events, instrument) {
    var notes = events.filter(function (e) { return !e.rest; });
    var shift = 0;
    if (notes.length) {
      var real = realizeForInstrument(notes.map(function (e) { return e.name; }), instrument, notes.map(function (e) { return e.midi; }));
      shift = real[0].midi - notes[0].midi;
    }
    var ev = events.map(function (e) {
      if (e.rest) return Object.assign({}, e);
      var o = Object.assign({}, e, { midi: e.midi + shift });
      if (e.bendFrom !== undefined) o.bendFrom = e.bendFrom + shift;
      return o;
    });
    var tab = TUNINGS[instrument] ? toTabEvents(ev, instrument) : null;
    if (tab && tab.dropped.length) {
      var k = 0;
      ev.forEach(function (e) {
        if (e.rest) return;
        if (tab.dropped.indexOf(k) >= 0) { delete e.art; }
        k++;
      });
    }
    return { events: ev, tab: tab };
  }

  // ---------------------------------------------------------------------
  // Diagramas: braço (guitarra/violão/baixo) e teclado
  // ---------------------------------------------------------------------

  /**
   * Diagrama do braço com as notas de uma escala.
   * opts: { instrument, notes: [{ pc, label, root }], fromFret (0), frets (12) }
   */
  function fretboardSVG(opts) {
    opts = opts || {};
    var strings = TUNINGS[opts.instrument] || TUNINGS.guitarra;
    var fromFret = Math.max(0, opts.fromFret || 0);
    var nFrets = opts.frets || 12;
    var byPc = {};
    (opts.notes || []).forEach(function (n) { byPc[((n.pc % 12) + 12) % 12] = n; });

    var left = 34, top = 26, fw = 46, sh = 26;
    var width = left + (nFrets + 1) * fw + 14;
    var height = top + strings.length * sh + 26;
    var line = 'var(--staff-line, #5c6c8f)', label = 'var(--staff-label, #94a3c4)', ink = 'var(--staff-note, #e7ecf7)';
    var out = '';
    var order = strings.slice().reverse(); // corda mais aguda em cima

    // cordas
    order.forEach(function (openMidi, i) {
      var y = top + i * sh + sh / 2;
      out += '<line x1="' + (left + fw * 0.5) + '" y1="' + y + '" x2="' + (left + (nFrets + 0.5) * fw) + '" y2="' + y + '" stroke="' + line + '" stroke-width="1"/>';
      out += '<text x="8" y="' + (y + 4) + '" font-size="11" fill="' + label + '">' +
        (NOTE_NAMES_SHARP[((openMidi % 12) + 12) % 12]) + '</text>';
    });
    // trastes
    for (var f = 0; f <= nFrets; f++) {
      var x = left + (f + 0.5) * fw;
      var isNut = fromFret === 0 && f === 0;
      out += '<line x1="' + x + '" y1="' + (top + sh / 2) + '" x2="' + x + '" y2="' + (top + (strings.length - 0.5) * sh) + '" stroke="' + line + '" stroke-width="' + (isNut ? 3.5 : 1) + '"/>';
      if (f > 0) {
        var num = fromFret + f;
        if ([3, 5, 7, 9, 12, 15, 17, 19, 21, 24].indexOf(num) >= 0) {
          out += '<text x="' + (x - fw / 2) + '" y="' + (top + strings.length * sh + 14) + '" font-size="11" text-anchor="middle" fill="' + label + '">' + num + '</text>';
        }
      }
    }
    // notas
    order.forEach(function (openMidi, i) {
      var y = top + i * sh + sh / 2;
      for (var f = 0; f <= nFrets; f++) {
        var fret = fromFret + f;
        if (fromFret > 0 && f === 0) continue; // a "casa 0" só existe quando o diagrama começa na pestana
        var pc = ((openMidi + fret) % 12 + 12) % 12;
        var n = byPc[pc];
        if (!n) continue;
        var cx = left + (f === 0 ? 0.5 * fw - 12 : (f + 0.5) * fw - fw / 2);
        out += '<circle cx="' + cx + '" cy="' + y + '" r="9.5" fill="' + (n.root ? 'var(--accent-2, #22c55e)' : 'var(--accent, #3b82f6)') + '" opacity="' + (n.root ? 1 : 0.85) + '"/>';
        out += '<text x="' + cx + '" y="' + (y + 3.5) + '" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">' + n.label + '</text>';
      }
    });
    out += '<text x="' + left + '" y="14" font-size="11" fill="' + label + '">' + (opts.title || '') + '</text>';
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:' + width + 'px" height="' + height + '">' + out + '</svg>';
  }

  var NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /**
   * Diagrama do teclado (2 oitavas) com as notas da escala marcadas.
   * opts: { notes: [{ pc, label, root }], octaves (2) }
   */
  function keyboardSVG(opts) {
    opts = opts || {};
    var octaves = opts.octaves || 2;
    var byPc = {};
    (opts.notes || []).forEach(function (n) { byPc[((n.pc % 12) + 12) % 12] = n; });
    var WHITE = [0, 2, 4, 5, 7, 9, 11];
    var BLACK = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 }; // pc -> índice da tecla branca à esquerda
    var ww = 30, wh = 116, bw = 19, bh = 72, top = 8;
    var nWhite = 7 * octaves;
    var width = nWhite * ww + 2, height = top + wh + 6;
    var out = '';
    for (var o = 0; o < octaves; o++) {
      for (var i = 0; i < 7; i++) {
        var x = (o * 7 + i) * ww + 1;
        var pc = WHITE[i];
        var n = byPc[pc];
        out += '<rect x="' + x + '" y="' + top + '" width="' + (ww - 1) + '" height="' + wh + '" rx="3" fill="#f4f6fb" stroke="#2b3a5e"/>';
        if (n) {
          out += '<circle cx="' + (x + ww / 2 - 0.5) + '" cy="' + (top + wh - 20) + '" r="10" fill="' + (n.root ? 'var(--accent-2, #22c55e)' : 'var(--accent, #3b82f6)') + '"/>';
          out += '<text x="' + (x + ww / 2 - 0.5) + '" y="' + (top + wh - 16.5) + '" font-size="9.5" font-weight="700" text-anchor="middle" fill="#fff">' + n.label + '</text>';
        }
      }
    }
    for (o = 0; o < octaves; o++) {
      Object.keys(BLACK).forEach(function (pcStr) {
        var pcb = Number(pcStr);
        var wi = BLACK[pcb];
        var bx = (o * 7 + wi) * ww + ww - bw / 2 + 1;
        out += '<rect x="' + bx + '" y="' + top + '" width="' + bw + '" height="' + bh + '" rx="2.5" fill="#0f172a" stroke="#2b3a5e"/>';
        var nb = byPc[pcb];
        if (nb) {
          out += '<circle cx="' + (bx + bw / 2) + '" cy="' + (top + bh - 14) + '" r="8.5" fill="' + (nb.root ? 'var(--accent-2, #22c55e)' : 'var(--accent, #3b82f6)') + '"/>';
          out += '<text x="' + (bx + bw / 2) + '" y="' + (top + bh - 10.5) + '" font-size="8.5" font-weight="700" text-anchor="middle" fill="#fff">' + nb.label + '</text>';
        }
      });
    }
    return '<svg viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width:' + width + 'px" height="' + height + '">' + out + '</svg>';
  }

  var TAB_LEGEND = 'h hammer-on · p pull-off · / \\ slide · b bend · r release · ~ vibrato · ( ) nota fantasma · D/U palhetada para baixo/cima';

  /** Desloca a frase inteira em oitavas para ler bem na clave de sol (centro em B4). */
  function centerForStaff(events) {
    var ns = events.filter(function (e) { return !e.rest; });
    if (!ns.length) return events;
    var mean = ns.reduce(function (a, e) { return a + e.midi; }, 0) / ns.length;
    var shift = 12 * Math.round((71 - mean) / 12);
    return events.map(function (e) { return e.rest ? e : Object.assign({}, e, { midi: e.midi + shift }); });
  }

  return {
    toTabEvents: toTabEvents,
    fretboardSVG: fretboardSVG,
    keyboardSVG: keyboardSVG,
    prepareForInstrument: prepareForInstrument,
    renderTabText: renderTabText,
    TAB_LEGEND: TAB_LEGEND,
    toRhythmStaffSVG: toRhythmStaffSVG,
    centerForStaff: centerForStaff,
    realizeForInstrument: realizeForInstrument,
    toTab: toTab,
    toStaffSVG: toStaffSVG,
    staffPosition: staffPosition,
    TUNINGS: TUNINGS
  };
});
