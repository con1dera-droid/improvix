/**
 * Teste end-to-end da Etapa 4 com um cliente Supabase FALSO (em memória),
 * injetado antes da página carregar. Isso não substitui testar com um
 * projeto Supabase real (RLS só existe de verdade lá), mas confirma que
 * toda a lógica de UI — cadastro/login, salvar histórico, favoritar,
 * adicionar exercício, trocar status, logout — está correta.
 */
const { chromium } = require('playwright');
const path = require('path');

const FAKE_CLIENT_SRC = `
  function FakeAuth() {
    this.currentUser = null;
    this.listeners = [];
    this.users = {};
  }
  FakeAuth.prototype.signUp = function (opts) {
    if (this.users[opts.email]) return Promise.resolve({ data: null, error: { message: 'already registered' } });
    var user = { id: 'u_' + Object.keys(this.users).length, email: opts.email };
    this.users[opts.email] = { password: opts.password, user: user };
    this.currentUser = user;
    var self = this;
    setTimeout(function () { self._emit('SIGNED_IN', { user: user }); }, 0);
    return Promise.resolve({ data: { user: user, session: { user: user } }, error: null });
  };
  FakeAuth.prototype.signInWithPassword = function (opts) {
    var rec = this.users[opts.email];
    if (!rec || rec.password !== opts.password) return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
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
  FakeAuth.prototype._emit = function (event, session) {
    this.listeners.forEach(function (l) { l(event, session); });
  };

  function FakeTable(store, name) {
    this.store = store; this.name = name; this._filters = [];
    this._order = null; this._single = false; this._op = 'select';
    this._insertData = null; this._updateData = null;
  }
  FakeTable.prototype.select = function () { return this; };
  FakeTable.prototype.insert = function (data) { this._op = 'insert'; this._insertData = data; return this; };
  FakeTable.prototype.update = function (data) { this._op = 'update'; this._updateData = data; return this; };
  FakeTable.prototype.delete = function () { this._op = 'delete'; return this; };
  FakeTable.prototype.eq = function (field, val) { this._filters.push([field, val]); return this; };
  FakeTable.prototype.order = function (field, opts) { this._order = { field: field, asc: opts ? opts.ascending : true }; return this; };
  FakeTable.prototype.single = function () { this._single = true; return this; };
  FakeTable.prototype.then = function (resolve, reject) {
    var rows = this.store[this.name] = this.store[this.name] || [];
    try {
      if (this._op === 'insert') {
        var row = Object.assign({ id: 'id_' + Math.random().toString(36).slice(2), criado_em: new Date().toISOString() }, this._insertData);
        rows.push(row);
        resolve(this._single ? { data: row, error: null } : { data: [row], error: null });
        return;
      }
      var filters = this._filters;
      var filtered = rows.filter(function (r) { return filters.every(function (f) { return r[f[0]] === f[1]; }); });
      if (this._op === 'delete') {
        this.store[this.name] = rows.filter(function (r) { return !filters.every(function (f) { return r[f[0]] === f[1]; }); });
        resolve({ data: null, error: null });
        return;
      }
      if (this._op === 'update') {
        var upd = this._updateData;
        filtered.forEach(function (r) { Object.assign(r, upd); });
        resolve({ data: filtered, error: null });
        return;
      }
      if (this._order) {
        var ord = this._order;
        filtered = filtered.slice().sort(function (a, b) {
          return (a[ord.field] < b[ord.field] ? 1 : -1) * (ord.asc ? -1 : 1);
        });
      }
      if (this._single) {
        resolve(filtered[0] ? { data: filtered[0], error: null } : { data: null, error: { message: 'not found' } });
        return;
      }
      resolve({ data: filtered, error: null });
    } catch (e) {
      resolve({ data: null, error: { message: e.message } });
    }
  };

  function FakeClient() {
    this.auth = new FakeAuth();
    this.store = { profiles: [] };
    var store = this.store;
    this.auth.listeners.push(function (event, session) {
      if (event === 'SIGNED_IN' && session && session.user) {
        var exists = store.profiles.some(function (p) { return p.id === session.user.id; });
        if (!exists) store.profiles.push({ id: session.user.id, email: session.user.email, plano: 'gratuito', criado_em: new Date().toISOString() });
      }
    });
  }
  FakeClient.prototype.from = function (name) { return new FakeTable(this.store, name); };

  window.supabase = { createClient: function () { return new FakeClient(); } };
`;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await page.addInitScript({ content: FAKE_CLIENT_SRC });

  // js/config.js de verdade sempre roda (é um <script src>, carregado antes
  // do DOMContentLoaded) e sobrescreveria qualquer window.IL_CONFIG que a
  // gente tentasse injetar via addInitScript/evaluate — então interceptamos
  // o próprio arquivo e servimos uma versão "configurada" com dados falsos.
  await page.route('**/js/config.js', (route) => {
    route.fulfill({
      contentType: 'application/javascript',
      body: "window.IL_CONFIG = { supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'fake-anon-key' };"
    });
  });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  // 1) Cadastro
  await page.click('#btn-entrar');
  await page.click('#auth-toggle-link'); // vira "Criar conta"
  await page.fill('#auth-email', 'teste@exemplo.com');
  await page.fill('#auth-password', 'senha123');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(200);
  const headerAfterSignup = await page.$eval('#user-area', (a) => a.textContent.replace(/\\s+/g, ' ').trim());
  console.log('Cabeçalho após cadastro:', headerAfterSignup);

  // 2) Salvar no histórico
  const saveEnabled = await page.$eval('#btn-salvar-historico', (b) => !b.disabled);
  console.log('Botão Salvar habilitado após login:', saveEnabled);
  await page.click('#btn-salvar-historico');
  await page.waitForTimeout(200);

  await page.click('.nav-item[data-nav="meus-exercicios"]');
  await page.click('.meus-tabs .tab[data-meus="historico"]');
  await page.waitForTimeout(200);
  const historico = await page.$eval('#lista-historico', (l) => l.textContent.replace(/\\s+/g, ' ').trim());
  console.log('Histórico após salvar:', historico);

  // 3) Favoritar um fraseado
  await page.click('.nav-item[data-nav="inicio"]');
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  await page.click('#lista-fraseados [data-phrase-index="1"]');
  await page.click('#btn-favoritar');
  await page.waitForTimeout(200);

  await page.click('.nav-item[data-nav="meus-exercicios"]');
  await page.click('.meus-tabs .tab[data-meus="favoritos"]');
  await page.waitForTimeout(200);
  const favoritos = await page.$eval('#lista-favoritos', (l) => l.textContent.replace(/\\s+/g, ' ').trim());
  console.log('Favoritos após favoritar a Frase 2:', favoritos);

  // 4) Adicionar exercício e mudar status
  await page.click('.nav-item[data-nav="inicio"]');
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  await page.click('#btn-exercicio');
  await page.waitForTimeout(200);
  await page.click('.nav-item[data-nav="meus-exercicios"]');
  await page.click('.meus-tabs .tab[data-meus="exercicios"]');
  await page.waitForTimeout(200);
  await page.selectOption('.record-status-select', 'praticando');
  await page.waitForTimeout(150);
  const exerciciosStatus = await page.$eval('.record-status-select', (s) => s.value);
  console.log('Status do exercício após trocar para "praticando":', exerciciosStatus);

  // 5) Logout
  await page.click('.nav-item[data-nav="config"]');
  await page.waitForTimeout(100);
  await page.click('#btn-sair-config');
  await page.waitForTimeout(200);
  const headerAfterLogout = await page.$eval('#user-area', (a) => a.textContent.trim());
  console.log('Cabeçalho após sair:', headerAfterLogout);
  const saveDisabledAfterLogout = await page.$eval('#btn-salvar-historico', (b) => b.disabled);
  console.log('Botão Salvar desabilitado após sair:', saveDisabledAfterLogout);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
