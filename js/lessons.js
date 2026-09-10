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
        'No Brasil é muito comum a cifra no padrão do Dicionário de Chediak, e o ImprovisaLab entende as duas formas: "7M" (ou "7+") é o mesmo que "maj7"; "m7(b5)" é o meio-diminuto; "°" é o diminuto (já com a 7ª diminuta); "m(7M)" é menor com 7ª maior; "7/4" ou "7(4)" é o dominante com 4ª suspensa; "6(9)" é o acorde de 6ª com 9ª.',
        'O que vem entre parênteses são as tensões: G7(b9), G7(b13), G7(#11), G7(#9), C7M(#11)... Elas não são enfeite: dizem qual escala usar. G7(b9) pede a escala dominante-diminuta, G7(#11) pede o lídio b7, G7(alt) pede a alterada — e o ImprovisaLab já escolhe a escala (e os fraseados) de acordo. Baixo invertido também funciona: D7/F# é um D7 com F# no baixo.',
        'No campo "Progressão de acordes" do ImprovisaLab, separe os acordes com "|", assim: "Gmaj7 | Em7 | Am7 | D7" ou "G7M | Em7 | Am7(9) | D7(b9)". O motor reconhece sustenidos (#) e bemóis (b) — "F#7" e "Gb7" funcionam igual.'
      ],
      exemplo: { tonalidade: 'G', modo: 'maior', progressao: 'G7M | Em7 | Am7(9) | D7(b9)' }
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
        'Na aba Escalas, cada acorde da sua progressão já vem com a escala mais indicada — no nível Avançado (Pro) você vê até 3 opções por acorde, para comparar as cores.',
        'Cada modo tem uma nota característica — a que o diferencia dos vizinhos: a 6ª maior no dórico, a 2ª menor no frígio, a #4 no lídio, a 7ª menor no mixolídio, a 6ª menor no eólio. Nos fraseados, o ImprovisaLab avisa quando a frase passa por ela: é a nota que "faz o modo soar".'
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
        'O ImprovisaLab detecta isso automaticamente: quando um acorde dominante tem a fundamental uma 5ª acima de um grau diatônico, ele é marcado como "Dominante secundário" em vez de simplesmente "fora do campo harmônico" — e ganha a escala certa para a resolução: se o alvo é menor (V7/ii, V7/iii, V7/vi), o mixolídio b9 b13; se é maior (V7/IV, V7/V), o mixolídio. O ImprovisaLab também reconhece o II cadencial que prepara esses dominantes (ex.: F#m7(b5) → B7 → Em7).'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C | A7 | Dm7 | G7' }
    },
    {
      id: 'tipos-de-frase',
      categoria: 'Fraseados',
      titulo: 'Como o ImprovisaLab monta os fraseados',
      resumo: 'Uma linha contínua, um compasso por acorde, com as notas do acorde nos tempos fortes e cada frase preparando a próxima.',
      corpo: [
        'Os fraseados não são frases soltas: são uma linha de improviso só, em colcheias (8 notas por compasso de 4/4), um compasso por acorde. Cada compasso começa numa nota do acorde (quase sempre a 3ª, a nota-alvo) e termina já "apontando" para a nota-alvo do acorde seguinte — é o que os métodos chamam de pensamento linear: tocar ATRAVÉS da harmonia, e não acorde por acorde isolado.',
        'Nos dois últimos tempos de cada compasso vem a aproximação da próxima nota-alvo: por grau conjunto (iniciante), com uma nota cromática por baixo, com um cerco (uma nota por cima e outra por baixo antes de cair no alvo) ou com aproximação cromática dupla (avançado).',
        'A categoria continua dizendo o papel do acorde: "melódica" na tônica, "blue" (pentatônica com a blue note) na tônica relativa e no blues, "conectando" nos acordes de preparação (subdominante, II cadencial), "tensão" nos dominantes — exclusiva do nível Avançado (Pro), com a alterada, a dominante-diminuta ou o mixolídio b9 b13, conforme a cifra — e a "resolução" final, com o cerco cromático à fundamental do primeiro acorde.',
        'O botão "🎲 Outra ideia" troca a técnica daquele compasso; o seletor "Padrão" fixa a mesma técnica na progressão inteira (ótimo para estudar um padrão em todos os acordes); e "▶ Tocar a linha inteira" toca o solo completo com o acompanhamento.'
      ],
      exemplo: { tonalidade: 'G', modo: 'maior', progressao: 'Gmaj7 | Em7 | Am7 | D7' }
    },
    {
      id: 'tecnicas-de-fraseado',
      categoria: 'Fraseados',
      titulo: 'Técnicas de fraseado jazzístico',
      resumo: 'Arpejo circular, arpejo 3-5-7-9, escala bebop, padrão 1-2-3-5, pentatônica superposta e cerco — o vocabulário por trás das frases.',
      corpo: [
        'Arpejo circular (princípio associado a Charlie Parker): sai de uma nota do acorde, salta uma 6ª para baixo (ou uma 3ª para cima) e sobe uma tríade da escala a partir dali; a última nota da tríade cai por grau conjunto em outra nota do acorde, e o giro recomeça. Em Dm7 | G7 | C7M, por exemplo, F salta até A, sobe A–C–E, cai em D, salta até F, sobe F–A–C e o C resolve meio tom abaixo em B, a 3ª do G7.',
        'Arpejo 3-5-7-9: em vez de arpejar a partir da fundamental, arpeja a partir da 3ª (em Cmaj7: E–G–B–D). Soa mais sofisticado porque evita a fundamental (que o baixo já toca) e traz a 9ª no topo.',
        'Escala bebop: a escala do acorde com uma nota cromática de passagem (7M no dominante, #5 no maior, 7M no menor). Descendo em colcheias a partir de uma nota do acorde, essa nota extra faz as notas do acorde caírem certinho nos tempos fortes.',
        'Padrão 1-2-3-5 (célula "digital"): quatro notas a partir da fundamental de cada acorde (em C: C–D–E–G). É um dos padrões mais usados para atravessar progressões rápidas — fixe-o no seletor "Padrão" e ouça ele se adaptando a cada acorde.',
        'Pentatônica superposta: tocar uma pentatônica que não é a "óbvia" do acorde para destacar as cores dele — a pentatônica maior da 5ª sobre o 7M (G sobre C7M: 7ª, 9ª e 13ª), a pentatônica menor da b3 sobre o dominante alterado (Bb menor sobre G7alt: #9, b5, b13, b7 e b9), a pentatônica menor da 2ª sobre o m7 dórico.',
        'Cerco (bordadura, ou "infra/ultrapolação" em volta da nota do acorde): atacar a nota-alvo por cima e por baixo antes de chegar nela — com uma nota da escala por cima e uma cromática por baixo, ou com as duas cromáticas. É o jeito mais clássico de "cair" na nota certa no tempo certo.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'Dm7 | G7 | C7M' }
    },
    {
      id: 'acorde-escala-avancado',
      categoria: 'Harmonia avançada',
      titulo: 'Menor melódica, menor harmônica e o dominante',
      resumo: 'Como a mesma cifra "7" pede escalas diferentes conforme para onde o acorde resolve — e o que as tensões da cifra mandam.',
      corpo: [
        'Além dos 7 modos da escala maior, a improvisação usa os modos da menor melódica (menor melódica, dórico b2, lídio aumentado, lídio b7, mixolídio b13, lócrio 9 e alterada), o 5º modo da menor harmônica (mixolídio b9 b13) e a escala simétrica dominante-diminuta (semitom-tom). Com elas dá para tocar sobre praticamente qualquer acorde do jazz e da MPB.',
        'O dominante é o caso mais rico. Um V7 que resolve num acorde maior (G7 → C) soa bem com o mixolídio (ou, para mais tensão, com a alterada). Um V7 que resolve num acorde menor (E7 → Am, ou o A7 que prepara o Dm7) pede o mixolídio b9 b13, que já traz as notas da tonalidade menor. O SubV7 (Db7 → C), o IV7 do blues e o bVII7 pedem o lídio b7. E se a cifra trouxer tensões, elas mandam: 7(b9) = dominante-diminuta, 7(b13) = mixolídio b13, 7(#11) = lídio b7, 7(alt) = alterada, 7(#5) = tons inteiros.',
        'Nos outros acordes: 7M no I grau = jônio, 7M nos demais graus = lídio; m7 no ii = dórico, no iii = frígio, no vi = eólio; m6 e m(7M) = menor melódica; m7(b5) diatônico = lócrio, e lócrio 9 nos demais; ° = diminuta (tom-semitom). É exatamente essa tabela que o ImprovisaLab usa para escolher as escalas e montar as frases.'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C7M | A7(b13) | Dm7 | G7(b9) | C7M | Db7 | C7M' }
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
