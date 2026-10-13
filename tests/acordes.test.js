/**
 * Testes do motor da Biblioteca de Acordes (js/chords.js).
 *
 * O que importa aqui é que as posições sejam DE VERDADE: toda nota que soa
 * tem de pertencer ao acorde, a fundamental tem de estar no baixo, a mão
 * tem de alcançar e a pestana não pode pedir uma corda solta no meio dela.
 *
 *   node tests/acordes.test.js
 */
var assert = require('assert');
require('../js/data.js');
var theory = require('../js/theory.js');
var CH = require('../js/chords.js');

var passed = 0;
function test(nome, fn) {
  try { fn(); console.log('  ok - ' + nome); passed++; }
  catch (e) { console.log('  FALHOU - ' + nome); console.log('    ' + e.message); process.exitCode = 1; }
}

// Um apanhado que cobre o que se digita de verdade: tríades, com 7ª,
// meio-diminutos, dominantes com tensão, sus, 6ª, baixo invertido.
var CIFRAS = [];
['C', 'D', 'Eb', 'F#', 'G', 'A', 'Bb'].forEach(function (t) {
  ['', 'm', '7', 'm7', '7M', 'm7(b5)', '6', 'm6', 'sus4', '°'].forEach(function (q) { CIFRAS.push(t + q); });
});
var EXTRAS = ['C7M(9)', 'C6(9)', 'G7(b9)', 'G7(13)', 'C7M(#11)', 'Am(7M)', 'D7/F#', 'C/E', 'G/B', 'F/G', 'Bb7alt'];

console.log('chords.js — Biblioteca de Acordes');

test('toda cifra do catálogo é reconhecida', function () {
  CH.SUGESTOES.forEach(function (g) {
    g.cifras.forEach(function (c) {
      assert.ok(CH.analisar(c), 'sugestão não reconhecida: ' + c);
    });
  });
  CIFRAS.concat(EXTRAS).forEach(function (c) {
    assert.ok(CH.analisar(c), 'não reconheceu ' + c);
  });
});

test('a leitura do acorde traz notas, graus e fórmula certos', function () {
  var c = CH.analisar('C7M');
  assert.strictEqual(c.formula, '1 3 5 7M');
  assert.strictEqual(c.notasTexto, 'C – E – G – B');
  assert.strictEqual(CH.analisar('Am7(b5)').formula, '1 b3 b5 b7');
  assert.strictEqual(CH.analisar('C7').formula, '1 3 5 b7');
  assert.strictEqual(CH.analisar('Cm7').formula, '1 b3 5 b7');
  assert.strictEqual(CH.analisar('Csus4').formula.indexOf('1 4'), 0);
  // tensões entram com o grau delas
  assert.ok(/b9/.test(CH.analisar('G7(b9)').formula), CH.analisar('G7(b9)').formula);
  assert.ok(/#11/.test(CH.analisar('C7M(#11)').formula), CH.analisar('C7M(#11)').formula);
  // baixo invertido
  var inv = CH.analisar('D7/F#');
  assert.strictEqual(inv.baixo, 'F#');
  assert.strictEqual(inv.baixoInvertido, true);
  assert.strictEqual(CH.analisar('C7M').baixoInvertido, false);
  assert.strictEqual(CH.analisar('bobagem'), null);
});

test('as posições do braço são tocáveis e soam o acorde', function () {
  var semPosicao = [];
  CIFRAS.concat(EXTRAS).forEach(function (cifra) {
    ['violao', 'guitarra'].forEach(function (inst) {
      var info = CH.analisar(cifra);
      var pcsDoAcorde = info.notas.map(function (n) { return n.pc; });
      var ps = CH.posicoes(cifra, inst, 3);
      if (!ps.length) { semPosicao.push(cifra + '/' + inst); return; }

      ps.forEach(function (p) {
        var onde = cifra + ' (' + inst + ') ' + p.casas.map(function (f) { return f === null ? 'x' : f; }).join('-');

        // 1) toda nota que soa pertence ao acorde
        p.notas.forEach(function (n) {
          assert.ok(pcsDoAcorde.indexOf(n.midi % 12) >= 0, onde + ': nota estranha ' + n.name);
          assert.ok(n.grau, onde + ': nota sem grau');
        });

        // 2) a mais grave é o baixo do acorde
        var grave = Math.min.apply(null, p.midis);
        assert.strictEqual(grave % 12, theory.pitchClassOf(info.baixo), onde + ': o baixo não é ' + info.baixo);

        // 3) a mão alcança: no máximo 4 casas de abertura e 4 dedos
        var presas = p.casas.filter(function (f) { return f !== null && f > 0; });
        if (presas.length) {
          var abertura = Math.max.apply(null, presas) - Math.min.apply(null, presas);
          assert.ok(abertura <= 3, onde + ': abertura de ' + (abertura + 1) + ' casas');
        }
        var dedosUsados = {};
        p.dedos.forEach(function (d) { if (d) dedosUsados[d] = 1; });
        assert.ok(Object.keys(dedosUsados).length <= 4, onde + ': mais de 4 dedos');

        // 4) pestana não pode ter corda solta no meio
        if (p.pestana) {
          var min = Math.min.apply(null, presas);
          var naBarra = [];
          p.casas.forEach(function (f, i) { if (f === min) naBarra.push(i); });
          for (var c = naBarra[0]; c <= naBarra[naBarra.length - 1]; c++) {
            assert.notStrictEqual(p.casas[c], 0, onde + ': corda solta dentro da pestana');
          }
        }

        // 5) no máximo uma corda abafada no meio das que soam
        var cordas = p.notas.map(function (n) { return n.corda; });
        var buracos = 0;
        for (var k = cordas[0]; k <= cordas[cordas.length - 1]; k++) if (cordas.indexOf(k) < 0) buracos++;
        assert.ok(buracos <= 1, onde + ': ' + buracos + ' cordas abafadas no meio');

        // 6) pelo menos 4 cordas soando (é um acorde, não um intervalo)
        assert.ok(p.notas.length >= 4, onde + ': só ' + p.notas.length + ' cordas');
      });

      // posições diferentes, em regiões diferentes do braço
      for (var i = 1; i < ps.length; i++) {
        assert.ok(ps[i].casaBase - ps[i - 1].casaBase >= 3,
          cifra + '/' + inst + ': duas posições na mesma região (' + ps[i - 1].casaBase + ' e ' + ps[i].casaBase + ')');
      }
    });
  });
  // alguns acordes muito carregados podem não caber na mão — mas poucos
  assert.ok(semPosicao.length <= 6, 'acordes sem posição no braço: ' + semPosicao.join(', '));
});

test('os acordes abertos conhecidos saem como se aprende', function () {
  function primeira(cifra) {
    var p = CH.posicoes(cifra, 'violao', 3)[0];
    assert.ok(p, cifra + ': sem posição');
    return p.casas.map(function (f) { return f === null ? 'x' : f; }).join('');
  }
  assert.strictEqual(primeira('C'), 'x32010');
  assert.strictEqual(primeira('A'), 'x02220');
  assert.strictEqual(primeira('E'), '022100');
  assert.strictEqual(primeira('D'), 'xx0232');
  assert.strictEqual(primeira('Em'), '022000');
  assert.strictEqual(primeira('Am7'), 'x02010');
  assert.strictEqual(primeira('E7'), '020100');
  assert.strictEqual(primeira('G7'), '320001');
  assert.strictEqual(primeira('C7M'), 'x32000');
  assert.strictEqual(primeira('F'), '133211');       // a pestana de verdade
});

test('o teclado traz posição fundamental, inversão e o voicing de 3ª e 7ª', function () {
  var vs = CH.teclado('G7');
  assert.strictEqual(vs.length, 3);
  assert.strictEqual(vs[0].id, 'fundamental');
  // sobe sem pular para trás
  var midis = vs[0].notas.map(function (n) { return n.midi; });
  for (var i = 1; i < midis.length; i++) assert.ok(midis[i] > midis[i - 1], 'as notas não sobem');
  assert.deepStrictEqual(vs[0].notas.map(function (n) { return n.name; }), ['G', 'B', 'D', 'F']);

  var shell = vs[2];
  assert.strictEqual(shell.id, 'shell');
  assert.strictEqual(shell.esquerda.length, 1, 'a mão esquerda toca só a fundamental');
  assert.deepStrictEqual(shell.notas.slice(1).map(function (n) { return n.grau; }), ['3', 'b7']);
  assert.ok(shell.esquerda[0] < shell.direita[0], 'a mão esquerda tem de ficar abaixo da direita');

  // tríade não tem 7ª: não existe voicing de 3ª e 7ª
  assert.strictEqual(CH.teclado('C').filter(function (v) { return v.id === 'shell'; }).length, 0);

  // toda nota de todo voicing pertence ao acorde
  CIFRAS.concat(EXTRAS).forEach(function (cifra) {
    var pcs = CH.analisar(cifra).notas.map(function (n) { return n.pc; });
    CH.teclado(cifra).forEach(function (v) {
      v.esquerda.concat(v.direita).forEach(function (m) {
        assert.ok(pcs.indexOf(((m % 12) + 12) % 12) >= 0, cifra + '/' + v.id + ': nota estranha no teclado');
      });
    });
  });
});

test('o baixo acha a fundamental mais grave e só notas do acorde', function () {
  CIFRAS.concat(EXTRAS).forEach(function (cifra) {
    var info = CH.analisar(cifra);
    var b = CH.baixo(cifra);
    assert.ok(b, cifra + ': sem resposta para o baixo');
    assert.strictEqual(b.raiz.midi % 12, theory.pitchClassOf(info.baixo), cifra + ': a raiz do baixo está errada');
    assert.ok(b.raiz.casa <= 9, cifra + ': fundamental na casa ' + b.raiz.casa);
    var pcs = info.notas.map(function (n) { return n.pc; });
    b.notas.forEach(function (n) {
      assert.ok(pcs.indexOf(n.midi % 12) >= 0, cifra + ': nota estranha no braço do baixo (' + n.name + ')');
    });
    // a linha básica: fundamental, 5ª (quando existe) e a oitava
    assert.strictEqual(b.linha[0].midi, b.raiz.midi);
    assert.strictEqual(b.linha[b.linha.length - 1].midi, b.raiz.midi + 12);
  });
  // a mais grave possível: G no baixo é a casa 3 da corda E, não a solta do G
  var g = CH.baixo('G7');
  assert.strictEqual(g.raiz.corda, 0);
  assert.strictEqual(g.raiz.casa, 3);
});

test('as outras grafias do mesmo acorde não repetem a digitada', function () {
  var a = CH.apelidos('C7M');
  assert.ok(a.length >= 2, 'poucas grafias: ' + a.join(' '));
  assert.ok(a.indexOf('C7M') < 0, 'repetiu a própria cifra');
  a.forEach(function (c) {
    var x = CH.analisar(c);
    assert.ok(x, 'grafia que o sistema não entende: ' + c);
    assert.strictEqual(x.qualidade, 'major7', c + ': virou outro acorde');
  });
  assert.ok(CH.apelidos('Am7').every(function (c) { return CH.analisar(c).qualidade === 'minor7'; }));
});

test('a busca é rápida o bastante para rodar enquanto a pessoa digita', function () {
  var t0 = Date.now();
  ['C7M', 'G7(b9)', 'Ebm7(b5)', 'F#7', 'Bb6(9)'].forEach(function (c) {
    CH.posicoes(c, 'violao', 3);
    CH.posicoes(c, 'guitarra', 3);
  });
  var ms = Date.now() - t0;
  assert.ok(ms < 1500, 'demorou ' + ms + ' ms para 10 buscas');
  console.log('      (10 buscas de posição em ' + ms + ' ms)');
});

console.log('\n' + passed + ' testes ok');
