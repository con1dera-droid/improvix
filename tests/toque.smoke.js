/**
 * Mede o TOQUE de um exercício: ele soa tocado ou soa régua?
 *
 * Grava o envelope do som que sai (a cada 10 ms), acha o pico de cada nota e
 * responde três perguntas com número, não com impressão:
 *
 *   - DINÂMICA: quanto a força varia de uma nota para outra. Zero significa
 *     todas as notas no mesmo volume — o som de metrônomo tocando escala.
 *   - ACENTO: a nota que abre o compasso sai mais forte que as de dentro dele?
 *   - CONTINUIDADE: quanto tempo o som fica em silêncio no meio do exercício.
 *     Corda dedilhada ressoa; se cada nota é cortada no fim da duração,
 *     aparecem buracos entre elas e vira "tec-tec-tec".
 *
 *   node tests/toque.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Instala um analisador na saída e guarda o envelope (pico a cada 10 ms). */
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

/** Picos de cada nota + quanto tempo o som passa em silêncio no meio. */
function analisa(env) {
  const pico = Math.max.apply(null, env);
  const piso = pico * 0.06;                       // abaixo disso é silêncio
  const inicio = env.findIndex((v) => v > piso);
  let fim = env.length - 1;
  while (fim > 0 && env[fim] <= piso) fim--;
  const trecho = env.slice(inicio, fim + 1);
  const silencio = trecho.filter((v) => v <= piso).length / Math.max(1, trecho.length);

  // Um "ataque" é uma subida brusca: o quadro atual bem acima do anterior.
  const picos = [];
  for (let i = 1; i < trecho.length - 1; i++) {
    if (trecho[i] > piso * 2 && trecho[i] > trecho[i - 1] * 1.6) {
      let j = i, alvo = trecho[i];
      while (j + 1 < trecho.length && trecho[j + 1] > alvo) { alvo = trecho[++j]; }
      picos.push(alvo);
      i = j + 1;
    }
  }
  const media = picos.reduce((a, b) => a + b, 0) / Math.max(1, picos.length);
  const desvio = Math.sqrt(picos.reduce((a, b) => a + (b - media) * (b - media), 0) / Math.max(1, picos.length));
  return { pico, silencio, notas: picos.length, variacao: media ? desvio / media : 0 };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  await page.addInitScript(GRAVADOR);
  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(600);
  await page.selectOption('#esc-instrumento', 'violao');
  await page.waitForTimeout(400);

  // Exercício 1 da escala maior: a escala subindo e descendo.
  await page.evaluate(() => { window.__env = []; });
  await page.click('#esc-conteudo [data-act="ouvir-ex"][data-i="0"]');
  await page.waitForTimeout(9000);
  const env = await page.evaluate(() => window.__env);
  await page.evaluate(() => window.IL.audio.stopAll());

  const m = analisa(env);
  console.log('\nenvelope: ' + env.length + ' quadros · ' + m.notas + ' ataques detectados\n');
  ok(m.notas >= 8, 'o exercício toca (' + m.notas + ' notas ouvidas)');
  // Referência medida: antes dos acentos métricos e com o compressor apertado
  // isto dava 3,5% (tudo no mesmo volume); depois, entre 9% e 12%.
  ok(m.variacao > 0.06, 'a força varia de nota para nota — soa tocado, não régua (variação ' +
    (m.variacao * 100).toFixed(1) + '%)');
  ok(m.silencio < 0.12, 'o violão continua soando entre as notas, sem buracos (silêncio no meio: ' +
    (m.silencio * 100).toFixed(1) + '%)');
  ok(m.pico >= 0.3 && m.pico <= 1, 'sem estourar nem sumir (pico ' + m.pico.toFixed(3) + ')');

  // --- sopro: o contrário da corda. Não ressoa depois, mas as notas se
  //     emendam; se cada uma for cortada antes da seguinte, vira soluço.
  await page.selectOption('#esc-instrumento', 'sax');
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__env = []; });
  await page.click('#esc-conteudo [data-act="ouvir-ex"][data-i="0"]');
  await page.waitForTimeout(9000);
  const envSax = await page.evaluate(() => window.__env);
  await page.evaluate(() => window.IL.audio.stopAll());
  const s2 = analisa(envSax);
  console.log('\nsax: ' + s2.notas + ' ataques · silêncio ' + (s2.silencio * 100).toFixed(1) + '%');
  ok(s2.notas >= 8, 'SOPRO: o exercício toca (' + s2.notas + ' notas ouvidas)');
  ok(s2.silencio < 0.08, 'SOPRO: as notas se emendam, sem soluço entre elas (silêncio ' +
    (s2.silencio * 100).toFixed(1) + '%)');
  ok(s2.pico >= 0.3 && s2.pico <= 1, 'SOPRO: sem estourar nem sumir (pico ' + s2.pico.toFixed(3) + ')');

  console.log('\nErros de página: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nToque ok.');
  process.exit(falhas ? 1 : 0);
})();
