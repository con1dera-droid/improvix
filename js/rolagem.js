/**
 * IMPROVIX — avisar que tem mais coisa fora da vista
 *
 * Partitura, tablatura, diagrama de braço e tabela larga não cabem na tela e
 * rolam para o lado. O problema é que, no Mac e no celular, a barra de rolagem
 * fica invisível até alguém rolar — então a pessoa olha um compasso cortado e
 * conclui que o exercício acaba ali.
 *
 * A pedido do dono do projeto (24/10/2026), o aviso ficou explícito:
 *
 *   - uma barra de rolagem sempre visível (no CSS, com cor própria);
 *   - sombras nas bordas, que aparecem só do lado onde há mais conteúdo;
 *   - setas ‹ › clicáveis, para quem prefere clicar a arrastar;
 *   - um aviso escrito "↔ tem mais para o lado", enquanto não se rolou nada.
 *
 * Tudo isso só aparece quando a caixa REALMENTE transborda: aviso de rolagem
 * em coisa que já cabe na tela é ruído, e ruído a pessoa aprende a ignorar.
 */
(function () {
  'use strict';

  // As caixas que rolam para o lado no site.
  var CAIXAS = [
    '.lib-card-body',        // partitura/tablatura dos exercícios
    '.fraseado-conteudo',    // a frase gerada na aba Fraseados
    '.esc-diagrama',         // desenho do braço na ficha da escala
    '.adm-tabela-wrap',      // a tabela de contas na Administração
    '.acd-forma',            // diagramas de acorde
    '.acd-teclado',
    // As tabelas da Análise de Harmonia só rolam no celular (lá elas viram
    // bloco com overflow); na tela larga elas cabem e nada aparece.
    '.theory-table'
  ].join(',');

  // E estas rolam para BAIXO: a lista tem altura fixa e o resto fica escondido
  // embaixo. Foi o próprio dono quem viu, na lista das 28 lições de teoria:
  // "não tem nada que identifique que tem conteúdo abaixo".
  var CAIXAS_Y = [
    '.aulas-list'
  ].join(',');

  var FOLGA = 6;             // px de tolerância: arredondamento não conta como "tem mais"
  var ALTURA_MIN_POLEGAR = 30; // a barra nunca fica fina demais para ser agarrada

  function transborda(el) { return el.scrollWidth - el.clientWidth > FOLGA; }
  function transbordaY(el) { return el.scrollHeight - el.clientHeight > FOLGA; }

  function atualizar(caixa) {
    var env = caixa.parentNode;
    if (!env || !env.classList || !env.classList.contains('rolavel')) return;
    var vertical = env.classList.contains('rolavel-y');
    var mais = vertical ? transbordaY(caixa) : transborda(caixa);
    env.classList.toggle('rolavel-ativo', mais);
    if (!mais) return;
    var pos = vertical ? caixa.scrollTop : caixa.scrollLeft;
    var fim = vertical ? caixa.scrollHeight - caixa.clientHeight : caixa.scrollWidth - caixa.clientWidth;
    var noInicio = pos <= FOLGA;
    env.classList.toggle('rolavel-inicio', noInicio);
    env.classList.toggle('rolavel-fim', pos >= fim - FOLGA);
    // O aviso escrito some assim que a pessoa entende e rola — já cumpriu o papel.
    env.classList.toggle('rolavel-virgem', noInicio);
    if (caixa.__polegar) desenharPolegar(caixa, pos, fim);
  }

  // A barra desenhada por nós. No Mac (e no celular) a barra do próprio
  // navegador é transparente e some sozinha depois de um segundo — é
  // exatamente por isso que a pessoa não viu que a lista continuava. Esta é um
  // elemento comum da página: fica parada, com cor forte, e some junto com a
  // lista quando não há o que rolar.
  function desenharPolegar(caixa, pos, fim) {
    var trilho = caixa.__trilho;
    var polegar = caixa.__polegar;
    var altura = trilho.clientHeight;
    if (!altura || !fim) return;
    var parte = caixa.clientHeight / caixa.scrollHeight;
    var alt = Math.max(ALTURA_MIN_POLEGAR, Math.round(altura * parte));
    if (alt > altura) alt = altura;
    polegar.style.height = alt + 'px';
    polegar.style.top = Math.round((altura - alt) * (pos / fim)) + 'px';
  }

  function embrulhar(caixa, vertical) {
    if (caixa.__rolavel) { atualizar(caixa); return; }
    caixa.__rolavel = true;

    var env = document.createElement('div');
    env.className = 'rolavel' + (vertical ? ' rolavel-y' : '');
    caixa.parentNode.insertBefore(env, caixa);
    env.appendChild(caixa);

    var esq = document.createElement('button');
    esq.type = 'button';
    esq.className = 'rolavel-seta rolavel-esq';
    esq.setAttribute('aria-label', vertical ? 'Mostrar o que está acima' : 'Mostrar o que está à esquerda');
    esq.textContent = vertical ? '⌃' : '‹';
    var dir = document.createElement('button');
    dir.type = 'button';
    dir.className = 'rolavel-seta rolavel-dir';
    dir.setAttribute('aria-label', vertical ? 'Mostrar o que está abaixo' : 'Mostrar o que está à direita');
    dir.textContent = vertical ? '⌄' : '›';
    var aviso = document.createElement('span');
    aviso.className = 'rolavel-aviso';
    aviso.textContent = vertical ? '↓ tem mais abaixo' : '↔ tem mais para o lado';

    function anda(quanto) {
      if (vertical) {
        caixa.scrollBy({ top: quanto * Math.max(120, caixa.clientHeight * 0.7), behavior: 'smooth' });
      } else {
        caixa.scrollBy({ left: quanto * Math.max(120, caixa.clientWidth * 0.7), behavior: 'smooth' });
      }
    }
    esq.addEventListener('click', function () { anda(-1); });
    dir.addEventListener('click', function () { anda(1); });

    env.appendChild(esq);
    env.appendChild(dir);
    env.appendChild(aviso);

    if (vertical) montarTrilho(env, caixa);

    caixa.addEventListener('scroll', function () { atualizar(caixa); }, { passive: true });
    atualizar(caixa);
  }

  // Monta a barra desenhada e deixa ela funcionando como barra de verdade:
  // dá para arrastar o polegar e dá para clicar no trilho para pular.
  function montarTrilho(env, caixa) {
    var trilho = document.createElement('div');
    trilho.className = 'rolavel-trilho';
    var polegar = document.createElement('div');
    polegar.className = 'rolavel-polegar';
    trilho.appendChild(polegar);
    env.appendChild(trilho);
    caixa.__trilho = trilho;
    caixa.__polegar = polegar;

    function fimDe() { return caixa.scrollHeight - caixa.clientHeight; }

    // Clicar no trilho (fora do polegar) leva direto àquele ponto da lista.
    trilho.addEventListener('mousedown', function (e) {
      if (e.target === polegar) return;
      var r = trilho.getBoundingClientRect();
      var alt = polegar.offsetHeight;
      var y = e.clientY - r.top - alt / 2;
      var livre = r.height - alt;
      caixa.scrollTop = livre > 0 ? (y / livre) * fimDe() : 0;
    });

    // Arrastar o polegar.
    var arrastando = false;
    var pegouEm = 0;
    var topoAoPegar = 0;
    polegar.addEventListener('mousedown', function (e) {
      arrastando = true;
      pegouEm = e.clientY;
      topoAoPegar = caixa.scrollTop;
      env.classList.add('rolavel-arrastando');
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!arrastando) return;
      var livre = trilho.clientHeight - polegar.offsetHeight;
      if (livre <= 0) return;
      caixa.scrollTop = topoAoPegar + ((e.clientY - pegouEm) / livre) * fimDe();
    });
    document.addEventListener('mouseup', function () {
      if (!arrastando) return;
      arrastando = false;
      env.classList.remove('rolavel-arrastando');
    });
  }

  /**
   * Prepara tudo o que rola dentro de `raiz` (ou da página inteira). Pode ser
   * chamado quantas vezes quiser: caixa já preparada só é reavaliada.
   */
  function preparar(raiz) {
    var onde = raiz || document;
    if (!onde.querySelectorAll) return;
    Array.prototype.forEach.call(onde.querySelectorAll(CAIXAS), function (c) { embrulhar(c, false); });
    Array.prototype.forEach.call(onde.querySelectorAll(CAIXAS_Y), function (c) { embrulhar(c, true); });
  }

  function reavaliar() {
    var envs = document.querySelectorAll('.rolavel > *:first-child');
    Array.prototype.forEach.call(envs, function (c) { if (c.__rolavel) atualizar(c); });
  }

  // Trocar de tela, de instrumento ou de tamanho de janela muda o que cabe.
  window.addEventListener('resize', reavaliar);
  document.addEventListener('DOMContentLoaded', function () {
    preparar(document);
    // Partitura e tablatura entram por JavaScript depois; uma observação do
    // DOM pega tudo o que nascer daqui em diante, sem cada tela ter de avisar.
    if (window.MutationObserver) {
      var obs = new MutationObserver(function () { preparar(document); reavaliar(); });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  });

  window.IL = window.IL || {};
  window.IL.ui = window.IL.ui || {};
  window.IL.ui.prepararRolagem = preparar;
  window.IL.ui.reavaliarRolagem = reavaliar;
})();
