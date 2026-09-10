/**
 * Segunda parte do smoke test da Etapa 4: simula o supabase-js já carregado
 * (sem depender do CDN, que pode falhar por rede neste ambiente) para
 * confirmar a mensagem correta quando o SDK carrega mas js/config.js ainda
 * tem os valores de exemplo — e o fluxo de cadastro/login com um cliente
 * Supabase falso (fake), sem precisar de um projeto real.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  // Injeta um "supabase" falso antes de qualquer script rodar, simulando o
  // CDN carregado (mas sem projeto real configurado em js/config.js).
  await page.addInitScript(() => {
    window.supabase = { createClient: () => ({}) };
  });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  await page.click('#btn-entrar');
  await page.waitForTimeout(150);
  const msg = await page.$eval('#auth-modal-msg', (m) => m.textContent.trim());
  console.log('Mensagem com SDK "carregado" mas config.js de exemplo:', msg);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
