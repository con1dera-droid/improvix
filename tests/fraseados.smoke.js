/**
 * Smoke test dos "fraseados melhores" — roda no Chromium headless.
 *
 * Confirma:
 *  - cifra brasileira (C7M, Am7(b5), G7(b9)...) é aceita no formulário;
 *  - cada frase mostra a técnica usada e tem 8 notas;
 *  - "🎲 Outra ideia" troca a frase do compasso selecionado;
 *  - o seletor "Padrão" fixa a mesma técnica na progressão inteira;
 *  - "▶ Tocar a linha inteira" toca (e para) sem erros;
 *  - a partitura/tab continuam sendo desenhadas.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  await page.selectOption('#input-tonalidade', 'C|maior');
  await page.fill('#input-progressao', 'C7M | Am7 | Dm7(9) | G7(b9) | Em7 | A7(b13) | Dm7 | G7/4');
  await page.click('#btn-analisar');
  await page.waitForTimeout(150);
  const erroForm = await page.$eval('#form-error', (el) => el.hidden ? '' : el.textContent);
  const graus = await page.$$eval('#chord-chain .chord-pill .grau', (els) => els.map((e) => e.textContent));
  console.log('Cifra brasileira — erro no formulário:', JSON.stringify(erroForm), '| graus:', graus.join(' '));

  await page.click('.tab[data-tab="fraseados"]');
  await page.waitForTimeout(100);
  const itens = await page.$$eval('#lista-fraseados .phrase-item', (els) => els.map((e) => e.querySelector('.phrase-sub').textContent));
  console.log('Técnicas na lista:', JSON.stringify(itens));

  const chipsAntes = await page.$eval('#fraseado-notas-chips', (el) => el.textContent);
  const subtitulo = await page.$eval('#fraseado-subtitulo', (el) => el.textContent);
  console.log('Subtítulo da frase 1:', subtitulo);
  const explicAntes = await page.$eval('#fraseado-explicacao-texto', (el) => el.textContent);

  await page.click('#btn-outra-ideia');
  await page.waitForTimeout(100);
  const tituloDepois = await page.$eval('#fraseado-titulo', (el) => el.textContent);
  const explicDepois = await page.$eval('#fraseado-explicacao-texto', (el) => el.textContent);
  console.log('Após "Outra ideia" — título:', tituloDepois, '| explicação mudou:', explicAntes !== explicDepois);

  const opcoesPadrao = await page.$$eval('#input-motivo option', (els) => els.map((e) => e.value));
  console.log('Opções de padrão (intermediário):', opcoesPadrao.join(', '));
  await page.selectOption('#input-motivo', 'digital_1235');
  await page.waitForTimeout(100);
  const itensPadrao = await page.$$eval('#lista-fraseados .phrase-item', (els) => els.map((e) => e.querySelector('.phrase-sub').textContent));
  const comPadrao = itensPadrao.filter((t) => t.indexOf('Padrão 1-2-3-5') === 0).length;
  console.log('Com padrão fixo "1-2-3-5": compassos usando o padrão =', comPadrao, 'de', itensPadrao.length);

  await page.click('#lista-fraseados .phrase-item:nth-child(2)');
  await page.waitForTimeout(80);
  const tabTem = await page.$eval('#fraseado-conteudo', (el) => el.textContent.length > 20);
  await page.click('.view-btn[data-view="partitura"]');
  await page.waitForTimeout(80);
  const svgNotas = await page.$$eval('#fraseado-conteudo ellipse', (els) => els.length);
  console.log('Tab renderizada:', tabTem, '| notas na partitura:', svgNotas);

  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(700);
  const rotuloTocando = await page.$eval('#btn-tocar-linha', (el) => el.textContent);
  const compassoDestacado = await page.$$eval('#lista-fraseados .phrase-item.playing', (els) => els.length);
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(150);
  const rotuloParado = await page.$eval('#btn-tocar-linha', (el) => el.textContent);
  console.log('Linha inteira — rótulo tocando:', rotuloTocando, '| compasso destacado:', compassoDestacado, '| rótulo após parar:', rotuloParado);

  console.log('Erros de página:', JSON.stringify(errors));
  await browser.close();
})();
