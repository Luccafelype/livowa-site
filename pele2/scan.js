// SCAN da pele2: a pessoa olha reto e depois vira o rosto devagar para um lado e para o outro.
// Anel de risquinhos em volta do oval: em cima e embaixo acendem quando sai a foto de frente; cada lado acende
// conforme o rosto vira para ele e trava (verde) quando sai a foto boa daquele lado. Medidor de luz "☀ OK" no topo,
// malha do rosto desenhada por cima. Uma foto por ângulo, tirada sozinha só com o rosto parado, nítido e com luz boa.
import { criarFace, FaceLandmarker, medir, pose, geometria, caixa, OVAL, NITIDEZ_MIN } from './rosto.js';

const $ = id => document.getElementById(id);
const N_TK = 72;                    // risquinhos do anel
const FRENTE_TOL = .08;             // |yaw - 0,5| para contar como "de frente"
const LADO_ALVO = .15;              // |yaw - 0,5| para a foto de lado (~25 a 30 graus)
const LADO_MAX = .36;               // além disso a malha piora
const SEGURA_FRENTE = 700, SEGURA_LADO = 450;   // ms parado antes de tirar a foto
const LUZ_MIN = 70, LUZ_MAX = 220;

let face = null, stream = null, rodando = false, raf = null, ts = 0, quadro = 0;
let fotos = {}, segDesde = 0, narizAnt = null, ultM = null, lados0 = 0, cb = null, geo = null, ticks = [];

const estagio = () => !fotos.frente ? 'frente' : (!fotos.esquerda || !fotos.direita) ? 'lados' : 'fim';
function dica(txt, ok){ const d = $('scan-dica'); if (d.textContent !== txt) d.textContent = txt; d.classList.toggle('ok', !!ok); }

// ---------- anel e oval (em px da tela) ----------
function medirPalco(){
  const W = innerWidth, H = innerHeight;
  const rx = Math.min(W*.42, (H*.62)/2/1.32), ry = rx*1.32, cx = W/2, cy = Math.max(H*.45, 110 + ry);
  geo = { W, H, rx, ry, cx, cy };
  const fg = $('v-fg'); fg.style.setProperty('--rx', rx + 'px'); fg.style.setProperty('--ry', ry + 'px'); fg.style.setProperty('--cx', cx + 'px'); fg.style.setProperty('--cy', cy + 'px');
  const svg = $('anel'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let h = ''; ticks = [];
  for (let k = 0; k < N_TK; k++){
    const a = k * 360 / N_TK, r = a*Math.PI/180, c = Math.cos(r), s = Math.sin(r);
    const x1 = cx + (rx + 10)*c, y1 = cy - (ry + 10)*s, x2 = cx + (rx + 24)*c, y2 = cy - (ry + 24)*s;
    h += `<line class="tk" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    ticks.push(a);
  }
  svg.innerHTML = h;
  const cv = $('malha'), dpr = Math.min(2, devicePixelRatio || 1); cv.width = W*dpr; cv.height = H*dpr;
}
// arco de cada parte do anel: a = ângulo do risquinho (0 = direita da tela, 90 = topo)
const ARCO = { direita:a => Math.min(Math.abs(a), Math.abs(a - 360)) , esquerda:a => Math.abs(a - 180) };
// esquerda/direita = da PESSOA. A tela é espelhada: o lado esquerdo dela aparece à esquerda da tela.
function pintarAnel(prog){
  const els = $('anel').children, fr = fotos.frente, holdF = prog.frente || 0;
  for (let k = 0; k < els.length; k++){
    const a = ticks[k]; let cls = 'tk';
    const topoBase = (a > 60 && a < 120) || (a > 240 && a < 300);
    if (topoBase){ const d = Math.min(Math.abs(a - 90), Math.abs(a - 270)); if (fr) cls += ' ok'; else if (d <= 30*holdF) cls += ' on'; }
    else {
      const lado = (a <= 60 || a >= 300) ? 'direita' : 'esquerda', d = ARCO[lado](a);
      if (fotos[lado]) cls += ' ok'; else if (d <= 60*(prog[lado] || 0)) cls += ' on';
    }
    if (els[k].getAttribute('class') !== cls) els[k].setAttribute('class', cls);
  }
  document.querySelectorAll('#angulos li').forEach(li => li.classList.toggle('feito', !!fotos[li.dataset.a]));
}
function medidorLuz(lum){
  const el = $('luz'), t = $('luz-txt');
  if (lum == null){ t.textContent = '☀ Luz'; el.className = 'luz'; $('luz-barra').style.width = '0%'; return; }
  const baixa = lum < LUZ_MIN, alta = lum > LUZ_MAX;
  el.className = 'luz' + (baixa ? ' baixa' : alta ? ' alta' : '');
  t.textContent = baixa ? '☀ Pouca luz' : alta ? '☀ Luz forte' : '☀ OK';
  $('luz-barra').style.width = Math.round(Math.max(8, Math.min(100, lum/170*100))) + '%';
}

// ---------- vídeo → tela (object-fit: cover; desenho sem espelhar, o canvas é espelhado no CSS) ----------
function mapa(v){
  const { W, H } = geo, vw = v.videoWidth, vh = v.videoHeight, k = Math.max(W/vw, H/vh);
  return { X: p => p.x*vw*k + (W - vw*k)/2, Y: p => p.y*vh*k + (H - vh*k)/2 };
}
function desenharMalha(v, lm, bom){
  const cv = $('malha'), ctx = cv.getContext('2d'), dpr = cv.width / geo.W;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  if (!lm) return;
  const { X, Y } = mapa(v);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.ellipse(geo.cx, geo.cy, geo.rx, geo.ry, 0, 0, Math.PI*2); ctx.clip();
  ctx.lineWidth = .7; ctx.strokeStyle = bom ? 'rgba(160,240,205,.55)' : 'rgba(255,255,255,.38)';
  ctx.beginPath();
  for (const { start, end } of FaceLandmarker.FACE_LANDMARKS_TESSELATION){ const a = lm[start], b = lm[end]; if (!a || !b) continue; ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); }
  ctx.stroke(); ctx.restore();
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
  const base = { lm, p, mexeu };
  const est = estagio();
  if (larg < (est === 'frente' ? .58 : .45)) return { ...base, msg:'Chegue o celular mais perto' };
  if (larg > 1.18) return { ...base, msg:'Afaste um pouco o celular' };
  if (est === 'frente'){
    if (Math.abs(dx) > .28 || Math.abs(dy) > .26) return { ...base, msg:'Rosto no meio do oval' };
    if (Math.abs(p.yaw - .5) > FRENTE_TOL) return { ...base, msg:'Olhe reto para a câmera' };
    if (Math.abs(p.roll) > 15) return { ...base, msg:'Endireite a cabeça' };
    if (p.pitch < .25 || p.pitch > .62) return { ...base, msg:'Celular na altura do rosto' };
  } else if (Math.abs(dy) > .32) return { ...base, msg:'Rosto no meio do oval' };
  if (ultM.lum < LUZ_MIN) return { ...base, msg:'Procure mais luz: de frente para uma janela ou lâmpada' };
  if (ultM.lum > LUZ_MAX) return { ...base, msg:'Luz forte demais: saia um pouco dela' };
  if (est === 'frente' && ultM.lado > .3) return { ...base, msg:'A luz está de lado: vire de frente para ela' };
  return { ...base, msg:null };
}
const nitido = (est) => ultM && ultM.nitidez >= (est === 'frente' ? NITIDEZ_MIN : NITIDEZ_MIN*.8);

function loop(){
  if (!rodando) return;
  const v = $('v-fg');
  if (v.readyState >= 2 && v.videoWidth){
    ts = Math.max(ts + 1, performance.now()); quadro++;
    const faces = face.detectForVideo(v, ts).faceLandmarks || [];
    const r = avaliar(v, faces), est = estagio(), agora = performance.now(), prog = {};
    desenharMalha(v, faces.length === 1 ? faces[0] : null, !r.msg);
    medidorLuz(r.lm ? ultM?.lum : null);
    if (est === 'frente'){
      if (!r.msg && !r.mexeu && nitido(est)){
        segDesde ||= agora; prog.frente = Math.min(1, (agora - segDesde)/SEGURA_FRENTE);
        dica('Isso! Segure assim…', true);
        if (prog.frente >= 1){ capturar(v, 'frente', r.p); return; }
      } else { segDesde = 0; dica(r.msg || 'Segure parado'); }
    } else if (est === 'lados'){
      const dev = r.p ? r.p.yaw - .5 : 0, lado = dev > 0 ? 'esquerda' : 'direita', falta = !fotos.esquerda && !fotos.direita ? 'um lado' : 'o outro lado';
      if (r.p && !fotos[lado]) prog[lado] = Math.max(0, Math.min(1, (Math.abs(dev) - .03)/(LADO_ALVO - .03)));
      if (!r.p || r.msg){ segDesde = 0; dica(r.msg || 'Coloque o rosto dentro do oval'); }
      else if (fotos[lado] || Math.abs(dev) < .04){ segDesde = 0; dica(`Agora vire o rosto devagar para ${falta}`); }
      else if (Math.abs(dev) > LADO_MAX){ segDesde = 0; dica('Não precisa virar tanto: volte um pouquinho'); }
      else if (prog[lado] < 1){ segDesde = 0; dica('Continue virando devagar…'); }
      else if (r.mexeu || !nitido(est) || Math.abs(r.p.roll) > 20){ segDesde = 0; dica('Segure um instante parado'); }
      else {
        segDesde ||= agora; dica('Isso! Segure…', true);
        if (agora - segDesde >= SEGURA_LADO){ capturar(v, lado, r.p); return; }
      }
      if (agora - lados0 > 22000) $('scan-pular').hidden = false;   // não conseguiu os lados: deixa seguir com o que tem
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
  segDesde = 0; narizAnt = null;
  if (angulo === 'frente') lados0 = performance.now();
  pintarAnel({});
  if (estagio() === 'fim'){ terminar(); return; }
  dica(angulo === 'frente' ? 'Agora vire o rosto devagar para um lado' : 'Agora para o outro lado', true);
  raf = requestAnimationFrame(loop);
}
function terminar(){
  rodando = false; cancelAnimationFrame(raf);
  dica('Pronto!', true); pintarAnel({});
  const f = fotos; setTimeout(() => { parar(); cb?.onPronto?.(f); }, 650);
}

export function parar(){
  rodando = false; cancelAnimationFrame(raf);
  if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  ['v-bg','v-fg'].forEach(id => { const v = $(id); v.srcObject = null; });
}
export function seguirComOQueTem(){ if (fotos.frente) terminar(); }
export async function abrir(callbacks){
  cb = callbacks; fotos = {}; segDesde = 0; narizAnt = null; ultM = null; quadro = 0; lados0 = performance.now();
  $('scan-pular').hidden = true; medirPalco(); pintarAnel({}); medidorLuz(null); dica('Abrindo a câmera…');
  try {
    face ??= await criarFace('VIDEO');
    stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ ideal:1280 }, height:{ ideal:960 } }, audio:false });
    for (const id of ['v-bg','v-fg']){ const v = $(id); v.srcObject = stream; await v.play(); }
    dica('Olhe reto para a câmera'); rodando = true; loop();
  } catch (e) {
    console.error(e); parar();
    dica(e?.name === 'NotAllowedError' ? 'Libere a câmera nas configurações, ou escolha uma foto' : 'Não consegui abrir a câmera');
    cb?.onErro?.(e);
  }
}
addEventListener('resize', () => { if (rodando) medirPalco(); });
window.__scanFotos = () => Object.fromEntries(Object.entries(fotos).map(([k, f]) => [k, { lum:f.lum, nitidez:f.nitidez, yaw:+f.pose.yaw.toFixed(2), w:f.src.width, h:f.src.height }]));
