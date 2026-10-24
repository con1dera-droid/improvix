/**
 * IMPROVIX — Aulas (Etapa 5, parte 4)
 *
 * Conteúdo educacional estruturado: lições curtas que explicam a teoria por
 * trás do que o motor de análise (js/theory.js), o gerador de fraseados
 * (js/phrases.js) já mostra na tela. Módulo
 * livre — não depende de login nem de plano, ao contrário de Fraseados
 * Avançado.
 *
 * Cada lição pode trazer um `exemplo` (tonalidade/modo + progressão) para
 * "testar na prática" com um clique, reaproveitando o mesmo fluxo do
 * Análise de Harmonia (preenche o formulário e roda a análise).
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

  // ---------------------------------------------------------------------
  // Teoria do zero (24/10/2026) — 18 lições para quem não sabe nada.
  // Elas terminam exatamente onde as 10 lições antigas começam: a última
  // fecha em campo harmônico e ii–V–I, que é por onde 'campo-harmonico'
  // abre. Campos próprios destas: `nivel` ('zero') e `bloco` (O som, A
  // escrita, As distâncias, Os acordes), usados para agrupar a lista.
  // `ouvir` é uma lista de { rotulo, notas } — a tela monta um botão para
  // cada um e toca a sequência no instrumento escolhido.
  // ---------------------------------------------------------------------
  var LESSONS = [

  {
    id: 'propriedades-do-som',
    nivel: 'zero',
    bloco: 'O som',
    categoria: 'Teoria do zero',
    titulo: 'As quatro propriedades do som',
    resumo: 'Altura, duração, intensidade e timbre: as quatro coisas que você controla ao tocar.',
    corpo: [
      'Antes de falar de notas, escalas ou acordes, vale separar o que exatamente se controla quando se toca. Todo som musical tem quatro propriedades, e só quatro. Elas são independentes: você pode mudar uma e deixar as outras três iguais.',
      'A primeira é a altura. É o que faz um som ser grave ou agudo. Na corda, altura é comprimento e tensão: corda mais curta ou mais esticada soa mais agudo. É a propriedade que gera as notas, e por isso é a que a teoria musical mais estuda.',
      'A segunda é a duração. É quanto tempo o som dura, do ataque até sumir. Toda a escrita de ritmo, com suas figuras e pausas, existe para registrar duração. Uma mesma nota tocada curta ou longa muda completamente o caráter de uma frase.',
      'A terceira é a intensidade, o volume. Na partitura ela aparece como dinâmica, com indicações de piano e forte. No instrumento, é a força da palhetada, do dedo ou do toque na tecla. Improvisador que toca tudo no mesmo volume soa mecânico, mesmo acertando todas as notas.',
      'A quarta é o timbre, a cor do som. É o que permite reconhecer que uma nota saiu de um violão e não de um saxofone, mesmo sendo a mesma altura e a mesma duração. No seu instrumento, você muda timbre trocando de captador, de região do braço, de palheta ou de toque.',
      'Guarde essa divisão porque ela organiza tudo o que vem depois. As lições sobre notas, intervalos e escalas tratam de altura. As lições sobre figuras e compasso tratam de duração. Intensidade e timbre quase não aparecem na teoria escrita, mas são metade do que o ouvinte percebe.'
    ],
    ouvir: [
      { rotulo: 'Altura: cinco notas subindo, do grave para o agudo', notas: ['C', 'D', 'E', 'F', 'G'] },
      { rotulo: 'A mesma nota repetida: a altura não muda', notas: ['G', 'G', 'G', 'G'] }
    ]
  },
  {
    id: 'sete-notas-e-a-oitava',
    nivel: 'zero',
    bloco: 'O som',
    categoria: 'Teoria do zero',
    titulo: 'As sete notas e a oitava',
    resumo: 'Por que existem apenas sete nomes de nota e por que eles se repetem para sempre.',
    corpo: [
      'Os nomes das notas são sete: Dó, Ré, Mi, Fá, Sol, Lá, Si. Depois do Si vem outro Dó, e a contagem recomeça. Não existe uma oitava nota com nome novo, por mais que o instrumento continue subindo.',
      'O motivo é físico, não convenção. Quando a frequência de um som dobra, o ouvido humano escuta a mesma nota, só mais aguda. Se um Lá vibra a 440 vezes por segundo, o som a 880 vibrações é outro Lá, não uma nota diferente. Essa distância entre as duas é a oitava.',
      'Como a oitava fecha um ciclo, basta nomear o que existe dentro dela e repetir. Por isso o teclado é a mesma figura copiada de ponta a ponta: um grupo de duas teclas pretas, um grupo de três, e volta ao começo. No violão, o traste doze de qualquer corda dá a mesma nota da corda solta, uma oitava acima.',
      'A oitava é também o intervalo mais consonante depois do uníssono. Duas pessoas cantando a mesma melodia em oitavas soam como uma só, com mais corpo. É por isso que o baixo pode tocar a nota do acorde muito grave e ainda assim combinar.',
      'Na prática do instrumento isso tem uma consequência direta: aprender uma nota é aprender todos os lugares onde ela aparece. Decorar o braço nota por nota é trabalho dobrado se você não perceber que tudo se repete a cada doze trastes.'
    ],
    ouvir: [
      { rotulo: 'As sete notas de Dó a Dó, fechando a oitava', notas: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'] },
      { rotulo: 'Começando em Lá, as sete voltam ao Lá', notas: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'] }
    ]
  },
  {
    id: 'tom-semitom-e-acidentes',
    nivel: 'zero',
    bloco: 'O som',
    categoria: 'Teoria do zero',
    titulo: 'Tom, semitom e os acidentes',
    resumo: 'A menor distância entre duas notas, os sinais que a produzem e o que é enarmonia.',
    corpo: [
      'Entre as sete notas as distâncias não são iguais. De Dó para Ré existe um espaço maior do que de Mi para Fá. Esse espaço maior se chama tom; o menor se chama semitom, e é a menor distância usada na música ocidental.',
      'Os semitons naturais estão em dois lugares apenas: entre Mi e Fá e entre Si e Dó. Todas as outras vizinhas de nome, Dó-Ré, Ré-Mi, Fá-Sol, Sol-Lá, Lá-Si, estão a um tom de distância. No teclado isso fica visível: onde não há tecla preta entre duas brancas, a distância é de meio tom.',
      'No instrumento a medida é mecânica. No violão, na guitarra e no baixo, um traste é um semitom e dois trastes são um tom. No teclado, duas teclas vizinhas quaisquer, contando as pretas, estão a um semitom. Isso vale em qualquer corda e em qualquer região.',
      'Para alterar uma nota em um semitom existem os acidentes. O sustenido sobe meio tom; o bemol desce meio tom; o bequadro cancela a alteração e devolve a nota ao estado natural. Sustenido e bemol não são notas novas, são instruções aplicadas a uma das sete.',
      'Daí vem a enarmonia. Se eu subo meio tom a partir do Dó chego a Dó sustenido; se desço meio tom a partir do Ré chego a Ré bemol. Os dois caminhos terminam na mesma tecla, no mesmo traste, no mesmo som. Dó sustenido e Ré bemol são nomes diferentes para a mesma altura.',
      'Parece redundância, mas tem função. O nome escolhido depende do contexto, e um texto musical fica muito mais claro quando a nota é escrita com o nome que pertence àquela tonalidade. A lição sobre armadura de clave mostra por que, na prática, Fá sustenido e Sol bemol não aparecem nos mesmos tons.'
    ],
    ouvir: [
      { rotulo: 'Um semitom: Dó e Dó sustenido, notas vizinhas', notas: ['C', 'C#'] },
      { rotulo: 'Um tom: Dó e Ré, com uma tecla preta no meio', notas: ['C', 'D'] },
      { rotulo: 'Enarmonia: Dó sustenido e Ré bemol, o mesmo som', notas: ['C#', 'Db'] }
    ]
  },
  {
    id: 'onde-as-notas-moram',
    nivel: 'zero',
    bloco: 'O som',
    categoria: 'Teoria do zero',
    titulo: 'Onde as notas moram: braço e teclado',
    resumo: 'Como ler o braço do violão e o teclado como dois mapas da mesma coisa.',
    corpo: [
      'Teoria sem instrumento vira abstração. Vale gastar uma lição entendendo onde cada nota mora, porque é esse mapa que você vai usar toda vez que as lições seguintes falarem de distâncias.',
      'O teclado é o mapa mais honesto. Ele mostra as doze notas da oitava em fila, sem repetição, e marca com teclas pretas exatamente as notas alteradas. O grupo de duas pretas fica entre Dó e Mi; o grupo de três fica entre Fá e Si. Achando um grupo de duas, a branca à esquerda dele é um Dó.',
      'O braço de uma guitarra ou de um violão é o mesmo mapa enrolado em seis fileiras. Da corda mais grave para a mais aguda, as cordas soltas na afinação padrão são Mi, Lá, Ré, Sol, Si, Mi. O baixo de quatro cordas usa as quatro primeiras: Mi, Lá, Ré, Sol.',
      'Subindo traste por traste em qualquer corda você percorre semitom por semitom, passando pelas doze notas até chegar à oitava no traste doze. O traste cinco de uma corda dá a mesma nota da corda vizinha mais aguda solta, porque a afinação padrão separa as cordas por quartas justas. A única exceção é da terceira para a segunda corda, onde isso acontece no traste quatro.',
      'A diferença prática entre os dois instrumentos é esta: no teclado cada nota existe em um lugar só por oitava, no braço a mesma nota existe em vários lugares. Isso faz do teclado o melhor lugar para entender teoria e do braço o melhor lugar para encontrar digitações confortáveis. Quem estuda improvisação ganha muito em olhar os dois.'
    ],
    ouvir: [
      { rotulo: 'As seis cordas soltas do violão, da mais grave para a mais aguda', notas: ['E', 'A', 'D', 'G', 'B', 'E'] },
      { rotulo: 'Subindo traste por traste na corda mi, até a oitava', notas: ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E'] }
    ]
  },
  {
    id: 'pauta-claves-e-linhas',
    nivel: 'zero',
    bloco: 'A escrita',
    categoria: 'Teoria do zero',
    titulo: 'Pauta, claves e linhas suplementares',
    resumo: 'Como cinco linhas e um símbolo no início dizem exatamente qual nota tocar.',
    corpo: [
      'A pauta são cinco linhas paralelas e os quatro espaços entre elas. Nota mais em cima é nota mais aguda; nota mais embaixo é mais grave. Até aqui a pauta mostra a direção, mas não diz quais notas são.',
      'Quem resolve isso é a clave, o símbolo no começo da linha. Ela escolhe uma linha e dá nome a ela; o resto segue em ordem. A clave de sol enrola o desenho na segunda linha de baixo para cima e declara que ali é o Sol. A clave de fá marca com dois pontos a quarta linha e declara que ali é o Fá.',
      'Com a clave de sol definida, as notas nas cinco linhas, de baixo para cima, são Mi, Sol, Si, Ré e Fá; nos quatro espaços, Fá, Lá, Dó e Mi. Vale saber que essas nove posições se leem direto, sem contar, depois de algum tempo de prática. Não há truque que substitua a repetição aqui.',
      'Existem duas claves porque uma só não cobre a extensão dos instrumentos. Guitarra e violão usam clave de sol, soando uma oitava abaixo do escrito. Baixo usa clave de fá, também uma oitava abaixo. O teclado usa as duas ao mesmo tempo, uma para cada mão.',
      'Quando a nota passa do limite da pauta, acrescentam-se linhas suplementares, pequenos traços acima ou abaixo, que continuam a contagem. É uma extensão provisória da pauta, para não ter de trocar de clave por causa de duas notas. Mais de três ou quatro linhas suplementares seguidas já é sinal de que a escrita podia estar em outra clave ou em outra oitava.'
    ],
    ouvir: [
      { rotulo: 'As notas das cinco linhas na clave de sol: Mi, Sol, Si, Ré, Fá', notas: ['E', 'G', 'B', 'D', 'F'] },
      { rotulo: 'As notas dos quatro espaços: Fá, Lá, Dó, Mi', notas: ['F', 'A', 'C', 'E'] }
    ]
  },
  {
    id: 'figuras-e-pausas',
    nivel: 'zero',
    bloco: 'A escrita',
    categoria: 'Teoria do zero',
    titulo: 'Figuras e pausas',
    resumo: 'O sistema de durações da música escrita: cada figura vale metade da anterior.',
    corpo: [
      'A escrita do ritmo é um sistema de metades, e isso é tudo o que há para entender. Partindo da figura mais longa, cada figura seguinte dura exatamente metade da anterior. Não existe figura que valha um terço ou dois quintos; quando se precisa disso, usam-se recursos à parte.',
      'A ordem é esta: semibreve, mínima, semínima, colcheia, semicolcheia, fusa, semifusa. Uma semibreve vale duas mínimas, que valem quatro semínimas, que valem oito colcheias, e assim por diante. Na prática do dia a dia, você vai usar da mínima à semicolcheia quase sempre.',
      'O desenho de cada figura segue a mesma lógica de metades. A semibreve é uma cabeça vazia sem haste, a mínima ganha haste e a semínima tem a cabeça preenchida. A colcheia acrescenta um colchete, a semicolcheia dois, a fusa três. Olhando a figura você já sabe a duração relativa dela.',
      'Para cada figura existe uma pausa de valor idêntico. Pausa não é ausência de música, é silêncio medido: ele ocupa tempo no compasso exatamente como uma nota ocuparia. Improvisador iniciante erra muito mais por tocar demais do que por tocar pouco, e a pausa é a ferramenta que resolve isso.',
      'Os nomes das figuras são, honestamente, coisa de decorar. Não há um motivo profundo para que semínima se chame semínima. O que não é decoreba é a relação entre elas, e é essa relação que você precisa sentir: que uma colcheia é meia semínima, não só na conta, mas no pé batendo.'
    ]
  },
  {
    id: 'compasso-e-formula',
    nivel: 'zero',
    bloco: 'A escrita',
    categoria: 'Teoria do zero',
    titulo: 'Compasso e fórmula de compasso',
    resumo: 'Como a música se divide em grupos de tempos e o que significam os dois números.',
    corpo: [
      'Música sem agrupamento é uma fila de sons sem referência. O compasso é o agrupamento: um pacote de tempos que se repete, com o primeiro tempo mais forte que os outros. É esse acento no primeiro tempo que faz você saber onde a música está, mesmo sem contar.',
      'A fórmula de compasso são dois números no início da partitura e eles respondem duas perguntas. O número de cima diz quantas unidades cabem em um compasso. O número de baixo diz qual figura é essa unidade: 2 é a mínima, 4 é a semínima, 8 é a colcheia. Em 4 por 4, portanto, cabem quatro semínimas por compasso.',
      'Compasso simples é aquele em que cada tempo se divide naturalmente em dois. É o caso de 2 por 4, 3 por 4 e 4 por 4. Compasso composto é aquele em que cada tempo se divide em três, e aí as fórmulas aparecem com 6, 9 ou 12 em cima: 6 por 8 são dois tempos de três colcheias cada, não seis tempos.',
      'O 4 por 4 domina tanto a música popular que ganhou até o apelido de compasso comum. O motivo é prático: quatro é um número que o corpo divide fácil em dois mais dois, e isso serve bem a quem dança, a quem canta e a quem acompanha. Por isso o pé bate em quatro na maior parte do que você toca.',
      'Para improvisar, o compasso é mais importante do que parece. Saber em que tempo você está dentro do compasso é o que permite começar uma frase no lugar certo e terminar junto com a harmonia. Frase bonita entrando no tempo errado soa errada.'
    ],
    ouvir: [
      { rotulo: 'Quatro notas, uma por tempo: conte 1, 2, 3, 4', notas: ['C', 'G', 'E', 'G'] }
    ]
  },
  {
    id: 'ligadura-ponto-andamento-dinamica',
    nivel: 'zero',
    bloco: 'A escrita',
    categoria: 'Teoria do zero',
    titulo: 'Ligadura, ponto, andamento e dinâmica',
    resumo: 'Os quatro sinais que ajustam duração, velocidade e volume do que está escrito.',
    corpo: [
      'O sistema de figuras só produz durações que são metades umas das outras. Mas a música real precisa de uma nota que dure um tempo e meio, ou de uma nota que atravesse a barra de compasso. Para isso existem dois sinais simples.',
      'O ponto de aumento, colocado à direita da figura, acrescenta metade do valor dela. Uma semínima pontuada vale uma semínima mais uma colcheia, ou seja, um tempo e meio em 4 por 4. É a solução para durações que caem entre duas figuras.',
      'A ligadura de valor é um arco entre duas notas de mesma altura e soma as durações: toca-se a primeira e segura pelo tempo das duas. É o único jeito de uma nota continuar soando depois do fim do compasso. Existe também a ligadura de expressão, um arco sobre notas de alturas diferentes, que pede que elas sejam tocadas sem interrupção entre uma e outra.',
      'O andamento é a velocidade do pulso, e hoje se escreve em batidas por minuto. Os termos italianos antigos, como adagio, andante, moderato e allegro, continuam em uso e indicam faixas aproximadas, do muito lento ao rápido. Para estudar, o número do metrônomo é mais útil que o termo.',
      'A dinâmica é o volume. As letras vêm do italiano: p de piano, que é fraco, f de forte, e as combinações pp, mp, mf e ff para os graus intermediários. Os sinais de crescendo e diminuendo, dois ângulos abertos, pedem aumento ou redução gradual. Nada disso muda a nota, mas é o que separa uma execução viva de uma leitura correta e sem graça.'
    ]
  },
  {
    id: 'intervalos-numero-e-qualidade',
    nivel: 'zero',
    bloco: 'As distâncias',
    categoria: 'Teoria do zero',
    titulo: 'Intervalos: número e qualidade',
    resumo: 'Como medir a distância entre duas notas e nomeá-la com precisão.',
    corpo: [
      'Intervalo é a distância entre duas notas. Daqui para a frente, praticamente tudo em música é feito de intervalos: escalas são sequências deles, acordes são pilhas deles. Vale medir com cuidado, porque uma medida errada aqui erra todo o resto.',
      'Todo intervalo tem duas informações: um número e uma qualidade. O número sai da contagem dos nomes de nota, incluindo as duas pontas. De Dó a Mi conto Dó, Ré, Mi, três nomes, então é uma terça. De Dó a Sol conto cinco nomes, é uma quinta. O número ignora sustenidos e bemóis.',
      'A qualidade mede o tamanho exato, em semitons, e completa o nome. Segundas, terças, sextas e sétimas podem ser maiores ou menores: a menor tem um semitom menos que a maior. De Dó a Mi são quatro semitons, terça maior; de Dó a Mi bemol são três, terça menor.',
      'Uníssonos, quartas, quintas e oitavas não têm versão maior ou menor. Eles são chamados de justos, e são os intervalos mais estáveis. De Dó a Sol são sete semitons, quinta justa; de Dó a Fá são cinco, quarta justa.',
      'Fora disso, um intervalo pode ser aumentado ou diminuto. Aumentado é um semitom maior que o justo ou que o maior; diminuto é um semitom menor que o justo ou que o menor. De Dó a Sol bemol são seis semitons, quinta diminuta; de Dó a Fá sustenido também são seis, mas o nome é quarta aumentada, porque a contagem de nomes dá quatro.',
      'Esse último exemplo mostra por que o número e a qualidade andam juntos. Quinta diminuta e quarta aumentada soam idênticas, são o mesmo som, mas pertencem a contextos diferentes. O nome correto depende de como a nota foi escrita, e essa escolha carrega informação sobre para onde a música vai.'
    ],
    ouvir: [
      { rotulo: 'Terça maior e terça menor: Dó-Mi e Dó-Mi bemol', notas: ['C', 'E', 'C', 'Eb'] },
      { rotulo: 'Quinta justa e quinta diminuta: Dó-Sol e Dó-Sol bemol', notas: ['C', 'G', 'C', 'Gb'] },
      { rotulo: 'Os doze semitons de Dó até o Dó de cima', notas: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'C'] }
    ]
  },
  {
    id: 'melodico-harmonico-consonancia',
    nivel: 'zero',
    bloco: 'As distâncias',
    categoria: 'Teoria do zero',
    titulo: 'Melódico ou harmônico, consonante ou dissonante',
    resumo: 'Duas notas em sequência ou juntas, e por que algumas combinações pedem resolução.',
    corpo: [
      'O mesmo intervalo pode aparecer de duas formas. Quando as duas notas soam uma depois da outra, o intervalo é melódico; quando soam ao mesmo tempo, é harmônico. A medida é a mesma, mas o efeito no ouvido não é.',
      'Intervalo melódico ainda tem direção: ascendente, se a segunda nota é mais aguda, descendente se é mais grave. Essa distinção importa na prática do improviso, porque uma sexta subindo e uma sexta descendo soam como gestos completamente diferentes, embora sejam a mesma distância.',
      'Consonância e dissonância descrevem o quanto duas notas soando juntas parecem em repouso. Uníssono, oitava e quinta justa são as mais estáveis. Terças e sextas também soam bem e são o que dá cor aos acordes, por isso a harmonia ocidental é construída sobre terças.',
      'As dissonâncias são as segundas, as sétimas e o trítono, aquele intervalo de seis semitons que aparece como quarta aumentada ou quinta diminuta. Elas criam tensão, isto é, a sensação de que algo está pendente e precisa ir para outro lugar. Essa inquietação não é defeito: é o motor que faz a música andar.',
      'Uma ressalva honesta: consonância não é lei da natureza. Há uma base acústica, as relações simples entre frequências, mas o limite entre agradável e áspero mudou ao longo da história e muda entre estilos. A sétima, que já foi tratada como dissonância a ser resolvida, é hoje nota fixa do acorde no blues e no jazz.'
    ],
    ouvir: [
      { rotulo: 'Dó e Sol, quinta justa: repouso', notas: ['C', 'G'] },
      { rotulo: 'Dó e Fá sustenido, o trítono: tensão', notas: ['C', 'F#'] },
      { rotulo: 'Dó e Si, sétima maior: perto e tenso', notas: ['C', 'B'] }
    ]
  },
  {
    id: 'escala-maior',
    nivel: 'zero',
    bloco: 'As distâncias',
    categoria: 'Teoria do zero',
    titulo: 'A escala maior e sua fórmula',
    resumo: 'T-T-st-T-T-T-st: a receita que gera a escala maior em qualquer nota.',
    corpo: [
      'Escala é uma sequência ordenada de notas dentro de uma oitava. A escala maior é a mais importante de todas, não por ser mais bonita, mas porque é a régua: acordes, campos harmônicos e a numeração de graus que todo músico usa são medidos a partir dela.',
      'A escala maior tem uma fórmula fixa de distâncias entre notas vizinhas: tom, tom, semitom, tom, tom, tom, semitom. No instrumento, isso é dois trastes, dois trastes, um, dois, dois, dois, um. Essa é a única coisa que precisa ser sabida de verdade nesta lição.',
      'Aplicando a fórmula a partir do Dó, saem exatamente as sete notas naturais: Dó, Ré, Mi, Fá, Sol, Lá, Si e volta ao Dó. Isso não é coincidência. É o contrário: os nomes das notas foram organizados para que a escala de Dó maior não precise de nenhum acidente, e é por isso que ela cai nas teclas brancas.',
      'Comece a mesma fórmula em qualquer outra nota e vão aparecer acidentes. Partindo do Sol: Sol, Lá, Si, Dó, Ré, Mi e, para fechar o penúltimo tom, Fá sustenido antes do Sol. Com Fá natural, o intervalo daria um semitom no lugar de um tom e a escala soaria outra coisa.',
      'As notas da escala recebem números, chamados graus, do primeiro ao sétimo. O primeiro grau é a tônica, o centro de gravidade, onde a música descansa. O quinto é a dominante e o quarto é a subdominante, os dois pontos de apoio seguintes. O sétimo é a sensível, nota inquieta que puxa para a tônica logo acima.',
      'Daqui para frente, pensar em graus em vez de notas é o que permite transpor. Uma frase construída sobre o primeiro, o terceiro e o quinto graus funciona em qualquer tom, porque a fórmula é sempre a mesma; só o ponto de partida muda.'
    ],
    ouvir: [
      { rotulo: 'A escala de Dó maior, subindo', notas: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'] },
      { rotulo: 'A escala de Sol maior, com Fá sustenido', notas: ['G', 'A', 'B', 'C', 'D', 'E', 'F#', 'G'] },
      { rotulo: 'A mesma com Fá natural: a fórmula quebra', notas: ['G', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] }
    ]
  },
  {
    id: 'armadura-e-ciclo-de-quintas',
    nivel: 'zero',
    bloco: 'As distâncias',
    categoria: 'Teoria do zero',
    titulo: 'Armadura de clave e o ciclo de quintas',
    resumo: 'Como os acidentes do tom vão para o início da pauta e como achar os doze tons.',
    corpo: [
      'Se a escala de Sol maior tem Fá sustenido em todas as oitavas, escrever o sinal nota por nota é desperdício. A solução é a armadura de clave: os acidentes do tom aparecem uma vez, no começo da pauta, e valem para toda a música. Ver a armadura é a primeira coisa que se faz ao abrir uma partitura.',
      'Os acidentes da armadura não entram em ordem aleatória. Os sustenidos aparecem sempre nesta ordem: Fá, Dó, Sol, Ré, Lá, Mi, Si. Os bemóis aparecem na ordem exatamente inversa: Si, Mi, Lá, Ré, Sol, Dó, Fá. Um tom com três sustenidos tem obrigatoriamente Fá, Dó e Sol sustenidos, nunca outros três.',
      'O que organiza isso é o ciclo de quintas. Subindo de quinta em quinta a partir do Dó, chega-se a Sol, Ré, Lá, Mi, Si, Fá sustenido, e cada passo acrescenta um sustenido ao tom. Descendo de quinta em quinta, ou seja, subindo de quarta, vem Fá, Si bemol, Mi bemol, Lá bemol, Ré bemol, Sol bemol, e cada passo acrescenta um bemol.',
      'Com isso fecham-se os doze tons maiores, um para cada nota diferente da oitava. Alguns deles têm dois nomes possíveis, como Fá sustenido e Sol bemol, que são o mesmo som escrito de duas maneiras. Escolhe-se o nome que produz a armadura mais simples.',
      'Duas regras práticas economizam tempo. Em um tom com sustenidos, o último sustenido da armadura está um semitom abaixo da tônica. Em um tom com bemóis, o penúltimo bemol é a própria tônica. São atalhos de leitura, mas o ciclo de quintas continua sendo a explicação do porquê.',
      'Para quem improvisa, o ciclo tem outro uso. Tons vizinhos no ciclo compartilham quase todas as notas, e por isso soam próximos; tons distantes no ciclo soam distantes. Boa parte do que se chama de modulação é caminhar um ou dois passos nesse círculo.'
    ],
    ouvir: [
      { rotulo: 'O ciclo de quintas subindo: Dó, Sol, Ré, Lá, Mi, Si, Fá sustenido', notas: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'] },
      { rotulo: 'Para o outro lado, de quarta em quarta, até Sol bemol', notas: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'] },
      { rotulo: 'A escala de Fá maior, com Si bemol', notas: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E', 'F'] }
    ]
  },
  {
    id: 'escala-menor-natural-e-relativa',
    nivel: 'zero',
    bloco: 'As distâncias',
    categoria: 'Teoria do zero',
    titulo: 'A escala menor natural e a relativa',
    resumo: 'A outra escala básica, sua fórmula e por que ela divide notas com uma escala maior.',
    corpo: [
      'A escala menor natural tem a fórmula tom, semitom, tom, tom, semitom, tom, tom. A diferença em relação à maior está em três graus: o terceiro, o sexto e o sétimo aparecem um semitom mais baixos. O terceiro grau é o responsável principal pelo caráter mais escuro, porque é ele que define maior e menor.',
      'Aplicando essa fórmula a partir do Lá, saem Lá, Si, Dó, Ré, Mi, Fá, Sol e volta ao Lá. Nenhum acidente. São as mesmas sete notas da escala de Dó maior, na mesma ordem, só começando em outro ponto.',
      'É isso que significa relativa. Toda escala maior tem uma menor que usa exatamente as mesmas notas, e ela começa no sexto grau da maior, o que é o mesmo que uma terça menor abaixo da tônica. Dó maior e Lá menor são relativas; Sol maior e Mi menor também; Fá maior e Ré menor também.',
      'Na prática, isso explica uma coisa que confunde o iniciante: duas tonalidades podem ter a mesma armadura de clave. Nenhum sustenido e nenhum bemol pode querer dizer Dó maior ou Lá menor. Quem decide é a música: qual nota funciona como repouso, qual acorde começa e termina a peça.',
      'Para o improviso, a relativa é uma economia enorme. Os desenhos que você aprendeu na escala maior servem inteiros para a menor relativa, porque as notas são as mesmas. O que muda é onde você resolve a frase e quais notas você trata como alvo.',
      'Existem ainda a menor harmônica e a menor melódica, variações que alteram o sexto e o sétimo graus para criar uma sensível mais forte. Elas aparecem nas lições de nível intermediário, quando o assunto for harmonia menor. Para começar, a natural basta.'
    ],
    ouvir: [
      { rotulo: 'A escala de Lá menor natural, subindo', notas: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'] },
      { rotulo: 'As mesmas notas começando em Dó: Dó maior', notas: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'] },
      { rotulo: 'A tríade de Dó e a de Lá menor, nota por nota', notas: ['C', 'E', 'G', 'A', 'C', 'E'] }
    ]
  },
  {
    id: 'triades',
    nivel: 'zero',
    bloco: 'Os acordes',
    categoria: 'Teoria do zero',
    titulo: 'Tríades: maior, menor, aumentada, diminuta',
    resumo: 'Os quatro acordes de três notas que nascem do empilhamento de terças.',
    corpo: [
      'Acorde é um conjunto de notas soando junto. O acorde mais básico tem três notas e se chama tríade. Ela se monta empilhando duas terças, uma sobre a outra, e o resultado são os graus um, três e cinco contados a partir da nota de base.',
      'A nota de base é a fundamental e dá o nome ao acorde. A terça é a nota que define o caráter. A quinta é a que dá sustentação e, na maior parte dos casos, estabilidade. Trocando apenas a terça ou apenas a quinta por um semitom acima ou abaixo, chega-se aos quatro tipos possíveis.',
      'A tríade maior tem terça maior e quinta justa. Em Dó: Dó, Mi, Sol. Vista como duas terças empilhadas, é uma terça maior embaixo e uma menor em cima. É o acorde de som aberto e resolvido.',
      'A tríade menor tem terça menor e quinta justa. Em Dó: Dó, Mi bemol, Sol. A ordem das terças se inverte, a menor embaixo e a maior em cima. Note que a quinta não mudou: a diferença entre maior e menor é uma nota só, meio tom na do meio.',
      'A tríade aumentada tem terça maior e quinta aumentada, duas terças maiores empilhadas. Em Dó: Dó, Mi, Sol sustenido. A tríade diminuta tem terça menor e quinta diminuta, duas terças menores. Em Dó: Dó, Mi bemol, Sol bemol. As duas soam instáveis, e por isso costumam servir de passagem, não de repouso.',
      'Vale experimentar isso no instrumento, no mesmo lugar do braço, trocando uma nota de cada vez. Entender tríade como uma coisa que você modifica, e não como quatro formas separadas para decorar, é o que depois faz as cifras e o campo harmônico parecerem óbvios.'
    ],
    ouvir: [
      { rotulo: 'A tríade de Dó maior, nota por nota: Dó, Mi, Sol', notas: ['C', 'E', 'G'] },
      { rotulo: 'A tríade de Dó menor: Dó, Mi bemol, Sol', notas: ['C', 'Eb', 'G'] },
      { rotulo: 'Aumentada e depois diminuta, nota por nota', notas: ['C', 'E', 'G#', 'C', 'Eb', 'Gb'] }
    ]
  },
  {
    id: 'como-se-le-uma-cifra',
    nivel: 'zero',
    bloco: 'Os acordes',
    categoria: 'Teoria do zero',
    titulo: 'Como se lê uma cifra',
    resumo: 'C, Cm, C7, C7M, Cm7(b5): o que cada parte do símbolo está mandando você tocar.',
    corpo: [
      'Cifra é a receita de um acorde escrita em poucas letras. Ela tem duas partes: a letra, que diz qual é a fundamental, e o sufixo, que diz que tipo de acorde construir sobre ela. Separar essas duas coisas resolve metade da confusão.',
      'As letras vêm do alfabeto e não dos nomes em português. A é Lá, B é Si, C é Dó, D é Ré, E é Mi, F é Fá, G é Sol. Acidentes acompanham a letra: F# é Fá sustenido, Bb é Si bemol. Isso é convenção internacional e não tem explicação musical, é só decorar o alfabeto a partir do Lá.',
      'O sufixo segue uma lógica. Letra sozinha, como C, é a tríade maior: Dó, Mi, Sol. Um m minúsculo, como Cm, baixa a terça e produz a tríade menor: Dó, Mi bemol, Sol. Só isso já cobre a maioria das cifras de uma música popular.',
      'Quando entra um número, ele é o grau que foi acrescentado ao acorde. C7 é a tríade maior com a sétima menor somada: Dó, Mi, Sol, Si bemol. Já C7M, que em outros países se escreve Cmaj7, usa a sétima maior: Dó, Mi, Sol, Si. A diferença é um semitom na última nota, e muda tudo: o C7 soa tenso e pede continuação, o C7M soa aberto e satisfeito.',
      'O que vem entre parênteses são alterações aplicadas depois. Cm7(b5) é um acorde menor com sétima, no qual a quinta foi baixada meio tom: Dó, Mi bemol, Sol bemol, Si bemol. Na mesma lógica se leem coisas como C7(b9) ou C7(#11), que aparecem nas lições seguintes.',
      'A regra geral é ler da esquerda para a direita, como uma instrução: pegue esta fundamental, monte este tipo de acorde, acrescente esta nota, altere aquela. Quem lê cifra assim nunca precisa de uma tabela.'
    ],
    ouvir: [
      { rotulo: 'C e depois Cm, nota por nota', notas: ['C', 'E', 'G', 'C', 'Eb', 'G'] },
      { rotulo: 'C7 e depois C7M: a diferença está na última nota', notas: ['C', 'E', 'G', 'Bb', 'C', 'E', 'G', 'B'] },
      { rotulo: 'Cm7(b5): Dó, Mi bemol, Sol bemol, Si bemol', notas: ['C', 'Eb', 'Gb', 'Bb'] }
    ],
    exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C | Am | Dm | G7' }
  },
  {
    id: 'tetrades-e-as-setimas',
    nivel: 'zero',
    bloco: 'Os acordes',
    categoria: 'Teoria do zero',
    titulo: 'Tétrades e as sétimas',
    resumo: 'O que acontece com o acorde quando se empilha uma quarta nota sobre a tríade.',
    corpo: [
      'Tétrade é um acorde de quatro notas. Monta-se continuando o empilhamento de terças: sobre a tríade de um, três e cinco, acrescenta-se mais uma terça, que cai no sétimo grau. Por isso tétrade e acorde com sétima são, na prática, a mesma coisa.',
      'A sétima muda a função do acorde mais do que o volume de notas sugere. A tríade é uma afirmação fechada; com a sétima, o acorde passa a ter uma opinião sobre o que vem depois. É a nota que indica direção, e é por isso que praticamente toda harmonia de jazz, bossa e blues trabalha com tétrades em vez de tríades.',
      'Os tipos mais usados vêm das combinações de terça, quinta e sétima. Maior com sétima maior é o 7M, como C7M: Dó, Mi, Sol, Si. Maior com sétima menor é o dominante, como C7: Dó, Mi, Sol, Si bemol. Menor com sétima menor é o m7, como Dm7: Ré, Fá, Lá, Dó.',
      'Dois tipos a mais fecham o essencial. O meio-diminuto, m7(b5), tem terça menor, quinta diminuta e sétima menor, como Bm7(b5): Si, Ré, Fá, Lá. O diminuto de sétima, escrito com um círculo, empilha três terças menores e sua sétima também é diminuta, como B diminuto: Si, Ré, Fá, Lá bemol.',
      'Entre todos, o dominante é o mais importante para quem improvisa. Entre a sua terça e a sua sétima há um trítono, aquele intervalo de seis semitons, e é essa tensão interna que cria a vontade de resolver. Guardar isso agora economiza explicação nas lições sobre funções e sobre o ii-V-I.'
    ],
    ouvir: [
      { rotulo: 'A tríade de Sol e depois G7, com a sétima', notas: ['G', 'B', 'D', 'G', 'B', 'D', 'F'] },
      { rotulo: 'Dm7, nota por nota: Ré, Fá, Lá, Dó', notas: ['D', 'F', 'A', 'C'] },
      { rotulo: 'C7M, nota por nota: Dó, Mi, Sol, Si', notas: ['C', 'E', 'G', 'B'] }
    ]
  },
  {
    id: 'campo-harmonico-maior-do-zero',
    nivel: 'zero',
    bloco: 'Os acordes',
    categoria: 'Teoria do zero',
    titulo: 'Campo harmônico maior',
    resumo: 'Como os sete acordes de uma tonalidade nascem da própria escala, sem nada de fora.',
    corpo: [
      'Campo harmônico é a lista dos acordes que pertencem a um tom. Ele não é uma tabela a decorar: é o resultado de uma operação simples feita sobre a escala. Quem entende a operação sabe montar o campo harmônico de qualquer tom sem consultar nada.',
      'A operação é esta: tome cada nota da escala como fundamental e empilhe terças usando apenas notas da própria escala, sem acidente de fora. Em Dó maior, começando no Dó, as terças disponíveis dão Dó, Mi, Sol. Começando no Ré, dão Ré, Fá, Lá. E assim por diante, sete vezes.',
      'O resultado em tríades, em Dó maior, é Dó maior, Ré menor, Mi menor, Fá maior, Sol maior, Lá menor e Si diminuto. Repare que a qualidade de cada acorde não foi escolhida por ninguém: ela saiu da fórmula da escala, que distribui tons e semitons de maneira desigual. Com sétimas, os mesmos sete acordes ficam C7M, Dm7, Em7, F7M, G7, Am7 e Bm7(b5).',
      'A sequência de qualidades é sempre a mesma em qualquer tom maior: maior, menor, menor, maior, maior, menor, meio-diminuto. Por isso se usa a numeração em graus, com romanos maiúsculos para os maiores e minúsculos para os menores: I, ii, iii, IV, V, vi e vii. Pensando em graus, uma progressão aprendida em Dó se transporta para qualquer tom na hora.',
      'Dois acordes do campo merecem atenção desde já. O V é o único dominante, o único que tem o trítono dentro, e é ele que cria a tensão da tonalidade. O vii é meio-diminuto e compartilha essa tensão, o que explica por que os dois costumam cumprir papéis parecidos.',
      'Vale jogar a progressão desta lição na análise de harmonia e olhar o campo inteiro na tela. Ver os sete acordes de uma vez é o que faz a ficha cair: não existem acordes soltos, existe um tom e os acordes que vivem nele.'
    ],
    ouvir: [
      { rotulo: 'As fundamentais dos sete acordes de Dó maior', notas: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
      { rotulo: 'As tríades do I, do IV e do V de Dó maior', notas: ['C', 'E', 'G', 'F', 'A', 'C', 'G', 'B', 'D'] },
      { rotulo: 'A tríade do vii grau: Si, Ré, Fá, diminuta', notas: ['B', 'D', 'F'] }
    ],
    exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C7M | Dm7 | Em7 | F7M | G7 | Am7 | Bm7(b5)' }
  },
  {
    id: 'funcoes-e-ii-v-i',
    nivel: 'zero',
    bloco: 'Os acordes',
    categoria: 'Teoria do zero',
    titulo: 'Funções harmônicas e o ii-V-I',
    resumo: 'Tônica, subdominante e dominante: o papel de cada acorde e a cadência mais usada.',
    corpo: [
      'Os sete acordes de um tom não são sete coisas diferentes para estudar. Eles se agrupam em três papéis, chamados funções harmônicas, e é esse agrupamento que explica por que certas progressões soam naturais e outras soam truncadas.',
      'A função de tônica é repouso. O I é o seu representante principal, e o vi e o iii funcionam como versões menos conclusivas do mesmo repouso. Quando a música chega num acorde de tônica, a sensação é de que ela poderia parar ali.',
      'A função de subdominante é afastamento. O IV e o ii são os seus representantes. Eles tiram a música do ponto de partida sem criar tensão forte, preparando o terreno. É o meio do caminho entre o repouso e a tensão.',
      'A função de dominante é tensão. O V é o representante central, com o vii como parceiro. A tensão vem do trítono entre a terça e a sétima do acorde: em G7, as notas Si e Fá. A terça quer subir meio tom para o Dó e a sétima quer descer meio tom para o Mi, e essas duas notas são justamente a tônica e a terça do acorde de Dó.',
      'Esse movimento é a razão de ser do ii-V-I, que em Dó maior é Dm7, G7, C7M. A progressão percorre os três papéis em ordem: afasta, cria tensão, resolve. Como a lógica é essa e não o acidente, o ii-V-I aparece em bossa, jazz, samba, música sertaneja e praticamente em tudo.',
      'Esta é a última lição da trilha do zero, e também o ponto em que ela encosta no que vem depois. As lições de nível intermediário partem exatamente daqui: campo harmônico, funções e o ii-V-I já sabidos, para então falar de modos, arpejos, notas-alvo, dominantes secundários e fraseados.'
    ],
    ouvir: [
      { rotulo: 'O trítono de G7, Si e Fá, resolvendo em Dó e Mi', notas: ['B', 'F', 'C', 'E'] },
      { rotulo: 'O ii-V-I de Dó maior, nota por nota: Dm7, G7, C7M', notas: ['D', 'F', 'A', 'C', 'G', 'B', 'D', 'F', 'C', 'E', 'G', 'B'] }
    ],
    exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'Dm7 | G7 | C7M' }
  },
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
      resumo: 'O que cada sufixo de cifra significa e como digitar progressões corretamente no IMPROVIX.',
      corpo: [
        'Uma cifra tem duas partes: a fundamental (a nota, ex.: "G") e a qualidade (o resto, ex.: "maj7"). A fundamental diz qual é a nota mais grave do acorde; a qualidade diz que tipo de acorde é.',
        'As qualidades mais comuns: nada ou "maj" é maior (G = sol maior); "m" ou "min" é menor (Gm); "7" sozinho é dominante — maior com sétima menor (G7); "maj7" é maior com sétima maior (Gmaj7); "m7" é menor com sétima menor (Gm7); "m7b5" (ou "ø") é meio-diminuto; "dim7" é diminuto com sétima diminuta.',
        'No Brasil é muito comum a cifra no padrão do Dicionário de Chediak, e o IMPROVIX entende as duas formas: "7M" (ou "7+") é o mesmo que "maj7"; "m7(b5)" é o meio-diminuto; "°" é o diminuto (já com a 7ª diminuta); "m(7M)" é menor com 7ª maior; "7/4" ou "7(4)" é o dominante com 4ª suspensa; "6(9)" é o acorde de 6ª com 9ª.',
        'O que vem entre parênteses são as tensões: G7(b9), G7(b13), G7(#11), G7(#9), C7M(#11)... Elas não são enfeite: dizem qual escala usar. G7(b9) pede a escala dominante-diminuta, G7(#11) pede o lídio b7, G7(alt) pede a alterada — e o IMPROVIX já escolhe a escala (e os fraseados) de acordo. Baixo invertido também funciona: D7/F# é um D7 com F# no baixo.',
        'No campo "Progressão de acordes" do IMPROVIX, separe os acordes com "|", assim: "Gmaj7 | Em7 | Am7 | D7" ou "G7M | Em7 | Am7(9) | D7(b9)". O motor reconhece sustenidos (#) e bemóis (b) — "F#7" e "Gb7" funcionam igual.'
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
        'Além dos modos, o IMPROVIX também recomenda escalas "de cor": a Alterada (super-Lócrio) para dominantes bem tensos, e as pentatônicas maior/menor, ótimas para frases mais simples e diretas, especialmente em power chords e acordes sem terça definida.',
        'Na aba Escalas, cada acorde da sua progressão já vem com a escala mais indicada — no nível Avançado (Pro) você vê até 3 opções por acorde, para comparar as cores.',
        'Cada modo tem uma nota característica — a que o diferencia dos vizinhos: a 6ª maior no dórico, a 2ª menor no frígio, a #4 no lídio, a 7ª menor no mixolídio, a 6ª menor no eólio. Nos fraseados, o IMPROVIX avisa quando a frase passa por ela: é a nota que "faz o modo soar".'
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
        'A aba Arpejos mostra o arpejo recomendado de cada acorde; a aba Notas-alvo já aponta direto qual nota mirar. No nível Avançado, o IMPROVIX também sugere um "arpejo substituto" — uma tríade construída a partir da 3ª do acorde, um jeito clássico de encontrar tensões interessantes sem sair da harmonia.'
      ],
      exemplo: { tonalidade: 'F', modo: 'maior', progressao: 'Fmaj7 | Bb7 | Fmaj7' }
    },
    {
      id: 'dominantes-secundarios',
      categoria: 'Harmonia avançada',
      titulo: 'Dominantes secundários (V7/x)',
      resumo: 'O "empréstimo" de dominante que aparece antes de quase qualquer grau — e como o IMPROVIX identifica isso.',
      corpo: [
        'Um dominante secundário é um acorde dominante (7) que não pertence à tonalidade, mas que funciona como o "V7" de um dos outros graus da música — não do V7 da tonalidade principal, e sim do V7 "emprestado" para resolver em outro grau.',
        'Exemplo clássico: em Dó maior, o ii é Dm7. Se em vez disso a progressão usa A7 antes do Dm7, esse A7 é o V7/ii (o dominante que resolveria naturalmente em Dm) — mesmo A7 não pertencendo ao campo harmônico de Dó maior.',
        'O IMPROVIX detecta isso automaticamente: quando um acorde dominante tem a fundamental uma 5ª acima de um grau diatônico, ele é marcado como "Dominante secundário" em vez de simplesmente "fora do campo harmônico" — e ganha a escala certa para a resolução: se o alvo é menor (V7/ii, V7/iii, V7/vi), o mixolídio b9 b13; se é maior (V7/IV, V7/V), o mixolídio. O IMPROVIX também reconhece o II cadencial que prepara esses dominantes (ex.: F#m7(b5) → B7 → Em7).'
      ],
      exemplo: { tonalidade: 'C', modo: 'maior', progressao: 'C | A7 | Dm7 | G7' }
    },
    {
      id: 'tipos-de-frase',
      categoria: 'Fraseados',
      titulo: 'Como o IMPROVIX monta os fraseados',
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
        'Cerco (bordadura, ou "infra/ultrapolação" em volta da nota do acorde): atacar a nota-alvo por cima e por baixo antes de chegar nela — com uma nota da escala por cima e uma cromática por baixo, ou com as duas cromáticas. É o jeito mais clássico de "cair" na nota certa no tempo certo.',
        'Para praticar cada técnica isolada, em qualquer escala e nos 12 tons, use a Biblioteca de Fraseados (menu lateral): escolha o estilo (Bebop, Jazz moderno, Blues, Modal, Rock, Baião), a escala e o tom, e peça quantas frases quiser — cada uma com partitura, tab, áudio e a explicação de qual vocabulário ela usa.'
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
        'Nos outros acordes: 7M no I grau = jônio, 7M nos demais graus = lídio; m7 no ii = dórico, no iii = frígio, no vi = eólio; m6 e m(7M) = menor melódica; m7(b5) diatônico = lócrio, e lócrio 9 nos demais; ° = diminuta (tom-semitom). É exatamente essa tabela que o IMPROVIX usa para escolher as escalas e montar as frases.'
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
        'Digite o blues inteiro na Análise de Harmonia para ver a função de cada acorde, e abra cada um deles na Biblioteca de Acordes para aprender a posição no seu instrumento.'
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
        'Uma variação mais sofisticada troca o vi por um dominante secundário (VI7, o V7/ii) — iii–VI7–ii–V —, criando um puxão cromático extra antes do ii–V. Digite os três giros na Análise de Harmonia para ouvir a diferença.'
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
