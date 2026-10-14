/**
 * Os botões de OUVIR: azul claro parados, vermelhos tocando.
 *
 * Num site cheio de botões cinzas, o que faz som tem de saltar à vista — e o
 * que está tocando ainda mais, porque é nele que se clica para parar. Este
 * teste varre as telas, acha TODO botão que faz som (pelo rótulo: 🔊, 🎧 ou
 * "▶ Tocar") e confere, com a cor que o navegador realmente calculou:
 *
 *   - parado: azul claro, com letra escura;
 *   - tocando: vermelho, com letra branca;
 *   - e que nenhum botão de som ficou de fora (sem a classe .btn-ouvir).
 *
 * A cor é lida do navegador, não do arquivo CSS: é assim que se pega uma
 * regra que existe mas foi sobrescrita por outra mais específica.
 *
 *   node tests/ouvir.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const AZUL = 'rgb(125, 211, 252)';     // --ouvir
const VERMELHO = 'rgb(220, 38, 38)';   // --parar

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Todo botão visível que faz som, com a cor que o navegador calculou. */
const BOTOES = () => {
  const faz = (t) => /🔊|🎧|▶\s*Tocar/.test(t);
  return Array.from(document.querySelectorAll('.content.view:not([hidden]) button'))
    .filter((b) => b.offsetParent !== null && faz(b.textContent))
    .map((b) => ({
      texto: b.textContent.replace(/\s+/g, ' ').trim().slice(0, 34),
      classe: b.className,
      temClasse: b.classList.contains('btn-ouvir'),
      fundo: getComputedStyle(b).backgroundColor,
      letra: getComputedStyle(b).color,
      tocando: b.classList.contains('playing')
    }));
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // --- 1) as telas que têm botão de ouvir, uma a uma ---
  const TELAS = [
    ['inicio', 'Início'],
    ['padroes', 'Exercícios de Padrões'],
    ['biblioteca-escalas', 'Biblioteca de Escalas'],
    ['biblioteca-fraseados', 'Biblioteca de Fraseados'],
    ['acordes', 'Biblioteca de Acordes'],
    ['harmonia', 'Análise de Harmonia']
  ];
  let total = 0;
  for (const [nav, nome] of TELAS) {
    await page.click('.nav-item[data-nav="' + nav + '"]');
    await page.waitForTimeout(700);
    if (nav === 'harmonia') {
      await page.click('#btn-analisar');
      await page.waitForTimeout(800);
      // a aba Fraseados é onde moram o "🔊 Áudio" e o "▶ Tocar a linha inteira"
      await page.click('.tab[data-tab="fraseados"]');
      await page.waitForTimeout(500);
    }
    if (nav === 'acordes') {
      const campo = await page.$('#acd-cifra');
      if (campo) { await campo.fill('C7M'); await page.keyboard.press('Enter'); await page.waitForTimeout(700); }
    }
    const bs = await page.evaluate(BOTOES);
    total += bs.length;
    const semClasse = bs.filter((b) => !b.temClasse);
    const corErrada = bs.filter((b) => b.temClasse && !b.tocando && b.fundo !== AZUL);
    ok(bs.length > 0, nome + ': achou ' + bs.length + ' botão(ões) de som');
    ok(semClasse.length === 0, nome + ': todos marcados como botão de ouvir' +
      (semClasse.length ? ' — faltou em: ' + semClasse.map((b) => '"' + b.texto + '"').join(', ') : ''));
    ok(corErrada.length === 0, nome + ': todos azul claro parados' +
      (corErrada.length ? ' — "' + corErrada[0].texto + '" está ' + corErrada[0].fundo : ''));
  }
  ok(total >= 10, 'no total, ' + total + ' botões de som conferidos nas ' + TELAS.length + ' telas');

  // --- 2) apertar deixa vermelho, e soltar volta ao azul ---
  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(800);
  const antes = await page.evaluate(() => {
    const b = document.querySelector('#esc-conteudo [data-act="ouvir-ex"]');
    return { fundo: getComputedStyle(b).backgroundColor, letra: getComputedStyle(b).color, txt: b.textContent.trim() };
  });
  ok(antes.fundo === AZUL, 'parado, o botão de ouvir é azul claro (' + antes.fundo + ')');
  ok(antes.letra !== 'rgb(255, 255, 255)', 'com letra escura, que se lê no azul (' + antes.letra + ')');

  await page.click('#esc-conteudo [data-act="ouvir-ex"]');
  await page.waitForTimeout(900);
  const tocando = await page.evaluate(() => {
    const b = document.querySelector('#esc-conteudo [data-act="ouvir-ex"]');
    return {
      fundo: getComputedStyle(b).backgroundColor, letra: getComputedStyle(b).color,
      txt: b.textContent.trim(), playing: b.classList.contains('playing')
    };
  });
  ok(tocando.playing, 'ao apertar, o botão entra em modo "tocando"');
  ok(tocando.fundo === VERMELHO, 'e fica vermelho (' + tocando.fundo + ')');
  ok(tocando.letra === 'rgb(255, 255, 255)', 'com letra branca (' + tocando.letra + ')');
  ok(/parar/i.test(tocando.txt), 'e diz o que o clique faz agora: "' + tocando.txt + '"');

  await page.click('#esc-conteudo [data-act="ouvir-ex"]');
  await page.waitForTimeout(300);
  // tira o mouse de cima: parado E sob o cursor a cor é a de hover, e aqui o
  // que interessa é a cor de quem está só olhando a tela.
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
  const depois = await page.evaluate(() => {
    const b = document.querySelector('#esc-conteudo [data-act="ouvir-ex"]');
    return { fundo: getComputedStyle(b).backgroundColor, txt: b.textContent.trim() };
  });
  ok(depois.fundo === AZUL, 'parando, volta ao azul claro (' + depois.fundo + ')');
  ok(/ouvir/i.test(depois.txt), 'e volta a dizer "Ouvir" ("' + depois.txt + '")');

  // --- 3) no celular continua igual ---
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const cel = await page.evaluate(() => {
    const b = document.querySelector('#esc-conteudo [data-act="ouvir-ex"]');
    return { fundo: getComputedStyle(b).backgroundColor, largura: b.getBoundingClientRect().width };
  });
  ok(cel.fundo === AZUL, 'CELULAR: o botão continua azul claro (' + cel.fundo + ')');
  ok(cel.largura >= 70, 'CELULAR: e continua do tamanho de um dedo (' + Math.round(cel.largura) + 'px)');

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nBotões de ouvir ok.');
  process.exit(falhas ? 1 : 0);
})();
