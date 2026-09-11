/**
 * Smoke test da tela Exercícios de Padrões.
 * node tests/padroes.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);
  await page.click('.nav-item[data-nav="padroes"]');
  await page.waitForTimeout(300);
  const view = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const lines = await page.$$eval('#pad-lista .pad-line', (e) => e.length);
  console.log('View:', view, '| linhas (tons):', lines, '| padrão:', await page.$eval('#pad-info .pad-info-title', (e) => e.textContent));
  console.log('Títulos:', await page.$$eval('#pad-lista .lib-card-title', (e) => e.slice(0, 3).map((x) => x.textContent)));

  await page.selectOption('#pad-categoria', 'iivi');
  await page.waitForTimeout(200);
  console.log('II–V–I:', await page.$eval('#pad-info .pad-formula', (e) => e.textContent));
  await page.click('.pad-view[data-v="partitura"]');
  await page.waitForTimeout(150);
  console.log('Partituras:', await page.$$eval('#pad-lista svg', (e) => e.length));
  await page.click('.pad-view[data-v="notas"]');
  await page.waitForTimeout(100);
  console.log('Notas (Db):', await page.$eval('#pad-lista .pad-line:nth-child(6) .cifra-block', (e) => e.textContent));
  await page.click('.pad-view[data-v="tab"]');
  await page.waitForTimeout(150);
  console.log('Tab linhas:', await page.$eval('#pad-lista .pad-line .tab-block', (e) => e.textContent.split('\n').length));

  await page.click('#btn-pad-tocar');
  await page.waitForTimeout(2500);
  console.log('Tocando todos — botão:', await page.$eval('#btn-pad-tocar', (e) => e.textContent), '| linha destacada:', await page.$$eval('.pad-line.is-playing', (e) => e.map((x) => x.getAttribute('data-idx'))));
  await page.click('#btn-pad-tocar');
  await page.waitForTimeout(100);
  console.log('Parado — botão:', await page.$eval('#btn-pad-tocar', (e) => e.textContent));

  await page.click('#btn-pad-prox');
  await page.waitForTimeout(150);
  console.log('Próximo:', await page.$eval('#pad-info .pad-info-title', (e) => e.textContent));

  await page.selectOption('#pad-categoria', 'iivi_menor');
  await page.waitForTimeout(150);
  console.log('Menor — títulos:', await page.$$eval('#pad-lista .lib-card-title', (e) => e.slice(0, 2).map((x) => x.textContent)));

  await page.click('#pad-custom summary');
  await page.fill('#pad-graus', '3 5 b7 b9');
  await page.selectOption('#pad-acorde', 'dom');
  await page.click('#btn-pad-custom');
  await page.waitForTimeout(200);
  console.log('Próprio:', await page.$eval('#pad-info .pad-info-title', (e) => e.textContent), '|', await page.$eval('#pad-info .pad-formula', (e) => e.textContent), '| linhas:', await page.$$eval('#pad-lista .pad-line', (e) => e.length));
  await page.fill('#pad-graus', '1 3 2 5 4 6 5 7B');
  await page.click('#btn-pad-custom');
  await page.waitForTimeout(200);
  console.log('Com "7B":', await page.$eval('#pad-info .pad-info-title', (e) => e.textContent), '| erro visível:', await page.$eval('#pad-erro', (e) => !e.hidden),
    '| 1ª linha:', await page.$eval('#pad-lista .pad-line .lib-card-title', (e) => e.textContent));
  await page.fill('#pad-graus', '1 x 3');
  await page.click('#btn-pad-custom');
  console.log('Erro:', await page.$eval('#pad-erro', (e) => e.hidden ? '(sem)' : e.textContent));

  await page.selectOption('#pad-categoria', 'iivi');
  await page.selectOption('#pad-padrao', 'c7');
  await page.click('.pad-view[data-v="partitura"]');
  await page.waitForTimeout(200);
  await page.$eval('#pad-info', (e) => e.scrollIntoView());
  await page.screenshot({ path: path.resolve(__dirname, '../../padroes.png') });
  console.log('Erros de página:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
