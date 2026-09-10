# ImprovisaLab — Etapas 1 a 4

Sistema online de improvisação: transforma uma progressão de acordes em
análise harmônica completa (campo harmônico, função de cada acorde, escalas,
arpejos e notas-alvo recomendados) e em fraseados prontos com tablatura,
partitura simplificada e cifra — para teclado, guitarra e baixo.

Concluído até agora (ver `docs/PRD.md` e `docs/status.md`):
- **Etapa 1**: motor de análise harmônica (aba Visão Geral/Escalas/Arpejos/Notas-alvo).
- **Etapa 2**: aba Fraseados — uma frase por acorde da progressão (melódica,
  blue, conectando, tensão) mais uma frase de resolução, exibidas em
  Tab (guitarra/baixo), Partitura simplificada ou Cifra.
- **Etapa 3**: áudio — "Ouça a progressão" toca o backing sintetizado da
  harmonia (com destaque do acorde que está soando) e cada fraseado pode
  ser tocado pelo botão 🔊 Áudio, tudo via Web Audio API (sem gravações).
- **Etapa 4**: contas de usuário (opcional) — login/cadastro, histórico de
  análises, favoritos e "Meus Exercícios", usando Supabase (Postgres + Auth
  + Row Level Security) gratuito. Sem configurar o Supabase, o site continua
  funcionando 100% como nas Etapas 1–3, só sem salvar nada entre visitas.

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
js/phrases.js         Gerador de fraseados (Etapa 2): uma frase por acorde + resolução
js/notation.js        Realização de oitavas, tablatura e partitura simplificada (Etapa 2)
js/audio.js           Síntese de áudio via Web Audio API (Etapa 3): progressão e fraseados
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
tests/screenshot*.js   Scripts opcionais de checagem visual com Playwright (dev only)
docs/                  PRD, mapa do sistema, matriz RBAC, catálogo de módulos, status e guia do Supabase
```

## Rodar os testes

```
node tests/theory.test.js
node tests/phrases.test.js
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
```

Todos os testes devem passar antes de qualquer alteração ser considerada
pronta (é o item 9 do padrão de qualidade do projeto).

## Login e dados salvos (Etapa 4)

Por padrão, `js/config.js` vem com valores de exemplo e o login fica
desabilitado (com um aviso), mas o resto do site funciona normalmente. Para
habilitar contas de usuário, histórico, favoritos e "Meus Exercícios", siga
o passo a passo em **`docs/etapa4-supabase.md`** — leva uns 10 minutos e não
tem custo.

## Roadmap

Ver `docs/PRD.md` para o roadmap completo. Falta: Etapa 5 (mais
instrumentos, Laboratório, Aulas, plano Pro).
