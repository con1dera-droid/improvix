const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  const filePath = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(filePath);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-full.png'), fullPage: true });

  // Aba Escalas
  await page.click('.tab[data-tab="escalas"]');
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-escalas.png'), fullPage: true });

  // Aba Arpejos
  await page.click('.tab[data-tab="arpejos"]');
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-arpejos.png'), fullPage: true });
  const arpejoTxt = await page.$eval('#lista-arpejos', (n) => n.textContent.replace(/\s+/g, ' ').trim());
  console.log('Arpejos (Gmaj7 primeiro):', arpejoTxt.slice(0, 200));

  // Nivel iniciante -> menos escalas/arpejos
  await page.selectOption('#input-nivel', 'iniciante');
  await page.click('#btn-analisar');
  await page.waitForTimeout(100);
  const arpejoIniciante = await page.$eval('#lista-arpejos', (n) => n.textContent.replace(/\s+/g, ' ').trim());
  console.log('Arpejos nível iniciante:', arpejoIniciante.slice(0, 200));

  // Progressão com acorde inválido + dominante secundário, tonalidade C maior
  await page.selectOption('#input-nivel', 'avancado');
  await page.selectOption('#input-tonalidade', 'C|maior');
  await page.fill('#input-progressao', 'Cmaj7 | A7 | Dm7 | G7 | Xyz9');
  await page.click('#btn-analisar');
  await page.waitForTimeout(100);
  const errorBox = await page.$eval('#form-error', (n) => n.textContent.trim());
  console.log('Mensagem de erro exibida:', errorBox);
  const rows = await page.$$eval('#tabela-visao-geral tbody tr', (trs) => trs.map((tr) => tr.textContent.trim()));
  console.log('Linhas (C maior, com dom. secundário e acorde inválido):', JSON.stringify(rows, null, 2));
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-secundario.png'), fullPage: true });

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
