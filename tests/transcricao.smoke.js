/**
 * Smoke test da tela Transcrição / Treino: sobe um áudio de verdade, roda o
 * detector dentro do navegador e confere que sai transcrição em seções.
 * node tests/transcricao.smoke.js [caminho-do-audio]
 */
const { chromium } = require('playwright');
const path = require('path');

const AUDIO = process.argv[2] || path.resolve(__dirname, 'fixtures/solo-teste.wav');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  let failed = false;
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });
  function check(ok, msg) { if (!ok) { failed = true; console.log('FALHA ' + msg); } else console.log('ok    ' + msg); }

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  await page.click('.nav-item[data-nav="transcricao"]');
  await page.waitForTimeout(400);
  check(await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view')) === 'transcricao',
    'o item do menu abre a tela');
  check(await page.$('#tra-drop') !== null && await page.$('#tra-gravar') !== null,
    'a tela tem as duas entradas (arquivo e gravação)');

  // Nenhuma biblioteca pesada antes de mandar um áudio
  const antes = await page.evaluate(() => ({ tf: typeof window.tf, bp: typeof window.BasicPitchLib }));
  check(antes.tf === 'undefined' && antes.bp === 'undefined',
    'as bibliotecas pesadas ainda NÃO foram carregadas (' + JSON.stringify(antes) + ')');

  console.log('\nmandando o áudio: ' + path.basename(AUDIO));
  const t0 = Date.now();
  await page.setInputFiles('#tra-arquivo', AUDIO);
  await page.waitForSelector('.tra-secao', { timeout: 600000 });
  const segundos = (Date.now() - t0) / 1000;

  const depois = await page.evaluate(() => ({ tf: typeof window.tf, bp: typeof window.BasicPitchLib, backend: window.tf ? tf.getBackend() : null }));
  check(depois.tf === 'object' && depois.bp === 'object', 'as bibliotecas carregaram sob demanda (backend: ' + depois.backend + ')');

  const resumo = await page.$$eval('.tra-resumo .n', (ns) => ns.map((n) => n.textContent.replace(/\s+/g, ' ').trim()));
  console.log('resumo:', resumo);
  const secoes = await page.$$eval('.tra-secao .lib-card-title', (t) => t.map((x) => x.textContent));
  console.log('seções:', secoes.length);
  secoes.slice(0, 4).forEach((s) => console.log('   ' + s));
  check(secoes.length >= 2, 'o solo foi dividido em seções (' + secoes.length + ')');
  check(await page.$$eval('.tra-secao .tab-block', (t) => t.length) === secoes.length, 'toda seção tem tablatura');
  const notas = await page.$eval('.tra-secao .tra-notas', (e) => e.textContent.slice(0, 120));
  console.log('notas da 1ª seção:', notas);
  check(/[A-G]/.test(notas), 'as notas aparecem escritas');
  console.log('tempo total (abrir + detectar + desenhar):', segundos.toFixed(1) + 's para 30 s de áudio');

  // Tocar a transcrição e o original
  await page.click('.tra-secao [data-act="ouvir"]');
  await page.waitForTimeout(1200);
  check(await page.$eval('.tra-secao [data-act="ouvir"]', (b) => b.classList.contains('playing')), 'toca a transcrição da seção');
  await page.click('.tra-secao [data-act="ouvir"]');
  await page.waitForTimeout(300);
  await page.click('.tra-secao [data-act="original"]');
  await page.waitForTimeout(1200);
  check(await page.$eval('.tra-secao [data-act="original"]', (b) => b.classList.contains('playing')), 'toca o trecho original daquela seção');
  await page.click('.tra-secao [data-act="original"]');
  await page.waitForTimeout(300);

  check(await page.$$eval('.transport[data-transport="transcricao"] .tr-btn', (b) => b.length) === 4,
    'a barra de metrônomo/andamento/repetir está na tela');

  // Trocar o instrumento refaz a transcrição. O Teclado é o caso que já
  // quebrou: a faixa dele começa na nota mais grave que o modelo conhece, e o
  // limite de frequência acabava zerando a transcrição inteira (0 notas).
  for (const ins of ['sax', 'teclado', 'baixo']) {
    await page.selectOption('#tra-instrumento', ins);
    await page.waitForSelector('.tra-secao', { timeout: 600000 });
    await page.waitForTimeout(400);
    const n = await page.$$eval('.tra-resumo .n b', (b) => b.map((x) => x.textContent));
    const secs = await page.$$eval('.tra-secao', (s) => s.length);
    check(Number(n[0]) > 0 && secs > 0, ins + ': achou ' + n[0] + ' notas em ' + secs + ' seções');
  }
  await page.selectOption('#tra-instrumento', 'sax');
  await page.waitForSelector('.tra-secao', { timeout: 600000 });
  await page.waitForTimeout(500);
  const comSax = await page.$$eval('.tra-secao svg', (s) => s.length);
  check(comSax > 0, 'no sax aparece partitura no lugar da tablatura (' + comSax + ' pautas)');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) failed = true;
  await page.screenshot({ path: '/tmp/transcricao.png', fullPage: true });
  console.log(failed ? '\nFALHOU' : '\nTranscrição ok.');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
