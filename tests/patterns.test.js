/**
 * Testes dos Exercícios de Padrões (js/patterns.js).
 * node tests/patterns.test.js
 */
var assert = require('assert');
var theory = require('../js/theory.js');
var PAT = require('../js/patterns.js');

var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok - ' + name); passed++; }
  catch (e) { console.log('  FALHOU - ' + name); console.log('    ' + e.message); process.exitCode = 1; }
}
console.log('patterns.js — Exercícios de Padrões');

var all = [];
PAT.PATTERNS.forEach(function (p) { PAT.realizeAll(p).forEach(function (l) { all.push({ p: p, l: l }); }); });

test('todos os ' + PAT.PATTERNS.length + ' padrões existem nos 12 tons e cada categoria tem padrões', function () {
  assert.ok(PAT.PATTERNS.length >= 50);
  assert.strictEqual(all.length, PAT.PATTERNS.length * 12);
  PAT.CATEGORIES.forEach(function (c) { assert.ok(PAT.byCategory(c.key).length >= 4, c.key); });
  var ids = {};
  PAT.PATTERNS.forEach(function (p) { assert.ok(!ids[p.id], 'id repetido ' + p.id); ids[p.id] = 1; assert.ok(p.title && p.dica); });
});

test('o ritmo fecha: cada acorde soma os tempos da forma e a linha fecha em compassos inteiros', function () {
  all.forEach(function (x) {
    var sum = x.l.events.reduce(function (a, e) { return a + e.dur; }, 0);
    assert.ok(Math.abs(sum - x.l.beats) < 1e-6 && Math.abs(x.l.beats % 4) < 1e-6, x.p.id + ' ' + x.l.key + ': ' + sum);
  });
});

test('nome e altura batem, sem acidentes dobrados, dentro de um âmbito tocável', function () {
  all.forEach(function (x) {
    x.l.events.forEach(function (e) {
      if (e.rest) return;
      assert.strictEqual(theory.pitchClassOf(e.name), ((e.midi % 12) + 12) % 12, x.p.id + ' ' + x.l.key + ' ' + e.name + '/' + e.midi);
      assert.ok(e.name.length <= 2, x.p.id + ' ' + x.l.key + ': ' + e.name);
      assert.ok(e.midi >= 52 && e.midi <= 88, x.p.id + ' ' + x.l.key + ': fora do âmbito ' + e.midi);
    });
  });
});

test('a transposição preserva o desenho: mesmos intervalos do original em Dó', function () {
  PAT.PATTERNS.forEach(function (p) {
    var base = PAT.realize(p, 'C').events.filter(function (e) { return !e.rest; }).map(function (e) { return e.midi; });
    PAT.realizeAll(p).forEach(function (l) {
      var m = l.events.filter(function (e) { return !e.rest; }).map(function (e) { return e.midi; });
      for (var i = 1; i < m.length; i++) assert.strictEqual(m[i] - m[i - 1], base[i] - base[i - 1], p.id + ' ' + l.key);
    });
  });
});

test('cifras certas no ciclo: II–V–I em Db = Ebm7 Ab7 Db7M; II–V–i em C# = D#m7(b5) G#7(b9) C#m7', function () {
  var l = PAT.realize(PAT.get('c1'), 'Db');
  assert.deepStrictEqual(l.chords.map(function (c) { return c.symbol; }), ['Ebm7', 'Ab7', 'Db7M']);
  var m = PAT.realize(PAT.get('r1'), 'C#');
  assert.deepStrictEqual(m.chords.map(function (c) { return c.symbol; }), ['D#m7(b5)', 'G#7(b9)', 'C#m7']);
  assert.deepStrictEqual(PAT.realizeAll(PAT.get('m1')).map(function (x) { return x.key; }), PAT.CYCLE_MAJOR);
  all.forEach(function (x) { x.l.chords.forEach(function (c) { assert.ok(c.tones.length >= 4, x.p.id + ' ' + c.symbol); }); });
});

test('fórmula em graus: notas-guia do II–V–I e tensões do dominante', function () {
  var f = PAT.formula(PAT.get('c2')).map(function (x) { return x.degrees; });
  assert.deepStrictEqual(f, ['b3 b7', '3 b7', '3 7']);
  var a = PAT.formula(PAT.get('a2'))[0].degrees;
  assert.strictEqual(a, 'b7 b13 #11 3 #9 b9 1 b7');
  PAT.PATTERNS.forEach(function (p) { PAT.formula(p).forEach(function (x) { assert.ok(!/undefined|NaN/.test(x.degrees), p.id); }); });
});

test('os tempos fortes do padrão caem em nota do acorde ou tensão resolvida (≥ 70% por padrão)', function () {
  PAT.PATTERNS.forEach(function (p) {
    var l = PAT.realize(p, 'C');
    var strong = 0, good = 0;
    l.events.forEach(function (e) {
      if (e.rest || Math.abs(e.onset - Math.round(e.onset)) > 1e-6) return;
      var c = l.chords.filter(function (k) { return e.onset >= k.beat - 1e-6 && e.onset < k.beat + k.beats - 1e-6; })[0];
      strong++;
      var pcs = c.tones.map(theory.pitchClassOf);
      var rel = (theory.pitchClassOf(e.name) - theory.pitchClassOf(c.root) + 12) % 12;
      var minor = pcs.indexOf((theory.pitchClassOf(c.root) + 3) % 12) >= 0;
      var tension = [1, 2, 3, 6, 8, 9].indexOf(rel) >= 0 || (minor && rel === 5); // 9ªs, #11, b13, 13 (e 11 no menor)
      if (pcs.indexOf(theory.pitchClassOf(e.name)) >= 0 || tension) good++;
    });
    assert.ok(good / strong >= 0.7, p.id + ': ' + good + '/' + strong);
  });
});

test('padrão próprio: graus viram notas nos 12 tons; erros explicados', function () {
  var r = PAT.customPattern({ degrees: '3 5 b7 b9', chord: 'dom', rhythm: 'e' });
  assert.ok(!r.error, r.error);
  var ls = PAT.realizeAll(r.pattern);
  assert.strictEqual(ls.length, 12);
  assert.deepStrictEqual(ls[0].events.filter(function (e) { return !e.rest; }).map(function (e) { return e.name; }), ['E', 'G', 'Bb', 'Db']);
  assert.deepStrictEqual(ls[1].events.filter(function (e) { return !e.rest; }).map(function (e) { return e.name; }), ['A', 'C', 'Eb', 'Gb']);
  assert.strictEqual(ls[1].chords[0].symbol, 'F7');
  ls.forEach(function (l) { assert.ok(Math.abs(l.events.reduce(function (a, e) { return a + e.dur; }, 0) - l.beats) < 1e-6); });
  var t = PAT.customPattern({ degrees: '1 2 b3 4 5 6 b7 9 11 13', chord: 'min', rhythm: 't' });
  assert.ok(!t.error);
  assert.ok(Math.abs(PAT.realize(t.pattern, 'C').beats % 4) < 1e-6);
  assert.ok(PAT.customPattern({ degrees: '1 x 3' }).error);
  assert.ok(PAT.customPattern({ degrees: '' }).error);
  assert.strictEqual(PAT.realizeAll(t.pattern)[5].key, 'C#');
});

test('vocabulário por estilo: 6 estilos e articulações coerentes (h sobe, p desce, bend de ½ ou 1 tom)', function () {
  var vocab = PAT.CATEGORIES.filter(function (c) { return c.group === 'vocab'; });
  assert.strictEqual(vocab.length, 6);
  vocab.forEach(function (c) { assert.ok(PAT.byCategory(c.key).length >= 5, c.key); });
  var arts = 0;
  all.forEach(function (x) {
    var ns = x.l.events.filter(function (e) { return !e.rest; });
    ns.forEach(function (e, i) {
      if (!e.art) return;
      arts++;
      var iv = i ? e.midi - ns[i - 1].midi : 0;
      if (e.art === 'h') assert.ok(iv >= 1 && iv <= 4, x.p.id + ' h ' + iv);
      if (e.art === 'p') assert.ok(iv <= -1 && iv >= -4, x.p.id + ' p ' + iv);
      if (e.art === 'b') assert.ok([1, 2].indexOf(e.midi - e.bendFrom) >= 0, x.p.id + ' bend');
    });
  });
  assert.ok(arts > 100);
});

console.log('\n' + passed + ' teste(s) passaram. (' + all.length + ' linhas geradas)');
if (process.exitCode) console.log('ALGUM TESTE FALHOU.'); else console.log('Todos os testes passaram.');
