/**
 * Gravar o exercício e liberar o próximo — o caminho na tela.
 *
 * A conta que decide se passa tem teste próprio (tests/avaliar.test.js, 16
 * casos). Aqui o assunto é o FLUXO: quem está trancado, o que a tela diz para
 * destrancar, o que acontece quando passa e quando não passa, e o que vai
 * parar no banco.
 *
 * A rede neural é trocada por um dublê (window.IL.transcribe.transcrever) que
 * devolve uma melodia combinada. Não é economia: rodar a rede de verdade aqui
 * mediria o reconhecimento de áudio, que é outra coisa, e um teste que mede
 * duas coisas ao mesmo tempo não diz qual delas quebrou. O microfone também é
 * dublê, pelo mesmo motivo (e porque não existe microfone num servidor).
 *
 *   node tests/gravacao.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararPagina, entrar, sair } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
const ADMIN = 'alex@teste.com';
const ALUNO = 'aluno@teste.com';

let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/**
 * Põe no lugar da rede neural um dublê que devolve as notas do próprio
 * exercício, com `acertos` delas trocadas por notas erradas. Assim o teste
 * escolhe a nota que vai sair, sem mexer na conta.
 */
const DUBLE = (quanto) => {
  if (window.__gravou === undefined) window.__gravou = 0;
  navigator.mediaDevices.getUserMedia = function () {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ac.createMediaStreamDestination();
    const osc = ac.createOscillator();
    osc.connect(dest); osc.start();
    return Promise.resolve(dest.stream);
  };
  window.IL.transcribe.transcrever = function () {
    window.__gravou++;
    const ex = window.__exercicioAtual || [];
    const quantas = Math.round(ex.length * quanto);
    const mel = [];
    ex.forEach((midi, i) => {
      mel.push({
        startTimeSeconds: 10 + i * 0.5,       // depois da contagem
        durationSeconds: 0.4,
        pitchMidi: i < quantas ? midi : midi + 6    // o que passar do limite sai errado
      });
    });
    return Promise.resolve({ melodia: mel, eventos: [], bpm: 80 });
  };
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1340, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await prepararPagina(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  // o primeiro cadastro é o admin; ele abre o cadastro livre para o aluno
  await entrar(page, ADMIN, true);
  await page.waitForTimeout(600);
  await page.click('.nav-item[data-nav="admin"]');
  await page.waitForTimeout(500);
  await page.click('[data-adm="aba"][data-v="sistema"]');
  await page.waitForTimeout(300);
  await page.click('input[name="adm-cadastro"][value="livre"]');
  await page.click('[data-adm="salvar-sistema"]');
  await page.waitForTimeout(400);
  await sair(page);

  await entrar(page, ALUNO, true);
  await page.waitForTimeout(600);
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(700);

  // ---------- a trava ----------
  const inicio = await page.evaluate(() => ({
    cartoes: document.querySelectorAll('#tre-conteudo .esc-ex').length,
    trancados: document.querySelectorAll('#tre-conteudo .esc-ex-trancado').length,
    gravar: document.querySelectorAll('#tre-conteudo [data-act="gravar-ex"]').length,
    ouvir: document.querySelectorAll('#tre-conteudo [data-act="ouvir-ex"]').length,
    // A regra saiu da caixa do progresso e passou a morar no bloco
    // "Como funciona" (25/10/2026), que no celular fica fechado.
    regra: (document.querySelector('#tre-conteudo .tre-extra') || {}).textContent || '',
    primeiroTrancado: (document.querySelector('.esc-ex-trancado') || {}).textContent || ''
  }));
  ok(inicio.trancados === inicio.cartoes - 1,
    'só o exercício 1 começa aberto; os outros ' + inicio.trancados + ' ficam trancados');
  ok(inicio.gravar === 1, 'só o exercício aberto tem o botão de gravar');
  ok(inicio.ouvir === 1, 'e o trancado não mostra nem o botão de ouvir');
  ok(/80%/.test(inicio.regra) && /Gravar e liberar/.test(inicio.regra),
    'a tela explica a regra: gravar, acertar 80%, liberar o próximo');
  ok(/trancado/i.test(inicio.primeiroTrancado) && /grave o exerc/i.test(inicio.primeiroTrancado),
    'e cada trancado diz o que fazer para abrir');

  const rotulo = await page.$eval('#tre-conteudo [data-act="ouvir-ex"]', (b) => b.textContent.trim());
  ok(/Ouvir o exerc/i.test(rotulo), 'o botão de ouvir se chama "Ouvir o exercício" ("' + rotulo + '")');

  // guarda as notas do exercício 1 para o dublê devolver
  await page.evaluate(() => {
    const ex = window.IL.scales.exercisesFor('C', 'jonio')[0];
    const prep = window.IL.notation.prepareForInstrument(ex.events, document.getElementById('tre-instrumento').value);
    window.__exercicioAtual = window.IL.avaliar.midisEsperados(prep.events);
  });
  const quantasNotas = await page.evaluate(() => window.__exercicioAtual.length);
  ok(quantasNotas > 8, 'o exercício 1 tem ' + quantasNotas + ' notas para comparar');

  // ---------- o PAUSE: clicar de novo interrompe a tomada ----------
  await page.evaluate(DUBLE, 1);
  await page.click('#tre-conteudo [data-act="gravar-ex"]');
  await page.waitForTimeout(900);
  const gravando = await page.evaluate(() => {
    const b = document.querySelector('#tre-conteudo .btn-gravar');
    return { txt: b.textContent.trim(), ponto: !!b.querySelector('.grv-ponto'), titulo: b.title };
  });
  ok(/PAUSE/.test(gravando.txt), 'enquanto grava, o botão vira PAUSE ("' + gravando.txt + '")');
  ok(gravando.ponto, 'com o símbolo de gravação ao lado');
  ok(/Interromper/i.test(gravando.titulo), 'e o título diz o que o clique faz');

  await page.click('#tre-conteudo .btn-gravar');          // o PAUSE
  await page.waitForTimeout(1500);
  const interrompido = await page.evaluate(() => ({
    caixa: (document.querySelector('.esc-gravacao') || {}).textContent || '',
    gravando: !!document.querySelector('.esc-ex-gravando'),
    linhas: window.__fake.store.progresso.length,
    botao: (document.querySelector('#tre-conteudo .btn-gravar') || {}).textContent || ''
  }));
  ok(/interrompida/i.test(interrompido.caixa), 'clicar no PAUSE interrompe e diz isso ("' +
    interrompido.caixa.trim().slice(0, 40) + '")');
  ok(!interrompido.gravando, 'e a gravação para de verdade');
  ok(interrompido.linhas === 0, 'a tentativa interrompida NÃO vai para o banco (' + interrompido.linhas + ' linhas)');
  ok(/Gravar e liberar/.test(interrompido.botao), 'e o botão volta a ser "Gravar e liberar"');

  // ---------- gravação que NÃO passa (60% certas) ----------
  await page.evaluate(DUBLE, 0.6);
  await page.click('#tre-conteudo [data-act="gravar-ex"]');
  await page.waitForTimeout(1200);
  const gravandoAgora = await page.$eval('#tre-conteudo .btn-gravar', (b) => b.textContent);
  ok(/PAUSE/.test(gravandoAgora), 'enquanto grava, o botão é o PAUSE ("' + gravandoAgora.trim() + '")');
  await page.waitForFunction(() => !document.querySelector('.esc-ex-gravando'), { timeout: 90000 });
  await page.waitForTimeout(400);

  const quase = await page.evaluate(() => ({
    texto: document.querySelector('.esc-gravacao').textContent,
    classe: document.querySelector('.esc-gravacao').className,
    trancados: document.querySelectorAll('#tre-conteudo .esc-ex-trancado').length,
    linha: window.__fake.store.progresso[0]
  }));
  ok(/quase|faltou/i.test(quase.classe + quase.texto), 'com 60% a tela diz que faltou (" ' + quase.texto.slice(0, 60) + '…")');
  ok(/piso é 80%/.test(quase.texto), 'e lembra qual é o piso');
  ok(/\d+ª nota|da \d+ª à/.test(quase.texto), 'e diz ONDE escorregou: "' + (quase.texto.match(/Faltou[^.]*/) || [''])[0].slice(0, 70) + '"');
  ok(quase.trancados === inicio.trancados, 'o exercício 2 continua trancado');
  ok(quase.linha && quase.linha.gravado_em === null, 'o banco guardou a tentativa sem carimbar como gravado');
  ok(quase.linha && quase.linha.acerto >= 55 && quase.linha.acerto <= 65,
    'com a nota que saiu (' + (quase.linha || {}).acerto + '%)');

  // ---------- gravação que passa (100%) ----------
  await page.evaluate(DUBLE, 1);
  await page.click('.esc-gravacao [data-act="gravar-ex"]');
  await page.waitForTimeout(800);
  await page.waitForFunction(() => !document.querySelector('.esc-ex-gravando'), { timeout: 90000 });
  await page.waitForTimeout(600);

  const passou = await page.evaluate(() => ({
    trancados: document.querySelectorAll('#tre-conteudo .esc-ex-trancado').length,
    gravar: document.querySelectorAll('#tre-conteudo [data-act="gravar-ex"]').length,
    selo: (document.querySelector('#tre-conteudo .esc-feito') || {}).textContent || '',
    resumo: (document.getElementById('tre-progresso') || {}).textContent || '',
    linha: window.__fake.store.progresso[0],
    tentativas: (window.__fake.store.progresso[0] || {}).tentativas
  }));
  ok(passou.linha && passou.linha.gravado_em, 'passando de 80%, o banco carimba o exercício como gravado');
  ok(passou.linha.acerto === 100, 'com a melhor nota (' + passou.linha.acerto + '%)');
  ok(passou.tentativas === 2, 'e contando as duas tentativas (' + passou.tentativas + ')');
  ok(passou.trancados === inicio.trancados - 1, 'o exercício 2 destrancou (' + passou.trancados + ' trancados agora)');
  ok(passou.gravar === 2, 'e já tem o botão de gravar nele');
  ok(/gravado/.test(passou.selo), 'o exercício 1 ganha o selo de gravado ("' + passou.selo.trim() + '")');
  ok(/1 de \d+ exercícios gravados/.test(passou.resumo), 'o resumo conta os gravados ("' + passou.resumo.trim().slice(0, 40) + '")');

  // ---------- a gravação de verdade chamou o motor ----------
  const vezes = await page.evaluate(() => window.__gravou);
  ok(vezes === 2, 'o detector de notas foi chamado uma vez por gravação (' + vezes + ')');

  // ---------- trocar de escala mantém a trava independente ----------
  await page.selectOption('#tre-escala', 'eolio');
  await page.waitForTimeout(700);
  const outra = await page.evaluate(() => ({
    trancados: document.querySelectorAll('#tre-conteudo .esc-ex-trancado').length,
    cartoes: document.querySelectorAll('#tre-conteudo .esc-ex').length
  }));
  ok(outra.trancados === outra.cartoes - 1, 'em outra escala, a trava recomeça do exercício 1');

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nGravação ok.');
  process.exit(falhas ? 1 : 0);
})();
