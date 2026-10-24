/**
 * Smoke test do áudio (Etapa 3) — não há como "ouvir" no Node, então isso
 * roda no Chromium headless (Playwright) e confere que:
 *  - clicar em "Tocar progressão" não gera erro e o botão muda de estado;
 *  - o acorde atual é destacado durante a reprodução;
 *  - o botão "Áudio" de um fraseado também funciona;
 *  - parar a reprodução no meio do caminho funciona sem erro.
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await prepararSemLogin(page);
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(200);
  // A análise de harmonia saiu do Início e virou item do menu (07/10/2026).
  await page.click('.nav-item[data-nav="harmonia"]');
  await page.waitForTimeout(250);

  // Toca a progressão, espera o primeiro acorde destacar, depois para no meio.
  await page.click('#btn-play-progressao');
  await page.waitForTimeout(150);
  const playingLabel = await page.$eval('#btn-play-progressao', (b) => b.textContent);
  const highlighted = await page.$$eval('#chord-chain .chord-pill.playing', (els) => els.length);
  console.log('Rótulo do botão durante reprodução:', playingLabel);
  console.log('Acordes destacados durante reprodução:', highlighted);

  await page.click('#btn-play-progressao'); // para no meio
  await page.waitForTimeout(100);
  const stoppedLabel = await page.$eval('#btn-play-progressao', (b) => b.textContent);
  const highlightedAfterStop = await page.$$eval('#chord-chain .chord-pill.playing', (els) => els.length);
  console.log('Rótulo do botão após parar:', stoppedLabel);
  console.log('Acordes destacados após parar:', highlightedAfterStop);

  // Deixa terminar naturalmente uma vez (progressão de 4 acordes ~ 4.6s)
  await page.click('#btn-play-progressao');
  await page.waitForTimeout(5200);
  const labelAfterFinish = await page.$eval('#btn-play-progressao', (b) => b.textContent);
  console.log('Rótulo do botão após terminar sozinho:', labelAfterFinish);

  // Aba Fraseados: botão de áudio de uma frase
  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  await page.click('.view-btn[data-view="audio"]');
  await page.waitForTimeout(150);
  const phraseAudioLabel = await page.$eval('.view-btn[data-view="audio"]', (b) => b.textContent);
  console.log('Rótulo do botão de áudio do fraseado durante reprodução:', phraseAudioLabel);
  await page.click('.view-btn[data-view="audio"]'); // para
  await page.waitForTimeout(100);
  const phraseAudioLabelStopped = await page.$eval('.view-btn[data-view="audio"]', (b) => b.textContent);
  console.log('Rótulo do botão de áudio do fraseado após parar:', phraseAudioLabelStopped);

  // Tocar a partir SÓ dos nomes das notas, sem MIDI — é o que a tela de
  // Teoria Musical faz nos exemplos sonoros. Isso derrubava a passada inteira
  // com "non-finite": o array de midi vinha do mesmo tamanho, cheio de
  // undefined, e passava pela conferência de tamanho lá dentro.
  errors.length = 0;
  await page.evaluate(() => {
    const ev = ['C', 'Eb', 'G', 'Bb'].map((n, i) => ({ name: n, onset: i * 0.5, dur: 0.5, vel: 0.85 }));
    window.IL.audio.playEvents(ev, 'teclado', { bpm: 92, humanize: true, acentos: false });
  });
  await page.waitForTimeout(900);
  console.log('Tocar só com nomes de nota (sem midi) — erros:', JSON.stringify(errors));
  if (errors.length) { console.log('FALHA: tocar só com nomes de nota quebrou o áudio'); process.exitCode = 1; }

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
