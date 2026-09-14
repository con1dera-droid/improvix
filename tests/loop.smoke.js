/**
 * Smoke test do "repetir" (🔁): o laço tem de emendar sem buraco.
 *
 * Grava a saída de áudio de verdade no Chromium e procura silêncios longos —
 * antes, a repetição só recomeçava depois de a passada acabar, e dava uma
 * pausa de ~330 ms a cada volta. Também confere que desligar o repetir no meio
 * deixa o ciclo terminar, e que um laço longo não acumula nós de áudio.
 *
 *   node tests/loop.smoke.js
 *   IL_URL=http://localhost:3000/ node tests/loop.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const URL = process.env.IL_URL || ('file://' + path.resolve(__dirname, '../index.html'));

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Instala um medidor de pico na saída do contexto de áudio. */
const MEDIDOR = () => {
  window.__niveis = [];
  const ac = window.IL.audio.getContext();
  const proc = ac.createScriptProcessor(1024, 2, 1);
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    let pico = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > pico) pico = v; }
    window.__niveis.push({ t: ac.currentTime, pico });
  };
  const destino = ac.destination;
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d, ...r) {
    if (d === destino) { try { orig.call(this, proc); } catch (e) { /* já ligado */ } }
    return orig.call(this, d, ...r);
  };
  proc.connect(ac.destination);
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.evaluate(MEDIDOR);

  await page.click('#btn-analisar');
  await page.waitForTimeout(1500);
  await page.click('[data-tab="fraseados"]');
  await page.waitForTimeout(1200);

  const botaoLoop = '.transport[data-transport="linha"] [data-act="loop"]';
  if (!(await page.$eval(botaoLoop, (b) => b.classList.contains('on')))) await page.click(botaoLoop);

  // conta as voltas pelo destaque de compasso da lista de frases
  await page.evaluate(() => {
    window.__voltas = 0; window.__ultimo = -1; window.__niveis = [];
    new MutationObserver(() => {
      const els = [...document.querySelectorAll('#lista-fraseados .phrase-item')];
      const i = els.findIndex((e) => e.classList.contains('playing'));
      if (i === 0 && window.__ultimo !== 0) window.__voltas++;
      if (i >= 0) window.__ultimo = i;
    }).observe(document.querySelector('#lista-fraseados'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  });

  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(26000);
  const { niveis, voltas } = await page.evaluate(() => ({ niveis: window.__niveis, voltas: window.__voltas }));
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(300);

  const LIMIAR = 0.01;
  function silencios(minMs) {
    const out = []; let s = null;
    niveis.forEach((d) => {
      if (d.pico < LIMIAR) { if (!s) s = { de: d.t }; s.ate = d.t; }
      else { if (s && (s.ate - s.de) * 1000 > minMs) out.push((s.ate - s.de) * 1000); s = null; }
    });
    return out;
  }
  const dur = niveis.length ? niveis[niveis.length - 1].t - niveis[0].t : 0;
  const longos = silencios(150);
  console.log('gravados ' + dur.toFixed(1) + 's | voltas completas: ' + voltas +
    ' | silêncios > 150 ms: ' + (longos.length ? longos.map((x) => x.toFixed(0) + 'ms').join(' ') : 'nenhum'));
  ok(voltas >= 2, 'o "repetir" deu mais de uma volta (' + voltas + ')');
  ok(longos.length === 0, 'nenhuma pausa maior que 150 ms entre as voltas');
  ok(Math.max.apply(null, niveis.map((d) => d.pico)) > 0.2, 'o som saiu com volume saudável');

  // desligar no meio: termina o ciclo e para sozinho
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(3000);
  await page.click(botaoLoop);
  await page.waitForTimeout(1500);
  ok(await page.$eval('#btn-tocar-linha', (b) => b.classList.contains('playing')),
    'desligar o repetir NÃO corta o som no meio');
  await page.waitForTimeout(11000);
  ok(!(await page.$eval('#btn-tocar-linha', (b) => b.classList.contains('playing'))),
    'e no fim do ciclo ele para sozinho');

  // um laço longo não pode ir acumulando nós de áudio
  await page.click(botaoLoop);
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(2000);
  const n1 = await page.evaluate(() => window.__ilNodes());
  await page.waitForTimeout(20000);
  const n2 = await page.evaluate(() => window.__ilNodes());
  ok(n2 <= n1 * 2 + 40, 'laço de 20 s sem acumular nós de áudio (' + n1 + ' → ' + n2 + ')');
  await page.click('#btn-tocar-linha');
  await page.waitForTimeout(300);

  // o mesmo vale para os exercícios da Biblioteca de Escalas
  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(900);
  const loopEsc = '.transport[data-transport="escala"] [data-act="loop"]';
  if (!(await page.$eval(loopEsc, (b) => b.classList.contains('on')))) await page.click(loopEsc);
  await page.click('.esc-ex [data-act="ouvir-ex"]');
  await page.waitForTimeout(9000);
  ok(await page.$eval('.esc-ex [data-act="ouvir-ex"]', (b) => b.classList.contains('playing')),
    'exercício da escala continua repetindo depois de 9 s');
  await page.click('.esc-ex [data-act="ouvir-ex"]');
  await page.waitForTimeout(300);
  ok(!(await page.$eval('.esc-ex [data-act="ouvir-ex"]', (b) => b.classList.contains('playing'))),
    'e para quando você clica de novo');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nRepetir ok.');
  await browser.close();
  process.exit(falhas ? 1 : 0);
})();
