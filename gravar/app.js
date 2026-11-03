/* livowa.com/gravar — gravador com teleprompter e fantasma de enquadramento.
   Nada sai do aparelho: sem análise de uso, sem rede (o CSP bloqueia connect-src).
   Duas rotas de gravação:
   - quadro inteiro (padrão, 02/11 16h50): grava o quadro que a câmera entrega, sem cortar (o recorte automático
     de antes deu "muito zoom" no iPhone: 608×1080 de um quadro mais largo); linhas finas mostram o 9:16;
   - recorte 9:16 (opção em Ajustes): desenha o centro 9:16 num canvas e grava o canvas.
   Nas duas, o arquivo sai sem espelho e sem fantasma/grade/texto (tudo isso é só DOM por cima). */
(() => {
  'use strict';
  // Versão à vista (Ajustes e folha Texto): "<último commit>+1"; atualizar a cada commit.
  const VERSAO = '3f67c43+1';
  const $ = (s) => document.querySelector(s);
  const KEY = 'livowa_gravar_v1';
  const DEF = {
    texto: '', idx: 0, tipo: 'chamada', speed: 6, fs: 30,
    op: 35, ghostOn: true, ghostFlip: false,
    grid: false, eye: false, eyePos: 33,
    facing: 'user', mirrorFront: true, recorte916: false, guia916: true, modo: 'frase', maxPal: 10, seq: false, ppm: 150, auto: true,
    qual: 'segura', // modo seguro por padrão até achar a causa da imagem parada no iPhone (02/11)
  };
  const S = Object.assign({}, DEF);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(S, JSON.parse(raw) || {});
  } catch (e) { /* sem localStorage: segue com o padrão */ }
  // Valor estragado no localStorage nunca vira letra 0/NaN (o texto sumiria).
  S.fs = Math.min(64, Math.max(18, Math.round(+S.fs) || DEF.fs));
  S.speed = Math.min(25, Math.max(1, Math.round(+S.speed) || DEF.speed));
  S.maxPal = Math.min(20, Math.max(4, Math.round(+S.maxPal) || DEF.maxPal));
  S.ppm = Math.min(220, Math.max(90, Math.round((+S.ppm || DEF.ppm) / 10) * 10));
  if (S.qual !== 'alta') S.qual = 'segura';
  if (S.auto !== false) S.auto = true;
  // Qualidade Segura: 720×960, 2,5 Mbps, sempre rota direta (nunca canvas). Recorte 9:16 só na Alta.
  const segura = () => S.qual !== 'alta';
  const recorte = () => !!S.recorte916 && !segura();
  const G = window.GravarTexto; // texto.js: blocos (títulos), frases e pedaços por tela
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* cheio ou bloqueado */ } }, 150);
  }

  const el = {
    app: $('#app'), area: $('#area'), stage: $('#stage'), cam: $('#cam'),
    ghostImg: $('#ghostImg'), ghostVid: $('#ghostVid'), grid: $('#grid'), eye: $('#eye'), eyeHandle: $('#eyeHandle'),
    prompter: $('#prompter'), ptext: $('#ptext'), ptag: $('#ptag'),
    recPill: $('#recPill'), recTime: $('#recTime'), resTag: $('#resTag'), count: $('#count'), countN: $('#countN'),
    camMsg: $('#camMsg'), camMsgText: $('#camMsgText'), camRetry: $('#camRetry'),
    spdOut: $('#spdOut'), fsOut: $('#fsOut'), recBtn: $('#recBtn'), flipBtn: $('#flipBtn'), ghostBtn: $('#ghostBtn'),
    scrim: $('#scrim'), txt: $('#txt'), lista: $('#lista'), listHint: $('#listHint'),
    ghostFile: $('#ghostFile'), ghostStatus: $('#ghostStatus'), ghostOp: $('#ghostOp'), ghostOpOut: $('#ghostOpOut'),
    frameRow: $('#frameRow'), ghostFrame: $('#ghostFrame'), ghostFrameOut: $('#ghostFrameOut'),
    ghostOnChk: $('#ghostOn'), ghostFlipChk: $('#ghostFlip'), ghostClear: $('#ghostClear'),
    optGrid: $('#optGrid'), optEye: $('#optEye'), optMirror: $('#optMirror'), optCrop: $('#optCrop'), info: $('#info'),
    optGuide: $('#optGuide'), g916: $('#g916'), zoomRow: $('#zoomRow'), zoom: $('#zoom'), zoomOut: $('#zoomOut'),
    review: $('#review'), play: $('#play'), rvDur: $('#rvDur'), rvMeta: $('#rvMeta'), rvName: $('#rvName'),
    redoBtn: $('#redoBtn'), saveBtn: $('#saveBtn'), dlLink: $('#dlLink'), nextBtn: $('#nextBtn'), rvTip: $('#rvTip'),
    toast: $('#toast'), optSeq: $('#optSeq'), rmini: $('#rmini'), ppmMini: $('#ppmMini'), alerta: $('#alerta'), diagLog: $('#diagLog'), diagClear: $('#diagClear'),
    fPrev: $('#fPrev'), fNext: $('#fNext'), infoBtn: $('#infoBtn'), spdStep: $('#spdStep'),
    ritmoBtn: $('#ritmoBtn'), palOut: $('#palOut'), ppmOut: $('#ppmOut'), optAuto: $('#optAuto'), autoBtn: $('#autoBtn'),
    pbar: $('#pbar'), pbarI: $('#pbarI'), verTelas: $('#verTelas'), telas: $('#telas'),
  };

  const fmtS = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
  const fmtMB = (b) => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let toastT = 0;
  function toast(msg, ms = 2600) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.toast.hidden = true; }, ms);
  }

  /* ---------- Quadro inteiro na tela, na proporção do que vai para o arquivo ---------- */
  function stageAspect() {
    const [w, h] = camDims();
    return (recorte() || !w || !h) ? 9 / 16 : w / h;
  }
  // O quadro (proporção do arquivo, contain) fica centralizado na área livre entre o topo seguro e os controles.
  // O texto mora dentro do quadro, com posição e altura em CSS: nenhum resize mexe nele além do tamanho do quadro.
  function layout() {
    const r = el.area.getBoundingClientRect();
    if (r.width < 20 || r.height < 20) return; // medição no meio do redimensionamento: fica o último quadro
    const a = stageAspect();
    let w = r.width, h = w / a;
    if (h > r.height) { h = r.height; w = h * a; }
    // Sem arredondar: no modo recorte (cover) um pixel a menos já tiraria uma lasca do 9:16.
    Object.assign(el.stage.style, { left: ((r.width - w) / 2) + 'px', top: ((r.height - h) / 2) + 'px', width: w + 'px', height: h + 'px' });
    el.cam.classList.toggle('crop916', recorte());
    // Guia 9:16: linhas finas mostrando o que sobra num corte 9:16 (o vídeo do Instagram).
    const g = el.g916, t = 9 / 16;
    const show = S.guia916 && !recorte() && Math.abs(a - t) > 0.01;
    g.hidden = !show;
    if (show) {
      g.classList.toggle('wide', a > t);
      if (a > t) { const p = t / a * 100; g.style.left = ((100 - p) / 2) + '%'; g.style.width = p + '%'; g.style.top = '0'; g.style.height = '100%'; }
      else { const p = a / t * 100; g.style.top = ((100 - p) / 2) + '%'; g.style.height = p + '%'; g.style.left = '0'; g.style.width = '100%'; }
    }
    // Refaz o texto depois de qualquer resize (nós novos, pintura nova) e reajusta a letra ao quadro novo.
    renderPrompter();
  }
  // Barra do Safari some/aparece, giro, teclado: recalcula num quadro de animação (sem pulo intermediário).
  // O enquadramento não muda com o tamanho: o quadro tem a proporção do arquivo e a câmera usa contain
  // (cover só no modo recorte, onde o quadro já é 9:16 e cover mostra exatamente o centro que vai para o arquivo).
  let layRaf = 0;
  function relayout() { if (!layRaf) layRaf = requestAnimationFrame(() => { layRaf = 0; layout(); }); }
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', () => { relayout(); setTimeout(relayout, 300); });
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', relayout); window.visualViewport.addEventListener('scroll', relayout); }
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(el.area);

  /* ---------- Estado geral ---------- */
  let state = 'idle'; // idle | count | rec | review
  function setState(s) {
    state = s;
    el.app.classList.toggle('recording', s === 'rec');
    el.app.classList.toggle('counting', s === 'count');
    el.recBtn.setAttribute('aria-label', s === 'rec' ? 'Parar' : s === 'count' ? 'Cancelar contagem' : 'Gravar');
    const trava = s === 'rec' || s === 'count';
    // Na gravação: Ajustes e "Telas e ritmo" continuam (não tocam na câmera); Texto, Fantasma e Câmera travam,
    // e em Ajustes travam só Qualidade, Recorte, Zoom e Atualizar (os que mexem na câmera/página).
    document.querySelectorAll('.tool').forEach((b) => { b.disabled = trava && b.dataset.open !== 'ajustes'; });
    document.querySelectorAll('[data-qual], #optCrop, #zoom, #atualizar').forEach((x) => { x.disabled = trava; });
    el.app.dataset.state = s;
  }

  /* ---------- Câmera ---------- */
  let stream = null, camReady = false, facingNow = 'user', videoInputs = 0;
  function showCamMsg(text, withBtn) {
    if (!text) { el.camMsg.hidden = true; return; }
    el.camMsgText.textContent = text; el.camRetry.hidden = !withBtn; el.camMsg.hidden = false;
  }
  function camError(e) {
    const n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') {
      return isIOS
        ? 'O Safari não liberou a câmera. Toque em "aA" na barra de endereço › Ajustes do Site › Câmera e Microfone › Permitir. Depois toque abaixo.'
        : 'A câmera ou o microfone foram bloqueados. Libere nas permissões do site (ícone ao lado do endereço) e toque abaixo.';
    }
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Não achei câmera e microfone neste aparelho.';
    if (n === 'NotReadableError') return 'A câmera está em uso por outro app. Feche o outro app e toque abaixo.';
    return 'Não consegui abrir a câmera (' + (n || 'erro') + ').';
  }
  // Regra (02/11, câmera travou aos 17 s no iPhone): durante a contagem e a gravação NADA chama getUserMedia,
  // applyConstraints, track.stop(), troca o srcObject ou recria o canvas. Só depois do stop.
  const gravando = () => state === 'rec' || state === 'count';
  function stopCam() {
    if (gravando()) { diag('stopCam bloqueado durante a gravação'); return; }
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; camReady = false;
  }
  async function startCam() {
    if (gravando()) { diag('startCam bloqueado durante a gravação'); return; }
    stopCam();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCamMsg('Este navegador não abre a câmera aqui. Use o Safari ou o Chrome, numa página https.', false);
      return;
    }
    showCamMsg('Abrindo a câmera…', false);
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const v = (w, h) => Object.assign({ facingMode: { ideal: S.facing } }, w ? { width: { ideal: w }, height: { ideal: h } } : {});
    const tries = [
      // 4:3 em pé costuma ser o campo cheio do sensor da frontal; depois 9:16. O iOS pode ler largura/altura
      // na orientação do sensor (deitado) e entregar um quadro deitado e cortado; por isso, com o aparelho
      // em pé, quadro deitado = tenta o próximo pedido (incluindo as medidas trocadas).
      ...(segura()
        ? [{ video: v(720, 960), audio }, { video: v(720, 1280), audio }, { video: v(960, 720), audio }, { video: v(1280, 720), audio }]
        : [{ video: v(1080, 1440), audio }, { video: v(1080, 1920), audio }, { video: v(1440, 1080), audio }, { video: v(1920, 1080), audio }]),
      { video: v(), audio },
      { video: true, audio: true },
    ];
    const wantPortrait = portraitDevice();
    let lastErr = null, got = null;
    for (let i = 0; i < tries.length; i++) {
      let s1 = null;
      try { s1 = await navigator.mediaDevices.getUserMedia(tries[i]); } catch (e) {
        lastErr = e;
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break;
        continue;
      }
      if (got) got.getTracks().forEach((t) => t.stop());
      got = s1;
      if (!wantPortrait || i === tries.length - 1) break;
      el.cam.srcObject = s1;
      await waitDims(el.cam);
      await new Promise((r) => setTimeout(r, 250)); // o iOS gira o quadro logo depois do loadedmetadata
      if (!(el.cam.videoWidth > el.cam.videoHeight)) break; // em pé: serve
    }
    stream = got;
    if (!stream) { showCamMsg(camError(lastErr), true); return; }
    const vt = stream.getVideoTracks()[0];
    const st = (vt && vt.getSettings && vt.getSettings()) || {};
    facingNow = st.facingMode || (S.facing === 'environment' && videoInputs > 1 ? 'environment' : 'user');
    if (el.cam.srcObject !== stream) el.cam.srcObject = stream;
    try { const p = el.cam.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* autoplay cuida */ }
    applyMirror();
    await waitDims(el.cam);
    await setupZoom(vt);
    camReady = true;
    showCamMsg(null);
    layout();
    updateInfo();
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      videoInputs = devs.filter((d) => d.kind === 'videoinput').length;
    } catch (e) { videoInputs = 1; }
    el.flipBtn.style.visibility = videoInputs < 2 ? 'hidden' : '';
  }
  function waitDims(v) {
    return new Promise((res) => {
      if (v.videoWidth) return res();
      const done = () => { v.removeEventListener('loadedmetadata', done); v.removeEventListener('resize', done); res(); };
      v.addEventListener('loadedmetadata', done); v.addEventListener('resize', done);
      setTimeout(res, 4000);
    });
  }
  el.cam.addEventListener('resize', () => { layout(); updateInfo(); });
  /* Zoom: se a câmera expõe zoom, começa no mínimo (campo mais aberto) e vira controle em Ajustes. */
  let zoomCap = null;
  async function setupZoom(vt) {
    zoomCap = null; el.zoomRow.hidden = true;
    try {
      const c = vt && vt.getCapabilities && vt.getCapabilities();
      const z = c && c.zoom;
      if (!z || !isFinite(z.min) || !isFinite(z.max) || z.max <= z.min) return;
      zoomCap = z;
      el.zoom.min = z.min; el.zoom.max = z.max; el.zoom.step = z.step || 0.1; el.zoom.value = z.min;
      el.zoomOut.textContent = (+z.min).toFixed(1).replace('.', ',') + '×';
      el.zoomRow.hidden = false;
      if (!gravando()) await vt.applyConstraints({ advanced: [{ zoom: z.min }] });
    } catch (e) { /* sem zoom controlável */ }
  }
  el.zoom.addEventListener('input', () => {
    const vt = stream && stream.getVideoTracks()[0];
    const v = +el.zoom.value;
    el.zoomOut.textContent = v.toFixed(1).replace('.', ',') + '×';
    if (gravando()) return;
    if (vt && vt.applyConstraints) vt.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {});
  });
  el.camRetry.addEventListener('click', startCam);
  el.flipBtn.addEventListener('click', () => {
    S.facing = S.facing === 'user' ? 'environment' : 'user'; save(); startCam();
  });
  function portraitDevice() {
    try { return navigator.maxTouchPoints > 0 && window.matchMedia('(orientation: portrait)').matches; } catch (e) { return false; }
  }
  // Medidas do track (getSettings): no iOS vêm do sensor, deitadas, mesmo com o <video> em pé.
  function trackDims() {
    const vt = stream && stream.getVideoTracks()[0];
    const st = (vt && vt.getSettings && vt.getSettings()) || {};
    return [st.width || 0, st.height || 0];
  }
  // Track e <video> com orientações diferentes: o stream direto pode sair deitado no arquivo → grava pelo canvas.
  function rotated() {
    const [tw, th] = trackDims(), [w, h] = camDims();
    return !!(tw && th && w && h && tw !== th && w !== h && (tw > th) !== (w > h));
  }
  function mirrored() { return facingNow !== 'environment' && S.mirrorFront; }
  function applyMirror() {
    el.cam.classList.toggle('mirror', mirrored());
    applyGhost();
  }
  function camDims() { return [el.cam.videoWidth || 0, el.cam.videoHeight || 0]; }
  // Direta = MediaRecorder no stream da câmera. Canvas quando há recorte 9:16 ou quando o track está
  // girado em relação ao <video> (caso do iPhone em pé): o canvas desenha o <video> em pé.
  function direct() {
    if (segura()) return true; // modo seguro: nunca canvas
    if (rotated()) return false;
    if (!recorte()) return true;
    const [w, h] = camDims();
    return !!(w && h && Math.abs(w / h - 9 / 16) < 0.02);
  }
  function ratioTxt(w, h) {
    const r = w / h;
    for (const [a, b] of [[9, 16], [3, 4], [1, 1], [4, 3], [16, 9]]) if (Math.abs(r - a / b) < 0.015) return a + ':' + b;
    return r.toFixed(2).replace('.', ',');
  }
  function outDims() {
    const [w, h] = camDims();
    if (!w || !h) return [0, 0];
    if (direct()) return [w, h];
    let sw = w, sh = h;
    if (recorte()) { if (w / h > 9 / 16) sw = h * 9 / 16; else sh = w * 16 / 9; }
    // Canvas pesa no iPhone: no máximo 1080×1440 em pixels (3:4 → 1080×1440; 9:16 → 936×1664).
    const k = Math.min(1, Math.sqrt((1080 * 1440) / (sw * sh)));
    return [Math.round(sw * k / 2) * 2, Math.round(sh * k / 2) * 2];
  }
  function updateInfo() {
    const [w, h] = camDims();
    const [ow, oh] = outDims();
    const mime = pickMime();
    // Selo de diagnóstico: medidas do track (getSettings) e da tela (<video>), proporção da tela, zoom, rota, formato.
    const [tw, th] = trackDims();
    let selo = '';
    if (w && h) {
      selo = (tw && th ? 'track ' + tw + '×' + th + ' · ' : '') + 'tela ' + w + '×' + h + ' · ' + ratioTxt(w, h);
      selo += zoomCap ? ' · zoom ' + (+zoomCap.min).toFixed(1).replace('.0', '') + '–' + (+zoomCap.max).toFixed(1).replace('.0', '') : ' · sem zoom';
      if (!direct()) selo += ' · canvas ' + ow + '×' + oh;
      selo += ' · ' + extOf(mime);
    }
    el.resTag.textContent = selo;
    const rows = [
      ['Câmera', w ? w + '×' + h + (facingNow === 'environment' ? ' (traseira)' : ' (frontal)') : '—'],
      ['Arquivo', ow ? ow + '×' + oh : '—'],
      ['Versão', VERSAO],
      ['Qualidade', segura() ? 'Segura (720p, 2,5 Mbps, rota direta)' : 'Alta (1080p, 6 Mbps)'],
      ['Rota', w ? (direct() ? 'quadro inteiro, direto da câmera' : recorte() ? 'recorte 9:16 do centro (canvas)' : 'quadro inteiro pelo canvas (track girado)') : '—'],
      ['Formato', mime || (window.MediaRecorder ? 'padrão do navegador' : 'este navegador não grava')],
      ['Selo', selo || '—'],
    ];
    el.info.textContent = '';
    rows.forEach(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      el.info.append(dt, dd);
    });
  }

  /* Tela acesa enquanto a página está aberta (Safari 16.4+, Chrome). */
  let wake = null;
  // Pedido de novo no toque de gravar (gesto do usuário) e registrado: sem ele, com Bloqueio Automático de 30 s
  // (Modo de Pouca Energia), o iPhone escurece a tela ~20 s depois do último toque — a janela das paradas de 14-20 s.
  async function keepAwake(origem) {
    if (!('wakeLock' in navigator)) { if (origem) diag('tela acesa: sem suporte a Wake Lock (a tela pode escurecer sozinha)'); return; }
    try {
      if (document.visibilityState !== 'visible') return;
      if (wake && !wake.released) { if (origem) diag('tela acesa: ativo'); return; }
      wake = await navigator.wakeLock.request('screen');
      if (origem) diag('tela acesa: ativo (' + origem + ')');
      wake.addEventListener('release', () => { if (gravando()) diag('tela acesa: LIBERADO durante a gravação'); });
    } catch (e) { if (origem) diag('tela acesa: negado (' + ((e && e.name) || e) + ')'); }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      keepAwake();
      if (!stream || stream.getVideoTracks().every((t) => t.readyState === 'ended')) startCam();
    }
  });

  /* ---------- Roteiros ---------- */
  // Parágrafos viram roteiros; "Gancho 2", "Corpo", "CTA", "#PERNAS"… numa linha sozinha são o título do bloco (texto.js).
  function roteiros() { return G.blocos(S.texto); }
  function atual() {
    const l = roteiros();
    if (!l.length) return null;
    const i = Math.min(Math.max(0, S.idx | 0), l.length - 1);
    return Object.assign({ i }, l[i]);
  }
  // Nome do arquivo: #PALAVRA → PALAVRA; título "Gancho 2" → GANCHO2; sem título → 1ª palavra do texto.
  function termo() {
    const r = atual();
    const src = r ? (r.hash ? r.titulo : r.titulo ? r.titulo.replace(/\s+/g, '') : r.body) : '';
    const m = src.normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[A-Za-z0-9]+/);
    return m ? m[0].toUpperCase() : 'TAKE';
  }
  function palavras(t) { return (t.match(/\S+/g) || []).length; }
  function renderLista() {
    const l = roteiros();
    el.lista.textContent = '';
    el.listHint.hidden = l.length < 1;
    el.listHint.textContent = l.length > 1 ? l.length + ' roteiros. Toque no que vai gravar.' : 'Um roteiro. Para vários, separe com uma linha em branco.';
    const cur = atual();
    l.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'item'; b.dataset.i = i;
      b.setAttribute('aria-pressed', String(!!cur && cur.i === i));
      const n = document.createElement('span'); n.className = 'n'; n.textContent = String(i + 1);
      const w = document.createElement('span');
      if (it.titulo) { const tt = document.createElement('span'); tt.className = 'tt'; tt.textContent = it.titulo; w.append(tt); }
      const t = document.createElement('span'); t.className = 't'; t.textContent = it.body.replace(/\s+/g, ' ');
      const m = document.createElement('span'); m.className = 'm';
      const p = palavras(it.body), nt = G.telas(it.body, S.maxPal).length;
      m.textContent = p + ' palavras · ~' + Math.max(1, Math.round(p / 2.5)) + ' s · ' + nt + (nt === 1 ? ' tela' : ' telas');
      w.append(t, m); b.append(n, w);
      el.lista.append(b);
    });
  }
  el.lista.addEventListener('click', (e) => {
    const b = e.target.closest('.item'); if (!b) return;
    S.idx = +b.dataset.i; fIdx = 0; divK = -1; save(); renderLista(); renderPrompter(); renderTelas(); aParar();
  });
  el.txt.value = S.texto;
  el.txt.addEventListener('input', () => {
    S.texto = el.txt.value;
    const n = roteiros().length;
    if (S.idx >= n) S.idx = Math.max(0, n - 1);
    divK = -1;
    save(); renderLista(); renderPrompter(); renderTelas(); aParar();
  });
  document.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { S.tipo = b.dataset.tipo; save(); renderTipo(); }));
  function renderTipo() {
    document.querySelectorAll('[data-tipo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tipo === S.tipo)));
  }

  /* ---------- Teleprompter ---------- */
  // Dois modos (Ajustes): 'frase' (padrão: frase atual grande, a próxima menor embaixo; ▲/▼ na borda direita)
  // e 'rolagem' (rolagem automática; ▲/▼ pulam para o começo da frase anterior/seguinte).
  let pOff = 0, pPlay = false, pLast = 0, pRaf = 0, fIdx = 0;
  const pps = () => S.speed * 3.5 * (S.fs / 30); // px por segundo
  const frase = () => S.modo !== 'rolagem';
  // Frase a frase: telas (ponto fecha, vírgula abre, quebra de linha manda; no máximo S.maxPal palavras) — texto.js.
  function telasAtual() { const r = atual(); return r ? G.telas(r.body, S.maxPal) : []; }
  function frases() { return telasAtual().map((t) => t.texto); }
  function renderPrompter() {
    const r = atual();
    const f = frases();
    el.app.classList.toggle('modo-frase', frase());
    el.app.style.setProperty('--fs', S.fs + 'px');
    el.spdOut.textContent = S.speed; el.fsOut.textContent = S.fs;
    el.spdStep.hidden = frase();
    el.ritmoBtn.hidden = !frase(); el.ritmoBtn.textContent = S.maxPal + ' pal · ' + S.ppm + '/min';
    el.palOut.textContent = S.maxPal; el.ppmOut.textContent = S.ppm; el.optAuto.checked = !!S.auto;
    el.ptext.classList.toggle('empty', !r);
    el.ptext.classList.toggle('frase', frase() && !!r);
    el.ptext.textContent = '';
    fIdx = Math.min(Math.max(0, fIdx), Math.max(0, f.length - 1));
    if (!r) el.ptext.textContent = 'Toque em Texto e cole o roteiro.';
    else if (frase()) {
      pPause(); pOff = 0;
      const c = document.createElement('div'); c.className = 'fcur'; c.textContent = f[fIdx] || '';
      el.ptext.append(c);
      if (f[fIdx + 1]) { const n = document.createElement('div'); n.className = 'fnext'; n.textContent = f[fIdx + 1]; el.ptext.append(n); }
    } else {
      // Rolagem: o texto inteiro, cada frase num <span> para ▲/▼ acharem o começo dela.
      let k = 0;
      r.body.split('\n').forEach((l, li) => {
        if (li) el.ptext.append('\n');
        (l.match(/[^.!?…]+(?:[.!?…]+["'”»)\]]*|$)/g) || []).forEach((x, xi) => {
          if (!x.trim()) { el.ptext.append(x); return; }
          const sp = document.createElement('span'); sp.className = 's'; sp.dataset.i = k++; sp.textContent = (xi ? ' ' : '') + x.trim();
          el.ptext.append(sp);
        });
      });
    }
    el.fPrev.disabled = !r; el.fNext.disabled = !r;
    el.prompter.dataset.frase = String(fIdx);
    el.prompter.scrollTop = 0;
    fitFrase();
    prompterClamp(); paintPrompter();
  }
  // Frase a frase: a frase atual tem de caber inteira na faixa; se não couber, a letra diminui só nela.
  // Nunca esconde a frase atual: no máximo some a próxima; abaixo de 18 px não encolhe, a faixa rola (CSS).
  function fitFrase() {
    let f = S.fs;
    el.app.style.setProperty('--fsf', f + 'px');
    el.prompter.dataset.fsf = String(f);
    el.prompter.classList.remove('rola'); // antes do return: na rolagem a .rola (overflow) não pode ficar
    if (!frase() || !atual()) return;
    const n = el.ptext.querySelector('.fnext');
    if (n) n.hidden = false;
    const ph = el.prompter.clientHeight;
    if (ph < 40) return; // medição no meio de um redimensionamento: fica a letra cheia; o próximo layout() refaz
    const cabe = () => el.ptext.scrollHeight <= ph;
    while (!cabe() && f > 18) { f = Math.max(18, f - 2); el.app.style.setProperty('--fsf', f + 'px'); }
    if (!cabe() && n) n.hidden = true;            // primeiro sai a próxima frase
    if (!cabe()) el.prompter.classList.add('rola'); // depois, rolagem com o dedo; a atual nunca some
    el.prompter.dataset.fsf = String(f);
  }
  function pMax() { return frase() ? 0 : Math.max(0, el.ptext.scrollHeight - el.prompter.clientHeight * 0.45); }
  function prompterClamp() { pOff = Math.min(Math.max(0, pOff), pMax()); }
  function paintPrompter() {
    // Frase a frase não usa deslocamento; na rolagem, translateY simples (sem camada 3D, ver gravar.css).
    el.ptext.style.transform = (frase() || pOff <= 0) ? 'none' : 'translateY(' + (-pOff).toFixed(1) + 'px)';
    let tag = '';
    if (atual()) {
      if (frase()) { const n = frases().length; tag = n ? (fIdx + 1) + '/' + n : ''; }
      else if (!pPlay) {
        if (state === 'rec') tag = 'pausado · toque para seguir';
        else if (pOff === 0) tag = 'toque para testar a rolagem';
        else if (pOff >= pMax() - 0.5) tag = 'fim do texto';
        else tag = 'pausado';
      }
    }
    el.ptag.textContent = tag;
    el.prompter.dataset.off = pOff.toFixed(1);
  }
  function tick(t) {
    if (!pPlay) return;
    const dt = pLast ? Math.min(0.1, (t - pLast) / 1000) : 0;
    pLast = t;
    pOff += pps() * dt;
    const max = pMax();
    if (pOff >= max) { pOff = max; pPlay = false; }
    paintPrompter();
    if (pPlay) pRaf = requestAnimationFrame(tick);
  }
  function pStart() { if (!atual() || frase()) return; if (pOff >= pMax() - 0.5) pOff = 0; pPlay = true; pLast = 0; cancelAnimationFrame(pRaf); pRaf = requestAnimationFrame(tick); paintPrompter(); }
  function pPause() { pPlay = false; cancelAnimationFrame(pRaf); paintPrompter(); }
  function pTop() { pPause(); pOff = 0; fIdx = 0; if (frase()) renderPrompter(); else paintPrompter(); }
  // ▲/▼: frase anterior/seguinte. Não mexe em pausa nem em gravação.
  function passo(d) {
    if (!atual()) return;
    if (frase()) {
      const n = frases().length;
      const tot = roteiros().length;
      // Em sequência: passar do fim (ou do começo) de um roteiro vai para o seguinte (ou o anterior).
      if (S.seq && d > 0 && fIdx >= n - 1 && S.idx < tot - 1) { S.idx += 1; fIdx = 0; save(); }
      else if (S.seq && d < 0 && fIdx <= 0 && S.idx > 0) { S.idx -= 1; fIdx = Math.max(0, frases().length - 1); save(); }
      else fIdx = Math.min(Math.max(0, fIdx + d), Math.max(0, n - 1));
      renderPrompter();
      aRestartTela(); // ▲/▼ reiniciam o tempo da tela (se estiver passando sozinho, segue passando)
    } else {
      const spans = [...el.ptext.querySelectorAll('span.s')];
      if (!spans.length) return;
      let cur = 0;
      spans.forEach((sp, i) => { if (sp.offsetTop - 10 <= pOff + 2) cur = i; });
      const alvo = spans[Math.min(Math.max(0, cur + d), spans.length - 1)];
      pOff = alvo.offsetTop - 10; prompterClamp(); paintPrompter();
    }
    const b = d < 0 ? el.fPrev : el.fNext;
    b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 160);
  }
  [[el.fPrev, -1], [el.fNext, 1]].forEach(([b, d]) => {
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); passo(d); b.blur(); });
  });
  // Rolagem: toque no texto = pausa/continua; arrastar = mover o texto à mão. Frase a frase: o texto não reage.
  let drag = null;
  el.prompter.addEventListener('pointerdown', (e) => {
    if (frase()) return;
    drag = { y: e.clientY, off: pOff, moved: false, wasPlaying: pPlay };
    try { el.prompter.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  el.prompter.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > 8) { drag.moved = true; if (pPlay) { pPlay = false; cancelAnimationFrame(pRaf); } }
    if (drag.moved) { pOff = drag.off - dy; prompterClamp(); paintPrompter(); }
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) { if (d.wasPlaying) pPause(); else pStart(); }
    else if (d.wasPlaying) pStart();
    else paintPrompter();
  };
  el.prompter.addEventListener('pointerup', endDrag);
  el.prompter.addEventListener('click', () => { if (frase() && S.auto) (aRun ? aPause('toque no texto') : aPlay('toque no texto')); });
  el.prompter.addEventListener('pointercancel', () => { drag = null; paintPrompter(); });
  // Teclado (Mac): ↑/↓ frase; espaço = próxima frase (frase a frase) ou pausa/continua (rolagem).
  // Espaço nunca aciona o botão em foco (gravar), nem fora dos campos de texto.
  const digitando = (e) => { const t = e.target; return !!t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/^(checkbox|range|file)$/.test(t.type))); };
  const teclaLivre = (e) => !digitando(e) && !openSheet && el.review.hidden;
  document.addEventListener('keydown', (e) => {
    if (!teclaLivre(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); passo(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); passo(1); }
    else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (frase()) passo(1); else (pPlay ? pPause() : pStart()); }
  }, true);
  document.addEventListener('keyup', (e) => { if ((e.key === ' ' || e.code === 'Space') && teclaLivre(e)) e.preventDefault(); }, true);
  document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    S.modo = b.dataset.modo; save(); pTop(); aParar(); renderModo(); renderPrompter(); layout(); paintAuto();
  }));
  function renderModo() { document.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.modo === (frase() ? 'frase' : 'rolagem')))); }
  el.infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = !el.app.classList.contains('showsel');
    el.app.classList.toggle('showsel', on); el.infoBtn.setAttribute('aria-pressed', String(on));
  });

  /* ---------- Passar sozinho (frase a frase) ---------- */
  // Cada tela fica no ar o tempo de leitura (texto.js: duracao) e passa para a próxima; para na última.
  let aRun = false, aT0 = 0, aGone = 0, aDurMs = 0, aRaf = 0, aFim = false;
  function aDurAtual() { const f = frases(); return f.length ? G.duracao(f[fIdx], S.ppm, f[fIdx + 1]) * 1000 : 0; }
  function paintAuto() {
    const on = frase() && !!S.auto && !!atual();
    el.pbar.hidden = !on; el.autoBtn.hidden = !on; el.rmini.hidden = !on; el.ppmMini.textContent = S.ppm;
    el.autoBtn.setAttribute('aria-pressed', String(aRun));
    el.autoBtn.textContent = aRun ? '❚❚' : '▶';
    el.autoBtn.setAttribute('aria-label', aRun ? 'Pausar as telas' : 'Passar as telas sozinho');
    paintBar(aDurMs ? aGone / aDurMs : 0);
  }
  function paintBar(p) { el.pbarI.style.width = (Math.min(1, Math.max(0, p)) * 100).toFixed(1) + '%'; }
  // Relógio por setInterval (50 ms), não requestAnimationFrame: o rAF para quando o Safari esconde ou rola a página.
  function aTick() {
    if (!aRun) return;
    const now = performance.now();
    aGone = Math.max(0, now - aT0);
    if (aGone >= aDurMs) {
      if (fIdx < frases().length - 1) { fIdx += 1; renderPrompter(); aDurMs = aDurAtual(); aT0 = now; aGone = 0; }
      else { aGone = aDurMs; aRun = false; aFim = true; clearInterval(aRaf); paintAuto(); if (state === 'rec') diag('passar sozinho: parado (fim do roteiro)'); return; } // para na última
    }
    paintBar(aDurMs ? aGone / aDurMs : 0);
  }
  function aPlay(origem) {
    if (!frase() || !S.auto || !atual()) {
      if (origem) diag('passar sozinho: não iniciou (' + origem + ') — ' + (!frase() ? 'modo rolagem' : !S.auto ? 'desligado em Telas e ritmo' : 'sem roteiro'));
      return;
    }
    if (origem) diag('passar sozinho: iniciado (' + origem + ') na tela ' + (fIdx + 1) + '/' + frases().length + ', ' + S.ppm + '/min');
    if (aFim) { fIdx = 0; aGone = 0; aFim = false; renderPrompter(); } // ▶ depois do fim: ensaia de novo do começo
    aDurMs = aDurAtual(); aT0 = performance.now() - aGone; aRun = true;
    clearInterval(aRaf); aRaf = setInterval(aTick, 50); paintAuto();
  }
  function aPause(motivo) {
    if (aRun) { aGone = Math.min(aDurMs, performance.now() - aT0); if (motivo) diag('passar sozinho: parado (' + motivo + ') na tela ' + (fIdx + 1)); }
    aRun = false; clearInterval(aRaf); paintAuto();
  }
  function aRestartTela() { aGone = 0; aFim = false; aT0 = performance.now(); aDurMs = aDurAtual(); paintAuto(); }
  function aParar() { aPause(); aRestartTela(); }
  el.autoBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.autoBtn.addEventListener('click', (e) => { e.stopPropagation(); (aRun ? aPause('botão ❚❚') : aPlay('botão ▶')); el.autoBtn.blur(); });
  el.optAuto.addEventListener('change', () => { S.auto = el.optAuto.checked; save(); diag('passar sozinho: ' + (S.auto ? 'ligado' : 'desligado') + ' em Telas e ritmo'); aParar(); });

  function onAct(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'spd-') S.speed = Math.max(1, S.speed - 1);
    if (a === 'spd+') S.speed = Math.min(25, S.speed + 1);
    if (a === 'fs-') S.fs = Math.max(18, S.fs - 2);
    if (a === 'fs+') S.fs = Math.min(64, S.fs + 2);
    if (a === 'pal-') S.maxPal = Math.max(4, S.maxPal - 1);
    if (a === 'pal+') S.maxPal = Math.min(20, S.maxPal + 1);
    if (a === 'ppm-') S.ppm = Math.max(90, S.ppm - 10);
    if (a === 'ppm+') S.ppm = Math.min(220, S.ppm + 10);
    if (a === 'top') pTop();
    save(); renderPrompter(); layout();
    if (/^(pal|top)/.test(a)) aRestartTela(); else if (/^ppm/.test(a)) aRitmoMudou(); else paintAuto();
  }
  // Ritmo mudou no meio de uma tela: mantém a fração já passada dela.
  function aRitmoMudou() {
    const now = performance.now(), g = aRun ? now - aT0 : aGone, frac = aDurMs ? Math.min(1, g / aDurMs) : 0;
    aDurMs = aDurAtual(); aGone = frac * aDurMs; if (aRun) aT0 = now - aGone; paintAuto();
  }
  el.rmini.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.rmini.addEventListener('click', (e) => { e.stopPropagation(); onAct(e); });
  document.querySelector('.quick').addEventListener('click', onAct);
  $('#sheet-ritmo').addEventListener('click', onAct);

  /* ---------- Fantasma ---------- */
  let ghostURL = '', ghostKind = '', ghostFoto = false;
  function applyGhost() {
    const show = !!ghostKind && S.ghostOn;
    const kind = ghostFoto ? 'image' : ghostKind;
    el.ghostImg.hidden = !(show && kind === 'image');
    el.ghostVid.hidden = !(show && kind === 'video');
    const flip = mirrored() !== !!S.ghostFlip;
    [el.ghostImg, el.ghostVid].forEach((g) => {
      g.style.opacity = String(S.op / 100);
      g.classList.toggle('mirror', flip);
    });
    el.ghostOp.value = S.op; el.ghostOpOut.textContent = S.op + '%';
    el.ghostOnChk.checked = S.ghostOn; el.ghostFlipChk.checked = !!S.ghostFlip;
    el.ghostBtn.classList.toggle('on', show);
    el.ghostClear.disabled = !ghostKind;
  }
  // Durante a gravação o fantasma de vídeo vira uma foto do quadro escolhido e o <video> dele é descarregado
  // (sem src): nada de segundo vídeo decodificando nem sessão de mídia extra enquanto a câmera grava.
  function congelaFantasma(on) {
    if (ghostKind !== 'video') return;
    if (on && !ghostFoto) {
      try {
        const v = el.ghostVid, c = document.createElement('canvas');
        c.width = v.videoWidth; c.height = v.videoHeight;
        if (c.width && c.height) { c.getContext('2d').drawImage(v, 0, 0); el.ghostImg.src = c.toDataURL('image/jpeg', 0.85); }
      } catch (e) { /* sem foto: o fantasma some durante a gravação */ }
      try { el.ghostVid.pause(); } catch (e) { /* ok */ }
      el.ghostVid.removeAttribute('src'); try { el.ghostVid.load(); } catch (e) { /* ok */ }
      ghostFoto = true; applyGhost();
      diag('fantasma de vídeo: virou foto durante a gravação');
    } else if (!on && ghostFoto) {
      ghostFoto = false;
      el.ghostImg.removeAttribute('src');
      el.ghostVid.src = ghostURL; // o loadedmetadata do loadGhost volta ao quadro do controle "Quadro"
      try { el.ghostVid.load(); } catch (e) { /* ok */ }
      applyGhost();
    }
  }
  function clearGhost() {
    ghostFoto = false;
    if (ghostURL) URL.revokeObjectURL(ghostURL);
    ghostURL = ''; ghostKind = '';
    el.ghostImg.removeAttribute('src');
    el.ghostVid.removeAttribute('src'); try { el.ghostVid.load(); } catch (e) { /* ok */ }
    el.frameRow.hidden = true;
    el.ghostStatus.textContent = 'Nenhum fantasma carregado.';
    applyGhost();
  }
  function seekGhost() {
    const d = el.ghostVid.duration;
    if (!isFinite(d) || d <= 0) return;
    const t = Math.min(d - 0.04, Math.max(0, (+el.ghostFrame.value / 1000) * d));
    try { el.ghostVid.currentTime = t; } catch (e) { /* ok */ }
    el.ghostFrameOut.textContent = t.toFixed(1).replace('.', ',') + ' s';
  }
  function loadGhost(f) {
    clearGhost();
    ghostURL = URL.createObjectURL(f);
    const isVid = /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm|3gp)$/i.test(f.name || '');
    if (isVid) {
      ghostKind = 'video';
      el.ghostStatus.textContent = 'Abrindo o vídeo…';
      el.ghostVid.onloadedmetadata = () => {
        const d = el.ghostVid.duration;
        el.frameRow.hidden = !(isFinite(d) && d > 0);
        el.ghostStatus.textContent = 'Vídeo · ' + (isFinite(d) ? d.toFixed(1).replace('.', ',') + ' s' : '') + ' · deslize "Quadro" para escolher o momento.';
        // iOS só pinta o quadro depois de um play; o vídeo é mudo, então é silencioso.
        try { const p = el.ghostVid.play(); if (p && p.then) p.then(() => { el.ghostVid.pause(); seekGhost(); }).catch(seekGhost); else { el.ghostVid.pause(); seekGhost(); } } catch (e) { seekGhost(); }
        seekGhost();
      };
      el.ghostVid.onerror = () => { el.ghostStatus.textContent = 'Este vídeo não abriu aqui. Tente um print (imagem) do quadro.'; };
      el.ghostVid.muted = true;
      el.ghostVid.src = ghostURL;
      try { el.ghostVid.load(); } catch (e) { /* ok */ }
    } else {
      ghostKind = 'image';
      el.ghostImg.onload = () => { el.ghostStatus.textContent = 'Imagem · ' + el.ghostImg.naturalWidth + '×' + el.ghostImg.naturalHeight; };
      el.ghostImg.onerror = () => { el.ghostStatus.textContent = 'Esta imagem não abriu aqui.'; };
      el.ghostImg.src = ghostURL;
    }
    if (!S.ghostOn) S.ghostOn = true;
    applyGhost();
  }
  el.ghostFile.addEventListener('change', () => {
    const f = el.ghostFile.files && el.ghostFile.files[0];
    if (f) loadGhost(f);
    el.ghostFile.value = '';
  });
  el.ghostOp.addEventListener('input', () => { S.op = +el.ghostOp.value; save(); applyGhost(); });
  el.ghostFrame.addEventListener('input', seekGhost);
  el.ghostOnChk.addEventListener('change', () => { S.ghostOn = el.ghostOnChk.checked; save(); applyGhost(); });
  el.ghostFlipChk.addEventListener('change', () => { S.ghostFlip = el.ghostFlipChk.checked; save(); applyGhost(); });
  el.ghostClear.addEventListener('click', clearGhost);

  /* ---------- Grade e olhos ---------- */
  function applyGuides() {
    el.grid.hidden = !S.grid; el.eye.hidden = !S.eye;
    el.eye.style.top = S.eyePos + '%';
    el.optGrid.checked = S.grid; el.optEye.checked = S.eye; el.optMirror.checked = S.mirrorFront; el.optCrop.checked = S.recorte916; el.optGuide.checked = S.guia916;
  }
  el.optGrid.addEventListener('change', () => { S.grid = el.optGrid.checked; save(); applyGuides(); });
  el.optEye.addEventListener('change', () => { S.eye = el.optEye.checked; save(); applyGuides(); });
  el.optMirror.addEventListener('change', () => { S.mirrorFront = el.optMirror.checked; save(); applyMirror(); });
  el.optCrop.addEventListener('change', () => { S.recorte916 = el.optCrop.checked; save(); layout(); updateInfo(); });
  el.optGuide.addEventListener('change', () => { S.guia916 = el.optGuide.checked; save(); layout(); });
  function renderQual() { document.querySelectorAll('[data-qual]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.qual === S.qual))); }
  document.querySelectorAll('[data-qual]').forEach((b) => b.addEventListener('click', () => {
    if (gravando() || S.qual === b.dataset.qual) return;
    S.qual = b.dataset.qual; save(); renderQual(); diag('qualidade: ' + S.qual);
    startCam().then(() => { layout(); updateInfo(); }); // reabre a câmera com o tamanho novo (fora da gravação)
  }));
  document.querySelectorAll('.ver').forEach((x) => { x.textContent = 'versão ' + VERSAO; });
  // Atualizar: apaga a cópia guardada, desliga o service worker e recarrega da rede.
  $('#atualizar').addEventListener('click', async () => {
    if (gravando()) return;
    try { const ks = await caches.keys(); await Promise.all(ks.filter((k) => k.startsWith('gravar-')).map((k) => caches.delete(k))); } catch (e) { /* ok */ }
    try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map((r) => r.unregister())); } catch (e) { /* ok */ }
    location.replace(location.pathname + '?v=' + Date.now());
  });
  let eyeDrag = false;
  el.eyeHandle.addEventListener('pointerdown', (e) => { eyeDrag = true; try { el.eyeHandle.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } e.stopPropagation(); });
  el.eyeHandle.addEventListener('pointermove', (e) => {
    if (!eyeDrag) return;
    const r = el.stage.getBoundingClientRect();
    S.eyePos = Math.round(Math.min(90, Math.max(8, ((e.clientY - r.top) / r.height) * 100)) * 10) / 10;
    el.eye.style.top = S.eyePos + '%';
  });
  const eyeEnd = () => { if (eyeDrag) { eyeDrag = false; save(); } };
  el.eyeHandle.addEventListener('pointerup', eyeEnd);
  el.eyeHandle.addEventListener('pointercancel', eyeEnd);

  /* ---------- Painéis ---------- */
  let openSheet = null;
  function sheet(name) {
    if (name && gravando() && name !== 'ritmo' && name !== 'ajustes') return; // Texto e Fantasma não abrem gravando
    if (openSheet) openSheet.hidden = true;
    openSheet = name ? $('#sheet-' + name) : null;
    el.scrim.hidden = !openSheet;
    if (openSheet) {
      openSheet.hidden = false;
      if (name === 'texto') renderLista();
      if (name === 'ajustes') { updateInfo(); renderDiag(); }
    }
  }
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => sheet(b.dataset.open)));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => sheet(null)));
  el.scrim.addEventListener('click', () => sheet(null));

  /* ---------- Gravação ---------- */
  const MIMES = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ];
  let mimeCache = null;
  function pickMime() {
    if (mimeCache !== null) return mimeCache;
    mimeCache = '';
    if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
      for (const t of MIMES) { try { if (MediaRecorder.isTypeSupported(t)) { mimeCache = t; break; } } catch (e) { /* segue */ } }
    }
    return mimeCache;
  }
  function extOf(m) { return /mp4/.test(m || '') ? 'mp4' : /webm/.test(m || '') ? 'webm' : (isIOS ? 'mp4' : 'webm'); }

  let rec = null, chunks = [], tStart = 0, tStop = 0, startedAt = null, recTimer = 0, countTimer = 0, recTermo = '';
  let canvas = null, drawing = false, route = '';
  function canvasStream() {
    const [w, h] = camDims();
    let sw = w, sh = h;
    if (recorte()) { if (w / h > 9 / 16) sw = Math.round(h * 9 / 16); else sh = Math.round(w * 16 / 9); }
    const sx = Math.round((w - sw) / 2), sy = Math.round((h - sh) / 2);
    const [ow, oh] = outDims();
    if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'rec-canvas'; canvas.setAttribute('aria-hidden', 'true'); document.body.append(canvas); }
    canvas.width = ow; canvas.height = oh;
    const ctx = canvas.getContext('2d', { alpha: false });
    drawing = true;
    // Desenha a cada quadro novo da câmera (requestVideoFrameCallback, iOS 15.4+) ou a cada 33 ms.
    // Nunca requestAnimationFrame: ele para quando o Safari esconde ou rola a página.
    const pinta = () => { try { ctx.drawImage(el.cam, sx, sy, sw, sh, 0, 0, ow, oh); } catch (e) { /* quadro ainda não pronto */ } };
    if (el.cam.requestVideoFrameCallback) {
      const draw = () => { if (!drawing) return; pinta(); el.cam.requestVideoFrameCallback(draw); };
      pinta(); el.cam.requestVideoFrameCallback(draw);
    } else {
      pinta();
      const iv = setInterval(() => { if (!drawing) { clearInterval(iv); return; } pinta(); }, 33);
    }
    const cs = canvas.captureStream(30);
    return new MediaStream([...cs.getVideoTracks(), ...stream.getAudioTracks()]);
  }
  function beginRecording() {
    if (!window.MediaRecorder) { toast('Este navegador não grava vídeo. Atualize o iOS ou use o Chrome.'); return false; }
    route = direct() ? 'direta' : recorte() ? 'recorte 9:16' : 'canvas em pé';
    let src;
    try { src = route === 'direta' ? stream : canvasStream(); } catch (e) { route = 'direta'; src = stream; }
    const mime = pickMime();
    const vbps = segura() ? 2500000 : 6000000; // Segura: 2,5 Mbps (720×960); Alta: 6 Mbps (1080×1440)
    const opts = { videoBitsPerSecond: vbps, audioBitsPerSecond: 128000 };
    if (mime) opts.mimeType = mime;
    try { rec = new MediaRecorder(src, opts); } catch (e) {
      try { rec = new MediaRecorder(src); } catch (e2) { drawing = false; toast('Não deu para gravar: ' + (e2.message || e2.name)); return false; }
    }
    chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = finishRecording;
    rec.onerror = (e) => { const n = (e.error && e.error.name) || 'desconhecido'; diag('MediaRecorder erro: ' + n); toast('Erro na gravação: ' + n); };
    startedAt = new Date();
    recTermo = termo(); // nome do arquivo = roteiro do começo do take (em sequência o ▼ pode trocar no meio)
    tStart = performance.now(); tStop = 0;
    rec.onstart = () => { tStart = performance.now(); };
    // Timeslice de 1000 ms (antes: nenhum, um pedaço só no stop): o arquivo vem em pedaços de 1 s e o vigia
    // vê a cada 5 s se o tamanho cresce; se parar de crescer com o áudio ligado, é o codificador.
    try { rec.start(1000); } catch (e) { drawing = false; toast('Não deu para gravar: ' + (e.message || e.name)); return false; }
    const [ow, oh] = outDims();
    const vtS = (stream.getVideoTracks()[0] && stream.getVideoTracks()[0].getSettings && stream.getVideoTracks()[0].getSettings()) || {};
    diag('início · versão ' + VERSAO + ' · qualidade ' + S.qual + ' · track ' + vtS.width + '×' + vtS.height + '@' + (vtS.frameRate ? Math.round(vtS.frameRate) : '?') +
      ' · arquivo ' + ow + '×' + oh + ' · rota ' + route + ' · ' + (rec.mimeType || mime || '?') + ' · ' + (vbps / 1e6).toFixed(1) + ' Mbps · timeslice 1 s');
    vigiar(true);
    return true;
  }

  /* ---------- Vigia da gravação: se a imagem parar, avisa na hora e registra o motivo ---------- */
  const LOGK = 'livowa_gravar_log';
  // Diagnóstico sem print (02/11): ao fim de cada gravação (e quando a imagem para) o log DESTE take vai ao Supabase
  // do site pelo mesmo RPC dos funis (log_funnel_event, chave pública). funnel_id 'gravar', event_type 'answer'
  // (a função só aceita view/step_view/answer/lead_capture/complete/cta_click), step_id 'gravar_diag'.
  // Nada de vídeo nem de texto do roteiro: só versão, qualidade, aparelho e as linhas do diagnóstico.
  const SB_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co';
  const SB_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K'; // chave pública (anon), a mesma dos funis
  const uuid = () => { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ok */ } return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); };
  const SID = uuid();
  let logTake = [];
  function enviaDiag(motivo, seg, bytes) {
    try {
      const h = location.hostname;
      if (h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') return;
      const props = { versao: VERSAO, qualidade: S.qual, rota: route, motivo, duracao_s: seg === undefined ? null : seg,
        bytes: bytes === undefined ? null : bytes, user_agent: navigator.userAgent, log: logTake.slice() };
      while (JSON.stringify(props).length > 3500 && props.log.length > 1) props.log.shift(); // limite de 4 KB do RPC
      fetch(SB_URL + '/rest/v1/rpc/log_funnel_event', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
        body: JSON.stringify({ p_event_id: uuid(), p_funnel_id: 'gravar', p_variant: 'A', p_session_id: SID, p_event_type: 'answer',
          p_step_id: 'gravar_diag', p_step_index: null, p_value_text: String(motivo).slice(0, 80), p_props: props, p_client_ts: new Date().toISOString() }),
      }).catch(() => {});
    } catch (e) { /* diagnóstico nunca atrapalha a gravação */ }
  }
  function diag(msg) {
    logTake.push(Math.round((performance.now() - (tStart || performance.now())) / 1000) + 's ' + msg);
    if (logTake.length > 40) logTake.shift();
    let l = [];
    try { l = JSON.parse(localStorage.getItem(LOGK) || '[]'); } catch (e) { l = []; }
    const d = new Date();
    l.push(pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + msg);
    l = l.slice(-20);
    try { localStorage.setItem(LOGK, JSON.stringify(l)); } catch (e) { /* cheio */ }
    renderDiag(l);
  }
  function renderDiag(l) {
    if (!l) { try { l = JSON.parse(localStorage.getItem(LOGK) || '[]'); } catch (e) { l = []; } }
    el.diagLog.textContent = '';
    (l.length ? l : ['(vazio)']).forEach((x) => { const li = document.createElement('li'); li.textContent = x; el.diagLog.append(li); });
  }
  el.diagClear.addEventListener('click', () => { try { localStorage.removeItem(LOGK); } catch (e) { /* ok */ } renderDiag([]); });
  let vigia = null, falhaTake = '';
  function vigiar(on) {
    if (vigia) {
      clearInterval(vigia.iv); vigia.off.forEach((f) => f()); vigia = null;
    }
    el.alerta.hidden = true;
    if (!on || !stream) return;
    falhaTake = '';
    const vt = stream.getVideoTracks()[0];
    const v = { quadros: 0, ult: -1, parado: 0, avisou: false, off: [] };
    const ouve = (alvo, ev, fn) => { alvo.addEventListener(ev, fn); v.off.push(() => alvo.removeEventListener(ev, fn)); };
    const seg = () => Math.round((performance.now() - tStart) / 1000);
    const falha = (motivo) => {
      diag('IMAGEM PAROU aos ' + seg() + ' s: ' + motivo);
      if (!v.avisou) { enviaDiag('imagem parada aos ' + seg() + ' s'); }
      if (!v.avisou) { v.avisou = true; falhaTake = 'A câmera parou aos ' + seg() + ' s neste take. Grave de novo.'; el.alerta.textContent = 'A câmera parou aos ' + seg() + ' s — pare e grave de novo'; el.alerta.hidden = false; }
    };
    if (vt) {
      ouve(vt, 'ended', () => falha('track de vídeo terminou (ended)'));
      ouve(vt, 'mute', () => { diag('track de vídeo mudo (mute) aos ' + seg() + ' s'); });
      ouve(vt, 'unmute', () => diag('track de vídeo voltou (unmute) aos ' + seg() + ' s'));
    }
    ouve(el.cam, 'pause', () => { diag('<video> pausou aos ' + seg() + ' s; play() de novo'); try { const p = el.cam.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ok */ } });
    ouve(el.cam, 'stalled', () => diag('<video> stalled aos ' + seg() + ' s'));
    ouve(document, 'visibilitychange', () => diag('página ' + (document.visibilityState === 'visible' ? 'visível' : 'ESCONDIDA') + ' aos ' + seg() + ' s'));
    if (el.cam.requestVideoFrameCallback) {
      const conta = () => { if (vigia !== v) return; v.quadros++; el.cam.requestVideoFrameCallback(conta); };
      el.cam.requestVideoFrameCallback(conta);
    }
    // A cada 1 s: o quadro avançou? (contador do requestVideoFrameCallback; senão quadros decodificados; senão currentTime)
    const marca = () => {
      if (el.cam.requestVideoFrameCallback) return v.quadros;
      const q = el.cam.getVideoPlaybackQuality && el.cam.getVideoPlaybackQuality();
      return q && q.totalVideoFrames ? q.totalVideoFrames : el.cam.currentTime;
    };
    let tic = 0, ultBytes = -1;
    v.iv = setInterval(() => {
      if (++tic % 5 === 0) {
        const bytes = chunks.reduce((n, c) => n + c.size, 0);
        diag(seg() + ' s: arquivo ' + fmtMB(bytes) + (bytes === ultBytes ? ' — PAROU DE CRESCER (codificador?)' : ''));
        ultBytes = bytes;
      }
      const m = marca();
      if (m === v.ult) { v.parado += 1; if (v.parado >= 2) falha('nenhum quadro novo há ' + v.parado + ' s' + (vt ? ' (track ' + vt.readyState + (vt.muted ? ', mudo' : '') + ')' : '')); }
      else v.parado = 0;
      v.ult = m;
    }, 1000);
    vigia = v;
  }
  function countdown() {
    sheet(null);
    setState('count');
    if (!frase()) pTop(); // frase a frase: grava a partir da frase escolhida (↺ volta à 1ª)
    else aParar();        // o tempo da tela começa junto com a gravação
    logTake = []; tStart = performance.now();
    keepAwake('gravar');
    congelaFantasma(true); // fantasma de vídeo vira foto durante a gravação (libera o decodificador)
    let n = 3;
    el.countN.textContent = n; el.count.hidden = false;
    const restart = () => { el.countN.style.animation = 'none'; void el.countN.offsetWidth; el.countN.style.animation = ''; };
    countTimer = setInterval(() => {
      n -= 1;
      if (n > 0) { el.countN.textContent = n; restart(); return; }
      clearInterval(countTimer); el.count.hidden = true;
      if (!beginRecording()) { setState('idle'); congelaFantasma(false); return; }
      setState('rec');
      pStart();                       // rolagem automática
      if (frase()) aPlay('gravação');   // frase a frase: passar sozinho (registra se não iniciar e por quê)
      el.recPill.hidden = false;
      el.recTime.textContent = fmtS(0);
      recTimer = setInterval(() => { el.recTime.textContent = fmtS(performance.now() - tStart); }, 100);
    }, 1000);
  }
  function cancelCount() { clearInterval(countTimer); el.count.hidden = true; setState('idle'); aPause('contagem cancelada'); congelaFantasma(false); paintPrompter(); }
  function stopRecording() {
    clearInterval(recTimer);
    aPause('fim da gravação');
    vigiar(false);
    diag('parou: ' + fmtS(performance.now() - tStart));
    tStop = performance.now();
    pPause();
    el.recPill.hidden = true;
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) { finishRecording(); }
  }
  el.recBtn.addEventListener('click', () => {
    if (state === 'idle') { if (!camReady) { startCam(); return; } countdown(); }
    else if (state === 'count') cancelCount();
    else if (state === 'rec') stopRecording();
  });

  /* ---------- Revisão ---------- */
  let take = null; // { blob, url, name, ms, file }
  function pad(n) { return String(n).padStart(2, '0'); }
  const usados = {}; // dois takes no mesmo minuto: o 2º ganha -2 (senão um arquivo cobre o outro em Downloads)
  function fileName(ext) {
    const d = startedAt || new Date();
    const base = S.tipo + '-' + (recTermo || termo()) + '-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
    usados[base] = (usados[base] || 0) + 1;
    return base + (usados[base] > 1 ? '-' + usados[base] : '') + '.' + ext;
  }
  function finishRecording() {
    drawing = false;
    vigiar(false);
    congelaFantasma(false);
    if (!tStop) tStop = performance.now();
    const type = ((rec && rec.mimeType) || pickMime() || (isIOS ? 'video/mp4' : 'video/webm')).split(';')[0];
    const blob = new Blob(chunks, { type });
    chunks = [];
    setState('review');
    if (!blob.size) { setState('idle'); toast('A gravação saiu vazia. Tente de novo.'); return; }
    discardTake();
    const name = fileName(extOf(type));
    const url = URL.createObjectURL(blob);
    let file = null;
    try { file = new File([blob], name, { type }); } catch (e) { /* Safari antigo */ }
    take = { blob, url, name, ms: Math.max(0, tStop - tStart), file, type };
    const [ow, oh] = outDims();
    el.play.src = url;
    el.rvDur.textContent = fmtS(take.ms);
    el.rvMeta.textContent = fmtMB(blob.size) + ' · ' + extOf(type) + (ow ? ' · ' + ow + '×' + oh : '') + ' · rota ' + route;
    el.rvName.textContent = name;
    el.dlLink.href = url; el.dlLink.download = name;
    el.rvTip.textContent = falhaTake; el.rvTip.hidden = !falhaTake;
    if (falhaTake) diag('take com imagem parada');
    enviaDiag(falhaTake ? 'fim com imagem parada' : 'fim', Math.round(take.ms / 100) / 10, blob.size);
    el.review.dataset.bytes = String(blob.size);
    el.review.dataset.type = type;
    el.review.dataset.ms = String(Math.round(take.ms));
    el.review.dataset.name = name;
    el.review.dataset.route = route;
    el.review.hidden = false;
    // Duração real do arquivo, quando o navegador informa (o webm do Chrome às vezes não traz).
    el.play.onloadedmetadata = () => {
      const d = el.play.duration;
      if (isFinite(d) && d > 0) { el.rvDur.textContent = fmtS(d * 1000); el.review.dataset.fileMs = String(Math.round(d * 1000)); }
      const vw = el.play.videoWidth, vh = el.play.videoHeight;
      if (vw && vh) el.rvMeta.textContent = fmtMB(blob.size) + ' · ' + extOf(type) + ' · ' + vw + '×' + vh + ' · rota ' + route;
    };
  }
  function discardTake() {
    if (take) { URL.revokeObjectURL(take.url); take = null; }
    el.play.removeAttribute('src'); try { el.play.load(); } catch (e) { /* ok */ }
  }
  function closeReview() {
    try { el.play.pause(); } catch (e) { /* ok */ }
    el.review.hidden = true; setState('idle'); aPause(); if (!frase()) pTop(); else paintPrompter();
  }
  el.redoBtn.addEventListener('click', () => { discardTake(); closeReview(); countdown(); });
  el.nextBtn.addEventListener('click', () => {
    // Em sequência: depois de um take, já abre o roteiro seguinte (gancho 1 → gancho 2 → …).
    if (S.seq && S.idx < roteiros().length - 1) { S.idx += 1; fIdx = 0; save(); renderPrompter(); }
    closeReview();
  });
  el.optSeq.checked = !!S.seq;
  el.optSeq.addEventListener('change', () => { S.seq = el.optSeq.checked; save(); });
  /* ---------- Ver telas: juntar / dividir à mão (vira quebra de linha ou espaço colado no texto guardado) ---------- */
  let divK = -1;
  function renderTelas() {
    if (el.telas.hidden) return;
    el.telas.textContent = '';
    const it = atual();
    const ts = telasAtual();
    if (!it || !ts.length) { el.telas.textContent = 'Escolha um roteiro acima.'; return; }
    ts.forEach((t, k) => {
      const row = document.createElement('div'); row.className = 'tl';
      const tx = document.createElement('span'); tx.className = 'tx';
      const tn = document.createElement('span'); tn.className = 'tn'; tn.textContent = (k + 1) + '/' + ts.length;
      tx.append(tn, document.createTextNode(t.texto.replace(/\u00A0/g, ' ')));
      row.append(tx);
      if (divK === k) {
        const ws = document.createElement('div'); ws.className = 'ws';
        G.palavrasDaTela(t).forEach((w, i) => {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = w; b.disabled = i === 0;
          b.addEventListener('click', () => { divK = -1; aplicarCorpo(G.dividir(it.body, ts, t, i)); });
          ws.append(b);
        });
        const aj = document.createElement('small'); aj.className = 'ajuda'; aj.textContent = 'Toque na palavra que começa a tela nova.';
        const ac = document.createElement('div'); ac.className = 'ac';
        const cx = document.createElement('button'); cx.type = 'button'; cx.textContent = 'Cancelar';
        cx.addEventListener('click', () => { divK = -1; renderTelas(); });
        ac.append(cx); row.append(ws, aj, ac);
      } else {
        const ac = document.createElement('div'); ac.className = 'ac';
        if (k < ts.length - 1) {
          const j = document.createElement('button'); j.type = 'button'; j.textContent = 'juntar com a de baixo';
          j.addEventListener('click', () => aplicarCorpo(G.juntar(it.body, ts, k)));
          ac.append(j);
        }
        if (G.palavrasDaTela(t).length > 1) {
          const d = document.createElement('button'); d.type = 'button'; d.textContent = 'dividir';
          d.addEventListener('click', () => { divK = k; renderTelas(); });
          ac.append(d);
        }
        row.append(ac);
      }
      el.telas.append(row);
    });
  }
  // Grava a edição no texto (permanente) e redesenha tudo. Nunca durante a gravação.
  function aplicarCorpo(corpo) {
    if (state === 'rec' || state === 'count') return;
    const it = atual(); if (!it) return;
    S.texto = G.editar(S.texto, it, corpo);
    el.txt.value = S.texto;
    save(); renderLista(); renderPrompter(); renderTelas();
  }
  el.verTelas.addEventListener('click', () => {
    el.telas.hidden = !el.telas.hidden; divK = -1;
    el.verTelas.textContent = el.telas.hidden ? 'Ver telas' : 'Fechar telas';
    el.verTelas.setAttribute('aria-expanded', String(!el.telas.hidden));
    renderTelas();
  });
  el.saveBtn.addEventListener('click', async () => {
    if (!take) return;
    // iPhone/iPad: folha de compartilhar → "Salvar Vídeo" (Fotos) ou "Salvar em Arquivos".
    if (isIOS && take.file && navigator.canShare && navigator.canShare({ files: [take.file] })) {
      try {
        await navigator.share({ files: [take.file], title: take.name });
        el.rvTip.textContent = 'Pronto. Toque em "Gravar o próximo" ou regrave.'; el.rvTip.hidden = false;
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
    }
    el.dlLink.click();
    el.rvTip.textContent = isIOS ? 'No iPhone o arquivo vai para Arquivos › Downloads.' : 'Baixado: ' + take.name;
    el.rvTip.hidden = false;
  });

  /* ---------- Sem internet depois de carregar ---------- */
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => { /* segue sem cache */ });
  }

  /* ---------- Início ---------- */
  renderTipo(); renderModo(); renderQual(); applyGuides(); applyGhost(); layout(); renderPrompter(); setState('idle'); paintAuto();
  keepAwake();
  startCam();
})();
