/**
 * ImprovisaLab — motor da tela "Transcrição / Treino"
 *
 * Pega um áudio (arquivo ou gravação), tira dele a LINHA DE SOLO e devolve
 * seções prontas para treinar, no mesmo formato de eventos que o resto do
 * sistema usa (partitura, tablatura e áudio).
 *
 * O caminho é:
 *   áudio -> 22.050 Hz mono -> rede neural (Basic Pitch, vendor/) -> notas
 *   cruas -> extrairMelodia() -> andamento -> quantização -> seções.
 *
 * Tudo roda no navegador: o áudio não sai do computador de quem está usando.
 *
 * A parte de teoria (as funções puras) também roda no Node, para os testes —
 * só o pedaço que chama a rede neural precisa de navegador.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.IL = root.IL || {}; root.IL.transcribe = api; }
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var SR = 22050;                 // o modelo trabalha nessa taxa
  var NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var BEMOL = { 1: 'Db', 3: 'Eb', 6: 'Gb', 8: 'Ab', 10: 'Bb' };

  // Faixa útil de cada instrumento: nada fora disso pode ser a linha de solo.
  var FAIXA = {
    guitarra: [40, 88], violao: [40, 84], baixo: [28, 67], teclado: [21, 105],
    sax: [49, 84], trompete: [52, 86], violino: [55, 96], flauta: [60, 96],
    voz: [45, 84]
  };

  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
  function mediana(xs) { var s = xs.slice().sort(function (a, b) { return a - b; }); return s[Math.floor(s.length / 2)] || 0; }
  function quantil(xs, q) {
    var s = xs.slice().sort(function (a, b) { return a - b; });
    return s[Math.min(s.length - 1, Math.floor(s.length * q))] || 0;
  }

  // ---------------------------------------------------------------------
  // 1. Da saída crua para a linha de solo
  // ---------------------------------------------------------------------
  /**
   * O detector devolve tudo que soa: o solo, o acompanhamento e harmônicos
   * que ele confunde com notas. Aqui sobra só a linha melódica.
   *
   * Três limpezas, medidas em cima de gravações reais:
   *   a) blocos de acorde  — 3+ notas atacadas juntas e longas;
   *   b) harmônicos falsos — vêm bem mais fracos que o corpo da melodia;
   *   c) sobreposição      — a linha é uma nota por vez; num mesmo ataque
   *      fica a mais forte. Atenção: numa guitarra a nota SOA mais tempo do
   *      que o espaço até a próxima, então sobrepor no tempo é normal — o
   *      que denuncia harmônico é dividir o mesmo ATAQUE.
   */
  function extrairMelodia(notas, opts) {
    opts = opts || {};
    if (!notas || !notas.length) return [];
    var n = notas.slice().sort(function (a, b) { return a.startTimeSeconds - b.startTimeSeconds; });

    var durMed = mediana(n.map(function (x) { return x.durationSeconds; }));
    var acorde = [];
    n.forEach(function (a) {
      var juntas = n.filter(function (b) { return Math.abs(b.startTimeSeconds - a.startTimeSeconds) < 0.05; });
      if (juntas.length >= 3) {
        juntas.forEach(function (b) { if (b.durationSeconds > durMed * 1.8 && acorde.indexOf(b) < 0) acorde.push(b); });
      }
    });
    var m = n.filter(function (x) { return acorde.indexOf(x) < 0; });

    var durMed2 = mediana(m.map(function (x) { return x.durationSeconds; }));
    m = m.filter(function (x) { return x.durationSeconds <= durMed2 * 3.2; });

    var piso = quantil(m.map(function (x) { return x.amplitude; }), 0.75) * (opts.piso == null ? 0.78 : opts.piso);
    m = m.filter(function (x) { return x.amplitude >= piso; });

    var JUNTO = opts.junto == null ? 0.06 : opts.junto;
    var out = [];
    m.forEach(function (x) {
      var u = out[out.length - 1];
      if (!u) { out.push(x); return; }
      if (x.startTimeSeconds - u.startTimeSeconds < JUNTO) {
        var ganha = x.amplitude > u.amplitude * 1.05 ||
          (Math.abs(x.amplitude - u.amplitude) <= u.amplitude * 0.05 && x.pitchMidi > u.pitchMidi);
        if (ganha) out[out.length - 1] = x;
        return;
      }
      u.durationSeconds = Math.min(u.durationSeconds, x.startTimeSeconds - u.startTimeSeconds);
      out.push(x);
    });
    return out;
  }

  // ---------------------------------------------------------------------
  // 2. Andamento
  // ---------------------------------------------------------------------
  /**
   * Estima o andamento pelos ataques da própria melodia: procura o intervalo
   * que melhor explica as distâncias entre as notas. Não precisa de bateria.
   * Devolve { bpm, confianca } — confiança de 0 a 1.
   */
  function estimarAndamento(mel, opts) {
    opts = opts || {};
    var min = opts.min || 60, max = opts.max || 300;
    if (!mel || mel.length < 6) return { bpm: opts.padrao || 100, confianca: 0 };
    var ataques = mel.map(function (x) { return x.startTimeSeconds; });
    var gaps = [];
    for (var i = 1; i < ataques.length; i++) {
      var g = ataques[i] - ataques[i - 1];
      if (g > 0.04 && g < 2) gaps.push(g);
    }
    if (!gaps.length) return { bpm: opts.padrao || 100, confianca: 0 };

    // a menor unidade tocada com frequência (colcheia ou semicolcheia)
    var base = quantil(gaps, 0.25);
    var melhor = { bpm: opts.padrao || 100, pontos: -1 };
    [1, 2, 4].forEach(function (mult) {          // base = semínima / colcheia / semicolcheia
      var spb = base * mult;
      var bpm = 60 / spb;
      while (bpm < min) bpm *= 2;
      while (bpm > max) bpm /= 2;
      var passo = 60 / bpm;
      // quantos ataques caem perto de uma subdivisão de semicolcheia?
      var pontos = 0;
      ataques.forEach(function (t) {
        var r = (t / (passo / 4)) % 1;
        var d = Math.min(r, 1 - r);
        if (d < 0.18) pontos++;
      });
      if (pontos > melhor.pontos) melhor = { bpm: bpm, pontos: pontos };
    });
    return { bpm: Math.round(melhor.bpm), confianca: melhor.pontos / ataques.length };
  }

  // ---------------------------------------------------------------------
  // 3. Segundos -> compassos
  // ---------------------------------------------------------------------
  /** Converte a melodia em eventos do sistema, na grade escolhida. */
  function paraEventos(mel, bpm, opts) {
    opts = opts || {};
    var grade = opts.grade || 0.25;          // semicolcheia
    var spb = 60 / bpm;
    var t0 = opts.inicio != null ? opts.inicio : (mel.length ? mel[0].startTimeSeconds : 0);
    var bemol = !!opts.bemol;
    var evs = [];
    mel.forEach(function (x) {
      var onset = Math.round(((x.startTimeSeconds - t0) / spb) / grade) * grade;
      var dur = Math.round((x.durationSeconds / spb) / grade) * grade;
      if (dur < grade) dur = grade;
      if (onset < 0) onset = 0;
      var pc = ((x.pitchMidi % 12) + 12) % 12;
      var nome = (bemol && BEMOL[pc]) ? BEMOL[pc] : NOTAS[pc];
      var ant = evs[evs.length - 1];
      if (ant && onset <= ant.onset + 1e-9) return;   // duas notas na mesma casa: fica a primeira
      if (ant && ant.onset + ant.dur > onset) ant.dur = onset - ant.onset;
      evs.push({
        name: nome, midi: x.pitchMidi, onset: onset, dur: dur,
        vel: Math.max(0.35, Math.min(1, x.amplitude)),
        segundos: x.startTimeSeconds
      });
    });
    return evs;
  }

  /** Preenche os silêncios com pausas, para a partitura ficar honesta. */
  function comPausas(evs) {
    var out = [];
    var t = 0;
    evs.forEach(function (e) {
      if (e.onset > t + 1e-9) out.push({ rest: true, onset: t, dur: e.onset - t });
      out.push(e);
      t = e.onset + e.dur;
    });
    return out;
  }

  // ---------------------------------------------------------------------
  // 4. Seções de treino
  // ---------------------------------------------------------------------
  /**
   * Divide o solo em pedaços que dá para estudar: corta nas respiradas
   * (silêncios maiores) e, quando não houver respirada, a cada `compassos`
   * compassos, para nenhuma seção ficar longa demais.
   */
  function fatiar(evs, opts) {
    opts = opts || {};
    var porSecao = opts.compassos || 4;        // 4 compassos por seção
    var maxTempos = porSecao * 4;
    var respirada = opts.respirada || 1.5;     // silêncio (em tempos) que conta como fim de frase
    var secoes = [];
    var atual = [];
    var inicioTempo = 0;

    function fechar() {
      if (!atual.length) return;
      var ini = atual[0].onset;
      var fim = atual[atual.length - 1].onset + atual[atual.length - 1].dur;
      var compassoIni = Math.floor(ini / 4);
      secoes.push({
        indice: secoes.length,
        compasso: compassoIni + 1,
        inicioBeats: compassoIni * 4,
        fimBeats: Math.ceil(fim / 4) * 4,
        eventos: atual.map(function (e) {
          return {
            name: e.name, midi: e.midi, onset: e.onset - compassoIni * 4,
            dur: e.dur, vel: e.vel, segundos: e.segundos
          };
        })
      });
      atual = [];
    }

    evs.forEach(function (e) {
      if (atual.length) {
        var ant = atual[atual.length - 1];
        var silencio = e.onset - (ant.onset + ant.dur);
        var cheio = (e.onset + e.dur) - inicioTempo > maxTempos;
        if (silencio >= respirada || cheio) { fechar(); }
      }
      if (!atual.length) inicioTempo = Math.floor(e.onset / 4) * 4;
      atual.push(e);
    });
    fechar();

    // Junta as seções curtas demais com a vizinha: ninguém treina um pedaço
    // de duas notas. Junta com a seguinte quando as duas cabem no limite de
    // compassos; senão, com a anterior.
    var min = opts.minNotas || 6;
    var i = 0;
    while (secoes.length > 1 && i < secoes.length) {
      var s = secoes[i];
      if (s.eventos.length >= min) { i++; continue; }
      var prox = secoes[i + 1], ant = secoes[i - 1];
      var alvo = null;
      if (prox && prox.fimBeats - s.inicioBeats <= maxTempos + 4) alvo = prox;
      else if (ant && s.fimBeats - ant.inicioBeats <= maxTempos + 4) alvo = ant;
      else alvo = prox || ant;
      if (!alvo) break;
      var base = Math.min(alvo.inicioBeats, s.inicioBeats);
      var junta = (alvo === prox ? s : alvo).eventos.map(function (e, _, __, orig) { return e; });
      var a = (alvo.inicioBeats < s.inicioBeats) ? alvo : s;
      var b = (alvo.inicioBeats < s.inicioBeats) ? s : alvo;
      var evsJuntos = a.eventos.map(function (e) {
        return { name: e.name, midi: e.midi, onset: e.onset + a.inicioBeats - base, dur: e.dur, vel: e.vel, segundos: e.segundos };
      }).concat(b.eventos.map(function (e) {
        return { name: e.name, midi: e.midi, onset: e.onset + b.inicioBeats - base, dur: e.dur, vel: e.vel, segundos: e.segundos };
      }));
      alvo.eventos = evsJuntos;
      alvo.inicioBeats = base;
      alvo.fimBeats = Math.max(alvo.fimBeats, s.fimBeats);
      alvo.compasso = Math.floor(base / 4) + 1;
      secoes.splice(i, 1);
      if (alvo === ant) i = Math.max(0, i - 1);
    }
    secoes.forEach(function (s, k) {
      s.indice = k;
      s.compassos = Math.max(1, Math.round((s.fimBeats - s.inicioBeats) / 4));
      s.compassoFim = s.compasso + s.compassos - 1;
      s.inicioSegundos = s.eventos.length ? s.eventos[0].segundos : 0;
      var ult = s.eventos[s.eventos.length - 1];
      s.fimSegundos = ult ? ult.segundos + Math.max(0.2, ult.dur * 60 / (opts.bpm || 120)) : 0;
    });
    return secoes;
  }

  // ---------------------------------------------------------------------
  // 5. Que escala é essa?
  // ---------------------------------------------------------------------
  var MAIOR = [0, 2, 4, 5, 7, 9, 11];
  /**
   * Diz qual escala maior (e sua relativa menor) melhor explica as notas, e
   * quanto do que foi tocado cabe nela — o resto é cromatismo (ou erro).
   */
  function adivinharTom(evs) {
    var h = new Array(12).fill(0);
    evs.forEach(function (e) { if (!e.rest) h[((e.midi % 12) + 12) % 12] += e.dur; });
    var tot = h.reduce(function (a, b) { return a + b; }, 0);
    if (!tot) return null;
    var melhor = { cobertura: -1 };
    for (var t = 0; t < 12; t++) {
      var set = MAIOR.map(function (x) { return (x + t) % 12; });
      var c = h.reduce(function (a, v, i) { return a + (set.indexOf(i) >= 0 ? v : 0); }, 0) / tot;
      if (c > melhor.cobertura) melhor = { cobertura: c, tonica: t };
    }
    var usaBemol = [1, 3, 5, 8, 10].indexOf(melhor.tonica) >= 0;
    return {
      maior: (usaBemol && BEMOL[melhor.tonica]) ? BEMOL[melhor.tonica] : NOTAS[melhor.tonica],
      menor: NOTAS[(melhor.tonica + 9) % 12],
      cobertura: melhor.cobertura,
      bemol: usaBemol,
      notas: h.map(function (v, i) { return { nota: NOTAS[i], peso: v / tot }; })
        .sort(function (a, b) { return b.peso - a.peso; })
    };
  }

  // ---------------------------------------------------------------------
  // 6. Áudio (só no navegador)
  // ---------------------------------------------------------------------
  /** Reamostra para 22.050 Hz mono, que é o que o modelo espera. */
  function paraMono22k(audioBuffer) {
    var n = audioBuffer.numberOfChannels;
    var canais = [];
    for (var c = 0; c < n; c++) canais.push(audioBuffer.getChannelData(c));
    var origSR = audioBuffer.sampleRate;
    var razao = origSR / SR;
    var saidaLen = Math.floor(audioBuffer.length / razao);
    var out = new Float32Array(saidaLen);
    for (var i = 0; i < saidaLen; i++) {
      var pos = i * razao;
      var i0 = Math.floor(pos), frac = pos - i0, i1 = Math.min(i0 + 1, audioBuffer.length - 1);
      var soma = 0;
      for (var c2 = 0; c2 < n; c2++) soma += canais[c2][i0] * (1 - frac) + canais[c2][i1] * frac;
      out[i] = soma / n;
    }
    // normaliza pelo pico: gravação baixa atrapalha a detecção
    var pk = 0;
    for (var k = 0; k < out.length; k++) { var a = out[k] < 0 ? -out[k] : out[k]; if (a > pk) pk = a; }
    if (pk > 0.001 && pk < 0.9) { var g = 0.9 / pk; for (var j = 0; j < out.length; j++) out[j] *= g; }
    return out;
  }

  var modeloCarregado = null;
  function carregarModelo() {
    if (modeloCarregado) return modeloCarregado;
    modeloCarregado = new Promise(function (resolve, reject) {
      var tf = window.tf, dados = window.IL_MODELO_NOTAS;
      if (!tf || !dados || !window.BasicPitchLib) {
        reject(new Error('As bibliotecas de transcrição não carregaram (vendor/).'));
        return;
      }
      tf.ready().then(function () {
        var bin = atob(dados.weightDataB64);
        var buf = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return tf.loadGraphModel(tf.io.fromMemory({
          modelTopology: dados.modelTopology, weightSpecs: dados.weightSpecs, weightData: buf.buffer
        }));
      }).then(resolve, reject);
    });
    modeloCarregado.catch(function () { modeloCarregado = null; });
    return modeloCarregado;
  }

  /**
   * O caminho completo, no navegador.
   * `opts`: { instrumento, bpm, compassos, onProgresso(0..1, etapa) }
   */
  function transcrever(audioBuffer, opts) {
    opts = opts || {};
    var instrumento = opts.instrumento || 'guitarra';
    var faixa = FAIXA[instrumento] || FAIXA.guitarra;
    var prog = opts.onProgresso || function () {};

    prog(0.02, 'preparando o áudio');
    var audio = paraMono22k(audioBuffer);

    return carregarModelo().then(function (model) {
      prog(0.08, 'ouvindo o solo');
      var L = window.BasicPitchLib;
      var bp = new L.BasicPitch(Promise.resolve(model));
      var frames = [], onsets = [], contours = [];
      return bp.evaluateModel(audio,
        function (f, o, c) {
          for (var i = 0; i < f.length; i++) frames.push(f[i]);
          for (var j = 0; j < o.length; j++) onsets.push(o[j]);
          for (var k = 0; k < c.length; k++) contours.push(c[k]);
        },
        function (p) { prog(0.08 + p * 0.82, 'ouvindo o solo'); }
      ).then(function () {
        prog(0.92, 'separando a linha do solo');
        var cruas = L.outputToNotesPoly(frames, onsets, 0.45, 0.35, 5, true, hz(faixa[1] + 1), hz(faixa[0] - 1), true);
        cruas = L.addPitchBendsToNoteEvents(contours, cruas);
        var todas = L.noteFramesToTime(cruas).sort(function (a, b) { return a.startTimeSeconds - b.startTimeSeconds; });
        var mel = extrairMelodia(todas);

        prog(0.96, 'medindo o andamento');
        var and = opts.bpm ? { bpm: opts.bpm, confianca: 1 } : estimarAndamento(mel);
        var tom = null;
        var evs = paraEventos(mel, and.bpm, { bemol: false });
        tom = adivinharTom(evs);
        if (tom && tom.bemol) evs = paraEventos(mel, and.bpm, { bemol: true });

        prog(0.99, 'dividindo em seções');
        var secoes = fatiar(evs, { compassos: opts.compassos || 4 });
        prog(1, 'pronto');
        return {
          bpm: and.bpm, confiancaAndamento: and.confianca,
          instrumento: instrumento, tom: tom,
          duracao: audioBuffer.duration,
          notasCruas: todas.length, notas: evs.length,
          eventos: evs, secoes: secoes
        };
      });
    });
  }

  return {
    SR: SR,
    FAIXA: FAIXA,
    extrairMelodia: extrairMelodia,
    estimarAndamento: estimarAndamento,
    paraEventos: paraEventos,
    comPausas: comPausas,
    fatiar: fatiar,
    adivinharTom: adivinharTom,
    paraMono22k: paraMono22k,
    carregarModelo: carregarModelo,
    transcrever: transcrever
  };
}));
