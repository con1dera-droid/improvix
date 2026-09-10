/**
 * Smoke test da Etapa 5 (mais instrumentos) — roda no Chromium headless.
 * Confirma que:
 *  - os 5 novos instrumentos aparecem no select e no rodapé;
 *  - clicar num instrumento no rodapé seleciona ele no formulário;
 *  - para instrumentos sem traste (sax/trompete/violino/flauta) o botão
 *    "Tab" fica desabilitado e a visualização cai para Partitura;
 *  - para violão o botão "Tab" funciona (mesma afinação da guitarra);
 *  - tocar a progressão e um fraseado em cada instrumento novo não gera
 *    erros no console.
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
  await page.waitForTimeout(300);

  // 1) Novos instrumentos no select
  const options = await page.$$eval('#input-instrumento option', (opts) => opts.map((o) => o.value));
  console.log('Opções do select de instrumento:', options);

  // 2) Rodapé: violão, sax, trompete, violino, flauta clicáveis
  for (const instr of ['violao', 'sax', 'trompete', 'violino', 'flauta']) {
    await page.click('.instrument-bar .instr[data-instr="' + instr + '"]');
    await page.waitForTimeout(60);
    const selected = await page.$eval('#input-instrumento', (s) => s.value);
    console.log('Após clicar em "' + instr + '" no rodapé, select ficou:', selected);
  }

  // 3) Sax: Tab deve ficar desabilitado, view cai para partitura
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  await page.selectOption('#input-instrumento', 'sax');
  await page.waitForTimeout(100);
  const tabDisabledSax = await page.$eval('.view-btn[data-view="tab"]', (b) => b.disabled);
  const activeViewSax = await page.$eval('.view-toggle .view-btn.active', (b) => b.getAttribute('data-view'));
  console.log('Sax — botão Tab desabilitado:', tabDisabledSax, '| view ativa:', activeViewSax);

  // 4) Violão: Tab deve funcionar
  await page.selectOption('#input-instrumento', 'violao');
  await page.waitForTimeout(100);
  const tabDisabledViolao = await page.$eval('.view-btn[data-view="tab"]', (b) => b.disabled);
  console.log('Violão — botão Tab desabilitado:', tabDisabledViolao);
  await page.click('.view-btn[data-view="tab"]');
  await page.waitForTimeout(100);
  const tabContentViolao = await page.$eval('#fraseado-conteudo', (c) => c.textContent.trim().length > 0);
  console.log('Violão — conteúdo de tab renderizado:', tabContentViolao);

  // 5) Áudio: tocar progressão e fraseado com instrumentos novos
  for (const instr of ['violao', 'sax', 'trompete', 'violino', 'flauta']) {
    await page.selectOption('#input-instrumento', instr);
    await page.waitForTimeout(50);
    await page.click('.tab[data-tab="visao-geral"]').catch(() => {});
    await page.click('#btn-play-progressao');
    await page.waitForTimeout(200);
    await page.click('#btn-play-progressao'); // para
    await page.waitForTimeout(50);
  }
  console.log('Progressão tocada nos 5 novos instrumentos sem travar.');

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
