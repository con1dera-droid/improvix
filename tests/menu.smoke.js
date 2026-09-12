/**
 * Smoke test do MENU: confere a ordem dos itens, que cada um abre a tela
 * certa, que "Meus Exercícios" reúne as três listas em abas e que o estilo
 * Fusion continua disponível mesmo sem o item de menu.
 * node tests/menu.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

const ESPERADO = [
  ['inicio', '🏠 Início'],
  ['biblioteca-escalas', '📚 Biblioteca de Escalas'],
  ['biblioteca-fraseados', '🎼 Biblioteca de Fraseados'],
  ['padroes', '📘 Exercícios de Padrões'],
  ['laboratorio', '🧪 Laboratório'],
  ['meus-exercicios', '📋 Meus Exercícios'],
  ['config', '⚙ Configurações']
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  let failed = false;
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });

  function check(ok, msg) { if (!ok) { failed = true; console.log('FALHA ' + msg); } else console.log('ok    ' + msg); }

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const itens = await page.$$eval('.nav .nav-item', (a) => a.map((x) => ({
    nav: x.getAttribute('data-nav'), txt: x.textContent.trim()
  })));
  check(itens.length === ESPERADO.length, 'o menu tem ' + itens.length + ' itens (esperado ' + ESPERADO.length + ')');
  ESPERADO.forEach((e, i) => {
    const at = itens[i] || {};
    check(at.nav === e[0] && (at.txt || '').indexOf(e[1]) === 0,
      (i + 1) + 'º item é "' + e[1] + '"' + (at.nav === e[0] ? '' : ' — veio "' + at.txt + '"'));
  });

  // Os itens que saíram
  const saiu = await page.$$eval('.nav .nav-item', (a) => a.map((x) => x.getAttribute('data-nav')));
  ['nova-analise', 'favoritos', 'historico', 'biblioteca-fusion', 'aulas'].forEach((n) => {
    check(saiu.indexOf(n) < 0, 'o item "' + n + '" saiu do menu');
  });

  // Cada item abre a tela certa
  const VIEW = {
    inicio: 'inicio', 'biblioteca-escalas': 'biblioteca-escalas',
    'biblioteca-fraseados': 'biblioteca-fraseados', padroes: 'padroes',
    laboratorio: 'laboratorio', 'meus-exercicios': 'exercicios', config: 'config'
  };
  for (const [nav, view] of Object.entries(VIEW)) {
    await page.click('.nav-item[data-nav="' + nav + '"]');
    await page.waitForTimeout(450);
    const atual = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
    check(atual === view, '"' + nav + '" abre a tela "' + view + '"' + (atual === view ? '' : ' — abriu "' + atual + '"'));
  }

  // Meus Exercícios: três abas, uma de cada vez
  await page.click('.nav-item[data-nav="meus-exercicios"]');
  await page.waitForTimeout(350);
  const abas = await page.$$eval('.meus-tabs .tab', (t) => t.map((x) => x.textContent.trim()));
  check(abas.length === 3, 'a tela tem 3 abas: ' + abas.join(' · '));
  for (const aba of ['favoritos', 'historico', 'exercicios']) {
    await page.click('.meus-tabs .tab[data-meus="' + aba + '"]');
    await page.waitForTimeout(250);
    const visiveis = await page.$$eval('[data-meus-panel]', (p) => p.filter((x) => !x.hidden).map((x) => x.getAttribute('data-meus-panel')));
    const ativa = await page.$eval('.meus-tabs .tab.active', (t) => t.getAttribute('data-meus'));
    check(visiveis.length === 1 && visiveis[0] === aba && ativa === aba,
      'aba "' + aba + '" aberta sozinha (visíveis: ' + visiveis.join(',') + ')');
  }
  // Sem conta configurada, cada aba explica que é preciso entrar
  const gates = await page.$$eval('[data-meus-panel] .auth-gate', (g) => g.length);
  check(gates === 3, 'cada aba tem seu aviso de login (' + gates + ')');

  // O Fusion sumiu do menu mas continua como estilo
  await page.click('.nav-item[data-nav="biblioteca-fraseados"]');
  await page.waitForTimeout(500);
  const estilos = await page.$$eval('#lib-estilo option', (o) => o.map((x) => x.value));
  check(estilos.indexOf('fusion') >= 0, 'Fusion continua na lista de estilos da Biblioteca: ' + estilos.join(', '));
  await page.selectOption('#lib-estilo', 'fusion');
  await page.waitForTimeout(700);
  const frases = await page.$$eval('#lib-lista .lib-card', (c) => c.length);
  check(frases > 0, 'a Biblioteca gera frases no estilo Fusion (' + frases + ')');

  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(300);
  await page.click('.tab[data-tab="fraseados"]').catch(() => {});
  await page.waitForTimeout(400);
  const estilosAnalise = await page.$$eval('#input-estilo-fraseado option', (o) => o.map((x) => x.value)).catch(() => []);
  check(estilosAnalise.indexOf('fusion') >= 0, 'Fusion continua na aba Fraseados da análise');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) failed = true;
  await page.screenshot({ path: '/tmp/menu.png' });
  console.log(failed ? '\nFALHOU' : '\nMenu ok.');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
