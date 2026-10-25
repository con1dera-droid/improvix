/**
 * A tela de Teoria Musical — do zero.
 *
 * Confere no navegador o que o teste de unidade não alcança: que a tela voltou
 * ao menu (ela existia e tinha ficado fora da lista em 14/10/2026), que as 28
 * lições aparecem agrupadas e numeradas, que o texto da lição é desenhado, e
 * que os exemplos sonoros viram botões que de fato tocam — o que distingue
 * esta tela de uma apostila.
 *
 *   node tests/teoria.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  // 1) o item está no menu, abrindo o grupo "Aprender e consultar"
  // (em 25/10/2026 o menu virou três grupos; antes disso a Teoria era o
  // segundo item de uma lista única)
  const menu = await page.$$eval('.nav-item[data-nav]', (items) => items.map((i) => i.getAttribute('data-nav')));
  ok(menu.indexOf('aulas') >= 0, 'Teoria Musical está no menu (posição ' + menu.indexOf('aulas') + ')');
  const grupoDaTeoria = await page.$eval('.nav-item[data-nav="aulas"]', (a) => {
    let el = a.previousElementSibling;
    while (el && !el.classList.contains('nav-grupo')) el = el.previousElementSibling;
    return el ? el.textContent.trim() : null;
  });
  ok(grupoDaTeoria === 'Aprender e consultar',
    'e é o primeiro item do grupo "Aprender e consultar" (veio em "' + grupoDaTeoria + '")');
  const rotulo = await page.$eval('.nav-item[data-nav="aulas"]', (a) => a.textContent.trim());
  ok(/Teoria Musical/.test(rotulo), 'o item se chama Teoria Musical ("' + rotulo + '")');
  ok(/Inicie aqui/.test(await page.$eval('.nav-item[data-nav="inicio"]', (a) => a.textContent)),
    'o primeiro item virou "Inicie aqui — treinar escalas"');

  // 2) abrindo a tela
  await page.click('.nav-item[data-nav="aulas"]');
  await page.waitForTimeout(500);
  ok(await page.$eval('.content.view[data-view="aulas"]', (v) => !v.hidden), 'a tela abre');

  const lista = await page.evaluate(() => ({
    licoes: document.querySelectorAll('#lista-aulas .aula-item').length,
    blocos: Array.from(document.querySelectorAll('#lista-aulas .aula-bloco')).map((b) => b.textContent),
    primeiroNum: document.querySelector('#lista-aulas .aula-num').textContent,
    primeiroTitulo: document.querySelector('#lista-aulas .aula-item .aula-titulo').textContent
  }));
  ok(lista.licoes === 28, 'as 28 lições aparecem na lista (' + lista.licoes + ')');
  ok(lista.blocos.slice(0, 4).join(' > ') === 'As notas > A escala e os acordes > O braço e as distâncias > A escrita',
    'os quatro blocos do zero abrem a lista, na ordem: ' + lista.blocos.slice(0, 4).join(' > '));
  ok(lista.primeiroNum === '1', 'as lições são numeradas');
  ok(/o que é uma nota/i.test(lista.primeiroTitulo), 'a primeira é a do que é uma nota ("' + lista.primeiroTitulo + '")');

  // 3) a lição aberta traz o texto e os botões de ouvir
  const detalhe = await page.evaluate(() => ({
    paragrafos: document.querySelectorAll('#aula-detalhe .aula-paragrafo').length,
    ouvir: document.querySelectorAll('#aula-detalhe .aula-ouvir-btn').length,
    texto: document.querySelector('#aula-detalhe').textContent.length
  }));
  ok(detalhe.paragrafos >= 3, 'a lição aberta mostra o texto (' + detalhe.paragrafos + ' parágrafos)');
  ok(detalhe.ouvir >= 1, 'e os exemplos para ouvir (' + detalhe.ouvir + ' botões)');
  ok(detalhe.texto > 500, 'com conteúdo de verdade (' + detalhe.texto + ' caracteres)');

  // 4) o botão de ouvir toca mesmo: conta as notas agendadas no Web Audio
  await page.evaluate(() => {
    window.__notas = 0;
    const orig = window.IL.audio.playEvents;
    window.IL.audio.playEvents = function (ev) { window.__notas = ev.length; return orig.apply(this, arguments); };
  });
  await page.click('#aula-detalhe .aula-ouvir-btn');
  await page.waitForTimeout(500);
  const tocou = await page.evaluate(() => window.__notas);
  ok(tocou >= 2, 'clicar no exemplo manda as notas para o áudio (' + tocou + ' notas)');
  const aceso = await page.$$eval('#aula-detalhe .aula-ouvir-btn.playing', (b) => b.length);
  ok(aceso === 1, 'e o botão fica aceso enquanto toca');

  // 5) trocar de lição redesenha o detalhe
  await page.click('#lista-aulas .aula-item:nth-of-type(3)');
  await page.waitForTimeout(300);
  const titulo2 = await page.$eval('#aula-detalhe .aula-detalhe-titulo', (h) => h.textContent);
  ok(titulo2 && !/o que é uma nota/i.test(titulo2), 'clicar em outra lição troca o conteúdo ("' + titulo2 + '")');

  // 6) a trilha do zero encosta nas antigas sem degrau: ela fecha na escrita
  // musical, mas campo harmônico e funções/ii-V-I já foram dados antes, que é
  // justamente por onde a primeira lição antiga abre.
  const titulos = await page.$$eval('#lista-aulas .aula-item .aula-titulo', (t) => t.map((x) => x.textContent));
  const zero = titulos.slice(0, 18).join(' | ');
  ok(/Campo harm/i.test(zero), 'a trilha do zero ensina campo harmônico antes das antigas');
  ok(/ii.?V.?I|Fun[cç]/i.test(zero), 'a trilha do zero ensina funções e ii–V–I antes das antigas');
  ok(/Campo harm/i.test(titulos[18] || ''), 'a 19ª é a primeira antiga, campo harmônico e funções ("' + titulos[18] + '")');

  // 7) no telefone
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const cel = await page.evaluate(() => {
    const r = document.querySelector('.aulas-grid').getBoundingClientRect();
    return Math.max(0, Math.round(r.right - window.innerWidth));
  });
  ok(cel <= 0, 'CELULAR: a tela cabe no telefone' + (cel > 0 ? ' (estoura ' + cel + 'px)' : ''));

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nTeoria ok.');
  process.exit(falhas ? 1 : 0);
})();
