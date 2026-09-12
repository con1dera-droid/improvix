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
      assert.ok(exs.length >= 17, k + ' em ' + tom + ': só ' + exs.length + ' exercícios');
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

test('os padrões de sequência saem exatamente como o método pede', function () {
  function nomes(id, tom, k) {
    var ex = SC.exercisesFor(tom, k).filter(function (e) { return e.id === id; })[0];
    assert.ok(ex, k + ': falta o exercício ' + id);
    return ex.events.filter(function (e) { return !e.rest; }).map(function (e) { return e.name; }).join(' ');
  }
  // Em C jônio dá para conferir grau a grau.
  assert.strictEqual(nomes('seq3', 'C', 'jonio'),
    'C D E D E F E F G F G A G A B A B C B C D C');
  assert.strictEqual(nomes('seq1232', 'C', 'jonio'),
    'C D E D D E F E E F G F F G A G G A B A A B C B B C D C C');
  assert.strictEqual(nomes('digital', 'C', 'jonio').slice(0, 15), 'C D E G D E F A');
  assert.strictEqual(nomes('digital_desce', 'C', 'jonio').slice(-15), 'A F E D G E D C');
  assert.strictEqual(nomes('quatro_desloca', 'C', 'jonio'),
    'C D E G D E G A E G A C G A C D');
  assert.strictEqual(nomes('escala_arpejo', 'C', 'jonio'),
    'C D E F G E C C D E G B G E C');
  // E continuam corretos em outro tom e em escala menor.
  assert.strictEqual(nomes('escala_arpejo', 'A', 'dorico'), 'A B C D E C A A B C E G E C A');
  assert.strictEqual(nomes('quatro_desloca', 'A', 'eolio'), 'A B C E B C E F C E F A E F A B');
});

test('todo exercício tem grupo e id únicos', function () {
  ['C', 'Bb'].forEach(function (tom) {
    ALL.forEach(function (k) {
      var ids = [];
      SC.exercisesFor(tom, k).forEach(function (ex) {
        assert.ok(ex.grupo && ex.grupo.length > 3, k + '/' + ex.id + ': sem grupo');
        assert.ok(ids.indexOf(ex.id) < 0, k + ': exercício repetido ' + ex.id);
        ids.push(ex.id);
      });
      assert.ok(ids.length >= 17, k + ' em ' + tom + ': só ' + ids.length + ' exercícios');
      // os grupos têm de vir juntos: cada um aparece uma vez só na lista
      var grupos = [], anterior = null;
      SC.exercisesFor(tom, k).forEach(function (ex) {
        if (ex.grupo !== anterior) {
          assert.ok(grupos.indexOf(ex.grupo) < 0, k + ': o grupo "' + ex.grupo + '" aparece duas vezes');
          grupos.push(ex.grupo); anterior = ex.grupo;
        }
      });
    });
  });
});

test('as células de cromatismo saem como o método pede', function () {
  function nomes(id, tom, k) {
    var ex = SC.exercisesFor(tom, k).filter(function (e) { return e.id === id; })[0];
    assert.ok(ex, k + ': falta o exercício ' + id);
    return ex.events.filter(function (e) { return !e.rest; }).map(function (e) { return e.name; }).join(' ');
  }
  // Cerco em C maior, alvo por alvo: 2-b2-7-1 / 4-b3-2-3 / 6-b6-4-5 / 1-b7-6-7
  assert.strictEqual(nomes('cerco', 'C', 'jonio'), 'D Db B C F Eb D E A Ab F G C Bb A B');
  // Aproximação cromática: dois semitons abaixo de cada nota do acorde
  assert.strictEqual(nomes('cromatico', 'C', 'jonio'), 'Bb B C D Eb E F Gb G A Bb B');
  // e continua certo com bemóis
  assert.ok(/^Ab A Bb /.test(nomes('cromatico', 'Bb', 'jonio')), 'em Bb: ' + nomes('cromatico', 'Bb', 'jonio'));
  // nenhuma grafia estranha em nenhum tom
  ['C', 'F#', 'Eb', 'B', 'Ab', 'Db'].forEach(function (tom) {
    ['cerco', 'cromatico'].forEach(function (id) {
      nomes(id, tom, 'jonio').split(' ').forEach(function (nota) {
        assert.ok(/^[A-G](#|b)?$/.test(nota), id + ' em ' + tom + ': nota estranha ' + nota);
      });
    });
  });
});

test('as sequências novas saem nos graus certos', function () {
  function nomes(id, tom, k) {
    var ex = SC.exercisesFor(tom, k).filter(function (e) { return e.id === id; })[0];
    return ex.events.filter(function (e) { return !e.rest; }).map(function (e) { return e.name; }).join(' ');
  }
  assert.ok(/^C D G D E A E F B/.test(nomes('seq125', 'C', 'jonio')), '1-2-5: ' + nomes('seq125', 'C', 'jonio'));
  assert.ok(/^C D F E D E G F/.test(nomes('seq1243', 'C', 'jonio')), '1-2-4-3: ' + nomes('seq1243', 'C', 'jonio'));
  assert.ok(/^C E D F D F E G/.test(nomes('seq1324', 'C', 'jonio')), '1-3-2-4: ' + nomes('seq1324', 'C', 'jonio'));
  assert.ok(/^C E G D D F A E/.test(nomes('seq1352', 'C', 'jonio')), '1-3-5-2: ' + nomes('seq1352', 'C', 'jonio'));
  assert.ok(/^C F D G E A/.test(nomes('quartas', 'C', 'jonio')), 'quartas: ' + nomes('quartas', 'C', 'jonio'));
  assert.ok(/^C G D A E B/.test(nomes('quintas', 'C', 'jonio')), 'quintas: ' + nomes('quintas', 'C', 'jonio'));
  assert.ok(/^C E G B D F A C/.test(nomes('arpejos7', 'C', 'jonio')), 'arpejos de 7ª: ' + nomes('arpejos7', 'C', 'jonio'));
  assert.ok(/^C D E F G D E F G A/.test(nomes('grupos5', 'C', 'jonio')), 'grupos de 5: ' + nomes('grupos5', 'C', 'jonio'));
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
