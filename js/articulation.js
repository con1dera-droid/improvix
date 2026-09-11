/**
 * ImprovisaLab — articulações e dinâmica
 *
 * Recebe os eventos de uma frase ({name, midi, onset, dur, rest}) e devolve
 * uma cópia com as técnicas de execução que deixam a frase "viva":
 *   art: 'h'  hammer-on   — nota mais aguda ligada à anterior, sem palhetar
 *        'p'  pull-off    — nota mais grave ligada à anterior, sem palhetar
 *        'sl' slide       — desliza da nota anterior até esta
 *        'b'  bend        — ataca `bendFrom` (1 ou 2 semitons abaixo) e puxa a corda até a nota
 *        'r'  release     — solta o bend anterior, voltando à nota de baixo
 *   vibrato: true         — em notas longas (quase sempre na nota final)
 *   vel: 0–1              — dinâmica: acentos nos tempos fortes e no ponto
 *                           culminante, notas "fantasma" nos contratempos
 *   accent: true          — acento marcado (>)
 *
 * Cada estilo tem seu "sotaque": o blues e o rock usam muito bend e
 * vibrato; o fusion vive de hammer-on/pull-off (legato) e slides de troca de
 * posição; o bebop quase não usa bend (é linguagem de sax) e articula com
 * ghost notes. No teclado não há bend, slide nem vibrato — só dinâmica.
 *
 * Determinístico: recebe uma função `rng` com semente.
 * Funciona no navegador (window.IL.articulation) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var mod = factory();
  if (isNode) module.exports = mod;
  root.IL = root.IL || {};
  root.IL.articulation = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Probabilidades por estilo (antes do fator de nível).
  var PROFILES = {
    bebop: { h: 0.08, p: 0.12, sl: 0.10, bend: 0.0, vib: 0.55, ghost: 0.22, maxChain: 1 },
    jazz: { h: 0.14, p: 0.14, sl: 0.16, bend: 0.06, vib: 0.65, ghost: 0.12, maxChain: 2 },
    blues: { h: 0.22, p: 0.28, sl: 0.24, bend: 0.5, vib: 0.9, ghost: 0.08, maxChain: 2 },
    modal: { h: 0.22, p: 0.22, sl: 0.2, bend: 0.12, vib: 0.75, ghost: 0.05, maxChain: 2 },
    rock: { h: 0.28, p: 0.32, sl: 0.22, bend: 0.55, vib: 0.9, ghost: 0.05, maxChain: 2 },
    baiao: { h: 0.1, p: 0.14, sl: 0.3, bend: 0.0, vib: 0.5, ghost: 0.1, maxChain: 1 },
    fusion: { h: 0.5, p: 0.5, sl: 0.28, bend: 0.18, vib: 0.85, ghost: 0.06, maxChain: 3 },
    intervalado: { h: 0.06, p: 0.06, sl: 0.04, bend: 0.0, vib: 0.6, ghost: 0.0, maxChain: 1 }
  };
  var LEVEL_FACTOR = { iniciante: 0.35, intermediario: 0.8, avancado: 1 };

  // Família do instrumento: o que ele consegue fazer.
  var FAMILY = {
    guitarra: 'fretted', violao: 'fretted', baixo: 'fretted',
    sax: 'wind', trompete: 'wind', flauta: 'wind', violino: 'bowed', teclado: 'keys'
  };

  var LABELS = { h: 'hammer-on', p: 'pull-off', sl: 'slide', b: 'bend', r: 'release' };

  function pcOf(midi) { return ((midi % 12) + 12) % 12; }

  /**
   * events: eventos da frase (com rests). opts: { style, level, instrument,
   * rng, scalePcs (classes de altura da escala, p/ bends que caem na escala),
   * noLegatoIdx (índices de notas que não podem ser ligadas — ex.: 1ª nota de sweep) }
   */
  function articulate(events, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var prof = PROFILES[opts.style] || PROFILES.jazz;
    var lf = LEVEL_FACTOR[opts.level] !== undefined ? LEVEL_FACTOR[opts.level] : 0.8;
    var family = FAMILY[opts.instrument] || 'fretted';
    var scalePcs = opts.scalePcs || null;
    var out = events.map(function (e) { return Object.assign({}, e); });

    var notes = [];
    out.forEach(function (e, i) { if (!e.rest) notes.push(i); });
    if (!notes.length) return out;
    var maxMidi = Math.max.apply(null, notes.map(function (i) { return out[i].midi; }));
    var lastIdx = notes[notes.length - 1];

    var bendF = family === 'fretted' ? (opts.instrument === 'guitarra' ? 1 : 0.3) : (family === 'keys' ? 0 : 0.35);
    var legF = family === 'keys' ? 0 : 1;
    var slF = family === 'keys' ? 0 : (family === 'bowed' ? 0.6 : 1);
    var vibF = family === 'keys' ? 0 : 1;

    var chain = 0;
    notes.forEach(function (idx, k) {
      var e = out[idx];
      var prevIdx = k > 0 ? notes[k - 1] : -1;
      var prev = prevIdx >= 0 ? out[prevIdx] : null;
      var adjacent = prev && prevIdx === idx - 1 && Math.abs(prev.onset + prev.dur - e.onset) < 1e-6;
      var strong = Math.abs(e.onset - Math.round(e.onset)) < 1e-6;
      var isLast = idx === lastIdx;
      var blocked = opts.noLegatoIdx && opts.noLegatoIdx.indexOf(idx) >= 0;
      if (e.art) { chain = (e.art === 'h' || e.art === 'p' || e.art === 'sl' || e.art === 'r') ? chain + 1 : 0; return; }

      // Bend: nota forte/longa/final, com a nota 1 ou 2 semitons abaixo na escala.
      var bendSpot = e.dur >= 0.75 || isLast || (strong && prof.bend >= 0.3);
      if (bendF > 0 && !blocked && bendSpot && rng() < prof.bend * lf * bendF * (isLast ? 1.3 : 0.8)) {
        var semis = null;
        [2, 1].some(function (s) {
          if (!scalePcs || scalePcs.indexOf(pcOf(e.midi - s)) >= 0) { semis = s; return true; }
          return false;
        });
        if (semis && !(prev && prev.midi === e.midi - semis && adjacent && prev.art === 'b')) {
          e.art = 'b';
          e.bendFrom = e.midi - semis;
          chain = 0;
          if (e.dur >= 0.75) e.vibrato = rng() < prof.vib * vibF;
          return;
        }
      }

      // Release: nota seguinte ao bend, voltando à nota de baixo.
      if (adjacent && prev.art === 'b' && e.midi === prev.bendFrom && rng() < 0.6) {
        e.art = 'r';
        chain++;
        return;
      }

      if (adjacent && !blocked && chain < prof.maxChain && prev.dur <= 0.5 + 1e-6) {
        var iv = e.midi - prev.midi;
        var a = Math.abs(iv);
        if (a >= 1 && a <= 4 && e.dur <= 0.5 + 1e-6) {
          var pr = iv > 0 ? prof.h : prof.p;
          if (rng() < pr * lf * legF) { e.art = iv > 0 ? 'h' : 'p'; chain++; return; }
        }
        if (a >= 1 && a <= 5 && (strong || isLast || e.dur >= 0.5) && rng() < prof.sl * lf * slF * (isLast ? 1.4 : 1)) {
          e.art = 'sl'; chain++; return;
        }
      }
      chain = 0;
    });

    // Vibrato e dinâmica.
    notes.forEach(function (idx, k) {
      var e = out[idx];
      var strong = Math.abs(e.onset - Math.round(e.onset)) < 1e-6;
      var isLast = idx === lastIdx;
      if (e.vibrato === undefined) {
        var longNote = e.dur >= 1 - 1e-6 || (isLast && e.dur >= 0.75);
        e.vibrato = vibF > 0 && ((longNote && rng() < prof.vib * (isLast ? 1 : 0.8)) || (e.dur >= 0.75 && rng() < prof.vib * 0.4));
      }
      var vel = 0.7;
      if (strong) vel += 0.1;
      if (Math.abs(e.onset * 2 - Math.round(e.onset * 2)) > 1e-6) vel -= 0.04; // semicolcheias/tercinas internas
      if (e.midi === maxMidi) { vel += 0.12; e.accent = true; }
      if (isLast) vel = Math.max(vel, 0.84);
      var locked = opts.noLegatoIdx && opts.noLegatoIdx.indexOf(idx) >= 0;
      if (!strong && !isLast && !locked && e.dur <= 0.5 && !e.art && rng() < prof.ghost) { vel = 0.42; e.ghost = true; }
      // leve crescendo até o ponto culminante
      vel += 0.06 * (k / Math.max(1, notes.length - 1)) * (e.midi >= maxMidi - 4 ? 1 : 0.3);
      e.vel = Math.max(0.3, Math.min(1, Math.round(vel * 100) / 100));
    });
    return out;
  }

  /** Resumo em português das articulações usadas. */
  function describe(events) {
    var count = { h: 0, p: 0, sl: 0, b: 0, r: 0 };
    var vib = 0, ghosts = 0;
    events.forEach(function (e) { if (e.art) count[e.art]++; if (e.vibrato) vib++; if (e.ghost) ghosts++; });
    var parts = [];
    function plural(n, s, pl) { return n + ' ' + (n > 1 ? pl : s); }
    if (count.h) parts.push(plural(count.h, 'hammer-on', 'hammer-ons'));
    if (count.p) parts.push(plural(count.p, 'pull-off', 'pull-offs'));
    if (count.sl) parts.push(plural(count.sl, 'slide', 'slides'));
    if (count.b) parts.push(plural(count.b, 'bend', 'bends') + (count.r ? ' (com release)' : ''));
    if (vib) parts.push('vibrato' + (vib > 1 ? ' nas notas longas' : ' na nota longa'));
    if (ghosts) parts.push(plural(ghosts, 'nota fantasma', 'notas fantasma'));
    if (!parts.length) return '';
    return 'Articulação: ' + parts.join(', ') + '.';
  }

  return {
    PROFILES: PROFILES,
    FAMILY: FAMILY,
    LABELS: LABELS,
    articulate: articulate,
    describe: describe
  };
});
