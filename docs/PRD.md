# PRD — ImprovisaLab

## 1. Visão
Sistema web que transforma uma progressão de acordes em material pronto para
estudo de improvisação: análise harmônica, escalas e arpejos recomendados,
notas-alvo, fraseados prontos (com tablatura/cifra/partitura) e, mais adiante,
áudio.

Layout de referência: tela "Início" enviada pelo usuário (ImprovisaLab —
Teoria • Harmonia • Prática), com os campos Tonalidade / Instrumento / Nível /
Progressão de acordes e as abas Visão Geral, Escalas, Arpejos, Notas-alvo,
Fraseados, Exercícios e Teoria.

## 2. Público-alvo
Músicos (nível básico a intermediário) que já sabem tocar acordes e querem
aprender a improvisar sobre eles. Foco inicial em três instrumentos:
**teclado, guitarra e baixo**.

## 3. Problema que resolve
Hoje o músico precisa cruzar várias fontes (teoria de campo harmônico, tabela
de escalas por acorde, banco de frases, tablaturas) para montar um estudo de
improvisação sobre uma progressão. O ImprovisaLab junta tudo isso em um único
fluxo: digitar a progressão → receber a análise completa.

## 4. Escopo por etapa

### Etapa 1 (este MVP) — Motor de análise harmônica
- Usuário digita Tonalidade + Progressão de acordes (ex.: `Gmaj7 | Em7 | Am7 | D7`)
  e escolhe Instrumento (teclado, guitarra ou baixo) e Nível.
- Sistema calcula e exibe:
  - Campo harmônico e tonalidade identificada.
  - Para cada acorde: grau, função (tônica/subdominante/dominante/relativa),
    notas do acorde.
  - Aba **Escalas**: escalas recomendadas por acorde.
  - Aba **Arpejos**: arpejos recomendados por acorde.
  - Aba **Notas-alvo**: nota-alvo (normalmente a 3ª) de cada acorde.
- Sem login, sem custo de servidor: roda como site estático (o "motor de
  teoria musical" é uma biblioteca JavaScript que roda no navegador).
- Sem áudio, sem fraseados/tablatura, sem histórico/favoritos nesta etapa.

### Etapa 2 — Fraseados e tablatura/partitura
- Aba **Fraseados**: biblioteca de frases prontas por acorde/escala, com
  nível (fácil/intermediário/avançado) e objetivo (melódica, blues, tensão,
  conectando acordes, resolução) — igual à seção "Fraseados e Exercícios" do
  layout de referência.
- Exibição em Tablatura (guitarra/baixo) e Cifra/Partitura (teclado e os
  demais), com "notas utilizadas" e explicação da frase.

### Etapa 3 — Áudio
- "Ouça a progressão": toca a progressão como backing track sintetizado no
  navegador (Web Audio / Tone.js — sem custo de servidor de áudio).
- Tocar cada fraseado individualmente.

### Etapa 4 — Contas de usuário
- Login (ex.: Supabase Auth, gratuito), histórico de análises, favoritos,
  "Meus Exercícios", planos (Gratuito/Pro).

### Etapa 5 — Expansão
- Demais instrumentos da tela (violão, sax, trompete, violino, flauta),
  Laboratório, Aulas, plano Pro pago, exercícios avançados.

## 5. Fora do escopo do MVP (Etapa 1)
Login, histórico, favoritos, fraseados/tablatura, áudio, planos pagos,
instrumentos além de teclado/guitarra/baixo, biblioteca de escalas/fraseados
navegável separadamente.

## 6. Critério de sucesso da Etapa 1
Usuário digita uma progressão válida e, em menos de 2 segundos, vê a análise
harmônica completa (campo harmônico, função de cada acorde, escalas, arpejos
e notas-alvo) corretamente para teclado, guitarra e baixo, sem erros de teoria
musical nos casos de teste (progressões maiores e menores comuns: I-vi-ii-V,
ii-V-I, blues, etc.).

## 7. Restrições
- Custo zero na Etapa 1 (hospedagem estática gratuita, sem banco de dados).
- Stack e hospedagem definitivas (a partir da Etapa 4, quando entra login)
  ficam para decisão na Fase 3 (deploy) daquela etapa — provável Supabase
  (Postgres + Auth, plano free) + Vercel/Netlify (frontend, plano free).

## 8. Dívidas aceitas
- Etapa 1 não terá testes automatizados de UI (E2E), apenas testes unitários
  do motor de teoria musical — aceito para acelerar a primeira versão.
