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

## Próxima etapa
Etapa 5 (partes 2, 3 e 4) — Laboratório, Aulas e plano Pro pago (ver
`docs/PRD.md` para o escopo completo).

## Arquivos do projeto
`index.html`, `css/styles.css`, `js/data.js`, `js/theory.js`, `js/phrases.js`,
`js/notation.js`, `js/audio.js`, `js/app.js`, `js/config.js`,
`js/supabaseClient.js`, `js/auth-ui.js`, `sql/schema.sql`,
`tests/theory.test.js`, `tests/phrases.test.js`, `tests/audio.smoke.js`,
`tests/etapa4.smoke.js`, `tests/etapa4.smoke2.js`, `tests/etapa4.e2e.js`,
`tests/etapa5.smoke.js`, `tests/screenshot*.js` (dev only), `docs/PRD.md`,
`docs/mapa-do-sistema.md`, `docs/matriz-rbac.md`, `docs/modulos.md`,
`docs/status.md`, `docs/etapa4-supabase.md`, `README.md`.

Entregue na pasta local do usuário: `IMPROVIX/` (repositório git, um commit
por etapa).
