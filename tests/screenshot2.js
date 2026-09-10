const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1536, height: 1200 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  const filePath = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(filePath);
  await page.waitForTimeout(200);

  // Vai para a aba Fraseados
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-fraseados-tab.png'), fullPage: true });

  const listaTxt = await page.$eval('#lista-fraseados', (n) => n.textContent.replace(/\s+/g, ' ').trim());
  console.log('Lista de fraseados:', listaTxt);

  // Seleciona a frase 5 (resolução) e olha a Cifra
  const count = await page.$$eval('#lista-fraseados [data-phrase-index]', (els) => els.length);
  console.log('Qtd de fraseados gerados:', count);
  await page.click('#lista-fraseados [data-phrase-index="4"]');
  await page.click('.view-btn[data-view="cifra"]');
  await page.waitForTimeout(100);
  const cifra = await page.$eval('.cifra-block', (n) => n.textContent.trim());
  console.log('Cifra da frase 5 (resolução):', cifra);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-fraseado-cifra.png'), fullPage: true });

  // Volta pra frase 1, vê a Tab
  await page.click('#lista-fraseados [data-phrase-index="0"]');
  await page.click('.view-btn[data-view="tab"]');
  await page.waitForTimeout(100);
  const tabTxt = await page.$eval('.tab-block', (n) => n.textContent);
  console.log('Tab da frase 1:\n' + tabTxt);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-fraseado-tab.png'), fullPage: true });

  // Partitura
  await page.click('.view-btn[data-view="partitura"]');
  await page.waitForTimeout(100);
  const svgCount = await page.$$eval('.staff-block svg ellipse', (els) => els.length);
  console.log('Notas desenhadas na partitura (elipses):', svgCount);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-fraseado-partitura.png'), fullPage: true });

  // Troca instrumento pra Teclado -> Tab deve ficar desabilitada e cair pra Partitura
  await page.selectOption('#input-instrumento', 'teclado');
  await page.waitForTimeout(100);
  const tabDisabled = await page.$eval('.view-btn[data-view="tab"]', (n) => n.disabled);
  const activeView = await page.$eval('.view-btn.active', (n) => n.getAttribute('data-view'));
  console.log('Com Teclado selecionado -> aba Tab desabilitada:', tabDisabled, '| view ativa:', activeView);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
