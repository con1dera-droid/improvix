/**
 * Smoke test do VOLUME: mede o sinal que chega na saída de áudio (pico) em
 * cada modo de som e instrumento. Falha se algum tocar baixo demais (< 0,3)
 * ou estourar (> 1). node tests/som.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const logs = [];
  let failed = false;
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.addInitScript(() => {
    const orig = AudioNode.prototype.connect;
    window.__peak = 0;
    AudioNode.prototype.connect = function (dest, ...r) {
      if (dest instanceof AudioDestinationNode) {
        const ctx = dest.context;
        if (!ctx.__an) {
          ctx.__an = ctx.createAnalyser(); ctx.__an.fftSize = 2048;
          orig.call(ctx.__an, dest);
          const buf = new Float32Array(2048);
          setInterval(() => { ctx.__an.getFloatTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v)); window.__peak = Math.max(window.__peak, m); window.__state = ctx.state; }, 30);
        }
        return orig.call(this, ctx.__an, ...r);
      }
      return orig.call(this, dest, ...r);
    };
  });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  async function measure(label, fn, ms = 3500) {
    await page.evaluate(() => { window.__peak = 0; });
    await fn();
    await page.waitForTimeout(ms);
    const pk = await page.evaluate(() => window.__peak);
    const ok = pk >= 0.3 && pk <= 1.0;
    if (!ok) failed = true;
    console.log((ok ? 'ok   ' : 'FALHA') + ' ' + label.padEnd(40), 'pico:', pk.toFixed(3), 'estado:', await page.evaluate(() => window.__state));
    await page.evaluate(() => window.IL.audio.stopAll());
  }
  // Análise
  await page.click('#btn-analisar');
  await page.waitForTimeout(300);
  await measure('Análise: tocar progressão (real)', () => page.click('#btn-play-progressao').catch(e => console.log('x', e.message)));
  await page.click('.nav-item[data-nav="biblioteca-fraseados"]');
  await page.waitForTimeout(300);
  await measure('Biblioteca: ouvir (real)', () => page.click('.lib-card:first-child button[data-play]'));
  await page.selectOption('#som-modo', 'synth');
  await measure('Biblioteca: ouvir (sintetizado)', () => page.click('.lib-card:nth-child(2) button[data-play]'));
  await page.selectOption('#som-modo', 'drive');
  await measure('Biblioteca: ouvir (drive)', () => page.click('.lib-card:nth-child(3) button[data-play]'));
  await page.selectOption('#som-modo', 'real');
  for (const ins of ['teclado','baixo','violao','sax','trompete','violino','flauta']) {
    await page.selectOption('#lib-instrumento', ins);
    await page.waitForTimeout(150);
    await measure('Biblioteca: ' + ins, () => page.click('.lib-card:nth-child(4) button[data-play]'), 6000);
  }
  console.log(logs.filter(l => !/Failed to load resource/.test(l)).join('\n'));
  await browser.close();
  console.log(failed ? 'ALGUM TESTE FALHOU.' : 'Volume ok em todos os modos e instrumentos.');
  if (failed) process.exitCode = 1;
})();
