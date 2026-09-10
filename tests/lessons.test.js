/**
 * Testes das Aulas (Etapa 5, parte 4) — conteúdo educacional.
 * node tests/lessons.test.js
 */
var assert = require('assert');
var theory = require('../js/theory.js');
var lessons = require('../js/lessons.js');

var passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log('  ok - ' + name);
    passed++;
  } catch (e) {
    console.log('  FALHOU - ' + name);
    console.log('    ' + e.message);
    process.exitCode = 1;
  }
}

console.log('lessons.js — conteúdo das Aulas');

test('existem várias lições', function () {
  assert.ok(Array.isArray(lessons.LESSONS));
  assert.ok(lessons.LESSONS.length >= 6, 'esperava pelo menos 6 lições, achou ' + lessons.LESSONS.length);
});

test('cada lição tem todos os campos obrigatórios preenchidos', function () {
  lessons.LESSONS.forEach(function (l) {
    assert.ok(l.id && typeof l.id === 'string', 'lição sem id válido');
    assert.ok(l.categoria && typeof l.categoria === 'string', 'lição ' + l.id + ' sem categoria');
    assert.ok(l.titulo && typeof l.titulo === 'string', 'lição ' + l.id + ' sem título');
    assert.ok(l.resumo && typeof l.resumo === 'string', 'lição ' + l.id + ' sem resumo');
    assert.ok(Array.isArray(l.corpo) && l.corpo.length > 0, 'lição ' + l.id + ' sem corpo (parágrafos)');
    l.corpo.forEach(function (p, i) {
      assert.ok(typeof p === 'string' && p.trim().length > 0, 'lição ' + l.id + ' tem parágrafo vazio no índice ' + i);
    });
  });
});

test('os ids das lições são únicos', function () {
  var seen = {};
  lessons.LESSONS.forEach(function (l) {
    assert.ok(!seen[l.id], 'id duplicado: ' + l.id);
    seen[l.id] = true;
  });
});

test('byId encontra cada lição pelo próprio id e devolve null para id inexistente', function () {
  lessons.LESSONS.forEach(function (l) {
    var found = lessons.byId(l.id);
    assert.ok(found, 'byId não encontrou ' + l.id);
    assert.strictEqual(found.titulo, l.titulo);
  });
  assert.strictEqual(lessons.byId('nao-existe-xyz'), null);
});

test('todo exemplo.progressao é uma progressão válida e reconhecida pelo motor de teoria', function () {
  lessons.LESSONS.forEach(function (l) {
    if (!l.exemplo) return;
    assert.ok(l.exemplo.tonalidade, 'lição ' + l.id + ': exemplo sem tonalidade');
    assert.ok(l.exemplo.modo === 'maior' || l.exemplo.modo === 'menor', 'lição ' + l.id + ': modo inválido');
    assert.ok(l.exemplo.progressao && typeof l.exemplo.progressao === 'string', 'lição ' + l.id + ': exemplo sem progressão');

    var chordSymbols = l.exemplo.progressao.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    assert.ok(chordSymbols.length > 0, 'lição ' + l.id + ': progressão de exemplo vazia');

    var result = theory.analyzeProgression(chordSymbols, l.exemplo.tonalidade, l.exemplo.modo, 'intermediario');
    result.chords.forEach(function (c) {
      assert.ok(!c.error, 'lição ' + l.id + ': acorde de exemplo não reconhecido: ' + c.raw + (c.error ? ' (' + c.error + ')' : ''));
    });
  });
});

test('categorias usadas fazem sentido (não vazias, texto curto)', function () {
  lessons.LESSONS.forEach(function (l) {
    assert.ok(l.categoria.length <= 40, 'categoria muito longa em ' + l.id);
  });
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) {
  console.log('ALGUM TESTE FALHOU.');
} else {
  console.log('Todos os testes passaram.');
}
