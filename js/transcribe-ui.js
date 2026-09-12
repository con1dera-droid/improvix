/**
 * ImprovisaLab — tela "Transcrição / Treino"
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
    gravando: null, chunks: [], stream: null
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
  }

  function atualizarNotaGravacao() {
    var pode = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    var origem = $('tra-origem').value;
    var nota = $('tra-gravar-nota');
    if (origem === 'aba' && !pode) {
      nota.innerHTML = '⚠️ Este navegador não captura o som de uma aba. Use o <strong>microfone</strong>, ' +
        'ou abra o ImprovisaLab no Chrome ou no Edge.';
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
    var notas = s.eventos.map(function (e) { return e.name; }).join(' ');
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
      s.inicioSegundos.toFixed(1) + 's a ' + s.fimSegundos.toFixed(1) + 's do áudio</p>' +
      '<div class="lib-card-body">' + corpo + '</div>' +
      '<p class="tra-notas"><strong>Notas:</strong> ' + esc(notas) + '</p>' +
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
      resumo + aviso +
      '<div class="transport" data-transport="transcricao">' +
      '<button type="button" class="tr-btn tr-metro" data-act="metro" title="Metrônomo" aria-pressed="false">⏱</button>' +
      '<button type="button" class="tr-btn" data-act="menos" title="Mais devagar">−</button>' +
      '<span class="tr-bpm"><input type="number" class="tr-bpm-input" min="40" max="240" step="1" value="' + r.bpm + '" aria-label="Andamento em bpm"/><small>bpm</small></span>' +
      '<button type="button" class="tr-btn" data-act="mais" title="Mais rápido">+</button>' +
      '<button type="button" class="tr-btn tr-loop" data-act="loop" title="Repetir" aria-pressed="false">🔁</button>' +
      '<small class="tra-dica-transporte">vale para o botão “Transcrição” de cada seção</small>' +
      '</div>' +
      '<div class="lib-lista">' +
      r.secoes.map(function (s) { return secaoHTML(s, instrument, r.bpm); }).join('') +
      '</div>';

    $('tra-resultado').innerHTML = html;
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
    return { bpm: t.bpm || state.resultado.bpm, metronome: t.metronome, humanize: false };
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
    function toca() {
      audio.playEvents(prep.events, instrument, o, function () {
        if (state.tocando !== tag) return;
        var tr = window.IL.ui.transportOpts ? window.IL.ui.transportLoop && window.IL.ui.transportLoop('transcricao') : false;
        if (tr && btn.classList.contains('playing')) { toca(); return; }
        pararTudo();
      });
    }
    toca();
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

  function aoClicar(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || !state.resultado) return;
    var act = b.getAttribute('data-act');
    var i = Number(b.getAttribute('data-i'));
    var s = state.resultado.secoes[i];
    if (act === 'ouvir' && s) tocarSecao(b, s);
    else if (act === 'original' && s) tocarOriginal(b, s);
    else if (act === 'exercicio' && s) salvarExercicio(s);
  }

  function renderTranscricaoView() {
    build();
    if (state.resultado) render();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderTranscricaoView = renderTranscricaoView;
})();
