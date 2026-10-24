# Teoria musical do zero — fontes e mapa do módulo de lições

Em 24/10/2026 o dono do projeto mandou quatro PDFs com o pedido explícito:
*"é para você pegar toda teoria musical que precisa pra gente fazer esse
módulo de lições futuramente, quando eu lhe pedir, de uma forma completa"*.

Este documento é o que sobrevive desse envio: **o mapa**, não o conteúdo.
Quem for construir o módulo começa por aqui.

## A regra, antes de tudo

Dos quatro materiais, **um é do próprio dono do projeto**: a apostila do CBMMA,
publicada sob a marca Desbanquei, foi escrita por ele (informado em
24/10/2026). Com essa, não há limite nenhum — é material da casa, e as lições
podem nascer do texto dele, com a voz dele, que é justamente o que daria ao
curso uma cara própria em vez de cara de livro genérico.

Os **outros três são de outros autores** — o método do Damião (que veio em
duplicata) e os padrões de jazz do Jessivaldo. Nenhum dos dois traz aviso de
proibição no texto, mas são obras assinadas, com autor identificado, e isso
basta: vale a mesma regra já adotada em `docs/fraseados-referencias.md`, quando
onze materiais alimentaram o gerador de frases:

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
* **Vale para os três de terceiros, não para a apostila do dono.**
* **Os PDFs não entram no repositório.** O repositório é público (GitHub +
  Vercel): subir os de terceiros seria redistribuí-los. A apostila do dono ele
  pode publicar se quiser — mas são megabytes de PDF num repositório de site,
  então o lugar dela também não é aqui. O `.gitignore` ignora `*.pdf`.

O texto das lições do IMPROVIX é escrito do zero, de preferência com a voz do
professor dono do projeto — foi o combinado.

## O que cada material é, e para que serve aqui

| Material | O que é | Serventia para o módulo |
|---|---|---|
| **Apostila CBMMA — Soldado Músico** (Desbanquei, 130 pág.) — **de autoria do dono do projeto** | Preparatório de concurso. O Módulo 15 é *Teoria da Música*: propriedades do som, notação e claves, figuras e pausas, compassos, tom e semitom, escalas e armaduras, intervalos, andamento e dinâmica — "do zero à leitura musical". | **É a peça que faltava, e é nossa.** Cobre o início absoluto, justamente onde as 10 aulas atuais do IMPROVIX não chegam. Por ser do dono, serve como FONTE de texto, e não só como mapa: as lições do zero podem sair dela, adaptadas da prova de concurso para o estudo de improvisação. Ver a ressalva comercial abaixo. |
| **Método de harmonia, formação de acordes e escalas para improvisação** — Gilmar de Souza Damião (167 pág.) | Método de harmonia aplicado a violão/guitarra. Veio **em duplicata** (dois arquivos, mesmo md5). Já tinha sido usado em 10/09/2026 para o gerador de frases. | Cobre do intermediário ao avançado: cifras, acidentes, enarmonia, tríades e tétrades, campo harmônico maior e menor (eólio, dórico, melódica, harmônica), funções harmônicas em sete partes, dominantes secundários, SubV7, II cadencial, diminutos, modulação, inversões, modos e pentatônicas com aplicação. É o **esqueleto do que vem depois** da trilha do zero. |
| **Padrões tradicionais da linguagem jazzista** — Jessivaldo Oliveira da Silva (10 pág.) | Padrões melódicos de bebop sobre II–V–I, arpejos de tríades com efeito circular, saltos de 3ª e 6ª. | Já virou regra em `js/phrases.js` (técnica `parker`) em 10/09/2026. Para as lições, serve ao bloco final — "o que fazer com a teoria" —, não ao começo. |

## Uma ressalva que não é jurídica, é comercial

A apostila do CBMMA é um **produto que o dono vende**. Transpor o texto dela
para dentro de um site gratuito e público é decisão de negócio, não de direito
autoral — e vale pensar antes: parte do que se vende passaria a estar de graça,
a um clique, inclusive para quem compraria.

Caminhos possíveis, se isso incomodar:

* **Adaptar, não transpor.** A apostila é escrita para passar numa prova de
  concurso (questões A-E, "bizus", o que a banca cobra). O IMPROVIX ensina
  alguém a improvisar. É o mesmo assunto com outra finalidade, outro recorte e
  outros exemplos — o texto nasce diferente por necessidade, não por cautela.
* **Separar os públicos.** No site fica a trilha do zero voltada ao
  instrumento; a apostila continua sendo o produto de quem vai prestar
  concurso. Um pode até apontar para o outro.
* **Transpor mesmo.** Se o dono quiser, é direito dele — é obra dele.

Decisão do dono. Fica registrada aqui para que a sessão que construir o módulo
pergunte antes de simplesmente copiar.

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
