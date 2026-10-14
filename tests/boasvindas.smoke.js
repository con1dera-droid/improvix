/**
 * A tela de boas-vindas: aparece UMA vez, para quem não administra.
 *
 * Roda no navegador com o Supabase falso compartilhado (tests/fake-supabase.js),
 * que reproduz as regras do banco de verdade. Confere:
 *
 *   - no primeiro acesso de um usuário comum, a tela aparece;
 *   - ela aponta o 💡 e explica que a sugestão vai para quem administra;
 *   - fechando, ela some — e não volta no acesso seguinte da mesma pessoa;
 *   - quem administra NÃO vê a tela (já tem a de Administração);
 *   - a marca é por pessoa: outra conta no mesmo navegador vê a dela;
 *   - sem ninguém dentro, a tela fica escondida;
 *   - cabe na tela de um telefone.
 *
 *   node tests/boasvindas.smoke.js
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

const visivel = (page) => page.evaluate(() => {
  const m = document.getElementById('boasvindas-modal');
  return !!(m && !m.hidden);
});

/**
 * Entrar SEM dispensar a tela de boas-vindas. O ajudante compartilhado
 * (tests/fake-supabase.js) a dispensa de propósito, para não engolir os
 * cliques dos outros testes — mas aqui ela é justamente o que se mede.
 */
async function entrarCru(page, email, criarConta) {
  const botao = await page.$('#btn-entrar');
  if (botao && await botao.isVisible()) await botao.click();
  await page.waitForTimeout(120);
  const alvo = criarConta ? 'Criar conta' : 'Entrar';
  if ((await page.$eval('#auth-submit-btn', (b) => b.textContent.trim())) !== alvo) {
    await page.click('#auth-toggle-link');
    await page.waitForTimeout(80);
  }
  await page.fill('#auth-email', email);
  await page.fill('#auth-password', 'senha123');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararPagina(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  ok(!(await visivel(page)), 'sem ninguém dentro, a tela de boas-vindas fica escondida');

  // 1) o primeiro cadastro é o administrador: abre o cadastro livre para o
  //    aluno poder entrar sem esperar, e confere que ELE não vê a tela.
  await entrar(page, ADMIN, true);
  await page.waitForTimeout(600);
  ok(!(await visivel(page)), 'quem administra NÃO vê a tela de boas-vindas');
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);
  await page.click('input[name="adm-cadastro"][value="livre"]');
  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(500);
  await sair(page);

  // 2) o aluno entra pela primeira vez
  await entrarCru(page, ALUNO, true);
  await page.waitForTimeout(700);
  ok(await visivel(page), 'no primeiro acesso do usuário comum, a tela aparece');

  const conteudo = await page.evaluate(() => {
    const m = document.getElementById('boasvindas-modal');
    return {
      texto: m.textContent,
      temIcone: !!m.querySelector('.bv-dica'),
      botao: !!document.getElementById('bv-comecar')
    };
  });
  ok(/IMPROVIX/.test(conteudo.texto), 'ela dá as boas-vindas ao IMPROVIX');
  ok(conteudo.temIcone && /💡/.test(conteudo.texto), 'mostra o ícone 💡');
  ok(/administra/i.test(conteudo.texto), 'e diz que a sugestão vai para quem administra');
  ok(conteudo.botao, 'tem um botão para começar');

  // o 💡 de verdade está no alto da tela, disponível para essa pessoa
  ok(await page.$eval('#btn-sugestao', (b) => !b.hidden), 'o 💡 citado existe mesmo no alto da tela');

  await page.click('#bv-comecar');
  await page.waitForTimeout(300);
  ok(!(await visivel(page)), 'clicando em começar, a tela some');

  // 3) a mesma pessoa, no acesso seguinte: não aparece mais
  await sair(page);
  await page.waitForTimeout(300);
  await entrarCru(page, ALUNO, false);
  await page.waitForTimeout(700);
  ok(!(await visivel(page)), 'no acesso seguinte da MESMA pessoa, não aparece de novo');

  // 4) outra pessoa no mesmo navegador tem a primeira vez dela
  await sair(page);
  await entrarCru(page, OUTRO, true);
  await page.waitForTimeout(700);
  ok(await visivel(page), 'outra conta no mesmo navegador vê a primeira vez dela');

  // 5) no telefone
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const cel = await page.evaluate(() => {
    const cx = document.querySelector('#boasvindas-modal .modal');
    const r = cx.getBoundingClientRect();
    return { estoura: Math.max(0, Math.round(r.right - window.innerWidth)) + Math.max(0, Math.round(-r.left)), largura: Math.round(r.width) };
  });
  ok(cel.estoura <= 0, 'CELULAR: a tela de boas-vindas cabe no telefone (' + cel.largura + 'px)');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nBoas-vindas ok.');
  process.exit(falhas ? 1 : 0);
})();
