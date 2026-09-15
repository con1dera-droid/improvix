/**
 * IMPROVIX — Etapa 1 (interface)
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
  var lessonsMod = window.IL.lessons;

  var NOTE_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT_SPELLING = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

  // Instrumentos com trastes/cordas soltas fixas — só eles têm tablatura
  // (sopros e cordas de arco tocam uma nota por vez, sem "casas").
  var FRETTED_INSTRUMENTS = { guitarra: true, violao: true, baixo: true };
  function isFrettedInstrument(instrument) { return !!FRETTED_INSTRUMENTS[instrument]; }
  // Guitarra e violão têm a mesma afinação de 6 cordas; os demais instrumentos
  // com traste (baixo) usam 4 cordas.
  var SIX_STRING_INSTRUMENTS = { guitarra: true, violao: true };
  function isSixStringInstrument(instrument) { return !!SIX_STRING_INSTRUMENTS[instrument]; }

  // ---------------- Planos (Etapa 5): nível Avançado é exclusivo Pro ----------------
  // window.IL.account é publicado por js/auth-ui.js (Etapa 4) e reflete o
  // usuário/perfil atuais em tempo real. Sem ele (ainda carregando, ou
  // Supabase indisponível), tratamos como "não Pro" — é só uma trava de
  // interface (o gerador de fraseados roda 100% no navegador, então não
  // existe uma barreira de servidor aqui; ver docs/etapa5-planos.md).
  var PLAN_GATED_LEVELS = { avancado: true };
  function isProUser() {
    var acc = window.IL.account;
    return !!(acc && typeof acc.isPro === 'function' && acc.isPro());
  }
  function nivelIsGated(nivel) { return !!PLAN_GATED_LEVELS[nivel] && !isProUser(); }

  // Estado da aba Fraseados (Etapa 2) e do último resultado analisado (Etapa 3)
  var state = {
    style: 'automatico', // estilo das frases (Bebop, Fusion, Intervalado...)
    phrases: [],
    selectedPhraseIndex: 0,
    selectedView: 'tab',
    lastResult: null,
    selectedLessonId: null,
    // Fraseados melhores: variação escolhida por compasso ("Outra ideia")
    // e técnica fixa opcional para a progressão inteira ("Padrão").
    variations: [],
    motif: ''
  };

  // ---------------- Metrônomo / andamento / repetir ----------------
  // Duas barras: "prog" (Ouça a progressão) e "linha" (Fraseados e Exercícios).
  var transport = {
    prog: { metro: false, bpm: 110, loop: false },
    linha: { metro: false, bpm: 100, loop: false },
    escala: { metro: false, bpm: 88, loop: false },
    transcricao: { metro: false, bpm: 100, loop: true }
  };
  try {
    var savedTr = JSON.parse(window.localStorage.getItem('il_transport') || 'null');
    if (savedTr) ['prog', 'linha', 'escala', 'transcricao'].forEach(function (k) { if (savedTr[k]) Object.assign(transport[k], savedTr[k]); });
  } catch (e) { /* sem storage */ }
  function saveTransport() { try { window.localStorage.setItem('il_transport', JSON.stringify(transport)); } catch (e) { /* ignora */ } }
  function transportOpts(key) { var t = transport[key]; return { bpm: t.bpm, metronome: t.metro, loop: t.loop }; }

  // Pode ser chamado quantas vezes for preciso: barras já ligadas são
  // ignoradas (flag data-tr-ready), então telas montadas dinamicamente
  // (ex.: Biblioteca de Escalas) só precisam chamar de novo.
  function setupTransport() {
    document.querySelectorAll('.transport[data-transport]').forEach(function (bar) {
      var key = bar.getAttribute('data-transport');
      var t = transport[key];
      if (!t) return;
      if (bar.getAttribute('data-tr-ready') === '1') return;
      bar.setAttribute('data-tr-ready', '1');
      var input = bar.querySelector('.tr-bpm-input');
      function sync() {
        bar.querySelector('[data-act="metro"]').classList.toggle('on', t.metro);
        bar.querySelector('[data-act="metro"]').setAttribute('aria-pressed', String(t.metro));
        bar.querySelector('[data-act="loop"]').classList.toggle('on', t.loop);
        bar.querySelector('[data-act="loop"]').setAttribute('aria-pressed', String(t.loop));
        input.value = t.bpm;
      }
      function setBpm(v) { t.bpm = Math.max(40, Math.min(240, Math.round(Number(v) || t.bpm))); sync(); saveTransport(); }
      bar.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-act]');
        if (!b) return;
        var act = b.getAttribute('data-act');
        if (act === 'metro') t.metro = !t.metro;
        else if (act === 'loop') {
          t.loop = !t.loop;
          // vale já para o que está tocando: ligar emenda a próxima volta,
          // desligar deixa terminar o ciclo atual e para.
          if (audio && audio.setLoop) audio.setLoop(t.loop);
        }
        else if (act === 'menos') return setBpm(t.bpm - 5);
        else if (act === 'mais') return setBpm(t.bpm + 5);
        sync(); saveTransport();
      });
      input.addEventListener('change', function () { setBpm(input.value); });
      input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { setBpm(input.value); input.blur(); } });
      sync();
    });
  }

  function resetAudioButtons() {
    var playBtn = document.getElementById('btn-play-progressao');
    if (playBtn) { playBtn.classList.remove('playing'); playBtn.textContent = '▶ Tocar progressão'; }
    var audioBtn = document.querySelector('.view-btn[data-view="audio"]');
    if (audioBtn) { audioBtn.classList.remove('playing'); audioBtn.textContent = '🔊 Áudio'; }
    var lineBtn = document.getElementById('btn-tocar-linha');
    if (lineBtn) { lineBtn.classList.remove('playing'); lineBtn.textContent = '▶ Tocar a linha inteira'; }
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
      case 'SubV7 (substituto do dominante)': return 'func-dominante-secundario';
      case 'II cadencial': return 'func-subdominante';
      default: return 'func-cromatico';
    }
  }

  function el(tag, className, html) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  // Notas que formam o acorde: "C – E – G – Bb" (com as tensões da cifra).
  function chordNotesOf(c) {
    var t = theory.chordNotesText ? theory.chordNotesText(c.symbol) : '';
    return t || (c.tones || []).join(' – ');
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
      pill.innerHTML = '<div class="symbol">' + c.symbol + '</div><div class="chord-notes">' + chordNotesOf(c) + '</div><div class="grau">' + c.roman + '</div>';
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
      var notesTxt = chordNotesOf(c);
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
      item.appendChild(el('div', 'chord-name', c.symbol + ' <span class="chord-notes-inline">(' + chordNotesOf(c) + ')</span> <span style="color:var(--text-dim);font-weight:400;">' + c.roman + ' · ' + c.function + '</span>'));
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
        '<span class="chord">' + c.symbol + ' <span class="chord-notes-inline">(' + chordNotesOf(c) + ')</span></span>' +
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

  // Sincroniza a UI do seletor de Nível com o plano da conta: atualiza o
  // rótulo da opção "Avançado", mostra/esconde o aviso de plano Pro e, se a
  // seleção atual não é mais permitida (ex.: usuário saiu da conta), rebaixa
  // para Intermediário. Não decide sozinha se deve reanalisar — quem chama
  // decide isso (ver updateNivelGateUI / runAnalysis).
  function syncNivelGate() {
    var select = document.getElementById('input-nivel');
    var opt = document.getElementById('opt-nivel-avancado');
    var note = document.getElementById('nivel-gate-note');
    var pro = isProUser();

    if (opt) opt.textContent = pro ? 'Avançado' : 'Avançado 🔒 (Pro)';
    if (note) note.hidden = pro;

    if (nivelIsGated(select.value)) {
      select.value = 'intermediario';
      return true; // a seleção foi rebaixada
    }
    return false;
  }

  // Chamado ao carregar a página, ao trocar o Nível e sempre que o estado da
  // conta muda (login/logout/plano) — ver window.IL.ui.onAccountChange.
  function updateNivelGateUI() {
    var downgraded = syncNivelGate();
    if (downgraded && state.lastResult) runAnalysis();
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
    syncNivelGate(); // defesa extra: cobre o caso de o plano ter mudado entre a seleção e o clique em "Analisar"
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
    state.variations = [];
    renderMotifOptions(nivel);
    state.phrases = phrasesMod.generatePhrases(result, nivel, { variations: state.variations, motif: state.motif, style: state.style });
    state.selectedPhraseIndex = 0;
    state.selectedView = isFrettedInstrument(instrumento) ? 'tab' : 'partitura';
    renderFraseadosList();
    renderFraseadoDetalhe();
  }

  // Refaz os fraseados mantendo a análise (usado por "Outra ideia" e "Padrão").
  function regeneratePhrases() {
    if (!state.lastResult) return;
    var nivel = document.getElementById('input-nivel').value;
    state.phrases = phrasesMod.generatePhrases(state.lastResult, nivel, { variations: state.variations, motif: state.motif, style: state.style });
    if (state.selectedPhraseIndex >= state.phrases.length) state.selectedPhraseIndex = 0;
    renderFraseadosList();
    renderFraseadoDetalhe();
  }

  // Opções do seletor "Padrão" dependem do nível (as técnicas avançadas só
  // aparecem no Avançado).
  function renderMotifOptions(nivel) {
    var select = document.getElementById('input-motivo');
    if (!select || !phrasesMod.motifChoices) return;
    var choices = phrasesMod.motifChoices(nivel);
    var valid = choices.some(function (c) { return c.key === state.motif; });
    if (!valid) state.motif = '';
    select.innerHTML = '<option value="">Automático (variado)</option>' + choices.map(function (c) {
      return '<option value="' + c.key + '">' + c.label + '</option>';
    }).join('');
    select.value = state.motif;
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
    var sixString = isSixStringInstrument(instrument);
    var order = sixString ? [5, 4, 3, 2, 1, 0] : [3, 2, 1, 0];
    var labels = sixString ? ['e', 'B', 'G', 'D', 'A', 'E'] : ['G', 'D', 'A', 'E'];
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
        '<div class="phrase-sub">' + (p.technique ? p.technique + ' · ' : '') + p.scaleLabel + '</div>' +
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
    subtitulo.textContent = (phrase.technique ? 'Técnica: ' + phrase.technique + ' · ' : '') +
      'Escala: ' + phrase.scaleLabel + ' · Nível: ' + nivel;
    var ideiaBtn = document.getElementById('btn-outra-ideia');
    if (ideiaBtn) {
      ideiaBtn.disabled = phrase.category === 'resolucao';
      ideiaBtn.title = ideiaBtn.disabled ? 'A frase de resolução é sempre o cerco à fundamental' : 'Gera outra frase para este compasso, com outra técnica';
    }

    // Tab só existe para instrumentos com traste (guitarra/violão/baixo).
    var tabBtn = document.querySelector('.view-btn[data-view="tab"]');
    var isFretted = isFrettedInstrument(instrumento);
    tabBtn.disabled = !isFretted;
    tabBtn.title = isFretted ? '' : 'Tablatura só se aplica a instrumentos com traste (guitarra, violão, baixo)';
    if (!isFretted && state.selectedView === 'tab') state.selectedView = 'partitura';

    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-view') === state.selectedView);
    });

    var pr = preparedPhrase(phrase, instrumento, nivel);

    if (state.selectedView === 'tab' && isFretted) {
      conteudo.innerHTML = '<pre class="tab-block">' + notation.renderTabText(pr.events, pr.tab, instrumento) + '</pre>' +
        '<p class="tab-legend">' + notation.TAB_LEGEND + '</p>';
    } else if (state.selectedView === 'cifra') {
      conteudo.innerHTML = '<div class="cifra-block">' + pr.events.filter(function (e) { return !e.rest; }).map(function (e) {
        return e.name + (e.art ? '<sup>' + e.art + '</sup>' : '') + (e.vibrato ? '~' : '');
      }).join(' – ') + '</div>';
    } else {
      var chordSym = [{ beat: 0, symbol: phrase.chordSymbol }];
      conteudo.innerHTML = '<div class="staff-block">' + notation.toRhythmStaffSVG(notation.centerForStaff(pr.events), { chords: chordSym }) + '</div>';
    }

    chips.innerHTML = '';
    uniqueNotes(phrase.notes).forEach(function (n) {
      chips.appendChild(el('span', 'note-chip', n));
    });

    var artTxt = window.IL.articulation ? window.IL.articulation.describe(pr.events) : '';
    explicacao.textContent = phrase.explanation + (artTxt ? ' ' + artTxt : '');
  }

  // Frase com articulações (bend, hammer-on, pull-off, slide, vibrato) e
  // dinâmica para o instrumento atual, na oitava certa e com a digitação da tab.
  function preparedPhrase(phrase, instrumento, nivel) {
    var key = instrumento + '|' + nivel;
    phrase._prep = phrase._prep || {};
    if (!phrase._prep[key]) {
      var evs = phrasesMod.articulateFor ? phrasesMod.articulateFor(phrase, instrumento, nivel) : phrase.events;
      phrase._prep[key] = notation.prepareForInstrument(evs || [], instrumento);
    }
    return phrase._prep[key];
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

    var ideiaBtn = document.getElementById('btn-outra-ideia');
    if (ideiaBtn) {
      ideiaBtn.addEventListener('click', function () {
        var phrase = state.phrases[state.selectedPhraseIndex];
        if (!phrase || phrase.category === 'resolucao') return;
        var i = state.selectedPhraseIndex;
        state.variations[i] = (state.variations[i] || 0) + 1;
        regeneratePhrases();
      });
    }

    var estilo = document.getElementById('input-estilo-fraseado');
    if (estilo && phrasesMod.styleChoices) {
      estilo.innerHTML = phrasesMod.styleChoices().map(function (c) {
        return '<option value="' + c.key + '">' + c.label + '</option>';
      }).join('');
      estilo.value = state.style || 'automatico';
      estilo.addEventListener('change', function () {
        state.style = estilo.value;
        state.variations = [];
        audio && audio.stopAll && audio.stopAll();
        resetAudioButtons();
        regeneratePhrases();
      });
    }

    var motivo = document.getElementById('input-motivo');
    if (motivo) {
      motivo.addEventListener('change', function () {
        state.motif = motivo.value;
        state.variations = [];
        regeneratePhrases();
      });
    }

    var lineBtn = document.getElementById('btn-tocar-linha');
    if (lineBtn) {
      lineBtn.addEventListener('click', function () {
        if (!audio || !audio.playLine) return;
        if (lineBtn.classList.contains('playing')) { audio.stopAll(); resetAudioButtons(); return; }
        var instrumento = document.getElementById('input-instrumento').value;
        var nivelAtual = document.getElementById('input-nivel').value;
        var bars = state.phrases.filter(function (p) { return p.category !== 'resolucao'; }).map(function (p) {
          return Object.assign({}, p, { events: preparedPhrase(p, instrumento, nivelAtual).events });
        });
        if (!bars.length) return;
        audio.stopAll();
        resetAudioButtons();
        lineBtn.classList.add('playing');
        lineBtn.textContent = '⏸ Tocando... (clique para parar)';
        // O "repetir" é feito dentro do motor de áudio, agendado adiantado no
        // relógio do som: a volta seguinte emenda na anterior sem pausa.
        audio.playLine(bars, instrumento, function (b) {
          highlightChord(b);
          document.querySelectorAll('#lista-fraseados .phrase-item').forEach(function (el, idx) {
            el.classList.toggle('playing', idx === b);
          });
        }, function () {
          resetAudioButtons();
          document.querySelectorAll('#lista-fraseados .phrase-item.playing').forEach(function (el) { el.classList.remove('playing'); });
        }, transportOpts('linha'));
      });
    }
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
    var pr = preparedPhrase(phrase, instrumento, document.getElementById('input-nivel').value);
    audio.playPhrase(Object.assign({}, phrase, { events: pr.events }), instrumento, null, function () {
      btn.classList.remove('playing');
      btn.textContent = '🔊 Áudio';
    }, transportOpts('linha'));
  }

  // ===================== Aulas (Etapa 5, parte 4) =====================
  // Módulo livre — não depende de login nem de plano. Conteúdo em
  // js/lessons.js; aqui só a renderização (lista + detalhe) e o botão
  // "Testar este exemplo", que reaproveita o mesmo fluxo do Laboratório
  // (preenche tonalidade/progressão e roda a análise).

  function renderAulasList() {
    var wrap = document.getElementById('lista-aulas');
    if (!wrap || !lessonsMod) return;
    wrap.innerHTML = '';
    lessonsMod.LESSONS.forEach(function (l) {
      var item = el('div', 'aula-item' + (l.id === state.selectedLessonId ? ' active' : ''));
      item.setAttribute('data-lesson-id', l.id);
      item.innerHTML =
        '<div class="aula-categoria">' + l.categoria + '</div>' +
        '<div class="aula-titulo">' + l.titulo + '</div>' +
        '<div class="aula-resumo">' + l.resumo + '</div>';
      wrap.appendChild(item);
    });
  }

  function renderAulaDetalhe() {
    var wrap = document.getElementById('aula-detalhe');
    if (!wrap || !lessonsMod) return;
    var lesson = lessonsMod.byId(state.selectedLessonId);
    if (!lesson) {
      wrap.innerHTML = '<p class="muted-note">Escolha uma lição na lista ao lado.</p>';
      return;
    }

    var html =
      '<div class="aula-detalhe-categoria">' + lesson.categoria + '</div>' +
      '<h3 class="aula-detalhe-titulo">' + lesson.titulo + '</h3>';
    lesson.corpo.forEach(function (paragrafo) {
      html += '<p class="aula-paragrafo">' + paragrafo + '</p>';
    });
    if (lesson.exemplo) {
      html +=
        '<div class="aula-exemplo">' +
        '<div class="aula-exemplo-label">Exemplo prático</div>' +
        '<div class="aula-exemplo-progressao">' + lesson.exemplo.progressao + '</div>' +
        '<button class="btn-secondary" id="btn-aula-testar">▶ Testar este exemplo</button>' +
        '</div>';
    }
    wrap.innerHTML = html;

    var btn = document.getElementById('btn-aula-testar');
    if (btn) {
      btn.addEventListener('click', function () {
        document.getElementById('input-tonalidade').value = lesson.exemplo.tonalidade + '|' + lesson.exemplo.modo;
        document.getElementById('input-progressao').value = lesson.exemplo.progressao;
        window.IL.ui.switchView('inicio');
        window.IL.ui.switchTab('visao-geral');
        runAnalysis();
      });
    }
  }

  function renderAulasView() {
    if (!state.selectedLessonId && lessonsMod && lessonsMod.LESSONS.length > 0) {
      state.selectedLessonId = lessonsMod.LESSONS[0].id;
    }
    renderAulasList();
    renderAulaDetalhe();
  }

  function setupAulas() {
    var wrap = document.getElementById('lista-aulas');
    if (!wrap) return;
    wrap.addEventListener('click', function (ev) {
      var item = ev.target.closest('[data-lesson-id]');
      if (!item) return;
      state.selectedLessonId = item.getAttribute('data-lesson-id');
      renderAulasList();
      renderAulaDetalhe();
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
      }, transportOpts('prog'));
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
        fecharMenu();   // no celular o menu é gaveta: escolheu, fechou
      });
    });
  }

  // --- Menu de celular (gaveta) --------------------------------------------
  // No computador o menu lateral está sempre à vista. No celular ele sai da
  // tela e volta pelo botão ☰. Quem manda é a classe `menu-aberto` no <body>:
  // o CSS cuida do resto (a gaveta desliza e o fundo escurece).

  function menuAberto() { return document.body.classList.contains('menu-aberto'); }

  function abrirMenu() {
    document.body.classList.add('menu-aberto');
    var ov = document.getElementById('menu-overlay');
    if (ov) ov.hidden = false;
    var b = document.getElementById('btn-menu');
    if (b) { b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-label', 'Fechar menu'); }
  }

  function fecharMenu() {
    if (!menuAberto()) return;
    document.body.classList.remove('menu-aberto');
    var ov = document.getElementById('menu-overlay');
    if (ov) ov.hidden = true;
    var b = document.getElementById('btn-menu');
    if (b) { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', 'Abrir menu'); }
  }

  function setupMenuCelular() {
    var btn = document.getElementById('btn-menu');
    var ov = document.getElementById('menu-overlay');
    if (btn) btn.addEventListener('click', function () { menuAberto() ? fecharMenu() : abrirMenu(); });
    if (ov) ov.addEventListener('click', fecharMenu);
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') fecharMenu(); });
    // Virou o telefone ou voltou para o computador: a gaveta não faz mais
    // sentido, e deixá-la aberta travaria a rolagem da página.
    window.addEventListener('resize', function () { if (window.innerWidth > 860) fecharMenu(); });
  }

  // --- A progressão acompanha a tonalidade ---------------------------------
  // Trocar de tom sem trocar os acordes não faz sentido nenhum. Então:
  // se o campo ainda tem a sugestão do sistema (ou está vazio), entra a
  // sugestão do tom novo; se a pessoa escreveu a própria progressão, ela é
  // TRANSPOSTA para o tom novo — o trabalho dela não se perde.

  function tonalidadeAtual() {
    var v = document.getElementById('input-tonalidade').value.split('|');
    return { tonic: v[0], mode: v[1] };
  }

  function notaDaProgressao(texto) {
    var el = document.getElementById('progressao-nota');
    if (el) { el.textContent = texto || ''; el.hidden = !texto; }
  }

  function preencherSugestao(t, motivo) {
    var lab = window.IL.lab;
    if (!lab || !lab.sugestaoPara) return;
    var s = lab.sugestaoPara(t.tonic, t.mode);
    document.getElementById('input-progressao').value = s.texto;
    state.sugestaoAtual = s.texto;
    notaDaProgressao((motivo || 'Sugestão em ' + t.tonic + ' ' + t.mode + ': ') + s.label +
      '. Se quiser outra, é só digitar por cima.');
  }

  function aoTrocarTonalidade() {
    var campo = document.getElementById('input-progressao');
    var antes = state.tonalidade;
    var agora = tonalidadeAtual();
    state.tonalidade = agora;
    var texto = campo.value.trim();

    if (!texto || texto === state.sugestaoAtual) {
      preencherSugestao(agora);
      if (state.lastResult) runAnalysis();
      return;
    }
    // Transpõe sempre a partir do que a pessoa DIGITOU, e do tom em que ela
    // digitou. Transpor em cima do resultado anterior acumularia grafias
    // tortas a cada troca de tom (Eb → F# → G → ...).
    var origem = state.progDigitada && state.progDigitada.tonic ? state.progDigitada : null;
    var base = origem ? origem.texto : campo.value;
    var deTom = origem ? origem.tonic : (antes && antes.tonic);
    if (!deTom) return;
    var novo = theory.transposeProgression(base, deTom, agora.tonic);
    campo.value = novo;
    state.sugestaoAtual = null;
    notaDaProgressao(novo.trim() === texto
      ? 'A sua progressão já estava em ' + agora.tonic + ' ' + agora.mode + '.'
      : 'A sua progressão foi transposta de ' + deTom + ' para ' + agora.tonic +
        '. Para começar do zero, limpe o campo (✕) e escolha o tom de novo.');
    if (state.lastResult) runAnalysis();
  }

  function setupForm() {
    document.getElementById('btn-analisar').addEventListener('click', runAnalysis);
    state.tonalidade = tonalidadeAtual();
    // o valor que já vem no HTML é a sugestão do tom padrão, completa em 5 acordes
    preencherSugestao(state.tonalidade);
    document.getElementById('input-tonalidade').addEventListener('change', aoTrocarTonalidade);
    // guarda o que a pessoa escreveu, e em que tom, para transpor a partir daí
    document.getElementById('input-progressao').addEventListener('input', function () {
      var v = this.value;
      state.progDigitada = (v.trim() && v !== state.sugestaoAtual)
        ? { texto: v, tonic: tonalidadeAtual().tonic } : null;
    });
    document.getElementById('input-progressao').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runAnalysis();
    });
    document.getElementById('btn-clear').addEventListener('click', function () {
      document.getElementById('input-progressao').value = '';
      state.sugestaoAtual = null;
      notaDaProgressao('Campo limpo. Escolha a tonalidade ali em cima para receber a sugestão dela.');
      showFormError(null);
    });
  }

  // Rodapé com os instrumentos (Etapa 5): clicar num instrumento "ativo"
  // seleciona ele no formulário e já atualiza a aba Fraseados.
  function highlightInstrumentBar() {
    var current = document.getElementById('input-instrumento').value;
    document.querySelectorAll('.instrument-bar .instr[data-instr]').forEach(function (span) {
      span.classList.toggle('selected', span.getAttribute('data-instr') === current);
    });
  }

  function setupInstrumentBar() {
    document.querySelectorAll('.instrument-bar .instr[data-instr]').forEach(function (span) {
      if (span.classList.contains('soon')) return;
      span.addEventListener('click', function () {
        var select = document.getElementById('input-instrumento');
        select.value = span.getAttribute('data-instr');
        // Dispara o listener de "change" já existente (recalcula a
        // realização/tab/partitura da aba Fraseados para o novo instrumento).
        select.dispatchEvent(new Event('change'));
      });
    });
    document.getElementById('input-instrumento').addEventListener('change', highlightInstrumentBar);
    document.getElementById('input-instrumento').addEventListener('change', espalharInstrumento);
    highlightInstrumentBar();
    espalharInstrumento();
  }

  // O instrumento é um só para o site inteiro: escolher aqui vale também na
  // Biblioteca de Escalas, na de Fraseados, nos Padrões e na Transcrição (cada
  // uma dessas telas já empurrava a escolha dela para cá; agora vai nos dois
  // sentidos). O valor é trocado em silêncio — a tela se redesenha quando você
  // entra nela, e assim a Transcrição não reprocessa o áudio sem necessidade.
  function espalharInstrumento() {
    var v = document.getElementById('input-instrumento').value;
    ['esc-instrumento', 'lib-instrumento', 'pad-instrumento', 'tra-instrumento'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (sel && sel.value !== v) sel.value = v;
    });
  }

  // Planos (Etapa 5): reage à troca manual de Nível e ao link "Ver planos"
  // dentro do aviso de bloqueio (leva direto para Configurações).
  function setupPlanGate() {
    document.getElementById('input-nivel').addEventListener('change', updateNivelGateUI);
    var link = document.querySelector('#nivel-gate-note a[data-nav="config"]');
    if (link) {
      link.addEventListener('click', function (ev) {
        ev.preventDefault();
        var navConfig = document.querySelector('.nav-item[data-nav="config"]');
        if (navConfig) navConfig.click();
      });
    }
    updateNivelGateUI();
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildTonalidadeOptions();
    setupTabs();
    setupNav();
    setupMenuCelular();
    setupForm();
    setupFraseados();
    setupAudioProgressao();
    setupTransport();
    setupInstrumentBar();
    setupPlanGate();
    setupAulas();
    setupSom();
    runAnalysis(); // já mostra um exemplo ao abrir, como no layout de referência
  });

  // Seletor de som (realista / com drive / sintetizado) + pré-carga dos
  // samples do instrumento atual, para o primeiro "play" já sair rápido.
  function setupSom() {
    var sel = document.getElementById('som-modo');
    if (!sel || !audio || !audio.setSoundMode) return;
    sel.value = audio.getSoundMode();
    sel.addEventListener('change', function () {
      audio.stopAll();
      resetAudioButtons();
      audio.setSoundMode(sel.value);
      audio.preload(document.getElementById('input-instrumento').value);
    });
    document.getElementById('input-instrumento').addEventListener('change', function () {
      audio.preload(document.getElementById('input-instrumento').value);
    });

    // Quanta sala (reverberação) entra no som.
    var amb = document.getElementById('som-ambiencia');
    if (amb && audio.setAmbience) {
      amb.value = audio.getAmbience();
      amb.addEventListener('change', function () {
        audio.stopAll();
        resetAudioButtons();
        audio.setAmbience(amb.value);
      });
    }

    setTimeout(function () { audio.preload(document.getElementById('input-instrumento').value); }, 1200);
  }

  // API mínima para a Etapa 4 (js/auth-ui.js) ler o estado atual e
  // acionar telas/ações sem duplicar a lógica de análise/fraseados aqui.
  window.IL = window.IL || {};
  window.IL.ui = {
    getState: function () { return state; },
    runAnalysis: runAnalysis,
    // Etapa 5 (Planos): js/auth-ui.js chama isso após login/logout/troca de
    // plano para revalidar o nível Avançado (exclusivo Pro).
    onAccountChange: updateNivelGateUI,
    // Etapa 5 (Aulas): js/auth-ui.js chama isso ao navegar para "Aulas" —
    // módulo livre, sem depender de conta/plano.
    renderAulasView: renderAulasView,
    // Biblioteca de Fraseados (js/library-ui.js) reaproveita o desenho da tablatura.
    buildTabText: buildTabText,
    isFrettedInstrument: isFrettedInstrument,
    switchTab: function (tabName) {
      document.querySelectorAll('.tab').forEach(function (t) {
        t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
      });
      document.querySelectorAll('.panel').forEach(function (p) {
        p.hidden = p.getAttribute('data-panel') !== tabName;
      });
    },
    transportOpts: function (key) { return transportOpts(key); },
    // Telas montadas dinamicamente (Biblioteca de Escalas) chamam isso depois
    // de injetar o HTML para ligar a barra de metrônomo/andamento/repetir.
    setupTransportBars: setupTransport,
    transportLoop: function (key) { var t = transport[key]; return !!(t && t.loop); },
    switchView: function (viewName) {
      document.querySelectorAll('.content.view').forEach(function (v) {
        v.hidden = v.getAttribute('data-view') !== viewName;
      });
    },
    // `titulo` (opcional): título salvo em favoritos/exercícios — dele saem
    // a "ideia" (variação) e o padrão fixo que estavam na tela ao salvar.
    selectPhrase: function (index, titulo) {
      if (titulo && phrasesMod.parseTitle) {
        var info = phrasesMod.parseTitle(titulo);
        if (info.variation || info.motif || info.style) {
          state.motif = info.motif || '';
          state.style = info.style || 'automatico';
          var selEst = document.getElementById('input-estilo-fraseado');
          if (selEst) selEst.value = state.style;
          renderMotifOptions(document.getElementById('input-nivel').value);
          state.variations = [];
          state.variations[index] = info.variation;
          regeneratePhrases();
        }
      }
      if (index < 0 || index >= state.phrases.length) return;
      state.selectedPhraseIndex = index;
      renderFraseadosList();
      renderFraseadoDetalhe();
    }
  };
})();
