/**
 * Testes do motor de transcrição (js/transcribe.js) — as partes que não
 * dependem do navegador. node tests/transcricao.test.js
 */
var assert = require('assert');
var T = require('../js/transcribe.js');

var passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ok - ' + name); passed++; }
  catch (e) { console.log('  FALHOU - ' + name); console.log('    ' + e.message); process.exitCode = 1; }
}
console.log('transcribe.js — motor da Transcrição / Treino');

/** Monta uma "saída do detector" a partir de uma lista simples. */
function nota(midi, ini, dur, amp) {
  return { pitchMidi: midi, startTimeSeconds: ini, durationSeconds: dur, amplitude: amp == null ? 0.7 : amp };
}

test('extrairMelodia descarta os harmônicos falsos', function () {
  // linha de colcheias a 120 bpm + um harmônico agudo e fraco em cada ataque
  var cruas = [];
  [60, 62, 64, 65, 67, 69, 71, 72].forEach(function (m, i) {
    cruas.push(nota(m, i * 0.25, 0.28, 0.74));
    cruas.push(nota(m + 24, i * 0.25 + 0.01, 0.12, 0.42));   // harmônico: fraco e no mesmo ataque
  });
  var mel = T.extrairMelodia(cruas);
  assert.strictEqual(mel.length, 8, 'sobraram ' + mel.length + ' notas');
  assert.deepStrictEqual(mel.map(function (x) { return x.pitchMidi; }), [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('extrairMelodia descarta o acompanhamento (acordes longos)', function () {
  var cruas = [];
  [60, 62, 64, 65, 67, 69, 71, 72].forEach(function (m, i) { cruas.push(nota(m, i * 0.25, 0.28, 0.72)); });
  // dois acordes de 4 notas longas, atacadas juntas
  [[48, 52, 55, 59], [43, 47, 50, 53]].forEach(function (acorde, k) {
    acorde.forEach(function (m) { cruas.push(nota(m, k * 1.0, 0.95, 0.68)); });
  });
  var mel = T.extrairMelodia(cruas);
  assert.strictEqual(mel.length, 8, 'sobraram ' + mel.length + ' notas (o acompanhamento deveria sair)');
  assert.ok(mel.every(function (x) { return x.pitchMidi >= 60; }), 'ficou nota do acompanhamento');
});

test('notas seguidas que soam sobrepostas NÃO são cortadas', function () {
  // guitarra: cada nota soa 0,4 s mas a próxima entra a 0,25 s
  var cruas = [60, 62, 64, 65, 67].map(function (m, i) { return nota(m, i * 0.25, 0.4, 0.72); });
  var mel = T.extrairMelodia(cruas);
  assert.strictEqual(mel.length, 5, 'perdeu nota por causa da ressonância');
  mel.slice(0, -1).forEach(function (x, i) {
    assert.ok(x.startTimeSeconds + x.durationSeconds <= mel[i + 1].startTimeSeconds + 1e-9,
      'a linha não pode se sobrepor a si mesma depois da limpeza');
  });
});

test('estimarAndamento acerta o bpm de uma linha regular', function () {
  [80, 100, 120, 152].forEach(function (bpm) {
    var passo = 60 / bpm / 2;                   // colcheias
    var mel = [];
    for (var i = 0; i < 32; i++) mel.push(nota(60 + (i % 8), i * passo, passo * 0.9));
    var r = T.estimarAndamento(mel);
    var ok = Math.abs(r.bpm - bpm) <= 2 || Math.abs(r.bpm - bpm * 2) <= 3 || Math.abs(r.bpm - bpm / 2) <= 2;
    assert.ok(ok, bpm + ' bpm -> detectou ' + r.bpm);
    assert.ok(r.confianca > 0.8, bpm + ' bpm: confiança baixa (' + r.confianca.toFixed(2) + ')');
  });
});

test('paraEventos quantiza na grade e não deixa nota em cima de nota', function () {
  var bpm = 120, spb = 0.5;
  var mel = [nota(60, 0, 0.24), nota(62, 0.26, 0.24), nota(64, 0.49, 0.5), nota(67, 1.02, 0.9)];
  var evs = T.paraEventos(mel, bpm);
  assert.deepStrictEqual(evs.map(function (e) { return e.onset; }), [0, 0.5, 1, 2]);
  evs.forEach(function (e) {
    assert.ok(Math.abs(e.onset / 0.25 - Math.round(e.onset / 0.25)) < 1e-9, 'fora da grade: ' + e.onset);
    assert.ok(e.dur >= 0.25, 'duração zerada');
    assert.ok(e.name && e.midi, 'evento sem nome/midi');
  });
  for (var i = 1; i < evs.length; i++) {
    assert.ok(evs[i - 1].onset + evs[i - 1].dur <= evs[i].onset + 1e-9, 'notas sobrepostas no compasso');
  }
});

test('comPausas fecha os buracos com pausa', function () {
  var evs = [{ midi: 60, name: 'C', onset: 0, dur: 0.5 }, { midi: 62, name: 'D', onset: 2, dur: 0.5 }];
  var com = T.comPausas(evs);
  assert.strictEqual(com.length, 3);
  assert.ok(com[1].rest && Math.abs(com[1].dur - 1.5) < 1e-9, 'pausa errada');
  var t = 0;
  com.forEach(function (e) { assert.ok(Math.abs(e.onset - t) < 1e-9, 'linha do tempo com furo'); t = e.onset + e.dur; });
});

test('fatiar divide nas respiradas e respeita o limite de compassos', function () {
  var evs = [];
  // 3 frases de 8 colcheias, separadas por 2 tempos de silêncio
  for (var f = 0; f < 3; f++) {
    for (var i = 0; i < 8; i++) evs.push({ midi: 60 + i, name: 'X', onset: f * 6 + i * 0.5, dur: 0.5 });
  }
  var sec = T.fatiar(evs, { compassos: 4 });
  assert.strictEqual(sec.length, 3, 'deveriam ser 3 frases, veio ' + sec.length);
  sec.forEach(function (s, i) {
    assert.strictEqual(s.indice, i);
    assert.ok(s.eventos.length === 8, 'seção ' + i + ' com ' + s.eventos.length + ' notas');
    assert.ok(s.eventos[0].onset >= 0, 'a seção tem de começar do zero dela');
    assert.ok(s.compasso >= 1 && s.compassoFim >= s.compasso, 'numeração de compasso inválida');
  });
});

test('fatiar não deixa seção com duas notas soltas e não perde nota', function () {
  var evs = [];
  for (var i = 0; i < 40; i++) evs.push({ midi: 60 + (i % 12), name: 'X', onset: i * 0.5 + (i > 20 ? 3 : 0), dur: 0.5 });
  evs.push({ midi: 72, name: 'X', onset: 60, dur: 0.5 });   // uma nota perdida no fim
  var sec = T.fatiar(evs, { compassos: 4 });
  var total = sec.reduce(function (a, s) { return a + s.eventos.length; }, 0);
  assert.strictEqual(total, evs.length, 'perdeu notas ao fatiar (' + total + ' de ' + evs.length + ')');
  sec.forEach(function (s) { assert.ok(s.eventos.length >= 3, 'sobrou uma seção de ' + s.eventos.length + ' nota(s)'); });
});

test('adivinharTom acha a escala e mede a cobertura', function () {
  var dO = [0, 2, 4, 5, 7, 9, 11].map(function (x, i) { return { midi: 60 + x, name: 'X', onset: i, dur: 1 }; });
  var r = T.adivinharTom(dO);
  assert.strictEqual(r.maior, 'C');
  assert.strictEqual(r.menor, 'A');
  assert.ok(r.cobertura > 0.99, 'cobertura ' + r.cobertura);
  // com bemóis, a grafia acompanha (Sib maior = Bb C D Eb F G A, a partir do Bb3 = 58)
  var bb = [0, 2, 4, 5, 7, 9, 11].map(function (x, i) { return { midi: 58 + x, name: 'X', onset: i, dur: 1 }; });
  var rbb = T.adivinharTom(bb);
  assert.strictEqual(rbb.maior, 'Bb');
  assert.strictEqual(rbb.menor, 'G');
  assert.ok(rbb.bemol, 'Sib maior tem de ser grafado com bemóis');
  // metade fora da escala derruba a cobertura
  var meio = dO.concat([1, 3, 6, 8].map(function (x, i) { return { midi: 60 + x, name: 'X', onset: 10 + i, dur: 1 }; }));
  assert.ok(T.adivinharTom(meio).cobertura < 0.8);
});

test('nenhum instrumento pede um limite que apaga a transcrição inteira', function () {
  // O constrainFrequency do Basic Pitch faz `idx = hzToMidi(freq) - 21` e
  // depois `array.fill(0, 0, idx)`. Com idx negativo o fill conta de trás para
  // frente e zera TUDO — era o bug do Teclado/Piano (0 notas). Aqui garantimos
  // que nenhum instrumento produz um índice negativo (ou pede além do topo).
  var hzToMidi = function (f) { return 12 * (Math.log2(f) - Math.log2(440)) + 69; };
  Object.keys(T.FAIXA).forEach(function (k) {
    var l = T.limitesHz(k);
    if (l.min !== null) {
      var idxGrave = hzToMidi(l.min) - 21;
      assert.ok(idxGrave >= 0, k + ': índice grave ' + idxGrave.toFixed(1) + ' — apagaria a transcrição');
    }
    if (l.max !== null) {
      var idxAgudo = hzToMidi(l.max) - 21;
      assert.ok(idxAgudo > 0 && idxAgudo <= 88, k + ': índice agudo fora do modelo (' + idxAgudo.toFixed(1) + ')');
    }
    // e o limite tem de continuar cobrindo a faixa do instrumento
    var f = T.FAIXA[k];
    if (l.min !== null) assert.ok(hzToMidi(l.min) <= f[0] + 0.01, k + ': o limite grave cortaria a nota mais baixa');
    if (l.max !== null) assert.ok(hzToMidi(l.max) >= f[1] - 0.01, k + ': o limite agudo cortaria a nota mais alta');
  });
  // o teclado, que começa na nota mais grave que o modelo conhece, fica sem limite grave
  assert.strictEqual(T.limitesHz('teclado').min, null, 'o teclado não pode pedir limite grave');
  assert.ok(T.limitesHz('guitarra').min > 70, 'a guitarra deveria ter limite grave');
});

test('a faixa de cada instrumento é coerente', function () {
  Object.keys(T.FAIXA).forEach(function (k) {
    var f = T.FAIXA[k];
    assert.ok(f[0] >= 21 && f[1] <= 108 && f[1] - f[0] >= 24, k + ': faixa estranha ' + f.join('–'));
  });
  assert.ok(T.FAIXA.baixo[0] < T.FAIXA.flauta[0], 'o baixo tem de ir mais grave que a flauta');
});

test('o perfil de ajuste segue a densidade do material', function () {
  // Linha rápida (semicolcheias de fusion) e linha lenta pedem ajustes opostos:
  // medido contra gabarito em 6 gravações — ver docs/status.md.
  assert.strictEqual(T.perfilPara(9.0), T.PERFIS.rapido, 'material rápido tem de usar o perfil duro');
  assert.strictEqual(T.perfilPara(3.5), T.PERFIS.lento, 'material lento tem de usar o perfil brando');
  assert.strictEqual(T.perfilPara(0), T.PERFIS.lento, 'sem notas, cai no brando');
  assert.ok(T.PERFIS.rapido.onset > T.PERFIS.lento.onset, 'o perfil rápido exige ataque mais forte');
  assert.ok(T.PERFIS.rapido.minLen < T.PERFIS.lento.minLen, 'o perfil rápido aceita nota mais curta');
  ['rapido', 'lento', 'neutro'].forEach(function (k) {
    var p = T.PERFIS[k];
    assert.ok(p.onset > 0 && p.onset < 1 && p.frame > 0 && p.frame < 1, k + ': limiar fora de 0..1');
    assert.ok(p.minLen >= 1 && p.piso > 0 && p.piso <= 1, k + ': parâmetro inválido');
  });
});

test('densidadeDe conta notas por segundo', function () {
  var mel = [];
  for (var i = 0; i < 30; i++) mel.push({ pitchMidi: 60, startTimeSeconds: i * 0.1, durationSeconds: 0.08, amplitude: 0.7 });
  assert.ok(Math.abs(T.densidadeDe(mel) - 10) < 0.5, 'deu ' + T.densidadeDe(mel));
  assert.strictEqual(T.densidadeDe([]), 0);
  assert.strictEqual(T.densidadeDe(mel.slice(0, 2)), 0, 'poucas notas: não dá para medir');
});

test('nomeDeMidi grafa com sustenido ou bemol conforme o tom', function () {
  assert.strictEqual(T.nomeDeMidi(60, false), 'C');
  assert.strictEqual(T.nomeDeMidi(61, false), 'C#');
  assert.strictEqual(T.nomeDeMidi(61, true), 'Db');
  assert.strictEqual(T.nomeDeMidi(70, true), 'Bb');
  assert.strictEqual(T.nomeDeMidi(70, false), 'A#');
  // e continua certo em qualquer oitava
  [24, 36, 48, 72, 84, 96].forEach(function (m) {
    assert.strictEqual(T.nomeDeMidi(m, false), 'C', 'oitava ' + m);
  });
});

console.log('\n' + passed + ' testes ok');
