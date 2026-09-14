/**
 * Testes do Laboratório (Etapa 5, parte 3) — gerador de progressões.
 * node tests/lab.test.js
 */
var assert = require('assert');
var theory = require('../js/theory.js');
var lab = require('../js/lab.js');

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

console.log('lab.js — gerador de progressões');

test('existem modelos nas 4 categorias (jazz, blues, pop, modal)', function () {
  var categories = lab.CATEGORIES.map(function (c) { return c.key; });
  assert.deepStrictEqual(categories.sort(), ['blues', 'jazz', 'modal', 'pop']);
  categories.forEach(function (cat) {
    assert.ok(lab.templatesByCategory(cat).length > 0, 'categoria sem nenhum modelo: ' + cat);
  });
});

test('ii-V-I em C maior gera Dm7 | G7 | Cmaj7', function () {
  var template = lab.templateById('jazz-ii-v-i');
  var result = lab.realizeTemplate(template, 'C');
  assert.strictEqual(result.progressionText, 'Dm7 | G7 | Cmaj7');
});

test('ii-V-I em Bb maior soletra corretamente (bemóis, não sustenidos)', function () {
  var template = lab.templateById('jazz-ii-v-i');
  var result = lab.realizeTemplate(template, 'Bb');
  // ii de Bb é Cm7, V é F7, I é Bbmaj7 — nenhuma nota deveria sair como sustenido
  assert.strictEqual(result.progressionText, 'Cm7 | F7 | Bbmaj7');
});

test('blues de 12 compassos em C tem 12 acordes, todos dominantes', function () {
  var template = lab.templateById('blues-12-bar');
  var result = lab.realizeTemplate(template, 'C');
  assert.strictEqual(result.chords.length, 12);
  result.chords.forEach(function (c) { assert.strictEqual(c.quality, 'dominant7'); });
  assert.strictEqual(result.progressionText, 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7');
});

test('empréstimo mixolídio (bVII) em C soletra Bb, não A#', function () {
  var template = lab.templateById('modal-mixolidio');
  var result = lab.realizeTemplate(template, 'C');
  assert.strictEqual(result.chords[1].symbol, 'Bb');
  assert.strictEqual(result.progressionText, 'C | Bb | F | C');
});

test('empréstimo eólio (i-bVI-bVII-i) em A menor soletra F e G maiores', function () {
  var template = lab.templateById('modal-eolio');
  var result = lab.realizeTemplate(template, 'A');
  assert.strictEqual(result.progressionText, 'Am | F | G | Am');
});

test('cada acorde gerado é reconhecido de volta pelo parser de cifras (parseChordSymbol)', function () {
  lab.PROGRESSION_TEMPLATES.forEach(function (template) {
    var result = lab.realizeTemplate(template, 'D');
    result.chords.forEach(function (c) {
      var parsed = theory.parseChordSymbol(c.symbol);
      assert.ok(parsed, 'não reconheceu o próprio símbolo gerado: ' + c.symbol);
      assert.strictEqual(parsed.quality, c.quality, 'qualidade não bate para ' + c.symbol);
    });
  });
});

test('randomTemplate(categoria) sempre devolve um modelo daquela categoria', function () {
  for (var i = 0; i < 20; i++) {
    var t = lab.randomTemplate('pop');
    assert.strictEqual(t.category, 'pop');
  }
});

test('generateRandom sem categoria (ou "todas") sorteia entre todos os modelos', function () {
  var seen = {};
  for (var i = 0; i < 60; i++) {
    var result = lab.generateRandom('C', 'todas');
    seen[result.template.id] = true;
  }
  // com 60 sorteios entre 8 modelos, é extremamente improvável não pegar mais de 1 distinto
  assert.ok(Object.keys(seen).length > 1, 'generateRandom nunca variou de modelo em 60 tentativas');
});

test('sugestaoPara dá 5 acordes na tonalidade, com grafia certa em todos os tons', function () {
  var TONS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C#', 'G#'];
  ['maior', 'menor'].forEach(function (modo) {
    TONS.forEach(function (tom) {
      var s = lab.sugestaoPara(tom, modo);
      var cifras = s.texto.split(' | ');
      assert.strictEqual(cifras.length, 5, tom + ' ' + modo + ': ' + s.texto);
      assert.ok(s.label && s.label.length > 5, tom + ': sem rótulo');
      cifras.forEach(function (c) {
        assert.ok(/^[A-G](#|b)?/.test(c), tom + ' ' + modo + ': cifra estranha ' + c + ' (' + s.texto + ')');
        assert.ok(!/##|bb/.test(c), tom + ' ' + modo + ': alteração dobrada em ' + c);
        // e o motor de teoria tem de reconhecer o que foi escrito
        assert.ok(theory.parseChordSymbol(c), tom + ' ' + modo + ': o parser não reconhece ' + c);
      });
      // começa e termina na tônica
      assert.strictEqual(cifras[0].charAt(0), tom.charAt(0), tom + ': não começa na tônica');
      assert.strictEqual(cifras[0], cifras[4], tom + ': não fecha na tônica');
    });
  });
  assert.strictEqual(lab.sugestaoPara('C', 'maior').texto, 'Cmaj7 | Am7 | Dm7 | G7 | Cmaj7');
  assert.strictEqual(lab.sugestaoPara('A', 'menor').texto, 'Am7 | Dm7 | Bm7b5 | E7 | Am7');
  assert.strictEqual(lab.sugestaoPara('Bb', 'maior').texto, 'Bbmaj7 | Gm7 | Cm7 | F7 | Bbmaj7');
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) {
  console.log('ALGUM TESTE FALHOU.');
} else {
  console.log('Todos os testes passaram.');
}
