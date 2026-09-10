/**
 * Smoke test da Etapa 4 (contas de usuário) — roda no Chromium headless.
 * Como não temos um projeto Supabase real neste ambiente, isso confere que:
 *  - a página carrega sem erros mesmo com o Supabase "não configurado"
 *    (js/config.js com os valores de exemplo);
 *  - o botão "Entrar" abre o modal e mostra a mensagem de "não configurado";
 *  - a navegação entre Início / Histórico / Favoritos / Exercícios /
 *    Configurações troca de tela corretamente;
 *  - os botões de Salvar/Favoritar/Exercício ficam desabilitados sem login.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800); // dá tempo do CDN do supabase-js carregar (ou falhar, sem travar)

  const saveDisabled = await page.$eval('#btn-salvar-historico', (b) => b.disabled);
  console.log('Botão "Salvar no histórico" desabilitado sem login:', saveDisabled);

  await page.click('#btn-entrar');
  await page.waitForTimeout(150);
  const modalVisible = await page.$eval('#auth-modal', (m) => !m.hidden);
  const msg = await page.$eval('#auth-modal-msg', (m) => m.textContent.trim());
  console.log('Modal visível:', modalVisible);
  console.log('Mensagem do modal (Supabase não configurado):', msg);

  await page.click('#auth-modal-close');
  await page.waitForTimeout(100);
  const modalHiddenAfterClose = await page.$eval('#auth-modal', (m) => m.hidden);
  console.log('Modal fechado após clicar no X:', modalHiddenAfterClose);

  // Navegação entre views
  for (const nav of ['historico', 'favoritos', 'meus-exercicios', 'config', 'inicio']) {
    await page.click('.nav-item[data-nav="' + nav + '"]');
    await page.waitForTimeout(80);
  }
  const inicioVisible = await page.$eval('.content.view[data-view="inicio"]', (v) => !v.hidden);
  console.log('View "inicio" visível após navegar e voltar:', inicioVisible);

  await page.click('.nav-item[data-nav="historico"]');
  await page.waitForTimeout(100);
  const gateVisible = await page.$eval('#auth-gate-historico', (g) => !g.hidden);
  console.log('Aviso de login exibido na aba Histórico (sem estar logado):', gateVisible);

  // Botões da aba Fraseados devem estar desabilitados sem login
  await page.click('.nav-item[data-nav="inicio"]');
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  const favDisabled = await page.$eval('#btn-favoritar', (b) => b.disabled);
  const exeDisabled = await page.$eval('#btn-exercicio', (b) => b.disabled);
  console.log('Botão Favoritar desabilitado sem login:', favDisabled);
  console.log('Botão Exercício desabilitado sem login:', exeDisabled);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
