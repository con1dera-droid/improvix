/**
 * ImprovisaLab — áudio (Etapa 3)
 *
 * Síntese simples via Web Audio API — sem arquivos de áudio, sem servidor,
 * sem custo. Toca a progressão (acordes) como "backing" e cada fraseado
 * como uma linha melódica, usando timbres diferentes por instrumento.
 *
 * Só existe no navegador (a Web Audio API não roda no Node), por isso este
 * módulo não segue o padrão UMD dos outros — é sempre `window.IL.audio`.
 */
(function (root) {
  'use strict';

  var notation = root.IL.notation;

  var TIMBRES = {
    guitarra: { type: 'triangle', attack: 0.005, decay: 0.35, sustainLevel: 0.15, release: 0.15, gain: 0.22 },
    violao: { type: 'triangle', attack: 0.008, decay: 0.55, sustainLevel: 0.12, release: 0.25, gain: 0.22 },
    baixo: { type: 'triangle', attack: 0.01, decay: 0.5, sustainLevel: 0.2, release: 0.2, gain: 0.28 },
    teclado: { type: 'sine', attack: 0.01, decay: 0.9, sustainLevel: 0.25, release: 0.3, gain: 0.2, detuneLayer: true },
    // Sopros e cordas de arco: ataque um pouco mais lento (não é dedilhado/
    // percutido) e sustentação mais alta, já que a nota é "sustentada" pela
    // respiração/arco em vez de decair sozinha como uma corda dedilhada.
    sax: { type: 'sawtooth', attack: 0.04, decay: 0.25, sustainLevel: 0.55, release: 0.12, gain: 0.16 },
    trompete: { type: 'sawtooth', attack: 0.02, decay: 0.15, sustainLevel: 0.7, release: 0.08, gain: 0.17 },
    violino: { type: 'sawtooth', attack: 0.06, decay: 0.2, sustainLevel: 0.6, release: 0.15, gain: 0.16, detuneLayer: true },
    flauta: { type: 'sine', attack: 0.05, decay: 0.15, sustainLevel: 0.65, release: 0.15, gain: 0.19 }
  };

  var ctx = null;
  var activeNodes = [];
  var activeTimers = [];

  function getCtx() {
    if (!ctx) {
      var Ctor = root.AudioContext || root.webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function scheduleNote(audioCtx, freq, startTime, duration, timbre, destination) {
    var stopTime = startTime + duration;
    var g = timbre.gain;

    function layer(detuneCents, gainMul) {
      var osc = audioCtx.createOscillator();
      osc.type = timbre.type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (detuneCents) osc.detune.setValueAtTime(detuneCents, startTime);

      var gainNode = audioCtx.createGain();
      var peak = g * gainMul;
      var sustain = Math.max(0.0008, peak * timbre.sustainLevel);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(peak, startTime + timbre.attack);
      gainNode.gain.exponentialRampToValueAtTime(sustain, startTime + timbre.attack + timbre.decay);
      var releaseStart = Math.max(startTime + timbre.attack + timbre.decay, stopTime - timbre.release);
      gainNode.gain.setValueAtTime(sustain, releaseStart);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gainNode).connect(destination);
      osc.start(startTime);
      osc.stop(stopTime + 0.05);
      activeNodes.push(osc, gainNode);
    }

    layer(0, 1);
    if (timbre.detuneLayer) layer(6, 0.5);
  }

  function stopAll() {
    activeNodes.forEach(function (n) {
      try { n.stop && n.stop(0); } catch (e) { /* já parado */ }
      try { n.disconnect(); } catch (e) { /* ignora */ }
    });
    activeNodes = [];
    activeTimers.forEach(function (t) { clearTimeout(t); });
    activeTimers = [];
  }

  /**
   * Toca a progressão inteira como backing (acorde + fundamental grave).
   * `onChordStart(i)` é chamado no instante em que o acorde i começa a soar.
   * `onDone()` é chamado quando a progressão termina.
   */
  function playProgression(analysisResult, instrument, onChordStart, onDone) {
    stopAll();
    var audioCtx = getCtx();
    var timbre = TIMBRES[instrument] || TIMBRES.teclado;
    var chordDuration = 1.1;
    var gap = 0.03;

    var master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(audioCtx.destination);

    var chords = analysisResult.chords.filter(function (c) { return !c.error; });
    var t0 = audioCtx.currentTime + 0.05;

    chords.forEach(function (chord, i) {
      var startTime = t0 + i * (chordDuration + gap);

      var bassRealized = notation.realizeForInstrument([chord.root], 'baixo');
      scheduleNote(audioCtx, midiToFreq(bassRealized[0].midi - 12), startTime, chordDuration, TIMBRES.baixo, master);

      var chordRealized = notation.realizeForInstrument(chord.tones, 'teclado');
      chordRealized.forEach(function (n) {
        scheduleNote(audioCtx, midiToFreq(n.midi), startTime, chordDuration, timbre, master);
      });

      if (onChordStart) {
        var delayMs = Math.max(0, (startTime - audioCtx.currentTime) * 1000);
        activeTimers.push(setTimeout(function () { onChordStart(i); }, delayMs));
      }
    });

    if (onDone) {
      var totalMs = chords.length * (chordDuration + gap) * 1000 + 150;
      activeTimers.push(setTimeout(onDone, totalMs));
    }
  }

  /**
   * Toca um fraseado (lista de nomes de nota) como linha melódica.
   * `onNoteStart(i)` é chamado a cada nota; `onDone()` ao final.
   */
  function playPhrase(phrase, instrument, onNoteStart, onDone) {
    stopAll();
    var audioCtx = getCtx();
    var timbre = TIMBRES[instrument] || TIMBRES.teclado;
    var realized = notation.realizeForInstrument(phrase.notes, instrument);
    var noteDuration = 0.32;

    var master = audioCtx.createGain();
    master.gain.value = 0.9;
    master.connect(audioCtx.destination);

    var t0 = audioCtx.currentTime + 0.05;
    realized.forEach(function (n, i) {
      var startTime = t0 + i * noteDuration;
      scheduleNote(audioCtx, midiToFreq(n.midi), startTime, noteDuration * 0.92, timbre, master);
      if (onNoteStart) {
        var delayMs = Math.max(0, (startTime - audioCtx.currentTime) * 1000);
        activeTimers.push(setTimeout(function () { onNoteStart(i); }, delayMs));
      }
    });

    if (onDone) {
      activeTimers.push(setTimeout(onDone, realized.length * noteDuration * 1000 + 150));
    }
  }

  root.IL = root.IL || {};
  root.IL.audio = {
    playProgression: playProgression,
    playPhrase: playPhrase,
    stopAll: stopAll
  };
})(typeof window !== 'undefined' ? window : globalThis);
