/**
 * Treine seu Ouvido: o jogo pedido pelo dono em 25/10/2026.
 *
 * A checagem que importa aqui não é visual, é de afinação: **a nota que sai
 * pelo alto-falante é mesmo o grau que o jogo diz ser?** Um erro de um
 * semitom neste cálculo não quebra nada na tela, não derruba teste nenhum de
 * interface — e ensina a pessoa errado, que é o pior defeito possível num
 * treino de ouvido. Então o teste grampeia o motor de áudio, lê o MIDI que
 * foi agendado e confere contra a tônica, grau por grau, em três tons.
 *
 * Confere também o resto das regras:
 *   - a REFERÊNCIA toca antes da nota (é ela que faz o ouvido ser relativo e
 *     não absoluto — sem ela o jogo seria sorte);
 *   - cada nível oferece os graus certos, e os de cima nascem trancados;
 *   - 80% numa rodada de dez abre o nível seguinte; menos que isso, não;
 *   - errar marca o botão errado em vermelho e o certo em verde;
 *   - trocar de tom transpõe a tônica e recomeça a rodada.
 *
 *   node tests/ouvido.smoke.js
 */
const { chromium } = require('playwright');
const path = require('path');
const { prepararSemLogin } = require('./fake-supabase.js');

const URL = 'file://' + path.resolve(__dirname, '../index.html');
let falhas = 0;
function ok(cond, msg) { console.log((cond ? 'ok    ' : 'FALHA ') + msg); if (!cond) falhas++; }

/** Grampeia playEvents e guarda o que foi mandado tocar. */
const ESCUTA = () => {
  window.__tocado = [];
  const esperar = setInterval(() => {
    if (!window.IL || !window.IL.audio || !window.IL.audio.playEvents) return;
    clearInterval(esperar);
    const orig = window.IL.audio.playEvents;
    window.IL.audio.playEvents = function (eventos, instrumento, opts, pronto) {
      window.__tocado.push({
        notas: (eventos || []).filter((e) => !e.rest).map((e) => e.midi),
        acordes: ((opts || {}).chords || []).map((c) => ({ root: c.root, tones: c.tones })),
        instrumento: instrumento
      });
      return orig.apply(this, arguments);
    };
  }, 20);
};

const ultimo = () => window.__tocado[window.__tocado.length - 1];
const estadoJogo = () => {
  const s = window.IL.ouvido._state;
  return { tom: s.tom, nivel: s.nivel, alvo: s.alvo, pergunta: s.pergunta, acertos: s.acertos, liberado: s.liberado };
};

// pitch class de cada tônica, para saber qual MIDI esperar (o jogo usa a
// oitava 4: 60 + pc).
const PC = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1340, height: 1000 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) erros.push(m.text()); });

  await page.addInitScript(ESCUTA);
  await prepararSemLogin(page);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);

  // noWaitAfter: os itens do menu são <a href="#">, e o Playwright trata o
  // clique como uma navegação e fica esperando ela "assentar". Neste teste —
  // o único que grampeia o motor de áudio ANTES do primeiro gesto da página,
  // para poder ler o MIDI agendado — essa espera não termina, embora a tela
  // abra na hora: medido, a página responde com os 4 níveis 157 ms depois do
  // clique, e switchView e renderOuvidoView voltam normalmente. É espera do
  // Playwright, não travamento do site.
  await page.click('.nav-item[data-nav="ouvido"]', { noWaitAfter: true });
  await page.waitForTimeout(700);
  ok((await page.$$eval('#ouv-conteudo .ouv-nivel', (e) => e.length)) === 4, 'a tela abre com os quatro níveis');

  const trancados = await page.$$eval('.ouv-nivel', (e) => e.filter((x) => x.disabled).length);
  ok(trancados === 3, 'e só o nível 1 nasce aberto (' + trancados + ' trancados)');

  // ---------- a nota que sai é o grau que o jogo diz ----------
  // Vinte perguntas seguidas, conferindo cada uma: MIDI tocado menos tônica
  // tem de dar exatamente os semitons do grau sorteado.
  await page.click('[data-act="comecar"]');
  await page.waitForTimeout(500);

  let conferidas = 0, erradas = 0, semReferencia = 0;
  let acordes = 0, acordesErrados = 0, soltos = 0, posicoes = [];
  const vistos = {};
  for (let i = 0; i < 20; i++) {
    const st = await page.evaluate(estadoJogo);
    const som = await page.evaluate(ultimo);

    if (st.alvo.tipo === 'acorde') {
      // Maior ou menor: o que sai é o acorde inteiro, e a TERÇA tem de bater
      // com a qualidade anunciada. Terça maior = 4 semitons da fundamental;
      // menor = 3. Errar isso ensinaria a pessoa ao contrário.
      acordes++;
      posicoes.push(st.pergunta);
      const tocado = som.acordes[0] || {};
      // A distância fundamental → terça, em semitons. O cálculo usa a própria
      // função de altura do site (as cifras saem com sustenido ou bemol
      // conforme o tom, então contar pelo nome escrito daria erro).
      const semitons = await page.evaluate(() => {
        const t = (window.__tocado[window.__tocado.length - 1].acordes || [])[0];
        if (!t || !t.tones || t.tones.length < 2) return -1;
        const pc = window.IL.theory.pitchClassOf;
        return (12 + pc(t.tones[1]) - pc(t.tones[0])) % 12;
      });
      const esperaTerca = st.alvo.q === 'maior' ? 4 : 3;
      if (tocado.root !== st.alvo.fund || semitons !== esperaTerca) acordesErrados++;
      // um acorde só, e nenhuma nota solta por cima
      if (som.acordes.length !== 1 || som.notas.length !== 0) soltos++;
      await page.click('.ouv-grau[data-v="' + st.alvo.q + '"]');
    } else {
      const tonica = 60 + PC[st.tom];
      const esperado = tonica + st.alvo.st;
      if (som.notas.length !== 1 || som.notas[0] !== esperado) erradas++;
      // a referência: o acorde da tônica, antes da nota
      if (!som.acordes.length || som.acordes[0].root !== st.tom) semReferencia++;
      vistos[st.alvo.rot] = (vistos[st.alvo.rot] || 0) + 1;
      conferidas++;
      await page.click('.ouv-grau[data-v="' + st.alvo.st + '"]');
    }

    await page.waitForTimeout(90);
    await page.click('[data-act="proxima"]');
    await page.waitForTimeout(260);
    // fechou a rodada: recomeça para seguir conferindo
    if (await page.$('[data-act="comecar"]')) {
      await page.click('[data-act="comecar"]');
      await page.waitForTimeout(400);
    }
  }
  ok(erradas === 0, 'em ' + conferidas + ' perguntas de grau, a nota tocada foi sempre o grau da pergunta (' + erradas + ' erros)');
  ok(semReferencia === 0, 'e a referência (o acorde da tônica) tocou antes em todas — é o que torna o ouvido relativo');
  ok(Object.keys(vistos).length >= 2, 'o sorteio varia os graus: ' + JSON.stringify(vistos));

  // maior ou menor, dentro do nível 1 (pedido do dono em 25/10/2026)
  ok(acordes >= 5, 'o nível 1 também pergunta maior ou menor (' + acordes + ' acordes em 20 perguntas)');
  ok(acordesErrados === 0, 'e a terça do acorde tocado bate com a qualidade anunciada (' + acordesErrados + ' erros)');
  ok(posicoes.every((n) => n % 3 === 0), 'vindo de três em três perguntas (posições ' + posicoes.join(', ') + ')');
  ok(soltos === 0, 'e vem sozinho, sem a referência da tônica por cima — a resposta está dentro do acorde (' + soltos + ' com enfeite)');

  // ---------- a rodada perfeita abre o nível seguinte ----------
  let s = await page.evaluate(estadoJogo);
  ok(s.liberado[2] === true, 'dez acertos em dez abriram o nível 2');
  const destrancados = await page.$$eval('.ouv-nivel', (e) => e.filter((x) => !x.disabled).length);
  ok(destrancados === 2, 'e o botão do nível 2 destravou na tela (' + destrancados + ' abertos)');

  // ---------- o nível aberto fecha em 24 horas ----------
  // Pedido do dono (25/10/2026): ouvido não se guarda, se mantém — todo dia a
  // pessoa recomeça do nível 1. Aqui o relógio é envelhecido à mão.
  const avisoPrazo = await page.$eval('.ouv-prazo', (e) => e.textContent.replace(/\s+/g, ' '));
  ok(/24 horas/.test(avisoPrazo), 'a tela avisa que o nível fecha em 24 horas: "' + avisoPrazo.slice(0, 60) + '…"');
  const guardado = await page.evaluate(() => localStorage.getItem('improvix:ouvido'));
  ok(/"2":\s*\d{10,}/.test(guardado || ''), 'a abertura do nível 2 fica guardada com a hora (' + guardado + ')');
  const falta = await page.$eval('.ouv-nivel[data-n="2"]', (e) => e.textContent);
  ok(/fecha em/.test(falta), 'e o botão mostra quanto falta para fechar ("' + falta.trim() + '")');

  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('improvix:ouvido'));
    Object.keys(d).forEach((k) => { d[k] = Date.now() - 25 * 3600 * 1000; });
    localStorage.setItem('improvix:ouvido', JSON.stringify(d));
  });
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(400);
  await page.click('.nav-item[data-nav="ouvido"]', { noWaitAfter: true });
  await page.waitForTimeout(700);
  const depoisDe25h = await page.$$eval('.ouv-nivel', (e) => e.filter((x) => x.disabled).length);
  ok(depoisDe25h === 3, 'passadas 25 horas, os níveis de cima fecham de novo (' + depoisDe25h + ' trancados)');
  const voltou = await page.evaluate(() => window.IL.ouvido._state.nivel);
  ok(voltou === 1, 'e a pessoa volta para o nível 1 (está no ' + voltou + ')');

  // reabre para os testes seguintes, que precisam do nível 2
  await page.evaluate(() => {
    localStorage.setItem('improvix:ouvido', JSON.stringify({ 2: Date.now() }));
  });
  await page.click('.nav-item[data-nav="inicio"]');
  await page.waitForTimeout(300);
  await page.click('.nav-item[data-nav="ouvido"]', { noWaitAfter: true });
  await page.waitForTimeout(600);

  // ---------- os graus de cada nível ----------
  await page.click('.ouv-nivel[data-n="2"]');
  await page.waitForTimeout(300);
  await page.click('[data-act="comecar"]');
  await page.waitForTimeout(500);
  const botoes2 = await page.$$eval('.ouv-grau', (e) => e.map((x) => x.textContent.trim()));
  ok(botoes2.join(' ') === '1 3 5 7', 'o nível 2 pergunta as quatro notas da tétrade (' + botoes2.join(' ') + ')');

  // ---------- errar marca certo e errado ----------
  s = await page.evaluate(estadoJogo);
  const outro = [0, 4, 7, 11].filter((x) => x !== s.alvo.st)[0];
  await page.click('.ouv-grau[data-v="' + outro + '"]');
  await page.waitForTimeout(350);
  const marcas = await page.$$eval('.ouv-grau', (e) => e.map((x) => ({
    st: x.getAttribute('data-v'), certo: x.classList.contains('is-certo'), errado: x.classList.contains('is-errado')
  })));
  ok(marcas.filter((m) => m.certo).length === 1 && marcas.filter((m) => m.certo)[0].st === String(s.alvo.st),
    'errando, o grau certo acende em verde');
  ok(marcas.filter((m) => m.errado).length === 1 && marcas.filter((m) => m.errado)[0].st === String(outro),
    'e o que a pessoa apertou acende em vermelho');
  const txt = await page.$eval('.ouv-resposta', (e) => e.textContent);
  ok(/Era a /.test(txt) && txt.indexOf('grau ') > 0, 'com a resposta escrita por extenso: ' + txt.trim());

  // ---------- menos de 80% NÃO abre o próximo ----------
  // Erra as dez de propósito.
  await page.click('[data-act="proxima"]');
  await page.waitForTimeout(250);
  for (let i = 2; i <= 10; i++) {
    const st2 = await page.evaluate(estadoJogo);
    const errado = [0, 4, 7, 11].filter((x) => x !== st2.alvo.st)[0];
    await page.click('.ouv-grau[data-v="' + errado + '"]');
    await page.waitForTimeout(80);
    await page.click('[data-act="proxima"]');
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(400);
  const fim = await page.$eval('.ouv-fim', (e) => e.textContent.replace(/\s+/g, ' '));
  ok(/0%/.test(fim), 'uma rodada toda errada dá 0% (' + fim.slice(0, 40) + '…)');
  s = await page.evaluate(estadoJogo);
  ok(!s.liberado[3], 'e NÃO abre o nível 3 — o piso de 80% vale');

  // ---------- trocar de tom transpõe ----------
  await page.selectOption('#ouv-tom', 'Eb');
  await page.waitForTimeout(400);
  ok(!(await page.$('.ouv-grau')), 'trocar de tom recomeça a rodada, em vez de deixar uma pergunta injusta no ar');
  await page.click('[data-act="comecar"]');
  await page.waitForTimeout(500);
  const sEb = await page.evaluate(estadoJogo);
  const somEb = await page.evaluate(ultimo);
  ok(somEb.acordes.length === 1 && somEb.acordes[0].root === 'Eb',
    'a referência passou a ser o acorde de Eb (' + (somEb.acordes[0] || {}).root + ')');
  ok(somEb.notas[0] === 60 + PC.Eb + sEb.alvo.st,
    'e a nota saiu transposta junto (MIDI ' + somEb.notas[0] + ', grau ' + sEb.alvo.rot + ' de Eb)');

  // ---------- quem está logado tem o progresso guardado ----------
  // O jogo reaproveita a tabela `progresso` que já existe, com a chave
  // 'ouvido:n1' — nenhuma mudança no banco. O banco guarda a NOTA (é o
  // histórico); quem decide o que está aberto é o relógio de 24 h no
  // navegador. Aqui o teste confere que a linha chega mesmo lá.
  const { prepararPagina, entrar } = require('./fake-supabase.js');
  const ctx = await browser.newContext({ viewport: { width: 1340, height: 1000 } });
  const p2 = await ctx.newPage();
  p2.on('pageerror', (e) => erros.push('pageerror(logado): ' + e.message));
  await p2.addInitScript(ESCUTA);
  await prepararPagina(p2);
  await p2.goto(URL, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(900);
  await entrar(p2, 'alex@teste.com', true);          // o primeiro cadastro é o admin
  await p2.waitForTimeout(700);
  await p2.click('.nav-item[data-nav="ouvido"]', { noWaitAfter: true });
  await p2.waitForTimeout(700);
  await p2.click('[data-act="comecar"]');
  await p2.waitForTimeout(400);
  for (let i = 0; i < 10; i++) {
    const st3 = await p2.evaluate(estadoJogo);
    await p2.click('.ouv-grau[data-v="' + (st3.alvo.tipo === 'acorde' ? st3.alvo.q : st3.alvo.st) + '"]');
    await p2.waitForTimeout(80);
    await p2.click('[data-act="proxima"]');
    await p2.waitForTimeout(200);
  }
  await p2.waitForTimeout(700);
  const linha = await p2.evaluate(() => window.__fake.store.progresso
    .filter((r) => r.chave === 'ouvido:n1')[0] || null);
  ok(!!linha, 'logado, a rodada vai para o banco na chave "ouvido:n1"');
  ok(linha && linha.acerto === 100, 'com a nota da rodada (' + (linha && linha.acerto) + '%)');
  ok(linha && !!linha.gravado_em, 'e carimbada como feita — é o histórico da pessoa');
  await ctx.close();

  console.log('\nErros de página:', erros.length ? erros : 'nenhum');
  if (erros.length) falhas += erros.length;
  await browser.close();
  console.log(falhas ? '\n' + falhas + ' PROBLEMA(S)' : '\nTreine seu Ouvido ok.');
  process.exit(falhas ? 1 : 0);
})();
