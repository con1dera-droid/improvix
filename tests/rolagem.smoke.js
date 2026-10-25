/**
 * "Tem mais para o lado": os avisos de rolagem.
 *
 * Partitura, tablatura, braço e tabela larga rolam na horizontal, e no Mac e
 * no celular a barra fica invisível até alguém rolar — então a pessoa olha um
 * compasso cortado e conclui que o exercício acaba ali. A pedido do dono, o
 * aviso ficou explícito. Este teste confere as duas metades da regra:
 *
 *   - quando a caixa TRANSBORDA, aparecem seta, etiqueta e barra visível;
 *   - quando ela CABE, não aparece nada — aviso em coisa que já cabe é ruído,
 *     e ruído a pessoa aprende a ignorar.
 *
 *   node tests/rolagem.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

// O cartão que serve de cobaia na horizontal: na Biblioteca de Escalas, o
// exercício "padrão de 4 notas deslocando o início" cabe inteiro na tela larga
// e transborda no celular — exatamente as duas metades da regra. (O 1º
// exercício da maior não serve mais: desde 24/10/2026 ele é curto de
// propósito, 1-2-3-5-7-8-9, e cabe até no celular.)
const ALVO = 14;

const estado = (alvo) => {
  const c = document.querySelectorAll('#esc-conteudo .lib-card-body')[alvo];
  if (!c) return null;
  const env = c.parentElement;
  const et = env.querySelector('.rolavel-aviso');
  return {
    envelopes: document.querySelectorAll('.rolavel').length,
    ehEnvelope: env.classList.contains('rolavel'),
    ativo: env.classList.contains('rolavel-ativo'),
    setas: Array.from(env.querySelectorAll('.rolavel-seta'))
      .filter((b) => getComputedStyle(b).display !== 'none').length,
    etiqueta: !!(et && getComputedStyle(et).display !== 'none'),
    etiquetaBase: et ? Math.round(et.getBoundingClientRect().bottom) : null,
    caixaTopo: Math.round(c.getBoundingClientRect().top),
    cabe: c.scrollWidth - c.clientWidth <= 6,
    scrollLeft: Math.round(c.scrollLeft),
    barra: getComputedStyle(c).scrollbarColor
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1340, height: 950 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.selectOption('#tre-instrumento', 'guitarra');
  await page.waitForTimeout(800);
  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(1600);

  // ---------- tela larga: o exercício cabe, então nada de aviso ----------
  const largo = await page.evaluate(estado, ALVO);
  ok(!!largo, 'a Biblioteca montou os exercícios');
  ok(largo.envelopes >= 1, 'as caixas que rolam foram preparadas (' + largo.envelopes + ')');
  ok(largo.ehEnvelope, 'a tablatura do exercício entrou num envelope de rolagem');
  ok(largo.cabe === true, 'na tela larga, essa tablatura cabe inteira');
  ok(largo.ativo === false, 'e por isso NÃO aparece aviso nenhum nela');
  ok(largo.etiqueta === false, 'nem a etiqueta "tem mais para o lado"');

  // ---------- celular: a mesma tablatura transborda ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const estreito = await page.evaluate(estado, ALVO);
  ok(estreito.cabe === false, 'no celular, a mesma tablatura transborda');
  ok(estreito.ativo === true, 'e aí o aviso acende');
  ok(estreito.setas >= 2, 'com as setas ‹ › à mostra (' + estreito.setas + ')');
  ok(estreito.etiqueta === true, 'e a etiqueta "tem mais para o lado"');
  // a etiqueta fica ACIMA da caixa, não por cima do conteúdo
  ok(estreito.etiquetaBase <= estreito.caixaTopo + 2,
    'a etiqueta fica acima da caixa, sem tapar a tablatura');
  ok(!!estreito.barra && estreito.barra !== 'auto',
    'a barra de rolagem tem cor própria, em vez de sumir (' + estreito.barra + ')');

  // ---------- a seta anda de verdade ----------
  await page.evaluate((alvo) => {
    const c = document.querySelectorAll('#esc-conteudo .lib-card-body')[alvo];
    c.parentElement.querySelector('.rolavel-dir').click();
  }, ALVO);
  await page.waitForTimeout(800);
  const rolou = await page.evaluate(estado, ALVO);
  ok(rolou.scrollLeft > estreito.scrollLeft, 'clicar na seta › rola o conteúdo (' + estreito.scrollLeft + ' → ' + rolou.scrollLeft + ')');
  ok(rolou.etiqueta === false, 'e a etiqueta some depois que a pessoa rolou: já cumpriu o papel');

  // ---------- voltando para a tela larga, o aviso se apaga sozinho ----------
  await page.setViewportSize({ width: 1340, height: 950 });
  await page.waitForTimeout(1200);
  const devolta = await page.evaluate(estado, ALVO);
  ok(devolta.ativo === false, 'alargando a janela, o aviso se apaga sozinho');

  // ================= rolagem PARA BAIXO: a lista de lições =================
  // O dono abriu a Teoria Musical e concluiu que a lista acabava na "Tríade
  // menor": a lista tem altura fixa, e no Mac a barra do navegador é
  // transparente e some sozinha. Aqui a barra é desenhada por nós.
  await page.click('[data-nav="aulas"]');
  await page.waitForTimeout(900);

  const lista = () => page.evaluate(() => {
    const l = document.querySelector('.aulas-list');
    if (!l) return null;
    const env = l.parentElement;
    const t = env.querySelector('.rolavel-trilho');
    const p = env.querySelector('.rolavel-polegar');
    const av = env.querySelector('.rolavel-aviso');
    const cx = (e) => { const r = e.getBoundingClientRect(); return { topo: Math.round(r.top), base: Math.round(r.bottom), larg: Math.round(r.width), alt: Math.round(r.height) }; };
    return {
      classes: env.className,
      transborda: l.scrollHeight - l.clientHeight,
      scrollTop: Math.round(l.scrollTop),
      trilhoVisivel: t ? getComputedStyle(t).display !== 'none' : false,
      trilho: t ? cx(t) : null,
      polegar: p ? cx(p) : null,
      aviso: av ? { txt: av.textContent, vis: getComputedStyle(av).visibility, topo: Math.round(av.getBoundingClientRect().top) } : null,
      seta: (function () { const d = env.querySelector('.rolavel-dir'); return d ? cx(d) : null; })(),
      caixa: cx(l)
    };
  });

  const L1 = await lista();
  ok(!!L1 && /rolavel-y/.test(L1.classes), 'a lista de lições entrou no envelope de rolagem vertical');
  ok(L1.transborda > 100, 'ela realmente transborda para baixo (' + L1.transborda + 'px escondidos)');
  ok(/rolavel-ativo/.test(L1.classes), 'e por isso o aviso está aceso');
  ok(L1.trilhoVisivel, 'a barra desenhada aparece (a do Mac é transparente e some)');
  ok(L1.trilho && L1.trilho.larg >= 8, 'a barra tem largura de sobra para ser vista (' + (L1.trilho && L1.trilho.larg) + 'px)');
  ok(L1.polegar && L1.polegar.alt >= 30 && L1.polegar.alt < L1.caixa.alt,
    'o polegar é proporcional: nem some nem toma a barra inteira (' + (L1.polegar && L1.polegar.alt) + 'px de ' + L1.caixa.alt + ')');
  ok(L1.aviso && L1.aviso.vis === 'visible' && /abaixo/.test(L1.aviso.txt),
    'e a etiqueta diz, por escrito, que tem mais abaixo');
  // o erro que apareceu na primeira versão: seta e etiqueta no mesmo lugar
  ok(L1.seta && L1.aviso && L1.seta.base <= L1.aviso.topo + 1,
    'a seta ⌄ fica ACIMA da etiqueta, sem cair em cima dela (' + L1.seta.base + ' ≤ ' + L1.aviso.topo + ')');

  // clicar no fim do trilho leva ao fim da lista
  const t = await page.evaluate(() => {
    // só a barra VERTICAL: desde 25/10/2026 as caixas que rolam para o lado
    // também têm a sua, e um querySelector solto pegava a errada.
    const r = document.querySelector('.rolavel-y .rolavel-trilho').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.bottom - 20 };
  });
  await page.mouse.click(t.x, t.y);
  await page.waitForTimeout(500);
  const L2 = await lista();
  ok(L2.scrollTop > L1.scrollTop + 100, 'clicar no fim da barra leva ao fim da lista (' + L1.scrollTop + ' → ' + L2.scrollTop + ')');
  ok(L2.polegar.topo > L1.polegar.topo, 'e o polegar desce junto, mostrando onde a pessoa está');
  ok(L2.aviso.vis === 'hidden', 'a etiqueta some depois que a pessoa rolou — já cumpriu o papel');
  ok(L2.seta.base <= L2.aviso.topo + 1, 'e a seta continua no mesmo lugar, sem pular quando a etiqueta some');

  // a seta ⌄ também anda
  const antesY = L2.scrollTop;
  await page.evaluate(() => document.querySelector('.aulas-list').scrollTop = 0);
  await page.waitForTimeout(300);
  await page.click('.rolavel-y .rolavel-dir');
  await page.waitForTimeout(700);
  const L3 = await lista();
  ok(L3.scrollTop > 0 && L3.scrollTop < antesY, 'a seta ⌄ desce um pedaço da lista (' + L3.scrollTop + 'px)');

  // ---------- no celular, a lista mostra só quatro lições ----------
  // Pedido do dono (25/10/2026): com as 28 ocupando a tela inteira, a pessoa
  // rolava um minuto antes de ver o conteúdo da lição que escolheu.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const noCelular = await page.evaluate(() => {
    const l = document.querySelector('.aulas-list');
    l.scrollTop = 0;                      // o teste acima rolou a lista
    const r = l.getBoundingClientRect();
    const av = l.parentElement.querySelector('.rolavel-aviso');
    return {
      total: l.querySelectorAll('.aula-item').length,
      // inteiro = começa e termina dentro da janela da lista
      inteiros: Array.from(l.querySelectorAll('.aula-item')).filter((i) => {
        const c = i.getBoundingClientRect();
        return c.top >= r.top - 2 && c.bottom <= r.bottom + 2;
      }).length,
      altura: Math.round(r.height),
      aviso: av ? av.textContent.trim() : null,
      avisoVisivel: av ? getComputedStyle(av).visibility === 'visible' : false,
      avisoLargo: av ? Math.round(av.getBoundingClientRect().width) : 0,
      larguraLista: Math.round(r.width)
    };
  });
  ok(noCelular.total === 28, 'as 28 lições continuam na lista (' + noCelular.total + ')');
  ok(noCelular.inteiros === 4, 'mas no celular só quatro aparecem inteiras (' + noCelular.inteiros + ')');
  ok(noCelular.altura < 520, 'e a lista ficou curta o bastante para o conteúdo da lição subir (' + noCelular.altura + 'px)');
  ok(/tem mais abaixo/i.test(noCelular.aviso || ''), 'com o aviso escrito: "' + noCelular.aviso + '"');
  ok(noCelular.avisoVisivel, 'visível desde o começo');
  ok(noCelular.avisoLargo > noCelular.larguraLista * 0.8,
    'e em destaque, ocupando a largura da lista (' + noCelular.avisoLargo + ' de ' + noCelular.larguraLista + 'px)');

  // rolou até o fim: aí sim o aviso some, porque não tem mais nada abaixo
  await page.evaluate(() => { const l = document.querySelector('.aulas-list'); l.scrollTop = l.scrollHeight; });
  await page.waitForTimeout(500);
  const noFim = await page.$eval('.rolavel-y .rolavel-aviso', (e) => getComputedStyle(e).visibility);
  ok(noFim === 'hidden', 'chegando ao fim da lista, o aviso some — não tem mais nada abaixo');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nRolagem ok.');
  process.exit(falhas ? 1 : 0);
})();
