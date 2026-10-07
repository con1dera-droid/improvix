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

  var state = { built: false, key: 'jonio', tonic: 'C', playing: null, exercises: [] };

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
    audio.playEvents(prep.events, instrumento, {
      bpm: t.bpm, metronome: t.metronome, loop: t.loop, humanize: false, chords: ex.chords || []
    }, function () {
      if (state.playing === tag) parar();
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
      '<p class="si-legend">' + state.exercises.length + ' exercícios, todos subindo e descendo duas oitavas. ' +
      'Ponha o metrônomo devagar e só acelere quando sair limpo.</p>' +
      '<p class="dica-rolar">↔ no celular, deslize a partitura/tablatura para o lado</p>' +
      exerciciosHTML(instrumento);

    $('tre-conteudo').innerHTML = html;
    if (window.IL.ui.setupTransportBars) window.IL.ui.setupTransportBars();
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
      html += card(ex, i, instrumento);
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
  window.IL.ui.TREINO_ESCALAS = ESCALAS;
})();
