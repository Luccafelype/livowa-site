/* livowa.com/c/<apelido> — a página pública da criadora, fora do app.
 *
 * Lê as MESMAS funções que o app lê (criadora_por_handle, criadora_kcal_do_dia)
 * e as mesmas tabelas públicas (criadora_dietas, treino_template,
 * exercicios_biblioteca, receitas), com a chave anônima — que é pública por
 * desenho. Nada aqui escreve: a cópia da rotina só acontece dentro do app,
 * em conta de paciente, depois do ajuste.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';

  // Endereços das lojas. Vazio = o app ainda não está público; a barra de baixo
  // diz isso em vez de apontar para um link que não existe.
  var LOJAS = { ios: '', android: '' };

  var HANDLE_VALIDO = /^[a-z0-9_.]{2,40}$/;
  var NOME_DO_SLOT = {
    cafe_da_manha: 'Café da manhã',
    lanche_manha: 'Lanche da manhã',
    almoco: 'Almoço',
    lanche: 'Lanche',
    lanche_tarde: 'Lanche da tarde',
    jantar: 'Jantar',
    ceia: 'Ceia'
  };
  var DIAS_CURTOS = ['', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  var $content = document.getElementById('cr-content');
  var $cta = document.getElementById('cr-cta');
  var $abrir = document.getElementById('cr-abrir');
  var $ctaSub = document.getElementById('cr-cta-sub');
  var $lojas = document.getElementById('cr-lojas');

  // ── O apelido: mesma regra de `lib/indicacao.ts` (normalizarHandle) ─────
  function extrairHandle() {
    var bruto = new URLSearchParams(location.search).get('h');
    if (!bruto) {
      var parts = location.pathname.split('/').filter(Boolean);
      var i = parts.indexOf('c');
      if (i >= 0 && parts[i + 1] && parts[i + 1] !== 'index.html') bruto = parts[i + 1];
    }
    if (!bruto) return null;
    var h = String(bruto).trim();
    try { h = decodeURIComponent(h); } catch (e) { /* segue com o cru */ }
    h = h.split('?')[0].split('#')[0].replace(/^\/+/, '').replace(/\/+$/, '');
    if (h.toLowerCase().indexOf('c/') === 0) h = h.slice(2);
    h = h.replace(/^@+/, '').trim().toLowerCase();
    return HANDLE_VALIDO.test(h) ? h : null;
  }

  // ── Acesso ao banco (só leitura) ─────────────────────────────────────────
  function cabecalhos() {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
  function rpc(nome, args) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + nome, {
      method: 'POST', headers: cabecalhos(), body: JSON.stringify(args || {})
    }).then(function (r) {
      if (!r.ok) throw new Error('rpc ' + nome + ' http ' + r.status);
      return r.json();
    });
  }
  function ler(tabela, query) {
    return fetch(SUPABASE_URL + '/rest/v1/' + tabela + '?' + query, { headers: cabecalhos() })
      .then(function (r) {
        if (!r.ok) throw new Error('ler ' + tabela + ' http ' + r.status);
        return r.json();
      });
  }

  // ── Texto ────────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nomeDoSlot(slot) { return NOME_DO_SLOT[slot] || String(slot || '').replace(/_/g, ' '); }
  function diasEmTexto(dias) {
    if (!dias || !dias.length) return '';
    return dias.map(function (d) { return DIAS_CURTOS[d] || String(d); }).join(' · ');
  }
  function textoReferenciaPublica(nome) {
    // Literal de `lib/criadora.ts`: é o que separa referência pública de prescrição.
    return 'Esta é a rotina que ' + nome + ' compartilha. O Livowa ajusta as quantidades às suas metas. ' +
      'O plano é seu, montado por você com a ajuda do app. Não substitui orientação de profissional de saúde.';
  }
  function rotuloDaRede(rede) {
    if (rede === 'instagram') return 'Instagram';
    if (rede === 'tiktok') return 'TikTok';
    if (rede === 'youtube') return 'YouTube';
    return rede;
  }
  function urlDaRede(rede, valor) {
    var v = String(valor || '').trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    var u = v.replace(/^@/, '').replace(/\/+$/, '').trim();
    if (!u) return null;
    if (rede === 'instagram') return 'https://instagram.com/' + encodeURIComponent(u);
    if (rede === 'tiktok') return 'https://tiktok.com/@' + encodeURIComponent(u);
    if (rede === 'youtube') return 'https://youtube.com/@' + encodeURIComponent(u);
    return null;
  }
  function iniciais(nome) {
    return String(nome || '').replace(/\[[^\]]*\]/g, '').trim().split(/\s+/).slice(0, 2)
      .map(function (p) { return p[0] || ''; }).join('').toUpperCase() || '—';
  }
  function textoDoItem(a) {
    var q = a && a.quantidade != null ? Number(a.quantidade) : null;
    var u = a && a.unidade ? String(a.unidade) : '';
    var n = a && a.nome ? String(a.nome) : '';
    if (!n) return '';
    if (q == null || !isFinite(q)) return n;
    var qs = Number.isInteger(q) ? String(q) : q.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return qs + (u === 'g' || u === 'ml' ? '' : ' ') + u + ' ' + n;
  }
  function kcalTexto(n) { return Number(n).toLocaleString('pt-BR') + ' kcal'; }

  // ── Ícones (traço, sem emoji) ────────────────────────────────────────────
  var ICONE = {
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    prato: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>',
    halter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/></svg>',
    fora: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
  };

  // ── Desenho ──────────────────────────────────────────────────────────────
  function cartaoDaCriadora(c) {
    var redes = Object.keys(c.redes || {}).filter(function (k) { return !!c.redes[k]; });
    var avatar = c.foto_url
      ? '<img class="cr-avatar" src="' + esc(c.foto_url) + '" alt="">'
      : '<div class="cr-avatar" aria-hidden="true">' + esc(iniciais(c.nome)) + '</div>';
    var chips = redes.map(function (rede) {
      var url = urlDaRede(rede, c.redes[rede]);
      var rotulo = rotuloDaRede(rede) + ' ' + esc(c.redes[rede]);
      if (!url) return '<span class="cr-rede sem-link">' + rotulo + '</span>';
      return '<a class="cr-rede" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + rotulo + ICONE.fora + '</a>';
    }).join('');
    return '<div class="cr-card">' +
      '<div class="cr-quem">' + avatar +
      '<div><h1 class="cr-nome">' + esc(c.nome) + '</h1><p class="cr-handle">@' + esc(c.handle) + '</p></div></div>' +
      (c.bio ? '<p class="cr-bio">' + esc(c.bio) + '</p>' : '') +
      (chips ? '<div class="cr-redes">' + chips + '</div>' : '') +
      '</div>';
  }

  function cartaoRefeicao(r, kcal, foto) {
    var itens = (r.alimentos || []).map(textoDoItem).filter(Boolean);
    var fotoHtml = foto
      ? '<img class="cr-foto" src="' + esc(foto) + '" alt="">'
      : '<div class="cr-foto" aria-hidden="true">' + ICONE.prato + '</div>';
    return '<div class="cr-card"><div class="cr-refeicao">' + fotoHtml +
      '<div class="cr-refeicao-corpo">' +
      '<p class="cr-slot">' + esc(nomeDoSlot(r.slot)) + '</p>' +
      '<p class="cr-prato">' + esc(r.nome_prato || '') + (r.porcao_g ? ' <span class="cr-kcal" style="color:var(--muted);font-weight:500">' + esc(r.porcao_g) + ' g</span>' : '') + '</p>' +
      (itens.length ? '<p class="cr-itens">' + esc(itens.join(' · ')) + '</p>' : '') +
      (r.observacao ? '<p class="cr-obs">' + esc(r.observacao) + '</p>' : '') +
      '</div>' +
      (kcal != null ? '<span class="cr-kcal">' + esc(kcalTexto(kcal)) + '</span>' : '') +
      '</div></div>';
  }

  function secaoDieta(d, refeicoes, kcalPorRefeicao, fotos) {
    var detalhe = d.kcal_dia != null ? kcalTexto(d.kcal_dia) + ' no dia' + (d.kcal_completo ? '' : ' (parcial)') : '';
    return '<div class="cr-titulo">' + ICONE.prato + '<h2>A dieta dela</h2>' +
      (detalhe ? '<span class="cr-detalhe">' + esc(detalhe) + '</span>' : '') + '</div>' +
      '<p class="cr-sub">' + esc(d.titulo || '') + '</p>' +
      refeicoes.map(function (r, i) { return cartaoRefeicao(r, kcalPorRefeicao[i], fotos[i]); }).join('');
  }

  function secaoTreino(t, exercicios) {
    var sub = [t.titulo, diasEmTexto(t.dias_semana)].filter(Boolean).join(' · ');
    var linhas = exercicios.map(function (e) {
      var s = [];
      if (e.sets != null) s.push(e.sets + ' séries');
      if (e.reps_alvo != null) s.push(e.reps_alvo + ' rep.');
      if (e.rest_s != null) s.push(e.rest_s + ' s de descanso');
      return '<div class="cr-exercicio"><span class="cr-exercicio-nome">' + esc(e.nome) + '</span>' +
        '<span class="cr-exercicio-series">' + esc(s.join(' · ')) + '</span></div>';
    }).join('');
    return '<div class="cr-titulo">' + ICONE.halter + '<h2>O treino dela</h2>' +
      (exercicios.length ? '<span class="cr-detalhe">' + exercicios.length + ' exercícios</span>' : '') + '</div>' +
      '<p class="cr-sub">' + esc(sub) + '</p>' +
      '<div class="cr-card">' + (linhas || '<p class="cr-empty">O treino dela ainda não tem exercícios publicados.</p>') + '</div>';
  }

  function mostrarErro(msg) {
    $content.innerHTML = '<div class="cr-error">' + esc(msg) + '</div>' +
      '<p class="cr-empty"><a href="/" class="btn btn-outline">Conhecer o Livowa</a></p>';
  }

  // ── A barra de baixo: abrir no app, ou dizer o que fazer sem ele ─────────
  function armarBarra(handle) {
    // No iPhone com o app, o link universal já abriu o app antes desta página
    // existir. Aqui o botão tenta o esquema do app (funciona dentro do
    // TikTok/Instagram, que ignoram o link universal); se nada acontecer em
    // 1,5 s, é porque o app não está instalado — e aí a barra mostra as lojas.
    var esquema = 'livowa:///c/' + encodeURIComponent(handle);
    $abrir.setAttribute('href', esquema);
    $abrir.addEventListener('click', function (ev) {
      ev.preventDefault();
      var saiu = false;
      var marcar = function () { saiu = true; };
      document.addEventListener('visibilitychange', marcar, { once: true });
      window.addEventListener('pagehide', marcar, { once: true });
      location.href = esquema;
      setTimeout(function () {
        if (saiu || document.hidden) return;
        mostrarLojas();
      }, 1500);
    });
    $cta.hidden = false;
  }

  function mostrarLojas() {
    var partes = [];
    if (LOJAS.ios) partes.push('<a class="btn btn-outline" href="' + esc(LOJAS.ios) + '" rel="noopener">App Store</a>');
    if (LOJAS.android) partes.push('<a class="btn btn-outline" href="' + esc(LOJAS.android) + '" rel="noopener">Google Play</a>');
    if (!partes.length) {
      partes.push('<p class="cr-breve">O Livowa chega às lojas em breve. Guarde este link: com o app no celular, ele abre direto na rotina dela.</p>');
    }
    $ctaSub.textContent = 'Parece que o app ainda não está neste celular.';
    $lojas.innerHTML = partes.join('');
    $lojas.hidden = false;
  }

  // ── Fluxo ────────────────────────────────────────────────────────────────
  var handle = extrairHandle();
  if (!handle) {
    mostrarErro('Esse link não aponta para nenhuma criadora.');
    return;
  }
  document.title = '@' + handle + ' no Livowa';

  rpc('criadora_por_handle', { p_handle: handle }).then(function (p) {
    if (!p || !p.criadora) {
      mostrarErro('Não achei essa página. O link pode ter mudado.');
      return;
    }
    var c = p.criadora;
    document.title = esc(c.nome) + ' no Livowa';

    // A página aparece já com o cartão dela; a dieta e o treino chegam em seguida.
    var demo = /^\[TESTE\]/.test(String(c.nome || ''))
      ? '<div class="cr-aviso cr-demo">' + ICONE.info + '<span>Cadastro de teste: esta criadora não é uma pessoa real.</span></div>'
      : '';
    $content.innerHTML = cartaoDaCriadora(c) +
      '<div class="cr-aviso">' + ICONE.info + '<span>' + esc(textoReferenciaPublica(c.nome)) + '</span></div>' + demo +
      '<div id="cr-dieta"></div><div id="cr-treino"></div>';
    armarBarra(c.handle);

    var d = (p.dietas || [])[0];
    var t = (p.treinos || [])[0];

    var pDieta = d ? ler('criadora_dietas', 'id=eq.' + encodeURIComponent(d.id) + '&status=eq.publicada&select=titulo,dias')
      .then(function (linhas) {
        var linha = linhas && linhas[0];
        if (!linha) return;
        var dias = Array.isArray(linha.dias) ? linha.dias : [];
        var refeicoes = (dias[0] && dias[0].refeicoes) || [];
        // O kcal de cada refeição sai da MESMA função que dá o total do dia,
        // para os cartões e o resumo nunca discordarem.
        var kcals = Promise.all(refeicoes.map(function (r) {
          return rpc('criadora_kcal_do_dia', { p_dia: { refeicoes: [r] } })
            .then(function (x) { var n = x && x.kcal != null ? Number(x.kcal) : null; return isFinite(n) ? n : null; })
            .catch(function () { return null; });
        }));
        var ids = refeicoes.map(function (r) { return r.receita_id; }).filter(Boolean);
        var fotos = ids.length
          ? ler('receitas', 'id=in.(' + ids.map(encodeURIComponent).join(',') + ')&select=id,foto_thumb_url,foto_url').catch(function () { return []; })
          : Promise.resolve([]);
        return Promise.all([kcals, fotos]).then(function (res) {
          var porReceita = {};
          (res[1] || []).forEach(function (x) { porReceita[x.id] = x.foto_thumb_url || x.foto_url || null; });
          var fotosPorRefeicao = refeicoes.map(function (r) { return r.receita_id ? porReceita[r.receita_id] || null : null; });
          document.getElementById('cr-dieta').innerHTML = secaoDieta(
            { titulo: linha.titulo, kcal_dia: d.kcal_dia, kcal_completo: d.kcal_completo },
            refeicoes, res[0], fotosPorRefeicao);
        });
      }) : Promise.resolve();

    var pTreino = t ? ler('treino_template', 'id=eq.' + encodeURIComponent(t.template_id) + '&publico=eq.true&select=exercicios')
      .then(function (linhas) {
        var linha = linhas && linhas[0];
        if (!linha) return;
        var crus = Array.isArray(linha.exercicios) ? linha.exercicios : [];
        var ids = crus.map(function (e) { return e.exercicio_id; }).filter(Boolean);
        var nomes = ids.length
          ? ler('exercicios_biblioteca', 'id=in.(' + ids.map(encodeURIComponent).join(',') + ')&select=id,nome').catch(function () { return []; })
          : Promise.resolve([]);
        return nomes.then(function (linhasNomes) {
          var porId = {};
          (linhasNomes || []).forEach(function (x) { porId[x.id] = x.nome; });
          var exercicios = crus.map(function (e) {
            return { nome: porId[e.exercicio_id] || 'Exercício', sets: e.sets, reps_alvo: e.reps_alvo, rest_s: e.rest_s };
          });
          document.getElementById('cr-treino').innerHTML = secaoTreino(t, exercicios);
        });
      }) : Promise.resolve();

    return Promise.all([pDieta, pTreino]);
  }).catch(function (e) {
    mostrarErro('Não consegui carregar essa página agora. Tente de novo em instantes.');
    if (window.console) console.error(e);
  });
})();
