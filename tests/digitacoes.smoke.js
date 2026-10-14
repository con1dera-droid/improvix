/**
 * Duas ou três digitações para a mesma tablatura.
 *
 * O mesmo exercício pode ser tocado em regiões diferentes do braço: um dó
 * está na 6ª corda casa 8 e na 5ª corda casa 3. O site passou a oferecer
 * essas opções — e este teste confere o que importa:
 *
 *   - aparecem pelo menos duas opções, e elas são REALMENTE diferentes;
 *   - trocar de opção troca a tablatura na tela;
 *   - as NOTAS não mudam: a mesma música, outra mão (é a parte que, se
 *     quebrar, estraga o exercício sem ninguém perceber);
 *   - cada opção continua honesta: soa o que está escrito, sem corda solta;
 *   - a escolha vale por exercício, e vale no Início e na Biblioteca.
 *
 *   node tests/digitacoes.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** O primeiro cartão de exercício da tela aberta: notas, tab e digitações. */
const CARTAO = () => {
  const view = document.querySelector('.content.view:not([hidden])');
  const card = view.querySelector('.esc-ex');
  if (!card) return null;
  const botoes = Array.from(card.querySelectorAll('[data-act="digitacao"]'));
  return {
    titulo: card.querySelector('.lib-card-title').textContent.trim(),
    opcoes: botoes.map((b) => b.textContent.trim()),
    ativa: botoes.findIndex((b) => b.classList.contains('active')),
    tab: card.querySelector('.tab-block').textContent,
    notas: Array.from(card.querySelectorAll('.esc-nota')).map((n) => n.textContent.trim()).join(' ')
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // --- Biblioteca de Escalas, violão ---
  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(700);
  await page.selectOption('#esc-instrumento', 'violao');
  await page.waitForTimeout(500);

  const a = await page.evaluate(CARTAO);
  ok(a && a.opcoes.length >= 2, 'o exercício oferece mais de uma digitação (' + (a ? a.opcoes.join(', ') : '—') + ')');
  ok(a && a.ativa === 0, 'a primeira (mais grave) vem escolhida');
  ok(/^6ª\/\d+$/.test(a.opcoes[0]) && /^5ª\/\d+$/.test(a.opcoes[1]),
    'as opções dizem corda e casa: ' + a.opcoes.join(' · '));

  await page.click('.content.view:not([hidden]) .esc-ex [data-act="digitacao"][data-d="1"]');
  await page.waitForTimeout(500);
  const b = await page.evaluate(CARTAO);
  ok(b && b.ativa === 1, 'clicar na segunda opção a deixa marcada');
  ok(a.tab !== b.tab, 'e a tablatura muda de verdade');
  ok(a.notas === b.notas && a.notas.length > 0, 'as NOTAS continuam as mesmas (' + a.notas.slice(0, 28) + '…)');

  // a segunda opção começa onde promete
  // A tablatura é escrita com a 1ª corda em cima: a linha de índice 0 é a 1ª
  // corda e a última é a mais grave. Quem começa a frase é a linha que tem um
  // número na primeira coluna.
  const primeiraCasa = (txt) => {
    const linhas = txt.split('\n').filter((l) => /^[eBGDAE]\|/.test(l));
    for (let i = linhas.length - 1; i >= 0; i--) {
      const corpo = linhas[i].slice(2);
      if (corpo.search(/\d/) === 0) return { corda: i + 1, casa: Number(corpo.match(/\d+/)[0]) };
    }
    return null;
  };
  const inicioA = primeiraCasa(a.tab);
  const inicioB = primeiraCasa(b.tab);
  ok(inicioA && inicioB && inicioA.corda !== inicioB.corda,
    'cada opção começa numa corda diferente (' + JSON.stringify(inicioA) + ' → ' + JSON.stringify(inicioB) + ')');
  ok(b.opcoes[1] === inicioB.corda + 'ª/' + inicioB.casa,
    'e o rótulo do botão bate com onde a tablatura começa (' + b.opcoes[1] + ')');

  // sem corda solta em nenhuma das opções
  const temSolta = (txt) => txt.split('\n').filter((l) => /^[eBGDAE]\|/.test(l))
    .some((l) => /(^|[-|])0([-|]|$)/.test(l.slice(2)));
  ok(!temSolta(a.tab) && !temSolta(b.tab), 'nenhuma das digitações usa corda solta');

  // a escolha é por exercício: o segundo cartão continua no padrão
  const segundo = await page.evaluate(() => {
    const cards = document.querySelectorAll('.content.view:not([hidden]) .esc-ex');
    const bs = Array.from(cards[1].querySelectorAll('[data-act="digitacao"]'));
    return bs.findIndex((x) => x.classList.contains('active'));
  });
  ok(segundo <= 0, 'a escolha vale só para aquele exercício (o 2º segue no padrão)');

  // --- a mesma coisa no Início ---
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(800);
  await page.selectOption('#tre-instrumento', 'violao');
  await page.waitForTimeout(600);
  const i1 = await page.evaluate(CARTAO);
  ok(i1 && i1.opcoes.length >= 2, 'INÍCIO: as digitações aparecem aqui também (' + (i1 ? i1.opcoes.join(', ') : '—') + ')');
  await page.click('.content.view:not([hidden]) .esc-ex [data-act="digitacao"][data-d="1"]');
  await page.waitForTimeout(500);
  const i2 = await page.evaluate(CARTAO);
  ok(i1.tab !== i2.tab && i1.notas === i2.notas, 'INÍCIO: troca a tablatura e mantém as notas');

  // --- o baixo também tem opções ---
  await page.selectOption('#tre-instrumento', 'baixo');
  await page.waitForTimeout(600);
  const bx = await page.evaluate(CARTAO);
  ok(bx && bx.opcoes.length >= 1, 'BAIXO: o cartão continua inteiro (' + (bx ? bx.opcoes.join(', ') || 'uma digitação só' : '—') + ')');

  // --- no teclado não existe tablatura, e nem botão de digitação ---
  await page.selectOption('#tre-instrumento', 'teclado');
  await page.waitForTimeout(600);
  const tec = await page.evaluate(() => {
    const view = document.querySelector('.content.view:not([hidden])');
    return {
      temTab: !!view.querySelector('.esc-ex .tab-block'),
      temBotao: !!view.querySelector('.esc-ex [data-act="digitacao"]')
    };
  });
  ok(!tec.temTab && !tec.temBotao, 'TECLADO: sem tablatura, sem botão de digitação (partitura, como antes)');

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nDigitações ok.');
  process.exit(falhas ? 1 : 0);
})();
