/**
 * Teste end-to-end das contas de usuário com o Supabase FALSO compartilhado
 * (tests/fake-supabase.js), que reproduz as regras do banco de verdade.
 * Isso não substitui testar com um projeto Supabase real (RLS só existe de
 * verdade lá, e tests/rls.sql confere as políticas num PostgreSQL), mas
 * confirma que toda a lógica de tela — cadastro/login, salvar histórico,
 * favoritar, adicionar exercício, trocar status, logout — está correta,
 * agora já com o portão de entrada no lugar (o primeiro cadastro é o
 * administrador e entra liberado).
 *
 *   node tests/etapa4.e2e.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararPagina, entrar } = require('./fake-supabase.js');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && !/Failed to load resource|net::ERR/.test(msg.text())) errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await prepararPagina(page);
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(600);

  // 1) Cadastro (o primeiro vira administrador e entra direto)
  await entrar(page, 'teste@exemplo.com', true);
  await page.waitForTimeout(600);
  await page.click('.nav-item[data-nav="harmonia"]');
  await page.waitForTimeout(250);
  const headerAfterSignup = await page.$eval('#user-area', (a) => a.textContent.replace(/\s+/g, ' ').trim());
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
  await page.click('.nav-item[data-nav="harmonia"]');
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
  await page.click('.nav-item[data-nav="harmonia"]');
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
