# Status do projeto — ImprovisaLab

## Etapa 1 — ✅ Concluída (2026-09-10)
Motor de teoria musical (parser de cifras, campo harmônico maior/menor,
dominantes secundários, escalas/arpejos/notas-alvo recomendados) + tela de
análise (Visão Geral, Escalas, Arpejos, Notas-alvo) no layout de referência,
para teclado, guitarra e baixo. Site estático, sem login, sem custo.
24 testes automáticos (`tests/theory.test.js`).

## Etapa 2 — ✅ Concluída (2026-09-10)
Aba **Fraseados**: para cada acorde da progressão, gera uma frase idiomática
(melódica, blue, conectando ou tensão, conforme a função do acorde e o nível
escolhido) mais uma frase final de resolução ligando o último acorde de volta
ao primeiro, com cerco cromático. Cada frase é exibida em Tab (guitarra/baixo,
com escolha de corda/traste por condução de vozes), Partitura simplificada
(SVG com pauta e notas na posição certa) ou Cifra. 14 testes automáticos
(`tests/phrases.test.js`).

## Etapa 3 — ✅ Concluída (2026-09-10)
**Áudio**, via Web Audio API (sem arquivos de áudio, sem servidor, sem
custo):
- "Ouça a progressão" (painel lateral): toca o backing da harmonia (acorde +
  fundamental grave), destacando visualmente o acorde que está soando no
  momento; dá pra parar no meio a qualquer momento.
- Botão 🔊 Áudio em cada fraseado (aba Fraseados): toca a frase como linha
  melódica no timbre do instrumento selecionado (guitarra/baixo/teclado).

Smoke test automatizado via Chromium headless (`tests/audio.smoke.js`)
confirma que tocar/parar funciona sem erros, tanto na progressão quanto nos
fraseados.

## Etapa 4 — ✅ Concluída (2026-09-10)
**Contas de usuário**, via Supabase (Postgres + Auth + Row Level Security),
gratuito e opcional:
- Cadastro/login/logout (modal), cabeçalho mostra e-mail e plano (Gratuito
  por enquanto — planos pagos ficam para a Etapa 5).
- **Histórico**: salvar e listar análises feitas (botão 💾 na Visão Geral).
- **Favoritos**: marcar fraseados (botão ☆ na aba Fraseados) e revisitá-los
  (recarrega a análise e abre a frase certa).
- **Meus Exercícios**: adicionar fraseados para praticar, com status
  (Pendente/Praticando/Dominado).
- **Configurações**: dados da conta e sair.
- Sem configurar o Supabase, o site continua funcionando 100% como nas
  Etapas 1–3 (só os recursos de conta ficam desabilitados, com aviso).

Segurança: toda a separação entre usuários é feita por Row Level Security no
Postgres (`sql/schema.sql`), não por filtro no navegador — mesmo chamando a
API diretamente, o banco recusa acesso a dados de outro `user_id` (ver
`docs/matriz-rbac.md`).

Testes automáticos:
- `tests/etapa4.smoke.js` / `tests/etapa4.smoke2.js`: confirmam que o site
  funciona normalmente e mostra os avisos certos sem Supabase configurado.
- `tests/etapa4.e2e.js`: fluxo completo (cadastro → salvar histórico →
  favoritar → adicionar exercício → mudar status → logout) contra um
  cliente Supabase falso em memória, cobrindo toda a lógica de UI.
- **Fora do alcance deste ambiente**: testar a Row Level Security de verdade
  exige um projeto Supabase real (não dá para simular no cliente falso). Por
  isso `sql/schema.sql` traz um checklist manual de isolamento entre contas,
  repetido em `docs/etapa4-supabase.md` (passo 5) — o usuário deve rodá-lo
  uma vez ao configurar seu projeto.

**Passo manual necessário do usuário**: criar uma conta/projeto Supabase
gratuito, rodar `sql/schema.sql` e colar a URL + chave anônima em
`js/config.js`. Isso não pode ser feito de forma autônoma porque exige
criar uma conta em outro serviço. Guia completo em
`docs/etapa4-supabase.md`.

## Etapa 5 (parte 1 — mais instrumentos) — ✅ Concluída (2026-09-10)
Expande o motor e a tela para os 5 instrumentos que faltavam no rodapé do
layout de referência: **violão, sax, trompete, violino e flauta** (além de
teclado/guitarra/baixo, já prontos desde a Etapa 1).

- Como o motor de teoria (campo harmônico, escalas, arpejos, notas-alvo) já
  era 100% independente de instrumento, essa expansão ficou concentrada em
  notação/áudio/UI — nada mudou em `js/theory.js`/`js/data.js`/`js/phrases.js`.
- **Violão**: mesma afinação padrão de 6 cordas da guitarra → ganha
  tablatura igual.
- **Sax, trompete, violino, flauta**: tocam uma nota de cada vez (sem
  "casas"/trastes), então a aba Fraseados mostra Partitura ou Cifra — o
  botão "Tab" fica desabilitado com uma explicação, e a visualização cai
  automaticamente para Partitura ao trocar para um desses instrumentos.
- Cada instrumento novo ganhou uma tessitura (faixa de notas) e um timbre de
  áudio próprios em `js/notation.js`/`js/audio.js`.
- Rodapé com os 8 instrumentos agora é clicável: clicar em qualquer um
  seleciona ele no formulário (antes era só decorativo/"em breve").
- **Simplificação assumida**: tudo em tom concertante (o que soa é o que
  está escrito) — sax e trompete são instrumentos transpositores na
  partitura tradicional deles, mas essa "leitura transposta" fica de fora
  por ora (não afeta a análise harmônica nem o áudio, só a forma como um
  saxofonista/trompetista experiente esperaria ler a partitura). Registrado
  no README para não ser esquecido.

Testes automáticos: 10 novos testes em `tests/phrases.test.js` (tablatura do
violão idêntica à guitarra, `toTab` retorna `null` para os 4 instrumentos
sem traste, realização de oitava correta para todos) e um novo smoke test
via Chromium headless, `tests/etapa5.smoke.js` (select e rodapé atualizados,
Tab desabilitado/Partitura automática nos instrumentos sem traste, tab
funcionando no violão, áudio tocando sem erros nos 5 instrumentos novos).

## Etapa 5 (parte 2 — planos Gratuito/Pro) — ✅ Concluída (2026-09-10)
Cria a distinção de plano prevista em `docs/matriz-rbac.md`: o nível
**Avançado** dos fraseados (3ª escala recomendada por acorde + frases de
"tensão" com escala alterada) agora é exclusivo do plano **Pro**.

- **Sem cobrança configurada.** Não existe botão de "assinar" em lugar
  nenhum — um botão desses sem processar pagamento de verdade seria
  enganoso. Por enquanto, virar Pro é manual (um `update` no SQL Editor do
  Supabase), documentado em `docs/etapa5-planos.md`.
- **Correção de segurança importante**: a política de RLS de `profiles`
  criada na Etapa 4 permitia, sem querer, que qualquer usuário logado
  mudasse o próprio `plano` para `'pro'` direto pela API (ela só checava
  *qual* linha podia ser alterada, não *o quê*). `sql/schema.sql` ganhou um
  trigger (`prevent_plano_selfupgrade`) que reverte qualquer mudança de
  `plano` feita pelo papel `authenticated` — só um `update` rodado direto no
  SQL Editor (fora do app) consegue promover alguém.
- **Interface**: a opção "Avançado" no seletor de Nível mostra 🔒 e um
  aviso para quem não é Pro; tentar selecioná-la reverte sozinho para
  Intermediário. Isso é reativo: sai/entra da conta ou muda de plano e a
  trava se ajusta na hora (`window.IL.account`, publicado por
  `js/auth-ui.js`, e `window.IL.ui.onAccountChange`, consumido por
  `js/app.js`). Configurações ganhou um comparativo Gratuito x Pro.
- **Limite assumido e documentado**: como o gerador de fraseados roda 100%
  no navegador (sem chamada a servidor), essa trava é de interface — os
  dados salvos (histórico/favoritos/exercícios/o próprio `plano`) é que são
  realmente protegidos pelo banco (RLS + trigger). Detalhado em
  `docs/etapa5-planos.md`.

Testes automáticos: novo smoke test `tests/etapa5.planos.smoke.js`
(Chromium headless, cliente Supabase falso) cobre visitante bloqueado,
usuário Gratuito bloqueado, usuário Pro liberado (3 escalas + frase de
tensão confirmadas), Configurações sem nenhum botão de pagamento, e a
reversão automática do nível ao sair da conta.

## Etapa 5 (parte 3 — Laboratório) — ✅ Concluída (2026-09-10)
Primeiro recurso do módulo **Laboratório** (exclusivo Pro, previsto em
`docs/matriz-rbac.md`): um gerador de progressões prontas para praticar.

- Novo item "🧪 Laboratório" no menu lateral, agora aberto para navegação
  (antes ficava com o rótulo "Etapa 5"/`is-soon`). Segue o mesmo padrão de
  bloqueio das outras telas de conta: visitante vê um convite para entrar,
  usuário Gratuito vê o comparativo de planos explicando que é exclusivo
  Pro, usuário Pro vê a ferramenta de verdade — sempre reaproveitando
  `planComparisonHTML()` (sem nenhum botão de pagamento, mesma lógica da
  Etapa 5 parte 2).
- **A ferramenta**: escolhe uma tonalidade e um estilo (Jazz, Blues,
  Pop/Rock ou Modal/empréstimo) e sorteia uma entre 8 progressões prontas
  (ex.: ii–V–I e giros de jazz, blues de 12 compassos, "a progressão pop",
  empréstimos modais como bVII e bVI) — cada uma com uma explicação curta
  do porquê ela funciona. Um botão "Analisar esta progressão" manda tudo
  direto para a tela principal (fraseados, tab/partitura/cifra e áudio
  saem na hora, sem digitar nada).
- `js/lab.js` (novo módulo, testável em Node como `theory.js`/`phrases.js`):
  cada modelo é uma lista de graus (afastamento da tônica em passos de
  letra + semitons, o mesmo método de `noteAt` do motor de teoria) e uma
  qualidade de acorde — isso garante grafia correta mesmo em graus
  emprestados (ex.: bVII de C vira Bb, nunca A#) e em tonalidades com
  bemóis (ex.: ii–V–I em Bb vira Cm7 | F7 | Bbmaj7, sem sustenidos).
- 9 testes automáticos em `tests/lab.test.js` (grafia correta em tonalidades
  com sustenido/bemol, blues com 12 acordes todos dominantes, cada símbolo
  gerado é reconhecido de volta pelo parser de cifras do motor de teoria) e
  um novo smoke test `tests/etapa5.laboratorio.smoke.js` (bloqueio por
  plano, sorteio, e o fluxo completo até a análise aparecer preenchida).

## Etapa 5 (parte 4 — Aulas) — ✅ Concluída (2026-09-10)
Módulo **Aulas** (previsto em `docs/matriz-rbac.md`): conteúdo educacional
estruturado, **livre** — ao contrário de Fraseados Avançado e Laboratório,
não depende de login nem de plano Pro.

- Novo item "🎓 Aulas" no menu lateral, sem nenhum bloqueio (antes ficava
  com o rótulo "Etapa 5"/`is-soon`).
- **8 lições curtas**, organizadas por categoria: Fundamentos (campo
  harmônico e funções; como ler cifras), Escalas (modos da escala maior +
  escalas de cor; arpejos e notas-alvo), Harmonia avançada (dominantes
  secundários), Fraseados (os 5 tipos de frase gerados pelo motor) e
  Estilos (blues de 12 compassos e turnarounds; ii–V–I e giros de jazz).
  Cada lição referencia as telas/recursos correspondentes do próprio
  ImprovisaLab (Visão Geral, Escalas, Arpejos, Fraseados, Laboratório).
- Cada lição pode trazer um **exemplo prático** (tonalidade + progressão);
  o botão "Testar este exemplo" manda direto para a análise, reaproveitando
  o mesmo fluxo já usado pelo Laboratório ("Analisar esta progressão").
- `js/lessons.js` (novo módulo, testável em Node como `theory.js`/`lab.js`):
  só dados (lista de lições) + `byId()`, sem lógica de UI.

Testes automáticos: 6 testes em `tests/lessons.test.js` (estrutura completa
de cada lição, ids únicos, `byId()`, e — o mais importante — cada
`exemplo.progressao` é validado contra o motor de teoria de verdade,
garantindo que nenhum exemplo didático tem um acorde que o próprio sistema
não reconheceria) e um novo smoke test `tests/etapa5.aulas.smoke.js`
(acesso sem login, lista renderizada, troca de lição, "Testar este
exemplo" preenchendo e rodando a análise).

Com isso, todo o escopo original da Etapa 5 do `docs/PRD.md` está
entregue: mais instrumentos, planos Gratuito/Pro, Laboratório e Aulas.

## Fraseados melhores (a partir dos materiais de estudo) — ✅ Concluída (2026-09-10)
O usuário enviou 11 materiais (métodos de harmonia, modos gregos, padrões
de jazz, dicionários de acordes, voicings) para melhorar os fraseados. O
sistema passou a aplicar os princípios desses materiais — sem copiar texto,
exercícios ou licks de nenhum deles (vários são obras protegidas). Detalhe
de o que veio de cada material: `docs/fraseados-referencias.md`.

- **Cifra brasileira** (padrão Chediak): `C7M`, `C7+`, `Am7(b5)`, `B°`,
  `Cm(7M)`, `G7/4`, `C6(9)`, tensões entre parênteses (`G7(b9)`,
  `G7(b13)`, `C7M(#11)`, `G7alt`) e baixo invertido (`D7/F#`). Antes, `C7M`
  virava dominante e `Am7(b5)` virava m7 — erro grave para quem cifra no
  padrão brasileiro.
- **Escala de cada acorde** agora considera a função e para onde o acorde
  resolve: 18 escalas novas (modos da menor melódica, menor harmônica,
  mixolídio b9 b13, dominante-diminuta, bebop, blues); V7 → acorde maior =
  mixolídio, V7 → acorde menor = mixolídio b9 b13, SubV7/IV7/bVII7 = lídio
  b7, tensões da cifra mandam (b9 = dom-dim, #11 = lídio b7, alt = alterada,
  b13 = mixolídio b13); 7M fora do I = lídio; m6/m(7M) = menor melódica.
  A análise também reconhece SubV7, II cadencial, diminuto de passagem e
  auxiliar, empréstimo modal (bVI, bVII, iv...), I7/IV7 de blues e V/V (que
  antes aparecia como "cromático" por engano).
- **Fraseados** reescritos: uma linha contínua de colcheias, um compasso
  por acorde, começando numa nota do acorde e terminando com aproximação da
  nota-alvo do próximo (por grau, cromática, cerco, cromática dupla).
  13 técnicas (arpejo circular "Parker", arpejo 3-5-7-9, escala bebop,
  padrão 1-2-3-5, sequência sus2, pentatônica superposta, tríade de SubV,
  arpejo diminuto da 3ª, padrão simétrico, pentatônica/blues em grupos...),
  escolhidas por função do acorde e nível. Cada frase explica a técnica, as
  notas e a nota característica do modo.
- **Interface**: "🎲 Outra ideia" (troca a técnica de um compasso),
  seletor "Padrão" (fixa uma técnica na progressão inteira), "▶ Tocar a
  linha inteira" (solo completo com acompanhamento), colcheias com swing no
  áudio, partitura/tab preservando o desenho real da frase (saltos de 6ª,
  arpejos). Favoritos/exercícios lembram a "ideia" e o padrão escolhidos.
- **Aulas**: 2 lições novas (técnicas de fraseado; menor melódica/harmônica
  e o dominante) e 3 atualizadas.

Testes automáticos: `tests/theory.test.js` (70 testes, +46: cifra
brasileira, tensões, escolha de escala por função), `tests/phrases.test.js`
(39 testes, reescrito: linha contínua, notas do acorde no tempo 1, escala
bebop acertando os tempos, variações, padrão fixo, varredura de musicalidade
em 12 progressões × 3 níveis × 6 variações sem notas repetidas nem saltos
maiores que uma oitava) e um novo smoke test `tests/fraseados.smoke.js`.

## Biblioteca de Fraseados — ✅ Concluída (2026-09-10)
Item "🎼 Biblioteca de Fraseados" do menu (antes "em breve") agora
funciona: gera frases para **qualquer escala/modo** (26 escalas: modos da
maior, da menor melódica, da menor harmônica, simétricas, bebop,
pentatônicas e blues), **em qualquer tom** (ou nos 12 tons, no ciclo de
4ªs) e em **7 estilos**: Bebop (estilo Parker), Jazz moderno, Blues,
Modal, Rock/Pentatônica, Baião/Nordestino e Fusion (sweep — ver abaixo).

- Cada frase tem 1 ou 2 compassos + a nota de chegada (longa), com ritmo de
  verdade: colcheias com swing, tercinas (grupeto), semicolcheias, pausas e
  a síncope do baião. Os dominantes resolvem no acorde de chegada (G7 → C7M,
  E7(b9/b13) → Am7, SubV7 → meio tom abaixo).
- As frases são **calculadas**, não copiadas: o motor (`js/library.js`)
  combina "roteiros" de cada estilo (arco sobe-e-desce, cerco + arpejo,
  arpejo circular encadeado, grupeto + escala bebop...) com 24 células de
  vocabulário, sorteia dezenas de candidatas por frase e fica com a melhor
  segundo um filtro de musicalidade (notas do acorde nos tempos fortes,
  cromatismo sempre resolvendo, saltos compensados, um ponto culminante,
  âmbito tocável, chegada numa nota estável). Determinístico por semente:
  dá para pedir quantas páginas quiser ("Mais 12 frases").
- Cada frase: partitura com ritmo (colchetes, tercinas, pausas, cifra),
  tablatura, notas, áudio com andamento/swing e acompanhamento, e a
  explicação do vocabulário usado. A grafia escolhe o enarmônico mais
  simples (lócrio de C#, não de Db) e evita acidentes dobrados.
- Livre para todos, **inclusive o nível Avançado** (arpejo circular,
  escala bebop, tensões, pentatônica superposta, quartas): a pedido do
  usuário, enquanto não houver cobrança configurada, a Biblioteca não tem
  trava de plano. Para voltar a exigir o Pro, basta trocar
  `ADVANCED_FREE` para `false` em `js/library-ui.js`. (Na aba Fraseados da
  análise o Avançado continua exclusivo Pro.)

Testes: `tests/library.test.js` (14 testes; varre 26 escalas × 6 estilos ×
3 níveis × 2 tamanhos × 12 tons = 11.232 frases em ~6 s: ritmo fecha,
grafia coerente, sem saltos maiores que 1 oitava, cromatismo resolvendo,
iniciante e modal sem cromatismo, ≥70% dos tempos fortes em nota do acorde
no bebop avançado, determinismo e 48 frases distintas em 4 páginas) e
`tests/biblioteca.smoke.js`.

## Fusion (sweep, inspirado em Gambale) + articulações + som real — ✅ Concluída (2026-09-10)
Novo item do menu **"🎸 Fusion — sweep (Gambale)"**: abre a Biblioteca já no
estilo Fusion (7º estilo). A linguagem é associada a Frank Gambale, mas nada
foi transcrito dele — as frases são calculadas com os princípios:

- **Arpejos varridos (sweep)**: uma nota por corda, numa só palhetada
  (D D D subindo, U U U descendo), com hammer-on/pull-off na corda de cima
  para virar o arpejo; em sextinas (6 notas por tempo) ou tercinas.
- **"O modo pensado como arpejos"**: arpejos superpostos que nascem nos graus
  da escala (ex.: Em7(b5) sobre C7 no mixolídio), explicados na frase.
- **3 notas por corda** com palhetada econômica ou legato, e **slides** para
  trocar de posição.
- A tablatura é calculada por programação dinâmica (Viterbi) respeitando a
  técnica: sweep de uma nota por corda, ligados na mesma corda, bend com a
  casa de destino, palhetada D/U embaixo.

**Articulações e dinâmica em todos os estilos** (`js/articulation.js`):
hammer-on (h), pull-off (p), slide (/ \), bend (b) e release (r), vibrato
(~) e notas fantasma, cada estilo com seu sotaque (blues/rock com muito bend
e vibrato, fusion com legato, bebop quase sem bend, com ghost notes). A
dinâmica varia: acentos nos tempos fortes e no ponto culminante, crescendo
até o clímax. Aparece na tab (com legenda), na partitura (h, p, sl., ~, >)
e no áudio. Teclado não recebe bend/slide/vibrato — só dinâmica.
Determinístico (mesma frase = mesmas técnicas).

**Som mais real** (`js/audio.js` reescrito): samples de instrumentos reais
(FluidR3_GM, CC BY 3.0 — `sounds/CREDITOS.md`) guardados em `sounds/*.js`
(uma nota a cada 3 semitons, ~4,4 MB no total, carregados só quando tocam;
funciona abrindo o `index.html` direto, sem servidor). O player aplica bend,
slide, hammer-on/pull-off e vibrato na altura do sample, e o acompanhamento
usa piano elétrico + baixo. Seletor **"Som"** no topo: *Real* (padrão),
*Guitarra com drive* e *Sintetizado* (o som antigo, também usado se os
samples não carregarem).

Ajuste no motor: frases com âmbito maior que 22 semitons são descartadas.

Testes: `tests/articulation.test.js` (11 testes, 504 frases fusion:
ritmo com sextinas fecha, h sobe/p desce, bend de 1–2 semitons, todas as
técnicas aparecem, dinâmica não plana, teclado sem bend, ligados na mesma
corda da tab, sweep com uma nota por corda e palhetada D/U, tab alinhada,
samples presentes com crédito) e `tests/fusion.smoke.js` (menu Fusion, tab
com legenda, samples decodificados no Chromium, modos Real/Drive/Sintetizado).

## Ficha da escala/modo na Biblioteca — ✅ Concluída (2026-09-10)
Ao escolher a escala/modo (e o tom) na Biblioteca de Fraseados aparece uma
ficha "📐 fórmula e características" (pode ser recolhida):

- **Fórmula** em graus (ex.: dórico `1 2 b3 4 5 6 b7`), com a leitura como
  **tensões** nos dominantes alterados (alterada `1 b9 #9 3 #11 b13 b7`);
- **Intervalos** na nomenclatura brasileira (`Tôn 2M 3m 4J 5J 6M 7m`);
- **Tons e semitons** (`T – ST – T – T – T – ST – T`, com T½ = tom e meio);
- as **notas no tom escolhido** (em C quando "todos os tons") e o acorde;
- **de onde vem** (qual modo de qual escala), **sonoridade**, **o que dá a
  cara dela** (nota característica, destacada em laranja na fórmula) e
  **onde usar** — para as 26 escalas.

Fórmula, intervalos e tons/semitons são calculados de `js/data.js` (não
podem divergir do motor); os textos estão em `js/scale-info.js`. Ajuste: a
escala de tons inteiros passou a ser grafada com b7 (G A B C# D# F, não E#).

Testes: `tests/scaleinfo.test.js` (fichas completas, fórmulas conhecidas,
intervalos batendo com os semitons) e `tests/scaleinfo.smoke.js`.

## Correção: som baixo/sem som no modo "Real" — ✅ (2026-09-10)
Os samples do FluidR3_GM vêm gravados muito baixos (pico ~0,1, cerca de
−20 dB); somados à dinâmica, o modo *Real* saía quase inaudível. Agora:

- cada amostra é **normalizada pelo pico** ao carregar (todas as notas com o
  mesmo volume) e amostras mudas/corrompidas são descartadas (ex.: a nota 94
  do violino);
- toda a saída passa por um **compressor/limitador** (volume forte sem
  estourar);
- se os samples demorarem mais de 5 s para carregar, aquela vez toca com o
  som sintetizado (e os samples entram na próxima);
- o contexto de áudio é "destravado" no primeiro clique/tecla da página
  (Safari/iOS).

Medido no Chromium (pico na saída): Real 0,64–0,84, Drive 0,71, Sintetizado
0,76, em todos os 8 instrumentos (antes: Real 0,05–0,11). Teste:
`tests/som.smoke.js`.

## Próxima etapa
Nenhuma etapa obrigatória pendente do escopo original do PRD, com duas
ressalvas explícitas sobre itens que o `docs/PRD.md` lista na Etapa 5:

- **"Plano Pro pago"**: o PRD prevê cobrança de verdade. Como pedido pelo
  usuário ("inicialmente sem custo"), isso não foi implementado — não existe
  gateway de pagamento nem botão de "assinar"/"pagar" em lugar nenhum do
  site (um botão desses sem processar pagamento de verdade seria enganoso).
  A distinção Gratuito/Pro existe e funciona (nível Avançado + Laboratório),
  só que virar Pro hoje é manual, via SQL Editor do Supabase — ver
  `docs/etapa5-planos.md`. Cobrança real fica para quando o usuário decidir
  monetizar (exigiria escolher um provedor de pagamento, ex. Stripe).
- **"Exercícios avançados"**: coberto pelo nível Avançado dos fraseados
  (Etapa 5, parte 2 — exclusivo Pro: 3ª escala recomendada + frases de
  "tensão"), que já é o mecanismo de "exercício mais difícil" do sistema.
  Não foi criado um módulo separado disso, por já estar coberto.

Fora isso, itens documentados como simplificação assumida (não fazem parte
do escopo cobrado, mas vale registrar): leitura transposta de sax/trompete
(Etapa 5, parte 1) e Bibliotecas de Escalas/Fraseados de navegação livre
(`docs/modulos.md`) — a Biblioteca de Fraseados já saiu; falta a de Escalas.

## Arquivos do projeto
`index.html`, `css/styles.css`, `js/data.js`, `js/theory.js`, `js/phrases.js`,
`js/notation.js`, `js/audio.js`, `js/articulation.js`, `js/scale-info.js`, `sounds/*.js` (+ `sounds/CREDITOS.md`), `js/lab.js`, `js/lessons.js`, `js/library.js`, `js/app.js`, `js/library-ui.js`,
`js/config.js`, `js/supabaseClient.js`, `js/auth-ui.js`, `sql/schema.sql`,
`tests/theory.test.js`, `tests/phrases.test.js`, `tests/lab.test.js`,
`tests/lessons.test.js`, `tests/library.test.js`, `tests/articulation.test.js`, `tests/fusion.smoke.js`, `tests/scaleinfo.test.js`, `tests/scaleinfo.smoke.js`, `tests/som.smoke.js`, `tests/audio.smoke.js`, `tests/etapa4.smoke.js`,
`tests/etapa4.smoke2.js`, `tests/etapa4.e2e.js`, `tests/etapa5.smoke.js`,
`tests/etapa5.planos.smoke.js`, `tests/etapa5.laboratorio.smoke.js`,
`tests/etapa5.aulas.smoke.js`, `tests/fraseados.smoke.js`, `tests/biblioteca.smoke.js`, `tests/screenshot*.js` (dev only),
`docs/PRD.md`, `docs/mapa-do-sistema.md`, `docs/matriz-rbac.md`,
`docs/modulos.md`, `docs/status.md`, `docs/etapa4-supabase.md`,
`docs/etapa5-planos.md`, `docs/fraseados-referencias.md`, `README.md`.

Entregue na pasta local do usuário: `IMPROVIX/` (repositório git, um commit
por etapa).
