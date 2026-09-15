/**
 * IMPROVIX — tela "Transcrição / Treino"
 *
 * Recebe um áudio (arquivo ou gravação), manda para js/transcribe.js e mostra
 * o solo escrito em seções: tablatura ou partitura, ouvir a transcrição,
 * ouvir o original daquele trecho, repetir em loop, metrônomo e andamento.
 *
 * As bibliotecas pesadas (vendor/) só são carregadas quando alguém realmente
 * manda um áudio — quem nunca abre esta tela não baixa nada disso.
 */
(function () {
  'use strict';

  var T = window.IL.transcribe;
  var notation = window.IL.notation;
  var audio = window.IL.audio;

  var VENDOR = ['vendor/tfjs.js', 'vendor/basic-pitch.js', 'vendor/modelo-notas.js'];

  var state = {
    built: false, carregando: false, buffer: null, nomeArquivo: '',
    resultado: null, tocando: null, pararOriginal: null,
    gravando: null, chunks: [], stream: null,
    // correção manual: nota escolhida e pilha de desfazer por seção
    selecao: null, historico: {}
  };

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function isFretted(i) { return window.IL.ui.isFrettedInstrument(i); }

  // ---------------- carga das bibliotecas ----------------
  var vendorPronto = null;
  function carregarVendor(aviso) {
    if (vendorPronto) return vendorPronto;
    vendorPronto = VENDOR.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (resolve, reject) {
          if (document.querySelector('script[data-vendor="' + src + '"]')) { resolve(); return; }
          if (aviso) aviso('carregando o detector de notas (uma vez só)');
          var s = document.createElement('script');
          s.src = src;
          s.setAttribute('data-vendor', src);
          s.onload = resolve;
          s.onerror = function () { reject(new Error('Não foi possível carregar ' + src + '. Confira se a pasta vendor/ veio junto com o site.')); };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve());
    vendorPronto.catch(function () { vendorPronto = null; });
    return vendorPronto;
  }

  // ---------------- montagem ----------------
  function build() {
    if (state.built) return;
    state.built = true;

    var mi = $('input-instrumento');
    if (mi) $('tra-instrumento').value = mi.value;

    $('tra-drop').addEventListener('click', function (ev) {
      if (ev.target.tagName !== 'INPUT') $('tra-arquivo').click();
    });
    $('tra-arquivo').addEventListener('change', function () {
      if (this.files && this.files[0]) receberArquivo(this.files[0]);
    });
    ['dragover', 'dragenter'].forEach(function (e) {
      $('tra-drop').addEventListener(e, function (ev) { ev.preventDefault(); $('tra-drop').classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (e) {
      $('tra-drop').addEventListener(e, function (ev) { ev.preventDefault(); $('tra-drop').classList.remove('is-over'); });
    });
    $('tra-drop').addEventListener('drop', function (ev) {
      if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) receberArquivo(ev.dataTransfer.files[0]);
    });

    $('tra-gravar').addEventListener('click', alternarGravacao);
    $('tra-origem').addEventListener('change', atualizarNotaGravacao);
    atualizarNotaGravacao();

    ['tra-instrumento', 'tra-bpm', 'tra-compassos'].forEach(function (id) {
      $(id).addEventListener('change', function () { if (state.buffer) processar(); });
    });
    $('tra-resultado').addEventListener('click', aoClicar);
    document.addEventListener('keydown', aoTeclado);
  }

  function atualizarNotaGravacao() {
    var pode = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    var origem = $('tra-origem').value;
    var nota = $('tra-gravar-nota');
    if (origem === 'aba' && !pode) {
      nota.innerHTML = '⚠️ Este navegador não captura o som de uma aba. Use o <strong>microfone</strong>, ' +
        'ou abra o IMPROVIX no Chrome ou no Edge.';
    } else if (origem === 'aba') {
      nota.innerHTML = 'Toque o vídeo numa outra aba, clique em gravar e escolha essa aba — ' +
        '<strong>marque "compartilhar o áudio da aba"</strong> na janela que aparecer. Clique de novo para parar.';
    } else {
      nota.innerHTML = 'Grava pelo microfone: serve para captar o som da caixa, ou para gravar <strong>você mesmo tocando</strong>.';
    }
  }

  // ---------------- entrada de áudio ----------------
  function estado(txt, pct) {
    var box = $('tra-estado');
    box.hidden = false;
    $('tra-estado-txt').textContent = txt;
    $('tra-barra-fill').style.width = Math.round((pct == null ? 0 : pct) * 100) + '%';
  }
  function limparEstado() { $('tra-estado').hidden = true; }

  function receberArquivo(file) {
    state.nomeArquivo = file.name || 'gravação';
    estado('abrindo o arquivo', 0.01);
    audio.decodeFile(file).then(function (buf) {
      if (buf.duration > 600) {
        erro('Esse áudio tem ' + Math.round(buf.duration / 60) + ' minutos. Corte um trecho de até 10 minutos ' +
          '(o ideal para estudar é 30 s a 2 min do solo).');
        return;
      }
      state.buffer = buf;
      processar();
    }).catch(function (e) { erro(e.message); });
  }

  function erro(msg) {
    limparEstado();
    $('tra-resultado').innerHTML = '<div class="tra-erro">⚠️ ' + esc(msg) + '</div>';
  }

  function alternarGravacao() {
    if (state.gravando) { pararGravacao(); return; }
    var origem = $('tra-origem').value;
    var pedir = origem === 'aba'
      ? navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      : navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });

    pedir.then(function (stream) {
      var faixas = stream.getAudioTracks();
      if (!faixas.length) {
        stream.getTracks().forEach(function (t) { t.stop(); });
        erro('Essa captura veio sem áudio. Na janela de compartilhamento, marque a opção de compartilhar o som da aba.');
        return;
      }
      state.stream = stream;
      var soAudio = new MediaStream(faixas);
      var rec = new MediaRecorder(soAudio);
      state.chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) state.chunks.push(e.data); };
      rec.onstop = function () {
        var blob = new Blob(state.chunks, { type: rec.mimeType || 'audio/webm' });
        stream.getTracks().forEach(function (t) { t.stop(); });
        state.stream = null;
        state.gravando = null;
        $('tra-gravar').textContent = '🎙 Gravar o que está tocando';
        $('tra-gravar').classList.remove('gravando');
        blob.name = 'gravação';
        receberArquivo(blob);
      };
      faixas[0].addEventListener('ended', function () { if (state.gravando) pararGravacao(); });
      rec.start();
      state.gravando = rec;
      $('tra-gravar').textContent = '⏹ Parar a gravação';
      $('tra-gravar').classList.add('gravando');
      estado('gravando… clique em "Parar" quando o trecho acabar', 0);
    }).catch(function (e) {
      erro('Não foi possível gravar: ' + (e && e.message ? e.message : 'permissão negada') + '.');
    });
  }
  function pararGravacao() { try { state.gravando.stop(); } catch (e) { /* já parou */ } }

  // ---------------- transcrição ----------------
  function processar() {
    if (!state.buffer || state.carregando) return;
    state.carregando = true;
    state.selecao = null;
    state.historico = {};
    state.registro = null;
    pararTudo();
    $('tra-resultado').innerHTML = '';
    estado('preparando', 0.01);

    var bpmSel = $('tra-bpm').value;
    var opts = {
      instrumento: $('tra-instrumento').value,
      compassos: Number($('tra-compassos').value) || 4,
      onProgresso: function (p, etapa) { estado(etapa, p); }
    };
    if (bpmSel !== 'auto') opts.bpm = Number(bpmSel);

    carregarVendor(function (t) { estado(t, 0.02); })
      .then(function () { return T.transcrever(state.buffer, opts); })
      .then(function (res) {
        state.resultado = res;
        state.carregando = false;
        limparEstado();
        render();
      })
      .catch(function (e) {
        state.carregando = false;
        erro(e && e.message ? e.message : String(e));
      });
  }

  // ---------------- registro do solo ----------------
  // O detector ouve tudo o que toca. Quando há banda, o baixo e a mão esquerda
  // do piano entram na linha. Dizer onde o solo mora resolve boa parte disso —
  // e é instantâneo: a rede neural já rodou, aqui é só filtrar e remontar.

  function nomeComOitava(m) {
    var bemol = !!(state.resultado && state.resultado.tom && state.resultado.tom.bemol);
    return T.nomeDeMidi(m, bemol) + (Math.floor(m / 12) - 1);
  }

  function opcoesNota(sel, de, ate) {
    var o = '';
    for (var m = de; m <= ate; m++) {
      o += '<option value="' + m + '"' + (m === sel ? ' selected' : '') + '>' + esc(nomeComOitava(m)) + '</option>';
    }
    return o;
  }

  function registroHTML() {
    var r = state.resultado;
    if (!r || !r.melodia || !r.melodia.length) return '';
    var faixa = T.FAIXA[$('tra-instrumento').value] || T.FAIXA.guitarra;
    var reg = state.registro || r.registro;
    var cheio = !state.registro;
    return '<div class="tra-registro">' +
      '<div class="tra-registro-tit">Onde está o solo</div>' +
      '<label>da <select id="tra-reg-min">' + opcoesNota(reg.min, faixa[0], faixa[1]) + '</select></label>' +
      '<label>até <select id="tra-reg-max">' + opcoesNota(reg.max, faixa[0], faixa[1]) + '</select></label>' +
      (cheio ? '' : '<button class="view-btn" data-act="reg-solta">↺ soltar</button>') +
      '<small>Aperte a faixa quando o baixo ou o piano entrarem na transcrição: ' +
      'nota fora daí some na hora, sem ouvir o áudio de novo.</small>' +
      '</div>';
  }

  function aplicarRegistro(min, max, solto) {
    var r = state.resultado;
    if (!r || !r.melodia) return;
    if (min > max) { var t = min; min = max; max = t; }
    var corrigidas = 0;
    r.secoes.forEach(function (s) {
      s.eventos.forEach(function (e) { if (e.corrigida) corrigidas++; });
    });
    state.registro = solto ? null : { min: min, max: max };
    var mel = T.noRegistro(r.melodia, state.registro);
    if (!mel.length) { alertaInline('Nenhuma nota sobrou nessa faixa.'); state.registro = null; render(); return; }
    var bpmSel = $('tra-bpm').value;
    var m = T.montar(mel, {
      bpm: bpmSel === 'auto' ? 0 : Number(bpmSel),
      compassos: Number($('tra-compassos').value) || 4
    });
    r.bpm = m.bpm; r.confiancaAndamento = m.confiancaAndamento; r.tom = m.tom;
    r.eventos = m.eventos; r.secoes = m.secoes; r.notas = m.eventos.length;
    state.selecao = null; state.historico = {};
    pararTudo();
    render();
    if (corrigidas) alertaInline('As ' + corrigidas + ' correções manuais foram refeitas do zero, porque as seções mudaram.');
  }

  // ---------------- desenho ----------------
  function secaoHTML(s, instrument, bpm) {
    var corpo;
    var evs = T.comPausas(s.eventos);
    if (isFretted(instrument)) {
      var pr = notation.prepareForInstrument(s.eventos, instrument);
      corpo = '<pre class="tab-block">' + notation.renderTabText(pr.events, pr.tab, instrument) + '</pre>';
    } else {
      corpo = '<div class="staff-block lib-staff">' + notation.toRhythmStaffSVG(notation.centerForStaff(evs)) + '</div>';
    }
    var sel = (state.selecao && state.selecao.sec === s.indice) ? state.selecao.nota : -1;
    var notas = s.eventos.map(function (e, i) {
      return '<button class="tra-nota' + (i === sel ? ' sel' : '') + (e.corrigida ? ' corrigida' : '') + '"' +
        ' data-act="nota" data-i="' + s.indice + '" data-n="' + i + '"' +
        ' title="clique para corrigir esta nota">' + esc(e.name) + '</button>';
    }).join('');

    var editor = sel >= 0
      ? '<div class="tra-editor">' +
        '<span class="tra-editor-alvo">' + esc(s.eventos[sel].name) + '</span>' +
        '<button class="view-btn" data-act="mover" data-i="' + s.indice + '" data-d="1">♯ +½ tom</button>' +
        '<button class="view-btn" data-act="mover" data-i="' + s.indice + '" data-d="-1">♭ −½ tom</button>' +
        '<button class="view-btn" data-act="mover" data-i="' + s.indice + '" data-d="12">↑ oitava</button>' +
        '<button class="view-btn" data-act="mover" data-i="' + s.indice + '" data-d="-12">↓ oitava</button>' +
        '<button class="view-btn" data-act="apagar" data-i="' + s.indice + '">🗑 apagar</button>' +
        '<button class="view-btn" data-act="ouvir-nota" data-i="' + s.indice + '">🔊 ouvir só ela</button>' +
        (state.historico[s.indice] && state.historico[s.indice].length
          ? '<button class="view-btn" data-act="desfazer" data-i="' + s.indice + '">↩ desfazer</button>' : '') +
        '<small>ou use as setas ↑ ↓ do teclado; ← → andam de nota</small>' +
        '</div>'
      : '';

    var corrigidas = s.eventos.filter(function (e) { return e.corrigida; }).length;
    return '<div class="lib-card tra-secao" data-sec="' + s.indice + '">' +
      '<div class="lib-card-head">' +
      '<div class="lib-card-title">Seção ' + (s.indice + 1) + ' — compassos ' + s.compasso +
      (s.compassoFim > s.compasso ? '–' + s.compassoFim : '') + '</div>' +
      '<div class="lib-card-actions">' +
      '<button class="view-btn" data-act="ouvir" data-i="' + s.indice + '" data-label="🔊 Transcrição">🔊 Transcrição</button>' +
      '<button class="view-btn" data-act="original" data-i="' + s.indice + '" data-label="🎧 Original">🎧 Original</button>' +
      '<button class="view-btn" data-act="exercicio" data-i="' + s.indice + '">⭐ Treinar</button>' +
      '</div></div>' +
      '<p class="si-legend">' + s.eventos.length + ' notas · ' +
      s.inicioSegundos.toFixed(1) + 's a ' + s.fimSegundos.toFixed(1) + 's do áudio' +
      (corrigidas ? ' · ' + corrigidas + ' corrigida' + (corrigidas > 1 ? 's' : '') + ' por você' : '') + '</p>' +
      '<div class="lib-card-body">' + corpo + '</div>' +
      '<div class="tra-notas"><strong>Notas</strong> <small>(clique numa para corrigir)</small>' +
      '<div class="tra-notas-linha">' + notas + '</div></div>' +
      editor +
      '</div>';
  }

  function render() {
    var r = state.resultado;
    if (!r) return;
    var instrument = $('tra-instrumento').value;
    var conf = Math.round((r.confiancaAndamento || 0) * 100);
    var tom = r.tom;

    var resumo =
      '<div class="tra-resumo">' +
      '<div class="n"><span>notas encontradas</span><b>' + r.notas + '</b></div>' +
      '<div class="n"><span>seções para treinar</span><b>' + r.secoes.length + '</b></div>' +
      '<div class="n"><span>andamento</span><b>' + r.bpm + ' bpm</b><small>' +
      ($('tra-bpm').value === 'auto' ? 'detectado (confiança ' + conf + '%)' : 'escolhido por você') + '</small></div>' +
      (tom ? '<div class="n"><span>parece estar em</span><b>' + esc(tom.maior) + ' maior</b><small>' +
        esc(tom.menor) + ' menor · ' + Math.round(tom.cobertura * 100) + '% das notas cabem na escala</small></div>' : '') +
      '</div>';

    var aviso = '';
    if (r.tom && r.tom.cobertura < 0.72) {
      aviso = '<p class="tra-aviso">Boa parte das notas ficou fora de uma escala só. Isso acontece em solo ' +
        'muito cromático — e também quando a gravação tem a banda inteira tocando junto, que confunde o detector. ' +
        'Confira ouvindo a transcrição ao lado do original: o que estiver errado, corrija de ouvido (faz parte do estudo).</p>';
    }
    if ($('tra-bpm').value === 'auto' && conf < 45) {
      aviso += '<p class="tra-aviso">O andamento foi difícil de medir aqui. Se os compassos saírem tortos, ' +
        'escolha o bpm na mão ali em cima — a divisão em seções melhora na hora.</p>';
    }

    var html =
      '<div class="tra-cabeca"><h3 class="esc-sub">' + esc(state.nomeArquivo) + '</h3>' +
      '<span class="lib-badge">' + r.duracao.toFixed(1) + ' s de áudio</span></div>' +
      resumo + registroHTML() + aviso +
      '<div class="transport" data-transport="transcricao">' +
      '<button type="button" class="tr-btn tr-metro" data-act="metro" title="Metrônomo" aria-pressed="false">⏱</button>' +
      '<button type="button" class="tr-btn" data-act="menos" title="Mais devagar">−</button>' +
      '<span class="tr-bpm"><input type="number" class="tr-bpm-input" min="40" max="240" step="1" value="' + r.bpm + '" aria-label="Andamento em bpm"/><small>bpm</small></span>' +
      '<button type="button" class="tr-btn" data-act="mais" title="Mais rápido">+</button>' +
      '<button type="button" class="tr-btn tr-loop" data-act="loop" title="Repetir" aria-pressed="false">🔁</button>' +
      '<small class="tra-dica-transporte">vale para o botão “Transcrição” de cada seção</small>' +
      '</div>' +
      '<p class="dica-rolar">↔ no celular, deslize a partitura/tablatura para o lado</p>' +
      '<div class="lib-lista">' +
      r.secoes.map(function (s) { return secaoHTML(s, instrument, r.bpm); }).join('') +
      '</div>';

    $('tra-resultado').innerHTML = html;
    ['tra-reg-min', 'tra-reg-max'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', function () {
        aplicarRegistro(Number($('tra-reg-min').value), Number($('tra-reg-max').value));
      });
    });
    if (window.IL.ui.setupTransportBars) window.IL.ui.setupTransportBars();
    // A barra tem de nascer no andamento desta transcrição (detectado ou
    // escolhido) — senão ela toca a frase no bpm da última vez que foi usada.
    var input = document.querySelector('.transport[data-transport="transcricao"] .tr-bpm-input');
    if (input) { input.value = r.bpm; input.dispatchEvent(new Event('change')); }
  }

  // ---------------- ações ----------------
  function pararTudo() {
    if (audio) audio.stopAll();
    if (state.pararOriginal) { try { state.pararOriginal(); } catch (e) { /* ignora */ } state.pararOriginal = null; }
    state.tocando = null;
    document.querySelectorAll('#tra-resultado .playing').forEach(function (b) {
      b.classList.remove('playing');
      b.textContent = b.getAttribute('data-label') || '🔊';
    });
  }

  function opts() {
    var t = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('transcricao') : { bpm: state.resultado.bpm };
    return { bpm: t.bpm || state.resultado.bpm, metronome: t.metronome, loop: t.loop, humanize: false };
  }

  function tocarSecao(btn, s) {
    var tag = 'sec' + s.indice;
    if (state.tocando === tag) { pararTudo(); return; }
    pararTudo();
    var instrument = $('tra-instrumento').value;
    var prep = notation.prepareForInstrument(s.eventos, instrument);
    state.tocando = tag;
    btn.classList.add('playing');
    btn.textContent = '⏸ Parar';
    var o = opts();
    // o "repetir" da barra é feito dentro do motor de áudio, sem buraco
    audio.playEvents(prep.events, instrument, o, function () {
      if (state.tocando === tag) pararTudo();
    });
  }

  function tocarOriginal(btn, s) {
    var tag = 'orig' + s.indice;
    if (state.tocando === tag) { pararTudo(); return; }
    pararTudo();
    state.tocando = tag;
    btn.classList.add('playing');
    btn.textContent = '⏸ Parar';
    var folga = 0.15;
    state.pararOriginal = audio.playBuffer(state.buffer,
      Math.max(0, s.inicioSegundos - folga), s.fimSegundos + folga, function () {
        if (state.tocando === tag) pararTudo();
      });
  }

  function salvarExercicio(s) {
    var acc = window.IL.account;
    if (!acc || !acc.isLoggedIn()) {
      alertaInline('Entre na sua conta para guardar a seção em Meus Exercícios.');
      return;
    }
    var db = window.IL.db;
    var titulo = 'Transcrição — ' + state.nomeArquivo + ' · seção ' + (s.indice + 1);
    db.saveExercicio({
      titulo: titulo,
      tonalidade: state.resultado.tom ? state.resultado.tom.maior : 'C',
      modo: 'maior',
      progressao: s.eventos.map(function (e) { return e.name; }).join(' '),
      instrumento: $('tra-instrumento').value,
      nivel: 'intermediario',
      phraseIndex: s.indice
    }).then(function (res) {
      alertaInline(res && res.error ? res.error.message : 'Seção guardada em Meus Exercícios.');
    }).catch(function (e) { alertaInline(e.message); });
  }

  function alertaInline(msg) {
    var box = document.createElement('div');
    box.className = 'tra-aviso tra-flash';
    box.textContent = msg;
    $('tra-resultado').insertBefore(box, $('tra-resultado').firstChild);
    setTimeout(function () { box.remove(); }, 4000);
  }

  // ---------------- correção manual ----------------
  // Nenhum detector acerta 100%. Aqui a pessoa clica na nota errada e conserta
  // de ouvido — que é, aliás, a parte que ensina.

  function guardarParaDesfazer(sec) {
    var s = state.resultado.secoes[sec];
    state.historico[sec] = state.historico[sec] || [];
    state.historico[sec].push(s.eventos.map(function (e) {
      return { name: e.name, midi: e.midi, onset: e.onset, dur: e.dur, vel: e.vel,
        segundos: e.segundos, corrigida: e.corrigida };
    }));
    if (state.historico[sec].length > 40) state.historico[sec].shift();
  }

  function moverNota(sec, delta) {
    var s = state.resultado.secoes[sec];
    var n = state.selecao && state.selecao.sec === sec ? state.selecao.nota : -1;
    var e = s.eventos[n];
    if (!e) return;
    var novo = e.midi + delta;
    var faixa = T.FAIXA[$('tra-instrumento').value] || T.FAIXA.guitarra;
    if (novo < faixa[0] || novo > faixa[1]) { alertaInline('Essa nota sairia da faixa do instrumento.'); return; }
    guardarParaDesfazer(sec);
    e.midi = novo;
    e.name = T.nomeDeMidi(novo, !!(state.resultado.tom && state.resultado.tom.bemol));
    e.corrigida = true;
    render();
    tocarNota(e);
  }

  function apagarNota(sec) {
    var s = state.resultado.secoes[sec];
    var n = state.selecao && state.selecao.sec === sec ? state.selecao.nota : -1;
    if (n < 0 || !s.eventos[n]) return;
    if (s.eventos.length <= 1) { alertaInline('A seção ficaria vazia.'); return; }
    guardarParaDesfazer(sec);
    s.eventos.splice(n, 1);
    state.selecao = { sec: sec, nota: Math.min(n, s.eventos.length - 1) };
    render();
  }

  function desfazer(sec) {
    var pilha = state.historico[sec];
    if (!pilha || !pilha.length) return;
    state.resultado.secoes[sec].eventos = pilha.pop();
    render();
  }

  function tocarNota(e) {
    if (!e) return;
    var instrument = $('tra-instrumento').value;
    var prep = notation.prepareForInstrument([{ name: e.name, midi: e.midi, onset: 0, dur: 1, vel: 0.9 }], instrument);
    audio.playEvents(prep.events, instrument, { bpm: 120 }, function () { /* nota curta */ });
  }

  function andarSelecao(d) {
    if (!state.selecao) return;
    var s = state.resultado.secoes[state.selecao.sec];
    var n = Math.max(0, Math.min(s.eventos.length - 1, state.selecao.nota + d));
    state.selecao = { sec: state.selecao.sec, nota: n };
    render();
    tocarNota(s.eventos[n]);
  }

  function aoTeclado(ev) {
    if (!state.selecao || !state.resultado) return;
    var tela = document.querySelector('.content.view[data-view="transcricao"]');
    if (!tela || tela.hidden) return;
    var sec = state.selecao.sec;
    if (ev.key === 'ArrowUp') { ev.preventDefault(); moverNota(sec, ev.shiftKey ? 12 : 1); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); moverNota(sec, ev.shiftKey ? -12 : -1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); andarSelecao(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); andarSelecao(-1); }
    else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); apagarNota(sec); }
    else if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); desfazer(sec); }
    else if (ev.key === 'Escape') { state.selecao = null; render(); }
  }

  function aoClicar(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || !state.resultado) return;
    var act = b.getAttribute('data-act');
    var i = Number(b.getAttribute('data-i'));
    var s = state.resultado.secoes[i];
    if (act === 'reg-solta') {
      var cheio = state.resultado.registro;
      aplicarRegistro(cheio.min, cheio.max, true);
      return;
    }
    if (act === 'ouvir' && s) tocarSecao(b, s);
    else if (act === 'original' && s) tocarOriginal(b, s);
    else if (act === 'exercicio' && s) salvarExercicio(s);
    else if (act === 'nota' && s) {
      var n = Number(b.getAttribute('data-n'));
      var jaEra = state.selecao && state.selecao.sec === i && state.selecao.nota === n;
      state.selecao = jaEra ? null : { sec: i, nota: n };
      render();
      if (!jaEra) tocarNota(s.eventos[n]);
    } else if (act === 'mover') moverNota(i, Number(b.getAttribute('data-d')));
    else if (act === 'apagar') apagarNota(i);
    else if (act === 'desfazer') desfazer(i);
    else if (act === 'ouvir-nota') {
      var sel = state.selecao && state.selecao.sec === i ? state.selecao.nota : -1;
      if (sel >= 0) tocarNota(s.eventos[sel]);
    }
  }

  function renderTranscricaoView() {
    build();
    if (state.resultado) render();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderTranscricaoView = renderTranscricaoView;
})();
