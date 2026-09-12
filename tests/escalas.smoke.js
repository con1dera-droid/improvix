/**
 * Smoke test da tela Biblioteca de Escalas.
 * node tests/escalas.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(400);

  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(400);
  console.log('View:', await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view')));
  console.log('Escalas no seletor:', await page.$$eval('#esc-escala option', (o) => o.length),
    '| famílias:', await page.$$eval('#esc-escala optgroup', (o) => o.map((x) => x.label)));
  console.log('Título:', await page.$eval('.esc-title', (e) => e.textContent.trim()));
  console.log('Acorde:', await page.$eval('.lib-badge-chord', (e) => e.textContent.trim()));
  console.log('Chips (grau/int/nota):', await page.$$eval('.si-chips .si-chip', (c) => c.map((x) => x.textContent).join(' | ')));
  console.log('Linhas da ficha:', await page.$$eval('.si-rows > div', (d) => d.map((x) => x.textContent.trim())));
  console.log('Cards de explicação:', await page.$$eval('.esc-card-title', (t) => t.map((x) => x.textContent)));
  console.log('Diagrama SVG:', await page.$$eval('.esc-diagrama svg', (s) => s.length));
  console.log('Grupos de exercícios:', await page.$$eval('.esc-grupo', (t) => t.map((x) => x.textContent)));
  console.log('Exercícios:', await page.$$eval('.esc-ex .lib-card-title', (t) => t.map((x) => x.textContent)));
  console.log('Tabs dos exercícios:', await page.$$eval('.esc-ex .tab-block', (t) => t.length));
  console.log('Transporte presente:', await page.$$eval('.transport[data-transport="escala"] .tr-btn', (b) => b.length));

  // Busca
  await page.fill('#esc-busca', 'bebop');
  await page.waitForTimeout(300);
  console.log('\nBusca "bebop":', await page.$$eval('#esc-escala option', (o) => o.map((x) => x.textContent)));
  console.log('Título:', await page.$eval('.esc-title', (e) => e.textContent.trim()));

  // Troca de escala complexa + tom
  await page.fill('#esc-busca', 'hungara');
  await page.waitForTimeout(250);
  await page.selectOption('#esc-tom', 'Eb');
  await page.waitForTimeout(300);
  console.log('\nHúngara menor em Eb —', await page.$eval('.esc-title', (e) => e.textContent.trim()));
  console.log('Notas:', await page.$eval('.si-rows > div:last-child', (e) => e.textContent.trim()));
  console.log('Evitar:', await page.$$eval('.esc-card', (cs) => {
    const c = cs.find((x) => /evitar/i.test(x.querySelector('.esc-card-title').textContent));
    return c ? c.querySelector('p').textContent.slice(0, 90) : '(faltando)';
  }));

  // Toggles do diagrama
  await page.click('.esc-toggle .view-btn[data-act="rot"][data-v="notas"]');
  await page.waitForTimeout(200);
  console.log('Rótulos em notas:', await page.$$eval('.esc-diagrama text', (t) => t.slice(0, 8).map((x) => x.textContent)));
  await page.click('.esc-toggle .view-btn[data-act="casa"][data-v="5"]');
  await page.waitForTimeout(200);
  console.log('Casa 5 ativa:', await page.$eval('.view-btn[data-act="casa"][data-v="5"]', (b) => b.className));

  // Teclado
  await page.selectOption('#esc-instrumento', 'teclado');
  await page.waitForTimeout(300);
  console.log('\nTeclado — diagrama:', await page.$$eval('.esc-diagrama svg', (s) => s.length),
    '| partituras nos exercícios:', await page.$$eval('.esc-ex svg', (s) => s.length));

  // Transporte: bpm e metrônomo funcionam na barra injetada
  await page.click('.transport[data-transport="escala"] [data-act="mais"]');
  await page.click('.transport[data-transport="escala"] [data-act="metro"]');
  await page.waitForTimeout(150);
  console.log('bpm:', await page.$eval('.transport[data-transport="escala"] .tr-bpm-input', (i) => i.value),
    '| metrônomo:', await page.$eval('.transport[data-transport="escala"] [data-act="metro"]', (b) => b.className));

  // Áudio
  await page.click('[data-act="ouvir-escala"]');
  await page.waitForTimeout(1500);
  console.log('Ouvindo a escala:', await page.$eval('[data-act="ouvir-escala"]', (b) => b.textContent));
  await page.click('[data-act="ouvir-escala"]');
  await page.waitForTimeout(200);

  // Atalho para a Biblioteca de Fraseados
  await page.selectOption('#esc-instrumento', 'guitarra');
  await page.fill('#esc-busca', 'alterada');
  await page.waitForTimeout(300);
  const temBtn = await page.$('[data-act="ir-fraseados"]');
  if (temBtn) {
    await temBtn.click();
    await page.waitForTimeout(900);
    console.log('\nAtalho fraseados → view:', await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view')),
      '| escala:', await page.$eval('#lib-escala', (s) => s.value),
      '| tom:', await page.$eval('#lib-tom', (s) => s.value),
      '| frases:', await page.$$eval('#lib-lista .lib-card', (c) => c.length));
  } else {
    console.log('\n(sem atalho de fraseados para esta escala)');
  }

  console.log('\nErros de console:', errors.length ? errors : 'nenhum');
  await page.screenshot({ path: '/tmp/escalas.png', fullPage: true });
  await browser.close();
})();
