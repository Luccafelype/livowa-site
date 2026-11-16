// SCAN do /pele/ v2 (04/11/2026): o da pele2 (3 fotos: frente, depois a esquerda, depois a direita; copiado de
// /pele2/scan.js, a pele2 fica intacta). Muda uma coisa, pedido do Lucca (reprovação de 04/11, item g): TODA ordem fica
// NO OVAL, na parte de baixo do rosto, também na foto de frente ("Chegue mais perto", "Olhe reto", "Segure"); a faixa de
// baixo (#scan-dica) fica só para leitor de tela. Anel de risquinhos que acende, ✓ por lado (chips Esquerda/Frente/
// Direita), foto automática, voz curta que o botão “Desligar voz” (canto inferior direito) desliga. Malha medida no próprio elemento de vídeo (Safari do
// iPhone); vídeo e canvas espelhados pelo CSS (scaleX(-1)); o desenho é feito em coordenadas da imagem crua.
// 15/11 (Lucca, lote l-mwhz04rg: “demorou muito para abrir a câmera, tipo 10-15 segundos, e deu uns mini bugs na hora de
// orientar a posição da cabeça, alternando uma orientação e outra muito rapidamente, décimos de segundo”):
//  (a) ABERTURA: o detector de rosto (MediaPipe + wasm + modelo, ~7 MB) só começava a baixar no toque que abre a câmera,
//      e a câmera só era pedida depois dele. Agora aquecer() baixa e cria o detector durante o quiz (app.js chama na 2ª
//      tela) e abrir() pede a câmera na hora: a imagem aparece enquanto o detector termina (“Só um instante…”).
//  (b) ORIENTAÇÃO: cada limite ganhou folga para sair do aviso (histerese, passou()) e a instrução do oval só troca
//      depois de ficar estável (estavel(): 0,5 s; 0,25 s para o “Segure”). A foto de frente sai com os mesmos limites;
//      a de lado aceita a cabeça voltar 0,02 depois de ter chegado ao alvo (0,12), para o “Segure” não cair numa tremida.
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

let face = null, faceP = null, sessao = 0, refez = false, stream = null, rodando = false, raf = null, ts = 0, quadro = 0;
let feitoAte = 0, guiaAtual = '';
let fotos = {}, segDesde = 0, narizAnt = null, ultM = null, ladoDesde = 0, cb = null, geo = null, ticks = [];

const estagio = () => ORDEM.find(a => !fotos[a]) || 'fim';

// ---------- detector aquecido antes da câmera ----------
// Uma promessa só: quem chamar de novo (o quiz, depois abrir()) espera a mesma. Depois de criado, um quadro em branco
// passa pelo detector para a 1ª leitura de verdade não pagar a compilação. Falhou (rede)? A próxima chamada tenta de novo.
export function aquecer(){
  if (face) return Promise.resolve(face);
  return (faceP ??= criarFace('VIDEO').then(f => {
    try { const cv = document.createElement('canvas'); cv.width = cv.height = 64; cv.getContext('2d').fillRect(0, 0, 64, 64); ts = Math.max(ts + 1, performance.now()); f.detectForVideo(cv, ts); } catch {}
    face = f; window.__faceProntaEm = Math.round(performance.now()); return f;
  }).catch(e => { faceP = null; throw e; }));
}

// ---------- histerese e troca estável da instrução ----------
// passou(): o aviso ENTRA no limite de sempre e só SAI quando o valor volta para (limite − folga). Em cima do limite a
// leitura treme de um quadro para o outro; sem a folga, o aviso ligava e desligava a cada tremida.
let H = {};
const passou = (k, v, lim, folga) => (H[k] = v > (H[k] ? lim - folga : lim));
// estavel(): a instrução mostrada só muda quando a nova fica TROCA_MS seguidos (o “Segure”, TROCA_BOA_MS: é a resposta a
// quem acertou a posição). Se a mostrada não aparece há VELHA_MS, troca pela atual (não fica presa numa ordem velha).
const TROCA_MS = 500, TROCA_BOA_MS = 250, VELHA_MS = 1100;
let mostrada = '', candidata = '', candDesde = 0, mostradaVista = 0;
function estavel(chave, agora){
  if (chave === mostrada){ candidata = ''; mostradaVista = agora; return true; }
  if (!mostrada){ mostrada = chave; candidata = ''; mostradaVista = agora; return true; }
  if (chave !== candidata){ candidata = chave; candDesde = agora; }
  if (agora - candDesde >= (chave.startsWith('segure') ? TROCA_BOA_MS : TROCA_MS) || agora - mostradaVista >= VELHA_MS){ mostrada = chave; candidata = ''; mostradaVista = agora; return true; }
  return false;
}
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
  // 15/11: cada aviso entra no limite de sempre e sai com folga (passou()); nenhum destes limites ficou mais frouxo que antes
  if (passou('perto', -larg, -(est === 'frente' ? .58 : .42), .03)) return { ...base, msg:'Chegue o celular mais perto' };
  if (passou('longe', larg, 1.2, .04)) return { ...base, msg:'Afaste um pouco o celular' };
  if (est === 'frente'){
    if (passou('meio', Math.max(Math.abs(dx)/.28, Math.abs(dy)/.26), 1, .12)) return { ...base, msg:'Rosto no meio do oval' };
    if (passou('reto', Math.abs(p.yaw - .5), FRENTE_TOL, .02)) return { ...base, msg:'Olhe reto para a câmera' };
    if (passou('torto', Math.abs(p.roll), 15, 3)) return { ...base, msg:'Endireite a cabeça' };
    if (passou('altura', Math.max(.25 - p.pitch, p.pitch - .62), 0, .03)) return { ...base, msg:'Celular na altura do rosto' };
  } else if (passou('meioLado', Math.abs(dy), .34, .04)) return { ...base, msg:'Rosto no meio do oval' };
  if (passou('escuro', -ultM.lum, -LUZ_MIN, 6)) return { ...base, msg:'Procure mais luz: de frente para uma janela ou lâmpada' };
  if (passou('claro', ultM.lum, LUZ_MAX, 6)) return { ...base, msg:'Luz forte demais: saia um pouco dela' };
  if (est === 'frente' && passou('luzLado', ultM.lado, .3, .04)) return { ...base, msg:'A luz está de lado: vire de frente para ela' };
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
    let faces;
    try { faces = face.detectForVideo(v, ts).faceLandmarks || []; }
    catch (e) { console.error(e); return refazerDetector(); }   // detector aquecido que se perdeu (ex.: a página ficou em segundo plano): cria outro, uma vez
    const r = avaliar(v, faces), est = estagio(), agora = performance.now(), prog = {};
    desenharMalha(v, faces.length === 1 ? faces[0] : null, !r.msg);
    medidorLuz(r.lm ? ultM?.lum : null);
    const mostrandoFeito = agora < feitoAte;   // o ✓ do lado que acabou de sair fica um instante antes da próxima seta
    if (est === 'frente'){
      if (!r.msg && !r.mexeu && nitido(est)){
        segDesde ||= agora; prog.frente = Math.min(1, (agora - segDesde)/SEGURA_FRENTE);
        if (prog.frente >= 1){ capturar(v, 'frente', r.p); return; }
        if (estavel('segurefrente', agora)){ dica('Isso! Segure assim…', true); guia('segure', 'frente', prog.frente); }
      } else { segDesde = 0; const m = r.msg || 'Segure parado'; if (estavel('msgfrente' + m, agora)){ dica(m); guia('msg', 'frente', 0, m); } }
    } else if (est === 'esquerda' || est === 'direita'){
      const dev = r.p ? (r.p.yaw - .5) * SINAL[est] : 0;   // > 0 = virando para o lado pedido
      prog[est] = Math.max(0, Math.min(1, (dev - .02)/(LADO_ALVO - .02)));
      let gm = 'vire', d, dOk = false, fala = false;
      if (!r.p){ segDesde = 0; gm = 'msg'; d = r.msg || 'Coloque o rosto dentro do oval'; }
      else if (r.msg){ segDesde = 0; gm = 'msg'; d = r.msg; }
      else if (passou('outro', -dev, .05, .02)){ segDesde = 0; gm = 'outro'; d = OUTRO[est]; fala = true; }
      else if (passou('demais', dev, LADO_MAX, .03)){ segDesde = 0; gm = 'demais'; d = 'Não precisa virar tanto: volte um pouquinho'; }
      else if (!(H.chegou = dev >= (H.chegou ? LADO_ALVO - .02 : LADO_ALVO))){ segDesde = 0; d = `${PEDE[est]}<small>devagar, até o anel acender</small>`; }   // chega no alvo de sempre; depois de chegar, só sai se voltar 0,02
      else if (r.mexeu || !nitido(est) || Math.abs(r.p.roll) > 20){ segDesde = 0; gm = 'segure'; d = 'Isso! Segure um instante'; dOk = true; }
      else {
        segDesde ||= agora; gm = 'segure'; d = 'Isso! Segure…'; dOk = true;
        if (agora - segDesde >= SEGURA_LADO){ capturar(v, est, r.p); return; }
      }
      if (H.chegou && gm === 'segure') prog[est] = 1;   // o anel não apaga um pedaço enquanto a pessoa segura dentro da folga
      if (!mostrandoFeito && estavel(gm + est + (gm === 'msg' ? d : ''), agora)){ dica(d, dOk); guia(gm, est, prog[est], gm === 'msg' ? d : null); if (fala) falar(FALA[est]); }
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
  segDesde = 0; narizAnt = null; ladoDesde = performance.now(); H = {}; mostrada = candidata = '';   // lado novo: limites e instrução começam do zero
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

// o detector deu erro no meio (raro): mostra “Só um instante…”, cria outro e segue; se der de novo, avisa como erro de câmera
function refazerDetector(){
  const minha = sessao; rodando = false; cancelAnimationFrame(raf);
  if (refez){ parar(); const t = 'Não consegui abrir a câmera'; dica(t); guia('msg', 'frente', 0, t); cb?.onErro?.(new Error('detector')); return; }
  refez = true; face = null; faceP = null; dica('Só um instante…'); guia('msg', 'frente', 0, 'Só um instante…');
  aquecer().then(() => { if (minha !== sessao) return; mostrada = candidata = ''; rodando = true; loop(); })
    .catch(e => { if (minha !== sessao) return; console.error(e); parar(); const t = 'Não consegui abrir a câmera'; dica(t); guia('msg', 'frente', 0, t); cb?.onErro?.(e); });
}
export function parar(){
  sessao++;   // quem estava esperando a câmera ou o detector desiste
  rodando = false; cancelAnimationFrame(raf);
  if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  ['v-bg','v-fg'].forEach(id => { const v = $(id); v.srcObject = null; });
}
export function seguirComOQueTem(){ if (fotos.frente) terminar(); }
export async function abrir(callbacks){
  cb = callbacks; fotos = {}; segDesde = 0; narizAnt = null; ultM = null; quadro = 0; ladoDesde = performance.now(); feitoAte = 0; H = {}; mostrada = candidata = ''; refez = false;
  const minha = ++sessao;
  $('scan-pular').hidden = true; medirPalco(); guia('msg', 'frente', 0, 'Abrindo a câmera…'); pintarAnel({}); medidorLuz(null); dica('Abrindo a câmera…');
  const pFace = aquecer(); pFace.catch(() => {});   // quase sempre já está pronto (aquecido no quiz); o erro, se houver, sai no await de baixo
  try {
    // 15/11: a câmera é pedida JÁ, sem esperar o detector; a imagem aparece e o detector termina por trás
    const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ ideal:1280 }, height:{ ideal:960 } }, audio:false });
    if (minha !== sessao){ s.getTracks().forEach(t => t.stop()); return; }   // fechou a câmera enquanto ela abria
    stream = s;
    for (const id of ['v-bg','v-fg']){ const v = $(id); v.srcObject = stream; await v.play(); }
    if (minha !== sessao) return;
    medirPalco(); window.__cameraNaTelaEm = Math.round(performance.now());
    if (!face){ dica('Só um instante…'); guia('msg', 'frente', 0, 'Só um instante…'); }
    await pFace;
    if (minha !== sessao) return;
    dica('Olhe reto para a câmera'); guia('msg', 'frente', 0, 'Olhe reto para a câmera'); falar(FALA.frente, true);
    mostrada = 'msgfrenteOlhe reto para a câmera'; mostradaVista = performance.now();   // a 1ª ordem também fica o tempo mínimo na tela
    rodando = true; loop();
  } catch (e) {
    if (minha !== sessao) return;
    console.error(e); parar();
    const t = e?.name === 'NotAllowedError' ? 'Libere a câmera nas configurações, ou escolha uma foto' : 'Não consegui abrir a câmera';
    dica(t); guia('msg', 'frente', 0, t);
    cb?.onErro?.(e);
  }
}
addEventListener('resize', () => { if (rodando) medirPalco(); });
window.__scanFotos = () => Object.fromEntries(Object.entries(fotos).map(([k, f]) => [k, { lum:f.lum, nitidez:f.nitidez, yaw:+f.pose.yaw.toFixed(2), w:f.src.width, h:f.src.height }]));
