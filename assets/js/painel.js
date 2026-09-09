/* livowa.com/c/painel/?t=<token> — o painel privado da criadora.
 *
 * Lê UMA função (criadora_numeros_por_token) com a chave anônima. Ela devolve
 * só contagens; com token errado devolve nada, e a página não diz se o token
 * "quase" existe. Nada aqui escreve.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';
  var TOKEN_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  var $content = document.getElementById('pn-content');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function n(x) { return Number(x || 0).toLocaleString('pt-BR'); }
  function dataCurta(iso) {
    var p = String(iso || '').split('-');
    if (p.length < 3) return '';
    return parseInt(p[2], 10) + '/' + MESES[parseInt(p[1], 10) - 1];
  }
  function mostrarErro(msg) {
    $content.innerHTML = '<div class="cr-error">' + esc(msg) + '</div>';
  }

  function numero(valor, rotulo) {
    return '<div class="pn-num"><p class="pn-num-valor">' + esc(n(valor)) + '</p><p class="pn-num-rotulo">' + esc(rotulo) + '</p></div>';
  }

  function semanas(lista) {
    if (!lista || !lista.length) return '';
    var max = Math.max.apply(null, lista.map(function (s) { return Number(s.indicados || 0); }).concat([1]));
    var total = lista.reduce(function (a, s) { return a + Number(s.indicados || 0); }, 0);
    var barras = lista.map(function (s, i) {
      var v = Number(s.indicados || 0);
      var h = Math.max(3, Math.round((v / max) * 96));
      var atual = i === lista.length - 1;
      return '<div class="pn-semana' + (atual ? ' atual' : '') + '" title="semana de ' + esc(dataCurta(s.inicio)) + ': ' + esc(n(v)) + '">' +
        '<span class="pn-barra-valor">' + (v ? esc(n(v)) : '') + '</span>' +
        '<div class="pn-barra" style="height:' + h + 'px"></div>' +
        '<span class="pn-barra-data">' + esc(dataCurta(s.inicio)) + '</span></div>';
    }).join('');
    return '<div class="cr-titulo"><h2>Quem veio, semana a semana</h2><span class="cr-detalhe">últimas 8</span></div>' +
      '<div class="cr-card"><div class="pn-semanas">' + barras + '</div>' +
      (total === 0 ? '<p class="pn-vazio">Ainda ninguém chegou pelo seu link nestas semanas. Quando o primeiro vídeo com o link sair, a barra sobe aqui.</p>' : '') +
      '</div>';
  }

  var token = (new URLSearchParams(location.search).get('t') || '').trim().toLowerCase();
  if (!TOKEN_VALIDO.test(token)) {
    mostrarErro('Este link não está completo. Abra exatamente o link que a Livowa mandou para você.');
    return;
  }

  fetch(SUPABASE_URL + '/rest/v1/rpc/criadora_numeros_por_token', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ p_token: token })
  }).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }).then(function (d) {
    if (!d || !d.handle) {
      mostrarErro('Não reconheci este link. Confira se ele veio inteiro — ou peça um novo pela Livowa.');
      return;
    }
    var linkPublico = 'https://livowa.com/c/' + d.handle;
    document.title = 'Seus números · @' + d.handle + ' | Livowa';
    $content.innerHTML =
      '<h1 class="pn-ola">Oi, ' + esc(String(d.nome || '').replace(/\[[^\]]*\]\s*/g, '')) + '</h1>' +
      '<p class="pn-sub">O que o seu link já fez, até agora.</p>' +
      (d.ativa === false ? '<div class="pn-inativa">Sua página está pausada: o link não abre para quem chega. Fale com a Livowa para reativar.</div>' : '') +
      '<div class="pn-numeros">' +
        numero(d.indicados, 'pessoas criaram conta vindo pelo seu link') +
        numero(d.seguindo_dieta, 'seguindo a sua dieta agora') +
        numero(d.seguindo_treino, 'seguindo o seu treino agora') +
      '</div>' +
      '<div class="cr-titulo"><h2>Seu link</h2></div>' +
      '<div class="cr-card">' +
        '<div class="pn-link"><code id="pn-link">' + esc(linkPublico) + '</code>' +
        '<button type="button" class="pn-copiar" id="pn-copiar">Copiar</button></div>' +
        '<p class="pn-dica">Coloque na bio e nos vídeos. Quem toca vê a sua rotina antes de qualquer cadastro; o app ajusta as quantidades às metas de cada pessoa.</p>' +
      '</div>' +
      semanas(d.por_semana);

    var $copiar = document.getElementById('pn-copiar');
    if ($copiar) {
      $copiar.addEventListener('click', function () {
        var texto = linkPublico;
        var pronto = function () { $copiar.textContent = 'Copiado'; setTimeout(function () { $copiar.textContent = 'Copiar'; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(texto).then(pronto).catch(function () { window.prompt('Copie o link:', texto); });
        } else {
          window.prompt('Copie o link:', texto);
        }
      });
    }
  }).catch(function (e) {
    mostrarErro('Não consegui carregar seus números agora. Tente de novo em instantes.');
    if (window.console) console.error(e);
  });
})();
