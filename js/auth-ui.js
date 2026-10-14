/**
 * IMPROVIX — interface da Etapa 4 (contas de usuário)
 *
 * Liga a UI (cabeçalho, modal de login, telas de Histórico/Favoritos/
 * Meus Exercícios/Configurações, botões de salvar/favoritar) ao cliente
 * Supabase (js/supabaseClient.js). Não sabe nada sobre teoria musical —
 * usa a API exposta em window.IL.ui (definida em js/app.js) para ler o
 * estado atual e acionar telas/ações.
 */
(function () {
  'use strict';

  var db = window.IL.db;
  var currentUser = null;
  var currentProfile = null;
  var authMode = 'login';
  var configSistema = null;      // config_sistema (modo de cadastro, mensagem, módulos)
  var recuperandoSenha = false;  // chegou pelo link de "senha nova"

  /**
   * O IMPROVIX é um sistema fechado: sem conta aprovada, ninguém usa.
   *
   * Isso só vale quando há banco configurado — sem Supabase (instalação
   * local de quem está programando, ou biblioteca que não carregou) o site
   * abre, porque aí não existe conta nenhuma para conferir e trancar tudo
   * só deixaria a pessoa de fora do próprio computador dela.
   *
   * Vale dizer com todas as letras: isto tranca o USO do sistema e, o que
   * mais importa, os DADOS (o banco recusa quem não foi aprovado — ver
   * sql/schema.sql). Os arquivos do site em si são públicos, como em
   * qualquer site estático; esconder o código exigiria um servidor.
   */
  function sistemaFechado() { return db.isConfigured() && db.sdkLoaded(); }

  function podeUsar() {
    if (!sistemaFechado()) return true;
    return !!(currentUser && currentProfile && currentProfile.aprovado && !currentProfile.bloqueado);
  }

  // Publicado logo na carga do script (não só dentro do DOMContentLoaded)
  // para que js/app.js (Etapa 5 — Planos) já encontre window.IL.account
  // pronto quando checar o plano do usuário, mesmo antes da sessão do
  // Supabase terminar de carregar (nesse meio-tempo, isPro() responde
  // "não Pro" por padrão, o que é o comportamento seguro).
  window.IL = window.IL || {};
  window.IL.account = {
    isLoggedIn: function () { return !!currentUser; },
    // Os planos acabaram em 13/10/2026: o sistema virou fechado, e quem foi
    // aprovado tem tudo. A função continua existindo porque outras telas a
    // consultam — agora ela responde "sim" para todo usuário aprovado.
    isPro: function () { return podeUsar(); },
    isAdmin: function () { return !!(currentProfile && currentProfile.papel === 'admin' && !currentProfile.bloqueado && currentProfile.aprovado); },
    isBlocked: function () { return !!(currentProfile && currentProfile.bloqueado); },
    isApproved: function () { return !!(currentProfile && currentProfile.aprovado); },
    canUse: podeUsar,
    modulos: function () {
      // telas liberadas: o que o admin marcou para esta pessoa; se nada,
      // o que ele marcou para todo mundo
      var p = currentProfile && currentProfile.modulos;
      var g = configSistema && configSistema.modulos;
      return (p && Object.keys(p).length ? p : g) || {};
    }
  };

  function $(id) { return document.getElementById(id); }

  function showAuthGate(elId, show) {
    var el = $(elId);
    if (el) el.hidden = !show;
  }

  function updateActionButtons() {
    var loggedIn = !!currentUser;
    [['btn-salvar-historico', 'Entre para salvar no histórico'],
      ['btn-favoritar', 'Entre para favoritar'],
      ['btn-exercicio', 'Entre para adicionar aos exercícios']].forEach(function (pair) {
      var btn = $(pair[0]);
      if (!btn) return;
      btn.disabled = !loggedIn;
      btn.title = loggedIn ? '' : pair[1];
    });
  }

  function renderHeader() {
    var area = $('user-area');
    if (!area) return;
    if (currentUser) {
      var papel = window.IL.account.isAdmin() ? '👑 Administrador' : 'Conta liberada';
      area.innerHTML =
        '<div class="avatar">' + currentUser.email.charAt(0).toUpperCase() + '</div>' +
        '<div class="user-info">' +
        '<div class="user-name">' + currentUser.email + '</div>' +
        '<div class="user-plan">' + papel + '</div>' +
        '</div>' +
        '<button class="btn-logout" id="btn-sair" title="Sair">⏻</button>';
      $('btn-sair').addEventListener('click', handleSignOut);
    } else {
      area.innerHTML = '<button class="btn-primary" id="btn-entrar">Entrar</button>';
      $('btn-entrar').addEventListener('click', openAuthModal);
    }
    updateActionButtons();
    atualizarIconeSugestao();
  }

  /**
   * O 💡 do alto só existe para quem está dentro: sem conta liberada não há
   * para quem mandar sugestão, e um ícone que não funciona é pior que nenhum.
   */
  function atualizarIconeSugestao() {
    var b = $('btn-sugestao');
    if (!b) return;
    b.hidden = !(currentUser && podeUsar());
    if (b.hidden) { var c = $('sugestao-conta'); if (c) c.hidden = true; }
  }

  // ---------------- Modal de login/cadastro ----------------

  function renderAuthModalMode() {
    $('auth-modal-title').textContent = authMode === 'login' ? 'Entrar' : 'Criar conta';
    $('auth-submit-btn').textContent = authMode === 'login' ? 'Entrar' : 'Criar conta';
    $('auth-toggle-text').textContent = authMode === 'login' ? 'Não tem conta?' : 'Já tem conta?';
    $('auth-toggle-link').textContent = authMode === 'login' ? 'Criar conta' : 'Entrar';
  }

  function setAuthMsg(text, isError) {
    var box = $('auth-modal-msg');
    box.hidden = !text;
    box.textContent = text || '';
    box.className = 'auth-modal-msg' + (isError ? ' is-error' : '');
  }

  // ---------------- O portão ----------------

  /**
   * Mostra ou esconde a tela de entrada conforme a situação da conta.
   * Estados: entrar/criar conta · esperando aprovação · acesso suspenso ·
   * senha nova (quem chegou pelo link do e-mail).
   */
  function atualizarPortao() {
    var fechado = sistemaFechado();
    var liberado = podeUsar();
    document.body.classList.toggle('sistema-travado', fechado && !liberado);
    $('auth-marca').hidden = !fechado;

    var mensagem = $('auth-mensagem');
    var txt = configSistema && configSistema.mensagem_login;
    mensagem.hidden = !(fechado && txt && !liberado);
    mensagem.textContent = txt || '';

    // o cadastro só aparece quando o administrador o mantém aberto
    var modo = (configSistema && configSistema.cadastro) || 'aprovacao';
    var podeCadastrar = !fechado || modo !== 'fechado';
    $('auth-toggle-link').parentNode.hidden = !podeCadastrar;
    $('auth-esqueci-linha').hidden = !fechado;

    var esperando = fechado && currentUser && currentProfile && !currentProfile.aprovado && !currentProfile.bloqueado;
    var form = $('auth-form');
    var estado = $('auth-estado');
    var novaSenha = $('auth-nova-senha');

    novaSenha.hidden = !recuperandoSenha;
    form.hidden = !!esperando || recuperandoSenha;
    $('auth-toggle-link').parentNode.hidden = !podeCadastrar || !!esperando || recuperandoSenha;
    $('auth-esqueci-linha').hidden = !fechado || !!esperando || recuperandoSenha;
    estado.hidden = !esperando;

    if (esperando) {
      $('auth-modal-title').textContent = 'Quase lá';
      $('auth-estado-txt').textContent =
        'Sua conta (' + currentUser.email + ') foi criada e está esperando a liberação de quem ' +
        'administra o IMPROVIX. Assim que for liberada, é só entrar de novo com o mesmo e-mail e senha.';
    } else if (recuperandoSenha) {
      $('auth-modal-title').textContent = 'Senha nova';
    } else {
      renderAuthModalMode();
    }

    if (fechado && !liberado) $('auth-modal').hidden = false;
    else if (fechado && liberado) { $('auth-modal').hidden = true; $('auth-form').reset(); }
  }

  function carregarConfig() {
    if (!db.getConfig || !sistemaFechado()) return Promise.resolve(null);
    // Promise.resolve envolve o retorno: o supabase-js devolve um "thenable"
    // que nem sempre tem .catch, e um erro aqui não pode derrubar a tela de
    // entrada inteira.
    return Promise.resolve(db.getConfig()).then(function (res) {
      configSistema = res && res.data ? res.data : null;
      return configSistema;
    }).catch(function () { return null; });
  }

  // ---------------- Caixa de ideias (sugestões) ----------------

  function abrirSugestao() {
    if (!(currentUser && podeUsar())) return;
    $('sugestao-msg').hidden = true;
    $('sugestao-form').hidden = false;
    $('sugestao-modal').hidden = false;
    var t = $('sugestao-texto');
    t.value = '';
    t.focus();
  }

  function fecharSugestao() { $('sugestao-modal').hidden = true; }

  function mandarSugestao(ev) {
    ev.preventDefault();
    var texto = $('sugestao-texto').value.trim();
    if (!texto) return;
    var msg = $('sugestao-msg');
    var btn = $('sugestao-enviar');
    btn.disabled = true;
    msg.hidden = false;
    msg.className = 'auth-modal-msg';
    msg.textContent = 'Mandando…';
    Promise.resolve(db.enviarSugestao(texto)).then(function (res) {
      btn.disabled = false;
      if (res && res.error) {
        msg.className = 'auth-modal-msg is-error';
        msg.textContent = res.error.message;
        return;
      }
      $('sugestao-form').hidden = true;
      msg.className = 'auth-modal-msg';
      msg.textContent = 'Chegou! Obrigado — quem administra o IMPROVIX vai ler.';
      timer(function () { fecharSugestao(); }, 2200);
    }).catch(function (e) {
      btn.disabled = false;
      msg.className = 'auth-modal-msg is-error';
      msg.textContent = (e && e.message) || 'Não deu certo. Tente de novo.';
    });
  }

  /** Um setTimeout que não trava teste nenhum se a página fechar antes. */
  function timer(fn, ms) { setTimeout(fn, ms); }

  function openAuthModal() {
    authMode = 'login';
    renderAuthModalMode();
    setAuthMsg('', false);
    if (!db.sdkLoaded()) {
      setAuthMsg('Não foi possível carregar a biblioteca do Supabase (verifique sua internet).', true);
    } else if (!db.isConfigured()) {
      setAuthMsg('O login ainda não foi configurado nesta instalação. Veja docs/etapa4-supabase.md.', true);
    }
    $('auth-modal').hidden = false;
  }

  function closeAuthModal() {
    // No sistema fechado, a tela de entrada não fecha: ela é o portão.
    if (sistemaFechado() && !podeUsar()) { atualizarPortao(); return; }
    $('auth-modal').hidden = true;
    $('auth-form').reset();
  }

  function handleAuthSubmit(ev) {
    ev.preventDefault();
    var email = $('auth-email').value.trim();
    var password = $('auth-password').value;
    setAuthMsg('Um instante…', false);
    var action = authMode === 'login' ? db.signIn(email, password) : db.signUp(email, password);
    action.then(function (res) {
      if (res.error) { setAuthMsg(res.error.message, true); return; }
      if (authMode === 'signup' && res.data && res.data.user && !res.data.session) {
        setAuthMsg('Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois entre.', false);
        return;
      }
      if (authMode === 'signup' && sistemaFechado()) {
        var modo = (configSistema && configSistema.cadastro) || 'aprovacao';
        if (modo !== 'livre') {
          setAuthMsg('Conta criada! Agora é esperar a liberação de quem administra o IMPROVIX.', false);
        }
      }
      closeAuthModal();
    }).catch(function (err) {
      setAuthMsg((err && err.message) || 'Erro inesperado.', true);
    });
  }

  function handleSignOut() {
    db.signOut(); // onAuthStateChange atualiza a tela
  }

  // ---------------- Telas liberadas pelo administrador ----------------
  // O admin pode desligar módulos para todo mundo (configuração geral) ou
  // para uma pessoa só. Início e Configurações nunca somem — senão alguém
  // ficaria dentro do sistema sem lugar nenhum para ir.
  // Mesma ordem do menu em index.html — o admin marca as telas na ordem em
  // que a pessoa vai vê-las, senão a conferência vira caça ao tesouro.
  var MODULOS = [
    { nav: 'inicio', label: 'Início — treinar escalas', fixo: true },
    { nav: 'padroes', label: 'Exercícios de Padrões' },
    { nav: 'biblioteca-escalas', label: 'Biblioteca de Escalas' },
    { nav: 'biblioteca-fraseados', label: 'Biblioteca de Fraseados' },
    { nav: 'harmonia', label: 'Análise de Harmonia' },
    { nav: 'transcricao', label: 'Transcrição / Treino' },
    { nav: 'acordes', label: 'Biblioteca de Acordes' },
    { nav: 'meus-exercicios', label: 'Meus Exercícios' },
    { nav: 'config', label: 'Configurações', fixo: true }
  ];

  function moduloLiberado(nav) {
    var m = MODULOS.filter(function (x) { return x.nav === nav; })[0];
    if (m && m.fixo) return true;
    if (window.IL.account.isAdmin()) return true;      // o admin vê tudo
    var mapa = window.IL.account.modulos();
    return mapa[nav] !== false;                        // só sai se foi desligado
  }

  function aplicarModulos() {
    MODULOS.forEach(function (m) {
      var item = document.querySelector('.nav-item[data-nav="' + m.nav + '"]');
      if (!item || m.nav === 'admin') return;
      var liberado = moduloLiberado(m.nav);
      item.hidden = !liberado;
      // se a pessoa estava justo na tela que foi desligada, volta para o Início
      if (!liberado && item.classList.contains('active')) {
        var inicio = document.querySelector('.nav-item[data-nav="inicio"]');
        if (inicio) inicio.click();
      }
    });
  }

  // ---------------- Navegação entre telas ----------------

  var VIEW_MAP = {
    inicio: 'inicio',
    harmonia: 'harmonia',
    // A análise de harmonia foi a tela de Início até 07/10/2026; quem chegar
    // por um caminho antigo continua caindo nela.
    'nova-analise': 'harmonia',
    'meus-exercicios': 'exercicios',
    favoritos: 'favoritos',
    historico: 'historico',
    acordes: 'acordes',
    aulas: 'aulas',
    'biblioteca-fraseados': 'biblioteca-fraseados',
    'biblioteca-fusion': 'biblioteca-fraseados',
    padroes: 'padroes',
    transcricao: 'transcricao',
    'biblioteca-escalas': 'biblioteca-escalas',
    admin: 'admin',
    config: 'config'
  };

  // "Meus Exercícios" reúne três listas em abas (antes eram três telas e três
  // itens de menu). `abrirMeus(aba)` mostra a tela e a aba pedida.
  function abrirMeus(aba) {
    window.IL.ui.switchView('exercicios');
    document.querySelectorAll('.meus-tabs .tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-meus') === aba);
    });
    document.querySelectorAll('[data-meus-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-meus-panel') !== aba;
    });
    if (aba === 'favoritos') renderFavoritosView();
    else if (aba === 'historico') renderHistoricoView();
    else renderExerciciosView();
  }

  function setupMeusTabs() {
    document.querySelectorAll('.meus-tabs .tab').forEach(function (t) {
      t.addEventListener('click', function () { abrirMeus(t.getAttribute('data-meus')); });
    });
  }

  function setupNavViews() {
    document.querySelectorAll('.nav-item[data-nav]').forEach(function (item) {
      item.addEventListener('click', function () {
        if (item.classList.contains('is-soon')) return;
        var view = VIEW_MAP[item.getAttribute('data-nav')];
        if (!view) return;
        // As três listas moraram em telas separadas até 12/09/2026; quem
        // chegar por um caminho antigo cai na aba certa da tela única.
        if (view === 'historico' || view === 'favoritos' || view === 'exercicios') { abrirMeus(view); return; }
        window.IL.ui.switchView(view);
        if (view === 'inicio' && window.IL.ui.renderTreinoView) { window.IL.ui.renderTreinoView(); return; }
        if (view === 'admin') renderAdminView();
        else if (view === 'config') renderConfigView();
        else if (view === 'acordes' && window.IL.ui.renderAcordesView) window.IL.ui.renderAcordesView();
        else if (view === 'aulas' && window.IL.ui.renderAulasView) window.IL.ui.renderAulasView();
        else if (view === 'padroes' && window.IL.ui.renderPadroesView) window.IL.ui.renderPadroesView();
        else if (view === 'transcricao' && window.IL.ui.renderTranscricaoView) window.IL.ui.renderTranscricaoView();
        else if (view === 'biblioteca-escalas' && window.IL.ui.renderEscalasView) window.IL.ui.renderEscalasView();
        else if (view === 'biblioteca-fraseados' && window.IL.ui.renderBibliotecaView) {
          window.IL.ui.renderBibliotecaView(item.getAttribute('data-nav') === 'biblioteca-fusion'
            ? { style: 'fusion', level: 'avancado', instrument: 'guitarra' } : null);
        }
      });
    });
  }

  // ---------------- Registros (histórico / favoritos / exercícios) ----------------

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return iso; }
  }

  function recordSummary(row) {
    return row.tonalidade + ' ' + row.modo + ' · ' + row.progressao;
  }

  function loadAnaliseIntoForm(row) {
    window.IL.ui.abrirHarmonia();
    $('input-tonalidade').value = row.tonalidade + '|' + row.modo;
    $('input-instrumento').value = row.instrumento;
    $('input-nivel').value = row.nivel;
    $('input-progressao').value = row.progressao;
    window.IL.ui.runAnalysis();
  }

  function openPhraseFromRecord(row) {
    loadAnaliseIntoForm(row);
    window.IL.ui.switchTab('fraseados');
    window.IL.ui.selectPhrase(row.phrase_index, row.titulo);
  }

  function renderEmptyOrError(wrap, res, emptyMsg) {
    if (res.error) { wrap.innerHTML = '<p class="muted-note">' + res.error.message + '</p>'; return true; }
    if (!res.data || res.data.length === 0) { wrap.innerHTML = '<p class="muted-note">' + emptyMsg + '</p>'; return true; }
    return false;
  }

  function renderHistoricoView() {
    showAuthGate('auth-gate-historico', !currentUser);
    var wrap = $('lista-historico');
    wrap.innerHTML = '';
    if (!currentUser) return;
    db.listAnalises().then(function (res) {
      if (renderEmptyOrError(wrap, res, 'Nenhuma análise salva ainda.')) return;
      res.data.forEach(function (row) {
        var item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML =
          '<div class="record-info">' +
          '<div class="record-title">' + recordSummary(row) + '</div>' +
          '<div class="record-sub">' + row.instrumento + ' · ' + row.nivel + ' · ' + formatDate(row.criado_em) + '</div>' +
          '</div>' +
          '<div class="record-actions">' +
          '<button class="btn-chip-action" data-action="carregar">Carregar</button>' +
          '<button class="btn-chip-action btn-danger" data-action="excluir">Excluir</button>' +
          '</div>';
        item.querySelector('[data-action="carregar"]').addEventListener('click', function () { loadAnaliseIntoForm(row); });
        item.querySelector('[data-action="excluir"]').addEventListener('click', function () {
          db.deleteAnalise(row.id).then(function () { renderHistoricoView(); });
        });
        wrap.appendChild(item);
      });
    });
  }

  function renderFavoritosView() {
    showAuthGate('auth-gate-favoritos', !currentUser);
    var wrap = $('lista-favoritos');
    wrap.innerHTML = '';
    if (!currentUser) return;
    db.listFavoritos().then(function (res) {
      if (renderEmptyOrError(wrap, res, 'Nenhum fraseado favoritado ainda.')) return;
      res.data.forEach(function (row) {
        var item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML =
          '<div class="record-info">' +
          '<div class="record-title">' + row.titulo + '</div>' +
          '<div class="record-sub">' + recordSummary(row) + ' · ' + formatDate(row.criado_em) + '</div>' +
          '</div>' +
          '<div class="record-actions">' +
          '<button class="btn-chip-action" data-action="abrir">Abrir</button>' +
          '<button class="btn-chip-action btn-danger" data-action="remover">Remover</button>' +
          '</div>';
        item.querySelector('[data-action="abrir"]').addEventListener('click', function () { openPhraseFromRecord(row); });
        item.querySelector('[data-action="remover"]').addEventListener('click', function () {
          db.deleteFavorito(row.id).then(function () { renderFavoritosView(); });
        });
        wrap.appendChild(item);
      });
    });
  }

  var STATUS_LABELS = { pendente: 'Pendente', praticando: 'Praticando', dominado: 'Dominado' };

  function renderExerciciosView() {
    showAuthGate('auth-gate-exercicios', !currentUser);
    var wrap = $('lista-exercicios');
    wrap.innerHTML = '';
    if (!currentUser) return;
    db.listExercicios().then(function (res) {
      if (renderEmptyOrError(wrap, res, 'Nenhum exercício adicionado ainda.')) return;
      res.data.forEach(function (row) {
        var item = document.createElement('div');
        item.className = 'record-item';
        var options = Object.keys(STATUS_LABELS).map(function (s) {
          return '<option value="' + s + '"' + (s === row.status ? ' selected' : '') + '>' + STATUS_LABELS[s] + '</option>';
        }).join('');
        item.innerHTML =
          '<div class="record-info">' +
          '<div class="record-title">' + row.titulo + '</div>' +
          '<div class="record-sub">' + recordSummary(row) + ' · ' + formatDate(row.criado_em) + '</div>' +
          '</div>' +
          '<div class="record-actions">' +
          '<select class="record-status-select">' + options + '</select>' +
          '<button class="btn-chip-action" data-action="abrir">Abrir</button>' +
          '<button class="btn-chip-action btn-danger" data-action="remover">Remover</button>' +
          '</div>';
        item.querySelector('.record-status-select').addEventListener('change', function (ev) {
          db.updateExercicioStatus(row.id, ev.target.value);
        });
        item.querySelector('[data-action="abrir"]').addEventListener('click', function () { openPhraseFromRecord(row); });
        item.querySelector('[data-action="remover"]').addEventListener('click', function () {
          db.deleteExercicio(row.id).then(function () { renderExerciciosView(); });
        });
        wrap.appendChild(item);
      });
    });
  }

  // Os planos acabaram em 13/10/2026 (o sistema virou fechado: quem entra,
  // entra inteiro). O que sobrou é a lista do que a pessoa tem — útil na
  // tela de Configurações e na de entrada.
  function planComparisonHTML() {
    return (
      '<div class="plan-compare">' +
      '<div class="plan-card plan-card-pro">' +
      '<div class="plan-card-title">O que você tem aqui dentro</div>' +
      '<ul class="plan-features">' +
      '<li>Treino de escalas: 21 exercícios em duas oitavas</li>' +
      '<li>Análise de harmonia completa, nos oito instrumentos</li>' +
      '<li>Biblioteca de Acordes: violão, guitarra, teclado e baixo</li>' +
      '<li>Bibliotecas de Escalas e de Fraseados, nível até Avançado</li>' +
      '<li>Exercícios de Padrões nos 12 tons</li>' +
      '<li>Transcrição de solos por áudio, no seu navegador</li>' +
      '<li>Histórico, Favoritos e Meus Exercícios</li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '<p class="muted-note">Não há cobrança nenhuma: o acesso é liberado por ' +
      'quem administra o IMPROVIX.</p>'
    );
  }

  // ---------------- Administração ----------------
  // Nada aqui é uma trava de segurança: quem decide o que este usuário pode
  // ver e mudar é o banco (sql/schema.sql). Se um não-admin abrir esta tela
  // na marra pelo Console, a lista virá com o próprio perfil e só, e os
  // botões não terão efeito nenhum. A tela é conveniência para quem PODE.

  var adminState = {
    aba: 'contas', lista: [], convites: [], sugestoes: [], busca: '',
    carregando: false, aviso: '', editandoTelas: null
  };

  function escHtml(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function renderAdminView() {
    var box = $('admin-conteudo');
    if (!box) return;
    if (!currentUser) {
      box.innerHTML = '<p class="muted-note">Entre na sua conta para continuar.</p>';
      return;
    }
    if (!window.IL.account.isAdmin()) {
      box.innerHTML = '<p class="muted-note">Esta tela é só para administradores.</p>';
      return;
    }
    // Abrir a tela SEMPRE relê as contas: alguém pode ter se cadastrado desde
    // a última vez que o admin olhou — uma lista velha aqui esconde justo quem
    // está esperando liberação.
    adminState.aba = 'contas';
    adminState.aviso = '';
    adminState.editandoTelas = null;
    if (!adminState.carregando) { carregarAdmin(); return; }
    desenharAdmin();
  }

  function carregarAdmin() {
    adminState.carregando = true;
    if (adminState.lista.length) desenharAdmin();        // mantém a tabela na tela
    else $('admin-conteudo').innerHTML = '<p class="muted-note">Carregando…</p>';
    Promise.all([db.listProfiles(), db.listConvites(), db.getConfig(), db.listSugestoes()].map(function (x) {
      return Promise.resolve(x).catch(function (e) { return { error: e }; });
    })).then(function (res) {
      adminState.carregando = false;
      if (res[0].error) {
        $('admin-conteudo').innerHTML = '<div class="tra-erro">⚠️ ' + escHtml(res[0].error.message) + '</div>';
        return;
      }
      adminState.lista = res[0].data || [];
      adminState.convites = (res[1] && res[1].data) || [];
      if (res[2] && res[2].data) configSistema = res[2].data;
      adminState.sugestoes = (res[3] && res[3].data) || [];
      atualizarContaSugestoes();
      desenharAdmin();
    });
  }

  /** As abas da Administração: as contas e a configuração do sistema. */
  function abasHTML() {
    var novas = adminState.sugestoes.filter(function (x) { return !x.lida; }).length;
    return '<div class="tabs meus-tabs adm-abas">' +
      [['contas', '👥 Contas'], ['sugestoes', '💡 Sugestões' + (novas ? ' (' + novas + ')' : '')],
        ['sistema', '⚙ Sistema']].map(function (a) {
        return '<button class="tab' + (adminState.aba === a[0] ? ' active' : '') +
          '" data-adm="aba" data-v="' + a[0] + '">' + a[1] + '</button>';
      }).join('') + '</div>';
  }

  /**
   * "Há quanto tempo" em português de gente: é o que o admin lê de relance
   * para saber quem sumiu. A data exata fica no title, ao passar o mouse.
   */
  function tempoDesde(iso) {
    if (!iso) return { txt: 'nunca entrou', classe: 'adm-acesso-nunca', exato: '' };
    var ms = Date.now() - new Date(iso).getTime();
    var min = Math.floor(ms / 60000), h = Math.floor(min / 60), d = Math.floor(h / 24);
    var txt;
    if (ms < 0 || min < 2) txt = 'agora há pouco';
    else if (min < 60) txt = 'há ' + min + ' min';
    else if (h < 24) txt = 'há ' + h + (h === 1 ? ' hora' : ' horas');
    else if (d === 1) txt = 'ontem';
    else if (d < 30) txt = 'há ' + d + ' dias';
    else if (d < 60) txt = 'há 1 mês';
    else if (d < 365) txt = 'há ' + Math.floor(d / 30) + ' meses';
    else txt = 'há mais de um ano';
    return {
      txt: txt,
      classe: d >= 30 ? 'adm-acesso-sumiu' : (d >= 7 ? 'adm-acesso-longe' : 'adm-acesso-perto'),
      exato: formatDate(iso)
    };
  }

  function situacaoHTML(p) {
    if (p.bloqueado) {
      return '<span class="adm-status-bloq">bloqueado</span>' +
        (p.motivo_bloqueio ? '<br/><small>' + escHtml(p.motivo_bloqueio) + '</small>' : '');
    }
    if (!p.aprovado) return '<span class="adm-status-espera">esperando</span>';
    return '<span class="adm-status-ok">ativo</span>';
  }

  /** As telas liberadas para uma pessoa (ou a configuração geral). */
  function telasHTML(mapa, prefixo) {
    return '<div class="adm-telas">' + MODULOS.filter(function (m) { return !m.fixo; }).map(function (m) {
      var ligado = mapa[m.nav] !== false;
      return '<label class="adm-tela"><input type="checkbox" data-tela="' + m.nav + '" data-prefixo="' + prefixo + '"' +
        (ligado ? ' checked' : '') + '/> ' + escHtml(m.label) + '</label>';
    }).join('') + '</div>';
  }

  function desenharContas() {
    var termo = adminState.busca.trim().toLowerCase();
    var lista = adminState.lista.filter(function (p) {
      return !termo || String(p.email || '').toLowerCase().indexOf(termo) >= 0;
    });
    var total = adminState.lista.length;
    var esperando = adminState.lista.filter(function (p) { return !p.aprovado && !p.bloqueado; }).length;
    var admins = adminState.lista.filter(function (p) { return p.papel === 'admin'; }).length;
    var bloqueados = adminState.lista.filter(function (p) { return p.bloqueado; }).length;
    var seteDias = Date.now() - 7 * 24 * 3600 * 1000;
    var ativos = adminState.lista.filter(function (p) {
      return p.ultimo_acesso && new Date(p.ultimo_acesso).getTime() >= seteDias;
    }).length;

    var resumo = '<div class="tra-resumo">' +
      '<div class="n"><span>contas</span><b>' + total + '</b></div>' +
      '<div class="n"><span>esperando liberação</span><b>' + esperando + '</b></div>' +
      '<div class="n"><span>administradores</span><b>' + admins + '</b></div>' +
      '<div class="n"><span>bloqueados</span><b>' + bloqueados + '</b></div>' +
      '<div class="n"><span>usaram nos últimos 7 dias</span><b>' + ativos + '</b></div>' +
      '</div>';

    var linhas = lista.map(function (p) {
      var eu = p.id === currentUser.id;
      var ehAdmin = p.papel === 'admin';
      var editando = adminState.editandoTelas === p.id;
      var acoes = eu
        ? '<small class="muted-note">Sua própria conta não pode ser alterada aqui — é o que garante que sempre sobre um admin.</small>'
        : '<button class="view-btn' + (p.aprovado ? '' : ' adm-destaque') + '" data-adm="aprovar" data-id="' + p.id + '">' +
          (p.aprovado ? '↓ Suspender liberação' : '✓ Liberar acesso') + '</button>' +
          '<button class="view-btn" data-adm="papel" data-id="' + p.id + '">' +
          (ehAdmin ? '↓ Tirar admin' : '👑 Tornar admin') + '</button>' +
          '<button class="view-btn" data-adm="telas" data-id="' + p.id + '">🖥 Telas</button>' +
          '<button class="view-btn" data-adm="senha" data-id="' + p.id + '">🔑 Senha nova</button>' +
          '<button class="view-btn adm-perigo adm-lixeira" data-adm="excluir" data-id="' + p.id +
          '" title="Excluir esta conta e tudo que ela guardou">🗑</button>' +
          '<button class="view-btn ' + (p.bloqueado ? '' : 'adm-perigo') + '" data-adm="bloqueio" data-id="' + p.id + '">' +
          (p.bloqueado ? '✓ Desbloquear' : '⛔ Bloquear') + '</button>';

      var linha = '<tr data-uid="' + escHtml(p.id) + '" class="' + (p.bloqueado ? 'adm-bloqueado' : '') + '">' +
        '<td><div class="adm-email">' + escHtml(p.email || '(sem e-mail)') + (eu ? ' <span class="adm-eu">você</span>' : '') + '</div>' +
        '<small class="adm-desde">desde ' + formatDate(p.criado_em) + '</small></td>' +
        '<td>' + situacaoHTML(p) + '</td>' +
        '<td>' + (function () {
          var a = tempoDesde(p.ultimo_acesso);
          return '<span class="' + a.classe + '"' + (a.exato ? ' title="' + escHtml(a.exato) + '"' : '') +
            '>' + a.txt + '</span>';
        })() + '</td>' +
        '<td>' + (ehAdmin ? '<span class="adm-papel">👑 admin</span>' : '<span class="muted-note">usuário</span>') + '</td>' +
        '<td>' + (p.modulos && Object.keys(p.modulos).length
          ? '<small>só as marcadas</small>' : '<small class="muted-note">as do sistema</small>') + '</td>' +
        '<td class="adm-acoes">' + acoes + '</td></tr>';

      if (editando) {
        linha += '<tr class="adm-editor"><td colspan="6">' +
          '<strong>Telas liberadas para ' + escHtml(p.email) + '</strong>' +
          telasHTML(p.modulos || (configSistema && configSistema.modulos) || {}, 'u') +
          '<div class="acd-forma-acoes">' +
          '<button class="view-btn" data-adm="salvar-telas" data-id="' + p.id + '">Salvar</button>' +
          '<button class="view-btn" data-adm="telas-padrao" data-id="' + p.id + '">Usar as do sistema</button>' +
          '<button class="view-btn" data-adm="telas-fechar">Cancelar</button>' +
          '</div><p class="si-legend">Início e Configurações nunca somem — senão a pessoa ficaria dentro do sistema sem lugar nenhum para ir.</p>' +
          '</td></tr>';
      }
      return linha;
    }).join('');

    return resumo +
      '<div class="adm-barra">' +
      '<input type="search" id="admin-busca" placeholder="Procurar por e-mail" value="' + escHtml(adminState.busca) + '" />' +
      '<button class="view-btn" data-adm="recarregar">↻ Atualizar</button>' +
      '</div>' +
      '<div class="adm-tabela-wrap"><table class="theory-table adm-tabela"><thead><tr>' +
      '<th>Conta</th><th>Situação</th><th>Último acesso</th><th>Papel</th><th>Telas</th><th>Ações</th>' +
      '</tr></thead><tbody>' +
      (linhas || '<tr><td colspan="6"><p class="muted-note">Ninguém encontrado com esse e-mail.</p></td></tr>') +
      '</tbody></table></div>' +
      '<p class="si-legend">Liberar e bloquear valem na hora: quem perde o acesso é desconectado assim que abrir ou voltar ' +
      'para a aba, e os dados ficam inacessíveis mesmo por fora do site — quem recusa é o banco, não a tela.</p>';
  }

  function desenharSistema() {
    var cfg = configSistema || {};
    var modo = cfg.cadastro || 'aprovacao';
    var MODOS = [
      ['aprovacao', 'Com aprovação',
        'A pessoa se cadastra, confirma o e-mail e fica esperando você liberar na aba Contas. ' +
        'Bom quando você quer olhar quem é antes de abrir a porta.'],
      ['livre', 'Confirmou o e-mail, já entra',
        'Quem se cadastra entra assim que clicar no link de confirmação — sem esperar por você. ' +
        'Você continua podendo suspender a liberação, bloquear ou excluir depois, na aba Contas.'],
      ['fechado', 'Fechado',
        'Não aparece botão de criar conta. Só entra quem você convidar pelo e-mail, aqui embaixo.']
    ];

    return '<div class="adm-sec">' +
      '<h4 class="esc-grupo">Quem pode entrar</h4>' +
      '<p class="si-legend">Nos três, a pessoa só consegue entrar depois de confirmar o e-mail ' +
      '— isso é do Supabase e vale sempre. O que muda aqui é o que acontece <strong>depois</strong> ' +
      'da confirmação.</p>' +
      '<div class="adm-modos">' +
      MODOS.map(function (m) {
        return '<label class="adm-modo' + (modo === m[0] ? ' is-on' : '') + '">' +
          '<input type="radio" name="adm-cadastro" value="' + m[0] + '"' + (modo === m[0] ? ' checked' : '') + '/>' +
          '<span><strong>' + m[1] + '</strong><small>' + m[2] + '</small></span></label>';
      }).join('') +
      '</div>' +
      '</div>' +

      '<div class="adm-sec">' +
      '<h4 class="esc-grupo">Recado na tela de entrada</h4>' +
      '<p class="si-legend">Aparece para todo mundo antes de entrar. Deixe em branco para não mostrar nada.</p>' +
      '<textarea id="adm-mensagem" class="adm-textarea" rows="3" placeholder="Ex.: Aula na quinta, 19h. Quem ainda não tem acesso, me chame no WhatsApp.">' +
      escHtml(cfg.mensagem_login || '') + '</textarea>' +
      '</div>' +

      '<div class="adm-sec">' +
      '<h4 class="esc-grupo">Telas liberadas para todo mundo</h4>' +
      '<p class="si-legend">Vale para os usuários comuns. Você, como administrador, continua vendo tudo. Dá para abrir ou fechar telas para uma pessoa só na aba Contas.</p>' +
      telasHTML((cfg.modulos) || {}, 'g') +
      '</div>' +

      '<div class="acd-forma-acoes"><button class="btn-primary" data-adm="salvar-sistema">Salvar configuração</button></div>' +

      '<div class="adm-sec">' +
      '<h4 class="esc-grupo">Convidar pelo e-mail</h4>' +
      '<p class="si-legend">Quem se cadastrar com um e-mail convidado já entra liberado, sem esperar. No modo fechado, é o único jeito de entrar. ' +
      'O convite guarda só o e-mail: a senha é a própria pessoa que cria — administrador nenhum deve saber a senha de ninguém.</p>' +
      '<div class="adm-barra">' +
      '<input type="email" id="adm-convite" placeholder="aluno@exemplo.com" />' +
      '<button class="view-btn" data-adm="convidar">+ Convidar</button>' +
      '</div>' +
      (adminState.convites.length
        ? '<div class="adm-tabela-wrap"><table class="theory-table adm-tabela"><thead><tr><th>E-mail</th><th>Situação</th><th></th></tr></thead><tbody>' +
          adminState.convites.map(function (c) {
            return '<tr><td>' + escHtml(c.email) + '</td><td>' +
              (c.usado ? '<span class="adm-status-ok">já usado</span>' : '<span class="adm-status-espera">esperando</span>') +
              '</td><td class="adm-acoes"><button class="view-btn adm-perigo" data-adm="tirar-convite" data-email="' +
              escHtml(c.email) + '">Remover</button></td></tr>';
          }).join('') + '</tbody></table></div>'
        : '<p class="muted-note">Nenhum convite ainda.</p>') +
      '</div>';
  }

  /** A caixa de ideias, da mais nova para a mais velha. */
  function desenharSugestoes() {
    if (!adminState.sugestoes.length) {
      return '<p class="muted-note">Ninguém mandou sugestão ainda. Quem usa o site tem o ícone 💡 ' +
        'no alto da tela para escrever.</p>';
    }
    return '<p class="si-legend">O que quem usa o IMPROVIX mandou para você. ' +
      'Marque como lida para tirar do contador, e apague quando resolver.</p>' +
      adminState.sugestoes.map(function (g) {
        var q = tempoDesde(g.criado_em);
        return '<div class="sug-item' + (g.lida ? '' : ' sug-nova') + '">' +
          '<div class="sug-cab">' +
          '<span class="sug-quem">' + escHtml(g.email || '(conta removida)') + '</span>' +
          '<span class="sug-quando"' + (q.exato ? ' title="' + escHtml(q.exato) + '"' : '') + '>' +
          q.txt + (g.lida ? '' : ' · <strong>nova</strong>') + '</span></div>' +
          '<p class="sug-texto">' + escHtml(g.texto) + '</p>' +
          '<div class="sug-acoes">' +
          '<button class="view-btn" data-adm="sug-lida" data-id="' + g.id + '">' +
          (g.lida ? '↩ Marcar como não lida' : '✓ Marcar como lida') + '</button>' +
          '<button class="view-btn adm-perigo adm-lixeira" data-adm="sug-apagar" data-id="' + g.id +
          '" title="Apagar esta sugestão">🗑</button>' +
          '</div></div>';
      }).join('');
  }

  /** A bolinha vermelha no 💡 do alto: só o admin vê, e só se houver não lida. */
  function atualizarContaSugestoes() {
    var alvo = $('sugestao-conta');
    if (!alvo) return;
    var novas = window.IL.account.isAdmin()
      ? adminState.sugestoes.filter(function (x) { return !x.lida; }).length : 0;
    alvo.hidden = !novas;
    alvo.textContent = novas > 9 ? '9+' : String(novas);
  }

  function desenharAdmin() {
    $('admin-conteudo').innerHTML = abasHTML() +
      (adminState.aviso ? '<div class="tra-aviso tra-flash">' + escHtml(adminState.aviso) + '</div>' : '') +
      (adminState.aba === 'sistema' ? desenharSistema()
        : adminState.aba === 'sugestoes' ? desenharSugestoes() : desenharContas());

    var busca = $('admin-busca');
    if (busca) {
      busca.addEventListener('input', function () { adminState.busca = busca.value; desenharAdmin(); $('admin-busca').focus(); });
    }
    $('admin-conteudo').querySelectorAll('[data-adm]').forEach(function (b) {
      b.addEventListener('click', function () {
        acaoAdmin(b.getAttribute('data-adm'), b.getAttribute('data-id'), b);
      });
    });
    // O cartão aceso tem de acompanhar a bolinha na hora de clicar; se só
    // mudasse ao salvar, ficaria dizendo que vale o modo antigo.
    $('admin-conteudo').querySelectorAll('input[name="adm-cadastro"]').forEach(function (r) {
      r.addEventListener('change', function () {
        $('admin-conteudo').querySelectorAll('.adm-modo').forEach(function (lab) {
          var alvo = lab.querySelector('input[name="adm-cadastro"]');
          lab.classList.toggle('is-on', !!(alvo && alvo.checked));
        });
      });
    });
  }

  /** Lê as caixinhas de telas marcadas (prefixo 'g' = geral, 'u' = usuário). */
  function lerTelas(prefixo) {
    var mapa = {};
    $('admin-conteudo').querySelectorAll('[data-tela][data-prefixo="' + prefixo + '"]').forEach(function (c) {
      mapa[c.getAttribute('data-tela')] = c.checked;
    });
    return mapa;
  }

  /**
   * Excluir uma conta. Pede para escrever o e-mail antes: é a única ação da
   * tela que não dá para desfazer, e "tem certeza?" todo mundo clica no
   * automático. O banco também recusa o que não pode (ver excluir_conta no
   * sql/schema.sql) — aqui o cuidado é com a mão, não com a segurança.
   */
  function excluirConta(id) {
    var p = adminState.lista.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var digitado = window.prompt(
      'Excluir a conta de ' + p.email + '?\n\n' +
      'Isto apaga o histórico, os favoritos e os exercícios dessa pessoa, e não dá para desfazer.\n\n' +
      'Para confirmar, escreva o e-mail dela:');
    if (digitado === null) return;                       // desistiu
    if (digitado.trim().toLowerCase() !== String(p.email || '').toLowerCase()) {
      adminState.aviso = 'Não excluí nada: o e-mail escrito não é o de ' + p.email + '.';
      desenharAdmin();
      return;
    }
    adminState.aviso = 'Excluindo…';
    desenharAdmin();
    Promise.resolve(db.excluirConta(id)).then(function (res) {
      if (res && res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
      adminState.lista = adminState.lista.filter(function (x) { return x.id !== id; });
      adminState.aviso = 'A conta de ' + p.email + ' foi excluída, com tudo que ela tinha salvo. ' +
        'O login dela no Supabase continua existindo (sem perfil, ela não entra); ' +
        'para apagar de vez, remova em Authentication > Users, no painel do Supabase.';
      desenharAdmin();
    }).catch(function (e) {
      adminState.aviso = 'Não deu certo: ' + ((e && e.message) || 'erro inesperado');
      desenharAdmin();
    });
  }

  function acaoAdmin(acao, id, botao) {
    if (acao === 'aba') { adminState.aba = botao.getAttribute('data-v'); adminState.aviso = ''; desenharAdmin(); return; }
    if (acao === 'recarregar') { adminState.lista = []; adminState.aviso = ''; renderAdminView(); return; }
    if (acao === 'excluir') { excluirConta(id); return; }
    if (acao === 'sug-lida') {
      var g = adminState.sugestoes.filter(function (x) { return x.id === id; })[0];
      if (!g) return;
      // O valor novo é decidido AQUI, antes de pedir. Inverter de novo depois
      // da resposta (g.lida = !g.lida) parece igual e não é: se a resposta já
      // tiver mexido no objeto, a segunda inversão desfaz o que foi gravado.
      var novo = !g.lida;
      Promise.resolve(db.marcarSugestao(id, novo)).then(function (res) {
        if (res && res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
        g.lida = novo;
        atualizarContaSugestoes();
        desenharAdmin();
      });
      return;
    }
    if (acao === 'sug-apagar') {
      Promise.resolve(db.apagarSugestao(id)).then(function (res) {
        if (res && res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
        adminState.sugestoes = adminState.sugestoes.filter(function (x) { return x.id !== id; });
        atualizarContaSugestoes();
        adminState.aviso = 'Sugestão apagada.';
        desenharAdmin();
      });
      return;
    }
    if (acao === 'telas') { adminState.editandoTelas = id; desenharAdmin(); return; }
    if (acao === 'telas-fechar') { adminState.editandoTelas = null; desenharAdmin(); return; }

    if (acao === 'salvar-sistema') {
      var escolhido = $('admin-conteudo').querySelector('input[name="adm-cadastro"]:checked');
      var patch = {
        cadastro: escolhido ? escolhido.value : 'aprovacao',
        mensagem_login: $('adm-mensagem').value.trim() || null,
        modulos: lerTelas('g')
      };
      db.updateConfig(patch).then(function (res) {
        if (res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
        configSistema = res.data;
        adminState.aviso = 'Configuração salva.';
        aplicarModulos();
        desenharAdmin();
      });
      return;
    }

    if (acao === 'convidar') {
      var email = ($('adm-convite').value || '').trim().toLowerCase();
      if (!email) return;
      db.criarConvite(email).then(function (res) {
        if (res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
        adminState.convites = [res.data].concat(adminState.convites);
        adminState.aviso = email + ' foi convidado. Peça para a pessoa criar a conta com esse e-mail.';
        desenharAdmin();
      });
      return;
    }

    if (acao === 'tirar-convite') {
      var alvo = botao.getAttribute('data-email');
      db.apagarConvite(alvo).then(function (res) {
        if (res && res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
        adminState.convites = adminState.convites.filter(function (c) { return c.email !== alvo; });
        adminState.aviso = 'Convite de ' + alvo + ' removido.';
        desenharAdmin();
      });
      return;
    }

    var p = adminState.lista.filter(function (x) { return x.id === id; })[0];
    if (!p) return;

    if (acao === 'senha') {
      if (!confirm('Enviar para ' + p.email + ' um e-mail com o link para criar uma senha nova?')) return;
      db.enviarSenhaNova(p.email).then(function (res) {
        adminState.aviso = res.error
          ? 'Não deu certo: ' + res.error.message
          : 'E-mail enviado para ' + p.email + '. A pessoa clica no link e escolhe a senha — você não vê a senha dela.';
        desenharAdmin();
      });
      return;
    }

    var patch2 = null, texto = '';
    if (acao === 'aprovar') {
      patch2 = { aprovado: !p.aprovado };
      texto = p.email + (patch2.aprovado ? ' foi liberado e já pode usar o sistema.' : ' não tem mais acesso liberado.');
    } else if (acao === 'papel') {
      patch2 = { papel: p.papel === 'admin' ? 'usuario' : 'admin' };
      texto = p.email + (patch2.papel === 'admin' ? ' agora é administrador.' : ' não é mais administrador.');
    } else if (acao === 'bloqueio') {
      if (p.bloqueado) { patch2 = { bloqueado: false }; texto = p.email + ' foi desbloqueado.'; }
      else {
        var motivo = prompt('Bloquear ' + p.email + '.\n\nMotivo (opcional, fica registrado):', '');
        if (motivo === null) return;
        patch2 = { bloqueado: true, motivo_bloqueio: motivo || null };
        texto = p.email + ' foi bloqueado e perde o acesso agora.';
      }
    } else if (acao === 'salvar-telas') {
      patch2 = { modulos: lerTelas('u') };
      texto = 'Telas de ' + p.email + ' atualizadas.';
    } else if (acao === 'telas-padrao') {
      patch2 = { modulos: null };
      texto = p.email + ' volta a ver as telas do sistema.';
    }
    if (!patch2) return;

    db.updateProfile(id, patch2).then(function (res) {
      if (res.error) { adminState.aviso = 'Não deu certo: ' + res.error.message; desenharAdmin(); return; }
      // Confia no que o BANCO devolveu, não no que pedimos: se o trigger
      // tiver revertido algo, a tela mostra a verdade.
      adminState.lista = adminState.lista.map(function (x) { return x.id === id ? res.data : x; });
      adminState.aviso = texto;
      adminState.editandoTelas = null;
      desenharAdmin();
    });
  }

  function syncAdminNav() {
    var item = $('nav-admin');
    if (item) item.hidden = !window.IL.account.isAdmin();
  }

  function renderConfigView() {
    var wrap = $('config-conteudo');
    if (!currentUser) {
      wrap.innerHTML =
        '<p class="muted-note">Entre na sua conta para ver suas configurações.</p>' +
        planComparisonHTML();
      return;
    }
    var ehAdmin = window.IL.account.isAdmin();
    wrap.innerHTML =
      '<div class="config-row"><span class="config-label">E-mail</span><span>' + currentUser.email + '</span></div>' +
      '<div class="config-row"><span class="config-label">Acesso</span><span class="plan-badge' +
      (ehAdmin ? ' plan-badge-pro' : '') + '">' + (ehAdmin ? '👑 Administrador' : 'Liberado') + '</span></div>' +
      '<button class="btn-secondary" id="btn-trocar-senha">Trocar minha senha</button>' +
      '<div id="config-senha" hidden>' +
      '<div class="field"><label for="config-nova-senha">Senha nova</label>' +
      '<input type="password" id="config-nova-senha" minlength="6" autocomplete="new-password"/></div>' +
      '<button class="btn-primary" id="btn-salvar-senha">Salvar a senha</button>' +
      '<p class="si-legend" id="config-senha-msg"></p></div>' +
      '<button class="btn-secondary btn-config-sair" id="btn-sair-config">Sair da conta</button>' +
      planComparisonHTML();
    $('btn-sair-config').addEventListener('click', handleSignOut);
    $('btn-trocar-senha').addEventListener('click', function () {
      $('config-senha').hidden = !$('config-senha').hidden;
    });
    $('btn-salvar-senha').addEventListener('click', function () {
      var nova = $('config-nova-senha').value;
      if (!nova || nova.length < 6) { $('config-senha-msg').textContent = 'A senha precisa de pelo menos 6 letras.'; return; }
      $('config-senha-msg').textContent = 'Salvando…';
      db.trocarSenha(nova).then(function (res) {
        $('config-senha-msg').textContent = res.error ? res.error.message : 'Senha trocada.';
        if (!res.error) $('config-nova-senha').value = '';
      });
    });
  }

  // O Laboratório (gerador de progressões, exclusivo Pro) saiu do menu em
  // 13/10/2026 e deu lugar à Biblioteca de Acordes. O motor continua vivo em
  // js/lab.js: é ele que sugere a progressão quando se troca a tonalidade na
  // Análise de Harmonia.

  // ---------------- Salvar / favoritar / exercício ----------------

  function setupActionButtons() {
    var saveBtn = $('btn-salvar-historico');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var state = window.IL.ui.getState();
        if (!state.lastResult) return;
        var tonalidadeSel = $('input-tonalidade').value.split('|');
        db.saveAnalise({
          tonalidade: tonalidadeSel[0],
          modo: tonalidadeSel[1],
          progressao: $('input-progressao').value,
          instrumento: $('input-instrumento').value,
          nivel: $('input-nivel').value
        }).then(function (res) {
          if (res.error) { alert(res.error.message); return; }
          var original = saveBtn.textContent;
          saveBtn.textContent = '✓ Salvo!';
          setTimeout(function () { saveBtn.textContent = original; }, 1500);
        });
      });
    }

    var favBtn = $('btn-favoritar');
    if (favBtn) favBtn.addEventListener('click', function () { saveCurrentPhraseAs('favorito', favBtn); });

    var exeBtn = $('btn-exercicio');
    if (exeBtn) exeBtn.addEventListener('click', function () { saveCurrentPhraseAs('exercicio', exeBtn); });
  }

  function saveCurrentPhraseAs(kind, btn) {
    var state = window.IL.ui.getState();
    var phrase = state.phrases[state.selectedPhraseIndex];
    if (!phrase || !state.lastResult) return;
    var tonalidadeSel = $('input-tonalidade').value.split('|');
    var payload = {
      tonalidade: tonalidadeSel[0],
      modo: tonalidadeSel[1],
      progressao: $('input-progressao').value,
      instrumento: $('input-instrumento').value,
      nivel: $('input-nivel').value,
      phraseIndex: state.selectedPhraseIndex,
      titulo: phrase.title
    };
    var action = kind === 'favorito' ? db.saveFavorito(payload) : db.saveExercicio(payload);
    action.then(function (res) {
      if (res.error) { alert(res.error.message); return; }
      var original = btn.textContent;
      btn.textContent = '✓ Adicionado!';
      setTimeout(function () { btn.textContent = original; }, 1500);
    });
  }

  // ---------------- Boot ----------------

  function notifyAccountChange() {
    // Deixa a Etapa 5 (Planos) revalidar o que depende do plano — ex.: o
    // nível "Avançado" na tela de análise — sempre que login/logout/plano
    // mudarem.
    if (window.IL.ui && typeof window.IL.ui.onAccountChange === 'function') {
      window.IL.ui.onAccountChange();
    }
    // Se "Meus Exercícios" está aberto, recarrega a aba atual: quem acabou de
    // entrar vê a lista na hora, sem precisar navegar de novo.
    var tela = document.querySelector('.content.view[data-view="exercicios"]');
    if (tela && !tela.hidden) {
      var ativa = document.querySelector('.meus-tabs .tab.active');
      abrirMeus(ativa ? ativa.getAttribute('data-meus') : 'exercicios');
    }
  }

  // Se o admin bloqueou alguém que já estava logado, a sessão dessa pessoa
  // continua válida no navegador dela até expirar. O banco já recusa tudo
  // (as políticas de RLS negam quem está bloqueado), mas deixar a pessoa
  // navegando como se estivesse dentro seria confuso: aqui a conta é
  // encerrada na hora, com o motivo na tela.
  function cortarAcessoBloqueado() {
    var email = currentUser ? currentUser.email : '';
    var motivo = currentProfile && currentProfile.motivo_bloqueio;
    currentProfile = null;
    db.signOut().then(function () {
      currentUser = null;
      renderHeader();
      syncAdminNav();
      aplicarModulos();
      notifyAccountChange();
      openAuthModal();
      atualizarPortao();
      setAuthMsg('O acesso de ' + email + ' foi suspenso por quem administra a plataforma' +
        (motivo ? ' — motivo: ' + motivo : '') + '. Fale com o administrador se achar que é engano.', true);
    });
  }

  var perfilSumiu = false;   // ver o trecho "sessão válida e perfil nenhum"

  /** A conta foi excluída por quem administra: encerra a sessão explicando. */
  function contaRemovida() {
    var email = currentUser ? currentUser.email : '';
    perfilSumiu = false;
    currentProfile = null;
    db.signOut().then(function () {
      currentUser = null;
      renderHeader();
      syncAdminNav();
      aplicarModulos();
      notifyAccountChange();
      openAuthModal();
      atualizarPortao();
      setAuthMsg('A conta de ' + email + ' foi removida por quem administra o IMPROVIX. ' +
        'Se achar que é engano, fale com o administrador.', true);
    });
  }

  function refreshUserAndProfile(session) {
    currentUser = session ? session.user : null;
    if (!currentUser) {
      currentProfile = null;
      // Quem sai (ou chega sem sessão) vê a tela de ENTRAR, nunca a de criar
      // conta que ficou aberta antes. O recado de erro/aviso não é apagado
      // aqui: é por ele que a pessoa bloqueada descobre o motivo.
      authMode = 'login';
      renderHeader();
      syncAdminNav();
      aplicarModulos();
      notifyAccountChange();
      atualizarPortao();
      return;
    }
    db.getProfile(currentUser.id).then(function (res) {
      currentProfile = res.data || null;
      // Sessão válida e perfil nenhum: é a conta que o administrador excluiu
      // (o login no Supabase continua existindo). Sem isto a pessoa ficaria
      // olhando a tela de entrada sem entender por quê. Uma segunda tentativa
      // antes de desistir, porque logo depois do cadastro o perfil pode
      // demorar um instante para aparecer.
      if (!currentProfile) {
        if (perfilSumiu) { contaRemovida(); return; }
        perfilSumiu = true;
        setTimeout(function () { refreshUserAndProfile(session); }, 1200);
        return;
      }
      perfilSumiu = false;
      if (currentProfile && currentProfile.bloqueado) { cortarAcessoBloqueado(); return; }
      // O admin chega sabendo quantas sugestões ainda não leu, sem precisar
      // abrir a tela de Administração para a bolinha aparecer.
      if (currentProfile.papel === 'admin' && db.listSugestoes) {
        Promise.resolve(db.listSugestoes()).then(function (r) {
          adminState.sugestoes = (r && r.data) || [];
          atualizarContaSugestoes();
        }).catch(function () { /* sem sugestões, sem bolinha */ });
      }
      // Marca o último acesso: uma vez por visita, e só para quem entrou de
      // verdade (quem está esperando liberação ou bloqueado não "usou" nada).
      // A hora é do banco, não daqui — ver registrar_acesso() no schema.
      if (podeUsar() && db.registrarAcesso) {
        db.registrarAcesso().then(function (r) {
          if (currentProfile && r && r.data) currentProfile.ultimo_acesso = r.data;
        });
      }
      renderHeader();
      syncAdminNav();
      aplicarModulos();
      notifyAccountChange();
      atualizarPortao();
    });
  }

  /** Reconfere o perfil (bloqueio/plano/papel) sem mexer na tela à toa. */
  function reconferirPerfil() {
    if (!currentUser) return;
    db.getProfile(currentUser.id).then(function (res) {
      var p = res.data;
      if (!p) return;
      var mudou = !currentProfile || p.bloqueado !== currentProfile.bloqueado ||
        p.plano !== currentProfile.plano || p.papel !== currentProfile.papel ||
        p.aprovado !== currentProfile.aprovado ||
        JSON.stringify(p.modulos) !== JSON.stringify(currentProfile.modulos);
      currentProfile = p;
      if (p.bloqueado) { cortarAcessoBloqueado(); return; }
      if (mudou) {
        renderHeader(); syncAdminNav(); aplicarModulos(); notifyAccountChange(); atualizarPortao();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupNavViews();
    setupMeusTabs();
    setupActionButtons();

    $('auth-modal-close').addEventListener('click', closeAuthModal);
    $('auth-modal').addEventListener('click', function (ev) {
      if (ev.target === $('auth-modal')) closeAuthModal();
    });
    $('auth-form').addEventListener('submit', handleAuthSubmit);
    $('auth-toggle-link').addEventListener('click', function (ev) {
      ev.preventDefault();
      authMode = authMode === 'login' ? 'signup' : 'login';
      renderAuthModalMode();
      setAuthMsg('', false);
    });

    // "Esqueci minha senha": manda o e-mail com o link.
    $('auth-esqueci').addEventListener('click', function (ev) {
      ev.preventDefault();
      var email = $('auth-email').value.trim();
      if (!email) { setAuthMsg('Escreva seu e-mail aí em cima e clique de novo.', true); return; }
      setAuthMsg('Enviando…', false);
      db.enviarSenhaNova(email).then(function (res) {
        setAuthMsg(res.error ? res.error.message
          : 'Pronto. Se existir conta com esse e-mail, o link para criar uma senha nova já está a caminho.', !!res.error);
      });
    });

    // Senha nova (quem chegou pelo link do e-mail).
    $('auth-nova-senha').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nova = $('auth-nova').value;
      setAuthMsg('Salvando…', false);
      db.trocarSenha(nova).then(function (res) {
        if (res.error) { setAuthMsg(res.error.message, true); return; }
        recuperandoSenha = false;
        $('auth-nova-senha').reset();
        setAuthMsg('Senha trocada. Pode continuar.', false);
        atualizarPortao();
      });
    });

    $('auth-estado-sair').addEventListener('click', handleSignOut);

    $('btn-sugestao').addEventListener('click', abrirSugestao);
    $('sugestao-fechar').addEventListener('click', fecharSugestao);
    $('sugestao-modal').addEventListener('click', function (ev) {
      if (ev.target === $('sugestao-modal')) fecharSugestao();
    });
    $('sugestao-form').addEventListener('submit', mandarSugestao);

    if (!db.sdkLoaded()) {
      renderHeader();
      return;
    }

    // Sistema fechado: o portão sobe ANTES de saber se há sessão, para o
    // site não "piscar" aberto por um instante em quem não entrou.
    if (sistemaFechado()) {
      document.body.classList.add('sistema-travado');
      $('auth-modal').hidden = false;
    }

    carregarConfig().then(function () {
      atualizarPortao();
      return db.getSession();
    }).then(function (res) {
      refreshUserAndProfile(res && res.data && res.data.session);
    });

    db.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        recuperandoSenha = true;
        $('auth-modal').hidden = false;
        atualizarPortao();
        return;
      }
      refreshUserAndProfile(session);
    });

    // Voltou para a aba depois de um tempo? Reconfere o perfil: é assim que
    // um bloqueio (ou uma promoção a Pro/admin) aparece sem precisar
    // recarregar a página.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) reconferirPerfil();
    });
  });
})();
