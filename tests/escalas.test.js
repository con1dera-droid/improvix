/**
 * Testes da Biblioteca de Escalas (js/scales.js).
 * node tests/escalas.test.js
 */
var assert = require('assert');
var data = require('../js/data.js');
require('../js/theory.js');
var SC = require('../js/scales.js');
var si = require('../js/scale-info.js');

var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok - ' + name); passed++; }
  catch (e) { console.log('  FALHOU - ' + name); console.log('    ' + e.message); process.exitCode = 1; }
}

var ALL = Object.keys(data.SCALES);
console.log('scales.js — Biblioteca de Escalas');

test('todos os grupos juntos cobrem exatamente o catálogo de escalas', function () {
  var listadas = [];
  SC.GROUPS.forEach(function (g) {
    assert.ok(g.label && g.keys.length, 'grupo sem rótulo ou vazio');
    g.keys.forEach(function (k) {
      assert.ok(data.SCALES[k], 'escala inexistente no grupo ' + g.label + ': ' + k);
      assert.ok(listadas.indexOf(k) < 0, 'escala repetida em dois grupos: ' + k);
      listadas.push(k);
    });
  });
  ALL.forEach(function (k) { assert.ok(listadas.indexOf(k) >= 0, 'escala fora de qualquer grupo: ' + k); });
  assert.strictEqual(listadas.length, ALL.length);
});

test('notesFor devolve uma nota por grau, sem alteração dupla', function () {
  ['C', 'F#', 'Eb', 'B', 'Ab', 'Db'].forEach(function (tom) {
    ALL.forEach(function (k) {
      var nf = SC.notesFor(tom, k);
      assert.strictEqual(nf.notes.length, data.SCALES[k].semitones.length, k + ' em ' + tom);
      nf.notes.forEach(function (n) {
        assert.ok(/^[A-G](#|##|b|bb)?$/.test(n.name), k + ' em ' + tom + ': nota estranha ' + n.name);
        assert.ok(!/##|bb/.test(n.name), k + ' em ' + tom + ': alteração dupla ' + n.name);
        assert.ok(typeof n.pc === 'number' && n.pc >= 0 && n.pc < 12);
        assert.ok(n.degree, 'grau vazio');
      });
      assert.ok(nf.notes[0].root, 'a primeira nota deveria ser a tônica');
    });
  });
});

test('chordOf devolve símbolo com as notas do acorde', function () {
  ALL.forEach(function (k) {
    var c = SC.chordOf('C', k);
    assert.ok(c.symbol && c.symbol.indexOf('C') === 0, k + ': símbolo inesperado ' + c.symbol);
    assert.ok(c.tones.length >= 3, k + ': poucas notas em ' + c.symbol);
  });
  assert.strictEqual(SC.chordOf('C', 'jonio').symbol, 'C7M');
  assert.strictEqual(SC.chordOf('C', 'dorico').symbol, 'Cm7');
  assert.strictEqual(SC.chordOf('C', 'mixolidio').symbol, 'C7');
  assert.strictEqual(SC.chordOf('C', 'locrio').symbol, 'Cm7(b5)');
});

test('exercisesFor devolve exercícios tocáveis', function () {
  ['C', 'F#', 'Eb'].forEach(function (tom) {
    ALL.forEach(function (k) {
      var exs = SC.exercisesFor(tom, k);
      assert.ok(exs.length >= 5, k + ' em ' + tom + ': poucos exercícios');
      exs.forEach(function (ex) {
        assert.ok(ex.title && ex.dica, k + ': exercício sem título/dica');
        assert.ok(ex.events.length > 3, k + '/' + ex.title + ': quase sem notas');
        var fim = 0;
        ex.events.forEach(function (e) {
          assert.ok(typeof e.onset === 'number' && e.onset >= 0, k + '/' + ex.title + ': onset inválido');
          assert.ok(e.dur > 0, k + '/' + ex.title + ': duração inválida');
          if (!e.rest) {
            assert.ok(e.midi >= 40 && e.midi <= 96, k + '/' + ex.title + ': nota fora do alcance (' + e.midi + ')');
            assert.ok(e.name, 'nota sem nome');
          }
          fim = Math.max(fim, e.onset + e.dur);
        });
        // termina em compasso cheio (tolerância de meio tempo)
        assert.ok(Math.abs(fim - Math.round(fim / 4) * 4) < 0.51, k + '/' + ex.title + ': compasso incompleto (' + fim + ')');
      });
    });
  });
});

test('busca acha por nome, por trecho e sem acento', function () {
  assert.ok(SC.search('dorico').indexOf('dorico') >= 0);
  assert.ok(SC.search('dórico').indexOf('dorico') >= 0);
  assert.ok(SC.search('bebop').length >= 4);
  assert.ok(SC.search('hungara').indexOf('hungara_menor') >= 0);
  assert.strictEqual(SC.search('').length, ALL.length);
  assert.strictEqual(SC.search('zzzz').length, 0);
});

test('a ficha de texto existe para toda escala listada', function () {
  SC.GROUPS.forEach(function (g) {
    g.keys.forEach(function (k) {
      var info = si.get(k);
      ['origem', 'som', 'carac', 'uso', 'alvo', 'evitar', 'acordes'].forEach(function (f) {
        assert.ok(info[f] && info[f].length > 5, k + ': falta ' + f);
      });
      assert.ok(info.formulaText && info.intervalsText && info.steps.length, k + ': fórmula incompleta');
    });
  });
});

console.log('\n' + passed + ' testes ok');
