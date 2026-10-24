/**
 * IMPROVIX — avisar que tem mais coisa para o lado
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

  var FOLGA = 6;             // px de tolerância: arredondamento não conta como "tem mais"

  function transborda(el) { return el.scrollWidth - el.clientWidth > FOLGA; }

  function atualizar(caixa) {
    var mais = transborda(caixa);
    var env = caixa.parentNode;
    if (!env || !env.classList || !env.classList.contains('rolavel')) return;
    env.classList.toggle('rolavel-ativo', mais);
    if (!mais) return;
    var noInicio = caixa.scrollLeft <= FOLGA;
    var noFim = caixa.scrollLeft >= caixa.scrollWidth - caixa.clientWidth - FOLGA;
    env.classList.toggle('rolavel-inicio', noInicio);
    env.classList.toggle('rolavel-fim', noFim);
    // O aviso escrito some assim que a pessoa entende e rola — já cumpriu o papel.
    env.classList.toggle('rolavel-virgem', noInicio);
  }

  function embrulhar(caixa) {
    if (caixa.__rolavel) { atualizar(caixa); return; }
    caixa.__rolavel = true;

    var env = document.createElement('div');
    env.className = 'rolavel';
    caixa.parentNode.insertBefore(env, caixa);
    env.appendChild(caixa);

    var esq = document.createElement('button');
    esq.type = 'button';
    esq.className = 'rolavel-seta rolavel-esq';
    esq.setAttribute('aria-label', 'Mostrar o que está à esquerda');
    esq.textContent = '‹';
    var dir = document.createElement('button');
    dir.type = 'button';
    dir.className = 'rolavel-seta rolavel-dir';
    dir.setAttribute('aria-label', 'Mostrar o que está à direita');
    dir.textContent = '›';
    var aviso = document.createElement('span');
    aviso.className = 'rolavel-aviso';
    aviso.textContent = '↔ tem mais para o lado';

    function anda(quanto) {
      caixa.scrollBy({ left: quanto * Math.max(120, caixa.clientWidth * 0.7), behavior: 'smooth' });
    }
    esq.addEventListener('click', function () { anda(-1); });
    dir.addEventListener('click', function () { anda(1); });

    env.appendChild(esq);
    env.appendChild(dir);
    env.appendChild(aviso);

    caixa.addEventListener('scroll', function () { atualizar(caixa); }, { passive: true });
    atualizar(caixa);
  }

  /**
   * Prepara tudo o que rola dentro de `raiz` (ou da página inteira). Pode ser
   * chamado quantas vezes quiser: caixa já preparada só é reavaliada.
   */
  function preparar(raiz) {
    var onde = raiz || document;
    var achadas = onde.querySelectorAll ? onde.querySelectorAll(CAIXAS) : [];
    Array.prototype.forEach.call(achadas, function (c) { embrulhar(c); });
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
