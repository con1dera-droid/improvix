/**
 * Smoke test da tela de Administração, com um Supabase FALSO em memória.
 *
 * O cliente falso aqui NÃO é ingênuo: ele reproduz as mesmas regras que o
 * banco de verdade aplica (as de sql/schema.sql, conferidas em tests/rls.sql
 * contra um PostgreSQL real). Sem isso, este teste passaria com uma tela que
 * quebraria em produção — a UI pediria coisas que o banco recusa.
 *
 *   node tests/admin.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

const FAKE_CLIENT_SRC = `
  function FakeAuth() { this.currentUser = null; this.listeners = []; this.users = {}; }
  FakeAuth.prototype.signUp = function (o) {
    if (this.users[o.email]) return Promise.resolve({ data: null, error: { message: 'already registered' } });
    var user = { id: 'u' + Object.keys(this.users).length, email: o.email };
    this.users[o.email] = { password: o.password, user: user };
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

  // ---- o "banco": as mesmas regras do sql/schema.sql ----
  function FakeTable(db, name) { this.db = db; this.name = name; this._f = []; this._single = false; }
  FakeTable.prototype.select = function () { return this; };
  FakeTable.prototype.insert = function (d) { this._op = 'insert'; this._data = d; return this; };
  FakeTable.prototype.update = function (d) { this._op = 'update'; this._data = d; return this; };
  FakeTable.prototype.delete = function () { this._op = 'delete'; return this; };
  FakeTable.prototype.eq = function (k, v) { this._f.push([k, v]); return this; };
  FakeTable.prototype.order = function () { return this; };
  FakeTable.prototype.single = function () { this._single = true; return this; };
  FakeTable.prototype.then = function (resolve) {
    var db = this.db, nome = this.name;
    var rows = db.store[nome] = db.store[nome] || [];
    var eu = db.auth.currentUser ? db.auth.currentUser.id : null;
    var meuPerfil = db.store.profiles.filter(function (p) { return p.id === eu; })[0];
    var souAdmin = !!(meuPerfil && meuPerfil.papel === 'admin' && !meuPerfil.bloqueado);
    var bloqueado = !!(meuPerfil && meuPerfil.bloqueado);
    var f = this._f;
    var filtrado = rows.filter(function (r) { return f.every(function (x) { return r[x[0]] === x[1]; }); });

    // RLS de leitura
    if (nome === 'profiles') {
      if (!souAdmin) filtrado = filtrado.filter(function (r) { return r.id === eu; });
    } else if (bloqueado || !eu) {
      filtrado = [];
    } else {
      filtrado = filtrado.filter(function (r) { return r.user_id === eu; });
    }

    if (this._op === 'insert') {
      if (bloqueado || !eu) { resolve({ data: null, error: { message: 'new row violates row-level security policy' } }); return; }
      var row = Object.assign({ id: 'id' + Math.random().toString(36).slice(2), criado_em: new Date().toISOString() }, this._data);
      rows.push(row);
      resolve({ data: this._single ? row : [row], error: null });
      return;
    }
    if (this._op === 'update') {
      var patch = this._data;
      filtrado.forEach(function (r) {
        var p = Object.assign({}, patch);
        if (nome === 'profiles') {
          // trigger protege_campos_privilegiados
          if (!souAdmin || r.id === eu) {
            delete p.plano; delete p.papel; delete p.bloqueado; delete p.motivo_bloqueio;
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
    this.auth = new FakeAuth();
    this.store = { profiles: [] };
    var self = this;
    this.auth.listeners.push(function (ev, s) {
      if (ev === 'SIGNED_IN' && s && s.user) {
        if (!self.store.profiles.some(function (p) { return p.id === s.user.id; })) {
          self.store.profiles.push({
            id: s.user.id, email: s.user.email, plano: 'gratuito',
            // "+admin" no e-mail faz as vezes do UPDATE que se roda no SQL
            // Editor para criar o primeiro admin.
            papel: s.user.email.indexOf('+admin') >= 0 ? 'admin' : 'usuario',
            bloqueado: false, criado_em: new Date().toISOString()
          });
        }
      }
    });
  }
  FakeClient.prototype.from = function (n) { return new FakeTable(this, n); };

  window.__fake = null;
  window.supabase = { createClient: function () { window.__fake = window.__fake || new FakeClient(); return window.__fake; } };
`;

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

async function entrar(page, email, criar) {
  await page.evaluate(() => { const b = document.getElementById('btn-entrar'); if (b) b.click(); });
  await page.waitForTimeout(150);
  if (criar) await page.click('#auth-toggle-link');
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', 'senha123');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(400);
}

async function sair(page) {
  await page.evaluate(() => { const b = document.getElementById('btn-sair'); if (b) b.click(); });
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });
  page.on('dialog', (d) => d.accept('bagunça no fórum'));   // o prompt do motivo do bloqueio

  await page.route('**/supabase-js@2*', (r) => r.fulfill({ contentType: 'application/javascript', body: '/* stub */' }));
  await page.route('**/js/config.js', (r) => r.fulfill({
    contentType: 'application/javascript',
    body: "window.IL_CONFIG = { supabaseUrl: 'https://fake.supabase.co', supabaseAnonKey: 'fake' };"
  }));
  await page.addInitScript({ content: FAKE_CLIENT_SRC });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const navVisivel = () => page.$eval('#nav-admin', (e) => !e.hidden);

  // 1) visitante
  ok(!(await navVisivel()), 'visitante NÃO vê o item Administração no menu');

  // 2) usuário comum
  await entrar(page, 'comum@teste.com', true);
  ok(!(await navVisivel()), 'usuário comum NÃO vê o item Administração');
  await page.evaluate(() => { window.IL.ui.switchView('admin'); });
  await page.waitForTimeout(200);
  // forçar a tela na marra não dá acesso a nada
  await page.evaluate(() => { document.querySelector('.nav-item[data-nav="admin"]').click(); });
  await page.waitForTimeout(300);
  const textoComum = await page.$eval('#admin-conteudo', (e) => e.textContent);
  ok(/só para administradores/i.test(textoComum), 'abrir a tela na marra avisa que é só para administradores');

  // o usuário comum tentando se promover pela API (como no Console do navegador)
  const tentativa = await page.evaluate(async () => {
    const eu = window.__fake.auth.currentUser.id;
    await window.IL.db.updateProfile(eu, { papel: 'admin', plano: 'pro' });
    const p = window.__fake.store.profiles.find((x) => x.id === eu);
    return { papel: p.papel, plano: p.plano };
  });
  ok(tentativa.papel === 'usuario' && tentativa.plano === 'gratuito',
    'usuário comum NÃO se promove pela API (ficou ' + tentativa.papel + '/' + tentativa.plano + ')');
  await sair(page);

  // 3) admin (o "+admin" faz as vezes do UPDATE no SQL Editor)
  await entrar(page, 'alex+admin@teste.com', true);
  ok(await navVisivel(), 'admin vê o item Administração no menu');
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  const linhas = await page.$$eval('.adm-tabela tbody tr', (r) => r.length);
  ok(linhas === 2, 'admin enxerga todas as contas (' + linhas + ' de 2)');
  const numeros = await page.$$eval('#admin-conteudo .tra-resumo .n b', (b) => b.map((x) => x.textContent));
  ok(numeros[0] === '2' && numeros[1] === '1', 'o resumo bate: ' + numeros.join('/') + ' (usuários/admins/pro/bloqueados)');

  // daqui para a frente, endereçamos a linha pelo id da conta (o e-mail é
  // o que o admin enxerga, mas a linha carrega o uid no DOM)
  const uid = (email) => page.evaluate((e) => {
    const p = window.__fake.store.profiles.find((x) => x.email === e);
    return p ? p.id : '';
  }, email);
  const linhaDe = async (email) => '.adm-tabela tbody tr[data-uid="' + (await uid(email)) + '"]';
  const LINHA = await linhaDe('comum@teste.com');
  const MINHA = await linhaDe('alex+admin@teste.com');

  // promover a Pro
  await page.click(LINHA + ' [data-adm="plano"]');
  await page.waitForTimeout(400);
  const plano = await page.$eval(LINHA + ' .plan-badge', (e) => e.textContent.trim());
  ok(plano === 'Pro', 'admin torna outro usuário Pro (ficou ' + plano + ')');

  // bloquear, com motivo
  await page.click(LINHA + ' [data-adm="bloqueio"]');
  await page.waitForTimeout(400);
  const situacao = await page.$eval(LINHA + ' .adm-status-bloq, ' + LINHA + ' .adm-status-ok', (e) => e.textContent.trim());
  ok(situacao === 'bloqueado', 'admin bloqueia o usuário (situação: ' + situacao + ')');
  const carimbo = await page.evaluate(() => {
    const p = window.__fake.store.profiles.find((x) => x.email === 'comum@teste.com');
    return { motivo: p.motivo_bloqueio, quem: !!p.bloqueado_por, quando: !!p.bloqueado_em };
  });
  ok(carimbo.motivo === 'bagunça no fórum' && carimbo.quem && carimbo.quando,
    'o motivo e o carimbo de quem/quando ficam registrados');

  // a própria conta do admin não tem botões
  const minhaLinha = await page.$eval('' + MINHA + ' .adm-acoes', (e) => e.textContent);
  ok(/própria conta/i.test(minhaLinha), 'a própria conta do admin não tem botões (não dá para ficar sem admin)');

  // busca
  await page.fill('#admin-busca', 'comum');
  await page.waitForTimeout(300);
  ok((await page.$$eval('.adm-tabela tbody tr', (r) => r.length)) === 1, 'a busca por e-mail filtra a lista');
  await page.fill('#admin-busca', '');
  await page.waitForTimeout(300);
  await sair(page);

  // 4) o bloqueado tenta entrar
  await entrar(page, 'comum@teste.com', false);
  await page.waitForTimeout(800);
  const modalAberto = await page.$eval('#auth-modal', (e) => !e.hidden && getComputedStyle(e).display !== 'none');
  const aviso = await page.$eval('#auth-modal-msg', (e) => e.textContent);
  const aindaLogado = await page.$('#btn-sair');
  ok(!aindaLogado, 'o usuário bloqueado NÃO fica logado');
  ok(modalAberto && /suspenso/i.test(aviso), 'ele recebe o aviso do bloqueio: "' + aviso.slice(0, 80) + '…"');
  ok(/bagunça no fórum/.test(aviso), 'o motivo aparece para ele');

  // 5) o admin desbloqueia e o acesso volta
  await entrar(page, 'alex+admin@teste.com', false);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click(LINHA + ' [data-adm="bloqueio"]');
  await page.waitForTimeout(400);
  const situacao2 = await page.$eval(LINHA + ' .adm-status-ok, ' + LINHA + ' .adm-status-bloq', (e) => e.textContent.trim());
  ok(situacao2 === 'ativo', 'admin desbloqueia (situação: ' + situacao2 + ')');
  await sair(page);
  await entrar(page, 'comum@teste.com', false);
  await page.waitForTimeout(600);
  ok(!!(await page.$('#btn-sair')), 'desbloqueado consegue entrar de novo');
  const ehPro = await page.$eval('.user-plan', (e) => e.textContent);
  ok(/Pro/.test(ehPro), 'e continua com o plano que o admin deu (' + ehPro.trim() + ')');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await page.screenshot({ path: '/tmp/admin.png', fullPage: false });
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nAdministração ok.');
  await browser.close();
  process.exit(falhas ? 1 : 0);
})();
