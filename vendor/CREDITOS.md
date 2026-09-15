# Bibliotecas de terceiros

Arquivos desta pasta **não** são do IMPROVIX: são bibliotecas de código
aberto, guardadas aqui (em vez de vir de um CDN) para o site continuar
funcionando aberto direto do `index.html`, sem servidor e sem internet.

| Arquivo | O que é | Autor | Licença |
|---|---|---|---|
| `tfjs.js` | TensorFlow.js 4.22.0 (roda a rede neural no navegador) | Google | Apache 2.0 |
| `basic-pitch.js` | Basic Pitch 1.0.1 — conversor de áudio para notas | Spotify | Apache 2.0 |
| `modelo-notas.js` | Os pesos do modelo do Basic Pitch | Spotify | Apache 2.0 |

- TensorFlow.js: https://github.com/tensorflow/tfjs
- Basic Pitch: https://github.com/spotify/basic-pitch-ts

A licença **Apache 2.0** permite uso, modificação e redistribuição, inclusive
comercial, exigindo apenas manter o aviso de direitos autorais e a licença —
que é o que este arquivo faz.

## O que foi mudado

Nada no comportamento. Duas adaptações de empacotamento:

1. `basic-pitch.js` é o pacote `@spotify/basic-pitch` empacotado num único
   arquivo (esbuild, formato IIFE), publicando `window.BasicPitchLib`. O
   TensorFlow.js fica de fora do pacote e é lido de `window.tf`.
2. `modelo-notas.js` traz o `model.json` e o arquivo de pesos (`.bin`) do
   modelo dentro de um único JavaScript, em base64 (`window.IL_MODELO_NOTAS`).
   O formato original precisa de `fetch`, que o navegador bloqueia em
   `file://` — assim o modelo carrega igual aos samples de `sounds/`.

Total: ~2,7 MB, carregados **só** quando a tela "Transcrição / Treino" é
aberta (nenhuma outra tela do site puxa esses arquivos).
