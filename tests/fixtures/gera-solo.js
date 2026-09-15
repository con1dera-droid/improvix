/**
 * Gera um solo sintético (.wav) para o teste da tela de Transcrição.
 *
 * O arquivo de áudio não fica no repositório (é grande e muda nada), então
 * este script o recria na hora, sempre igual (a semente é fixa).
 *
 *   node tests/fixtures/gera-solo.js [saida.wav] [segundos]
 */
const fs = require('fs');
const path = require('path');

const SR = 22050;              // taxa de amostragem
const DUR = 0.35;              // duração de cada nota, em segundos
const ESCALA = [62, 64, 65, 67, 69, 71, 72, 74];   // ré menor, do ré ao ré

// sorteio próprio, com semente fixa, para o teste dar sempre o mesmo áudio
function sorteio(semente) {
  let s = semente >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gerar(segundos, semente) {
  const rnd = sorteio(semente === undefined ? 7 : semente);
  const quantas = Math.ceil(segundos / DUR);
  const notas = [];
  for (let i = 0; i < quantas; i++) notas.push(ESCALA[Math.floor(rnd() * ESCALA.length)]);

  const porNota = Math.round(SR * DUR);
  const pcm = Buffer.alloc(notas.length * porNota * 2);
  let p = 0;
  for (const midi of notas) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    for (let i = 0; i < porNota; i++) {
      const t = i / SR;
      const env = Math.min(1, t / 0.01) * Math.min(1, (DUR - t) / 0.06);
      const onda = Math.sin(2 * Math.PI * freq * t)
        + Math.sin(2 * Math.PI * freq * 2 * t) / 3.4
        + Math.sin(2 * Math.PI * freq * 3 * t) / 5.1;
      const v = Math.max(-1, Math.min(1, onda * env * 0.5));
      pcm.writeInt16LE(Math.round(v * 30000), p);
      p += 2;
    }
  }
  return { pcm: pcm, notas: notas };
}

function wav(pcm) {
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0);
  cab.writeUInt32LE(36 + pcm.length, 4);
  cab.write('WAVEfmt ', 8);
  cab.writeUInt32LE(16, 16);
  cab.writeUInt16LE(1, 20);        // PCM
  cab.writeUInt16LE(1, 22);        // mono
  cab.writeUInt32LE(SR, 24);
  cab.writeUInt32LE(SR * 2, 28);
  cab.writeUInt16LE(2, 32);
  cab.writeUInt16LE(16, 34);
  cab.write('data', 36);
  cab.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([cab, pcm]);
}

// Recria o arquivo só se ele ainda não existir. Devolve o caminho.
function garantir(destino, segundos) {
  const alvo = destino || path.join(__dirname, 'solo-teste.wav');
  if (fs.existsSync(alvo)) return alvo;
  fs.mkdirSync(path.dirname(alvo), { recursive: true });
  const r = gerar(segundos || 32, 7);
  fs.writeFileSync(alvo, wav(r.pcm));
  return alvo;
}

module.exports = { garantir: garantir, gerar: gerar, wav: wav };

if (require.main === module) {
  const destino = process.argv[2] || path.join(__dirname, 'solo-teste.wav');
  const segundos = Number(process.argv[3]) || 32;
  const r = gerar(segundos, 7);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, wav(r.pcm));
  console.log('gerado ' + destino + ' — ' + (r.notas.length * DUR).toFixed(1) + ' s, ' + r.notas.length + ' notas');
}
