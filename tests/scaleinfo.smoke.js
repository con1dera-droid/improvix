/**
 * Smoke test da ficha da escala na Biblioteca (fórmula e características).
 * node tests/scaleinfo.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);
  await page.click('.nav-item[data-nav="biblioteca-fraseados"]');
  await page.waitForTimeout(250);
  const read = () => page.$eval('#lib-escala-info', (e) => ({
    open: e.open, title: e.querySelector('summary').textContent,
    formula: [...e.querySelectorAll('.si-rows code')].map((c) => c.textContent),
    hl: [...e.querySelectorAll('.si-chip.si-hl .si-deg')].map((c) => c.textContent)
  }));
  console.log('Padrão:', JSON.stringify(await read()));
  await page.selectOption('#lib-escala', 'dorico');
  await page.selectOption('#lib-tom', 'D');
  await page.waitForTimeout(200);
  console.log('Dórico em D:', JSON.stringify(await read()));
  await page.selectOption('#lib-escala', 'alterada');
  await page.selectOption('#lib-tom', 'G');
  await page.waitForTimeout(200);
  console.log('Alterada em G:', JSON.stringify(await read()));
  await page.selectOption('#lib-escala', 'lidio');
  await page.selectOption('#lib-tom', 'F');
  await page.waitForTimeout(200);
  await page.$eval('#lib-escala-info', (e) => e.scrollIntoView());
  await page.screenshot({ path: path.resolve(__dirname, '../../scaleinfo.png') });
  await page.click('#lib-escala-info summary');
  await page.selectOption('#lib-escala', 'mixolidio');
  await page.waitForTimeout(200);
  console.log('Depois de fechar e trocar de escala — continua fechada?', !(await read()).open);
  console.log('Erros de página:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
