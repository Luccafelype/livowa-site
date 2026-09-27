/* Qual dieta (ou treino) da criadora fica em foco na página (T40, 27/09).
 *
 * Porte LINHA A LINHA de `lib/dietaEmFoco.ts` do app (mesmas constantes, mesma
 * ordem das regras), para o site e o app nunca porem dietas diferentes em foco:
 *   1. veio pelo link de uma dieta específica (?dieta=) → essa;
 *   2. senão, a que a criadora marcou como principal no painel;
 *   3. senão, a mais recente — e uma mais antiga só toma o lugar se a nota dela
 *      for MAIS DE 5× a da mais recente; nota = likes + 5 × comentários (views
 *      não entra: o Instagram não dá); vídeo com mais de 18 meses: a nota cai
 *      10% a cada mês além dos 18;
 *   4. dieta incompleta (completa === false) não vence pela regra 3.
 * Campo ausente (banco antes da migration 20260927d) = nota 0, sem principal,
 * completa → fica a mais recente, que é o que a página mostrava por cima.
 */
(function (raiz) {
  'use strict';

  var VEZES_PARA_A_ANTIGA_VENCER = 5;
  var MESES_SEM_DESCONTO = 18;
  var DESCONTO_POR_MES = 0.1;

  function dataDoItem(item) {
    var bruta = (item.engajamento && item.engajamento.publicado_em) || item.publicada_em;
    var t = bruta ? Date.parse(bruta) : NaN;
    return isFinite(t) ? t : 0;
  }

  // Meses inteiros entre a data do vídeo e `agora`.
  function mesesDesde(ms, agora) {
    if (!ms) return 0;
    var d = new Date(ms);
    return (agora.getFullYear() - d.getFullYear()) * 12 + (agora.getMonth() - d.getMonth()) -
      (agora.getDate() < d.getDate() ? 1 : 0);
  }

  // A nota do vídeo, com o desconto de idade.
  function notaDoVideo(item, agora) {
    var e = item.engajamento;
    if (!e) return 0;
    var bruta = Math.max(0, Number(e.likes) || 0) + 5 * Math.max(0, Number(e.comentarios) || 0);
    var alem = mesesDesde(dataDoItem(item), agora) - MESES_SEM_DESCONTO;
    return alem > 0 ? bruta * Math.pow(1 - DESCONTO_POR_MES, alem) : bruta;
  }

  function porDataDesc(a, b) { return dataDoItem(b) - dataDoItem(a); }

  function itemEmFoco(itens, opcoes) {
    opcoes = opcoes || {};
    if (!itens || itens.length === 0) return null;
    var agora = opcoes.agora || new Date();
    if (opcoes.doLink) {
      var doLink = itens.filter(function (i) { return i.id === opcoes.doLink; })[0];
      if (doLink) return doLink;
    }
    var principal = itens.filter(function (i) { return i.principal; })[0];
    if (principal) return principal;

    var completas = itens.filter(function (i) { return i.completa !== false; });
    var candidatas = completas.length > 0 ? completas : itens;
    var porData = candidatas.slice().sort(porDataDesc);
    var recente = porData[0];
    var notaRecente = notaDoVideo(recente, agora);
    var vencedora = recente;
    var notaVencedora = notaRecente;
    porData.slice(1).forEach(function (antiga) {
      var nota = notaDoVideo(antiga, agora);
      if (nota > VEZES_PARA_A_ANTIGA_VENCER * notaRecente && nota > notaVencedora) {
        vencedora = antiga;
        notaVencedora = nota;
      }
    });
    return vencedora;
  }

  // A em foco primeiro; as outras na ordem da regra (mais recente antes).
  function emFocoEOutras(itens, opcoes) {
    var foco = itemEmFoco(itens || [], opcoes);
    var outras = (itens || []).filter(function (i) { return i !== foco; }).sort(porDataDesc);
    return { foco: foco, outras: outras };
  }

  var api = {
    VEZES_PARA_A_ANTIGA_VENCER: VEZES_PARA_A_ANTIGA_VENCER,
    MESES_SEM_DESCONTO: MESES_SEM_DESCONTO,
    DESCONTO_POR_MES: DESCONTO_POR_MES,
    notaDoVideo: notaDoVideo,
    itemEmFoco: itemEmFoco,
    emFocoEOutras: emFocoEOutras
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.LivowaDietaEmFoco = api;
})(typeof window !== 'undefined' ? window : this);
