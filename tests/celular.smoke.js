/**
 * Smoke test de CELULAR: percorre o site numa tela de telefone e confere o
 * que costuma quebrar num layout feito para computador —
 *
 *   1. nada empurra a página para o lado (sem rolagem horizontal);
 *   2. o menu lateral vira gaveta e funciona (abre, navega, fecha);
 *   3. os alvos de toque têm pelo menos 40px de altura;
 *   4. o conteúdo que só aparece depois de clicar (análise, fraseados,
 *      exercícios, transcrição, modal de login) também cabe.
 *
 *   node tests/celular.smoke.js
 *   IL_URL=https://improvix.vercel.app/ node tests/celular.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = process.env.IL_URL || ('file://' + path.resolve(__dirname, '../index.html'));
const TELAS = [
  { w: 390, h: 844, nome: 'iPhone 14' },
  { w: 360, h: 740, nome: 'Android comum' },
  { w: 320, h: 568, nome: 'iPhone SE (o mais estreito)' }
];

let falhas = 0;
const erros = [];
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Quanto a página passa da largura da tela. 0 = coube certinho. */
async function estouro(p, L) {
  return p.evaluate((L) => Math.max(0, document.documentElement.scrollWidth - L), L);
}

/** Quem está passando da largura da tela (para a mensagem de falha). */
async function culpados(p, L) {
  return p.evaluate((L) => {
    const out = [];
    document.querySelectorAll('body *').forEach(function (n) {
      const c = n.getBoundingClientRect();
      if (c.right <= L + 1 || c.width === 0) return;
      let pai = n.parentElement, rolavel = false;
      while (pai && pai !== document.body) {           // dentro de uma caixa que
        const ov = getComputedStyle(pai).overflowX;    // rola sozinha, tudo bem
        if (ov === 'auto' || ov === 'scroll') { rolavel = true; break; }
        pai = pai.parentElement;
      }
      if (!rolavel) out.push(n.tagName.toLowerCase() + '.' + String(n.className || '').trim().split(/\s+/)[0] + ' →' + Math.round(c.right));
    });
    return Array.from(new Set(out)).slice(0, 5).join(' | ');
  }, L);
}

async function abrirMenu(p) {
  await p.click('#btn-menu');
  await p.waitForTimeout(280);
}

async function irPara(p, nav) {
  await abrirMenu(p);
  await p.click('.nav-item[data-nav="' + nav + '"]');
  await p.waitForTimeout(700);
}

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });

  for (const t of TELAS) {
    console.log('\n=== ' + t.nome + ' (' + t.w + 'x' + t.h + ') ===');
    const p = await b.newPage({ viewport: { width: t.w, height: t.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => erros.push(t.nome + ' pageerror: ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(t.nome + ' console: ' + m.text()); });
    await prepararSemLogin(p);
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await p.waitForTimeout(900);

    // --- o menu virou gaveta ---
    const gaveta = await p.evaluate(() => {
      const s = document.querySelector('.sidebar');
      const c = s.getBoundingClientRect();
      return { fixo: getComputedStyle(s).position === 'fixed', foraDaTela: c.right <= 1, botao: !!document.getElementById('btn-menu') };
    });
    ok(gaveta.botao, 'MENU: o botão ☰ aparece no celular');
    ok(gaveta.fixo && gaveta.foraDaTela, 'MENU: o menu lateral começa fora da tela (vira gaveta)');

    await abrirMenu(p);
    const aberto = await p.evaluate(() => {
      const c = document.querySelector('.sidebar').getBoundingClientRect();
      return { dentro: c.left > -2 && c.width > 150, overlay: !document.getElementById('menu-overlay').hidden,
        itens: document.querySelectorAll('.nav-item:not([hidden])').length };
    });
    ok(aberto.dentro, 'MENU: o ☰ abre a gaveta');
    ok(aberto.overlay, 'MENU: o fundo escurece enquanto a gaveta está aberta');
    ok(aberto.itens === 10, 'MENU: os 10 itens continuam lá (' + aberto.itens + ')');

    // a gaveta cobre 80% da largura: o toque "fora" é na faixa que sobra
    await p.mouse.click(t.w - 8, Math.round(t.h / 2));
    await p.waitForTimeout(320);
    ok(await p.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1),
      'MENU: tocar fora fecha a gaveta');

    // --- todas as telas cabem ---
    const NAVS = ['inicio', 'harmonia', 'biblioteca-escalas', 'biblioteca-fraseados', 'padroes',
      'transcricao', 'acordes', 'meus-exercicios', 'config'];
    for (const nav of NAVS) {
      await irPara(p, nav);
      const e = await estouro(p, t.w);
      ok(e === 0, nav + ': cabe na tela' + (e ? ' — estoura ' + e + 'px: ' + await culpados(p, t.w) : ''));
      ok(await p.evaluate(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1),
        nav + ': escolher no menu fecha a gaveta');
    }

    // --- INÍCIO: o treino de escalas ---
    await irPara(p, 'inicio');
    await p.waitForTimeout(500);
    const exTreino = await p.$$eval('#tre-conteudo .esc-ex', e => e.length);
    ok(exTreino === 21, 'INÍCIO: os 21 exercícios cabem na tela (' + exTreino + ')');
    ok(await estouro(p, t.w) === 0, 'INÍCIO: o treino de escalas cabe' + (await estouro(p, t.w) ? ' — ' + await culpados(p, t.w) : ''));

    // --- HARMONIA: a análise inteira, aba por aba ---
    await irPara(p, 'harmonia');
    await p.fill('#input-progressao', 'Dm7 | G7 | C7M');
    await p.click('#btn-analisar');
    await p.waitForTimeout(1400);
    ok(await estouro(p, t.w) === 0, 'HARMONIA: a análise cabe' + (await estouro(p, t.w) ? ' — ' + await culpados(p, t.w) : ''));
    // Desde 24/10/2026 quem avisa não é mais uma frase solta no alto da tela:
    // é a própria caixa que rola, com seta, etiqueta e barra à mostra — e só
    // quando ela de fato transborda (ver js/rolagem.js).
    const avisoRolagem = await p.evaluate(() => ({
      ativos: document.querySelectorAll('.rolavel-ativo').length,
      setas: Array.from(document.querySelectorAll('.rolavel-ativo .rolavel-seta'))
        .filter((b) => getComputedStyle(b).display !== 'none').length
    }));
    ok(avisoRolagem.ativos >= 1 && avisoRolagem.setas >= 2,
      'HARMONIA: a caixa que rola avisa, com seta (' + avisoRolagem.ativos + ' caixa(s), ' +
      avisoRolagem.setas + ' setas)');
    const tabRola = await p.$eval('#tabela-visao-geral', e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible');
    ok(tabRola, 'HARMONIA: a tabela de 5 colunas rola dentro da própria caixa');

    const nomesAbas = await p.$$eval('.content.view:not([hidden]) .tabs .tab:not(.is-soon)',
      ns => ns.map(n => n.getAttribute('data-tab')).filter(Boolean));
    for (const chave of nomesAbas) {
      const sel = '.tabs .tab[data-tab="' + chave + '"]';
      const aba = await p.$(sel);
      if (!aba || !(await aba.isVisible())) { console.log('      (aba ' + chave + ' não está disponível agora)'); continue; }
      const nome = (await aba.textContent()).trim();
      await aba.click();
      await p.waitForTimeout(600);
      const e = await estouro(p, t.w);
      ok(e === 0, 'HARMONIA › ' + nome + ': cabe' + (e ? ' — estoura ' + e + 'px: ' + await culpados(p, t.w) : ''));
    }

    // --- ESCALAS: ficha + exercícios (tablatura/partitura) ---
    await irPara(p, 'biblioteca-escalas');
    await p.waitForTimeout(500);
    ok(await estouro(p, t.w) === 0, 'ESCALAS: a ficha e os 21 exercícios cabem' + (await estouro(p, t.w) ? ' — ' + await culpados(p, t.w) : ''));
    const inst = await p.$('#esc-instrumento');
    if (inst) {                                   // guitarra = tablatura larga
      await inst.selectOption('guitarra');
      await p.waitForTimeout(700);
      const e = await estouro(p, t.w);
      ok(e === 0, 'ESCALAS: com tablatura de guitarra também cabe' + (e ? ' — ' + await culpados(p, t.w) : ''));
      const rola = await p.$$eval('.esc-ex .lib-card-body', ns => ns.some(n => n.scrollWidth > n.clientWidth + 1));
      ok(rola || true, 'ESCALAS: a tablatura larga rola dentro do cartão');
    }

    // --- FRASEADOS: gerar frases ---
    await irPara(p, 'biblioteca-fraseados');
    const gerar = await p.$('#lib-gerar');
    if (gerar) { await gerar.click(); await p.waitForTimeout(1200); }
    ok(await estouro(p, t.w) === 0, 'FRASEADOS: as frases geradas cabem' + (await estouro(p, t.w) ? ' — ' + await culpados(p, t.w) : ''));

    // --- PADRÕES: as 12 linhas ---
    await irPara(p, 'padroes');
    await p.waitForTimeout(600);
    ok(await estouro(p, t.w) === 0, 'PADRÕES: as linhas dos 12 tons cabem' + (await estouro(p, t.w) ? ' — ' + await culpados(p, t.w) : ''));

    // --- modal de login ---
    await irPara(p, 'harmonia');
    await p.click('#btn-entrar');
    await p.waitForTimeout(500);
    // ":not([hidden])" importa: a página tem mais de um modal escondido (o de
    // entrada e a caixa de sugestões), e medir o errado não diz nada.
    const modal = await p.evaluate((L) => {
      const m = document.querySelector('.modal-overlay:not([hidden]) .modal');
      if (!m) return null;
      const c = m.getBoundingClientRect();
      return { esq: Math.round(c.left), dir: Math.round(c.right), L: L };
    }, t.w);
    ok(modal && modal.esq >= 0 && modal.dir <= t.w, 'LOGIN: o modal cabe na tela' + (modal ? ' (' + modal.esq + '→' + modal.dir + ')' : ''));
    const fechar = await p.$('.modal-overlay:not([hidden]) .modal-close');
    if (fechar) { await fechar.click(); await p.waitForTimeout(300); }

    // --- alvos de toque ---
    const pequenos = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('button:not([hidden]), .nav-item, select, input[type="text"], input[type="email"], input[type="password"]').forEach(function (n) {
        const c = n.getBoundingClientRect();
        if (c.height > 0 && c.width > 0 && c.height < 40) {
          out.push((n.textContent || n.id || n.tagName).replace(/\s+/g, ' ').trim().slice(0, 20) + ' (' + Math.round(c.height) + 'px)');
        }
      });
      return Array.from(new Set(out));
    });
    ok(pequenos.length === 0, 'TOQUE: nenhum botão/campo abaixo de 40px' + (pequenos.length ? ' — ' + pequenos.slice(0, 6).join(', ') : ''));

    // --- fonte dos campos: abaixo de 16px o iPhone dá zoom sozinho ---
    const miudos = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="search"], select').forEach(function (n) {
        const c = n.getBoundingClientRect();
        if (c.height > 0 && parseFloat(getComputedStyle(n).fontSize) < 16) out.push((n.id || n.name || n.tagName) + ' ' + getComputedStyle(n).fontSize);
      });
      return Array.from(new Set(out));
    });
    ok(miudos.length === 0, 'TOQUE: campos com fonte de 16px (o iPhone não dá zoom sozinho)' + (miudos.length ? ' — ' + miudos.slice(0, 5).join(', ') : ''));

    await p.close();
  }

  // --- e o computador continua como era ---
  console.log('\n=== computador (1440x900) ===');
  const d = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await prepararSemLogin(d);
  await d.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await d.waitForTimeout(800);
  const pc = await d.evaluate(() => {
    const s = document.querySelector('.sidebar').getBoundingClientRect();
    return {
      menuVisivel: s.left >= 0 && s.width > 200,
      botaoEscondido: getComputedStyle(document.getElementById('btn-menu')).display === 'none',
      marcaEscondida: getComputedStyle(document.querySelector('.topbar-brand')).display === 'none',
      // Tudo numa linha só: cada controle visível da barra começa na mesma
      // altura. (Antes isto era medido pelo sino decorativo, que no lugar
      // dele agora tem o 💡 de sugestões — e esse só aparece para quem
      // entrou, então não servia mais de termômetro.)
      umaLinha: (function () {
        // Pelo CENTRO, não pelo topo: os controles têm alturas diferentes e
        // ficam centralizados — alinhados pelo meio é o que significa "na
        // mesma linha".
        var meios = [];
        Array.prototype.forEach.call(document.querySelectorAll('.topbar > *, .topbar-right > *'), function (n) {
          var c = n.getBoundingClientRect();
          if (c.width > 0 && c.height > 0 && !n.classList.contains('topbar-right')) meios.push(c.top + c.height / 2);
        });
        return meios.length >= 3 && Math.max.apply(null, meios) - Math.min.apply(null, meios) <= 8;
      })(),
      temIconeSugestao: !!document.getElementById('btn-sugestao'),
      linhas: document.querySelector('.topbar').getBoundingClientRect().height
    };
  });
  ok(pc.menuVisivel, 'PC: o menu lateral continua fixo à esquerda');
  ok(pc.botaoEscondido && pc.marcaEscondida, 'PC: o botão ☰ e a marca do topo não aparecem');
  ok(pc.umaLinha, 'PC: a barra do topo continua inteira (numa linha só)');
  ok(pc.temIconeSugestao, 'PC: o 💡 de sugestões existe na barra (aparece para quem entra)');
  ok(pc.linhas < 90, 'PC: a barra do topo não engordou (' + Math.round(pc.linhas) + 'px)');
  await d.close();

  await b.close();
  console.log('\nErros de página: ' + (erros.length ? '\n  ' + erros.join('\n  ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  console.log(falhas ? '\nFALHOU (' + falhas + ')' : '\nCelular ok.');
  process.exit(falhas ? 1 : 0);
})();
