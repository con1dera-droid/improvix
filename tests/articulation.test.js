/**
 * Testes de articulação (js/articulation.js), da tablatura com técnicas
 * (js/notation.js → toTabEvents) e da Biblioteca Fusion.
 * node tests/articulation.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var ART = require('../js/articulation.js');
var notation = require('../js/notation.js');
var lib = require('../js/library.js');

var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok - ' + name); passed++; }
  catch (e) { console.log('  FALHOU - ' + name); console.log('    ' + e.message); process.exitCode = 1; }
}

console.log('articulation.js — técnicas, tablatura e Fusion');

var SCALES = ['mixolidio', 'dorico', 'jonio', 'lidio_b7', 'alterada', 'blues_menor', 'pentatonica_menor'];
var LEVELS = ['iniciante', 'intermediario', 'avancado'];
var fusion = [];
SCALES.forEach(function (sk) {
  LEVELS.forEach(function (lv) {
    [1, 2].forEach(function (bars) {
      fusion = fusion.concat(lib.generate({ scaleKey: sk, tonic: 'todos', style: 'fusion', level: lv, bars: bars, start: 0, count: 12 }));
    });
  });
});

test('Fusion gera frases com sweep (1 nota por corda) e 3 notas por corda', function () {
  var sw = fusion.filter(function (p) { return p.events.some(function (e) { return e.tabHint && e.tabHint.sweep !== undefined; }); });
  var np = fusion.filter(function (p) { return p.events.some(function (e) { return e.tabHint && e.tabHint.nps3 !== undefined; }); });
  assert.ok(sw.length > fusion.length * 0.3, 'poucas frases com sweep: ' + sw.length + '/' + fusion.length);
  assert.ok(np.length > 0, 'nenhuma frase com 3 notas por corda');
});

test('Fusion: ritmo fecha certinho mesmo com sextinas e tercinas', function () {
  fusion.forEach(function (p) {
    var beats = p.events.reduce(function (a, e) { return a + e.dur; }, 0);
    var bars = p.events.length && Math.round(beats / 4);
    assert.ok(Math.abs(beats - bars * 4) < 1e-6, p.title + ' soma ' + beats);
  });
});

test('articulação é determinística (mesma frase = mesmas técnicas)', function () {
  fusion.slice(0, 40).forEach(function (p) {
    var a = JSON.stringify(lib.articulateFor(p, 'guitarra'));
    var b = JSON.stringify(ART.articulate(p.events, { style: 'fusion', level: p.level, instrument: 'guitarra', rng: seq(7) }));
    var c = JSON.stringify(ART.articulate(p.events, { style: 'fusion', level: p.level, instrument: 'guitarra', rng: seq(7) }));
    assert.strictEqual(b, c);
    assert.ok(a.length > 0);
  });
});

test('hammer-on sobe e pull-off desce (intervalo de 1 a 4 semitons); bend puxa 1 ou 2 semitons', function () {
  fusion.forEach(function (p) {
    var ev = lib.articulateFor(p, 'guitarra').filter(function (e) { return !e.rest; });
    ev.forEach(function (e, i) {
      if (!i) return;
      var iv = e.midi - ev[i - 1].midi;
      if (e.art === 'h' && !e.tabHint) assert.ok(iv >= 1 && iv <= 4, p.title + ': hammer-on de ' + iv);
      if (e.art === 'p' && !e.tabHint) assert.ok(iv <= -1 && iv >= -4, p.title + ': pull-off de ' + iv);
      if (e.art === 'h' && e.tabHint) assert.ok(iv > 0, p.title + ': hammer-on do sweep descendo');
      if (e.art === 'p' && e.tabHint) assert.ok(iv < 0, p.title + ': pull-off do sweep subindo');
      if (e.art === 'b') assert.ok([1, 2].indexOf(e.midi - e.bendFrom) >= 0, p.title + ': bend de ' + (e.midi - e.bendFrom));
    });
  });
});

test('o conjunto das frases usa todas as técnicas: hammer-on, pull-off, slide, bend e vibrato', function () {
  var seen = { h: 0, p: 0, sl: 0, b: 0, vib: 0 };
  fusion.forEach(function (p) {
    lib.articulateFor(p, 'guitarra').forEach(function (e) { if (e.art) seen[e.art] = (seen[e.art] || 0) + 1; if (e.vibrato) seen.vib++; });
  });
  Object.keys(seen).forEach(function (k) { assert.ok(seen[k] > 0, 'nenhuma ocorrência de ' + k); });
});

test('dinâmica: toda nota tem volume entre 0,3 e 1 e a frase não é "chapada"', function () {
  fusion.slice(0, 60).forEach(function (p) {
    var ev = lib.articulateFor(p, 'guitarra').filter(function (e) { return !e.rest; });
    var vels = ev.map(function (e) { return e.vel; });
    vels.forEach(function (v) { assert.ok(v >= 0.3 && v <= 1, p.title + ': vel ' + v); });
    assert.ok(Math.max.apply(null, vels) - Math.min.apply(null, vels) >= 0.08, p.title + ': dinâmica plana');
  });
});

test('teclado não recebe bend, slide, ligados nem vibrato', function () {
  fusion.slice(0, 60).forEach(function (p) {
    lib.articulateFor(p, 'teclado').forEach(function (e) {
      assert.ok(!e.art && !e.bendFrom && !e.vibrato, p.title + ': teclado com ' + (e.art || 'vibrato'));
    });
  });
});

test('tablatura: hammer-on/pull-off/slide/release ficam na mesma corda da nota anterior', function () {
  fusion.forEach(function (p) {
    var prep = notation.prepareForInstrument(lib.articulateFor(p, 'guitarra'), 'guitarra');
    var tn = prep.tab.notes;
    tn.forEach(function (n, i) {
      if (n.art === 'h' || n.art === 'p' || n.art === 'sl' || n.art === 'r') {
        assert.ok(i > 0 && tn[i - 1].string === n.string, p.title + ': ' + n.art + ' mudou de corda');
        assert.strictEqual(n.pick, '', p.title + ': nota ligada não se palheta');
      }
      if (n.art === 'b') assert.ok(n.bendFret > n.fret && n.fret > 0, p.title + ': bend sem casa de destino');
      assert.ok(n.fret >= 0 && n.fret <= 24);
    });
  });
});

test('tablatura do sweep: uma nota por corda, na direção certa, com palhetada D D D / U U U', function () {
  var checked = 0;
  fusion.forEach(function (p) {
    var ev = notation.prepareForInstrument(lib.articulateFor(p, 'guitarra'), 'guitarra');
    var notes = ev.events.filter(function (e) { return !e.rest; });
    var tn = ev.tab.notes;
    for (var i = 1; i < notes.length; i++) {
      var a = notes[i - 1].tabHint, b = notes[i].tabHint;
      if (!a || !b || a.sweep === undefined || a.sweep !== b.sweep || notes[i].art || notes[i - 1].art) continue;
      var ds = tn[i].string - tn[i - 1].string;
      var want = b.dir > 0 ? 1 : -1;
      if (ds === want) {
        checked++;
        assert.strictEqual(tn[i].pick, want > 0 ? 'D' : 'U', p.title + ': palhetada do sweep');
      }
    }
  });
  assert.ok(checked > 100, 'poucos pares de sweep conferidos: ' + checked);
});

test('texto da tablatura tem 6 linhas do mesmo tamanho e mostra as técnicas', function () {
  var marks = {};
  fusion.slice(0, 80).forEach(function (p) {
    var prep = notation.prepareForInstrument(lib.articulateFor(p, 'guitarra'), 'guitarra');
    var txt = notation.renderTabText(prep.events, prep.tab, 'guitarra');
    var lines = (txt.text || txt).split('\n').filter(function (l) { return /^[eBGDAE]\|/.test(l); });
    assert.strictEqual(lines.length, 6, p.title);
    lines.forEach(function (l) { assert.strictEqual(l.length, lines[0].length, p.title + ': linhas desalinhadas'); });
    ['h', 'p', 'b', '~', '/'].forEach(function (m) { if (lines.join('').indexOf(m) >= 0) marks[m] = true; });
  });
  ['h', 'p', '~'].forEach(function (m) { assert.ok(marks[m], 'tablatura nunca mostra ' + m); });
});

test('samples de som existem para todos os instrumentos (com crédito da licença)', function () {
  ['guitarra', 'guitarra_drive', 'violao', 'baixo', 'teclado', 'piano_eletrico', 'sax', 'trompete', 'violino', 'flauta'].forEach(function (k) {
    var f = path.join(__dirname, '..', 'sounds', k + '.js');
    assert.ok(fs.existsSync(f), 'falta sounds/' + k + '.js');
    var head = fs.readFileSync(f, 'utf8').slice(0, 400);
    assert.ok(/CC BY 3\.0/.test(head) && head.indexOf('IL_SAMPLES') >= 0, k + ': cabeçalho inválido');
  });
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'sounds', 'CREDITOS.md')), 'falta sounds/CREDITOS.md');
});

function seq(seed) {
  var s = seed >>> 0;
  return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

console.log('\n' + passed + ' teste(s) passaram. (' + fusion.length + ' frases fusion)');
if (process.exitCode) console.log('ALGUM TESTE FALHOU.'); else console.log('Todos os testes passaram.');
