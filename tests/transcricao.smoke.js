/**
 * Smoke test da tela Transcrição / Treino: sobe um áudio de verdade, roda o
 * detector dentro do navegador e confere que sai transcrição em seções.
 * node tests/transcricao.smoke.js [caminho-do-audio]
 */
const { chromium } = require('playwright');
const path = require('path');

// Sem áudio na linha de comando, usa o solo sintético do teste — que é
// recriado na hora se ainda não existir (o .wav não fica no repositório).
const AUDIO = process.argv[2] || require('./fixtures/gera-solo.js').garantir();

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

  await page.goto(process.env.IL_URL || ('file://' + path.resolve(__dirname, '../index.html')), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  await page.click('.nav-item[data-nav="transcricao"]');
  await page.waitForTimeout(400);
  check(await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view')) === 'transcricao',
    'o item do menu abre a tela');
  check(await page.$('#tra-drop') !== null && await page.$('#tra-gravar') !== null,
    'a tela tem as duas entradas (arquivo e gravação)');

  // o padrão do site é teclado (partitura); aqui queremos exercitar a tablatura
  await page.selectOption('#tra-instrumento', 'guitarra');
  await page.waitForTimeout(200);

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

  // ---- correção manual das notas ----
  const notasAntes = await page.$$eval('.tra-secao:first-child .tra-nota', (n) => n.map((x) => x.textContent));
  await page.click('.tra-secao:first-child .tra-nota:nth-child(2)');
  await page.waitForTimeout(300);
  check(await page.$('.tra-editor') !== null, 'clicar numa nota abre a barra de correção');
  await page.click('.tra-editor [data-act="mover"][data-d="1"]');
  await page.waitForTimeout(400);
  const depois1 = await page.$$eval('.tra-secao:first-child .tra-nota', (n) => n.map((x) => x.textContent));
  check(depois1[1] !== notasAntes[1], 'subir meio tom muda a nota (' + notasAntes[1] + ' -> ' + depois1[1] + ')');
  check(await page.$$eval('.tra-secao:first-child .tra-nota.corrigida', (n) => n.length) === 1,
    'a nota corrigida fica marcada');
  check(/corrigida/.test(await page.$eval('.tra-secao:first-child .si-legend', (e) => e.textContent)),
    'a seção avisa quantas notas você corrigiu');

  await page.click('.tra-editor [data-act="mover"][data-d="-12"]');
  await page.waitForTimeout(400);
  await page.click('.tra-editor [data-act="desfazer"]');
  await page.waitForTimeout(300);
  const depoisUndo = await page.$$eval('.tra-secao:first-child .tra-nota', (n) => n.map((x) => x.textContent));
  check(depoisUndo[1] === depois1[1], 'desfazer volta uma correção (' + depoisUndo[1] + ')');

  // setas do teclado
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(350);
  const comSeta = await page.$$eval('.tra-secao:first-child .tra-nota', (n) => n.map((x) => x.textContent));
  check(comSeta[1] !== depoisUndo[1], 'a seta ↑ do teclado sobe meio tom');

  // apagar
  const qtd = comSeta.length;
  await page.click('.tra-editor [data-act="apagar"]');
  await page.waitForTimeout(350);
  check(await page.$$eval('.tra-secao:first-child .tra-nota', (n) => n.length) === qtd - 1,
    'apagar tira a nota da seção');

  // ---- registro do solo: filtra na hora, sem rodar o detector de novo ----
  check(await page.$('.tra-registro') !== null, 'a tela mostra o controle de registro do solo');
  const regAntes = await page.evaluate(() => ({
    min: Number(document.getElementById('tra-reg-min').value),
    max: Number(document.getElementById('tra-reg-max').value),
    notas: Number(document.querySelector('.tra-resumo .n b').textContent)
  }));
  console.log('registro detectado:', regAntes);
  const t1 = Date.now();
  await page.selectOption('#tra-reg-min', String(regAntes.min + 7));
  await page.waitForTimeout(500);
  const msFiltro = Date.now() - t1;
  const regDepois = await page.evaluate(() => ({
    notas: Number(document.querySelector('.tra-resumo .n b').textContent),
    bp: typeof window.BasicPitchLib
  }));
  check(regDepois.notas < regAntes.notas, 'apertar o grave tira notas (' + regAntes.notas + ' -> ' + regDepois.notas + ')');
  check(msFiltro < 4000, 'o filtro é instantâneo (' + msFiltro + ' ms, sem rodar a rede de novo)');
  check(await page.$('[data-act="reg-solta"]') !== null, 'aparece o botão de soltar o registro');
  await page.click('[data-act="reg-solta"]');
  await page.waitForTimeout(500);
  const soltou = await page.evaluate(() => Number(document.querySelector('.tra-resumo .n b').textContent));
  check(soltou === regAntes.notas, 'soltar volta ao que era (' + soltou + ')');

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
