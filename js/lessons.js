/**
 * ImprovisaLab — Aulas (Etapa 5, parte 4)
 *
 * Conteúdo educacional estruturado: lições curtas que explicam a teoria por
 * trás do que o motor de análise (js/theory.js), o gerador de fraseados
 * (js/phrases.js) e o Laboratório (js/lab.js) já mostram na tela. Módulo
 * livre — não depende de login nem de plano, ao contrário de Fraseados
 * Avançado e Laboratório.
 *
 * Cada lição pode trazer um `exemplo` (tonalidade/modo + progressão) para
 * "testar na prática" com um clique, reaproveitando o mesmo fluxo do
 * Laboratório (preenche o formulário e roda a análise).
 *
 * Dados apenas — funciona no navegador (window.IL.lessons) e no Node
 * (para o teste automatizado conferir a estrutura e o conteúdo).
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  }
  root.IL = root.IL || {};
  root.IL.lessons = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var LESSONS = [
    {
      id: 'campo-harmonico',
      categoria: 'Fundamentos',
      titulo: 'Campo harmônico e funções',
      resumo: 'Por que cada acorde de uma tonalidade tem um "papel" — e como isso aparece na aba Visão Geral.',
      corpo: [
        'O campo harmônico de uma tonalidade é a lista dos 7 acordes que "nascem" naturalmente das notas da escala — um para cada grau. Em Dó maior, por exemplo, os acordes são Cmaj7 (I), Dm7 (ii), Em7 (iii), Fmaj7 (IV), G7 (V), Am7 (vi) e Bm7b5 (vii°).',
        'Cada grau tem uma função — o "papel" que ele exerce na música: Tônica (I e vi, o ponto de descanso), Subdominante (ii e IV, o afastamento) e Dominante (V e vii°, a tensão que puxa de volta para a tônica). É exatamente essa coluna que a aba Visão Geral mostra ao lado de cada acorde da sua progressão.',
        'Saber a função de cada acorde ajuda a decidir como improvisar sobre ele: sobre a Tônica você pode "descansar" a frase, sobre a Dominante costuma valer a pena criar tensão (ver a lição sobre frases de tensão) antes de resolver.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'Cmaj7 | Dm7 | Em7 | Fmaj7 | G7 | Am7' }
    },
    {
      id: 'como-ler-cifras',
      categoria: 'Fundamentos',
      titulo: 'Como ler cifras (maj7, m7, 7, m7b5...)',
      resumo: 'O que cada sufixo de cifra significa e como digitar progressões corretamente no ImprovisaLab.',
      corpo: [
        'Uma cifra tem duas partes: a fundamental (a nota, ex.: "G") e a qualidade (o resto, ex.: "maj7"). A fundamental diz qual é a nota mais grave do acorde; a qualidade diz que tipo de acorde é.',
        'As qualidades mais comuns: nada ou "maj" é maior (G = sol maior); "m" ou "min" é menor (Gm); "7" sozinho é dominante — maior com sétima menor (G7); "maj7" é maior com sétima maior (Gmaj7); "m7" é menor com sétima menor (Gm7); "m7b5" (ou "ø") é meio-diminuto; "dim7" é diminuto com sétima diminuta.',
        'No campo "Progressão de acordes" do ImprovisaLab, separe os acordes com "|", assim: "Gmaj7 | Em7 | Am7 | D7". O motor reconhece sustenidos (#) e bemóis (b) — "F#7" e "Gb7" funcionam igual.'
      ],
      exemplo: { tonalidade: 'G', modo: 'maior', progressao: 'Gmaj7 | Em7 | Am7 | D7' }
    },
    {
      id: 'escalas-e-modos',
      categoria: 'Escalas',
      titulo: 'Escalas e modos: qual usar em cada acorde',
      resumo: 'Os 7 modos da escala maior (e mais alguns) explicados de forma direta — para usar a aba Escalas com confiança.',
      corpo: [
        'Um "modo" é a mesma escala maior, só que começando por uma nota diferente. Se você toca só as teclas brancas do piano começando em C, é Jônio (a escala maior "normal"); começando em D, é Dórico; em E, Frígio; em F, Lídio; em G, Mixolídio; em A, Eólio (o menor natural); em B, Lócrio.',
        'Cada modo tem uma "cor" e combina melhor com um tipo de acorde: Jônio com o Imaj7, Dórico com acordes menores (soa menos "triste" que o Eólio, por causa da 6ª maior), Mixolídio com acordes dominantes (7), Lídio com um IVmaj7 (a 4ª aumentada dá um brilho característico), Lócrio com o meio-diminuto (m7b5).',
        'Além dos modos, o ImprovisaLab também recomenda escalas "de cor": a Alterada (super-Lócrio) para dominantes bem tensos, e as pentatônicas maior/menor, ótimas para frases mais simples e diretas, especialmente em power chords e acordes sem terça definida.',
        'Na aba Escalas, cada acorde da sua progressão já vem com a escala mais indicada — no nível Avançado (Pro) você vê até 3 opções por acorde, para comparar as cores.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'Cmaj7 | Dm7 | G7' }
    },
    {
      id: 'arpejos-e-notas-alvo',
      categoria: 'Escalas',
      titulo: 'Arpejos e notas-alvo',
      resumo: 'Por que mirar a 3ª e a 7ª de cada acorde deixa qualquer frase com mais "cara" de improviso.',
      corpo: [
        'Um arpejo é o acorde tocado nota por nota, em vez de todas juntas — fundamental, 3ª, 5ª, 7ª. Praticar arpejos ajuda a "ouvir" o acorde por dentro, o que facilita construir frases que soam certas sobre ele.',
        'A nota-alvo é a nota que mais define o som de um acorde: quase sempre a 3ª (ela é que diz se o acorde é maior ou menor) ou a 7ª em acordes com sétima. Terminar ou começar uma frase bem em cima da nota-alvo do próximo acorde é um dos truques mais usados por improvisadores para fazer a frase "acompanhar" a harmonia.',
        'A aba Arpejos mostra o arpejo recomendado de cada acorde; a aba Notas-alvo já aponta direto qual nota mirar. No nível Avançado, o ImprovisaLab também sugere um "arpejo substituto" — uma tríade construída a partir da 3ª do acorde, um jeito clássico de encontrar tensões interessantes sem sair da harmonia.'
      ],
      exemplo: { tonalidade: 'F', modo: 'maior', progressao: 'Fmaj7 | Bb7 | Fmaj7' }
    },
    {
      id: 'dominantes-secundarios',
      categoria: 'Harmonia avançada',
      titulo: 'Dominantes secundários (V7/x)',
      resumo: 'O "empréstimo" de dominante que aparece antes de quase qualquer grau — e como o ImprovisaLab identifica isso.',
      corpo: [
        'Um dominante secundário é um acorde dominante (7) que não pertence à tonalidade, mas que funciona como o "V7" de um dos outros graus da música — não do V7 da tonalidade principal, e sim do V7 "emprestado" para resolver em outro grau.',
        'Exemplo clássico: em Dó maior, o ii é Dm7. Se em vez disso a progressão usa A7 antes do Dm7, esse A7 é o V7/ii (o dominante que resolveria naturalmente em Dm) — mesmo A7 não pertencendo ao campo harmônico de Dó maior.',
        'O ImprovisaLab detecta isso automaticamente: quando um acorde dominante tem a fundamental uma 5ª acima de um grau diatônico, ele é marcado como "Dominante secundário" em vez de simplesmente "fora do campo harmônico" — e ganha a escala mixolídia certa para soar bem na resolução.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C | A7 | Dm7 | G7' }
    },
    {
      id: 'tipos-de-frase',
      categoria: 'Fraseados',
      titulo: 'Os 5 tipos de frase que o ImprovisaLab gera',
      resumo: 'Melódica, blue, conectando, tensão e resolução — o que cada categoria de fraseado faz e quando ela aparece.',
      corpo: [
        '"Melódica" é a frase mais simples: percorre a escala do acorde de forma cantável, ótima para acordes de Tônica, onde a ideia é "descansar".',
        '"Blue" usa a nota "blue" (a 3ª ou 7ª abaixada) para dar um tempero de blues — o ImprovisaLab a usa sobre acordes de Tônica relativa.',
        '"Conectando" cria uma ponte entre dois acordes com uma aproximação cromática — usada em acordes de Subdominante, preparando o ouvido para o que vem a seguir.',
        '"Tensão" usa a escala Alterada sobre acordes Dominantes, para criar uma dissonância que "pede" resolução — resolve sempre na fundamental. É a categoria exclusiva do nível Avançado (Pro).',
        '"Resolução" é a frase final da progressão, ligando o último acorde de volta ao primeiro com um "cerco cromático" (a nota-alvo é atacada por cima e por baixo antes de "cair" nela) — a técnica mais clássica para fechar um improviso com impacto.'
      ],
      exemplo: { tonalidade: 'G', modo: 'maior', progressao: 'Gmaj7 | Em7 | Am7 | D7' }
    },
    {
      id: 'blues-e-turnarounds',
      categoria: 'Estilos',
      titulo: 'Blues de 12 compassos e turnarounds',
      resumo: 'Por que o blues usa "7" até no acorde de tônica, e o que é um turnaround.',
      corpo: [
        'O blues tradicional de 12 compassos usa I7, IV7 e V7 — repare que até o I e o IV, que numa harmonia "comum" seriam maiores, aqui viram acordes dominantes (com 7ª menor). É essa sonoridade "impura" que dá a cara do blues.',
        'A forma mais clássica é: 4 compassos de I7, 2 de IV7, 2 de I7, e um "turnaround" fechando o ciclo — geralmente V7-IV7-I7-V7 nos últimos 4 compassos, preparando a repetição do início.',
        'Você pode sortear um blues de 12 compassos pronto (em qualquer tonalidade) no Laboratório — é exclusivo do plano Pro — e mandar direto para a análise para ver a função de cada acorde e praticar em cima.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7' }
    },
    {
      id: 'ii-v-i-giros-jazz',
      categoria: 'Estilos',
      titulo: 'ii–V–I e os giros ("turnarounds") de jazz',
      resumo: 'A cadência mais tocada no jazz, e como ela vira giros mais elaborados.',
      corpo: [
        'O ii–V–I é a cadência mais comum do repertório de jazz: o ii7 (menor) puxa para o V7 (dominante), que resolve no Imaj7. Em Dó maior: Dm7 – G7 – Cmaj7.',
        'Um "giro" (turnaround) estende essa ideia para dar mais movimento a uma música: o mais clássico é I–vi–ii–V (Cmaj7 – Am7 – Dm7 – G7), que sai da tônica, passa pela tônica relativa e volta pro ii–V de sempre.',
        'Uma variação mais sofisticada troca o vi por um dominante secundário (VI7, o V7/ii) — iii–VI7–ii–V —, criando um puxão cromático extra antes do ii–V. O Laboratório tem os três giros prontos para sortear e testar em qualquer tonalidade.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'Cmaj7 | Am7 | Dm7 | G7' }
    }
  ];

  function byId(id) {
    for (var i = 0; i < LESSONS.length; i++) {
      if (LESSONS[i].id === id) return LESSONS[i];
    }
    return null;
  }

  return {
    LESSONS: LESSONS,
    byId: byId
  };
});
