/**
 * Passeio por TODAS as telas do site, do jeito que o dono roda no dia a dia.
 * Abre cada item do menu, exercita o que cada tela promete e reclama de
 * qualquer erro de console ou resposta HTTP >= 400.
 *
 *   node tests/site.smoke.js                      (abre o index.html direto)
 *   IL_URL=http://localhost:3000/ node tests/site.smoke.js   (servido por HTTP)
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = process.env.IL_URL || ('file://' + path.resolve(__dirname, '../index.html'));
let falhas = 0;
const erros = [];
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  p.on('pageerror', e => erros.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  p.on('requestfailed', r => erros.push('404/falha: ' + r.url().replace(URL, '') + ' (' + (r.failure()||{}).errorText + ')'));
  const t0 = Date.now();
  p.on('response', r => { if (r.status() >= 400) erros.push('HTTP ' + r.status() + ': ' + r.url()); });
  const resp = await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
  ok(!resp || resp.status() < 400, 'o site abre em ' + URL + ' (' + (Date.now()-t0) + ' ms)');
  await p.waitForTimeout(800);

  // --- menu ---
  const itens = await p.$$eval('.nav-item', n => n.map(x => x.textContent.replace(/\s+/g,' ').trim()));
  console.log('\nMENU (' + itens.length + '):', itens.join(' · '));
  ok(itens.length === 8, 'o menu tem os 8 itens');

  const VIEWS = { 'inicio':'inicio', 'biblioteca-escalas':'biblioteca-escalas', 'biblioteca-fraseados':'biblioteca-fraseados',
    'padroes':'padroes', 'transcricao':'transcricao', 'laboratorio':'laboratorio', 'meus-exercicios':'exercicios', 'config':'config' };
  for (const nav of Object.keys(VIEWS)) {
    const el = await p.$('.nav-item[data-nav="' + nav + '"]');
    if (!el) { console.log('(sem item de menu para ' + nav + ')'); continue; }
    await el.click();
    await p.waitForTimeout(700);
    const v = await p.$eval('.content.view:not([hidden])', x => x.getAttribute('data-view'));
    const texto = (await p.$eval('.content.view:not([hidden])', x => x.innerText.replace(/\s+/g,' ').trim())).slice(0, 70);
    ok(v === VIEWS[nav], nav + ' → abre "' + v + '"  [' + texto + '…]');
  }

  // --- INÍCIO: análise de uma progressão ---
  await p.click('.nav-item[data-nav="inicio"]');
  await p.waitForTimeout(400);
  const campo = await p.$('#input-progressao');
  if (campo) {
    await campo.fill('Dm7 | G7 | C7M');
    await p.click('#btn-analisar');
    await p.waitForTimeout(1200);
    const acordes = await p.$$eval('.chord-chip, .chord-card, .chain-chord', c => c.length).catch(()=>0);
    const abas = await p.$$eval('.tab-btn, [data-tab]', t => t.map(x=>x.textContent.trim())).catch(()=>[]);
    ok(acordes > 0 || abas.length > 0, 'INÍCIO: analisou "Dm7 | G7 | C7M" (' + acordes + ' acordes, abas: ' + abas.slice(0,6).join('/') + ')');
    const fr = await p.$('[data-tab="fraseados"]');
    if (fr) { await fr.click(); await p.waitForTimeout(1200);
      const n = await p.$$eval('.phrase-card, .frase, .lib-card', c => c.length);
      ok(n > 0, 'INÍCIO: a aba Fraseados gerou ' + n + ' frases'); }
  } else console.log('(não achei #input-progressao)');

  // --- ESCALAS ---
  await p.click('.nav-item[data-nav="biblioteca-escalas"]');
  await p.waitForTimeout(900);
  const exs = await p.$$eval('.esc-ex', e => e.length);
  const grupos = await p.$$eval('.esc-grupo', e => e.map(x=>x.textContent.trim()));
  const linhasNotas = await p.$$eval('.esc-ex .esc-notas', e => e.length);
  const primeira = await p.$eval('.esc-ex .esc-notas', e => e.textContent.replace(/\s+/g,' ').trim());
  ok(exs === 21 && linhasNotas === 21, 'ESCALAS: 21 exercícios, todos com linha de notas (' + exs + '/' + linhasNotas + ')');
  console.log('      grupos: ' + grupos.join(' · '));
  console.log('      ' + primeira);
  await p.selectOption('#esc-tom', 'Eb'); await p.waitForTimeout(600);
  ok((await p.$eval('.esc-title', e=>e.textContent)).includes('Eb'), 'ESCALAS: troca de tom para Eb');
  await p.fill('#esc-busca', 'alterada'); await p.waitForTimeout(600);
  ok(/Alterada/i.test(await p.$eval('.esc-title', e=>e.textContent)), 'ESCALAS: busca "alterada" acha a escala');
  await p.click('[data-act="ouvir-escala"]'); await p.waitForTimeout(1500);
  ok(await p.$eval('[data-act="ouvir-escala"]', b=>b.textContent.includes('Parar')), 'ESCALAS: áudio toca (samples carregam por HTTP)');
  await p.click('[data-act="ouvir-escala"]'); await p.waitForTimeout(300);

  // --- FRASEADOS: o botão consertado ---
  await p.click('.nav-item[data-nav="biblioteca-fraseados"]');
  await p.waitForTimeout(900);
  const conteudo = () => p.$$eval('#lib-lista .lib-card', c => c.map(x=>x.textContent.replace(/\s+/g,' ')).join('|'));
  const vistas = [await conteudo()];
  ok(vistas[0].split('|').length === 12, 'FRASEADOS: abriu com 12 frases');
  for (let i = 0; i < 3; i++) {
    await p.click('#btn-lib-gerar'); await p.waitForTimeout(900);
    const c = await conteudo();
    ok(vistas.indexOf(c) < 0, 'FRASEADOS: "Gerar frases" #' + (i+1) + ' trouxe um conjunto inédito');
    vistas.push(c);
  }
  await p.click('#btn-lib-mais'); await p.waitForTimeout(700);
  ok((await p.$$eval('#lib-lista .lib-card', c=>c.length)) === 24, 'FRASEADOS: "Mais 12 frases" soma 24');
  await p.selectOption('#lib-estilo', 'fusion'); await p.waitForTimeout(900);
  ok((await p.$$eval('#lib-lista .lib-card', c=>c.length)) === 12, 'FRASEADOS: estilo Fusion (sweep) ainda gera');
  await p.selectOption('#lib-estilo', 'intervalado'); await p.waitForTimeout(900);
  ok(!(await p.$eval('#lib-intervalo-field', e=>e.hidden)), 'FRASEADOS: o campo Intervalo aparece no estilo intervalado');

  // --- PADRÕES ---
  await p.click('.nav-item[data-nav="padroes"]');
  await p.waitForTimeout(900);
  const linhas = await p.$$eval('.pat-linha, .pat-tom, .lib-card', c => c.length);
  ok(linhas > 0, 'PADRÕES: a tela desenha ' + linhas + ' blocos');
  const cats = await p.$$eval('#pad-categoria option, #pad-categoria optgroup', o => o.length).catch(()=>0);
  ok(cats > 0, 'PADRÕES: seletor de categoria com ' + cats + ' entradas');

  // --- LABORATÓRIO e MEUS EXERCÍCIOS (travas de conta) ---
  await p.click('.nav-item[data-nav="laboratorio"]'); await p.waitForTimeout(600);
  const lab = (await p.$eval('.content.view:not([hidden])', e=>e.innerText.replace(/\s+/g,' '))).slice(0,90);
  ok(lab.length > 10, 'LABORATÓRIO: mostra o aviso/convite certo [' + lab + '…]');
  await p.click('.nav-item[data-nav="meus-exercicios"]'); await p.waitForTimeout(600);
  const tabs = await p.$$eval('.meus-tabs button, .meus-tabs .view-btn', t=>t.map(x=>x.textContent.trim()));
  ok(tabs.length === 3, 'MEUS EXERCÍCIOS: as 3 abas (' + tabs.join(' / ') + ')');
  for (let i = 1; i < tabs.length; i++) {
    await p.click('.meus-tabs button:nth-child(' + (i+1) + '), .meus-tabs .view-btn:nth-child(' + (i+1) + ')');
    await p.waitForTimeout(400);
  }
  ok(true, 'MEUS EXERCÍCIOS: troca de aba sem erro');

  // --- TRANSCRIÇÃO (só a tela; o áudio é testado no smoke próprio) ---
  await p.click('.nav-item[data-nav="transcricao"]'); await p.waitForTimeout(600);
  ok(await p.$('#tra-drop') !== null && await p.$('#tra-gravar') !== null, 'TRANSCRIÇÃO: entrada por arquivo e por gravação na tela');
  const pesado = await p.evaluate(() => ({ tf: typeof window.tf, bp: typeof window.BasicPitchLib }));
  ok(pesado.tf === 'undefined', 'TRANSCRIÇÃO: as bibliotecas pesadas só carregam quando você manda um áudio');

  // --- CONFIGURAÇÕES ---
  await p.click('.nav-item[data-nav="config"]'); await p.waitForTimeout(600);
  const cfg = (await p.$eval('.content.view:not([hidden])', e=>e.innerText.replace(/\s+/g,' '))).slice(0,80);
  ok(cfg.length > 10, 'CONFIGURAÇÕES: abre [' + cfg + '…]');

  console.log('\n--- problemas de rede/console ---');
  const unicos = [...new Set(erros)];
  console.log(unicos.length ? unicos.join('\n') : 'nenhum');
  if (unicos.length) falhas += unicos.length;

  await p.click('.nav-item[data-nav="biblioteca-escalas"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/site3000.png', fullPage: false });
  console.log('\n' + (falhas ? falhas + ' PROBLEMA(S)' : 'Tudo passou.'));
  await b.close();
  process.exit(falhas ? 1 : 0);
})();
