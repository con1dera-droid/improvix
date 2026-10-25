/**
 * IMPROVIX — Treino de Ouvido
 *
 * Pedido do dono em 25/10/2026: "um joguinho tipo descubra a nota — o sistema
 * manda um som, dá as opções e você aperta para ver se acertou".
 *
 * A ideia é essa, com uma correção que muda tudo. Tocar uma nota sozinha e
 * perguntar "que nota é?" cobra OUVIDO ABSOLUTO — reconhecer um Lá sem
 * referência nenhuma. Isso é raríssimo e, em adulto, praticamente não se
 * desenvolve: o jogo viraria sorte (1 em 12), a pessoa erraria tudo e
 * concluiria que não tem ouvido.
 *
 * Então o sistema dá a referência ANTES: toca o acorde da tônica e só depois
 * a nota. A pergunta deixa de ser "que nota é" e passa a ser "que GRAU é" — a
 * tônica, a terça, a quinta. Isso é ouvido relativo, que se treina, e é
 * exatamente o que um improvisador usa: quando você ouve uma frase e sabe que
 * aquilo é a terça do acorde, é esse ouvido trabalhando.
 *
 * Os níveis abrem um a um, como os exercícios do Início: 80% numa rodada de
 * dez abre o seguinte. Quem está logado tem o progresso guardado (na mesma
 * tabela `progresso`, com a chave 'ouvido:n2' — nenhuma mudança no banco);
 * quem não está joga igual, só não guarda.
 */
(function () {
  'use strict';

  var theory = window.IL.theory;
  var audio = window.IL.audio;

  // Os doze graus, em semitons a partir da tônica. O rótulo é o que vai no
  // botão: o aluno responde em graus, não em nomes de nota.
  var GRAUS = [
    { st: 0, rot: '1', nome: 'tônica' },
    { st: 1, rot: 'b2', nome: 'segunda menor' },
    { st: 2, rot: '2', nome: 'segunda' },
    { st: 3, rot: 'b3', nome: 'terça menor' },
    { st: 4, rot: '3', nome: 'terça' },
    { st: 5, rot: '4', nome: 'quarta' },
    { st: 6, rot: '#4', nome: 'quarta aumentada' },
    { st: 7, rot: '5', nome: 'quinta' },
    { st: 8, rot: 'b6', nome: 'sexta menor' },
    { st: 9, rot: '6', nome: 'sexta' },
    { st: 10, rot: 'b7', nome: 'sétima menor' },
    { st: 11, rot: '7', nome: 'sétima maior' }
  ];

  // Onde cada grau diatônico mora dentro da escala maior (para dizer o nome da
  // nota no fim da pergunta: "era a 3ª — E").
  var NA_ESCALA = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

  // De três em três perguntas, o nível 1 troca a pergunta: em vez de uma nota
  // solta, toca um ACORDE e pergunta se ele é maior ou menor. Pedido do dono
  // em 25/10/2026, e ele escolheu o nível 1 — o que casa certinho, porque o
  // nível 1 é o do acorde (1-3-5) e maior-ou-menor é exatamente a terça desse
  // acorde. É a mesma pergunta vista de outro ângulo.
  var A_CADA = 3;
  var QUALIDADES = [
    { q: 'maior', rot: 'Maior', sufixo: '' },
    { q: 'menor', rot: 'Menor', sufixo: 'm' }
  ];

  var NIVEIS = [
    {
      n: 1, nome: 'Os três pilares', graus: [0, 4, 7], comAcordes: true,
      sobre: 'A tônica, a terça e a quinta — o acorde. Se você só ouvir estas três, já improvisa. ' +
        'De três em três perguntas vem um acorde inteiro, para você dizer se é maior ou menor.'
    },
    {
      n: 2, nome: 'Com a sétima', graus: [0, 4, 7, 11],
      sobre: 'As quatro notas da tétrade. A sétima é a que dá a cor de jazz.'
    },
    {
      n: 3, nome: 'A escala inteira', graus: [0, 2, 4, 5, 7, 9, 11],
      sobre: 'Os sete graus da escala maior. Agora a segunda, a quarta e a sexta entram no jogo.'
    },
    {
      n: 4, nome: 'As notas de fora', graus: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      sobre: 'As doze. As cromáticas são as que fazem o improviso soar adulto — e as mais difíceis de ouvir.'
    }
  ];

  var TONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var POR_RODADA = 10;
  var PISO = 80;                 // o mesmo piso dos exercícios gravados
  var INSTRUMENTO = 'teclado';   // timbre fixo de propósito: o jogo é de altura, não de timbre

  var state = {
    built: false, tom: 'C', nivel: 1,
    liberado: { 1: true },       // o nível 1 nasce aberto, como o exercício 1
    pergunta: 0, acertos: 0, sequencia: 0, melhorSequencia: 0,
    alvo: null, respondido: false, rodando: false, lido: false
  };

  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function nivelAtual() { return NIVEIS.filter(function (x) { return x.n === state.nivel; })[0] || NIVEIS[0]; }
  function chaveDe(n) { return 'ouvido:n' + n; }

  /** O MIDI da tônica, sempre na mesma oitava: o jogo é de graus, não de registro. */
  function midiDaTonica() {
    var pc = theory.pitchClassOf(state.tom);
    return 60 + (typeof pc === 'number' ? pc : 0);
  }

  /** O nome da nota do grau, quando ele é da escala (senão, só o rótulo). */
  function nomeDoGrau(st) {
    if (!(st in NA_ESCALA)) return null;
    try { return theory.scaleNotes(state.tom, 'jonio')[NA_ESCALA[st]] || null; }
    catch (e) { return null; }
  }

  // ---------------- progresso ----------------

  /**
   * Os níveis abertos valem 24 horas, e depois fecham — pedido do dono em
   * 25/10/2026: ouvido não se guarda, se mantém. Fechar todo dia faz a pessoa
   * voltar e refazer o caminho, que é exatamente o treino.
   *
   * Onde isso mora: no navegador da pessoa (localStorage), com a hora em que
   * cada nível abriu. O banco continua recebendo a nota de cada rodada — é
   * dele que sai o histórico —, mas quem decide o que está aberto é o relógio
   * daqui. O preço honesto: em outro aparelho, a pessoa começa do nível 1.
   * Que é, afinal, o que acontece todo dia de qualquer jeito.
   */
  var VALIDADE_MS = 24 * 60 * 60 * 1000;
  var CHAVE_LOCAL = 'improvix:ouvido';

  function lerAberturas() {
    var dados = {};
    try {
      var bruto = window.localStorage && window.localStorage.getItem(CHAVE_LOCAL);
      if (bruto) dados = JSON.parse(bruto) || {};
    } catch (e) { dados = {}; }
    var agora = Date.now();
    var vivas = {};
    Object.keys(dados).forEach(function (n) {
      if (typeof dados[n] === 'number' && agora - dados[n] < VALIDADE_MS) vivas[n] = dados[n];
    });
    return vivas;
  }

  function guardarAbertura(n) {
    var vivas = lerAberturas();
    vivas[n] = Date.now();
    try { window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify(vivas)); } catch (e) { /* sem memória */ }
    aplicarAberturas();
  }

  /** Relê o relógio: o que passou de 24 h volta a ficar trancado. */
  function aplicarAberturas() {
    var vivas = lerAberturas();
    state.aberturas = vivas;
    state.liberado = { 1: true };         // o nível 1 nunca fecha
    Object.keys(vivas).forEach(function (n) { state.liberado[Number(n)] = true; });
    if (!state.liberado[state.nivel]) {   // fechou embaixo do pé da pessoa
      state.nivel = 1;
      state.rodando = false;
      state.ultimoResultado = null;
    }
  }

  /** "fecha em 7 h" / "fecha em 40 min" — quanto falta para o nível trancar. */
  function quantoFalta(n) {
    var quando = state.aberturas && state.aberturas[n];
    if (!quando) return '';
    var resta = VALIDADE_MS - (Date.now() - quando);
    if (resta <= 0) return '';
    var horas = Math.floor(resta / 3600000);
    if (horas >= 1) return 'fecha em ' + horas + ' h';
    return 'fecha em ' + Math.max(1, Math.round(resta / 60000)) + ' min';
  }

  function guardar(n, acerto) {
    var db = window.IL.db;
    if (!db || !db.registrarGravacao || !window.IL.account || !window.IL.account.isLoggedIn()) return;
    Promise.resolve(db.registrarGravacao(chaveDe(n), acerto)).catch(function () {});
  }

  // ---------------- o som ----------------

  /**
   * Toca a referência (o acorde da tônica) e, depois dela, a nota da pergunta.
   * É a referência que transforma "adivinhe a nota" em "ouça o grau".
   */
  function tocarPergunta(soANota) {
    if (!audio) return;
    // Maior ou menor não precisa de referência: a resposta está DENTRO do
    // acorde (é a terça). Dar a tônica antes só atrapalharia.
    if (state.alvo.tipo === 'acorde') {
      audio.playEvents([{ rest: true, onset: 0, dur: 3 }], INSTRUMENTO, {
        bpm: 90,
        chords: [{ beat: 0, beats: 3, root: state.alvo.fund, tones: state.alvo.tones }]
      });
      return;
    }
    var tonica = midiDaTonica();
    var nota = tonica + state.alvo.st;
    var eventos = [{ name: 'alvo', midi: nota, onset: soANota ? 0 : 2.6, dur: 1.6, vel: 0.95 }];
    var acordes = soANota ? [] : [{
      beat: 0, beats: 2, root: state.tom,
      tones: theory.chordNotes(state.tom + '7M')
    }];
    if (!soANota) eventos.unshift({ rest: true, onset: 0, dur: 2.4 });
    audio.playEvents(eventos, INSTRUMENTO, { bpm: 90, chords: acordes });
  }

  function tocarReferencia() {
    if (!audio) return;
    audio.playEvents([{ rest: true, onset: 0, dur: 2 }], INSTRUMENTO, {
      bpm: 90,
      chords: [{ beat: 0, beats: 2, root: state.tom, tones: theory.chordNotes(state.tom + '7M') }]
    });
  }

  // ---------------- a rodada ----------------

  function novaRodada() {
    state.rodando = true;
    state.pergunta = 0;
    state.acertos = 0;
    state.sequencia = 0;
    state.melhorSequencia = 0;
    proximaPergunta();
  }

  function proximaPergunta() {
    var nv = nivelAtual();
    state.pergunta++;
    state.respondido = false;
    state.ultimaResposta = null;
    if (nv.comAcordes && state.pergunta % A_CADA === 0) sortearAcorde();
    else sortearGrau(nv);
    render();
    tocarPergunta(false);
  }

  function sortearGrau(nv) {
    // Repetir o mesmo grau duas vezes seguidas deixa a rodada com cara de
    // truque, então o anterior fica de fora do sorteio.
    var anterior = state.alvo && state.alvo.tipo === 'grau' ? state.alvo.st : null;
    var opcoes = nv.graus.filter(function (st) { return nv.graus.length < 2 || st !== anterior; });
    var st = opcoes[Math.floor(Math.random() * opcoes.length)];
    var g = GRAUS.filter(function (x) { return x.st === st; })[0];
    state.alvo = { tipo: 'grau', st: g.st, rot: g.rot, nome: g.nome };
  }

  /**
   * Maior ou menor. A fundamental vem de um grau qualquer da tonalidade (para
   * o ouvido não se agarrar sempre à mesma nota) e a qualidade é no sorteio —
   * o que se pergunta é só a terça.
   */
  function sortearAcorde() {
    var notas = theory.scaleNotes(state.tom, 'jonio');
    var fund = notas[Math.floor(Math.random() * notas.length)];
    var qual = QUALIDADES[Math.floor(Math.random() * QUALIDADES.length)];
    var cifra = fund + qual.sufixo;
    state.alvo = { tipo: 'acorde', q: qual.q, cifra: cifra, fund: fund, tones: theory.chordNotes(cifra) };
  }

  function responder(valor) {
    if (state.respondido || !state.alvo) return;
    state.respondido = true;
    var certo = state.alvo.tipo === 'acorde' ? valor === state.alvo.q : valor === state.alvo.st;
    if (certo) {
      state.acertos++;
      state.sequencia++;
      if (state.sequencia > state.melhorSequencia) state.melhorSequencia = state.sequencia;
    } else {
      state.sequencia = 0;
    }
    state.ultimaResposta = valor;
    render();
    // Errou: ouvir a nota certa de novo é o que ensina. Acertou: silêncio, a
    // pessoa já guardou o som.
    if (!certo) setTimeout(function () { tocarPergunta(true); }, 350);
  }

  function fecharRodada() {
    var nv = nivelAtual();
    var acerto = Math.round((state.acertos / POR_RODADA) * 100);
    state.rodando = false;
    state.ultimoResultado = { acerto: acerto, passou: acerto >= PISO, nivel: nv.n };
    guardar(nv.n, acerto);
    if (acerto >= PISO && nv.n < NIVEIS.length) guardarAbertura(nv.n + 1);
    render();
  }

  // ---------------- tela ----------------

  function cabecalhoHTML() {
    var nv = nivelAtual();
    return '<div class="ouv-topo">' +
      '<label class="ouv-campo">Tom' +
      '<select id="ouv-tom">' + TONS.map(function (t) {
        return '<option value="' + t + '"' + (t === state.tom ? ' selected' : '') + '>' + t + ' maior</option>';
      }).join('') + '</select></label>' +
      '<div class="ouv-niveis">' + NIVEIS.map(function (x) {
        var aberto = !!state.liberado[x.n];
        var falta = aberto && x.n > 1 ? quantoFalta(x.n) : '';
        return '<button type="button" class="ouv-nivel' + (x.n === state.nivel ? ' is-on' : '') +
          (aberto ? '' : ' is-trancado') + '" data-act="nivel" data-n="' + x.n + '"' +
          (aberto ? (falta ? ' title="' + esc(falta) + '"' : '')
            : ' disabled title="Faça ' + PISO + '% no nível anterior para abrir este"') + '>' +
          (aberto ? '' : '🔒 ') + 'Nível ' + x.n + (falta ? '<small>' + esc(falta) + '</small>' : '') + '</button>';
      }).join('') + '</div></div>' +
      '<p class="ouv-sobre"><strong>' + esc(nv.nome) + '.</strong> ' + esc(nv.sobre) + '</p>' +
      // A regra das 24 h precisa estar escrita: um nível que fecha sozinho,
      // sem aviso, parece defeito. Escrito, vira convite para voltar amanhã.
      '<p class="ouv-prazo">⏳ Um nível aberto fecha <strong>24 horas</strong> depois. ' +
      'Todo dia você recomeça do nível 1 — ouvido não se guarda, se mantém.</p>';
  }

  function placarHTML() {
    return '<div class="ouv-placar">' +
      '<span class="ouv-chip">Pergunta <strong>' + state.pergunta + '</strong> de ' + POR_RODADA + '</span>' +
      '<span class="ouv-chip">Acertos <strong>' + state.acertos + '</strong></span>' +
      '<span class="ouv-chip' + (state.sequencia >= 3 ? ' ouv-chip-quente' : '') + '">Sequência <strong>' +
      state.sequencia + '</strong></span>' +
      '</div>';
  }

  function botaoHTML(valor, rotulo, certoSe, largo) {
    var classe = 'ouv-grau' + (largo ? ' ouv-grau-largo' : '');
    if (state.respondido) {
      // Comparação por texto de propósito: o valor do botão é string e a
      // resposta guardada é número nas perguntas de grau. Comparando direto,
      // '4' === 4 dava falso e o botão errado nunca acendia em vermelho.
      if (certoSe) classe += ' is-certo';
      else if (String(valor) === String(state.ultimaResposta)) classe += ' is-errado';
    }
    return '<button type="button" class="' + classe + '" data-act="responder" data-v="' + esc(valor) + '"' +
      (state.respondido ? ' disabled' : '') + '>' + esc(rotulo) + '</button>';
  }

  function botoesHTML() {
    var nv = nivelAtual();
    if (state.alvo.tipo === 'acorde') {
      return '<div class="ouv-botoes">' + QUALIDADES.map(function (q) {
        return botaoHTML(q.q, q.rot, q.q === state.alvo.q, true);
      }).join('') + '</div>';
    }
    return '<div class="ouv-botoes">' + nv.graus.map(function (st) {
      var g = GRAUS.filter(function (x) { return x.st === st; })[0];
      return botaoHTML(String(st), g.rot, st === state.alvo.st, false);
    }).join('') + '</div>';
  }

  function respostaHTML() {
    if (!state.respondido) return '';
    var texto;
    if (state.alvo.tipo === 'acorde') {
      var certoAc = state.ultimaResposta === state.alvo.q;
      texto = (certoAc ? '✅ Isso. Era ' : '❌ Era ') + 'um acorde ' + state.alvo.q +
        ' (' + state.alvo.cifra + ': ' + state.alvo.tones.join(' – ') + ').' +
        (certoAc ? '' : ' A diferença está na terça — ouça de novo.');
      return '<div class="ouv-resposta ' + (certoAc ? 'ouv-certo' : 'ouv-errado') + '">' + esc(texto) + '</div>' +
        '<div class="ouv-acoes">' +
        '<button type="button" class="btn-primary" data-act="proxima">' +
        (state.pergunta >= POR_RODADA ? 'Ver o resultado ▶' : 'Próxima pergunta ▶') + '</button>' +
        '</div>';
    }
    var certo = state.ultimaResposta === state.alvo.st;
    var nome = nomeDoGrau(state.alvo.st);
    var ficha = state.alvo.nome + ' (grau ' + state.alvo.rot + (nome ? ', ' + nome : '') + ')';
    texto = certo
      ? '✅ Isso. Era a ' + ficha + '.'
      : '❌ Era a ' + ficha + '. Ouça de novo e guarde o som.';
    return '<div class="ouv-resposta ' + (certo ? 'ouv-certo' : 'ouv-errado') + '">' + esc(texto) + '</div>' +
      '<div class="ouv-acoes">' +
      '<button type="button" class="btn-primary" data-act="proxima">' +
      (state.pergunta >= POR_RODADA ? 'Ver o resultado ▶' : 'Próxima pergunta ▶') + '</button>' +
      '</div>';
  }

  function resultadoHTML() {
    var r = state.ultimoResultado;
    if (!r) return '';
    var nv = NIVEIS.filter(function (x) { return x.n === r.nivel; })[0];
    var abriu = r.passou && r.nivel < NIVEIS.length;
    return '<div class="ouv-fim ' + (r.passou ? 'ouv-fim-ok' : 'ouv-fim-quase') + '">' +
      '<div class="ouv-nota">' + r.acerto + '%</div>' +
      '<p>' + state.acertos + ' de ' + POR_RODADA + ' no nível ' + r.nivel + ' (' + esc(nv.nome) + ')' +
      (state.melhorSequencia >= 3 ? ' · melhor sequência: ' + state.melhorSequencia : '') + '.</p>' +
      '<p>' + (r.passou
        ? (abriu ? '<strong>Abriu o nível ' + (r.nivel + 1) + '.</strong> Pode subir quando quiser.'
          : '<strong>Você fechou o último nível.</strong> Agora é trocar de tom e manter.')
        : 'Faltou chegar a ' + PISO + '%. Repita — é ouvindo errado e corrigindo que o ouvido aprende.') +
      '</p></div>';
  }

  function render() {
    var alvo = $('ouv-conteudo');
    if (!alvo) return;
    var html = cabecalhoHTML();

    if (!state.rodando) {
      html += resultadoHTML() +
        '<div class="ouv-comecar">' +
        '<button type="button" class="btn-primary ouv-btn-grande" data-act="comecar">▶ ' +
        (state.ultimoResultado ? 'Jogar de novo' : 'Começar') + '</button>' +
        '<p class="si-legend">O sistema toca o acorde da tonalidade e, logo depois, uma nota. ' +
        'Você responde qual grau é. São ' + POR_RODADA + ' perguntas; ' + PISO + '% abre o próximo nível.</p>' +
        '</div>';
    } else {
      var ehAcorde = state.alvo && state.alvo.tipo === 'acorde';
      html += placarHTML() +
        '<div class="ouv-acoes ouv-acoes-topo">' +
        '<button type="button" class="view-btn btn-ouvir" data-act="de-novo">🔊 Ouvir ' +
        (ehAcorde ? 'o acorde' : 'a nota') + ' de novo</button>' +
        (ehAcorde ? '' :
          '<button type="button" class="view-btn" data-act="referencia">🎹 Ouvir a referência</button>') +
        '</div>' +
        '<p class="ouv-pergunta">' +
        (ehAcorde ? 'Esse acorde é maior ou menor?' : 'Que grau é essa nota?') + '</p>' +
        botoesHTML() + respostaHTML();
    }

    alvo.innerHTML = html;
    var sel = $('ouv-tom');
    if (sel) sel.value = state.tom;
  }

  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!b) return;
    var act = b.getAttribute('data-act');
    if (act === 'comecar') { novaRodada(); return; }
    if (act === 'responder') {
      var v = b.getAttribute('data-v');
      responder(state.alvo && state.alvo.tipo === 'acorde' ? v : Number(v));
      return;
    }
    if (act === 'de-novo') { tocarPergunta(true); return; }
    if (act === 'referencia') { tocarReferencia(); return; }
    if (act === 'proxima') {
      if (state.pergunta >= POR_RODADA) fecharRodada(); else proximaPergunta();
      return;
    }
    if (act === 'nivel') {
      var n = Number(b.getAttribute('data-n'));
      if (!state.liberado[n]) return;
      state.nivel = n;
      state.rodando = false;
      state.ultimoResultado = null;
      render();
    }
  }

  function build() {
    if (state.built) return;
    state.built = true;
    var alvo = $('ouv-conteudo');
    if (!alvo) return;
    alvo.addEventListener('click', onClick);
    alvo.addEventListener('change', function (ev) {
      if (ev.target && ev.target.id === 'ouv-tom') {
        state.tom = ev.target.value;
        // Trocar de tom no meio da rodada tornaria a pergunta atual injusta:
        // a referência já tocou na tonalidade antiga. Então a rodada recomeça.
        state.rodando = false;
        state.ultimoResultado = null;
        render();
      }
    });
  }

  function renderOuvidoView() {
    build();
    aplicarAberturas();                   // 24 h passaram? então trancou
    render();
  }

  window.IL = window.IL || {};
  window.IL.ui = window.IL.ui || {};
  window.IL.ui.renderOuvidoView = renderOuvidoView;
  // Exposto para os testes: as regras do jogo sem passar pela tela.
  window.IL.ouvido = { GRAUS: GRAUS, NIVEIS: NIVEIS, PISO: PISO, POR_RODADA: POR_RODADA, _state: state };
})();
