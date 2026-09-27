/* livowa.com/c/painel/?t=<token> — o painel privado da criadora.
 *
 * Lê criadora_numeros_por_token com a chave anônima. Ela devolve só
 * contagens; com token errado devolve nada, e a página não diz se o token
 * "quase" existe.
 *
 * "Suas dietas e treinos" (T40, 27/09): criadora_painel_itens lista tudo o que
 * foi lido dos vídeos dela, publicado ou não, com as fotos dos pratos, a nota e
 * o link do vídeo; criadora_painel_definir é a ÚNICA escrita daqui — marca a
 * principal e põe/tira da página, sempre pelo token. Sem as duas funções no
 * banco, a seção diz "em breve" e o resto do painel segue igual.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';
  var TOKEN_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  var $content = document.getElementById('pn-content');
  var Foco = window.LivowaDietaEmFoco;

  function rpc(nome, args) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + nome, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(function (r) {
      if (!r.ok) throw new Error('rpc ' + nome + ' http ' + r.status);
      return r.json();
    });
  }

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

  // ── Suas dietas e treinos (T40) ──────────────────────────────────────────
  // O nome curto do prato: o que vem antes do primeiro "+" ("Pãozinho com
  // requeijão na chapa + Ovo + …" -> "Pãozinho com requeijão na chapa").
  function nomeDoPrato(nome) {
    return String(nome || '').split(/\s*\+\s*/)[0].replace(/\s*\([^)]*\)/g, '').trim();
  }
  function textoDaNota(item) {
    var e = item.engajamento;
    if (!e || (e.likes == null && e.comentarios == null)) return 'Sem os números do vídeo ainda';
    var partes = ['Nota ' + n(Math.round(Foco.notaDoVideo(item, new Date())))];
    if (e.likes != null) partes.push(n(e.likes) + ' curtidas');
    if (e.comentarios != null) partes.push(n(e.comentarios) + ' comentários');
    return partes.join(' · ');
  }
  function itemDoPainel(tipo, x) {
    var naPagina = x.status === 'publicada';
    var pratos = tipo === 'dieta' ? (x.pratos || []) : [];
    var faixaFotos = pratos.length
      ? '<div class="pn-pratos">' + pratos.map(function (p) {
          return '<figure class="pn-prato">' + (p.foto_url
            ? '<img src="' + esc(p.foto_url) + '" alt="" loading="lazy">'
            : '<span class="pn-prato-vazio" aria-hidden="true"></span>') +
            '<figcaption>' + esc(nomeDoPrato(p.nome) || '—') + '</figcaption></figure>';
        }).join('') + '</div>'
      : '';
    return '<div class="pn-item' + (naPagina ? '' : ' fora') + '">' + faixaFotos +
      '<div class="pn-item-topo"><h3>' + esc(x.titulo || 'Sem título') + '</h3>' +
      '<span class="pn-status' + (naPagina ? ' on' : '') + '">' + (naPagina ? 'Na página' : 'Fora da página') + '</span></div>' +
      '<p class="pn-item-nota">' + esc(textoDaNota(x)) + '</p>' +
      (x.fonte_url ? '<a class="pn-video" href="' + esc(x.fonte_url) + '" target="_blank" rel="noopener noreferrer">Ver o vídeo</a>' : '') +
      '<div class="pn-acoes">' +
        '<button type="button" class="pn-acao' + (x.principal ? ' ativa' : '') + '" data-tipo="' + tipo + '" data-id="' + esc(x.id) + '"' +
          ' data-principal="' + (x.principal ? 'false' : 'true') + '" aria-pressed="' + (x.principal ? 'true' : 'false') + '"' +
          (naPagina ? '' : ' disabled title="Ponha na página antes de marcar como principal"') + '>' +
          (x.principal ? 'Principal' : 'Marcar como principal') + '</button>' +
        '<button type="button" class="pn-acao" data-tipo="' + tipo + '" data-id="' + esc(x.id) + '" data-publicada="' + (naPagina ? 'false' : 'true') + '">' +
          (naPagina ? 'Tirar da página' : 'Pôr na página') + '</button>' +
      '</div></div>';
  }
  function secaoItens(d) {
    var dietas = (d && d.dietas) || [];
    var treinos = (d && d.treinos) || [];
    if (!dietas.length && !treinos.length) {
      return '<div class="cr-card"><p class="pn-vazio">Ainda não lemos nenhum vídeo seu. Quando lermos, cada dieta e cada treino aparece aqui para você escolher o que vai para a sua página.</p></div>';
    }
    return '<p class="pn-dica pn-itens-dica">A principal é a que abre primeiro na sua página. Sem principal, abre a mais recente — ou uma mais antiga, se o vídeo dela tiver ido muito melhor.</p>' +
      (dietas.length ? '<h3 class="pn-grupo">Dietas</h3>' + dietas.map(function (x) { return itemDoPainel('dieta', x); }).join('') : '') +
      (treinos.length ? '<h3 class="pn-grupo">Treinos</h3>' + treinos.map(function (x) { return itemDoPainel('treino', x); }).join('') : '');
  }
  function carregarItens(token) {
    var $itens = document.getElementById('pn-itens');
    if (!$itens) return Promise.resolve();
    return rpc('criadora_painel_itens', { p_token: token }).then(function (d) {
      $itens.innerHTML = secaoItens(d);
    }).catch(function (e) {
      // Função ainda não criada no banco (404) ou fora do ar: o resto do painel segue.
      $itens.innerHTML = '<div class="cr-card"><p class="pn-vazio">Em breve: aqui você vai escolher quais dietas e treinos dos seus vídeos aparecem na sua página, e qual abre primeiro.</p></div>';
      if (window.console) console.warn(e);
    });
  }
  function armarItens(token) {
    var $itens = document.getElementById('pn-itens');
    if (!$itens) return;
    $itens.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('.pn-acao') : null;
      if (!b || b.disabled) return;
      var args = { p_token: token, p_tipo: b.getAttribute('data-tipo'), p_id: b.getAttribute('data-id') };
      if (b.hasAttribute('data-principal')) args.p_principal = b.getAttribute('data-principal') === 'true';
      if (b.hasAttribute('data-publicada')) args.p_publicada = b.getAttribute('data-publicada') === 'true';
      Array.prototype.forEach.call($itens.querySelectorAll('.pn-acao'), function (x) { x.disabled = true; });
      b.textContent = 'Salvando...';
      rpc('criadora_painel_definir', args).then(function (r) {
        if (!r || r.ok !== true) throw new Error('definir: ' + (r && r.motivo));
        return carregarItens(token);
      }).catch(function (e) {
        if (window.console) console.error(e);
        return carregarItens(token).then(function () {
          $itens.insertAdjacentHTML('afterbegin', '<div class="cr-error">Não consegui salvar agora. Tente de novo em instantes.</div>');
        });
      });
    });
  }

  var token = (new URLSearchParams(location.search).get('t') || '').trim().toLowerCase();
  if (!TOKEN_VALIDO.test(token)) {
    mostrarErro('Este link não está completo. Abra exatamente o link que a Livowa mandou para você.');
    return;
  }

  rpc('criadora_numeros_por_token', { p_token: token }).then(function (d) {
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
      semanas(d.por_semana) +
      '<div class="cr-titulo"><h2>Suas dietas e treinos</h2></div>' +
      '<div id="pn-itens"><div class="cr-loading" role="status">Carregando...</div></div>';
    armarItens(token);
    carregarItens(token);

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
