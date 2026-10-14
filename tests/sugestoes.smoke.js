/**
 * A caixa de ideias: quem usa manda, quem administra lê.
 *
 * Roda no navegador com o Supabase falso compartilhado, que reproduz as
 * regras do banco (conferidas em tests/rls.sql contra um PostgreSQL real).
 * Confere o caminho inteiro:
 *
 *   - sem conta liberada, o 💡 não aparece (ícone que não funciona é pior
 *     que ícone nenhum);
 *   - quem está dentro escreve e manda, e recebe a confirmação;
 *   - quem assina é o banco: o e-mail do autor não vem do formulário;
 *   - o admin vê a sugestão na aba Sugestões, com a bolinha de não lidas;
 *   - marcar como lida tira do contador; apagar some da lista;
 *   - um usuário comum não enxerga a sugestão de outro.
 *
 *   node tests/sugestoes.smoke.js
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

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararPagina(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // sem conta, o ícone não existe
  ok(await page.$eval('#btn-sugestao', (b) => b.hidden), 'sem conta, o 💡 fica escondido');

  // o primeiro cadastro é o admin; ele abre o cadastro livre
  await entrar(page, ADMIN, true);
  await page.waitForTimeout(500);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);
  await page.click('input[name="adm-cadastro"][value="livre"]');
  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(400);
  await sair(page);

  // --- o aluno manda uma sugestão ---
  await entrar(page, ALUNO, true);
  await page.waitForTimeout(600);
  ok(!(await page.$eval('#btn-sugestao', (b) => b.hidden)), 'entrou: o 💡 aparece no alto da tela');
  await page.click('#btn-sugestao');
  await page.waitForTimeout(300);
  ok(!(await page.$eval('#sugestao-modal', (m) => m.hidden)), 'o 💡 abre a caixa de ideias');

  await page.fill('#sugestao-texto', 'Seria bom um metrônomo que pisca junto com o som.');
  // mente no formulário: manda e-mail e autor de outra pessoa junto
  await page.evaluate(() => {
    const envio = window.IL.db.enviarSugestao;
    window.IL.db.enviarSugestao = function (t) {
      return window.__fake.from('sugestoes').insert({ texto: t, email: 'mentira@teste.com', user_id: 'u0' }).select().single();
    };
    window.__restaura = envio;
  });
  await page.click('#sugestao-enviar');
  await page.waitForTimeout(600);
  const confirmacao = await page.$eval('#sugestao-msg', (m) => m.textContent);
  ok(/chegou/i.test(confirmacao), 'e a pessoa vê que chegou ("' + confirmacao.slice(0, 40) + '…")');

  const guardado = await page.evaluate(() => window.__fake.store.sugestoes.map((g) => ({ email: g.email, lida: g.lida, texto: g.texto })));
  ok(guardado.length === 1 && guardado[0].email === ALUNO,
    'quem assina é o banco: ficou ' + JSON.stringify(guardado[0] && guardado[0].email) + ', não o que o formulário mandou');
  ok(guardado[0] && guardado[0].lida === false, 'e nasce como não lida');

  // --- outro aluno não enxerga a sugestão alheia ---
  await sair(page);
  await entrar(page, OUTRO, true);
  await page.waitForTimeout(600);
  const viuDoOutro = await page.evaluate(async () => {
    const r = await window.IL.db.listSugestoes();
    return (r.data || []).length;
  });
  ok(viuDoOutro === 0, 'outro aluno NÃO enxerga a sugestão alheia (viu ' + viuDoOutro + ')');

  // --- o admin lê ---
  await sair(page);
  await entrar(page, ADMIN, false);
  await page.waitForTimeout(800);
  const bolinha = await page.$eval('#sugestao-conta', (c) => ({ escondida: c.hidden, txt: c.textContent }));
  ok(!bolinha.escondida && bolinha.txt === '1', 'o admin vê a bolinha de não lidas no 💡 (' + bolinha.txt + ')');

  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(700);
  const aba = await page.$eval('[data-adm="aba"][data-v="sugestoes"]', (b) => b.textContent);
  ok(/\(1\)/.test(aba), 'e a aba mostra quantas faltam ler ("' + aba.trim() + '")');

  await page.click('[data-adm="aba"][data-v="sugestoes"]');
  await page.waitForTimeout(400);
  const item = await page.$eval('.sug-item', (d) => d.textContent.replace(/\s+/g, ' ').trim());
  ok(/metrônomo que pisca/.test(item), 'a sugestão aparece inteira para o admin');
  ok(/aluno@teste\.com/.test(item), 'com o e-mail de quem mandou');

  await page.click('[data-adm="sug-lida"]');
  await page.waitForTimeout(500);
  const depoisDeLer = await page.evaluate(() => ({
    bolinha: document.getElementById('sugestao-conta').hidden,
    aba: document.querySelector('[data-adm="aba"][data-v="sugestoes"]').textContent,
    lida: window.__fake.store.sugestoes[0].lida
  }));
  ok(depoisDeLer.lida === true, 'marcar como lida grava no banco');
  ok(depoisDeLer.bolinha, 'e a bolinha some');
  ok(!/\(/.test(depoisDeLer.aba), 'e a aba volta a ser só "Sugestões" ("' + depoisDeLer.aba.trim() + '")');

  await page.click('[data-adm="sug-apagar"]');
  await page.waitForTimeout(500);
  const sobrou = await page.evaluate(() => window.__fake.store.sugestoes.length);
  ok(sobrou === 0, 'apagar tira a sugestão da lista (sobraram ' + sobrou + ')');
  ok(/Ninguém mandou sugestão ainda/.test(await page.$eval('#admin-conteudo', (e) => e.textContent)),
    'e a aba explica o que fazer quando está vazia');

  // --- no celular o ícone continua lá ---
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const cel = await page.$eval('#btn-sugestao', (b) => {
    const r = b.getBoundingClientRect();
    return { visivel: !b.hidden && r.width > 0, largura: Math.round(r.width) };
  });
  ok(cel.visivel, 'CELULAR: o 💡 continua à mão (' + cel.largura + 'px)');

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nSugestões ok.');
  process.exit(falhas ? 1 : 0);
})();
