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

// --------------------------------------------------------------------
// Teoria do zero (24/10/2026): as 18 lições para quem não sabe nada.
// --------------------------------------------------------------------

// A ordem foi refeita em 24/10/2026 a pedido do dono: nota, cifra, tom e
// semitom, cromática, escala maior, tríades e campo harmônico vêm antes de
// qualquer coisa de leitura — numa plataforma de improvisação, som e
// harmonia vêm antes de escrita.
var BLOCOS = ['As notas', 'A escala e os acordes', 'O braço e as distâncias', 'A escrita'];

test('a trilha do zero tem 18 lições, nos quatro blocos e na ordem certa', function () {
  var zero = lessons.LESSONS.filter(function (l) { return l.nivel === 'zero'; });
  assert.strictEqual(zero.length, 18, 'esperava 18 lições do zero, achei ' + zero.length);
  // elas vêm primeiro: quem chega do zero não pode cair no meio do intermediário
  lessons.LESSONS.slice(0, 18).forEach(function (l, i) {
    assert.strictEqual(l.nivel, 'zero', 'a lição ' + (i + 1) + ' deveria ser da trilha do zero');
  });
  // os blocos aparecem inteiros e na ordem — nada de pular do som para os acordes
  var ordem = [];
  zero.forEach(function (l) {
    assert.ok(BLOCOS.indexOf(l.bloco) >= 0, 'bloco desconhecido em ' + l.id + ': ' + l.bloco);
    if (ordem[ordem.length - 1] !== l.bloco) ordem.push(l.bloco);
  });
  assert.deepStrictEqual(ordem, BLOCOS, 'os blocos saíram fora de ordem: ' + ordem.join(' > '));
});

test('a trilha do zero encosta nas lições antigas sem degrau', function () {
  var zero = lessons.LESSONS.slice(0, 18);
  var antigas = lessons.LESSONS.slice(18);
  var primeiraAntiga = antigas[0];
  assert.ok(primeiraAntiga && primeiraAntiga.nivel !== 'zero', 'depois da 18ª vêm as lições antigas');
  assert.ok(!antigas.some(function (l) { return l.nivel === 'zero'; }), 'nenhuma lição do zero sobrou no meio das antigas');
  // A trilha do zero não termina mais em funções/ii-V-I (ela fecha na
  // escrita musical), mas o degrau continua proibido: a primeira antiga
  // abre em campo harmônico e funções, então as duas coisas precisam estar
  // ensinadas em algum ponto do zero.
  assert.strictEqual(primeiraAntiga.id, 'campo-harmonico',
    'a primeira lição antiga deveria ser campo-harmonico (é ' + primeiraAntiga.id + ')');
  var ids = zero.map(function (l) { return l.id; }).join(' ');
  assert.ok(/campo-harmonico/.test(ids), 'a trilha do zero precisa ensinar campo harmônico antes das antigas');
  assert.ok(/fun[cç]|ii.?v.?i/i.test(ids), 'a trilha do zero precisa ensinar funções/ii-V-I antes das antigas');
  // e o essencial de harmonia fica junto, num bloco só, antes da escrita
  var harmonia = zero.filter(function (l) { return /campo-harmonico|fun[cç]|triades|tetrades|escala-maior/.test(l.id); });
  harmonia.forEach(function (l) {
    assert.strictEqual(l.bloco, 'A escala e os acordes', 'a lição ' + l.id + ' deveria estar no bloco da escala e dos acordes');
  });
});

test('nenhuma lição do zero usa um conceito que só é explicado depois dela', function () {
  var zero = lessons.LESSONS.slice(0, 18);
  var pos = {};
  zero.forEach(function (l, i) { pos[l.id] = i; });
  // pré-requisitos reais da sequência pedida pelo dono
  var exige = {
    'escala-maior': ['tom-semitom-e-acidentes', 'escala-cromatica'],
    'triades': ['escala-maior'],
    'campo-harmonico-maior-do-zero': ['triades'],
    'tetrades-e-as-setimas': ['campo-harmonico-maior-do-zero'],
    'funcoes-e-ii-v-i': ['tetrades-e-as-setimas'],
    'intervalos-numero-e-qualidade': ['tom-semitom-e-acidentes'],
    'melodico-harmonico-consonancia': ['intervalos-numero-e-qualidade'],
    'escala-menor-natural-e-relativa': ['escala-maior'],
    'armadura-e-ciclo-de-quintas': ['pauta-claves-e-linhas', 'intervalos-numero-e-qualidade'],
    'compasso-e-formula': ['figuras-e-pausas'],
    'ligadura-ponto-andamento-dinamica': ['figuras-e-pausas', 'compasso-e-formula']
  };
  Object.keys(exige).forEach(function (id) {
    assert.ok(typeof pos[id] === 'number', 'lição esperada não existe: ' + id);
    exige[id].forEach(function (req) {
      assert.ok(typeof pos[req] === 'number', 'pré-requisito inexistente: ' + req);
      assert.ok(pos[req] < pos[id], id + ' vem antes do seu pré-requisito ' + req);
    });
  });
});

test('os exemplos sonoros são tocáveis: nomes de nota válidos e sequência de tamanho útil', function () {
  var total = 0;
  lessons.LESSONS.forEach(function (l) {
    if (!l.ouvir) return;
    assert.ok(l.ouvir.length <= 3, 'lição ' + l.id + ': exemplos sonoros demais');
    l.ouvir.forEach(function (o) {
      total++;
      assert.ok(o.rotulo && o.rotulo.length <= 70, 'lição ' + l.id + ': rótulo ausente ou longo demais');
      assert.ok(Array.isArray(o.notas) && o.notas.length >= 2 && o.notas.length <= 16,
        'lição ' + l.id + ': a sequência "' + o.rotulo + '" tem ' + (o.notas || []).length + ' notas');
      o.notas.forEach(function (n) {
        assert.ok(/^[A-G](#|b)?$/.test(n), 'lição ' + l.id + ': nota inválida "' + n + '"');
      });
    });
  });
  assert.ok(total >= 30, 'esperava pelo menos 30 exemplos sonoros na trilha, achei ' + total);
});

test('o texto das lições do zero é prosa, não HTML nem lista', function () {
  lessons.LESSONS.filter(function (l) { return l.nivel === 'zero'; }).forEach(function (l) {
    assert.ok(l.corpo.length >= 3 && l.corpo.length <= 6, 'lição ' + l.id + ': ' + l.corpo.length + ' parágrafos');
    assert.ok(l.resumo.length <= 90, 'lição ' + l.id + ': resumo com ' + l.resumo.length + ' caracteres');
    l.corpo.forEach(function (par) {
      assert.ok(par.trim().length > 40, 'lição ' + l.id + ': parágrafo curto demais');
      assert.ok(par.indexOf('<') < 0, 'lição ' + l.id + ': HTML no corpo');
    });
  });
});

console.log('\n' + passed + ' teste(s) passaram.');
if (process.exitCode) {
  console.log('ALGUM TESTE FALHOU.');
} else {
  console.log('Todos os testes passaram.');
}
