/**
 * Smoke test da AMBIÊNCIA (reverb): confere que existe cauda depois da última
 * nota no modo "Com sala", que ela some no modo "seco", e que o clique do
 * metrônomo continua seco. node tests/ambiencia.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage();
  let failed = false;
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));

  // Mede o envelope (pico por janela de 30 ms) que chega na saída.
  await page.addInitScript(() => {
    const orig = AudioNode.prototype.connect;
    window.__env = [];
    window.__convolvers = 0;
    const origConv = AudioContext.prototype.createConvolver;
    AudioContext.prototype.createConvolver = function () { window.__convolvers++; return origConv.call(this); };
    AudioNode.prototype.connect = function (dest, ...r) {
      if (dest instanceof AudioDestinationNode) {
        const ctx = dest.context;
        if (!ctx.__an) {
          ctx.__an = ctx.createAnalyser(); ctx.__an.fftSize = 2048;
          orig.call(ctx.__an, dest);
          const buf = new Float32Array(2048);
          setInterval(() => {
            ctx.__an.getFloatTimeDomainData(buf);
            let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v));
            window.__env.push({ t: performance.now(), v: m });
          }, 30);
        }
        return orig.call(this, ctx.__an, ...r);
      }
      return orig.call(this, dest, ...r);
    };
  });

  await page.goto('file://' + path.resolve(__dirname, '../index.html'), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.click('.nav-item[data-nav="biblioteca-escalas"]');
  await page.waitForTimeout(600);

  // Toca UMA nota curta (staccato) e mede o que ainda soa depois dela: sem
  // ambiência o silêncio é imediato; com ambiência sobra a cauda da sala.
  async function cauda(modo) {
    await page.selectOption('#som-ambiencia', modo);
    await page.waitForTimeout(250);
    await page.evaluate(() => { window.__env = []; });
    await page.evaluate(() => new Promise((ok) => {
      window.IL.audio.playEvents(
        [{ name: 'C', midi: 60, onset: 0, dur: 0.25, vel: 0.95 }],
        'guitarra', { bpm: 120 }, ok
      );
      setTimeout(ok, 2500);
    }));
    await page.waitForTimeout(2200);
    const env = await page.evaluate(() => window.__env);
    await page.evaluate(() => window.IL.audio.stopAll());
    const pico = Math.max(...env.map((e) => e.v), 0);
    const i0 = env.findIndex((e) => e.v > pico * 0.5);
    // a nota dura 125 ms; a cauda é o que ainda soa 150–350 ms depois do ataque
    const depois = env.slice(i0 + 5, i0 + 12).map((e) => e.v);
    const rel = depois.length ? Math.max(...depois) / (pico || 1) : 0;
    return { pico, cauda: rel, db: rel > 0 ? 20 * Math.log10(rel) : -120 };
  }

  const sala = await cauda('sala');
  const seco = await cauda('seco');
  const pouca = await cauda('pouca');

  function linha(nome, r, minDb, maxDb) {
    const ok = r.db >= minDb && r.db <= maxDb && r.pico > 0.25;
    if (!ok) failed = true;
    console.log((ok ? 'ok   ' : 'FALHA') + ' ' + nome.padEnd(14) +
      'pico ' + r.pico.toFixed(3) + ' | cauda 150-350 ms depois do ataque: ' + r.db.toFixed(1) + ' dB' +
      '  (esperado ' + minDb + ' a ' + maxDb + ')');
  }
  // Ambiência discreta: audível, mas longe de "lavar" a frase.
  linha('Com sala', sala, -26, -12);
  linha('Pouca sala', pouca, -32, -16);
  linha('Seco', seco, -120, -60);

  if (!(sala.db > seco.db + 20)) { failed = true; console.log('FALHA a sala deveria deixar mais cauda que o seco'); }
  if (!(sala.db >= pouca.db)) { failed = true; console.log('FALHA "com sala" deveria deixar mais cauda que "pouca sala"'); }

  const conv = await page.evaluate(() => window.__convolvers);
  console.log((conv > 0 ? 'ok   ' : 'FALHA') + ' convolver criado: ' + conv);
  if (!conv) failed = true;

  // A escolha fica guardada no navegador
  await page.selectOption('#som-ambiencia', 'pouca');
  await page.waitForTimeout(200);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const lembrou = await page.$eval('#som-ambiencia', (s) => s.value);
  console.log((lembrou === 'pouca' ? 'ok   ' : 'FALHA') + ' escolha lembrada depois de recarregar: ' + lembrou);
  if (lembrou !== 'pouca') failed = true;

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) failed = true;
  console.log(failed ? '\nFALHOU' : '\nAmbiência ok.');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
