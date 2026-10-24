/**
 * A prova de que a gravação funciona de verdade: a REDE NEURAL rodando.
 *
 * O smoke (tests/gravacao.smoke.js) troca o detector de notas por um dublê,
 * porque lá o assunto é o fluxo da tela. Aqui é o contrário: o detector é o
 * de verdade — o mesmo Basic Pitch da tela de Transcrição —, e a pergunta é
 * uma só: ele consegue ler um exercício tocado e devolver uma nota que preste?
 *
 * O "aluno" é sintetizado no próprio navegador (osciladores com envelope, nas
 * notas do exercício, no andamento da tela). Não é um instrumento de verdade,
 * mas é um sinal honesto: monofônico, afinado, com ataque e queda — e é o
 * piso mínimo que o reconhecedor tem de passar. Se falhar aqui, falha sempre.
 *
 * O segundo caso é o que me preocupava: o acompanhamento saindo pela caixa e
 * entrando junto pelo microfone. Ele NÃO afirma que a nota vai passar — afirma
 * o contrário, que ela cai, e que o sistema avisa a pessoa em vez de deixá-la
 * achando que tocou errado.
 *
 * Demora (uns 30s por caso neste contêiner, menos numa máquina com GPU), por
 * isso fica fora da bateria rápida.
 *
 *   node tests/gravacao.e2e.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Renderiza o exercício como áudio e passa pela rede neural de verdade. */
const RODAR = async (comAcordes) => {
  await window.IL.ui.carregarVendorTranscricao(function () {});
  const ex = window.IL.scales.exercisesFor('C', 'jonio')[0];
  const prep = window.IL.notation.prepareForInstrument(ex.events, 'teclado');
  const esperado = window.IL.avaliar.midisEsperados(prep.events);

  const SR = 44100, bpm = 80, spb = 60 / bpm;
  const fim = prep.events.reduce((a, e) => Math.max(a, e.onset + e.dur), 0);
  const dur = fim * spb + 1;
  const ac = new OfflineAudioContext(1, Math.ceil(dur * SR), SR);

  function voz(midi, t, d, tipo, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + d + 0.05);
  }

  prep.events.filter((e) => !e.rest).forEach((e) => {
    voz(e.midi, e.onset * spb, Math.max(0.12, e.dur * spb * 0.9), 'triangle', 0.5);
  });

  if (comAcordes) {
    const NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const tones = (ex.chords && ex.chords[0] && ex.chords[0].tones) || [];
    for (let c = 0; c * 4 < fim; c++) {
      tones.forEach((nome, k) => {
        const pc = Math.max(0, NOMES.indexOf(String(nome).replace('Db', 'C#').replace('Eb', 'D#')
          .replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#')));
        voz(48 + pc + (k > 2 ? 12 : 0), c * 4 * spb, 4 * spb * 0.95, 'sawtooth', 0.18);
      });
    }
  }

  const buf = await ac.startRendering();
  const t0 = performance.now();
  const res = await window.IL.transcribe.transcrever(buf, { instrumento: 'teclado' });
  const ouvido = window.IL.avaliar.midisOuvidos(res.melodia);
  const av = window.IL.avaliar.avaliar(esperado, ouvido);
  return {
    esperadas: esperado.length, ouvidas: ouvido.length,
    nota: Math.round(av.nota * 100), limpeza: Math.round(av.limpeza * 100),
    resumo: av.resumo, segundos: Math.round((performance.now() - t0) / 1000)
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));

  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);

  // ---------- 1) o aluno sozinho (com fone, ou acompanhamento desligado) ----------
  const limpo = await page.evaluate(RODAR, false);
  console.log('\nSozinho  —', JSON.stringify(limpo), '\n  ' + limpo.resumo + '\n');
  ok(limpo.nota >= 80, 'TOCANDO SOZINHO: o detector lê o exercício e aprova (' + limpo.nota + '%, piso 80)');
  ok(limpo.ouvidas >= limpo.esperadas * 0.9,
    'e ouve praticamente todas as notas (' + limpo.ouvidas + ' de ' + limpo.esperadas + ')');
  ok(limpo.limpeza >= 80, 'sem inventar nota que não existe (limpeza ' + limpo.limpeza + '%)');

  // ---------- 2) o acompanhamento entrando pelo microfone ----------
  const sujo = await page.evaluate(RODAR, true);
  console.log('\nCom acorde por cima —', JSON.stringify(sujo), '\n  ' + sujo.resumo + '\n');
  ok(sujo.nota < limpo.nota,
    'COM O ACOMPANHAMENTO POR CIMA: a leitura piora mesmo (' + sujo.nota + '% contra ' + limpo.nota + '%)');
  if (sujo.nota < 80) {
    ok(/fone de ouvido|desmarque o acompanhamento|ruído/i.test(sujo.resumo),
      'e o sistema EXPLICA o que fazer, em vez de só reprovar');
  } else {
    ok(true, 'e mesmo assim passou (' + sujo.nota + '%) — melhor ainda');
  }

  console.log('Erros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nGravação (rede neural de verdade) ok.');
  process.exit(falhas ? 1 : 0);
})();
