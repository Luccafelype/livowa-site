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
const VERSAO = '2011a';
const W = 720, H = 1280, FPS = 30;
// 13/11 (2º treino da Carla: bloco 1 de 6 s durou 43 s, o corte dos 90 s levou a pergunta): os números vêm dos Ajustes
// (o.params; padrões abaixo). alvo = o relógio fica vermelho; salto = pula para o último bloco (desejo e pergunta); teto = corta.
const PADRAO = { ritmo:2.5, salto:160, alvo:160, teto:180 };   // 18/11: o roteiro da pele-idade vai até 160 s (a fala nova do 'dentro')   // 14/11 (v5: como se forma, como se trabalha e o caminho entram no roteiro). 17/11 (v7): a v6 da Carla tem 367 palavras (~147 s); aos 115 s o salto cortava o caminho
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
const R_LUPA = [72, 118], LUPA_X = 1.7;   // raio da lupa no quadro (px) e o aumento dentro dela
const COR_TOM = { pesa:AMARELO, bem:VERDE, neutro:AZUL };
const sai = x => { const t = Math.max(0, Math.min(1, x)); return 1 - (1 - t) * (1 - t) * (1 - t); };   // ease-out
const ROSTO_URL = (() => { try { return new URL('../pele/rosto.js?v=2', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '/pele/rosto.js?v=2'; } })();
// 18/11 (o Lucca testou 2 vezes com a aba aberta de antes da publicação e viu a versão velha): o gravador confere a versão
// publicada (consulta/versao.json, sem cache) ao abrir e a cada troca de bloco (no máximo 1 vez por minuto). A versão carregada é
// o ?v= deste arquivo no index.html, e o versao.json tem o MESMO valor (scripts/versao-gravador.py troca os dois juntos). Diferente:
// "Versão nova, atualizando…" e a página recarrega com ?v= novo na URL (o index.html tem cache de 600 s), nunca gravando nem com
// vídeo gravado na tela. Se depois de recarregar ainda vier a velha, não recarrega de novo: avisa para fechar e abrir a aba.
const V_SRC = (() => { try { return document.currentScript && document.currentScript.src || ''; } catch (e) { return ''; } })();
const V_CARREGADA = (() => { try { return new URL(V_SRC).searchParams.get('v') || ''; } catch (e) { return ''; } })();
const V_URL = (() => { try { return new URL('versao.json', V_SRC || location.href).href; } catch (e) { return 'versao.json'; } })();
let vUlt = 0, vNova = null;
async function confereVersao(forcar){
  if (!V_CARREGADA || !G) return null;
  const agora = Date.now(); if (!forcar && agora - vUlt < 60000) return null;
  vUlt = agora;
  let v = null;
  try { const r = await fetch(V_URL + '?t=' + agora, { cache:'no-store' }); if (r.ok) v = String((await r.json()).v || ''); } catch (e) { return null; }
  if (!v || v === V_CARREGADA){ vNova = null; return v; }
  vNova = v;
  recarregaSePode();
  return v;
}
function recarregaSePode(){
  if (!vNova || !G || !['prep'].includes(G.estado)) return false;   // nunca gravando, contando nem com vídeo gravado
  let tentou = null; try { tentou = sessionStorage.getItem('livowa_ga_recarga'); } catch (e) { /* sem armazenamento */ }
  if (tentou === vNova){ aviso('Há uma versão nova do gravador, mas este navegador ainda mostra a antiga: feche a aba e abra de novo.'); return false; }
  try { sessionStorage.setItem('livowa_ga_recarga', vNova); } catch (e) { /* ok */ }
  aviso('Versão nova, atualizando…');
  const u = new URL(location.href); u.searchParams.set('v', vNova);
  setTimeout(() => { try { location.replace(u.href); } catch (e) { location.reload(); } }, 700);
  return true;
}
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
  <div class="ga-prompt" aria-live="polite">
    <div class="ga-p-topo"><div class="ga-p-passos" aria-hidden="true"></div><span class="ga-p-pos"></span><button type="button" class="ga-aa" aria-label="Tamanho do texto">Aa</button></div>
    <b class="ga-p-tit"></b>
    <div class="ga-p-rola"><p class="ga-p-txt"></p><div class="ga-p-opc" hidden></div></div>
    <div class="ga-foco" role="group" aria-label="Foco no vídeo" hidden></div>
    <div class="ga-pele" role="group" aria-label="Pele no vídeo" hidden></div>
    <div class="ga-pele ga-rosto" role="group" aria-label="Rosto no vídeo" hidden></div>
    <div class="ga-pele-menu" role="dialog" aria-label="Pele no vídeo" hidden></div>
    <div class="ga-nota" hidden></div>
    <p class="ga-p-dep" aria-hidden="true"></p>
  </div>
  <div class="ga-palco">
    <div class="ga-quadro">
      <canvas class="ga-tela" width="${W}" height="${H}" aria-label="Vídeo que vai ser gravado"></canvas>
      <video class="ga-cam" playsinline muted autoplay aria-hidden="true"></video>
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
  D = { el, quadro:q('.ga-quadro'), tela:q('.ga-tela'), cam:q('.ga-cam'), prompt:q('.ga-prompt'), pTit:q('.ga-p-tit'), pPos:q('.ga-p-pos'), pTxt:q('.ga-p-txt'), pOpc:q('.ga-p-opc'), pDep:q('.ga-p-dep'), pPassos:q('.ga-p-passos'), pRola:q('.ga-p-rola'), foco:q('.ga-foco'), pele:q('.ga-pele:not(.ga-rosto)'), rostoP:q('.ga-rosto'), peleMenu:q('.ga-pele-menu'),
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
  cabeTexto();
}
// 13/11 19h45: o teleprompter é um painel fora do quadro (ao lado no Mac, acima no iPhone). A letra parte do tamanho do "Aa"
// e diminui até a fala do bloco caber inteira no painel (o fecho saía cortado); no limite de 14 px, o painel rola.
function cabeTexto(){
  if (!G || !D || D.prompt.hidden) return;
  let fs = fsPrompt; const r = D.pRola;
  D.foco.classList.remove('aperto'); D.pele.classList.remove('aperto'); D.rostoP.classList.remove('aperto');
  D.prompt.style.setProperty('--fs', fs + 'px');
  const sobra = () => D.pTxt.getBoundingClientRect().height > r.clientHeight + .5;   // 14/11: medida com fração (78,4 px num painel de 77 passava por "coube")
  while (fs > 14 && sobra()){ fs--; D.prompt.style.setProperty('--fs', fs + 'px'); }   // só a fala decide; as notas ficam com o que sobrar (rolam)
  if (sobra() && !D.foco.hidden) D.foco.classList.add('aperto');
  if (sobra() && !D.pele.hidden) D.pele.classList.add('aperto');
  if (sobra() && !D.rostoP.hidden) D.rostoP.classList.add('aperto');   // 20/11: idem com o rosto (o toque no quadro abre o menu)   // 18/11: idem com os botões da pele (o toque nos rótulos sob a pele faz o mesmo)   // 14/11: a fala não coube nem com 14 px: os botões de foco saem (no celular, o toque no ponto do rosto faz o mesmo)
  r.scrollTop = 0;
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
  let temCena = false;
  try { temCena = montagem(ctx, agora); } catch (e) { G.erroMontagem = String(e && e.message || e).slice(0, 80); }
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
  // 13/11 19h45: só quando a cena do bloco não desenhou nada; com a cena, a faixa repetia o mesmo dado por cima dela
  const fx = (G.o.blocos[G.bloco] || {}).faixa;
  G.faixaNoVideo = !!fx && !temCena;
  if (fx && !temCena){
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
  const b = G.o.blocos[G.bloco], c = b && b.cena; if (!c) return false;
  const t = agora - (G.blocoT || agora);
  let fez = false;   // a cena desenhou alguma coisa (então a faixa verde não entra)
  ctx.save();
  try {
    if (c.tipo === 'idade') fez = cenaIdadeRosto(ctx, c, t);   // 20/11: com 'Mostrar no rosto', o rosto de exemplo por cima
    else if (c.tipo === 'foto') fez = cenaFoto(ctx, c, agora);
    else if (c.tipo === 'dentro') fez = cenaDentro(ctx, c, t);
    else if (c.tipo === 'desejo') fez = cenaDesejo(ctx, c, t);
    else if (c.tipo === 'exemplo') fez = cenaExemplo(ctx, c, t);
    else if (c.tipo === 'mecanismo') fez = cenaMecanismo(ctx, c, t);
    else if (c.tipo === 'caminho') fez = cenaCaminho(ctx, c, t);
    else if (c.tipo === 'objetivo') fez = cenaObjetivo(ctx, c, t);
  } finally {
    ctx.restore();
    ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  return !!fez;
}
// aviso da montagem só na tela (DOM): nunca entra no vídeo
function nota(){
  if (!G || !D) return;
  const b = G.o.blocos[G.bloco], c = b && b.cena; let t = '';
  if (c && c.tipo === 'desejo' && !(c.itens && c.itens.length)) t = c.aviso || 'O que importa: conteúdo em pesquisa. Este cartão não entra no vídeo.';
  else if (c && c.tipo === 'exemplo' && !c.img) t = c.erro ? 'A imagem do exemplo não carregou: pule esta parte.' : 'Carregando a imagem do exemplo…';
  else if (c && c.tipo === 'idade' && G.ri && G.ri.on && !riObj(c)) t = RI.erro ? 'O rosto de exemplo não carregou: fale com a idade na tela.' : 'Carregando o rosto de exemplo…';
  else if (c && c.tipo === 'mecanismo'){ const b = FORMA[c.tema] ? carregaForma('forma/' + FORMA[c.tema].q[0] + '.webp') : null; if (!b) t = 'Sem ilustração para este ponto: fale com a foto na tela.'; else if (b.erro) t = 'A ilustração não carregou: fale com a foto na tela.'; else if (!b.ok) t = 'Carregando a ilustração…'; }
  else if (c && c.pele && !(c.pele.modo === 'caminho' && !(G.pele && G.pele.aberto))){ const b = carregaForma(PELE_SRC('base')); if (b.erro) t = 'A pele não carregou: fale com a tela de antes.'; else if (!b.ok) t = 'Carregando a pele…'; }
  else if (c && c.tipo === 'foto'){
    const r = G.rosto;
    if (!c.lupas || !c.lupas.length) t = 'Sem lupa: a análise não marcou sinal visível. Use o dedo para marcar.';
    else if (!r || r.estado === 'buscando') t = 'Lupas: procurando o rosto na foto de frente…';
    else if (r.estado === 'sem') t = 'Sem lupa: não achei o rosto na foto de frente. Use o dedo para marcar.';
    else if (G.foto !== r.k) t = 'As lupas aparecem na foto de frente.';
  }
  if (!t && G.saltoAdiado && G.estado === 'rec' && G.bloco < G.o.blocos.length - 1) t = 'Passou do tempo: quando terminar aqui, vá para a pergunta (Próximo ou espaço).';
  D.nota.textContent = t; D.nota.hidden = !t || G.estado === 'rev' || G.estado === 'fim';
  cabeTexto();   // o aviso divide o painel com a fala
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
  return true;
}

// ---------- 20/11 (pedido do Lucca): "na hora de explicar de onde vem a idade, colocar aquelas imagens que fizemos alterando as
// texturas, os vincos e manchas, para mostrar como isso afeta a percepção da idade". No bloco da idade (só o do rosto, sem c.rot),
// o botão do painel "Mostrar no rosto" (F) troca a cena para um ROSTO DE EXEMPLO do mesmo sexo e da idade mais perto (o do Simulador
// do Rosto), com a idade estimada grande em cima da cabeça (mesmo amarelo e mesma fonte da cena da idade) e, embaixo, cada sinal
// com a sua nota. Os controles são só dele (painel, teclas e o menu do toque; nunca no vídeo): por sinal Menos · Hoje · Mais
// (Mais = 1–5, Menos = Q W E R T, de novo volta a Hoje), Tudo como hoje (0), Voltar à idade (F). O número conta até o novo valor
// (~0,6 s) e a imagem anda em ~0,45 s, para ele falar em cima. A conta é a MESMA da análise (assets/rosto-idade/rosto-idade.js,
// porte do calcularIdade da edge); olheiras e viço mexem no rosto e não no número (fora da conta, como na edge).
// As diferenças das imagens são calculadas ao abrir o gravador, nunca gravando (lição da pele interativa, 18/11).
const RI_URL = (() => { try { return new URL('../assets/rosto-idade/rosto-idade.js?v=20261120a', V_SRC || location.href).href; } catch (e) { return '/assets/rosto-idade/rosto-idade.js?v=20261120a'; } })();
const RI = { mod:null, r:{}, erro:false };
const RI_MAIS = ['1', '2', '3', '4', '5'], RI_MENOS = ['Q', 'W', 'E', 'R', 'T'];
const riCena = () => { const c = G && (G.o.blocos[G.bloco] || {}).cena; return c && c.tipo === 'idade' && !c.rot ? c : null; };
const riId = c => window.RostoIdade ? window.RostoIdade.escolher(c.sexo === 'm' ? 'm' : 'f', c.idade) : null;
const riObj = c => { const id = c && riId(c), r = id && RI.r[id]; return r && r.pronto ? r.obj : null; };
function riModulo(){
  if (window.RostoIdade) return Promise.resolve(window.RostoIdade);
  if (!RI.mod) RI.mod = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = RI_URL; s.async = true; s.onload = () => window.RostoIdade ? ok(window.RostoIdade) : ko(new Error('sem módulo')); s.onerror = () => { RI.mod = null; ko(new Error('módulo')); }; document.head.append(s); });
  return RI.mod;
}
function preparaRosto(bs){
  const c = (bs || []).map(b => b && b.cena).find(x => x && x.tipo === 'idade' && !x.rot); if (!c) return;
  riModulo().then(M => {
    const id = riId(c); if (!id || RI.r[id]) return;
    const e = RI.r[id] = { pronto:false };
    // nunca lê pixels gravando: se ele apertou Gravar no meio, espera o fim da gravação
    M.criar(id, { pode:() => !G || G.estado !== 'rec' }).then(obj => { e.obj = obj; e.pronto = true; if (G){ nota(); botoesRosto(); } }).catch(() => { delete RI.r[id]; RI.erro = true; if (G) nota(); });
  }).catch(() => { RI.erro = true; if (G) nota(); });
}
function riSai(){ if (G) G.ri = null; Object.values(RI.r).forEach(e => { if (e.obj){ e.obj.hoje(); e.obj.anda(performance.now(), 0); } }); }   // troca de bloco: o rosto volta a Hoje
function riNovo(r){ r.hoje(); r.anda(performance.now(), 0); return { on:false, k:0, kUlt:0, cont:window.RostoIdade.contador(r.idade().idade), ult:null }; }
function riTecla(c, key){
  const K = String(key).toUpperCase(), r = riObj(c);
  if (K === 'F') return 'rosto';
  if (!r) return null;
  if (K === '0') return 'hoje';
  const i = RI_MAIS.indexOf(K), j = RI_MENOS.indexOf(K);
  if (i >= 0 && r.ctrl[i]) return r.ctrl[i].k + ':mais';
  if (j >= 0 && r.ctrl[j]) return r.ctrl[j].k + ':menos';
  return null;
}
function riAcao(a){
  if (!G || !['prep', 'conta', 'rec'].includes(G.estado)) return;
  const c = riCena(); if (!c) return;
  const r = riObj(c);
  G.rostoUlt = performance.now();   // ele está mexendo (o salto automático espera)
  if (!r){ G.ri = G.ri || { on:false, k:0, kUlt:0 }; if (a === 'rosto') G.ri.on = !G.ri.on; nota(); botoesRosto(); return; }   // ainda carregando: o aviso aparece só no painel
  const S = G.ri && G.ri.cont ? G.ri : (G.ri = { ...riNovo(r), on:!!(G.ri && G.ri.on) });
  if (a === 'rosto') S.on = !S.on;
  else if (a === 'hoje'){ r.hoje(); S.on = true; S.ult = null; }
  else {
    const [k, lado] = a.split(':'), q = r.ctrl.find(x => x.k === k); if (!q) return;
    const alvo = lado === 'mais' ? q.max : lado === 'menos' ? q.min : q.hoje;
    r.por(k, r.pos[k] === alvo ? q.hoje : alvo);   // de novo no mesmo: volta a hoje
    S.on = true; S.ult = { k, t:performance.now() };
  }
  S.cont.alvo(r.idade().idade);
  G.riUsos = (G.riUsos || 0) + 1;
  botoesRosto(); nota();
}
function botoesRosto(){
  if (!D || !G) return;
  const c = riCena(), r = c && riObj(c), S = G.ri, on = !!(S && S.on);
  const k = c ? G.bloco + '|' + (r ? r.id : 'carregando') : '';
  if (D.rostoP.dataset.k !== k){
    D.rostoP.dataset.k = k;
    D.rostoP.innerHTML = !c ? '' : `<button type="button" class="ga-foco-b ga-pele-b zera" data-r="rosto" aria-pressed="false"><kbd>F</kbd><b>Mostrar no rosto</b></button>` +
      (r ? `<button type="button" class="ga-foco-b ga-pele-b" data-r="hoje"><kbd>0</kbd><b>Tudo como hoje</b></button>` +
        r.ctrl.map((q, i) => `<i class="ga-pele-q"></i><span class="ga-pele-g">${esc(q.nome)}</span>` +
          [['menos', RI_MENOS[i], 'Menos', q.min < q.hoje], ['hoje', '', 'Hoje', true], ['mais', RI_MAIS[i], 'Mais', q.max > q.hoje]].map(([l, t, n, pode]) =>
            `<button type="button" class="ga-foco-b ga-pele-b" data-r="${q.k}:${l}" aria-pressed="false"${pode ? '' : ' disabled'}>${t ? `<kbd>${t}</kbd>` : ''}<b>${n}</b></button>`).join('')).join('') : '');
  }
  D.rostoP.hidden = !c || G.estado === 'rev' || G.estado === 'fim';
  const b0 = D.rostoP.querySelector('[data-r="rosto"]');
  if (b0){ b0.setAttribute('aria-pressed', String(on)); b0.querySelector('b').textContent = on ? 'Voltar à idade' : 'Mostrar no rosto'; }
  if (r) r.ctrl.forEach(q => { const n = r.pos[q.k], v = n === q.hoje ? 'hoje' : n > q.hoje ? 'mais' : 'menos';
    D.rostoP.querySelectorAll(`[data-r^="${q.k}:"]`).forEach(b => b.setAttribute('aria-pressed', String(on && b.dataset.r === q.k + ':' + v))); });
}
// o menu do toque (iPhone, quando a fala não deixa espaço para os botões): os mesmos controles, por cima do painel, fora do vídeo
function abreMenuRosto(){
  const c = riCena(); if (!c || !D) return;
  const r = riObj(c), on = !!(G.ri && G.ri.on);
  D.peleMenu.innerHTML = `<div class="ga-pm-topo"><button type="button" class="ga-pm-b zera" data-r="rosto">${on ? 'Voltar à idade' : 'Mostrar no rosto'}</button><button type="button" class="ga-pm-x" aria-label="Fechar">✕</button></div>` +
    (r ? '<div class="ga-pm-bs">' + `<button type="button" class="ga-pm-b" data-r="hoje">Tudo como hoje</button>` + r.ctrl.map(q => { const n = r.pos[q.k];
      return (q.min < q.hoje ? `<button type="button" class="ga-pm-b" data-r="${q.k}:menos" aria-pressed="${on && n < q.hoje}">${esc(q.curto)}: menos</button>` : '') +
        (q.max > q.hoje ? `<button type="button" class="ga-pm-b" data-r="${q.k}:mais" aria-pressed="${on && n > q.hoje}">${esc(q.curto)}: mais</button>` : ''); }).join('') + '</div>' : '');
  D.peleMenu.hidden = false; G.peleMenuAberto = true;
}
function riEstado(){
  const c = riCena(), r = c && riObj(c), S = G && G.ri;
  return { cena:!!c, id:c ? riId(c) : null, pronto:!!r, on:!!(S && S.on), k:S ? S.k : 0, pos:r ? { ...r.pos } : null, notas:r ? r.notas() : null, idade:r ? r.idade() : null, mostrado:S && S.cont ? S.cont.valor() : null,
    ctrl:r ? r.ctrl.map(q => ({ k:q.k, nome:q.nome, min:q.min, hoje:q.hoje, max:q.max, na_conta:q.na_conta })) : null, t:r ? { ...r._t } : null, sexo:c ? c.sexo || null : null, erro:RI.erro,
    painel:D ? [...D.rostoP.querySelectorAll('button[data-r]')].map(b => b.dataset.r + (b.getAttribute('aria-pressed') === 'true' ? '*' : '') + (b.disabled ? '-' : '')) : [], canvas:r ? r.canvas : null };
}
// a cena: a da idade de sempre; com o rosto ligado, o rosto entra por cima em 0,35 s (e sai do mesmo jeito)
function cenaIdadeRosto(ctx, c, t){
  const S = G.ri, r = c.rot ? null : riObj(c), agora = performance.now();
  if (S && r && !S.cont){ Object.assign(S, riNovo(r), { on:S.on }); botoesRosto(); }   // ligou enquanto o rosto carregava
  if (S && r && S.cont){ const dt = Math.min(100, Math.max(0, agora - (S.kUlt || agora))); S.kUlt = agora; const a = S.on ? 1 : 0; S.k = S.k < a ? Math.min(a, S.k + dt / 350) : Math.max(a, S.k - dt / 350); }
  const k = S && r && S.cont ? sai(S.k) : 0;
  if (k < 1) cenaIdade(ctx, c, t);
  if (k <= 0) return true;
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  cenaRosto(ctx, c, r, S, k, agora);
  return true;
}
const RQ = { x:89, y:344, w:542, h:620, sy:65, sh:511 };   // o rosto no quadro (corte da testa ao queixo, 447×511 da imagem)
function cenaRosto(ctx, c, r, S, k, agora){
  r.anda(agora, 450, 66);   // a imagem a ~15 quadros/s no meio da troca (a mistura leva ~20-30 ms); o vídeo segue a 30
  const n = S.cont.anda(agora);
  ctx.fillStyle = `rgba(4,7,6,${k.toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = k;
  // o rosto
  ctx.save(); caixa(ctx, RQ.x, RQ.y, RQ.w, RQ.h, 22); ctx.clip();
  try { ctx.drawImage(r.canvas, 0, RQ.sy, r.w, RQ.sh, RQ.x, RQ.y, RQ.w, RQ.h); } catch (e) { /* ok */ }
  ctx.restore();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.14)'; caixa(ctx, RQ.x, RQ.y, RQ.w, RQ.h, 22); ctx.stroke();
  // em cima: o rótulo e a idade grande (amarelo, a fonte do número da cena da idade)
  const sobe = (1 - k) * 26;
  ctx.textAlign = 'center'; ctx.fillStyle = AMARELO; ctx.font = `600 30px ${FONTE}`; ctx.fillText('Idade que este rosto aparenta', W / 2, 204);
  ctx.font = `700 112px ${MONO}`; const txt = String(n), nw = ctx.measureText(txt).width; ctx.fillText(txt, W / 2, 322 + sobe);
  ctx.textAlign = 'left'; ctx.fillStyle = APAGADO; ctx.font = `500 26px ${FONTE}`; ctx.fillText('anos', W / 2 + nw / 2 + 14, 280 + sobe);
  ctx.font = `600 19px ${FONTE}`; const sw = ctx.measureText('simulação').width + 20;
  caixa(ctx, W / 2 + nw / 2 + 12, 294 + sobe, sw, 30, 15); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText('simulação', W / 2 + nw / 2 + 22, 315 + sobe);
  // embaixo, à esquerda da câmera: cada sinal com a nota (3 traços); o último que ele mexeu acende
  const x0 = 24, xm = 300, larg = (G.mostraCam && G.cam ? CIRC.cx - CIRC.r - 16 : W - 24) - x0, passo = r.ctrl.length > 3 ? 40 : 46;
  let y = RQ.y + RQ.h + 40;
  r.ctrl.forEach(q => {
    const nt = r.pos[q.k], vivo = S.ult && S.ult.k === q.k ? Math.max(0, 1 - (agora - S.ult.t) / 1800) : 0;
    ctx.globalAlpha = k; ctx.textAlign = 'left';
    ctx.fillStyle = vivo > 0 ? '#fff' : 'rgba(255,255,255,.86)'; ctx.font = `${vivo > 0 ? 700 : 600} 25px ${FONTE}`; ctx.fillText(q.nome, x0, y);
    for (let i = 0; i < 3; i++){
      const cheio = i < nt;
      ctx.fillStyle = cheio ? (q.na_conta ? AMARELO : AZUL) : 'rgba(255,255,255,.16)';
      caixa(ctx, xm + i * 40, y - 15, 34, 12, 6); ctx.fill();
    }
    if (!q.na_conta){ ctx.fillStyle = APAGADO; ctx.font = `500 18px ${FONTE}`; ctx.fillText('não muda a idade', xm, y + 18); }
    if (vivo > 0){ ctx.globalAlpha = k * vivo; ctx.fillStyle = AMARELO; ctx.beginPath(); ctx.moveTo(x0 - 16, y - 18); ctx.lineTo(x0 - 6, y - 10); ctx.lineTo(x0 - 16, y - 2); ctx.fill(); }
    y += passo + (q.na_conta ? 0 : 6);
  });
  ctx.globalAlpha = k; ctx.fillStyle = APAGADO; ctx.font = `500 19px ${FONTE}`; ctx.textAlign = 'left';
  quebra(ctx, 'Rosto de exemplo, criado por IA. Simulação, não é previsão.', Math.min(larg, 420), 2).forEach((l, i, ls) => ctx.fillText(l, x0, H - 18 - (ls.length - 1 - i) * 24));
  ctx.globalAlpha = 1;
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
    textura_poros:[{ x:P[205].x + .04 * i, y:P[205].y - .10 * i }, { x:P[425].x - .04 * i, y:P[425].y - .10 * i }],   // 17/11: bochecha perto do nariz (poros)
    flacidez:[m(172, 150, 136), m(397, 379, 365)] } };
}
const escala = (f, z) => f.bw / f.img.naturalWidth * z.s;
const naTela = (f, p, z = f.z) => { const a = escala(f, z); return { x:z.ox + p.x * a, y:z.oy + p.y * a }; };
function arrumaLupas(c, f){
  const z = f.base, r = lim(.3 * G.rosto.iod * escala(f, z), R_LUPA[0], R_LUPA[1]), cam = G.mostraCam && G.cam;
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
    ctx.font = `700 32px ${FONTE}`;
    const w = Math.ceil(ctx.measureText(q.nome).width) + 36, h = 60, dir = q.d.x <= W / 2 ? 1 : -1;   // 14/11: só o nome (o grau fica no botão dele)
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
// 14/11 (o Lucca: "só o wrapper para eu colocar o foco em cima e falar"): nada aparece sozinho. As regiões são botões no painel
// dele (e as teclas 1, 2, 3; ou um toque no ponto do rosto); a que ele escolhe entra no vídeo: a lupa e o nome, sem o grau.
function cenaFoto(ctx, c, agora){
  const R0 = G.rosto, f = G.fotos[G.foto];
  G.lupasVis = []; G.lupasPos = [];
  if (!R0 || R0.estado !== 'ok' || G.foto !== R0.k || !f || !f.img || !c.lupas || !c.lupas.length) return false;
  const chave = G.bloco + ':' + (G.mostraCam && G.cam ? 1 : 0);
  if (!G.lupasLay || G.lupasLay.chave !== chave) G.lupasLay = { chave, ...arrumaLupas(c, f) };
  const L = G.lupasLay, a = escala(f, f.z);
  const pos = q => { const raw = naTela(f, q.p); return { x:lim(raw.x, L.r + 10, W - L.r - 10), y:lim(raw.y, TOPO + L.r + 10, H - L.r - 10) }; };
  G.lupasPos = L.postos.map(q => ({ id:q.id, ...pos(q), r:L.r }));   // onde tocar no rosto
  const q = G.foco && L.postos.find(x => x.id === G.foco);
  if (!q) return L.postos.length > 0;   // sem foco: a foto limpa (e sem a faixa verde)
  const t = agora - (G.focoT || 0), { x, y } = pos(q);
  const v = { q, x, y, g:sai(t / 300), gl:sai((t - 200) / 220), gr:sai((t - 320) / 200) };
  G.lupasVis = [{ id:q.id, x, y, r:L.r, img:q.p, nivel:q.nivel, nome:q.nome }];   // para conferir (teste)
  const al = .5 * sai(t / 300);
  ctx.fillStyle = `rgba(4,7,6,${al.toFixed(3)})`; ctx.beginPath(); ctx.rect(0, 0, W, H);
  const rr = L.r * v.g; ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  lupa(ctx, f, v, L.r, a);
  return true;
}
function focar(id){
  if (!G || !['prep', 'conta', 'rec'].includes(G.estado)) return;
  const c = (G.o.blocos[G.bloco] || {}).cena; if (!c || c.tipo !== 'foto' || !(c.lupas || []).some(l => l.id === id)) return;
  if (G.rosto && G.rosto.estado === 'ok' && G.foto !== G.rosto.k){ G.foto = G.rosto.k; G.anel = null; D.fotos.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.f === G.foto))); }   // as lupas são da foto de frente
  G.foco = G.foco === id ? null : id; G.focoT = performance.now();
  if (G.foco) G.focos = (G.focos || 0) + 1;
  botoesFoco(); nota();
}
function botoesFoco(){
  const c = (G.o.blocos[G.bloco] || {}).cena, ls = c && c.tipo === 'foto' ? c.lupas || [] : [];
  const k = G.bloco + '|' + ls.map(l => l.id).join(',');
  if (D.foco.dataset.k !== k){
    D.foco.dataset.k = k;
    D.foco.innerHTML = ls.map((l, i) => `<button type="button" class="ga-foco-b" data-id="${esc(l.id)}" aria-pressed="false"><kbd>${i + 1}</kbd><b>${esc(l.nome)}</b><small>${esc(GRAU[l.nivel] || '')}</small></button>`).join('');
  }
  D.foco.hidden = !ls.length || G.estado === 'rev' || G.estado === 'fim';
  D.foco.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === G.foco)));
}
// pedaço da imagem com a origem dentro dos limites (o Safari não desenha nada se a origem sai da imagem)
function pedaco(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh){
  const iw = img.naturalWidth, ih = img.naturalHeight, kx = dw / sw, ky = dh / sh;
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy), x1 = Math.min(iw, sx + sw), y1 = Math.min(ih, sy + sh);
  if (x1 - x0 < 1 || y1 - y0 < 1) return;
  ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, dx + (x0 - sx) * kx, dy + (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}
function lupa(ctx, f, v, r0, a){
  const r = r0 * v.g, { x, y } = v, q = v.q, cor = AMARELO;   // 14/11: uma cor só (o grau não vai ao vídeo)
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
  ctx.fillStyle = '#fff'; ctx.font = `700 32px ${FONTE}`; ctx.fillText(q.nome, bx + 18, by + 13);
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
  if (c.pele && cenaPeleDentro(ctx, c, t)) return true;   // 18/11: a pele interativa; sem ela carregada, os ícones de antes
  const hs = (c.habitos || []).slice(0, 3); if (!hs.length) return false;
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
  return true;
}

// desejo: cartão "O que importa aos {idade}" com 3 itens (o "t" do arquivo da pesquisa) e as fontes curtas no pé; sem itens, nada no canvas (a nota avisa)
function cenaDesejo(ctx, c, t){
  const its = (c.itens || []).slice(0, 3); if (!its.length) return false;
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
  return true;
}

// exemplo (13/11, d-20261113-exemplos-por-imagem): a imagem do estudo só recortada pelo kit (nenhuma outra edição), grande:
// entre a faixa do nome e a câmera, na largura toda. Dois jeitos, o que der a imagem maior (3º treino: a faixa dos olhos saiu
// com 60 px e ele não entendeu):
//  - inteira (lado a lado, como no estudo), com a legenda grande embaixo de cada painel;
//  - em pé: os painéis do kit (paineis > 1) um embaixo do outro, cada um com a sua legenda;
//  - grade (3 ou 4 painéis): 2 colunas.
// Vale a que enche ≥ 55% da altura sem encolher o painel mais que 30%; senão, a maior (a faixa dos olhos e as tomografias
// ficam em pé; as gêmeas, inteiras na largura toda).
// No pé, ao lado da câmera, pequenos: a nota da tela, o crédito e "Varia de pessoa para pessoa.". Entra em 0,4 s.
const EX = { y0:TOPO + 8, leg:84, legPe:56, gap:14 };
function layoutExemplo(c, img){
  const r = c.recorte || { x:0, y:0, w:100, h:100 }, nw = img.naturalWidth, nh = img.naturalHeight;
  const sx = r.x / 100 * nw, sy = r.y / 100 * nh, sw = Math.max(1, r.w / 100 * nw), sh = Math.max(1, r.h / 100 * nh);
  const y1 = CIRC.cy - CIRC.r - 12, alto = y1 - EX.y0, leg = (c.legenda || []).filter(Boolean), n = Math.max(1, Math.min(4, +c.paineis || 1));
  // inteira
  const sA = Math.min(W / sw, (alto - (leg.length ? EX.leg : 0)) / sh), wA = sw * sA, hA = sh * sA;
  const A = { modo:'inteira', h:hA + (leg.length ? EX.leg : 0), area:wA * hA / n,
    paineis:[{ sx, sy, sw, sh, dx:(W - wA) / 2, dy:0, dw:wA, dh:hA }],
    legs:n < 2 && leg.length > 1 ? [{ t:leg.join(' × '), cx:W / 2, y:hA + 12, larg:W - 48, linhas:2 }]   // gráfico: a legenda é do eixo ou das curvas, não de painel
      : leg.map((t, k) => ({ t, cx:(W - wA) / 2 + wA * (k + .5) / Math.max(1, leg.length), y:hA + 12, larg:Math.max(150, wA / Math.max(1, leg.length) - 16), linhas:2 })) };
  if (n < 2) return A;
  // em pé
  const pw = sw / n, cada = (alto - n * (leg.length ? EX.legPe : 0) - (n - 1) * EX.gap) / n, sB = Math.min(W / pw, cada / sh), wB = pw * sB, hB = sh * sB;
  const B = { modo:'em pé', area:wB * hB, h:n * hB + (n - 1) * EX.gap + n * (leg.length ? EX.legPe : 0), paineis:[], legs:[] };
  for (let k = 0, y = 0; k < n; k++){
    B.paineis.push({ sx:sx + k * pw, sy, sw:pw, sh, dx:(W - wB) / 2, dy:y, dw:wB, dh:hB });
    if (leg[k]) B.legs.push({ t:leg[k], cx:W / 2, y:y + hB + 8, larg:W - 48, linhas:1 });
    y += hB + (leg.length ? EX.legPe : 0) + EX.gap;
  }
  const cand = [A, B];
  // grade: 3 ou 4 painéis em 2 colunas (a última linha com 1 painel fica no meio)
  if (n >= 3){
    const lin = Math.ceil(n / 2), cadaG = (alto - lin * (leg.length ? EX.leg : 0) - (lin - 1) * EX.gap) / lin, sC = Math.min((W - EX.gap) / 2 / pw, cadaG / sh), wC = pw * sC, hC = sh * sC;
    const C = { modo:'grade', area:wC * hC, h:lin * hC + (lin - 1) * EX.gap + lin * (leg.length ? EX.leg : 0), paineis:[], legs:[] };
    for (let k = 0; k < n; k++){
      const li = Math.floor(k / 2), so = k === n - 1 && n % 2 === 1, x = so ? (W - wC) / 2 : W / 2 + (k % 2 ? EX.gap / 2 : -EX.gap / 2 - wC), y = li * (hC + (leg.length ? EX.leg : 0) + EX.gap);
      C.paineis.push({ sx:sx + k * pw, sy, sw:pw, sh, dx:x, dy:y, dw:wC, dh:hC });
      if (leg[k]) C.legs.push({ t:leg[k], cx:x + wC / 2, y:y + hC + 8, larg:Math.max(150, wC), linhas:2 });
    }
    cand.push(C);
  }
  // a maior imagem; entre as que enchem ≥ 55% da altura sem encolher mais que 30%, a maior delas
  const maior = cand.reduce((a, b) => b.area > a.area ? b : a), cheias = cand.filter(x => x.h >= .55 * H && x.area >= .7 * maior.area);
  return cheias.length ? cheias.reduce((a, b) => b.area > a.area ? b : a) : maior;
}
function cenaExemplo(ctx, c, t){
  const img = c.img; if (!img || !img.naturalWidth) return false;
  const L = c.lay || (c.lay = layoutExemplo(c, img)), p = sai(t / 400), y1 = CIRC.cy - CIRC.r - 12;
  const top = EX.y0 + Math.max(0, (y1 - EX.y0 - L.h) / 2);   // centrado na vertical, entre o nome e a câmera
  escurece(ctx, p);   // fundo liso: nada do quadro de baixo aparece por trás
  ctx.globalAlpha = p;
  for (const q of L.paineis){ try { ctx.drawImage(img, q.sx, q.sy, q.sw, q.sh, q.dx, top + q.dy, q.dw, q.dh); } catch (e) { /* imagem ainda não pronta */ } }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.font = `700 34px ${FONTE}`;
  for (const l of L.legs) quebra(ctx, l.t, l.larg, l.linhas).forEach((s, i) => ctx.fillText(s, l.cx, top + l.y + i * 38));
  // pé: ao lado da câmera, pequeno
  ctx.textAlign = 'left'; ctx.fillStyle = APAGADO; ctx.font = `500 20px ${FONTE}`;
  const xP = 24, larg = CIRC.cx - CIRC.r - 16 - xP, pe = [...(c.nota ? quebra(ctx, c.nota, larg, 2) : []), ...(c.credito ? quebra(ctx, c.credito, larg, 2) : []), 'Varia de pessoa para pessoa.'];
  let yP = Math.max(y1 + 14, top + L.h + 10);
  pe.forEach(l => { ctx.fillText(l, xP, yP); yP += 26; });
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  return true;
}

// 17/11 (o Lucca, print do quadro "Como o contorno muda": "até hoje essa animação tá uma merda, pode usar o Codex"; 14/11: o
// desenho de traço em canvas foi "lixo total"; memória feedback-asset-real-nao-desenho): COMO SE FORMA vira ILUSTRAÇÃO de
// qualidade (3D de atlas, gerada pelo Codex, consulta/forma/), com 2 quadros por sinal: A (antes) → B (como se forma), que
// se fundem em ~1,4 s com um zoom lento (~3 s). tema = linhas | manchas | firmeza | textura | olheira (index.html cenaPI).
// No pé: "Ilustração. Varia de pessoa para pessoa." (nunca resultado de paciente). As fontes da fala estão no estoque
// (pele-idade.mecanismo.f). Sem a imagem carregada, nada no canvas: o aviso é só DOM (nota) e a faixa do bloco entra.
// 18/11 (o Lucca: "animação ruim, instantânea, não dá para entender"; "é o sol que causa os vincos? não seria a contração
// muscular repetitiva?"): COMO SE FORMA EM ETAPAS, com o esquema realista aprovado (v4: atlas pintado, consulta/forma/<tema>-eN)
// e, no canto de baixo, o mesmo ponto "no espelho" (v3, <tema>-fN). Cada etapa entra na palavra dela da fala (posição da palavra
// ÷ 2,5 palavras/s; no mínimo 2,2 s por etapa), com fusão de 0,8 s, o número da etapa, a legenda curta e um rótulo com seta no
// lugar exato. Na LINHA, primeiro o músculo contrai e solta 3 vezes (a pele dobra e volta), depois o colágeno devolve, depois a
// rede afina, e por fim a dobra fica com o rosto parado (quadros linhas-m1..m4, Codex 18/11). Ele também controla: teclas 1–4
// pulam para a etapa, e o toque na ilustração passa para a seguinte (aí o tempo da fala deixa de mandar naquele bloco).
// No pé: "Ilustração. Varia de pessoa para pessoa." Sem a imagem carregada, nada no canvas: o aviso é só DOM (nota).
const FORMA = {
  linhas:{ q:['linhas-m1', 'linhas-m2', 'linhas-m3', 'linhas-m4'], f:['linhas-f1', 'linhas-f2', 'linhas-f3'], fs:{ m:['linhas-f1-m', 'linhas-f2-m', 'linhas-f3-m'] }, et:[
    { q:0, pulsa:1, f:0, chave:/m[úu]sculo|mexe/i, leg:'O músculo puxa: a pele dobra e volta', rot:'músculo contrai', a:[.5, .93], p:[.06, .68] },
    { q:0, de:1, f:0, chave:/devolve/i, leg:'Pele nova: o colágeno devolve', rot:'colágeno firme', a:[.55, .5], p:[.5, .7] },   // a dobra se desfaz (m2 → m1)
    { q:2, f:1, chave:/afina/i, leg:'Sol e anos: a rede afina', rot:'rede afinou', a:[.55, .5], p:[.5, .7] },
    { q:3, f:2, chave:/parad|marcad|fica/i, leg:'A dobra fica, com o rosto parado', rot:'a dobra ficou', a:[.5, .37], p:[.58, .06] }] },
  manchas:{ q:['manchas-e1', 'manchas-e2', 'manchas-e3'], f:['manchas-f1', 'manchas-f2', 'manchas-f3'], et:[
    { q:0, f:0, chave:/c[ée]lula|pigmento/i, leg:'A célula que fabrica o pigmento', rot:'célula do pigmento', a:[.5, .46], p:[.06, .72] },
    { q:1, f:1, chave:/a mais|luz/i, leg:'A luz faz fabricar a mais', rot:'pigmento a mais', a:[.5, .46], p:[.5, .72] },
    { q:2, f:2, chave:/sobe|aparece/i, leg:'O pigmento sobe: a mancha', rot:'a mancha', a:[.5, .3], p:[.55, .06] }] },
  firmeza:{ q:['firmeza-e1', 'firmeza-e2', 'firmeza-e3'], f:['firmeza-f1', 'firmeza-f2', 'firmeza-f3'], fs:{ f:['firmeza-f1-f', 'firmeza-f2-f', 'firmeza-f3-f'] }, et:[
    { q:0, f:0, chave:/col[áa]geno|contorno/i, leg:'Osso e gordura sustentam o rosto', rot:'gordura em bolsões', a:[.55, .4], p:[.04, .06] },
    { q:1, f:1, chave:/desce/i, leg:'A gordura desce e murcha', rot:'desceu', a:[.55, .55], p:[.04, .06] },
    { q:2, f:2, chave:/vinco|mand[íi]bula/i, leg:'Vinco fundo, mandíbula sem desenho', rot:'vinco', a:[.4, .6], p:[.04, .7] }] },
  textura:{ q:['textura-e1', 'textura-e2', 'textura-e3'], f:['textura-f1', 'textura-f2', 'textura-f3'], et:[
    { q:0, f:0, chave:/poro/i, leg:'O poro: a saída do óleo', rot:'glândula de óleo', a:[.54, .6], p:[.6, .72] },
    { q:1, f:1, chave:/mais [óo]leo|maior/i, leg:'Mais óleo, poro maior', rot:'poro', a:[.47, .27], p:[.55, .06] },
    { q:2, f:2, chave:/sol|[áa]spera/i, leg:'Sol de anos: superfície áspera', rot:'superfície áspera', a:[.3, .27], p:[.04, .06] }] },
  olheira:{ q:['olheira-e1', 'olheira-e2', 'olheira-e3'], f:['olheira-f1', 'olheira-f2', 'olheira-f3'], fs:{ m:['olheira-f1-m', 'olheira-f2-m', 'olheira-f3-m'] }, et:[
    { q:0, f:0, chave:/fina/i, leg:'Embaixo do olho, a pele é fina', rot:'pele fina', a:[.3, .31], p:[.04, .06] },
    { q:1, f:1, chave:/pigmento/i, leg:'Pigmento a mais por baixo', rot:'pigmento', a:[.35, .33], p:[.4, .06] },
    { q:2, f:2, chave:/vasinhos|escura/i, leg:'Os vasinhos aparecem: escurece', rot:'vasinhos', a:[.3, .43], p:[.4, .72] }] },
};
const FORMA_IMG = Object.fromEntries(Object.entries(FORMA).map(([k, v]) => [k, [...v.q, ...v.f].map(n => 'forma/' + n + '.webp')]));
const FORMA_CACHE = new Map();   // caminho → { img, ok, erro }: as ilustrações são do próprio site (mesma origem, o canvas não fica "sujo")
function carregaForma(src){
  let e = FORMA_CACHE.get(src); if (e) return e;
  e = { img:new Image(), ok:false, erro:false }; FORMA_CACHE.set(src, e);
  e.img.decoding = 'async';
  e.img.onload = () => { e.ok = !!e.img.naturalWidth; if (G) nota(); };
  e.img.onerror = () => { e.erro = true; if (G) nota(); };
  e.img.src = src;
  return e;
}
const formasDe = bs => (bs || []).map(b => b && b.cena).filter(c => c && c.tipo === 'mecanismo' && FORMA_IMG[c.tema]);
// 18/11 noite (o Lucca: o "no espelho" da linha era olho de mulher para o Samuel): a foto é do mesmo sexo do lead (fs[sexo]); sem a
// foto daquele sexo carregada, o "no espelho" não aparece (nunca a do outro sexo)
const fotosForma = c => { const F = FORMA[c.tema]; return (F.fs && F.fs[c.sexo]) || F.f; };
const preparaFormas = bs => formasDe(bs).forEach(c => [...FORMA[c.tema].q, ...fotosForma(c)].forEach(n => carregaForma('forma/' + n + '.webp')));
const FQ = { x:24, y:252, w:672, h:448, r:22, ex:24, ey:756, ew:396, eh:264 };   // o esquema (3:2) e "no espelho" embaixo, à esquerda da câmera
// a hora (ms desde o começo do bloco) de cada etapa: a palavra-chave na fala a 2,5 palavras/s, no mínimo 2,2 s entre etapas
function horasForma(F, fala, ritmo){
  const ps = String(fala || '').replace(/\[[^\]]*\]/g, ' ').split(/\s+/).filter(Boolean), r = ritmo || PADRAO.ritmo, hs = [];
  let ini = 0;
  F.et.forEach((e, k) => {
    let i = -1; for (let j = ini; j < ps.length; j++) if (e.chave.test(ps.slice(j, j + 2).join(' '))){ i = j; break; }
    let h = i >= 0 ? Math.max(0, i / r * 1000 - 300) : (k ? null : 0);
    if (i >= 0) ini = i + 1;
    hs.push(h);
  });
  const tot = Math.max(ps.length / r * 1000, 2200 * F.et.length);
  hs.forEach((h, k) => { if (h == null) hs[k] = k ? hs[k - 1] + 2200 : 0; });
  hs[0] = Math.min(hs[0], 4000);   // a 1ª etapa entra logo (o título já está na tela)
  for (let k = 1; k < hs.length; k++) hs[k] = Math.max(hs[k], hs[k - 1] + 2200);
  return hs.map(h => Math.min(h, tot));
}
function formaEtapa(c, t){
  const F = FORMA[c.tema], M = G.formaMan;
  if (M && M.bloco === G.bloco) return { k:M.k, te:performance.now() - M.t, hs:null };
  const hs = c._hs || (c._hs = horasForma(F, (G.o.blocos[G.bloco] || {}).fala, G.p && G.p.ritmo));
  let k = 0; for (let i = 0; i < hs.length; i++) if (t >= hs[i]) k = i;
  return { k, te:t - hs[k], hs };
}
function formaPula(k){   // tecla 1–4 (k = etapa) ou toque (k = null: a seguinte)
  const c = (G.o.blocos[G.bloco] || {}).cena; if (!c || c.tipo !== 'mecanismo' || !FORMA[c.tema]) return false;
  const n = FORMA[c.tema].et.length, at = formaEtapa(c, performance.now() - (G.blocoT || 0)).k;
  const alvo = k == null ? Math.min(n - 1, at + 1) : lim(k, 0, n - 1);
  G.formaMan = { bloco:G.bloco, k:alvo, t:performance.now(), de:at }; G.formaUsos = (G.formaUsos || 0) + 1; G.formaUlt = performance.now();
  return true;
}
function cenaMecanismo(ctx, c, t){
  const F = FORMA[c.tema]; if (!F) return false;
  const im = n => carregaForma('forma/' + n + '.webp'), q0 = im(F.q[0]);
  if (!q0.ok) return false;
  const ent = sai(t / 400), { k, te } = formaEtapa(c, t), E = F.et[k], M = G.formaMan && G.formaMan.bloco === G.bloco ? G.formaMan : null;
  const ant = k > 0 ? F.et[k - 1] : null, deQ = E.de != null ? E.de : M ? F.et[M.de].q : ant ? ant.q : E.q, fus = sai(te / (E.de != null ? 1400 : 800));
  escurece(ctx, .94 * sai(t / 250));
  ctx.globalAlpha = ent; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; ctx.font = `700 44px ${FONTE}`; ctx.fillText(quebra(ctx, c.titulo || '', 640, 1)[0] || '', 40, 212);
  ctx.fillStyle = AMARELO; ctx.fillRect(40, 230, 64, 3);
  // o esquema: fusão da etapa anterior para a atual; no músculo, contrai e solta 3 vezes (a pele dobra e volta)
  const { x, y, w, h, r } = FQ;
  ctx.save(); caixa(ctx, x, y, w, h, r); ctx.clip();
  ctx.fillStyle = '#0b100e'; ctx.fillRect(x, y, w, h);
  const quadro = (qi, al) => { const e = im(F.q[qi]); if (al <= 0 || !e.ok) return; ctx.globalAlpha = ent * al; try { ctx.drawImage(e.img, x, y, w, h); } catch (er) { /* ok */ } };
  if (E.pulsa){
    quadro(E.q, 1);
    const p = (1 - Math.cos(2 * Math.PI * (te / 1000) / 1.3)) / 2;   // contrai e solta enquanto ele fala do músculo
    quadro(1, p);
  } else { if (fus < 1) quadro(deQ, 1); quadro(E.q, fus); }
  ctx.restore();
  ctx.globalAlpha = ent; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.14)'; caixa(ctx, x, y, w, h, r); ctx.stroke();
  // o rótulo com seta no ponto que muda (entra 0,4 s depois da etapa)
  rotuloPele(ctx, E.rot, x, y, E.a, E.p, AMARELO, ent * sai((te - 400) / 400));
  // a legenda da etapa: o número e a frase curta
  const yl = y + h + 42;
  ctx.globalAlpha = ent * sai(te / 300); ctx.font = `700 30px ${FONTE}`; ctx.fillStyle = AMARELO; ctx.textAlign = 'left';
  const num = `${k + 1}/${F.et.length}`; ctx.fillText(num, x, yl);
  const nw = ctx.measureText(num).width + 14; ctx.fillStyle = '#fff'; ctx.font = `650 30px ${FONTE}`;
  ctx.fillText(quebra(ctx, E.leg, w - nw, 1)[0] || '', x + nw, yl);
  // "no espelho": a foto do mesmo ponto, embaixo à esquerda, acompanhando a etapa
  const FF = fotosForma(c), fa = im(FF[E.f]), fb = ant ? im(FF[ant.f]) : null;
  if (fa.ok){
    const { ex, ey, ew, eh } = FQ;
    ctx.save(); caixa(ctx, ex, ey, ew, eh, 16); ctx.clip();
    const pf = (e, al) => { if (!e || !e.ok || al <= 0) return; ctx.globalAlpha = ent * al; const iw = e.img.naturalWidth, ih = e.img.naturalHeight, s = Math.max(ew / iw, eh / ih); try { ctx.drawImage(e.img, ex + (ew - iw * s) / 2, ey + (eh - ih * s) / 2, iw * s, ih * s); } catch (er) { /* ok */ } };
    if (fb && fb !== fa && fus < 1) pf(fb, 1);
    pf(fa, fb && fb !== fa ? fus : 1);
    ctx.restore();
    ctx.globalAlpha = ent; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.2)'; caixa(ctx, ex, ey, ew, eh, 16); ctx.stroke();
    tagPele(ctx, 'no espelho', ex + 10, ey + 10, '#fff');
  }
  // pé: ao lado da câmera
  ctx.globalAlpha = ent; ctx.fillStyle = APAGADO; ctx.font = `500 22px ${FONTE}`; ctx.textAlign = 'left';
  ctx.fillText('Ilustração. Varia de pessoa para pessoa.', 24, CIRC.cy - CIRC.r + 44);
  ctx.globalAlpha = 1;
  G.formaVis = { tema:c.tema, k, n:F.et.length };   // para conferir (teste)
  return true;
}
// ---------- 18/11: a PELE INTERATIVA ----------
// Pedido do Lucca (18/11): em "De fora e de dentro" e "O caminho", "uma pele realista tomando sol de fora, e eu ter a opção de
// colocar um protetor que bloqueia o sol, ou tirá-lo, e isso poderia regenerar a pele (mini animações, e eu conseguindo
// mudá-las…, cada componente pode ajudar a pele, ou destruí-la de formas específicas)"; no caminho, "inflamação poderia ser
// açúcar, industrializados, sono, metabolismo, hormônios, estresse". Desenho aprovado (livowa-empresa/tarefas/
// gravador-pontos-e-copy-1711/pele-interativa/desenho.md): o mesmo corte da bochecha em 14 quadros (Codex, consulta/pele/),
// e a pele mostrada = base + Σ peso × (quadro − base), calculada por pixel (672×448) só quando os pesos mudam.
//  - máx. 2 GRUPOS somados; com 3 ou mais, em cada faixa (ar, epiderme, derme de cima, derme funda, gordura) manda só o de
//    efeito maior (o teste com 3 somados borrou); a passagem da soma para as faixas acompanha o peso do 3º (sem salto);
//  - o tamanho segue o peso em anos de rosto (cada quadro já foi desenhado no tamanho dele) e o tempo vira a velocidade:
//    sono em 1 s (uma noite), açúcar em 2 etapas (acucar → acucar-anos, 3 s), o resto em ~2 s;
//  - ao desligar, o resíduo do "volta?": sol sem protetor volta à base; com dano e protetor → sol-volta (volta em parte);
//    cigarro e peso ficam em até 30%; açúcar e hormônios param onde estão; estresse fica em 50% e a parte do sono some;
//  - o protetor é um interruptor por cima do sol (sem dano: o sol cai a 10%; com cor, a 0); "pele morena" (M) mostra a
//    mancha que a luz visível escurece sob o protetor comum e que clareia um pouco com o protetor com cor.
// Os controles são dele: botões no painel (fora do vídeo), teclas (1–9, 0, M, R; no caminho P e 1–6) e toque nos rótulos
// desenhados sob a pele. O que entra no vídeo: a pele, os rótulos ligados/desligados, a frase curta do último toque (sem
// promessa) e "Ilustração. Varia de pessoa para pessoa.".
const PELE_SRC = n => 'pele/' + n + '.webp';
// 18/11 tarde (o Lucca, no ar: "o sol tá muito fraquinho, o protetor normal está tirando as manchas escuras, as mudanças precisam
// ser mais intensas, e os problemas de dentro sempre têm a mesma animação"): vale MAIS VISÍVEL, MESMO EXAGERANDO (o peso real ele
// explica na fala). Quadros fortes do Codex (-forte), o dano do sol FICA (o protetor só segura o sol novo), a mancha da pele morena
// CRESCE sob o protetor comum, e cada fator de dentro tem a sua animação e o seu rótulo no lugar exato.
const PELE_Q = ['base', 'sol-forte', 'protetor', 'protetor-cor', 'morena-protetor', 'morena-forte', 'morena-cor', 'morena-forte-cor', 'cigarro-forte', 'sono-forte', 'estresse-forte', 'acucar', 'acucar-forte', 'menopausa-forte', 'peso-forte'];
const PELE_GRUPO = { 'sol-forte':'sol', protetor:'filme', 'protetor-cor':'filme', 'morena-protetor':'filme', 'morena-forte':'filme', 'morena-cor':'filme', 'morena-forte-cor':'filme', 'cigarro-forte':'cig', 'sono-forte':'sono', 'estresse-forte':'est', acucar:'acu', 'acucar-forte':'acu', 'menopausa-forte':'horm', 'peso-forte':'peso' };
const PELE_FX = { filme:[['ar', 'epi'], 2], sol:[['ar', 'epi', 'dc'], 1], cig:[['ar', 'epi', 'dc', 'df'], .9], peso:[['epi', 'dc', 'df', 'gor'], .7], horm:[['dc', 'df', 'gor'], .6], acu:[['dc', 'df'], .5], sono:[['epi', 'dc', 'df'], .4], est:[['epi', 'dc'], .3] };
const PELE_FAIXA = { ar:[-1, .264], epi:[.264, .342], dc:[.342, .508], df:[.508, .742], gor:[.742, 2] }, PELE_PENA = .025;   // em fração da altura (medido nos quadros)
const PELE_VEL = { 'sol-forte':2000, protetor:1200, 'protetor-cor':1200, 'cigarro-forte':2000, 'sono-forte':900, 'estresse-forte':1800, 'menopausa-forte':2000, 'peso-forte':2000 };   // ms de 0 a 1
const PELE_GANHO = { 'cigarro-forte':.72 };   // quanto do quadro (1 = o quadro); os -forte já vêm exagerados; o do cigarro inteiro apagava a derme num bloco cinza-oliva
const PELE_ACU_MS = 1500;   // açúcar: 1,5 s por etapa
// os fatores: nome no rótulo, se estraga (laranja) ou protege (verde), e a frase de ligar/desligar (o tempo vai na frase)
// 18/11 (o Lucca: "animações interativas que posso explicar a causa de texturas, porque o protetor não protege de manchas, o
// que vem do sangue que prejudica a pele"): a frase de cada toque diz o MECANISMO (1 a 3 linhas, sem promessa), e os de dentro
// chegam pelos vasos (o pulso que corre na artéria e na veia antes de a pele mudar)
const PELE_F = {
  sol:{ nome:'Sol', mal:true }, prot:{ nome:'Protetor' }, cor:{ nome:'Protetor com cor', curto:'Com cor' }, mor:{ nome:'Pele morena', painel:'Pele morena (mancha)' },
  cig:{ nome:'Cigarro', mal:true, on:'A fumaça estreita os vasinhos e quebra o colágeno: a pele fica opaca e mais fina, em anos.', off:'Parar segura o avanço. Se o que foi perdido volta, não se sabe.' },
  acu:{ nome:'Açúcar', mal:true, sangue:[255, 186, 60], on:'O açúcar alto chega pelo sangue e gruda no colágeno: ele endurece e amarela, devagar, em anos.', off:'Baixar a glicose segura o avanço. O que endureceu fica.' },
  ind:{ nome:'Industrializados', mal:true, sangue:[255, 186, 60], on:'Comida ultraprocessada sobe a glicose: o mesmo caminho do açúcar, mais fraco.', off:'Baixar a glicose segura o avanço. O que endureceu fica.' },
  sono:{ nome:'Sono', mal:true, sangue:[140, 185, 255], on:'Noite curta: o sangue circula pior, a pele fica pálida e apagada no dia seguinte. Volta quando você dorme.', off:'Dormir bem devolve.' },
  est:{ nome:'Estresse', mal:true, sangue:[205, 140, 255], on:'O estresse mexe no sono e no cortisol, que chegam pela circulação: a barreira de cima afina.', off:'O sono volta. O resto, não se sabe.' },
  horm:{ nome:'Hormônios', mal:true, sangue:[255, 140, 205], on:'Na menopausa cai o estrogênio do sangue: a derme afina 1 a 2% ao ano.', off:'O que afinou fica.' },
  peso:{ nome:'Peso', painel:'Peso (metabolismo)', mal:true, sangue:[255, 214, 90], on:'Perda grande e rápida: a gordura de baixo murcha e a pele de cima ondula.', off:'Parar segura. O que se cuida é o ritmo da perda e o músculo.' },
};
// o que cada fator de dentro move, e a espera do pulso no vaso antes de a pele mudar
const PELE_SANGUE_Q = { acu:['g'], ind:['g'], sono:['sono-forte'], est:['estresse-forte', 'sono-forte'], horm:['menopausa-forte'], peso:['peso-forte'] }, PELE_PULSO_MS = 900, PELE_ESPERA = 500;   // o pulso no vaso é só a entrada (0,5 s, cor própria); depois cada um mostra o que estraga
// as entradas (18/11 tarde): ilustração pintada (Codex, consulta/pele/e-<id>.webp, fundo transparente) ou a palavra, por ~1 s
const PELE_ENTRADA_MS = 1000;
const PELE_ENTRA = { sol:{ img:'e-sol', fica:'sol' }, prot:{ img:'e-protetor', fica:'canto' }, cor:{ img:'e-protetor-cor', fica:'canto' }, cig:{ img:'e-cigarro', fica:'canto' },
  acu:{ img:'e-acucar', fica:'vaso' }, ind:{ img:'e-industrializados', fica:'vaso' },
  est:{ txt:'estresse' }, sono:{ txt:'noite mal dormida' }, horm:{ txt:'menopausa' }, peso:{ txt:'perda de peso rápida' } };
const PELE_ENTRA_Q = { sol:['sol-forte'], prot:['protetor'], cor:['protetor-cor'], cig:['cigarro-forte'] };   // a pele espera a entrada
// 18/11 noite (gravação do Lucca com o Samuel, 39, homem: "menopausa não faz sentido nenhum, você é homem"; "cadê o açúcar?"):
// o painel tem ORDEM FIXA, a da fala (sol, protetor, com cor, cigarro, açúcar, industrializados, sono, estresse, peso) com a tecla
// à vista; hormônios só para mulher (ou sem o sexo); "Voltar ao normal" (R) primeiro.
const PELE_TECLAS = {
  dentro:[['sol', '1'], ['prot', '2'], ['cor', '3'], ['cig', '4'], ['acu', '5'], ['ind', '6'], ['sono', '7'], ['est', '8'], ['peso', '9'], ['horm', '0'], ['zerar', 'R']],
  caminho:[['abrir', 'P'], ['acu', '1'], ['ind', '2'], ['sono', '3'], ['est', '4'], ['peso', '5'], ['horm', '6'], ['zerar', 'R']] };
const teclasPele = c => (PELE_TECLAS[c.pele.modo] || []).filter(([id]) => !(id === 'horm' && c.pele.sexo === 'm'));
// 18/11 noite, REGRA DO LUCCA: UM FATOR POR VEZ ("empilhar fatores ruins… seriam muitas combinações; cada fator ruim é a pele boa
// e aquele fator isolado"). Os ruins são exclusivos: tocar noutro troca (base → o novo), tocar no mesmo volta à pele boa, e ligar
// um ruim desliga o sol e os protetores (e vice-versa). O único que soma é o fluxo do sol: sol → + protetor transparente (o UV para,
// a luz visível passa e AINDA DÁ MANCHA) → + protetor com cor (opaco: não dá mancha). Sem "a mancha fica"; sem a tecla M.
const PELE_MAUS = ['cig', 'acu', 'ind', 'sono', 'est', 'horm', 'peso'], PELE_SOLF = ['sol', 'prot', 'cor'];
const PELE_ROT = { dentro:[['Fora', ['sol', 'prot', 'cor', 'cig']], ['Dentro', ['acu', 'ind', 'sono', 'est', 'horm', 'peso']]], caminho:[['', ['acu', 'ind', 'sono', 'est', 'horm', 'peso']]] };
const pelesDe = bs => (bs || []).map(b => b && b.cena).filter(c => c && c.pele);
// baixa os quadros ao abrir o gravador e já calcula as diferenças (1 por volta de 40 ms), antes de ele gravar: a leitura de
// pixels (getImageData) durante a gravação fez o Chrome trocar a descrição do vídeo mp4 no meio do arquivo (teste da Caixa, 18/11)
function preparaPele(bs){
  if (!pelesDe(bs).length) return;
  PELE_Q.forEach(n => carregaForma(PELE_SRC(n)));
  Object.values(PELE_ENTRA).forEach(e => { if (e.img) carregaForma(PELE_SRC(e.img)); });   // as ilustrações das entradas
  clearInterval(PX.aq);
  PX.aq = setInterval(() => {
    if (!pxBase()){ if (carregaForma(PELE_SRC('base')).erro) clearInterval(PX.aq); return; }
    const falta = PELE_Q.filter(n => n !== 'base' && !PX.d[n] && !carregaForma(PELE_SRC(n)).erro);
    if (!falta.length){ clearInterval(PX.aq); return; }
    const pronto = falta.find(n => carregaForma(PELE_SRC(n)).ok); if (pronto) pxDif(pronto);
  }, 40);
}
// o motor: a base e as diferenças (Int8, metade do valor) no tamanho em que a pele é desenhada
const PX = { w:672, h:448, base:null, d:{}, tmp:null, tctx:null, cv:null, cctx:null, out:null };
function pxBase(){
  if (PX.base) return true;
  const b = carregaForma(PELE_SRC('base')); if (!b.ok) return false;
  PX.tmp = document.createElement('canvas'); PX.tmp.width = PX.w; PX.tmp.height = PX.h; PX.tctx = PX.tmp.getContext('2d', { willReadFrequently:true });
  PX.cv = document.createElement('canvas'); PX.cv.width = PX.w; PX.cv.height = PX.h;
  // o canvas da pele fica na CPU (willReadFrequently): desenhar uma fonte da GPU num quadro que o Chrome já passou para a CPU
  // o devolvia à GPU no meio da gravação, e o mp4 (avc1) trocava a descrição do vídeo (erro no teste da Caixa, 18/11)
  PX.cctx = PX.cv.getContext('2d', { willReadFrequently:true });
  PX.tctx.drawImage(b.img, 0, 0, PX.w, PX.h);
  const dados = PX.tctx.getImageData(0, 0, PX.w, PX.h);
  PX.base = new Uint8ClampedArray(dados.data); PX.out = dados;
  vasos();
  PX.cctx.putImageData(PX.out, 0, 0); PX.chave = '';
  return true;
}
function pxDif(n){
  if (PX.d[n]) return PX.d[n];
  if (!PX.base) return null;
  const e = carregaForma(PELE_SRC(n)); if (!e.ok) return null;
  PX.tctx.drawImage(e.img, 0, 0, PX.w, PX.h);
  const q = PX.tctx.getImageData(0, 0, PX.w, PX.h).data, b = PX.base, d = new Int8Array(PX.w * PX.h * 3);
  for (let i = 0, j = 0; i < q.length; i += 4, j += 3){ d[j] = (q[i] - b[i]) >> 1; d[j + 1] = (q[i + 1] - b[i + 1]) >> 1; d[j + 2] = (q[i + 2] - b[i + 2]) >> 1; }
  return (PX.d[n] = d);
}
// pesos por linha (as faixas com pena): soma até 2 grupos; do 3º em diante, o de efeito maior manda em cada faixa
function pxCoefs(cs){
  const W = {}; cs.forEach(c => { const g = PELE_GRUPO[c.n]; W[g] = Math.min(1, (W[g] || 0) + c.w); });
  const ws = Object.values(W).sort((a, b) => b - a), e3 = ws[2] || 0;
  if (e3 < .004) return { e3:0, cs:cs.map(c => ({ ...c, k:c.w })) };
  const venc = {};
  for (const f of Object.keys(PELE_FAIXA)){
    let m = null, s = 0;
    for (const g of Object.keys(W)){ const fx = PELE_FX[g]; if (!fx || !fx[0].includes(f) || W[g] < .004) continue; const v = W[g] * fx[1]; if (v > s){ s = v; m = g; } }
    venc[f] = m;
  }
  return { e3, venc, cs:cs.map(c => {
    const k = new Float32Array(PX.h), g = PELE_GRUPO[c.n];
    for (let y = 0; y < PX.h; y++){
      const fy = (y + .5) / PX.h; let mb = 0;
      for (const f of Object.keys(PELE_FAIXA)){ if (venc[f] !== g) continue; const [a, b] = PELE_FAIXA[f];
        mb += lim((fy - (a - PELE_PENA)) / (2 * PELE_PENA), 0, 1) * lim(((b + PELE_PENA) - fy) / (2 * PELE_PENA), 0, 1); }
      k[y] = c.w * ((1 - e3) + e3 * mb);
    }
    return { ...c, k };
  }) };
}
function pxPinta(cs){
  const chave = cs.map(c => c.n + ':' + c.w.toFixed(3)).join('|');
  if (chave === PX.chave) return;
  PX.chave = chave;
  const { cs:ks, e3, venc } = pxCoefs(cs), w = PX.w, h = PX.h, o = PX.out.data, b = PX.base;
  PX.ult = { e3, venc:venc || null, n:ks.length };   // para conferir (teste)
  const L = ks.map(c => ({ d:pxDif(c.n), k:c.k, g:PELE_GANHO[c.n] || 1 })).filter(c => c.d);
  const at = new Array(8);
  for (let y = 0; y < h; y++){
    let n = 0;
    for (const c of L){ const k = typeof c.k === 'number' ? c.k : c.k[y]; if (k > .002){ at[n++] = c.d; at[n++] = 2 * k * c.g; } }
    let i = y * w * 4, j = y * w * 3; const fim = i + w * 4;
    if (!n){ o.set(b.subarray(i, fim), i); continue; }
    if (n === 2){ const d = at[0], k = at[1]; for (; i < fim; i += 4, j += 3){ o[i] = b[i] + k * d[j]; o[i + 1] = b[i + 1] + k * d[j + 1]; o[i + 2] = b[i + 2] + k * d[j + 2]; } continue; }
    if (n === 4){ const d = at[0], k = at[1], e = at[2], q = at[3]; for (; i < fim; i += 4, j += 3){ o[i] = b[i] + k * d[j] + q * e[j]; o[i + 1] = b[i + 1] + k * d[j + 1] + q * e[j + 1]; o[i + 2] = b[i + 2] + k * d[j + 2] + q * e[j + 2]; } continue; }
    for (; i < fim; i += 4, j += 3){ let r = b[i], g = b[i + 1], bl = b[i + 2]; for (let m = 0; m < n; m += 2){ const d = at[m], k = at[m + 1]; r += k * d[j]; g += k * d[j + 1]; bl += k * d[j + 2]; } o[i] = r; o[i + 1] = g; o[i + 2] = bl; }
  }
  PX.cctx.putImageData(PX.out, 0, 0);
}
// os vasos da base (artéria vermelha, veia azul-violeta da derme), achados pela cor uma vez: o pulso do que vem do sangue corre
// neles, de baixo e da esquerda para cima e para a direita (a = a hora em que o pulso chega em cada ponto, de 0 a 1)
function vasos(){
  const w = PX.w, h = PX.h, b = PX.base, m = new Float32Array(w * h);
  for (let y = Math.round(.345 * h); y < Math.round(.8 * h); y++) for (let x = 0; x < w; x++){
    const i = (y * w + x) * 4, r = b[i], g = b[i + 1], bl = b[i + 2];
    const art = lim((r - g - 95) / 50, 0, 1) * lim((150 - g) / 40, 0, 1), vei = lim((bl - g + 5) / 30, 0, 1) * lim((200 - r) / 60, 0, 1);
    m[y * w + x] = Math.max(art, vei);
  }
  // um pouco de brilho em volta (caixa 5×5) e só o que é vaso de verdade
  const t = new Float32Array(w * h), k = 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){ let s = 0; for (let d = -k; d <= k; d++){ const xx = x + d; if (xx >= 0 && xx < w) s += m[y * w + xx]; } t[y * w + x] = s / (2 * k + 1); }
  const idx = [], val = [], hora = [], veia = [];
  for (let y = k; y < h - k; y++) for (let x = 0; x < w; x++){ let s = 0; for (let d = -k; d <= k; d++) s += t[(y + d) * w + x]; s /= (2 * k + 1); const v = Math.max(s * 1.6, m[y * w + x]);
    if (v > .22){ const i4 = (y * w + x) * 4; idx.push(y * w + x); val.push(Math.min(1, v)); hora.push(lim(.55 * x / w + .45 * (.78 - y / h) / .44, 0, 1)); veia.push(b[i4 + 2] > b[i4 + 1] + 5 ? 1 : 0); } }
  PX.vI = Int32Array.from(idx); PX.vV = Float32Array.from(val); PX.vH = Float32Array.from(hora); PX.vA = Uint8Array.from(veia);
  PX.vcv = document.createElement('canvas'); PX.vcv.width = w; PX.vcv.height = h;
  PX.vctx = PX.vcv.getContext('2d', { willReadFrequently:true });   // na CPU, como o da pele (o mp4 não troca a descrição)
  PX.vimg = PX.vctx.createImageData(w, h);
}
// o pulso (só a entrada): a frente da cor do fator corre pelos vasos em 0,5 s e o brilho some até 0,9 s
function pulsoVasos(ctx, P, agora, x0, y0, al){
  const p = P.pulso; if (!p || !PX.vI) return 0;
  const t = (agora - p.t0) / 1000; if (t < 0) return 0; if (t * 1000 > PELE_PULSO_MS){ P.pulso = null; return 0; }
  const fr = t / .5, rasto = 1 - lim((t - .5) / .4, 0, 1), d = PX.vimg.data, [cr, cg, cb] = p.cor;
  d.fill(0);
  for (let k = 0; k < PX.vI.length; k++){
    const a = PX.vH[k], fr2 = (a - fr) / .07, frente = Math.exp(-fr2 * fr2), passou = a < fr ? .45 * rasto : 0;
    const v = PX.vV[k] * Math.min(1, frente + passou); if (v < .02) continue;
    const i = PX.vI[k] * 4; d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = Math.round(255 * v);
  }
  PX.vctx.putImageData(PX.vimg, 0, 0);
  ctx.save(); ctx.globalAlpha = al; ctx.globalCompositeOperation = 'lighter';
  try { ctx.drawImage(PX.vcv, x0, y0); ctx.globalAlpha = al * .6; ctx.drawImage(PX.vcv, x0, y0); } catch (e) { /* ok */ }
  ctx.restore();
  return Math.max(0, Math.min(1, t / .15)) * (1 - lim((t - .7) / .2, 0, 1));   // o quanto mostrar o rótulo "chega pelo sangue"
}
// onde cada coisa está no quadro (fração da largura e da altura; medido nos quadros -forte em 18/11)
const PELE_POS = { filme:.262, sup:.268, mancha:[.487, .344], solManchas:[[.39, .345], [.62, .345]], colagenoCima:[.7, .41], derme:[.6, .53],
  gorduraTopo:.765, gorduraTopoMeno:.585, gordura:[.5, .88], veia:[.27, .66], vaso:[.16, .705], epi:[.4, .295] };
// pele morena: o UV (dourado) para no filme; a luz visível (lilás) passa pelo protetor comum até a mancha (que cresce); com cor, para no filme
const MANCHA = { x:.487, y:.344, l:.3 }, FILME_Y = .262;
function luzVisivel(ctx, P, agora, x0, y0, al){
  const passa = (P.w['morena-protetor'] || 0) + (P.w['morena-forte'] || 0), para = P.on.sol && P.on.cor ? (P.w['protetor-cor'] || 0) : 0, k = Math.min(1, passa + para); if (k < .02) return;
  const w = PX.w, h = PX.h, pul = .75 + .25 * Math.sin(agora / 260), ate = FILME_Y + (MANCHA.y + .01 - FILME_Y) * (passa / Math.max(.001, passa + para));
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 4; j++){
    const xs = x0 + w * (MANCHA.x - .22 + j * .065), xe = x0 + w * (MANCHA.x - MANCHA.l / 2 + j * MANCHA.l / 3), ye = y0 + h * ate, ys = y0 - 10;
    const g = ctx.createLinearGradient(xs, ys, xe, ye); g.addColorStop(0, 'rgba(205,190,255,0)'); g.addColorStop(.35, 'rgba(205,190,255,.6)'); g.addColorStop(1, 'rgba(225,215,255,1)');
    ctx.globalAlpha = al * k * pul * .6; ctx.strokeStyle = g; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xs, ys); ctx.lineTo(xe, ye); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = al * k;
  tagPele(ctx, 'UV: para no filme', x0 + 124, y0 + 14, AMARELO);
  tagPele(ctx, passa >= para ? 'luz visível: passa' : 'luz visível: para no filme', x0 + w - (passa >= para ? 196 : 270), y0 + 14, '#d9ccff');
  if (passa > .5) rotuloPele(ctx, 'ainda dá mancha', x0, y0, [MANCHA.x + .02, MANCHA.y + .005], [.62, .44], AMARELO, al * Math.min(1, passa));
  else if (para > .5) rotuloPele(ctx, 'não dá mancha', x0, y0, [MANCHA.x + .02, MANCHA.y + .005], [.56, .44], VERDE, al * Math.min(1, para));
  ctx.globalAlpha = 1;
}
function tagPele(ctx, txt, tx, ty, cor){
  ctx.font = `700 21px ${FONTE}`; const tw = ctx.measureText(txt).width + 20; ctx.fillStyle = 'rgba(8,10,9,.8)'; caixa(ctx, tx, ty, tw, 32, 10); ctx.fill();
  ctx.fillStyle = cor; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(txt, tx + 10, ty + 17); ctx.textBaseline = 'alphabetic';
}
// rótulo com seta: a = o ponto (fração do quadro), p = o canto da etiqueta (fração); a etiqueta não sai do quadro
function rotuloPele(ctx, txt, x0, y0, a, p, cor, al){
  if (al <= .01) return;
  const w = PX.w, h = PX.h, ax = x0 + a[0] * w, ay = y0 + a[1] * h;
  ctx.font = `700 24px ${FONTE}`; const tw = ctx.measureText(txt).width + 24, th = 40;
  const tx = lim(x0 + p[0] * w, x0 + 8, x0 + w - tw - 8), ty = lim(y0 + p[1] * h, y0 + 8, y0 + h - th - 8);
  const lx = lim(ax, tx, tx + tw), ly = ay < ty ? ty : ay > ty + th ? ty + th : ty + th / 2, ang = Math.atan2(ay - ly, ax - lx), d = Math.hypot(ax - lx, ay - ly);
  ctx.save(); ctx.globalAlpha = al;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (d > 6){ ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ax - 6 * Math.cos(ang), ay - 6 * Math.sin(ang)); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 13 * Math.cos(ang - .45), ay - 13 * Math.sin(ang - .45)); ctx.lineTo(ax - 13 * Math.cos(ang + .45), ay - 13 * Math.sin(ang + .45)); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(8,10,9,.84)'; caixa(ctx, tx, ty, tw, th, 12); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cor; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(txt, tx + 12, ty + th / 2 + 1); ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
// a animação própria de cada fator (depois do pulso no vaso) e os rótulos no lugar exato; P.ef = { id, t0, ps } do último ligado
function efeitoPele(ctx, P, agora, x0, y0, al){
  const e = P.ef, w = PX.w, h = PX.h; if (!e || !P.on[e.id]) return;
  const t = (agora - e.t0) / 1000, X = f => x0 + f * w, Y = f => y0 + f * h, R = (txt, a, p, cor, ap) => rotuloPele(ctx, txt, x0, y0, a, p, cor || LARANJA, al * sai(ap));
  if (t < 0) return;   // a entrada (a ilustração ou a palavra) vem antes
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  if (e.id === 'acu' || e.id === 'ind'){   // grãos âmbar saem do vaso, grudam nas fibras e formam pontes
    const ps = e.ps || (e.ps = graosPele(e.id === 'ind' ? 16 : 34));
    const chegou = [];
    ps.forEach((q, i) => {
      const k = sai((t - .45 - i * .025) / 1.1); if (k <= 0) return;
      const x = X(q.x0 + (q.x1 - q.x0) * k), y = Y(q.y0 + (q.y1 - q.y0) * k) - Math.sin(Math.PI * k) * 14;
      ctx.globalAlpha = al * (k < 1 ? 1 : .9); ctx.fillStyle = '#ffb02e'; ctx.strokeStyle = '#7a3e0c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (k >= 1) chegou.push([x, y]);
    });
    const pt = sai((t - 1.9) / .8);
    if (pt > 0){ ctx.globalAlpha = al * pt * .9; ctx.strokeStyle = '#6b3510'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      chegou.forEach((a, i) => { let m = null, dm = 75; chegou.forEach((b, j) => { const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (j !== i && d < dm){ dm = d; m = b; } }); if (m){ ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(m[0], m[1]); ctx.stroke(); } }); }   // a ponte: cada grão ao vizinho mais perto
    ctx.restore();
    if (e.id === 'acu') R('o açúcar gruda no colágeno', PELE_POS.derme, [.5, .80], LARANJA, (t - 1.2) / .4);
    else R('sobe a glicose → mesmo caminho do açúcar', PELE_POS.derme, [.2, .80], LARANJA, (t - 1.2) / .4);
    return;
  }
  if (e.id === 'sono'){   // as veias escurecem e incham; a pele toda apaga
    const k = sai((t - .45) / .9), pul = .8 + .2 * Math.sin(agora / 300), d = PX.vimg && PX.vimg.data;
    if (k > 0 && PX.vI && d){
      d.fill(0);
      for (let i = 0; i < PX.vI.length; i++){ if (!PX.vA[i]) continue; const j = PX.vI[i] * 4; d[j] = 46; d[j + 1] = 24; d[j + 2] = 92; d[j + 3] = Math.round(255 * PX.vV[i] * k * pul * .8); }
      PX.vctx.putImageData(PX.vimg, 0, 0); ctx.globalAlpha = al; ctx.drawImage(PX.vcv, x0, y0); ctx.drawImage(PX.vcv, x0 + 1, y0); ctx.drawImage(PX.vcv, x0, y0 + 1);   // mais grossas
    }
    ctx.restore();
    R('circulação pior: pele apagada', PELE_POS.veia, [.08, .82], AZUL, (t - .8) / .4);
    return;
  }
  if (e.id === 'est'){   // a camada de cima racha e solta escamas
    const ps = e.ps || (e.ps = rachasPele());
    const k = sai((t - .45) / 1.2);
    ctx.globalAlpha = al; ctx.strokeStyle = '#5a2a14'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
    ps.r.forEach(r => { const n = Math.max(1, Math.round(r.length * k)); ctx.beginPath(); r.slice(0, n).forEach(([fx, fy], i) => i ? ctx.lineTo(X(fx), Y(fy)) : ctx.moveTo(X(fx), Y(fy))); ctx.stroke(); });
    ps.e.forEach((q, i) => { const s2 = sai((t - .9 - i * .06) / 1.4); if (s2 <= 0) return;
      ctx.save(); ctx.translate(X(q.x), Y(PELE_POS.sup) - 4 - 18 * s2); ctx.rotate(q.r * s2); ctx.globalAlpha = al * (1 - .3 * s2);
      ctx.fillStyle = '#f3dcc4'; ctx.strokeStyle = '#8a5a3a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); });
    ctx.restore();
    R('barreira de cima afina e racha', PELE_POS.epi, [.42, .46], LARANJA, (t - .9) / .4);
    return;
  }
  if (e.id === 'horm'){   // a régua da espessura: da superfície ao topo da gordura, que sobe
    const wm = P.w['menopausa-forte'] || 0, yb = PELE_POS.gorduraTopo + (PELE_POS.gorduraTopoMeno - PELE_POS.gorduraTopo) * Math.min(1, wm);
    const xr = X(.93), ya = Y(PELE_POS.sup + .01), yz = Y(yb);
    ctx.globalAlpha = al; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xr, ya); ctx.lineTo(xr, yz); ctx.stroke();
    [[ya, 1], [yz, -1]].forEach(([yy, sgn]) => { ctx.beginPath(); ctx.moveTo(xr - 14, yy); ctx.lineTo(xr + 14, yy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xr, yy); ctx.lineTo(xr - 8, yy + sgn * 12); ctx.moveTo(xr, yy); ctx.lineTo(xr + 8, yy + sgn * 12); ctx.stroke(); });
    ctx.globalAlpha = al * .5; ctx.setLineDash([8, 7]); ctx.strokeStyle = '#ffd60a'; ctx.beginPath(); ctx.moveTo(xr - 40, Y(PELE_POS.gorduraTopo)); ctx.lineTo(xr + 20, Y(PELE_POS.gorduraTopo)); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    R('derme afina', [.92, (PELE_POS.sup + yb) / 2], [.6, .44], '#ff8cc8', (t - .6) / .4);
    return;
  }
  if (e.id === 'peso'){   // a gordura de baixo murcha: setas para baixo e o contorno que desce
    const k = sai((t - .45) / 1.4);
    ctx.globalAlpha = al * .9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let j = 0; j < 5; j++){ const xx = X(.14 + j * .18), y1 = Y(.78) + 26 * k; ctx.beginPath(); ctx.moveTo(xx, Y(.76)); ctx.lineTo(xx, y1); ctx.moveTo(xx - 9, y1 - 10); ctx.lineTo(xx, y1); ctx.lineTo(xx + 9, y1 - 10); ctx.stroke(); }
    ctx.restore();
    R('a gordura de baixo murcha', PELE_POS.gordura, [.26, .58], LARANJA, (t - .8) / .4);
    return;
  }
  ctx.restore();
  if (e.id === 'sol'){   // os três danos, um a um: mancha, colágeno quebrado, textura
    R('mancha', PELE_POS.solManchas[0], [.08, .45], LARANJA, (t - .9) / .4);
    R('colágeno quebra', PELE_POS.colagenoCima, [.6, .56], LARANJA, (t - 1.4) / .4);
    R('superfície áspera = textura', [.25, PELE_POS.sup], [.38, .07], LARANJA, (t - 1.9) / .4);
  } else if (e.id === 'cig') R('vasinhos estreitam', PELE_POS.vaso, [.3, .82], LARANJA, (t - .9) / .4);
}
// os grãos do açúcar: saem de pontos do vaso e vão a pontos da derme
function graosPele(n){
  const ps = [], vs = PX.vI || [], w = PX.w, h = PX.h;
  for (let i = 0; i < n; i++){
    let x0 = Math.random(), y0 = .7;
    for (let k = 0; k < 20 && vs.length; k++){ const v = vs[Math.floor(Math.random() * vs.length)], vy = Math.floor(v / w) / h; if (vy > .5 && vy < .76){ x0 = (v % w) / w; y0 = vy; break; } }
    ps.push({ x0, y0, x1:lim(x0 + (Math.random() - .5) * .3, .04, .96), y1:.4 + Math.random() * .26 });
  }
  return ps;
}
// as rachaduras da camada de cima (linhas quebradas da superfície para baixo) e as escamas que soltam
function rachasPele(){
  const r = [], e = [];
  for (let i = 0; i < 11; i++){ const x = .05 + i * .088 + (Math.random() - .5) * .03; const l = [[x, PELE_POS.sup]]; let xx = x, yy = PELE_POS.sup;
    for (let k = 0; k < 5; k++){ xx += (Math.random() - .5) * .025; yy += .012 + Math.random() * .006; l.push([xx, yy]); } r.push(l); }
  for (let i = 0; i < 12; i++) e.push({ x:.06 + i * .08 + Math.random() * .03, r:(Math.random() - .5) * 1.2 });
  return { r, e };
}
// a entrada do fator (18/11 tarde): a ilustração cresce no meio da pele (0,35 s), fica (até 1 s) e vai para o lugar dela: o sol para o
// canto de cima à esquerda (fica enquanto o sol estiver ligado), o açúcar e os industrializados "derretem" para dentro do vaso, o
// cigarro e o protetor para o canto de cima à direita (ficam enquanto ligados). Estresse, sono, hormônios e peso: a palavra, grande.
function entradaPele(ctx, P, agora, x0, y0, al){
  const w = PX.w, h = PX.h;
  // os que ficam no canto enquanto ligados (sol, protetor, cigarro), depois da entrada
  const cantos = [['sol', 'e-sol', x0 + 8, y0 + 6, 104], ['cig', 'e-cigarro', x0 + w - 112, y0 + 6, 104], ['prot', 'e-protetor', x0 + w - 112, y0 + 110, 100], ['cor', 'e-protetor-cor', x0 + w - 112, y0 + 110, 100]];
  for (const [id, n, cx, cy, lado] of cantos){
    if (!P.on[id] || (P.entra && P.entra.id === id && agora - P.entra.t0 < 1500)) continue;
    const e = carregaForma(PELE_SRC(n)); if (!e.ok) continue;
    ctx.globalAlpha = al * .95; try { ctx.drawImage(e.img, cx, cy, lado, lado); } catch (er) { /* ok */ }
  }
  const E = P.entra; if (!E) { ctx.globalAlpha = 1; return; }
  const t = (agora - E.t0) / 1000, cfg = PELE_ENTRA[E.id]; if (!cfg || t > 1.6){ if (t > 1.6) P.entra = null; ctx.globalAlpha = 1; return; }
  if (cfg.txt){   // a palavra, grande e calma, no meio da pele
    const a = sai(t / .3) * (1 - lim((t - .95) / .35, 0, 1)); if (a <= 0) { ctx.globalAlpha = 1; return; }
    ctx.save(); ctx.globalAlpha = al * a; ctx.font = `600 50px ${FONTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(cfg.txt).width + 64, cx = x0 + w / 2, cy = y0 + h / 2 + (1 - sai(t / .3)) * 10;
    ctx.fillStyle = 'rgba(10,14,12,.72)'; caixa(ctx, cx - tw / 2, cy - 46, tw, 92, 46); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(cfg.txt, cx, cy + 2); ctx.restore(); ctx.globalAlpha = 1;
    return;
  }
  const e = carregaForma(PELE_SRC(cfg.img)); if (!e.ok){ ctx.globalAlpha = 1; return; }
  const L0 = 250, cx0 = x0 + w / 2, cy0 = y0 + h / 2, ent = sai(t / .35);
  let cx = cx0, cy = cy0, lado = L0 * (.6 + .4 * ent), a = ent;
  const k = sai((t - 1) / .5);   // de 1 s a 1,5 s vai para o lugar dele
  if (k > 0){
    let tx, ty, tl;
    if (cfg.fica === 'vaso'){ tx = x0 + PELE_POS.vaso[0] * w; ty = y0 + PELE_POS.vaso[1] * h; tl = 24; a = 1 - k * .95; }
    else if (cfg.fica === 'sol'){ tx = x0 + 8 + 52; ty = y0 + 6 + 52; tl = 104; }
    else { tx = x0 + w - 112 + 52; ty = y0 + (E.id === 'cig' ? 6 : 110) + 52; tl = E.id === 'cig' ? 104 : 100; }
    cx = cx0 + (tx - cx0) * k; cy = cy0 + (ty - cy0) * k; lado = L0 + (tl - L0) * k;
  }
  ctx.globalAlpha = al * a; try { ctx.drawImage(e.img, cx - lado / 2, cy - lado / 2, lado, lado); } catch (er) { /* ok */ }
  ctx.globalAlpha = 1;
}
// os raios do sol: do sol no canto até a pele, enquanto o sol está ligado (com protetor, param no filme)
function raiosSol(ctx, P, agora, x0, y0, al){
  if (!P.on.sol) return;
  const t0 = P.ef && P.ef.id === 'sol' ? P.ef.t0 : 0, k = t0 ? sai((agora - t0) / 900) : 1; if (k <= 0) return;
  const w = PX.w, h = PX.h, filme = P.on.prot || P.on.cor, sx = x0 + 60, sy = y0 + 58, pul = .8 + .2 * Math.sin(agora / 320);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 5; j++){
    const ex = x0 + w * (.22 + j * .15), ey = y0 + h * (filme ? FILME_Y : .36 + (j % 2) * .04), mx = sx + (ex - sx) * k, my = sy + (ey - sy) * k;
    const g = ctx.createLinearGradient(sx, sy, mx, my); g.addColorStop(0, 'rgba(255,214,90,0)'); g.addColorStop(.3, 'rgba(255,206,80,.55)'); g.addColorStop(1, 'rgba(255,225,120,.95)');
    ctx.globalAlpha = al * .5 * pul; ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.stroke();
  }
  ctx.restore();
}
// o menu da pele (18/11 tarde): no iPhone os botões do painel somem quando a fala não cabe; tocar na pele abre este menu por cima do
// painel dele (DOM, fora do vídeo). Um toque liga ou desliga e fecha o menu.
function abreMenuPele(){
  const c = peleCena(); if (!c || !D) return;
  const m = c.pele.modo, ela = c.pele.ela || {}, P = G.pele || {};
  const tt = teclasPele(c), ts = [...tt.filter(([id]) => id === 'zerar'), ...tt.filter(([id]) => id !== 'zerar' && id !== 'abrir')];
  D.peleMenu.innerHTML = '<div class="ga-pm-topo"><button type="button" class="ga-pm-b zera" data-p="zerar">Voltar ao normal</button><button type="button" class="ga-pm-x" aria-label="Fechar">✕</button></div><div class="ga-pm-bs">' +
    ts.filter(([id]) => id !== 'zerar').map(([id]) => { const f = PELE_F[id] || {}, nome = id === 'zerar' ? 'Voltar ao normal' : (f.painel || f.nome), on = !!(P.on && P.on[id]);
      return `<button type="button" class="ga-pm-b${id === 'zerar' ? ' zera' : ''}" data-p="${id}" aria-pressed="${on}">${esc(nome)}${ela[id] ? `<small>${esc(ela[id])}</small>` : ''}</button>`; }).join('') + '</div>';
  D.peleMenu.hidden = false; G.peleMenuAberto = true;
}
function fechaMenuPele(){ if (D && D.peleMenu){ D.peleMenu.hidden = true; } if (G) G.peleMenuAberto = false; }
// estado (um por bloco: recomeça na base quando o bloco começa)
function peleNovo(){ return { on:{}, w:{}, a:{}, g:0, gA:0, m:0, mA:0, mc:0, mcA:0, dano:false, msg:null, ult:performance.now(), aberto:false, abT:-1e9, usos:0 }; }
// 18/11 tarde (o Lucca: "parece que eu não consigo voltar ao normal"): desligar volta ao normal em ~1,5 s. O único resíduo é o do
// sol enquanto o protetor estiver ligado depois dele ("o que já foi feito fica"); tirando o protetor (ou com R), volta tudo.
function peleAlvos(P){
  const o = P.on, a = P.a;
  // o fluxo do sol: sozinho, o dano; com o protetor transparente, o filme e a mancha da luz visível (quadros morena-*, a mancha
  // nasce e cresce); com o protetor com cor (opaco), o filme com cor e a pele limpa
  a.protetor = o.prot && !o.sol ? 1 : 0; a['protetor-cor'] = o.cor ? 1 : 0;
  P.mA = o.sol && o.prot ? 2 : 0; P.mcA = 0;
  a['sol-forte'] = o.sol && !o.prot && !o.cor ? 1 : 0;
  a['cigarro-forte'] = o.cig ? 1 : 0;
  a['peso-forte'] = o.peso ? 1 : 0;
  a['menopausa-forte'] = o.horm ? 1 : 0;
  a['sono-forte'] = Math.max(o.sono ? 1 : 0, o.est ? .5 : 0);
  a['estresse-forte'] = o.est ? 1 : 0;
  P.gA = o.acu ? 2 : o.ind ? .5 : 0;
}
function peleAnda(P, agora){
  const dt = Math.min(120, Math.max(0, agora - P.ult)); P.ult = agora;
  const esp = n => agora < ((P.desde && P.desde[n]) || 0);   // de dentro: a pele só muda depois que o pulso correu no vaso
  for (const n of Object.keys(P.a)){ const v = P.w[n] || 0, a = P.a[n]; if (v < a && esp(n)) continue; P.w[n] = v < a ? Math.min(a, v + dt / (PELE_VEL[n] || 1500)) : Math.max(a, v - dt / 1500); }   // volta em 1,5 s
  if (!(P.g < P.gA && esp('g'))) P.g = P.g < P.gA ? Math.min(P.gA, P.g + dt / PELE_ACU_MS) : Math.max(P.gA, P.g - dt / 750);
  const vm = P.m < 1 ? 1200 : 2600;   // a mancha da pele morena: aparece em 1,2 s, cresce em 2,6 s
  P.m = P.m < P.mA ? Math.min(P.mA, P.m + dt / vm) : Math.max(P.mA, P.m - dt / 1200);
  P.mc = P.mc < P.mcA ? Math.min(P.mcA, P.mc + dt / 1400) : Math.max(P.mcA, P.mc - dt / 1400);
  const m1 = P.m <= 1 ? P.m : 2 - P.m, m2 = Math.max(0, P.m - 1);
  P.w['morena-protetor'] = (1 - P.mc) * m1; P.w['morena-forte'] = (1 - P.mc) * m2; P.w['morena-cor'] = P.mc * m1; P.w['morena-forte-cor'] = P.mc * m2;
  if ((P.w['sol-forte'] || 0) >= .5 && (P.a['sol-forte'] || 0) >= .5) P.dano = true;   // só subindo (o R zera e ele desce sem marcar de novo)
  if (P.dano && !(P.a['sol-forte'] > 0) && (P.w['sol-forte'] || 0) < .01) P.dano = false;   // voltou ao normal
  const cs = Object.keys(P.w).filter(n => P.w[n] > .003).map(n => ({ n, w:P.w[n] }));
  if (P.g > .003){ if (P.g <= 1) cs.push({ n:'acucar', w:P.g }); else { if (P.g < 2) cs.push({ n:'acucar', w:2 - P.g }); cs.push({ n:'acucar-forte', w:P.g - 1 }); } }
  return cs;
}
// a legenda do toque: 26 px se couber em 2 linhas; senão 23 px (até 3). Nunca corta com "…"
function legendaPele(ctx, txt, w){
  ctx.font = `600 26px ${FONTE}`; let ls = quebra(ctx, txt, w, 99);
  if (ls.length <= 2) return { ls, lh:31, px:26 };
  ctx.font = `600 23px ${FONTE}`; ls = quebra(ctx, txt, w, 99);
  return { ls, lh:ls.length > 2 ? 27 : 29, px:23 };
}
// todas as frases possíveis (para o teste conferir que cabem)
function textosPele(){
  const out = new Set();
  Object.values(PELE_F).forEach(f => { if (f.on) out.add(f.on); if (f.off) out.add(f.off); });
  for (const sol of [0, 1]) for (const prot of [0, 1]) for (const cor of [0, 1]) for (const liga of [0, 1])
    for (const id of PELE_SOLF){ const P = { on:{ sol:!!sol, prot:!!prot && !cor, cor:!!cor } }; out.add(peleFrase(P, id, !!liga)[0]); }
  return [...out].filter(Boolean);
}
// a frase do toque e a cor dela: verde = protege ou alivia, amarelo = estraga (P.on já com o toque aplicado)
const PELE_TXT = {
  sol:'A luz quebra o colágeno de cima: a superfície fica áspera (é a textura) e a mancha nasce embaixo.',
  transp:'O protetor transparente segura o UV, mas não é opaco: a luz visível passa e ainda dá mancha.',
  opaco:'O protetor com cor é opaco: segura também a luz visível e não deixa a mancha se formar.',
  soProt:'O protetor transparente segura o UV no filme, em cima da pele.',
  soCor:'O protetor com cor é opaco: segura o UV e também a luz visível no filme.',
  semProt:'Sem protetor, o sol volta a quebrar a pele.' };
function peleFrase(P, id, liga){
  const o = P.on;
  if (PELE_SOLF.includes(id)){
    if (o.sol && o.prot) return [PELE_TXT.transp, false];
    if (o.sol && o.cor) return [PELE_TXT.opaco, true];
    if (o.sol) return id === 'sol' ? [PELE_TXT.sol, false] : [PELE_TXT.semProt, false];
    if (!liga || id === 'sol') return ['', true];
    return [o.cor ? PELE_TXT.soCor : PELE_TXT.soProt, true];
  }
  const f = PELE_F[id]; return f && liga ? [f.on || '', false] : ['', true];   // desligou: volta ao normal, sem frase
}
const peleCena = () => { const c = G && (G.o.blocos[G.bloco] || {}).cena; return c && c.pele ? c : null; };
function peleAcao(id){
  if (!G || !['prep', 'conta', 'rec'].includes(G.estado)) return;
  const c = peleCena(); if (!c || !teclasPele(c).some(([k]) => k === id)) return;
  G.peleUlt = performance.now();   // ele está mexendo na pele (o salto automático espera)
  const P = G.pele || (G.pele = peleNovo()), agora = performance.now();
  if (id === 'zerar'){ P.on = {}; P.dano = false; P.msg = null; P.gA = 0; P.mA = 0; P.mcA = 0; P.pulso = null; P.ef = null; P.entra = null; P.desde = {}; fechaMenuPele(); Object.keys(P.w).forEach(n => { P.a[n] = 0; }); }   // tudo volta à base (sem resíduo)
  else if (id === 'abrir'){ P.aberto = !P.aberto; P.abT = agora; }
  else {
    if (c.pele.modo === 'caminho' && !P.aberto){ P.aberto = true; P.abT = agora; }
    const liga = !P.on[id]; P.on[id] = liga;
    if (liga && PELE_MAUS.includes(id)) [...PELE_MAUS, ...PELE_SOLF].forEach(k => { if (k !== id) P.on[k] = false; });   // um fator ruim por vez, sozinho
    if (liga && PELE_SOLF.includes(id)) PELE_MAUS.forEach(k => { P.on[k] = false; });
    if (liga && id === 'prot') P.on.cor = false;
    if (liga && id === 'cor') P.on.prot = false;
    if (P.ef && !P.on[P.ef.id]) P.ef = null;
    peleAlvos(P);
    // 18/11 tarde: cada fator ENTRA com a sua ilustração (ou a palavra) em ~1 s; só depois o pulso no vaso e a pele mudando
    P.desde = P.desde || {};
    if (liga && PELE_ENTRA[id]){ P.entra = { id, t0:agora }; (PELE_ENTRA_Q[id] || []).forEach(n => { P.desde[n] = agora + PELE_ENTRADA_MS; }); }
    if (liga && PELE_SANGUE_Q[id]){ P.pulso = { t0:agora + PELE_ENTRADA_MS, cor:PELE_F[id].sangue }; PELE_SANGUE_Q[id].forEach(n => { P.desde[n] = agora + PELE_ENTRADA_MS + PELE_ESPERA; }); }
    if (liga && (PELE_MAUS.includes(id) || (id === 'sol' && !P.on.prot && !P.on.cor))) P.ef = { id, t0:agora + PELE_ENTRADA_MS };   // a animação própria e os rótulos dele (depois da entrada)
    else if (PELE_SOLF.includes(id)) P.ef = null;   // com o protetor, os rótulos são os da luz (UV e luz visível)
    const [txt, bem] = peleFrase(P, id, liga);
    P.msg = txt ? { txt, bem, t:agora, id, liga } : null;
  }
  P.usos++; G.peleUsos = (G.peleUsos || 0) + 1;
  botoesPele();
}
function botoesPele(){
  if (!D || !G) return;
  const c = peleCena(), m = c ? c.pele.modo : '', k = G.bloco + '|' + m;
  if (D.pele.dataset.k !== k){
    D.pele.dataset.k = k;
    const ela = (c && c.pele.ela) || {}, grupo = { sol:'Fora', acu:'Dentro' };
    const tt = c ? teclasPele(c) : [], ts = [...tt.filter(([id]) => id === 'zerar'), ...tt.filter(([id]) => id !== 'zerar')];   // "Voltar ao normal" primeiro, em destaque
    D.pele.innerHTML = !m ? '' : ts.map(([id, t]) => {
      const f = PELE_F[id] || {}, nome = id === 'zerar' ? 'Voltar ao normal' : id === 'abrir' ? 'Abrir: o que vem de dentro' : (f.painel || f.nome);
      return (m === 'dentro' && grupo[id] ? (id === 'acu' ? '<i class="ga-pele-q"></i>' : '') + `<span class="ga-pele-g">${grupo[id]}</span>` : '') +
        `<button type="button" class="ga-foco-b ga-pele-b${id === 'zerar' ? ' zera' : ''}" data-p="${id}" aria-pressed="false"><kbd>${t}</kbd><b>${esc(nome)}</b>${ela[id] ? `<small>${esc(ela[id])}</small>` : ''}</button>`;
    }).join('');
  }
  D.pele.hidden = !m || G.estado === 'rev' || G.estado === 'fim';
  const P = G.pele;
  D.pele.querySelectorAll('button[data-p]').forEach(b => { const id = b.dataset.p; if (id !== 'zerar') b.setAttribute('aria-pressed', String(!!(P && (id === 'abrir' ? P.aberto : P.on[id])))); });
}
// os rótulos sob a pele (entram no vídeo e servem de botão no toque): ligado = cheio (laranja estraga, verde protege)
function chipsPele(ctx, grupos, P, x0, y0, larg, al){
  const caixas = [], hC = 46, passo = 58, pad = 17, gap = 10;
  let x = x0, y = y0;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (const [rot, ids] of grupos){
    if (rot){ ctx.font = `600 22px ${FONTE}`; const wr = ctx.measureText(rot).width; if (x > x0){ x = x0; y += passo; }   // cada grupo começa numa linha
      ctx.globalAlpha = al; ctx.fillStyle = APAGADO; ctx.fillText(rot, x, y + hC / 2 + 1); x += wr + 12; }
    for (const id of ids){
      const f = PELE_F[id], on = !!(P && P.on[id]), txt = f.curto && larg < 700 && id === 'cor' ? f.curto : f.nome;
      ctx.font = `650 24px ${FONTE}`; const w = Math.ceil(ctx.measureText(txt).width) + 2 * pad;
      if (x > x0 && x + w > x0 + larg){ x = x0; y += passo; }
      const cor = f.mal ? LARANJA : VERDE;
      ctx.globalAlpha = al; caixa(ctx, x, y, w, hC, hC / 2);
      if (on){ ctx.fillStyle = cor; ctx.fill(); } else { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.stroke(); }
      ctx.fillStyle = on ? '#0b100e' : 'rgba(255,255,255,.82)'; ctx.fillText(txt, x + pad, y + hC / 2 + 1);
      caixas.push({ id, x, y, w, h:hC });
      x += w + gap;
    }
  }
  ctx.textBaseline = 'alphabetic';
  return { caixas, fim:y + hC };
}
// a pele no quadro: L = { y (topo da imagem), grupos, al }. Sem a base carregada: false (a cena de antes entra)
function desenhaPele(ctx, c, L){
  if (!pxBase()) return false;
  const P = G.pele || (G.pele = peleNovo()), agora = performance.now(), al = L.al ?? 1;
  if (G.estado !== 'rec'){ const falta = PELE_Q.find(n => n !== 'base' && !PX.d[n] && carregaForma(PELE_SRC(n)).ok); if (falta) pxDif(falta); }   // reserva do aquecimento (nunca gravando)
  pxPinta(peleAnda(P, agora));
  const x = 24, y = L.y, w = PX.w, h = PX.h, r = 22;
  ctx.globalAlpha = al; ctx.save(); caixa(ctx, x, y, w, h, r); ctx.clip();
  try { ctx.drawImage(PX.cv, x, y, w, h); } catch (e) { /* ok */ }
  ctx.restore();
  raiosSol(ctx, P, agora, x, y, al);
  const vt = pulsoVasos(ctx, P, agora, x, y, al);
  efeitoPele(ctx, P, agora, x, y, al);
  luzVisivel(ctx, P, agora, x, y, al);
  if (!P.on.sol && (P.w.protetor > .5 || P.w['protetor-cor'] > .5) && !(P.ef && P.on[P.ef.id])){   // protetor sem sol: só o filme
    ctx.globalAlpha = al; tagPele(ctx, 'UV: para no filme', x + 124, y + 14, AMARELO);
  }
  if (vt > 0){   // "pelo sangue": rótulo no gordura de baixo, com a linha fina até a artéria
    const ax = x + .16 * w, ay = y + .705 * h, tx = x + 18, ty = y + h - 58;
    ctx.globalAlpha = al * vt; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + 60, ty); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = `700 23px ${FONTE}`; const tw = ctx.measureText('chega pelo sangue').width + 22;
    ctx.fillStyle = 'rgba(8,10,9,.82)'; caixa(ctx, tx, ty, tw, 38, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText('chega pelo sangue', tx + 11, ty + 20); ctx.textBaseline = 'alphabetic';
  }
  entradaPele(ctx, P, agora, x, y, al);
  ctx.globalAlpha = al; ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.14)'; caixa(ctx, x, y, w, h, r); ctx.stroke();
  // a frase do último toque (o tempo de cada um vai nela)
  let yy = y + h + 40;
  if (P.msg && P.msg.txt){
    const e = sai((agora - P.msg.t) / 300);
    ctx.globalAlpha = al * e; ctx.fillStyle = P.msg.bem ? VERDE : AMARELO; ctx.textAlign = 'left';
    const L2 = legendaPele(ctx, P.msg.txt, w);   // 18/11: a frase cabe inteira (26 px em 2 linhas; senão 23 px)
    L2.ls.forEach((l, i) => ctx.fillText(l, x, yy - 4 + i * L2.lh));
  }
  // 18/11 tarde (o Lucca: "não quero que apareça para a pessoa o que aparece para mim"): as fileiras de botões saíram do vídeo; o
  // controle é só dele (painel, teclas e o toque na pele, que abre o menu por cima do painel, fora do vídeo)
  G.peleChips = []; G.peleImg = { x, y, w, h };
  const ch = { fim:y + h + 120 };
  // pé: o que ela marcou (as respostas que a fala cita) e o aviso, ao lado da câmera
  const xP = 24, larg = CIRC.cx - CIRC.r - 16 - xP; let yP = Math.max(ch.fim + 36, CIRC.cy - CIRC.r + 30);
  ctx.globalAlpha = al; ctx.textAlign = 'left';
  const hs = (c.habitos || []).slice(0, 3).map(hb => `${hb.nome}: ${hb.valor}`);
  if (hs.length && L.marcou){ ctx.font = `600 23px ${FONTE}`; ctx.fillStyle = AZUL; quebra(ctx, 'Você marcou: ' + hs.join(' · '), larg, 3).forEach(l => { ctx.fillText(l, xP, yP); yP += 29; }); yP += 6; }
  ctx.fillStyle = APAGADO; ctx.font = `500 20px ${FONTE}`; ctx.fillText('Ilustração. Varia de pessoa para pessoa.', xP, Math.min(H - 20, yP));
  ctx.globalAlpha = 1;
  return true;
}
function cenaPeleDentro(ctx, c, t){
  if (!pxBase()) return false;
  const ent = sai(t / 400);
  escurece(ctx, .94 * sai(t / 250));
  ctx.globalAlpha = ent; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; ctx.font = `700 46px ${FONTE}`; ctx.fillText('De fora e de dentro', 40, 212);
  ctx.fillStyle = AMARELO; ctx.fillRect(40, 230, 64, 3);
  return desenhaPele(ctx, c, { y:252, grupos:PELE_ROT.dentro, al:ent, marcou:true });
}

// 14/11 (o Lucca sobre o cartão "O que importa aos 45": "a imagem tá uma merda, esse card com esses pontos"): o caminho em
// frentes, uma embaixo da outra numa linha só, cada uma com o seu número; no fim, a frase do fim (c.fim). 17/11 (v7): "Não é só rosto: é
// a sua saúde inteira." no lugar de "Com acompanhamento, fica simples." (parece venda)
// 18/11: com a pele, o item da inflamação abre nos seis de dentro ("o que vem de dentro"): P, um dos seis ou o toque abre;
// a lista e a pele se fundem em 0,35 s
function cenaCaminho(ctx, c, t){
  const P = c.pele && G.pele, agora = performance.now();
  const k = P ? (P.aberto ? sai((agora - P.abT) / 350) : 1 - sai((agora - P.abT) / 350)) : 0;
  if (k >= 1 && cenaPeleCaminho(ctx, c, 1)) return true;
  G.peleChips = []; G.peleImg = null;
  const fez = cenaCaminhoLista(ctx, c, t);
  if (k > 0) cenaPeleCaminho(ctx, c, k);
  return fez;
}
function cenaPeleCaminho(ctx, c, al){
  if (!pxBase()) return false;
  escurece(ctx, .97 * al);
  ctx.globalAlpha = al; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; ctx.font = `700 52px ${FONTE}`; ctx.fillText(c.titulo || 'O caminho', 50, 232);
  ctx.fillStyle = AMARELO; ctx.fillRect(50, 250, 64, 3);
  const xn = 74, yn = 296, n = c.pele.passo;   // o número do item no cartão (sem o item, só o rótulo)
  if (n){
    ctx.fillStyle = '#0b100e'; ctx.beginPath(); ctx.arc(xn, yn, 24, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = AMARELO; ctx.beginPath(); ctx.arc(xn, yn, 24, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = AMARELO; ctx.font = `700 26px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), xn, yn + 1);
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `650 36px ${FONTE}`; ctx.fillText('O que vem de dentro', n ? 114 : 50, yn + 1);
  ctx.textBaseline = 'alphabetic';
  return desenhaPele(ctx, c, { y:336, grupos:PELE_ROT.caminho, al, marcou:false });
}
function cenaCaminhoLista(ctx, c, t){
  const ps = (c.passos || []).slice(0, 5); if (!ps.length) return false;
  escurece(ctx, .94 * sai(t / 250));
  const x0 = 50, xn = 96, y0 = 350, passo = Math.min(124, (880 - y0) / Math.max(1, ps.length - 1 || 1)), ent = sai(t / 350);
  ctx.globalAlpha = ent; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; ctx.font = `700 52px ${FONTE}`; ctx.fillText(c.titulo || 'O caminho', x0, 232);
  ctx.fillStyle = AMARELO; ctx.fillRect(x0, 250, 64, 3);
  const ult = sai((t - 300 - (ps.length - 1) * 550) / 400), yFim = y0 + (ps.length - 1) * passo;
  const anda = lim((t - 300) / (Math.max(1, ps.length - 1) * 550), 0, 1);
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xn, y0); ctx.lineTo(xn, y0 + (yFim - y0) * anda); ctx.stroke();
  ps.forEach((p, k) => {
    const g = sai((t - 300 - k * 550) / 350); if (g <= 0) return;
    const y = y0 + k * passo;
    ctx.globalAlpha = g;
    ctx.fillStyle = '#0b100e'; ctx.beginPath(); ctx.arc(xn, y, 27, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = AMARELO; ctx.beginPath(); ctx.arc(xn, y, 27, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = AMARELO; ctx.font = `700 28px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(k + 1), xn, y + 1);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `650 37px ${FONTE}`;
    const ls = quebra(ctx, p.t || '', W - 160 - 30, 2), dy = ls.length > 1 ? -21 : 0;
    ls.forEach((l, i) => ctx.fillText(l, 152 + (1 - g) * 18, y + dy + i * 43 + 1));
    ctx.textBaseline = 'alphabetic';
  });
  if (ult > 0 && c.fim){   // o contraste, depois da última frente
    const tf = sai((t - 900 - (ps.length - 1) * 550) / 400); ctx.globalAlpha = tf;
    ctx.font = `700 30px ${FONTE}`; const larg = CIRC.cx - CIRC.r - 18 - 24, ls = quebra(ctx, c.fim, larg - 36, 2), h = ls.length * 40 + 26, yb = H - 24 - h;
    ctx.fillStyle = 'rgba(13,106,77,.96)'; caixa(ctx, 24, yb, larg, h, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'top'; ls.forEach((l, i) => ctx.fillText(l, 42, yb + 15 + i * 40)); ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
  return true;
}

// 18/11 (o Lucca, no Samuel: "cadê o objetivo completo marcado?"): "Pra onde leva" mostra a pergunta do teste com a opção que ela
// marcou, no visual do /pele/ (fundo claro, opção marcada com a borda verde e o fundo verde-claro, pele/pele.css .opt[aria-pressed])
// e o ✓ desenhado; só a escolhida. Entra em 0,3 s; a opção aos 0,35 s; o ✓ aos 0,7 s.
const PELE_UI = { bg:'#f3f5f2', fg:'#141c17', muted:'#5d6b63', accent:'#0d6a4d', accent2:'#dcefe6' };
function cenaObjetivo(ctx, c, t){
  if (!c.opcao) return false;
  escurece(ctx, .9 * sai(t / 250));
  const x0 = 40, w = W - 80, pad = 36, ent = sai(t / 300);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.font = `700 46px ${FONTE}`; const ql = quebra(ctx, c.pergunta || '', w - 2 * pad, 3);
  ctx.font = `650 38px ${FONTE}`; const ol = quebra(ctx, c.opcao, w - 2 * pad - 2 * 28 - 70, 3);
  const hRot = c.rot ? 50 : 0, hQ = ql.length * 56, hO = ol.length * 48 + 2 * 30;
  const h = pad + hRot + hQ + 36 + hO + pad, y0 = Math.max(TOPO + 20, Math.round((TOPO + 20 + 990 - h) / 2)) + (1 - ent) * 24;
  ctx.globalAlpha = ent;
  ctx.fillStyle = PELE_UI.bg; caixa(ctx, x0, y0, w, h, 28); ctx.fill();
  let y = y0 + pad;
  if (c.rot){ ctx.fillStyle = PELE_UI.muted; ctx.font = `600 26px ${FONTE}`; ctx.fillText(c.rot, x0 + pad, y); y += hRot; }
  ctx.fillStyle = PELE_UI.fg; ctx.font = `700 46px ${FONTE}`; ql.forEach((l, i) => ctx.fillText(l, x0 + pad, y + i * 56)); y += hQ + 36;
  const g = sai((t - 350) / 300);
  if (g > 0){
    const ox = x0 + pad, ow = w - 2 * pad;
    ctx.globalAlpha = ent * g;
    ctx.fillStyle = PELE_UI.accent2; caixa(ctx, ox, y, ow, hO, 18); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = PELE_UI.accent; ctx.stroke();
    ctx.fillStyle = PELE_UI.fg; ctx.font = `650 38px ${FONTE}`; ol.forEach((l, i) => ctx.fillText(l, ox + 28, y + 30 + i * 48 + 2));
    // o ✓: círculo verde e o traço branco, desenhado da esquerda para a direita
    const cx = ox + ow - 28 - 26, cy = y + hO / 2, k = sai((t - 700) / 350);
    if (k > 0){
      ctx.globalAlpha = ent * g * Math.min(1, k * 2);
      ctx.fillStyle = PELE_UI.accent; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.fill();
      const a = [cx - 12, cy + 1], m = [cx - 3, cy + 10], b = [cx + 13, cy - 9], d1 = Math.hypot(m[0] - a[0], m[1] - a[1]), d2 = Math.hypot(b[0] - m[0], b[1] - m[1]), L = (d1 + d2) * k;
      ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      if (L <= d1) ctx.lineTo(a[0] + (m[0] - a[0]) * L / d1, a[1] + (m[1] - a[1]) * L / d1);
      else { ctx.lineTo(m[0], m[1]); const q = (L - d1) / d2; ctx.lineTo(m[0] + (b[0] - m[0]) * q, m[1] + (b[1] - m[1]) * q); }
      ctx.stroke(); ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    }
  }
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  return true;
}

// ---------- teleprompter (só DOM) ----------
function prompter(){
  const bs = G.o.blocos, b = bs[G.bloco] || { titulo:'', fala:'' }, n = bs.length;
  D.pTit.textContent = b.titulo || '';
  D.pPos.textContent = n ? `${G.bloco + 1} de ${n}${G.o.fonte === 'estoque' ? ' · estoque' : ''}` : '';
  if (D.pPassos.childElementCount !== n) D.pPassos.innerHTML = bs.map(() => '<i><u></u></i>').join('');
  [...D.pPassos.children].forEach((e, k) => { e.className = k < G.bloco ? 'feito' : k === G.bloco ? 'agora' : ''; if (k !== G.bloco) e.firstChild.style.width = ''; });
  // 12/11: [APONTE: região] (roteiro do Claude) vira dica destacada no teleprompter; nunca vai para o canvas
  D.pTxt.textContent = '';
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
  cabeTexto();
  D.ant.disabled = G.bloco === 0; D.prox.disabled = G.bloco >= n - 1;
  if (G.blocoVisto !== G.bloco){ G.blocoVisto = G.bloco; G.blocoT = performance.now(); G.foco = null; G.pele = null; riSai(); G.peleChips = []; G.peleImg = null; G.formaMan = null; fechaMenuPele(); confereVersao(false); if (G.estado === 'rec'){ (G.blocosVistos ||= new Set()).add(G.bloco); contaBloco(); } }   // a cena do bloco começa agora
  marcaTempo();
  botoesFoco(); botoesPele(); botoesRosto();
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
  const u = D.pPassos.children[G.bloco] && D.pPassos.children[G.bloco].firstChild;
  if (!rec){ if (u) u.style.width = ''; D.prox.classList.remove('pulsa'); return; }
  const fr = Math.min(1, (performance.now() - G.blocoT) / tempoBloco(G.o.blocos[G.bloco], G.p.ritmo));
  if (u) u.style.width = (fr * 100).toFixed(1) + '%';
  D.prox.classList.toggle('pulsa', fr >= 1 && !ult);
}
function aviso(t){ D.aviso.textContent = t; D.aviso.hidden = !t; }
function info(t){ D.info.textContent = t || ''; }

// ---------- estados ----------
function estado(e){
  G.estado = e;
  D.el.dataset.estado = e;
  if (e === 'rev' || e === 'fim') fechaMenuPele();
  if (e === 'prep' && vNova) setTimeout(recarregaSePode, 0);   // 18/11: a versão nova que chegou gravando entra quando volta ao preparo
  const rev = e === 'rev' || e === 'fim';
  D.grav.hidden = rev; D.rev.hidden = e !== 'rev'; D.fim.hidden = e !== 'fim';
  D.tela.hidden = rev; D.cam.style.visibility = rev || !G.mostraCam || !G.cam ? 'hidden' : '';
  D.prompt.hidden = rev; D.ver.hidden = !rev;
  D.rec.classList.toggle('on', e === 'rec');
  if (e === 'rev') window.USO?.tela('revisao'); else if (e === 'prep' || e === 'conta' || e === 'rec') window.USO?.tela('gravador');
  D.recT.textContent = e === 'rec' ? '0:00 / ' + mmss(G.p.alvo * 1000) : e === 'conta' ? 'Cancelar' : G.aguarda ? 'Roteiro chegando…' : 'Gravar';
  marcaTempo();
  D.rec.setAttribute('aria-label', e === 'rec' ? 'Parar a gravação' : e === 'conta' ? 'Cancelar a contagem' : 'Começar a gravar');
  D.rec.disabled = e === 'prep' && (!G.pronto || !!G.aguarda);
  D.fotos.querySelectorAll('button').forEach(b => { b.disabled = rev; });
  D.zoom.disabled = rev; D.cami.disabled = rev || !G.cam;
  botoesFoco(); botoesPele(); botoesRosto();
  nota();
}

// ---------- abrir / fechar ----------
/** o = { codigo, nome, fotos:[{rot, url, chave}], blocos:[{titulo, fala, faixa}], aoMarcar?:fn, foto?:chave }. */
async function abrir(o){
  o = o || {};
  monta();
  if (G) fechar();
  G = { o, fotos:(o.fotos || []).filter(f => f.url).map(f => ({ ...f })), foto:0, bloco:0, estado:'prep', pronto:false, cam:false, mic:false, mostraCam:true,
    stream:null, rec:null, chunks:[], t0:0, take:null, anel:null, ptrs:new Map(), gesto:null, quadros:0, camQuadros:0, camUlt:0, camParada:false, camParadas:0, camParadaS:null, iv:0, relogio:0, wake:null, p:params(o), aguarda:!!o.aguarda };
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
  preparaFormas(G.o.blocos);   // 17/11: as ilustrações do "Como se forma"
  preparaPele(G.o.blocos);     // 18/11: os quadros da pele interativa
  preparaRosto(G.o.blocos);    // 20/11: o rosto de exemplo do bloco da idade (diferenças prontas antes de gravar)
  confereVersao(true);         // 18/11: a versão publicada (recarrega se houver nova)
  await Promise.all([Promise.all(G.fotos.map(carregaFoto)).then(() => { if (G === g0) achaRosto(); }), abreCamera()]);
  if (G !== g0) return;
  const algumaFoto = G.fotos.some(f => f.img);
  if (!algumaFoto) return falha('A foto não carregou. O link das fotos vale 10 minutos: feche, toque em Ver de novo e abra o gravador.');
  if (!G.mic) return;   // falha() já mostrou o motivo
  if (!window.MediaRecorder) return falha('Este navegador não grava vídeo. Use o Safari do iPhone atualizado.');
  G.pronto = true; estado('prep');
  info(G.cam ? '' : 'Sem câmera: o vídeo sai com a foto e a sua voz.');
  if (!G.aguarda) D.rec.focus();
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
  G.msBlocos = G.o.blocos.map(() => 0); G.blocoAtivo = G.bloco; G.blocoIni = G.t0; G.saltou = false; G.saltoAdiado = false;
  estado('rec');
  info('');
  G.relogio = setInterval(() => {
    if (!G || G.estado !== 'rec') return;
    const ms = performance.now() - G.t0;
    D.recT.textContent = mmss(ms) + ' / ' + mmss(G.p.alvo * 1000);
    D.rec.classList.toggle('fim-perto', ms >= G.p.alvo * 1000);
    const n = G.o.blocos.length;   // o único salto automático: a pergunta de interesse nunca fica de fora
    // 18/11 noite (gravação do Samuel: aos 2:40 o salto levou para a pergunta no meio do açúcar; "cadê o açúcar?… uma bugada"):
    // se ele mexeu na pele ou no "como se forma" nos últimos 20 s, não pula: avisa só no painel (o corte do teto segue valendo)
    if (!G.saltou && ms >= G.p.salto * 1000 && G.bloco < n - 1){
      const mexendo = Math.max(G.peleUlt || 0, G.formaUlt || 0, G.rostoUlt || 0) > performance.now() - 20000;   // 20/11: o rosto também
      if (mexendo){ if (!G.saltoAdiado){ G.saltoAdiado = true; nota(); } }
      else if (!G.saltoAdiado){ G.saltou = true; G.bloco = n - 1; prompter(); }
    }
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
  window.USO?.sinal('gravacao-fim', { ms:g.ms || 0, anel:g.anelUsos || 0, pinca:g.pincas || 0, foco:g.focos || 0, blocos:(g.blocosVistos || new Set()).size,
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
    G.gesto = null; G.tap = { t:performance.now(), x:p.x, y:p.y };
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
  const fim = G.ptrs.get(ev.pointerId), tp = G.tap; G.tap = null;
  G.ptrs.delete(ev.pointerId);
  clearTimeout(G.seguraT);
  if (tp && ev.type === 'pointerup' && !G.gesto && performance.now() - tp.t < 300 && Math.hypot(fim.x - tp.x, fim.y - tp.y) < 24){   // 14/11: toque curto no ponto = foco
    const alvo = (G.lupasPos || []).map(q => ({ q, d:Math.hypot(q.x - fim.x, q.y - fim.y) })).filter(o => o.d < o.q.r * 1.3).sort((a, b) => a.d - b.d)[0];
    if (alvo) focar(alvo.q.id);
    { const cm = (G.o.blocos[G.bloco] || {}).cena; if (cm && cm.tipo === 'mecanismo' && FORMA[cm.tema] && fim.y >= FQ.y && fim.y <= FQ.y + FQ.h) formaPula(null); }   // 18/11: toque no esquema = a etapa seguinte
    const pi = G.peleImg, pc0 = peleCena(), naPele = pc0 && pi && (pc0.pele.modo !== 'caminho' || (G.pele && G.pele.aberto)) && fim.x >= pi.x && fim.x <= pi.x + pi.w && fim.y >= pi.y && fim.y <= pi.y + pi.h;
    if (naPele) abreMenuPele();   // 18/11 tarde: toque na pele abre o menu (fora do vídeo)
    else if (riCena()) abreMenuRosto();   // 20/11: no bloco da idade, o toque no quadro abre o menu do rosto (fora do vídeo)
    else if (!alvo){ const c = peleCena(); if (c && c.pele.modo === 'caminho' && !(G.pele && G.pele.aberto)){ const p = (c.passos || []).findIndex(x => x.k === c.pele.k), y = 350 + p * Math.min(124, (880 - 350) / Math.max(1, (c.passos.length - 1) || 1)); if (p >= 0 && Math.abs(fim.y - y) < 50) peleAcao('abrir'); } }   // toque no item da inflamação (ou, sem ele, no do metabolismo) abre
  }
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
  D.foco.onclick = ev => { const b = ev.target.closest('button[data-id]'); if (b) focar(b.dataset.id); };
  D.pele.onclick = ev => { const b = ev.target.closest('button[data-p]'); if (b){ b.blur(); peleAcao(b.dataset.p); } };
  D.peleMenu.onclick = ev => { const r = ev.target.closest('button[data-r]'); if (r){ riAcao(r.dataset.r); fechaMenuPele(); return; } const b = ev.target.closest('button[data-p]'); if (b) peleAcao(b.dataset.p); if (b || ev.target.closest('.ga-pm-x')) fechaMenuPele(); };
  D.rostoP.onclick = ev => { const b = ev.target.closest('button[data-r]'); if (b){ b.blur(); riAcao(b.dataset.r); } };
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
  D.refazer.onclick = () => { if (!G) return; window.USO?.sinal('refazer'); liberaTake(); G.bloco = 0; estado('prep'); prompter(); info(''); requestAnimationFrame(encaixa); };
  D.enviar.onclick = enviar; D.denovo.onclick = enviar;
  D.marcar.onclick = () => { const fn = G && G.o.aoMarcar; fechar(); try { fn?.(); } catch (e) { /* ok */ } };
  D.tentar.onclick = () => { if (!G) return; const o = G.o; fechar(); abrir(o); };
  addEventListener('resize', () => { if (G) encaixa(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (G) encaixa(); }).observe(D.el.querySelector('.ga-palco'));   // a barra muda de altura: o quadro acompanha (nunca durante a gravação)
  document.addEventListener('keydown', ev => {
    if (!G) return;
    const vale = ['prep', 'rec'].includes(G.estado);
    if (ev.key === ' ' && vale && !ev.target.closest?.('input, textarea')){ ev.preventDefault(); if (document.activeElement?.closest?.('.ga')) document.activeElement.blur(); if (!ev.repeat) D.prox.click(); return; }   // 13/11: espaço avança (sem acionar o botão em foco)
    { const cm = vale && !ev.target.closest?.('input, textarea') && (G.o.blocos[G.bloco] || {}).cena; if (cm && cm.tipo === 'mecanismo' && FORMA[cm.tema] && /^[1-9]$/.test(ev.key) && +ev.key <= FORMA[cm.tema].et.length){ ev.preventDefault(); formaPula(+ev.key - 1); return; } }   // 18/11: 1–4 = etapa do "como se forma"
    const pc = vale && !ev.target.closest?.('input, textarea') && !ev.metaKey && !ev.ctrlKey && !ev.altKey && peleCena();   // 18/11: as teclas da pele (1–9, 0, M, R; no caminho P e 1–6)
    if (pc){ const tk = teclasPele(pc).find(([, t]) => t === ev.key.toUpperCase()); if (tk){ ev.preventDefault(); if (!ev.repeat) peleAcao(tk[0]); return; } }
    const rc = vale && !ev.target.closest?.('input, textarea') && !ev.metaKey && !ev.ctrlKey && !ev.altKey && riCena();   // 20/11: as teclas do rosto (F, 0, 1–5 Mais, Q–T Menos)
    if (rc){ const a = riTecla(rc, ev.key); if (a){ ev.preventDefault(); if (!ev.repeat) riAcao(a); return; } }
    if (/^[1-9]$/.test(ev.key) && vale && !ev.target.closest?.('input, textarea')){ const b = D.foco.querySelectorAll('button')[+ev.key - 1]; if (b && !D.foco.hidden){ ev.preventDefault(); focar(b.dataset.id); } return; }   // 14/11: 1, 2, 3 = foco
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
function trocarBlocos(bs, fonte){ if (!G || G.estado !== 'prep' || !Array.isArray(bs) || !bs.length) return false; exemplosDe(bs).forEach(carregaExemplo); preparaFormas(bs); preparaPele(bs); preparaRosto(bs); G.o.blocos = bs; G.o.fonte = fonte; G.bloco = 0; G.blocoVisto = -1; G.lupasLay = null; D.foco.dataset.k = ''; D.pele.dataset.k = ''; D.rostoP.dataset.k = ''; prompter(); return true; }
// 13/11 19h45: o "Gravar análise" da lista abre o gravador na hora, com o Gravar segurado até o roteiro do Claude chegar (ou o prazo vencer)
function liberar(){ if (!G || !G.aguarda) return; G.aguarda = false; if (G.estado === 'prep'){ estado('prep'); if (G.pronto) D.rec.focus(); } }
return { abrir, fechar, trocarBlocos, liberar, versao:VERSAO, _estado:() => G, _mime:pickMime, _decideParada:decideParada, _tempoBloco:tempoBloco, _params:params, _layoutExemplo:layoutExemplo, _peleMenu:() => ({ aberto:!!(D && D.peleMenu && !D.peleMenu.hidden), ids:D ? [...D.peleMenu.querySelectorAll('button[data-p]')].map(b => b.dataset.p) : [] }), _pele:() => ({ entra:G && G.pele && G.pele.entra ? G.pele.entra.id : null, vasos:PX.vI ? PX.vI.length : 0, pulso:!!(G && G.pele && G.pele.pulso), P:G && G.pele, px:PX.ult || null, chips:G && G.peleChips, difs:Object.keys(PX.d), chave:PX.chave }), _peleAcao:peleAcao, _rosto:() => riEstado(), _riAcao:a => riAcao(a), _forma:() => (G && G.formaVis) || null, _formaHoras:(tema, fala) => horasForma(FORMA[tema], fala, 2.5), _versao:() => ({ carregada:V_CARREGADA, nova:vNova, url:V_URL }), _confereVersao:confereVersao, _peleLegendas:() => { const c = document.createElement('canvas').getContext('2d'); return textosPele().map(t => { const L = legendaPele(c, t, PX.w); return { t, n:L.ls.length, px:L.px, corta:L.ls.some(l => /…$/.test(l)) }; }); }, _formas:() => [...FORMA_CACHE].map(([src, e]) => ({ src, ok:e.ok, erro:e.erro, w:e.img.naturalWidth })) };
})();
