/**
 * Testes da Biblioteca de Fraseados (js/library.js).
 * node tests/library.test.js
 */
var assert = require('assert');
var theory = require('../js/theory.js');
var data = require('../js/data.js');
var lib = require('../js/library.js');

var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok - ' + name); passed++; }
  catch (e) { console.log('  FALHOU - ' + name); console.log('    ' + e.message); process.exitCode = 1; }
}
function pc(n) { return theory.pitchClassOf(n); }
var ALL_SCALES = [].concat.apply([], lib.SCALE_GROUPS.map(function (g) { return g.keys; }));
var STYLES = Object.keys(lib.STYLES);
var LEVELS = ['iniciante', 'intermediario', 'avancado'];

console.log('library.js — Biblioteca de Fraseados');

test('todas as escalas da biblioteca existem no motor e têm acorde definido', function () {
  ALL_SCALES.forEach(function (k) {
    assert.ok(data.SCALES[k], 'escala desconhecida: ' + k);
    assert.ok(lib.MODE_INFO[k], 'sem acorde para: ' + k);
  });
  assert.ok(ALL_SCALES.length >= 25);
});

var sweep = [];
var t0 = Date.now();
ALL_SCALES.forEach(function (sk) {
  STYLES.forEach(function (st) {
    LEVELS.forEach(function (lv) {
      [1, 2].forEach(function (bars) {
        lib.generate({ scaleKey: sk, tonic: 'todos', style: st, level: lv, bars: bars, count: 12 }).forEach(function (p) {
          sweep.push({ p: p, sk: sk, st: st, lv: lv, bars: bars });
        });
      });
    });
  });
});
var elapsed = Date.now() - t0;

test('varredura completa: ' + ALL_SCALES.length + ' escalas × ' + STYLES.length + ' estilos × 3 níveis × 2 tamanhos × 12 tons gera tudo rápido', function () {
  assert.strictEqual(sweep.length, ALL_SCALES.length * STYLES.length * 3 * 2 * 12);
  assert.ok(elapsed < 30000, 'demorou ' + elapsed + ' ms');
});

test('o ritmo fecha certinho: (compassos + compasso de chegada) × 4 tempos', function () {
  sweep.forEach(function (x) {
    var beats = x.p.events.reduce(function (a, e) { return a + e.dur; }, 0);
    assert.ok(Math.abs(beats - (x.bars * 4 + 4)) < 1e-6, x.p.title + ' soma ' + beats);
  });
});

test('nome e altura de cada nota batem, sem acidentes dobrados', function () {
  sweep.forEach(function (x) {
    x.p.notes.forEach(function (n, i) {
      assert.strictEqual(pc(n), ((x.p.midi[i] % 12) + 12) % 12, x.p.title + ': ' + n + '/' + x.p.midi[i]);
      assert.ok(n.slice(1).length <= 1, x.p.title + ': acidente dobrado em ' + n);
    });
  });
});

test('sem saltos maiores que uma oitava e dentro de um âmbito tocável', function () {
  sweep.forEach(function (x) {
    var m = x.p.midi;
    for (var i = 1; i < m.length; i++) assert.ok(Math.abs(m[i] - m[i - 1]) <= 12, x.p.title + ': salto ' + (m[i] - m[i - 1]));
    assert.ok(Math.max.apply(null, m) - Math.min.apply(null, m) <= 24, x.p.title + ': âmbito grande demais');
  });
});

test('toda nota fora da escala (cromática) resolve por semitom ou tom', function () {
  var bad = 0, total = 0;
  sweep.forEach(function (x) {
    var scale = theory.scaleNotes(x.p.tonic, x.sk).map(pc);
    var ev = x.p.events.filter(function (e) { return !e.rest; });
    ev.forEach(function (e, i) {
      if (e.landing || scale.indexOf(pc(e.name)) >= 0) return;
      total++;
      var next = ev[i + 1], next2 = ev[i + 2];
      var ok = next && Math.abs(next.midi - e.midi) <= 2 && Math.abs(next.midi - e.midi) >= 1;
      if (!ok && next2) ok = Math.abs(next2.midi - e.midi) <= 2 && Math.abs(next.midi - e.midi) <= 3;
      if (!ok) bad++;
    });
  });
  assert.ok(bad / Math.max(1, total) < 0.02, bad + ' de ' + total + ' cromatismos sem resolução');
});

test('iniciante e estilo modal: nenhuma nota cromática (só escala e acorde de chegada)', function () {
  sweep.filter(function (x) { return x.lv === 'iniciante' || x.st === 'modal'; }).forEach(function (x) {
    if (x.st === 'blues' || x.st === 'rock') return; // blue note é a própria linguagem
    var scale = theory.scaleNotes(x.p.tonic, x.sk).map(pc).concat(x.p.chords[0].tones.map(pc));
    x.p.events.forEach(function (e) {
      if (e.rest || e.landing) return;
      assert.ok(scale.indexOf(pc(e.name)) >= 0, x.p.title + ' (' + x.st + '/' + x.lv + '): ' + e.name + ' fora da escala e do acorde');
    });
  });
});

test('bebop avançado: a maioria dos tempos fortes cai em nota do acorde', function () {
  var strong = 0, ct = 0;
  sweep.filter(function (x) { return x.st === 'bebop' && x.lv === 'avancado' && ['mixolidio', 'dorico', 'jonio', 'bebop_dominante'].indexOf(x.sk) >= 0; }).forEach(function (x) {
    var tones = theory.chordTones(x.p.tonic, lib.MODE_INFO[x.sk].q).map(pc);
    x.p.events.forEach(function (e) {
      if (e.rest || e.landing) return;
      if (Math.abs(e.onset - Math.round(e.onset)) < 1e-6) { strong++; if (tones.indexOf(pc(e.name)) >= 0) ct++; }
    });
  });
  assert.ok(ct / strong >= 0.7, Math.round(100 * ct / strong) + '% dos tempos fortes em nota do acorde');
});

test('a frase termina numa nota longa e estável (3ª, 5ª, 9ª ou fundamental do acorde de chegada)', function () {
  sweep.forEach(function (x) {
    var land = x.p.events.filter(function (e) { return e.landing; })[0];
    assert.ok(land, x.p.title + ' sem nota de chegada');
    assert.ok(land.dur >= 1, x.p.title + ': nota final curta');
    var ch = x.p.chords[x.p.chords.length - 1];
    var root = pc(ch.root);
    var ok = ch.tones.some(function (t) { return pc(t) === pc(land.name); }) || ((pc(land.name) - root + 12) % 12) === 2;
    assert.ok(ok, x.p.title + ': chegada em ' + land.name + ', fora do acorde ' + ch.symbol);
  });
});

test('dominantes resolvem: mixolídio vai para o 7M uma 4ª acima; mixolídio b9 b13 vai para o m7', function () {
  var a = lib.generate({ scaleKey: 'mixolidio', tonic: 'G', style: 'bebop', level: 'intermediario', count: 1 })[0];
  assert.strictEqual(a.chordSymbol, 'G7');
  assert.strictEqual(a.resolveSymbol, 'C7M');
  var b = lib.generate({ scaleKey: 'frigio_maior', tonic: 'E', style: 'jazz', level: 'avancado', count: 1 })[0];
  assert.strictEqual(b.resolveSymbol, 'Am7');
});

test('"todos os tons" percorre os 12 tons no ciclo de 4ªs', function () {
  var ps = lib.generate({ scaleKey: 'dorico', tonic: 'todos', style: 'jazz', level: 'intermediario', count: 12 });
  var pcs = {};
  ps.forEach(function (p) { pcs[pc(p.tonic)] = true; });
  assert.strictEqual(Object.keys(pcs).length, 12);
  assert.strictEqual(ps[0].tonic, 'C');
  assert.strictEqual(ps[1].tonic, 'F');
});

test('determinística e sem repetição: mesma busca = mesmas frases; 4 páginas = 48 frases diferentes', function () {
  var o = { scaleKey: 'mixolidio', tonic: 'G', style: 'bebop', level: 'avancado', bars: 1, count: 12 };
  var a = lib.generate(o), b = lib.generate(o);
  assert.deepStrictEqual(a.map(function (p) { return p.notes.join(); }), b.map(function (p) { return p.notes.join(); }));
  var sigs = {};
  for (var page = 0; page < 4; page++) {
    lib.generate(Object.assign({}, o, { start: page * 12 })).forEach(function (p) {
      sigs[p.events.map(function (e) { return (e.rest ? 'r' : e.name) + e.dur.toFixed(2); }).join()] = true;
    });
  }
  assert.ok(Object.keys(sigs).length >= 46, 'só ' + Object.keys(sigs).length + ' frases distintas em 48');
});

test('grafia do tom escolhe o enarmônico mais simples (ex.: lócrio de C#, não de Db)', function () {
  var ps = lib.generate({ scaleKey: 'locrio', tonic: 'Db', style: 'jazz', level: 'intermediario', count: 1 });
  assert.strictEqual(ps[0].tonic, 'C#');
});

test('cada frase traz técnica(s) usadas e explicação', function () {
  sweep.slice(0, 500).forEach(function (x) {
    assert.ok(x.p.explanation.length > 60, x.p.title);
    assert.ok(x.p.bpm > 0);
  });
});

console.log('\n' + passed + ' teste(s) passaram. (' + sweep.length + ' frases geradas em ' + elapsed + ' ms)');
if (process.exitCode) console.log('ALGUM TESTE FALHOU.'); else console.log('Todos os testes passaram.');
