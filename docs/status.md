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

## Exercícios de Padrões — ✅ Concluída (2026-09-11)
Novo item do menu **"📘 Exercícios de Padrões"** (`js/patterns.js` +
`js/patterns-ui.js`): o método clássico de estudo do jazz — um padrão curto
repetido nos 12 tons pelo ciclo de 4ªs (C F Bb Eb Ab Db F# B E A D G), com a
cifra em cada compasso.

- **57 padrões em 8 categorias**: preliminares no acorde maior, no dominante,
  acorde menor, II–V, II–V–I, II–V–i menor, V7alt → I e tercinas/grupetos,
  do nível preliminar (semínimas) ao avançado (cromatismo, b9, alterada).
- **Autoria**: o usuário pediu para copiar os exercícios do livro de padrões
  que enviou (com poucas notas trocadas). Isso não foi feito: seria
  reproduzir material com direitos autorais. Aproveitou-se só a organização
  didática (categorias, ciclo de 4ªs, progressão de dificuldade); todas as
  frases foram escritas para o ImprovisaLab com vocabulário comum do jazz
  (graus do acorde, notas-guia, cercos, escala bebop, tensões).
- Cada padrão mostra a **fórmula em graus por acorde** (ex.: Dm7 `b3 b7` →
  G7 `3 b7` → C7M `3 7`) e uma dica; cada tom vem numa linha com
  partitura, tablatura ou notas e botão de ouvir; **"Tocar todos os tons"**
  toca o ciclo inteiro com acompanhamento, destacando a linha atual.
  Andamento (60–200 bpm) e colcheias com swing ou retas.
- **Padrão próprio**: o usuário digita graus (`1 2 3 5`, `3 5 b7 b9`, com
  tensões 9/11/13), escolhe acorde e ritmo, e o sistema escreve e toca nos
  12 tons — assim dá para praticar em todos os tons qualquer exercício que
  ele esteja estudando.
- Correção na partitura: B#/Cb agora ficam na linha certa (a oitava da
  posição passa a descontar o acidente).

Testes: `tests/patterns.test.js` (8 testes em 684 linhas: ritmo fecha,
grafia sem acidentes dobrados, âmbito, transposição preserva o desenho,
cifras no ciclo, fórmulas, tempos fortes em nota do acorde/tensão, padrão
próprio) e `tests/padroes.smoke.js`.

## Exercícios de Padrões: vocabulário por estilo — ✅ (2026-09-11)
O módulo passou a ter dois grupos no seletor de categoria:
**Método progressivo** (os 57 padrões anteriores) e **Vocabulário mais usado,
por estilo** — 34 fórmulas de domínio comum, escritas na forma genérica:

- **Jazz/bebop (7)**: cerco duplo cromático da 5ª, 9-b9-1 no V, arpejo
  aumentado (#5 → 3), pentatônica do 2º grau (som lídio), padrão digital
  1-2-3-5, nota-guia descendo, grupeto na fundamental.
- **Blues (7)**: blue note b3 → 3, bend da 4ª à 5ª, pentatônica com b5,
  pergunta e resposta I7 → IV7, turnaround I7–IV7–I7–V7, shuffle em
  tercinas, bend da b7 no blues menor.
- **Rock (5)**: pentatônica em grupos de 3 e de 4, legato, bend de um tom
  com vibrato, frase mixolídia.
- **Baião/nordeste (5)**: mixolídio em terças, lídio b7, síncope do baião,
  descida com b7 e #11, pergunta e resposta em terças.
- **Bossa/MPB (5)**: arpejo 6(9), antecipação, cromatismo para a 9ª,
  resolução na 7M/9ª, menor com 6ª e 9ª.
- **Fusion (5)**: tríade do 2º grau (lídio), 3 notas por corda em legato,
  arpejo superposto Eb7M/Cm7, quartas empilhadas, lídio em legato.

Novas formas: blues I7 → IV7, turnaround, 7(#11), 6(9), 7M(#11). Os padrões
aceitam articulações (`:h`, `:p`, `:sl`, `:bend1`/`:bend2`, `:~`), que
aparecem na tab (com legenda) e no áudio; no teclado são removidas.
Teste novo em `tests/patterns.test.js` (6 estilos, ≥ 5 fórmulas cada,
h sobe/p desce, bend de ½ ou 1 tom) — 9 testes, 1.092 linhas.

## Notas de cada acorde junto da cifra — ✅ (2026-09-11)
Onde aparece uma cifra, aparecem também as notas que formam o acorde, ex.:
**C7 (C – E – G – Bb)**. Calculado da própria cifra (`theory.chordNotes` /
`chordNotesText`), incluindo tensões: G7(b9) = G – B – D – F – Ab; G7alt =
G – B – F – Ab – A# – C# – Eb (sem 5ª justa); C6(9) = C – E – G – A – D;
baixo invertido: D7/F# = D – F# – A – C, baixo F#.
Lugares: cadeia de acordes e tabela da análise, abas Escalas/Arpejos e
Notas-alvo, partituras (embaixo da cifra, com espaço extra na pauta),
Biblioteca (etiquetas de cada acorde), ficha da escala, Exercícios de Padrões
(título de cada tom, fórmula e vista Notas) e Laboratório.
Teste novo em `tests/theory.test.js`.

## Biblioteca: estilo "Intervalado" — ✅ (2026-09-11)
Novo estilo **Intervalado (2ªs, 3ªs, 4ªs... na escala)** na Biblioteca de
Fraseados: a escala escolhida tocada em saltos fixos. Aparece um campo
**Intervalo** (Todos, 2ªs, 3ªs, 4ªs, 5ªs, 6ªs, 7ªs), só nesse estilo.

- Desenhos: em pares (baixo → cima), pares invertidos, alternando a
  direção e empilhado em grupos de 3 (tercinas; só até 5ªs). Com 2
  compassos a linha sobe e volta (arco) para caber no braço; metade das
  frases começa descendo. Nunca repete a nota que acabou de tocar.
- Nível: iniciante = 2ªs e 3ªs em pares; intermediário = até 6ªs; avançado
  = até 7ªs e grupos de 3.
- Intervalos diatônicos (dentro do modo): em escalas de 7 notas o nome é
  exato (3ªs maiores e menores etc.); em pentatônicas/bebop o salto é
  contado em notas da escala. Resolve numa nota do acorde de chegada.
- Implementado em `intervalPhrase()` (`js/library.js`), fora do sorteio de
  células. Teste novo em `tests/library.test.js`.

## Metrônomo, andamento e repetir — ✅ (2026-09-11)
Barra de ícones em **Ouça a progressão** e em **Fraseados e Exercícios**:
⏱ metrônomo (clique por tempo, acento no tempo 1), − / andamento em bpm
(40–240, digitável) / +, e 🔁 repetir (toca em loop até parar). A barra
dos fraseados vale para "Tocar a linha inteira" e para o 🔊 Áudio de cada
frase. As escolhas ficam guardadas no navegador. `audio.js`:
`playProgression/playPhrase/playLine` aceitam `{ bpm, metronome }` e
`playEvents` agenda os cliques (`scheduleClick`). Teste:
`tests/transporte.smoke.js`.

## Estilo nos fraseados da análise — ✅ (2026-09-11)
Na aba **Fraseados** da análise, novo seletor **Estilo** (acima de
"Padrão"): Automático (pela função do acorde, como antes), Bebop (Parker),
Jazz moderno, Blues, Modal, Rock/pentatônica, Baião/nordestino, Fusion
(sweep) e Intervalado (3ªs, 4ªs, 6ªs). O estilo escolhe as técnicas de
cada compasso (`STYLES` em `js/phrases.js`, respeitando o nível), o ritmo
(swing, colcheias retas ou a célula do baião), a escala (baião: mixolídio /
lídio b7 nos dominantes; blues/rock: pentatônica/blues em todos os acordes)
e o sotaque das articulações. Novos corpos de frase: terças/quartas/sextas
diatônicas e arpejo varrido (com as dicas de sweep para a tablatura).
O estilo vai no título da frase e é restaurado nos favoritos/exercícios.
Testes: `tests/phrases.test.js` (novo teste de estilos) e
`tests/estilos-fraseados.smoke.js`.

## Biblioteca de Escalas — ✅ Concluída (2026-09-12)
Item **"📚 Biblioteca de Escalas"** do menu (antes "em breve") agora funciona,
e é de fato uma biblioteca: **46 escalas** (`js/scales.js` + `js/scales-ui.js`),
organizadas em 8 famílias — Modos da escala maior (7), Modos da menor melódica
(7), Modos da menor harmônica (6), Bebop de 8 notas (5), Pentatônicas e blues
(6), Simétricas (5), Exóticas e sintéticas (6) e Japonesas (4) — com **busca
por nome sem acento** ("dorico" acha "Dórico", "hungara" acha "Húngara menor").

20 escalas novas entraram em `js/data.js` para isso: blues com 9ª, lócrio 13,
jônio #5, dórico #11, lídio #9, harmônica maior, húngara menor, dupla
harmônica, napolitana menor e maior, bebop menor melódica e menor harmônica,
aumentada, Prometheus, cromática, pentatônica dominante, hirajoshi, kumoi,
in sen e iwato.

Ao clicar numa escala (e escolher o tom e o instrumento), a tela mostra tudo
que se precisa saber sobre ela:

- **Fórmula** em graus (`1 2 3 4 5 6 b7`), em **intervalos** brasileiros
  (`Tôn 2M 3M 4J 5J 6M 7m`) e em **tons e semitons** (`T – T – ST – …`),
  calculados de `js/data.js` (não podem divergir do motor);
- as **notas no tom escolhido**, uma etiqueta por grau (grau, intervalo e
  nota, com a nota característica em destaque), e o **acorde que a escala
  desenha** com as notas dele (ex.: `C7` `C – E – G – Bb`);
- o **desenho no braço** (12 casas ou recorte na casa 3/5/7/9/12) para
  guitarra, violão e baixo, ou no **teclado** para os demais instrumentos,
  com rótulo em **graus** ou em **notas**;
- textos: **de onde vem**, **sonoridade**, **o que dá a cara dela**,
  **notas-alvo (onde descansar)**, **notas a evitar**, **onde usar**,
  **acordes que combinam** (transpostos para o tom que está na tela) e uma
  **dica de treino** — para as 46 escalas (`js/scale-info.js`);
- **11 exercícios prontos** por escala (10 nas de 5 e 6 notas), com
  tablatura/partitura e áudio com acompanhamento, em três blocos:
  *A escala e o desenho dela* (a escala subindo e descendo; em terças
  `1-3-2-4-3-5…` e a volta; sequência de 3 notas `1-2-3, 2-3-4, 3-4-5…` em
  tercinas; sequência com bordadura `1-2-3-2, 2-3-4-3…`; quatro notas por
  grau), *Padrões de 4 notas* (o padrão digital `1-2-3-5` em cada grau; o
  mesmo descendo `5-3-2-1`; e o padrão de 4 notas deslocando o início —
  `1-2-3-5, 2-3-5-6, 3-5-6-1, 5-6-1-2`) e *Arpejo e notas-alvo* (arpejo do
  acorde da escala; escala + arpejo na mesma frase,
  `1-2-3-4-5-3-1 → 1-2-3-5-7-5-3-1`; notas-alvo em notas longas);
- barra de **metrônomo / andamento / repetir** na própria tela, e atalhos
  "🎼 Fraseados nesta escala" (abre a Biblioteca de Fraseados já na mesma
  escala e tom) e "📘 Exercícios de Padrões".

O acorde de cada escala é deduzido da escala (1-3-5-7 nas notas dela, com
ajuste por `theory.chordNotes` e casos especiais como a cromática, que serve
em qualquer acorde). A barra de transporte passou a poder ser ligada em telas
montadas na hora (`window.IL.ui.setupTransportBars()`).

Testes: `tests/escalas.test.js` (8 testes — os grupos cobrem exatamente o
catálogo, grafia sem acidentes dobrados em 6 tons × 46 escalas, símbolo e
notas do acorde, os 6 exercícios de cada escala fecham o compasso e ficam
dentro da tessitura, cada sequência conferida nota a nota contra o que o
método pede, ids e blocos sem repetição, busca sem acento, ficha de texto
completa) e `tests/escalas.smoke.js`.

## Som: samples MusyngKite + ambiência — ✅ (2026-09-12)
O dono do projeto achou que os sons não pareciam o instrumento de verdade.
Foram comparados quatro bancos gratuitos (FluidR3_GM, MusyngKite, FatBoy e
GeneralUser GS) tocando a mesma frase no mesmo motor, mais uma versão do
banco antigo só com ambiência; ele escolheu **MusyngKite + ambiência**.

**Samples** (`sounds/*.js`): banco trocado de FluidR3_GM (de 2008) para
**MusyngKite**, do mesmo repositório `gleitz/midi-js-soundfonts`, licença
**CC BY-SA 3.0** — o crédito ficou no cabeçalho de cada arquivo e em
`sounds/CREDITOS.md`, e o ShareAlike vale só para os arquivos de som, não
para o código do site. A densidade passou de uma nota a cada 3 semitons para
uma a cada **2**: nenhuma nota é transposta mais que meio tom (antes chegava
a um tom e meio, que era o que mais denunciava o sample). São 269 notas
gravadas no total, contra 159. Tamanho: 4,5 MB → 7,4 MB, ainda carregados só
quando aquele instrumento toca.

**Ambiência** (`js/audio.js`): nota seca soa sintética mesmo com sample bom —
falta a sala. Foi criado um envio paralelo com `ConvolverNode` e um impulso
**gerado no próprio navegador** (nada é baixado, continua funcionando em
`file://`): o som direto continua inteiro e por cima entra uma cauda curta,
com passa-alta em 260 Hz para o grave não lavar a mistura. Seletor novo no
topo, ao lado do de som: **Com sala** (padrão), **Pouca sala** e **Sem sala**,
guardado no navegador. O acompanhamento recebe 35% mais ambiência que a
melodia (fica ao fundo) e o clique do metrônomo não passa pela ambiência, de
propósito, para o tempo não borrar.

Medido no Chromium, cauda 150–350 ms depois do ataque de uma nota curta:
Com sala −19 dB, Pouca sala −23 dB, Sem sala −96 dB (silêncio).

Testes: `tests/ambiencia.smoke.js` (mede a cauda real na saída nos três modos,
confere que o convolver é criado e que a escolha é lembrada ao recarregar) e
2 testes novos em `tests/articulation.test.js` (licença e origem no cabeçalho
de cada banco, tabela de créditos completa, nenhum buraco maior que 2
semitons entre as notas gravadas, metrônomo fora da ambiência).
`tests/som.smoke.js` segue medindo volume saudável nos 8 instrumentos.

## Menu reorganizado — ✅ (2026-09-12)
A lista lateral tinha 12 itens e ficou com **7**, na ordem pedida pelo dono
do projeto:

1. 🏠 Início · 2. 📚 Biblioteca de Escalas · 3. 🎼 Biblioteca de Fraseados ·
4. 📘 Exercícios de Padrões · 5. 🧪 Laboratório · 6. 📋 Meus Exercícios ·
7. ⚙ Configurações.

O que saiu e para onde foi:

- **Favoritos** e **Histórico** viraram abas dentro de **Meus Exercícios**
  ("📋 Para praticar", "❤ Favoritos", "🕘 Histórico"). Nada foi apagado: as
  três listas, os avisos de login e as ações (carregar, abrir, excluir,
  mudar status) são as mesmas; só passaram a dividir uma tela. Quem chegar
  por um caminho antigo (`data-nav="favoritos"`/`"historico"`) cai na aba
  certa. Entrar na conta com a tela aberta agora recarrega a aba atual na
  hora, o que antes exigia navegar de novo.
- **Nova Análise** era duplicata do Início (abriam a mesma tela) — removido.
- **Fusion — sweep (Gambale)** saiu do menu, mas **o estilo continua
  inteiro**: aparece no seletor Estilo da Biblioteca de Fraseados e na aba
  Fraseados da análise, com as mesmas frases de sweep, articulações e
  tablatura. Só o atalho sumiu.
- **Aulas** saiu do menu a pedido do dono do projeto. O módulo (`js/lessons.js`,
  a tela e as 10 lições) continua inteiro no código e é reaberto com
  `window.IL.ui.switchView('aulas'); window.IL.ui.renderAulasView();` — basta
  devolver o item ao menu para voltar a ficar acessível.

Testes: novo `tests/menu.smoke.js` (ordem exata dos 7 itens, cada um abrindo
a tela certa, os 5 itens que saíram, as 3 abas abrindo uma de cada vez com
seus avisos de login, e o Fusion ainda gerando frases pelos dois seletores de
estilo). `tests/etapa4.smoke.js`, `tests/etapa4.e2e.js`,
`tests/etapa5.aulas.smoke.js` e `tests/fusion.smoke.js` foram ajustados para
os caminhos novos e continuam passando.

## Transcrição / Treino — ✅ (2026-09-12)
Item novo do menu, logo abaixo de Exercícios de Padrões: **🎤 Transcrição /
Treino**. Você põe um áudio de um solo e o sistema escreve as notas, em
tablatura e partitura, já divididas em seções para treinar. **Roda 100% no
navegador — o áudio não é enviado para lugar nenhum** e não há servidor nem
custo envolvido.

**Como o áudio entra**: arquivo (arrastando ou escolhendo: mp3, wav, m4a,
ogg, flac, mp4) ou **gravação** — do som de uma aba do navegador (Chrome e
Edge; Safari e Firefox não têm esse recurso) ou do microfone, que também
serve para gravar o próprio usuário tocando. Áudios de mais de 10 minutos são
recusados com um aviso, porque o que se estuda é o trecho.

**O caminho**: áudio → 22.050 Hz mono normalizado → rede neural (Basic Pitch,
do Spotify, Apache 2.0) → notas cruas → `extrairMelodia()` → andamento →
quantização → seções.

O detector sozinho devolve muita sujeira: harmônicos agudos que ele confunde
com notas, e o acompanhamento inteiro. O `extrairMelodia()` (em
`js/transcribe.js`) faz três limpezas, calibradas em gravações reais:
descarta blocos de acorde (3+ notas atacadas juntas e longas), corta o que
vem fraco demais para ser a nota tocada, e resolve as sobreposições ficando
com a mais forte de cada **ataque** — e não de cada intervalo de tempo, senão
a ressonância da guitarra (que soa mais que o espaço até a próxima nota)
apagaria metade da linha. Medido num teste controlado (solo escrito nota a
nota, gerado em áudio e transcrito às cegas): **96% das notas certas** com o
instrumento sozinho e **82% a 100%** com acompanhamento, contra 4% a 79% sem
essas limpezas.

Também saem da transcrição: o **andamento** (estimado pelos ataques da
própria melodia, sem precisar de bateria; dá para escolher na mão quando a
confiança vier baixa) e o **tom provável**, com o quanto das notas cabe numa
escala só — quando essa cobertura fica baixa, a tela avisa que ou o solo é
muito cromático ou o detector se confundiu com a banda.

**Cada seção** traz tablatura (ou partitura, nos instrumentos sem traste), as
notas escritas, **🔊 Transcrição** (toca a seção com o som do sistema),
**🎧 Original** (toca aquele mesmo trecho do áudio que você subiu — é assim
que se confere transcrição) e **⭐ Treinar** (guarda em Meus Exercícios). Uma
barra de metrônomo / andamento / repetir vale para todas.

**Bibliotecas** (`vendor/`, ~2,6 MB): TensorFlow.js e Basic Pitch, as duas
Apache 2.0, guardadas no projeto em vez de vir de CDN. O modelo foi embutido
como JavaScript em base64 porque o formato original precisa de `fetch`, que o
navegador bloqueia em `file://` — assim o site continua abrindo direto, sem
servidor. Só são carregadas quando alguém realmente manda um áudio: quem
nunca abre essa tela não baixa nada disso (o smoke test confere isso).

**Limite conhecido e documentado**: a precisão cai quando solo e
acompanhamento dividem o mesmo registro (guitarra com piano por cima, banda
inteira em fusion rápido). O resultado é um rascunho muito bom para corrigir
de ouvido — que é o próprio exercício —, não uma partitura pronta.

Testes: `tests/transcricao.test.js` (10 testes das partes puras: as três
limpezas, ressonância que não pode cortar nota, andamento em 4 bpm
diferentes, quantização sem nota em cima de nota, pausas fechando a linha do
tempo, fatiamento sem perder nota nem deixar sobra de duas notas, tom e
grafia com bemóis) e `tests/transcricao.smoke.js`, que sobe um áudio real no
Chromium, roda o modelo de verdade e confere as seções, a tablatura, os dois
botões de tocar e a carga sob demanda das bibliotecas.

## Transcrição: precisão medida e correção manual — ✅ (2026-09-12)
O dono do projeto achou que algumas coisas não foram transcritas bem. Em vez
de mexer nos números no escuro, foi montado um **banco de provas com
gabarito**: solos escritos nota a nota, depois gerados em áudio e transcritos
às cegas — assim dá para contar acerto de verdade. Seis gravações: fusion
rápido (230 notas, 9 notas/s) e bebop lento (28 notas, 3–5 notas/s), cada um
sozinho e com acompanhamento (baixo, piano e bateria). A medida é o F1 (acerto
de altura e de ataque, tolerância de 90 ms), que pune tanto nota perdida
quanto nota inventada.

**O que foi descoberto**: não existe um ajuste bom para os dois regimes. Linha
rápida precisa de limiar de ataque **alto** (senão o acompanhamento entra como
se fosse solo) e nota mínima **curta** (senão as semicolcheias somem); linha
lenta precisa do contrário. O ajuste que servia para uma estragava a outra.

**A solução**: duas passadas. A primeira, neutra, só mede quantas notas por
segundo o material tem; a segunda usa o perfil certo (`rapido` acima de 7
notas/s, `lento` abaixo). Custa quase nada — o caro é a rede neural, que já
rodou; daí para a frente é aritmética.

| caso | antes | depois |
|---|---|---|
| fusion rápido, guitarra só | 91,3 | **99,3** |
| fusion rápido + banda e bateria | 63,7 | **78,3** |
| bebop lento, guitarra só | 98,2 | 96,4 |
| bebop lento, guitarra + piano | 85,2 | **87,7** |
| bebop lento, sax só | 96,4 | **98,2** |
| bebop lento, sax + piano | 94,9 | 92,9 |
| **média** | **88,3** | **92,1** |

Também entrou uma **atenuação do grave** antes do detector (prateleira de
−12 dB abaixo de 150 Hz): num áudio com banda, o baixo e a mão esquerda do
piano dominam a energia e o detector gasta atenção neles. No caso mais
difícil, 78,3 → 80,5. Foi escolhida a atenuação, e não um corte seco: cortar
em 120 Hz media um pouco melhor (81,0) mas comeria as notas abaixo do si 2. De
quebra, a reamostragem passou a ser feita pelo `OfflineAudioContext` do
navegador, melhor que a interpolação linear feita à mão.

**Duas ideias foram testadas e descartadas** — ficam registradas para não
serem tentadas de novo: escolher a linha por **programação dinâmica** (Viterbi,
como a tablatura faz), que piorou muito (caminho "suave" prefere o
acompanhamento, que também é contínuo: 63,7 → 34,0); e limitar as notas a uma
**janela de registro** em volta do solo, que despencou no caso com banda
(64,2 → 49,5) porque o centro do registro cai no acompanhamento.

**Correção manual** (o que fecha a conta, porque detector nenhum acerta tudo):
na tela, cada nota da seção virou um botão. Clicando nela abre uma barra com
♯ meio tom, ♭ meio tom, ↑ oitava, ↓ oitava, apagar, ouvir só ela e desfazer.
Pelo teclado: ↑ ↓ mudam meio tom (com Shift, oitava), ← → andam de nota,
Delete apaga, Cmd/Ctrl+Z desfaz, Esc solta. As notas corrigidas ficam marcadas
em verde e a seção diz quantas você arrumou. A pilha de desfazer guarda 40
passos por seção, e tocar a seção já usa a versão corrigida.

Testes: `tests/transcricao.test.js` foi a 14 testes (perfis por densidade,
`densidadeDe`, grafia de nota) e `tests/transcricao.smoke.js` passou a exercer
a correção manual inteira no navegador — clicar, subir meio tom, marcar como
corrigida, desfazer, seta do teclado e apagar.

## Padrões clássicos: 21 exercícios por escala e novas células nos fraseados — ✅ (2026-09-12)
O dono do projeto mandou a lista de padrões que estuda (grupos de 3/4/5,
padrão quebrado, 1-2-4-3, 1-3-2-4, 1-3-5-2, terças, quartas, quintas, arpejos
de 7ª, aproximação cromática e cerco/enclosure). Quatro deles já existiam
(grupos de 3, grupos de 4, 1-2-3-5 e terças); os outros **dez** entraram.

**Biblioteca de Escalas** — de 11 para **21 exercícios** por escala, agora em
seis blocos: *A escala e o desenho dela* (escala, terças, sequência de 3,
sequência 1-2-3-2, quatro notas por grau, grupos de 5), *Sequências com salto*
(1-2-5, 1-2-4-3, 1-3-2-4, 1-3-5-2), *Intervalos* (quartas e quintas, ida e
volta), *Padrões de 4 notas* (1-2-3-5, o mesmo descendo, e deslocando o
início), *Arpejo e notas-alvo* (arpejo do acorde, arpejos de 7ª em cada grau,
escala + arpejo, notas-alvo) e **Cromatismo — a linguagem do jazz**
(aproximação cromática e cerco das notas do acorde).

Os dois cromáticos saem da escala, então `js/scales.js` ganhou um construtor
de eventos com notas soltas e a grafia do semitom abaixo (E → Eb, Eb → D,
F# → F, F → E, C → B). O **cerco** tem duas formas, conforme a vizinha de cima
esteja a um tom ou a meio tom — exatamente como no método: em C, alvo 1 dá
D–Db–B–C, alvo 3 dá F–Eb–D–E, alvo 5 dá A–Ab–F–G e alvo 7 dá C–Bb–A–B. Os
quatro estão travados em teste.

Nas escalas de 5 e 6 notas os exercícios que precisam de 7 graus (arpejos de
7ª, escala + arpejo) não aparecem — ficam 19. Varredura: 644 combinações de
escala × tom, todas com compasso fechado, notas dentro do braço e grafia sem
acidente dobrado.

**Nos fraseados** (a pedido, as mesmas células passaram a gerar frases):
- `js/phrases.js` (aba Fraseados da análise) ganhou 6 corpos novos —
  `digital_1243`, `digital_1324`, `digital_1352`, `arpejo_7_graus`,
  `intervalos_5`, além de `cercos` e `cromatico_alvo` — ligados aos estilos
  (bebop, jazz, modal, fusion, baião, intervalado), aos níveis e ao seletor
  "Padrão", que agora tem 1-2-4-3 e 1-3-2-4 já no intermediário.
- `js/library.js` (Biblioteca de Fraseados) ganhou 5 células novas
  (`digital1243`, `digital1324`, `digital1352`, `arp7grau`, `quintas`) e 13
  roteiros novos nos estilos bebop, jazz, modal, fusion e baião.

Dois problemas apareceram nos testes e foram corrigidos: o 1-3-5-2 repetia
nota ao emendar no grau seguinte (o "2" da célula é o próprio grau seguinte —
agora pula para o próximo), e as células cromáticas começavam fora do acorde,
quebrando a regra de o tempo 1 cair numa nota do acorde — foram reescritas
para sair de uma nota do acorde e cercar a seguinte.

Testes: `tests/escalas.test.js` foi a 10 testes (cada sequência conferida grau
a grau, os quatro cercos nota a nota, grafia em 6 tons, e os blocos sem se
repetir na lista) e `tests/library.test.js` a 16 (as células novas estão em
roteiro e geram frases sem nota repetida e dentro do âmbito).
`tests/phrases.test.js` continua com 40, agora exercitando os corpos novos.

## Notas tocadas embaixo da tablatura — ✅ (2026-09-12)
Na Biblioteca de Escalas, cada um dos 21 exercícios passou a mostrar, logo
abaixo da tablatura (ou da partitura, nos instrumentos sem traste), a
**sequência de notas que está sendo tocada**, uma etiqueta por nota e uma
barra `|` separando os compassos — ex.: `C D E F G A B C | B A G F E D C`.
Assim dá para dizer o nome da nota enquanto toca, que é o exercício que a
própria dica pede ("toque devagar, dizendo o nome de cada nota").

Implementado em `notasHTML()` (`js/scales-ui.js`), a partir dos próprios
eventos do exercício (pausas ficam de fora), com `.esc-notas` / `.esc-nota` /
`.esc-barra` em `css/styles.css`. `tests/escalas.smoke.js` confere que as 21
linhas aparecem, que nenhuma etiqueta sai vazia e o conteúdo da primeira.

## Transcrição: 2ª rodada de precisão (90,5 → 93,8 F1) — ✅ (2026-09-13)
O dono do projeto pediu para melhorar mais a transcrição. Como na rodada
anterior, nada foi ajustado de ouvido: o **banco de provas com gabarito**
ganhou **4 casos novos** (10 no total, 4 deles de banda inteira), escolhidos
para cobrir o que faltava — um solo **intervalado** (saltos de 4ª a 6ª o tempo
todo, que é justamente o que uma limpeza por "continuidade" pode estragar) e
um **bossa/MPB médio no sax com piano e baixo no mesmo registro**. O modelo
roda uma vez por caso e a saída fica guardada em disco (`*_frames.f32`), o que
permite varrer centenas de variantes de pós-processamento em segundos.

A base de comparação também foi refeita: agora todos os casos passam pela
atenuação de grave que o site aplica de verdade, então o "antes" da tabela é o
sistema como estava no ar.

**O que entrou (tudo medido):**

1. **Quem ganha quando duas notas atacam juntas.** Antes era sempre a mais
   forte — e o baixo e a mão esquerda do piano batem forte. Agora, se uma das
   duas estiver **12 semitons ou mais longe** do registro que o solo vinha
   ocupando (mediana das 3 últimas notas), quem decide é o registro. A margem
   é grande de propósito: solo com salto largo de verdade não é afetado (o
   caso "intervalado" subiu 91,2 → 98,8, em vez de cair).
2. **Nota isolada fora do registro sai.** Quando a melodia dá uma respirada, o
   acompanhamento preenche o buraco. Nota a mais de 12 semitons da mediana das
   vizinhas (janela de 2 s) é descartada.
3. **Perfil lento reajustado** agora que as duas limpezas existem: agrupamento
   de ataque de 60 ms → **100 ms** (a semicolcheia rápida precisa de janela
   curta, a linha lenta não — e a janela maior derruba o acompanhamento que
   ataca quase junto), limiar de nota 0,40 → **0,50** e nota mínima 3 → **8**
   quadros. O perfil rápido foi re-varrido e já estava no ótimo: ficou igual.

| caso | antes | depois |
|---|---|---|
| intervalado (saltos), guitarra só | 99,2 | 98,4 |
| intervalado + banda | 91,2 | **98,8** |
| bossa média, sax só | 99,4 | 98,9 |
| bossa média, sax + piano | 60,4 | **70,2** |
| fusion rápido, guitarra só | 99,6 | 99,6 |
| fusion rápido + banda e bateria | 81,9 | **89,8** |
| bebop lento, guitarra só | 96,4 | **98,2** |
| bebop lento, guitarra + piano | 87,7 | **90,9** |
| bebop lento, sax só | 98,2 | 98,2 |
| bebop lento, sax + piano | 91,2 | **94,5** |
| **média** | **90,5** | **93,8** |

**Controle novo na tela: "Onde está o solo"** (registro). O detector ouve tudo
o que toca; dizer em que faixa o solo mora resolve a maior parte do que sobra.
São dois seletores (da nota X até a nota Y), preenchidos com o registro
detectado, e mexer neles **refaz as seções na hora** — a rede neural já rodou,
daí para a frente é só filtrar e remontar (medido no navegador: meio segundo).
Vale +1,7 na média e **+12,6 no pior caso** (bossa com piano: 70,2 → 82,8).
Para isso, `transcrever()` passou a devolver a linha de notas (`melodia`) e o
registro detectado, e a parte "andamento → grafia → quantização → seções"
virou `montar()`, chamada de novo a cada mudança. Botão "↺ soltar" volta ao
registro cheio; se houver correções manuais feitas, a tela avisa que elas
foram refeitas do zero porque as seções mudaram.

**Testado e descartado** (fica registrado para não ser tentado de novo):
supressão de harmônico (8ª/12ª/15ª acima de nota simultânea mais forte): 0,0 —
a escolha por ataque já resolvia; fusão de fragmentos da mesma altura: −0,9
(come nota repetida de verdade); piso de amplitude por janela deslizante: 0,0;
filtro de "voz de cima" (skyline) com distância fixa: ajuda o caso com piano
(+8) mas destrói solo de âmbito largo (−13), negativo na média; corte
automático de Otsu na distância abaixo do teto: −5,3, dispara em solo largo,
que é bimodal por natureza.

**Limite que continua**: quando o acompanhamento toca **as mesmas alturas** do
solo (piano comping no mesmo registro), não há pós-processamento que separe —
seria preciso separação de fontes. No caso "bossa + piano", 39 das 64 sobras
são exatamente isso. É por essa razão que a correção manual existe.

Testes: `tests/transcricao.test.js` foi a **19** (o baixo forte atacando junto
perde para o registro; salto largo legítimo continua na linha; nota isolada
fora do registro sai; `registroDe`/`noRegistro`; `montar` refazendo andamento,
grafia e seções) e `tests/transcricao.smoke.js` passou a exercer o controle de
registro no navegador (filtra, é instantâneo, o botão soltar volta ao que era).

## Administração: papéis, bloqueio e a tela — ✅ (2026-09-15)

Antes de publicar, o dono do projeto pediu um administrador que "dá
permissão para os demais usuários e consegue parar o acesso de quem logou".
Agora existe, e a parte que importa está **dentro do banco**.

**No banco** (`sql/schema.sql`, que virou idempotente — pode rodar de novo
quantas vezes quiser): `profiles` ganhou `papel` (`usuario`/`admin`),
`bloqueado`, `bloqueado_em`, `bloqueado_por` e `motivo_bloqueio`. Duas
funções de apoio (`eh_admin`, `esta_bloqueado`) são SECURITY DEFINER para
evitar a recursão infinita que uma política de `profiles` que consulta
`profiles` causaria. As políticas passaram a deixar o admin enxergar todos
os perfis e a negar **qualquer** leitura ou escrita de quem está bloqueado.
E o trigger antigo (que só protegia o `plano`) virou
`protege_campos_privilegiados`: usuário comum não muda plano/papel/bloqueio
de ninguém, admin muda os dos outros mas não os próprios, e o carimbo de
quem bloqueou e quando é posto pelo banco, não pelo app.

**Um furo sério apareceu no teste** e vale registrar: a primeira versão do
trigger era `SECURITY DEFINER`, e dentro de uma função assim `current_user`
é o **dono da função**, não quem chamou — a trava nunca disparava e um
usuário comum conseguia se promover a admin pela API. Só apareceu porque o
teste rodou num PostgreSQL de verdade; no papel, o código parecia certo.

**Testado num banco real, não no papel**: `tests/rls.sql` + `tests/rls.sh`
sobem um PostgreSQL local, criam o mínimo do Supabase (schema `auth`,
`auth.uid()`, papel `authenticated`), aplicam o `sql/schema.sql` duas vezes
(conferindo que é idempotente) e atacam o banco como cada tipo de usuário —
**23 checagens**, incluindo "usuário comum tenta se promover", "admin tenta
se bloquear", "bloqueado tenta ler os próprios dados" e "sem sessão não vê
nada". Isso fecha a lacuna que o `docs/matriz-rbac.md` registrava desde a
Etapa 4 ("não dá para automatizar sem um projeto Supabase de teste").

**Na tela**: item **👑 Administração** no menu, visível só para admin, com
a lista de contas (busca por e-mail, contadores de usuários/admins/Pro/
bloqueados) e, em cada linha, tornar Pro, tornar admin e bloquear (com
motivo, perguntado na hora). A própria conta do admin aparece sem botões,
de propósito — é o que garante que sempre sobre um administrador.

**Corte de acesso**: quem for bloqueado é desconectado assim que abrir o
site ou voltar para a aba (`visibilitychange`), com o motivo na tela. Os
dados já estavam inacessíveis pelo RLS desde o instante do bloqueio — a
desconexão é só para não deixar a pessoa navegando como se estivesse
dentro.

**Privacidade**: o admin **não** vê histórico, favoritos nem exercícios de
ninguém. Não é a tela que esconde: não existe política de RLS que dê esse
acesso, e o teste confere isso.

Testes: `tests/admin.smoke.js` (18 checagens no navegador, com um Supabase
falso que reproduz as mesmas regras do banco de verdade) e o
`tests/rls.sql` acima. `tests/menu.smoke.js` e `tests/site.smoke.js`
passaram a contar só os itens visíveis do menu.

## Pronto para publicar (GitHub + Vercel) — ✅ (2026-09-15)

`vercel.json` com cabeçalhos de segurança, `Permissions-Policy` liberando
microfone e captura de aba (a Transcrição precisa) e política de cache —
página, `js/` e `css/` sempre revalidam (uma atualização aparece no
primeiro reload), `sounds/` e `vendor/` ficam guardados uma semana.
`.vercelignore` mantém `tests/`, `docs/`, `sql/` e arquivos de trabalho
fora do site publicado. `index.html` ganhou description, theme-color e
Open Graph. O passo a passo está no `README.md`.

## Próxima etapa## Próxima etapa
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
(`docs/modulos.md`) — as duas Bibliotecas (Fraseados e Escalas) já saíram.

## Arquivos do projeto
`index.html`, `css/styles.css`, `js/data.js`, `js/theory.js`, `js/phrases.js`,
`js/notation.js`, `js/audio.js`, `js/articulation.js`, `js/scale-info.js`, `js/patterns.js`, `js/patterns-ui.js`, `js/scales.js`, `js/scales-ui.js`, `js/transcribe.js`, `js/transcribe-ui.js`, `vendor/*` (+ `vendor/CREDITOS.md`), `sounds/*.js` (+ `sounds/CREDITOS.md`), `js/lab.js`, `js/lessons.js`, `js/library.js`, `js/app.js`, `js/library-ui.js`,
`js/config.js`, `js/supabaseClient.js`, `js/auth-ui.js`, `sql/schema.sql`,
`tests/theory.test.js`, `tests/phrases.test.js`, `tests/lab.test.js`,
`tests/lessons.test.js`, `tests/library.test.js`, `tests/articulation.test.js`, `tests/fusion.smoke.js`, `tests/scaleinfo.test.js`, `tests/scaleinfo.smoke.js`, `tests/som.smoke.js`, `tests/patterns.test.js`, `tests/padroes.smoke.js`, `tests/escalas.test.js`, `tests/escalas.smoke.js`, `tests/ambiencia.smoke.js`, `tests/menu.smoke.js`, `tests/transcricao.test.js`, `tests/transcricao.smoke.js`, `tests/audio.smoke.js`, `tests/etapa4.smoke.js`,
`tests/etapa4.smoke2.js`, `tests/etapa4.e2e.js`, `tests/etapa5.smoke.js`,
`tests/etapa5.planos.smoke.js`, `tests/etapa5.laboratorio.smoke.js`,
`tests/etapa5.aulas.smoke.js`, `tests/fraseados.smoke.js`, `tests/biblioteca.smoke.js`, `tests/screenshot*.js` (dev only),
`docs/PRD.md`, `docs/mapa-do-sistema.md`, `docs/matriz-rbac.md`,
`docs/modulos.md`, `docs/status.md`, `docs/etapa4-supabase.md`,
`docs/etapa5-planos.md`, `docs/fraseados-referencias.md`, `README.md`.

Entregue na pasta local do usuário: `IMPROVIX/` (repositório git, um commit
por etapa).
