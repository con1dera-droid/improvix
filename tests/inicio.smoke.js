/**
 * Smoke test da tela de INÍCIO (treino de escalas).
 *
 * É a primeira tela do site: tom + escala + instrumento → os 21 exercícios
 * do método, em duas oitavas, com áudio. Aqui se confere que ela abre
 * sozinha, que os três seletores redesenham os exercícios, que o áudio toca
 * e que os dois atalhos levam para onde prometem.
 *
 *   node tests/inicio.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

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

  await prepararSemLogin(page);
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // --- abre sozinha, já com os exercícios ---
  const vista = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  ok(vista === 'inicio', 'o site abre no Início (veio "' + vista + '")');
  ok((await page.$$eval('#tre-conteudo .esc-ex', (e) => e.length)) === 21,
    'os 21 exercícios já estão na tela, sem precisar clicar em nada');

  // --- as cinco escalas ---
  const escalas = await page.$$eval('#tre-escala option', (o) => o.map((x) => ({ v: x.value, t: x.textContent })));
  ok(escalas.length === 5, 'o seletor tem as 5 escalas (' + escalas.length + ')');
  ok(escalas.map((e) => e.v).join(',') === 'jonio,eolio,pentatonica_maior,blues_maior,blues_menor',
    'na ordem pedida: ' + escalas.map((e) => e.t).join(' · '));

  // --- escala maior: o desenho 1-2-3-5-7-8-9 ---
  // Pedido do dono (24/10/2026): este exercício é curto de propósito — uma
  // oitava e a 9ª, para ser tocado em cima de cada acorde do campo harmônico.
  const titulo1 = await page.$eval('#tre-conteudo .lib-card-title', (e) => e.textContent);
  ok(/1-2-3-5-7-8-9/.test(titulo1), 'na maior, o 1º exercício é o 1-2-3-5-7-8-9 (' + titulo1 + ')');
  const notas1 = await page.$eval('#tre-conteudo .esc-notas', (e) =>
    Array.from(e.querySelectorAll('.esc-nota')).map((n) => n.textContent).join(' '));
  ok(notas1 === 'C D E G B C D C B G E D C',
    'e sai nota a nota como o método pede: ' + notas1);
  const sug = await page.$eval('#tre-conteudo .esc-ex-sugestao', (e) => e.textContent).catch(() => '');
  ok(/campo harmônico/.test(sug), 'e a sugestão aparece em destaque no cartão (' + sug + ')');

  // --- duas oitavas em todos ---
  // Desde 24/10/2026 a tela de Início mostra um exercício de cada vez (os
  // outros ficam trancados até a pessoa gravar), então a conferência de que
  // TODOS são longos se faz na Biblioteca de Escalas, que é consulta livre e
  // monta os mesmos 21 exercícios.
  const abertos = await page.$$eval('#tre-conteudo .esc-ex .esc-notas', (ps) => ps.map((p) => p.querySelectorAll('.esc-nota').length));
  ok(abertos.length >= 1 && abertos[0] === 13,
    'o 1º exercício tem as 13 notas do desenho pedido (' + abertos[0] + ')');
  const trancados = await page.$$eval('#tre-conteudo .esc-ex-trancado', (e) => e.length);
  ok(trancados >= 15, 'e os outros ' + trancados + ' estão trancados, esperando a gravação');

  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(900);
  const ambitos = await page.$$eval('#esc-conteudo .esc-ex .esc-notas', (ps) => ps.map((p) => p.querySelectorAll('.esc-nota').length));
  var longos = ambitos.filter(function (n) { return n >= 20; }).length;
  ok(longos >= 15, 'na Biblioteca, os exercícios ficaram longos como duas oitavas pedem (' +
    longos + ' de ' + ambitos.length + ' com 20+ notas)');
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(700);
  ok(Math.min.apply(null, ambitos) >= 9, 'e nenhum ficou curto demais (menor: ' + Math.min.apply(null, ambitos) + ' notas)');

  // --- trocar escala e tom redesenha ---
  await page.selectOption('#tre-escala', 'blues_menor');
  await page.waitForTimeout(700);
  const tituloBlues = await page.$eval('#tre-conteudo .esc-title', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  ok(/Pentablues/.test(tituloBlues), 'trocar a escala redesenha a tela (' + tituloBlues + ')');
  ok((await page.$$eval('#tre-conteudo .esc-ex', (e) => e.length)) >= 17, 'e a pentablues também traz os exercícios');

  await page.selectOption('#tre-escala', 'jonio');
  await page.selectOption('#tre-tom', 'G');
  await page.waitForTimeout(700);
  const notasG = await page.$eval('#tre-conteudo .esc-notas', (e) =>
    Array.from(e.querySelectorAll('.esc-nota')).map((n) => n.textContent).join(' '));
  ok(notasG === 'G A B D F# G A G F# D B A G', 'trocar o tom transpõe o desenho: ' + notasG);

  // --- instrumento: teclado mostra partitura, guitarra mostra tablatura ---
  ok((await page.$$eval('#tre-conteudo .esc-ex svg', (s) => s.length)) > 0, 'no teclado sai partitura');
  await page.selectOption('#tre-instrumento', 'guitarra');
  await page.waitForTimeout(900);
  ok((await page.$$eval('#tre-conteudo .esc-ex .tab-block', (t) => t.length)) > 0, 'na guitarra sai tablatura');
  const instrPrincipal = await page.$eval('#input-instrumento', (e) => e.value);
  ok(instrPrincipal === 'guitarra', 'e a escolha vale para o site inteiro (análise está em ' + instrPrincipal + ')');
  await page.selectOption('#tre-instrumento', 'teclado');
  await page.waitForTimeout(700);

  // --- áudio ---
  await page.click('#tre-conteudo .esc-ex [data-act="ouvir-ex"]');
  await page.waitForTimeout(1500);
  ok(await page.$eval('#tre-conteudo .esc-ex [data-act="ouvir-ex"]', (b) => b.classList.contains('playing')),
    'o botão Ouvir toca o exercício');
  await page.click('#tre-conteudo .esc-ex [data-act="ouvir-ex"]');
  await page.waitForTimeout(400);
  ok(!(await page.$eval('#tre-conteudo .esc-ex [data-act="ouvir-ex"]', (b) => b.classList.contains('playing'))),
    'e clicar de novo para');

  // --- atalhos ---
  await page.click('[data-act="ir-escalas"]');
  await page.waitForTimeout(900);
  const vistaEsc = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const tituloFicha = await page.$eval('.content.view:not([hidden]) .esc-title', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  ok(vistaEsc === 'biblioteca-escalas' && /em G/.test(tituloFicha),
    'o atalho "Ficha completa" abre a Biblioteca de Escalas na mesma escala e tom (' + tituloFicha + ')');

  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(700);
  await page.click('[data-act="ir-harmonia"]');
  await page.waitForTimeout(600);
  const vistaHarm = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  ok(vistaHarm === 'harmonia', 'o atalho "Analisar uma progressão" abre a Análise de Harmonia');
  const navAtivo = await page.$eval('.nav-item.active', (e) => e.getAttribute('data-nav'));
  ok(navAtivo === 'harmonia', 'e o menu marca o item certo (' + navAtivo + ')');

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nInício ok.');
  process.exit(falhas ? 1 : 0);
})();
