/**
 * IMPROVIX — Biblioteca de Acordes (motor)
 *
 * Dada uma cifra ("C7+", "Am7(b5)", "G7(b9)", "D7/F#"), devolve:
 *   - a leitura do acorde: notas, graus, fórmula, nome por extenso;
 *   - posições tocáveis no braço (violão/guitarra e baixo), CALCULADAS —
 *     não existe tabela de desenhos decorados aqui: o programa varre o
 *     braço, monta todas as combinações que soam o acorde e fica com as
 *     que uma mão humana alcança;
 *   - voicings de teclado (fundamental, inversões e o voicing de 3ª e 7ª
 *     que todo pianista usa quando há um baixista na banda).
 *
 * Funciona no navegador (window.IL.chords) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var theory = isNode ? require('./theory.js') : root.IL.theory;
  var data = isNode ? require('./data.js') : root.IL.data;
  var mod = factory(theory, data);
  if (isNode) module.exports = mod;
  root.IL = root.IL || {};
  root.IL.chords = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory, DATA) {
  'use strict';

  // Afinações (do bordão para a prima), em MIDI. As mesmas de js/notation.js —
  // repetidas aqui porque este módulo roda no Node, nos testes, sem DOM.
  var AFINACOES = {
    violao:   { cordas: [40, 45, 50, 55, 59, 64], nome: 'Violão',   rotulos: ['E', 'A', 'D', 'G', 'B', 'E'] },
    guitarra: { cordas: [40, 45, 50, 55, 59, 64], nome: 'Guitarra', rotulos: ['E', 'A', 'D', 'G', 'B', 'E'] },
    baixo:    { cordas: [28, 33, 38, 43],         nome: 'Baixo',    rotulos: ['E', 'A', 'D', 'G'] }
  };

  var CASAS = 15;          // até a casa 15; acima disso ninguém faz acorde
  var ABERTURA = 4;        // abertura máxima da mão, em casas (1ª à 4ª casa da forma)

  function pc(n) { return theory.pitchClassOf(n); }

  // ---------------------------------------------------------------------
  // 1) Leitura do acorde
  // ---------------------------------------------------------------------

  // Grau de cada nota a partir do intervalo [passos de letra, semitons].
  // Nota DO ACORDE: 1 2 3 4 5 6 7. As tensões (9, 11, 13) são contadas à
  // parte, em analisar() — é a diferença entre um C6 e um C7(13).
  var NUM = { 0: '1', 1: '2', 2: '3', 3: '4', 4: '5', 5: '6', 6: '7' };
  var NATURAL = { 0: 0, 1: 2, 2: 4, 3: 5, 4: 7, 5: 9, 6: 11 };

  var NUM_TENSAO = { 0: '1', 1: '9', 2: '3', 3: '11', 4: '5', 5: '13', 6: '7' };
  var LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  /** Quantas letras há do nome A até o nome B (C→E = 2, B→C = 1). */
  function passosDeLetra(de, para) {
    return ((LETRAS.indexOf(para.charAt(0)) - LETRAS.indexOf(de.charAt(0))) % 7 + 7) % 7;
  }

  function grauDe(passos, semitons, tensao) {
    var p = ((passos % 7) + 7) % 7;
    var dif = ((semitons - NATURAL[p] + 18) % 12) - 6;   // -6..+5
    var nome = (tensao ? NUM_TENSAO : NUM)[p];
    if (dif === 0) return (p === 6 && semitons === 11) ? '7M' : nome;
    if (dif === -1) return 'b' + nome;
    if (dif === 1) return '#' + nome;
    if (dif === -2) return 'bb' + nome;
    return nome;
  }

  // Pedaços que uma cifra pode ter depois da fundamental. O motor de análise
  // é tolerante de propósito (ele ignora o que não entende, para não travar
  // uma progressão inteira por causa de um acorde); aqui, não: se a pessoa
  // digitou "bobagem", ela precisa ouvir que não é uma cifra, e não ver um
  // acorde de si maior aparecer do nada.
  var PEDACOS = [
    'maj', 'Maj', 'MAJ', 'min', 'dim', 'aug', 'sus', 'add', 'alt', 'no',
    'm', 'M', '°', 'º', 'ø', '+', '-', '#', 'b', '(', ')', '/', ',', ' '
  ];

  function cifraBemEscrita(texto) {
    var t = String(texto || '').trim().replace(/º/g, '°').replace(/[–—−]/g, '-');
    var m = /^([A-Ga-g])(#{1,2}|b{1,2})?/.exec(t);
    if (!m) return false;
    var resto = t.slice(m[0].length);
    var bm = /\/([A-Ga-g](?:#|b)?)$/.exec(resto);          // baixo invertido
    if (bm) resto = resto.slice(0, bm.index);
    while (resto.length) {
      if (/^\d/.test(resto)) { resto = resto.replace(/^\d+/, ''); continue; }
      var achou = PEDACOS.filter(function (x) { return resto.indexOf(x) === 0; })
        .sort(function (a, b) { return b.length - a.length; })[0];
      if (!achou) return false;
      resto = resto.slice(achou.length);
    }
    return true;
  }

  /** Lê a cifra. Devolve null se não for uma cifra que o sistema entenda. */
  function analisar(cifra) {
    if (!cifraBemEscrita(cifra)) return null;
    var p = null;
    try { p = theory.parseChordSymbol(cifra); } catch (e) { p = null; }
    if (!p || !DATA.QUALITIES[p.quality]) return null;

    var q = DATA.QUALITIES[p.quality];
    var nomes = theory.chordNotes(p.symbol);
    if (!nomes.length) return null;

    // O grau sai do intervalo REAL de cada nota até a fundamental — não da
    // posição dela na lista. Em acordes como o 7alt a 5ª justa some e as
    // tensões entram no lugar: contar por posição trocaria tudo.
    //
    // 2ª, 4ª e 6ª têm dois nomes, e o certo depende do acorde: no Csus4 a
    // nota é a "4", no C7(11) a mesma nota é a "11"; no C6 é a "6", no
    // C7(13) é a "13". A regra abaixo é a que o músico usa.
    var temGrau = {};
    q.intervals.forEach(function (iv) { temGrau[((iv[0] % 7) + 7) % 7] = true; });
    function lerComoTensao(passos) {
      var pp = ((passos % 7) + 7) % 7;
      if (pp === 1) return !(temGrau[1] && !temGrau[2]);        // sus2 → "2"
      if (pp === 3) return !(temGrau[3] && !temGrau[2]);        // sus4 → "4"
      if (pp === 5) return !(temGrau[5] && !q.hasSeventh);      // C6, Cm6 → "6"
      return false;
    }

    var notas = nomes.map(function (nome, i) {
      var passos = passosDeLetra(p.root, nome);
      var semis = ((pc(nome) - pc(p.root)) % 12 + 12) % 12;
      return {
        name: nome, pc: pc(nome), fundamental: i === 0,
        grau: grauDe(passos, semis, lerComoTensao(passos))
      };
    });

    var baixo = p.bass || notas[0].name;
    return {
      cifra: p.symbol,
      fundamental: p.root,
      baixo: baixo,
      baixoInvertido: !!p.bass && pc(p.bass) !== pc(p.root),
      qualidade: p.quality,
      descricao: q.label,
      notas: notas,
      formula: notas.map(function (n) { return n.grau; }).join(' '),
      notasTexto: notas.map(function (n) { return n.name; }).join(' – ')
    };
  }

  // ---------------------------------------------------------------------
  // 2) Posições no braço
  // ---------------------------------------------------------------------

  /**
   * Varre o braço e devolve as posições tocáveis do acorde.
   *
   * Como funciona: para cada "janela" de 4 casas, cada corda pode tocar uma
   * nota do acorde (dentro da janela ou solta) ou ficar abafada. O programa
   * monta todas as combinações, joga fora o que mão nenhuma alcança e
   * ordena pelo que soa e pega melhor.
   */
  function posicoes(cifra, instrumento, maximo) {
    var info = analisar(cifra);
    var af = AFINACOES[instrumento];
    if (!info || !af) return [];

    var alvo = {};                                  // pc -> grau
    info.notas.forEach(function (n) { alvo[n.pc] = n.grau; });
    var pcsEssenciais = essenciais(info);
    var pcBaixo = pc(info.baixo);

    var achadas = [];
    for (var base = 0; base <= CASAS - ABERTURA; base++) {
      achadas = achadas.concat(naJanela(af, base, alvo, pcsEssenciais, pcBaixo, info));
    }

    achadas.sort(function (a, b) { return b.nota - a.nota; });
    return enxugar(achadas, maximo || 3);
  }

  /** Notas que o acorde não pode perder: fundamental, 3ª (ou 4ª sus) e 7ª. */
  function essenciais(info) {
    var out = [];
    info.notas.forEach(function (n) {
      if (/^(1|b?3|4|11)$/.test(n.grau) || /^(7|7M|b7)$/.test(n.grau)) out.push(n.pc);
    });
    if (!out.length) out = info.notas.slice(0, 2).map(function (n) { return n.pc; });
    return out;
  }

  function naJanela(af, base, alvo, essenciais, pcBaixo, info) {
    // opções de cada corda: casa (0 = solta) ou null (abafada)
    var opcoes = af.cordas.map(function (solta) {
      var lista = [null];
      for (var f = base; f < base + ABERTURA; f++) {
        if (f > CASAS) break;
        if (alvo[(solta + f) % 12] !== undefined) lista.push(f);
      }
      // Corda solta só faz sentido perto da pestana: ninguém toca um acorde
      // na casa 8 misturando cordas soltas — soa como outro acorde.
      if (base > 0 && base <= 3 && alvo[solta % 12] !== undefined) lista.push(0);
      return lista;
    });

    var out = [];
    var atual = [];
    (function combinar(i) {
      if (out.length > 600) return;                 // trava de segurança
      if (i === opcoes.length) {
        var v = avaliar(af, atual.slice(), base, alvo, essenciais, pcBaixo, info);
        if (v) out.push(v);
        return;
      }
      for (var k = 0; k < opcoes[i].length; k++) {
        atual.push(opcoes[i][k]);
        combinar(i + 1);
        atual.pop();
      }
    })(0);
    return out;
  }

  /** Dá nota a uma combinação de casas — ou devolve null se for impossível. */
  function avaliar(af, casas, base, alvo, essenciais, pcBaixo, info) {
    var soando = [];
    casas.forEach(function (f, i) { if (f !== null) soando.push({ corda: i, casa: f, midi: af.cordas[i] + f }); });
    if (soando.length < (af.cordas.length > 4 ? 4 : 3)) return null;

    // cordas abafadas no meio: só se dá para abafar com o dedo (uma só)
    var primeira = soando[0].corda, ultima = soando[soando.length - 1].corda;
    var buracos = 0;
    for (var c = primeira; c <= ultima; c++) if (casas[c] === null) buracos++;
    if (buracos > 1) return null;

    // A nota mais GRAVE tem de ser o baixo do acorde. Atenção: não é a da
    // corda mais grave — uma corda solta pode soar abaixo de uma corda mais
    // grave presa numa casa alta (ex.: ré solto embaixo de lá na 6ª casa).
    var maisGrave = soando.reduce(function (a, b) { return b.midi < a.midi ? b : a; });
    if (maisGrave.midi % 12 !== pcBaixo) return null;

    // toda nota essencial precisa estar presente
    var pcsTocados = soando.map(function (s) { return s.midi % 12; });
    for (var e = 0; e < essenciais.length; e++) {
      if (pcsTocados.indexOf(essenciais[e]) < 0) return null;
    }

    // a mão: casas presas (tirando soltas) dentro de 4 casas e com dedos que bastem
    var presas = soando.filter(function (s) { return s.casa > 0; });
    var min = Math.min.apply(null, presas.map(function (s) { return s.casa; }).concat([99]));
    var max = Math.max.apply(null, presas.map(function (s) { return s.casa; }).concat([-1]));
    if (presas.length && max - min >= ABERTURA) return null;

    var dedos = dedilhado(casas, presas, min, af.cordas.length);
    if (!dedos) return null;

    // --- nota de qualidade ---
    var distintos = {};
    pcsTocados.forEach(function (p) { distintos[p] = 1; });
    var quantasNotas = Object.keys(distintos).length;
    var faltam = info.notas.length - quantasNotas;

    var nota = 0;
    nota += quantasNotas * 10;                       // quanto mais nota do acorde, melhor
    nota -= faltam * 4;
    nota += soando.length * 3;                       // cordas soando
    nota -= buracos * 8;                             // buraco no meio atrapalha
    nota -= dedos.quantos * 4;                       // menos dedos, mais fácil
    if (dedos.pestana) nota -= 3;                    // pestana é mais difícil
    if (!presas.length) nota += 12;                  // acorde todo solto é ouro
    nota -= base * 0.6;                              // perto da pestana é mais usado
    // dobrar a fundamental na oitava soa cheio; dobrar a 7ª embola
    var graves = soando.slice(0, 2).map(function (s) { return alvo[s.midi % 12]; });
    if (graves[1] === '5' || graves[1] === '1') nota += 1.5;
    // A posição da pestana (primeiras casas, com cordas soltas) é a que todo
    // mundo aprende primeiro e a que mais se usa: ela vem na frente.
    if (base === 0) nota += 6;

    return {
      instrumento: af,
      casas: casas.slice(),
      dedos: dedos.mapa,
      pestana: dedos.pestana,
      casaBase: presas.length ? min : 0,
      notas: soando.map(function (s) {
        return { corda: s.corda, casa: s.casa, midi: s.midi, name: nomeDaNota(s.midi, alvo, info), grau: alvo[s.midi % 12] };
      }),
      midis: soando.map(function (s) { return s.midi; }),
      nota: nota
    };
  }

  /** O nome da nota como ela se escreve NESTE acorde (Bb e não A#). */
  function nomeDaNota(midi, alvo, info) {
    var p = midi % 12;
    for (var i = 0; i < info.notas.length; i++) if (info.notas[i].pc === p) return info.notas[i].name;
    return '?';
  }

  /**
   * Distribui os dedos (1 a 4). A pestana entra quando a casa mais baixa da
   * forma aparece em duas cordas ou mais — é assim que a mão resolve.
   */
  function dedilhado(casas, presas, min, nCordas) {
    var mapa = new Array(nCordas).fill(null);
    if (!presas.length) return { mapa: mapa, quantos: 0, pestana: false };

    var porCasa = {};
    presas.forEach(function (s) { (porCasa[s.casa] = porCasa[s.casa] || []).push(s.corda); });

    // Pestana: a casa mais baixa da forma em duas cordas ou mais. É o único
    // lugar onde o indicador consegue deitar.
    var pestana = (porCasa[min] || []).length >= 2;
    if (pestana) {
      // O indicador deitado prende TODAS as cordas entre a primeira e a
      // última da pestana — nenhuma delas pode estar solta. No papel existe;
      // a mão não faz.
      var naBarra = porCasa[min].slice().sort(function (a, b) { return a - b; });
      for (var c = naBarra[0]; c <= naBarra[naBarra.length - 1]; c++) {
        if (casas[c] === 0) return null;
      }
      naBarra.forEach(function (cor) { mapa[cor] = 1; });
    }

    // O que sobra ganha um dedo cada, da casa mais baixa para a mais alta.
    // Duas notas na mesma casa e em cordas vizinhas podem dividir um dedo
    // (meia-pestana), que é como se toca o F e o Bm de verdade.
    var restantes = presas.filter(function (s) { return !(pestana && s.casa === min); })
      .sort(function (a, b) { return a.casa - b.casa || a.corda - b.corda; });

    var grupos = [];
    restantes.forEach(function (s) {
      var ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.casa === s.casa && s.corda === ultimo.cordas[ultimo.cordas.length - 1] + 1) {
        ultimo.cordas.push(s.corda);
      } else {
        grupos.push({ casa: s.casa, cordas: [s.corda] });
      }
    });

    var dedo = pestana ? 2 : 1;
    for (var g = 0; g < grupos.length; g++) {
      if (dedo > 4) return null;                      // mão humana tem quatro
      grupos[g].cordas.forEach(function (cor) { mapa[cor] = dedo; });
      dedo++;
    }
    return { mapa: mapa, quantos: dedo - 1, pestana: pestana };
  }

  /**
   * Fica com a melhor posição de cada região do braço e devolve as três
   * melhores, da mais grave para a mais aguda — que é a ordem em que se
   * aprende: primeiro a da pestana, depois as de cima.
   */
  function enxugar(lista, maximo) {
    var melhorPorRegiao = {};
    lista.forEach(function (v) {
      var r = v.casaBase;
      if (!melhorPorRegiao[r] || melhorPorRegiao[r].nota < v.nota) melhorPorRegiao[r] = v;
    });
    var regioes = Object.keys(melhorPorRegiao).map(Number).sort(function (a, b) {
      return melhorPorRegiao[b].nota - melhorPorRegiao[a].nota;
    });
    var escolhidas = [];
    regioes.forEach(function (r) {
      if (escolhidas.length >= maximo) return;
      // duas posições a menos de 3 casas uma da outra são a mesma ideia
      if (escolhidas.some(function (o) { return Math.abs(o.casaBase - r) < 3; })) return;
      escolhidas.push(melhorPorRegiao[r]);
    });
    return escolhidas.sort(function (a, b) { return a.casaBase - b.casaBase; });
  }

  // ---------------------------------------------------------------------
  // 3) Teclado
  // ---------------------------------------------------------------------

  /**
   * Voicings de teclado. Além da posição fundamental e das inversões, entra
   * o voicing de 3ª e 7ª ("shell"): com um baixista na banda, o pianista
   * larga a fundamental e toca só as notas que dizem se o acorde é maior,
   * menor ou dominante. É o que se ouve em disco de jazz.
   */
  function teclado(cifra) {
    var info = analisar(cifra);
    if (!info) return [];

    var raiz = 48 + (pc(info.fundamental) - 48 % 12 + 12) % 12;   // C3 acima
    raiz = 48 + ((pc(info.fundamental) % 12) + 12) % 12;
    if (raiz > 59) raiz -= 12;

    function subindo(notas, de) {
      var out = [], ultimo = de - 1;
      notas.forEach(function (n) {
        var m = de + ((n.pc - de % 12) + 12) % 12;
        while (m <= ultimo) m += 12;
        ultimo = m;
        out.push({ midi: m, name: n.name, grau: n.grau });
      });
      return out;
    }

    var out = [];
    var fund = subindo(info.notas, raiz);
    out.push({
      id: 'fundamental',
      titulo: 'Posição fundamental',
      dica: 'As notas empilhadas em terças, da fundamental para cima. É daqui que se enxerga o acorde.',
      esquerda: [fund[0].midi],
      direita: fund.slice(1).map(function (n) { return n.midi; }),
      notas: fund
    });

    if (info.notas.length >= 3) {
      var inv = fund.slice(1).concat([{ midi: fund[0].midi + 12, name: fund[0].name, grau: fund[0].grau }]);
      out.push({
        id: 'inversao',
        titulo: '1ª inversão (a 3ª no baixo)',
        dica: 'Mesmo acorde, outra nota embaixo. Trocar de inversão é o que faz a mão andar pouco entre um acorde e outro.',
        esquerda: [inv[0].midi - 12],
        direita: inv.map(function (n) { return n.midi; }),
        notas: inv
      });
    }

    var terca = info.notas.filter(function (n) { return /^(b?3|4|11)$/.test(n.grau); })[0];
    var setima = info.notas.filter(function (n) { return /^(7M?|b7)$/.test(n.grau); })[0];
    if (terca && setima) {
      var mE = 36 + ((pc(info.baixo) - 36 % 12) + 12) % 12;
      mE = 36 + (((pc(info.baixo) % 12) + 12) % 12);
      if (mE > 47) mE -= 12;
      var t = 60 + (((terca.pc - 60) % 12) + 12) % 12;
      var s = t + (((setima.pc - t) % 12) + 12) % 12;
      if (s === t) s += 12;
      out.push({
        id: 'shell',
        titulo: 'Voicing de 3ª e 7ª (o do jazz)',
        dica: 'Mão esquerda só na fundamental, mão direita só na 3ª e na 7ª — as duas notas que dizem a qualidade do acorde. Com baixista na banda, é este que se toca.',
        esquerda: [mE],
        direita: [t, s],
        notas: [{ midi: mE, name: info.baixo, grau: '1' }, { midi: t, name: terca.name, grau: terca.grau }, { midi: s, name: setima.name, grau: setima.grau }]
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // 4) Baixo
  // ---------------------------------------------------------------------

  /**
   * No baixo não se toca o acorde empilhado: toca-se a linha. Então aqui
   * saem as notas do acorde no braço, numa posição só, mais a linha mais
   * usada (fundamental – 5ª – oitava) para a pessoa já sair tocando.
   */
  function baixo(cifra) {
    var info = analisar(cifra);
    var af = AFINACOES.baixo;
    if (!info) return null;

    // A fundamental mais confortável: a casa mais baixa possível, começando
    // pelo bordão. É assim que o baixista acha a nota.
    var pcRaiz = pc(info.baixo);
    var cand = [];
    af.cordas.forEach(function (solta, corda) {
      for (var casa = 0; casa <= 9; casa++) {
        if ((solta + casa) % 12 === pcRaiz) cand.push({ corda: corda, casa: casa, midi: solta + casa });
      }
    });
    // o baixo quer a nota mais grave possível e, empatando, a casa mais baixa
    cand.sort(function (a, b) { return a.midi - b.midi || a.casa - b.casa; });
    var melhor = cand[0];
    if (!melhor) return null;

    var raizMidi = af.cordas[melhor.corda] + melhor.casa;
    var alvo = {};
    info.notas.forEach(function (n) { alvo[n.pc] = n; });

    // tudo que cai na janela de 4 casas em volta da fundamental
    var notas = [];
    af.cordas.forEach(function (solta, c) {
      for (var f = Math.max(0, melhor.casa - 1); f <= melhor.casa + 3; f++) {
        var n = alvo[(solta + f) % 12];
        if (n) notas.push({ corda: c, casa: f, midi: solta + f, name: n.name, grau: n.grau });
      }
    });

    var quinta = info.notas.filter(function (n) { return n.grau === '5'; })[0];
    var linha = [{ midi: raizMidi, name: info.baixo, grau: '1' }];
    if (quinta) linha.push({ midi: raizMidi + (((quinta.pc - raizMidi) % 12) + 12) % 12, name: quinta.name, grau: '5' });
    linha.push({ midi: raizMidi + 12, name: info.baixo, grau: '1' });

    return {
      instrumento: af,
      casaBase: Math.max(0, melhor.casa - 1),
      raiz: { corda: melhor.corda, casa: melhor.casa, midi: raizMidi },
      notas: notas,
      linha: linha
    };
  }

  // ---------------------------------------------------------------------
  // 5) Sugestões
  // ---------------------------------------------------------------------

  // Acordes comuns, para quem não sabe o que digitar.
  var SUGESTOES = [
    { grupo: 'Para começar', cifras: ['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'E'] },
    { grupo: 'Com 7ª', cifras: ['C7M', 'Dm7', 'G7', 'Am7', 'Bm7(b5)', 'E7', 'A7', 'Cm7'] },
    { grupo: 'Cores', cifras: ['C6(9)', 'C7M(9)', 'G7(b9)', 'G7alt', 'C7M(#11)', 'Dm6', 'Am(7M)', 'C7(13)'] },
    { grupo: 'Com baixo trocado', cifras: ['C/E', 'G/B', 'D7/F#', 'F/G', 'Am/C', 'C7M/G'] }
  ];

  /** Mesmo acorde, outras grafias que a pessoa pode conhecer. */
  function apelidos(cifra) {
    var info = analisar(cifra);
    if (!info) return [];
    var q = info.qualidade, r = info.fundamental;
    var mapa = {
      major7: [r + '7M', r + 'maj7', r + '7+', r + 'M7'],
      minor7: [r + 'm7', r + 'min7', r + '-7'],
      dominant7: [r + '7'],
      halfDiminished: [r + 'm7(b5)', r + 'm7b5', r + 'ø'],
      diminished7: [r + '°', r + 'dim7'],
      minorMajor7: [r + 'm(7M)', r + 'mMaj7'],
      major: [r, r + 'M'],
      minor: [r + 'm', r + '-'],
      augmented: [r + '+', r + 'aug', r + '5#'],
      sus4: [r + 'sus4', r + '4'],
      sus2: [r + 'sus2', r + '9(no3)']
    };
    return (mapa[q] || []).filter(function (c) { return c.toLowerCase() !== info.cifra.toLowerCase(); });
  }

  return {
    AFINACOES: AFINACOES,
    SUGESTOES: SUGESTOES,
    analisar: analisar,
    cifraBemEscrita: cifraBemEscrita,
    posicoes: posicoes,
    teclado: teclado,
    baixo: baixo,
    apelidos: apelidos,
    grauDe: grauDe
  };
});
