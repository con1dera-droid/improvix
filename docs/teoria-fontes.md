# Teoria musical do zero — fontes e mapa do módulo de lições

Em 24/10/2026 o dono do projeto mandou quatro PDFs com o pedido explícito:
*"é para você pegar toda teoria musical que precisa pra gente fazer esse
módulo de lições futuramente, quando eu lhe pedir, de uma forma completa"*.

Este documento é o que sobrevive desse envio: **o mapa**, não o conteúdo.
Quem for construir o módulo começa por aqui.

## A regra, antes de tudo

Os quatro materiais são **de outros autores**, e dois deles trazem aviso
expresso de proibição de reprodução e compartilhamento. Vale aqui a mesma
regra já adotada em `docs/fraseados-referencias.md`, quando onze materiais
alimentaram o gerador de frases:

> O sistema aprende os **princípios** e **recalcula** tudo. Nenhum trecho de
> texto, exercício, figura ou partitura dos livros é copiado para o código ou
> para o site.

Na prática, para as lições:

* **Pode**: usar a *ordem dos assuntos* e a *lista do que precisa ser
  ensinado*. A teoria musical em si é fato público — as sete notas, a fórmula
  T-T-st-T-T-T-st, o campo harmônico maior estão em todo método que existe, e
  nenhum autor é dono disso.
* **Não pode**: copiar a redação, reescrever parágrafo por parágrafo trocando
  palavras (isso continua sendo cópia), reproduzir as tabelas, os desenhos, os
  exercícios inventados pelo autor, nem os enunciados de prova.
* **Os PDFs não entram no repositório.** O repositório é público (GitHub +
  Vercel): subir os arquivos seria redistribuí-los. Eles ficam com o dono, nos
  arquivos dele.

O texto das lições do IMPROVIX é escrito do zero, de preferência com a voz do
professor dono do projeto — foi o combinado.

## O que cada material é, e para que serve aqui

| Material | O que é | Serventia para o módulo |
|---|---|---|
| **Apostila CBMMA — Soldado Músico** (Desbanquei, 130 pág.; material pago, com aviso de proibição de compartilhamento) | Preparatório de concurso. O Módulo 15 é *Teoria da Música*: propriedades do som, notação e claves, figuras e pausas, compassos, tom e semitom, escalas e armaduras, intervalos, andamento e dinâmica — "do zero à leitura musical". | **É a peça que faltava.** Confirma a sequência clássica do início absoluto, que é justamente onde as 10 aulas atuais do IMPROVIX não chegam. Serve como conferência de cobertura: nenhum assunto básico de fora. |
| **Método de harmonia, formação de acordes e escalas para improvisação** — Gilmar de Souza Damião (167 pág.) | Método de harmonia aplicado a violão/guitarra. Veio **em duplicata** (dois arquivos, mesmo md5). Já tinha sido usado em 10/09/2026 para o gerador de frases. | Cobre do intermediário ao avançado: cifras, acidentes, enarmonia, tríades e tétrades, campo harmônico maior e menor (eólio, dórico, melódica, harmônica), funções harmônicas em sete partes, dominantes secundários, SubV7, II cadencial, diminutos, modulação, inversões, modos e pentatônicas com aplicação. É o **esqueleto do que vem depois** da trilha do zero. |
| **Padrões tradicionais da linguagem jazzista** — Jessivaldo Oliveira da Silva (10 pág.) | Padrões melódicos de bebop sobre II–V–I, arpejos de tríades com efeito circular, saltos de 3ª e 6ª. | Já virou regra em `js/phrases.js` (técnica `parker`) em 10/09/2026. Para as lições, serve ao bloco final — "o que fazer com a teoria" —, não ao começo. |

## O buraco que o módulo precisa tapar

A tela **Aulas** já existe (`js/lessons.js`, 10 lições, com teste em
`tests/lessons.test.js` e exemplo que abre na Análise de Harmonia). Mas ela
começa em *campo harmônico e funções*, *dominantes secundários*, *ii–V–I* —
tudo isso pressupõe nota, intervalo, acorde e tom já sabidos.

Nota para quem for mexer: em 14/10/2026 o item **Aulas saiu do menu** quando a
ordem foi reorganizada a pedido do dono. A tela continua no `index.html`
(`data-view="aulas"`) e o módulo continua carregando — só não há como chegar
nela. Devolver o item ao menu é a primeira linha do trabalho.

## Mapa proposto da trilha "Teoria do zero"

Dezoito lições curtas até encostar nas que já existem. A ordem é a clássica,
confirmada pelos três materiais; o texto é nosso.

**Bloco 1 — O som (antes de qualquer papel)**

1. As quatro propriedades do som: altura, duração, intensidade, timbre.
2. As sete notas e por que elas se repetem — a oitava.
3. Tom e semitom; sustenido, bemol, bequadro; enarmonia (por que Dó# e Réb são
   a mesma tecla).
4. Onde isso mora: o braço do violão/guitarra e o teclado como mapa.

**Bloco 2 — A escrita**

5. Pauta, claves e linhas suplementares.
6. Figuras e pausas: cada uma vale metade da anterior.
7. Compasso e fórmula de compasso; simples × composto; por que o pé bate em 4.
8. Ligadura, ponto de aumento, andamento e dinâmica.

**Bloco 3 — As distâncias**

9. Intervalos: número e qualidade (justo, maior, menor, aumentado, diminuto).
10. Melódico × harmônico; consonância e dissonância.
11. A escala maior e a fórmula T-T-st-T-T-T-st.
12. Armadura de clave, ciclo de quintas, os doze tons.
13. A escala menor natural e a relativa.

**Bloco 4 — Os acordes**

14. Tríades: maior, menor, aumentada, diminuta.
15. Como se lê uma cifra: C, Cm, C7, C7M, Cm7(b5).
16. Tétrades e as sétimas.
17. Campo harmônico maior: os sete acordes de um tom.
18. Funções — tônica, subdominante, dominante — e o ii–V–I.

A partir da 18 começam, sem degrau, as 10 lições que já existem.

## O que o IMPROVIX pode fazer e uma apostila não

É isto que justifica refazer o conteúdo em vez de mandar um PDF ao aluno: cada
lição pode **soar** e **aparecer no instrumento**, reaproveitando motores que
já estão prontos.

| Na lição | O que já existe para usar |
|---|---|
| "Um semitom é a menor distância" → ouvir as duas notas | `js/audio.js` |
| "A escala maior é T-T-st-T-T-T-st" → ver na pauta e na tab, e tocar | `js/notation.js`, `js/scales.js` |
| "A tríade maior é 1-3-5" → ver os dedos no braço e no teclado | `js/chords.js` (Biblioteca de Acordes) |
| "Campo harmônico" → jogar a progressão na análise | `window.IL.ui.abrirHarmonia()`, já usado pelo campo `exemplo` das lições |
| Exercício no fim da lição | os 21 exercícios por escala da tela de Início |

Para isso o formato da lição (`js/lessons.js`) precisa aceitar, além do texto e
do `exemplo` atual: trechos para ouvir (notas ou graus), figura no braço/teclado
e um exercício de fechamento. É trabalho de estrutura, pequeno perto do
conteúdo.

## Ligação com o outro problema em aberto

Em 24/10/2026 o dono relatou que os alunos *"acham legal, super útil, porém se
perdem"* e passeiam sem fazer exercício. A trilha do zero é a resposta direta:
dá uma **porta de entrada óbvia** a quem chega. Ela depende do mesmo registro
de progresso que ficou combinado para os exercícios (✓ feito, "você está no 7
de 21", continue de onde parou) — ou seja, as duas frentes se encontram na
mesma tabela nova no Supabase. Vale construir o progresso uma vez e usá-lo nos
dois lugares.
