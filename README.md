# ImprovisaLab — Etapas 1 e 2

Sistema online de improvisação: transforma uma progressão de acordes em
análise harmônica completa (campo harmônico, função de cada acorde, escalas,
arpejos e notas-alvo recomendados) e em fraseados prontos com tablatura,
partitura simplificada e cifra — para teclado, guitarra e baixo.

Concluído até agora (ver `docs/PRD.md` e `docs/status.md`):
- **Etapa 1**: motor de análise harmônica (aba Visão Geral/Escalas/Arpejos/Notas-alvo).
- **Etapa 2**: aba Fraseados — uma frase por acorde da progressão (melódica,
  blue, conectando, tensão) mais uma frase de resolução, exibidas em
  Tab (guitarra/baixo), Partitura simplificada ou Cifra.

Ainda sem login e sem áudio — por isso roda 100% no navegador, sem servidor
e sem custo.

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
js/data.js            Dados de teoria musical (escalas, qualidades de acorde, campo harmônico)
js/theory.js          Motor de teoria musical (parser de cifra, análise da progressão)
js/phrases.js         Gerador de fraseados (Etapa 2): uma frase por acorde + resolução
js/notation.js        Realização de oitavas, tablatura e partitura simplificada (Etapa 2)
js/app.js             Liga a tela aos motores (sem framework, JS puro)
tests/theory.test.js  Testes automáticos do motor de teoria (node tests/theory.test.js)
tests/phrases.test.js Testes automáticos de fraseados e notação (node tests/phrases.test.js)
tests/screenshot*.js  Scripts opcionais de checagem visual com Playwright (dev only)
docs/                 PRD, mapa do sistema, matriz RBAC, catálogo de módulos e status
```

## Rodar os testes

```
node tests/theory.test.js
node tests/phrases.test.js
```

Todos os testes devem passar antes de qualquer alteração no motor de teoria
ser considerada pronta (é o item 9 do padrão de qualidade do projeto).

## Roadmap

Ver `docs/PRD.md` para o roadmap completo (Etapa 2: fraseados e tablatura;
Etapa 3: áudio; Etapa 4: login/histórico/favoritos; Etapa 5: mais
instrumentos e planos pagos).
