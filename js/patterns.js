/**
 * ImprovisaLab — Exercícios de Padrões
 *
 * Método clássico de estudo do jazz: um padrão curto (arpejo, notas-guia,
 * cerco, escala bebop...) sobre um acorde ou uma cadência, repetido nos 12
 * tons pelo ciclo de 4ªs, com a cifra em cada compasso.
 *
 * Duas partes: o "método progressivo" (preliminares → II–V–I → alterados) e
 * o "vocabulário mais usado, por estilo" (jazz, blues, rock, baião, bossa,
 * fusion) — as fórmulas de domínio comum que todo músico usa.
 *
 * Os padrões abaixo foram ESCRITOS PARA O IMPROVISALAB a partir do
 * vocabulário comum do jazz (graus do acorde, notas-guia, cromatismo de
 * aproximação, escala bebop, tensões do dominante). Nenhum foi transcrito de
 * livro. A organização por categorias (preliminares, dominante, menor, II–V,
 * II–V–I, II–V–i menor, V7alt) segue a progressão didática usual desse tipo
 * de método.
 *
 * Cada padrão é escrito em Dó (notas com oitava + duração) e o motor
 * transpõe para os outros tons mantendo a grafia pelo intervalo.
 *   token:   <nota><oitava>/<duração>   ex.: "Bb4/e", "F#5/q", "r/h"
 *   duração: w=4 tempos, h.=3, h=2, q.=1,5, q=1, e=½, t=⅓ (tercina), s=¼
 *
 * Funciona no navegador (window.IL.patterns) e no Node (testes).
 */
(function (root, factory) {
  var isNode = typeof module !== 'undefined' && module.exports;
  var theory = isNode ? require('./theory.js') : root.IL.theory;
  var mod = factory(theory);
  if (isNode) module.exports = mod;
  root.IL = root.IL || {};
  root.IL.patterns = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (theory) {
  'use strict';

  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var MAJOR = [0, 2, 4, 5, 7, 9, 11];
  var DUR = { w: 4, 'h.': 3, h: 2, 'q.': 1.5, q: 1, 'e.': 0.75, e: 0.5, t: 1 / 3, s: 0.25 };

  // Tons na ordem do ciclo de 4ªs (como nos métodos de padrões).
  var CYCLE_MAJOR = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G'];
  var CYCLE_MINOR = ['C', 'F', 'Bb', 'Eb', 'Ab', 'C#', 'F#', 'B', 'E', 'A', 'D', 'G'];

  // Formas harmônicas (escritas em Dó). `root` é a fundamental em Dó.
  function ch(role, rootName, q, sym, beats) { return { role: role, root: rootName, q: q, sym: sym, beats: beats }; }
  var FORMS = {
    maj: { label: 'acorde maior', cycle: 'major', chords: [ch('I', 'C', 'major7', '7M', 4)] },
    maj2: { label: 'acorde maior (2 compassos)', cycle: 'major', chords: [ch('I', 'C', 'major7', '7M', 8)] },
    dom: { label: 'acorde dominante', cycle: 'major', chords: [ch('V', 'C', 'dominant7', '7', 4)] },
    dom2: { label: 'acorde dominante (2 compassos)', cycle: 'major', chords: [ch('V', 'C', 'dominant7', '7', 8)] },
    min: { label: 'acorde menor', cycle: 'minor', chords: [ch('i', 'C', 'minor7', 'm7', 4)] },
    min2: { label: 'acorde menor (2 compassos)', cycle: 'minor', chords: [ch('i', 'C', 'minor7', 'm7', 8)] },
    iiV: { label: 'II–V (1 compasso)', cycle: 'major', chords: [ch('ii', 'D', 'minor7', 'm7', 2), ch('V', 'G', 'dominant7', '7', 2)] },
    iiV2: { label: 'II–V (2 compassos)', cycle: 'major', chords: [ch('ii', 'D', 'minor7', 'm7', 4), ch('V', 'G', 'dominant7', '7', 4)] },
    iiVI: { label: 'II–V–I', cycle: 'major', chords: [ch('ii', 'D', 'minor7', 'm7', 2), ch('V', 'G', 'dominant7', '7', 2), ch('I', 'C', 'major7', '7M', 4)] },
    iiVI2: { label: 'II–V–I (4 compassos)', cycle: 'major', chords: [ch('ii', 'D', 'minor7', 'm7', 4), ch('V', 'G', 'dominant7', '7', 4), ch('I', 'C', 'major7', '7M', 8)] },
    iiVi: { label: 'II–V–i menor', cycle: 'minor', chords: [ch('ii', 'D', 'm7b5', 'm7(b5)', 2), ch('V', 'G', 'dominant7', '7(b9)', 2), ch('i', 'C', 'minor7', 'm7', 4)] },
    iiVi2: { label: 'II–V–i menor (4 compassos)', cycle: 'minor', chords: [ch('ii', 'D', 'm7b5', 'm7(b5)', 4), ch('V', 'G', 'dominant7', '7(b9)', 4), ch('i', 'C', 'minor7', 'm7', 8)] },
    VaI: { label: 'V7alt → I', cycle: 'major', chords: [ch('V', 'G', 'dominant7', '7alt', 4), ch('I', 'C', 'major7', '7M', 4)] },
    iiVaI: { label: 'II–V7alt–I', cycle: 'major', chords: [ch('ii', 'D', 'minor7', 'm7', 2), ch('V', 'G', 'dominant7', '7alt', 2), ch('I', 'C', 'major7', '7M', 4)] },
    bluesIIV: { label: 'blues: I7 → IV7', cycle: 'major', chords: [ch('I7', 'C', 'dominant7', '7', 4), ch('IV7', 'F', 'dominant7', '7', 4)] },
    turn: { label: 'turnaround de blues (I7 IV7 I7 V7)', cycle: 'major', chords: [ch('I7', 'C', 'dominant7', '7', 2), ch('IV7', 'F', 'dominant7', '7', 2), ch('I7', 'C', 'dominant7', '7', 2), ch('V7', 'G', 'dominant7', '7', 2)] },
    lb7: { label: 'dominante lídio (7(#11))', cycle: 'major', chords: [ch('V', 'C', 'dominant7', '7(#11)', 4)] },
    maj69: { label: 'acorde 6(9)', cycle: 'major', chords: [ch('I', 'C', 'major6', '6(9)', 4)] },
    lyd: { label: 'acorde 7M(#11) (lídio)', cycle: 'major', chords: [ch('I', 'C', 'major7', '7M(#11)', 4)] }
  };

  var CATEGORIES = [
    { key: 'prelim_maior', group: 'metodo', label: 'Preliminares — acorde maior' },
    { key: 'prelim_dom', group: 'metodo', label: 'Preliminares — acorde dominante' },
    { key: 'menor', group: 'metodo', label: 'Acorde menor' },
    { key: 'iiv', group: 'metodo', label: 'II–V' },
    { key: 'iivi', group: 'metodo', label: 'II–V–I' },
    { key: 'iivi_menor', group: 'metodo', label: 'II–V–i menor' },
    { key: 'alt', group: 'metodo', label: 'V7alt → I' },
    { key: 'tercinas', group: 'metodo', label: 'Tercinas e grupetos' },
    { key: 'voc_jazz', group: 'vocab', label: 'Jazz / bebop' },
    { key: 'voc_blues', group: 'vocab', label: 'Blues' },
    { key: 'voc_rock', group: 'vocab', label: 'Rock' },
    { key: 'voc_baiao', group: 'vocab', label: 'Baião / nordeste' },
    { key: 'voc_bossa', group: 'vocab', label: 'Bossa nova / MPB' },
    { key: 'voc_fusion', group: 'vocab', label: 'Fusion' }
  ];
  var GROUPS = [
    { key: 'metodo', label: 'Método progressivo' },
    { key: 'vocab', label: 'Vocabulário mais usado, por estilo' }
  ];

  // ---------------------------------------------------------------------
  // Padrões (escritos em Dó). cells: um texto por acorde da forma.
  // ---------------------------------------------------------------------
  function P(id, cat, form, level, title, dica, cells) {
    return { id: id, cat: cat, form: form, level: level, title: title, dica: dica, cells: cells };
  }

  var PATTERNS = [
    // ---- Preliminares: acorde maior ----
    P('m1', 'prelim_maior', 'maj', 1, 'Graus 1-2-3-5', 'Fixa as notas mais estáveis do acorde maior, uma por tempo.',
      ['C4/q D4/q E4/q G4/q']),
    P('m2', 'prelim_maior', 'maj', 1, 'Tríade de ida e volta', 'Arpejo 1-3-5 subindo e voltando à 3ª.',
      ['C4/q E4/q G4/q E4/q']),
    P('m3', 'prelim_maior', 'maj', 1, 'Descendo da 5ª', '5-3-2-1: a chegada na fundamental por grau conjunto.',
      ['G4/q E4/q D4/q C4/q']),
    P('m4', 'prelim_maior', 'maj', 1, '6ª e 9ª (som maior moderno)', 'Troca a 7M pela 6ª e acrescenta a 9ª — o som da bossa nova.',
      ['E4/e G4/e A4/e D5/e C5/h']),
    P('m5', 'prelim_maior', 'maj2', 2, 'Escala de 1 a 5 e volta', 'Colcheias por grau conjunto, terminando na fundamental.',
      ['C4/e D4/e E4/e F4/e G4/e F4/e E4/e D4/e C4/h r/h']),
    P('m6', 'prelim_maior', 'maj2', 2, 'Arpejo 1-3-5-7-9 e volta', 'O arpejo do acorde com a 9ª no topo; a 4ª só de passagem.',
      ['C4/e E4/e G4/e B4/e D5/e B4/e G4/e E4/e F4/q E4/q r/h']),
    P('m7', 'prelim_maior', 'maj2', 2, 'Terças diatônicas', 'Terças da escala maior em sequência — ótimo para a leitura e a digitação.',
      ['C4/e E4/e D4/e F4/e E4/e G4/e F4/e A4/e G4/e B4/e A4/e C5/e B4/q G4/q']),
    P('m8', 'prelim_maior', 'maj2', 3, 'Arpejo e cerco da 3ª', 'Sobe o arpejo, desce, e chega na 3ª cercando por cima (4ª) e por baixo (cromático).',
      ['C4/e E4/e G4/e C5/e B4/e G4/e E4/e C4/e F4/e D#4/e E4/h r/q']),

    // ---- Preliminares: dominante ----
    P('d1', 'prelim_dom', 'dom', 1, 'Arpejo 1-3-5-b7', 'As quatro notas do acorde dominante, uma por tempo.',
      ['C4/q E4/q G4/q Bb4/q']),
    P('d2', 'prelim_dom', 'dom', 1, 'Mixolídio da b7 à 3ª', 'Desce b7-6-5-4 e para na 3ª, a nota que define o acorde.',
      ['Bb4/e A4/e G4/e F4/e E4/q r/q']),
    P('d3', 'prelim_dom', 'dom', 2, 'Arpejo 3-5-b7-9', 'O arpejo que começa na 3ª (um m7(b5) dentro do dominante) — som de bebop.',
      ['E4/e G4/e Bb4/e D5/e C5/e Bb4/e G4/e E4/e']),
    P('d4', 'prelim_dom', 'dom', 2, 'Escala bebop dominante', 'Da fundamental para baixo com a 7M de passagem: as notas do acorde caem nos tempos.',
      ['C5/e B4/e Bb4/e A4/e G4/e F4/e E4/e D4/e']),
    P('d5', 'prelim_dom', 'dom', 2, 'Cromatismo da 3ª à 5ª', 'Sobe cromático 3-4-#4-5 e desce pelo arpejo.',
      ['E4/e F4/e F#4/e G4/e Bb4/e A4/e G4/e E4/e']),
    P('d6', 'prelim_dom', 'dom', 2, 'Cerco da 3ª', '4ª por cima, #2 por baixo, 3ª no tempo — o cerco mais usado do jazz.',
      ['F4/e D#4/e E4/e G4/e Bb4/e A4/e G4/q']),
    P('d7', 'prelim_dom', 'dom', 2, '1-2-3-5 e 8-b7-6-5', 'Célula 1-2-3-5 subindo e a mixolídia descendo a partir da oitava.',
      ['C4/e D4/e E4/e G4/e C5/e Bb4/e A4/e G4/e']),
    P('d8', 'prelim_dom', 'dom2', 3, 'Arpejo com b9', 'O arpejo 3-5-b7-b9 (um diminuto) prepara a resolução no próximo tom.',
      ['E4/e G4/e Bb4/e Db5/e C5/e Bb4/e G4/e E4/e F4/h r/h']),

    // ---- Menor ----
    P('n1', 'menor', 'min', 1, 'Graus 1-2-b3-5', 'A célula 1-2-3-5 com a 3ª menor.',
      ['C4/q D4/q Eb4/q G4/q']),
    P('n2', 'menor', 'min', 1, 'Arpejo m7 com 9ª', 'Arpejo 1-b3-5-b7 subindo até a 9ª, que fica longa.',
      ['C4/e Eb4/e G4/e Bb4/e D5/h']),
    P('n3', 'menor', 'min', 2, 'Dórico de 1 a 5 e volta', 'Colcheias pelo modo dórico, a escala do IIm7.',
      ['C4/e D4/e Eb4/e F4/e G4/e F4/e Eb4/e D4/e']),
    P('n4', 'menor', 'min', 2, 'Arpejo da b3 (b3-5-b7-9)', 'O arpejo maior que mora dentro do m7 — soa sofisticado e fácil de achar.',
      ['Eb4/e G4/e Bb4/e D5/e C5/h']),
    P('n5', 'menor', 'min', 2, 'Dórico completo com a 9ª', 'A escala inteira subindo, com o salto final para a 9ª.',
      ['C4/e D4/e Eb4/e F4/e G4/e A4/e Bb4/e D5/e']),
    P('n6', 'menor', 'min', 2, 'Cerco da b3', 'Cerca a 3ª menor (4ª por cima, 2ª por baixo) e desce da 5ª.',
      ['F4/e D4/e Eb4/q G4/e F4/e Eb4/e D4/e']),
    P('n7', 'menor', 'min', 2, 'Pentatônica menor em arco', 'A pentatônica menor sobe e desce dentro do acorde.',
      ['C4/e Eb4/e F4/e G4/e Bb4/e G4/e F4/e Eb4/e']),
    P('n8', 'menor', 'min2', 3, 'Arpejo da 5ª e escala descendo', 'Arpejo 5-b7-9-11 no alto e a descida dórica até a fundamental.',
      ['G4/e Bb4/e D5/e F5/e Eb5/e D5/e C5/e Bb4/e A4/e G4/e F4/e Eb4/e D4/q C4/q']),

    // ---- II–V ----
    P('v1', 'iiv', 'iiV', 1, '1-2-b3-5 e 1-b7-6-5', 'A mesma célula no IIm7 e a mixolídia descendo no V7.',
      ['D4/e E4/e F4/e A4/e', 'G4/e F4/e E4/e D4/e']),
    P('v2', 'iiv', 'iiV', 2, 'Arpejo da b3 e arpejo descendo', 'b3-5-b7-9 no IIm7 e 5-3-1-b7 no V7: uma linha só, sem saltos.',
      ['F4/e A4/e C5/e E5/e', 'D5/e B4/e G4/e F4/e']),
    P('v3', 'iiv', 'iiV', 2, 'Arpejo e cromatismo 3-9-b9-1', 'O V7 desce cromático da 3ª até a fundamental.',
      ['D4/e F4/e A4/e C5/e', 'B4/e A4/e Ab4/e G4/e']),
    P('v4', 'iiv', 'iiV', 2, 'Da 9ª para baixo', 'Linha descendo pelos dois acordes, com as notas do acorde nos tempos.',
      ['E5/e D5/e C5/e A4/e', 'B4/e G4/e F4/e D4/e']),
    P('v5', 'iiv', 'iiV', 2, 'Desce e sobe o arpejo do V', 'IIm7 descendo por grau; V7 subindo 3-5-b7-9.',
      ['F4/e E4/e D4/e C4/e', 'B3/e D4/e F4/e A4/e']),
    P('v6', 'iiv', 'iiV', 2, 'Arpejo e cromatismo b7-13-b13-5', 'No V7 a linha desce cromática da b7 até a 5ª.',
      ['D4/e F4/e A4/e G4/e', 'F4/e E4/e Eb4/e D4/e']),
    P('v7', 'iiv', 'iiV2', 3, 'Dórico subindo e b9 no V', 'Um compasso de dórico e um de V7 que começa na b9.',
      ['D4/e E4/e F4/e G4/e A4/e C5/e B4/e A4/e', 'Ab4/e G4/e F4/e D4/e B3/e C4/e D4/e F4/e']),
    P('v8', 'iiv', 'iiV2', 3, 'Escala bebop no V', 'IIm7 em arco e a escala bebop dominante descendo da fundamental.',
      ['A4/e G4/e F4/e E4/e D4/e F4/e A4/e C5/e', 'B4/e A4/e G4/e F#4/e F4/e E4/e D4/e B3/e']),

    // ---- II–V–I ----
    P('c1', 'iivi', 'iiVI', 1, 'Arpejo, arpejo, 3ª', 'A cadência mais importante do jazz com arpejos simples e chegada na 3ª.',
      ['D4/e F4/e A4/e C5/e', 'B4/e G4/e F4/e D4/e', 'E4/h r/h']),
    P('c2', 'iivi', 'iiVI', 1, 'Notas-guia (3ª e 7ª)', 'Só as notas que definem cada acorde: b3/b7 → 3/b7 → 3/7.',
      ['F4/q C5/q', 'B4/q F4/q', 'E4/h B4/h']),
    P('c3', 'iivi', 'iiVI', 2, 'Descida e b9 → 5', 'O IIm7 desce, o V7 sobe até a b9, que resolve na 5ª do I.',
      ['F4/e E4/e D4/e C4/e', 'B3/e D4/e F4/e Ab4/e', 'G4/h r/h']),
    P('c4', 'iivi', 'iiVI', 2, 'Cromatismo 11-3-#9-9', 'No alto, o V7 desce cromático e o I desce o arpejo.',
      ['A4/e C5/e E5/e D5/e', 'C5/e B4/e Bb4/e A4/e', 'G4/e E4/e C4/q r/h']),
    P('c5', 'iivi', 'iiVI', 2, 'Subida contínua', 'Uma linha só subindo pelos três acordes, chegando na 3ª lá em cima.',
      ['D4/e E4/e F4/e A4/e', 'G4/e B4/e D5/e F5/e', 'E5/h r/h']),
    P('c6', 'iivi', 'iiVI', 2, 'Arpejo diminuto e resolução', 'No V7, o arpejo 3-5-b7-b9 (diminuto); no I, cai na 5ª e desce.',
      ['C5/e A4/e F4/e D4/e', 'B3/e D4/e F4/e Ab4/e', 'G4/q E4/q C4/h']),
    P('c7', 'iivi', 'iiVI', 3, 'Cerco da 3ª do I', 'A linha desce o V7 e chega na 3ª do I cercada (4ª e #2).',
      ['D4/e F4/e A4/e C5/e', 'D5/e B4/e Ab4/e F4/e', 'F4/e D#4/e E4/q r/h']),
    P('c8', 'iivi', 'iiVI', 3, 'Arpejo do VII° sobre o V', 'No V7 o arpejo começa na 5ª (5-b7-b9-3), um som típico do bebop.',
      ['A4/e G4/e F4/e E4/e', 'D4/e F4/e Ab4/e B4/e', 'C5/e B4/e A4/e G4/e E4/h']),
    P('c9', 'iivi', 'iiVI2', 3, 'Cadência longa', 'Dórico subindo, arpejo do V até a 9ª e o I voltando à fundamental.',
      ['D4/e E4/e F4/e G4/e A4/e B4/e C5/e A4/e', 'B4/e D5/e F5/e A5/e Ab5/e F5/e D5/e B4/e',
        'C5/e G4/e E4/e C4/e D4/e E4/e G4/e B4/e C5/w']),

    // ---- II–V–i menor ----
    P('r1', 'iivi_menor', 'iiVi', 1, 'Arpejos e chegada na b3', 'O m7(b5), o V7(b9) e a chegada na 3ª menor.',
      ['D4/e F4/e Ab4/e C5/e', 'B4/e Ab4/e F4/e D4/e', 'Eb4/h r/h']),
    P('r2', 'iivi_menor', 'iiVi', 2, 'b9 → 5', 'O V7 sobe pelo arpejo diminuto; a b9 resolve na 5ª.',
      ['Ab4/e G4/e F4/e D4/e', 'B3/e D4/e F4/e Ab4/e', 'G4/h r/h']),
    P('r3', 'iivi_menor', 'iiVi', 2, 'Descida com a b13', 'O V7 desce b7-b13-5-3 e o i sobe até a b3.',
      ['C5/e Ab4/e F4/e D4/e', 'F4/e Eb4/e D4/e B3/e', 'C4/e D4/e Eb4/q r/h']),
    P('r4', 'iivi_menor', 'iiVi', 2, 'Arpejo da b3 do m7(b5)', 'No m7(b5), o arpejo b3-b5-b7-9 (a 9ª do lócrio 9); o V desce até a b7.',
      ['F4/e Ab4/e C5/e E5/e', 'D5/e B4/e Ab4/e F4/e', 'G4/e F4/e Eb4/q r/h']),
    P('r5', 'iivi_menor', 'iiVi', 2, 'Menor harmônica', 'O V7 usa a menor harmônica do tom (b9 e 3ª) subindo até a 5ª.',
      ['D4/e Eb4/e F4/e Ab4/e', 'G4/e Ab4/e B4/e D5/e', 'C5/h r/h']),
    P('r6', 'iivi_menor', 'iiVi2', 3, 'Cadência menor longa', 'Arpejos longos em cada acorde e a menor subindo no fim.',
      ['D4/e F4/e Ab4/e C5/e D5/e C5/e Ab4/e F4/e', 'G4/e Ab4/e B4/e D5/e F5/e D5/e B4/e Ab4/e',
        'G4/e F4/e Eb4/e D4/e C4/e D4/e Eb4/e G4/e C5/h r/h']),

    // ---- V7alt ----
    P('a1', 'alt', 'VaI', 2, 'Escala alterada subindo', 'Do 3 à b9 no alto (3-#11-b13-b7-b9...) e resolve na fundamental do I.',
      ['B4/e Db5/e Eb5/e F5/e Ab5/e F5/e Eb5/e Db5/e', 'C5/h r/h']),
    P('a2', 'alt', 'VaI', 2, 'Escala alterada descendo', 'Desce a escala alterada inteira e chega na 3ª do I.',
      ['F5/e Eb5/e Db5/e B4/e Bb4/e Ab4/e G4/e F4/e', 'E4/h r/h']),
    P('a3', 'alt', 'VaI', 3, 'Tríade de b13 (Eb sobre G7)', 'A tríade maior da b13 sobre o dominante (b13-1-#9) e a descida alterada.',
      ['Eb4/e G4/e Bb4/e Eb5/e Db5/e B4/e Ab4/e F4/e', 'E4/h r/h']),
    P('a4', 'alt', 'iiVaI', 2, 'Cromatismo alterado 3-#9-b9', 'O V7alt desce 3-#9-b9-b7 e resolve na 3ª.',
      ['D4/e F4/e A4/e C5/e', 'B4/e Bb4/e Ab4/e F4/e', 'E4/h r/h']),
    P('a5', 'alt', 'iiVaI', 3, 'b13-b7-b9-3', 'Arpejo alterado subindo no V e o I descendo da fundamental.',
      ['A4/e G4/e F4/e D4/e', 'Eb4/e F4/e Ab4/e B4/e', 'C5/e G4/e E4/q r/h']),
    P('a6', 'alt', 'iiVaI', 3, 'Do alto: #9-b9-3-b13', 'Linha descendo de cima com as tensões alteradas, chegando na 5ª.',
      ['F4/e A4/e C5/e E5/e', 'Eb5/e Db5/e B4/e Ab4/e', 'G4/h r/h']),

    // ---- Tercinas e grupetos ----
    P('t1', 'tercinas', 'dom', 2, 'Tercina no arpejo', 'Arpejo em tercinas e semínima, no dominante.',
      ['C4/t E4/t G4/t Bb4/q A4/t G4/t F4/t E4/q']),
    P('t2', 'tercinas', 'maj', 2, 'Grupeto na 5ª', 'Tercina cercando a 5ª (6-#4-5) e descida por grau.',
      ['A4/t F#4/t G4/t E4/q D4/q C4/q']),
    P('t3', 'tercinas', 'iiVI', 3, 'II–V–I em tercinas', 'Tercinas no IIm7 e no V7, com chegada na 3ª.',
      ['D4/t F4/t A4/t C5/q', 'B4/t A4/t G4/t F4/q', 'E4/h r/h']),
    P('t4', 'tercinas', 'min', 3, 'Grupeto na fundamental', 'Tercina cercando a fundamental (2-7M-1), uma cor da menor melódica.',
      ['D4/t B3/t C4/t Eb4/q G4/q Bb4/q']),

    // =====================================================================
    // Vocabulário mais usado, por estilo — fórmulas de domínio comum, escritas
    // na forma genérica (nenhuma tirada de gravação ou livro).
    // Articulações (guitarra/baixo/violão): ":h" hammer-on, ":p" pull-off,
    // ":sl" slide, ":bend1"/":bend2" bend de ½ / 1 tom até a nota, ":~" vibrato.
    // =====================================================================

    // ---- Jazz / bebop ----
    P('j1', 'voc_jazz', 'dom', 2, 'Cerco duplo cromático da 5ª', 'Chega na 5ª vindo de cima em cromatismo (6-b13-#11-5): o "cercar" que está em todo solo de bebop.',
      ['A4/e Ab4/e F#4/e G4/e E4/e C4/e Bb3/q']),
    P('j2', 'voc_jazz', 'iiVI', 2, 'Descida cromática 9-b9-1 no V', 'O V7 desce cromático até a fundamental e a b7 cai na 3ª do I — a resolução mais clássica do jazz.',
      ['D4/e E4/e F4/e A4/e', 'A4/e Ab4/e G4/e F4/e', 'E4/h r/h']),
    P('j3', 'voc_jazz', 'iiVI', 3, 'Arpejo aumentado no V (#5 → 3)', 'No V7 o arpejo 1-3-#5-b7 (a #5 é a mesma nota da b13); ela sobe meio tom para a 3ª do I.',
      ['D4/e F4/e A4/e C5/e', 'G4/e B4/e D#5/e F5/e', 'E5/h r/h']),
    P('j4', 'voc_jazz', 'maj', 3, 'Pentatônica do 2º grau (som lídio)', 'A pentatônica maior de Ré sobre C7M dá 9-3-#11-13-7: um som moderno sem nenhuma nota "errada".',
      ['D5/e B4/e A4/e F#4/e E4/e D4/e E4/q']),
    P('j5', 'voc_jazz', 'min', 2, 'Padrão digital 1-2-3-5 em sequência', 'A célula 1-2-3-5 e a mesma célula uma 4ª acima, dentro do dórico — base do "padrão digital".',
      ['C4/e D4/e Eb4/e G4/e F4/e G4/e Bb4/e C5/e']),
    P('j6', 'voc_jazz', 'iiVI', 1, 'Nota-guia descendo (b7 → 3 → 7)', 'Uma nota por acorde, descendo meio tom só quando precisa: o fio condutor de qualquer solo.',
      ['C5/h', 'B4/h', 'B4/w']),
    P('j7', 'voc_jazz', 'iiVI', 3, 'Grupeto na fundamental do II', 'Tercina que cerca a fundamental (2-#1-1) e segue pelo arpejo — enfeite típico do bebop.',
      ['E4/t C#4/t D4/t F4/e A4/e', 'G4/e F4/e D4/e B3/e', 'C4/h r/h']),

    // ---- Blues ----
    P('b1', 'voc_blues', 'dom', 1, 'Blue note: b3 → 3', 'A 3ª menor "puxada" para a 3ª maior: o som que define o blues sobre um acorde maior.',
      ['Eb4/e E4/e:h C4/q G3/q Bb3/q']),
    P('b2', 'voc_blues', 'dom', 2, 'Bend da 4ª para a 5ª', 'Na pentatônica menor, a 4ª "sobe" um tom até a 5ª; depois desce até a fundamental.',
      ['C5/e Bb4/e G4/q:bend2 F4/e Eb4/e C4/q']),
    P('b3', 'voc_blues', 'dom', 2, 'Pentatônica com blue note b5', 'Descida da pentatônica menor passando pela b5 cromática.',
      ['C5/e Bb4/e G4/e Gb4/e F4/e Eb4/e C4/q']),
    P('b4', 'voc_blues', 'bluesIIV', 1, 'Pergunta e resposta (I7 → IV7)', 'O mesmo motivo nos dois acordes, ajustado às notas de cada um (5-b7-1 no I7, 3-5-b7 no IV7).',
      ['G4/e Bb4/e C5/q:~ r/h', 'A4/e C5/e Eb5/q:~ r/h']),
    P('b5', 'voc_blues', 'turn', 2, 'Turnaround I7 – IV7 – I7 – V7', 'Os dois últimos compassos do blues: arpejos ligando os acordes e a b9 no V7.',
      ['E4/e G4/e Bb4/e C5/e', 'A4/e F4/e Eb4/e C4/e', 'E4/e G4/e C5/q', 'B4/e Ab4/e G4/q']),
    P('b6', 'voc_blues', 'dom', 2, 'Shuffle em tercinas', 'Tercinas com a blue note b3 → 3 e o 6º grau: o balanço do shuffle.',
      ['C4/t Eb4/t E4/t G4/q A4/t G4/t Eb4/t C4/q']),
    P('b7', 'voc_blues', 'min', 2, 'Blues menor: bend da b7 à fundamental', 'Bend de um tom da b7 até a fundamental, com vibrato, e a pentatônica descendo.',
      ['C5/q:bend2~ Bb4/e G4/e F4/e Eb4/e C4/q']),

    // ---- Rock ----
    P('k1', 'voc_rock', 'min', 2, 'Pentatônica em grupos de 3', 'A pentatônica menor descendo em grupos de três notas (tercinas).',
      ['C5/t Bb4/t G4/t Bb4/t G4/t F4/t G4/t F4/t Eb4/t F4/t Eb4/t C4/t']),
    P('k2', 'voc_rock', 'min', 3, 'Pentatônica em grupos de 4', 'Semicolcheias subindo em grupos de quatro — o exercício de velocidade do rock.',
      ['C4/s Eb4/s F4/s G4/s Eb4/s F4/s G4/s Bb4/s F4/s G4/s Bb4/s C5/s G4/s Bb4/s C5/s Eb5/s']),
    P('k3', 'voc_rock', 'min', 2, 'Legato na pentatônica', 'Hammer-ons subindo e pull-offs descendo: mais notas com menos palhetadas.',
      ['C4/e Eb4/e:h F4/e G4/e:h Bb4/e G4/e:p F4/e Eb4/e:p']),
    P('k4', 'voc_rock', 'min', 1, 'Bend de um tom com vibrato', 'O bend mais usado do rock: da b7 até a fundamental, segurando com vibrato.',
      ['G4/e Bb4/e C5/h:bend2~ Bb4/e G4/e']),
    P('k5', 'voc_rock', 'dom', 1, 'Frase mixolídia (3ª maior e b7)', 'Mistura a 3ª maior e a b7 do mixolídio — o som do rock sobre acorde maior.',
      ['C4/e D4/e E4/e G4/e A4/e G4/e Bb4/q:~']),

    // ---- Baião / nordeste ----
    P('e1', 'voc_baiao', 'dom', 2, 'Mixolídio em terças', 'Terças descendo pelo mixolídio (com a b7): o sotaque nordestino.',
      ['C5/e A4/e Bb4/e G4/e A4/e F4/e G4/e E4/e']),
    P('e2', 'voc_baiao', 'lb7', 2, 'Lídio b7 (a "escala nordestina")', 'Sobe a escala com #4 e b7, as duas notas que dão a cara do baião.',
      ['C4/e D4/e E4/e F#4/e G4/e A4/e Bb4/q']),
    P('e3', 'voc_baiao', 'dom', 2, 'Síncope do baião', 'Colcheia pontuada + semicolcheia: a célula rítmica do baião no arpejo do dominante.',
      ['C4/e. E4/s G4/e Bb4/e A4/e. G4/s E4/q']),
    P('e4', 'voc_baiao', 'lb7', 2, 'Descida com b7 e #11', 'A mesma escala descendo da b7, passando pela #11.',
      ['Bb4/e A4/e G4/e F#4/e E4/e D4/e C4/q']),
    P('e5', 'voc_baiao', 'dom2', 2, 'Pergunta e resposta em terças', 'Um compasso sobe em terças, o outro responde descendo.',
      ['E4/e G4/e F4/e A4/e G4/e Bb4/e A4/q C5/e A4/e Bb4/e G4/e A4/e F4/e G4/e E4/e']),

    // ---- Bossa nova / MPB ----
    P('o1', 'voc_bossa', 'maj69', 1, 'Arpejo 6(9)', 'O acorde de 6ª com 9ª em arpejo — a cor da bossa nova.',
      ['C4/e E4/e A4/e D5/e E5/e D5/e A4/q']),
    P('o2', 'voc_bossa', 'iiVI', 2, 'Antecipação', 'A nota do acorde seguinte chega uma colcheia antes (B no fim do IIm7, E no fim do V7).',
      ['F4/e A4/e C5/e B4/e', 'B4/q A4/e E4/e', 'E4/h. r/q']),
    P('o3', 'voc_bossa', 'maj', 2, 'Cromatismo suave para a 9ª', 'Da 3ª à 9ª por meio tom, e a resposta 5-6.',
      ['E4/e Eb4/e D4/q r/e G4/e A4/q']),
    P('o4', 'voc_bossa', 'iiVI', 2, 'Resolução na 7M e 9ª', 'O I não chega na fundamental: repousa na 7M e na 9ª, bem bossa.',
      ['A4/e G4/e F4/e E4/e', 'D4/e F4/e A4/e Ab4/e', 'G4/e B4/e D5/q r/h']),
    P('o5', 'voc_bossa', 'min', 1, 'Menor com 6ª e 9ª', 'Arpejo menor com a 6ª maior (dórico) e a 9ª longa.',
      ['C4/e Eb4/e G4/e A4/e D5/h']),

    // ---- Fusion ----
    P('f1', 'voc_fusion', 'lyd', 3, 'Tríade de Ré sobre C7M (lídio)', 'A tríade maior do 2º grau em tercinas (9-#11-13) — o lídio pensado como arpejo.',
      ['D4/t F#4/t A4/t D5/t F#5/t A5/t F#5/e D5/e A4/q']),
    P('f2', 'voc_fusion', 'min', 3, 'Três notas por corda em legato', 'Dórico em tercinas, três notas por corda: palheta a primeira, liga as outras duas.',
      ['C4/t D4/t:h Eb4/t:h F4/t G4/t:h A4/t:h Bb4/t C5/t:h D5/t:h Eb5/t D5/t:p C5/t:p']),
    P('f3', 'voc_fusion', 'min', 3, 'Arpejo superposto: Eb7M sobre Cm7', 'O arpejo que nasce na b3 (b3-5-b7-9) em semicolcheias.',
      ['Eb4/s G4/s Bb4/s D5/s Bb4/s G4/s Eb4/s G4/s F4/e G4/e Bb4/q']),
    P('f4', 'voc_fusion', 'dom', 3, 'Quartas empilhadas', 'Notas em 4ªs (3-13-9-5): som aberto e moderno sobre o dominante.',
      ['E4/e A4/e D5/e G5/e D5/e A4/e E4/q']),
    P('f5', 'voc_fusion', 'lyd', 2, 'Lídio em legato', 'O lídio subindo com hammer-ons e a 7M longa com vibrato.',
      ['C4/e D4/e:h E4/e:h F#4/e G4/e:h A4/e:h B4/q:~'])
  ];

  // ---------------------------------------------------------------------
  // Motor
  // ---------------------------------------------------------------------

  function parseTok(tok) {
    var flags = '';
    var ci = tok.indexOf(':');
    if (ci >= 0) { flags = tok.slice(ci + 1); tok = tok.slice(0, ci); }
    var parts = tok.split('/');
    var d = DUR[parts[1]];
    if (d === undefined) throw new Error('duração inválida: ' + tok);
    if (parts[0] === 'r') return { rest: true, dur: d };
    var m = /^([A-G])(#|b)?(-?\d)$/.exec(parts[0]);
    if (!m) throw new Error('nota inválida: ' + tok);
    var acc = m[2] === '#' ? 1 : (m[2] === 'b' ? -1 : 0);
    var oct = parseInt(m[3], 10);
    var t = { letter: m[1], acc: acc, name: m[1] + (m[2] || ''), midi: (oct + 1) * 12 + LETTER_PC[m[1]] + acc, dur: d };
    if (flags) {
      if (flags.indexOf('~') >= 0) { t.vibrato = true; flags = flags.replace('~', ''); }
      if (flags === 'h' || flags === 'p' || flags === 'sl') t.art = flags;
      else if (flags === 'bend1' || flags === 'bend2') { t.art = 'b'; t.bend = flags === 'bend1' ? 1 : 2; }
      else if (flags) throw new Error('articulação inválida: ' + flags);
    }
    return t;
  }

  function parseCell(text) { return text.trim().split(/\s+/).map(parseTok); }

  var SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  function simplify(name) {
    var p = theory.parseNoteName(name);
    if (!p || Math.abs(p.accidental) < 2) return name;
    return (p.accidental > 0 ? SHARPS : FLATS)[p.pitchClass];
  }

  function pcOfKey(k) { return theory.pitchClassOf(k); }
  function letterIdx(name) { return LETTERS.indexOf(name.charAt(0)); }

  /** Transpõe um nome de nota escrito em Dó para o tom `key` (grafia pelo intervalo). */
  function transposeName(nameInC, key) {
    var steps = letterIdx(nameInC);
    var semis = theory.pitchClassOf(nameInC);
    return simplify(theory.noteAt(key, steps, semis));
  }

  // Grau em relação à fundamental do acorde (em Dó).
  function degreeLabel(noteName, rootName, isDominant) {
    var steps = (letterIdx(noteName) - letterIdx(rootName) + 7) % 7;
    var semis = (theory.pitchClassOf(noteName) - theory.pitchClassOf(rootName) + 12) % 12;
    var diff = semis - MAJOR[steps];
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;
    var acc = diff === 0 ? '' : (diff < 0 ? new Array(-diff + 1).join('b') : new Array(diff + 1).join('#'));
    var deg = steps + 1;
    if (isDominant && steps === 2 && diff === -1) return '#9';
    if (isDominant && steps === 4 && diff === -1) return '#11';
    if (isDominant && steps === 4 && diff === 1) return 'b13';
    if (isDominant && acc) {
      if (deg === 2) deg = 9;
      else if (deg === 4) deg = 11;
      else if (deg === 6) deg = 13;
    }
    return acc + deg;
  }

  /** Fórmula do padrão em graus, por acorde: [{ sym, degrees: '1 2 b3 5' }]. */
  function formula(pattern) {
    var form = FORMS[pattern.form];
    return form.chords.map(function (c, i) {
      var dom = c.q === 'dominant7';
      var degs = parseCell(pattern.cells[i]).map(function (t) { return t.rest ? '—' : degreeLabel(t.name, c.root, dom); });
      return { sym: c.root + c.sym, role: c.role, degrees: degs.join(' ') };
    });
  }

  function cycleFor(form) { return FORMS[form].cycle === 'minor' ? CYCLE_MINOR : CYCLE_MAJOR; }

  var LOW = 55, HIGH = 86, CENTER = 69;

  /**
   * Realiza um padrão num tom. Devolve { key, events, chords, bars }.
   * events: {name, midi, onset, dur, rest}; chords: {beat, beats, root, tones, symbol}.
   */
  function realize(pattern, key) {
    var form = FORMS[pattern.form];
    var pc = pcOfKey(key);
    var toks = [];
    var chords = [];
    var beat = 0;
    form.chords.forEach(function (c, i) {
      var cell = parseCell(pattern.cells[i]);
      var sum = cell.reduce(function (a, t) { return a + t.dur; }, 0);
      if (Math.abs(sum - c.beats) > 1e-6) throw new Error(pattern.id + ': acorde ' + (i + 1) + ' soma ' + sum + ' tempos (esperado ' + c.beats + ')');
      var rootName = transposeName(c.root, key);
      chords.push({ beat: beat, beats: c.beats, root: rootName, symbol: rootName + c.sym,
        tones: theory.chordTones(rootName, c.q) });
      cell.forEach(function (t) { toks.push({ t: t, onset: beat }); beat += t.dur; });
    });
    // oitava: sobe `pc` ou desce `12 - pc`, o que ficar mais confortável
    var mids = toks.filter(function (x) { return !x.t.rest; }).map(function (x) { return x.t.midi; });
    var best = null;
    [pc, pc - 12].forEach(function (sh) {
      var lo = Math.min.apply(null, mids) + sh, hi = Math.max.apply(null, mids) + sh;
      var mean = mids.reduce(function (a, m) { return a + m; }, 0) / mids.length + sh;
      var cost = Math.max(0, LOW - lo) * 10 + Math.max(0, hi - HIGH) * 10 + Math.abs(mean - CENTER) * 0.3;
      if (!best || cost < best.cost) best = { sh: sh, cost: cost };
    });
    var events = toks.map(function (x) {
      var t = x.t;
      if (t.rest) return { rest: true, onset: x.onset, dur: t.dur };
      var ev = { name: transposeName(t.name, key), midi: t.midi + best.sh, onset: x.onset, dur: t.dur,
        triplet: Math.abs(t.dur - 1 / 3) < 1e-6 ? true : undefined };
      if (t.art) ev.art = t.art;
      if (t.bend) ev.bendFrom = ev.midi - t.bend;
      if (t.vibrato) ev.vibrato = true;
      return ev;
    });
    return { key: key, events: events, chords: chords, beats: beat, bars: Math.round(beat / 4) };
  }

  /** Todos os tons (ciclo de 4ªs) ou só um. */
  function realizeAll(pattern, onlyKey) {
    var keys = onlyKey && onlyKey !== 'todos' ? [onlyKey] : cycleFor(pattern.form);
    return keys.map(function (k) { return realize(pattern, k); });
  }

  // ---------------------------------------------------------------------
  // Padrão próprio: o usuário digita os graus ("1 2 3 5", "3 5 b7 b9"...)
  // ---------------------------------------------------------------------
  var DEG_SPELL = {
    '1': [0, 0], 'b2': [1, 1], '2': [1, 2], '#2': [1, 3], 'b3': [2, 3], '3': [2, 4], '4': [3, 5], '#4': [3, 6],
    'b5': [4, 6], '5': [4, 7], '#5': [4, 8], 'b6': [5, 8], '6': [5, 9], 'bb7': [6, 9], 'b7': [6, 10], '7': [6, 11]
  };
  var CUSTOM_FORMS = {
    maj: { form: 'maj', label: 'Maior (7M)' },
    dom: { form: 'dom', label: 'Dominante (7)' },
    min: { form: 'min', label: 'Menor (m7)' }
  };

  function parseDegree(tok) {
    var m = /^(bb|b|#)?(\d{1,2})$/.exec(tok.trim());
    if (!m) return null;
    var n = parseInt(m[2], 10);
    if (n < 1 || n > 15) return null;
    var oct = n > 7 ? 1 : 0;
    var base = ((n - 1) % 7) + 1;
    var key = (m[1] || '') + base;
    if (!DEG_SPELL[key]) return null;
    return { steps: DEG_SPELL[key][0], semis: DEG_SPELL[key][1], oct: oct };
  }

  /**
   * Cria um padrão a partir de graus. opts: { degrees: '1 2 3 5', chord: 'maj'|'dom'|'min',
   * rhythm: 'q'|'e'|'t' }. Completa o compasso com a última nota longa + pausa.
   * Devolve { pattern } ou { error }.
   */
  function customPattern(opts) {
    var toks = String(opts.degrees || '').replace(/[,;-]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!toks.length) return { error: 'Digite os graus separados por espaço, ex.: 1 2 3 5' };
    if (toks.length > 16) return { error: 'Use no máximo 16 graus.' };
    var degs = [];
    for (var i = 0; i < toks.length; i++) {
      var d = parseDegree(toks[i]);
      if (!d) return { error: 'Grau inválido: "' + toks[i] + '". Use 1 a 13 com b ou #, ex.: b3, #11, b9.' };
      degs.push(d);
    }
    var chord = CUSTOM_FORMS[opts.chord] ? opts.chord : 'maj';
    var rhythm = DUR[opts.rhythm] ? opts.rhythm : 'e';
    var dur = DUR[rhythm];
    var prev = null;
    var notes = degs.map(function (d) {
      var name = simplify(theory.noteAt('C', d.steps, d.semis));
      var midi = 60 + d.semis + 12 * d.oct;
      // linha contínua: sem saltos maiores que uma 6ª quando o grau não pede oitava
      if (prev !== null && !d.oct) { while (midi - prev > 9) midi -= 12; while (prev - midi > 9) midi += 12; }
      prev = midi;
      return { name: name, midi: midi };
    });
    var used = notes.length * dur;
    var bars = Math.max(1, Math.ceil((used + 1 - 1e-6) / 4));
    var total = bars * 4;
    var cells = notes.map(function (n) { return tokFor(n) + '/' + rhythm; });
    // última nota fica mais longa até o fim do compasso (ou deixa uma pausa)
    var rest = total - used;
    var fill = restTokens(rest);
    var form = CUSTOM_FORMS[chord].form;
    var pat = { id: 'custom', cat: 'custom', form: form, level: 0, title: 'Padrão próprio: ' + toks.join(' '),
      dica: 'Padrão criado por você, nos 12 tons.', cells: [cells.concat(fill).join(' ')], custom: true, beats: total };
    // forma com o número de compassos certo
    var baseChord = FORMS[form].chords[0];
    pat.formDef = { label: FORMS[form].label, cycle: FORMS[form].cycle, chords: [ch(baseChord.role, 'C', baseChord.q, baseChord.sym, total)] };
    return { pattern: pat };
  }

  function tokFor(n) { return n.name + (Math.floor(n.midi / 12) - 1); }
  function restTokens(beats) {
    var out = [];
    var map = [[4, 'w'], [2, 'h'], [1, 'q'], [0.5, 'e']];
    var b = Math.round(beats * 6) / 6;
    // tercinas: completa até o tempo inteiro com pausas de tercina
    var frac = b - Math.floor(b + 1e-6);
    if (frac > 1e-6) {
      var n3 = Math.round(frac * 3);
      if (Math.abs(n3 / 3 - frac) < 1e-6) { for (var i = 0; i < n3; i++) out.push('r/t'); b -= frac; }
      else if (Math.abs(frac - 0.5) < 1e-6) { out.push('r/e'); b -= 0.5; }
    }
    map.forEach(function (m) { while (b >= m[0] - 1e-6) { out.push('r/' + m[1]); b -= m[0]; } });
    return out;
  }

  // Suporte a padrões com forma própria (padrão digitado).
  var baseRealize = realize;
  realize = function (pattern, key) {
    if (!pattern.formDef) return baseRealize(pattern, key);
    FORMS.__custom = pattern.formDef;
    var p = Object.assign({}, pattern, { form: '__custom' });
    try { return baseRealize(p, key); } finally { delete FORMS.__custom; }
  };
  var baseFormula = formula;
  formula = function (pattern) {
    if (!pattern.formDef) return baseFormula(pattern);
    FORMS.__custom = pattern.formDef;
    try { return baseFormula(Object.assign({}, pattern, { form: '__custom' })); } finally { delete FORMS.__custom; }
  };
  realizeAll = function (pattern, onlyKey) {
    var cyc = pattern.formDef ? (pattern.formDef.cycle === 'minor' ? CYCLE_MINOR : CYCLE_MAJOR) : cycleFor(pattern.form);
    var keys = onlyKey && onlyKey !== 'todos' ? [onlyKey] : cyc;
    return keys.map(function (k) { return realize(pattern, k); });
  };

  function byCategory(cat) { return PATTERNS.filter(function (p) { return p.cat === cat; }); }
  function get(id) { for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i].id === id) return PATTERNS[i]; return null; }
  function numberOf(id) { for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i].id === id) return i + 1; return 0; }

  return {
    PATTERNS: PATTERNS,
    CATEGORIES: CATEGORIES,
    GROUPS: GROUPS,
    FORMS: FORMS,
    CYCLE_MAJOR: CYCLE_MAJOR,
    CYCLE_MINOR: CYCLE_MINOR,
    CUSTOM_FORMS: CUSTOM_FORMS,
    parseCell: parseCell,
    transposeName: transposeName,
    formula: function (p) { return formula(p); },
    realize: function (p, k) { return realize(p, k); },
    realizeAll: function (p, k) { return realizeAll(p, k); },
    customPattern: customPattern,
    byCategory: byCategory,
    get: get,
    numberOf: numberOf
  };
});
