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
ao primeiro, com cerco cromático. Cada frase é exibida em:
- **Tab** (guitarra/baixo) — tablatura de verdade, com escolha de
  corda/traste por condução de vozes (menor distância ao traste anterior);
- **Partitura** simplificada (SVG com pauta, claves e notas na posição certa,
  incluindo linhas suplementares);
- **Cifra** (sequência de notas).

Mostra também as notas utilizadas e uma explicação em texto de cada frase.
14 testes automáticos (`tests/phrases.test.js`).

## Próxima etapa
Etapa 3 — Áudio: tocar a progressão (backing) e cada fraseado via síntese no
navegador (Web Audio/Tone.js), sem custo de servidor.

## Arquivos do projeto
`index.html`, `css/styles.css`, `js/data.js`, `js/theory.js`, `js/phrases.js`,
`js/notation.js`, `js/app.js`, `tests/theory.test.js`, `tests/phrases.test.js`,
`tests/screenshot*.js` (dev only), `docs/PRD.md`, `docs/mapa-do-sistema.md`,
`docs/matriz-rbac.md`, `docs/modulos.md`, `docs/status.md`, `README.md`.

Entregue na pasta local do usuário: `IMPROVIX/` (repositório git, commits por
etapa).
