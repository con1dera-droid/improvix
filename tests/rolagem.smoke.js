/**
 * "Tem mais para o lado": os avisos de rolagem.
 *
 * Partitura, tablatura, braço e tabela larga rolam na horizontal, e no Mac e
 * no celular a barra fica invisível até alguém rolar — então a pessoa olha um
 * compasso cortado e conclui que o exercício acaba ali. A pedido do dono, o
 * aviso ficou explícito. Este teste confere as duas metades da regra:
 *
 *   - quando a caixa TRANSBORDA, aparecem seta, etiqueta e barra visível;
 *   - quando ela CABE, não aparece nada — aviso em coisa que já cabe é ruído,
 *     e ruído a pessoa aprende a ignorar.
 *
 *   node tests/rolagem.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

const estado = () => ({
  envelopes: document.querySelectorAll('.rolavel').length,
  ativos: document.querySelectorAll('.rolavel-ativo').length,
  setas: Array.from(document.querySelectorAll('.rolavel-ativo .rolavel-seta'))
    .filter((b) => getComputedStyle(b).display !== 'none').length,
  etiqueta: Array.from(document.querySelectorAll('.rolavel-aviso'))
    .filter((e) => getComputedStyle(e).display !== 'none').length,
  cabe: (function () {
    const c = document.querySelector('#tre-conteudo .lib-card-body');
    return c ? c.scrollWidth - c.clientWidth <= 6 : null;
  })()
});

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1340, height: 950 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.selectOption('#tre-instrumento', 'guitarra');
  await page.waitForTimeout(1200);

  // ---------- tela larga: a tablatura cabe, então nada de aviso ----------
  const largo = await page.evaluate(estado);
  ok(largo.envelopes >= 1, 'as caixas que rolam foram preparadas (' + largo.envelopes + ')');
  ok(largo.cabe === true, 'na tela larga, a tablatura cabe inteira');
  ok(largo.ativos === 0, 'e por isso NÃO aparece aviso nenhum (' + largo.ativos + ' ativos)');
  ok(largo.etiqueta === 0, 'nem a etiqueta "tem mais para o lado"');

  // ---------- celular: a mesma tablatura transborda ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const estreito = await page.evaluate(estado);
  ok(estreito.cabe === false, 'no celular, a mesma tablatura transborda');
  ok(estreito.ativos >= 1, 'e aí o aviso acende (' + estreito.ativos + ' caixa(s))');
  ok(estreito.setas >= 2, 'com as setas ‹ › à mostra (' + estreito.setas + ')');
  ok(estreito.etiqueta >= 1, 'e a etiqueta "tem mais para o lado"');

  // a etiqueta fica ACIMA da caixa, não por cima do conteúdo
  const posicao = await page.evaluate(() => {
    const et = document.querySelector('.rolavel-ativo .rolavel-aviso');
    const cx = document.querySelector('.rolavel-ativo > *:first-child');
    if (!et || !cx) return null;
    return { etiqueta: Math.round(et.getBoundingClientRect().bottom), caixa: Math.round(cx.getBoundingClientRect().top) };
  });
  ok(posicao && posicao.etiqueta <= posicao.caixa + 2,
    'a etiqueta fica acima da caixa, sem tapar a tablatura');

  // a barra de rolagem é visível (altura reservada no CSS)
  const barra = await page.evaluate(() => {
    const cx = document.querySelector('.rolavel-ativo > *:first-child');
    return cx ? getComputedStyle(cx).scrollbarColor : '';
  });
  ok(!!barra && barra !== 'auto', 'a barra de rolagem tem cor própria, em vez de sumir (' + barra + ')');

  // ---------- a seta anda de verdade ----------
  const antes = await page.evaluate(() => document.querySelector('.rolavel-ativo > *:first-child').scrollLeft);
  await page.click('.rolavel-ativo .rolavel-dir');
  await page.waitForTimeout(700);
  const depois = await page.evaluate(() => document.querySelector('.rolavel-ativo > *:first-child').scrollLeft);
  ok(depois > antes, 'clicar na seta › rola o conteúdo (' + antes + ' → ' + depois + ')');

  const rolou = await page.evaluate(estado);
  ok(rolou.etiqueta === 0, 'e a etiqueta some depois que a pessoa rolou: já cumpriu o papel');

  // ---------- voltando para a tela larga, o aviso se apaga sozinho ----------
  await page.setViewportSize({ width: 1340, height: 950 });
  await page.waitForTimeout(900);
  const devolta = await page.evaluate(estado);
  ok(devolta.ativos === 0, 'alargando a janela, o aviso se apaga sozinho');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nRolagem ok.');
  process.exit(falhas ? 1 : 0);
})();
