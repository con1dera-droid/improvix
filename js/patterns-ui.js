/**
 * ImprovisaLab — tela "Exercícios de Padrões"
 *
 * Escolhe categoria e padrão (js/patterns.js), mostra a fórmula em graus e
 * o padrão escrito nos 12 tons (uma linha por tom), com partitura,
 * tablatura ou notas, e toca um tom ou todos em sequência com acompanhamento.
 * Também gera "padrão próprio" a partir dos graus digitados.
 */
(function () {
  'use strict';

  var PAT = window.IL.patterns;
  var notation = window.IL.notation;
  var audio = window.IL.audio;

  var state = { built: false, pattern: null, lines: [], view: 'partitura', playing: null };
  var LEVEL_TXT = { 0: 'seu padrão', 1: 'preliminar', 2: 'intermediário', 3: 'avançado' };

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function fillPatternSelect(keepId) {
    var cat = $('pad-categoria').value;
    var list = PAT.byCategory(cat);
    $('pad-padrao').innerHTML = list.map(function (p) {
      return '<option value="' + p.id + '">Nº ' + PAT.numberOf(p.id) + ' — ' + esc(p.title) + '</option>';
    }).join('');
    if (keepId && PAT.get(keepId) && PAT.get(keepId).cat === cat) $('pad-padrao').value = keepId;
  }

  function fillKeySelect() {
    var p = state.pattern;
    var minor = p && ((p.formDef && p.formDef.cycle === 'minor') || (!p.formDef && PAT.FORMS[p.form].cycle === 'minor'));
    var keys = minor ? PAT.CYCLE_MINOR : PAT.CYCLE_MAJOR;
    var cur = $('pad-tom').value;
    $('pad-tom').innerHTML = '<option value="todos">12 tons (ciclo de 4ªs)</option>' +
      keys.map(function (k) { return '<option value="' + k + '">' + k + (minor ? ' menor' : '') + '</option>'; }).join('');
    $('pad-tom').value = keys.indexOf(cur) >= 0 ? cur : 'todos';
  }

  function build() {
    if (state.built) return;
    state.built = true;
    $('pad-categoria').innerHTML = PAT.GROUPS.map(function (g) {
      return '<optgroup label="' + g.label + '">' + PAT.CATEGORIES.filter(function (c) { return c.group === g.key; }).map(function (c) {
        return '<option value="' + c.key + '">' + c.label + ' (' + PAT.byCategory(c.key).length + ')</option>';
      }).join('') + '</optgroup>';
    }).join('');
    fillPatternSelect();
    var mainInstr = $('input-instrumento');
    if (mainInstr) $('pad-instrumento').value = mainInstr.value;
    state.view = window.IL.ui.isFrettedInstrument($('pad-instrumento').value) ? 'tab' : 'partitura';

    $('pad-categoria').addEventListener('change', function () { fillPatternSelect(); selectPattern($('pad-padrao').value); });
    $('pad-padrao').addEventListener('change', function () { selectPattern($('pad-padrao').value); });
    $('pad-tom').addEventListener('change', function () { renderLines(); });
    $('pad-instrumento').addEventListener('change', function () {
      if (mainInstr) { mainInstr.value = $('pad-instrumento').value; mainInstr.dispatchEvent(new Event('change')); }
      if (state.view === 'tab' && !window.IL.ui.isFrettedInstrument($('pad-instrumento').value)) state.view = 'partitura';
      renderLines();
    });
    ['pad-bpm', 'pad-swing'].forEach(function (id) { $(id).addEventListener('change', stopAudio); });
    $('btn-pad-ant').addEventListener('click', function () { step(-1); });
    $('btn-pad-prox').addEventListener('click', function () { step(1); });
    $('btn-pad-tocar').addEventListener('click', function () {
      if (state.playing === 'all') { stopAudio(); return; }
      playLines(state.lines.map(function (_, i) { return i; }), 'all');
    });
    document.querySelectorAll('.pad-view').forEach(function (b) {
      b.addEventListener('click', function () { state.view = b.getAttribute('data-v'); renderLines(); });
    });
    $('btn-pad-custom').addEventListener('click', makeCustom);
    $('pad-graus').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') makeCustom(); });
    $('pad-lista').addEventListener('click', onListClick);
    selectPattern($('pad-padrao').value);
  }

  function step(dir) {
    var all = PAT.PATTERNS;
    var cur = state.pattern && !state.pattern.custom ? PAT.numberOf(state.pattern.id) - 1 : -1;
    var next = all[(cur + dir + all.length) % all.length];
    $('pad-categoria').value = next.cat;
    fillPatternSelect(next.id);
    selectPattern(next.id);
  }

  function selectPattern(id) {
    var p = PAT.get(id);
    if (!p) return;
    stopAudio();
    state.pattern = p;
    $('pad-erro').hidden = true;
    fillKeySelect();
    renderInfo();
    renderLines();
  }

  function makeCustom() {
    var r = PAT.customPattern({ degrees: $('pad-graus').value, chord: $('pad-acorde').value, rhythm: $('pad-ritmo').value });
    if (r.error) { $('pad-erro').textContent = r.error; $('pad-erro').hidden = false; return; }
    $('pad-erro').hidden = true;
    stopAudio();
    state.pattern = r.pattern;
    fillKeySelect();
    renderInfo();
    renderLines();
    // mostra o resultado (a lista fica abaixo do formulário)
    var info = $('pad-info');
    if (info && info.scrollIntoView) info.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderInfo() {
    var p = state.pattern;
    var form = p.formDef || PAT.FORMS[p.form];
    var f = PAT.formula(p);
    var num = p.custom ? '' : 'Nº ' + PAT.numberOf(p.id) + ' — ';
    $('pad-info').innerHTML =
      '<div class="pad-info-title">' + num + esc(p.title) + '</div>' +
      '<div class="lib-badges"><span class="lib-badge">' + esc(form.label) + '</span>' +
      '<span class="lib-badge">' + (p.custom ? 'criado por você' : 'nível ' + LEVEL_TXT[p.level]) + '</span></div>' +
      '<p>' + esc(p.dica) + '</p>' +
      '<div class="pad-formula">' + f.map(function (x) {
        return '<span class="pad-f"><strong>' + esc(x.sym) + '</strong> <span class="chord-notes-inline">(' + esc(window.IL.theory.chordNotesText(x.sym)) + ')</span> <code>' + esc(x.degrees) + '</code></span>';
      }).join('<span class="pad-arrow">→</span>') + '</div>' +
      '<p class="si-legend">Fórmula em graus de cada acorde (escrita em Dó; nos outros tons os graus são os mesmos). "—" é pausa.</p>';
  }

  function prepared(line, instrument) {
    line._prep = line._prep || {};
    if (!line._prep[instrument]) {
      var evs = line.events;
      if (instrument === 'teclado') evs = evs.map(function (e) { var o = Object.assign({}, e); delete o.art; delete o.bendFrom; delete o.vibrato; return o; });
      line._prep[instrument] = notation.prepareForInstrument(evs, instrument);
    }
    return line._prep[instrument];
  }

  function lineHTML(line, idx) {
    var instrument = $('pad-instrumento').value;
    var body;
    var view = state.view;
    if (view === 'tab' && !window.IL.ui.isFrettedInstrument(instrument)) view = 'partitura';
    if (view === 'tab') {
      var pr = prepared(line, instrument);
      body = '<pre class="tab-block">' + notation.renderTabText(pr.events, pr.tab, instrument) + '</pre>' +
        (line.events.some(function (e) { return e.art || e.vibrato; }) ? '<p class="tab-legend">' + notation.TAB_LEGEND + '</p>' : '');
    } else if (view === 'notas') {
      var bars = [];
      line.chords.forEach(function (c) {
        var ns = line.events.filter(function (e) { return !e.rest && e.onset >= c.beat - 1e-6 && e.onset < c.beat + c.beats - 1e-6; });
        bars.push('<strong>' + esc(c.symbol) + '</strong> <span class="chord-notes-inline">(' + esc(window.IL.theory.chordNotesText(c.symbol)) + ')</span>: ' + ns.map(function (e) {
          return e.name + (e.art ? '<sup>' + e.art + '</sup>' : '') + (e.vibrato ? '~' : '');
        }).join(' – '));
      });
      body = '<div class="cifra-block">' + bars.join('<br/>') + '</div>';
    } else {
      body = '<div class="staff-block lib-staff">' + notation.toRhythmStaffSVG(notation.centerForStaff(line.events), { chords: line.chords }) + '</div>';
    }
    var playing = state.playing === idx;
    return '<div class="lib-card pad-line" data-idx="' + idx + '">' +
      '<div class="lib-card-head"><div class="lib-card-title">' + esc(line.key) + (isMinor() ? ' menor' : '') + ' — ' +
      line.chords.map(function (c) {
        return esc(c.symbol) + ' <span class="chord-notes-inline">(' + esc(window.IL.theory.chordNotesText(c.symbol)) + ')</span>';
      }).join(' · ') + '</div>' +
      '<div class="lib-card-actions"><button class="view-btn lib-play' + (playing ? ' playing' : '') + '" data-play="1">' +
      (playing ? '⏸ Parar' : '🔊 Ouvir') + '</button></div></div>' +
      '<div class="lib-card-body">' + body + '</div></div>';
  }

  function isMinor() {
    var p = state.pattern;
    return p && ((p.formDef && p.formDef.cycle === 'minor') || (!p.formDef && PAT.FORMS[p.form].cycle === 'minor'));
  }

  function renderLines() {
    if (!state.pattern) return;
    state.lines = PAT.realizeAll(state.pattern, $('pad-tom').value);
    document.querySelectorAll('.pad-view').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-v') === state.view);
      if (b.getAttribute('data-v') === 'tab') b.disabled = !window.IL.ui.isFrettedInstrument($('pad-instrumento').value);
    });
    $('pad-lista').innerHTML = state.lines.map(lineHTML).join('');
    $('btn-pad-tocar').textContent = state.lines.length > 1 ? '▶ Tocar todos os tons' : '▶ Tocar';
  }

  function stopAudio() {
    if (audio) audio.stopAll();
    state.playing = null;
    document.querySelectorAll('#pad-lista .lib-play.playing').forEach(function (b) { b.classList.remove('playing'); b.textContent = '🔊 Ouvir'; });
    document.querySelectorAll('#pad-lista .pad-line.is-playing').forEach(function (c) { c.classList.remove('is-playing'); });
    var bt = $('btn-pad-tocar');
    if (bt) { bt.classList.remove('playing'); bt.textContent = state.lines.length > 1 ? '▶ Tocar todos os tons' : '▶ Tocar'; }
  }

  function markLine(i) {
    document.querySelectorAll('#pad-lista .pad-line').forEach(function (c) {
      c.classList.toggle('is-playing', Number(c.getAttribute('data-idx')) === i);
    });
  }

  // Toca uma ou várias linhas em sequência, com um compasso de "respiro"
  // entre os tons quando se toca o ciclo inteiro.
  function playLines(idxs, tag) {
    stopAudio();
    var instrument = $('pad-instrumento').value;
    var events = [], chords = [], chordLine = [];
    var offset = 0;
    idxs.forEach(function (i) {
      var line = state.lines[i];
      var evs = prepared(line, instrument).events;
      evs.forEach(function (e) { events.push(Object.assign({}, e, { onset: e.onset + offset })); });
      line.chords.forEach(function (c) { chords.push(Object.assign({}, c, { beat: c.beat + offset })); chordLine.push(i); });
      offset += line.beats;
    });
    state.playing = tag;
    if (tag === 'all') { $('btn-pad-tocar').classList.add('playing'); $('btn-pad-tocar').textContent = '⏸ Parar'; }
    else {
      var btn = document.querySelector('#pad-lista .pad-line[data-idx="' + tag + '"] .lib-play');
      if (btn) { btn.classList.add('playing'); btn.textContent = '⏸ Parar'; }
    }
    markLine(idxs[0]);
    audio.playEvents(events, instrument, {
      bpm: Number($('pad-bpm').value), swing: $('pad-swing').value === '1', humanize: true, chords: chords,
      onChord: function (ci) {
        markLine(chordLine[ci]);
        if (tag === 'all') {
          var el = document.querySelector('#pad-lista .pad-line[data-idx="' + chordLine[ci] + '"]');
          if (el && el.scrollIntoView && ci > 0 && chordLine[ci] !== chordLine[ci - 1]) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
    }, function () { if (state.playing === tag) stopAudio(); });
  }

  function onListClick(ev) {
    var btn = ev.target.closest('button[data-play]');
    if (!btn) return;
    var card = btn.closest('.pad-line');
    var idx = Number(card.getAttribute('data-idx'));
    if (state.playing === idx) { stopAudio(); return; }
    playLines([idx], idx);
  }

  function renderPadroesView() {
    build();
    if (!state.lines.length) renderLines();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderPadroesView = renderPadroesView;
})();
