# Créditos dos sons

Os arquivos `sounds/*.js` trazem amostras (samples) de instrumentos reais do
banco **MusyngKite**, na conversão feita pelo projeto **midi-js-soundfonts**
de Benjamin Gleitzman:

- Fonte: https://github.com/gleitz/midi-js-soundfonts
- Licença: **Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)** —
  https://creativecommons.org/licenses/by-sa/3.0/

A licença **ShareAlike** vale para estes arquivos de som: qualquer versão
modificada deles (recortada, reconvertida, remixada) tem de ser distribuída
com a mesma licença e com este crédito. Ela **não** se estende ao restante do
IMPROVIX (o código do site continua sendo do projeto) — é o mesmo caso de
usar uma trilha licenciada dentro de um programa.

O IMPROVIX guarda **uma nota a cada 2 semitons** de cada instrumento
(MP3 de ~3 s, como vieram do banco) e transpõe as vizinhas na hora de tocar,
então nenhuma nota é esticada mais do que meio tom. Por cima disso o player
faz por software os bends, slides, hammer-ons/pull-offs, vibrato, a dinâmica
e a ambiência (uma reverberação curta gerada no próprio navegador, sem baixar
nada — seletor "sala" no alto da tela).

| Arquivo | Instrumento no MusyngKite | Notas |
|---|---|---|
| guitarra.js | electric_guitar_clean | 30 |
| guitarra_drive.js | overdriven_guitar | 30 |
| violao.js | acoustic_guitar_nylon | 27 |
| baixo.js | electric_bass_finger | 24 |
| teclado.js | acoustic_grand_piano | 37 |
| piano_eletrico.js | electric_piano_1 | 30 |
| sax.js | alto_sax | 22 |
| trompete.js | trumpet | 21 |
| violino.js | violin | 25 |
| flauta.js | flute | 23 |

Total: ~7,4 MB, carregados só quando aquele instrumento toca (nada é baixado
ao abrir a página).

Se não for possível carregar os samples, o sistema toca com o sintetizador
interno (modo "Sintetizado").

## Histórico

Até 11/09/2026 o projeto usava o banco **FluidR3_GM** (autor: Frank Wen,
CC BY 3.0), com uma nota a cada 3 semitons. Foi trocado pelo MusyngKite a
pedido do dono do projeto, por soar mais próximo do instrumento real — em
especial na guitarra e no piano — e por ter o dobro de notas gravadas.
