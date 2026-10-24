/**
 * As cores: contraste medido, nos dois temas.
 *
 * Isto não é teste de gosto. A régua é a razão de contraste entre o texto e o
 * fundo que está atrás dele: abaixo de 4,5 para 1, texto corrido fica difícil
 * de ler — e em 24/10/2026 o corpo das lições de teoria estava em 3,1, logo
 * depois de o site ganhar 28 lições para ler.
 *
 * O teste calcula a razão no próprio navegador, com as cores que de fato
 * saíram (resolvendo variáveis, herança e fundos transparentes), e quebra se
 * alguém baixar o contraste de novo — em qualquer um dos dois temas.
 *
 * Confere também que o tema claro não apaga a partitura e a tablatura (elas
 * eram desenhadas com cor fixa: nota branca sobre papel branco não aparece) e
 * que a escolha da pessoa sobrevive a recarregar a página.
 *
 *   node tests/cores.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const MINIMO = 4.5;        // AA para texto corrido

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Injeta na página o cálculo de contraste (mesma fórmula da WCAG). */
const MEDIDOR = () => {
  window.__contraste = function (seletor) {
    const el = document.querySelector(seletor);
    if (!el) return null;
    const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = (c) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    // o fundo de verdade: sobe na árvore até achar um que não seja transparente
    let fundo = null, no = el;
    while (no && !fundo) {
      const bg = rgb(getComputedStyle(no).backgroundColor);
      if (bg.length >= 3 && (bg[3] === undefined || bg[3] > 0.6)) fundo = bg;
      no = no.parentElement;
    }
    if (!fundo) fundo = rgb(getComputedStyle(document.body).backgroundColor);
    const cor = rgb(getComputedStyle(el).color);
    const l1 = lum(cor), l2 = lum(fundo);
    return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
  };
};

async function medirTudo(page, tema) {
  await page.click('.nav-item[data-nav="aulas"]');
  await page.waitForTimeout(400);
  const licao = await page.evaluate(() => window.__contraste('.aula-paragrafo'));
  const resumo = await page.evaluate(() => window.__contraste('.aula-resumo'));
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(500);
  const legenda = await page.evaluate(() => window.__contraste('.si-legend'));
  const titulo = await page.evaluate(() => window.__contraste('.esc-title'));
  return { licao, resumo, legenda, titulo, tema };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  // O aparelho diz que prefere escuro: é o caso que se quer medir primeiro.
  // Mais abaixo o teste abre outra aba dizendo que prefere claro, para
  // conferir que o site obedece a quem nunca escolheu nada.
  const page = await browser.newPage({ viewport: { width: 1340, height: 1000 }, colorScheme: 'dark' });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararSemLogin(page);
  await page.addInitScript(MEDIDOR);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  // ---------- tema claro (o padrão desde 24/10/2026) ----------
  // A aba foi aberta dizendo que o aparelho PREFERE escuro, de propósito: o
  // dono decidiu que o site abre claro de qualquer jeito, porque estudar
  // instrumento é quase sempre de luz acesa. Quem quer escuro clica uma vez.
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-tema') === 'claro'),
    'o site abre no tema claro, mesmo num aparelho que pede escuro');
  const claro = await medirTudo(page, 'claro');
  ok(claro.licao >= MINIMO, 'CLARO: o texto das lições lê (' + claro.licao + ' para 1)');
  ok(claro.legenda >= MINIMO, 'CLARO: a legenda explicativa lê (' + claro.legenda + ')');
  ok(claro.resumo >= MINIMO, 'CLARO: o resumo das lições lê (' + claro.resumo + ')');
  ok(claro.titulo >= MINIMO, 'CLARO: os títulos leem (' + claro.titulo + ')');

  // ---------- trocar para escuro ----------
  await page.click('#btn-tema');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-tema') === null),
    'o ☾ troca para o tema escuro');
  const corDeFundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(/rgb\(1[01],/.test(corDeFundo), 'e o fundo fica escuro de verdade (' + corDeFundo + ')');

  const escuro = await medirTudo(page, 'escuro');
  ok(escuro.licao >= MINIMO, 'ESCURO: o texto das lições lê (' + escuro.licao + ' para 1)');
  ok(escuro.legenda >= MINIMO, 'ESCURO: a legenda explicativa lê (' + escuro.legenda + ')');
  ok(escuro.resumo >= MINIMO, 'ESCURO: o resumo das lições lê (' + escuro.resumo + ')');
  ok(escuro.titulo >= MINIMO, 'ESCURO: os títulos leem (' + escuro.titulo + ')');

  // volta ao claro para conferir a partitura no papel branco
  await page.click('#btn-tema');
  await page.waitForTimeout(400);

  // ---------- a partitura não pode sumir no claro ----------
  const partitura = await page.evaluate(() => {
    const svg = document.querySelector('#tre-conteudo .staff-block svg, #tre-conteudo svg');
    if (!svg) return null;
    const nota = svg.querySelector('ellipse, circle, rect');
    const linha = svg.querySelector('line');
    const cs = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : '');
    const fundo = getComputedStyle(document.body).backgroundColor;
    return { nota: nota ? (nota.getAttribute('fill') || cs(nota, 'fill')) : '', linha: linha ? linha.getAttribute('stroke') : '', fundo: fundo };
  });
  if (partitura) {
    ok(!/#e7ecf7|#ffffff/i.test(String(partitura.nota)) || /var\(/.test(String(partitura.nota)),
      'CLARO: a nota da partitura não é branca sobre papel branco (' + partitura.nota + ')');
    ok(/var\(--staff-line/.test(String(partitura.linha)),
      'CLARO: as linhas da pauta vêm do tema, não de cor fixa (' + partitura.linha + ')');
  } else {
    ok(false, 'não achei a partitura na tela de Início para conferir');
  }

  // o botão de Ouvir é o mesmo nos dois temas — foi escolha do dono
  const ouvirClaro = await page.evaluate(() => {
    const b = document.querySelector('#tre-conteudo .btn-ouvir');
    return b ? getComputedStyle(b).backgroundColor : '';
  });
  ok(/125,\s*211,\s*252/.test(ouvirClaro), 'o botão de Ouvir continua azul claro no tema claro (' + ouvirClaro + ')');

  // ---------- a escolha sobrevive a recarregar ----------
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-tema') === 'claro'),
    'recarregando, o tema escolhido continua valendo');
  const semPisca = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(/2[45][0-9]/.test(semPisca), 'e o fundo já volta claro (sem lampejo escuro)');

  // ---------- quem escolheu escuro continua no escuro ao recarregar ----------
  await page.click('#btn-tema');
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-tema') === null),
    'quem escolheu escuro continua no escuro depois de recarregar');

  // ---------- os dois botões do topo têm nome, não só ícone ----------
  const rotulos = await page.evaluate(() => ({
    tema: (document.querySelector('#btn-tema .bell-rot') || {}).textContent || '',
    temaTitle: (document.getElementById('btn-tema') || {}).title || ''
  }));
  ok(/Tema/.test(rotulos.tema), 'o botão de tema mostra o nome ao lado do ícone ("' + rotulos.tema + '")');
  ok(/clique/i.test(rotulos.temaTitle), 'e o título explica o que o clique faz');

  console.log('\nResumo medido — escuro:', JSON.stringify(escuro), '\n                claro :', JSON.stringify(claro));
  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nCores ok.');
  process.exit(falhas ? 1 : 0);
})();
