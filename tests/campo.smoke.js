/**
 * "Tocar o campo harmônico": os sete acordes da tonalidade rodando por baixo.
 *
 * Pedido do dono em 25/10/2026, com as três decisões dele: um compasso de
 * quatro tempos por acorde, TÉTRADES, e só na escala MAIOR. A ideia é tocar o
 * exercício por cima do som — é a sugestão que já estava escrita no cartão do
 * primeiro exercício virando botão.
 *
 * Este teste confere o que dá para medir, não o que dá para achar:
 *
 *   - as sete cifras certas, em dois tons diferentes (tétrades, não tríades);
 *   - que o botão só existe na maior;
 *   - que o som SAI de verdade (envelope de áudio, não só o botão mudando);
 *   - que os acordes andam na ordem e voltam ao I — é loop;
 *   - que um compasso dura o que o andamento manda (4 tempos, não 2 nem 8);
 *   - que parar pára mesmo, e que tocar um exercício interrompe o campo.
 *
 *   node tests/campo.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Instala um analisador na saída e guarda o pico a cada 10 ms. */
const GRAVADOR = () => {
  const orig = AudioNode.prototype.connect;
  window.__env = [];
  AudioNode.prototype.connect = function (dest, ...r) {
    if (dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      if (!ctx.__an) {
        ctx.__an = ctx.createAnalyser();
        ctx.__an.fftSize = 2048;
        orig.call(ctx.__an, dest);
        const buf = new Float32Array(2048);
        setInterval(() => {
          ctx.__an.getFloatTimeDomainData(buf);
          let m = 0;
          for (const v of buf) m = Math.max(m, Math.abs(v));
          window.__env.push(m);
        }, 10);
      }
      return orig.call(this, ctx.__an, ...r);
    }
    return orig.call(this, dest, ...r);
  };
};

const cifras = () => Array.from(document.querySelectorAll('.tre-campo-cifra'))
  .map((e) => e.textContent.trim());
const aceso = () => {
  const e = document.querySelector('.tre-campo-cifra.is-on');
  return e ? e.textContent.trim() : null;
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1340, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await page.addInitScript(GRAVADOR);
  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);

  // ---------- as sete cifras, em tétrades ----------
  const emC = await page.evaluate(cifras);
  ok(emC.length === 7, 'o campo harmônico tem os sete graus (' + emC.length + ')');
  ok(emC.join(' ') === 'IC7M iiDm7 iiiEm7 IVF7M VG7 viAm7 vii°Bm7(b5)',
    'em Dó maior saem as tétrades certas: ' + emC.join(' · '));

  await page.selectOption('#tre-tom', 'Eb');
  await page.waitForTimeout(800);
  const emEb = await page.evaluate(cifras);
  ok(emEb.join(' ') === 'IEb7M iiFm7 iiiGm7 IVAb7M VBb7 viCm7 vii°Dm7(b5)',
    'e em Mi bemol maior também: ' + emEb.join(' · '));
  await page.selectOption('#tre-tom', 'C');
  await page.waitForTimeout(700);

  // ---------- só na escala maior ----------
  for (const k of ['eolio', 'pentatonica_maior', 'blues_menor']) {
    await page.selectOption('#tre-escala', k);
    await page.waitForTimeout(700);
    const n = await page.$$eval('.tre-campo', (e) => e.length);
    ok(n === 0, 'em ' + k + ' o botão não aparece — ali o campo harmônico não é esse');
  }
  await page.selectOption('#tre-escala', 'jonio');
  await page.waitForTimeout(800);
  ok((await page.$$eval('.tre-campo', (e) => e.length)) === 1, 'e volta a aparecer na maior');

  // ---------- o som sai de verdade ----------
  // 240 bpm: um compasso de 4 tempos = 1 s, e a volta inteira = 7 s. Assim o
  // teste vê o ciclo fechar sem ficar meio minuto parado esperando.
  await page.fill('.tr-bpm-input', '240');
  await page.dispatchEvent('.tr-bpm-input', 'change');
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__env = []; });
  await page.click('[data-act="campo"]');
  await page.waitForTimeout(600);

  const rotulo = await page.$eval('[data-act="campo"]', (e) => e.textContent.trim());
  ok(/Parar/.test(rotulo), 'o botão vira "parar" enquanto toca (' + rotulo + ')');
  ok(await page.$eval('[data-act="campo"]', (e) => e.classList.contains('playing')),
    'e fica vermelho, como todo botão que está soando no site');

  // segue a sequência enquanto roda
  const vistos = [];
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(400);
    const a = await page.evaluate(aceso);
    if (a && vistos[vistos.length - 1] !== a) vistos.push(a);
  }
  const env = await page.evaluate(() => window.__env.slice());
  const pico = Math.max.apply(null, env.length ? env : [0]);
  ok(pico > 0.02, 'sai som de verdade pela saída de áudio (pico ' + pico.toFixed(3) + ')');

  const ordem = emC.map((c) => c);
  ok(vistos.length >= 8, 'os acordes andam sozinhos (' + vistos.length + ' trocas em 8 s)');
  ok(vistos.slice(0, 7).join(' ') === ordem.join(' '),
    'na ordem do campo harmônico: ' + vistos.slice(0, 7).join(' → '));
  ok(vistos[7] === ordem[0], 'e depois do vii° volta ao I: é loop, fica rodando');

  // um compasso dura 4 tempos: a 240 bpm, 1 s por acorde
  const segundos = 8;
  const trocas = vistos.length;
  ok(trocas >= segundos - 2 && trocas <= segundos + 2,
    'cada acorde dura um compasso de 4 tempos (' + trocas + ' acordes em ~' + segundos + ' s a 240 bpm)');

  // ---------- parar pára ----------
  await page.click('[data-act="campo"]');
  await page.waitForTimeout(600);
  ok(/Tocar/.test(await page.$eval('[data-act="campo"]', (e) => e.textContent)),
    'clicar de novo pára e o botão volta ao normal');
  ok((await page.evaluate(aceso)) === null, 'e nenhuma cifra fica acesa à toa');
  await page.evaluate(() => { window.__env = []; });
  await page.waitForTimeout(900);
  const depois = await page.evaluate(() => Math.max.apply(null, window.__env.length ? window.__env : [0]));
  ok(depois < 0.02, 'e o som realmente cessa (pico ' + depois.toFixed(3) + ' depois de parar)');

  // ---------- um não atropela o outro ----------
  await page.click('[data-act="campo"]');
  await page.waitForTimeout(500);
  await page.click('#tre-conteudo [data-act="ouvir-ex"]');
  await page.waitForTimeout(600);
  ok(/Tocar o campo/.test(await page.$eval('[data-act="campo"]', (e) => e.textContent)),
    'mandar ouvir um exercício desliga o campo harmônico, em vez de somar os dois');
  await page.evaluate(() => window.IL.audio.stopAll());

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nCampo harmônico ok.');
  process.exit(falhas ? 1 : 0);
})();
