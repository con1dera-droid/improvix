/**
 * ImprovisaLab — áudio
 *
 * Dois motores de som, ambos 100% no navegador e sem custo:
 *   - "Realista" (padrão): samples de instrumentos de verdade (FluidR3 GM,
 *     licença CC BY 3.0 — ver sounds/CREDITOS.md), carregados sob demanda a
 *     partir de sounds/*.js. Funciona abrindo o index.html direto (file://),
 *     sem servidor, porque os samples vêm como scripts com data-URIs.
 *   - "Sintetizado": osciladores (o som antigo). Usado também como reserva
 *     se os samples não carregarem.
 *
 * Articulações tocadas de verdade (nos dois motores), a partir dos campos
 * `art` dos eventos (ver js/articulation.js):
 *   'h' hammer-on / 'p' pull-off  → a nota não é atacada de novo, só muda a
 *                                   altura (legato);
 *   'sl' slide                    → a altura desliza da nota anterior até esta;
 *   'b' bend (bendFrom)           → ataca a nota de baixo e "puxa" até a alvo;
 *   'r' release                   → volta do bend sem atacar;
 *   vibrato: true                 → oscila a altura depois do ataque;
 *   vel (0–1)                     → dinâmica (acentos, notas fantasma).
 *
 * Só existe no navegador (a Web Audio API não roda no Node) — é sempre
 * `window.IL.audio`.
 */
(function (root) {
  'use strict';

  var notation = root.IL.notation;

  var TIMBRES = {
    guitarra: { type: 'triangle', attack: 0.005, decay: 0.35, sustainLevel: 0.15, release: 0.15, gain: 0.22 },
    violao: { type: 'triangle', attack: 0.008, decay: 0.55, sustainLevel: 0.12, release: 0.25, gain: 0.22 },
    baixo: { type: 'triangle', attack: 0.01, decay: 0.5, sustainLevel: 0.2, release: 0.2, gain: 0.28 },
    teclado: { type: 'sine', attack: 0.01, decay: 0.9, sustainLevel: 0.25, release: 0.3, gain: 0.2, detuneLayer: true },
    sax: { type: 'sawtooth', attack: 0.04, decay: 0.25, sustainLevel: 0.55, release: 0.12, gain: 0.16 },
    trompete: { type: 'sawtooth', attack: 0.02, decay: 0.15, sustainLevel: 0.7, release: 0.08, gain: 0.17 },
    violino: { type: 'sawtooth', attack: 0.06, decay: 0.2, sustainLevel: 0.6, release: 0.15, gain: 0.16, detuneLayer: true },
    flauta: { type: 'sine', attack: 0.05, decay: 0.15, sustainLevel: 0.65, release: 0.15, gain: 0.19 }
  };

  // Instrumento do site → conjunto de samples em sounds/
  var SAMPLE_SET = {
    guitarra: 'guitarra', violao: 'violao', baixo: 'baixo', teclado: 'teclado',
    sax: 'sax', trompete: 'trompete', violino: 'violino', flauta: 'flauta'
  };
  // Volume relativo de cada conjunto de samples (equaliza as gravações).
  var SAMPLE_GAIN = {
    guitarra: 0.9, guitarra_drive: 0.55, violao: 1.0, baixo: 1.0, teclado: 0.8, piano_eletrico: 0.75,
    sax: 0.8, trompete: 0.7, violino: 0.75, flauta: 0.85
  };

  var ctx = null;
  var activeNodes = [];
  var activeTimers = [];
  var playToken = 0;

  var SOUND_MODES = ['real', 'drive', 'synth'];
  var soundMode = 'real';
  try { var saved = root.localStorage && root.localStorage.getItem('il_sound'); if (SOUND_MODES.indexOf(saved) >= 0) soundMode = saved; } catch (e) { /* sem storage */ }

  function getCtx() {
    if (!ctx) {
      var Ctor = root.AudioContext || root.webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') { try { ctx.resume(); } catch (e) { /* ignora */ } }
    return ctx;
  }

  // Safari/iOS e alguns Chrome só liberam o som dentro de um clique: ao
  // primeiro toque/tecla na página já "destrava" o contexto de áudio.
  if (root.document && root.addEventListener) {
    var unlock = function () {
      try { getCtx(); } catch (e) { /* sem Web Audio */ }
      root.removeEventListener('pointerdown', unlock, true);
      root.removeEventListener('keydown', unlock, true);
    };
    root.addEventListener('pointerdown', unlock, true);
    root.addEventListener('keydown', unlock, true);
  }

  // Saída: tudo passa por um compressor/limitador (volume forte sem estourar).
  var outBus = null;
  function getOut(ac) {
    if (outBus && outBus.context === ac) return outBus;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    var makeup = ac.createGain();
    makeup.gain.value = 1.25;
    comp.connect(makeup).connect(ac.destination);
    outBus = comp;
    return comp;
  }

  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  // ---------------------------------------------------------------------
  // Samples
  // ---------------------------------------------------------------------

  var buffers = {};   // conjunto -> [{midi, buffer, norm}]
  var LOAD_TIMEOUT_MS = 5000;
  var loading = {};   // conjunto -> Promise

  function setFor(instrument) {
    if (instrument === 'guitarra' && soundMode === 'drive') return 'guitarra_drive';
    return SAMPLE_SET[instrument] || 'teclado';
  }

  function loadScript(set) {
    return new Promise(function (resolve, reject) {
      root.IL_SAMPLES = root.IL_SAMPLES || {};
      if (root.IL_SAMPLES[set]) { resolve(); return; }
      var s = root.document.createElement('script');
      s.src = 'sounds/' + set + '.js';
      s.onload = function () { root.IL_SAMPLES[set] ? resolve() : reject(new Error('samples vazios: ' + set)); };
      s.onerror = function () { reject(new Error('não carregou sounds/' + set + '.js')); };
      root.document.head.appendChild(s);
    });
  }

  function decodeDataUri(ac, uri) {
    var b64 = uri.slice(uri.indexOf(',') + 1);
    var bin = root.atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Promise(function (resolve, reject) {
      var p = ac.decodeAudioData(bytes.buffer, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    });
  }

  function loadSet(set) {
    if (buffers[set]) return Promise.resolve(buffers[set]);
    if (loading[set]) return loading[set];
    var ac = getCtx();
    loading[set] = loadScript(set).then(function () {
      var data = root.IL_SAMPLES[set];
      var keys = Object.keys(data);
      return Promise.all(keys.map(function (k) {
        return decodeDataUri(ac, data[k]).then(function (buf) {
          // As gravações vêm baixinhas (pico ~0,1): normaliza cada nota pelo
          // pico, para todas soarem com o mesmo volume.
          var ch = buf.getChannelData(0), peak = 0;
          var n = Math.min(ch.length, Math.floor(buf.sampleRate * 1.2));
          for (var i = 0; i < n; i++) { var a = ch[i] < 0 ? -ch[i] : ch[i]; if (a > peak) peak = a; }
          return { midi: parseInt(k, 10), buffer: buf, norm: peak > 0.005 ? Math.min(14, 0.9 / peak) : 0 };
        }, function () { return null; });
      }));
    }).then(function (list) {
      // descarta amostras que não decodificaram ou vieram mudas
      list = list.filter(function (x) { return x && x.norm > 0; });
      if (!list.length) throw new Error('nenhuma amostra válida em ' + set);
      list.sort(function (a, b) { return a.midi - b.midi; });
      buffers[set] = list;
      return list;
    });
    loading[set].catch(function () { delete loading[set]; });
    return loading[set];
  }

  function nearestSample(set, midi) {
    var list = buffers[set];
    var best = list[0];
    list.forEach(function (s) { if (Math.abs(s.midi - midi) < Math.abs(best.midi - midi)) best = s; });
    return best;
  }

  /** Garante os samples necessários; resolve com true (samples) ou false (usar síntese). */
  function ensureSets(sets) {
    if (soundMode === 'synth' || typeof root.document === 'undefined') return Promise.resolve(false);
    var all = Promise.all(sets.map(loadSet)).then(function () { return true; }, function (err) {
      if (root.console) root.console.warn('ImprovisaLab: usando som sintetizado (' + (err && err.message) + ')');
      return false;
    });
    // Se os samples demorarem demais (computador lento, navegador que não
    // decodifica), toca já com o som sintetizado; os samples continuam
    // carregando e entram na próxima vez.
    var already = sets.every(function (s) { return !!buffers[s]; });
    if (already) return all;
    var timeout = new Promise(function (resolve) {
      setTimeout(function () { resolve('timeout'); }, LOAD_TIMEOUT_MS);
    });
    return Promise.race([all, timeout]).then(function (r) {
      if (r === 'timeout') {
        if (root.console) root.console.warn('ImprovisaLab: samples ainda carregando — tocando com som sintetizado desta vez');
        return false;
      }
      return r;
    });
  }

  // ---------------------------------------------------------------------
  // Uma "voz": uma nota atacada que pode mudar de altura (legato, slide,
  // bend) e ter vibrato antes de soltar.
  //   points: [{t, midi, glide}]  (t absoluto; glide = duração do deslize)
  // ---------------------------------------------------------------------

  function voiceSample(ac, set, v, dest) {
    var smp = nearestSample(set, v.points[0].midi);
    var src = ac.createBufferSource();
    src.buffer = smp.buffer;
    function rate(m) { return Math.pow(2, (m - smp.midi) / 12); }
    var p0 = v.points[0];
    src.playbackRate.setValueAtTime(rate(p0.midi), v.start);
    v.points.slice(1).forEach(function (p) {
      if (p.glide) {
        src.playbackRate.setValueAtTime(rate(p.fromMidi), p.t);
        src.playbackRate.linearRampToValueAtTime(rate(p.midi), p.t + p.glide);
      } else {
        src.playbackRate.setValueAtTime(rate(p.midi), p.t);
      }
    });
    var g = ac.createGain();
    var peak = (SAMPLE_GAIN[set] || 0.8) * v.vel * smp.norm * 0.55;
    var end = v.start + v.dur;
    var maxEnd = v.start + smp.buffer.duration / rate(p0.midi) - 0.02;
    if (end > maxEnd) end = maxEnd;
    g.gain.setValueAtTime(0.0001, v.start);
    g.gain.linearRampToValueAtTime(peak, v.start + 0.006);
    g.gain.setValueAtTime(peak, Math.max(v.start + 0.01, end - 0.07));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    // pequenos reataques dos hammer-ons (a nota "soa" um pouco mais)
    (v.accents || []).forEach(function (a) {
      g.gain.setValueAtTime(peak * a.level, a.t);
      g.gain.linearRampToValueAtTime(peak * a.level * 0.85, a.t + 0.08);
    });
    if (v.vibrato) {
      var lfo = ac.createOscillator();
      lfo.frequency.value = v.vibrato.rate || 5.6;
      var depth = ac.createGain();
      var base = rate(v.vibrato.midi);
      var d = base * (Math.pow(2, (v.vibrato.cents || 28) / 1200) - 1);
      depth.gain.setValueAtTime(0, v.vibrato.t);
      depth.gain.linearRampToValueAtTime(d, v.vibrato.t + 0.18);
      lfo.connect(depth).connect(src.playbackRate);
      lfo.start(v.vibrato.t);
      lfo.stop(end + 0.05);
      activeNodes.push(lfo, depth);
    }
    src.connect(g).connect(dest);
    src.start(v.start);
    src.stop(end + 0.05);
    activeNodes.push(src, g);
  }

  function voiceSynth(ac, timbre, v, dest) {
    var end = v.start + v.dur;
    function layer(detuneCents, gainMul) {
      var osc = ac.createOscillator();
      osc.type = timbre.type;
      if (detuneCents) osc.detune.setValueAtTime(detuneCents, v.start);
      osc.frequency.setValueAtTime(midiToFreq(v.points[0].midi), v.start);
      v.points.slice(1).forEach(function (p) {
        if (p.glide) {
          osc.frequency.setValueAtTime(midiToFreq(p.fromMidi), p.t);
          osc.frequency.linearRampToValueAtTime(midiToFreq(p.midi), p.t + p.glide);
        } else osc.frequency.setValueAtTime(midiToFreq(p.midi), p.t);
      });
      var g = ac.createGain();
      var peak = timbre.gain * gainMul * v.vel * 1.2;
      var sustain = Math.max(0.0008, peak * Math.max(timbre.sustainLevel, v.points.length > 1 ? 0.45 : 0));
      g.gain.setValueAtTime(0.0001, v.start);
      g.gain.linearRampToValueAtTime(peak, v.start + timbre.attack);
      g.gain.exponentialRampToValueAtTime(sustain, v.start + timbre.attack + timbre.decay);
      var rel = Math.max(v.start + timbre.attack + timbre.decay, end - timbre.release);
      g.gain.setValueAtTime(sustain, rel);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      if (v.vibrato) {
        var lfo = ac.createOscillator();
        lfo.frequency.value = v.vibrato.rate || 5.6;
        var depth = ac.createGain();
        depth.gain.setValueAtTime(0, v.vibrato.t);
        depth.gain.linearRampToValueAtTime(midiToFreq(v.vibrato.midi) * 0.016, v.vibrato.t + 0.18);
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(v.vibrato.t);
        lfo.stop(end + 0.05);
        activeNodes.push(lfo, depth);
      }
      osc.connect(g).connect(dest);
      osc.start(v.start);
      osc.stop(end + 0.05);
      activeNodes.push(osc, g);
    }
    layer(0, 1);
    if (timbre.detuneLayer) layer(6, 0.5);
  }

  // Compatibilidade: uma nota simples (usada pelo acompanhamento).
  function scheduleNote(ac, freqOrMidi, startTime, duration, timbre, destination, useSet, vel) {
    var midi = freqOrMidi;
    var v = { start: startTime, dur: duration, vel: vel || 0.8, points: [{ t: startTime, midi: midi }] };
    if (useSet && buffers[useSet]) voiceSample(ac, useSet, v, destination);
    else voiceSynth(ac, timbre, v, destination);
  }

  // ---------------------------------------------------------------------
  // Eventos → vozes (agrupando legato/slide/bend numa só voz)
  // ---------------------------------------------------------------------

  var CONTINUES = { h: true, p: true, sl: true, r: true };

  function buildVoices(noteEvents, realizedMidi, timeOf, spb, opts) {
    var voices = [];
    var cur = null;
    noteEvents.forEach(function (e, i) {
      var midi = realizedMidi[i];
      var t = timeOf(e.onset);
      var tEnd = timeOf(e.onset + e.dur);
      var jitter = opts.humanize ? (Math.random() - 0.5) * 0.012 : 0;
      var vel = (e.vel !== undefined ? e.vel : 0.8) * (opts.humanize ? 0.94 + Math.random() * 0.12 : 1);
      var continues = cur && CONTINUES[e.art] && Math.abs(midi - cur.lastMidi) <= 7;
      if (continues) {
        var glide = e.art === 'sl' ? Math.min(0.09, (tEnd - t) * 0.5) : (e.art === 'r' ? Math.min(0.12, (tEnd - t) * 0.5) : 0);
        cur.points.push({ t: t, midi: midi, glide: glide, fromMidi: cur.lastMidi });
        if (e.art === 'h') cur.accents.push({ t: t, level: 0.9 });
        cur.dur = tEnd - cur.start;
        cur.lastMidi = midi;
      } else {
        var start = t + jitter;
        var pts = [];
        if (e.art === 'b' && e.bendFrom !== undefined) {
          var from = midi - (e.midi - e.bendFrom);
          pts.push({ t: start, midi: from });
          pts.push({ t: start + 0.02, midi: midi, glide: Math.min(0.16, (tEnd - start) * 0.45), fromMidi: from });
        } else {
          pts.push({ t: start, midi: midi });
        }
        cur = { start: start, dur: Math.max(0.05, tEnd - start), vel: vel, points: pts, accents: [], lastMidi: midi };
        voices.push(cur);
      }
      if (e.vibrato) cur.vibrato = { t: t + Math.min(0.14, (tEnd - t) * 0.3), midi: midi, cents: e.art === 'b' ? 22 : 30, rate: 5.4 };
      // leve "respiração" entre notas atacadas
      cur.dur = Math.max(0.05, (tEnd - cur.start) * (CONTINUES[e.art] ? 1 : 0.94));
    });
    return voices;
  }

  function stopAll() {
    playToken++;
    activeNodes.forEach(function (n) {
      try { n.stop && n.stop(0); } catch (e) { /* já parado */ }
      try { n.disconnect(); } catch (e) { /* ignora */ }
    });
    activeNodes = [];
    activeTimers.forEach(function (t) { clearTimeout(t); });
    activeTimers = [];
  }

  function timer(fn, ms) { activeTimers.push(setTimeout(fn, Math.max(0, ms))); }

  /**
   * Toca uma frase com ritmo: respeita durações, pausas, tercinas, swing
   * opcional, articulações e dinâmica, com o acompanhamento por baixo.
   * opts: { bpm, swing, humanize, chords: [{beat, beats, root, tones}], onNote(i), onBeat(beat) }
   */
  function playEvents(events, instrument, opts, onDone) {
    stopAll();
    opts = opts || {};
    var token = playToken;
    var ac = getCtx();
    var set = setFor(instrument);
    var needSets = [set].concat((opts.chords && opts.chords.length) ? ['piano_eletrico', 'baixo'] : []);
    return ensureSets(needSets).then(function (useSamples) {
      if (token !== playToken) return;
      var spb = 60 / (opts.bpm || 110);
      function swung(beat) {
        if (!opts.swing) return beat;
        var b = Math.floor(beat + 1e-6), f = beat - b;
        return Math.abs(f - 0.5) < 1e-6 ? b + 0.62 : beat;
      }
      var t0 = ac.currentTime + 0.08;
      function timeOf(beat) { return t0 + swung(beat) * spb; }
      var out = getOut(ac);
      var master = ac.createGain(); master.gain.value = 0.9; master.connect(out);
      var comp = ac.createGain(); comp.gain.value = useSamples ? 0.4 : 0.3; comp.connect(out);
      activeNodes.push(master, comp);

      var noteEvents = events.filter(function (e) { return !e.rest; });
      var realized = notation.realizeForInstrument(noteEvents.map(function (e) { return e.name; }), instrument,
        noteEvents.map(function (e) { return e.midi; }));
      var voices = buildVoices(noteEvents, realized.map(function (r) { return r.midi; }), timeOf, spb, opts);
      var timbre = TIMBRES[instrument] || TIMBRES.teclado;
      voices.forEach(function (v) {
        if (useSamples) voiceSample(ac, set, v, master); else voiceSynth(ac, timbre, v, master);
      });
      if (opts.onNote) noteEvents.forEach(function (e, i) { timer(function () { opts.onNote(i); }, (timeOf(e.onset) - ac.currentTime) * 1000); });

      var end = 0;
      events.forEach(function (e) { end = Math.max(end, e.onset + e.dur); });
      (opts.chords || []).forEach(function (ch, ci) {
        var st = t0 + ch.beat * spb;
        var dur = (ch.beats || 4) * spb * 0.97;
        playChord(ac, ch, st, dur, comp, useSamples);
        if (opts.onChord) timer(function () { opts.onChord(ci); }, (st - ac.currentTime) * 1000);
      });
      if (onDone) timer(onDone, (timeOf(end) - ac.currentTime) * 1000 + 250);
    });
  }

  function playChord(ac, ch, st, dur, dest, useSamples) {
    var bass = notation.realizeForInstrument([ch.root], 'baixo');
    var bassMidi = bass[0].midi;
    if (bassMidi > 47) bassMidi -= 12;
    if (useSamples) {
      scheduleNote(ac, bassMidi, st, dur, TIMBRES.baixo, dest, 'baixo', 0.9);
      // voicing fechado na região média (sem dobrar a fundamental em cima)
      var tones = ch.tones.slice(ch.tones.length >= 4 ? 1 : 0);
      notation.realizeForInstrument(tones, 'teclado').forEach(function (n, k) {
        var m = n.midi; while (m > 67) m -= 12; while (m < 52) m += 12;
        scheduleNote(ac, m, st + k * 0.012, dur, TIMBRES.teclado, dest, 'piano_eletrico', 0.55);
      });
    } else {
      scheduleNote(ac, bassMidi, st, dur, TIMBRES.baixo, dest, null, 0.8);
      notation.realizeForInstrument(ch.tones, 'teclado').forEach(function (n) {
        scheduleNote(ac, n.midi - 12, st, dur, TIMBRES.teclado, dest, null, 0.8);
      });
    }
  }

  /** Toca a progressão inteira como acompanhamento (acorde + baixo). */
  function playProgression(analysisResult, instrument, onChordStart, onDone) {
    var chords = analysisResult.chords.filter(function (c) { return !c.error; });
    var beats = 2;
    var list = chords.map(function (c, i) { return { beat: i * beats, beats: beats, root: c.root, tones: c.tones }; });
    return playEvents([{ rest: true, onset: 0, dur: chords.length * beats }], instrument,
      { bpm: 110, chords: list, onChord: onChordStart }, onDone);
  }

  /** Converte uma frase de 8 colcheias (aba Fraseados) em eventos, se preciso. */
  function phraseEvents(phrase, offset) {
    offset = offset || 0;
    if (phrase.events) return phrase.events.map(function (e) { return Object.assign({}, e, { onset: e.onset + offset }); });
    return phrase.notes.map(function (n, i) {
      return { name: n, midi: phrase.midi ? phrase.midi[i] : undefined, onset: offset + i * 0.5, dur: 0.5, vel: 0.8 };
    });
  }

  /** Toca um fraseado da aba Fraseados. */
  function playPhrase(phrase, instrument, onNoteStart, onDone) {
    var ev = phraseEvents(phrase, 0);
    var chords = phrase.chord ? [{ beat: 0, beats: 4, root: phrase.chord.root, tones: phrase.chord.tones }] : [];
    return playEvents(ev, instrument, { bpm: 100, swing: phrase.rhythm === 'colcheias', humanize: true, chords: chords, onNote: onNoteStart }, onDone);
  }

  /** Toca a LINHA INTEIRA (todas as frases de compasso) com acompanhamento. */
  function playLine(barPhrases, instrument, onBarStart, onDone) {
    if (!barPhrases.length) return;
    var events = [];
    var chords = [];
    barPhrases.forEach(function (p, b) {
      events = events.concat(phraseEvents(p, b * 4));
      chords.push({ beat: b * 4, beats: 4, root: p.chord.root, tones: p.chord.tones });
    });
    return playEvents(events, instrument, { bpm: 100, swing: true, humanize: true, chords: chords, onChord: onBarStart }, onDone);
  }

  function setSoundMode(mode) {
    if (SOUND_MODES.indexOf(mode) < 0) return;
    soundMode = mode;
    try { root.localStorage && root.localStorage.setItem('il_sound', mode); } catch (e) { /* ignora */ }
  }
  function getSoundMode() { return soundMode; }

  /** Pré-carrega os samples de um instrumento (e do acompanhamento). */
  function preload(instrument) {
    return ensureSets([setFor(instrument), 'piano_eletrico', 'baixo']);
  }

  root.IL = root.IL || {};
  root.IL.audio = {
    playEvents: playEvents,
    playProgression: playProgression,
    playPhrase: playPhrase,
    playLine: playLine,
    stopAll: stopAll,
    setSoundMode: setSoundMode,
    getSoundMode: getSoundMode,
    preload: preload,
    SOUND_MODES: SOUND_MODES
  };
})(typeof window !== 'undefined' ? window : globalThis);
