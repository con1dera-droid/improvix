/**
 * Smoke test da Biblioteca Fusion (sweep, inspirado em Gambale), das
 * articulações na tablatura e do som com samples reais.
 * node tests/fusion.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  // O item "Fusion — sweep (Gambale)" saiu do menu em 12/09/2026; o estilo
  // continua na Biblioteca, escolhido no seletor de Estilo.
  await page.click('.nav-item[data-nav="biblioteca-fraseados"]');
  await page.waitForTimeout(300);
  await page.selectOption('#lib-estilo', 'fusion');
  await page.selectOption('#lib-nivel', 'avancado');
  await page.selectOption('#lib-instrumento', 'guitarra');
  await page.waitForTimeout(300);
  console.log('Estilo:', await page.$eval('#lib-estilo', (e) => e.value), '| escala:', await page.$eval('#lib-escala', (e) => e.value),
    '| frases:', await page.$$eval('.lib-card', (e) => e.length));

  await page.click('.lib-card:first-child button[data-v="tab"]');
  await page.waitForTimeout(100);
  const tabTxt = await page.$eval('.lib-card:first-child .tab-block', (e) => e.textContent);
  console.log('Tab da 1ª frase:\n' + tabTxt);
  console.log('Legenda visível:', await page.$$eval('.lib-card:first-child .tab-legend', (e) => e.length > 0));
  const allTabs = await page.$$eval('.lib-card', (cards) => cards.length);
  console.log('Explicação:', await page.$eval('.lib-card:first-child', (e) => (e.textContent.match(/Articulação:[^.]*\./) || ['(sem)'])[0]));

  console.log('Modo de som padrão:', await page.$eval('#som-modo', (e) => e.value));
  await page.click('.lib-card:first-child button[data-play]');
  await page.waitForTimeout(4000);
  const loaded = await page.evaluate(() => Object.keys(window.IL_SAMPLES || {}));
  console.log('Samples carregados:', loaded.join(', '), '| modo ativo:', await page.evaluate(() => window.IL.audio.getSoundMode()));
  await page.click('.lib-card:first-child button[data-play]');
  await page.waitForTimeout(150);
  const dec = await page.evaluate(() => window.IL.audio.preload('guitarra').then((ok) => 'ok=' + ok).catch((e) => 'ERRO ' + e));
  console.log('Samples decodificados (guitarra, piano elétrico, baixo):', dec);

  await page.selectOption('#som-modo', 'drive');
  await page.click('.lib-card:nth-child(2) button[data-play]');
  await page.waitForTimeout(3500);
  console.log('Com drive — samples:', (await page.evaluate(() => Object.keys(window.IL_SAMPLES || {}))).join(', '));
  await page.click('.lib-card:nth-child(2) button[data-play]');
  await page.selectOption('#som-modo', 'synth');
  await page.click('.lib-card:nth-child(3) button[data-play]');
  await page.waitForTimeout(600);
  console.log('Sintetizado — botão:', await page.$eval('.lib-card:nth-child(3) button[data-play]', (e) => e.textContent));
  await page.click('.lib-card:nth-child(3) button[data-play]');
  await page.selectOption('#som-modo', 'real');

  await page.screenshot({ path: path.resolve(__dirname, '../../fusion.png'), fullPage: false });
  console.log('Erros de página:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
