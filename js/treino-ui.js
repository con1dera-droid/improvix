/**
 * IMPROVIX — tela de Início: "treinar escalas"
 *
 * A primeira coisa que se vê ao abrir o site: escolhe o tom, a escala e o
 * instrumento, e saem na hora os 21 exercícios do método (os mesmos da
 * Biblioteca de Escalas), subindo e descendo duas oitavas, com partitura ou
 * tablatura, as notas escritas e áudio para tocar junto.
 *
 * São cinco escalas de propósito — as que se usa 90% do tempo na prática
 * diária. O catálogo inteiro (46 escalas, com a ficha de cada uma) continua
 * na Biblioteca de Escalas, a um clique daqui.
 */
(function () {
  'use strict';

  var SC = window.IL.scales;
  var notation = window.IL.notation;
  var audio = window.IL.audio;

  // Rótulos próprios: aqui a pessoa pensa "maior/menor", não "jônio/eólio".
  var ESCALAS = [
    { key: 'jonio', label: 'Maior' },
    { key: 'eolio', label: 'Menor (natural)' },
    { key: 'pentatonica_maior', label: 'Pentatônica maior' },
    { key: 'blues_maior', label: 'Pentatônica maior + b3 (blues maior)' },
    { key: 'blues_menor', label: 'Pentablues (pentatônica menor + b5)' }
  ];

  var state = {
    built: false, key: 'jonio', tonic: 'C', playing: null, exercises: [], digitacao: {},
    // progresso: { 'treino:jonio:3': { voltas, feito } } — o que esta pessoa já
    // executou inteiro. Carregado uma vez por visita; atualizado na hora.
    progresso: {}, progressoLido: false, tocandoDesde: 0, cicloSeg: 0, tocandoIdx: -1
  };

  var META_VOLTAS = 2;      // o mesmo número está em registrar_voltas(), no schema

  function chaveDe(i) { return 'treino:' + state.key + ':' + i; }

  /**
   * Quantos segundos dura UMA execução inteira do exercício, no andamento da
   * barra. O áculo é o mesmo do motor de áudio: o ciclo fecha no compasso, e
   * não na última nota — senão a conta erraria por uma fração de compasso e a
   * volta inteira não seria contada.
   */
  function duracaoDaVolta(eventos, bpm) {
    var fim = 0;
    eventos.forEach(function (e) { fim = Math.max(fim, e.onset + e.dur); });
    var beats = Math.max(4, Math.ceil((fim - 1e-6) / 4) * 4);
    return beats * 60 / (bpm || 80);
  }

  /** Lê o progresso desta pessoa (uma vez por visita). */
  function carregarProgresso(aoTerminar) {
    var db = window.IL.db;
    if (state.progressoLido || !db || !db.listProgresso ||
        !window.IL.account || !window.IL.account.canUse()) {
      if (aoTerminar) aoTerminar();
      return;
    }
    state.progressoLido = true;
    Promise.resolve(db.listProgresso()).then(function (res) {
      (res && res.data ? res.data : []).forEach(function (p) {
        state.progresso[p.chave] = {
          voltas: p.voltas, feito: !!p.feito_em,
          gravado: !!p.gravado_em, acerto: p.acerto || 0
        };
      });
      if (aoTerminar) aoTerminar();
    }).catch(function () { if (aoTerminar) aoTerminar(); });
  }

  /**
   * Fecha a conta de uma execução: quantas voltas INTEIRAS couberam no tempo
   * que ficou tocando. Quem para na metade não leva volta nenhuma — é isso que
   * separa "acompanhou o exercício" de "deu play e foi embora".
   */
  function fecharVoltas() {
    if (!state.tocandoDesde || !state.cicloSeg) return;
    var decorrido = (Date.now() - state.tocandoDesde) / 1000;
    var idx = state.tocandoIdx;
    state.tocandoDesde = 0;
    state.tocandoIdx = -1;
    var voltas = Math.floor(decorrido / state.cicloSeg + 0.05);
    if (voltas < 1 || idx < 0) return;

    var chave = chaveDe(idx);
    var bpm = andamentoAtual();
    var atual = state.progresso[chave] || { voltas: 0, feito: false };
    // A tela responde na hora; o banco confirma depois. Se a gravação falhar
    // (sem conta, sem internet), o número da tela continua valendo para esta
    // visita — e some ao recarregar, que é o honesto: o que não foi gravado
    // não aconteceu.
    state.progresso[chave] = {
      voltas: atual.voltas + voltas,
      feito: atual.feito || (atual.voltas + voltas) >= META_VOLTAS
    };
    var db = window.IL.db;
    if (db && db.registrarVoltas) {
      Promise.resolve(db.registrarVoltas(chave, voltas, bpm)).then(function (res) {
        var linha = res && res.data;
        if (linha && typeof linha.voltas === 'number') {
          state.progresso[chave] = { voltas: linha.voltas, feito: !!linha.feito_em };
          atualizarMarcas();
        }
      });
    }
    atualizarMarcas();
  }

  function andamentoAtual() {
    var t = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('treino') : null;
    return (t && t.bpm) || 80;
  }

  /**
   * Até onde a pessoa chegou. A regra, pedida pelo dono em 24/10/2026: o
   * exercício 1 nasce aberto; cada um dos seguintes só abre quando o anterior
   * for GRAVADO (o aluno tocou e o sistema reconheceu 80% das notas).
   *
   * Tocar junto — contar voltas — continua valendo e aparece no cartão, mas
   * não abre porta nenhuma: ouvir não é tocar.
   */
  function gravado(i) {
    var p = state.progresso[chaveDe(i)];
    return !!(p && p.gravado);
  }

  /** O primeiro exercício ainda não gravado: é onde a pessoa está. */
  function indiceDoProximo() {
    for (var i = 0; i < state.exercises.length; i++) {
      if (!gravado(i)) return i;
    }
    return -1;
  }

  function marcaDe(i) {
    var p = state.progresso[chaveDe(i)] || { voltas: 0, feito: false, gravado: false, acerto: 0 };
    var aberto = i === 0 || gravado(i - 1);
    return {
      voltas: p.voltas, feito: p.feito, gravado: p.gravado, acerto: p.acerto,
      proximo: i === indiceDoProximo(),
      podeGravar: aberto && !!(window.IL.account && window.IL.account.canUse()),
      trancado: aberto ? 0 : i                 // o número do exercício que falta gravar
    };
  }

  /** Redesenha só os selos e o resumo, sem remontar partituras e tablaturas. */
  function atualizarMarcas() {
    var caixa = $('tre-conteudo');
    if (!caixa) return;
    var feitos = 0;
    state.exercises.forEach(function (ex, i) { if ((state.progresso[chaveDe(i)] || {}).feito) feitos++; });
    var resumo = $('tre-progresso');
    if (resumo) resumo.innerHTML = resumoHTML(feitos);
    var prox = indiceDoProximo();
    // Os cartões trancados não têm título com selo para atualizar; e a trava em
    // si só muda quando uma gravação passa, e aí a lista inteira é redesenhada.
    caixa.querySelectorAll('.esc-ex').forEach(function (card, i) {
      if (card.classList.contains('esc-ex-trancado')) return;
      var m = marcaDe(i);
      card.classList.toggle('esc-ex-feito', !!m.gravado);
      card.classList.toggle('esc-ex-proximo', i === prox);
      var titulo = card.querySelector('.lib-card-title');
      if (!titulo) return;
      var velho = titulo.querySelector('.esc-feito, .esc-andando');
      if (velho) velho.parentNode.removeChild(velho);
      var seloProx = titulo.querySelector('.esc-proximo-selo');
      if (seloProx) seloProx.parentNode.removeChild(seloProx);
      if (m.gravado) {
        titulo.insertAdjacentHTML('beforeend',
          '<span class="esc-feito" title="Você gravou este exercício e acertou ' + (m.acerto || 0) +
          '%">✓ gravado' + (m.acerto ? ' · ' + m.acerto + '%' : '') + '</span>');
      } else if (m.feito) {
        titulo.insertAdjacentHTML('beforeend',
          '<span class="esc-andando" title="Você já tocou junto o exercício inteiro duas vezes">♪ tocado junto</span>');
      } else if (m.voltas) {
        titulo.insertAdjacentHTML('beforeend',
          '<span class="esc-andando" title="Execuções inteiras até agora">' + m.voltas + ' de ' + META_VOLTAS + ' voltas</span>');
      }
      if (i === prox) {
        titulo.insertAdjacentHTML('beforeend', '<span class="esc-proximo-selo">continue daqui</span>');
      }
    });
  }

  function resumoHTML(feitos) {
    var total = state.exercises.length;
    var REGRA = '<span class="tre-prog-regra">Como funciona: o exercício 1 está aberto. ' +
      'Clique em <strong>🎙 Gravar e liberar</strong>, toque junto com o acompanhamento, e o IMPROVIX ' +
      'ouve pelo microfone e compara com as notas. Acertando <strong>80%</strong>, ele libera o próximo — ' +
      'e assim, um a um. <strong>Ouvir o exercício</strong> não libera nada: ouvir não é tocar.</span>';
    if (!window.IL.account || !window.IL.account.canUse()) {
      return '<span class="tre-prog-aviso">Entre na sua conta para o IMPROVIX guardar o que você já treinou ' +
        'e liberar os exercícios conforme você grava.</span>' + REGRA;
    }
    var gravados = 0;
    state.exercises.forEach(function (ex, i) { if (gravado(i)) gravados++; });
    var pct = total ? Math.round(gravados * 100 / total) : 0;
    return '<div class="tre-prog-barra"><i style="width:' + pct + '%"></i></div>' +
      '<span class="tre-prog-texto"><strong>' + gravados + ' de ' + total + '</strong> exercícios gravados nesta escala' +
      (gravados >= total ? ' — escala fechada. Troque o tom ou a escala lá em cima.' : '') +
      (feitos ? ' · ' + feitos + ' tocado(s) junto do começo ao fim' : '') +
      '</span>' + (gravados >= total ? '' : REGRA);
  }

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build() {
    if (state.built) return;
    state.built = true;
    $('tre-tom').innerHTML = SC.KEYS.map(function (k) {
      return '<option value="' + k + '">' + k + '</option>';
    }).join('');
    $('tre-tom').value = state.tonic;
    $('tre-escala').innerHTML = ESCALAS.map(function (e) {
      return '<option value="' + e.key + '">' + esc(e.label) + '</option>';
    }).join('');
    $('tre-escala').value = state.key;
    var principal = $('input-instrumento');
    if (principal) $('tre-instrumento').value = principal.value;

    $('tre-tom').addEventListener('change', function () { state.tonic = $('tre-tom').value; parar(); render(); });
    $('tre-escala').addEventListener('change', function () { state.key = $('tre-escala').value; parar(); render(); });
    $('tre-instrumento').addEventListener('change', function () {
      // o instrumento é o mesmo em todo o site: muda aqui, muda em todas as telas
      if (principal) { principal.value = $('tre-instrumento').value; principal.dispatchEvent(new Event('change')); }
      parar(); render();
    });
    $('tre-conteudo').addEventListener('click', onClick);
  }

  function onClick(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'ouvir-ex') { tocar(b, 'ex' + b.getAttribute('data-i'), state.exercises[Number(b.getAttribute('data-i'))]); return; }
    if (act === 'gravar-ex') { gravarExercicio(b, Number(b.getAttribute('data-i'))); return; }
    if (act === 'fechar-gravacao') {
      var cx = b.closest('.esc-gravacao');
      if (cx) { cx.hidden = true; cx.innerHTML = ''; }
      return;
    }
    // trocar a região do braço (as digitações vêm do cartão compartilhado)
    if (act === 'digitacao') {
      state.digitacao[b.getAttribute('data-i')] = Number(b.getAttribute('data-d'));
      render();
      return;
    }
    if (act === 'ir-escalas') {
      var nav = document.querySelector('.nav-item[data-nav="biblioteca-escalas"]');
      if (nav) { nav.click(); window.IL.ui.renderEscalasView({ scaleKey: state.key, tonic: state.tonic }); }
      return;
    }
    if (act === 'ir-harmonia') {
      var nav2 = document.querySelector('.nav-item[data-nav="harmonia"]');
      if (nav2) nav2.click();
    }
  }

  function parar() {
    if (audio) audio.stopAll();
    fecharVoltas();                       // conta o que foi tocado inteiro até aqui
    state.playing = null;
    document.querySelectorAll('#tre-conteudo .playing').forEach(function (b) {
      b.classList.remove('playing');
      b.textContent = b.getAttribute('data-label') || '🔊 Ouvir';
    });
  }

  function tocar(btn, tag, ex) {
    if (!ex || !audio) return;
    if (state.playing === tag) { parar(); return; }
    parar();
    var instrumento = $('tre-instrumento').value;
    var prep = notation.prepareForInstrument(ex.events, instrumento);
    state.playing = tag;
    btn.classList.add('playing');
    btn.textContent = '⏸ Parar';
    var t = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('treino') : { bpm: 80 };
    // Marca o relógio: é por ele que se sabe, na hora de parar, quantas
    // execuções INTEIRAS couberam. Com o 🔁 ligado o motor de áudio nunca
    // avisa o fim (ele emenda as voltas), então contar pelo tempo é o único
    // jeito de medir as duas coisas com a mesma régua.
    state.cicloSeg = duracaoDaVolta(prep.events, t.bpm);
    state.tocandoDesde = Date.now();
    state.tocandoIdx = state.exercises.indexOf(ex);
    audio.playEvents(prep.events, instrumento, {
      bpm: t.bpm, metronome: t.metronome, loop: t.loop, humanize: true, chords: ex.chords || []
    }, function () {
      if (state.playing === tag) parar();
    });
  }

  // ---------------- gravar o exercício ----------------
  // O aluno toca, o site ouve pelo microfone e compara. Acertando o piso, o
  // exercício fica gravado e o seguinte abre. Ver js/gravacao.js (o caminho do
  // áudio) e js/avaliar.js (a conta).

  var gravandoAgora = false;

  function caixaDaGravacao(i) {
    return $('tre-conteudo').querySelector('[data-gravacao="' + i + '"]');
  }

  function mostrarNaCaixa(i, html, classe) {
    var cx = caixaDaGravacao(i);
    if (!cx) return;
    cx.hidden = false;
    cx.className = 'esc-gravacao' + (classe ? ' ' + classe : '');
    cx.innerHTML = html;
  }

  function gravarExercicio(botao, i) {
    if (gravandoAgora) return;
    var ex = state.exercises[i];
    if (!ex || !window.IL.gravacao || !window.IL.avaliar) return;
    parar();                                   // nada tocando por cima da gravação
    // O clique pode ter vindo do "tentar de novo", que está DENTRO da caixa de
    // resultado — e essa caixa é repintada no instante seguinte, levando o
    // botão junto. Quem guarda o estado visual é sempre o botão do cartão.
    var cartao = $('tre-conteudo').querySelectorAll('.esc-ex')[i];
    var alvo = $('tre-conteudo').querySelector('.btn-gravar[data-i="' + i + '"]') || botao;
    gravandoAgora = true;
    if (cartao) cartao.classList.add('esc-ex-gravando');
    alvo.classList.add('gravando');
    alvo.textContent = '● gravando…';
    botao = alvo;

    var t = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('treino') : { bpm: 80 };
    var comAcomp = !$('tre-sem-acompanhamento') || !$('tre-sem-acompanhamento').checked;
    var prep = notation.prepareForInstrument(ex.events, $('tre-instrumento').value);

    mostrarNaCaixa(i, '<div class="grv-estado"><span class="grv-barra"><i style="width:4%"></i></span>' +
      '<span class="grv-txt">preparando…</span></div>' +
      '<p class="grv-dica">Toque o exercício inteiro junto com o acompanhamento. ' +
      (comAcomp ? 'Se puder, use fone de ouvido: assim o microfone ouve só você.' :
        'O acompanhamento está desligado — vai só a contagem do metrônomo.') + '</p>');

    function estado(txt, pct) {
      var cx = caixaDaGravacao(i);
      if (!cx) return;
      var barra = cx.querySelector('.grv-barra i');
      var texto = cx.querySelector('.grv-txt');
      if (barra) barra.style.width = Math.round(Math.max(0.04, pct || 0) * 100) + '%';
      if (texto) texto.textContent = txt;
    }

    window.IL.gravacao.rodar({
      eventos: prep.events, chords: ex.chords || [], instrumento: $('tre-instrumento').value,
      bpm: t.bpm, comAcompanhamento: comAcomp, onEstado: estado
    }).then(function (r) {
      var acerto = Math.round(r.nota * 100);
      var passou = r.nota >= window.IL.avaliar.PASSA;
      terminarGravacao(botao);
      mostrarNaCaixa(i, resultadoHTML(i, acerto, passou, r), passou ? 'grv-ok' : 'grv-quase');
      registrarGravacao(i, acerto, passou);
    }).catch(function (e) {
      terminarGravacao(botao);
      var msg = (e && e.message) || 'não deu certo';
      mostrarNaCaixa(i,
        '<p class="grv-erro">Não consegui gravar: ' + esc(msg) + '</p>' +
        '<p class="grv-dica">Se o navegador pediu permissão do microfone, é preciso aceitar. ' +
        'No celular, o site precisa estar em https (o endereço do IMPROVIX já está).</p>' +
        '<button class="view-btn" data-act="fechar-gravacao">Fechar</button>', 'grv-falha');
    });
  }

  function terminarGravacao(botao) {
    gravandoAgora = false;
    $('tre-conteudo').querySelectorAll('.esc-ex-gravando').forEach(function (c) {
      c.classList.remove('esc-ex-gravando');
    });
    if (botao && botao.isConnected) {
      botao.classList.remove('gravando');
      botao.textContent = botao.getAttribute('data-label') || '🎙 Gravar e liberar';
    }
  }

  function resultadoHTML(i, acerto, passou, r) {
    var cabeca = passou
      ? '<p class="grv-nota grv-nota-ok">✓ ' + acerto + '% — exercício gravado' +
        (i + 1 < state.exercises.length ? '. O exercício ' + (i + 2) + ' está liberado.' : '. Escala fechada!') + '</p>'
      : '<p class="grv-nota grv-nota-quase">' + acerto + '% — faltou um pouco (o piso é 80%).</p>';
    return cabeca +
      '<p class="grv-resumo">' + esc(r.resumo) + '</p>' +
      '<button class="view-btn" data-act="gravar-ex" data-i="' + i + '" data-label="🎙 Gravar e liberar">' +
      (passou ? '🎙 Gravar de novo' : '🎙 Tentar de novo') + '</button>' +
      '<button class="view-btn" data-act="fechar-gravacao">Fechar</button>';
  }

  function registrarGravacao(i, acerto, passou) {
    var chave = chaveDe(i);
    var atual = state.progresso[chave] || { voltas: 0, feito: false };
    atual.acerto = Math.max(atual.acerto || 0, acerto);
    atual.gravado = atual.gravado || passou;
    state.progresso[chave] = atual;
    var db = window.IL.db;
    var guardar = (db && db.registrarGravacao)
      ? Promise.resolve(db.registrarGravacao(chave, acerto))
      : Promise.resolve({ data: null });
    guardar.then(function (res) {
      var linha = res && res.data;
      if (linha) {
        state.progresso[chave] = {
          voltas: linha.voltas || atual.voltas, feito: !!linha.feito_em,
          gravado: !!linha.gravado_em, acerto: linha.acerto || acerto
        };
      }
      // Passou: a trava do seguinte caiu, então a lista inteira é redesenhada.
      if (passou) { var caixa = $('tre-conteudo'); if (caixa) render(); }
      else atualizarMarcas();
    });
  }

  function render() {
    var instrumento = $('tre-instrumento').value;
    var nf = SC.notesFor(state.tonic, state.key);
    var acorde = SC.chordOf(state.tonic, state.key);
    state.exercises = SC.exercisesFor(state.tonic, state.key);
    var rotulo = (ESCALAS.filter(function (e) { return e.key === state.key; })[0] || {}).label || '';

    var html =
      '<div class="esc-head">' +
      '<div><div class="esc-title">' + esc(rotulo) + ' <span class="esc-tonic">em ' + esc(nf.tonic) + '</span></div>' +
      '<div class="lib-badges">' +
      '<span class="lib-badge">' + nf.notes.length + ' notas</span>' +
      '<span class="lib-badge">' + esc(nf.notes.map(function (n) { return n.name; }).join(' ')) + '</span>' +
      '<span class="lib-badge lib-badge-chord"><strong>' + esc(acorde.symbol) + '</strong> ' + esc(acorde.tones.join(' – ')) + '</span>' +
      '</div></div>' +
      '<div class="esc-head-actions">' +
      '<button class="view-btn" data-act="ir-escalas">📚 Ficha completa desta escala</button>' +
      '<button class="view-btn" data-act="ir-harmonia">🎹 Analisar uma progressão</button>' +
      '</div></div>' +

      '<div class="transport" data-transport="treino">' +
      '<button type="button" class="tr-btn tr-metro" data-act="metro" title="Metrônomo (liga/desliga)" aria-pressed="false">⏱</button>' +
      '<button type="button" class="tr-btn" data-act="menos" title="Mais devagar (−5 bpm)">−</button>' +
      '<span class="tr-bpm" title="Andamento"><input type="number" class="tr-bpm-input" min="40" max="240" step="1" value="80" aria-label="Andamento em bpm"/><small>bpm</small></span>' +
      '<button type="button" class="tr-btn" data-act="mais" title="Mais rápido (+5 bpm)">+</button>' +
      '<button type="button" class="tr-btn tr-loop" data-act="loop" title="Repetir (toca em loop até você parar)" aria-pressed="false">🔁</button>' +
      '</div>' +

      '<h3 class="esc-sub">Exercícios para treinar</h3>' +
      '<div class="tre-prog" id="tre-progresso"></div>' +
      '<label class="tre-opcao"><input type="checkbox" id="tre-sem-acompanhamento"/> ' +
      'Gravar sem o acompanhamento (só a contagem do metrônomo) — marque se estiver sem fone de ouvido ' +
      'e o microfone estiver pegando o som da caixa.</label>' +
      '<p class="si-legend">' + state.exercises.length + ' exercícios, todos subindo e descendo duas oitavas. ' +
      'Ponha o metrônomo devagar e só acelere quando sair limpo.</p>' +
      '<p class="dica-rolar">↔ no celular, deslize a partitura/tablatura para o lado</p>' +
      exerciciosHTML(instrumento);

    $('tre-conteudo').innerHTML = html;
    if (window.IL.ui.setupTransportBars) window.IL.ui.setupTransportBars();
    atualizarMarcas();
    // O progresso vem do banco; enquanto não chega, a tela já está inteira e
    // apenas sem os selos. Quando chegar, só os selos são redesenhados.
    carregarProgresso(atualizarMarcas);
  }

  /** Os exercícios, separados pelos mesmos grupos da Biblioteca de Escalas. */
  function exerciciosHTML(instrumento) {
    var card = window.IL.ui.exercicioCardHTML;
    var html = '';
    var grupo = null;
    state.exercises.forEach(function (ex, i) {
      if (ex.grupo && ex.grupo !== grupo) {
        if (grupo !== null) html += '</div>';
        html += '<h4 class="esc-grupo">' + esc(ex.grupo) + '</h4><div class="lib-lista">';
        grupo = ex.grupo;
      } else if (grupo === null) {
        html += '<div class="lib-lista">';
        grupo = '';
      }
      html += card(ex, i, instrumento, state.digitacao, marcaDe(i));
    });
    return html + (grupo === null ? '' : '</div>');
  }

  function renderTreinoView(preset) {
    build();
    if (preset) {
      if (preset.scaleKey && ESCALAS.some(function (e) { return e.key === preset.scaleKey; })) {
        state.key = preset.scaleKey; $('tre-escala').value = preset.scaleKey;
      }
      if (preset.tonic) { state.tonic = preset.tonic; $('tre-tom').value = preset.tonic; }
    }
    render();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderTreinoView = renderTreinoView;
  // Trocou de conta: o progresso da pessoa anterior não pode ficar na tela.
  window.IL.ui.resetTreinoProgresso = function () {
    state.progresso = {};
    state.progressoLido = false;
    if ($('tre-progresso')) { atualizarMarcas(); carregarProgresso(atualizarMarcas); }
  };
  window.IL.ui.TREINO_ESCALAS = ESCALAS;
})();
