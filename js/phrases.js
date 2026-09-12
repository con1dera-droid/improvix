/**
 * ImprovisaLab — gerador de fraseados (Etapa 2, reescrito na etapa
 * "fraseados melhores")
 *
 * Gera UMA LINHA CONTÍNUA de improviso sobre a progressão: um compasso de
 * 8 colcheias (4/4) por acorde, em que o fim de cada compasso já prepara o
 * começo do seguinte (a linha "cai" na 3ª do próximo acorde, no tempo 1).
 * Depois vem uma frase de resolução ligando o último acorde ao primeiro.
 *
 * As técnicas de construção vêm de princípios clássicos da linguagem
 * jazzística e dos métodos brasileiros de harmonia/improvisação:
 *   - notas do acorde nos tempos fortes (1, 2, 3 e 4) e passagens nos
 *     contratempos;
 *   - arpejo "circular" (princípio associado a Charlie Parker): sai de uma
 *     nota do acorde, salta uma 6ª para baixo e sobe uma tríade da escala,
 *     voltando por grau conjunto a outra nota do acorde;
 *   - arpejo 3-5-7-9 (arpejo a partir da 3ª, "estrutura superior");
 *   - escalas bebop (nota de passagem cromática que acerta os tempos);
 *   - sequência de trifonia sus2 (1-2-5) deslocada pela escala;
 *   - aproximação da 3ª do próximo acorde: por grau, cromática, cerco
 *     (bordadura por cima e por baixo = "infra/ultrapolação") ou
 *     aproximação cromática dupla;
 *   - tensões do dominante: tríade de SubV sobre o V7 alterado, arpejo
 *     diminuto a partir da 3ª (b9), tríade do II grau sobre o lídio b7;
 *   - pentatônica e escala blues em grupos, com a "blue note".
 * Nada aqui é uma frase decorada: tudo é calculado a partir da análise
 * harmônica (js/theory.js) de cada acorde, em qualquer tonalidade.
 *
 * Cada frase traz `notes` (nomes, grafia correta), `midi` (altura absoluta
 * numa região neutra — a notação reposiciona pela tessitura do
 * instrumento), a técnica usada e uma explicação didática.
 *
 * Funciona no navegador (window.IL.phrases) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var theory = isNode ? require('./theory.js') : root.IL.theory;
  var data = isNode ? require('./data.js') : root.IL.data;
  var mod = factory(theory, data);
  if (isNode) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.phrases = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory, DATA) {
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

  var BAR = 8;          // colcheias por compasso (4/4)
  // Região ideal para COMEÇAR um compasso, conforme o desenho da técnica:
  // quem sobe começa mais grave, quem desce começa mais agudo.
  var IDEAL_START = { up: 62, down: 72, mixed: 69 };
  var CENTER = 67;      // região neutra (G4) — a notação ajusta por instrumento
  var LOW = 43, HIGH = 91;

  // ---------------------------------------------------------------------
  // Utilidades de altura
  // ---------------------------------------------------------------------

  function pcOf(name) { return theory.pitchClassOf(name); }
  function mod12(n) { return ((n % 12) + 12) % 12; }
  function N(name, midi) { return { name: name, midi: midi }; }

  /** "Escada" de alturas absolutas de um conjunto de notas (escala ou arpejo). */
  function buildLadder(names) {
    var seen = {};
    var out = [];
    for (var oct = 2; oct <= 8; oct++) {
      names.forEach(function (n) {
        var m = oct * 12 + pcOf(n);
        if (!seen[m]) { seen[m] = true; out.push(N(n, m)); }
      });
    }
    out.sort(function (a, b) { return a.midi - b.midi; });
    return out;
  }

  /** k passos (k>0 sobe, k<0 desce) na escada a partir de uma altura qualquer. */
  function stepFrom(ladder, midi, k) {
    var idx, i;
    if (k === 0) return nearestInLadder(ladder, midi);
    if (k > 0) {
      idx = -1;
      for (i = 0; i < ladder.length; i++) { if (ladder[i].midi > midi) { idx = i; break; } }
      if (idx < 0) idx = ladder.length - 1;
      idx += k - 1;
    } else {
      idx = -1;
      for (i = ladder.length - 1; i >= 0; i--) { if (ladder[i].midi < midi) { idx = i; break; } }
      if (idx < 0) idx = 0;
      idx += k + 1;
    }
    idx = Math.max(0, Math.min(ladder.length - 1, idx));
    return ladder[idx];
  }

  function nearestInLadder(ladder, midi) {
    var best = ladder[0];
    ladder.forEach(function (e) { if (Math.abs(e.midi - midi) < Math.abs(best.midi - midi)) best = e; });
    return best;
  }

  /** Primeira ocorrência de uma classe de altura acima (dir=1) ou abaixo (dir=-1). */
  function findPc(ladder, midi, pc, dir) {
    var i;
    if (dir > 0) {
      for (i = 0; i < ladder.length; i++) if (ladder[i].midi > midi && mod12(ladder[i].midi) === pc) return ladder[i];
    } else {
      for (i = ladder.length - 1; i >= 0; i--) if (ladder[i].midi < midi && mod12(ladder[i].midi) === pc) return ladder[i];
    }
    return null;
  }

  /** Posiciona o nome de nota na oitava mais próxima de `midi`, puxando para o centro. */
  function placeNear(name, midi) {
    var pc = pcOf(name);
    var best = null, bestCost = Infinity;
    for (var oct = 2; oct <= 8; oct++) {
      var m = oct * 12 + pc;
      var cost = Math.abs(m - midi) + 1.0 * Math.max(0, Math.abs(m - CENTER) - 6);
      if (m < LOW || m > HIGH) cost += 20;
      if (cost < bestCost) { bestCost = cost; best = m; }
    }
    return N(name, best);
  }

  // Grafia de notas cromáticas em relação a um alvo: por baixo usa a letra
  // de baixo (A# → B), por cima usa a letra de cima (Ab → G).
  function chromBelow(target) { return N(theory.noteAt(target.name, -1, -1), target.midi - 1); }
  function chromAbove(target) { return N(theory.noteAt(target.name, 1, 1), target.midi + 1); }
  function chromBelow2(target) { return N(theory.noteAt(target.name, -1, -2), target.midi - 2); }
  function chromAbove2(target) { return N(theory.noteAt(target.name, 1, 2), target.midi + 2); }

  // ---------------------------------------------------------------------
  // Contexto de cada acorde
  // ---------------------------------------------------------------------

  function primaryScaleKey(chord) {
    if (chord.allScaleKeys && chord.allScaleKeys.length) return chord.allScaleKeys[0];
    return chord.scales && chord.scales[0] ? chord.scales[0].key : 'jonio';
  }

  function isMinorQuality(q) { return ['minor', 'minor6', 'minor7', 'minor9', 'minMaj7', 'm7b5', 'dim', 'dim7'].indexOf(q) >= 0; }
  function isDominantQuality(q) { return q.indexOf('dominant') === 0; }

  function scaleKeyFor(chord, category) {
    var primary = primaryScaleKey(chord);
    if (category === 'blues') {
      if (isMinorQuality(chord.quality) || isDominantQuality(chord.quality) || chord.quality === 'power5') return 'blues_menor';
      return 'blues_maior';
    }
    if (category === 'tensao') {
      // Sobre um V7 "comum" (mixolídio), a frase de tensão usa a alterada;
      // nos demais casos a escala do acorde já é a colorida (b9 b13, dom-dim, lídio b7...).
      if (primary === 'mixolidio' || primary === 'bebop_dominante') return 'alterada';
      return primary;
    }
    return primary;
  }

  function makeCx(chord, scaleKey) {
    var scaleNames = theory.scaleNotes(chord.root, scaleKey);
    var bebopKey = DATA.BEBOP_FOR_SCALE[scaleKey] || null;
    var tonePcs = chord.tones.map(pcOf);
    return {
      chord: chord,
      scaleKey: scaleKey,
      scaleLabel: DATA.SCALES[scaleKey].label,
      scale: buildLadder(scaleNames),
      arp: buildLadder(chord.tones),
      bebopKey: bebopKey,
      bebop: bebopKey ? buildLadder(theory.scaleNotes(chord.root, bebopKey)) : null,
      isChordTone: function (n) { return tonePcs.indexOf(mod12(n.midi)) >= 0; }
    };
  }

  /** Nota-alvo de chegada no acorde: a 3ª (ou 4ª/5ª em sus/power). */
  function arrivalName(chord) {
    return chord.targetNote || chord.tones[1] || chord.root;
  }

  function degreeName(chord, name) {
    var tones = chord.tones;
    var labels = ['fundamental', chord.targetLabel || '3ª', '5ª', '7ª', '9ª'];
    var idx = tones.indexOf(name);
    if (idx >= 0) return labels[idx] || 'nota do acorde';
    return null;
  }

  // ---------------------------------------------------------------------
  // "Corpos" das frases (posições 0–5 do compasso)
  // ---------------------------------------------------------------------

  var BODIES = {
    arpejo_escala: {
      label: 'Arpejo + escala',
      motion: 'up',
      build: function (cx, s, dir) {
        var a1 = stepFrom(cx.arp, s.midi, dir);
        var a2 = stepFrom(cx.arp, a1.midi, dir);
        var a3 = stepFrom(cx.arp, a2.midi, dir);
        var e1 = stepFrom(cx.scale, a3.midi, -dir);
        var e2 = stepFrom(cx.scale, e1.midi, -dir);
        return [s, a1, a2, a3, e1, e2];
      },
      describe: function (cx, n) {
        var up = n[1].midi > n[0].midi;
        return (up ? 'Sobe' : 'Desce') + ' o arpejo do ' + cx.chord.symbol + ' (' + names(n.slice(0, 4)) + ') e ' +
          (up ? 'desce' : 'sobe') + ' pela escala ' + cx.scaleLabel + ' (' + names(n.slice(4, 6)) + ')';
      }
    },
    escala_desc: {
      label: 'Escala (grau conjunto)',
      motion: 'down',
      build: function (cx, s, dir) {
        var out = [s];
        for (var i = 0; i < 5; i++) out.push(stepFrom(cx.scale, out[out.length - 1].midi, dir));
        return out;
      },
      describe: function (cx, n) {
        return (n[1].midi < n[0].midi ? 'Desce' : 'Sobe') + ' por grau conjunto na escala ' + cx.scaleLabel + ' a partir de ' +
          n[0].name + ' (' + names(n.slice(0, 6)) + ')';
      }
    },
    bebop_desc: {
      label: 'Escala bebop',
      motion: 'down',
      noFlip: true, // a escala bebop só "acerta" os tempos descendo a partir de uma nota do acorde
      needs: 'bebop',
      build: function (cx, s, dir) {
        var out = [s];
        for (var i = 0; i < 5; i++) out.push(stepFrom(cx.bebop, out[out.length - 1].midi, dir));
        return out;
      },
      describe: function (cx, n) {
        var extra = cx.bebopKey === 'bebop_maior' ? ' (no acorde maior, a escala bebop trata a 6ª como nota do acorde, como num acorde de 6ª)' : '';
        return 'Desce pela ' + DATA.SCALES[cx.bebopKey].label + ' (' + names(n.slice(0, 6)) + '): a nota de ' +
          'passagem cromática faz as notas do acorde caírem nos tempos fortes' + extra;
      }
    },
    parker: {
      label: 'Arpejo circular (Parker)',
      motion: 'mixed',
      circular: true,
      needs: 'diatonicMode',
      build: function (cx, s) {
        // Salto de 6ª para baixo (ou de 3ª para cima, se a linha já estiver grave)
        function leap(from) { return from.midi < CENTER - 4 ? stepFrom(cx.scale, from.midi, 2) : stepFrom(cx.scale, from.midi, -5); }
        var p1 = leap(s);
        var p2 = stepFrom(cx.scale, p1.midi, 2);           // tríade da escala a partir dali
        var p3 = stepFrom(cx.scale, p1.midi, 4);
        var down = stepFrom(cx.scale, p3.midi, -1);
        var up = stepFrom(cx.scale, p3.midi, 1);
        var p4 = cx.isChordTone(down) ? down : (cx.isChordTone(up) ? up : nearestInLadder(cx.arp, p3.midi - 1));
        var p5 = leap(p4);
        return [s, p1, p2, p3, p4, p5];
      },
      describe: function (cx, n) {
        var salto = n[1].midi < n[0].midi ? 'salta uma 6ª para baixo' : 'salta uma 3ª para cima';
        return 'Arpejo circular: sai de ' + n[0].name + ', ' + salto + ' até ' + n[1].name +
          ' e sobe a tríade ' + names(n.slice(1, 4)) + '; cai por grau em ' + n[4].name +
          ' (nota do acorde, no tempo 3) e repete o giro a partir de ' + n[5].name;
      }
    },
    guia_3579: {
      label: 'Arpejo 3-5-7-9 (notas-guia)',
      motion: 'up',
      build: function (cx, s, dir) {
        if (dir < 0) {
          // versão descendente: 3ª, fundamental, 7ª e 5ª abaixo (as notas-guia
          // 3ª e 7ª continuam nos tempos 1 e 2), depois sobe por grau
          var b1 = stepFrom(cx.arp, s.midi, -1);
          var b2 = stepFrom(cx.arp, b1.midi, -1);
          var b3 = stepFrom(cx.arp, b2.midi, -1);
          var u1 = stepFrom(cx.scale, b3.midi, 1);
          var u2 = stepFrom(cx.scale, u1.midi, 1);
          return [s, b1, b2, b3, u1, u2];
        }
        var a1 = stepFrom(cx.arp, s.midi, 1);
        var a2 = stepFrom(cx.arp, a1.midi, 1);
        var a3 = stepFrom(cx.scale, a2.midi, 2);
        var d1 = stepFrom(cx.scale, a3.midi, -1);
        var d2 = stepFrom(cx.scale, d1.midi, -1);
        return [s, a1, a2, a3, d1, d2];
      },
      describe: function (cx, n) {
        if (n[1].midi < n[0].midi) {
          return 'Arpejo descendente a partir da 3ª (' + names(n.slice(0, 4)) + ', com as notas-guia 3ª e 7ª em evidência), ' +
            'depois sobe por grau até ' + n[5].name;
        }
        return 'Arpejo a partir da 3ª (' + names(n.slice(0, 4)) + ' — a "estrutura superior" do acorde, com a 9ª no topo), ' +
          'depois desce por grau até ' + n[5].name;
      }
    },
    sus2_seq: {
      label: 'Sequência sus2 (1-2-5)',
      motion: 'up',
      arrival: 'root',
      needs: 'heptatonic',
      build: function (cx, s) {
        var b1 = stepFrom(cx.scale, s.midi, 1);
        var b2 = stepFrom(cx.scale, s.midi, 4);
        var c0 = b1;
        var c1 = stepFrom(cx.scale, c0.midi, 1);
        var c2 = stepFrom(cx.scale, c0.midi, 4);
        return [s, b1, b2, c0, c1, c2];
      },
      describe: function (cx, n) {
        return 'Trifonia sus2 (fundamental-2ª-5ª: ' + names(n.slice(0, 3)) + ') repetida um grau acima (' +
          names(n.slice(3, 6)) + ') — um padrão que "desloca" o acento em relação aos tempos';
      }
    },
    penta_desc: {
      label: 'Pentatônica / blues',
      motion: 'down',
      build: function (cx, s, dir) {
        var out = [s];
        for (var i = 0; i < 5; i++) out.push(stepFrom(cx.scale, out[out.length - 1].midi, dir));
        return out;
      },
      describe: function (cx, n) {
        return (n[1].midi < n[0].midi ? 'Desce' : 'Sobe') + ' pela ' + cx.scaleLabel + ' de ' + cx.chord.root + ' (' + names(n.slice(0, 6)) + ')';
      }
    },
    penta_grupos3: {
      label: 'Pentatônica em grupos de 3',
      motion: 'down',
      build: function (cx, s, dir) {
        var a0 = nearestInLadder(cx.scale, s.midi);
        var a1 = stepFrom(cx.scale, a0.midi, dir);
        var a2 = stepFrom(cx.scale, a1.midi, dir);
        var a3 = stepFrom(cx.scale, a2.midi, dir);
        return [s, a1, a2, a1, a2, a3];
      },
      describe: function (cx, n) {
        return 'Padrão em grupos de 3 notas na ' + cx.scaleLabel + ' de ' + cx.chord.root + ' (' + names(n.slice(0, 6)) + ')';
      }
    },
    tensao_superior: {
      label: 'Arpejo de tensão',
      motion: 'up',
      build: function (cx, s) {
        var r = pcOf(cx.chord.root);
        var offsets = TENSION_ARPEGGIO[cx.scaleKey] || [7, 10, 14];
        var pcs = offsets.map(function (o) { return mod12(r + o); });
        var up = findPc(cx.scale, s.midi, pcs[0], 1);
        var down = findPc(cx.scale, s.midi, pcs[0], -1);
        var t1 = (up && down) ? (Math.abs(up.midi - s.midi) <= Math.abs(down.midi - s.midi) ? up : down) : (up || down || s);
        var t2 = findPc(cx.scale, t1.midi, pcs[1], 1) || stepFrom(cx.scale, t1.midi, 2);
        var t3 = findPc(cx.scale, t2.midi, pcs[2], 1) || stepFrom(cx.scale, t2.midi, 2);
        var d1 = stepFrom(cx.scale, t3.midi, -1);
        var d2 = stepFrom(cx.scale, d1.midi, -1);
        return [s, t1, t2, t3, d1, d2];
      },
      describe: function (cx, n) {
        var info = TENSION_DESC[cx.scaleKey] || 'arpejo com as tensões da escala';
        return 'Parte da ' + (degreeName(cx.chord, n[0].name) || 'nota') + ' (' + n[0].name + ') e toca ' + info +
          ' (' + names(n.slice(1, 4)) + '), descendo pela escala ' + cx.scaleLabel + ' (' + names(n.slice(4, 6)) + ')';
      }
    },
    tensao_escala: {
      label: 'Escala de tensão',
      motion: 'up',
      build: function (cx, s) {
        var top = stepFrom(cx.scale, s.midi, 3);
        var out = [s, stepFrom(cx.scale, s.midi, 1), stepFrom(cx.scale, s.midi, 2), top];
        out.push(stepFrom(cx.scale, top.midi, -2));
        out.push(stepFrom(cx.scale, out[4].midi, -1));
        return out;
      },
      describe: function (cx, n) {
        return 'Sobe pela escala ' + cx.scaleLabel + ' a partir de ' + n[0].name + ' (' + names(n.slice(0, 4)) +
          '), destacando as tensões do dominante, e volta descendo (' + names(n.slice(4, 6)) + ')';
      }
    }
  };

  // Corpos extras (padrões "de livro" de jazz, aplicados por acorde).
  BODIES.digital_1235 = {
    label: 'Padrão 1-2-3-5',
    motion: 'up',
    arrival: 'root',
    needs: 'heptatonic',
    build: function (cx, s) {
      var p1 = stepFrom(cx.scale, s.midi, 1);
      var p2 = stepFrom(cx.scale, s.midi, 2);
      var p3 = stepFrom(cx.scale, s.midi, 4);
      var sev = cx.chord.tones[3];
      var p4 = sev ? (findPc(cx.scale, p3.midi, pcOf(sev), 1) || stepFrom(cx.arp, p3.midi, 1)) : stepFrom(cx.arp, p3.midi, 1);
      var p5 = stepFrom(cx.arp, p4.midi, -1);
      return [s, p1, p2, p3, p4, p5];
    },
    describe: function (cx, n) {
      return 'Célula "1-2-3-5" a partir da fundamental (' + names(n.slice(0, 4)) + '), um dos padrões mais usados para ' +
        'atravessar uma progressão acorde por acorde, seguida de ' + names(n.slice(4, 6));
    }
  };
  BODIES.penta_superposta = {
    label: 'Pentatônica superposta',
    motion: 'up',
    needs: 'superPent',
    build: function (cx, s) {
      var L = cx.superPent.ladder;
      var u1 = stepFrom(L, s.midi, 1);
      var u2 = stepFrom(L, u1.midi, 1);
      var u3 = stepFrom(L, u2.midi, 1);
      var d1 = stepFrom(L, u3.midi, -2);
      var d2 = stepFrom(L, d1.midi, -1);
      return [s, u1, u2, u3, d1, d2];
    },
    describe: function (cx, n) {
      return 'Toca a ' + cx.superPent.label + ' sobre o ' + cx.chord.symbol + ' (' + names(n.slice(1, 6)) + '): ' +
        cx.superPent.why;
    }
  };
  BODIES.simetrico_grupos = {
    label: 'Padrão simétrico',
    motion: 'down',
    needs: 'symmetric',
    build: function (cx, s, dir) {
      var a1 = stepFrom(cx.scale, s.midi, dir);
      var a2 = stepFrom(cx.scale, a1.midi, dir);
      var b0 = a1;
      var b1 = stepFrom(cx.scale, b0.midi, dir);
      var b2 = stepFrom(cx.scale, b1.midi, dir);
      return [s, a1, a2, b0, b1, b2];
    },
    describe: function (cx, n) {
      return 'Grupos de 3 notas ' + (n[1].midi < n[0].midi ? 'descendo' : 'subindo') + ' pela escala simétrica ' + cx.scaleLabel + ' (' + names(n.slice(0, 6)) +
        '): como a escala se repete a cada ' + (cx.scaleKey === 'tons_inteiros' ? 'tom' : '3ª menor') +
        ', o padrão soa igual em cada "andar" e cria tensão controlada';
    }
  };

  // Pentatônica "superposta" por escala de acorde: [passosDeLetra, semitons,
  // tipo, porquê]. Ex.: sobre C7M (jônio), a pentatônica maior de G (a partir
  // da 5ª) dá 5-6-7-9-3; sobre G7 alterado, a pentatônica menor de Bb dá #9,
  // b5, b13, b7 e b9.
  var SUPER_PENT = {
    jonio: [4, 7, 'pentatonica_maior', 'a partir da 5ª ela destaca 7ª maior, 9ª e 13ª, cores do acorde maior'],
    lidio: [1, 2, 'pentatonica_maior', 'a partir da 2ª ela traz a #11, a nota característica do lídio'],
    dorico: [1, 2, 'pentatonica_menor', 'a partir da 2ª ela soa 9ª, 11ª, 5ª e 13ª — o som do dórico'],
    eolio: [4, 7, 'pentatonica_menor', 'a partir da 5ª ela soa 5ª, 7ª, fundamental, 9ª e 11ª'],
    frigio: [4, 7, 'pentatonica_menor', 'a partir da 5ª ela evita a b2 e soa como um menor mais "aberto"'],
    mixolidio: [0, 0, 'pentatonica_maior', 'é a forma mais direta de soar o dominante (1-9-3-5-13)'],
    alterada: [2, 3, 'pentatonica_menor', 'a partir da b3 ela contém #9, b5, b13, b7 e b9 — o dominante alterado inteiro'],
    lidio_b7: [5, 9, 'pentatonica_menor', 'a partir da 13ª ela soa 13ª, fundamental, 9ª, 3ª e 5ª, bem "aberto"'],
    locrio: [3, 5, 'pentatonica_menor', 'a partir da 4ª ela cabe no meio-diminuto sem esbarrar na 9ª'],
    locrio_9: [3, 5, 'pentatonica_menor', 'a partir da 4ª ela cabe no meio-diminuto sem esbarrar na 9ª'],
    menor_melodica: [3, 5, 'pentatonica_maior', 'a partir da 4ª ela soa 11ª, 5ª, 13ª, fundamental e 9ª']
  };

  function superPentFor(chord, scaleKey) {
    var e = SUPER_PENT[scaleKey];
    if (!e) return null;
    var pentRoot = theory.noteAt(chord.root, e[0], e[1]);
    var notes = theory.scaleNotes(pentRoot, e[2]);
    return {
      root: pentRoot,
      label: (e[2] === 'pentatonica_maior' ? 'pentatônica maior de ' : 'pentatônica menor de ') + pentRoot,
      why: e[3],
      ladder: buildLadder(notes)
    };
  }

  // Arpejos de tensão por escala (semitons a partir da fundamental).
  var TENSION_ARPEGGIO = {
    alterada: [6, 10, 13],      // tríade do SubV7 (b5, b7, b9)
    frigio_maior: [7, 10, 13],  // arpejo diminuto a partir da 3ª: 5, b7, b9
    dom_dim: [7, 10, 13],
    lidio_b7: [2, 6, 9],        // tríade do II grau: 9, #11, 13
    mixolidio_b13: [7, 10, 14],
    tons_inteiros: [8, 10, 14], // #5, b7, 9
    mixolidio: [7, 10, 14],
    dorico_b2: [5, 10, 13]
  };
  var TENSION_DESC = {
    alterada: 'a tríade do SubV7 (b5, b7 e b9 do acorde)',
    frigio_maior: 'o arpejo diminuto a partir da 3ª (3ª, 5ª, b7 e b9)',
    dom_dim: 'o arpejo diminuto a partir da 3ª (3ª, 5ª, b7 e b9)',
    lidio_b7: 'a tríade maior do II grau (9ª, #11 e 13ª)',
    mixolidio_b13: 'o arpejo 5ª-b7-9ª',
    tons_inteiros: 'as notas da escala de tons inteiros (#5, b7 e 9ª)',
    mixolidio: 'o arpejo 5ª-b7-9ª',
    dorico_b2: 'o arpejo 4ª-b7-b9'
  };

  // ---------------------------------------------------------------------
  // Corpos usados pelos estilos (Intervalado e Fusion)
  // ---------------------------------------------------------------------

  // Intervalos diatônicos em pares: k = passos na escala (2 = 3ªs, 3 = 4ªs, 5 = 6ªs).
  function intervalBody(k, label, word) {
    return {
      label: label,
      motion: 'up',
      needs: 'heptatonic',
      build: function (cx, s, dir) {
        var out = [s], base = s;
        out.push(stepFrom(cx.scale, base.midi, dir * k));
        for (var i = 0; i < 2; i++) {
          base = stepFrom(cx.scale, base.midi, dir);
          out.push(base);
          out.push(stepFrom(cx.scale, base.midi, dir * k));
        }
        return out;
      },
      describe: function (cx, n) {
        return 'Três pares de ' + word + ' diatônicas na escala ' + cx.scaleLabel + ' (' + names(n.slice(0, 2)) + ', ' +
          names(n.slice(2, 4)) + ', ' + names(n.slice(4, 6)) + '), andando por grau: o estudo intervalado dentro do acorde';
      }
    };
  }
  // ---- células novas (métodos clássicos de padrões) ----
  // Todas devolvem 6 notas, como as demais.

  /** Fábrica das células de 4 notas aplicadas a partir de um grau. */
  function celula4(id, passos, label, explica) {
    return {
      label: label,
      motion: 'up',
      needs: 'heptatonic',
      build: function (cx, s, dir) {
        var d = dir < 0 ? -1 : 1;
        var n = [s];
        passos.forEach(function (k) { n.push(stepFrom(cx.scale, s.midi, d * k)); });
        // completa 6 notas continuando o desenho a partir do grau seguinte.
        // Se o grau seguinte for justamente a nota que acabou de soar (é o que
        // acontece no 1-3-5-2, que termina no 2º grau), pula para o próximo —
        // a linha não pode repetir nota.
        var base = stepFrom(cx.scale, s.midi, d);
        if (base.midi === n[n.length - 1].midi) base = stepFrom(cx.scale, s.midi, d * 2);
        n.push(base);
        var seg = stepFrom(cx.scale, base.midi, d * passos[0]);
        if (seg.midi === base.midi) seg = stepFrom(cx.scale, base.midi, d);
        n.push(seg);
        return n.slice(0, 6);
      },
      describe: function (cx, n) {
        return explica + ' (' + names(n.slice(0, 4)) + '), dentro da escala ' + cx.scaleLabel +
          ', repetindo a partir do grau seguinte (' + names(n.slice(4, 6)) + ')';
      }
    };
  }

  BODIES.digital_1243 = celula4('1243', [1, 3, 2], 'Padrão 1-2-4-3',
    'Célula "1-2-4-3": sobe dois graus, pula o terceiro e volta nele');
  BODIES.digital_1324 = celula4('1324', [2, 1, 3], 'Padrão 1-3-2-4',
    'Célula "1-3-2-4": terça, volta um grau, terça de novo — o zigue-zague que tira a cara de escala');
  BODIES.digital_1352 = celula4('1352', [2, 4, 1], 'Padrão 1-3-5-2',
    'Célula "1-3-5-2": sobe pela tríade e cai no 2º grau, terminando numa nota de tensão');

  /** Arpejos de 7ª nascendo em cada grau: 1-3-5-7, depois 2-4-6-1. */
  BODIES.arpejo_7_graus = {
    label: 'Arpejos de 7ª por grau (1-3-5-7, 2-4-6-1)',
    motion: 'up',
    needs: 'heptatonic',
    build: function (cx, s, dir) {
      var d = dir < 0 ? -1 : 1;
      var a1 = stepFrom(cx.scale, s.midi, d * 2);
      var a2 = stepFrom(cx.scale, s.midi, d * 4);
      var a3 = stepFrom(cx.scale, s.midi, d * 6);
      var b0 = stepFrom(cx.scale, s.midi, d);
      var b1 = stepFrom(cx.scale, b0.midi, d * 2);
      return [s, a1, a2, a3, b0, b1];
    },
    describe: function (cx, n) {
      return 'Arpejo de 7ª a partir de ' + n[0].name + ' (' + names(n.slice(0, 4)) +
        ') e o arpejo do grau seguinte (' + names(n.slice(4, 6)) + ') — cada grupo é um acorde do campo harmônico';
    }
  };

  /** Cerca duas notas do acorde, uma depois da outra (vocabulário bebop). */
  BODIES.cercos = {
    label: 'Cerco das notas do acorde (enclosure)',
    motion: 'up',
    build: function (cx, s) {
      // começa NA nota do acorde (tempo 1) e cerca a nota do acorde seguinte
      var alvo1 = nearestInLadder(cx.arp, s.midi);
      var alvo2 = stepFrom(cx.arp, alvo1.midi, 1);
      var acima = stepFrom(cx.scale, alvo2.midi, 1);
      // Duas formas do cerco, conforme a vizinha de cima esteja a um tom ou a
      // meio tom — as mesmas do método (ver js/scales.js, exercício "cerco"):
      //   um tom:   4 – b3 – 2 – 3   (F – Eb – D – E em C)
      //   meio tom: 2 – b2 – 7 – 1   (D – Db – B – C em C)
      var c1, abaixo;
      if ((acima.midi - alvo2.midi) >= 2) {
        c1 = chromBelow(acima);
        abaixo = stepFrom(cx.scale, alvo2.midi, -1);
      } else {
        c1 = chromBelow(alvo2);
        abaixo = stepFrom(cx.scale, c1.midi, -1);
      }
      var alvo3 = stepFrom(cx.arp, alvo2.midi, 1);
      return [alvo1, acima, c1, abaixo, alvo2, chromBelow(alvo3)];
    },
    describe: function (cx, n) {
      return 'Sai de ' + n[0].name + ' e cerca ' + n[4].name + ' por cima e por baixo (' + names(n.slice(1, 5)) +
        ') antes de cair nela — o recurso mais reconhecível do bebop';
    }
  };

  /** Duas notas cromáticas subindo até cada nota do acorde. */
  BODIES.cromatico_alvo = {
    label: 'Aproximação cromática das notas do acorde',
    motion: 'up',
    build: function (cx, s) {
      // começa NA nota do acorde e sobe cromaticamente até as duas seguintes
      var alvo1 = nearestInLadder(cx.arp, s.midi);
      var alvo2 = stepFrom(cx.arp, alvo1.midi, 1);
      var alvo3 = stepFrom(cx.arp, alvo2.midi, 1);
      return [alvo1, chromBelow2(alvo2), chromBelow(alvo2), alvo2, chromBelow(alvo3), alvo3];
    },
    describe: function (cx, n) {
      return 'Sai de ' + n[0].name + ' e sobe cromaticamente até ' + n[3].name + ' (' + names(n.slice(1, 4)) +
        ') e até ' + n[5].name + ' — é assim que se entra numa nota-alvo sem soar escala';
    }
  };

  BODIES.intervalos_3 = intervalBody(2, 'Terças diatônicas', 'terças');
  BODIES.intervalos_4 = intervalBody(3, 'Quartas diatônicas', 'quartas');
  BODIES.intervalos_5 = intervalBody(4, 'Quintas diatônicas', 'quintas');
  BODIES.intervalos_6 = intervalBody(5, 'Sextas diatônicas', 'sextas');

  // Arpejo "varrido" (sweep): 1-3-5-7 e a 9ª numa passada, voltando pela escala.
  BODIES.arpejo_sweep = {
    label: 'Arpejo varrido (sweep)',
    motion: 'up',
    sweep: true,
    build: function (cx, s, dir) {
      var ext = cx.arpExt || cx.arp;
      var out = [s];
      for (var i = 0; i < 4; i++) out.push(stepFrom(ext, out[out.length - 1].midi, dir));
      out.push(stepFrom(cx.scale, out[4].midi, -dir));
      return out;
    },
    describe: function (cx, n) {
      return 'Arpejo varrido do ' + cx.chord.symbol + ' com a 9ª (' + names(n.slice(0, 5)) + ' — uma nota por corda, numa só ' +
        'palhetada) e volta pela escala (' + n[5].name + ')';
    }
  };

  // Estilos: técnicas preferidas (em ordem) e como a frase é tocada.
  var STYLES = {
    automatico: { label: 'Automático (pela função do acorde)' },
    bebop: { label: 'Bebop (estilo Parker)', recipes: ['parker', 'bebop_desc', 'guia_3579', 'digital_1235', 'arpejo_escala', 'cercos', 'cromatico_alvo', 'digital_1243'], swing: true, art: 'bebop' },
    jazz: { label: 'Jazz moderno', recipes: ['penta_superposta', 'guia_3579', 'sus2_seq', 'tensao_superior', 'intervalos_4', 'arpejo_7_graus', 'digital_1352', 'cercos'], swing: true, art: 'jazz' },
    blues: { label: 'Blues', forceBlues: true, recipes: ['penta_grupos3', 'penta_desc'], swing: true, art: 'blues' },
    modal: { label: 'Modal', recipes: ['sus2_seq', 'escala_desc', 'arpejo_escala', 'intervalos_4', 'intervalos_5', 'digital_1324'], swing: false, art: 'modal' },
    rock: { label: 'Rock / pentatônica', forceBlues: true, recipes: ['penta_desc', 'penta_grupos3'], swing: false, art: 'rock' },
    baiao: { label: 'Baião / nordestino', recipes: ['escala_desc', 'intervalos_3', 'sus2_seq', 'arpejo_escala', 'digital_1243'], swing: false, art: 'baiao', baiao: true },
    fusion: { label: 'Fusion (sweep, Gambale)', recipes: ['arpejo_sweep', 'penta_superposta', 'sus2_seq', 'intervalos_4', 'guia_3579', 'arpejo_7_graus', 'digital_1352'], swing: false, art: 'fusion' },
    intervalado: { label: 'Intervalado (3ªs, 4ªs, 5ªs, 6ªs)', recipes: ['intervalos_3', 'intervalos_4', 'intervalos_5', 'intervalos_6', 'digital_1324'], swing: false, art: 'intervalado' }
  };
  // Técnicas liberadas em cada nível (as dos estilos entram a partir destes).
  var STYLE_LEVEL = {
    iniciante: ['arpejo_escala', 'escala_desc', 'digital_1235', 'penta_desc', 'penta_grupos3', 'intervalos_3', 'intervalos_4'],
    intermediario: ['arpejo_escala', 'escala_desc', 'digital_1235', 'penta_desc', 'penta_grupos3', 'guia_3579', 'sus2_seq',
      'intervalos_3', 'intervalos_4', 'intervalos_5', 'intervalos_6', 'arpejo_sweep',
      'digital_1243', 'digital_1324', 'cromatico_alvo']
  };
  function styleRecipes(style, level, cat) {
    var st = STYLES[style];
    if (!st || !st.recipes) return null;
    if (cat === 'blues' && !st.forceBlues) return null; // blues de verdade continua na pentatônica
    var ok = STYLE_LEVEL[level];
    var list = st.recipes.filter(function (k) { return !ok || ok.indexOf(k) >= 0; });
    return list.length ? list : null;
  }

  // Ordem das técnicas por categoria e nível (a primeira é a "de cara";
  // as demais aparecem ao pedir outra variação e alternam entre compassos).
  var RECIPES = {
    iniciante: {
      melodica: ['arpejo_escala', 'escala_desc', 'digital_1235'],
      blues: ['penta_desc', 'penta_grupos3']
    },
    intermediario: {
      melodica: ['guia_3579', 'arpejo_escala', 'digital_1235', 'sus2_seq', 'escala_desc', 'digital_1243', 'digital_1324'],
      blues: ['penta_desc', 'penta_grupos3'],
      conectando: ['guia_3579', 'digital_1235', 'arpejo_escala', 'sus2_seq', 'digital_1243', 'cromatico_alvo']
    },
    avancado: {
      melodica: ['parker', 'guia_3579', 'penta_superposta', 'bebop_desc', 'digital_1235', 'sus2_seq', 'arpejo_escala',
        'digital_1352', 'arpejo_7_graus', 'cercos'],
      blues: ['penta_grupos3', 'penta_desc'],
      conectando: ['guia_3579', 'parker', 'bebop_desc', 'penta_superposta', 'digital_1235', 'sus2_seq', 'simetrico_grupos',
        'cercos', 'cromatico_alvo', 'digital_1324'],
      tensao: ['tensao_superior', 'penta_superposta', 'simetrico_grupos', 'tensao_escala', 'parker', 'cromatico_alvo']
    }
  };

  // Técnicas que o usuário pode "fixar" para atravessar a progressão inteira
  // com o mesmo padrão (como nos livros de padrões de jazz).
  var MOTIF_CHOICES = {
    iniciante: ['arpejo_escala', 'escala_desc', 'digital_1235'],
    intermediario: ['guia_3579', 'arpejo_escala', 'digital_1235', 'digital_1243', 'digital_1324', 'sus2_seq', 'escala_desc'],
    avancado: ['parker', 'guia_3579', 'digital_1235', 'bebop_desc', 'penta_superposta', 'sus2_seq', 'arpejo_escala', 'escala_desc']
  };

  // Aproximações para a 3ª do próximo acorde (posições 6 e 7).
  var APPROACHES = {
    iniciante: ['grau'],
    intermediario: ['cerco', 'grau', 'cromatico_baixo'],
    avancado: ['cerco', 'dupla_cromatica', 'cromatico_baixo', 'cerco_cromatico', 'grau']
  };

  var APPROACH_LABEL = {
    grau: 'aproximação por grau conjunto',
    cromatico_baixo: 'aproximação cromática por baixo',
    cerco: 'cerco (nota da escala por cima, cromática por baixo)',
    cerco_cromatico: 'cerco cromático (meio tom acima e meio tom abaixo)',
    dupla_cromatica: 'aproximação cromática dupla',
    circular: 'continuação do arpejo circular'
  };

  function names(list) { return list.map(function (n) { return n.name; }).join('–'); }

  function approachNotes(kind, cx, prev, target) {
    var above = prev.midi > target.midi;
    var s1, s2;
    switch (kind) {
      case 'grau':
        s1 = stepFrom(cx.scale, target.midi, above ? 1 : -1);
        s2 = stepFrom(cx.scale, target.midi, above ? 2 : -2);
        if (s2.midi === prev.midi || s1.midi === prev.midi) {
          // a frase já está "encostada" no alvo: aproxima pelo outro lado
          s1 = stepFrom(cx.scale, target.midi, above ? -1 : 1);
          s2 = stepFrom(cx.scale, target.midi, above ? -2 : 2);
        }
        return [s2, s1];
      case 'cromatico_baixo':
        s1 = chromBelow(target);
        s2 = stepFrom(cx.scale, target.midi, -1);
        if (s2.midi === s1.midi) s2 = stepFrom(cx.scale, target.midi, -2);
        return [s2, s1];
      case 'cerco':
        s1 = stepFrom(cx.scale, target.midi, 1);
        if (s1.midi - target.midi > 2) s1 = chromAbove(target);
        return [s1, chromBelow(target)];
      case 'cerco_cromatico':
        return above ? [chromBelow(target), chromAbove(target)] : [chromAbove(target), chromBelow(target)];
      case 'dupla_cromatica':
        return above ? [chromAbove2(target), chromAbove(target)] : [chromBelow2(target), chromBelow(target)];
      default:
        return null;
    }
  }

  /**
   * Escolhe a aproximação (e a oitava do alvo) que melhor liga a frase ao
   * próximo compasso: sem notas repetidas, sem saltos grandes e sem fugir
   * da região média. `variation` roda a ordem de preferência.
   */
  function chooseApproach(kinds, variation, cx, prev, target, ideal) {
    if (ideal === undefined) ideal = CENTER;
    var shift = ((variation % kinds.length) + kinds.length) % kinds.length;
    var ordered = kinds.slice(shift).concat(kinds.slice(0, shift));
    var targets = [target, N(target.name, target.midi - 12), N(target.name, target.midi + 12)].filter(function (t) {
      return t.midi >= LOW && t.midi <= HIGH;
    });
    var best = null, bestScore = Infinity;
    ordered.forEach(function (kind, rank) {
      targets.forEach(function (t, ti) {
        var pair = approachNotes(kind, cx, prev, t);
        if (!pair) return;
        var leapIn = Math.abs(pair[0].midi - prev.midi);
        var inner = Math.abs(pair[1].midi - pair[0].midi);
        var repeats = pair[0].midi === prev.midi || pair[1].midi === pair[0].midi || pair[1].midi === prev.midi ||
          pair[0].midi === t.midi || pair[1].midi === t.midi;
        var score = rank * 1.5 +
          Math.max(0, leapIn - 2) * 0.8 + (leapIn > 7 ? 4 : 0) + Math.max(0, inner - 4) +
          (repeats ? 50 : 0) +
          (ti > 0 ? 1 : 0) +
          0.8 * Math.max(0, Math.abs(t.midi - ideal) - 4) +
          ((t.midi < 52 || t.midi > 82) ? 10 : 0);
        if (score < bestScore) { bestScore = score; best = { kind: kind, notes: pair, target: t }; }
      });
    });
    return best;
  }

  // ---------------------------------------------------------------------
  // Categoria de cada acorde
  // ---------------------------------------------------------------------

  function categoryForFunction(functionLabel) {
    switch (functionLabel) {
      case 'Tônica': return 'melodica';
      case 'Tônica relativa': return 'blues';
      case 'Subdominante': return 'conectando';
      case 'II cadencial': return 'conectando';
      case 'Dominante': return 'tensao';
      case 'Dominante secundário': return 'tensao';
      case 'SubV7 (substituto do dominante)': return 'tensao';
      default: return 'conectando';
    }
  }

  function categoryForChord(chord) {
    var ctx = chord.context || {};
    if (ctx.isBluesDominant) return 'blues';
    if (chord.quality === 'power5') return 'blues'; // power chord: linguagem de rock/blues (pentatônica)
    var cat = categoryForFunction(chord.function);
    if (cat === 'conectando' && isDominantQuality(chord.quality) && !ctx.isIV7) return 'tensao';
    return cat;
  }

  function allowedCategory(cat, level) {
    var allowed = LEVEL_CATEGORIES[level] || LEVEL_CATEGORIES.avancado;
    if (allowed.indexOf(cat) >= 0) return cat;
    if (cat === 'tensao' && allowed.indexOf('conectando') >= 0) return 'conectando';
    return 'melodica';
  }

  // ---------------------------------------------------------------------
  // Montagem de um compasso
  // ---------------------------------------------------------------------

  function recipeList(level, cat) {
    var byLevel = RECIPES[level] || RECIPES.avancado;
    return byLevel[cat] || byLevel.melodica;
  }

  function recipeUsable(key, cx) {
    var need = BODIES[key].needs;
    if (!need) return true;
    if (need === 'bebop') return !!cx.bebop;
    if (need === 'superPent') return !!cx.superPent;
    if (need === 'symmetric') return ['dom_dim', 'diminuta', 'tons_inteiros'].indexOf(cx.scaleKey) >= 0;
    if (need === 'heptatonic') return DATA.SCALES[cx.scaleKey].steps.length === 7;
    if (need === 'diatonicMode') return ['jonio', 'dorico', 'frigio', 'lidio', 'mixolidio', 'eolio', 'locrio'].indexOf(cx.scaleKey) >= 0;
    return true;
  }

  /** Decide a escala e a técnica de um compasso (antes de montar as notas). */
  function planBar(chord, cat, level, barIndex, variation, motif, style) {
    var scaleKey = scaleKeyFor(chord, cat);
    if (style === 'baiao' && isDominantQuality(chord.quality) && cat !== 'blues') scaleKey = barIndex % 2 ? 'lidio_b7' : 'mixolidio';
    var cx = makeCx(chord, scaleKey);
    cx.superPent = superPentFor(chord, scaleKey);
    var ninth = theory.noteAt(chord.root, 1, 2);
    cx.arpExt = buildLadder(chord.tones.concat(cx.scale.some(function (n) { return pcOf(n.name) === pcOf(ninth); }) ? [ninth] : []));
    var styled = styleRecipes(style, level, cat);
    var list = (styled || recipeList(level, cat)).filter(function (key) { return recipeUsable(key, cx); });
    if (!list.length) list = recipeList(level, cat).filter(function (key) { return recipeUsable(key, cx); });
    var recipeKey;
    if (motif && BODIES[motif] && recipeUsable(motif, cx) && cat !== 'blues') {
      recipeKey = motif;
    } else {
      recipeKey = list[(variation + barIndex) % list.length];
    }
    var arrival = BODIES[recipeKey].arrival === 'root' ? chord.root : arrivalName(chord);
    var ideal = IDEAL_START[BODIES[recipeKey].motion || 'mixed'];
    return { cx: cx, recipeKey: recipeKey, listLength: list.length, arrival: arrival, ideal: ideal };
  }

  function buildBar(plan, level, start, nextTargetName, nextIdeal, barIndex, variation) {
    var cx = plan.cx;
    var body = BODIES[plan.recipeKey];
    // Técnicas que descem viram "espelho" (sobem) quando a linha já está grave.
    var dir = body.motion === 'down' ? ((start.midi < CENTER - 4 && !body.noFlip) ? 1 : -1) : (start.midi > CENTER + 7 ? -1 : 1);
    var bodyNotes = body.build(cx, start, dir);
    var last = bodyNotes[bodyNotes.length - 1];

    var target = placeNear(nextTargetName, last.midi);
    var approach = null;

    if (body.circular) {
      // O arpejo circular continua a tríade e cai por grau no próximo alvo.
      var c1 = stepFrom(cx.scale, last.midi, 2);
      var c2 = stepFrom(cx.scale, last.midi, 4);
      var t2 = placeNear(nextTargetName, c2.midi);
      if (Math.abs(t2.midi - c2.midi) <= 2 && t2.midi !== c2.midi && Math.abs(t2.midi - nextIdeal) <= 12) {
        approach = { kind: 'circular', notes: [c1, c2] };
        target = t2;
      }
    }
    if (!approach) {
      var kinds = APPROACHES[level] || APPROACHES.avancado;
      approach = chooseApproach(kinds, barIndex + Math.floor(variation / plan.listLength), cx, last, target, nextIdeal);
      target = approach.target;
    }

    return {
      cx: cx,
      recipeKey: plan.recipeKey,
      notes: bodyNotes.concat(approach.notes),
      approachKind: approach.kind,
      target: target
    };
  }

  // Ritmo do compasso: colcheias (com ou sem swing) ou a célula do baião
  // (colcheia pontuada + semicolcheia + 2 colcheias, duas vezes).
  var BAIAO_DUR = [0.75, 0.25, 0.5, 0.5, 0.75, 0.25, 0.5, 0.5];
  function barEvents(bar, stInfo, barIndex) {
    var onset = 0;
    var sweepId = 'sw' + barIndex;
    return bar.notes.map(function (n, j) {
      var d = stInfo.baiao ? BAIAO_DUR[j] : 0.5;
      var ev = { name: n.name, midi: n.midi, onset: onset, dur: d };
      if (BODIES[bar.recipeKey].sweep && j >= 1 && j <= 4) {
        ev.tabHint = { sweep: sweepId, dir: bar.notes[4].midi > bar.notes[0].midi ? 1 : -1 };
      }
      if (BODIES[bar.recipeKey].sweep && j === 0) ev.tabHint = { sweep: sweepId, dir: bar.notes[4].midi > bar.notes[0].midi ? 1 : -1 };
      onset += d;
      return ev;
    });
  }

  function barExplanation(bar, chord, nextChord, isLast) {
    var body = BODIES[bar.recipeKey];
    var txt = body.describe(bar.cx, bar.notes) + '. ';
    var deg = nextChord ? (degreeName(nextChord, bar.target.name) || 'nota-alvo') : null;
    var targetDesc = nextChord
      ? bar.target.name + ' (' + deg + ' do ' + nextChord.symbol + (isLast ? ', volta ao início)' : ' seguinte)')
      : bar.target.name;
    txt += 'Fecha com ' + APPROACH_LABEL[bar.approachKind] + ' (' + names(bar.notes.slice(6, 8)) + ') e cai em ' +
      targetDesc + ', no tempo 1 do próximo compasso.';
    var charNote = characteristicNote(bar.cx, bar.notes);
    if (charNote) txt += ' ' + charNote;
    return txt;
  }

  function characteristicNote(cx, notes) {
    var entry = DATA.CHARACTERISTIC_NOTE[cx.scaleKey];
    if (!entry) return '';
    var name = theory.noteAt(cx.chord.root, entry[0][0], entry[0][1]);
    var present = notes.some(function (n) { return pcOf(n.name) === pcOf(name); });
    if (!present) return '';
    return 'Repare na nota característica da escala ' + DATA.SCALES[cx.scaleKey].curta + ': ' + name + ' (' + entry[1] + ').';
  }

  // ---------------------------------------------------------------------
  // Frase de resolução (último acorde → primeiro)
  // ---------------------------------------------------------------------

  function resolutionPhrase(lastChord, firstChord) {
    var cxLast = makeCx(lastChord, primaryScaleKey(lastChord));
    var cxFirst = makeCx(firstChord, primaryScaleKey(firstChord));
    var r0 = placeNear(lastChord.root, CENTER - 5);
    // acordes com menos de 3 notas (power chord) sobem pela escala em 3ªs
    var L = lastChord.tones.length >= 3 ? cxLast.arp : cxLast.scale;
    var k = lastChord.tones.length >= 3 ? 1 : 2;
    var a1 = stepFrom(L, r0.midi, k);
    var a2 = stepFrom(L, a1.midi, k);
    var a3 = stepFrom(L, a2.midi, k);
    var target = placeNear(firstChord.root, a3.midi - 3);
    var up = stepFrom(cxFirst.scale, target.midi, 1);
    var hi = chromAbove(target);
    if (up.midi === hi.midi) up = stepFrom(cxFirst.scale, target.midi, 2);
    if (Math.abs(up.midi - a3.midi) > 7 && target.midi + 12 <= HIGH) {
      target = N(target.name, target.midi + 12);
      up = N(up.name, up.midi + 12);
      hi = chromAbove(target);
    }
    var lo = chromBelow(target);
    var notes = [r0, a1, a2, a3, up, hi, lo, target];
    return { notes: notes, target: target };
  }

  // ---------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------

  /**
   * Gera os fraseados de uma progressão já analisada por
   * theory.analyzeProgression(...). `level`: iniciante|intermediario|avancado.
   * `options.variations`: array com a variação escolhida para cada frase
   * (0 = padrão). Mudar a variação troca a técnica daquele compasso.
   */
  function generatePhrases(analysisResult, level, options) {
    options = options || {};
    var variations = options.variations || [];
    var chords = analysisResult.chords.filter(function (c) { return !c.error; });
    if (chords.length === 0) return [];

    var phrases = [];
    var motif = options.motif || null;
    var style = STYLES[options.style] ? options.style : 'automatico';
    var stInfo = STYLES[style];

    // 1º passo: escolhe categoria, escala e técnica de cada compasso (a
    // técnica define em que nota o compasso "quer" começar).
    var plans = chords.map(function (chord, i) {
      var cat = allowedCategory(categoryForChord(chord), level);
      // Com um padrão fixo, o acorde de "tônica relativa" deixa de ser tratado
      // como blues para também receber o padrão (o blues de verdade — I7/IV7
      // e power chords — continua na pentatônica/escala blues).
      var bluesOfVerdade = (chord.context && chord.context.isBluesDominant) || chord.quality === 'power5';
      if (motif && cat === 'blues' && !bluesOfVerdade) cat = 'melodica';
      if (stInfo.forceBlues) cat = 'blues';
      else if (stInfo.recipes && cat === 'blues' && !bluesOfVerdade) cat = 'melodica';
      var plan = planBar(chord, cat, level, i, variations[i] || 0, motif, style);
      plan.cat = cat;
      return plan;
    });

    // 2º passo: monta a linha contínua, cada compasso preparando o seguinte.
    var start = placeNear(plans[0].arrival, plans[0].ideal);
    chords.forEach(function (chord, i) {
      var nextIdx = (i + 1) % chords.length;
      var next = chords[nextIdx];
      var plan = plans[i];
      var cat = plan.cat;
      var variation = variations[i] || 0;
      var startNote = pcOf(start.name) === pcOf(plan.arrival) ? start : placeNear(plan.arrival, start.midi);
      var bar = buildBar(plan, level, startNote, plans[nextIdx].arrival, plans[nextIdx].ideal, i, variation);
      phrases.push({
        index: i + 1,
        chord: chord,
        chordSymbol: chord.symbol,
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat],
        title: 'Frase ' + (i + 1) + ' – ' + chord.symbol + ' (' + CATEGORY_LABELS[cat] + ')' +
          (motif && bar.recipeKey === motif ? ' · ' + BODIES[motif].label : '') +
          (style !== 'automatico' ? ' · ' + stInfo.label : '') +
          (variation > 0 ? ' · ideia ' + (variation + 1) : ''),
        technique: BODIES[bar.recipeKey].label,
        techniqueKey: bar.recipeKey,
        approach: bar.approachKind,
        scaleKey: bar.cx.scaleKey,
        scaleLabel: bar.cx.scaleLabel,
        notes: bar.notes.map(function (n) { return n.name; }),
        midi: bar.notes.map(function (n) { return n.midi; }),
        rhythm: stInfo.baiao ? 'baiao' : (stInfo.swing === false ? 'retas' : 'colcheias'),
        style: style,
        events: barEvents(bar, stInfo, i),
        nextTarget: { name: bar.target.name, midi: bar.target.midi, chordSymbol: next.symbol },
        variation: variation,
        explanation: barExplanation(bar, chord, next, i === chords.length - 1 && chords.length > 1)
      });
      start = bar.target;
    });

    var sameEnds = chords.length > 1 && pcOf(chords[0].root) === pcOf(chords[chords.length - 1].root) &&
      chords[0].quality === chords[chords.length - 1].quality;
    if (chords.length > 1 && !sameEnds && (level === 'intermediario' || level === 'avancado')) {
      var last = chords[chords.length - 1];
      var first = chords[0];
      var res = resolutionPhrase(last, first);
      var idx = phrases.length + 1;
      phrases.push({
        index: idx,
        chord: last,
        chordSymbol: last.symbol + ' → ' + first.symbol,
        category: 'resolucao',
        categoryLabel: CATEGORY_LABELS.resolucao,
        title: 'Frase ' + idx + ' – Resolução (' + last.symbol + ' → ' + first.symbol + ')',
        technique: 'Arpejo + cerco cromático',
        techniqueKey: 'resolucao',
        approach: 'cerco',
        scaleKey: primaryScaleKey(last),
        scaleLabel: 'Arpejo do ' + last.symbol + ' + cromatismo (cerco à fundamental)',
        notes: res.notes.map(function (n) { return n.name; }),
        midi: res.notes.map(function (n) { return n.midi; }),
        rhythm: 'colcheias',
        // a resolução termina com a nota-alvo longa (semínima pontuada)
        events: res.notes.map(function (n, j) { return { name: n.name, midi: n.midi, onset: j * 0.5, dur: j === 7 ? 1.5 : 0.5 }; }),
        variation: 0,
        explanation: 'Sobe o arpejo do ' + last.symbol + ' (' + names(res.notes.slice(0, 4)) + ') e faz um cerco ' +
          'à fundamental do ' + first.symbol + ': ' + res.notes[4].name + ' e ' + res.notes[5].name + ' por cima, ' +
          res.notes[6].name + ' (sensível, meio tom abaixo) e resolve em ' + res.notes[7].name + '. O cerco (atacar o ' +
          'alvo por cima e por baixo antes de "cair" nele) é a forma mais clássica de fechar um improviso.'
      });
    }

    return phrases;
  }

  // Sotaque de articulação de cada categoria (ver js/articulation.js).
  var CATEGORY_STYLE = { melodica: 'jazz', blues: 'blues', conectando: 'bebop', tensao: 'bebop', resolucao: 'jazz' };

  /**
   * Eventos da frase com articulações (bend, hammer-on, pull-off, slide,
   * vibrato) e dinâmica para o instrumento escolhido. Determinístico.
   */
  function articulateFor(phrase, instrument, level) {
    var ART = (typeof module !== 'undefined' && module.exports) ? require('./articulation.js') : (globalThis.IL && globalThis.IL.articulation);
    if (!ART || !phrase.events) return phrase.events;
    var seed = 0, key = phrase.notes.join(',') + '|' + instrument + '|' + phrase.variation;
    for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
    var rng = function () { seed = (seed + 0x6D2B79F5) >>> 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    var scalePcs = theory.scaleNotes(phrase.chord.root, phrase.scaleKey).map(pcOf);
    var st = phrase.style && STYLES[phrase.style] && STYLES[phrase.style].art;
    var locked = [];
    phrase.events.forEach(function (e, i) { if (e.tabHint) locked.push(i); });
    return ART.articulate(phrase.events, { style: st || CATEGORY_STYLE[phrase.category] || 'jazz', level: level, instrument: instrument, rng: rng, scalePcs: scalePcs, noLegatoIdx: locked });
  }

  /** Quantas variações diferentes existem para uma frase (para o botão "outra ideia"). */
  function variationCount(phrase, level) {
    if (!phrase || phrase.category === 'resolucao') return 1;
    var styled = styleRecipes(phrase.style, level, phrase.category);
    return (styled || recipeList(level, phrase.category)).length * (APPROACHES[level] || APPROACHES.avancado).length;
  }

  /** Recupera variação/técnica fixa a partir do título salvo (favoritos/exercícios). */
  function parseTitle(title) {
    var out = { variation: 0, motif: null, style: null };
    Object.keys(STYLES).forEach(function (k) { if (k !== 'automatico' && title.indexOf(' · ' + STYLES[k].label) >= 0) out.style = k; });
    if (!title) return out;
    var m = / · ideia (\d+)/.exec(title);
    if (m) out.variation = Math.max(0, parseInt(m[1], 10) - 1);
    Object.keys(BODIES).forEach(function (k) {
      if (title.indexOf(' · ' + BODIES[k].label) >= 0) out.motif = k;
    });
    return out;
  }

  /** Técnicas disponíveis para "fixar" no nível escolhido: [{key, label}]. */
  function motifChoices(level) {
    return (MOTIF_CHOICES[level] || MOTIF_CHOICES.avancado).map(function (k) { return { key: k, label: BODIES[k].label }; });
  }

  return {
    // utilidades reaproveitadas pela Biblioteca de Fraseados (js/library.js)
    util: {
      buildLadder: buildLadder,
      stepFrom: stepFrom,
      nearestInLadder: nearestInLadder,
      findPc: findPc,
      chromBelow: chromBelow,
      chromAbove: chromAbove,
      chromBelow2: chromBelow2,
      chromAbove2: chromAbove2,
      superPentFor: superPentFor,
      TENSION_ARPEGGIO: TENSION_ARPEGGIO,
      TENSION_DESC: TENSION_DESC
    },
    CATEGORY_LABELS: CATEGORY_LABELS,
    BAR: BAR,
    motifChoices: motifChoices,
    styleChoices: function () { return Object.keys(STYLES).map(function (k) { return { key: k, label: STYLES[k].label }; }); },
    parseTitle: parseTitle,
    articulateFor: articulateFor,
    categoryForFunction: categoryForFunction,
    categoryForChord: categoryForChord,
    generatePhrases: generatePhrases,
    variationCount: variationCount
  };
});
