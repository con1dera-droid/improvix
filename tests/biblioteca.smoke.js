/**
 * Smoke test da Biblioteca de Fraseados — roda no Chromium headless.
 *
 * Confirma: abre sem login; gera 12 frases com partitura rítmica; "Mais 12
 * frases" acrescenta; Tab/Notas trocam a visualização; "Ouvir" toca e para;
 * trocar estilo troca a escala sugerida; nível Avançado liberado para todos
 * (inclusive visitante, sem login).
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  await page.click('.nav-item[data-nav="biblioteca-fraseados"]');
  await page.waitForTimeout(250);
  const view = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const cards = await page.$$eval('.lib-card', (e) => e.length);
  const beams = await page.$$eval('.lib-card:first-child svg line[stroke-width="4"]', (e) => e.length);
  const resumo = await page.$eval('#lib-resumo', (e) => e.textContent);
  console.log('View:', view, '| frases:', cards, '| colchetes na 1ª partitura:', beams);
  console.log('Resumo:', resumo);

  await page.click('#btn-lib-mais');
  await page.waitForTimeout(200);
  console.log('Após "Mais 12 frases":', await page.$$eval('.lib-card', (e) => e.length));

  await page.click('.lib-card:first-child button[data-v="tab"]');
  await page.waitForTimeout(80);
  const tab = await page.$eval('.lib-card:first-child .tab-block', (e) => e.textContent.split('\n').length);
  await page.click('.lib-card:first-child button[data-v="notas"]');
  await page.waitForTimeout(80);
  const notas = await page.$eval('.lib-card:first-child .cifra-block', (e) => e.textContent);
  console.log('Tab com', tab, 'linhas | notas:', notas);

  await page.click('.lib-card:nth-child(2) button[data-play]');
  await page.waitForTimeout(500);
  const tocando = await page.$eval('.lib-card:nth-child(2) button[data-play]', (e) => e.textContent);
  await page.click('.lib-card:nth-child(2) button[data-play]');
  await page.waitForTimeout(100);
  const parado = await page.$eval('.lib-card:nth-child(2) button[data-play]', (e) => e.textContent);
  console.log('Áudio — tocando:', tocando, '| depois de parar:', parado);

  await page.selectOption('#lib-estilo', 'blues');
  await page.waitForTimeout(150);
  console.log('Estilo Blues → escala sugerida:', await page.$eval('#lib-escala', (e) => e.value),
    '| 1ª frase:', await page.$eval('.lib-card:first-child .lib-card-title', (e) => e.textContent));

  await page.selectOption('#lib-nivel', 'avancado');
  await page.waitForTimeout(100);
  console.log('Visitante escolheu Avançado → nível ficou:', await page.$eval('#lib-nivel', (e) => e.value),
    '| aviso Pro visível:', await page.$eval('#lib-gate-note', (e) => !e.hidden));

  await page.selectOption('#lib-estilo', 'bebop');
  await page.selectOption('#lib-escala', 'mixolidio');
  await page.selectOption('#lib-tom', 'G');
  await page.selectOption('#lib-nivel', 'avancado');
  await page.waitForTimeout(200);
  const titulos = await page.$$eval('.lib-card .lib-card-title', (e) => e.slice(0, 3).map((x) => x.textContent));
  const tecnicas = await page.$$eval('.lib-card .lib-explicacao', (e) => e.map((x) => x.textContent).join(' '));
  console.log('Visitante (Avançado) — nível:', await page.$eval('#lib-nivel', (e) => e.value), '| títulos:', JSON.stringify(titulos));
  console.log('Visitante (Avançado) — aparece arpejo circular (Parker)?', /arpejo circular/.test(tecnicas), '| escala bebop?', /bebop/.test(tecnicas));

  console.log('Erros de página:', JSON.stringify(errors));
  await browser.close();
})();
