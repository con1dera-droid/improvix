/**
 * Smoke test do seletor "Estilo" na aba Fraseados da análise.
 * node tests/estilos-fraseados.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.fill('#input-progressao', 'Am7 | D7 | Gmaj7 | Cmaj7');
  await page.click('#btn-analisar');
  await page.waitForTimeout(300);
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(200);
  console.log('Opções de estilo:', JSON.stringify(await page.$$eval('#input-estilo-fraseado option', (o) => o.map((x) => x.textContent))));
  for (const st of ['bebop', 'fusion', 'intervalado', 'baiao', 'blues']) {
    await page.selectOption('#input-estilo-fraseado', st);
    await page.waitForTimeout(200);
    const titles = await page.$$eval('#lista-fraseados .phrase-item .phrase-title', (e) => e.slice(0, 2).map((x) => x.textContent));
    console.log(st.padEnd(12), JSON.stringify(titles));
  }
  await page.selectOption('#input-estilo-fraseado', 'fusion');
  await page.waitForTimeout(200);
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(1200);
  console.log('Tocando linha (fusion):', await page.$eval('#btn-tocar-linha', (e) => e.classList.contains('playing')));
  await page.click('#btn-tocar-linha');
  await page.$eval('#input-estilo-fraseado', (e) => e.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: path.resolve(__dirname, '../../estilos-fraseados.png') });
  console.log('Erros de página:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
