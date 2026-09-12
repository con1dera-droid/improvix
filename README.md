# ImprovisaLab — Etapas 1 a 5 (instrumentos + planos + Laboratório + Aulas)

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
- **Etapa 5 (parte 2 — planos Gratuito/Pro)**: o nível **Avançado** dos
  fraseados (3ª escala recomendada por acorde + frases de tensão) agora é
  exclusivo do plano Pro. Sem cobrança configurada ainda — virar Pro é
  manual por enquanto (ver `docs/etapa5-planos.md`), sem nenhum botão de
  pagamento na tela.
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
- **Som real**: samples de instrumentos (FluidR3_GM, CC BY 3.0 — créditos em
  `sounds/CREDITOS.md`); seletor Real / Guitarra com drive / Sintetizado.
  Todos os níveis liberados, inclusive o Avançado (estilo Parker completo).

O site continua sendo 100% estático (sem servidor próprio) — mesmo com login,
quem guarda os dados é o Supabase (gratuito), acessado direto do navegador.
Veja `docs/etapa4-supabase.md` para o passo a passo (é o único passo manual,
porque exige criar uma conta em outro serviço).

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
tests/etapa5.planos.smoke.js Smoke test do gate Gratuito/Pro (nível Avançado, Configurações)
tests/etapa5.laboratorio.smoke.js Smoke test do Laboratório (bloqueio, sorteio, enviar para análise)
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
tests/screenshot*.js   Scripts opcionais de checagem visual com Playwright (dev only)
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
node tests/etapa5.planos.smoke.js
node tests/etapa5.laboratorio.smoke.js
node tests/etapa5.aulas.smoke.js
node tests/fraseados.smoke.js
node tests/biblioteca.smoke.js
```

Todos os testes devem passar antes de qualquer alteração ser considerada
pronta (é o item 9 do padrão de qualidade do projeto).

## Login e dados salvos (Etapa 4)

Por padrão, `js/config.js` vem com valores de exemplo e o login fica
desabilitado (com um aviso), mas o resto do site funciona normalmente. Para
habilitar contas de usuário, histórico, favoritos e "Meus Exercícios", siga
o passo a passo em **`docs/etapa4-supabase.md`** — leva uns 10 minutos e não
tem custo.

## Instrumentos sem traste (sax, trompete, violino, flauta)

Esses instrumentos tocam uma nota de cada vez, então a aba Fraseados mostra
Partitura ou Cifra (o botão "Tab" fica desabilitado). Para simplificar, o
áudio e as notas exibidas estão sempre em tom concertante (o que soa é
exatamente o que está escrito) — sax e trompete são instrumentos
transpositores na partitura tradicional deles, mas essa "leitura transposta"
fica para uma etapa futura, se fizer falta.

## Planos Gratuito/Pro (Etapa 5)

O nível Avançado dos fraseados é exclusivo do plano Pro. Não há cobrança
configurada nesta instalação — virar Pro é manual (um `update` no SQL
Editor do Supabase), documentado em `docs/etapa5-planos.md`, que também
explica a trava de segurança que impede um usuário de se autopromover.

## Laboratório (Etapa 5)

Exclusivo do plano Pro — item "🧪 Laboratório" no menu lateral. Por
enquanto tem uma ferramenta: um gerador de progressões prontas para
praticar (Jazz, Blues, Pop/Rock, Modal), com explicação de cada uma e um
botão para mandar direto para a análise (fraseados, tab/partitura e áudio
saem na hora). Os modelos ficam em `js/lab.js`.

## Aulas (Etapa 5)

Item "🎓 Aulas" no menu lateral — **livre**, sem precisar de login nem de
plano Pro. 8 lições curtas (campo harmônico, leitura de cifras, escalas e
modos, arpejos e notas-alvo, dominantes secundários, os 5 tipos de frase,
blues/turnarounds, ii–V–I) com um botão "Testar este exemplo" em cada uma
que manda a progressão de exemplo direto para a análise. Conteúdo em
`js/lessons.js`.

## Roadmap

Ver `docs/PRD.md` para o roadmap completo. Com a Etapa 5 (instrumentos,
planos, Laboratório e Aulas), todo o escopo original do PRD foi entregue.
