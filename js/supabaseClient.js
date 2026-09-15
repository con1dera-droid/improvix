/**
 * IMPROVIX — cliente Supabase (Etapa 4)
 *
 * Fina camada sobre o supabase-js: autenticação (cadastro/login/logout) e
 * CRUD de analises/favoritos/exercicios/profiles. Toda a segurança real
 * está nas políticas de RLS do banco (sql/schema.sql) — aqui só filtramos
 * por conveniência, nunca confiamos só na consulta do cliente.
 *
 * Só existe no navegador (depende do supabase-js via CDN), por isso não
 * segue o padrão UMD dos módulos de teoria musical.
 */
(function (root) {
  'use strict';

  var client = null;

  function isConfigured() {
    var cfg = root.IL_CONFIG;
    return !!(cfg && cfg.supabaseUrl && cfg.supabaseAnonKey &&
      cfg.supabaseUrl.indexOf('SEU-PROJETO') === -1 &&
      cfg.supabaseAnonKey.indexOf('SUA_CHAVE_ANON_AQUI') === -1);
  }

  function sdkLoaded() {
    return !!(root.supabase && typeof root.supabase.createClient === 'function');
  }

  function getClient() {
    if (!isConfigured() || !sdkLoaded()) return null;
    if (!client) {
      client = root.supabase.createClient(root.IL_CONFIG.supabaseUrl, root.IL_CONFIG.supabaseAnonKey);
    }
    return client;
  }

  function notConfiguredError() {
    return { message: sdkLoaded()
      ? 'O login ainda não foi configurado. Veja docs/etapa4-supabase.md para criar seu projeto Supabase gratuito.'
      : 'Não foi possível carregar a biblioteca do Supabase (sem internet?). O restante do site continua funcionando normalmente.' };
  }

  // ---------------- Autenticação ----------------

  function signUp(email, password) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.auth.signUp({ email: email, password: password });
  }

  function signIn(email, password) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.auth.signInWithPassword({ email: email, password: password });
  }

  function signOut() {
    var c = getClient();
    if (!c) return Promise.resolve({ error: null });
    return c.auth.signOut();
  }

  function getSession() {
    var c = getClient();
    if (!c) return Promise.resolve({ data: { session: null }, error: null });
    return c.auth.getSession();
  }

  function onAuthStateChange(callback) {
    var c = getClient();
    if (!c) return null;
    return c.auth.onAuthStateChange(callback);
  }

  function getProfile(userId) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('profiles').select('*').eq('id', userId).single();
  }

  // ---------------- Administração ----------------
  // Quem pode o quê é decidido pelo BANCO (ver sql/schema.sql): para um
  // usuário comum, listProfiles devolve só o próprio perfil e qualquer
  // tentativa de mudar plano/papel/bloqueio é revertida pelo trigger. Aqui
  // não existe nenhuma checagem de segurança — existe conveniência.

  function listProfiles() {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('profiles').select('*').order('criado_em', { ascending: false });
  }

  /** `patch`: { plano } | { papel } | { bloqueado, motivo_bloqueio } */
  function updateProfile(id, patch) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('profiles').update(patch).eq('id', id).select().single();
  }

  // ---------------- Dados (analises / favoritos / exercicios) ----------------

  function withUser(fn) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return { data: null, error: { message: 'Você precisa entrar na sua conta primeiro.' } };
      return fn(c, session.user);
    });
  }

  function saveAnalise(payload) {
    return withUser(function (c, user) {
      return c.from('analises').insert({
        user_id: user.id,
        tonalidade: payload.tonalidade,
        modo: payload.modo,
        progressao: payload.progressao,
        instrumento: payload.instrumento,
        nivel: payload.nivel
      }).select().single();
    });
  }

  function listAnalises() {
    return withUser(function (c, user) {
      return c.from('analises').select('*').eq('user_id', user.id).order('criado_em', { ascending: false });
    });
  }

  function deleteAnalise(id) {
    return withUser(function (c, user) {
      return c.from('analises').delete().eq('id', id).eq('user_id', user.id);
    });
  }

  function saveFavorito(payload) {
    return withUser(function (c, user) {
      return c.from('favoritos').insert({
        user_id: user.id,
        tonalidade: payload.tonalidade,
        modo: payload.modo,
        progressao: payload.progressao,
        instrumento: payload.instrumento,
        nivel: payload.nivel,
        phrase_index: payload.phraseIndex,
        titulo: payload.titulo
      }).select().single();
    });
  }

  function listFavoritos() {
    return withUser(function (c, user) {
      return c.from('favoritos').select('*').eq('user_id', user.id).order('criado_em', { ascending: false });
    });
  }

  function deleteFavorito(id) {
    return withUser(function (c, user) {
      return c.from('favoritos').delete().eq('id', id).eq('user_id', user.id);
    });
  }

  function saveExercicio(payload) {
    return withUser(function (c, user) {
      return c.from('exercicios').insert({
        user_id: user.id,
        tonalidade: payload.tonalidade,
        modo: payload.modo,
        progressao: payload.progressao,
        instrumento: payload.instrumento,
        nivel: payload.nivel,
        phrase_index: payload.phraseIndex,
        titulo: payload.titulo
      }).select().single();
    });
  }

  function listExercicios() {
    return withUser(function (c, user) {
      return c.from('exercicios').select('*').eq('user_id', user.id).order('criado_em', { ascending: false });
    });
  }

  function updateExercicioStatus(id, status) {
    return withUser(function (c, user) {
      return c.from('exercicios').update({ status: status }).eq('id', id).eq('user_id', user.id);
    });
  }

  function deleteExercicio(id) {
    return withUser(function (c, user) {
      return c.from('exercicios').delete().eq('id', id).eq('user_id', user.id);
    });
  }

  root.IL = root.IL || {};
  root.IL.db = {
    isConfigured: isConfigured,
    sdkLoaded: sdkLoaded,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    onAuthStateChange: onAuthStateChange,
    getProfile: getProfile,
    listProfiles: listProfiles,
    updateProfile: updateProfile,
    saveAnalise: saveAnalise,
    listAnalises: listAnalises,
    deleteAnalise: deleteAnalise,
    saveFavorito: saveFavorito,
    listFavoritos: listFavoritos,
    deleteFavorito: deleteFavorito,
    saveExercicio: saveExercicio,
    listExercicios: listExercicios,
    updateExercicioStatus: updateExercicioStatus,
    deleteExercicio: deleteExercicio
  };
})(typeof window !== 'undefined' ? window : globalThis);
