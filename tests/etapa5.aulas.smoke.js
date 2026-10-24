/**
 * Smoke test da Etapa 5 (Aulas) — roda no Chromium headless.
 *
 * Confirma:
 *  - visitante (sem login) já acessa "Aulas" normalmente — módulo livre;
 *  - a lista de lições aparece e a primeira lição é selecionada por padrão;
 *  - clicar em outra lição troca o conteúdo do detalhe;
 *  - "Testar este exemplo" preenche o formulário principal (tonalidade +
 *    progressão) e roda a análise (Visão Geral aparece preenchida).
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

  await prepararSemLogin(page);
  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(300);

  // 1) Visitante acessa a Teoria Musical sem login
  // A tela saiu do menu em 12/09/2026 e voltou em 24/10/2026, agora como
  // "Teoria Musical — do zero", com 18 lições novas antes das 10 antigas.
  await page.evaluate(() => { window.IL.ui.switchView('aulas'); window.IL.ui.renderAulasView(); });
  await page.waitForTimeout(100);
  const viewAtivaAulas = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const totalLicoes = await page.$$eval('.aula-item', (els) => els.length);
  const primeiraAtiva = await page.$eval('.aula-item.active .aula-titulo', (el) => el.textContent.trim());
  const tituloDetalheInicial = await page.$eval('.aula-detalhe-titulo', (el) => el.textContent.trim());
  console.log('Visitante — view ativa:', viewAtivaAulas,
    '| total de lições listadas:', totalLicoes,
    '| lição ativa por padrão:', primeiraAtiva,
    '| título no detalhe:', tituloDetalheInicial);

  // 2) Trocar de lição. A lista agora tem cabeçalhos de bloco entremeados,
  // então o alvo é o 2º .aula-item, não o 2º filho do contêiner.
  const segundoTitulo = await page.$$eval('.aula-item .aula-titulo', (els) => els[1] && els[1].textContent.trim());
  await page.evaluate(() => document.querySelectorAll('.aula-item')[1].click());
  await page.waitForTimeout(120);
  const tituloDetalheDepois = await page.$eval('.aula-detalhe-titulo', (el) => el.textContent.trim());
  console.log('Após clicar na 2ª lição — título esperado:', segundoTitulo, '| título mostrado:', tituloDetalheDepois);

  // 3) "Testar este exemplo" — só algumas lições trazem progressão de
  // exemplo, então o teste abre uma que traz em vez de supor que é a primeira.
  await page.evaluate(() => {
    const i = window.IL.lessons.LESSONS.findIndex((l) => l.exemplo);
    document.querySelectorAll('.aula-item')[i].click();
  });
  await page.waitForTimeout(150);
  const progressaoExemplo = await page.$eval('.aula-exemplo-progressao', (el) => el.textContent.trim());
  await page.click('#btn-aula-testar');
  await page.waitForTimeout(150);
  const viewAtivaDepois = await page.$eval('.content.view:not([hidden])', (v) => v.getAttribute('data-view'));
  const progressaoNoFormulario = await page.$eval('#input-progressao', (i) => i.value);
  const subtitulo = await page.$eval('#analise-subtitulo', (el) => el.textContent);
  console.log('Após "Testar este exemplo" — view ativa:', viewAtivaDepois,
    '| progressão de exemplo:', progressaoExemplo,
    '| progressão no formulário:', progressaoNoFormulario,
    '| subtítulo da análise:', subtitulo);

  console.log('Console/page errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})();
