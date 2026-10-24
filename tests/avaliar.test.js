/**
 * Testes da avaliação da gravação (js/avaliar.js).
 *
 * É a conta que decide se o aluno passa e libera o próximo exercício, então
 * ela precisa estar certa em três direções: aprovar quem tocou, reprovar quem
 * não tocou, e NÃO reprovar por motivo errado (oitava diferente, ritmo torto,
 * uma nota a mais no fim).
 *
 *   node tests/avaliar.test.js
 */
var assert = require('assert');
var A = require('../js/avaliar.js');

var passed = 0;
function test(nome, fn) {
  try { fn(); console.log('  ok - ' + nome); passed++; }
  catch (e) { console.log('  FALHOU - ' + nome + '\n      ' + e.message); process.exitCode = 1; }
}

console.log('avaliar.js — a nota da gravação');

// Dó maior subindo uma oitava, como sai do gerador de exercícios.
var ESCALA = [60, 62, 64, 65, 67, 69, 71, 72];

test('tocou igual: nota 1, nada faltando', function () {
  var r = A.avaliar(ESCALA, ESCALA.slice());
  assert.strictEqual(r.nota, 1);
  assert.strictEqual(r.acertos, 8);
  assert.strictEqual(r.faltaram.length, 0);
  assert.ok(/8 das 8/.test(r.resumo), r.resumo);
});

test('mesma escala uma oitava abaixo passa (baixo, sax, outra região do braço)', function () {
  var r = A.avaliar(ESCALA, ESCALA.map(function (m) { return m - 12; }));
  assert.strictEqual(r.nota, 1, 'a oitava não pode reprovar ninguém');
});

test('exigindo a oitava, a mesma gravação reprova', function () {
  var r = A.avaliar(ESCALA, ESCALA.map(function (m) { return m - 12; }), { oitava: true });
  // Sobra um acerto de coincidência: o Dó agudo do exercício é o Dó grave da
  // gravação. Uma nota em oito não passa nem perto, que é o que importa aqui.
  assert.ok(r.acertos <= 1, 'acertos: ' + r.acertos);
  assert.ok(r.nota < A.PASSA, 'nota: ' + r.nota);
});

test('não tocou nada: nota 0 e um recado útil', function () {
  var r = A.avaliar(ESCALA, []);
  assert.strictEqual(r.nota, 0);
  assert.ok(/microfone/i.test(r.resumo), r.resumo);
});

test('errou uma nota no meio: o resto continua contando', function () {
  var tocado = ESCALA.slice();
  tocado[3] = 66;                       // F# no lugar do F
  var r = A.avaliar(ESCALA, tocado);
  assert.strictEqual(r.acertos, 7, 'as outras sete continuam valendo');
  assert.strictEqual(r.faltaram.length, 1);
  assert.strictEqual(r.faltaram[0].posicao, 3);
  assert.strictEqual(r.faltaram[0].nome, 'F');
  assert.ok(/4ª nota/.test(r.resumo), r.resumo);
});

test('a nota que faltou é dita pelo nome e pela posição', function () {
  var tocado = ESCALA.filter(function (m) { return m !== 71; });   // comeu o Si
  var r = A.avaliar(ESCALA, tocado);
  assert.strictEqual(r.faltaram[0].nome, 'B');
  assert.ok(/7ª nota/.test(r.resumo), r.resumo);
});

test('trechos seguidos viram um intervalo só na mensagem', function () {
  var tocado = [60, 62, 72];            // sumiu do 64 ao 71
  var r = A.avaliar(ESCALA, tocado);
  assert.strictEqual(r.trechosFaltando.length, 1);
  assert.strictEqual(r.trechosFaltando[0].ini, 2);
  assert.strictEqual(r.trechosFaltando[0].fim, 6);
  assert.ok(/da 3ª à 7ª/.test(r.resumo), r.resumo);
});

test('nota a mais no fim não reprova (passa com 100%)', function () {
  var r = A.avaliar(ESCALA, ESCALA.concat([74]));
  assert.strictEqual(r.nota, 1);
  assert.ok(r.limpeza < 1, 'mas a limpeza cai, porque sobrou nota');
});

test('o piso de 80% separa quem passa de quem não passa', function () {
  var seteDeOito = A.avaliar(ESCALA, ESCALA.filter(function (m) { return m !== 65; }));
  assert.ok(seteDeOito.nota >= A.PASSA, '7 de 8 = ' + Math.round(seteDeOito.nota * 100) + '% deveria passar');
  var seisDeOito = A.avaliar(ESCALA, ESCALA.filter(function (m) { return m !== 65 && m !== 69; }));
  assert.ok(seisDeOito.nota < A.PASSA, '6 de 8 = ' + Math.round(seisDeOito.nota * 100) + '% NÃO deveria passar');
});

test('ruído: muita nota que não é do exercício derruba a limpeza e avisa', function () {
  var ruido = [];
  for (var i = 0; i < 40; i++) ruido.push(61 + (i % 3));    // nada a ver com Dó maior
  var r = A.avaliar(ESCALA, ESCALA.slice(0, 2).concat(ruido));
  assert.ok(r.limpeza < 0.5, 'limpeza ' + r.limpeza);
  assert.ok(/ruído|fone de ouvido/i.test(r.resumo), r.resumo);
});

test('poucas notas, todas certas: avisa que o microfone pode estar perdendo o instrumento', function () {
  // É a assinatura medida do acompanhamento cobrindo o instrumento: o detector
  // ouve menos notas do que o exercício tem, mas as que ouve estão certas.
  var r = A.avaliar(ESCALA, [60, 62, 64, 72]);
  assert.ok(r.limpeza > 0.8, 'limpeza ' + r.limpeza);
  assert.ok(/fone de ouvido|desmarque o acompanhamento/i.test(r.resumo), r.resumo);
});

test('tocar a escala duas vezes seguidas conta como certo', function () {
  var r = A.avaliar(ESCALA, ESCALA.concat(ESCALA));
  assert.strictEqual(r.nota, 1, 'repetir não pode reprovar');
});

test('ordem trocada reprova: a sequência é o que se está ensinando', function () {
  var r = A.avaliar(ESCALA, ESCALA.slice().reverse());
  assert.ok(r.nota < A.PASSA, 'descendo não é o mesmo exercício que subindo (' + r.nota + ')');
});

test('midisEsperados ignora pausas e eventos sem altura', function () {
  var ev = [{ midi: 60 }, { rest: true, midi: 62 }, { midi: 64 }, { name: 'X' }];
  assert.deepStrictEqual(A.midisEsperados(ev), [60, 64]);
});

test('midisOuvidos põe na ordem do tempo, mesmo vindo embaralhado', function () {
  var mel = [
    { startTimeSeconds: 1.0, pitchMidi: 62 },
    { startTimeSeconds: 0.5, pitchMidi: 60 },
    { startTimeSeconds: 1.5, pitchMidi: 64 }
  ];
  assert.deepStrictEqual(A.midisOuvidos(mel), [60, 62, 64]);
});

test('nomeDaClasse escreve com sustenido ou bemol, conforme pedido', function () {
  assert.strictEqual(A.nomeDaClasse(66), 'F#');
  assert.strictEqual(A.nomeDaClasse(66, true), 'Gb');
  assert.strictEqual(A.nomeDaClasse(72), 'C');
});

test('um exercício longo não derruba a conta (21 notas, 4 erradas)', function () {
  var longo = [];
  for (var i = 0; i < 21; i++) longo.push(60 + i);
  var tocado = longo.slice();
  [3, 8, 14, 19].forEach(function (i) { tocado[i] = 61 + ((tocado[i] + 6) % 12); });
  var r = A.avaliar(longo, tocado);
  assert.ok(r.acertos >= 17, 'acertos: ' + r.acertos);
  assert.ok(r.nota >= A.PASSA, 'esperava passar com 17 de 21 (' + Math.round(r.nota * 100) + '%)');
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) console.log('ALGUM TESTE FALHOU.');
else console.log('Todos os testes passaram.');
