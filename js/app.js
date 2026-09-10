/**
 * ImprovisaLab — Etapa 1 (interface)
 * Liga os campos da tela ao motor de teoria musical (js/theory.js) e
 * renderiza as abas Visão Geral / Escalas / Arpejos / Notas-alvo.
 * Sem backend, sem login — tudo roda no navegador.
 */
(function () {
  'use strict';

  var theory = window.IL.theory;
  var phrasesMod = window.IL.phrases;
  var notation = window.IL.notation;
  var audio = window.IL.audio;

  var NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT_SPELLING = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

  // Estado da aba Fraseados (Etapa 2) e do último resultado analisado (Etapa 3)
  var state = {
    phrases: [],
    selectedPhraseIndex: 0,
    selectedView: 'tab',
    lastResult: null
  };

  function resetAudioButtons() {
    var playBtn = document.getElementById('btn-play-progressao');
    if (playBtn) { playBtn.classList.remove('playing'); playBtn.textContent = '▶ Tocar progressão'; }
    var audioBtn = document.querySelector('.view-btn[data-view="audio"]');
    if (audioBtn) { audioBtn.classList.remove('playing'); audioBtn.textContent = '🔊 Áudio'; }
    document.querySelectorAll('#chord-chain .chord-pill.playing').forEach(function (p) {
      p.classList.remove('playing');
    });
  }

  function buildTonalidadeOptions() {
    var select = document.getElementById('input-tonalidade');
    var groupMaior = document.createElement('optgroup');
    groupMaior.label = 'Maior';
    var groupMenor = document.createElement('optgroup');
    groupMenor.label = 'Menor';

    NOTE_ORDER.forEach(function (n) {
      var sharpName = n;
      var flatName = FLAT_SPELLING[n];
      [sharpName, flatName].filter(Boolean).forEach(function (name) {
        var optMaior = document.createElement('option');
        optMaior.value = name + '|maior';
        optMaior.textContent = name + ' maior';
        groupMaior.appendChild(optMaior);

        var optMenor = document.createElement('option');
        optMenor.value = name + '|menor';
        optMenor.textContent = name + ' menor';
        groupMenor.appendChild(optMenor);
      });
    });

    select.appendChild(groupMaior);
    select.appendChild(groupMenor);
    select.value = 'G|maior';
  }

  function functionClass(functionLabel) {
    switch (functionLabel) {
      case 'Tônica': return 'func-tonica';
      case 'Tônica relativa': return 'func-tonica-relativa';
      case 'Subdominante': return 'func-subdominante';
      case 'Dominante': return 'func-dominante';
      case 'Dominante secundário': return 'func-dominante-secundario';
      default: return 'func-cromatico';
    }
  }

  function el(tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function renderChordChain(result) {
    var wrap = document.getElementById('chord-chain');
    wrap.innerHTML = '';
    result.chords.forEach(function (c, i) {
      if (i > 0) wrap.appendChild(el('span', 'chord-arrow', '→'));
      if (c.error) {
        var errPill = el('div', 'chord-pill func-cromatico');
        errPill.innerHTML = '<div class="symbol">' + c.raw + '</div><div class="grau">inválido</div>';
        wrap.appendChild(errPill);
        return;
      }
      var pill = el('div', 'chord-pill ' + functionClass(c.function));
      pill.innerHTML = '<div class="symbol">' + c.symbol + '</div><div class="grau">' + c.roman + '</div>';
      wrap.appendChild(pill);
    });
  }

  function renderTabelaVisaoGeral(result) {
    var tbody = document.querySelector('#tabela-visao-geral tbody');
    tbody.innerHTML = '';
    result.chords.forEach(function (c) {
      var tr = document.createElement('tr');
      if (c.error) {
        tr.innerHTML = '<td>' + c.raw + '</td><td colspan="4" class="note-cell">' + c.error + '</td>';
        tbody.appendChild(tr);
        return;
      }
      var scalesTxt = c.scales.map(function (s) { return s.label; }).join(', ');
      var notesTxt = c.tones.join(' ');
      tr.innerHTML =
        '<td><strong>' + c.symbol + '</strong></td>' +
        '<td>' + c.roman + '</td>' +
        '<td>' + c.function + '</td>' +
        '<td>' + notesTxt + '</td>' +
        '<td>' + scalesTxt + '</td>';
      tbody.appendChild(tr);
      if (c.note) {
        var trNote = document.createElement('tr');
        trNote.innerHTML = '<td></td><td colspan="4" class="note-cell">↳ ' + c.note + '</td>';
        tbody.appendChild(trNote);
      }
    });
  }

  function renderScaleLike(containerId, result, kind) {
    var wrap = document.getElementById(containerId);
    wrap.innerHTML = '';
    result.chords.forEach(function (c) {
      if (c.error) return;
      var item = el('div', 'scale-item');
      item.appendChild(el('div', 'chord-name', c.symbol + ' <span style="color:var(--text-dim);font-weight:400;">(' + c.roman + ' · ' + c.function + ')</span>'));
      var list = kind === 'escalas' ? c.scales : c.arpeggios;
      list.forEach(function (entry) {
        var row = el('div', 'scale-row');
        row.innerHTML = '<span class="name">' + entry.label + '</span><span class="notes">' + entry.notes.join(' · ') + '</span>';
        item.appendChild(row);
      });
      wrap.appendChild(item);
    });
  }

  function renderTargetNotes(result) {
    var main = document.getElementById('lista-notas-alvo');
    var side = document.getElementById('side-notas-alvo');
    main.innerHTML = '';
    side.innerHTML = '';
    result.chords.forEach(function (c) {
      if (c.error) return;
      var row = el('div', 'target-row');
      row.innerHTML =
        '<span class="chord">' + c.symbol + '</span>' +
        '<span class="note">' + c.targetNote + ' <span class="label">(' + c.targetLabel + ')</span></span>';
      main.appendChild(row.cloneNode(true));
      side.appendChild(row);
    });
  }

  function renderSubtitulo(result) {
    var romans = result.chords.map(function (c) { return c.error ? '?' : c.roman; }).join('–');
    var el2 = document.getElementById('analise-subtitulo');
    el2.textContent = 'Tonalidade: ' + result.tonic + ' ' + result.mode + ' • Campo harmônico percorrido: ' + romans;
  }

  function showFormError(message) {
    var box = document.getElementById('form-error');
    if (!message) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.hidden = false;
    box.textContent = message;
  }

  function runAnalysis() {
    if (audio) { audio.stopAll(); resetAudioButtons(); }
    var raw = document.getElementById('input-progressao').value;
    var chordSymbols = raw.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    if (chordSymbols.length === 0) {
      showFormError('Digite ao menos um acorde (ex.: Gmaj7 | Em7 | Am7 | D7).');
      return;
    }

    var tonalidadeValue = document.getElementById('input-tonalidade').value.split('|');
    var tonic = tonalidadeValue[0];
    var mode = tonalidadeValue[1];
    var nivel = document.getElementById('input-nivel').value;

    var result = theory.analyzeProgression(chordSymbols, tonic, mode, nivel);

    var errors = result.chords.filter(function (c) { return c.error; });
    if (errors.length === result.chords.length) {
      showFormError('Nenhum acorde foi reconhecido. Confira a grafia (ex.: Gmaj7, Bbm7b5, F#7).');
    } else if (errors.length > 0) {
      showFormError(errors.length + ' acorde(s) não reconhecido(s): ' + errors.map(function (e) { return e.raw; }).join(', '));
    } else {
      showFormError(null);
    }

    renderSubtitulo(result);
    renderChordChain(result);
    renderTabelaVisaoGeral(result);
    renderScaleLike('lista-escalas', result, 'escalas');
    renderScaleLike('lista-arpejos', result, 'arpejos');
    renderTargetNotes(result);

    state.lastResult = result;
    var instrumento = document.getElementById('input-instrumento').value;
    state.phrases = phrasesMod.generatePhrases(result, nivel);
    state.selectedPhraseIndex = 0;
    state.selectedView = instrumento === 'teclado' ? 'partitura' : 'tab';
    renderFraseadosList();
    renderFraseadoDetalhe();
  }

  // ===================== Fraseados (Etapa 2) =====================

  function uniqueNotes(notes) {
    var seen = {};
    var out = [];
    notes.forEach(function (n) {
      if (!seen[n]) { seen[n] = true; out.push(n); }
    });
    return out;
  }

  function buildTabText(tab, instrument) {
    var order = instrument === 'guitarra' ? [5, 4, 3, 2, 1, 0] : [3, 2, 1, 0];
    var labels = instrument === 'guitarra' ? ['e', 'B', 'G', 'D', 'A', 'E'] : ['G', 'D', 'A', 'E'];
    var colWidth = 4;
    var rows = order.map(function () { return ''; });
    tab.forEach(function (note) {
      order.forEach(function (stringIdx, rowI) {
        var text = (note.string === stringIdx) ? String(note.fret) : '';
        rows[rowI] += text.padEnd(colWidth, '-');
      });
    });
    return labels.map(function (l, i) { return l + '|' + rows[i] + '|'; }).join('\n');
  }

  function renderFraseadosList() {
    var wrap = document.getElementById('lista-fraseados');
    wrap.innerHTML = '';
    state.phrases.forEach(function (p, i) {
      var item = el('div', 'phrase-item' + (i === state.selectedPhraseIndex ? ' active' : ''));
      item.setAttribute('data-phrase-index', i);
      item.innerHTML =
        '<span class="phrase-num">' + p.index + '</span>' +
        '<div class="phrase-info">' +
        '<div class="phrase-title">' + p.title + '</div>' +
        '<div class="phrase-sub">' + p.scaleLabel + '</div>' +
        '</div>' +
        '<span class="phrase-play">▶</span>';
      wrap.appendChild(item);
    });
  }

  function renderFraseadoDetalhe() {
    if (audio) { audio.stopAll(); }
    var audioBtnReset = document.querySelector('.view-btn[data-view="audio"]');
    if (audioBtnReset) { audioBtnReset.classList.remove('playing'); audioBtnReset.textContent = '🔊 Áudio'; }

    var phrase = state.phrases[state.selectedPhraseIndex];
    var titulo = document.getElementById('fraseado-titulo');
    var subtitulo = document.getElementById('fraseado-subtitulo');
    var conteudo = document.getElementById('fraseado-conteudo');
    var chips = document.getElementById('fraseado-notas-chips');
    var explicacao = document.getElementById('fraseado-explicacao-texto');
    var instrumento = document.getElementById('input-instrumento').value;
    var nivel = document.getElementById('input-nivel').value;

    if (!phrase) {
      titulo.textContent = 'Nenhum fraseado disponível';
      subtitulo.textContent = 'Analise uma progressão para gerar fraseados.';
      conteudo.innerHTML = '';
      chips.innerHTML = '';
      explicacao.textContent = '—';
      return;
    }

    titulo.textContent = phrase.title;
    subtitulo.textContent = 'Escala: ' + phrase.scaleLabel + ' · Nível: ' + nivel;

    // Tab só existe para guitarra/baixo.
    var tabBtn = document.querySelector('.view-btn[data-view="tab"]');
    var isFretted = instrumento === 'guitarra' || instrumento === 'baixo';
    tabBtn.disabled = !isFretted;
    tabBtn.title = isFretted ? '' : 'Tablatura só se aplica a guitarra/baixo';
    if (!isFretted && state.selectedView === 'tab') state.selectedView = 'partitura';

    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === state.selectedView);
    });

    var realized = notation.realizeForInstrument(phrase.notes, isFretted ? instrumento : 'teclado');

    if (state.selectedView === 'tab' && isFretted) {
      var tab = notation.toTab(realized, instrumento);
      conteudo.innerHTML = '<pre class="tab-block">' + buildTabText(tab, instrumento) + '</pre>';
    } else if (state.selectedView === 'cifra') {
      conteudo.innerHTML = '<div class="cifra-block">' + phrase.notes.join(' – ') + '</div>';
    } else {
      conteudo.innerHTML = '<div class="staff-block">' + notation.toStaffSVG(realized) + '</div>';
    }

    chips.innerHTML = '';
    uniqueNotes(phrase.notes).forEach(function (n) {
      chips.appendChild(el('span', 'note-chip', n));
    });

    explicacao.textContent = phrase.explanation;
  }

  function setupFraseados() {
    document.getElementById('lista-fraseados').addEventListener('click', function (ev) {
      var item = ev.target.closest('[data-phrase-index]');
      if (!item) return;
      state.selectedPhraseIndex = Number(item.getAttribute('data-phrase-index'));
      renderFraseadosList();
      renderFraseadoDetalhe();
    });

    document.getElementById('view-toggle').addEventListener('click', function (ev) {
      var btn = ev.target.closest('.view-btn');
      if (!btn || btn.disabled) return;
      var view = btn.getAttribute('data-view');
      if (view === 'audio') {
        playCurrentPhrase(btn);
        return;
      }
      state.selectedView = view;
      renderFraseadoDetalhe();
    });

    document.getElementById('input-instrumento').addEventListener('change', function () {
      if (state.phrases.length > 0) renderFraseadoDetalhe();
    });
  }

  function playCurrentPhrase(btn) {
    if (!audio) return;
    var phrase = state.phrases[state.selectedPhraseIndex];
    if (!phrase) return;

    if (btn.classList.contains('playing')) {
      audio.stopAll();
      btn.classList.remove('playing');
      btn.textContent = '🔊 Áudio';
      return;
    }

    var instrumento = document.getElementById('input-instrumento').value;
    btn.classList.add('playing');
    btn.textContent = '⏸ Tocando...';
    audio.playPhrase(phrase, instrumento, null, function () {
      btn.classList.remove('playing');
      btn.textContent = '🔊 Áudio';
    });
  }

  // ===================== Áudio da progressão (Etapa 3) =====================

  function highlightChord(index) {
    var pills = document.querySelectorAll('#chord-chain .chord-pill');
    pills.forEach(function (p, i) { p.classList.toggle('playing', i === index); });
  }

  function setupAudioProgressao() {
    var btn = document.getElementById('btn-play-progressao');
    if (!btn || !audio) return;
    btn.addEventListener('click', function () {
      if (btn.classList.contains('playing')) {
        audio.stopAll();
        resetAudioButtons();
        return;
      }
      if (!state.lastResult) return;
      var instrumento = document.getElementById('input-instrumento').value;
      btn.classList.add('playing');
      btn.textContent = '⏸ Tocando... (clique para parar)';
      audio.playProgression(state.lastResult, instrumento, highlightChord, function () {
        resetAudioButtons();
      });
    });
  }

  function setupTabs() {
    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('is-soon')) return; // ainda não implementado
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.getAttribute('data-tab');
        document.querySelectorAll('.panel').forEach(function (p) {
          p.hidden = p.getAttribute('data-panel') !== target;
        });
      });
    });
  }

  function setupNav() {
    document.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (item.classList.contains('is-soon')) return;
        document.querySelectorAll('.nav-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
      });
    });
  }

  function setupForm() {
    document.getElementById('btn-analisar').addEventListener('click', runAnalysis);
    document.getElementById('input-progressao').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runAnalysis();
    });
    document.getElementById('btn-clear').addEventListener('click', function () {
      document.getElementById('input-progressao').value = '';
      showFormError(null);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildTonalidadeOptions();
    setupTabs();
    setupNav();
    setupForm();
    setupFraseados();
    setupAudioProgressao();
    runAnalysis(); // já mostra um exemplo ao abrir, como no layout de referência
  });
})();
