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

  /**
   * Manda o e-mail de "criar uma senha nova" para alguém. Não precisa de
   * chave secreta: é o mesmo pedido que a própria pessoa faria no "esqueci
   * minha senha". O link cai no site, e a tela de entrada mostra o campo da
   * senha nova (o supabase-js avisa com o evento PASSWORD_RECOVERY).
   */
  function enviarSenhaNova(email) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.auth.resetPasswordForEmail(email, { redirectTo: root.location.origin + root.location.pathname });
  }

  /** Troca a senha de quem está com a sessão aberta (inclusive na recuperação). */
  function trocarSenha(nova) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.auth.updateUser({ password: nova });
  }

  // ---------------- Configuração do sistema ----------------
  // Uma linha só, legível por qualquer um (a tela de entrada precisa dela
  // antes de haver sessão) e gravável só por administrador — quem garante
  // isso é a política de RLS, não este arquivo.

  function getConfig() {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('config_sistema').select('*').eq('id', 1).single();
  }

  function updateConfig(patch) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    patch = Object.assign({}, patch, { atualizado_em: new Date().toISOString() });
    return c.from('config_sistema').update(patch).eq('id', 1).select().single();
  }

  function listConvites() {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('convites').select('*').order('criado_em', { ascending: false });
  }

  function criarConvite(email) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('convites').insert({ email: String(email || '').trim().toLowerCase() }).select().single();
  }

  function apagarConvite(email) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('convites').delete().eq('email', email);
  }

  function getProfile(userId) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('profiles').select('*').eq('id', userId).single();
  }

  /**
   * Diz ao banco que esta pessoa está usando o site agora.
   *
   * Não manda data nenhuma: quem carimba a hora é o `now()` do PostgreSQL,
   * dentro de registrar_acesso() (ver sql/schema.sql). Falhar aqui não pode
   * atrapalhar ninguém — se der erro, o site segue normalmente.
   */
  function registrarAcesso() {
    var c = getClient();
    if (!c || !c.rpc) return Promise.resolve({ data: null, error: null });
    return Promise.resolve(c.rpc('registrar_acesso')).catch(function () {
      return { data: null, error: null };
    });
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

  /**
   * Exclui a conta de alguém, com os dados dela. Quem decide se pode é o
   * banco: excluir_conta() recusa quem não é admin e recusa a própria conta
   * do admin (ver sql/schema.sql).
   */
  function excluirConta(id) {
    var c = getClient();
    if (!c || !c.rpc) return Promise.resolve({ data: null, error: notConfiguredError() });
    return Promise.resolve(c.rpc('excluir_conta', { alvo: id }));
  }

  /** `patch`: { plano } | { papel } | { bloqueado, motivo_bloqueio } */
  function updateProfile(id, patch) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('profiles').update(patch).eq('id', id).select().single();
  }

  // ---------------- Sugestões ----------------
  // Quem assina é o banco: o trigger carimba autor, e-mail e data, então o
  // navegador só precisa mandar o texto (ver sql/schema.sql).

  function enviarSugestao(texto) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('sugestoes').insert({ texto: texto }).select().single();
  }

  /** Para o admin, todas. Para os outros, as próprias (é o banco que decide). */
  function listSugestoes() {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('sugestoes').select('*').order('criado_em', { ascending: false });
  }

  function marcarSugestao(id, lida) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('sugestoes').update({ lida: !!lida }).eq('id', id).select().single();
  }

  function apagarSugestao(id) {
    var c = getClient();
    if (!c) return Promise.resolve({ data: null, error: notConfiguredError() });
    return c.from('sugestoes').delete().eq('id', id);
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
    registrarAcesso: registrarAcesso,
    listProfiles: listProfiles,
    updateProfile: updateProfile,
    excluirConta: excluirConta,
    enviarSenhaNova: enviarSenhaNova,
    trocarSenha: trocarSenha,
    getConfig: getConfig,
    updateConfig: updateConfig,
    enviarSugestao: enviarSugestao,
    listSugestoes: listSugestoes,
    marcarSugestao: marcarSugestao,
    apagarSugestao: apagarSugestao,
    listConvites: listConvites,
    criarConvite: criarConvite,
    apagarConvite: apagarConvite,
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
