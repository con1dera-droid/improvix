/**
 * Smoke test da tela de Administração, com o Supabase FALSO compartilhado
 * (tests/fake-supabase.js), que reproduz as mesmas regras do banco de
 * verdade (sql/schema.sql, conferidas em tests/rls.sql contra um PostgreSQL
 * real). Sem isso, este teste passaria com uma tela que quebraria em
 * produção — a interface pediria coisas que o banco recusa.
 *
 * Aqui o assunto são os PODERES do administrador sobre as contas:
 *   - quem não é admin não vê o item no menu, e forçar a tela não dá acesso;
 *   - usuário comum não se promove pela API (o trigger do banco reverte);
 *   - o admin enxerga todas as contas, com o resumo e a busca;
 *   - a própria conta do admin não tem botões (sempre sobra um admin);
 *   - bloquear guarda o motivo e o carimbo de quem/quando, derruba a pessoa
 *     na hora e mostra o motivo para ela; desbloquear devolve o acesso;
 *   - a tela cabe no telefone.
 *
 * O portão de entrada (cadastro esperando liberação, convites, modo fechado,
 * telas por pessoa) tem teste próprio: tests/acesso.smoke.js.
 *
 *   node tests/admin.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararPagina, entrar, sair } = require('./fake-supabase.js');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const ADMIN = 'alex+admin@teste.com';
const COMUM = 'comum@teste.com';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });
  page.on('dialog', (d) => d.accept('bagunça no fórum'));   // o prompt do motivo do bloqueio

  await prepararPagina(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const navVisivel = () => page.$eval('#nav-admin', (e) => !e.hidden);
  const abrirAdmin = async () => { await page.click('.nav-item[data-nav="admin"]'); await page.waitForTimeout(600); };

  // 1) o primeiro cadastro é o administrador; ele abre o cadastro livre para
  //    o resto do teste poder criar a segunda conta sem esperar liberação.
  await entrar(page, ADMIN, true);
  await page.waitForTimeout(500);
  ok(await navVisivel(), 'admin vê o item Administração no menu');
  await abrirAdmin();
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);

  // As três escolhas de "Quem pode entrar" precisam ser lidas: cada uma um
  // cartão, com a explicação embaixo do nome — e não tudo grudado numa
  // linha só, como ficava quando a classe .adm-modo não tinha estilo.
  const modos = await page.$$eval('.adm-modo', (labels) => labels.map((lab) => {
    const nome = lab.querySelector('strong').getBoundingClientRect();
    const desc = lab.querySelector('small').getBoundingClientRect();
    return { valor: lab.querySelector('input').value, abaixo: desc.top >= nome.bottom - 1, largura: lab.getBoundingClientRect().width };
  }));
  ok(modos.length === 3, 'as três escolhas de quem pode entrar aparecem');
  ok(modos.every((m) => m.abaixo), 'a explicação de cada modo fica embaixo do nome, não na mesma linha');
  ok(modos.every((m) => m.largura > 300), 'cada modo ocupa a linha inteira, como um cartão');

  await page.click('input[name="adm-cadastro"][value="livre"]');
  await page.waitForTimeout(150);
  const aceso = await page.$$eval('.adm-modo.is-on', (l) => l.map((x) => x.querySelector('input').value));
  ok(aceso.length === 1 && aceso[0] === 'livre', 'o cartão aceso acompanha a bolinha na hora do clique');

  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(500);
  await sair(page);

  // 2) usuário comum
  await entrar(page, COMUM, true);
  await page.waitForTimeout(600);
  ok(!!(await page.$('#btn-sair')), 'no cadastro livre a segunda conta entra direto');
  ok(!(await navVisivel()), 'usuário comum NÃO vê o item Administração');
  await page.evaluate(() => { window.IL.ui.switchView('admin'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.querySelector('.nav-item[data-nav="admin"]').click(); });
  await page.waitForTimeout(300);
  const textoComum = await page.$eval('#admin-conteudo', (e) => e.textContent);
  ok(/só para administradores/i.test(textoComum), 'abrir a tela na marra avisa que é só para administradores');

  // o usuário comum tentando se promover pela API (como no Console do navegador)
  const tentativa = await page.evaluate(async () => {
    const eu = window.__fake.auth.currentUser.id;
    await window.IL.db.updateProfile(eu, { papel: 'admin', aprovado: true, bloqueado: false, modulos: {} });
    const p = window.__fake.store.profiles.find((x) => x.id === eu);
    return { papel: p.papel, modulos: p.modulos };
  });
  ok(tentativa.papel === 'usuario' && !tentativa.modulos,
    'usuário comum NÃO se promove nem mexe nas próprias telas pela API (ficou ' + tentativa.papel + ')');
  await sair(page);

  // 3) o admin enxerga todas as contas
  await entrar(page, ADMIN, false);
  await page.waitForTimeout(500);
  await abrirAdmin();
  const linhas = await page.$$eval('.adm-tabela tbody tr', (r) => r.length);
  ok(linhas === 2, 'admin enxerga todas as contas (' + linhas + ' de 2)');
  const numeros = await page.$$eval('#admin-conteudo .tra-resumo .n b', (b) => b.map((x) => x.textContent));
  ok(numeros.join('/') === '2/0/1/0/2',
    'o resumo bate: ' + numeros.join('/') + ' (contas/esperando/admins/bloqueados/ativos 7 dias)');

  // --- último acesso: quem acabou de entrar aparece como recém-chegado ---
  const acessos = await page.$$eval('.adm-tabela tbody tr[data-uid] td:nth-child(3)',
    (tds) => tds.map((t) => t.textContent.trim()));
  ok(acessos.length === 2 && acessos.every((a) => /agora há pouco|há \d+ min/.test(a)),
    'a coluna de último acesso mostra quem acabou de usar: ' + JSON.stringify(acessos));
  const gravado = await page.evaluate(() => window.__fake.store.profiles.map((p) => !!p.ultimo_acesso));
  ok(gravado.every(Boolean), 'e o banco guardou a hora das duas contas');
  const naoFalsifica = await page.evaluate(async () => {
    const eu = window.__fake.auth.currentUser.id;
    await window.IL.db.updateProfile(eu, { ultimo_acesso: '2020-01-01T00:00:00.000Z' });
    return window.__fake.store.profiles.find((p) => p.id === eu).ultimo_acesso;
  });
  ok(!/2020/.test(naoFalsifica), 'ninguém reescreve a própria data de acesso pela API');

  // daqui para a frente, endereçamos a linha pelo id da conta (o e-mail é
  // o que o admin enxerga, mas a linha carrega o uid no DOM)
  const uid = (email) => page.evaluate((e) => {
    const p = window.__fake.store.profiles.find((x) => x.email === e);
    return p ? p.id : '';
  }, email);
  const linhaDe = async (email) => '.adm-tabela tbody tr[data-uid="' + (await uid(email)) + '"]';
  const LINHA = await linhaDe(COMUM);
  const MINHA = await linhaDe(ADMIN);

  // a própria conta do admin não tem botões
  const minhaLinha = await page.$eval(MINHA + ' .adm-acoes', (e) => e.textContent);
  ok(/própria conta/i.test(minhaLinha), 'a própria conta do admin não tem botões (não dá para ficar sem admin)');

  // busca
  await page.fill('#admin-busca', 'comum');
  await page.waitForTimeout(300);
  ok((await page.$$eval('.adm-tabela tbody tr', (r) => r.length)) === 1, 'a busca por e-mail filtra a lista');
  await page.fill('#admin-busca', '');
  await page.waitForTimeout(300);

  // bloquear, com motivo
  await page.click(LINHA + ' [data-adm="bloqueio"]');
  await page.waitForTimeout(500);
  const situacao = await page.$eval(LINHA + ' .adm-status-bloq, ' + LINHA + ' .adm-status-ok', (e) => e.textContent.trim());
  ok(situacao === 'bloqueado', 'admin bloqueia o usuário (situação: ' + situacao + ')');
  const carimbo = await page.evaluate((email) => {
    const p = window.__fake.store.profiles.find((x) => x.email === email);
    return { motivo: p.motivo_bloqueio, quem: !!p.bloqueado_por, quando: !!p.bloqueado_em };
  }, COMUM);
  ok(carimbo.motivo === 'bagunça no fórum' && carimbo.quem && carimbo.quando,
    'o motivo e o carimbo de quem/quando ficam registrados');
  await sair(page);

  // 4) o bloqueado tenta entrar
  await entrar(page, COMUM, false);
  await page.waitForTimeout(900);
  const aviso = await page.$eval('#auth-modal-msg', (e) => e.textContent);
  ok(!(await page.$('#btn-sair')), 'o usuário bloqueado NÃO fica logado');
  ok(!(await page.$eval('#auth-modal', (e) => e.hidden)) && /suspenso/i.test(aviso),
    'ele recebe o aviso do bloqueio: "' + aviso.slice(0, 70) + '…"');
  ok(/bagunça no fórum/.test(aviso), 'o motivo aparece para ele');

  // 5) o admin desbloqueia e o acesso volta
  await entrar(page, ADMIN, false);
  await page.waitForTimeout(500);
  await abrirAdmin();
  await page.click(LINHA + ' [data-adm="bloqueio"]');
  await page.waitForTimeout(500);
  const situacao2 = await page.$eval(LINHA + ' .adm-status-ok, ' + LINHA + ' .adm-status-bloq', (e) => e.textContent.trim());
  ok(situacao2 === 'ativo', 'admin desbloqueia (situação: ' + situacao2 + ')');
  await sair(page);
  await entrar(page, COMUM, false);
  await page.waitForTimeout(700);
  ok(!!(await page.$('#btn-sair')), 'desbloqueado consegue entrar de novo');

  // 6) excluir uma conta
  // O e-mail errado não exclui nada; o certo exclui, leva os dados junto e a
  // pessoa, se voltar, é avisada de que a conta foi removida.
  await sair(page);
  await entrar(page, ADMIN, false);
  await page.waitForTimeout(500);
  await abrirAdmin();
  await page.evaluate((email) => {
    window.__respostaPrompt = 'não é o e-mail';
    window.prompt = function () { return window.__respostaPrompt; };
    // dá um dado salvo para a conta, para ver se some junto
    window.__fake.store.analises = [{ id: 'a1', user_id: window.__fake.store.profiles.find((p) => p.email === email).id }];
  }, COMUM);
  await page.click(LINHA + ' [data-adm="excluir"]');
  await page.waitForTimeout(400);
  ok(/não é o de/i.test(await page.$eval('#admin-conteudo .tra-aviso', (x) => x.textContent)),
    'escrever o e-mail errado NÃO exclui a conta');
  ok((await page.$$eval('.adm-tabela tbody tr[data-uid]', (r) => r.length)) === 2, 'e a conta continua na lista');

  await page.evaluate((email) => { window.__respostaPrompt = email; }, COMUM);
  await page.click(LINHA + ' [data-adm="excluir"]');
  await page.waitForTimeout(600);
  ok((await page.$$eval('.adm-tabela tbody tr[data-uid]', (r) => r.length)) === 1,
    'escrevendo o e-mail certo, a conta sai da lista');
  const sobrou = await page.evaluate(() => ({
    perfis: window.__fake.store.profiles.length,
    analises: (window.__fake.store.analises || []).length
  }));
  ok(sobrou.perfis === 1 && sobrou.analises === 0,
    'e os dados dela vão junto, sem sobrar órfão (perfis: ' + sobrou.perfis + ', análises: ' + sobrou.analises + ')');
  ok(/foi excluída/i.test(await page.$eval('#admin-conteudo .tra-aviso', (x) => x.textContent)),
    'o admin vê a confirmação do que aconteceu');

  // quem foi excluído e tenta voltar recebe o aviso, não uma tela muda
  await sair(page);
  await entrar(page, COMUM, false);
  await page.waitForTimeout(2600);
  const avisoRemovida = await page.$eval('#auth-modal-msg', (e) => e.textContent);
  ok(!(await page.$('#btn-sair')), 'quem foi excluído NÃO entra');
  ok(/removida/i.test(avisoRemovida), 'e vê o motivo: "' + avisoRemovida.slice(0, 60) + '…"');

  await entrar(page, ADMIN, false);
  await page.waitForTimeout(500);

  // 7) a tela de administração num celular
  await sair(page);
  await entrar(page, ADMIN, false);
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.click('#btn-menu');
  await page.waitForTimeout(300);
  await abrirAdmin();
  const cel = await page.evaluate(() => ({
    estoura: document.documentElement.scrollWidth - 390,
    tabelaRola: (function () {
      // a caixa precisa poder rolar; se a tabela couber, melhor ainda
      const w = document.querySelector('.adm-tabela-wrap');
      if (!w) return false;
      const ov = getComputedStyle(w).overflowX;
      return (ov === 'auto' || ov === 'scroll') && w.clientWidth <= 390;
    })(),
    linhas: document.querySelectorAll('.adm-tabela tbody tr').length
  }));
  ok(cel.estoura <= 0, 'CELULAR: a tela de administração cabe na tela do telefone' +
    (cel.estoura > 0 ? ' (estoura ' + cel.estoura + 'px)' : ''));
  ok(cel.tabelaRola, 'CELULAR: a tabela de contas rola dentro da própria caixa');
  ok(cel.linhas >= 1, 'CELULAR: as contas continuam listadas (' + cel.linhas + ')');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nAdministração ok.');
  process.exit(falhas ? 1 : 0);
})();
