/**
 * ImprovisaLab — tela "Biblioteca de Escalas"
 *
 * Lista todas as escalas (busca por nome), e para a escolhida mostra:
 * fórmula em graus e intervalos, tons e semitons, as notas no tom, o
 * desenho no braço (ou no teclado), o acorde que ela desenha, notas-alvo,
 * notas a evitar, de onde vem, sonoridade, onde usar, uma dica de treino e
 * exercícios prontos (partitura/tablatura/áudio).
 */
(function () {
  'use strict';

  var SC = window.IL.scales;
  var SI = window.IL.scaleInfo;
  var notation = window.IL.notation;
  var audio = window.IL.audio;
  var data = window.IL.data;

  var state = { built: false, key: 'jonio', tonic: 'C', rot: 'graus', fromFret: 0, playing: null, exercises: [] };

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function isFretted(i) { return window.IL.ui.isFrettedInstrument(i); }

  function fillScaleSelect(filter) {
    var sel = $('esc-escala');
    var allowed = SC.search(filter || '');
    var html = SC.GROUPS.map(function (g) {
      var keys = g.keys.filter(function (k) { return allowed.indexOf(k) >= 0; });
      if (!keys.length) return '';
      return '<optgroup label="' + esc(g.label) + '">' + keys.map(function (k) {
        return '<option value="' + k + '">' + esc(data.SCALES[k].label) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    sel.innerHTML = html || '<option value="">(nada encontrado)</option>';
    if (allowed.indexOf(state.key) >= 0) sel.value = state.key;
    else if (allowed.length) { state.key = allowed[0]; sel.value = allowed[0]; }
  }

  function build() {
    if (state.built) return;
    state.built = true;
    $('esc-tom').innerHTML = SC.KEYS.map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
    $('esc-tom').value = state.tonic;
    fillScaleSelect('');
    var mainInstr = $('input-instrumento');
    if (mainInstr) $('esc-instrumento').value = mainInstr.value;

    $('esc-busca').addEventListener('input', function () { fillScaleSelect($('esc-busca').value); render(); });
    $('esc-escala').addEventListener('change', function () { state.key = $('esc-escala').value; stopAudio(); render(); });
    $('esc-tom').addEventListener('change', function () { state.tonic = $('esc-tom').value; stopAudio(); render(); });
    $('esc-instrumento').addEventListener('change', function () {
      if (mainInstr) { mainInstr.value = $('esc-instrumento').value; mainInstr.dispatchEvent(new Event('change')); }
      stopAudio(); render();
    });
    $('esc-conteudo').addEventListener('click', onClick);
  }

  function onClick(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'rot') { state.rot = b.getAttribute('data-v'); render(); return; }
    if (act === 'casa') { state.fromFret = Number(b.getAttribute('data-v')); render(); return; }
    if (act === 'ouvir-escala') { toggle(b, 'escala', escalaEvents()); return; }
    if (act === 'ouvir-ex') { toggle(b, 'ex' + b.getAttribute('data-i'), state.exercises[Number(b.getAttribute('data-i'))]); return; }
    if (act === 'ir-fraseados') {
      var nav = document.querySelector('.nav-item[data-nav="biblioteca-fraseados"]');
      if (nav) { nav.click(); window.IL.ui.renderBibliotecaView({ scaleKey: state.key, tonic: state.tonic }); }
      return;
    }
    if (act === 'ir-padroes') {
      var nav2 = document.querySelector('.nav-item[data-nav="padroes"]');
      if (nav2) nav2.click();
    }
  }

  function stopAudio() {
    if (audio) audio.stopAll();
    state.playing = null;
    document.querySelectorAll('#esc-conteudo .playing').forEach(function (b) {
      b.classList.remove('playing');
      b.textContent = b.getAttribute('data-label') || '🔊 Ouvir';
    });
  }

  function opts() {
    var t = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('escala') : { bpm: 88 };
    return { bpm: t.bpm, metronome: t.metronome, humanize: false };
  }

  function toggle(btn, tag, ex) {
    if (state.playing === tag) { stopAudio(); return; }
    stopAudio();
    var instrument = $('esc-instrumento').value;
    var prep = notation.prepareForInstrument(ex.events, instrument);
    state.playing = tag;
    btn.classList.add('playing');
    btn.textContent = '⏸ Parar';
    var o = opts();
    o.chords = ex.chords || [];
    audio.playEvents(prep.events, instrument, o, function () {
      if (state.playing === tag) {
        var tr = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('escala') : {};
        if (tr.loop && btn.classList.contains('playing')) { toggleReplay(btn, tag, ex); return; }
        stopAudio();
      }
    });
  }
  function toggleReplay(btn, tag, ex) {
    var instrument = $('esc-instrumento').value;
    var prep = notation.prepareForInstrument(ex.events, instrument);
    var o = opts();
    o.chords = ex.chords || [];
    audio.playEvents(prep.events, instrument, o, function () {
      var tr = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('escala') : {};
      if (state.playing === tag && tr.loop && btn.classList.contains('playing')) { toggleReplay(btn, tag, ex); return; }
      if (state.playing === tag) stopAudio();
    });
  }

  /** A escala subindo e descendo (o "ouvir" do topo). */
  function escalaEvents() {
    var ex = SC.exercisesFor(state.tonic, state.key);
    return ex[0];
  }

  function chips(info, notes) {
    return '<div class="si-chips">' + info.formula.map(function (f, i) {
      var n = notes[i];
      return '<div class="si-chip' + (f.highlight ? ' si-hl' : '') + (i === 0 ? ' si-root' : '') + '" title="' + f.interval + '">' +
        '<span class="si-deg">' + f.degree + '</span><span class="si-int">' + f.interval + '</span>' +
        '<span class="si-note">' + (n ? n.name : '') + '</span></div>';
    }).join('') + '</div>';
  }

  function diagrama(notes, instrument) {
    var marks = notes.map(function (n) {
      return { pc: n.pc, label: state.rot === 'graus' ? n.degree : n.name, root: n.root };
    });
    if (!isFretted(instrument)) {
      return '<div class="esc-diagrama">' + notation.keyboardSVG({ notes: marks, octaves: 2 }) + '</div>';
    }
    return '<div class="esc-diagrama">' + notation.fretboardSVG({
      instrument: instrument, notes: marks, fromFret: state.fromFret, frets: state.fromFret ? 5 : 12
    }) + '</div>';
  }

  /** As notas tocadas, na ordem, separadas por compasso. */
  function notasHTML(ex) {
    var linha = '', compasso = -1;
    ex.events.forEach(function (e) {
      if (e.rest) return;
      var c = Math.floor((e.onset + 0.001) / 4);
      if (compasso < 0) compasso = c;
      else if (c !== compasso) { linha += '<span class="esc-barra">|</span>'; compasso = c; }
      linha += '<span class="esc-nota">' + esc(e.name) + '</span>';
    });
    return '<p class="esc-notas"><span class="esc-notas-rot">Notas:</span> ' + linha + '</p>';
  }

  function exercicioHTML(ex, i, instrument) {
    var body;
    if (isFretted(instrument)) {
      var pr = notation.prepareForInstrument(ex.events, instrument);
      body = '<pre class="tab-block">' + notation.renderTabText(pr.events, pr.tab, instrument) + '</pre>';
    } else {
      body = '<div class="staff-block lib-staff">' + notation.toRhythmStaffSVG(notation.centerForStaff(ex.events), { chords: ex.chords }) + '</div>';
    }
    return '<div class="lib-card esc-ex">' +
      '<div class="lib-card-head"><div class="lib-card-title">' + (i + 1) + '. ' + esc(ex.title) + '</div>' +
      '<div class="lib-card-actions"><button class="view-btn" data-act="ouvir-ex" data-i="' + i + '" data-label="🔊 Ouvir">🔊 Ouvir</button></div></div>' +
      '<p class="si-legend">' + esc(ex.dica) + '</p>' +
      '<div class="lib-card-body">' + body + notasHTML(ex) + '</div></div>';
  }

  /** Os exercícios, separados por grupo (a escala / padrões de 4 notas / arpejo). */
  function exerciciosHTML(instrument) {
    var html = '';
    var grupoAtual = null;
    state.exercises.forEach(function (ex, i) {
      if (ex.grupo && ex.grupo !== grupoAtual) {
        if (grupoAtual !== null) html += '</div>';
        html += '<h4 class="esc-grupo">' + esc(ex.grupo) + '</h4><div class="lib-lista">';
        grupoAtual = ex.grupo;
      } else if (grupoAtual === null) {
        html += '<div class="lib-lista">';
        grupoAtual = '';
      }
      html += exercicioHTML(ex, i, instrument);
    });
    return html + (grupoAtual === null ? '' : '</div>');
  }

  function render() {
    if (!state.key || !data.SCALES[state.key]) { $('esc-conteudo').innerHTML = '<p class="muted-note">Nenhuma escala encontrada com esse nome.</p>'; return; }
    var instrument = $('esc-instrumento').value;
    var info = SI.get(state.key);
    var nf = SC.notesFor(state.tonic, state.key);
    var chord = SC.chordOf(state.tonic, state.key);
    state.exercises = SC.exercisesFor(state.tonic, state.key);
    var sc = data.SCALES[state.key];
    var familia = (SC.GROUPS.filter(function (g) { return g.keys.indexOf(state.key) >= 0; })[0] || {}).label || '';
    var temFraseados = !!(window.IL.library && window.IL.library.MODE_INFO[state.key]);

    var casas = [0, 3, 5, 7, 9, 12];
    var html =
      '<div class="esc-head">' +
      '<div><div class="esc-title">' + esc(sc.label) + ' <span class="esc-tonic">em ' + esc(nf.tonic) + '</span></div>' +
      '<div class="lib-badges"><span class="lib-badge">' + esc(familia) + '</span>' +
      '<span class="lib-badge">' + nf.notes.length + ' notas</span>' +
      '<span class="lib-badge lib-badge-chord"><strong>' + esc(chord.symbol) + '</strong> ' + esc(chord.tones.join(' – ')) + '</span></div></div>' +
      '<div class="esc-head-actions">' +
      '<button class="view-btn" data-act="ouvir-escala" data-label="🔊 Ouvir a escala">🔊 Ouvir a escala</button>' +
      (temFraseados ? '<button class="view-btn" data-act="ir-fraseados">🎼 Fraseados nesta escala</button>' : '') +
      '</div></div>' +
      '<div class="transport" data-transport="escala">' +
      '<button type="button" class="tr-btn tr-metro" data-act="metro" title="Metrônomo" aria-pressed="false">⏱</button>' +
      '<button type="button" class="tr-btn" data-act="menos" title="Mais devagar">−</button>' +
      '<span class="tr-bpm"><input type="number" class="tr-bpm-input" min="40" max="240" step="1" value="88" aria-label="Andamento em bpm"/><small>bpm</small></span>' +
      '<button type="button" class="tr-btn" data-act="mais" title="Mais rápido">+</button>' +
      '<button type="button" class="tr-btn tr-loop" data-act="loop" title="Repetir" aria-pressed="false">🔁</button>' +
      '</div>' +

      chips(info, nf.notes) +
      '<div class="si-rows">' +
      '<div><span class="si-k">Fórmula</span> <code>' + info.formulaText + '</code></div>' +
      (info.tensoes ? '<div><span class="si-k">Como tensões</span> <code>' + info.tensoes + '</code></div>' : '') +
      '<div><span class="si-k">Intervalos</span> <code>' + info.intervalsText + '</code></div>' +
      '<div><span class="si-k">Tons e semitons</span> <code>' + info.steps.join(' – ') + '</code></div>' +
      '<div><span class="si-k">Notas em ' + esc(nf.tonic) + '</span> <code>' + nf.notes.map(function (n) { return n.name; }).join(' ') + '</code></div>' +
      '</div>' +

      '<div class="esc-diagrama-head">' +
      '<strong>' + (isFretted(instrument) ? 'No braço' : 'No teclado') + '</strong>' +
      '<span class="esc-toggle">' +
      '<button class="view-btn' + (state.rot === 'graus' ? ' active' : '') + '" data-act="rot" data-v="graus">Graus</button>' +
      '<button class="view-btn' + (state.rot === 'notas' ? ' active' : '') + '" data-act="rot" data-v="notas">Notas</button>' +
      '</span>' +
      (isFretted(instrument) ? '<span class="esc-toggle">' + casas.map(function (c) {
        return '<button class="view-btn' + (state.fromFret === c ? ' active' : '') + '" data-act="casa" data-v="' + c + '">' +
          (c === 0 ? 'Braço todo' : 'Casa ' + c) + '</button>';
      }).join('') + '</span>' : '') +
      '</div>' +
      diagrama(nf.notes, instrument) +

      '<div class="esc-grid">' +
      card('De onde vem', info.origem) +
      card('Sonoridade', info.som) +
      card('O que dá a cara dela', info.carac) +
      card('Notas-alvo (onde descansar)', info.alvo) +
      card('Notas a evitar', info.evitar) +
      card('Onde usar', info.uso) +
      card('Acordes que combinam (em ' + nf.tonic + ')', transposeChords(info.acordes, nf.tonic)) +
      (info.treino ? card('Dica de treino', info.treino) : '') +
      '</div>' +

      '<h3 class="esc-sub">Exercícios para treinar</h3>' +
      '<p class="si-legend">' + state.exercises.length + ' exercícios nesta escala — todos com tablatura/partitura e áudio. ' +
      'Use o metrônomo aí em cima e comece devagar.</p>' +
      exerciciosHTML(instrument);

    $('esc-conteudo').innerHTML = html;
    if (window.IL.ui.setupTransportBars) window.IL.ui.setupTransportBars();
  }

  // A lista "Acordes que combinam" da ficha é escrita com uma tônica fixa
  // (ex.: "G7, G7(9), G13" para o bebop dominante). Aqui ela é transposta
  // para o tom escolhido na tela, para não confundir quem está lendo.
  var SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function pcOf(n) { var p = PC[n[0]]; if (n[1] === '#') p++; if (n[1] === 'b') p--; return (p + 12) % 12; }
  var CHORD_RE = /(^|[,\s(])([A-G])([#b])?(?=7M|m|M|\+|°|ø|sus|add|dim|aug|alt|[0-9(]|,|\s|$)/g;

  function transposeChords(texto, tonic) {
    if (!texto || !/[A-G]/.test(texto)) return texto;
    var first = null;
    texto.replace(CHORD_RE, function (m, pre, letra, acid) { if (first === null) first = letra + (acid || ''); return m; });
    if (first === null) return texto;
    var delta = (pcOf(tonic) - pcOf(first) + 12) % 12;
    if (!delta) return texto;
    var table = (tonic.indexOf('b') >= 0 || tonic === 'F') ? FLAT : SHARP;
    return texto.replace(CHORD_RE, function (m, pre, letra, acid) {
      return pre + table[(pcOf(letra + (acid || '')) + delta) % 12];
    });
  }

  function card(titulo, texto) {
    if (!texto) return '';
    return '<div class="esc-card"><div class="esc-card-title">' + esc(titulo) + '</div><p>' + esc(texto) + '</p></div>';
  }

  function renderEscalasView(preset) {
    build();
    if (preset && preset.scaleKey) {
      state.key = preset.scaleKey;
      if (preset.tonic) { state.tonic = preset.tonic; $('esc-tom').value = preset.tonic; }
      fillScaleSelect($('esc-busca').value);
    }
    render();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderEscalasView = renderEscalasView;
})();
