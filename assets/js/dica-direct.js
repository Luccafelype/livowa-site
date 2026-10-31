// Dica do Direct dentro do Instagram (31/10/2026, pedido do Lucca; v2 com as telas reais que ele mandou).
// No navegador de dentro do app, nenhum link abre o Direct no app (teste no iPhone dele: instagram:// não faz nada,
// ig.me abre a versão web e pede login). Então: a mensagem já foi copiada, e esta janela mostra numa animação o caminho
// (X → perfil → Mensagem → colar → enviar), com o áudio do Dr. Lucca por cima, se o arquivo existir.
// Uso: import { NO_INSTAGRAM, dicaDirect } from '/assets/js/dica-direct.js';
//      if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem, copiou, lv, voz }); }

export const NO_INSTAGRAM = /Instagram/i.test(navigator.userAgent);
const AUDIO = '/assets/audio/dica-direct.m4a';          // gravação do Dr. Lucca (copiar → X → Mensagem → colar); sem o arquivo, fica muda
const AUDIO_LV = '/assets/audio/dica-direct-voltar.m4a'; // quem veio pelo link marcado: só voltar à conversa
const FOTO = '/assets/img/dr-lucca-avatar.jpg';

// Linha do tempo (12 s): 0-25 % navegador (toque no X) · 25-50 % perfil (toque em Mensagem) · 50-100 % conversa
// (segurar o campo → Colar → texto → enviar → balão). Coordenadas do dedo em px dentro da tela de 190 × 380.
const CSS = `
.ddx{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);display:grid;place-items:center;padding:14px;font:16px/1.4 -apple-system,system-ui,sans-serif}
.ddx-box{background:#fff;color:#141c17;border-radius:22px;padding:18px 16px 16px;max-width:360px;width:100%;display:flex;flex-direction:column;gap:12px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.ddx-box h3{margin:0;font:800 1.3rem/1.15 -apple-system,system-ui,sans-serif}
.ddx-msg{margin:0;font-weight:600;color:#0d6a4d;font-size:.88rem;-webkit-user-select:all;user-select:all}
.ddx-ok{border:0;border-radius:14px;background:#0d6a4d;color:#fff;font:700 1.05rem -apple-system,system-ui,sans-serif;padding:14px;cursor:pointer}
.ddx-passos{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin:0;padding:0;list-style:none;font-size:.8rem;font-weight:700;color:#9aa69f}
.ddx-passos li{padding-top:7px;border-top:3px solid #dbe1dc;line-height:1.2}
.ddx-passos b{display:block;font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px}
.ddx-passos li:nth-child(1){animation:ddx-p1 12s infinite}
.ddx-passos li:nth-child(2){animation:ddx-p2 12s infinite}
.ddx-passos li:nth-child(3){animation:ddx-p3 12s infinite}
@keyframes ddx-p1{0%,24%{color:#141c17;border-color:#0d6a4d}25%,100%{color:#9aa69f;border-color:#dbe1dc}}
@keyframes ddx-p2{0%,24%{color:#9aa69f;border-color:#dbe1dc}25%,49%{color:#141c17;border-color:#0d6a4d}50%,100%{color:#9aa69f;border-color:#dbe1dc}}
@keyframes ddx-p3{0%,49%{color:#9aa69f;border-color:#dbe1dc}50%,100%{color:#141c17;border-color:#0d6a4d}}
.ddx-lvp li:nth-child(2){animation-name:ddx-p2lv}
@keyframes ddx-p2lv{0%,24%{color:#9aa69f;border-color:#dbe1dc}25%,100%{color:#141c17;border-color:#0d6a4d}}

.ddx-cel{position:relative;width:190px;height:380px;margin:0 auto;border-radius:30px;background:#000;border:6px solid #1c1c1e;overflow:hidden;box-sizing:content-box;text-align:left;font-family:-apple-system,system-ui,sans-serif}
@media (max-height:720px){.ddx-cel{transform:scale(.84);margin:-30px auto}}
.ddx-tela{position:absolute;inset:0;opacity:0}
.ddx-t1{animation:ddx-s1 12s infinite;background:#f2f4f1}
.ddx-t2{animation:ddx-s2 12s infinite;background:#000;color:#fff}
.ddx-t3{animation:ddx-s3 12s infinite;background:#0c0f13;color:#fff}
@keyframes ddx-s1{0%,23%{opacity:1}26%,100%{opacity:0}}
@keyframes ddx-s2{0%,23%{opacity:0}26%,47%{opacity:1}50%,100%{opacity:0}}
@keyframes ddx-s3{0%,47%{opacity:0}50%,100%{opacity:1}}
.ddx-foto{border-radius:50%;background:#7b5c45 center/cover no-repeat;display:block}

/* 1. o teste aberto no navegador do Instagram */
.ddx-nav{height:44px;background:#1c1c1e;display:flex;align-items:center;justify-content:space-between;padding:0 9px;color:#fff}
.ddx-nav i{width:28px;height:28px;border-radius:50%;background:#6b6b6e;display:grid;place-items:center;font:600 13px -apple-system,system-ui;font-style:normal}
.ddx-nav span{text-align:center;font-size:9px;font-weight:700;line-height:1.2}.ddx-nav small{display:block;font-weight:400;color:#aaa}
.ddx-pag{padding:14px 14px 0;display:flex;flex-direction:column;align-items:center;gap:8px}
.ddx-pag u{display:block;width:100%;height:3px;border-radius:2px;background:#0d6a4d;text-decoration:none}
.ddx-pag em{font-style:normal;font-size:8px;font-weight:700;color:#0d6a4d;background:#d9efe5;border-radius:99px;padding:3px 8px;margin-top:8px}
.ddx-pag strong{font-size:14px;line-height:1.15;text-align:center;color:#141c17}.ddx-pag strong span{color:#0d6a4d}
.ddx-pag p{margin:0;font-size:8px;color:#5f6d65;text-align:center}
.ddx-toast{position:absolute;left:14px;right:14px;bottom:18px;background:#141c17;color:#fff;border-radius:12px;padding:10px;font-size:9px;font-weight:700;display:flex;gap:6px;align-items:center}
.ddx-toast b{width:14px;height:14px;border-radius:50%;background:#52c99c;color:#08130e;display:grid;place-items:center;font-size:9px}

/* 2. o perfil */
.ddx-topo{height:30px;display:flex;align-items:center;gap:8px;padding:6px 10px 0;font-size:11px;font-weight:700}
.ddx-topo .r{margin-left:auto;font-weight:900;letter-spacing:1px}
.ddx-cab2{display:flex;gap:10px;padding:8px 10px 0;align-items:center}
.ddx-cab2 .ddx-foto{width:52px;height:52px;flex:none}
.ddx-cab2 div{font-size:8px}.ddx-cab2 div b{display:block;font-size:9px;margin-bottom:4px}
.ddx-nums{display:flex;gap:6px;font-size:7px}.ddx-nums span{line-height:1.15}.ddx-nums strong{display:block;font-size:9px}
.ddx-bio{padding:7px 10px 0;font-size:7.5px;line-height:1.35;color:#eee}.ddx-bio span{color:#a3a3a3}.ddx-bio a{color:#8ab4ff;text-decoration:none}
.ddx-bts{display:flex;gap:3px;padding:9px 8px 0}
.ddx-bts span{height:22px;border-radius:6px;background:#2a2a2c;font-size:8px;font-weight:700;display:grid;place-items:center;flex:1}
.ddx-bts span.az{background:#4a5cff}.ddx-bts span.p{flex:0 0 18px}
.ddx-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:10px}
.ddx-grade span{height:62px;background:#efe6d6;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:0 8px}
.ddx-grade span i{display:block;height:5px;border-radius:2px;background:#1c1c1c}.ddx-grade span i+i{background:#e8b62c;width:70%}

/* 3. a conversa */
.ddx-cab3{height:40px;display:flex;align-items:center;gap:6px;padding:4px 8px 0}
.ddx-cab3 .v{font-size:13px;font-weight:700;width:16px}
.ddx-cab3 .ddx-foto{width:22px;height:22px;flex:none}
.ddx-cab3 div{font-size:8.5px;font-weight:700;line-height:1.2;flex:1}.ddx-cab3 div small{display:block;font-weight:400;color:#aaa;font-size:7px}
.ddx-cab3 i{width:16px;height:16px;border-radius:50%;border:1px solid #444;flex:none}
.ddx-duo{display:flex;gap:4px;padding:4px 8px 0}.ddx-duo span{flex:1;height:18px;border-radius:5px;background:#2a2d30;font-size:7.5px;font-weight:700;display:grid;place-items:center}
.ddx-meio{display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:14px}
.ddx-meio .ddx-foto{width:50px;height:50px}.ddx-meio b{font-size:9.5px}.ddx-meio small{font-size:7px;color:#aaa}
.ddx-bolha{position:absolute;right:8px;top:226px;max-width:128px;background:linear-gradient(135deg,#6f3ff5,#8b3fe0);border-radius:14px 14px 4px 14px;padding:7px 9px;font-size:8px;line-height:1.3;opacity:0;animation:ddx-bo 12s infinite}
@keyframes ddx-bo{0%,81%{opacity:0;transform:translateY(10px) scale(.96)}84%,100%{opacity:1;transform:none}}
.ddx-campo{position:absolute;left:8px;right:8px;bottom:12px;height:28px;border-radius:14px;background:#1f2226;display:flex;align-items:center;gap:6px;padding:0 5px;font-size:8.5px;color:#9a9a9a}
.ddx-campo .cam{width:19px;height:19px;border-radius:50%;background:#4f5bd5;flex:none}
.ddx-campo .ph{flex:1;white-space:nowrap;animation:ddx-ph 12s infinite}
@keyframes ddx-ph{0%,71%{opacity:1}72%,81%{opacity:0}82%,100%{opacity:1}}
.ddx-campo .tx{position:absolute;left:30px;right:30px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;animation:ddx-tx 12s infinite}
@keyframes ddx-tx{0%,71%{opacity:0}72%,81%{opacity:1}82%,100%{opacity:0}}
.ddx-campo .ic{display:flex;gap:4px;animation:ddx-ph 12s infinite}.ddx-campo .ic i{width:10px;height:10px;border-radius:3px;border:1px solid #888}
.ddx-env{position:absolute;right:13px;bottom:16px;width:20px;height:20px;border-radius:50%;background:#4f5bd5;display:grid;place-items:center;color:#fff;font:700 10px -apple-system,system-ui;opacity:0;animation:ddx-tx 12s infinite}
.ddx-colar{position:absolute;left:22px;bottom:48px;background:#3a3a3c;color:#fff;font-size:9px;font-weight:700;border-radius:8px;padding:6px 12px;opacity:0;animation:ddx-co 12s infinite}
.ddx-colar:after{content:'';position:absolute;left:18px;bottom:-5px;border:5px solid transparent;border-top-color:#3a3a3c;border-bottom:0}
@keyframes ddx-co{0%,61%{opacity:0;transform:translateY(4px)}63%,71%{opacity:1;transform:none}72%,100%{opacity:0}}

/* o dedo e o círculo do toque */
.ddx-dedo{position:absolute;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;background:rgba(255,255,255,.6);border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35),0 4px 10px rgba(0,0,0,.35);z-index:5;opacity:0;animation:ddx-dd 12s infinite}
@keyframes ddx-dd{
  0%{left:120px;top:250px;opacity:0;transform:scale(1)} 4%{left:120px;top:250px;opacity:1}
  14%{left:23px;top:22px;transform:scale(1)} 16%{transform:scale(.72)} 18%{transform:scale(1)}
  23%{left:23px;top:22px;opacity:1} 25%{left:23px;top:22px;opacity:0}
  26%{left:120px;top:270px;opacity:0} 28%{left:120px;top:270px;opacity:1}
  38%{left:84px;top:184px;transform:scale(1)} 40%{transform:scale(.72)} 42%{transform:scale(1)}
  47%{left:84px;top:184px;opacity:1} 49%{left:84px;top:184px;opacity:0}
  51%{left:120px;top:250px;opacity:0} 53%{left:120px;top:250px;opacity:1}
  58%{left:80px;top:354px;transform:scale(1)} 60%{transform:scale(.8)} 65%{left:80px;top:354px;transform:scale(.8)}
  66%{transform:scale(1)} 69%{left:42px;top:320px;transform:scale(1)} 70%{transform:scale(.72)} 71%{left:42px;top:320px;transform:scale(1)}
  77%{left:171px;top:354px;transform:scale(1)} 79%{transform:scale(.72)} 81%{left:171px;top:354px;transform:scale(1)}
  88%{left:171px;top:354px;opacity:1} 92%{opacity:0} 100%{left:171px;top:354px;opacity:0}}
.ddx-onda{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50%;border:2px solid #52c99c;opacity:0;z-index:4}
.ddx-o1{left:23px;top:22px;animation:ddx-o1 12s infinite}
.ddx-o2{left:84px;top:184px;animation:ddx-o2 12s infinite}
.ddx-o3{left:42px;top:320px;animation:ddx-o3 12s infinite}
.ddx-o4{left:171px;top:354px;animation:ddx-o4 12s infinite}
@keyframes ddx-o1{0%,15%{opacity:0;transform:scale(.6)}16%{opacity:1}22%,100%{opacity:0;transform:scale(1.9)}}
@keyframes ddx-o2{0%,39%{opacity:0;transform:scale(.6)}40%{opacity:1}46%,100%{opacity:0;transform:scale(1.9)}}
@keyframes ddx-o3{0%,69%{opacity:0;transform:scale(.6)}70%{opacity:1}75%,100%{opacity:0;transform:scale(1.9)}}
@keyframes ddx-o4{0%,78%{opacity:0;transform:scale(.6)}79%{opacity:1}85%,100%{opacity:0;transform:scale(1.9)}}

/* quem veio pelo link marcado: só tocar no X e voltar à conversa (sem perfil e sem colar) */
.ddx-lv .ddx-t2,.ddx-lv .ddx-o2,.ddx-lv .ddx-o3,.ddx-lv .ddx-o4,.ddx-lv .ddx-colar,.ddx-lv .ddx-env,.ddx-lv .ddx-campo .tx{display:none}
.ddx-lv .ddx-t3{animation-name:ddx-s3lv}
.ddx-lv .ddx-campo .ph,.ddx-lv .ddx-campo .ic{animation:none}
.ddx-lv .ddx-bolha{left:8px;right:auto;background:#26292e;border-radius:14px 14px 14px 4px;animation-name:ddx-bolv}
.ddx-lv .ddx-dedo{animation-name:ddx-ddlv}
@keyframes ddx-s3lv{0%,23%{opacity:0}26%,100%{opacity:1}}
@keyframes ddx-bolv{0%,34%{opacity:0;transform:translateY(10px)}38%,100%{opacity:1;transform:none}}
@keyframes ddx-ddlv{0%{left:120px;top:250px;opacity:0;transform:scale(1)} 4%{left:120px;top:250px;opacity:1}
  14%{left:23px;top:22px;transform:scale(1)} 16%{transform:scale(.72)} 18%{transform:scale(1)} 23%{left:23px;top:22px;opacity:1} 25%,100%{left:23px;top:22px;opacity:0}}
@media (prefers-reduced-motion:reduce){.ddx *{animation-play-state:paused!important}}
.ddx-aviso{position:fixed;left:50%;top:50%;z-index:10000;transform:translate(-50%,-50%);background:#141c17;color:#fff;border-radius:16px;padding:14px 20px;font:700 1rem -apple-system,system-ui,sans-serif;display:flex;gap:10px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.35);animation:ddx-av 1.4s ease forwards}
.ddx-aviso b{width:22px;height:22px;border-radius:50%;background:#52c99c;color:#08130e;display:grid;place-items:center;font-size:13px}
@keyframes ddx-av{0%{opacity:0;transform:translate(-50%,-50%) scale(.9)}12%,75%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0}}
`;

let estilo = null, audio = null;
function injetarEstilo(){ if (estilo) return; estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo); }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
// copia de novo dentro do toque em Entendi (o iOS só deixa copiar num gesto) e mostra a confirmação rápida
function copiar(txt){
  let ok = false;
  try { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(t); t.select(); t.setSelectionRange(0, txt.length); ok = document.execCommand('copy'); t.remove(); } catch {}
  try { navigator.clipboard?.writeText(txt).catch(() => {}); } catch {}
  return ok;
}
function confirmar(texto){
  document.querySelector('.ddx-aviso')?.remove();
  const a = document.createElement('div'); a.className = 'ddx-aviso'; a.setAttribute('role', 'status');
  a.innerHTML = `<b>✓</b>${esc(texto)}`; document.body.appendChild(a); setTimeout(() => a.remove(), 1500);
}
const foto = () => `<span class="ddx-foto" style="background-image:url('${FOTO}')"></span>`;

function celular(mensagem, lv){
  const msg = esc(mensagem || 'Oi, Dr. Lucca! Fiz o teste. Meu código é LV-…');
  const bolha = lv ? 'Recebi o seu teste. Já te respondo por aqui.' : msg;
  return `
  <div class="ddx-cel${lv ? ' ddx-lv' : ''}" aria-hidden="true">
    <div class="ddx-tela ddx-t1">
      <div class="ddx-nav"><i>✕</i><span>livowa.com<small>Instagram</small></span><i>···</i></div>
      <div class="ddx-pag"><u></u><em>Último passo</em><strong>Seu teste está<br><span>pronto</span></strong><p>Só falta mandar uma mensagem para o Dr. Lucca.</p></div>
      <div class="ddx-toast"><b>✓</b>${lv ? 'O Dr. Lucca já recebeu o seu teste' : 'Mensagem copiada'}</div>
    </div>
    <div class="ddx-tela ddx-t2">
      <div class="ddx-topo"><span>‹</span>dr.luccamarques<span class="r">···</span></div>
      <div class="ddx-cab2">${foto()}<div><b>Lucca Felype Marques</b><div class="ddx-nums"><span><strong>15</strong>posts</span><span><strong>1.081</strong>seguidores</span><span><strong>5</strong>seguindo</span></div></div></div>
      <div class="ddx-bio"><span>Médico(a)</span><br>Médico. CRM-GO 33990<br>O melhor equity é ter mais tempo de vida<br>Descubra sua idade biológica em 2 minutos 👇<br><a>livowa.com/comece</a></div>
      <div class="ddx-bts"><span class="az">Seguir</span><span>Mensagem</span><span>WhatsApp</span><span class="p">+</span></div>
      <div class="ddx-grade"><span><i></i><i></i></span><span><i></i><i></i></span><span><i></i><i></i></span><span><i></i><i></i></span><span><i></i><i></i></span><span><i></i><i></i></span></div>
    </div>
    <div class="ddx-tela ddx-t3">
      <div class="ddx-cab3"><span class="v">‹</span>${foto()}<div>dr.luccamarques<small>Online</small></div><i></i><i></i></div>
      <div class="ddx-duo"><span>Consultar</span><span>Ver perfil</span></div>
      <div class="ddx-meio">${foto()}<b>dr.luccamarques</b><small>1 mil seguidores · 15 posts</small></div>
      <div class="ddx-bolha">${bolha}</div>
      <div class="ddx-colar">Colar</div>
      <div class="ddx-campo"><span class="cam"></span><span class="ph">Mensagem…</span><span class="tx">${msg}</span><span class="ic"><i></i><i></i><i></i></span></div>
      <div class="ddx-env">➤</div>
    </div>
    <span class="ddx-onda ddx-o1"></span><span class="ddx-onda ddx-o2"></span><span class="ddx-onda ddx-o3"></span><span class="ddx-onda ddx-o4"></span>
    <span class="ddx-dedo"></span>
  </div>`;
}

export function dicaDirect({ mensagem = '', copiou = true, lv = false, voz = true } = {}){
  injetarEstilo();
  document.querySelector('.ddx')?.remove();
  const el = document.createElement('div');
  el.className = 'ddx'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-live', 'assertive');
  const titulo = lv ? 'Já está tudo com o Dr. Lucca' : (copiou ? 'Sua mensagem já está copiada' : 'Copie a sua mensagem');
  const passos = lv
    ? '<ol class="ddx-passos ddx-lvp"><li><b>1</b>Toque no X</li><li><b>2</b>Volte à conversa</li></ol>'
    : '<ol class="ddx-passos"><li><b>1</b>Toque no X</li><li><b>2</b>Toque em Mensagem</li><li><b>3</b>Cole e envie</li></ol>';
  el.innerHTML = `<div class="ddx-box"><h3>${esc(titulo)}</h3>${celular(mensagem, lv)}${passos}
    ${lv ? '' : `<p class="ddx-msg">“${esc(mensagem)}”</p>`}
    <button type="button" class="ddx-ok">Entendi</button></div>`;
  const fechar = () => { el.remove(); try { audio?.pause(); } catch {} };
  el.addEventListener('click', ev => {
    if (ev.target.closest('.ddx-ok')){ fechar(); if (lv) return; const ok = copiar(mensagem); confirmar(ok || copiou ? 'Mensagem copiada' : 'Copie a mensagem e cole no Direct'); return; }
    if (ev.target === el) fechar();
  });
  document.body.appendChild(el);
  // o áudio toca dentro do mesmo toque (o iOS exige um gesto); sem o arquivo, falha em silêncio
  if (voz){ try { audio = new Audio(lv ? AUDIO_LV : AUDIO); audio.play().catch(() => {}); } catch {} }
  return el;
}
