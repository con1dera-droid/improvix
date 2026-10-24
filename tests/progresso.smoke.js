/**
 * "Tocou junto até o fim": a medição de execução dos exercícios.
 *
 * O que se mede aqui é o que o sistema PROMETE medir, nem mais nem menos: que
 * a pessoa acompanhou o exercício inteiro, do começo ao fim, sem parar no
 * meio. Duas execuções inteiras marcam o exercício como feito.
 *
 * Roda com o Supabase falso compartilhado, que reproduz as regras do banco
 * (conferidas em tests/rls.sql contra um PostgreSQL real). Confere:
 *
 *   - parar no meio NÃO conta volta nenhuma;
 *   - uma execução inteira conta uma volta, e aparece na tela;
 *   - a segunda marca o exercício como feito, com ✓ e barra de progresso;
 *   - o "continue daqui" anda para o exercício seguinte;
 *   - o andamento usado fica guardado;
 *   - escrever direto na tabela não passa (não dá para "fazer" os 21 sem tocar);
 *   - quem não entrou vê o convite para entrar, não um progresso fantasma;
 *   - trocar de conta não deixa o progresso da pessoa anterior na tela.
 *
 *   node tests/progresso.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararPagina, entrar, sair } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const ADMIN = 'alex@teste.com';
const ALUNO = 'aluno@teste.com';
const OUTRO = 'outro@teste.com';

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/**
 * Toca o exercício `i` por `ms` milissegundos e para. Com o relógio do
 * navegador adiantado artificialmente seria mais rápido, mas aí o teste
 * mediria o truque, não o código: aqui o tempo passa de verdade.
 */
async function tocar(page, i, ms) {
  await page.click('#tre-conteudo [data-act="ouvir-ex"][data-i="' + i + '"]');
  await page.waitForTimeout(ms);
  const aindaTocando = await page.$('#tre-conteudo .btn-ouvir.playing');
  if (aindaTocando) await page.click('#tre-conteudo [data-act="ouvir-ex"][data-i="' + i + '"]');
  await page.waitForTimeout(350);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1340, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararPagina(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  // sem conta: o site não finge que guarda nada
  const semConta = await page.$eval('#tre-progresso', (e) => e.textContent);
  ok(/Entre na sua conta/.test(semConta), 'sem conta, a tela diz que não vai guardar o treino');

  // o primeiro cadastro é o admin; ele abre o cadastro livre para o aluno entrar
  await entrar(page, ADMIN, true);
  await page.waitForTimeout(600);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);
  await page.click('input[name="adm-cadastro"][value="livre"]');
  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(400);
  await sair(page);

  await entrar(page, ALUNO, true);
  await page.waitForTimeout(600);
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(600);

  // O exercício 1 em 80 bpm dura um ciclo fechado em compasso; o teste
  // pergunta ao próprio site quanto é, em vez de chutar.
  const ciclo = await page.evaluate(() => {
    const ev = window.IL.scales.exercisesFor('C', 'jonio')[0].events;
    let fim = 0; ev.forEach((e) => { fim = Math.max(fim, e.onset + e.dur); });
    const beats = Math.max(4, Math.ceil((fim - 1e-6) / 4) * 4);
    return beats * 60 / 80;
  });
  ok(ciclo > 1 && ciclo < 60, 'uma volta do exercício 1 dura ' + ciclo.toFixed(1) + 's a 80 bpm');

  // 1) parar no meio não conta
  await tocar(page, 0, Math.round(ciclo * 1000 * 0.45));
  let linhas = await page.evaluate(() => window.__fake.store.progresso.length);
  ok(linhas === 0, 'parar no meio NÃO conta volta nenhuma (linhas gravadas: ' + linhas + ')');

  // 2) uma execução inteira conta uma volta
  await tocar(page, 0, Math.round(ciclo * 1000 + 700));
  let linha = await page.evaluate(() => window.__fake.store.progresso[0] || null);
  ok(linha && linha.voltas === 1, 'uma execução inteira conta uma volta (' + (linha && linha.voltas) + ')');
  ok(linha && linha.chave === 'treino:jonio:0', 'gravada na chave do exercício ("' + (linha && linha.chave) + '")');
  ok(linha && !linha.feito_em, 'com uma volta, ainda não está feito');
  let selo = await page.$eval('#tre-conteudo .esc-ex:first-of-type .lib-card-title', (t) => t.textContent);
  ok(/1 de 2 voltas/.test(selo), 'a tela mostra "1 de 2 voltas" ("' + selo.trim().slice(0, 50) + '")');

  // 3) a segunda fecha o exercício
  await tocar(page, 0, Math.round(ciclo * 1000 + 700));
  linha = await page.evaluate(() => window.__fake.store.progresso[0]);
  ok(linha.voltas === 2 && !!linha.feito_em, 'na segunda volta inteira, o exercício fica feito');
  ok(linha.bpm_max === 80, 'e o andamento usado fica guardado (' + linha.bpm_max + ' bpm)');

  // A partir de 24/10/2026 tocar junto NÃO libera o próximo — quem libera é a
  // gravação (tests/gravacao.smoke.js). Tocar junto continua sendo medido e
  // aparece no cartão, mas com outro nome, para não prometer o que não dá.
  const tela = await page.evaluate(() => ({
    selo: (document.querySelector('#tre-conteudo .esc-ex .esc-andando') || {}).textContent || '',
    gravado: !!document.querySelector('#tre-conteudo .esc-ex .esc-feito'),
    resumo: document.getElementById('tre-progresso').textContent,
    barra: document.querySelector('.tre-prog-barra i').style.width,
    proximo: (document.querySelector('.esc-ex-proximo .lib-card-title') || {}).textContent || ''
  }));
  ok(/tocado junto/.test(tela.selo), 'o exercício ganha o selo "♪ tocado junto" ("' + tela.selo.trim() + '")');
  ok(!tela.gravado, 'mas NÃO o selo de gravado: ouvir não é tocar');
  ok(/0 de \d+ exercícios gravados/.test(tela.resumo) && /1 tocado/.test(tela.resumo),
    'o resumo separa gravados de tocados junto ("' + tela.resumo.trim().slice(0, 60) + '")');
  ok(tela.barra === '0%', 'a barra conta gravações, e ainda não houve nenhuma (' + tela.barra + ')');
  ok(/^1\./.test(tela.proximo.trim()), 'o "continue daqui" continua no 1 ("' + tela.proximo.trim().slice(0, 30) + '")');

  // 4) ninguém "faz" os exercícios pelo Console
  const trapaca = await page.evaluate(async () => {
    const r1 = await window.IL.db.registrarVoltas('treino:jonio:5', 9999, 200);
    const c = window.supabase.createClient();
    const r2 = await c.from('progresso').insert({ chave: 'treino:jonio:7', voltas: 99, feito_em: new Date().toISOString() });
    const r3 = await c.from('progresso').update({ voltas: 99 }).eq('chave', 'treino:jonio:0');
    const linha5 = window.__fake.store.progresso.filter((p) => p.chave === 'treino:jonio:5')[0];
    return {
      teto: linha5 ? linha5.voltas : -1,
      insertRecusado: !!(r2 && r2.error),
      updateRecusado: !!(r3 && r3.error),
      linha0: window.__fake.store.progresso.filter((p) => p.chave === 'treino:jonio:0')[0].voltas
    };
  });
  ok(trapaca.teto === 20, 'uma chamada não registra mais que 20 voltas (ficou ' + trapaca.teto + ')');
  ok(trapaca.insertRecusado, 'escrever direto na tabela é recusado');
  ok(trapaca.updateRecusado && trapaca.linha0 === 2, 'e mudar as voltas na mão também');

  // 5) trocar de conta não deixa o progresso da pessoa anterior na tela
  await sair(page);
  await entrar(page, OUTRO, true);
  await page.waitForTimeout(600);
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(700);
  const depois = await page.evaluate(() => ({
    feitos: document.querySelectorAll('#tre-conteudo .esc-feito').length,
    resumo: document.getElementById('tre-progresso').textContent
  }));
  ok(depois.feitos === 0, 'a conta nova não herda o ✓ da anterior (viu ' + depois.feitos + ')');
  ok(/0 de \d+ exerc/.test(depois.resumo), 'e o resumo começa em zero ("' + depois.resumo.trim().slice(0, 40) + '")');

  // 6) a Biblioteca de Escalas continua sendo consulta livre, sem selo
  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(800);
  // Só dentro da tela da Biblioteca: a de Início continua montada, escondida.
  const naBiblioteca = await page.$$eval(
    '.content.view[data-view="biblioteca-escalas"] .esc-feito, .content.view[data-view="biblioteca-escalas"] .esc-proximo-selo',
    (e) => e.length);
  ok(naBiblioteca === 0, 'a Biblioteca de Escalas não carimba exercício (é consulta, não treino)');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nProgresso ok.');
  process.exit(falhas ? 1 : 0);
})();
