# ImprovisaLab — Etapa 1

Sistema online de improvisação: transforma uma progressão de acordes em
análise harmônica completa (campo harmônico, função de cada acorde, escalas,
arpejos e notas-alvo recomendados), para teclado, guitarra e baixo.

Esta é a **Etapa 1** do roadmap (ver `docs/PRD.md`): só o motor de análise
harmônica, sem login, sem áudio e sem fraseados/tablatura ainda — por isso
roda 100% no navegador, sem servidor e sem custo.

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
index.html          Tela principal (layout do print de referência)
css/styles.css       Estilos (tema escuro)
js/data.js           Dados de teoria musical (escalas, qualidades de acorde, campo harmônico)
js/theory.js         Motor de teoria musical (parser de cifra, análise da progressão)
js/app.js            Liga a tela ao motor (sem framework, JS puro)
tests/theory.test.js Testes automáticos do motor (node tests/theory.test.js)
tests/screenshot.js  Script opcional de checagem visual com Playwright (dev only)
docs/                PRD, mapa do sistema, matriz RBAC e catálogo de módulos
```

## Rodar os testes

```
node tests/theory.test.js
```

Todos os testes devem passar antes de qualquer alteração no motor de teoria
ser considerada pronta (é o item 9 do padrão de qualidade do projeto).

## Roadmap

Ver `docs/PRD.md` para o roadmap completo (Etapa 2: fraseados e tablatura;
Etapa 3: áudio; Etapa 4: login/histórico/favoritos; Etapa 5: mais
instrumentos e planos pagos).
