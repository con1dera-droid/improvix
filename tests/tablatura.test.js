/**
 * A tablatura não pode mentir.
 *
 * Uma tab é uma promessa: "ponha o dedo aqui e sai a nota escrita ali". Se a
 * casa indicada soa diferente da nota do lado, o aluno estuda errado sem
 * jeito de perceber — foi o que aconteceu no baixo, onde o exercício caía
 * abaixo da corda mais grave e a tab grampeava tudo na corda solta: estava
 * escrito dó e mandava tocar mi.
 *
 * Aqui a promessa é conferida nota a nota, varrendo exercícios de escala,
 * padrões e frases da biblioteca em vários tons e instrumentos:
 *
 *   1. a casa indicada soa EXATAMENTE a nota escrita;
 *   2. nenhuma nota cai abaixo da corda solta mais grave (impossível de tocar);
 *   3. nenhuma casa passa da 20ª (não existe braço) e nenhuma nota sai em
 *      corda solta (a digitação tem de servir em qualquer tom);
 *   4. a classe de altura da nota escrita bate com o nome dela (dó é dó).
 *
 *   node tests/tablatura.test.js
 */
global.window = global.window || {};
['theory', 'scales', 'notation', 'articulation', 'patterns', 'phrases', 'library']
  .forEach(function (m) { try { require('../js/' + m + '.js'); } catch (e) { /* opcional */ } });

var IL = global.window.IL;
var nt = IL.notation;

var AFINACAO = {
  guitarra: [40, 45, 50, 55, 59, 64],
  violao: [40, 45, 50, 55, 59, 64],
  baixo: [28, 33, 38, 43]
};

var falhas = 0, conferidas = 0, exercicios = 0;
function ok(cond, msg) {
  console.log((cond ? ' ok    ' : ' FALHA ') + msg);
  if (!cond) falhas++;
}

/** Confere uma linha já preparada para o instrumento. Devolve os problemas. */
function conferir(pr, instrument, onde) {
  var cordas = AFINACAO[instrument];
  var notas = pr.events.filter(function (e) { return !e.rest; });
  var problemas = [];
  pr.tab.notes.forEach(function (t, i) {
    var e = notas[i];
    if (!e) { problemas.push(onde + ': tab tem mais notas que a linha'); return; }
    // Num bend, a casa escrita é onde o DEDO entra e a nota escrita é a altura
    // depois de puxar a corda: "6b8" quer dizer casa 6 puxada até soar a 8.
    var dedo = cordas[t.string] + t.fret;
    var soa = (e.art === 'b' && t.bendFret !== null && t.bendFret !== undefined)
      ? cordas[t.string] + t.bendFret : dedo;
    conferidas++;
    if (soa !== e.midi) {
      problemas.push(onde + ' nota ' + (i + 1) + ' (' + e.name + '): a tab manda tocar MIDI ' +
        soa + ' (corda ' + t.string + ', casa ' + t.fret + (t.bendFret != null ? 'b' + t.bendFret : '') +
        '), mas o escrito é ' + e.midi);
    }
    if (e.art === 'b' && e.bendFrom !== undefined && dedo !== e.bendFrom) {
      problemas.push(onde + ' nota ' + (i + 1) + ': o bend começa na casa errada (dedo soa ' +
        dedo + ', devia ser ' + e.bendFrom + ')');
    }
    if (t.fret < 0 || t.fret > 20) {
      problemas.push(onde + ' nota ' + (i + 1) + ': casa ' + t.fret + ' não existe');
    }
    // Sem cordas soltas: a digitação tem de servir em qualquer tom, e corda
    // solta não aceita vibrato nem bend (ver SEM_CORDAS_SOLTAS em notation.js).
    if (t.fret === 0) {
      problemas.push(onde + ' nota ' + (i + 1) + ' (' + e.name + '): está em corda solta');
    }
    if (e.midi < cordas[0]) {
      problemas.push(onde + ' nota ' + (i + 1) + ' (' + e.name + '): MIDI ' + e.midi +
        ' é mais grave que a corda solta mais grave (' + cordas[0] + ') — impossível de tocar');
    }
    var pc = IL.theory.pitchClassOf(e.name);
    if (pc !== null && pc !== undefined && ((e.midi % 12) + 12) % 12 !== ((pc % 12) + 12) % 12) {
      problemas.push(onde + ' nota ' + (i + 1) + ': está escrito ' + e.name + ' mas a altura é ' + e.midi);
    }
  });
  return problemas;
}

var INSTRUMENTOS = ['violao', 'guitarra', 'baixo'];
var TONS = ['C', 'Eb', 'F#', 'A'];

// --- 1) exercícios da Biblioteca de Escalas (é onde o erro apareceu) ---
var ruins = [];
var escalas = IL.scales.GROUPS.reduce(function (a, g) { return a.concat(g.keys); }, []);
INSTRUMENTOS.forEach(function (inst) {
  TONS.forEach(function (tom) {
    escalas.forEach(function (sk) {
      IL.scales.exercisesFor(tom, sk).forEach(function (ex, i) {
        exercicios++;
        var pr = nt.prepareForInstrument(ex.events, inst);
        ruins = ruins.concat(conferir(pr, inst, inst + ' ' + tom + ' ' + sk + ' ex' + (i + 1)));
      });
    });
  });
});
ok(ruins.length === 0, 'exercícios de escala: ' + exercicios + ' exercícios, ' + conferidas +
  ' casas conferidas, ' + ruins.length + ' erradas' + (ruins.length ? '\n   ' + ruins.slice(0, 5).join('\n   ') : ''));

// --- 2) exercícios de padrões (os 91 padrões, em dois tons) ---
var ruinsP = [], linhasP = 0;
IL.patterns.PATTERNS.forEach(function (pat) {
  ['C', 'Ab'].forEach(function (tom) {
    var r;
    try { r = IL.patterns.realize(pat, tom); } catch (e) { return; }
    if (!r || !r.events) return;
    INSTRUMENTOS.forEach(function (inst) {
      linhasP++;
      var pr = nt.prepareForInstrument(r.events, inst);
      ruinsP = ruinsP.concat(conferir(pr, inst, 'padrão ' + pat.id + ' ' + tom + ' ' + inst));
    });
  });
});
ok(ruinsP.length === 0, 'exercícios de padrões: ' + linhasP + ' linhas, ' + ruinsP.length + ' casas erradas' +
  (ruinsP.length ? '\n   ' + ruinsP.slice(0, 5).join('\n   ') : ''));

// --- 3) frases da Biblioteca, nos oito estilos ---
var ruinsF = [], frases = 0;
IL.library.styleList().forEach(function (st) {
  var estilo = st.key || st.id || st;
  ['jonio', 'alterada', 'pentatonica_blues'].forEach(function (sk) {
    INSTRUMENTOS.forEach(function (inst) {
      var lista;
      try {
        lista = IL.library.generate({ scaleKey: sk, tonic: 'C', style: estilo, level: 'avancado', instrument: inst, count: 3 });
      } catch (e) { return; }
      (lista || []).forEach(function (f, i) {
        if (!f.events) return;
        frases++;
        var pr = nt.prepareForInstrument(f.events, inst);
        ruinsF = ruinsF.concat(conferir(pr, inst, 'frase ' + estilo + '/' + sk + ' ' + inst + ' #' + i));
      });
    });
  });
});
ok(ruinsF.length === 0, 'frases da biblioteca: ' + frases + ' frases, ' + ruinsF.length + ' casas erradas' +
  (ruinsF.length ? '\n   ' + ruinsF.slice(0, 5).join('\n   ') : ''));

// --- 4) o caso exato que o dono do projeto encontrou ---
(function () {
  var ex = IL.scales.exercisesFor('C', 'jonio')[0];
  var pr = nt.prepareForInstrument(ex.events, 'baixo');
  var primeira = pr.events.filter(function (e) { return !e.rest; })[0];
  var t = pr.tab.notes[0];
  var soa = AFINACAO.baixo[t.string] + t.fret;
  ok(primeira.name === 'C' && soa === primeira.midi && t.fret > 0,
    'no baixo, o dó do exercício 1 não é corda solta: corda ' + t.string + ', casa ' + t.fret +
    ' (soa ' + soa + ', escrito ' + primeira.name + primeira.midi + ')');
})();

console.log(falhas ? '\n ' + falhas + ' PROBLEMA(S)' : '\n ' + conferidas + ' casas conferidas — a tablatura bate com as notas.');
process.exit(falhas ? 1 : 0);
