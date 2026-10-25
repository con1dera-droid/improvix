/**
 * Smoke test do SISTEMA FECHADO: ninguém usa o IMPROVIX sem conta aprovada.
 *
 * Roda no navegador de verdade, com um Supabase falso que reproduz as regras
 * do banco (tests/fake-supabase.js). Confere:
 *
 *   - sem sessão, o site não aparece: só a tela de entrada;
 *   - o primeiro cadastro vira administrador e entra direto;
 *   - cadastro novo fica esperando liberação — e vê isso escrito;
 *   - o admin libera, e a pessoa entra;
 *   - o admin desliga uma tela e ela some do menu daquela pessoa;
 *   - o recado da tela de entrada aparece para quem ainda não entrou;
 *   - no modo "fechado" não existe botão de criar conta, mas quem foi
 *     convidado entra já liberado;
 *   - bloquear derruba na hora.
 *
 *   node tests/acesso.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararPagina, entrar, sair } = require('./fake-supabase.js');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

const URL = 'file://' + path.resolve(__dirname, '../index.html');

async function estado(page) {
  return page.evaluate(() => ({
    travado: document.body.classList.contains('sistema-travado'),
    appVisivel: getComputedStyle(document.querySelector('.app')).display !== 'none',
    entrada: !document.getElementById('auth-modal').hidden,
    titulo: document.getElementById('auth-modal-title').textContent,
    aviso: (document.getElementById('auth-estado-txt') || {}).textContent || '',
    msgTopo: (document.getElementById('auth-modal-msg') || {}).textContent || '',
    recado: document.getElementById('auth-mensagem').hidden ? '' : document.getElementById('auth-mensagem').textContent,
    temCriarConta: !document.getElementById('auth-toggle-link').parentNode.hidden,
    menu: Array.from(document.querySelectorAll('.nav-item:not([hidden])')).map((n) => n.getAttribute('data-nav'))
  }));
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });
  page.on('dialog', (d) => d.accept('bagunça'));

  await prepararPagina(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  // 1) visitante não vê o site
  let e = await estado(page);
  ok(e.travado && !e.appVisivel, 'sem conta, o site não aparece — só a tela de entrada');
  ok(e.entrada && e.titulo === 'Entrar', 'a tela de entrada está aberta e não dá para fechar');
  ok((await page.$('#auth-modal-close')) !== null &&
    !(await page.$eval('#auth-modal-close', (b) => getComputedStyle(b).display !== 'none')),
  'o ✕ de fechar some no sistema fechado');

  // 2) o primeiro cadastro vira administrador
  await entrar(page, 'alex@teste.com', true);
  await page.waitForTimeout(500);
  e = await estado(page);
  ok(!e.travado && e.appVisivel, 'o primeiro cadastro entra direto (vira o administrador)');
  ok(e.menu.indexOf('admin') >= 0, 'e o menu de Administração aparece para ele');
  const somDoAdmin = await page.evaluate(() => ['som-modo', 'som-ambiencia']
    .map((i) => document.getElementById(i).hidden));
  ok(somDoAdmin.every((h) => h === false), 'o administrador vê os dois seletores de som do topo');
  const papel = await page.$eval('.user-plan', (x) => x.textContent);
  ok(/Administrador/.test(papel), 'o cabeçalho mostra o papel (' + papel + ')');

  // 3) o admin escreve o recado da tela de entrada e fecha uma tela
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);
  await page.fill('#adm-mensagem', 'Aula na quinta, 19h.');
  await page.click('[data-tela="transcricao"][data-prefixo="g"]');       // desliga para todos
  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(500);
  ok(/salva/i.test(await page.$eval('#admin-conteudo .tra-aviso', (x) => x.textContent)), 'o admin salva a configuração');

  await sair(page);
  await page.waitForTimeout(400);
  e = await estado(page);
  ok(e.recado === 'Aula na quinta, 19h.', 'o recado do admin aparece na tela de entrada ("' + e.recado + '")');

  // 4) um cadastro comum fica esperando
  await entrar(page, 'aluno@teste.com', true);
  await page.waitForTimeout(600);
  e = await estado(page);
  ok(e.travado && !e.appVisivel, 'quem acabou de se cadastrar NÃO entra');
  ok(/esperando a libera/i.test(e.aviso), 'e vê escrito que está esperando a liberação');
  ok(e.titulo === 'Quase lá', 'com o título certo na tela (' + e.titulo + ')');

  // 5) o admin libera
  await sair(page);
  await entrar(page, 'alex@teste.com', false);
  await page.waitForTimeout(500);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(600);
  const esperando = await page.$$eval('.adm-status-espera', (n) => n.length);
  ok(esperando === 1, 'a Administração mostra quem está esperando (' + esperando + ')');
  await page.click('[data-adm="aprovar"]');
  await page.waitForTimeout(500);
  ok(/liberado/i.test(await page.$eval('#admin-conteudo .tra-aviso', (x) => x.textContent)), 'o admin libera o acesso');

  await sair(page);
  await entrar(page, 'aluno@teste.com', false);
  await page.waitForTimeout(600);
  e = await estado(page);
  ok(!e.travado && e.appVisivel, 'liberado, o aluno entra');
  ok(e.menu.indexOf('admin') < 0, 'e não vê a Administração');
  ok(e.menu.indexOf('transcricao') < 0, 'a tela que o admin desligou não aparece para ele');
  ok(e.menu.indexOf('inicio') >= 0 && e.menu.indexOf('config') >= 0, 'Início e Configurações nunca somem');

  // Os seletores de som do topo são afinação do sistema, não de uso diário:
  // desde 25/10/2026 só quem administra os vê, e todo mundo ouve o padrão.
  const somDoAluno = await page.evaluate(() => ['som-modo', 'som-ambiencia']
    .map((i) => { const x = document.getElementById(i); return { oculto: x.hidden, valor: x.value }; }));
  ok(somDoAluno.every((x) => x.oculto), 'o aluno não vê os seletores de som do topo');
  ok(somDoAluno[0].valor === 'real' && somDoAluno[1].valor === 'seco',
    'e ouve o padrão: som realista, sem sala (' + somDoAluno.map((x) => x.valor).join(' / ') + ')');

  // 6) uma tela só para esta pessoa
  await sair(page);
  await entrar(page, 'alex@teste.com', false);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(600);
  const linhaAluno = '.adm-tabela tbody tr[data-uid]:not(:first-child)';
  await page.click('[data-adm="telas"]');
  await page.waitForTimeout(300);
  await page.click('.adm-editor [data-tela="padroes"][data-prefixo="u"]');   // desliga só para ele
  await page.click('[data-adm="salvar-telas"]');
  await page.waitForTimeout(500);
  await sair(page);
  await entrar(page, 'aluno@teste.com', false);
  await page.waitForTimeout(600);
  e = await estado(page);
  ok(e.menu.indexOf('padroes') < 0, 'o admin fecha uma tela só para uma pessoa');

  // 7) bloquear derruba
  await sair(page);
  await entrar(page, 'alex@teste.com', false);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(600);
  await page.click('[data-adm="bloqueio"]');
  await page.waitForTimeout(500);
  await sair(page);
  await entrar(page, 'aluno@teste.com', false);
  await page.waitForTimeout(800);
  e = await estado(page);
  ok(e.travado && !e.appVisivel, 'quem foi bloqueado não entra');
  ok(/suspenso/i.test(e.msgTopo), 'e vê o aviso do bloqueio ("' + e.msgTopo.slice(0, 60) + '…")');

  // 8) modo fechado + convite
  await entrar(page, 'alex@teste.com', false);
  await page.waitForTimeout(500);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);
  await page.click('input[name="adm-cadastro"][value="fechado"]');
  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(400);
  await page.fill('#adm-convite', 'convidado@teste.com');
  await page.click('[data-adm="convidar"]');
  await page.waitForTimeout(500);
  ok(/convidado/i.test(await page.$eval('#admin-conteudo .tra-aviso', (x) => x.textContent)), 'o admin convida pelo e-mail');

  await sair(page);
  await page.waitForTimeout(400);
  e = await estado(page);
  ok(!e.temCriarConta, 'no modo fechado some o botão de criar conta');

  await page.evaluate(() => { document.getElementById('auth-toggle-link').click(); });
  await page.fill('#auth-email', 'convidado@teste.com');
  await page.fill('#auth-password', 'senha123');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(900);
  e = await estado(page);
  ok(!e.travado && e.appVisivel, 'quem foi convidado entra já liberado, sem esperar');

  // 9) o e-mail de senha nova
  await sair(page);
  await entrar(page, 'alex@teste.com', false);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(600);
  await page.click('[data-adm="senha"]');
  await page.waitForTimeout(500);
  const enviados = await page.evaluate(() => window.__fake.emailsEnviados);
  ok(enviados.length === 1, 'o admin manda o e-mail de senha nova (sem nunca ver a senha de ninguém)');

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nAcesso ok.');
  process.exit(falhas ? 1 : 0);
})();
