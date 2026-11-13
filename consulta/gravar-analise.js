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
   arquivo aos 18 s no iOS 18.7, diagnóstico de 03/11). mp4 quando o navegador grava mp4; webm só como reserva.
   MONTAGEM AUTOMÁTICA (12/11, pedido do Lucca: "montagem rápida, simples e pouco custosa do vídeo"): cada bloco pode
   trazer uma cena (montada pela Caixa, em index.html cenaPI) que entra sozinha no canvas quando o bloco começa, enquanto
   ele fala. Visual do vídeo do Copas (youtu.be/EFmnPEtx04g): fundo escuro, traço fino, número grande amarelo/azul, lupa
   com linha fina até o rótulo, ícones de linha. idade = "Rosto 45–52" × "Você 45" e a régua (0,5 s); foto = até 3 lupas
   nos sinais (o incômodo dela primeiro), no ponto do rosto achado pelo FaceLandmarker (pele/rosto.js, o mesmo do /pele)
   na foto de frente, sem rosto = sem lupa e aviso só na tela; dentro = ícone + rótulo de cada hábito citado, sobre a foto
   escurecida; desejo = cartão "O que importa aos {idade}" (o-que-importa-idade.json); sem o arquivo, o aviso "conteúdo em
   pesquisa" é DOM (.ga-nota) e NUNCA entra no vídeo. A foto não sai do aparelho: só a biblioteca e o modelo do MediaPipe
   são baixados (CDN público). Tocar e segurar e a pinça seguem iguais (as lupas acompanham o zoom). */
window.GRAVADOR = (() => {
'use strict';
const VERSAO = '1311y';
const W = 720, H = 1280, FPS = 30;
// 13/11 (2º treino da Carla: bloco 1 de 6 s durou 43 s, o corte dos 90 s levou a pergunta): os números vêm dos Ajustes
// (o.params; padrões abaixo). alvo = o relógio fica vermelho; salto = pula para o último bloco (desejo e pergunta); teto = corta.
const PADRAO = { ritmo:2.5, salto:75, alvo:90, teto:105 };
function params(o){
  const p = { ...PADRAO }, q = (o && o.params) || {};
  for (const k of Object.keys(PADRAO)){ const v = Number(q[k]); if (Number.isFinite(v) && v > 0) p[k] = v; }
  if (p.alvo > p.teto) p.alvo = p.teto;
  if (p.salto >= p.teto) p.salto = Math.max(1, p.teto - 15);
  return p;
}
/** Quanto o bloco deve durar: o [a-b s] do roteiro; sem ele, as palavras ÷ o ritmo (marcadores [..] fora). */
function tempoBloco(b, ritmo){
  const m = /(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*s/.exec(String((b && b.tempo) || ''));
  if (m){ const d = parseFloat(m[2].replace(',', '.')) - parseFloat(m[1].replace(',', '.')); if (d > 0) return d * 1000; }
  const n = String((b && b.fala) || '').replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, n / (ritmo || PADRAO.ritmo)) * 1000;
}
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
// montagem (12/11)
const AMARELO = '#ffd60a', AZUL = '#5ab8ff', VERDE = '#5fd68a', LARANJA = '#ff9f43', APAGADO = 'rgba(255,255,255,.66)';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const GRAU = ['sem achado', 'leve', 'moderado', 'marcado'], COR_GRAU = [VERDE, AZUL, AMARELO, LARANJA];
const R_LUPA = [52, 84], LUPA_X = 1.7;   // raio da lupa no quadro (px) e o aumento dentro dela
const COR_TOM = { pesa:AMARELO, bem:VERDE, neutro:AZUL };
const sai = x => { const t = Math.max(0, Math.min(1, x)); return 1 - (1 - t) * (1 - t) * (1 - t); };   // ease-out
const ROSTO_URL = (() => { try { return new URL('../pele/rosto.js?v=2', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '/pele/rosto.js?v=2'; } })();
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
      <div class="ga-prompt" aria-live="polite"><div class="ga-p-topo"><b class="ga-p-tit"></b><span class="ga-p-pos"></span><button type="button" class="ga-aa" aria-label="Tamanho do texto">Aa</button></div><p class="ga-p-txt"></p><div class="ga-p-barra" hidden><i></i></div><div class="ga-p-opc" hidden></div><p class="ga-p-dep" aria-hidden="true"></p></div>
      <div class="ga-conta" hidden></div>
      <div class="ga-aviso" hidden></div>
      <div class="ga-nota" hidden></div>
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
  D = { el, quadro:q('.ga-quadro'), tela:q('.ga-tela'), cam:q('.ga-cam'), prompt:q('.ga-prompt'), pTit:q('.ga-p-tit'), pPos:q('.ga-p-pos'), pTxt:q('.ga-p-txt'), pOpc:q('.ga-p-opc'), pDep:q('.ga-p-dep'), pBarra:q('.ga-p-barra'), pBarraI:q('.ga-p-barra i'),
    conta:q('.ga-conta'), aviso:q('.ga-aviso'), nota:q('.ga-nota'), ver:q('.ga-ver'), msg:q('.ga-msg'), fotos:q('.ga-fotos'), zoom:q('.ga-zoom'), cami:q('.ga-cami'), aa:q('.ga-aa'),
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

// 13/11 (d-20261113-exemplos-por-imagem): a imagem do exemplo (bucket privado, URL assinada de 10 min) também vira blob
async function carregaExemplo(c){
  if (!c || c.img || c.carregando || !c.url) return;
  c.carregando = true;
  try {
    const r = await fetch(c.url, { mode:'cors', credentials:'omit', cache:'no-store' });
    if (!r.ok) throw new Error('http ' + r.status);
    const url = URL.createObjectURL(await r.blob()), img = new Image(); img.decoding = 'async'; img.src = url;
    await (img.decode ? img.decode() : new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; }));
    c.img = img; c.obj = url;
  } catch (e) { c.erro = true; }
  c.carregando = false; if (G) nota();
}
const exemplosDe = bs => (bs || []).map(b => b && b.cena).filter(c => c && c.tipo === 'exemplo');

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
  // montagem do bloco (12/11): números, lupas, ícones ou cartão, por cima da foto e por baixo do anel, do nome e da faixa
  try { montagem(ctx, agora); } catch (e) { G.erroMontagem = String(e && e.message || e).slice(0, 80); }
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

// ---------- montagem automática (12/11): a cena de cada bloco, desenhada no canvas (entra no vídeo) ----------
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
function escurece(ctx, al){ if (al > 0){ ctx.fillStyle = `rgba(4,7,6,${al.toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }
function montagem(ctx, agora){
  const b = G.o.blocos[G.bloco], c = b && b.cena; if (!c) return;
  const t = agora - (G.blocoT || agora);
  ctx.save();
  if (c.tipo === 'idade') cenaIdade(ctx, c, t);
  else if (c.tipo === 'foto') cenaFoto(ctx, c, agora);
  else if (c.tipo === 'dentro') cenaDentro(ctx, c, t);
  else if (c.tipo === 'desejo') cenaDesejo(ctx, c, t);
  else if (c.tipo === 'exemplo') cenaExemplo(ctx, c, t);
  ctx.restore();
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
// aviso da montagem só na tela (DOM): nunca entra no vídeo
function nota(){
  if (!G || !D) return;
  const b = G.o.blocos[G.bloco], c = b && b.cena; let t = '';
  if (c && c.tipo === 'desejo' && !(c.itens && c.itens.length)) t = c.aviso || 'O que importa: conteúdo em pesquisa. Este cartão não entra no vídeo.';
  else if (c && c.tipo === 'exemplo' && !c.img) t = c.erro ? 'A imagem do exemplo não carregou: pule esta parte.' : 'Carregando a imagem do exemplo…';
  else if (c && c.tipo === 'foto'){
    const r = G.rosto;
    if (!c.lupas || !c.lupas.length) t = 'Sem lupa: a análise não marcou sinal visível. Use o dedo para marcar.';
    else if (!r || r.estado === 'buscando') t = 'Lupas: procurando o rosto na foto de frente…';
    else if (r.estado === 'sem') t = 'Sem lupa: não achei o rosto na foto de frente. Use o dedo para marcar.';
    else if (G.foto !== r.k) t = 'As lupas aparecem na foto de frente.';
  }
  D.nota.textContent = t; D.nota.hidden = !t || G.estado === 'rev' || G.estado === 'fim';
}

// idade: "Rosto 45–52" (amarelo) × "Você 45" (azul) e a régua de traço fino; entra em 0,5 s
function cenaIdade(ctx, c, t){
  const p = sai(t / 500), lo = Math.max(15, Math.floor((Math.min(c.idade, c.min) - 6) / 5) * 5), hi = Math.ceil((Math.max(c.idade, c.max) + 6) / 5) * 5;
  escurece(ctx, .82 * sai(t / 250));
  const yN = 470, xa = 215, xb = 565;
  ctx.globalAlpha = p; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = AMARELO; ctx.font = `600 32px ${FONTE}`; ctx.fillText(c.rot || 'Rosto', xa, yN - 128);   // 13/11: Músculo, Pernas
  ctx.fillStyle = AZUL; ctx.fillText('Você', xb, yN - 128);
  const sobe = (1 - p) * 26;
  ctx.font = `700 112px ${MONO}`; ctx.fillStyle = AMARELO; ctx.fillText(c.min === c.max ? String(c.min) : `${c.min}–${c.max}`, xa, yN + sobe);
  ctx.fillStyle = AZUL; ctx.fillText(String(c.idade), xb, yN + sobe);
  ctx.font = `500 24px ${FONTE}`; ctx.fillStyle = APAGADO; ctx.fillText('estimativa', xa, yN + 44);
  ctx.fillText('anos', xb, yN + 44);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(400, yN - 160); ctx.lineTo(400, yN + 50); ctx.stroke();
  // régua
  const x0 = 70, x1 = 650, yR = 690, X = v => x0 + (v - lo) / (hi - lo) * (x1 - x0), ate = x0 + (x1 - x0) * p;
  ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, yR); ctx.lineTo(ate, yR); ctx.stroke();
  ctx.font = `500 22px ${MONO}`; ctx.fillStyle = APAGADO; ctx.textAlign = 'center';
  for (let v = lo; v <= hi; v += 5){ const x = X(v); if (x > ate + 1) break; ctx.beginPath(); ctx.moveTo(x, yR - 8); ctx.lineTo(x, yR + 8); ctx.stroke(); ctx.globalAlpha = p; ctx.fillText(String(v), x, yR + 40); ctx.globalAlpha = 1; }
  const meio = (X(c.min) + X(c.max)) / 2, mw = (X(c.max) - X(c.min)) / 2 * p;
  ctx.fillStyle = AMARELO; caixa(ctx, meio - mw, yR - 7, Math.max(2, 2 * mw), 14, 7); ctx.fill();
  const xv = X(lo + (c.idade - lo) * p);
  ctx.strokeStyle = AZUL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xv, yR - 52); ctx.lineTo(xv, yR + 12); ctx.stroke();
  ctx.fillStyle = AZUL; ctx.beginPath(); ctx.arc(xv, yR, 9, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = p; ctx.font = `700 26px ${MONO}`; ctx.fillText(String(c.idade), xv, yR - 62);
}

// foto: lupas nos sinais. Pontos do rosto (FaceLandmarker do /pele) na foto de frente; posição = pixel da foto, então
// acompanham a pinça. Lado de cada lupa (esquerdo/direito do rosto) escolhido uma vez por bloco, longe da câmera e da faixa.
let rostoMod = null, rostoFL = null;
function detector(){
  if (!rostoMod) rostoMod = import(ROSTO_URL).catch(e => { rostoMod = null; throw e; });
  return rostoMod.then(R => {
    if (!rostoFL) rostoFL = R.criarFace('IMAGE').catch(e => { rostoFL = null; throw e; });
    return rostoFL.then(fl => ({ R, fl }));
  });
}
async function achaRosto(){
  const g0 = G;
  if (!G.o.blocos.some(b => b.cena && b.cena.tipo === 'foto' && b.cena.lupas && b.cena.lupas.length)) return;   // sem lupa pedida: nem baixa o modelo
  const k = G.fotos.findIndex(f => f.chave === 'frente' && f.img);
  if (k < 0){ G.rosto = { estado:'sem', k:-1 }; nota(); return; }
  G.rosto = { estado:'buscando', k }; nota();
  let r = null;
  try {
    const { R, fl } = await detector();
    if (G !== g0) return;
    const f = G.fotos[k], iw = f.img.naturalWidth, ih = f.img.naturalHeight;
    const lms = (fl.detect(f.img).faceLandmarks || []).filter(l => l && l.length >= 468);
    if (lms.length){
      const larg = l => { let a = 1, b = 0; for (const q of l){ if (q.x < a) a = q.x; if (q.x > b) b = q.x; } return b - a; };
      const lm = lms.reduce((x, y) => larg(y) > larg(x) ? y : x);
      r = pontosSinais(R.geometria(lm, iw, ih), R.media);
    }
  } catch (e) { g0.rostoErro = String(e && e.message || e).slice(0, 80); }
  if (G !== g0) return;
  G.rosto = r ? { estado:'ok', k, ...r } : { estado:'sem', k };
  G.rostoT = performance.now(); G.lupasLay = null;
  nota();
}
// onde fica cada sinal (pixels da foto; a foto da Caixa já vem com os olhos na horizontal). Mesmas áreas de REGIOES
// (pele/rosto.js), com os dois lados do rosto: [lado esquerdo da imagem, lado direito].
function pontosSinais(g, media){
  const P = g.P, i = g.iod, m = (...ks) => media(ks.map(k => P[k]));
  return { iod:i, pts:{
    linhas_testa:[{ x:P[151].x, y:P[151].y - .2 * i }],
    glabela:[{ x:P[9].x, y:P[9].y }],
    olhos:[{ x:P[33].x - .13 * i, y:P[33].y + .05 * i }, { x:P[263].x + .13 * i, y:P[263].y + .05 * i }],
    olheira:[{ x:P[145].x, y:P[145].y + .12 * i }, { x:P[374].x, y:P[374].y + .12 * i }],
    sulco_nasolabial:[m(129, 61, 206), m(358, 291, 426)],
    manchas:[{ x:P[50].x - .06 * i, y:P[50].y + .06 * i }, { x:P[280].x + .06 * i, y:P[280].y + .06 * i }],
    flacidez:[m(172, 150, 136), m(397, 379, 365)] } };
}
const escala = (f, z) => f.bw / f.img.naturalWidth * z.s;
const naTela = (f, p, z = f.z) => { const a = escala(f, z); return { x:z.ox + p.x * a, y:z.oy + p.y * a }; };
function arrumaLupas(c, f){
  const z = f.base, r = lim(.2 * G.rosto.iod * escala(f, z), R_LUPA[0], R_LUPA[1]), cam = G.mostraCam && G.cam;
  const dentro = q => ({ x:lim(q.x, r + 10, W - r - 10), y:lim(q.y, TOPO + r + 10, H - r - 10) });
  const postos = [];
  for (const l of c.lupas){
    const cs = (G.rosto.pts[l.id] || G.rosto.pts[l.parte_de] || []).map((p, lado) => {   // sub-região sem ponto próprio (papada): o da região-mãe
      const t = naTela(f, p, z), d = dentro(t);
      let s = -2 * Math.hypot(d.x - t.x, d.y - t.y);
      if (cam && Math.hypot(d.x - CIRC.cx, d.y - CIRC.cy) < CIRC.r + r + 10) s -= 1000;   // embaixo da câmera dele
      if (d.y + r > H - 180 && d.x - r < (cam ? CIRC.cx - CIRC.r : W)) s -= 300;          // em cima da faixa verde
      s += postos.length ? Math.min(400, ...postos.map(q => Math.hypot(q.d.x - d.x, q.d.y - d.y))) : (lado === 0 ? 1 : 0);
      return { p, lado, s, d };
    });
    if (!cs.length) continue;
    const m = cs.reduce((x, y) => y.s > x.s ? y : x);
    postos.push({ ...l, p:m.p, lado:m.lado, d:m.d });
  }
  // rótulos: para o lado do meio do quadro, acima ou abaixo da lupa, sem cobrir outra lupa nem outro rótulo
  const ctx = D.ctx, caixas = [];
  for (const q of postos){
    ctx.font = `700 30px ${FONTE}`; const w1 = ctx.measureText(q.nome).width; ctx.font = `600 25px ${FONTE}`;
    const w = Math.ceil(Math.max(w1, ctx.measureText(GRAU[q.nivel] || '').width)) + 32, h = 84, dir = q.d.x <= W / 2 ? 1 : -1;
    const tenta = [[dir, -1], [dir, 1], [dir, 0], [-dir, -1], [-dir, 1]].map(([sx, sy]) => {
      let x = sx > 0 ? q.d.x + r + 34 : q.d.x - r - 34 - w, y = sy < 0 ? q.d.y - r - 14 - h : sy > 0 ? q.d.y + r + 14 : q.d.y - h / 2;
      x = lim(x, 12, W - 12 - w);
      const sobCam = cam && x + w > CIRC.cx - CIRC.r - 8;
      y = lim(y, TOPO + 6, (sobCam ? CIRC.cy - CIRC.r - 12 : H - 190) - h);
      const bate = caixas.some(k => x < k.x + k.w + 10 && x + w + 10 > k.x && y < k.y + k.h + 10 && y + h + 10 > k.y)
        || postos.some(o => Math.hypot(lim(o.d.x, x, x + w) - o.d.x, lim(o.d.y, y, y + h) - o.d.y) < r + 8);
      return { x, y, bate };
    });
    const e = tenta.find(k => !k.bate) || tenta[0];
    caixas.push({ x:e.x, y:e.y, w, h });
    q.rot = { dx:e.x - q.d.x, dy:e.y - q.d.y, w, h };
  }
  return { r, postos };
}
function cenaFoto(ctx, c, agora){
  const R0 = G.rosto, f = G.fotos[G.foto];
  if (!R0 || R0.estado !== 'ok' || G.foto !== R0.k || !f || !f.img || !c.lupas || !c.lupas.length) return;
  const chave = G.bloco + ':' + (G.mostraCam && G.cam ? 1 : 0);
  if (!G.lupasLay || G.lupasLay.chave !== chave) G.lupasLay = { chave, ...arrumaLupas(c, f) };
  const L = G.lupasLay, t = agora - Math.max(G.blocoT || 0, G.rostoT || 0), a = escala(f, f.z);
  const vis = L.postos.map((q, k) => {
    const t0 = 200 + k * 800, raw = naTela(f, q.p), cx = lim(raw.x, L.r + 10, W - L.r - 10), cy = lim(raw.y, TOPO + L.r + 10, H - L.r - 10);
    return { q, x:cx, y:cy, g:sai((t - t0) / 350), gl:sai((t - t0 - 300) / 250), gr:sai((t - t0 - 450) / 220) };
  }).filter(v => v.g > 0);
  G.lupasVis = vis.map(v => ({ id:v.q.id, x:v.x, y:v.y, r:L.r, img:v.q.p, nivel:v.q.nivel, nome:v.q.nome }));   // para conferir (teste)
  const al = .5 * sai(t / 300);
  if (al > 0){
    ctx.fillStyle = `rgba(4,7,6,${al.toFixed(3)})`; ctx.beginPath(); ctx.rect(0, 0, W, H);
    vis.forEach(v => { const rr = L.r * v.g; ctx.moveTo(v.x + rr, v.y); ctx.arc(v.x, v.y, rr, 0, Math.PI * 2, true); });
    ctx.fill('evenodd');
  }
  vis.forEach(v => lupa(ctx, f, v, L.r, a));
}
// pedaço da imagem com a origem dentro dos limites (o Safari não desenha nada se a origem sai da imagem)
function pedaco(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh){
  const iw = img.naturalWidth, ih = img.naturalHeight, kx = dw / sw, ky = dh / sh;
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(iw, sx + sw), y1 = Math.min(ih, sy + sh);
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, dx + (x0 - sx) * kx, dy + (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}
function lupa(ctx, f, v, r0, a){
  const r = r0 * v.g, { x, y } = v, q = v.q, cor = COR_GRAU[q.nivel] || AMARELO;
  // dentro: o que está sob a lupa, aumentado
  const ix = (x - f.z.ox) / a, iy = (y - f.z.oy) / a, m = r / (a * LUPA_X);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#0b100e'; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  try { pedaco(ctx, f.img, ix - m, iy - m, 2 * m, 2 * m, x - r, y - r, 2 * r, 2 * r); } catch (e) { /* ok */ }
  ctx.restore();
  ctx.lineWidth = 4; ctx.strokeStyle = cor; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 2); ctx.stroke();
  // rótulo: caixa escura, linha fina da borda da lupa até ela; o cabo da lupa do lado oposto
  const R = q.rot, bx = lim(x + R.dx, 8, W - 8 - R.w), by = lim(y + R.dy, TOPO + 4, H - 8 - R.h);
  const ax = lim(x, bx, bx + R.w), ay = lim(y, by, by + R.h), dd = Math.hypot(ax - x, ay - y) || 1, ux = (ax - x) / dd, uy = (ay - y) / dd;
  // cabo: na diagonal, para baixo (ou para cima se o rótulo está embaixo), para fora se couber no quadro, sem apontar para o rótulo
  const k = Math.SQRT1_2, fora = x < W / 2 ? -1 : 1, vy = ay > y + r ? -1 : 1;
  const cabo = [[fora * k, vy * k], [-fora * k, vy * k], [fora * k, -vy * k], [-fora * k, -vy * k]]
    .find(([hx, hy]) => { const ex = x + hx * (r + 34), ey = y + hy * (r + 34); return ex > 4 && ex < W - 4 && ey > TOPO && ey < H - 4 && hx * ux + hy * uy < .3; }) || [-ux, -uy];
  ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.strokeStyle = cor;
  ctx.beginPath(); ctx.moveTo(x + cabo[0] * (r + 4), y + cabo[1] * (r + 4)); ctx.lineTo(x + cabo[0] * (r + 4 + 26 * v.g), y + cabo[1] * (r + 4 + 26 * v.g)); ctx.stroke();
  if (v.gl <= 0) return;
  const sx = x + ux * (r + 7), sy = y + uy * (r + 7);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.88)';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (ax - sx) * v.gl, sy + (ay - sy) * v.gl); ctx.stroke();
  if (v.gr <= 0) return;
  ctx.globalAlpha = v.gr;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(6,10,9,.86)'; caixa(ctx, bx, by, R.w, R.h, 12); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff'; ctx.font = `700 30px ${FONTE}`; ctx.fillText(q.nome, bx + 16, by + 11);
  ctx.fillStyle = cor; ctx.font = `600 25px ${FONTE}`; ctx.fillText(GRAU[q.nivel] || '', bx + 16, by + 49);
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// por dentro: ícone de linha + rótulo de cada hábito citado; amarelo = pesa, verde = a favor, azul = sem medida
function icone(ctx, id, cx, cy, s, cor){
  ctx.save(); ctx.translate(cx - s / 2, cy - s / 2); ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = cor; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = (...p) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); };
  if (id === 'sol'){
    ctx.beginPath(); ctx.arc(50, 50, 18, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 8; k++){ const a = k * Math.PI / 4; L(50 + 29 * Math.cos(a), 50 + 29 * Math.sin(a), 50 + 41 * Math.cos(a), 50 + 41 * Math.sin(a)); }
  } else if (id === 'cigarro'){
    caixa(ctx, 8, 54, 84, 16, 3); ctx.stroke(); L(68, 54, 68, 70);
    ctx.beginPath(); ctx.moveTo(18, 46); ctx.bezierCurveTo(8, 36, 26, 30, 16, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(31, 46); ctx.bezierCurveTo(21, 36, 39, 30, 29, 20); ctx.stroke();
  } else if (id === 'sono'){
    lua(ctx); L(70, 12, 84, 12, 70, 26, 84, 26); L(86, 34, 94, 34, 86, 42, 94, 42);
  } else if (id === 'metabolico'){
    ctx.beginPath(); ctx.moveTo(50, 8); ctx.bezierCurveTo(50, 8, 22, 42, 22, 62); ctx.arc(50, 62, 28, Math.PI, 0, true); ctx.bezierCurveTo(78, 42, 50, 8, 50, 8); ctx.closePath(); ctx.stroke();
    L(32, 64, 42, 64, 47, 53, 54, 76, 59, 64, 68, 64);
  } else if (id === 'movimento'){
    ctx.beginPath(); ctx.arc(58, 15, 8, 0, Math.PI * 2); ctx.stroke();
    L(56, 26, 50, 56); L(55, 33, 40, 45); L(55, 33, 69, 46); L(50, 56, 40, 73, 33, 91); L(50, 56, 62, 72, 67, 91);
  }
  ctx.restore();
}
function lua(ctx){   // lua crescente de traço: arco longo do círculo de fora + arco curto do de dentro
  const A = { x:46, y:54, r:34 }, B = { x:63, y:40, r:28 }, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
  const l = (A.r * A.r - B.r * B.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.r * A.r - l * l)), mx = A.x + dx * l / d, my = A.y + dy * l / d;
  const p1 = { x:mx + h * dy / d, y:my - h * dx / d }, p2 = { x:mx - h * dy / d, y:my + h * dx / d };
  const ang = (c, p) => Math.atan2(p.y - c.y, p.x - c.x);
  const arco = (c, a0, a1, ref, longe) => {   // o sentido sai do ponto do meio de cada arco (longe ou perto de ref)
    const cw = ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI), mCw = a0 + cw / 2, mAc = a0 - (2 * Math.PI - cw) / 2;
    const dist = m => Math.hypot(c.x + c.r * Math.cos(m) - ref.x, c.y + c.r * Math.sin(m) - ref.y);
    ctx.arc(c.x, c.y, c.r, a0, a1, longe ? dist(mAc) > dist(mCw) : dist(mAc) < dist(mCw));
  };
  ctx.beginPath(); arco(A, ang(A, p1), ang(A, p2), B, true); arco(B, ang(B, p2), ang(B, p1), A, false); ctx.closePath(); ctx.stroke();
}
function cenaDentro(ctx, c, t){
  const hs = (c.habitos || []).slice(0, 3); if (!hs.length) return;
  escurece(ctx, .82 * sai(t / 250));
  const alto = 190, y0 = Math.round((TOPO + 40 + 880 - hs.length * alto) / 2);
  hs.forEach((hb, k) => {
    const p = sai((t - 150 - k * 450) / 350); if (p <= 0) return;
    const yc = y0 + k * alto + alto / 2 + (1 - p) * 24, cor = COR_TOM[hb.tom] || AZUL;
    ctx.globalAlpha = p;
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(130, yc, 68, 0, Math.PI * 2); ctx.stroke();
    icone(ctx, hb.id, 130, yc, 96, cor);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = `700 42px ${FONTE}`; ctx.fillText(hb.nome, 226, yc - 8);
    ctx.fillStyle = cor; ctx.font = `600 30px ${FONTE}`;
    quebra(ctx, hb.valor || '', 460, 2).forEach((l, i) => ctx.fillText(l, 226, yc + 34 + i * 36));
  });
  ctx.globalAlpha = 1;
}

// desejo: cartão "O que importa aos {idade}" com 3 itens (o "t" do arquivo da pesquisa) e as fontes curtas no pé; sem itens, nada no canvas (a nota avisa)
function cenaDesejo(ctx, c, t){
  const its = (c.itens || []).slice(0, 3); if (!its.length) return;
  escurece(ctx, .82 * sai(t / 250));
  const x0 = 40, w = 640;
  ctx.font = `700 44px ${FONTE}`; const tl = quebra(ctx, c.titulo || '', w - 64, 2);
  ctx.font = `500 31px ${FONTE}`; const il = its.map(s => quebra(ctx, s, w - 140, 3));
  ctx.font = `500 21px ${FONTE}`; const ft = c.fontes && c.fontes.length ? quebra(ctx, 'Fontes: ' + c.fontes.join(' · '), w - 64, 2) : [];   // "Autor ano" (index.html fonteCurta)
  const h = 34 + tl.length * 54 + 30 + il.reduce((s, l) => s + l.length * 40 + 34, 0) + (ft.length ? 8 + ft.length * 28 : 0) + 18;
  const y0 = Math.max(TOPO + 20, Math.round((TOPO + 20 + 880 - h) / 2)), p = sai(t / 300);
  ctx.globalAlpha = p;
  ctx.fillStyle = 'rgba(10,15,13,.92)'; caixa(ctx, x0, y0, w, h, 22); ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = `700 44px ${FONTE}`;
  tl.forEach((l, i) => ctx.fillText(l, x0 + 32, y0 + 34 + i * 54));
  let y = y0 + 34 + tl.length * 54 + 4;
  ctx.fillStyle = AMARELO; ctx.fillRect(x0 + 32, y, 64, 3); y += 26;
  il.forEach((ls, k) => {
    const q = sai((t - 250 - k * 400) / 300), bh = ls.length * 40 + 34;
    if (q > 0){
      ctx.globalAlpha = q;
      ctx.lineWidth = 2.5; ctx.strokeStyle = AMARELO; ctx.beginPath(); ctx.arc(x0 + 56, y + 22, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = AMARELO; ctx.font = `600 26px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(k + 1), x0 + 56, y + 23);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = `500 31px ${FONTE}`;
      ls.forEach((l, i) => ctx.fillText(l, x0 + 100, y + 4 + i * 40));
    }
    y += bh;
  });
  if (ft.length){ ctx.globalAlpha = p; ctx.fillStyle = APAGADO; ctx.font = `500 21px ${FONTE}`; ft.forEach((l, i) => ctx.fillText(l, x0 + 32, y + 4 + i * 28)); }
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// exemplo (13/11, d-20261113-exemplos-por-imagem): a imagem do estudo só recortada pelo kit (nenhuma outra edição), a
// legenda grande (uma por painel, da esquerda para a direita) e, no pé, o crédito e "Varia de pessoa para pessoa." pequenos.
// Fica entre a faixa do nome e a câmera, encostado embaixo; entra em 0,4 s.
function cenaExemplo(ctx, c, t){
  const img = c.img; if (!img || !img.naturalWidth) return;
  const p = sai(t / 400), r = c.recorte || { x:0, y:0, w:100, h:100 }, nw = img.naturalWidth, nh = img.naturalHeight;
  const sx = r.x / 100 * nw, sy = r.y / 100 * nh, sw = Math.max(1, r.w / 100 * nw), sh = Math.max(1, r.h / 100 * nh);
  const leg = (c.legenda || []).filter(Boolean).slice(0, 4), n = Math.max(1, leg.length);
  ctx.font = `500 20px ${FONTE}`;
  const xP0 = 32, notaL = c.nota ? quebra(ctx, c.nota, W - 2 * xP0, 2) : [];   // a nota da tela do kit (ex.: "Vermelho = músculo")
  const topo = TOPO + 20, base = CIRC.cy - CIRC.r - 20, hLeg = leg.length ? 96 : 0, hPe = 62 + notaL.length * 26;
  let dw = W - 64, dh = sh * dw / sw; if (dh > base - topo - hLeg - hPe){ dh = base - topo - hLeg - hPe; dw = sw * dh / sh; }
  const dx = (W - dw) / 2, dy = base - hLeg - hPe - dh;   // encostado na câmera: na tela dele, o teleprompter cobre o alto
  escurece(ctx, p);   // fundo liso: nada do quadro de baixo aparece por trás
  ctx.globalAlpha = p;
  try { ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); } catch (e) { /* imagem ainda não pronta */ }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = `700 32px ${FONTE}`;
  leg.forEach((l, k) => quebra(ctx, l, Math.max(120, dw / n - 14), 2).forEach((s, i) => ctx.fillText(s, dx + dw * (k + .5) / n, dy + dh + 14 + i * 38)));
  ctx.textAlign = 'left'; ctx.fillStyle = APAGADO; ctx.font = `500 20px ${FONTE}`;
  const xP = xP0; let yP = dy + dh + hLeg + 8;
  notaL.forEach(l => { ctx.fillText(l, xP, yP); yP += 26; });
  if (c.credito) ctx.fillText(quebra(ctx, c.credito, W - 2 * xP, 1)[0], xP, yP);
  ctx.fillText('Varia de pessoa para pessoa.', xP, yP + 27);
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// ---------- teleprompter (só DOM) ----------
function prompter(){
  const bs = G.o.blocos, b = bs[G.bloco] || { titulo:'', fala:'' }, n = bs.length;
  D.pTit.textContent = b.titulo || '';
  D.pPos.textContent = n ? `${G.bloco + 1} de ${n}${G.o.fonte ? ' · ' + (G.o.fonte === 'claude' ? 'Claude' : 'estoque') : ''}` : '';
  // 12/11: [APONTE: região] (roteiro do Claude) vira dica destacada no teleprompter; nunca vai para o canvas
  D.pTxt.textContent = '';
  if (b.imagem){ const sp = document.createElement('span'); sp.className = 'ga-dica'; sp.textContent = '→ imagem: ' + b.imagem; D.pTxt.append(sp); }   // 13/11: o exemplo na tela
  String(b.fala || '').split(/(\[(?:APONTE|CIRCULAR):[^\]]*\])/i).forEach(pedaco => {
    const m = /^\[(?:APONTE|CIRCULAR):\s*([^\]]*)\]$/i.exec(pedaco);
    if (m){ const sp = document.createElement('span'); sp.className = 'ga-dica'; sp.textContent = '→ ' + m[1].trim(); D.pTxt.append(sp); }   // 13/11: o nome da lupa
    else if (pedaco) poeComDestaque(D.pTxt, pedaco, b.destaque);
  });
  // 12/11: notas só para ele (nome popular do sinal, o que acompanha a idade, o porquê de cada item do cartão): nunca no canvas
  D.pOpc.textContent = ''; (b.notas || []).forEach(t => { const q = document.createElement('p'); q.textContent = t; D.pOpc.append(q); });
  D.pOpc.hidden = !(b.notas && b.notas.length);
  // 13/11: a 1ª linha do próximo bloco, apagada (dá para ver que tem mais); no último, nada
  D.pDep.textContent = G.bloco < n - 1 ? String(bs[G.bloco + 1].fala || '').replace(/\[[^\]]*\]/g, ' ').replace(/\{nome\}/g, '').replace(/\s+/g, ' ').replace(/^[\s,]+/, '').trim() : '';
  D.prompt.style.setProperty('--fs', fsPrompt + 'px');
  D.ant.disabled = G.bloco === 0; D.prox.disabled = G.bloco >= n - 1;
  if (G.blocoVisto !== G.bloco){ G.blocoVisto = G.bloco; G.blocoT = performance.now(); if (G.estado === 'rec'){ (G.blocosVistos ||= new Set()).add(G.bloco); contaBloco(); } }   // a cena do bloco começa agora
  marcaTempo();
  nota();
}
// 13/11 (d-20261113-narrativa-analise-todas-iscas): o rótulo do bloco 1 (o incômodo ou objetivo nas palavras dela) em destaque
function poeComDestaque(el, txt, d){
  const i = d ? txt.toLowerCase().indexOf(String(d).toLowerCase()) : -1;
  if (i < 0){ el.append(document.createTextNode(txt)); return; }
  if (i) el.append(document.createTextNode(txt.slice(0, i)));
  const m = document.createElement('mark'); m.className = 'ga-rot'; m.textContent = txt.slice(i, i + d.length); el.append(m);
  poeComDestaque(el, txt.slice(i + d.length), d);
}
// 13/11: ms em cada bloco durante a gravação (registro de uso: ms_blocos), somando as voltas
function contaBloco(fim){
  if (!G || !G.msBlocos) return;
  const agora = performance.now();
  if (G.blocoAtivo != null && G.msBlocos[G.blocoAtivo] != null) G.msBlocos[G.blocoAtivo] += agora - G.blocoIni;
  G.blocoAtivo = fim ? null : G.bloco; G.blocoIni = agora;
}
// 13/11: a linha fina enche no tempo do bloco; esgotado, o Próximo pulsa até ele tocar (o controle é dele)
function marcaTempo(){
  if (!G || !D) return;
  const rec = G.estado === 'rec', n = G.o.blocos.length, ult = G.bloco >= n - 1;
  D.pBarra.hidden = !rec;
  if (!rec){ D.prox.classList.remove('pulsa'); return; }
  const fr = Math.min(1, (performance.now() - G.blocoT) / tempoBloco(G.o.blocos[G.bloco], G.p.ritmo));
  D.pBarraI.style.width = (fr * 100).toFixed(1) + '%';
  D.prox.classList.toggle('pulsa', fr >= 1 && !ult);
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
  if (e === 'rev') window.USO?.tela('revisao'); else if (e === 'prep' || e === 'conta' || e === 'rec') window.USO?.tela('gravador');
  D.recT.textContent = e === 'rec' ? '0:00 / ' + mmss(G.p.alvo * 1000) : e === 'conta' ? 'Cancelar' : 'Gravar';
  marcaTempo();
  D.rec.setAttribute('aria-label', e === 'rec' ? 'Parar a gravação' : e === 'conta' ? 'Cancelar a contagem' : 'Começar a gravar');
  D.rec.disabled = e === 'prep' && !G.pronto;
  D.fotos.querySelectorAll('button').forEach(b => { b.disabled = rev; });
  D.zoom.disabled = rev; D.cami.disabled = rev || !G.cam;
  nota();
}

// ---------- abrir / fechar ----------
/** o = { codigo, nome, fotos:[{rot, url, chave}], blocos:[{titulo, fala, faixa}], aoMarcar?:fn, foto?:chave }. */
async function abrir(o){
  o = o || {};
  monta();
  if (G) fechar();
  G = { o, fotos:(o.fotos || []).filter(f => f.url).map(f => ({ ...f })), foto:0, bloco:0, estado:'prep', pronto:false, cam:false, mic:false, mostraCam:true,
    stream:null, rec:null, chunks:[], t0:0, take:null, anel:null, ptrs:new Map(), gesto:null, quadros:0, camQuadros:0, camUlt:0, camParada:false, camParadas:0, camParadaS:null, iv:0, relogio:0, wake:null, p:params(o) };
  const k = G.fotos.findIndex(f => f.chave === (o.foto || 'frente')); if (k > 0) G.foto = k;
  D.el.hidden = false; document.body.classList.add('ga-aberto');
  window.USO?.tela('gravador');   // 13/11: registro de uso do CRM (uso.js)
  D.fotos.innerHTML = G.fotos.length > 1 ? G.fotos.map((f, i) => `<button type="button" class="ga-b" data-f="${i}" aria-pressed="${i === G.foto}" aria-label="Foto: ${esc(f.rot)}">${esc(CURTO[f.chave] || f.rot)}</button>`).join('') : '';
  D.msg.hidden = true; aviso(''); info('Abrindo a câmera e a foto…');
  D.cami.setAttribute('aria-pressed', 'true');
  estado('prep'); prompter();
  requestAnimationFrame(encaixa);
  G.iv = setInterval(pinta, 1000 / FPS);
  const g0 = G;
  exemplosDe(G.o.blocos).forEach(carregaExemplo);   // 13/11: a imagem do exemplo (não segura a abertura)
  await Promise.all([Promise.all(G.fotos.map(carregaFoto)).then(() => { if (G === g0) achaRosto(); }), abreCamera()]);
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
function falha(t){ if (!G) return; window.USO?.sinal('erro', { onde:'gravador' }); D.msg.querySelector('p').textContent = t; D.msg.hidden = false; info(''); G.pronto = false; estado('prep'); }
function liberaTake(){
  if (!G || !G.take) return;
  D.ver.pause?.(); D.ver.removeAttribute('src'); try { D.ver.load(); } catch (e) { /* ok */ }
  URL.revokeObjectURL(G.take.url); G.take = null;
  D.baixar.removeAttribute('href');
}
function fechar(){
  if (!G) return;
  const g = G;
  if (['conta', 'rec', 'rev'].includes(g.estado) && !g.enviado) window.USO?.sinal('gravacao-abandonada', { estado:g.estado });
  window.USO?.volta();
  try { if (g.rec && g.rec.state !== 'inactive'){ g.descartar = true; g.rec.stop(); } } catch (e) { /* ok */ }
  clearInterval(g.iv); clearInterval(g.relogio); clearInterval(g.camIv); clearTimeout(g.contaT);
  g.stream?.getTracks().forEach(t => t.stop());
  g.trilha?.stop();
  try { g.wake?.release(); } catch (e) { /* ok */ }
  liberaTake();
  g.fotos.forEach(f => { if (f.obj) URL.revokeObjectURL(f.obj); f.img = null; });
  exemplosDe(g.o.blocos).forEach(c => { if (c.obj) URL.revokeObjectURL(c.obj); c.img = null; });
  D.cam.srcObject = null;
  D.el.hidden = true; document.body.classList.remove('ga-aberto');
  G = null;
  try { g.o.aoFechar?.(); } catch (e) { /* ok */ }
}

// ---------- gravação ----------
function conta(){
  if (!G || !G.pronto) return;
  const ms = window.USO?.desdeLead(); if (ms != null) window.USO.sinal('abrir-ate-gravar', { ms });
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
  G.t0 = performance.now(); G.camUlt = G.camUlt || G.t0; G.blocoT = G.t0;   // a cena do 1º bloco entra no vídeo desde o começo
  G.msBlocos = G.o.blocos.map(() => 0); G.blocoAtivo = G.bloco; G.blocoIni = G.t0; G.saltou = false;
  estado('rec');
  info('Gravando. Próximo troca o texto e a faixa.');
  G.relogio = setInterval(() => {
    if (!G || G.estado !== 'rec') return;
    const ms = performance.now() - G.t0;
    D.recT.textContent = mmss(ms) + ' / ' + mmss(G.p.alvo * 1000);
    D.rec.classList.toggle('fim-perto', ms >= G.p.alvo * 1000);
    const n = G.o.blocos.length;   // o único salto automático: a pergunta de interesse nunca fica de fora
    if (!G.saltou && ms >= G.p.salto * 1000 && G.bloco < n - 1){ G.saltou = true; G.bloco = n - 1; prompter(); }
    marcaTempo();
    if (ms >= G.p.teto * 1000) para();
  }, 250);
}
function para(){
  if (!G || !G.rec || G.estado !== 'rec') return;
  G.ms = performance.now() - G.t0;
  contaBloco(true); G.blocoFim = G.bloco;
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
  window.USO?.sinal('gravacao-fim', { ms:g.ms || 0, anel:g.anelUsos || 0, pinca:g.pincas || 0, blocos:(g.blocosVistos || new Set()).size,
    ms_blocos:(g.msBlocos || []).map(Math.round), bloco_fim:g.blocoFim ?? g.bloco, salto_fecho:!!g.saltou });   // 13/11: sem precisar do vídeo
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
// 13/11: no Safari (Mac e iPhone) a leitura do mp4 gravado pode repetir o mesmo quadro depois de buscar; se a câmera não
// parou ao vivo (camera_paradas = 0), a parada que só aparece no arquivo é falso positivo: não avisa (fica no diagnóstico)
const SAFARI = /^((?!chrome|chromium|crios|fxios|android|edg).)*safari/i.test(navigator.userAgent);
const decideParada = (parada, paradasAoVivo, safari) => parada != null && !(safari && !paradasAoVivo);
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
    // 13/11 (Safari do Mac: "parada a partir de 12 s" com a câmera viva o tempo todo): espera o quadro buscado aparecer
    // (requestVideoFrameCallback) e descarta a amostra quando a busca não chegou ao tempo pedido
    if (v.requestVideoFrameCallback) await new Promise(r => { let f = false; v.requestVideoFrameCallback(() => { f = true; r(); }); setTimeout(() => { if (!f) r(); }, 350); });
    if (Math.abs(v.currentTime - tt) > 1){ ant = null; continue; }
    try { x.drawImage(v, (CIRC.cx - CIRC.r) * v.videoWidth / W, (CIRC.cy - CIRC.r) * v.videoHeight / H, 2 * CIRC.r * v.videoWidth / W, 2 * CIRC.r * v.videoHeight / H, 0, 0, 32, 32); } catch (e) { break; }
    const d = x.getImageData(0, 0, 32, 32).data;
    if (ant){ let s = 0; for (let i = 0; i < d.length; i += 4) s += Math.abs(d[i] - ant[i]) + Math.abs(d[i + 1] - ant[i + 1]) + Math.abs(d[i + 2] - ant[i + 2]); est.push(s / (d.length / 4 * 3) < 0.3); }
    ant = d;
  }
  v.removeAttribute('src'); try { v.load(); } catch (e) { /* ok */ }
  if (!G || G.take !== t || est.length < 3) return;
  let k = est.length; while (k > 0 && est[k - 1]) k--;
  t.parada = est.length - k >= 3 ? Math.round(ts[k]) : null;
  const avisa = decideParada(t.parada, G.camParadas || 0, SAFARI);
  if (avisa) info(`A imagem da câmera parece parada a partir de ${t.parada} s. Assista antes de mandar.`);
  diag('conferência ' + (t.parada != null ? 'parada ' + t.parada + ' s' + (avisa ? '' : ' (só no arquivo, Safari: sem aviso)') : 'ok'), G);
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
  function ok(msg){ if (!G) return; G.enviado = true; estado('fim'); info(msg || 'Mandou. Marque a etapa; ao fechar, o vídeo sai da memória.'); D.marcar.focus(); }
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
    G.pincas = (G.pincas || 0) + 1;
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
  const tocaTexto = ev => { if (!G || !['prep', 'rec'].includes(G.estado) || ev.target.closest('button')) return; D.prox.click(); };   // 13/11: o texto é o alvo grande
  D.pTxt.addEventListener('click', tocaTexto); D.pDep.addEventListener('click', tocaTexto);
  D.ant.onclick = () => { if (G && G.bloco > 0){ G.bloco--; prompter(); } };
  D.fotos.onclick = ev => { const b = ev.target.closest('button[data-f]'); if (!b || !G) return; G.foto = +b.dataset.f; G.anel = null; D.fotos.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); nota(); };
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
  D.refazer.onclick = () => { if (!G) return; window.USO?.sinal('refazer'); liberaTake(); G.bloco = 0; prompter(); estado('prep'); info('Toque em Gravar quando quiser.'); requestAnimationFrame(encaixa); };
  D.enviar.onclick = enviar; D.denovo.onclick = enviar;
  D.marcar.onclick = () => { const fn = G && G.o.aoMarcar; fechar(); try { fn?.(); } catch (e) { /* ok */ } };
  D.tentar.onclick = () => { if (!G) return; const o = G.o; fechar(); abrir(o); };
  addEventListener('resize', () => { if (G) encaixa(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (G) encaixa(); }).observe(D.el.querySelector('.ga-palco'));   // a barra muda de altura: o quadro acompanha (nunca durante a gravação)
  document.addEventListener('keydown', ev => {
    if (!G) return;
    const vale = ['prep', 'rec'].includes(G.estado);
    if (ev.key === ' ' && vale && !ev.target.closest?.('input, textarea')){ ev.preventDefault(); if (document.activeElement?.closest?.('.ga')) document.activeElement.blur(); if (!ev.repeat) D.prox.click(); return; }   // 13/11: espaço avança (sem acionar o botão em foco)
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

// 13/11: o roteiro do Claude chegou com o gravador aberto e ainda sem gravar: troca os blocos e volta ao 1º
function trocarBlocos(bs, fonte){ if (!G || G.estado !== 'prep' || !Array.isArray(bs) || !bs.length) return false; exemplosDe(bs).forEach(carregaExemplo); G.o.blocos = bs; G.o.fonte = fonte; G.bloco = 0; G.blocoVisto = -1; prompter(); return true; }
return { abrir, fechar, trocarBlocos, versao:VERSAO, _estado:() => G, _mime:pickMime, _decideParada:decideParada, _tempoBloco:tempoBloco, _params:params };
})();
