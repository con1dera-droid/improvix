/**
 * IMPROVIX — tela "Biblioteca de Acordes"
 *
 * Você digita a cifra (C7+, Am7(b5), G7(b9), D7/F#…) e ela mostra como se
 * faz esse acorde nos quatro instrumentos: violão, guitarra, teclado e
 * baixo — com o desenho, os dedos, o nome de cada nota e o grau dela
 * dentro do acorde. Tudo com áudio: dá para ouvir o acorde e o arpejo.
 *
 * Quem toca um instrumento vê o dele primeiro; os outros ficam logo abaixo,
 * porque é exatamente isso que falta quando se ensaia com outra pessoa.
 */
(function () {
  'use strict';

  var CH = window.IL.chords;
  var notation = window.IL.notation;
  var audio = window.IL.audio;
  var theory = window.IL.theory;

  // Violão e guitarra têm a mesma afinação: as posições são as mesmas, e
  // mostrar o mesmo desenho duas vezes só faria a pessoa rolar à toa. Então
  // os dois dividem um bloco só.
  var BLOCOS = ['cordas', 'teclado', 'baixo'];
  var ROTULOS = {
    cordas: '🎸 Violão e guitarra',
    teclado: '🎹 Teclado / Piano',
    baixo: '🎻 Baixo'
  };
  function blocoDoInstrumento(i) { return (i === 'violao' || i === 'guitarra') ? 'cordas' : i; }

  var state = { built: false, cifra: 'C7M', instrumento: 'violao', tocando: null, voicings: {} };

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ---------------------------------------------------------------- montagem

  function build() {
    if (state.built) return;
    state.built = true;
    var sel = $('acd-instrumento');
    var principal = $('input-instrumento');
    if (principal && ROTULOS[blocoDoInstrumento(principal.value)]) state.instrumento = principal.value;
    sel.value = state.instrumento;

    $('acd-form').addEventListener('submit', function (ev) { ev.preventDefault(); buscar(); });
    $('acd-busca').addEventListener('input', function () { $('acd-erro').hidden = true; });
    sel.addEventListener('change', function () {
      state.instrumento = sel.value;
      if (principal) {
        principal.value = sel.value;
        principal.dispatchEvent(new Event('change'));
      }
      parar(); render();
    });
    $('acd-conteudo').addEventListener('click', onClick);
    $('acd-sugestoes').addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-cifra]');
      if (!b) return;
      $('acd-busca').value = b.getAttribute('data-cifra');
      buscar();
    });
    $('acd-sugestoes').innerHTML = CH.SUGESTOES.map(function (g) {
      return '<div class="acd-sug-grupo"><span class="acd-sug-rot">' + esc(g.grupo) + '</span>' +
        g.cifras.map(function (c) {
          return '<button type="button" class="acd-chip" data-cifra="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('') + '</div>';
    }).join('');
  }

  function buscar() {
    var texto = ($('acd-busca').value || '').trim();
    if (!texto) return;
    if (!CH.analisar(texto)) {
      var e = $('acd-erro');
      e.textContent = 'Não reconheci a cifra "' + texto + '". Tente algo como C, Am7, G7(b9), C7M(#11) ou D7/F#.';
      e.hidden = false;
      return;
    }
    $('acd-erro').hidden = true;
    state.cifra = texto;
    parar();
    render();
  }

  // ---------------------------------------------------------------- áudio

  function parar() {
    if (audio) audio.stopAll();
    state.tocando = null;
    document.querySelectorAll('#acd-conteudo .playing').forEach(function (b) {
      b.classList.remove('playing');
      b.textContent = b.getAttribute('data-label') || '🔊 Ouvir';
    });
  }

  /** Toca as notas juntas (acorde) ou uma depois da outra (arpejo). */
  function tocar(btn, tag, midis, instrumento, arpejo) {
    if (state.tocando === tag) { parar(); return; }
    parar();
    if (!audio || !midis.length) return;
    state.tocando = tag;
    btn.classList.add('playing');
    btn.textContent = '⏸ Parar';

    var eventos = [];
    midis.slice().sort(function (a, b) { return a - b; }).forEach(function (m, i) {
      eventos.push({
        midi: m, name: nomeDeMidi(m),
        onset: arpejo ? i * 0.5 : 0,
        dur: arpejo ? 0.5 : 4
      });
    });
    if (arpejo) eventos[eventos.length - 1].dur = 2;

    var t = window.IL.ui.transportOpts ? window.IL.ui.transportOpts('acordes') : { bpm: 80 };
    audio.playEvents(eventos, instrumento, { bpm: t.bpm, metronome: false, loop: false, humanize: false },
      function () { if (state.tocando === tag) parar(); });
  }

  function nomeDeMidi(midi) {
    var info = CH.analisar(state.cifra);
    var p = ((midi % 12) + 12) % 12;
    var achada = (info ? info.notas : []).filter(function (n) { return n.pc === p; })[0];
    return achada ? achada.name : ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][p];
  }

  function onClick(ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'ouvir') {
      var midis = (b.getAttribute('data-midis') || '').split(',').filter(Boolean).map(Number);
      tocar(b, b.getAttribute('data-tag'), midis, b.getAttribute('data-instr'), b.getAttribute('data-arpejo') === '1');
      return;
    }
    if (act === 'cifra') { $('acd-busca').value = b.getAttribute('data-cifra'); buscar(); return; }
    if (act === 'ir-escalas') {
      var nav = document.querySelector('.nav-item[data-nav="biblioteca-escalas"]');
      if (nav) nav.click();
      return;
    }
    if (act === 'ir-harmonia') {
      var campo = document.getElementById('input-progressao');
      if (campo) campo.value = state.cifra;
      window.IL.ui.abrirHarmonia();
      window.IL.ui.runAnalysis();
    }
  }

  // ---------------------------------------------------------------- desenho

  function botaoOuvir(tag, midis, instrumento, arpejo, rotulo) {
    return '<button class="view-btn btn-ouvir" data-act="ouvir" data-tag="' + tag + '" data-instr="' + instrumento +
      '" data-arpejo="' + (arpejo ? 1 : 0) + '" data-midis="' + midis.join(',') +
      '" data-label="' + rotulo + '">' + rotulo + '</button>';
  }

  /** Cabeçalho: a leitura do acorde (notas, graus, fórmula, nome). */
  function cabecalhoHTML(info) {
    var apelidos = CH.apelidos(info.cifra);
    return '<div class="esc-head">' +
      '<div><div class="esc-title">' + esc(info.cifra) + ' <span class="esc-tonic">' + esc(info.descricao) + '</span></div>' +
      '<div class="lib-badges">' +
      '<span class="lib-badge">' + info.notas.length + ' notas</span>' +
      '<span class="lib-badge">fórmula ' + esc(info.formula) + '</span>' +
      (info.baixoInvertido ? '<span class="lib-badge">baixo ' + esc(info.baixo) + '</span>' : '') +
      '</div></div>' +
      '<div class="esc-head-actions">' +
      botaoOuvir('acorde', notasDoAcorde(info), state.instrumento === 'baixo' ? 'teclado' : state.instrumento, false, '🔊 Ouvir o acorde') +
      botaoOuvir('arpejo', notasDoAcorde(info), state.instrumento === 'baixo' ? 'teclado' : state.instrumento, true, '🎵 Arpejado') +
      '</div></div>' +

      '<div class="acd-notas">' + info.notas.map(function (n) {
        return '<div class="acd-nota' + (n.grau === '1' ? ' acd-nota-raiz' : '') + '">' +
          '<span class="acd-nota-nome">' + esc(n.name) + '</span>' +
          '<span class="acd-nota-grau">' + esc(n.grau) + '</span></div>';
      }).join('') + '</div>' +
      (apelidos.length ? '<p class="si-legend">Também se escreve: ' + apelidos.map(function (a) {
        return '<button class="acd-chip acd-chip-mini" data-act="cifra" data-cifra="' + esc(a) + '">' + esc(a) + '</button>';
      }).join(' ') + '</p>' : '');
  }

  function notasDoAcorde(info) {
    var base = 48 + (((theory.pitchClassOf(info.baixo) - 48) % 12) + 12) % 12;
    var out = [base];
    var ultimo = base;
    info.notas.forEach(function (n) {
      if (n.pc === base % 12) return;
      var m = ultimo + (((n.pc - ultimo) % 12) + 12) % 12;
      if (m === ultimo) m += 12;
      ultimo = m;
      out.push(m);
    });
    return out;
  }

  /** Violão e guitarra: as posições no braço. */
  function bracoHTML(instrumento, info) {
    var ps = CH.posicoes(state.cifra, instrumento, 3);
    state.voicings[instrumento] = ps;
    if (!ps.length) {
      return '<p class="muted-note">Não achei uma posição tocável de <strong>' + esc(info.cifra) +
        '</strong> no ' + ROTULOS[instrumento].replace(/^\S+\s/, '') +
        ' com a mão fechada em quatro casas. Tente uma cifra mais simples (sem tantas tensões) ou veja o teclado aqui embaixo.</p>';
    }
    return '<div class="acd-grade">' + ps.map(function (p, i) {
      // O rótulo tem de combinar com o desenho: quando o diagrama começa na
      // pestana do instrumento (há corda solta, ou a forma cabe nas primeiras
      // casas), não faz sentido anunciar "a partir da 2ª casa".
      var presas = p.casas.filter(function (f) { return f !== null && f > 0; });
      var noComeco = p.casas.some(function (f) { return f === 0; }) ||
        (presas.length && Math.max.apply(null, presas) <= 5);
      var casa = (noComeco ? 'primeiras casas' : 'a partir da ' + p.casaBase + 'ª casa') +
        (p.pestana ? ' · com pestana' : '');
      return '<div class="acd-forma">' +
        '<div class="acd-forma-topo"><strong>' + (i + 1) + 'ª posição</strong> <span>' + casa + '</span></div>' +
        notation.chordDiagramSVG({
          instrument: instrumento, casas: p.casas, dedos: p.dedos,
          pestana: p.pestana, notas: p.notas
        }) +
        '<div class="acd-forma-acoes">' +
        botaoOuvir(instrumento + i, p.midis, instrumento, false, '🔊 Ouvir') +
        botaoOuvir(instrumento + i + 'a', p.midis, instrumento, true, '🎵 Arpejar') +
        '</div>' +
        '<p class="acd-forma-tab">' + esc(p.casas.map(function (f) { return f === null ? 'x' : f; }).join('-')) + '</p>' +
        '</div>';
    }).join('') + '</div>' +
      '<p class="si-legend">Os números dentro das bolinhas são os dedos: 1 indicador, 2 médio, 3 anelar, 4 mínimo. ' +
      '✕ é corda que não soa, ○ é corda solta. Embaixo de cada corda vem a nota e o grau dela no acorde.</p>';
  }

  /** Teclado: posição fundamental, inversão e o voicing de 3ª e 7ª. */
  function tecladoHTML() {
    var vs = CH.teclado(state.cifra);
    if (!vs.length) return '<p class="muted-note">Cifra não reconhecida.</p>';
    return '<div class="acd-teclados">' + vs.map(function (v, i) {
      var teclas = v.notas.map(function (n) {
        return {
          midi: n.midi, label: n.name, raiz: n.grau === '1',
          mao: v.esquerda.indexOf(n.midi) >= 0 ? 'e' : 'd'
        };
      });
      var midis = v.esquerda.concat(v.direita);
      var de = Math.floor(Math.min.apply(null, midis) / 12) * 12;
      return '<div class="acd-teclado">' +
        '<div class="acd-forma-topo"><strong>' + esc(v.titulo) + '</strong></div>' +
        notation.keyboardVoicingSVG({ teclas: teclas, de: de }) +
        '<p class="si-legend">' + esc(v.dica) + '</p>' +
        '<div class="acd-forma-acoes">' +
        botaoOuvir('tec' + i, midis, 'teclado', false, '🔊 Ouvir') +
        botaoOuvir('tec' + i + 'a', midis, 'teclado', true, '🎵 Arpejar') +
        '<span class="acd-maos"><em class="acd-mao-e"></em> mão esquerda <em class="acd-mao-d"></em> mão direita</span>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  /** Baixo: as notas do acorde no braço, na posição, e a linha básica. */
  function baixoHTML(info) {
    var b = CH.baixo(state.cifra);
    if (!b) return '<p class="muted-note">Cifra não reconhecida.</p>';

    var marcas = info.notas.map(function (n) {
      return { pc: n.pc, label: n.grau, root: n.grau === '1' };
    });

    return '<div class="acd-grade">' +
      '<div class="acd-forma acd-forma-larga">' +
      '<div class="acd-forma-topo"><strong>O acorde no braço</strong> <span>fundamental na corda ' +
      esc(b.instrumento.rotulos[b.raiz.corda]) + ', casa ' + b.raiz.casa + '</span></div>' +
      '<div class="esc-diagrama">' + notation.fretboardSVG({
        instrument: 'baixo', notes: marcas, fromFret: b.casaBase, frets: 6
      }) + '</div>' +
      '<p class="si-legend">Os números são os graus: <strong>1</strong> é a fundamental (em verde), ' +
      '<strong>3</strong> diz se o acorde é maior ou menor e <strong>' +
      (info.notas.filter(function (n) { return /^(7M?|b7)$/.test(n.grau); })[0] ? '7' : '5') +
      '</strong> completa o som.</p>' +
      '<div class="acd-forma-acoes">' +
      botaoOuvir('bxl', b.linha.map(function (n) { return n.midi; }), 'baixo', true, '🔊 Fundamental – 5ª – oitava') +
      botaoOuvir('bxr', [b.raiz.midi], 'baixo', false, '🔊 Só a fundamental') +
      '</div>' +
      '<p class="si-legend">No baixo não se toca o acorde empilhado: toca-se a linha. Comece pela fundamental ' +
      'no tempo 1 e use a 5ª e a oitava para andar — é a linha que serve em quase tudo.</p>' +
      '<details class="acd-detalhe"><summary>Ver corda por corda</summary>' +
      '<table class="theory-table acd-tabela"><thead><tr><th>Corda</th><th>Casa</th><th>Nota</th><th>Grau</th></tr></thead><tbody>' +
      b.notas.map(function (n) {
        return '<tr><td>' + esc(b.instrumento.rotulos[n.corda]) + '</td><td>' + n.casa + '</td><td><strong>' +
          esc(n.name) + '</strong></td><td>' + esc(n.grau) + '</td></tr>';
      }).join('') + '</tbody></table></details>' +
      '</div></div>';
  }

  function blocoHTML(bloco, info, primeiro) {
    var corpo = bloco === 'teclado' ? tecladoHTML()
      : bloco === 'baixo' ? baixoHTML(info)
        : bracoHTML(state.instrumento === 'guitarra' ? 'guitarra' : 'violao', info) +
          '<p class="si-legend">Violão e guitarra têm a mesma afinação, então as posições são as mesmas. ' +
          'Muda o jeito de tocar: no violão se dedilha ou se bate o acorde inteiro; na guitarra, com distorção, ' +
          'costuma-se usar só três ou quatro cordas para não embolar.</p>';
    return '<section class="acd-bloco' + (primeiro ? ' acd-bloco-principal' : '') + '">' +
      '<h3 class="esc-sub">' + ROTULOS[bloco] + (primeiro ? ' <span class="acd-seu">o seu</span>' : '') + '</h3>' +
      corpo + '</section>';
  }

  function render() {
    var info = CH.analisar(state.cifra);
    if (!info) { $('acd-conteudo').innerHTML = ''; return; }
    $('acd-busca').value = info.cifra;

    var meu = blocoDoInstrumento(state.instrumento);
    var ordem = [meu].concat(BLOCOS.filter(function (i) { return i !== meu; }));
    var html = cabecalhoHTML(info) +
      '<div class="transport" data-transport="acordes">' +
      '<button type="button" class="tr-btn" data-act="menos" title="Mais devagar (−5 bpm)">−</button>' +
      '<span class="tr-bpm" title="Velocidade do arpejo"><input type="number" class="tr-bpm-input" min="40" max="240" step="1" value="80" aria-label="Andamento em bpm"/><small>bpm</small></span>' +
      '<button type="button" class="tr-btn" data-act="mais" title="Mais rápido (+5 bpm)">+</button>' +
      '</div>' +
      ordem.map(function (i, k) { return blocoHTML(i, info, k === 0); }).join('') +
      '<div class="esc-head-actions acd-fim">' +
      '<button class="view-btn" data-act="ir-harmonia">🎹 Analisar ' + esc(info.cifra) + ' numa progressão</button>' +
      '<button class="view-btn" data-act="ir-escalas">📚 Escalas para improvisar em cima</button>' +
      '</div>';

    $('acd-conteudo').innerHTML = html;
    if (window.IL.ui.setupTransportBars) window.IL.ui.setupTransportBars();
  }

  function renderAcordesView(preset) {
    build();
    if (preset && preset.cifra && CH.analisar(preset.cifra)) state.cifra = preset.cifra;
    var principal = $('input-instrumento');
    if (principal && ROTULOS[blocoDoInstrumento(principal.value)] && principal.value !== state.instrumento) {
      state.instrumento = principal.value;
      $('acd-instrumento').value = principal.value;
    }
    render();
  }

  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderAcordesView = renderAcordesView;
})();
