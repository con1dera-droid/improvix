/**
 * Testes da ficha das escalas (js/scale-info.js).
 * node tests/scaleinfo.test.js
 */
var assert = require('assert');
var data = require('../js/data.js');
var lib = require('../js/library.js');
var si = require('../js/scale-info.js');

var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok - ' + name); passed++; }
  catch (e) { console.log('  FALHOU - ' + name); console.log('    ' + e.message); process.exitCode = 1; }
}
var ALL = [].concat.apply([], lib.SCALE_GROUPS.map(function (g) { return g.keys; }));
console.log('scale-info.js — fórmula e características das escalas');

test('toda escala da Biblioteca tem ficha completa', function () {
  ALL.forEach(function (k) {
    var g = si.get(k);
    assert.ok(g, 'sem ficha: ' + k);
    ['origem', 'acorde', 'som', 'carac', 'uso'].forEach(function (f) { assert.ok(g[f] && g[f].length > (f === 'acorde' ? 0 : 5), k + ': falta ' + f); });
    assert.strictEqual(g.formula.length, data.SCALES[k].semitones.length, k);
    assert.ok(g.formula.some(function (x) { return x.highlight; }), k + ': nenhuma nota característica destacada');
  });
});

test('fórmulas conhecidas', function () {
  var exp = {
    jonio: '1 2 3 4 5 6 7', dorico: '1 2 b3 4 5 6 b7', frigio: '1 b2 b3 4 5 b6 b7', lidio: '1 2 3 #4 5 6 7',
    mixolidio: '1 2 3 4 5 6 b7', eolio: '1 2 b3 4 5 b6 b7', locrio: '1 b2 b3 4 b5 b6 b7',
    menor_melodica: '1 2 b3 4 5 6 7', menor_harmonica: '1 2 b3 4 5 b6 7', lidio_b7: '1 2 3 #4 5 6 b7',
    pentatonica_menor: '1 b3 4 5 b7', blues_menor: '1 b3 4 b5 5 b7', tons_inteiros: '1 2 3 #4 #5 b7',
    bebop_dominante: '1 2 3 4 5 6 b7 7'
  };
  Object.keys(exp).forEach(function (k) { assert.strictEqual(si.get(k).formulaText, exp[k], k); });
  assert.strictEqual(si.get('dorico').intervalsText, 'Tôn 2M 3m 4J 5J 6M 7m');
  assert.strictEqual(si.get('locrio').intervalsText, 'Tôn 2m 3m 4J 5dim 6m 7m');
  assert.strictEqual(si.get('jonio').steps.join(' '), 'T T ST T T T ST');
  assert.strictEqual(si.get('menor_harmonica').steps.join(' '), 'T ST T T ST T½ ST');
});

test('tons e semitons somam uma oitava e os intervalos batem com os semitons', function () {
  var val = { 'ST': 1, 'T': 2, 'T½': 3 };
  var semis = { 'Tôn': 0, '2m': 1, '2M': 2, '2aum': 3, '3m': 3, '3M': 4, '4J': 5, '4aum': 6, '5dim': 6, '5J': 7, '5aum': 8, '6m': 8, '6M': 9, '6aum': 10, '7m': 10, '7M': 11 };
  ALL.forEach(function (k) {
    var g = si.get(k);
    assert.strictEqual(g.steps.reduce(function (a, s) { return a + val[s]; }, 0), 12, k);
    g.formula.forEach(function (x) { assert.strictEqual(semis[x.interval], x.semitones, k + ': ' + x.interval); });
  });
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) console.log('ALGUM TESTE FALHOU.'); else console.log('Todos os testes passaram.');
