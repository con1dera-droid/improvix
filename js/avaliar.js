/**
 * IMPROVIX — avaliar a gravação do aluno
 *
 * Compara a sequência de notas QUE ERA PARA TOCAR com a sequência QUE FOI
 * OUVIDA pelo microfone (já transcrita por js/transcribe.js) e devolve uma
 * nota de 0 a 1, com a lista do que faltou e do que sobrou.
 *
 * O que este arquivo mede, e o que não mede — importa dizer, porque o aluno
 * vai ser liberado (ou não) por causa disto:
 *
 *   - Mede a ORDEM DAS NOTAS. Tocou dó-ré-mi quando era dó-ré-mi? Acertou.
 *   - NÃO mede ritmo. Tocar certo e fora do tempo passa; é proposital, porque
 *     a transcrição erra mais na duração do que na altura, e reprovar alguém
 *     por causa de erro da máquina seria pior do que deixar passar.
 *   - NÃO mede oitava, por padrão. Quem toca baixo, sax ou violão em outra
 *     região toca as mesmas notas em outro lugar — e estaria certo.
 *
 * O cálculo é a maior subsequência comum (LCS) entre as duas listas de classes
 * de nota. Subsequência, e não trecho contínuo: assim uma nota errada no meio
 * não derruba tudo o que vem depois, que é o que um professor faria ao ouvir.
 *
 * Roda no navegador (window.IL.avaliar) e no Node (para os testes).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.IL = root.IL || {}; root.IL.avaliar = api; }
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var BEMOL = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };

  /** Nome legível de uma classe de nota (0–11), preferindo bemol quando pedido. */
  function nomeDaClasse(pc, usarBemol) {
    pc = ((pc % 12) + 12) % 12;
    return (usarBemol && BEMOL[pc]) ? BEMOL[pc] : NOMES[pc];
  }

  function classeDe(midi, ignorarOitava) {
    return ignorarOitava === false ? midi : ((midi % 12) + 12) % 12;
  }

  /**
   * Maior subsequência comum entre duas listas, devolvendo os PARES casados
   * (índice no esperado, índice no ouvido). É o que permite dizer "faltou a
   * terceira nota" em vez de só dar uma porcentagem.
   */
  function casar(a, b) {
    var n = a.length, m = b.length;
    if (!n || !m) return [];
    // tabela (n+1) x (m+1)
    var tab = new Array(n + 1);
    for (var i = 0; i <= n; i++) {
      tab[i] = new Array(m + 1);
      for (var j = 0; j <= m; j++) tab[i][j] = 0;
    }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        tab[i][j] = a[i] === b[j] ? tab[i + 1][j + 1] + 1
          : Math.max(tab[i + 1][j], tab[i][j + 1]);
      }
    }
    var pares = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { pares.push([i, j]); i++; j++; }
      else if (tab[i + 1][j] >= tab[i][j + 1]) i++;
      else j++;
    }
    return pares;
  }

  /**
   * Agrupa índices seguidos ("3, 4, 5") para a mensagem não virar uma lista
   * interminável: o aluno quer saber ONDE escorregou, não o número de cada
   * nota perdida.
   */
  function trechos(indices) {
    var out = [], atual = null;
    indices.slice().sort(function (x, y) { return x - y; }).forEach(function (i) {
      if (atual && i === atual.fim + 1) { atual.fim = i; return; }
      atual = { ini: i, fim: i };
      out.push(atual);
    });
    return out;
  }

  /**
   * @param esperado  array de MIDI (as notas do exercício, na ordem)
   * @param ouvido    array de MIDI (o que o microfone ouviu, na ordem)
   * @param opts      { oitava: true } para exigir a oitava certa
   *                  { bemol: true } para escrever os nomes com bemol
   * @returns {
   *   nota,        // 0..1 — quanto do exercício apareceu, na ordem certa
   *   limpeza,     // 0..1 — quanto do que foi tocado pertencia ao exercício
   *   acertos, total, ouvidas,
   *   faltaram,    // [{ posicao, nome }] as notas do exercício que não apareceram
   *   trechosFaltando, // [{ ini, fim, nomes }] os mesmos, agrupados
   *   resumo       // frase pronta, em português, para mostrar na tela
   * }
   */
  function avaliar(esperado, ouvido, opts) {
    opts = opts || {};
    var ignorarOitava = opts.oitava !== true;
    esperado = (esperado || []).filter(function (m) { return typeof m === 'number' && isFinite(m); });
    ouvido = (ouvido || []).filter(function (m) { return typeof m === 'number' && isFinite(m); });

    var a = esperado.map(function (m) { return classeDe(m, ignorarOitava); });
    var b = ouvido.map(function (m) { return classeDe(m, ignorarOitava); });
    var pares = casar(a, b);

    var casados = {};
    pares.forEach(function (p) { casados[p[0]] = true; });
    var faltaram = [];
    esperado.forEach(function (midi, i) {
      if (!casados[i]) faltaram.push({ posicao: i, nome: nomeDaClasse(midi, opts.bemol) });
    });

    var total = esperado.length;
    var nota = total ? pares.length / total : 0;
    var limpeza = ouvido.length ? pares.length / ouvido.length : 0;

    var grupos = trechos(faltaram.map(function (f) { return f.posicao; })).map(function (g) {
      var nomes = [];
      for (var i = g.ini; i <= g.fim; i++) nomes.push(nomeDaClasse(esperado[i], opts.bemol));
      return { ini: g.ini, fim: g.fim, nomes: nomes };
    });

    return {
      nota: nota, limpeza: limpeza,
      acertos: pares.length, total: total, ouvidas: ouvido.length,
      faltaram: faltaram, trechosFaltando: grupos,
      resumo: resumoDe(nota, limpeza, pares.length, total, ouvido.length, grupos)
    };
  }

  /** A frase que o aluno lê. Direta, sem floreio, dizendo onde escorregou. */
  function resumoDe(nota, limpeza, acertos, total, ouvidas, grupos) {
    if (!total) return 'Não havia nada para comparar.';
    if (!ouvidas) {
      return 'Não ouvi nenhuma nota. Confira se o microfone está liberado e se o ' +
        'instrumento está perto o bastante — e tente de novo.';
    }
    var pct = Math.round(nota * 100);
    var frase = 'Acertei ' + acertos + ' das ' + total + ' notas (' + pct + '%).';

    if (grupos.length) {
      var ditos = grupos.slice(0, 3).map(function (g) {
        var onde = g.ini === g.fim ? 'a ' + (g.ini + 1) + 'ª nota' : 'da ' + (g.ini + 1) + 'ª à ' + (g.fim + 1) + 'ª';
        return onde + ' (' + g.nomes.slice(0, 4).join(' ') + (g.nomes.length > 4 ? '…' : '') + ')';
      });
      frase += ' Faltou ' + ditos.join('; ') +
        (grupos.length > 3 ? ', e mais ' + (grupos.length - 3) + ' trecho(s)' : '') + '.';
    }
    // Muita nota fora do exercício: ou tocou coisa a mais, ou o microfone
    // pegou barulho. Dizer isso evita que a pessoa ache que o sistema é burro.
    if (limpeza < 0.5 && ouvidas > total * 1.5) {
      frase += ' Ouvi bastante coisa que não é do exercício — pode ser ruído na sala, ' +
        'o acompanhamento entrando pelo microfone (use fone de ouvido) ou notas a mais.';
    }
    // POUCAS notas, e as que vieram estavam certas. Essa combinação tem uma
    // causa típica e mensurável: o acompanhamento saindo pela caixa cobre o
    // instrumento, e o detector perde notas do aluno. Medido em teste: um
    // exercício tocado certo cai de 100% para 52% quando o acorde entra junto
    // e alto pelo microfone. Quem lê isto precisa saber o que fazer, senão
    // conclui que tocou errado — e não tocou.
    if (ouvidas && ouvidas < total * 0.7 && limpeza > 0.8) {
      frase += ' Ouvi poucas notas, e as que ouvi estavam certas. Isso costuma ser o ' +
        'microfone perdendo o instrumento: use fone de ouvido, chegue mais perto do ' +
        'microfone, ou desmarque o acompanhamento ali em cima e grave só com a contagem.';
    }
    return frase;
  }

  /**
   * As notas que o exercício espera, em MIDI, já na oitava em que o site as
   * toca. Recebe os eventos do exercício (os mesmos do áudio e da partitura).
   */
  function midisEsperados(eventos) {
    return (eventos || [])
      .filter(function (e) { return !e.rest && typeof e.midi === 'number'; })
      .map(function (e) { return e.midi; });
  }

  /** As notas ouvidas, em MIDI, a partir do que js/transcribe.js devolveu. */
  function midisOuvidos(melodia) {
    return (melodia || [])
      .slice()
      .sort(function (x, y) { return (x.startTimeSeconds || 0) - (y.startTimeSeconds || 0); })
      .map(function (n) { return n.pitchMidi; })
      .filter(function (m) { return typeof m === 'number' && isFinite(m); });
  }

  return {
    PASSA: 0.8,                 // 80% — o piso combinado com o dono do projeto
    avaliar: avaliar,
    midisEsperados: midisEsperados,
    midisOuvidos: midisOuvidos,
    nomeDaClasse: nomeDaClasse
  };
}));
