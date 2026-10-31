// Dica do Direct dentro do Instagram (31/10/2026, pedido do Lucca).
// No navegador de dentro do app, nenhum link abre o Direct no app (teste no iPhone dele: instagram:// não faz nada,
// ig.me abre a versão web e pede login). Então: a mensagem já foi copiada, e esta janela mostra numa animação curta
// o caminho (X → Mensagem → colar e enviar), com o áudio do Dr. Lucca por cima, se o arquivo existir.
// Uso: import { NO_INSTAGRAM, dicaDirect } from '/assets/js/dica-direct.js';
//      if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem, copiou, lv, voz }); }

export const NO_INSTAGRAM = /Instagram/i.test(navigator.userAgent);
const AUDIO = '/assets/audio/dica-direct.m4a';         // gravação do Dr. Lucca (copiar → X → Mensagem → colar); sem o arquivo, fica muda
const AUDIO_LV = '/assets/audio/dica-direct-voltar.m4a'; // quem veio pelo link marcado: só voltar à conversa

const CSS = `
.ddx{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px;font:16px/1.4 system-ui,-apple-system,sans-serif}
.ddx-box{background:#fff;color:#141c17;border-radius:22px;padding:20px 18px 18px;max-width:380px;width:100%;display:flex;flex-direction:column;gap:12px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.35)}
.ddx-box h3{margin:0;font:800 1.35rem/1.15 system-ui,-apple-system,sans-serif}
.ddx-msg{margin:0;font-weight:600;color:#0d6a4d;font-size:.95rem;-webkit-user-select:all;user-select:all}
.ddx-ok{border:0;border-radius:14px;background:#0d6a4d;color:#fff;font:700 1.05rem system-ui,-apple-system,sans-serif;padding:14px;cursor:pointer}
.ddx-passos{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin:0;padding:0;list-style:none;font-size:.78rem;font-weight:700;color:#8a978f}
.ddx-passos li{padding-top:6px;border-top:3px solid #dbe1dc}
.ddx-passos li:nth-child(1){animation:ddx-p1 9s infinite}
.ddx-passos li:nth-child(2){animation:ddx-p2 9s infinite}
.ddx-passos li:nth-child(3){animation:ddx-p3 9s infinite}
@keyframes ddx-p1{0%,29%{color:#141c17;border-color:#0d6a4d}30%,100%{color:#8a978f;border-color:#dbe1dc}}
@keyframes ddx-p2{0%,29%{color:#8a978f;border-color:#dbe1dc}30%,57%{color:#141c17;border-color:#0d6a4d}58%,100%{color:#8a978f;border-color:#dbe1dc}}
@keyframes ddx-p3{0%,57%{color:#8a978f;border-color:#dbe1dc}58%,100%{color:#141c17;border-color:#0d6a4d}}

.ddx-cel{position:relative;width:170px;height:300px;margin:0 auto;border-radius:26px;background:#000;border:5px solid #1c1c1e;overflow:hidden;box-sizing:content-box}
.ddx-tela{position:absolute;inset:0;opacity:0}
.ddx-t1{animation:ddx-s1 9s infinite;background:#f2f4f1}
.ddx-t2{animation:ddx-s2 9s infinite;background:#0c0f0e;color:#fff}
.ddx-t3{animation:ddx-s3 9s infinite;background:#0c0f0e;color:#fff}
@keyframes ddx-s1{0%,28%{opacity:1}31%,100%{opacity:0}}
@keyframes ddx-s2{0%,28%{opacity:0}31%,56%{opacity:1}59%,100%{opacity:0}}
@keyframes ddx-s3{0%,56%{opacity:0}59%,100%{opacity:1}}
/* tela 1: o navegador do Instagram com o X */
.ddx-barra{height:36px;background:#1c1c1e;display:flex;align-items:center;gap:8px;padding:0 8px}
.ddx-x{width:22px;height:22px;border-radius:50%;background:#555;color:#fff;display:grid;place-items:center;font:700 13px system-ui}
.ddx-url{flex:1;height:10px;border-radius:5px;background:#444}
.ddx-card{margin:40px 14px 0;background:#fff;border-radius:12px;padding:12px;font-size:11px;font-weight:700;color:#0d6a4d;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.ddx-card i{display:block;height:6px;border-radius:3px;background:#dbe1dc;margin-top:6px}
/* tela 2: perfil */
.ddx-av{width:56px;height:56px;border-radius:50%;margin:46px auto 8px;background:linear-gradient(135deg,#7b5c45,#c9a27e);border:2px solid #333}
.ddx-nome{font-size:12px;font-weight:700;text-align:center}
.ddx-bts{display:flex;gap:8px;padding:0 16px;margin-top:14px}
.ddx-bts span{flex:1;height:24px;border-radius:7px;background:#2a2d2c;font-size:10px;font-weight:700;display:grid;place-items:center}
.ddx-bts span.on{background:#3a3d3c;outline:1.5px solid #fff}
/* tela 3: conversa */
.ddx-cab{height:36px;display:flex;align-items:center;gap:6px;padding:0 10px;border-bottom:1px solid #222;font-size:10px;font-weight:700}
.ddx-cab b{width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#7b5c45,#c9a27e)}
.ddx-bolha{position:absolute;right:8px;top:150px;max-width:118px;background:#7b3fe4;border-radius:12px;padding:6px 8px;font-size:9px;text-align:left;opacity:0;animation:ddx-bo 9s infinite}
@keyframes ddx-bo{0%,87%{opacity:0;transform:translateY(8px)}89%,100%{opacity:1;transform:none}}
.ddx-campo{position:absolute;left:10px;right:34px;bottom:14px;height:24px;border-radius:12px;border:1px solid #333;font-size:9px;color:#888;display:flex;align-items:center;padding:0 8px;overflow:hidden;white-space:nowrap}
.ddx-campo span{position:absolute;left:8px;right:4px;color:#fff;background:#0c0f0e;opacity:0;animation:ddx-tx 9s infinite;overflow:hidden;text-overflow:ellipsis}
@keyframes ddx-tx{0%,76%{opacity:0}77%,87%{opacity:1}88%,100%{opacity:0}}
.ddx-env{position:absolute;right:8px;bottom:16px;width:20px;height:20px;border-radius:50%;background:#3797f0;display:grid;place-items:center;color:#fff;font:700 11px system-ui}
.ddx-colar{position:absolute;left:18px;bottom:44px;background:#2f2f31;color:#fff;font-size:10px;font-weight:700;border-radius:8px;padding:5px 10px;opacity:0;animation:ddx-co 9s infinite}
@keyframes ddx-co{0%,69%{opacity:0}70%,76%{opacity:1}77%,100%{opacity:0}}
/* o dedo */
.ddx-dedo{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(255,255,255,.55);border:2px solid rgba(255,255,255,.95);box-shadow:0 0 0 3px rgba(0,0,0,.25);animation:ddx-dd 9s infinite;z-index:2}
@keyframes ddx-dd{
  0%{left:100px;top:210px;transform:scale(1)}
  12%{left:16px;top:18px;transform:scale(1)} 15%{transform:scale(.7)} 18%{transform:scale(1)}
  28%{left:16px;top:18px;opacity:1} 30%{left:100px;top:230px;opacity:1}
  42%{left:118px;top:153px;transform:scale(1)} 45%{transform:scale(.7)} 48%{transform:scale(1)}
  56%{left:118px;top:153px} 59%{left:90px;top:230px}
  64%{left:60px;top:276px;transform:scale(.8)} 70%{left:60px;top:276px;transform:scale(1)}
  73%{left:38px;top:247px;transform:scale(1)} 75%{transform:scale(.7)} 77%{left:38px;top:247px;transform:scale(1)}
  84%{left:148px;top:276px;transform:scale(1)} 86%{transform:scale(.7)} 88%{left:148px;top:276px;transform:scale(1)}
  100%{left:148px;top:276px}}
@media (prefers-reduced-motion:reduce){.ddx *{animation-play-state:paused!important}.ddx-passos li{color:#141c17!important}}
`;

let estilo = null, audio = null;
function injetarEstilo(){ if (estilo) return; estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo); }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

function celular(lv){
  const passo3 = lv ? 'Volte à conversa' : 'Cole e envie';
  return `
  <div class="ddx-cel" aria-hidden="true">
    <div class="ddx-tela ddx-t1"><div class="ddx-barra"><span class="ddx-x">✕</span><span class="ddx-url"></span></div>
      <div class="ddx-card">${lv ? 'Teste enviado' : 'Mensagem copiada'}<i></i><i style="width:70%"></i></div></div>
    <div class="ddx-tela ddx-t2"><div class="ddx-av"></div><div class="ddx-nome">dr.luccamarques</div>
      <div class="ddx-bts"><span>Seguir</span><span class="on">Mensagem</span></div></div>
    <div class="ddx-tela ddx-t3"><div class="ddx-cab"><b></b>dr.luccamarques</div>
      <div class="ddx-bolha">Oi, Dr. Lucca! Fiz o teste. Meu código é LV-…</div>
      <div class="ddx-colar">Colar</div>
      <div class="ddx-campo">Mensagem…<span>Oi, Dr. Lucca! Fiz o teste…</span></div><div class="ddx-env">➤</div></div>
    <div class="ddx-dedo"></div>
  </div>
  <ol class="ddx-passos"><li>Toque no X</li><li>Toque em Mensagem</li><li>${passo3}</li></ol>`;
}

export function dicaDirect({ mensagem = '', copiou = true, lv = false, voz = true } = {}){
  injetarEstilo();
  document.querySelector('.ddx')?.remove();
  const el = document.createElement('div');
  el.className = 'ddx'; el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-live', 'assertive');
  const titulo = lv ? 'Já está tudo com o Dr. Lucca' : (copiou ? 'Sua mensagem já está copiada' : 'Copie a sua mensagem');
  const texto = lv ? 'Toque no X, lá em cima, para voltar à conversa no Instagram.'
                   : 'Toque no X, lá em cima. No perfil do Dr. Lucca, toque em Mensagem, cole e envie.';
  el.innerHTML = `<div class="ddx-box"><h3>${esc(titulo)}</h3>${celular(lv)}
    ${lv ? '' : `<p class="ddx-msg">“${esc(mensagem)}”</p>`}<p style="margin:0">${esc(texto)}</p>
    <button type="button" class="ddx-ok">Entendi</button></div>`;
  const fechar = () => { el.remove(); try { audio?.pause(); } catch {} };
  el.addEventListener('click', ev => { if (ev.target === el || ev.target.closest('.ddx-ok')) fechar(); });
  document.body.appendChild(el);
  // o áudio toca dentro do mesmo toque (o iOS exige um gesto); sem o arquivo, falha em silêncio
  if (voz){ try { audio = new Audio(lv ? AUDIO_LV : AUDIO); audio.play().catch(() => {}); } catch {} }
  return el;
}
