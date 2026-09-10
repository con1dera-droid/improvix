# Créditos dos sons

Os arquivos `sounds/*.js` trazem amostras (samples) de instrumentos reais
retiradas do banco **FluidR3_GM** (autor: Frank Wen), na conversão feita pelo
projeto **midi-js-soundfonts** de Benjamin Gleitzman:

- Fonte: https://github.com/gleitz/midi-js-soundfonts
- Licença: **Creative Commons Attribution 3.0 (CC BY 3.0)** —
  https://creativecommons.org/licenses/by/3.0/

O ImprovisaLab usa só uma nota a cada 3 semitons de cada instrumento (cortada
em ~1,5 s) e transpõe as vizinhas na hora de tocar; também aplica bends,
slides, hammer-ons/pull-offs e vibrato por software.

| Arquivo | Instrumento no FluidR3_GM |
|---|---|
| guitarra.js | electric_guitar_clean |
| guitarra_drive.js | overdriven_guitar |
| violao.js | acoustic_guitar_nylon |
| baixo.js | electric_bass_finger |
| teclado.js | acoustic_grand_piano |
| piano_eletrico.js | electric_piano_1 |
| sax.js | alto_sax |
| trompete.js | trumpet |
| violino.js | violin |
| flauta.js | flute |

Se não for possível carregar os samples, o sistema toca com o sintetizador
interno (modo "Sintetizado").
