/**
 * Smoke test da Etapa 5 (Laboratório) — roda no Chromium headless.
 *
 * Confirma:
 *  - visitante: nav "Laboratório" leva a uma tela de bloqueio pedindo login
 *    (com o comparativo de planos), sem nenhum botão de pagamento;
 *  - usuário Gratuito: mesma tela, mas explicando que é exclusivo Pro;
 *  - usuário Pro: a ferramenta de verdade aparece (tonalidade + estilo +
 *    "Sortear"), sortear gera uma progressão coerente com o estilo
 *    escolhido, e "Analisar esta progressão" preenche o formulário
 *    principal e roda a análise (Visão Geral aparece preenchida).
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
    this.store = store; this.name = name; this._filters = []; this._single = false;
  }
  FakeTable.prototype.select = function () { return this; };
  FakeTable.prototype.eq = function (field, val) { this._filters.push([field, val]); return this; };
  FakeTable.prototype.single = function () { this._single = true; return this; };
  FakeTable.prototype.then = function (resolve) {
    var rows = this.store[this.name] = this.store[this.name] || [];
    var filters = this._filters;
    var filtered = rows.filter(function (r) { return filters.every(function (f) { return r[f[0]] === f[1]; }); });
    if (this._single) {
      resolve(filtered[0] ? { data: filtered[0], error: null } : { data: null, error: { message: 'not found' } });
      return;
    }
    resolve({ data: filtered, error: null });
  };

  function FakeClient() {
    this.auth = new FakeAuth();
    this.store = { profiles: [] };
    var store = this.store;
    this.auth.listeners.push(function (event, session) {
      if (event === 'SIGNED_IN' && session && session.user) {
        var exists = store.profiles.some(function (p) { return p.id === session.user.id; });
        if (!exists) {
          var plano = session.user.email.indexOf('+pro') >= 0 ? 'pro' : 'gratuito';
          store.profiles.push({ id: session.user.id, email: session.user.email, plano: plano, criado_em: new Date().toISOString() });
        }
      }
    });
  }
  FakeClient.prototype.from = function (name) { return new FakeTable(this.store, name); };

  window.supabase = { createClient: function () { return new FakeClient(); } };
`;

async function login(page, email) {
  await page.click('#btn-entrar');
  await page.click('#auth-toggle-link');
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', 'senha123');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(250);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await page.route('**/js/config.js', (route) => {
    route.fulfill({
      contentType: 'application/javascript',
      body: "window.IL_CONFIG = { supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'fake-anon-key' };"
    });
  });
  await page.addInitScript({ content: FAKE_CLIENT_SRC });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  // 1) Visitante
  await page.click('.nav-item[data-nav="laboratorio"]');
  await page.waitForTimeout(100);
  const visitanteTemFerramenta = await page.$('#lab-tonica');
  const visitanteTemComparativo = await page.$('.plan-compare');
  const visitanteTemBotaoPagamento = await page.$$eval('#lab-conteudo button, #lab-conteudo a', (els) =>
    els.some((e) => /assinar|pagar|checkout|comprar/i.test(e.textContent || '')));
  console.log('Visitante — ferramenta do Lab visível:', !!visitanteTemFerramenta,
    '| comparativo de planos visível:', !!visitanteTemComparativo,
    '| algum botão de pagamento:', visitanteTemBotaoPagamento);

  // 2) Gratuito
  await login(page, 'teste@exemplo.com');
  await page.click('.nav-item[data-nav="laboratorio"]');
  await page.waitForTimeout(100);
  const gratuitoTemFerramenta = await page.$('#lab-tonica');
  console.log('Gratuito — ferramenta do Lab visível (esperado: não):', !!gratuitoTemFerramenta);

  // Sai e entra como Pro
  await page.click('.nav-item[data-nav="config"]');
  await page.waitForTimeout(80);
  await page.click('#btn-sair-config');
  await page.waitForTimeout(200);
  await login(page, 'teste+pro@exemplo.com');

  // 3) Pro: ferramenta liberada
  await page.click('.nav-item[data-nav="laboratorio"]');
  await page.waitForTimeout(100);
  const proTemFerramenta = await page.$('#lab-tonica');
  console.log('Pro — ferramenta do Lab visível:', !!proTemFerramenta);

  await page.selectOption('#lab-tonica', 'C');
  await page.selectOption('#lab-categoria', 'blues');
  await page.click('#btn-lab-sortear');
  await page.waitForTimeout(100);
  const progressaoSorteada = await page.$eval('.lab-card-progressao', (el) => el.textContent.trim());
  const tituloSorteado = await page.$eval('.lab-card-title', (el) => el.textContent.trim());
  console.log('Pro — sorteou (categoria "blues"):', tituloSorteado, '→', progressaoSorteada);

  await page.click('#btn-lab-analisar');
  await page.waitForTimeout(150);
  const viewAtiva = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const progressaoNoFormulario = await page.$eval('#input-progressao', (i) => i.value);
  const subtitulo = await page.$eval('#analise-subtitulo', (el) => el.textContent);
  console.log('Após "Analisar esta progressão" — view ativa:', viewAtiva,
    '| progressão no formulário:', progressaoNoFormulario,
    '| subtítulo da análise:', subtitulo);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
