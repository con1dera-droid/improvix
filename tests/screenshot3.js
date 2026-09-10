const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1536, height: 1200 } });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(200);

  await page.click('#btn-play-progressao');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-audio-progressao.png'), fullPage: true });
  await page.click('#btn-play-progressao');

  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  await page.click('.view-btn[data-view="audio"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.resolve(__dirname, '../screenshot-audio-fraseado.png'), fullPage: true });
  await page.click('.view-btn[data-view="audio"]');

  await browser.close();
})();
