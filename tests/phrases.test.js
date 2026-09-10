/**
 * Testes automáticos dos fraseados e da notação (Etapa 2).
 * Rodar com: node tests/phrases.test.js
 */
var assert = require('assert');
var theory = require('../js/theory.js');
var phrasesMod = require('../js/phrases.js');
var notation = require('../js/notation.js');

var passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok - ' + name);
  } catch (e) {
    console.error('  FALHOU - ' + name);
    console.error('    ' + e.message);
    process.exitCode = 1;
  }
}

console.log('generatePhrases — G maior: Gmaj7 | Em7 | Am7 | D7 (avançado)');
var result = theory.analyzeProgression(['Gmaj7', 'Em7', 'Am7', 'D7'], 'G', 'maior', 'avancado');
var phrases = phrasesMod.generatePhrases(result, 'avancado');

test('gera 5 frases (4 acordes + resolução)', function () {
  assert.strictEqual(phrases.length, 5);
});
test('frase 1 é melódica sobre Gmaj7', function () {
  assert.strictEqual(phrases[0].category, 'melodica');
  assert.strictEqual(phrases[0].chordSymbol, 'Gmaj7');
  assert.strictEqual(phrases[0].notes[0], 'B'); // começa na 3ª
  assert.strictEqual(phrases[0].notes[phrases[0].notes.length - 1], 'G'); // resolve na tônica
});
test('frase 2 é blue sobre Em7, com blue note Bb', function () {
  assert.strictEqual(phrases[1].category, 'blues');
  assert.deepStrictEqual(phrases[1].notes, ['E', 'G', 'A', 'Bb', 'B', 'G', 'E', 'D']);
});
test('frase 3 conecta Am7 ao D7 com aproximação cromática (C#)', function () {
  assert.strictEqual(phrases[2].category, 'conectando');
  assert.strictEqual(phrases[2].notes[phrases[2].notes.length - 1], 'C#');
});
test('frase 4 é tensão sobre D7 (escala alterada), resolve na fundamental', function () {
  assert.strictEqual(phrases[3].category, 'tensao');
  assert.strictEqual(phrases[3].notes[phrases[3].notes.length - 1], 'D');
});
test('frase 5 é a resolução D7 -> Gmaj7 com cerco cromático (F# e Ab ao redor de G)', function () {
  assert.strictEqual(phrases[4].category, 'resolucao');
  assert.deepStrictEqual(phrases[4].notes, ['C', 'Ab', 'F#', 'G']);
});

console.log('generatePhrases — nível iniciante não gera tensão nem resolução');
var phrasesIniciante = phrasesMod.generatePhrases(result, 'iniciante');
test('todas as categorias são melódica ou blue', function () {
  phrasesIniciante.forEach(function (p) {
    assert.ok(p.category === 'melodica' || p.category === 'blues');
  });
});

console.log('notation.js');
test('realizeForInstrument mantém a classe de altura correta', function () {
  var realized = notation.realizeForInstrument(['G', 'B', 'D', 'F#'], 'guitarra');
  realized.forEach(function (n, i) {
    assert.strictEqual(theory.pitchClassOf(n.name), n.midi % 12);
  });
});
test('toTab devolve trastes válidos (0-15) para guitarra', function () {
  var realized = notation.realizeForInstrument(['G', 'B', 'D', 'F#', 'D', 'B', 'G'], 'guitarra');
  var tab = notation.toTab(realized, 'guitarra');
  tab.forEach(function (t) {
    assert.ok(t.fret >= 0 && t.fret <= 15, 'fret fora do alcance: ' + t.fret);
    assert.ok(t.string >= 0 && t.string <= 5);
  });
});
test('toTab devolve trastes válidos (0-15) para baixo', function () {
  var realized = notation.realizeForInstrument(['E', 'G', 'A', 'C'], 'baixo');
  var tab = notation.toTab(realized, 'baixo');
  tab.forEach(function (t) {
    assert.ok(t.fret >= 0 && t.fret <= 15);
    assert.ok(t.string >= 0 && t.string <= 3);
  });
});
test('staffPosition: E4 é a linha de baixo (posição 0)', function () {
  assert.strictEqual(notation.staffPosition('E', 64), 0);
});
test('staffPosition: F4 é o primeiro espaço (posição 1)', function () {
  assert.strictEqual(notation.staffPosition('F', 65), 1);
});
test('staffPosition: dó central fica 2 posições abaixo da pauta (ledger line)', function () {
  assert.strictEqual(notation.staffPosition('C', 60), -2);
});
test('toStaffSVG gera um SVG válido (contém <svg> e uma nota por elipse)', function () {
  var realized = notation.realizeForInstrument(['C', 'E', 'G'], 'teclado');
  var svg = notation.toStaffSVG(realized);
  assert.ok(svg.indexOf('<svg') === 0);
  var count = (svg.match(/<ellipse/g) || []).length;
  assert.strictEqual(count, 3);
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) {
  console.error('Há testes falhando — corrija antes de publicar.');
} else {
  console.log('Todos os testes passaram.');
}
