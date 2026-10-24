/**
 * IMPROVIX — gravar o aluno tocando e conferir se saiu certo
 *
 * O caminho inteiro:
 *
 *   microfone -> MediaRecorder -> AudioBuffer -> js/transcribe.js (a mesma
 *   rede neural da tela de Transcrição) -> js/avaliar.js -> nota de 0 a 100
 *
 * Nada disso sai do computador de quem está usando: o áudio é processado no
 * próprio navegador e descartado no fim. O que vai para o banco é só um
 * número — a porcentagem de acerto.
 *
 * Duas honestidades que precisam estar escritas aqui, porque elas decidem se
 * alguém é liberado ou não:
 *
 * 1. O ACOMPANHAMENTO ENTRA PELO MICROFONE. Se o som sair pela caixa, o
 *    microfone ouve os acordes junto com o instrumento. O extrator de melodia
 *    (extrairMelodia, em js/transcribe.js) foi feito para separar a linha de
 *    solo de um acompanhamento, e é por isso que dá para tocar junto — mas
 *    com fone de ouvido o resultado é sempre melhor, e a tela diz isso.
 *
 * 2. A MÁQUINA ERRA. Som sujo, distorção pesada, instrumento longe do
 *    microfone, acorde tocado junto: tudo isso piora a leitura. Por isso a
 *    comparação é generosa (ver js/avaliar.js: ignora oitava e ritmo) e o
 *    aluno pode tentar quantas vezes quiser.
 */
(function () {
  'use strict';

  var CONTAGEM_COMPASSOS = 1;        // um compasso de contagem antes de começar
  var RABICHO_SEG = 0.9;             // um tiquinho a mais no fim, para a última nota caber

  function audio() { return window.IL.audio; }

  /** Quantos tempos o exercício ocupa, fechando no compasso (igual ao motor de áudio). */
  function tempos(eventos) {
    var fim = 0;
    (eventos || []).forEach(function (e) { fim = Math.max(fim, e.onset + e.dur); });
    return Math.max(4, Math.ceil((fim - 1e-6) / 4) * 4);
  }

  /** Carrega a rede neural (a mesma da tela de Transcrição), uma vez só. */
  function carregarMotor(aviso) {
    if (window.IL.ui && window.IL.ui.carregarVendorTranscricao) {
      return window.IL.ui.carregarVendorTranscricao(aviso);
    }
    return Promise.reject(new Error('O detector de notas não está disponível nesta página.'));
  }

  function pedirMicrofone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Este navegador não deixa gravar pelo microfone.'));
    }
    // Sem tratamento automático: cancelamento de eco e redução de ruído
    // "limpam" o sinal de um jeito que atrapalha reconhecer altura de nota.
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });
  }

  function gravarPor(stream, segundos, onFim) {
    var faixas = stream.getAudioTracks();
    var rec = new MediaRecorder(new MediaStream(faixas));
    var pedacos = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) pedacos.push(e.data); };
    rec.onstop = function () {
      stream.getTracks().forEach(function (t) { t.stop(); });
      onFim(new Blob(pedacos, { type: rec.mimeType || 'audio/webm' }));
    };
    rec.start();
    var parar = setTimeout(function () { try { rec.stop(); } catch (e) { /* já parou */ } }, segundos * 1000);
    return function cancelar() {
      clearTimeout(parar);
      try { rec.stop(); } catch (e) { /* já parou */ }
    };
  }

  function paraBuffer(blob) {
    var ac = audio().getContext();
    return blob.arrayBuffer().then(function (dados) {
      return new Promise(function (resolve, reject) {
        ac.decodeAudioData(dados, resolve, function () {
          reject(new Error('Não consegui ler o áudio gravado.'));
        });
      });
    });
  }

  /**
   * Toca a contagem e o acompanhamento enquanto a pessoa toca por cima.
   * Os eventos vão como PAUSA: assim o motor sabe o tamanho do trecho (o ciclo
   * fecha no compasso certo) sem tocar a melodia por cima de quem está tocando
   * — senão o microfone ouviria o site tocando o exercício e aprovaria todo
   * mundo, inclusive quem não encostou no instrumento.
   */
  function tocarAcompanhamento(opts) {
    var batidas = tempos(opts.eventos);
    var eventos = [{ rest: true, onset: 0, dur: batidas + CONTAGEM_COMPASSOS * 4 }];
    var acordes = (opts.chords || []).map(function (c) {
      return { beat: c.beat + CONTAGEM_COMPASSOS * 4, beats: c.beats, root: c.root, tones: c.tones };
    });
    audio().playEvents(eventos, opts.instrumento, {
      bpm: opts.bpm, metronome: true, loop: false,
      chords: opts.comAcompanhamento === false ? [] : acordes
    });
  }

  /**
   * Roda a gravação inteira.
   *
   * @param opts {
   *   eventos, chords, instrumento, bpm,
   *   comAcompanhamento: bool,
   *   onEstado: function(texto, 0..1)
   * }
   * @returns Promise com o resultado de IL.avaliar.avaliar(), mais { segundos }.
   */
  function rodar(opts) {
    var aviso = opts.onEstado || function () {};
    var batidas = tempos(opts.eventos);
    var porTempo = 60 / (opts.bpm || 80);
    var duracao = (batidas + CONTAGEM_COMPASSOS * 4) * porTempo + RABICHO_SEG;
    var contagemSeg = CONTAGEM_COMPASSOS * 4 * porTempo;
    var interrompido = false;

    aviso('preparando o detector de notas', 0.02);
    return carregarMotor(function (t) { aviso(t, 0.05); }).then(function () {
      aviso('pedindo o microfone', 0.1);
      return pedirMicrofone();
    }).then(function (stream) {
      return new Promise(function (resolve) {
        aviso('gravando — toque junto com a contagem', 0.15);
        var cancelar = gravarPor(stream, duracao, resolve);
        // Quem aperta PAUSE interrompe esta gravação. Não é pausa-e-continua:
        // a gravação anda colada ao acompanhamento, e retomar do meio
        // compararia o trecho errado com o exercício inteiro. Então o botão
        // encerra a tomada, e a pessoa recomeça quando quiser — o que ela
        // perde é a tentativa, não o progresso.
        opts.aoInterromper = function () {
          interrompido = true;
          audio().stopAll();
          cancelar();
        };
        if (opts.registrarCancelamento) opts.registrarCancelamento(opts.aoInterromper);
        tocarAcompanhamento(opts);
      });
    }).then(function (blob) {
      audio().stopAll();
      if (interrompido) {
        var e = new Error('Gravação interrompida.');
        e.interrompido = true;
        throw e;
      }
      aviso('ouvindo o que você tocou', 0.45);
      return paraBuffer(blob);
    }).then(function (buffer) {
      return window.IL.transcribe.transcrever(buffer, {
        instrumento: opts.instrumento,
        onProgresso: function (p, t) { aviso(t, 0.45 + p * 0.5); }
      });
    }).then(function (res) {
      aviso('comparando com o exercício', 0.97);
      var A = window.IL.avaliar;
      // Fora a contagem: o que foi tocado antes de o exercício começar não
      // conta nem a favor nem contra.
      var melodia = (res.melodia || []).filter(function (n) {
        return (n.startTimeSeconds || 0) >= contagemSeg - 0.25;
      });
      var ouvido = A.midisOuvidos(melodia);
      var esperado = A.midisEsperados(opts.eventos);
      var r = A.avaliar(esperado, ouvido, { bemol: !!opts.bemol });
      r.segundos = Math.round(duracao);
      r.notasOuvidas = ouvido.length;
      aviso('pronto', 1);
      return r;
    });
  }

  window.IL = window.IL || {};
  window.IL.gravacao = { rodar: rodar, tempos: tempos, CONTAGEM_COMPASSOS: CONTAGEM_COMPASSOS };
})();
