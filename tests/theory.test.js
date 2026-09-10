/**
 * Testes automáticos do motor de teoria musical (Etapa 1).
 * Rodar com: node tests/theory.test.js
 * Sem framework externo (mantém a Etapa 1 sem dependências/custo).
 */
var assert = require('assert');
var theory = require('../js/theory.js');

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

console.log('noteAt / grafia de intervalos');
test('quinta justa de G é D', function () {
  assert.strictEqual(theory.noteAt('G', 4, 7), 'D');
});
test('terça maior de G é B', function () {
  assert.strictEqual(theory.noteAt('G', 2, 4), 'B');
});
test('sétima maior de G é F# (não Gb)', function () {
  assert.strictEqual(theory.noteAt('G', 6, 11), 'F#');
});
test('sétima menor de G é F (não E#)', function () {
  assert.strictEqual(theory.noteAt('G', 6, 10), 'F');
});
test('terça menor de C é Eb (não D#)', function () {
  assert.strictEqual(theory.noteAt('C', 2, 3), 'Eb');
});

console.log('chordTones');
test('Gmaj7 = G B D F#', function () {
  assert.deepStrictEqual(theory.chordTones('G', 'major7'), ['G', 'B', 'D', 'F#']);
});
test('Dm7 = D F A C', function () {
  assert.deepStrictEqual(theory.chordTones('D', 'minor7'), ['D', 'F', 'A', 'C']);
});
test('G7 = G B D F', function () {
  assert.deepStrictEqual(theory.chordTones('G', 'dominant7'), ['G', 'B', 'D', 'F']);
});
test('Cm7b5 = C Eb Gb Bb', function () {
  assert.deepStrictEqual(theory.chordTones('C', 'm7b5'), ['C', 'Eb', 'Gb', 'Bb']);
});

console.log('scaleNotes');
test('G Jônio = G A B C D E F#', function () {
  assert.deepStrictEqual(theory.scaleNotes('G', 'jonio'), ['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
});
test('A Dórico = A B C D E F# G', function () {
  assert.deepStrictEqual(theory.scaleNotes('A', 'dorico'), ['A', 'B', 'C', 'D', 'E', 'F#', 'G']);
});

console.log('parseChordSymbol');
test('Gmaj7 -> root G, quality major7', function () {
  var c = theory.parseChordSymbol('Gmaj7');
  assert.strictEqual(c.root, 'G');
  assert.strictEqual(c.quality, 'major7');
});
test('Bbm7b5 -> root Bb, quality m7b5', function () {
  var c = theory.parseChordSymbol('Bbm7b5');
  assert.strictEqual(c.root, 'Bb');
  assert.strictEqual(c.quality, 'm7b5');
});
test('F#7 -> root F#, quality dominant7', function () {
  var c = theory.parseChordSymbol('F#7');
  assert.strictEqual(c.root, 'F#');
  assert.strictEqual(c.quality, 'dominant7');
});
test('Dm -> root D, quality minor', function () {
  var c = theory.parseChordSymbol('Dm');
  assert.strictEqual(c.root, 'D');
  assert.strictEqual(c.quality, 'minor');
});
test('E -> root E, quality major', function () {
  var c = theory.parseChordSymbol('E');
  assert.strictEqual(c.root, 'E');
  assert.strictEqual(c.quality, 'major');
});
test('acorde inválido retorna null', function () {
  assert.strictEqual(theory.parseChordSymbol('H7'), null);
});

console.log('triadFromThird (arpejo substituto)');
test('tríade a partir da 3ª de Gmaj7 é Bm (B D F#)', function () {
  var t = theory.triadFromThird('G', 'major7');
  assert.strictEqual(t.root, 'B');
  assert.strictEqual(t.quality, 'minor');
  assert.deepStrictEqual(t.notes, ['B', 'D', 'F#']);
});
test('tríade a partir da 3ª de Cmaj7 é Em (E G B)', function () {
  var t = theory.triadFromThird('C', 'major7');
  assert.strictEqual(t.root, 'E');
  assert.strictEqual(t.quality, 'minor');
  assert.deepStrictEqual(t.notes, ['E', 'G', 'B']);
});
test('tríade a partir da 3ª de D7 é diminuta', function () {
  var t = theory.triadFromThird('D', 'dominant7');
  assert.strictEqual(t.root, 'F#');
  assert.strictEqual(t.quality, 'dim');
});

console.log('analyzeProgression — exemplo de referência (G maior: I vi ii V)');
test('Gmaj7 | Em7 | Am7 | D7 em G maior', function () {
  var r = theory.analyzeProgression(['Gmaj7', 'Em7', 'Am7', 'D7'], 'G', 'maior', 'avancado');
  assert.strictEqual(r.chords[0].roman, 'I');
  assert.strictEqual(r.chords[0].function, 'Tônica');
  assert.strictEqual(r.chords[1].roman, 'vi');
  assert.strictEqual(r.chords[1].function, 'Tônica relativa');
  assert.strictEqual(r.chords[2].roman, 'ii');
  assert.strictEqual(r.chords[2].function, 'Subdominante');
  assert.strictEqual(r.chords[3].roman, 'V');
  assert.strictEqual(r.chords[3].function, 'Dominante');
  assert.deepStrictEqual(r.chords[0].scales.map(function (s) { return s.key; }), ['jonio', 'lidio', 'pentatonica_maior']);
  assert.strictEqual(r.chords[0].targetNote, 'B');
  assert.strictEqual(r.chords[0].targetLabel, '3ª');
});

test('acorde cromático fora do campo harmônico é sinalizado', function () {
  var r = theory.analyzeProgression(['Gmaj7', 'Eb7'], 'G', 'maior', 'avancado');
  assert.strictEqual(r.chords[1].isDiatonic, false);
});

test('dominante secundário é reconhecido (A7 antes de Dm = V/ii em C)', function () {
  var r = theory.analyzeProgression(['Cmaj7', 'A7', 'Dm7', 'G7'], 'C', 'maior', 'avancado');
  assert.strictEqual(r.chords[1].roman, 'V/ii');
  assert.strictEqual(r.chords[1].function, 'Dominante secundário');
});

test('nível iniciante mostra só 1 escala e sem arpejo substituto', function () {
  var r = theory.analyzeProgression(['Gmaj7'], 'G', 'maior', 'iniciante');
  assert.strictEqual(r.chords[0].scales.length, 1);
  assert.strictEqual(r.chords[0].arpeggios.length, 1);
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) {
  console.error('Há testes falhando — corrija antes de publicar.');
} else {
  console.log('Todos os testes passaram.');
}
