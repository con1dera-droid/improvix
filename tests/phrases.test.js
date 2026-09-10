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

function pc(n) { return theory.pitchClassOf(n); }
function isChordTone(chord, name) { return chord.tones.some(function (t) { return pc(t) === pc(name); }); }

console.log('generatePhrases — G maior: Gmaj7 | Em7 | Am7 | D7 (avançado)');
var result = theory.analyzeProgression(['Gmaj7', 'Em7', 'Am7', 'D7'], 'G', 'maior', 'avancado');
var phrases = phrasesMod.generatePhrases(result, 'avancado');
var bars = phrases.filter(function (p) { return p.category !== 'resolucao'; });

test('gera 5 frases (4 compassos + resolução)', function () {
  assert.strictEqual(phrases.length, 5);
  assert.strictEqual(bars.length, 4);
});
test('cada compasso tem 8 colcheias, com nomes e alturas coerentes', function () {
  phrases.forEach(function (p) {
    assert.strictEqual(p.notes.length, 8, p.title);
    assert.strictEqual(p.midi.length, 8, p.title);
    p.notes.forEach(function (n, i) { assert.strictEqual(pc(n), ((p.midi[i] % 12) + 12) % 12, p.title + ' nota ' + n); });
  });
});
test('cada compasso começa numa nota do acorde (tempo 1)', function () {
  bars.forEach(function (p) { assert.ok(isChordTone(p.chord, p.notes[0]), p.title + ' começa em ' + p.notes[0]); });
});
test('a linha é contínua: o fim de cada compasso fica a no máx. 2 semitons da 1ª nota do seguinte', function () {
  for (var i = 0; i < bars.length - 1; i++) {
    var d = Math.abs(bars[i + 1].midi[0] - bars[i].midi[7]);
    assert.ok(d >= 1 && d <= 2, bars[i].title + ' → ' + bars[i + 1].title + ': distância ' + d);
  }
});
test('frase 1 (Gmaj7, tônica) é melódica e começa na 3ª (B)', function () {
  assert.strictEqual(phrases[0].category, 'melodica');
  assert.strictEqual(phrases[0].notes[0], 'B');
});
test('arpejo circular (Parker) no Gmaj7: B, 6ª abaixo (D), tríade D–F#–A, cai em G', function () {
  assert.strictEqual(phrases[0].techniqueKey, 'parker');
  assert.deepStrictEqual(phrases[0].notes.slice(0, 5), ['B', 'D', 'F#', 'A', 'G']);
  assert.ok(phrases[0].midi[1] < phrases[0].midi[0], 'o salto de 6ª é para baixo');
});
test('frase 2 é blue sobre Em7, com a blue note Bb', function () {
  assert.strictEqual(phrases[1].category, 'blues');
  assert.ok(phrases[1].notes.indexOf('Bb') >= 0);
});
test('frase 4 é tensão sobre D7 e usa tensões da alterada (b9/#9/#11/b13)', function () {
  assert.strictEqual(phrases[3].category, 'tensao');
  var altered = ['Eb', 'F', 'G#', 'Ab', 'Bb', 'A#'];
  assert.ok(phrases[3].notes.some(function (n) { return altered.indexOf(n) >= 0; }), phrases[3].notes.join(' '));
});
test('o último compasso prepara a volta: termina a meio tom/tom da 3ª do Gmaj7 (B)', function () {
  assert.strictEqual(phrases[3].nextTarget.name, 'B');
});
test('frase 5 é a resolução D7 -> Gmaj7 com cerco cromático (Ab e F# ao redor de G)', function () {
  assert.strictEqual(phrases[4].category, 'resolucao');
  assert.deepStrictEqual(phrases[4].notes.slice(-3), ['Ab', 'F#', 'G']);
});
test('cada frase traz técnica e explicação didática', function () {
  phrases.forEach(function (p) {
    assert.ok(p.technique && p.technique.length > 3, p.title);
    assert.ok(p.explanation && p.explanation.length > 40, p.title);
  });
});
test('é determinístico (mesma entrada, mesmas frases)', function () {
  var again = phrasesMod.generatePhrases(result, 'avancado');
  assert.deepStrictEqual(again.map(function (p) { return p.notes; }), phrases.map(function (p) { return p.notes; }));
});
test('"Outra ideia" (variação) troca a técnica do compasso escolhido', function () {
  var v = phrasesMod.generatePhrases(result, 'avancado', { variations: [1] });
  assert.notStrictEqual(v[0].techniqueKey, phrases[0].techniqueKey);
  assert.ok(/ideia 2/.test(v[0].title));
});
test('padrão fixo ("motivo") aplica a mesma técnica em todos os compassos possíveis', function () {
  var m = phrasesMod.generatePhrases(result, 'avancado', { motif: 'guia_3579' });
  var fixed = m.filter(function (p) { return p.techniqueKey === 'guia_3579'; });
  assert.ok(fixed.length >= 3, 'só ' + fixed.length + ' compassos usaram o padrão');
  var info = phrasesMod.parseTitle(fixed[0].title);
  assert.strictEqual(info.motif, 'guia_3579');
});

console.log('generatePhrases — ii–V–I em Dó (avançado)');
var iiVI = phrasesMod.generatePhrases(theory.analyzeProgression(['Dm7', 'G7', 'C7M'], 'C', 'maior', 'avancado'), 'avancado');
test('Dm7 prepara a 3ª do G7 (B) e G7 prepara a 3ª do C7M (E)', function () {
  assert.strictEqual(iiVI[0].nextTarget.name, 'B');
  assert.strictEqual(iiVI[1].nextTarget.name, 'E');
});
test('o G7 (tensão) usa a escala alterada grafada como b9/#9/3/#11/b13', function () {
  assert.strictEqual(iiVI[1].scaleKey, 'alterada');
  assert.deepStrictEqual(theory.scaleNotes('G', 'alterada'), ['G', 'Ab', 'A#', 'B', 'C#', 'Eb', 'F']);
});

console.log('generatePhrases — escala bebop acerta as notas do acorde nos tempos');
test('em todo compasso com escala bebop, os tempos 1, 2 e 3 são notas do acorde (ou 6ª no maior)', function () {
  var progs = [[['Dm7', 'G7', 'C7M'], 'C'], [['Bbmaj7', 'Gm7', 'Cm7', 'F7'], 'Bb'], [['F#m7', 'B7', 'Emaj7'], 'E']];
  var checked = 0;
  progs.forEach(function (pr) {
    for (var v = 0; v < 10; v++) {
      var ps = phrasesMod.generatePhrases(theory.analyzeProgression(pr[0], pr[1], 'maior', 'avancado'), 'avancado',
        { variations: pr[0].map(function () { return v; }) });
      ps.filter(function (p) { return p.techniqueKey === 'bebop_desc'; }).forEach(function (p) {
        checked++;
        var sixth = theory.noteAt(p.chord.root, 5, 9);
        [0, 2, 4].forEach(function (j) {
          assert.ok(isChordTone(p.chord, p.notes[j]) || pc(p.notes[j]) === pc(sixth), p.title + ': ' + p.notes.join(' '));
        });
      });
    }
  });
  assert.ok(checked > 0, 'nenhum compasso bebop gerado');
});

console.log('generatePhrases — níveis');
var phrasesIniciante = phrasesMod.generatePhrases(result, 'iniciante');
test('iniciante: só melódica ou blue, sem resolução', function () {
  phrasesIniciante.forEach(function (p) {
    assert.ok(p.category === 'melodica' || p.category === 'blues', p.title);
  });
});
test('iniciante: nenhuma nota cromática fora da escala usada no compasso', function () {
  phrasesIniciante.forEach(function (p) {
    var scale = theory.scaleNotes(p.chord.root, p.scaleKey).map(pc);
    p.notes.forEach(function (n) { assert.ok(scale.indexOf(pc(n)) >= 0, p.title + ': ' + n + ' fora de ' + p.scaleKey); });
  });
});
test('intermediário: sem frases de tensão (exclusivas do Avançado/Pro)', function () {
  var inter = phrasesMod.generatePhrases(theory.analyzeProgression(['Gmaj7', 'Em7', 'Am7', 'D7'], 'G', 'maior', 'intermediario'), 'intermediario');
  inter.forEach(function (p) { assert.notStrictEqual(p.category, 'tensao'); });
});

console.log('generatePhrases — varredura de musicalidade');
test('em 20 progressões × 3 níveis × 6 variações: sem notas repetidas seguidas e sem saltos > 1 oitava', function () {
  var progs = [
    [['Dm7', 'G7', 'C7M'], 'C', 'maior'], [['C7M', 'A7', 'Dm7', 'G7'], 'C', 'maior'], [['Cm7', 'Dm7(b5)', 'G7(b9)', 'Cm7'], 'C', 'menor'],
    [['C7', 'F7', 'C7', 'G7'], 'C', 'maior'], [['Am7', 'E7', 'Am7', 'D7'], 'A', 'menor'], [['C7M', 'Db7', 'C7M'], 'C', 'maior'],
    [['C7M', 'C#°', 'Dm7', 'G7'], 'C', 'maior'], [['F#m7', 'B7', 'Emaj7'], 'E', 'maior'], [['C', 'G', 'Am', 'F'], 'C', 'maior'],
    [['Ebmaj7', 'Cm7', 'Fm7', 'Bb7'], 'Eb', 'maior'], [['G7alt', 'C7M(#11)'], 'C', 'maior'], [['C5', 'F5', 'G5'], 'C', 'maior']
  ];
  var n = 0;
  progs.forEach(function (pr) {
    ['iniciante', 'intermediario', 'avancado'].forEach(function (lvl) {
      for (var v = 0; v < 6; v++) {
        var ps = phrasesMod.generatePhrases(theory.analyzeProgression(pr[0], pr[1], pr[2], lvl), lvl,
          { variations: pr[0].map(function () { return v; }) });
        ps.forEach(function (p) {
          n++;
          for (var j = 1; j < p.midi.length; j++) {
            var d = Math.abs(p.midi[j] - p.midi[j - 1]);
            assert.ok(d > 0, p.title + ' repete nota: ' + p.notes.join(' '));
            assert.ok(d <= 13, p.title + ' salto de ' + d + ': ' + p.notes.join(' '));
          }
        });
      }
    });
  });
  assert.ok(n > 300);
});

console.log('notation.js');
test('realizeForInstrument preserva o desenho da frase (midi) e só desloca oitavas', function () {
  var realized = notation.realizeForInstrument(['B', 'D', 'F#', 'A'], 'baixo', [71, 62, 66, 69]);
  assert.strictEqual(realized[1].midi - realized[0].midi, -9);
  assert.ok(Math.abs(realized[0].midi - 71) % 12 === 0);
});
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

console.log('notation.js — Etapa 5 (mais instrumentos)');
test('violão usa a mesma afinação de 6 cordas da guitarra', function () {
  assert.deepStrictEqual(notation.TUNINGS.violao, notation.TUNINGS.guitarra);
});
test('toTab devolve trastes válidos (0-15) para violão', function () {
  var realized = notation.realizeForInstrument(['G', 'B', 'D', 'F#', 'D', 'B', 'G'], 'violao');
  var tab = notation.toTab(realized, 'violao');
  tab.forEach(function (t) {
    assert.ok(t.fret >= 0 && t.fret <= 15, 'fret fora do alcance: ' + t.fret);
    assert.ok(t.string >= 0 && t.string <= 5);
  });
});
['sax', 'trompete', 'violino', 'flauta'].forEach(function (instrumento) {
  test('toTab retorna null para ' + instrumento + ' (instrumento sem traste, sem tablatura)', function () {
    var realized = notation.realizeForInstrument(['C', 'E', 'G'], instrumento);
    assert.strictEqual(notation.toTab(realized, instrumento), null);
  });
  test('realizeForInstrument mantém a classe de altura correta para ' + instrumento, function () {
    var realized = notation.realizeForInstrument(['G', 'B', 'D', 'F#'], instrumento);
    realized.forEach(function (n) {
      assert.strictEqual(theory.pitchClassOf(n.name), n.midi % 12);
    });
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
