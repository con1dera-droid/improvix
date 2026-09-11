/**
 * Smoke test do metrônomo / andamento / repetir (Ouça a progressão e
 * Fraseados). node tests/transporte.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    window.__clicks = 0;
    const orig = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...a) { if (this.type === 'square') window.__clicks++; return orig.apply(this, a); };
  });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.evaluate(() => { try { localStorage.removeItem('il_transport'); } catch (e) {} });
  await page.click('#btn-analisar');
  await page.waitForTimeout(300);
  const bar = '.transport[data-transport="prog"]';
  await page.click(bar + ' [data-act="metro"]');
  await page.click(bar + ' [data-act="loop"]');
  await page.fill(bar + ' .tr-bpm-input', '300');
  await page.press(bar + ' .tr-bpm-input', 'Enter');
  console.log('bpm após digitar 300 (limite 240):', await page.$eval(bar + ' .tr-bpm-input', (e) => e.value));
  await page.click(bar + ' [data-act="menos"]');
  console.log('após −:', await page.$eval(bar + ' .tr-bpm-input', (e) => e.value),
    '| metrônomo ligado:', await page.$eval(bar + ' [data-act="metro"]', (e) => e.classList.contains('on')),
    '| repetir ligado:', await page.$eval(bar + ' [data-act="loop"]', (e) => e.classList.contains('on')));
  await page.click('#btn-play-progressao');
  await page.waitForTimeout(5000); // 8 tempos a 235 bpm ≈ 2 s — tem que ter repetido
  console.log('Progressão em loop — ainda tocando após 5 s:', await page.$eval('#btn-play-progressao', (e) => e.classList.contains('playing')),
    '| cliques de metrônomo agendados:', await page.evaluate(() => window.__clicks));
  await page.click('#btn-play-progressao');
  await page.waitForTimeout(200);
  console.log('Parou:', !(await page.$eval('#btn-play-progressao', (e) => e.classList.contains('playing'))));

  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(300);
  const lb = '.transport[data-transport="linha"]';
  console.log('Barra da linha — bpm padrão:', await page.$eval(lb + ' .tr-bpm-input', (e) => e.value));
  await page.click(lb + ' [data-act="mais"]');
  await page.click(lb + ' [data-act="metro"]');
  await page.evaluate(() => { window.__clicks = 0; });
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(1500);
  console.log('Linha com metrônomo — cliques:', await page.evaluate(() => window.__clicks), '| tocando:', await page.$eval('#btn-tocar-linha', (e) => e.classList.contains('playing')));
  await page.click('#btn-tocar-linha');
  await page.reload();
  await page.waitForTimeout(300);
  console.log('Depois de recarregar, guarda as escolhas — bpm prog:', await page.$eval(bar + ' .tr-bpm-input', (e) => e.value), '| linha:', await page.$eval(lb + ' .tr-bpm-input', (e) => e.value));
  await page.click('#btn-analisar');
  await page.waitForTimeout(200);
  await page.$eval('.col-side', (e) => e.scrollIntoView());
  await page.screenshot({ path: path.resolve(__dirname, '../../transporte.png') });
  console.log('Erros de página:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
