// SCAN do /pele/ v2 (04/11/2026): o da pele2 (3 fotos: frente, depois a esquerda, depois a direita; copiado de
// /pele2/scan.js, a pele2 fica intacta). Muda uma coisa, pedido do Lucca (reprovação de 04/11, item g): TODA ordem fica
// NO OVAL, na parte de baixo do rosto, também na foto de frente ("Chegue mais perto", "Olhe reto", "Segure"); a faixa de
// baixo (#scan-dica) fica só para leitor de tela. Anel de risquinhos que acende, ✓ por lado (chips Esquerda/Frente/
// Direita), foto automática, voz curta que o botão “Desligar voz” (canto inferior direito) desliga. Malha medida no próprio elemento de vídeo (Safari do
// iPhone); vídeo e canvas espelhados pelo CSS (scaleX(-1)); o desenho é feito em coordenadas da imagem crua.
import { criarFace, FaceLandmarker, medir, pose, geometria, caixa, OVAL, NITIDEZ_MIN, subirTesta, olhoMedioY } from './rosto.js?v=2';

const $ = id => document.getElementById(id);
const N_TK = 72;                    // risquinhos do anel
const FRENTE_TOL = .08;             // |yaw - 0,5| para contar como "de frente"
const LADO_ALVO = .12;              // |yaw - 0,5| para a foto de lado (v2: mais fácil que 0,15)
const LADO_MAX = .38;
const SEGURA_FRENTE = 650, SEGURA_LADO = 400;   // ms parado antes de tirar a foto
const LUZ_MIN = 70, LUZ_MAX = 220;
const ORDEM = ['frente', 'esquerda', 'direita'];
// yaw > 0,5 = a pessoa virou para a ESQUERDA dela (ver pose() em rosto.js). Na tela espelhada isso aparece à esquerda.
const SINAL = { esquerda:1, direita:-1 };

let face = null, stream = null, rodando = false, raf = null, ts = 0, quadro = 0;
let feitoAte = 0, guiaAtual = '';
let fotos = {}, segDesde = 0, narizAnt = null, ultM = null, ladoDesde = 0, cb = null, geo = null, ticks = [];

const estagio = () => ORDEM.find(a => !fotos[a]) || 'fim';
function dica(html, ok){ const d = $('scan-dica'); if (d.innerHTML !== html) d.innerHTML = html; d.classList.toggle('ok', !!ok); }

// ---------- voz curta (só quando o passo muda; o botão Desligar voz desliga) ----------
let voz = true, ultFala = '', ultT = -1e9;
export function liberarVoz(){ try { if ('speechSynthesis' in window){ speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } } catch {} }   // iOS: dentro do toque
function falar(txt, forcar){
  if (!voz || !('speechSynthesis' in window) || !txt) return;
  const t = performance.now();
  if (!forcar && (txt === ultFala && t - ultT < 6000 || t - ultT < 2500)) return;
  ultFala = txt; ultT = t;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'pt-BR'; u.rate = 1.05; speechSynthesis.speak(u); } catch {}
}
// 09/11 (Lucca): o botão saiu do topo e foi para o canto inferior direito, com texto: "Desligar voz" ↔ "Ligar voz"
// (desligada: ícone cinza e riscado). aria-pressed = voz ligada.
$('scan-voz').addEventListener('click', () => {
  voz = !voz; const b = $('scan-voz'); b.classList.toggle('off', !voz); b.setAttribute('aria-pressed', String(voz));
  $('scan-voz-txt').textContent = voz ? 'Desligar voz' : 'Ligar voz';
  if (!voz) try { speechSynthesis.cancel(); } catch {}
});

// ---------- anel e oval, no tamanho real do elemento de vídeo ----------
function medirPalco(){
  const v = $('v-fg'), W = v.clientWidth || innerWidth, H = v.clientHeight || innerHeight;
  const rx = Math.min(W*.40, (H*.58)/2/1.32), ry = rx*1.32, cx = W/2, cy = Math.max(H*.44, 104 + ry);
  geo = { W, H, rx, ry, cx, cy };
  v.style.setProperty('--rx', rx + 'px'); v.style.setProperty('--ry', ry + 'px'); v.style.setProperty('--cx', cx + 'px'); v.style.setProperty('--cy', cy + 'px');
  const svg = $('anel'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let h = ''; ticks = [];
  for (let k = 0; k < N_TK; k++){
    const a = k * 360 / N_TK, r = a*Math.PI/180, c = Math.cos(r), s = Math.sin(r);
    h += `<line class="tk" x1="${(cx + (rx + 10)*c).toFixed(1)}" y1="${(cy - (ry + 10)*s).toFixed(1)}" x2="${(cx + (rx + 24)*c).toFixed(1)}" y2="${(cy - (ry + 24)*s).toFixed(1)}"/>`;
    ticks.push(a);
  }
  svg.innerHTML = h;
  const cv = $('malha'), dpr = Math.min(3, devicePixelRatio || 1); cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
  const g = $('guia'); g.style.left = cx + 'px'; g.style.top = (cy + ry*.22) + 'px'; g.style.width = Math.min(300, rx*2*.86) + 'px';   // centro-baixo do oval
}
// a = ângulo do risquinho (0 = direita da tela, 90 = topo). Lado esquerdo da PESSOA = esquerda da tela (espelho).
function pintarAnel(prog){
  const els = $('anel').children, fr = fotos.frente, holdF = prog.frente || 0;
  for (let k = 0; k < els.length; k++){
    const a = ticks[k]; let cls = 'tk';
    if ((a > 60 && a < 120) || (a > 240 && a < 300)){ const d = Math.min(Math.abs(a - 90), Math.abs(a - 270)); if (fr) cls += ' ok'; else if (d <= 30*holdF) cls += ' on'; }
    else {
      const lado = (a <= 60 || a >= 300) ? 'direita' : 'esquerda', d = lado === 'direita' ? Math.min(Math.abs(a), Math.abs(a - 360)) : Math.abs(a - 180);
      if (fotos[lado]) cls += ' ok'; else if (d <= 60*(prog[lado] || 0)) cls += ' on';
    }
    if (els[k].getAttribute('class') !== cls) els[k].setAttribute('class', cls);
  }
  const est = estagio();
  document.querySelectorAll('#angulos li').forEach(li => { li.classList.toggle('feito', !!fotos[li.dataset.a]); li.classList.toggle('agora', li.dataset.a === est); });
}
// modo: 'vire' | 'outro' (virou para o lado errado) | 'demais' | 'segure' | 'feito'; lado: frente/esquerda/direita
const NOME = { frente:'Frente', esquerda:'Esquerda', direita:'Direita' };
const GUIA = {
  vire:   l => `<small>Vire devagar para a</small><b>${l}</b>`,
  outro:  l => `<small>Para o outro lado:</small><b>${l}</b>`,
  demais: () => '<small>Virou demais:</small><b>volte um pouco</b>',
  segure: () => '<small>Isso!</small><b>Segure</b>',
  feito:  l => l === 'fim' ? '<b>Pronto!</b>' : `<b>${NOME[l]} pronta</b>`,
  msg:    (l, t) => `<b class="curto">${t}</b>`,
};
function guia(modo, lado, prog, txt){
  const g = $('guia');
  if (!modo){ if (!g.hidden){ g.hidden = true; guiaAtual = ''; } return; }
  g.hidden = false;
  const chave = modo + lado + (txt || '');
  if (chave !== guiaAtual){
    guiaAtual = chave;
    g.className = `guia ${modo} ${lado === 'direita' ? 'dir' : 'esq'}${lado === 'frente' ? ' frente' : ''}`;
    $('guia-txt').innerHTML = GUIA[modo](lado, txt);
  }
  $('guia-barra').style.width = Math.round((modo === 'feito' || (modo === 'segure' && lado !== 'frente') ? 1 : prog || 0) * 100) + '%';   // de frente, a barrinha mostra o tempo segurando
}
function medidorLuz(lum){
  const el = $('luz'), t = $('luz-txt');
  if (lum == null){ t.textContent = '☀ Luz'; el.className = 'luz'; $('luz-barra').style.width = '0%'; return; }
  const baixa = lum < LUZ_MIN, alta = lum > LUZ_MAX;
  el.className = 'luz' + (baixa ? ' baixa' : alta ? ' alta' : '');
  t.textContent = baixa ? '☀ Pouca luz' : alta ? '☀ Luz forte' : '☀ OK';
  $('luz-barra').style.width = Math.round(Math.max(8, Math.min(100, lum/170*100))) + '%';
}

// ---------- imagem crua → px do elemento (igual ao object-fit: cover centrado) ----------
function mapa(v){
  const { W, H } = geo, vw = v.videoWidth, vh = v.videoHeight, k = Math.max(W/vw, H/vh);
  const ox = (W - vw*k)/2, oy = (H - vh*k)/2;
  return { X: p => p.x*vw*k + ox, Y: p => p.y*vh*k + oy };
}
// teste: onde um ponto da imagem crua (0-1) aparece na TELA (já espelhado), para conferir a malha contra o vídeo
window.__mapaTela = p => { const v = $('v-fg'), m = mapa(v), r = v.getBoundingClientRect(); return { x:r.left + geo.W - m.X(p), y:r.top + m.Y(p) }; };
function desenharMalha(v, lm, bom){
  const cv = $('malha'), ctx = cv.getContext('2d'), dpr = cv.width / geo.W;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  if (!lm) return;
  const { X, Y } = mapa(v);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.ellipse(geo.cx, geo.cy, geo.rx + 2, geo.ry + 2, 0, 0, Math.PI*2); ctx.clip();
  ctx.lineWidth = .6; ctx.strokeStyle = bom ? 'rgba(160,240,205,.5)' : 'rgba(255,255,255,.34)';
  ctx.beginPath();
  for (const { start, end } of (FaceLandmarker?.FACE_LANDMARKS_TESSELATION || [])){ const a = lm[start], b = lm[end]; if (!a || !b) continue; ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); }
  ctx.stroke();
  // contorno do rosto (com a testa até perto do cabelo, como no recorte que vai para a análise)
  const tela = OVAL.map(i => ({ x:X(lm[i]), y:Y(lm[i]) })), Q = lm.map(p => ({ y:Y(p) }));
  ctx.lineWidth = 2; ctx.strokeStyle = bom ? 'rgba(82,201,156,.95)' : 'rgba(255,255,255,.7)';
  ctx.beginPath(); subirTesta(tela, olhoMedioY(Q), Y(lm[10])).forEach((p, j) => j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  ctx.restore();
  window.__malhaDiag = { nariz:{ x:+X(lm[1]).toFixed(1), y:+Y(lm[1]).toFixed(1) }, W:geo.W, H:geo.H, vw:v.videoWidth, vh:v.videoHeight };
}

// ---------- avaliação de cada quadro ----------
function avaliar(v, faces){
  if (!faces.length) return { msg:'Coloque o rosto dentro do oval' };
  if (faces.length > 1) return { msg:'Só você na frente da câmera' };
  const lm = faces[0], { X, Y } = mapa(v), b = caixa(OVAL.map(i => ({ x:X(lm[i]), y:Y(lm[i]) })));
  let p = pose(lm);
  if (window.__poseSim) p = window.__poseSim(p, estagio()) || p;   // só no teste automático (câmera falsa parada)
  const larg = (b.x1 - b.x0) / (2*geo.rx), dx = ((b.x0 + b.x1)/2 - geo.cx) / geo.rx, dy = ((b.y0 + b.y1)/2 - geo.cy) / geo.ry;
  const diag = window.__scanDiag = { larg:+larg.toFixed(2), dx:+dx.toFixed(2), dy:+dy.toFixed(2), yaw:+p.yaw.toFixed(2), pitch:+p.pitch.toFixed(2), roll:+p.roll.toFixed(1) };
  if (quadro % 2 === 0 || !ultM) ultM = medir(v, lm, v.videoWidth, v.videoHeight);
  Object.assign(diag, { lum:Math.round(ultM.lum), nitidez:Math.round(ultM.nitidez), lado:+ultM.lado.toFixed(2) });
  const nz = lm[1], mexeu = narizAnt && Math.hypot(nz.x - narizAnt.x, nz.y - narizAnt.y) > .012; narizAnt = { x:nz.x, y:nz.y };
  const base = { lm, p, mexeu }, est = estagio();
  if (larg < (est === 'frente' ? .58 : .42)) return { ...base, msg:'Chegue o celular mais perto' };
  if (larg > 1.2) return { ...base, msg:'Afaste um pouco o celular' };
  if (est === 'frente'){
    if (Math.abs(dx) > .28 || Math.abs(dy) > .26) return { ...base, msg:'Rosto no meio do oval' };
    if (Math.abs(p.yaw - .5) > FRENTE_TOL) return { ...base, msg:'Olhe reto para a câmera' };
    if (Math.abs(p.roll) > 15) return { ...base, msg:'Endireite a cabeça' };
    if (p.pitch < .25 || p.pitch > .62) return { ...base, msg:'Celular na altura do rosto' };
  } else if (Math.abs(dy) > .34) return { ...base, msg:'Rosto no meio do oval' };
  if (ultM.lum < LUZ_MIN) return { ...base, msg:'Procure mais luz: de frente para uma janela ou lâmpada' };
  if (ultM.lum > LUZ_MAX) return { ...base, msg:'Luz forte demais: saia um pouco dela' };
  if (est === 'frente' && ultM.lado > .3) return { ...base, msg:'A luz está de lado: vire de frente para ela' };
  return { ...base, msg:null };
}
const nitido = est => ultM && ultM.nitidez >= (est === 'frente' ? NITIDEZ_MIN : NITIDEZ_MIN*.8);
const PEDE = { esquerda:'Vire para a sua <b>esquerda ←</b>', direita:'Agora para a sua <b>direita →</b>' };
const OUTRO = { esquerda:'Para o outro lado: a sua <b>esquerda ←</b>', direita:'Para o outro lado: a sua <b>direita →</b>' };
const FALA = { frente:'Olhe reto para a câmera', esquerda:'Vire devagar para a sua esquerda', direita:'Agora para a sua direita', fim:'Pronto' };

function loop(){
  if (!rodando) return;
  const v = $('v-fg');
  if (v.readyState >= 2 && v.videoWidth){
    if (v.clientWidth !== geo.W || v.clientHeight !== geo.H) medirPalco();   // barra do Safari abriu/fechou
    ts = Math.max(ts + 1, performance.now()); quadro++;
    const faces = face.detectForVideo(v, ts).faceLandmarks || [];
    const r = avaliar(v, faces), est = estagio(), agora = performance.now(), prog = {};
    desenharMalha(v, faces.length === 1 ? faces[0] : null, !r.msg);
    medidorLuz(r.lm ? ultM?.lum : null);
    const mostrandoFeito = agora < feitoAte;   // o ✓ do lado que acabou de sair fica um instante antes da próxima seta
    if (est === 'frente'){
      if (!r.msg && !r.mexeu && nitido(est)){
        segDesde ||= agora; prog.frente = Math.min(1, (agora - segDesde)/SEGURA_FRENTE);
        dica('Isso! Segure assim…', true); guia('segure', 'frente', prog.frente);
        if (prog.frente >= 1){ capturar(v, 'frente', r.p); return; }
      } else { segDesde = 0; dica(r.msg || 'Segure parado'); guia('msg', 'frente', 0, r.msg || 'Segure parado'); }
    } else if (est === 'esquerda' || est === 'direita'){
      const dev = r.p ? (r.p.yaw - .5) * SINAL[est] : 0;   // > 0 = virando para o lado pedido
      prog[est] = Math.max(0, Math.min(1, (dev - .02)/(LADO_ALVO - .02)));
      let gm = 'vire';
      if (!r.p){ segDesde = 0; gm = 'msg'; dica(r.msg || 'Coloque o rosto dentro do oval'); }
      else if (r.msg){ segDesde = 0; gm = 'msg'; dica(r.msg); }
      else if (dev < -.05){ segDesde = 0; gm = 'outro'; dica(OUTRO[est]); falar(FALA[est]); }
      else if (dev > LADO_MAX){ segDesde = 0; gm = 'demais'; dica('Não precisa virar tanto: volte um pouquinho'); }
      else if (prog[est] < 1){ segDesde = 0; dica(`${PEDE[est]}<small>devagar, até o anel acender</small>`); }
      else if (r.mexeu || !nitido(est) || Math.abs(r.p.roll) > 20){ segDesde = 0; gm = 'segure'; dica('Isso! Segure um instante', true); }
      else {
        segDesde ||= agora; gm = 'segure'; dica('Isso! Segure…', true);
        if (agora - segDesde >= SEGURA_LADO){ capturar(v, est, r.p); return; }
      }
      if (!mostrandoFeito) guia(gm, est, prog[est], gm === 'msg' ? (r.msg || 'Coloque o rosto dentro do oval') : null);
      if (agora - ladoDesde > 25000 && fotos.frente) $('scan-pular').hidden = false;   // não conseguiu os lados: segue com o que tem
    }
    pintarAnel(prog);
  }
  raf = requestAnimationFrame(loop);
}
function capturar(v, angulo, p){
  const cv = document.createElement('canvas'); cv.width = v.videoWidth; cv.height = v.videoHeight;
  cv.getContext('2d').drawImage(v, 0, 0);
  ts = Math.max(ts + 1, performance.now());
  const lm = (face.detectForVideo(cv, ts).faceLandmarks || [])[0];   // pontos do MESMO quadro capturado
  if (!lm){ cv.width = 0; segDesde = 0; raf = requestAnimationFrame(loop); return; }
  const m = medir(cv, lm, cv.width, cv.height);
  fotos[angulo] = { angulo, src:cv, lm, g:geometria(lm, cv.width, cv.height), pose:p, lum:Math.round(m.lum), nitidez:Math.round(m.nitidez), origem:'camera' };
  try { navigator.vibrate?.(40); } catch {}
  segDesde = 0; narizAnt = null; ladoDesde = performance.now();
  pintarAnel({});
  const prox = estagio();
  if (prox === 'fim'){ terminar(); return; }
  guia('feito', angulo); feitoAte = performance.now() + 900;
  dica(PEDE[prox], true); falar(FALA[prox], true);
  raf = requestAnimationFrame(loop);
}
function terminar(){
  rodando = false; cancelAnimationFrame(raf); guia('feito', 'fim');
  dica('Pronto!', true); pintarAnel({}); falar(FALA.fim, true);
  const f = fotos; setTimeout(() => { parar(); cb?.onPronto?.(f); }, 650);
}

export function parar(){
  rodando = false; cancelAnimationFrame(raf);
  if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  ['v-bg','v-fg'].forEach(id => { const v = $(id); v.srcObject = null; });
}
export function seguirComOQueTem(){ if (fotos.frente) terminar(); }
export async function abrir(callbacks){
  cb = callbacks; fotos = {}; segDesde = 0; narizAnt = null; ultM = null; quadro = 0; ladoDesde = performance.now(); feitoAte = 0;
  $('scan-pular').hidden = true; medirPalco(); guia('msg', 'frente', 0, 'Abrindo a câmera…'); pintarAnel({}); medidorLuz(null); dica('Abrindo a câmera…');
  try {
    face ??= await criarFace('VIDEO');
    stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ ideal:1280 }, height:{ ideal:960 } }, audio:false });
    for (const id of ['v-bg','v-fg']){ const v = $(id); v.srcObject = stream; await v.play(); }
    medirPalco(); dica('Olhe reto para a câmera'); guia('msg', 'frente', 0, 'Olhe reto para a câmera'); falar(FALA.frente, true); rodando = true; loop();
  } catch (e) {
    console.error(e); parar();
    const t = e?.name === 'NotAllowedError' ? 'Libere a câmera nas configurações, ou escolha uma foto' : 'Não consegui abrir a câmera';
    dica(t); guia('msg', 'frente', 0, t);
    cb?.onErro?.(e);
  }
}
addEventListener('resize', () => { if (rodando) medirPalco(); });
window.__scanFotos = () => Object.fromEntries(Object.entries(fotos).map(([k, f]) => [k, { lum:f.lum, nitidez:f.nitidez, yaw:+f.pose.yaw.toFixed(2), w:f.src.width, h:f.src.height }]));
