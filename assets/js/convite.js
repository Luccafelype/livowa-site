/* livowa.com/g/<CÓDIGO> — página do convite para quem ainda não tem o app (T57-B, 29/09).
   Não chama rede nenhuma: mostra quem chamou (?de=) e o código para digitar no app. */
(function () {
  'use strict';
  // Endereços das lojas. Vazio = o app ainda não está público (o mesmo de criadora.js).
  var LOJAS = { ios: '', android: '' };
  var CODIGO_VALIDO = /^[A-Z0-9]{8}$/;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var q = new URLSearchParams(location.search);
  var codigo = (q.get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  var de = (q.get('de') || '').replace(/[^\p{L}\p{M}' -]/gu, '').trim().slice(0, 30);

  var $quem = document.getElementById('cv-quem');
  var $box = document.getElementById('cv-codigo-box');
  var $cod = document.getElementById('cv-codigo');
  var $abrir = document.getElementById('cv-abrir');
  var $lojas = document.getElementById('cv-lojas');

  if (de) $quem.textContent = de + ' te chamou para um grupo';
  if (CODIGO_VALIDO.test(codigo)) {
    $cod.textContent = codigo;
    $box.hidden = false;
  } else {
    $abrir.hidden = true;
    $quem.textContent = 'Este convite não tem um código válido';
    return;
  }

  // Tenta abrir o app pelo esquema (TikTok/Instagram/WhatsApp às vezes ignoram o
  // link universal); se nada acontecer em 1,5 s, o app não está no celular.
  $abrir.setAttribute('href', 'livowa:///g/' + encodeURIComponent(codigo) + (de ? '?de=' + encodeURIComponent(de) : ''));
  $abrir.addEventListener('click', function (ev) {
    ev.preventDefault();
    var saiu = false;
    var marcar = function () { saiu = true; };
    document.addEventListener('visibilitychange', marcar, { once: true });
    window.addEventListener('pagehide', marcar, { once: true });
    location.href = $abrir.getAttribute('href');
    setTimeout(function () {
      if (saiu || document.hidden) return;
      var partes = [];
      if (LOJAS.ios) partes.push('<a href="' + esc(LOJAS.ios) + '" rel="noopener">App Store</a>');
      if (LOJAS.android) partes.push('<a href="' + esc(LOJAS.android) + '" rel="noopener">Google Play</a>');
      $lojas.innerHTML = 'Parece que o app ainda não está neste celular. ' +
        (partes.length ? partes.join(' · ') : 'O Livowa chega às lojas em breve. Guarde o código: com o app no celular, toque em "Tenho um código" na Comunidade.');
      $lojas.hidden = false;
    }, 1500);
  });
})();
