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
    lanche_da_manha: 'Lanche da manhã',
    jantar: 'Jantar',
    ceia: 'Ceia',
    pre_treino: 'Pré-treino',
    pos_treino: 'Pós-treino'
  };
  var DIAS_CURTOS = ['', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

  var $content = document.getElementById('cr-content');

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
  function kcalTexto(n) { return Number(n).toLocaleString('pt-BR') + ' kcal'; }
  function nomeDoExercicio(e, daBiblioteca) {
    // 1º o `nome` gravado no modelo de treino (o pt-BR escolhido na ingestão,
    // passo 22); 2º o que o vídeo dela diz; 3º a biblioteca (pt-BR, senão cru).
    var n = String((e && e.nome) || (e && e.nome_lido) || daBiblioteca || 'Exercício').trim();
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  function notaDoExercicio(e) {
    // Só quando o exercício da biblioteca é o VIZINHO do que ela fez
    // (casamento ambíguo na ingestão): a diferença, em português, embaixo do nome.
    if (!e || e.casamento !== 'ambiguo') return '';
    var m = /no vídeo é[^;]*(?:;\s*a biblioteca[^;]*)?/i.exec(String(e.observacao || ''));
    return m ? m[0] : '';
  }

  // ── Ícones (traço, sem emoji) ────────────────────────────────────────────
  var ICONE = {
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    prato: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>',
    halter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/></svg>',
    fora: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>'
  };

  // ── Desenho (Redesign 14/09 — ROTINA_CRIADOR_REDESIGN.md) ───────────────
  // "A tela vende a rotina dela em 2 rolagens: quem é, o que ela come (foto
  // grande), o que ela treina (vídeo dela). Todo detalhe de execução — gramas,
  // medidas, séries, descanso — mora no toque, não na lista."
  var CHEVRON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  var VOLTAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }

  function topo(c) {
    return '<div class="cr-top"><a class="cr-b" href="/" aria-label="Voltar ao início">' + VOLTAR + '</a>' +
      '<div class="cr-c"><div class="cr-e">Rotina de criador</div><div class="cr-t">' + esc(c.nome) + '</div></div>' +
      '<div style="width:32px" aria-hidden="true"></div></div>';
  }
  function hero(c) {
    // Sem bio, sem e-mail, sem chips, sem contagem de seguidores (problemas 1 e 2
    // do redesign): foto 72, nome, e "@handle · título curto" (criadoras.titulo).
    var avatar = c.foto_url
      ? '<img class="cr-avatar" src="' + esc(c.foto_url) + '" alt="">'
      : '<div class="cr-avatar" aria-hidden="true">' + esc(iniciais(c.nome)) + '</div>';
    var titulo = String(c.titulo || '').trim();
    return '<div class="cr-hero">' + avatar + '<div><h1 class="cr-nome">' + esc(c.nome) + '</h1>' +
      '<p class="cr-handle">@' + esc(c.handle) + (titulo ? '<span class="cr-sep">·</span><span>' + esc(titulo) + '</span>' : '') + '</p></div></div>';
  }
  function stats(nRefeicoes, kcalDia, nExercicios) {
    var kcal = kcalDia != null && Number(kcalDia) > 0
      ? '<div class="cr-v">' + esc(Number(kcalDia).toLocaleString('pt-BR')) + '<small>kcal</small></div><div class="cr-k">no dia</div>'
      : '<div class="cr-v">—</div><div class="cr-k">kcal a definir</div>';
    return '<div class="cr-stats" id="cr-stats">' +
      '<div><div class="cr-v">' + (nRefeicoes == null ? '—' : nRefeicoes) + '</div><div class="cr-k">refeições</div></div>' +
      '<div>' + kcal + '</div>' +
      '<div><div class="cr-v">' + (nExercicios == null ? '—' : nExercicios) + '</div><div class="cr-k">exercícios</div></div>' +
      '</div>';
  }
  function secaoCabecalho(num, titulo, direita) {
    return '<div class="cr-sech"><span class="cr-num">' + num + '</span><h2>' + esc(titulo) + '</h2>' +
      (direita ? '<span class="cr-m">' + esc(direita) + '</span>' : '') + '</div>';
  }

  // O TÍTULO CURTO do card: os 2–3 itens principais do que ela comeu, em
  // frase ("Pãozinho na chapa, ovo e banana com whey"). Bebida, doce e
  // suplemento ficam para o detalhe (regra do redesign) — a não ser que a
  // refeição seja só isso.
  var SECUNDARIO = /\b(coca|refri|refrigerante|suco|água|agua|café|cafe|coffee|chá|cha\b|matcha|creatina|suplemento|bala|chocolate|doce|sobremesa|língua de gato|lingua de gato|geleia|blessy|supercafé|supercafe|supercoffee)\b/i;
  function nomeLimpo(s) {
    var t = String(s || '')
      .replace(/\s*\([^)]*\)/g, '')                                  // "Ovo (1 unidade)", "McMelt (rap, carne…)" -> sem o parêntese
      .replace(/^\d+\s*(fatias?|unidades?|un\.?|x|col(?:heres?)?\.?(?:\s*de\s*sopa)?)\s+(de\s+)?/i, '')
      .replace(/\s{2,}/g, ' ').trim();
    // Item comprido ("franguinho cremoso com molho de queijo") fica só com o
    // núcleo antes do "com" — o resto é detalhe, e o título tem 2 linhas.
    if (t.length > 28) {
      var m = /^(.{8,}?)\s+com\s+/i.exec(t);
      if (m) t = m[1];
    }
    return t;
  }
  function itensDaRefeicao(r) {
    var base = Array.isArray(r.pratos_lidos) && r.pratos_lidos.length
      ? r.pratos_lidos
      : (r.alimentos || []).map(function (a) { return a && a.nome; });
    if (!base.length && r.nome_prato) base = [r.nome_prato];
    var vistos = {}; var saida = [];
    base.forEach(function (b) {
      String(b || '').split(/\s*\+\s*/).map(nomeLimpo).filter(Boolean).forEach(function (n) {
        var k = n.toLowerCase();
        if (!vistos[k]) { vistos[k] = 1; saida.push(n); }
      });
    });
    return saida;
  }
  function tituloCurto(r) {
    var itens = itensDaRefeicao(r);
    var principais = itens.filter(function (n) { return !SECUNDARIO.test(n); });
    if (!principais.length) principais = itens;
    var tres = principais.slice(0, 3).map(function (n, i) { return i === 0 ? n.charAt(0).toUpperCase() + n.slice(1) : n.charAt(0).toLowerCase() + n.slice(1); });
    if (tres.length <= 1) return tres.join('');
    return tres.slice(0, -1).join(', ') + ' e ' + tres[tres.length - 1];
  }
  function cartaoRefeicao(r, kcal, foto, i, handle) {
    var temKcal = kcal != null && Number(kcal) > 0;
    var fotoHtml = foto
      ? '<div class="cr-ph"><img src="' + esc(foto) + '" alt="" loading="lazy"></div>'
      : '<div class="cr-ph cr-vazio" aria-hidden="true"></div>';
    // O card inteiro é tocável: abre a rotina no app, na refeição (detalhe com
    // ingredientes e medidas mora lá, não aqui).
    return '<a class="cr-meal" href="' + esc(esquemaDoApp(handle, 'refeicao=' + i)) + '" data-abrir="1">' + fotoHtml +
      '<div class="cr-ct"><div class="cr-ey">' + esc(r.slot ? nomeDoSlot(r.slot) : 'Todo dia') + '</div>' +
      '<div class="cr-tt">' + esc(tituloCurto(r) || r.nome_prato || '') + '</div>' +
      '<div class="cr-ft"><span class="cr-kc">' + (temKcal ? esc(kcalTexto(kcal)) : '') + '</span>' + CHEVRON + '</div></div></a>';
  }
  function secaoDieta(d, refeicoes, kcalPorRefeicao, fotos, handle) {
    var total = d.kcal_dia != null && Number(d.kcal_dia) > 0 ? kcalTexto(d.kcal_dia) : '';
    return '<div class="cr-sec">' + secaoCabecalho('01', 'A dieta dela', total) +
      '<p class="cr-sub">' + esc(d.titulo || '') + '</p>' +
      '<div class="cr-meals">' + refeicoes.map(function (r, i) { return cartaoRefeicao(r, kcalPorRefeicao[i], fotos[i], i, handle); }).join('') + '</div>' +
      '</div>' +
      '<a class="cr-cta cr-p" href="' + esc(esquemaDoApp(handle, 'quero=dieta')) + '" data-abrir="1">Quero essa dieta</a>';
  }

  var GRUPO_PT = { gluteos: 'Glúteos', abdutores: 'Glúteo médio', adutores: 'Adutores', quadriceps: 'Quadríceps', posterior: 'Posterior de coxa',
    isquiotibiais: 'Posterior de coxa', panturrilha: 'Panturrilha', lombar: 'Lombar', costas: 'Costas', peito: 'Peito', ombros: 'Ombros',
    biceps: 'Bíceps', triceps: 'Tríceps', abdomen: 'Abdômen', core: 'Core', trapezio: 'Trapézio', antebraco: 'Antebraço' };
  function grupoEmTexto(lista) {
    return (lista || []).slice(0, 2).map(function (g) {
      var k = String(g || '').toLowerCase().replace(/\s+/g, '');
      return GRUPO_PT[k] || (k.charAt(0).toUpperCase() + k.slice(1));
    }).join(' · ');
  }
  var DIAS_LONGOS = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  function tituloDoTreino(t) {
    // Sem @ de terceiros no subtítulo (regra do redesign): "Pernas e glúteos · segunda".
    var base = String(t.titulo || '').replace(/\s*(com|c\/)?\s*@[\w.]+/gi, '').replace(/\s*[—–-]\s*$/, '').trim();
    var dias = (t.dias_semana || []).map(function (d) { return DIAS_LONGOS[d] || ''; }).filter(Boolean);
    // O dia só entra se o título ainda não o diz ("Treino de pernas de segunda").
    dias = dias.filter(function (dia) { return base.toLowerCase().indexOf(dia) < 0; });
    return [base, dias.join(', ')].filter(Boolean).join(' · ');
  }
  function secaoTreino(t, exercicios, handle) {
    var linhas = exercicios.map(function (e, i) {
      var thumb = e.foto_url
        ? '<div class="cr-th"><img src="' + esc(e.foto_url) + '" alt="" loading="lazy"></div>'
        : '<div class="cr-th" aria-hidden="true"><span>vídeo dela</span></div>';
      return '<div class="cr-row">' + thumb + '<div><div class="cr-nm">' + esc(e.nome) + '</div>' +
        (e.grupo ? '<div class="cr-mg">' + esc(e.grupo) + '</div>' : '') + '</div>' +
        '<span class="cr-n">' + (i < 9 ? '0' : '') + (i + 1) + '</span></div>';
    }).join('');
    return '<div class="cr-sec">' + secaoCabecalho('02', 'O treino dela', exercicios.length ? exercicios.length + ' exercícios' : '') +
      '<p class="cr-sub">' + esc(tituloDoTreino(t)) + '</p>' +
      '<div class="cr-ex">' + (linhas || '<p class="cr-empty">O treino dela ainda não tem exercícios publicados.</p>') + '</div>' +
      '</div>' +
      '<a class="cr-cta cr-s" href="' + esc(esquemaDoApp(handle, 'quero=treino')) + '" data-abrir="1">Quero esse treino</a>';
  }
  function nota(c) {
    var ig = c.redes && c.redes.instagram ? urlDaRede('instagram', c.redes.instagram) : null;
    return '<p class="cr-note">Rotina compartilhada por ' + esc(primeiroNome(c.nome)) + '. O Livowa ajusta as quantidades às suas metas. ' +
      'Não substitui orientação de profissional de saúde.' +
      (ig ? '<br><a href="' + esc(ig) + '" target="_blank" rel="noopener noreferrer">Ver perfil no Instagram</a>' : '') + '</p>' +
      '<p class="cr-lojas" id="cr-lojas" hidden></p>';
  }

  function mostrarErro(msg) {
    $content.innerHTML = '<div class="cr-error">' + esc(msg) + '</div>' +
      '<p class="cr-empty"><a href="/" class="btn btn-outline">Conhecer o Livowa</a></p>';
  }

  // ── Abrir no app: cada card e cada botão "Quero…" leva à rotina dela ────
  // No iPhone com o app, o link universal já abriu o app antes desta página
  // existir. Aqui o toque tenta o esquema do app (funciona dentro do
  // TikTok/Instagram, que ignoram o link universal); se nada acontecer em
  // 1,5 s, é porque o app não está instalado — e aí a nota diz o que fazer.
  function esquemaDoApp(handle, extra) {
    return 'livowa:///c/' + encodeURIComponent(handle) + (extra ? '?' + extra : '');
  }
  function armarAberturas() {
    $content.addEventListener('click', function (ev) {
      var alvo = ev.target && ev.target.closest ? ev.target.closest('[data-abrir]') : null;
      if (!alvo) return;
      ev.preventDefault();
      var esquema = alvo.getAttribute('href');
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
  }
  function mostrarLojas() {
    var $lojas = document.getElementById('cr-lojas');
    if (!$lojas) return;
    var partes = [];
    if (LOJAS.ios) partes.push('<a href="' + esc(LOJAS.ios) + '" rel="noopener">App Store</a>');
    if (LOJAS.android) partes.push('<a href="' + esc(LOJAS.android) + '" rel="noopener">Google Play</a>');
    $lojas.innerHTML = 'Parece que o app ainda não está neste celular. ' +
      (partes.length ? partes.join(' · ') : 'O Livowa chega às lojas em breve. Guarde este link: com o app no celular, ele abre direto na rotina dela.');
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
    var d0 = (p.dietas || [])[0];
    var t0 = (p.treinos || [])[0];

    // A página aparece já com quem ela é e os três números; dieta e treino chegam em seguida.
    var demo = /^\[TESTE\]/.test(String(c.nome || ''))
      ? '<div class="cr-demo">Cadastro de teste: esta criadora não é uma pessoa real.</div>'
      : '';
    $content.innerHTML = topo(c) + hero(c) +
      stats(d0 ? d0.n_refeicoes : null, d0 ? d0.kcal_dia : null, t0 ? t0.n_exercicios : null) + demo +
      '<div id="cr-dieta"></div><div id="cr-treino"></div>' + nota(c);
    armarAberturas();

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
        // A foto da refeição é a DELA (foto_url, tirada do vídeo/carrossel,
        // 14/09); a foto da receita do acervo só entra onde a dela não existe.
        var ids = refeicoes.filter(function (r) { return !r.foto_url; })
          .map(function (r) { return r.receita_id; }).filter(Boolean);
        var fotos = ids.length
          ? ler('receitas', 'id=in.(' + ids.map(encodeURIComponent).join(',') + ')&select=id,foto_thumb_url,foto_url').catch(function () { return []; })
          : Promise.resolve([]);
        return Promise.all([kcals, fotos]).then(function (res) {
          var porReceita = {};
          (res[1] || []).forEach(function (x) { porReceita[x.id] = x.foto_thumb_url || x.foto_url || null; });
          var fotosPorRefeicao = refeicoes.map(function (r) {
            return r.foto_url || (r.receita_id ? porReceita[r.receita_id] || null : null);
          });
          document.getElementById('cr-dieta').innerHTML = secaoDieta(
            { titulo: linha.titulo, kcal_dia: d.kcal_dia, kcal_completo: d.kcal_completo },
            refeicoes, res[0], fotosPorRefeicao, c.handle);
          // Os três números falam da MESMA lista que os cards.
          var $st = document.getElementById('cr-stats');
          if ($st) $st.outerHTML = stats(refeicoes.length, d.kcal_dia, t0 ? t0.n_exercicios : null);
        });
      }) : Promise.resolve();

    var pTreino = t ? ler('treino_template', 'id=eq.' + encodeURIComponent(t.template_id) + '&publico=eq.true&select=exercicios')
      .then(function (linhas) {
        var linha = linhas && linhas[0];
        if (!linha) return;
        var crus = Array.isArray(linha.exercicios) ? linha.exercicios : [];
        var ids = crus.map(function (e) { return e.exercicio_id; }).filter(Boolean);
        // 14/09: o nome sai em PORTUGUÊS — o que o vídeo dela diz (nome_lido, gravado
        // no modelo) vence; senão o pt-BR da biblioteca (v_exercicios_biblioteca_i18n,
        // que a chave pública lê); por último o nome cru da biblioteca.
        var lista = 'id=in.(' + ids.map(encodeURIComponent).join(',') + ')';
        var nomes = ids.length
          ? ler('v_exercicios_biblioteca_i18n', lista + '&select=id,nome,nome_pt_br,grupo_muscular')
              .catch(function () { return ler('exercicios_biblioteca', lista + '&select=id,nome').catch(function () { return []; }); })
          : Promise.resolve([]);
        return nomes.then(function (linhasNomes) {
          var porId = {}; var grupoPorId = {};
          (linhasNomes || []).forEach(function (x) { porId[x.id] = x.nome_pt_br || x.nome; grupoPorId[x.id] = x.grupo_muscular; });
          // Sem séries, descanso ou nota de mapeamento (regra do redesign): nome
          // em pt-BR, grupo muscular e, quando existir, o frame do vídeo dela.
          var exercicios = crus.map(function (e) {
            return { nome: nomeDoExercicio(e, porId[e.exercicio_id]), grupo: grupoEmTexto(grupoPorId[e.exercicio_id]), foto_url: e.foto_url || null };
          });
          document.getElementById('cr-treino').innerHTML = secaoTreino(t, exercicios, c.handle);
        });
      }) : Promise.resolve();

    return Promise.all([pDieta, pTreino]);
  }).catch(function (e) {
    mostrarErro('Não consegui carregar essa página agora. Tente de novo em instantes.');
    if (window.console) console.error(e);
  });
})();
