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

  /**
   * Cópia da matriz de saída do modelo. É obrigatória: o `outputToNotesPoly`
   * do Basic Pitch ALTERA os arrays que recebe (zera as bandas de frequência
   * fora da faixa pedida), então uma segunda passada em cima dos mesmos dados
   * viria vazia.
   */
  function copiar(mat) {
    var out = new Array(mat.length);
    for (var i = 0; i < mat.length; i++) out[i] = mat[i].slice();
    return out;
  }

  // O modelo do Basic Pitch cobre de A0 (MIDI 21) a C8 (MIDI 108).
  var MODELO_MIDI_MIN = 21;
  var MODELO_MIDI_MAX = 108;

  /**
   * Limites de frequência a passar para o detector — ou `null` quando a faixa
   * do instrumento já encosta no limite do próprio modelo.
   *
   * Isso NÃO é preciosismo: o `constrainFrequency` do Basic Pitch calcula
   * `idx = hzToMidi(freq) - 21` e chama `array.fill(0, 0, idx)`. Se a nota
   * mais grave pedida for a MIDI 20 (um semitom abaixo do lá 0 do teclado),
   * o índice vira -1 — e `fill(0, 0, -1)` em JavaScript não zera "nada": conta
   * de trás para frente e apaga o array inteiro, fazendo a transcrição voltar
   * vazia. Acontecia com o Teclado/Piano, cuja faixa começa justamente na nota
   * mais grave que o modelo conhece.
   */
  function limitesHz(instrumento) {
    var f = FAIXA[instrumento] || FAIXA.guitarra;
    var lo = f[0] - 1, hi = f[1] + 1;
    return {
      min: lo > MODELO_MIDI_MIN ? hz(lo) : null,
      max: hi < MODELO_MIDI_MAX ? hz(hi) : null
    };
  }
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
  // Dois regimes de ajuste, escolhidos pela densidade de notas do material.
  // Medidos contra gabarito (solo escrito nota a nota, depois gerado em áudio
  // e transcrito às cegas), em 6 gravações — fusion rápido e bebop lento, com
  // e sem banda. Linha rápida precisa de limiar de ataque alto (senão o
  // acompanhamento entra) e nota mínima curta (senão as semicolcheias somem);
  // linha lenta precisa do contrário. Ver docs/status.md.
  // `junto` = largura do agrupamento de ataque. Linha rápida precisa de janela
  // curta (semicolcheia a 150 bpm dá 100 ms); linha lenta aguenta o dobro, e
  // com isso descarta o acompanhamento que ataca quase junto com o solo.
  var PERFIS = {
    rapido: { onset: 0.80, frame: 0.40, minLen: 2, piso: 0.40, junto: 0.06 },
    lento:  { onset: 0.65, frame: 0.50, minLen: 8, piso: 0.45, junto: 0.10 },
    neutro: { onset: 0.50, frame: 0.35, minLen: 4, piso: 0.50, junto: 0.06 }
  };
  var DENSIDADE_RAPIDO = 7;   // notas por segundo

  /** Qual perfil usar, dada a densidade medida na passada neutra. */
  function perfilPara(densidade) { return densidade >= DENSIDADE_RAPIDO ? PERFIS.rapido : PERFIS.lento; }

  /** Notas por segundo de uma linha já extraída. */
  function densidadeDe(mel) {
    if (!mel || mel.length < 4) return 0;
    var dur = mel[mel.length - 1].startTimeSeconds - mel[0].startTimeSeconds;
    return dur > 0.5 ? mel.length / dur : 0;
  }

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

    var piso = quantil(m.map(function (x) { return x.amplitude; }), 0.75) * (opts.piso == null ? PERFIS.neutro.piso : opts.piso);
    m = m.filter(function (x) { return x.amplitude >= piso; });

    // Monofônica pelo ATAQUE. Quando duas notas atacam juntas, a mais forte
    // costuma ser a do solo — mas nem sempre: o baixo e a mão esquerda do
    // piano batem forte. Por isso, se uma das duas estiver MUITO longe do
    // registro que o solo vinha ocupando (CONT semitons a mais que a outra),
    // o registro decide no lugar da força. Só desempata quando a diferença é
    // grande, para não atrapalhar solo com saltos largos de verdade.
    var JUNTO = opts.junto == null ? 0.06 : opts.junto;
    var CONT = opts.cont == null ? 12 : opts.cont;   // 0 desliga
    var CONT_K = 3;                                  // últimas notas que definem o registro
    var out = [], ult = [];
    function lembrar(x) { ult.push(x.pitchMidi); if (ult.length > CONT_K) ult.shift(); }
    m.forEach(function (x) {
      var u = out[out.length - 1];
      if (!u) { out.push(x); lembrar(x); return; }
      if (x.startTimeSeconds - u.startTimeSeconds < JUNTO) {
        var ganha = x.amplitude > u.amplitude * 1.05 ||
          (Math.abs(x.amplitude - u.amplitude) <= u.amplitude * 0.05 && x.pitchMidi > u.pitchMidi);
        if (CONT && ult.length >= 2) {
          var anteriores = ult.slice(0, -1);
          var ref = mediana(anteriores.length ? anteriores : ult);
          var dx = Math.abs(x.pitchMidi - ref), du = Math.abs(u.pitchMidi - ref);
          if (dx + CONT <= du) ganha = true;
          else if (du + CONT <= dx) ganha = false;
        }
        if (ganha) { out[out.length - 1] = x; ult[ult.length - 1] = x.pitchMidi; }
        return;
      }
      u.durationSeconds = Math.min(u.durationSeconds, x.startTimeSeconds - u.startTimeSeconds);
      out.push(x); lembrar(x);
    });

    // Fora do registro: nota isolada a mais de FORA_DIST semitons da mediana
    // das vizinhas (janela de FORA_JAN segundos) é quase sempre o baixo ou um
    // acorde do acompanhamento caindo num buraco da melodia.
    var FORA_DIST = opts.foraDist == null ? 12 : opts.foraDist;   // 0 desliga
    var FORA_JAN = 2;
    if (FORA_DIST) {
      var meio = FORA_JAN / 2;
      out = out.filter(function (x) {
        var viz = out.filter(function (y) {
          return y !== x && Math.abs(y.startTimeSeconds - x.startTimeSeconds) <= meio;
        });
        if (viz.length < 4) return true;
        var med = mediana(viz.map(function (y) { return y.pitchMidi; }));
        return Math.abs(x.pitchMidi - med) <= FORA_DIST;
      });
    }
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

  /** Nome de uma nota MIDI, com sustenidos ou bemóis conforme o tom. */
  function nomeDeMidi(midi, bemol) {
    var pc = ((midi % 12) + 12) % 12;
    return (bemol && BEMOL[pc]) ? BEMOL[pc] : NOTAS[pc];
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
  /**
   * Reamostra para 22.050 Hz mono (o que o modelo espera) e ATENUA o grave.
   *
   * O corte de grave não é enfeite: num áudio com banda, o baixo e a mão
   * esquerda do piano dominam a energia e o detector gasta atenção neles.
   * Medido contra gabarito no caso mais difícil (fusion rápido com banda e
   * bateria), a transcrição foi de 78,3 para 80,5 de F1. É uma prateleira
   * (-12 dB abaixo de 150 Hz), e não um corte seco, de propósito: atenuar
   * nunca apaga uma nota grave de verdade, só tira o peso dela. Um corte seco
   * em 120 Hz media um pouco melhor (81,0) mas comeria as notas abaixo do si 2.
   *
   * Usa o OfflineAudioContext do próprio navegador, que reamostra melhor do
   * que a interpolação linear que fazíamos à mão.
   */
  var GRAVE_HZ = 150, GRAVE_DB = -12;

  function normalizarPico(d) {
    var pk = 0;
    for (var k = 0; k < d.length; k++) { var a = d[k] < 0 ? -d[k] : d[k]; if (a > pk) pk = a; }
    if (pk > 0.001 && pk < 0.9) { var g = 0.9 / pk; for (var j = 0; j < d.length; j++) d[j] *= g; }
    return d;
  }

  function paraMono22kAsync(audioBuffer, root) {
    var OAC = root && (root.OfflineAudioContext || root.webkitOfflineAudioContext);
    if (!OAC) return Promise.resolve(paraMono22k(audioBuffer));
    try {
      var len = Math.max(1, Math.ceil(audioBuffer.duration * SR));
      var off = new OAC(1, len, SR);
      var src = off.createBufferSource();
      src.buffer = audioBuffer;
      var shelf = off.createBiquadFilter();
      shelf.type = 'lowshelf';
      shelf.frequency.value = GRAVE_HZ;
      shelf.gain.value = GRAVE_DB;
      src.connect(shelf).connect(off.destination);
      src.start();
      return off.startRendering().then(function (pronto) {
        return normalizarPico(pronto.getChannelData(0).slice());
      }, function () { return paraMono22k(audioBuffer); });
    } catch (e) {
      return Promise.resolve(paraMono22k(audioBuffer));
    }
  }

  /** Reserva: reamostragem simples, sem filtro (se o navegador não ajudar). */
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

  /** A nota mais grave e a mais aguda de uma linha já extraída. */
  function registroDe(mel) {
    if (!mel || !mel.length) return null;
    var lo = mel[0].pitchMidi, hi = lo;
    mel.forEach(function (x) { if (x.pitchMidi < lo) lo = x.pitchMidi; if (x.pitchMidi > hi) hi = x.pitchMidi; });
    return { min: lo, max: hi };
  }

  /** Só as notas dentro de um registro (inclusive). */
  function noRegistro(mel, reg) {
    if (!reg) return mel;
    return mel.filter(function (x) { return x.pitchMidi >= reg.min && x.pitchMidi <= reg.max; });
  }

  /**
   * Da linha de notas até as seções de treino: andamento, grafia, quantização
   * e fatiamento. Separado de `transcrever` para poder ser refeito na hora
   * quando o usuário aperta o registro do solo — sem rodar a rede de novo.
   * `opts`: { bpm, compassos }
   */
  function montar(mel, opts) {
    opts = opts || {};
    var and = opts.bpm ? { bpm: opts.bpm, confianca: 1 } : estimarAndamento(mel);
    var evs = paraEventos(mel, and.bpm, { bemol: false });
    var tom = adivinharTom(evs);
    if (tom && tom.bemol) evs = paraEventos(mel, and.bpm, { bemol: true });
    return {
      bpm: and.bpm, confiancaAndamento: and.confianca, tom: tom,
      eventos: evs, secoes: fatiar(evs, { compassos: opts.compassos || 4 })
    };
  }

  /**
   * O caminho completo, no navegador.
   * `opts`: { instrumento, bpm, compassos, onProgresso(0..1, etapa) }
   */
  function transcrever(audioBuffer, opts) {
    opts = opts || {};
    var instrumento = opts.instrumento || 'guitarra';
    var lim = limitesHz(instrumento);
    var prog = opts.onProgresso || function () {};

    prog(0.02, 'preparando o áudio');
    return paraMono22kAsync(audioBuffer, typeof window !== 'undefined' ? window : null).then(function (audio) {
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
        // Duas passadas. A primeira, neutra, só serve para medir quantas notas
        // por segundo esse material tem; a segunda usa o ajuste certo para o
        // regime (linha rápida x linha lenta). Custa quase nada: o caro é a
        // rede neural, que já rodou — daqui para a frente é só aritmética.
        function extrairCom(perfil) {
          var c = L.outputToNotesPoly(copiar(frames), copiar(onsets),
            perfil.onset, perfil.frame, perfil.minLen, true, lim.max, lim.min, true);
          c = L.addPitchBendsToNoteEvents(contours, c);
          var todas = L.noteFramesToTime(c).sort(function (a, b) { return a.startTimeSeconds - b.startTimeSeconds; });
          return { todas: todas, mel: extrairMelodia(todas, { piso: perfil.piso, junto: perfil.junto }) };
        }
        var primeira = extrairCom(PERFIS.neutro);
        var densidade = densidadeDe(primeira.mel);
        var perfil = opts.perfil || perfilPara(densidade);
        var r2 = (perfil === PERFIS.neutro) ? primeira : extrairCom(perfil);
        var todas = r2.todas;
        var mel = r2.mel;

        prog(0.96, 'medindo o andamento');
        var m = montar(mel, opts);
        prog(1, 'pronto');
        return {
          bpm: m.bpm, confiancaAndamento: m.confiancaAndamento,
          instrumento: instrumento, tom: m.tom,
          duracao: audioBuffer.duration,
          notasCruas: todas.length, notas: m.eventos.length,
          densidade: densidade, perfil: perfil === PERFIS.rapido ? 'rapido' : 'lento',
          melodia: mel, registro: registroDe(mel),
          eventos: m.eventos, secoes: m.secoes
        };
      });
    });
    });
  }

  return {
    SR: SR,
    FAIXA: FAIXA,
    limitesHz: limitesHz,
    PERFIS: PERFIS,
    perfilPara: perfilPara,
    densidadeDe: densidadeDe,
    extrairMelodia: extrairMelodia,
    registroDe: registroDe,
    noRegistro: noRegistro,
    montar: montar,
    estimarAndamento: estimarAndamento,
    paraEventos: paraEventos,
    comPausas: comPausas,
    nomeDeMidi: nomeDeMidi,
    fatiar: fatiar,
    adivinharTom: adivinharTom,
    paraMono22k: paraMono22k,
    paraMono22kAsync: paraMono22kAsync,
    carregarModelo: carregarModelo,
    transcrever: transcrever
  };
}));
