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

console.log('parseChordSymbol — cifra brasileira (padrão Chediak) e tensões');
[
  ['C7M', 'C', 'major7'], ['C7+', 'C', 'major7'], ['Cmaj7', 'C', 'major7'], ['CΔ', 'C', 'major7'],
  ['C7M(9)', 'C', 'major9'], ['C7M(#11)', 'C', 'major7'], ['C7M(#5)', 'C', 'augMaj7'],
  ['Am7(b5)', 'A', 'm7b5'], ['Am7-5', 'A', 'm7b5'], ['Bø', 'B', 'm7b5'],
  ['B°', 'B', 'dim7'], ['Bº', 'B', 'dim7'], ['B°7', 'B', 'dim7'], ['Bdim', 'B', 'dim7'],
  ['Cm(7M)', 'C', 'minMaj7'], ['Cm7M', 'C', 'minMaj7'], ['Cm6', 'C', 'minor6'], ['Cm7(9)', 'C', 'minor9'],
  ['G7/4', 'G', 'dominant7sus4'], ['G7(4)', 'G', 'dominant7sus4'], ['G7sus4', 'G', 'dominant7sus4'], ['G4', 'G', 'sus4'],
  ['C6(9)', 'C', 'major6'], ['C6/9', 'C', 'major6'], ['C(add9)', 'C', 'add9'], ['Csus2', 'C', 'sus2'],
  ['G7(9)', 'G', 'dominant9'], ['G7(b9)', 'G', 'dominant7'], ['G7(#5)', 'G', 'dominant7sharp5'], ['G7(b5)', 'G', 'dominant7flat5'],
  ['G7alt', 'G', 'dominant7'], ['G13', 'G', 'dominant7'], ['C+', 'C', 'aug'], ['C(#5)', 'C', 'aug']
].forEach(function (c) {
  test(c[0] + ' -> ' + c[2], function () {
    var p = theory.parseChordSymbol(c[0]);
    assert.ok(p, 'não reconheceu ' + c[0]);
    assert.strictEqual(p.root, c[1]);
    assert.strictEqual(p.quality, c[2]);
  });
});
test('tensões são lidas da cifra: G7(b9 b13), G7alt, C7M(#11), E7(#9)', function () {
  assert.deepStrictEqual(theory.parseChordSymbol('G7(b9/b13)').tensions, ['b9', 'b13']);
  assert.deepStrictEqual(theory.parseChordSymbol('G7alt').tensions, ['alt']);
  assert.deepStrictEqual(theory.parseChordSymbol('C7M(#11)').tensions, ['#11']);
  assert.deepStrictEqual(theory.parseChordSymbol('E7(#9)').tensions, ['#9']);
  assert.deepStrictEqual(theory.parseChordSymbol('G7b9#11').tensions, ['b9', '#11']);
});
test('baixo invertido: D7/F# tem baixo F# e continua sendo D7', function () {
  var p = theory.parseChordSymbol('D7/F#');
  assert.strictEqual(p.root, 'D');
  assert.strictEqual(p.quality, 'dominant7');
  assert.strictEqual(p.bass, 'F#');
});

console.log('escala do acorde conforme a função (acorde-escala)');
function keysOf(prog, key, mode, idx) {
  return theory.analyzeProgression(prog, key, mode, 'avancado').chords[idx].allScaleKeys;
}
test('V7 que resolve em acorde maior: mixolídio', function () {
  assert.strictEqual(keysOf(['Dm7', 'G7', 'C7M'], 'C', 'maior', 1)[0], 'mixolidio');
});
test('V7 que resolve em acorde menor (A7 → Dm7): mixolídio b9 b13', function () {
  assert.strictEqual(keysOf(['C7M', 'A7', 'Dm7', 'G7'], 'C', 'maior', 1)[0], 'frigio_maior');
});
test('V7 da tonalidade menor (E7 em Lá menor): mixolídio b9 b13', function () {
  assert.strictEqual(keysOf(['Am7', 'E7', 'Am7'], 'A', 'menor', 1)[0], 'frigio_maior');
});
test('SubV7 (Db7 → C7M) é reconhecido e usa lídio b7', function () {
  var c = theory.analyzeProgression(['C7M', 'Db7', 'C7M'], 'C', 'maior', 'avancado').chords[1];
  assert.strictEqual(c.function, 'SubV7 (substituto do dominante)');
  assert.strictEqual(c.allScaleKeys[0], 'lidio_b7');
});
test('IV7 do blues (F7 em Dó) usa lídio b7; I7 do blues usa mixolídio + escala blues', function () {
  var r = theory.analyzeProgression(['C7', 'F7', 'C7', 'G7'], 'C', 'maior', 'avancado');
  assert.strictEqual(r.chords[1].roman, 'IV7');
  assert.strictEqual(r.chords[1].allScaleKeys[0], 'lidio_b7');
  assert.strictEqual(r.chords[2].roman, 'I7');
  assert.deepStrictEqual(r.chords[2].allScaleKeys.slice(0, 2), ['mixolidio', 'blues_menor']);
});
test('tensões escritas mandam: G7(b9) dom-dim, G7alt alterada, G7(#11) lídio b7, G7(b13) mixolídio b13', function () {
  assert.strictEqual(keysOf(['G7(b9)', 'C7M'], 'C', 'maior', 0)[0], 'dom_dim');
  assert.strictEqual(keysOf(['G7alt', 'C7M'], 'C', 'maior', 0)[0], 'alterada');
  assert.strictEqual(keysOf(['G7(#11)', 'C7M'], 'C', 'maior', 0)[0], 'lidio_b7');
  assert.strictEqual(keysOf(['G7(b13)', 'C7M'], 'C', 'maior', 0)[0], 'mixolidio_b13');
});
test('7M fora do I grau usa lídio (F7M em Dó); m6 e m(7M) usam menor melódica', function () {
  assert.strictEqual(keysOf(['C7M', 'F7M'], 'C', 'maior', 1)[0], 'lidio');
  assert.strictEqual(keysOf(['Cm6', 'G7'], 'C', 'menor', 0)[0], 'menor_melodica');
  assert.strictEqual(keysOf(['Cm(7M)', 'G7'], 'C', 'menor', 0)[0], 'menor_melodica');
});
test('diminuto de passagem (C#° entre C e Dm) e empréstimo modal (Fm6, Ab7M em Dó)', function () {
  var r = theory.analyzeProgression(['C7M', 'C#°', 'Dm7', 'G7'], 'C', 'maior', 'avancado');
  assert.strictEqual(r.chords[1].function, 'Diminuto de passagem');
  assert.strictEqual(r.chords[1].allScaleKeys[0], 'diminuta');
  var r2 = theory.analyzeProgression(['C7M', 'Fm6', 'Ab7M', 'C7M'], 'C', 'maior', 'avancado');
  assert.strictEqual(r2.chords[1].function, 'Empréstimo modal');
  assert.strictEqual(r2.chords[2].roman, 'bVI');
});
test('II cadencial secundário: F#m7(b5) → B7 → Em7 em Dó, com lócrio', function () {
  var c = theory.analyzeProgression(['C7M', 'F#m7(b5)', 'B7', 'Em7'], 'C', 'maior', 'avancado').chords[1];
  assert.strictEqual(c.function, 'II cadencial');
  assert.strictEqual(c.allScaleKeys[0], 'locrio');
});
test('V/V (D7 em Dó) agora é dominante secundário', function () {
  var c = theory.analyzeProgression(['C7M', 'D7', 'G7', 'C7M'], 'C', 'maior', 'avancado').chords[1];
  assert.strictEqual(c.roman, 'V/V');
});

test('notas que formam o acorde a partir da cifra (com tensões)', function () {
  var cases = {
    'C7': 'C – E – G – Bb', 'C7M': 'C – E – G – B', 'Dm7(b5)': 'D – F – Ab – C', 'G7(b9)': 'G – B – D – F – Ab',
    'G7alt': 'G – B – F – Ab – A# – C# – Eb', 'C6(9)': 'C – E – G – A – D', 'C7M(#11)': 'C – E – G – B – F#',
    'Am(7M)': 'A – C – E – G#', 'E7(b9/b13)': 'E – G# – B – D – F – C', 'D7/F#': 'D – F# – A – C, baixo F#',
    'Ebm7': 'Eb – Gb – Bb – Db', 'G7 → C7M': 'G – B – D – F  →  C – E – G – B'
  };
  Object.keys(cases).forEach(function (k) { assert.strictEqual(theory.chordNotesText(k), cases[k], k); });
  assert.strictEqual(theory.chordNotesText('xyz'), '');
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) {
  console.error('Há testes falhando — corrija antes de publicar.');
} else {
  console.log('Todos os testes passaram.');
}
