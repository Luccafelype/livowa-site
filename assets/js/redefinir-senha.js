/*
 * livowa.com/redefinir-senha/ — troca de senha pelo link do e-mail (04/10).
 *
 * Estados (um visível por vez): carregando → sem-link | vencido | form → pronto.
 * O link traz a sessão de recuperação no fragmento (#access_token=...) — fluxo
 * implícito, o que o app usa — ou ?token_hash=...&type=recovery. A senha nova vai
 * por PUT /auth/v1/user com o token do link. Mesma regra de senha do app
 * (lib/passwordPolicy.ts): 6+ caracteres, 1 maiúscula, 1 caractere especial.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';

  var ESPECIAL = /[!@#$%^&*()_+\-={}[\];':"|,.<>/?~`\\]/;
  var MAIUSCULA = /[A-Z]/;
  var MINIMO = 6;

  var token = null;

  function $(id) { return document.getElementById(id); }

  function mostrar(estado) {
    ['rs-carregando', 'rs-sem-link', 'rs-vencido', 'rs-form-estado', 'rs-pronto'].forEach(function (id) {
      $(id).hidden = id !== estado;
    });
    document.body.setAttribute('data-estado', estado);
  }

  function parametros(trecho) {
    var saida = {};
    (trecho || '').split('&').forEach(function (par) {
      if (!par) return;
      var i = par.indexOf('=');
      var k = i < 0 ? par : par.slice(0, i);
      var v = i < 0 ? '' : par.slice(i + 1);
      try { saida[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
      catch (e) { saida[k] = v; }
    });
    return saida;
  }

  /** Segundos até o token vencer (exp do JWT); null se não der para ler. */
  function segundosAteVencer(jwt) {
    try {
      var meio = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (meio.length % 4) meio += '=';
      var corpo = JSON.parse(atob(meio));
      if (typeof corpo.exp !== 'number') return null;
      return corpo.exp - Math.floor(Date.now() / 1000);
    } catch (e) {
      return null;
    }
  }

  function emailDoToken(jwt) {
    try {
      var meio = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (meio.length % 4) meio += '=';
      return JSON.parse(atob(meio)).email || '';
    } catch (e) {
      return '';
    }
  }

  function limparEndereco() {
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* segue */ }
  }

  function abrirFormulario(accessToken) {
    var falta = segundosAteVencer(accessToken);
    if (falta !== null && falta <= 0) { mostrar('rs-vencido'); return; }
    token = accessToken;
    var email = emailDoToken(accessToken);
    if (email) $('rs-conta').textContent = 'Para a conta ' + email + '. Depois, entre no app com ela.';
    mostrar('rs-form-estado');
    $('rs-senha').focus();
  }

  function verificarTokenHash(tokenHash) {
    return fetch(SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recovery', token_hash: tokenHash }),
    }).then(function (r) {
      if (!r.ok) throw new Error('verify');
      return r.json();
    }).then(function (sessao) {
      if (!sessao || !sessao.access_token) throw new Error('verify');
      abrirFormulario(sessao.access_token);
    }).catch(function () {
      mostrar('rs-vencido');
    });
  }

  function regras(senha, confirma) {
    return {
      tamanho: senha.length >= MINIMO,
      maiuscula: MAIUSCULA.test(senha),
      especial: ESPECIAL.test(senha),
      iguais: senha.length > 0 && senha === confirma,
    };
  }

  function pintarRegras() {
    var r = regras($('rs-senha').value, $('rs-confirma').value);
    Array.prototype.forEach.call($('rs-regras').querySelectorAll('li'), function (li) {
      li.classList.toggle('ok', !!r[li.getAttribute('data-regra')]);
    });
    return r;
  }

  function avisar(texto) {
    var el = $('rs-aviso');
    el.textContent = texto || '';
    el.hidden = !texto;
  }

  function salvar(ev) {
    ev.preventDefault();
    var r = pintarRegras();
    if (!r.tamanho || !r.maiuscula || !r.especial) {
      avisar('A senha precisa de pelo menos 6 caracteres, 1 letra maiúscula e 1 caractere especial.');
      return;
    }
    if (!r.iguais) { avisar('As duas senhas não estão iguais.'); return; }
    avisar('');

    var botao = $('rs-salvar');
    botao.disabled = true;
    botao.textContent = 'Salvando...';

    fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: $('rs-senha').value }),
    }).then(function (resp) {
      if (resp.ok) {
        // A sessão do link só servia para trocar a senha: encerra no servidor.
        fetch(SUPABASE_URL + '/auth/v1/logout?scope=local', {
          method: 'POST',
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token },
        }).catch(function () { /* sem efeito para a pessoa */ });
        token = null;
        mostrar('rs-pronto');
        return;
      }
      return resp.json().catch(function () { return {}; }).then(function (corpo) {
        var codigo = (corpo && (corpo.error_code || corpo.code)) || '';
        if (resp.status === 401 || resp.status === 403 || codigo === 'session_not_found' || codigo === 'bad_jwt') {
          mostrar('rs-vencido');
        } else if (codigo === 'same_password') {
          avisar('A senha nova precisa ser diferente da senha anterior.');
        } else if (codigo === 'weak_password' || resp.status === 422) {
          avisar('Essa senha não foi aceita. Use pelo menos 6 caracteres, com 1 letra maiúscula e 1 caractere especial.');
        } else if (resp.status === 429) {
          avisar('Muitas tentativas seguidas. Espere um minuto e toque em salvar de novo.');
        } else {
          avisar('Não deu para salvar agora. Confira a internet e toque em salvar de novo.');
        }
      });
    }).catch(function () {
      avisar('Não deu para salvar agora. Confira a internet e toque em salvar de novo.');
    }).then(function () {
      botao.disabled = false;
      botao.textContent = 'Salvar nova senha';
    });
  }

  function iniciar() {
    var doFragmento = parametros(location.hash.replace(/^#/, ''));
    var daConsulta = parametros(location.search.replace(/^\?/, ''));
    limparEndereco();

    $('rs-form').addEventListener('submit', salvar);
    $('rs-senha').addEventListener('input', pintarRegras);
    $('rs-confirma').addEventListener('input', pintarRegras);
    $('rs-mostrar').addEventListener('change', function () {
      var tipo = this.checked ? 'text' : 'password';
      $('rs-senha').type = tipo;
      $('rs-confirma').type = tipo;
    });

    if (doFragmento.access_token) { abrirFormulario(doFragmento.access_token); return; }
    if (daConsulta.token_hash && (daConsulta.type || 'recovery') === 'recovery') {
      verificarTokenHash(daConsulta.token_hash);
      return;
    }
    if (doFragmento.error || doFragmento.error_code || daConsulta.error || daConsulta.error_code) {
      mostrar('rs-vencido');
      return;
    }
    // ?code= (fluxo PKCE) só troca no aparelho que pediu; o app usa o implícito.
    if (daConsulta.code) { mostrar('rs-vencido'); return; }
    mostrar('rs-sem-link');
  }

  iniciar();
})();
