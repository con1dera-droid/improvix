# Fraseados melhores — o que foi aproveitado dos materiais de estudo

Em 10/09/2026 o usuário enviou 11 materiais de referência (métodos de
harmonia, modos gregos, padrões de jazz, dicionários de acordes, voicings e
técnica de palhetada) para "alimentar o sistema" e gerar fraseados melhores.

**Como os materiais foram usados:** o sistema aprendeu os *princípios* —
regras de teoria musical, relação acorde-escala e técnicas de construção de
frases — e passou a **calcular** as frases a partir deles, para qualquer
progressão e tonalidade. Nenhum trecho de texto, exercício, lick ou
partitura dos livros foi copiado para o código ou para o site. Isso é
importante porque vários desses materiais são obras protegidas por direito
autoral (alguns trazem aviso de "distribuição proibida" ou licença
individual), e o IMPROVIX é um sistema público: ele pode ensinar os
mesmos conceitos, mas não pode redistribuir o conteúdo dos livros.

## Por material

| Material | O que virou regra no sistema | Onde |
|---|---|---|
| **Padrões tradicionais da linguagem jazzística** (J. O. da Silva) | Arpejo "circular" (nota do acorde → salto de 6ª abaixo ou 3ª acima → tríade da escala → cai por grau em outra nota do acorde); padrão cromático que encadeia a 3ª do próximo acorde; linhas em colcheias em 4/4; bordaduras. | `js/phrases.js` (técnica `parker`, aproximações) |
| **Visão Especial Guitarra / Fundamentos da Improvisação Melódica** (mesmo autor) | Mapa acorde-escala com as três escalas "indispensáveis" (maior natural, menor melódica, diminuta-dominante simétrica) e seus modos; trifonia sus2 (1-2-5) deslocada pela escala; notas do acorde como principais + notas vizinhas por baixo/entre/por cima (infra/inter/ultrapolação = cerco). | `js/data.js` (escalas novas + `scalesForChord`), `js/phrases.js` (`sus2_seq`, `cerco`) |
| **Método de harmonia, formação de acordes e escalas para improvisação** (G. S. Damião) — veio em duplicata | Aplicação de cada modo (maior, menor melódica, menor harmônica) por tipo de acorde; pentatônicas e onde aplicá-las (inclusive sobre sus4 e meio-diminuto); funções: dominantes secundários, SubV7, II cadencial, diminuto de passagem/auxiliar, empréstimo modal. | `js/data.js`, `js/theory.js` (análise funcional com o acorde seguinte) |
| **Dicionário de Acordes Cifrados** (A. Chediak) | Padrão brasileiro de cifra (7M, m7(b5), °, m(7M), 7/4, 6(9), tensões entre parênteses, baixo invertido) e a "escala de acorde" de cada categoria: jônio/lídio, dórico, lócrio 9, menor melódica, mixolídio, dominante-diminuta, lídio b7, tons inteiros, alterada, diminuta. | `js/theory.js` (`parseChordSymbol`), `js/data.js` |
| **Dicionário de Acordes** (Escola BoraGrovar) | Cobertura de ~110 tipos de acorde (com 9ª, 11ª, 13ª, 5ª aumentada/diminuta, sus, baixo invertido) — usado para testar que o leitor de cifras reconhece todos eles. | `tests/theory.test.js` |
| **Modos Gregos — curso completo** (P. Lobo) e **Modos Gregos Dominado** (E. Reis) | Nota característica de cada modo (6ª maior no dórico, 2ª menor no frígio, #4 no lídio, 7ª menor no mixolídio, 6ª menor no eólio...), destacada na explicação de cada frase. | `js/data.js` (`CHARACTERISTIC_NOTE`), `js/phrases.js` |
| **Voicings Sofisticados** (E. Damasio) | "Cores" de cada grau (9ª em quase todos, #11 no IV, sus no I/V/vi) — confirmou a escolha do lídio no IV e as notas de cor usadas nas pentatônicas superpostas. Os voicings em si (desenhos de acorde) ficam para uma futura melhoria do acompanhamento. | `js/data.js` |
| **250 Jazz Patterns** (E. Tate) | Abordagem por *motivos*: uma pequena ideia aplicada acorde por acorde (daí o seletor "Padrão", que fixa uma técnica na progressão inteira); estudos "todos em colcheias" para treinar pensamento linear (daí a linha contínua e o botão "Tocar a linha inteira"); organização por contexto (ii–V–I, ii–V7(b9), tritone substitution, turnarounds, pentatônicas, bebop, blues, escalas simétricas). | `js/phrases.js` (`motif`, `digital_1235`, `penta_superposta`, `simetrico_grupos`) |
| **Destrave sua Palhetada** (B. Gonçalves) | É um livro de técnica de mão direita (sincronia, palhetada alternada), com licença individual. Só a ideia genérica de padrões em grupos de 3 notas na pentatônica foi usada; o conteúdo específico não se aplica a um gerador de frases. | `js/phrases.js` (`penta_grupos3`) |

## O que mudou no sistema

1. **Leitor de cifras** entende o padrão brasileiro e as tensões (antes,
   `C7M` virava dominante, `Am7(b5)` virava m7 e `B°` virava maior).
2. **Escala de cada acorde** passou a olhar para onde o acorde resolve e
   para as tensões da cifra (ver lição "Menor melódica, menor harmônica e o
   dominante" em Aulas).
3. **Fraseados** viraram uma linha contínua de colcheias, um compasso por
   acorde, com 13 técnicas e 5 tipos de aproximação, notas do acorde nos
   tempos fortes, explicação de cada escolha, "Outra ideia", "Padrão" fixo
   e "Tocar a linha inteira" com acompanhamento.
4. **Aulas** ganharam duas lições novas (técnicas de fraseado; menor
   melódica/harmônica e o dominante) e duas foram atualizadas (cifras;
   como o sistema monta os fraseados).

## Biblioteca de Fraseados

A Biblioteca (`js/library.js`) usa os mesmos princípios, organizados como
os livros de padrões organizam o estudo: por escala, em todos os tons (ciclo
de 4ªs) e por estilo. Os "roteiros" de cada estilo são desenhos genéricos de
frase (arco sobe-e-desce, cerco + arpejo, arpejo circular encadeado,
grupeto + escala bebop, pergunta-e-resposta no blues, síncope do baião),
preenchidos por células calculadas para o acorde e a escala da vez — nenhum
lick dos livros foi transcrito. O filtro de musicalidade aplica as regras
dos materiais: notas do acorde nos tempos fortes, cromatismo de passagem
resolvendo por semitom, cerco da nota-alvo, resolução numa nota estável.

## Fusion — sweep picking (inspirado em Gambale)

Estilo reproduzível, licks não: o sistema usa os **princípios** públicos da
linguagem (sem transcrever frases de discos, livros ou vídeos):

- Arpejo varrido: uma nota por corda, palhetada contínua na mesma direção;
  vira na corda de cima com hammer-on/pull-off; sextinas como motor rítmico.
- "O modo como arpejos": para cada modo, os arpejos de 4 sons que nascem
  nos graus da escala são superpostos ao acorde (ex.: sobre C7 mixolídio,
  Em7(b5) a partir da 3ª, Gm7 a partir da 5ª), sempre explicados.
- 3 notas por corda com palhetada econômica ou legato; slides para mudar de
  posição; chegada com vibrato.

## Articulações

Cada estilo tem um perfil de probabilidade de técnicas (`js/articulation.js`):
blues e rock usam bend (1–2 semitons, só quando a nota de partida está na
escala), release e vibrato; fusion vive de legato (até 3 ligados seguidos);
bebop e baião quase não usam bend (linguagem de sopro/rabeca) e o bebop
usa notas fantasma nos contratempos. Hammer-on/pull-off só entre notas de
1 a 4 semitons; no teclado nada disso — só dinâmica.

## Exercícios de Padrões

O livro de padrões enviado (250 Jazz Patterns) inspirou só a organização do
módulo: categorias por acorde/cadência, ciclo de 4ªs e dificuldade
crescente. Os exercícios não foram copiados nem "levemente alterados" —
todos os 57 padrões foram escritos do zero com vocabulário comum (graus,
notas-guia, cercos, escala bebop, b9, alterada). Para estudar um exercício
específico do livro, o usuário pode digitar os graus no "padrão próprio" e
praticar nos 12 tons.

## Ideias dos materiais que ficaram para depois

- "Escala-arpejo" com notas vizinhas e os desenhos de 4 notas por corda
  (Visão Especial Guitarra) — as 4ªs justas já entraram na Biblioteca
  (célula "arpejo em quartas").
- Voicings de acompanhamento (drop 2, shell voicings) no áudio da
  progressão, em vez de acorde "cheio" (Voicings Sofisticados).
- Leitura transposta para sax/trompete (já registrada antes).
