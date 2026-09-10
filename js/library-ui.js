/**
 * ImprovisaLab — tela da Biblioteca de Fraseados
 *
 * Liga os filtros (estilo, escala, tom, nível, tamanho, instrumento) ao
 * motor js/library.js e mostra cada frase com partitura rítmica, tablatura,
 * notas, áudio (com acompanhamento) e explicação. Módulo livre, inclusive o
 * nível Avançado (ver ADVANCED_FREE).
 */
(function () {
  'use strict';

  var lib = window.IL.library;
  var notation = window.IL.notation;
  var audio = window.IL.audio;

  var PER_PAGE = 12;

  // Enquanto não há cobrança configurada, o nível Avançado da Biblioteca fica
  // liberado para todos (decisão do dono do projeto em 10/09/2026). Para
  // voltar a exigir o plano Pro, basta mudar para false.
  var ADVANCED_FREE = true;
  var state = { list: [], built: false, playingId: null, userPickedScale: false };

  // Escalas que mais combinam com cada estilo (aparecem primeiro no seletor).
  var RECOMMENDED = {
    bebop: ['bebop_dominante', 'mixolidio', 'dorico', 'jonio', 'bebop_maior', 'bebop_dorico', 'dom_dim', 'alterada'],
    jazz: ['dorico', 'lidio', 'mixolidio', 'alterada', 'lidio_b7', 'menor_melodica', 'locrio_9', 'dom_dim'],
    blues: ['blues_menor', 'blues_maior', 'mixolidio', 'dorico', 'pentatonica_menor'],
    modal: ['dorico', 'frigio', 'lidio', 'mixolidio', 'eolio', 'lidio_b7'],
    rock: ['pentatonica_menor', 'blues_menor', 'eolio', 'dorico', 'mixolidio'],
    baiao: ['mixolidio', 'lidio_b7', 'dorico', 'jonio']
  };

  function $(id) { return document.getElementById(id); }
  function scaleLabel(k) { return window.IL.data.SCALES[k].label; }
  function isPro() { var a = window.IL.account; return !!(a && typeof a.isPro === 'function' && a.isPro()); }

  function fillScaleSelect() {
    var style = $('lib-estilo').value;
    var sel = $('lib-escala');
    var current = sel.value;
    var rec = RECOMMENDED[style] || [];
    var html = '<optgroup label="Recomendadas para este estilo">' +
      rec.map(function (k) { return '<option value="' + k + '">' + scaleLabel(k) + '</option>'; }).join('') + '</optgroup>';
    lib.SCALE_GROUPS.forEach(function (g) {
      html += '<optgroup label="' + g.label + '">' +
        g.keys.map(function (k) { return '<option value="' + k + '">' + scaleLabel(k) + '</option>'; }).join('') + '</optgroup>';
    });
    sel.innerHTML = html;
    sel.value = state.userPickedScale && current ? current : (lib.STYLE_DEFAULT_SCALE[style] || rec[0]);
  }

  function syncGate() {
    var pro = ADVANCED_FREE || isPro();
    var opt = $('lib-opt-avancado');
    if (opt) opt.textContent = pro ? 'Avançado' : 'Avançado 🔒 (Pro)';
    var note = $('lib-gate-note');
    if (note) note.hidden = pro;
    var nivel = $('lib-nivel');
    if (nivel && nivel.value === 'avancado' && !pro) { nivel.value = 'intermediario'; return true; }
    return false;
  }

  function build() {
    if (state.built) return;
    state.built = true;
    $('lib-estilo').innerHTML = lib.styleList().map(function (s) { return '<option value="' + s.key + '">' + s.label + '</option>'; }).join('');
    $('lib-tom').innerHTML = '<option value="todos">Todos os tons (ciclo de 4ªs)</option>' +
      lib.KEYS.map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
    $('lib-tom').value = 'todos';
    fillScaleSelect();

    var mainInstr = $('input-instrumento');
    if (mainInstr) $('lib-instrumento').value = mainInstr.value;

    $('lib-estilo').addEventListener('change', function () { fillScaleSelect(); regenerate(); });
    $('lib-escala').addEventListener('change', function () { state.userPickedScale = true; regenerate(); });
    ['lib-tom', 'lib-tamanho'].forEach(function (id) { $(id).addEventListener('change', regenerate); });
    $('lib-nivel').addEventListener('change', function () { syncGate(); regenerate(); });
    $('lib-instrumento').addEventListener('change', function () {
      if (mainInstr) { mainInstr.value = $('lib-instrumento').value; mainInstr.dispatchEvent(new Event('change')); }
      renderList();
    });
    $('btn-lib-gerar').addEventListener('click', regenerate);
    $('btn-lib-mais').addEventListener('click', morePhrases);
    var link = document.querySelector('#lib-gate-note a[data-nav="config"]');
    if (link) link.addEventListener('click', function (ev) {
      ev.preventDefault();
      var nav = document.querySelector('.nav-item[data-nav="config"]');
      if (nav) nav.click();
    });

    $('lib-lista').addEventListener('click', onListClick);

    // Revalida a trava do nível Avançado quando a conta/plano muda.
    var prev = window.IL.ui.onAccountChange;
    window.IL.ui.onAccountChange = function () {
      if (typeof prev === 'function') prev();
      if (syncGate() && state.list.length) regenerate();
    };
    syncGate();
  }

  function currentOpts(start) {
    return {
      scaleKey: $('lib-escala').value,
      tonic: $('lib-tom').value,
      style: $('lib-estilo').value,
      level: $('lib-nivel').value,
      bars: Number($('lib-tamanho').value),
      start: start,
      count: PER_PAGE
    };
  }

  function stopAudio() {
    if (audio) audio.stopAll();
    state.playingId = null;
    document.querySelectorAll('.lib-play.playing').forEach(function (b) { b.classList.remove('playing'); b.textContent = '🔊 Ouvir'; });
  }

  function regenerate() {
    stopAudio();
    syncGate();
    state.list = lib.generate(currentOpts(0));
    renderList();
  }

  function morePhrases() {
    var more = lib.generate(currentOpts(state.list.length));
    state.list = state.list.concat(more);
    renderList(true);
  }

  function tabHTML(p, instrument) {
    if (!window.IL.ui.isFrettedInstrument(instrument)) {
      return '<p class="muted-note">Tablatura só se aplica a instrumentos com traste (guitarra, violão, baixo).</p>';
    }
    var realized = notation.realizeForInstrument(p.notes, instrument, p.midi);
    var tab = notation.toTab(realized, instrument);
    return '<pre class="tab-block">' + window.IL.ui.buildTabText(tab, instrument) + '</pre>';
  }

  function cardHTML(p, idx) {
    var instrument = $('lib-instrumento').value;
    var view = p._view || 'partitura';
    var body;
    if (view === 'tab') body = tabHTML(p, instrument);
    else if (view === 'notas') body = '<div class="cifra-block">' + p.notes.join(' – ') + '</div>';
    else body = '<div class="staff-block lib-staff">' + notation.toRhythmStaffSVG(notation.centerForStaff(p.events), { chords: p.chords }) + '</div>';
    var badges = '<span class="lib-badge">' + p.styleLabel + '</span><span class="lib-badge">' + p.scaleLabel + '</span>' +
      '<span class="lib-badge">' + p.bpm + ' bpm' + (p.swing ? ' · swing' : '') + '</span>';
    return '<div class="lib-card" data-idx="' + idx + '">' +
      '<div class="lib-card-head"><div class="lib-card-title">' + p.title + '</div>' +
      '<div class="lib-card-actions">' +
      ['partitura', 'tab', 'notas'].map(function (v) {
        var lbl = v === 'partitura' ? 'Partitura' : (v === 'tab' ? 'Tab' : 'Notas');
        return '<button class="view-btn lib-view' + (v === view ? ' active' : '') + '" data-v="' + v + '">' + lbl + '</button>';
      }).join('') +
      '<button class="view-btn lib-play" data-play="1">🔊 Ouvir</button></div></div>' +
      '<div class="lib-badges">' + badges + '</div>' +
      '<div class="lib-card-body">' + body + '</div>' +
      '<p class="lib-explicacao">' + p.explanation + '</p>' +
      '</div>';
  }

  function renderList(keepScroll) {
    var wrap = $('lib-lista');
    wrap.innerHTML = state.list.map(cardHTML).join('');
    var o = currentOpts(0);
    var tomTxt = o.tonic === 'todos' ? 'nos 12 tons (ciclo de 4ªs)' : 'em ' + o.tonic;
    $('lib-resumo').textContent = state.list.length + ' frases · ' + scaleLabel(o.scaleKey) + ' ' + tomTxt + ' · ' +
      lib.STYLES[o.style].label + ' · nível ' + ({ iniciante: 'iniciante', intermediario: 'intermediário', avancado: 'avançado' })[o.level] +
      '. Cada frase é calculada na hora — peça mais quantas quiser.';
    $('btn-lib-mais').hidden = state.list.length === 0;
  }

  function onListClick(ev) {
    var card = ev.target.closest('.lib-card');
    if (!card) return;
    var p = state.list[Number(card.getAttribute('data-idx'))];
    var btn = ev.target.closest('button');
    if (!btn || !p) return;
    if (btn.getAttribute('data-v')) {
      p._view = btn.getAttribute('data-v');
      var tmp = document.createElement('div');
      tmp.innerHTML = cardHTML(p, Number(card.getAttribute('data-idx')));
      card.replaceWith(tmp.firstChild);
      return;
    }
    if (btn.getAttribute('data-play')) {
      if (btn.classList.contains('playing')) { stopAudio(); return; }
      stopAudio();
      btn.classList.add('playing');
      btn.textContent = '⏸ Parar';
      state.playingId = p.id;
      audio.playEvents(p.events, $('lib-instrumento').value, { bpm: p.bpm, swing: p.swing, chords: p.chords }, function () {
        if (state.playingId === p.id) stopAudio();
      });
    }
  }

  function renderBibliotecaView() {
    build();
    syncGate();
    if (!state.list.length) regenerate();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderBibliotecaView = renderBibliotecaView;
})();
