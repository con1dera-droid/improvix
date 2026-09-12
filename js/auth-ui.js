/**
 * ImprovisaLab — interface da Etapa 4 (contas de usuário)
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

  // Publicado logo na carga do script (não só dentro do DOMContentLoaded)
  // para que js/app.js (Etapa 5 — Planos) já encontre window.IL.account
  // pronto quando checar o plano do usuário, mesmo antes da sessão do
  // Supabase terminar de carregar (nesse meio-tempo, isPro() responde
  // "não Pro" por padrão, o que é o comportamento seguro).
  window.IL = window.IL || {};
  window.IL.account = {
    isLoggedIn: function () { return !!currentUser; },
    isPro: function () { return !!(currentProfile && currentProfile.plano === 'pro'); }
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
      var plano = currentProfile && currentProfile.plano === 'pro' ? 'Pro' : 'Gratuito';
      area.innerHTML =
        '<div class="avatar">' + currentUser.email.charAt(0).toUpperCase() + '</div>' +
        '<div class="user-info">' +
        '<div class="user-name">' + currentUser.email + '</div>' +
        '<div class="user-plan">Plano ' + plano + '</div>' +
        '</div>' +
        '<button class="btn-logout" id="btn-sair" title="Sair">⏻</button>';
      $('btn-sair').addEventListener('click', handleSignOut);
    } else {
      area.innerHTML = '<button class="btn-primary" id="btn-entrar">Entrar</button>';
      $('btn-entrar').addEventListener('click', openAuthModal);
    }
    updateActionButtons();
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
      closeAuthModal();
    }).catch(function (err) {
      setAuthMsg((err && err.message) || 'Erro inesperado.', true);
    });
  }

  function handleSignOut() {
    db.signOut(); // onAuthStateChange atualiza a tela
  }

  // ---------------- Navegação entre telas ----------------

  var VIEW_MAP = {
    inicio: 'inicio',
    'nova-analise': 'inicio',
    'meus-exercicios': 'exercicios',
    favoritos: 'favoritos',
    historico: 'historico',
    laboratorio: 'laboratorio',
    aulas: 'aulas',
    'biblioteca-fraseados': 'biblioteca-fraseados',
    'biblioteca-fusion': 'biblioteca-fraseados',
    padroes: 'padroes',
    'biblioteca-escalas': 'biblioteca-escalas',
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
        if (view === 'config') renderConfigView();
        else if (view === 'laboratorio') renderLaboratorioView();
        else if (view === 'aulas' && window.IL.ui.renderAulasView) window.IL.ui.renderAulasView();
        else if (view === 'padroes' && window.IL.ui.renderPadroesView) window.IL.ui.renderPadroesView();
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
    window.IL.ui.switchView('inicio');
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

  // Etapa 5 (Planos): comparativo Gratuito x Pro, reaproveitado com ou sem
  // sessão ativa. Sem cobrança configurada ainda nesta instalação — não há
  // botão de "assinar" porque isso não processaria pagamento nenhum; virar
  // Pro é liberado manualmente (ver docs/etapa5-planos.md) até uma etapa
  // futura conectar um meio de pagamento de verdade.
  function planComparisonHTML() {
    return (
      '<div class="plan-compare">' +
      '<div class="plan-card">' +
      '<div class="plan-card-title">Gratuito</div>' +
      '<ul class="plan-features">' +
      '<li>Análise harmônica completa (todos os instrumentos)</li>' +
      '<li>Fraseados nível Iniciante e Intermediário</li>' +
      '<li>Áudio da progressão e dos fraseados</li>' +
      '<li>Histórico, Favoritos e Meus Exercícios</li>' +
      '</ul>' +
      '</div>' +
      '<div class="plan-card plan-card-pro">' +
      '<div class="plan-card-title">Pro</div>' +
      '<ul class="plan-features">' +
      '<li>Tudo do Gratuito, mais:</li>' +
      '<li>Fraseados nível <strong>Avançado</strong> (3ª escala recomendada por acorde e frases de tensão)</li>' +
      '<li><strong>Laboratório</strong> — gerador de progressões para praticar (Jazz, Blues, Pop, Modal)</li>' +
      '</ul>' +
      '</div>' +
      '</div>' +
      '<p class="muted-note">Ainda não há cobrança configurada nesta instalação — ' +
      'o plano Pro é liberado manualmente por quem administra o site enquanto ' +
      'isso (veja <code>docs/etapa5-planos.md</code>). Nenhum botão aqui pede ' +
      'pagamento.</p>'
    );
  }

  function renderConfigView() {
    var wrap = $('config-conteudo');
    if (!currentUser) {
      wrap.innerHTML =
        '<p class="muted-note">Entre na sua conta para ver suas configurações.</p>' +
        planComparisonHTML();
      return;
    }
    var isPro = currentProfile && currentProfile.plano === 'pro';
    var plano = isPro ? 'Pro' : 'Gratuito';
    wrap.innerHTML =
      '<div class="config-row"><span class="config-label">E-mail</span><span>' + currentUser.email + '</span></div>' +
      '<div class="config-row"><span class="config-label">Plano</span><span class="plan-badge' +
      (isPro ? ' plan-badge-pro' : '') + '">' + plano + '</span></div>' +
      '<button class="btn-secondary btn-config-sair" id="btn-sair-config">Sair da conta</button>' +
      planComparisonHTML();
    $('btn-sair-config').addEventListener('click', handleSignOut);
  }

  // ---------------- Laboratório (Etapa 5, parte 3) ----------------
  // Exclusivo Pro. O primeiro experimento é um gerador de progressões
  // prontas para praticar (js/lab.js cuida da teoria; aqui só a tela).

  var lab = window.IL.lab;
  var labLastResult = null;
  var NOTE_ORDER_LAB = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function labToneOptionsHTML() {
    return NOTE_ORDER_LAB.map(function (n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
  }

  function labCategoryOptionsHTML() {
    var opts = '<option value="todas">Todos os estilos</option>';
    opts += lab.CATEGORIES.map(function (c) { return '<option value="' + c.key + '">' + c.label + '</option>'; }).join('');
    return opts;
  }

  function renderLabResultado(result) {
    labLastResult = result;
    var wrap = $('lab-resultado');
    if (!result) { wrap.innerHTML = ''; return; }
    wrap.innerHTML =
      '<div class="lab-card">' +
      '<div class="lab-card-title">' + result.template.label + '</div>' +
      '<div class="lab-card-progressao">' + result.progressionText + '</div>' +
      '<div class="lab-card-notas">' + result.chords.map(function (c) {
        return '<span><strong>' + c.symbol + '</strong> (' + window.IL.theory.chordNotesText(c.symbol) + ')</span>';
      }).join('') + '</div>' +
      '<p class="lab-card-explicacao">' + result.template.explanation + '</p>' +
      '<button class="btn-primary" id="btn-lab-analisar">Analisar esta progressão →</button>' +
      '</div>';
    $('btn-lab-analisar').addEventListener('click', function () {
      if (!labLastResult) return;
      $('input-tonalidade').value = labLastResult.tonic + '|' + labLastResult.mode;
      $('input-progressao').value = labLastResult.progressionText;
      window.IL.ui.switchView('inicio');
      window.IL.ui.switchTab('visao-geral');
      window.IL.ui.runAnalysis();
    });
  }

  function sortearProgressao() {
    var tonica = $('lab-tonica').value;
    var categoria = $('lab-categoria').value;
    renderLabResultado(lab.generateRandom(tonica, categoria));
  }

  function renderLabTool() {
    var wrap = $('lab-conteudo');
    wrap.innerHTML =
      '<p class="muted-note">Sorteie uma progressão pronta para praticar, num estilo à ' +
      'escolha, e mande direto para a análise — fraseados, tab/partitura e áudio saem na hora.</p>' +
      '<div class="lab-controls">' +
      '<div class="field"><label>Tonalidade</label><select id="lab-tonica">' + labToneOptionsHTML() + '</select></div>' +
      '<div class="field"><label>Estilo</label><select id="lab-categoria">' + labCategoryOptionsHTML() + '</select></div>' +
      '<button class="btn-primary" id="btn-lab-sortear">🎲 Sortear progressão</button>' +
      '</div>' +
      '<div id="lab-resultado" class="lab-resultado"></div>';
    $('btn-lab-sortear').addEventListener('click', sortearProgressao);
  }

  function renderLaboratorioView() {
    var wrap = $('lab-conteudo');
    if (!currentUser) {
      wrap.innerHTML =
        '<p class="muted-note">Entre na sua conta para acessar o Laboratório.</p>' +
        planComparisonHTML();
      return;
    }
    var isPro = currentProfile && currentProfile.plano === 'pro';
    if (!isPro) {
      wrap.innerHTML =
        '<p class="muted-note">O Laboratório é exclusivo do plano Pro.</p>' +
        planComparisonHTML();
      return;
    }
    renderLabTool();
  }

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

  function refreshUserAndProfile(session) {
    currentUser = session ? session.user : null;
    if (!currentUser) {
      currentProfile = null;
      renderHeader();
      notifyAccountChange();
      return;
    }
    db.getProfile(currentUser.id).then(function (res) {
      currentProfile = res.data || null;
      renderHeader();
      notifyAccountChange();
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

    if (!db.sdkLoaded()) {
      renderHeader();
      return;
    }

    db.getSession().then(function (res) {
      refreshUserAndProfile(res.data && res.data.session);
    });

    db.onAuthStateChange(function (event, session) {
      refreshUserAndProfile(session);
    });
  });
})();
