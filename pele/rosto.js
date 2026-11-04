// Geometria do rosto, luz/nitidez, pose, recorte com tarja e a imagem que vai para a análise.
// Copiado de /idade/index.html (01/11/2026) para a pele2 não depender da página das pernas. Mudou só: exports,
// o recorte por região (recorteRegiao) e a foto do topo do resultado (fotoTopo).
// 03/11 (auditoria): o MediaPipe vem sob demanda, dentro de criarFace. Antes o import estático segurava a página inteira:
// com o CDN lento a capa só respondia em 3 s; com o CDN fora, nunca (nem o 'view' saía). FaceLandmarker é ligação viva:
// fica null até a primeira criarFace (scan.js só desenha a malha depois de ter rosto).
const MP_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs";
export let FaceLandmarker = null;
let FilesetResolver = null, mpPronto = null;
const carregarMP = () => (mpPronto ??= import(MP_URL).then(m => { FaceLandmarker = m.FaceLandmarker; FilesetResolver = m.FilesetResolver; })
  .catch(e => { mpPronto = null; throw e; }));

const MODELO_ROSTO = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
export const OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
export const OLHO_A = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];   // à esquerda na imagem
export const OLHO_B = [263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466];

export const media = pts => ({ x: pts.reduce((s,p) => s+p.x, 0)/pts.length, y: pts.reduce((s,p) => s+p.y, 0)/pts.length });
export const caixa = pts => ({ x0:Math.min(...pts.map(p=>p.x)), y0:Math.min(...pts.map(p=>p.y)), x1:Math.max(...pts.map(p=>p.x)), y1:Math.max(...pts.map(p=>p.y)) });

// Pontos em pixels e "alinhados" (girados para os olhos ficarem na horizontal)
export function geometria(lm, W, H){
  const P = lm.map(p => ({ x:p.x*W, y:p.y*H }));
  const eA = media(OLHO_A.map(i => P[i])), eB = media(OLHO_B.map(i => P[i]));
  const ang = Math.atan2(eB.y - eA.y, eB.x - eA.x), C = media(OVAL.map(i => P[i]));
  const cs = Math.cos(-ang), sn = Math.sin(-ang);
  const R = P.map(p => ({ x: C.x + (p.x-C.x)*cs - (p.y-C.y)*sn, y: C.y + (p.x-C.x)*sn + (p.y-C.y)*cs }));
  return { P, R, C, ang, iod: Math.hypot(eB.x-eA.x, eB.y-eA.y) };
}
// A malha acaba no meio da testa (ponto 10); sobe o contorno até perto do cabelo (mesma regra de /idade, 29/10)
export const TESTA_EXTRA = .42;
export function subirTesta(pts, olhoY, topoY){
  const alto = olhoY - topoY, sobe = TESTA_EXTRA*alto;
  return pts.map(p => { const t = Math.max(0, Math.min(1, (olhoY - p.y)/alto)); return { x:p.x, y:p.y - sobe*t*t }; });
}
export const olhoMedioY = Q => (media(OLHO_A.map(i => Q[i])).y + media(OLHO_B.map(i => Q[i])).y)/2;
export function contorno(R, enc = 0.025){
  const pts = subirTesta(OVAL.map(i => R[i]), olhoMedioY(R), R[10].y), c = media(pts);
  return pts.map(p => ({ x:p.x + (c.x-p.x)*enc, y:p.y + (c.y-p.y)*enc }));
}
// Tarja fina, só na abertura de cada olho: pés de galinha (canto de fora) e olheira (abaixo) ficam à mostra
export function tarjasOlhos(g){
  const { R, iod } = g;
  return [OLHO_A, OLHO_B].map(olho => { const b = caixa(olho.map(i => R[i]));
    return { x0:b.x0-.02*iod, x1:b.x1+.02*iod, y0:b.y0-.025*iod, y1:b.y1+.025*iod }; });
}
export function girarFonte(ctx, src, g){ ctx.translate(g.C.x, g.C.y); ctx.rotate(-g.ang); ctx.translate(-g.C.x, -g.C.y); ctx.drawImage(src, 0, 0); }
export function retangulo(ctx, x, y, w, h, r){ ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

// A imagem que sai do aparelho (igual a /idade, modo "rosto" com tarja nos olhos). toDataURL não leva EXIF.
export function montarEnvio(src, g){
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  const ov = contorno(g.R), b = caixa(ov), bw = b.x1 - b.x0, bh = b.y1 - b.y0;
  const s = Math.min(560/bw, 700/bh, 2);
  cv.width = Math.round(bw*s); cv.height = Math.round(bh*s);
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, cv.width, cv.height);
  const T = () => ctx.setTransform(s, 0, 0, s, -b.x0*s, -b.y0*s);
  ctx.save(); T(); ctx.beginPath(); ov.forEach((p,i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.clip();
  girarFonte(ctx, src, g); ctx.restore();
  ctx.save(); T(); ctx.fillStyle = '#000000';
  for (const t of tarjasOlhos(g)){ retangulo(ctx, t.x0, t.y0, t.x1-t.x0, t.y1-t.y0, .05*g.iod); ctx.fill(); }
  ctx.restore();
  return cv;
}

// Quadro inteiro já girado (olhos na horizontal) e com a tarja nos olhos: de onde saem a foto do topo e os recortes.
// Fica só na memória da página; nunca é enviado.
export function alinhar(src, g){
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#1b1f1d'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.save(); girarFonte(ctx, src, g); ctx.restore();
  ctx.fillStyle = '#000';
  for (const t of tarjasOlhos(g)){ retangulo(ctx, t.x0, t.y0, t.x1-t.x0, t.y1-t.y0, .05*g.iod); ctx.fill(); }
  return cv;
}
// Recorte de um retângulo da imagem alinhada, espelhado (a pessoa se vê como no espelho, igual à câmera)
function recorte(al, x0, y0, w, h, outW){
  const cv = document.createElement('canvas'), k = outW / w; cv.width = Math.round(w*k); cv.height = Math.round(h*k);
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#1b1f1d'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(-k, 0, 0, k, cv.width + x0*k, -y0*k); ctx.drawImage(al, 0, 0);
  return cv;
}
// Foto do topo do resultado: o rosto com uma margem, sem o fundo todo
export function fotoTopo(al, g, outW = 720){
  const b = caixa(contorno(g.R, 0)), w = b.x1 - b.x0, h = b.y1 - b.y0;
  const W = w*1.5, H = Math.max(h*1.28, W*1.1), cx = (b.x0 + b.x1)/2, cy = (b.y0 + b.y1)/2 + h*.03;
  return recorte(al, cx - W/2, cy - H/2, W, H, outW);
}
// Áreas do rosto (no espaço alinhado). lado em múltiplos da distância entre os olhos (iod).
export const REGIOES = {
  testa:   g => ({ c:{ x:g.R[151].x, y:g.R[151].y - .22*g.iod }, s:.95*g.iod }),
  olhos:   g => ({ c:{ x:g.R[33].x - .12*g.iod, y:g.R[33].y + .10*g.iod }, s:.62*g.iod }),
  sulco:   g => ({ c:media([g.R[129], g.R[61], g.R[206]]), s:.62*g.iod }),
  bochecha:g => ({ c:{ x:g.R[50].x - .06*g.iod, y:g.R[50].y + .06*g.iod }, s:.66*g.iod }),
  zonaT:   g => ({ c:media([g.R[4], g.R[195], g.R[5]]), s:.62*g.iod }),
  contorno:g => ({ c:media([g.R[172], g.R[150], g.R[136]]), s:.70*g.iod }),
  queixo:  g => ({ c:{ x:g.R[152].x, y:g.R[152].y - .30*g.iod }, s:.62*g.iod }),
};
export function recorteRegiao(al, g, nome, outW = 200){
  const { c, s } = REGIOES[nome](g);
  return recorte(al, c.x - s/2, c.y - s/2, s, s, outW);
}

// ---------- detector ----------
let visionFiles = null;
export async function criarFace(modo){
  await carregarMP();
  visionFiles ??= await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm");
  const opts = delegate => ({ baseOptions:{ modelAssetPath:MODELO_ROSTO, delegate }, runningMode:modo, numFaces:2,
    minFaceDetectionConfidence:.5, minFacePresenceConfidence:.5, minTrackingConfidence:.5 });
  try { return await FaceLandmarker.createFromOptions(visionFiles, opts("GPU")); }
  catch { return await FaceLandmarker.createFromOptions(visionFiles, opts("CPU")); }
}

// Luz, nitidez e testa: lidas numa amostra pequena do rosto (canvas fora da página)
const amostra = document.createElement('canvas'); amostra.width = amostra.height = 96;
const actx = amostra.getContext('2d', { willReadFrequently:true });
export function medir(src, lm, W, H){
  const b = caixa(OVAL.map(i => ({ x:lm[i].x*W, y:lm[i].y*H })));
  const bw = b.x1-b.x0, bh = b.y1-b.y0, N = 96;
  actx.drawImage(src, b.x0, b.y0, bw, bh, 0, 0, N, N);
  const d = actx.getImageData(0, 0, N, N).data, Y = new Float32Array(N*N);
  for (let i = 0; i < N*N; i++) Y[i] = .299*d[i*4] + .587*d[i*4+1] + .114*d[i*4+2];
  const regiao = (cx, cy, r) => { let s = 0, n = 0; for (let y = Math.max(0, cy-r); y < Math.min(N, cy+r); y++) for (let x = Math.max(0, cx-r); x < Math.min(N, cx+r); x++){ s += Y[y*N+x]; n++; } return n ? s/n : 0; };
  const em = i => [Math.round((lm[i].x*W - b.x0)/bw*N), Math.round((lm[i].y*H - b.y0)/bh*N)];
  const esq = regiao(...em(50), 8), dir = regiao(...em(280), 8), testa = regiao(...em(151), 7);
  let soma = 0; for (let y = 20; y < 80; y++) for (let x = 20; x < 76; x++) soma += Y[y*N+x];
  const lum = soma / (60*56);
  let m = 0, m2 = 0, n = 0;   // variância do laplaciano no miolo do rosto
  for (let y = 24; y < 76; y++) for (let x = 24; x < 72; x++){ const l = 4*Y[y*N+x] - Y[y*N+x-1] - Y[y*N+x+1] - Y[(y-1)*N+x] - Y[(y+1)*N+x]; m += l; m2 += l*l; n++; }
  return { lum, lado: Math.abs(esq - dir) / Math.max(1, (esq + dir)/2), testa, bochecha:(esq + dir)/2, nitidez: m2/n - (m/n)**2 };
}
export const NITIDEZ_MIN = 12;
// yaw: 0,5 = de frente; > 0,5 = a pessoa virou para a ESQUERDA dela (o nariz vai para a direita da imagem crua,
// que na tela espelhada aparece à esquerda). pitch: altura do nariz entre olhos e queixo. roll em graus.
export function pose(lm){
  const yaw = (lm[1].x - lm[234].x) / ((lm[454].x - lm[234].x) || 1e-6);
  const olhoY = (lm[33].y + lm[263].y)/2, pitch = (lm[1].y - olhoY) / ((lm[152].y - olhoY) || 1e-6);
  const roll = Math.atan2(lm[263].y - lm[33].y, lm[263].x - lm[33].x) * 180/Math.PI;
  return { yaw, pitch, roll };
}
