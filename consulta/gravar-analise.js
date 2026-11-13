/* Caixa privada (livowa.com/consulta) · gravador da análise, 12/11/2026. Carregado depois de kits.js e roteiro.js.
   Pedido do Lucca (12/11): "gravar o vídeo no mínimo tempo possível, com qualidade técnica e de copy muito boa; um vídeo
   curto de análise". Tela cheia no celular. O VÍDEO é um canvas 720×1280 a 30 fps com:
     - a foto dela (a da edge, já mascarada) ocupando o quadro, com pinça para zoom e o anel de "tocar e segurar";
     - a câmera frontal dele num círculo no canto de baixo;
     - a faixa com o dado do bloco atual (ex.: "Rosto: 43 a 48 anos · você tem 45") e o nome com o CRM no alto;
     - o áudio do microfone dele.
   O TELEPROMPTER (a frase de cada bloco) é só DOM por cima do canvas, na tela dele: nunca é desenhado no canvas.
   Nada sai do aparelho: o arquivo fica na memória (Blob) até Enviar (folha de compartilhar do iPhone → WhatsApp) ou
   Baixar, e é liberado ao Refazer e ao Fechar. Nome do arquivo sem o nome dela: analise-LV-XXXX.mp4.
   Diagnóstico: só técnico (formato, bytes, duração, quadros, paradas da câmera), como o /gravar; sem texto, sem imagem,
   sem código do lead; não roda em localhost.
   Manhas do Safari do iOS que vêm do /gravar (gravar/app.js, 02/11): sem timeslice no MediaRecorder; desenho por
   setInterval (nunca requestAnimationFrame, que para quando o Safari esconde a página); nada de getUserMedia, troca de
   srcObject ou mudança de tamanho do <video> da câmera durante a gravação; Wake Lock pedido no toque de gravar (com
   Bloqueio Automático curto o iPhone escurece a tela ~20 s depois do último toque); o <video> da câmera fica VISÍVEL
   (o círculo da tela é ele mesmo, por cima do canvas), e o canvas também (no /gravar o canvas escondido congelou o
   arquivo aos 18 s no iOS 18.7, diagnóstico de 03/11). mp4 quando o navegador grava mp4; webm só como reserva. */
window.GRAVADOR = (() => {
'use strict';
const VERSAO = '1211b';
const W = 720, H = 1280, FPS = 30, MAX_S = 90;
const CIRC = { cx:W - 24 - 120, cy:H - 24 - 120, r:120 };   // câmera dele
const TOPO = 150;                                           // nome e CRM no alto do vídeo
const R_ANEL = 84;
const MIMES = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
const FONTE = '-apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif';
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtMB = b => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const CURTO = { frente:'Frente', esquerda:'Esq.', direita:'Dir.' };
const FS_K = 'livowa_ga_fs';
let fsPrompt = 22; try { const v = +localStorage.getItem(FS_K); if (v >= 16 && v <= 36) fsPrompt = v; } catch (e) { /* sem armazenamento */ }

let G = null;      // o gravador aberto (null = fechado)
let D = null;      // elementos (criados no 1º abrir)

function pickMime(){
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  for (const t of MIMES){ try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { /* segue */ } }
  return '';
}
const extOf = m => /mp4/.test(m || '') ? 'mp4' : /webm/.test(m || '') ? 'webm' : (isIOS ? 'mp4' : 'webm');

// ---------- DOM ----------
function monta(){
  if (D) return D;
  const el = document.createElement('div');
  el.className = 'ga'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Gravar a análise');
  el.innerHTML = `
  <div class="ga-palco">
    <div class="ga-quadro">
      <canvas class="ga-tela" width="${W}" height="${H}" aria-label="Vídeo que vai ser gravado"></canvas>
      <video class="ga-cam" playsinline muted autoplay aria-hidden="true"></video>
      <div class="ga-prompt" aria-live="polite"><div class="ga-p-topo"><b class="ga-p-tit"></b><span class="ga-p-pos"></span><button type="button" class="ga-aa" aria-label="Tamanho do texto">Aa</button></div><p class="ga-p-txt"></p><p class="ga-p-dep"></p></div>
      <div class="ga-conta" hidden></div>
      <div class="ga-aviso" hidden></div>
      <video class="ga-ver" playsinline controls hidden></video>
      <div class="ga-msg" hidden><p></p><button type="button" class="ga-tentar">Tentar de novo</button></div>
    </div>
  </div>
  <div class="ga-barra">
    <div class="ga-l1">
      <div class="ga-fotos" role="group" aria-label="Foto"></div>
      <button type="button" class="ga-b ga-zoom" aria-label="Voltar a foto ao tamanho">1×</button>
      <button type="button" class="ga-b ga-cami" aria-pressed="true" aria-label="Mostrar o seu rosto no vídeo">Rosto</button>
      <button type="button" class="ga-b ga-fechar" aria-label="Fechar o gravador">✕</button>
    </div>
    <div class="ga-l2 ga-grav">
      <button type="button" class="ga-b ga-ant">Anterior</button>
      <button type="button" class="ga-rec-b" disabled><i aria-hidden="true"></i><span class="ga-rec-t">Gravar</span></button>
      <button type="button" class="ga-b ga-prox">Próximo</button>
    </div>
    <div class="ga-l2 ga-rev" hidden>
      <button type="button" class="ga-b ga-refazer">Refazer</button>
      <button type="button" class="ga-b ga-enviar">Enviar</button>
      <a class="ga-b ga-baixar" download>Baixar</a>
    </div>
    <div class="ga-l2 ga-fim" hidden>
      <button type="button" class="ga-b ga-marcar">Marcar “análise enviada”</button>
      <button type="button" class="ga-b ga-denovo">Enviar de novo</button>
    </div>
    <p class="ga-info" aria-live="polite"></p>
  </div>`;
  document.body.append(el);
  const q = s => el.querySelector(s);
  D = { el, quadro:q('.ga-quadro'), tela:q('.ga-tela'), cam:q('.ga-cam'), prompt:q('.ga-prompt'), pTit:q('.ga-p-tit'), pPos:q('.ga-p-pos'), pTxt:q('.ga-p-txt'), pDep:q('.ga-p-dep'),
    conta:q('.ga-conta'), aviso:q('.ga-aviso'), ver:q('.ga-ver'), msg:q('.ga-msg'), fotos:q('.ga-fotos'), zoom:q('.ga-zoom'), cami:q('.ga-cami'), aa:q('.ga-aa'),
    fechar:q('.ga-fechar'), ant:q('.ga-ant'), rec:q('.ga-rec-b'), recT:q('.ga-rec-t'), prox:q('.ga-prox'), grav:q('.ga-grav'), rev:q('.ga-rev'), fim:q('.ga-fim'),
    refazer:q('.ga-refazer'), enviar:q('.ga-enviar'), baixar:q('.ga-baixar'), marcar:q('.ga-marcar'), denovo:q('.ga-denovo'), info:q('.ga-info'), tentar:q('.ga-tentar') };
  D.ctx = D.tela.getContext('2d', { alpha:false });
  D.cam.muted = true; D.cam.playsInline = true;   // iOS: só toca inline e mudo sem gesto
  liga();
  return D;
}

// ---------- tamanho do quadro na tela (9:16, contain); congelado durante a gravação ----------
function encaixa(){
  if (!G || G.estado === 'rec' || G.estado === 'conta') return;
  const p = D.el.querySelector('.ga-palco').getBoundingClientRect();
  if (p.width < 20 || p.height < 20) return;
  let w = p.width, h = w * H / W;
  if (h > p.height){ h = p.height; w = h * W / H; }
  Object.assign(D.quadro.style, { width:w + 'px', height:h + 'px', left:((p.width - w) / 2) + 'px', top:((p.height - h) / 2) + 'px' });
}

// ---------- fotos: baixadas para a memória (blob), para o canvas não ficar "sujo" e o link de 10 min não vencer no meio ----------
async function carregaFoto(f){
  const fim = (img, url) => {
    f.img = img; f.obj = url || null;
    const iw = img.naturalWidth, ih = img.naturalHeight, alto = CIRC.cy - CIRC.r - 16 - TOPO;   // da faixa do nome até o alto da câmera
    let a = W / iw; if (ih * a < alto) a = Math.min(alto / ih, 1.2 * W / iw);
    f.bw = iw * a; f.bh = ih * a;
    f.base = { s:1, ox:(W - f.bw) / 2, oy:TOPO + Math.max(0, (alto - f.bh) / 2) }; f.z = { ...f.base };
  };
  try {
    const r = await fetch(f.url, { mode:'cors', credentials:'omit', cache:'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    const url = URL.createObjectURL(await r.blob());
    const img = new Image(); img.decoding = 'async'; img.src = url;
    await (img.decode ? img.decode() : new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; }));
    fim(img, url); return true;
  } catch (e) {
    try {   // reserva: a própria URL com CORS
      const img = new Image(); img.crossOrigin = 'anonymous'; img.src = f.url;
      await (img.decode ? img.decode() : new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; }));
      fim(img); return true;
    } catch (e2) { f.erro = true; return false; }
  }
}

// ---------- desenho do quadro (só o que vai para o vídeo; o teleprompter não passa por aqui) ----------
function caixa(ctx, x, y, w, h, r){
  ctx.beginPath();
  if (ctx.roundRect){ ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function quebra(ctx, txt, larg, max){
  const ps = String(txt).split(/\s+/).filter(Boolean), out = []; let l = '';
  for (const p of ps){ const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > larg && l){ out.push(l); l = p; } else l = t; }
  if (l) out.push(l);
  if (out.length > max){ const r = out.slice(0, max); r[max - 1] = r[max - 1].replace(/\s*\S*$/, '') + '…'; return r; }
  return out;
}
function anelAlfa(){
  const a = G.anel; if (!a) return 0;
  if (a.ativo) return 1;
  const t = (performance.now() - a.solto) / 700; return t >= 1 ? 0 : 1 - t;
}
function pinta(){
  if (!G || G.estado === 'rev' || G.estado === 'fim') return;   // na revisão o quadro não aparece: poupa bateria
  const ctx = D.ctx, f = G.fotos[G.foto], agora = performance.now();
  G.quadros++;
  ctx.fillStyle = '#0b100e'; ctx.fillRect(0, 0, W, H);
  if (f && f.img){ const z = f.z; try { ctx.drawImage(f.img, z.ox, z.oy, f.bw * z.s, f.bh * z.s); } catch (e) { /* foto ainda não pronta */ } }
  // realce: escurece em volta e marca o anel onde o dedo está
  const al = anelAlfa();
  if (al > 0){
    const { x, y } = G.anel;
    ctx.save(); ctx.globalAlpha = al;
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, R_ANEL, 0, Math.PI * 2, true); ctx.fill('evenodd');
    ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(255,214,10,.28)'; ctx.beginPath(); ctx.arc(x, y, R_ANEL + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(x, y, R_ANEL, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // alto: nome e CRM (identificação do médico)
  ctx.fillStyle = 'rgba(11,16,14,.86)'; ctx.fillRect(0, 0, W, TOPO - 34);
  const g = ctx.createLinearGradient(0, TOPO - 34, 0, TOPO); g.addColorStop(0, 'rgba(11,16,14,.86)'); g.addColorStop(1, 'rgba(11,16,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, TOPO - 34, W, 34);
  ctx.fillStyle = '#fff'; ctx.font = `700 34px ${FONTE}`; ctx.textBaseline = 'alphabetic'; ctx.fillText('Dr. Lucca Marques', 32, 62);
  ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = `500 24px ${FONTE}`; ctx.fillText('CRM-GO 33.990', 32, 96);
  // faixa do bloco: o dado que ela está ouvindo
  const fx = (G.o.blocos[G.bloco] || {}).faixa;
  if (fx){
    const x0 = 24, larg = (G.mostraCam && G.cam ? CIRC.cx - CIRC.r - 18 : W - 24) - x0;
    ctx.font = `650 31px ${FONTE}`;
    const ls = quebra(ctx, fx, larg - 36, 3), h = ls.length * 40 + 26, y0 = H - 24 - h;
    ctx.fillStyle = 'rgba(13,106,77,.94)'; caixa(ctx, x0, y0, larg, h, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
    ls.forEach((l, i) => ctx.fillText(l, x0 + 18, y0 + 15 + i * 40));
    ctx.textBaseline = 'alphabetic';
  }
  // câmera dele, num círculo (sem espelho no arquivo; a tela mostra espelhado)
  if (G.cam && G.mostraCam){
    const v = D.cam, vw = v.videoWidth, vh = v.videoHeight, { cx, cy, r } = CIRC;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    ctx.fillStyle = '#1b2420'; ctx.fill(); ctx.clip();
    if (vw && vh && v.readyState >= 2){ const s = Math.min(vw, vh); try { ctx.drawImage(v, (vw - s) / 2, (vh - s) / 2, s, s, cx - r, cy - r, 2 * r, 2 * r); } catch (e) { /* quadro não pronto */ } }
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  // vigia da câmera durante a gravação: quadro novo da câmera em até 2 s
  if (G.estado === 'rec' && G.cam && G.mostraCam && G.camUlt && agora - G.camUlt > 2000 && !G.camParada){
    G.camParada = true; G.camParadas++; if (G.camParadaS == null) G.camParadaS = Math.round((agora - G.t0) / 1000);
    aviso('A sua câmera parou. A foto e a sua voz seguem gravando.');
  }
}
function vigiaCam(){
  const v = D.cam, g0 = G;
  if (v.requestVideoFrameCallback){
    const cb = () => { if (G !== g0) return; G.camUlt = performance.now(); G.camQuadros++; if (G.camParada){ G.camParada = false; aviso(''); } v.requestVideoFrameCallback(cb); };
    v.requestVideoFrameCallback(cb);
  } else {
    let tAnt = -1; G.camIv = setInterval(() => { if (G !== g0) return; if (v.currentTime !== tAnt){ tAnt = v.currentTime; G.camUlt = performance.now(); G.camQuadros++; if (G.camParada){ G.camParada = false; aviso(''); } } }, 250);
  }
}

// ---------- teleprompter (só DOM) ----------
function prompter(){
  const bs = G.o.blocos, b = bs[G.bloco] || { titulo:'', fala:'' }, n = bs.length;
  D.pTit.textContent = b.titulo || '';
  D.pPos.textContent = n ? `${G.bloco + 1} de ${n}` : '';
  // 12/11: [APONTE: região] (roteiro do Claude) vira dica destacada no teleprompter; nunca vai para o canvas
  D.pTxt.textContent = '';
  String(b.fala || '').split(/(\[(?:APONTE|CIRCULAR):[^\]]*\])/i).forEach(pedaco => {
    const m = /^\[(?:APONTE|CIRCULAR):\s*([^\]]*)\]$/i.exec(pedaco);
    if (m){ const sp = document.createElement('span'); sp.className = 'ga-dica'; sp.textContent = 'aponte: ' + m[1].trim(); D.pTxt.append(sp); }
    else if (pedaco) D.pTxt.append(document.createTextNode(pedaco));
  });
  D.pDep.textContent = G.bloco < n - 1 ? 'Depois: ' + (bs[G.bloco + 1].titulo || '') : 'Último bloco';
  D.prompt.style.setProperty('--fs', fsPrompt + 'px');
  D.ant.disabled = G.bloco === 0; D.prox.disabled = G.bloco >= n - 1;
}
function aviso(t){ D.aviso.textContent = t; D.aviso.hidden = !t; }
function info(t){ D.info.textContent = t || ''; }

// ---------- estados ----------
function estado(e){
  G.estado = e;
  D.el.dataset.estado = e;
  const rev = e === 'rev' || e === 'fim';
  D.grav.hidden = rev; D.rev.hidden = e !== 'rev'; D.fim.hidden = e !== 'fim';
  D.tela.hidden = rev; D.cam.style.visibility = rev || !G.mostraCam || !G.cam ? 'hidden' : '';
  D.prompt.hidden = rev; D.ver.hidden = !rev;
  D.rec.classList.toggle('on', e === 'rec');
  D.recT.textContent = e === 'rec' ? '0:00 / ' + mmss(MAX_S * 1000) : e === 'conta' ? 'Cancelar' : 'Gravar';
  D.rec.setAttribute('aria-label', e === 'rec' ? 'Parar a gravação' : e === 'conta' ? 'Cancelar a contagem' : 'Começar a gravar');
  D.rec.disabled = e === 'prep' && !G.pronto;
  D.fotos.querySelectorAll('button').forEach(b => { b.disabled = rev; });
  D.zoom.disabled = rev; D.cami.disabled = rev || !G.cam;
}

// ---------- abrir / fechar ----------
/** o = { codigo, nome, fotos:[{rot, url, chave}], blocos:[{titulo, fala, faixa}], aoMarcar?:fn, foto?:chave }. */
async function abrir(o){
  monta();
  if (G) fechar();
  G = { o, fotos:(o.fotos || []).filter(f => f.url).map(f => ({ ...f })), foto:0, bloco:0, estado:'prep', pronto:false, cam:false, mic:false, mostraCam:true,
    stream:null, rec:null, chunks:[], t0:0, take:null, anel:null, ptrs:new Map(), gesto:null, quadros:0, camQuadros:0, camUlt:0, camParada:false, camParadas:0, camParadaS:null, iv:0, relogio:0, wake:null };
  const k = G.fotos.findIndex(f => f.chave === (o.foto || 'frente')); if (k > 0) G.foto = k;
  D.el.hidden = false; document.body.classList.add('ga-aberto');
  D.fotos.innerHTML = G.fotos.length > 1 ? G.fotos.map((f, i) => `<button type="button" class="ga-b" data-f="${i}" aria-pressed="${i === G.foto}" aria-label="Foto: ${esc(f.rot)}">${esc(CURTO[f.chave] || f.rot)}</button>`).join('') : '';
  D.msg.hidden = true; aviso(''); info('Abrindo a câmera e a foto…');
  D.cami.setAttribute('aria-pressed', 'true');
  estado('prep'); prompter();
  requestAnimationFrame(encaixa);
  G.iv = setInterval(pinta, 1000 / FPS);
  const g0 = G;
  await Promise.all([Promise.all(G.fotos.map(carregaFoto)), abreCamera()]);
  if (G !== g0) return;
  const algumaFoto = G.fotos.some(f => f.img);
  if (!algumaFoto) return falha('A foto não carregou. O link das fotos vale 10 minutos: feche, toque em Ver de novo e abra o gravador.');
  if (!G.mic) return;   // falha() já mostrou o motivo
  if (!window.MediaRecorder) return falha('Este navegador não grava vídeo. Use o Safari do iPhone atualizado.');
  G.pronto = true; estado('prep');
  info(G.cam ? 'Toque em Gravar. Segure o dedo na foto para marcar; pinça para aproximar.' : 'Sem câmera: o vídeo sai com a foto e a sua voz. Toque em Gravar.');
  D.rec.focus();
}
async function abreCamera(){
  const g0 = G;
  if (!navigator.mediaDevices?.getUserMedia){ falha('Este navegador não abre a câmera aqui. Use o Safari, numa página https.'); return; }
  const audio = { echoCancellation:true, noiseSuppression:true, autoGainControl:true };
  const tentativas = [{ video:{ facingMode:'user', width:{ ideal:640 }, height:{ ideal:480 }, frameRate:{ ideal:30 } }, audio }, { video:{ facingMode:'user' }, audio }, { video:true, audio:true }];
  let s = null, erro = null;
  for (const t of tentativas){
    try { s = await navigator.mediaDevices.getUserMedia(t); break; } catch (e) { erro = e; if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break; }
  }
  if (!s && !(erro && (erro.name === 'NotAllowedError' || erro.name === 'SecurityError'))){
    try { s = await navigator.mediaDevices.getUserMedia({ audio }); } catch (e) { erro = e; }   // sem câmera: só a voz
  }
  if (G !== g0){ s?.getTracks().forEach(t => t.stop()); return; }
  if (!s){ falha(erroCamera(erro)); return; }
  G.stream = s; G.mic = s.getAudioTracks().length > 0; G.cam = s.getVideoTracks().length > 0;
  if (!G.mic){ falha('O microfone não abriu. Libere o microfone para o site e toque em Tentar de novo.'); return; }
  if (G.cam){
    D.cam.srcObject = s;
    try { const p = D.cam.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* autoplay cuida */ }
    vigiaCam();
    const vt = s.getVideoTracks()[0];
    vt.addEventListener('mute', () => { if (G && G.estado === 'rec'){ G.camMudas = (G.camMudas || 0) + 1; } });
  }
  D.cam.style.visibility = G.cam ? '' : 'hidden';
}
function erroCamera(e){
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'SecurityError') return isIOS
    ? 'O Safari não liberou a câmera e o microfone. Toque em "aA" na barra de endereço › Ajustes do Site › Câmera e Microfone › Permitir. Depois toque em Tentar de novo.'
    : 'A câmera ou o microfone foram bloqueados. Libere nas permissões do site (ícone ao lado do endereço) e toque em Tentar de novo.';
  if (n === 'NotReadableError') return 'A câmera está em uso por outro app. Feche o outro app e toque em Tentar de novo.';
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Não achei câmera nem microfone neste aparelho.';
  return 'Não consegui abrir a câmera (' + (n || 'erro') + ').';
}
function falha(t){ if (!G) return; D.msg.querySelector('p').textContent = t; D.msg.hidden = false; info(''); G.pronto = false; estado('prep'); }
function liberaTake(){
  if (!G || !G.take) return;
  D.ver.pause?.(); D.ver.removeAttribute('src'); try { D.ver.load(); } catch (e) { /* ok */ }
  URL.revokeObjectURL(G.take.url); G.take = null;
  D.baixar.removeAttribute('href');
}
function fechar(){
  if (!G) return;
  const g = G;
  try { if (g.rec && g.rec.state !== 'inactive'){ g.descartar = true; g.rec.stop(); } } catch (e) { /* ok */ }
  clearInterval(g.iv); clearInterval(g.relogio); clearInterval(g.camIv); clearTimeout(g.contaT);
  g.stream?.getTracks().forEach(t => t.stop());
  g.trilha?.stop();
  try { g.wake?.release(); } catch (e) { /* ok */ }
  liberaTake();
  g.fotos.forEach(f => { if (f.obj) URL.revokeObjectURL(f.obj); f.img = null; });
  D.cam.srcObject = null;
  D.el.hidden = true; document.body.classList.remove('ga-aberto');
  G = null;
  try { g.o.aoFechar?.(); } catch (e) { /* ok */ }
}

// ---------- gravação ----------
function conta(){
  if (!G || !G.pronto) return;
  estado('conta'); liberaTake(); G.bloco = 0; prompter();
  pedeTelaAcesa();
  let n = 3; D.conta.textContent = n; D.conta.hidden = false;
  const passo = () => {
    if (!G || G.estado !== 'conta') return;
    n--; if (n > 0){ D.conta.textContent = n; G.contaT = setTimeout(passo, 1000); return; }
    D.conta.hidden = true; comeca();
  };
  G.contaT = setTimeout(passo, 1000);
}
async function pedeTelaAcesa(){
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible' && (!G.wake || G.wake.released)) G.wake = await navigator.wakeLock.request('screen'); } catch (e) { /* sem Wake Lock */ }
}
function comeca(){
  let cs;
  try { cs = D.tela.captureStream(FPS); } catch (e) { return falha('Não deu para gravar o quadro (' + (e.name || e) + ').'); }
  G.trilha = cs.getVideoTracks()[0];
  const src = new MediaStream([G.trilha, ...G.stream.getAudioTracks()]);
  const mime = pickMime(), opts = { videoBitsPerSecond:2000000, audioBitsPerSecond:96000 };
  if (mime) opts.mimeType = mime;
  try { G.rec = new MediaRecorder(src, opts); } catch (e) {
    try { G.rec = new MediaRecorder(src); } catch (e2) { return falha('Não deu para gravar: ' + (e2.message || e2.name)); }
  }
  G.chunks = []; G.descartar = false; G.camParadas = 0; G.camParadaS = null; G.camParada = false; G.quadros = 0; G.camQuadros = 0; G.camMudas = 0;
  const rec = G.rec, g = G;
  rec.ondataavailable = e => { if (e.data && e.data.size) g.chunks.push(e.data); };
  rec.onerror = e => { g.erroRec = (e.error && e.error.name) || 'erro'; };
  rec.onstop = () => terminou(g);
  try { rec.start(); } catch (e) { return falha('Não deu para gravar: ' + (e.message || e.name)); }   // sem timeslice (iOS)
  G.t0 = performance.now(); G.camUlt = G.camUlt || G.t0;
  estado('rec');
  info('Gravando. Próximo troca o texto e a faixa.');
  G.relogio = setInterval(() => {
    if (!G || G.estado !== 'rec') return;
    const ms = performance.now() - G.t0;
    D.recT.textContent = mmss(ms) + ' / ' + mmss(MAX_S * 1000);
    D.rec.classList.toggle('fim-perto', ms > (MAX_S - 10) * 1000);
    if (ms >= MAX_S * 1000) para();
  }, 250);
}
function para(){
  if (!G || !G.rec || G.estado !== 'rec') return;
  G.ms = performance.now() - G.t0;
  clearInterval(G.relogio);
  info('Fechando o arquivo…');
  try { G.rec.stop(); } catch (e) { terminou(G); }
}
function terminou(g){
  try { g.trilha?.stop(); } catch (e) { /* ok */ }
  try { g.wake?.release(); } catch (e) { /* ok */ }
  if (g !== G || g.descartar) return;
  const type = ((g.rec && g.rec.mimeType) || pickMime() || (isIOS ? 'video/mp4' : 'video/webm')).split(';')[0];
  const blob = new Blob(g.chunks, { type }); g.chunks = [];
  aviso('');
  if (!blob.size){ estado('prep'); info('A gravação saiu vazia. Tente de novo.'); return; }
  const nome = `analise-${g.o.codigo || 'LV'}.${extOf(type)}`;
  let file = null; try { file = new File([blob], nome, { type }); } catch (e) { /* Safari antigo */ }
  const url = URL.createObjectURL(blob);
  g.take = { blob, url, type, nome, file, ms:g.ms || 0, dur:null, bytes:blob.size };
  D.ver.src = url; D.baixar.href = url; D.baixar.download = nome;
  estado('rev');
  info(`${mmss(g.take.ms)} · ${fmtMB(blob.size)} · ${extOf(type)}. Assista antes de mandar.`);
  duracao(g.take).then(d => { if (G && G.take && G.take.url === url){ G.take.dur = d; confere(G.take); } });
  diag('fim', g);
}
// duração real do arquivo (o webm do Chrome vem com Infinity até buscar o fim)
function duracao(t){
  return new Promise(res => {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'metadata';
    let feito = false; const fim = d => { if (feito) return; feito = true; v.removeAttribute('src'); try { v.load(); } catch (e) { /* ok */ } res(d); };
    v.onloadedmetadata = () => { if (isFinite(v.duration) && v.duration > 0) return fim(v.duration); v.ondurationchange = () => { if (isFinite(v.duration) && v.duration > 0) fim(v.duration); }; try { v.currentTime = 1e7; } catch (e) { fim(null); } };
    v.onerror = () => fim(null);
    setTimeout(() => fim(null), 6000);
    v.src = t.url;
  });
}
// conferência do arquivo (como o /gravar): amostras do círculo da câmera; se ficar igual até o fim, a imagem parou
async function confere(t){
  if (!G || !G.cam || !G.mostraCam || !t.dur || t.dur < 3) return;
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
  const espera = (ev, ms) => new Promise(r => { const f = () => { v.removeEventListener(ev, f); r(true); }; v.addEventListener(ev, f); setTimeout(() => { v.removeEventListener(ev, f); r(false); }, ms); });
  v.src = t.url; try { v.load(); } catch (e) { /* ok */ }
  if (!(await espera('loadeddata', 5000))){ v.removeAttribute('src'); return; }
  const c = document.createElement('canvas'); c.width = 32; c.height = 32; const x = c.getContext('2d', { willReadFrequently:true });
  const n = Math.min(16, Math.floor(t.dur)), ts = [], est = []; let ant = null;
  for (let i = 0; i < n; i++) ts.push(Math.min(t.dur - 0.2, 0.5 + i * (t.dur - 0.7) / Math.max(1, n - 1)));
  for (const tt of ts){
    if (!G || G.take !== t) break;
    try { v.currentTime = tt; } catch (e) { break; }
    if (!(await espera('seeked', 3000))) break;
    try { x.drawImage(v, (CIRC.cx - CIRC.r) * v.videoWidth / W, (CIRC.cy - CIRC.r) * v.videoHeight / H, 2 * CIRC.r * v.videoWidth / W, 2 * CIRC.r * v.videoHeight / H, 0, 0, 32, 32); } catch (e) { break; }
    const d = x.getImageData(0, 0, 32, 32).data;
    if (ant){ let s = 0; for (let i = 0; i < d.length; i += 4) s += Math.abs(d[i] - ant[i]) + Math.abs(d[i + 1] - ant[i + 1]) + Math.abs(d[i + 2] - ant[i + 2]); est.push(s / (d.length / 4 * 3) < 0.3); }
    ant = d;
  }
  v.removeAttribute('src'); try { v.load(); } catch (e) { /* ok */ }
  if (!G || G.take !== t || est.length < 3) return;
  let k = est.length; while (k > 0 && est[k - 1]) k--;
  t.parada = est.length - k >= 3 ? Math.round(ts[k]) : null;
  if (t.parada != null) info(`A imagem da câmera parece parada a partir de ${t.parada} s. Assista antes de mandar.`);
  diag('conferência ' + (t.parada != null ? 'parada ' + t.parada + ' s' : 'ok'), G);
}

// ---------- enviar ----------
async function enviar(){
  const t = G && G.take; if (!t) return;
  const files = t.file ? [t.file] : [];
  if (files.length && navigator.canShare && navigator.canShare({ files })){
    try { await navigator.share({ files }); ok(); return; }
    catch (e) { if (e && e.name === 'AbortError'){ info('Não mandou. Toque em Enviar de novo quando quiser.'); return; } }
  }
  D.baixar.click();   // sem compartilhar arquivo: baixa
  ok('Baixado: ' + t.nome + '. Mande pelo WhatsApp e depois apague o arquivo.');
  function ok(msg){ if (!G) return; estado('fim'); info(msg || 'Mandou. Marque a etapa; ao fechar, o vídeo sai da memória.'); D.marcar.focus(); }
}

// ---------- toque: segurar = anel; pinça = zoom; nada disso no teleprompter ----------
function ptCanvas(ev){
  const r = D.tela.getBoundingClientRect();
  return { x:(ev.clientX - r.left) * W / r.width, y:(ev.clientY - r.top) * H / r.height };
}
function limita(f){
  const z = f.z; if (z.s <= 1.01){ Object.assign(z, f.base); return; }
  const w = f.bw * z.s, h = f.bh * z.s;   // não deixa a foto fugir do quadro inteira
  z.ox = Math.min(W * 0.5, Math.max(W * 0.5 - w, z.ox)); z.oy = Math.min(H * 0.5, Math.max(H * 0.5 - h, z.oy));
}
function baixou(ev){
  if (!G || G.estado === 'rev' || G.estado === 'fim') return;
  ev.preventDefault();
  try { D.tela.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ }
  const p = ptCanvas(ev); G.ptrs.set(ev.pointerId, p);
  const f = G.fotos[G.foto];
  if (G.ptrs.size === 2 && f && f.img){
    clearTimeout(G.seguraT); if (G.anel && G.anel.ativo){ G.anel.ativo = false; G.anel.solto = performance.now(); }
    const [a, b] = [...G.ptrs.values()];
    G.gesto = { d0:Math.hypot(a.x - b.x, a.y - b.y) || 1, m0:{ x:(a.x + b.x) / 2, y:(a.y + b.y) / 2 }, z0:{ ...f.z } };
    return;
  }
  if (G.ptrs.size === 1){
    G.gesto = null;
    clearTimeout(G.seguraT);
    G.seguraT = setTimeout(() => { if (G && G.ptrs.size === 1 && !G.gesto){ const q = [...G.ptrs.values()][0]; G.anel = { x:q.x, y:q.y, ativo:true, solto:0 }; G.anelUsos = (G.anelUsos || 0) + 1; } }, 160);
  }
}
function moveu(ev){
  if (!G || !G.ptrs.has(ev.pointerId)) return;
  ev.preventDefault();
  const p = ptCanvas(ev); G.ptrs.set(ev.pointerId, p);
  const f = G.fotos[G.foto];
  if (G.gesto && G.ptrs.size >= 2 && f){
    const [a, b] = [...G.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x:(a.x + b.x) / 2, y:(a.y + b.y) / 2 }, g = G.gesto;
    const s = Math.min(5, Math.max(1, g.z0.s * d / g.d0));
    const ux = (g.m0.x - g.z0.ox) / g.z0.s, uy = (g.m0.y - g.z0.oy) / g.z0.s;   // ponto da foto que estava sob o meio dos dedos
    f.z = { s, ox:m.x - ux * s, oy:m.y - uy * s }; limita(f);
    return;
  }
  if (G.anel && G.anel.ativo){ G.anel.x = p.x; G.anel.y = p.y; }
}
function soltou(ev){
  if (!G || !G.ptrs.has(ev.pointerId)) return;
  G.ptrs.delete(ev.pointerId);
  clearTimeout(G.seguraT);
  if (G.ptrs.size < 2) G.gesto = null;
  if (G.ptrs.size === 1 && G.fotos[G.foto]){ /* sobrou um dedo depois da pinça: não vira anel */ }
  if (!G.ptrs.size && G.anel && G.anel.ativo){ G.anel.ativo = false; G.anel.solto = performance.now(); }
}

function liga(){
  const t = D.tela;
  t.addEventListener('pointerdown', baixou); t.addEventListener('pointermove', moveu);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => t.addEventListener(n, soltou));
  t.addEventListener('contextmenu', e => e.preventDefault());
  D.el.addEventListener('gesturestart', e => e.preventDefault());   // pinça do iOS não dá zoom na página
  D.el.addEventListener('touchmove', e => { if (G && e.target === D.tela) e.preventDefault(); }, { passive:false });
  D.rec.onclick = () => { if (!G) return; if (G.estado === 'prep') conta(); else if (G.estado === 'conta'){ clearTimeout(G.contaT); D.conta.hidden = true; estado('prep'); } else if (G.estado === 'rec') para(); };
  D.prox.onclick = () => { if (G && G.bloco < G.o.blocos.length - 1){ G.bloco++; prompter(); } };
  D.ant.onclick = () => { if (G && G.bloco > 0){ G.bloco--; prompter(); } };
  D.fotos.onclick = ev => { const b = ev.target.closest('button[data-f]'); if (!b || !G) return; G.foto = +b.dataset.f; G.anel = null; D.fotos.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
  D.zoom.onclick = () => { const f = G && G.fotos[G.foto]; if (f && f.base) f.z = { ...f.base }; };
  D.cami.onclick = () => { if (!G || !G.cam) return; G.mostraCam = !G.mostraCam; D.cami.setAttribute('aria-pressed', String(G.mostraCam)); D.cam.style.visibility = G.mostraCam ? '' : 'hidden'; };
  // Aa: 18 → 22 → 26 → 30 → 18 (fica neste aparelho)
  D.aa.onclick = () => { fsPrompt = fsPrompt >= 30 ? 18 : fsPrompt < 18 ? 18 : fsPrompt + 4 - (fsPrompt - 18) % 4; try { localStorage.setItem(FS_K, String(fsPrompt)); } catch (e) { /* ok */ } if (G) prompter(); };
  D.fechar.onclick = () => {
    if (!G) return;
    if ((G.estado === 'rec' || G.estado === 'rev') && !D.fechar.classList.contains('conf')){
      D.fechar.classList.add('conf'); const antes = D.info.textContent;
      info(G.estado === 'rec' ? 'Toque em ✕ de novo para descartar a gravação.' : 'Toque em ✕ de novo para apagar o vídeo e fechar.');
      setTimeout(() => { D.fechar.classList.remove('conf'); if (G && /Toque em ✕/.test(D.info.textContent)) info(antes); }, 3500); return;
    }
    D.fechar.classList.remove('conf'); fechar();
  };
  D.refazer.onclick = () => { if (!G) return; liberaTake(); G.bloco = 0; prompter(); estado('prep'); info('Toque em Gravar quando quiser.'); requestAnimationFrame(encaixa); };
  D.enviar.onclick = enviar; D.denovo.onclick = enviar;
  D.marcar.onclick = () => { const fn = G && G.o.aoMarcar; fechar(); try { fn?.(); } catch (e) { /* ok */ } };
  D.tentar.onclick = () => { if (!G) return; const o = G.o; fechar(); abrir(o); };
  addEventListener('resize', () => { if (G) encaixa(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (G) encaixa(); }).observe(D.el.querySelector('.ga-palco'));   // a barra muda de altura: o quadro acompanha (nunca durante a gravação)
  document.addEventListener('keydown', ev => {
    if (!G) return;
    if (ev.key === 'ArrowRight'){ ev.preventDefault(); D.prox.click(); }
    else if (ev.key === 'ArrowLeft'){ ev.preventDefault(); D.ant.click(); }
    else if (ev.key === 'Escape' && G.estado !== 'rec'){ ev.preventDefault(); D.fechar.click(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G && G.estado === 'rec') para(); });   // o iOS suspende a página escondida: fecha o que gravou
}

// ---------- diagnóstico técnico (como o /gravar): sem vídeo, texto, imagem nem código do lead ----------
const SB_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SB_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública dos funis
const uuid = () => { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ok */ } return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); };
const SID = uuid();
function diag(motivo, g){
  try {
    const h = location.hostname; if (h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return;
    const t = g.take || {}, seg = (g.ms || 0) / 1000, vs = g.stream?.getVideoTracks()[0]?.getSettings?.() || {};
    const props = { versao:'caixa-' + VERSAO, motivo, mime:(g.rec && g.rec.mimeType) || pickMime() || null, bytes:t.bytes ?? null, duracao_s:Math.round(seg * 10) / 10, arquivo_s:t.dur ? Math.round(t.dur * 10) / 10 : null,
      fps_quadro:seg ? Math.round(g.quadros / seg) : null, fps_camera:seg ? Math.round(g.camQuadros / seg) : null, camera:g.cam ? (g.mostraCam ? 'no vídeo' : 'escondida') : 'sem', camera_track:vs.width ? vs.width + '×' + vs.height : null,
      camera_paradas:g.camParadas, camera_parada_s:g.camParadaS, camera_mudas:g.camMudas || 0, arquivo_parado_s:t.parada ?? null, erro:g.erroRec || null, user_agent:navigator.userAgent };
    fetch(SB_URL + '/rest/v1/rpc/log_funnel_event', { method:'POST', keepalive:true, headers:{ 'Content-Type':'application/json', apikey:SB_KEY, Authorization:'Bearer ' + SB_KEY },
      body:JSON.stringify({ p_event_id:uuid(), p_funnel_id:'gravar', p_variant:'A', p_session_id:SID, p_event_type:'answer', p_step_id:'analise_diag', p_step_index:null,
        p_value_text:String(motivo).slice(0, 80), p_props:props, p_client_ts:new Date().toISOString() }) }).catch(() => {});
  } catch (e) { /* diagnóstico nunca atrapalha */ }
}

return { abrir, fechar, versao:VERSAO, _estado:() => G, _mime:pickMime };
})();
