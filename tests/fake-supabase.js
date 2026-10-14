/**
 * Um Supabase FALSO, em memória, para os testes de navegador.
 *
 * Ele não é ingênuo: reproduz as mesmas regras que o banco de verdade
 * aplica (as de sql/schema.sql, conferidas em tests/rls.sql contra um
 * PostgreSQL real). Sem isso, um teste passaria com uma tela que quebraria
 * em produção — a interface pediria coisas que o banco recusa.
 *
 * O que está reproduzido aqui:
 *   - o trigger de cadastro: o PRIMEIRO cadastro vira admin aprovado; quem
 *     tem convite entra aprovado; no modo "livre" todo mundo entra aprovado;
 *     no resto, nasce esperando;
 *   - pode_usar(): quem não foi aprovado (ou está bloqueado) não lê nem
 *     grava NADA nas tabelas de dados;
 *   - o trigger que protege papel/plano/bloqueio/aprovado/modulos: ninguém
 *     se promove nem se aprova; admin mexe nos outros, não em si;
 *   - config_sistema: qualquer um lê, só admin escreve;
 *   - convites: só admin.
 *
 * Uso num teste:
 *     const { FAKE_SUPABASE } = require('./fake-supabase.js');
 *     await page.addInitScript({ content: FAKE_SUPABASE });
 */

const FAKE_SUPABASE = `
  function FakeAuth(db) { this.db = db; this.currentUser = null; this.listeners = []; this.users = {}; }
  FakeAuth.prototype.signUp = function (o) {
    if (this.users[o.email]) return Promise.resolve({ data: null, error: { message: 'already registered' } });
    var user = { id: 'u' + Object.keys(this.users).length, email: o.email };
    this.users[o.email] = { password: o.password, user: user };
    this.db.criarPerfil(user);               // o trigger handle_new_user
    this.currentUser = user;
    var self = this;
    setTimeout(function () { self._emit('SIGNED_IN', { user: user }); }, 0);
    return Promise.resolve({ data: { user: user, session: { user: user } }, error: null });
  };
  FakeAuth.prototype.signInWithPassword = function (o) {
    var rec = this.users[o.email];
    if (!rec || rec.password !== o.password) return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
    this.currentUser = rec.user;
    var self = this;
    setTimeout(function () { self._emit('SIGNED_IN', { user: rec.user }); }, 0);
    return Promise.resolve({ data: { user: rec.user, session: { user: rec.user } }, error: null });
  };
  FakeAuth.prototype.signOut = function () {
    this.currentUser = null;
    var self = this;
    setTimeout(function () { self._emit('SIGNED_OUT', null); }, 0);
    return Promise.resolve({ error: null });
  };
  FakeAuth.prototype.getSession = function () {
    return Promise.resolve({ data: { session: this.currentUser ? { user: this.currentUser } : null }, error: null });
  };
  FakeAuth.prototype.onAuthStateChange = function (cb) {
    this.listeners.push(cb);
    return { data: { subscription: { unsubscribe: function () {} } } };
  };
  FakeAuth.prototype._emit = function (ev, s) { this.listeners.forEach(function (l) { l(ev, s); }); };
  FakeAuth.prototype.resetPasswordForEmail = function (email) {
    this.db.emailsEnviados.push(email);
    return Promise.resolve({ data: {}, error: null });
  };
  FakeAuth.prototype.updateUser = function (o) {
    if (!this.currentUser) return Promise.resolve({ data: null, error: { message: 'sem sessão' } });
    var rec = this.users[this.currentUser.email];
    if (rec && o.password) rec.password = o.password;
    return Promise.resolve({ data: { user: this.currentUser }, error: null });
  };

  // ---- o "banco": as mesmas regras do sql/schema.sql ----
  function FakeTable(db, name) { this.db = db; this.name = name; this._f = []; this._single = false; }
  FakeTable.prototype.select = function () { return this; };
  FakeTable.prototype.insert = function (d) { this._op = 'insert'; this._data = d; return this; };
  FakeTable.prototype.update = function (d) { this._op = 'update'; this._data = d; return this; };
  FakeTable.prototype.delete = function () { this._op = 'delete'; return this; };
  FakeTable.prototype.eq = function (k, v) { this._f.push([k, v]); return this; };
  FakeTable.prototype.order = function () { return this; };
  FakeTable.prototype.single = function () { this._single = true; return this; };
  FakeTable.prototype.catch = function () { return this; };
  /**
   * Um banco de verdade devolve dados, não ponteiros para as próprias linhas.
   * Sem esta cópia, mexer no objeto que a tela recebeu mexia no "banco" — e um
   * teste passaria com código que em produção não grava nada (ou grava duas
   * vezes). Foi assim que o toggle de "marcar como lida" se traiu.
   */
  function copia(x) {
    if (Array.isArray(x)) return x.map(function (r) { return Object.assign({}, r); });
    return x && typeof x === 'object' ? Object.assign({}, x) : x;
  }

  FakeTable.prototype.then = function (resolveOriginal) {
    var resolve = function (res) {
      if (res && res.data) res = { data: copia(res.data), error: res.error };
      return resolveOriginal(res);
    };
    var db = this.db, nome = this.name;
    var rows = db.store[nome] = db.store[nome] || [];
    var eu = db.auth.currentUser ? db.auth.currentUser.id : null;
    var meuPerfil = db.store.profiles.filter(function (p) { return p.id === eu; })[0];
    var souAdmin = !!(meuPerfil && meuPerfil.papel === 'admin' && !meuPerfil.bloqueado && meuPerfil.aprovado);
    var podeUsar = !!(meuPerfil && meuPerfil.aprovado && !meuPerfil.bloqueado);
    var f = this._f;
    var filtrado = rows.filter(function (r) { return f.every(function (x) { return r[x[0]] === x[1]; }); });

    // ---------- leitura ----------
    if (nome === 'profiles') {
      if (!souAdmin) filtrado = filtrado.filter(function (r) { return r.id === eu; });
    } else if (nome === 'config_sistema') {
      // qualquer um lê, até sem sessão (a tela de entrada precisa)
    } else if (nome === 'sugestoes') {
      // cada um vê as suas; o admin vê todas
      if (!souAdmin) filtrado = podeUsar ? filtrado.filter(function (r) { return r.user_id === eu; }) : [];
    } else if (nome === 'convites') {
      if (!souAdmin) filtrado = [];
    } else if (!podeUsar) {
      filtrado = [];
    } else {
      filtrado = filtrado.filter(function (r) { return r.user_id === eu; });
    }

    if (this._op === 'insert') {
      if (nome === 'convites' && !souAdmin) {
        resolve({ data: null, error: { message: 'new row violates row-level security policy' } }); return;
      }
      if (nome === 'sugestoes') {
        if (!podeUsar) { resolve({ data: null, error: { message: 'new row violates row-level security policy' } }); return; }
        // o trigger: quem assina é o banco, não o formulário
        var meu = db.store.profiles.filter(function (p) { return p.id === eu; })[0];
        this._data = { texto: this._data.texto, user_id: eu, email: meu ? meu.email : null,
          criado_em: new Date().toISOString(), lida: false };
      }
      if (nome !== 'convites' && nome !== 'sugestoes' && !podeUsar) {
        resolve({ data: null, error: { message: 'new row violates row-level security policy' } }); return;
      }
      var row = Object.assign({ id: 'id' + Math.random().toString(36).slice(2), criado_em: new Date().toISOString() }, this._data);
      if (nome === 'convites') { row.usado = false; row.criado_por = eu; }
      rows.push(row);
      resolve({ data: this._single ? row : [row], error: null });
      return;
    }

    if (this._op === 'update') {
      var patch = this._data;
      if (nome === 'config_sistema' && !souAdmin) { resolve({ data: null, error: null }); return; }
      if (nome === 'sugestoes' && !souAdmin) { resolve({ data: null, error: null }); return; }
      filtrado.forEach(function (r) {
        var p = Object.assign({}, patch);
        if (nome === 'profiles') {
          // trigger protege_campos_privilegiados
          delete p.ultimo_acesso;          // só registrar_acesso() escreve
          if (!souAdmin || r.id === eu) {
            delete p.plano; delete p.papel; delete p.bloqueado; delete p.motivo_bloqueio;
            delete p.aprovado; delete p.modulos;
          } else if ('bloqueado' in p) {
            p.bloqueado_em = p.bloqueado ? new Date().toISOString() : null;
            p.bloqueado_por = p.bloqueado ? eu : null;
            if (!p.bloqueado) p.motivo_bloqueio = null;
          }
        }
        Object.assign(r, p);
      });
      resolve({ data: this._single ? (filtrado[0] || null) : filtrado, error: null });
      return;
    }

    if (this._op === 'delete') {
      if ((nome === 'convites' || nome === 'sugestoes') && !souAdmin) {
        resolve({ data: null, error: { message: 'row-level security' } }); return;
      }
      db.store[nome] = rows.filter(function (r) { return filtrado.indexOf(r) < 0; });
      resolve({ data: null, error: null });
      return;
    }

    if (this._single) {
      resolve(filtrado[0] ? { data: filtrado[0], error: null } : { data: null, error: { message: 'not found' } });
      return;
    }
    resolve({ data: filtrado, error: null });
  };

  function FakeClient() {
    this.store = {
      profiles: [],
      convites: [],
      sugestoes: [],
      config_sistema: [{ id: 1, cadastro: 'aprovacao', mensagem_login: null, modulos: {} }]
    };
    this.emailsEnviados = [];
    this.auth = new FakeAuth(this);
  }
  /** O trigger handle_new_user do sql/schema.sql, em JavaScript. */
  FakeClient.prototype.criarPerfil = function (user) {
    if (this.store.profiles.some(function (p) { return p.id === user.id; })) return;
    var cfg = this.store.config_sistema[0];
    var convite = this.store.convites.filter(function (c) {
      return c.email.toLowerCase() === user.email.toLowerCase() && !c.usado;
    })[0];
    var primeiro = this.store.profiles.length === 0;
    if (convite) { convite.usado = true; convite.usado_em = new Date().toISOString(); }
    this.store.profiles.push({
      id: user.id, email: user.email, plano: 'gratuito',
      papel: primeiro ? 'admin' : 'usuario',
      aprovado: !!(primeiro || convite || cfg.cadastro === 'livre'),
      bloqueado: false, modulos: null, ultimo_acesso: null, criado_em: new Date().toISOString()
    });
  };
  /** excluir_conta(): as mesmas recusas do banco, e os dados vão junto. */
  FakeClient.prototype._excluirConta = function (alvo) {
    var eu = this.auth.currentUser ? this.auth.currentUser.id : null;
    var meu = this.store.profiles.filter(function (p) { return p.id === eu; })[0];
    var souAdmin = !!(meu && meu.papel === 'admin' && meu.aprovado && !meu.bloqueado);
    if (!souAdmin) return Promise.resolve({ data: null, error: { message: 'só quem administra pode excluir contas' } });
    if (alvo === eu) return Promise.resolve({ data: null, error: { message: 'o administrador não pode excluir a própria conta' } });
    var p = this.store.profiles.filter(function (x) { return x.id === alvo; })[0];
    if (!p) return Promise.resolve({ data: false, error: null });
    var store = this.store;
    ['analises', 'favoritos', 'exercicios'].forEach(function (t) {
      store[t] = (store[t] || []).filter(function (r) { return r.user_id !== alvo; });
    });
    store.convites = (store.convites || []).filter(function (c) {
      return String(c.email).toLowerCase() !== String(p.email).toLowerCase();
    });
    store.profiles = store.profiles.filter(function (x) { return x.id !== alvo; });
    return Promise.resolve({ data: true, error: null });
  };
  FakeClient.prototype.from = function (n) { return new FakeTable(this, n); };
  /** As funções do banco (rpc). Hoje só registrar_acesso(). */
  FakeClient.prototype.rpc = function (nome, args) {
    if (nome === 'excluir_conta') return this._excluirConta(args && args.alvo);
    if (nome !== 'registrar_acesso') return Promise.resolve({ data: null, error: { message: 'função desconhecida' } });
    var eu = this.auth.currentUser ? this.auth.currentUser.id : null;
    if (!eu) return Promise.resolve({ data: null, error: null });
    // igual ao banco: a hora é daqui, não de quem chamou
    var quando = new Date().toISOString();
    this.store.profiles.forEach(function (p) { if (p.id === eu) p.ultimo_acesso = quando; });
    return Promise.resolve({ data: quando, error: null });
  };

  window.__fake = null;
  window.supabase = { createClient: function () { window.__fake = window.__fake || new FakeClient(); return window.__fake; } };
`;

/**
 * Abre o site com o LOGIN DESLIGADO, como numa instalação que ainda não
 * configurou o Supabase: o portão não sobe e as telas ficam acessíveis.
 *
 * É o que os testes de FUNCIONALIDADE querem — eles conferem telas, áudio e
 * partitura, não o portão. O portão tem testes próprios, que usam o banco
 * falso: tests/acesso.smoke.js e tests/admin.smoke.js.
 *
 * Também troca o CDN do supabase-js por um stub, para o resultado não
 * depender da internet da máquina que roda os testes.
 */
async function prepararSemLogin(page) {
  await page.route('**/supabase-js@2*', (r) => r.fulfill({ contentType: 'application/javascript', body: '/* stub */' }));
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'application/javascript',
    body: "window.IL_CONFIG = { supabaseUrl: 'https://SEU-PROJETO.supabase.co', supabaseAnonKey: 'SUA-ANON-KEY' };"
  }));
}

/** Roteia o CDN e o config.js para o cliente falso. Use antes do goto(). */
async function prepararPagina(page) {
  await page.route('**/supabase-js@2*', (r) => r.fulfill({ contentType: 'application/javascript', body: '/* stub */' }));
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'application/javascript',
    body: "window.IL_CONFIG = { supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'fake' };"
  }));
  await page.addInitScript({ content: FAKE_SUPABASE });
}

/**
 * Entra (ou cria conta) pela tela de entrada. No sistema fechado ela já
 * está aberta — não existe botão "Entrar" no cabeçalho para clicar.
 */
async function entrar(page, email, criarConta, senha) {
  senha = senha || 'senha123';
  const temBotao = await page.$('#btn-entrar');
  if (temBotao && await temBotao.isVisible()) await temBotao.click();
  await page.waitForTimeout(120);
  // Põe o formulário no modo pedido (não alterna no escuro: se já estivesse
  // em "Criar conta", um clique levaria para "Entrar" e o teste mentiria).
  const alvo = criarConta ? 'Criar conta' : 'Entrar';
  if ((await page.$eval('#auth-submit-btn', (b) => b.textContent.trim())) !== alvo) {
    await page.click('#auth-toggle-link');
    await page.waitForTimeout(80);
  }
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', senha);
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(500);
}

async function sair(page) {
  await page.evaluate(() => {
    const b = document.getElementById('btn-sair') || document.getElementById('btn-sair-config') ||
      document.getElementById('auth-estado-sair');
    if (b) b.click();
  });
  await page.waitForTimeout(450);
}

module.exports = { FAKE_SUPABASE, prepararPagina, prepararSemLogin, entrar, sair };
