# IMPROVIX — Etapas 1 a 6 (análise, fraseados, áudio, contas, acordes e acesso)

Sistema online de improvisação: transforma uma progressão de acordes em
análise harmônica completa (campo harmônico, função de cada acorde, escalas,
arpejos e notas-alvo recomendados) e em fraseados prontos com tablatura,
partitura simplificada e cifra — para teclado, guitarra, baixo, violão, sax,
trompete, violino e flauta.

Concluído até agora (ver `docs/PRD.md` e `docs/status.md`):
- **Etapa 1**: motor de análise harmônica (aba Visão Geral/Escalas/Arpejos/Notas-alvo).
- **Etapa 2**: aba Fraseados — uma frase por acorde da progressão (melódica,
  blue, conectando, tensão) mais uma frase de resolução, exibidas em
  Tab (instrumentos com traste), Partitura simplificada ou Cifra.
- **Etapa 3**: áudio — "Ouça a progressão" toca o backing sintetizado da
  harmonia (com destaque do acorde que está soando) e cada fraseado pode
  ser tocado pelo botão 🔊 Áudio, tudo via Web Audio API (sem gravações).
- **Etapa 4**: contas de usuário (opcional) — login/cadastro, histórico de
  análises, favoritos e "Meus Exercícios", usando Supabase (Postgres + Auth
  + Row Level Security) gratuito. Sem configurar o Supabase, o site continua
  funcionando 100% como nas Etapas 1–3, só sem salvar nada entre visitas.
- **Etapa 5 (parte 1 — mais instrumentos)**: violão, sax, trompete, violino e
  flauta, além de teclado/guitarra/baixo. Violão usa a mesma afinação de 6
  cordas da guitarra (tablatura igual); sax/trompete/violino/flauta tocam uma
  nota por vez, então usam Partitura/Cifra em vez de Tab. Dá pra escolher o
  instrumento tanto no formulário quanto clicando direto no rodapé.
- **Etapa 5 (parte 2 — planos Gratuito/Pro)**: *encerrada em 13/10/2026.* Os
  planos saíram: **todo mundo que entra tem tudo liberado**, inclusive o
  nível Avançado dos fraseados. Quem controla o que cada pessoa vê é o
  administrador, tela por tela (ver abaixo). O histórico está em
  `docs/etapa5-planos.md`.
- **Etapa 5 (parte 3 — Laboratório)**: novo item no menu, exclusivo Pro —
  gerador de progressões prontas para praticar, por estilo (Jazz, Blues,
  Pop/Rock, Modal). Sorteia uma progressão, explica o porquê dela funcionar,
  e manda direto para a análise com um clique.
- **Etapa 5 (parte 4 — Aulas)**: novo item no menu, **livre** (sem login,
  sem plano) — 8 lições curtas cobrindo campo harmônico, leitura de cifras,
  escalas/modos, arpejos e notas-alvo, dominantes secundários, os 5 tipos de
  frase, blues/turnarounds e ii–V–I. Cada lição pode trazer um exemplo
  prático com um botão "Testar este exemplo" que manda direto para a
  análise.
- **Etapa 6 — entrada por login e administrador**: o site passou a ser
  **fechado**. Sem conta liberada não aparece nada além da tela de entrada; o
  **primeiro cadastro vira o administrador**, que libera (ou bloqueia) as
  contas, escolhe quem pode se cadastrar, convida pelo e-mail, decide quais
  telas cada pessoa vê e manda o e-mail de senha nova — sem nunca ver a senha
  de ninguém.

Com isso, todo o escopo da Etapa 5 previsto em `docs/PRD.md` está entregue.

- **Fraseados melhores** (depois da Etapa 5, a partir dos materiais de
  estudo enviados): cifra brasileira com tensões (`C7M`, `Am7(b5)`, `G7(b9)`,
  `G7/4`, `B°`...), escala de cada acorde escolhida pela função e pelas
  tensões (menor melódica, menor harmônica, dominante-diminuta, bebop...),
  e fraseados como uma linha contínua de colcheias com técnicas de jazz
  (arpejo circular, 3-5-7-9, bebop, 1-2-3-5, pentatônica superposta, cerco),
  "Outra ideia", "Padrão" fixo e "Tocar a linha inteira". Ver
  `docs/fraseados-referencias.md`.
- **Biblioteca de Fraseados**: frases para qualquer escala (26), em
  qualquer tom ou nos 12 tons, em 7 estilos (Bebop/Parker, Jazz moderno,
  Blues, Modal, Rock, Baião, Fusion), com ritmo (swing, tercinas, pausas), partitura,
  tab, áudio com acompanhamento e explicação — "Mais 12 frases" sem fim.
- **Fusion — sweep (inspirado em Gambale)**: arpejos varridos, arpejos
  superpostos, 3 notas por corda e slides; todas as frases com hammer-on,
  pull-off, slide, bend, vibrato e dinâmica (tab com palhetada D/U).
- **Exercícios de Padrões**: 91 padrões — método progressivo (preliminares,
  dominante, menor, II–V, II–V–I, II–V–i, V7alt, tercinas) e o vocabulário
  mais usado de jazz, blues, rock, baião, bossa e fusion — nos 12 tons pelo ciclo de 4ªs, com
  fórmula em graus, partitura/tab e áudio; e "padrão próprio" digitando graus.
- **Ficha da escala**: ao escolher a escala/modo na Biblioteca aparecem a
  fórmula (1 2 b3 4 5 6 b7), os intervalos (2M 3m 4J...), tons e semitons,
  as notas no tom, a sonoridade, a nota característica e onde usar.
- **Duas ou três digitações** (14/10/2026): cada exercício com tablatura traz
  as regiões do braço em que ele cabe — "6ª/8", "5ª/3" — e trocar muda só
  onde a mão vai: as notas e o áudio são os mesmos. As opções são calculadas,
  não escritas à mão, e todas passam pela mesma conferência (`tests/tablatura.test.js`
  varre 11.459 digitações).
- **Tablatura sem cordas soltas** (14/10/2026): as digitações saem todas
  "fechadas" — a mesma forma serve em qualquer tom, e a nota aceita vibrato e
  bend. A corda solta só aparece quando não existe outro jeito de tocar a
  nota. De quebra a mão ficou mais fechada: a maior abertura em quatro notas
  caiu de 17 para 12 casas. (A Biblioteca de Acordes continua com os acordes
  abertos de sempre — lá a corda solta faz parte do acorde.)
- **Som real**: samples de instrumentos (FluidR3_GM, CC BY 3.0 — créditos em
  `sounds/CREDITOS.md`); seletor Real / Guitarra com drive / Sintetizado.
  Todos os níveis liberados, inclusive o Avançado (estilo Parker completo).
- **Toque, não régua** (14/10/2026): os exercícios saem com o acento de quem
  toca — a nota que abre o compasso mais forte, a de contratempo mais leve —
  e com força e tempo variando de leve, como mão humana. Violão, guitarra,
  baixo e teclado **continuam soando** depois do fim da nota, como corda de
  verdade; sopro e arco emendam as notas em vez de cortá-las. Medido em
  `tests/toque.smoke.js`: a variação de força entre as notas passou de 3,5%
  para 9–16%, e o silêncio no meio do exercício, de 6,2% para 0%.

O site continua sendo 100% estático (sem servidor próprio) — mesmo com login,
quem guarda os dados é o Supabase (gratuito), acessado direto do navegador.
Veja `docs/etapa4-supabase.md` para o passo a passo (é o único passo manual,
porque exige criar uma conta em outro serviço).

## Biblioteca de Acordes

Digite uma cifra (`C7M`, `Am7(b5)`, `G7(b9)`, `D7/F#`…) e veja como se toca
**no violão, na guitarra, no teclado e no baixo**: três posições no braço
com os dedos e a pestana desenhados, três voicings de teclado (fundamental,
inversão e o de 3ª e 7ª, o do jazz) e, no baixo, as notas do acorde no braço
mais a linha fundamental–5ª–oitava. Cada nota vem com o nome e o grau dela
no acorde, e tudo toca.

As posições são **calculadas**, não copiadas de uma tabela: o programa varre
o braço, monta o que soa o acorde e descarta o que a mão não alcança (quatro
casas, quatro dedos, pestana só na casa mais baixa e sem corda solta no meio
dela). O motor é `js/chords.js` e a tela, `js/chords-ui.js`.

> A aba **Laboratório** (gerador de progressões) deu lugar a esta. O motor
> dele continua no projeto: é ele que sugere a progressão quando se troca a
> tonalidade na Análise de Harmonia.

## A tela de Início: treinar escalas

O site abre direto no treino: escolha a **tonalidade**, a **escala** e o
**instrumento** e saem os 21 exercícios do método — todos subindo e
descendo **duas oitavas** —, com partitura ou tablatura, as notas escritas,
áudio e metrônomo. São cinco escalas (Maior, Menor natural, Pentatônica
maior, Pentatônica maior + b3 e Pentablues); o catálogo completo de 46
escalas, com a ficha de cada uma, está em **Biblioteca de Escalas**.

Na escala **maior**, o primeiro exercício é o desenho **1-2-3-5-7-8** (a
maior sem o 4º e o 6º graus — em C: C D E G B | C D E G B | C e a volta).
Nas outras escalas, é a escala corrida.

A **análise de harmonia** (progressão → escalas, arpejos, notas-alvo e
fraseados) continua inteira: virou o item **🎹 Análise de Harmonia**, logo
abaixo do Início no menu.

## Como abrir

Não precisa instalar nada. Duas opções:

1. Dar duplo clique em `index.html` (abre direto no navegador), ou
2. Rodar um servidor local simples (opcional, útil se seu navegador
   bloquear algo ao abrir via `file://`):
   ```
   npx serve .
   ```
   ou, com Python: `python3 -m http.server 8080`

## Estrutura

```
index.html            Tela principal (layout do print de referência)
css/styles.css        Estilos (tema escuro)
js/data.js            Dados de teoria musical (escalas, qualidades de acorde, campo harmônico)
js/theory.js          Motor de teoria musical (parser de cifra, análise da progressão)
js/phrases.js         Gerador de fraseados: linha contínua (um compasso por acorde) + resolução
js/notation.js        Realização de oitavas, tablatura e partitura simplificada (Etapa 2)
js/audio.js           Áudio (Web Audio): samples reais com bends/slides/vibrato + síntese de reserva
js/lab.js             Gerador de progressões do Laboratório (Etapa 5, parte 3): modelos por estilo
js/lessons.js         Conteúdo das Aulas (Etapa 5, parte 4): lições + exemplos práticos
js/library.js         Motor da Biblioteca de Fraseados (escala × tom × estilo, com ritmo)
js/library-ui.js      Tela da Biblioteca de Fraseados
js/patterns.js        Exercícios de Padrões (91 padrões nos 12 tons + padrão próprio)
js/patterns-ui.js     Tela dos Exercícios de Padrões
js/scale-info.js      Ficha de cada escala/modo (fórmula, intervalos, características,
                      notas-alvo, notas a evitar, onde usar, dica de treino) — 46 escalas
js/scales.js          Motor da Biblioteca de Escalas (famílias, notas no tom, acorde da
                      escala, 6 exercícios prontos por escala, busca sem acento)
js/scales-ui.js       Tela da Biblioteca de Escalas (ficha + braço/teclado + exercícios)
js/articulation.js    Articulações (hammer-on, pull-off, slide, bend, vibrato) e dinâmica
sounds/*.js           Samples de instrumentos reais (FluidR3_GM, CC BY 3.0 — ver sounds/CREDITOS.md)
js/app.js             Liga a tela aos motores (sem framework, JS puro)
js/config.js          Configuração do Supabase (Etapa 4) — troque pelos dados do seu projeto
js/supabaseClient.js  Camada fina sobre o supabase-js: auth + CRUD de analises/favoritos/exercicios
js/auth-ui.js          UI de login/cadastro, histórico, favoritos, exercícios e configurações (Etapa 4)
sql/schema.sql         Script para criar as tabelas e políticas de RLS no Supabase (Etapa 4)
tests/theory.test.js   Testes automáticos do motor de teoria (node tests/theory.test.js)
tests/phrases.test.js  Testes automáticos de fraseados e notação (node tests/phrases.test.js)
tests/audio.smoke.js   Smoke test do áudio via Chromium headless (node tests/audio.smoke.js)
tests/etapa4.smoke.js  Smoke test: site funciona normalmente sem Supabase configurado
tests/etapa4.smoke2.js Smoke test: mensagem correta quando o SDK carrega mas falta configurar
tests/etapa4.e2e.js    Teste completo de cadastro/login/salvar/favoritar/exercícios/logout
                       (com um cliente Supabase falso, em memória — não substitui testar com
                       um projeto Supabase real, mas cobre toda a lógica de UI)
tests/etapa5.smoke.js  Smoke test dos novos instrumentos (select, rodapé, tab/partitura, áudio)
tests/acesso.smoke.js  Smoke test do portão: ninguém entra sem conta liberada (Etapa 6)
tests/admin.smoke.js   Smoke test dos poderes do administrador sobre as contas
tests/fake-supabase.js Supabase falso compartilhado pelos testes (reproduz as regras do banco)
tests/rls.sql/rls.sh   Confere as 40 regras de acesso num PostgreSQL de verdade (bash tests/rls.sh)
tests/etapa5.aulas.smoke.js Smoke test das Aulas (acesso livre, lista, exemplo -> análise)
tests/lab.test.js      Testes automáticos do gerador de progressões (node tests/lab.test.js)
tests/lessons.test.js  Testes automáticos do conteúdo das Aulas (node tests/lessons.test.js)
tests/fraseados.smoke.js Smoke test dos fraseados (cifra brasileira, Outra ideia, Padrão, linha inteira)
tests/library.test.js  Testes do motor da Biblioteca (varre 11.232 frases) — node tests/library.test.js
tests/biblioteca.smoke.js Smoke test da tela da Biblioteca de Fraseados
tests/articulation.test.js Testes de articulações, tab com técnicas e Fusion — node tests/articulation.test.js
node tests/scaleinfo.test.js
node tests/patterns.test.js
tests/fusion.smoke.js  Smoke test do menu Fusion e do som com samples
tests/scaleinfo.test.js Testes da ficha das escalas — node tests/scaleinfo.test.js
tests/scaleinfo.smoke.js Smoke test da ficha da escala na Biblioteca
tests/patterns.test.js Testes dos Exercícios de Padrões — node tests/patterns.test.js
tests/padroes.smoke.js Smoke test da tela de Exercícios de Padrões
tests/escalas.test.js  Testes da Biblioteca de Escalas — node tests/escalas.test.js
tests/escalas.smoke.js Smoke test da tela Biblioteca de Escalas
tests/som.smoke.js     Mede o volume real na saída de áudio em cada modo e instrumento
tests/toque.smoke.js   Mede o TOQUE: variação de força entre as notas e silêncio entre elas
tests/ouvir.smoke.js   Confere a cor dos 80 botões de ouvir (azul parado, vermelho tocando)
tests/sugestoes.smoke.js Caixa de ideias: quem usa manda, quem administra lê
tests/tablatura.test.js Confere que a tablatura bate com as notas (1 milhão de casas, todas as digitações)
tests/digitacoes.smoke.js As opções de digitação na tela (trocar a região sem mudar as notas)
tests/boasvindas.smoke.js A tela de boas-vindas: aparece uma vez só, e aponta o 💡
tests/teoria.smoke.js  A tela de Teoria Musical: 28 lições, blocos e exemplos que tocam
tests/progresso.smoke.js Mede a execução dos exercícios (tocou junto até o fim)
tests/cores.smoke.js   Mede o contraste do texto nos dois temas (claro e escuro)
tests/screenshot*.js   Scripts opcionais de checagem visual com Playwright (dev only)
email/                 Modelos dos e-mails do Supabase (confirmação, senha nova, convite) — ver docs/emails-supabase.md
docs/                  PRD, mapa do sistema, matriz RBAC, catálogo de módulos, status e guias do Supabase/Planos
```

## Rodar os testes

```
node tests/theory.test.js
node tests/phrases.test.js
node tests/lab.test.js
node tests/lessons.test.js
node tests/library.test.js
node tests/articulation.test.js
```

`tests/audio.smoke.js`, `tests/etapa4.smoke.js`, `tests/etapa4.smoke2.js`,
`tests/etapa4.e2e.js` e os `tests/screenshot*.js` são opcionais (dev only) e
precisam do Playwright instalado (`npm install playwright`) — não são
necessários para o site funcionar, só para checagem automatizada durante o
desenvolvimento. Rodam assim:

```
node tests/etapa4.smoke.js
node tests/etapa4.smoke2.js
node tests/etapa4.e2e.js
node tests/etapa5.smoke.js
node tests/acesso.smoke.js
node tests/admin.smoke.js
node tests/etapa5.aulas.smoke.js
node tests/fraseados.smoke.js
node tests/biblioteca.smoke.js
node tests/celular.smoke.js
node tests/inicio.smoke.js
node tests/acordes.test.js
node tests/acordes.smoke.js
node tests/toque.smoke.js
node tests/tablatura.test.js
node tests/ouvir.smoke.js
node tests/sugestoes.smoke.js
node tests/digitacoes.smoke.js
node tests/boasvindas.smoke.js
node tests/teoria.smoke.js
node tests/progresso.smoke.js
node tests/cores.smoke.js
```

`tests/celular.smoke.js` percorre o site em três tamanhos de telefone
(390×844, 360×740 e 320×568) e reprova qualquer tela que role para o lado,
botão abaixo de 40px ou campo com fonte menor que 16px — no fim, confere
que o computador continua como era.

Todos os testes devem passar antes de qualquer alteração ser considerada
pronta (é o item 9 do padrão de qualidade do projeto).

## No celular

Abaixo de 860px de largura o site se reorganiza sozinho: o menu lateral vira
uma **gaveta** (botão ☰ no topo — escolher um item, tocar fora ou apertar Esc
fecha), a barra do topo se desdobra em linhas e a tabela da análise, a
tablatura e a partitura passam a rolar **dentro da própria caixa**, em vez de
empurrar a página. A partitura fica no tamanho natural e não espremida, para
o nome das notas continuar legível; onde isso acontece, aparece o aviso
"↔ deslize para o lado". Os campos ficam com 16px de fonte de propósito:
abaixo disso o iPhone dá zoom sozinho quando o dedo toca no campo.

## Entrar: login obrigatório e administrador (Etapa 6)

Com o Supabase configurado (`js/config.js`), o IMPROVIX é um **sistema
fechado**: quem abre o endereço vê só a tela de entrada — nem menu, nem
telas, nem o ✕ para fechar. Dentro, cada pessoa tem conta com e-mail e
senha, e os dados dela são só dela.

**O primeiro cadastro vira o administrador.** Faça o seu antes de divulgar o
endereço: é esse primeiro e-mail que ganha a coroa. Daí em diante, na tela
**👑 Administração**:

- **Contas**: liberar ou suspender a liberação, tornar admin, escolher
  **quais telas** aquela pessoa vê, mandar o **e-mail de senha nova** e
  **bloquear** (com motivo — quem está bloqueado cai na hora que voltar para
  a aba). Sua própria conta não tem botões: é o que garante que nunca se
  fique sem administrador.
- **Sistema**: quem pode entrar (**com aprovação**, **cadastro livre** ou
  **fechado, só por convite**), o **recado da tela de entrada**, as telas
  liberadas para todo mundo e os **convites por e-mail** (quem se cadastra
  com um e-mail convidado entra já liberado).

Administrador nenhum vê a senha de ninguém: a "senha nova" é um e-mail que o
próprio Supabase manda, e a pessoa escolhe a senha no link.

**Até onde o login protege.** Os **dados** ficam protegidos pelo banco, não
pela tela: as políticas de RLS (`sql/schema.sql`) recusam quem não foi
liberado mesmo que a pessoa chame a API por fora do site — é o que
`tests/rls.sql` confere num PostgreSQL de verdade. Já os **arquivos** do
site (HTML, CSS, JS, as frases que o programa gera) são públicos por
natureza: o site é estático e qualquer pessoa com o endereço baixa esses
arquivos. O login fecha o uso prático e os dados; esconder o código exigiria
um servidor próprio, que este projeto de propósito não tem.

Sem o Supabase configurado (valores de exemplo em `js/config.js`), o site
funciona como nas Etapas 1–3: aberto, sem login e sem salvar nada entre
visitas. O passo a passo da configuração está em
**`docs/etapa4-supabase.md`** — leva uns 10 minutos e não tem custo.

## Instrumentos sem traste (sax, trompete, violino, flauta)

Esses instrumentos tocam uma nota de cada vez, então a aba Fraseados mostra
Partitura ou Cifra (o botão "Tab" fica desabilitado). Para simplificar, o
áudio e as notas exibidas estão sempre em tom concertante (o que soa é
exatamente o que está escrito) — sax e trompete são instrumentos
transpositores na partitura tradicional deles, mas essa "leitura transposta"
fica para uma etapa futura, se fizer falta.

## Planos Gratuito/Pro — encerrados (13/10/2026)

Os planos saíram do IMPROVIX. **Quem entra tem tudo**, inclusive o nível
Avançado dos fraseados. O que limita o acesso agora é só a liberação da
conta e as telas que o administrador deixa abertas. O histórico de como
funcionava está em `docs/etapa5-planos.md`.

## Laboratório (Etapa 5) — virou Biblioteca de Acordes

A aba saiu em 13/10/2026 e deu lugar à **Biblioteca de Acordes** (acima). O
motor de progressões (`js/lab.js`) continua no projeto: é ele que sugere a
progressão quando se troca a tonalidade na Análise de Harmonia.

## Aulas (Etapa 5)

Item "🎓 Aulas" no menu lateral. 8 lições curtas (campo harmônico, leitura de cifras, escalas e
modos, arpejos e notas-alvo, dominantes secundários, os 5 tipos de frase,
blues/turnarounds, ii–V–I) com um botão "Testar este exemplo" em cada uma
que manda a progressão de exemplo direto para a análise. Conteúdo em
`js/lessons.js`.

## Roadmap

Ver `docs/PRD.md` para o roadmap completo. Com a Etapa 5 (instrumentos,
planos, Laboratório e Aulas), todo o escopo original do PRD foi entregue.

## Publicar na internet (GitHub + Vercel, de graça)

> **No ar desde 15/09/2026: <https://improvix.vercel.app>**
> Repositório `con1dera-droid/improvix`, site no Vercel (Hobby) e banco no
> Supabase (Free) — tudo em plano gratuito. Daqui para a frente, publicar
> uma mudança é só `git push` na branch `main`.

O site é estático: não tem servidor, não tem build, não tem custo. Os
arquivos deste repositório já são o site pronto — por isso qualquer
hospedagem de site estático serve, e o plano gratuito do Vercel sobra.

**1. Mandar o código para o GitHub** (uma vez só):

Crie um repositório vazio em <https://github.com/new> — sem README, sem
.gitignore, sem licença (este projeto já tem os seus). Depois, no Terminal:

```bash
cd ~/IMPROVIX
git remote add origin https://github.com/SEU-USUARIO/improvix.git
git branch -M main
git push -u origin main
```

**2. Publicar no Vercel** (uma vez só):

1. Entre em <https://vercel.com> com a conta do GitHub.
2. **Add New… → Project** e escolha o repositório `improvix`.
3. Em *Framework Preset*, escolha **Other**. Deixe *Build Command* e
   *Output Directory* vazios — não há build: o site é a própria raiz.
4. **Deploy**. Em um minuto sai um endereço tipo
   `improvix.vercel.app`, com HTTPS.

**3. Atualizar depois**: `git push` e pronto. O Vercel publica sozinho a
cada commit no `main` — nunca mais subir arquivo na mão.

O `vercel.json` já cuida de duas coisas: cabeçalhos de segurança (e a
permissão de microfone/captura de aba que a tela de Transcrição precisa) e
o cache — página, `js/` e `css/` sempre revalidam (uma atualização aparece
no primeiro reload), enquanto `sounds/` e `vendor/`, que são pesados e
quase nunca mudam, ficam guardados por uma semana. O `.vercelignore`
mantém `tests/`, `docs/` e os arquivos de trabalho fora do site publicado.
Não ponha comentário no `vercel.json`: o Vercel valida o arquivo contra um
schema fechado e recusa qualquer campo a mais (inclusive um `"comment"`).

**4. Apontar o Supabase para o endereço público** (uma vez só, e importante):
no painel do Supabase, *Authentication → URL Configuration*, ponha o
endereço do site em **Site URL** (ex.: `https://improvix.vercel.app`) e
deixe em **Redirect URLs** tanto ele (`https://improvix.vercel.app/**`)
quanto `http://localhost:3000/**`, para continuar testando na sua máquina.
Sem isso, o e-mail de confirmação de cadastro manda quem se cadastrar para
`localhost`, que só existe no computador de quem programou.

**Domínio próprio** (opcional): no painel do projeto, *Settings → Domains*.
O domínio é pago (uns R$ 40–60 por ano no registro.br ou similar); o
Vercel não cobra nada para apontar.

### Administração

Depois de configurar o Supabase, um dos usuários vira administrador por um
`update` rodado no SQL Editor (passo 6 de `docs/etapa4-supabase.md`). O
admin ganha o item **👑 Administração** no menu: lista de contas, tornar
Pro, promover a admin e bloquear/desbloquear com motivo.

Bloquear tira o acesso de verdade — as políticas do banco recusam leitura e
escrita de quem está bloqueado, mesmo por fora do site, e a pessoa é
desconectada assim que abrir ou voltar para a aba. Nem o admin muda o
próprio papel ou se bloqueia, para nunca ficar sem administrador.

As regras são conferidas por teste num PostgreSQL de verdade:

```bash
bash tests/rls.sh      # 23 checagens; falha se alguma regra deixar passar
node tests/admin.smoke.js
```

### Login e contas no site publicado

Sem configurar o Supabase, o site publicado funciona inteiro para estudo —
análise, escalas, fraseados, padrões, transcrição e áudio. Só o que depende
de conta (salvar histórico, favoritos e Meus Exercícios) fica desativado,
com um aviso explicando. Para ligar isso depois, siga
`docs/etapa4-supabase.md`: crie um projeto gratuito no Supabase, rode
`sql/schema.sql` e ponha a URL e a chave anônima em `js/config.js`. A chave
anônima é pública por natureza (quem protege os dados é o RLS do banco),
então ela pode ficar versionada normalmente.
