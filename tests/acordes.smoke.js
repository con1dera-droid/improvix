/**
 * Smoke test da tela "Biblioteca de Acordes" (que tomou o lugar do
 * Laboratório). Confere, no navegador de verdade:
 *
 *   - o item do menu abre a tela e o Laboratório não existe mais;
 *   - digitar uma cifra desenha os três blocos (cordas, teclado, baixo);
 *   - cifra que não existe avisa, em vez de inventar um acorde;
 *   - os atalhos de acorde comum funcionam;
 *   - trocar o instrumento muda a ordem e vale para o site inteiro;
 *   - o áudio toca e para;
 *   - os dois atalhos do fim levam para a Análise e para as Escalas.
 *
 *   node tests/acordes.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  // --- o menu ---
  const navs = await page.$$eval('.nav-item:not([hidden])', (a) => a.map((x) => x.getAttribute('data-nav')));
  ok(navs.indexOf('acordes') >= 0, 'o menu tem "Biblioteca de Acordes"');
  ok(navs.indexOf('laboratorio') < 0, 'o Laboratório saiu do menu');
  ok((await page.$('[data-view="laboratorio"]')) === null, 'e a tela do Laboratório não existe mais');

  await page.click('.nav-item[data-nav="acordes"]');
  await page.waitForTimeout(800);
  const vista = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  ok(vista === 'acordes', 'o item abre a tela (veio "' + vista + '")');

  // --- a tela já vem com um acorde pronto ---
  const blocos = await page.$$eval('#acd-conteudo .acd-bloco h3', (h) => h.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  ok(blocos.length === 3, 'mostra os três blocos: ' + blocos.join(' · '));
  ok(/Violão e guitarra/.test(blocos.join(' ')), 'violão e guitarra num bloco só (mesma afinação)');
  ok((await page.$$eval('#acd-conteudo .acd-forma svg', (s) => s.length)) >= 3, 'desenha os diagramas do braço');
  ok((await page.$$eval('#acd-conteudo .acd-teclado svg', (s) => s.length)) === 3, 'e os três voicings de teclado');

  // --- digitar uma cifra ---
  await page.fill('#acd-busca', 'G7(b9)');
  await page.click('#btn-acd-buscar');
  await page.waitForTimeout(900);
  const titulo = await page.$eval('#acd-conteudo .esc-title', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  ok(/G7\(b9\)/.test(titulo), 'digitar a cifra redesenha a tela (' + titulo + ')');
  const graus = await page.$$eval('.acd-nota', (ns) => ns.map((n) => n.textContent.trim()));
  ok(graus.join(' ').indexOf('b9') >= 0, 'mostra nota e grau, inclusive a tensão: ' + graus.join(' '));

  // --- cifra inventada ---
  await page.fill('#acd-busca', 'bobagem');
  await page.click('#btn-acd-buscar');
  await page.waitForTimeout(400);
  const erroVisivel = await page.$eval('#acd-erro', (e) => !e.hidden && /não reconheci/i.test(e.textContent));
  ok(erroVisivel, 'cifra que não existe avisa, em vez de inventar um acorde');
  const aindaG7 = await page.$eval('#acd-conteudo .esc-title', (e) => /G7/.test(e.textContent));
  ok(aindaG7, 'e o acorde anterior continua na tela');

  // --- atalhos de acordes comuns ---
  await page.click('#acd-sugestoes [data-cifra="Am7"]');
  await page.waitForTimeout(800);
  ok(/Am7/.test(await page.$eval('#acd-conteudo .esc-title', (e) => e.textContent)), 'os atalhos de acorde comum funcionam');

  // --- instrumento ---
  await page.selectOption('#acd-instrumento', 'baixo');
  await page.waitForTimeout(700);
  const primeiro = await page.$eval('#acd-conteudo .acd-bloco h3', (h) => h.textContent);
  ok(/Baixo/.test(primeiro), 'o instrumento escolhido vem primeiro (' + primeiro.trim() + ')');
  ok((await page.$eval('#input-instrumento', (e) => e.value)) === 'baixo', 'e a escolha vale para o site inteiro');
  await page.selectOption('#acd-instrumento', 'violao');
  await page.waitForTimeout(700);

  // --- áudio ---
  const btn = await page.$('#acd-conteudo .acd-forma [data-act="ouvir"]');
  await btn.click();
  await page.waitForTimeout(1400);
  ok(await btn.evaluate((b) => b.classList.contains('playing')), 'o botão Ouvir toca o acorde');
  await btn.click();
  await page.waitForTimeout(400);
  ok(!(await btn.evaluate((b) => b.classList.contains('playing'))), 'e clicar de novo para');

  // --- atalhos do fim ---
  await page.click('#acd-conteudo [data-act="ir-harmonia"]');
  await page.waitForTimeout(900);
  const vistaH = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const prog = await page.$eval('#input-progressao', (e) => e.value);
  ok(vistaH === 'harmonia' && /Am7/.test(prog), 'o atalho leva o acorde para a Análise de Harmonia (' + prog + ')');

  await page.click('.nav-item[data-nav="acordes"]');
  await page.waitForTimeout(700);
  await page.click('#acd-conteudo [data-act="ir-escalas"]');
  await page.waitForTimeout(900);
  ok((await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'))) === 'biblioteca-escalas',
    'e o outro atalho leva para a Biblioteca de Escalas');

  // --- nenhum acorde comum fica sem resposta ---
  await page.click('.nav-item[data-nav="acordes"]');
  await page.waitForTimeout(500);
  const semPosicao = [];
  for (const cifra of ['C', 'G', 'Am', 'F', 'Dm7', 'G7', 'C7M', 'E7', 'Bm7(b5)', 'A7', 'D7/F#', 'C6(9)']) {
    await page.fill('#acd-busca', cifra);
    await page.click('#btn-acd-buscar');
    await page.waitForTimeout(450);
    const formas = await page.$$eval('#acd-conteudo .acd-forma svg', (s) => s.length);
    if (!formas) semPosicao.push(cifra);
  }
  ok(semPosicao.length === 0, 'todo acorde comum tem posição desenhada' + (semPosicao.length ? ' — faltou: ' + semPosicao.join(', ') : ''));

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nAcordes ok.');
  process.exit(falhas ? 1 : 0);
})();
