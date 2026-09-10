/**
 * Smoke test da Etapa 5 (Planos Gratuito/Pro) — roda no Chromium headless.
 *
 * Confirma:
 *  - visitante (sem login): nível "Avançado" aparece com 🔒, o aviso de
 *    plano fica visível, e escolher "Avançado" no <select> é revertido
 *    automaticamente para "Intermediário" (não dá pra analisar com ele);
 *  - usuário logado no plano Gratuito: mesmo comportamento do visitante;
 *  - usuário logado no plano Pro: "Avançado" fica liberado (sem 🔒), a
 *    análise realmente usa 3 escalas por acorde (em vez de 2) e a aba
 *    Fraseados gera frases de categoria "tensão";
 *  - tela de Configurações mostra o comparativo Gratuito x Pro sem nenhum
 *    botão de "assinar"/pagar (não há cobrança configurada ainda).
 *
 * Usa um cliente Supabase falso (em memória) só para simular login com
 * cada plano — não substitui testar a trava real de RLS/trigger num
 * projeto Supabase de verdade (isso é o `sql/schema.sql` +
 * `prevent_plano_selfupgrade`, que só dá pra confirmar manualmente).
 */
const { chromium } = require('playwright');
const path = require('path');

// O "+pro" no e-mail é só um atalho deste cliente FALSO para simular um
// perfil que um admin já promoveu a Pro (via SQL, na vida real) — nada a
// ver com o Supabase de verdade, onde `plano` vem do banco.
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
    this.store = store; this.name = name; this._filters = []; this._single = false; this._op = 'select';
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

  // 1) Visitante (sem login): Avançado bloqueado
  const optTextVisitante = await page.$eval('#opt-nivel-avancado', (o) => o.textContent);
  console.log('Visitante — rótulo da opção Avançado:', optTextVisitante);
  await page.selectOption('#input-nivel', 'avancado');
  await page.waitForTimeout(80);
  const nivelAposEscolherVisitante = await page.$eval('#input-nivel', (s) => s.value);
  const noteVisibleVisitante = await page.$eval('#nivel-gate-note', (n) => !n.hidden);
  console.log('Visitante — nível após tentar escolher Avançado:', nivelAposEscolherVisitante, '| aviso visível:', noteVisibleVisitante);

  // 2) Login no plano Gratuito: mesmo bloqueio
  await login(page, 'teste@exemplo.com');
  const optTextGratuito = await page.$eval('#opt-nivel-avancado', (o) => o.textContent);
  await page.selectOption('#input-nivel', 'avancado');
  await page.waitForTimeout(80);
  const nivelAposEscolherGratuito = await page.$eval('#input-nivel', (s) => s.value);
  console.log('Gratuito — rótulo da opção Avançado:', optTextGratuito, '| nível após tentar escolher:', nivelAposEscolherGratuito);

  // Configurações: comparativo de planos, sem botão de assinar/pagar
  await page.click('.nav-item[data-nav="config"]');
  await page.waitForTimeout(100);
  const planBadge = await page.$eval('.plan-badge', (b) => b.textContent.trim());
  const hasPayButton = await page.$$eval('button, a', (els) =>
    els.some((e) => /assinar|pagar|checkout|comprar/i.test(e.textContent || '')));
  console.log('Configurações (Gratuito) — badge do plano:', planBadge, '| algum botão de pagamento na tela:', hasPayButton);

  // Sai e entra como usuário Pro
  await page.click('#btn-sair-config');
  await page.waitForTimeout(200);
  await login(page, 'teste+pro@exemplo.com');
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(100);

  // 3) Pro: Avançado liberado
  const optTextPro = await page.$eval('#opt-nivel-avancado', (o) => o.textContent);
  const noteHiddenPro = await page.$eval('#nivel-gate-note', (n) => n.hidden);
  console.log('Pro — rótulo da opção Avançado:', optTextPro, '| aviso de bloqueio escondido:', noteHiddenPro);

  await page.selectOption('#input-nivel', 'avancado');
  await page.waitForTimeout(80);
  const nivelProSelecionado = await page.$eval('#input-nivel', (s) => s.value);
  await page.click('.nav-item[data-nav="inicio"]');
  await page.click('#btn-analisar');
  await page.waitForTimeout(150);
  const nivelAindaAvancado = await page.$eval('#input-nivel', (s) => s.value);
  console.log('Pro — nível permanece "avancado" após selecionar e analisar:', nivelProSelecionado === 'avancado' && nivelAindaAvancado === 'avancado');

  // Confirma que a 3ª escala aparece (Escalas mostra 3 linhas para o 1º acorde)
  await page.click('.tab[data-tab="escalas"]');
  await page.waitForTimeout(80);
  const escalasDoPrimeiroAcorde = await page.$$eval('#lista-escalas .scale-item', (items) =>
    items.length ? items[0].querySelectorAll('.scale-row').length : 0);
  console.log('Pro — nº de escalas recomendadas no 1º acorde (esperado 3):', escalasDoPrimeiroAcorde);

  // Confirma que existe fraseado de categoria "tensão" (subtítulo cita escala alterada em nível avançado)
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(80);
  const fraseadosTitulos = await page.$$eval('#lista-fraseados .phrase-title', (els) => els.map((e) => e.textContent));
  console.log('Pro — títulos dos fraseados gerados:', fraseadosTitulos);

  // 4) Defesa extra: se o usuário Pro sair da conta com "Avançado" ainda
  // selecionado, o nível deve ser rebaixado automaticamente (reatividade
  // via window.IL.ui.onAccountChange, chamado pelo auth-ui.js no logout).
  await page.click('.nav-item[data-nav="config"]');
  await page.waitForTimeout(80);
  await page.click('#btn-sair-config');
  await page.waitForTimeout(200);
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(80);
  const nivelAposLogout = await page.$eval('#input-nivel', (s) => s.value);
  const optTextAposLogout = await page.$eval('#opt-nivel-avancado', (o) => o.textContent);
  console.log('Após sair (era Pro com Avançado selecionado) — nível caiu para:', nivelAposLogout, '| rótulo da opção:', optTextAposLogout);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
