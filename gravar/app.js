/* livowa.com/gravar — gravador com teleprompter e fantasma de enquadramento.
   Nada sai do aparelho: sem análise de uso, sem rede (o CSP bloqueia connect-src).
   Duas rotas de gravação:
   - direta: a faixa da câmera já é 9:16 (iPhone em pé) → MediaRecorder grava a própria câmera;
   - recorte: a câmera entrega outra proporção (Mac, 16:9) → desenha o centro 9:16 num canvas e grava o canvas.
   Nas duas, o arquivo sai sem espelho e sem fantasma/grade/texto (tudo isso é só DOM por cima). */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const KEY = 'livowa_gravar_v1';
  const DEF = {
    texto: '', idx: 0, tipo: 'chamada', speed: 6, fs: 30,
    op: 35, ghostOn: true, ghostFlip: false,
    grid: false, eye: false, eyePos: 33,
    facing: 'user', mirrorFront: true, recorte: false,
  };
  const S = Object.assign({}, DEF);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(S, JSON.parse(raw) || {});
  } catch (e) { /* sem localStorage: segue com o padrão */ }
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
    review: $('#review'), play: $('#play'), rvDur: $('#rvDur'), rvMeta: $('#rvMeta'), rvName: $('#rvName'),
    redoBtn: $('#redoBtn'), saveBtn: $('#saveBtn'), dlLink: $('#dlLink'), nextBtn: $('#nextBtn'), rvTip: $('#rvTip'),
    toast: $('#toast'),
  };

  const fmtS = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
  const fmtMB = (b) => b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let toastT = 0;
  function toast(msg, ms = 2600) {
    el.toast.textContent = msg; el.toast.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.toast.hidden = true; }, ms);
  }

  /* ---------- Quadro 9:16 sempre inteiro na tela ---------- */
  function layout() {
    const r = el.area.getBoundingClientRect();
    let w = r.width, h = w * 16 / 9;
    if (h > r.height) { h = r.height; w = h * 9 / 16; }
    el.stage.style.width = Math.floor(w) + 'px';
    el.stage.style.height = Math.floor(h) + 'px';
    prompterClamp();
  }
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 300));

  /* ---------- Estado geral ---------- */
  let state = 'idle'; // idle | count | rec | review
  function setState(s) {
    state = s;
    el.app.classList.toggle('recording', s === 'rec');
    el.app.classList.toggle('counting', s === 'count');
    el.recBtn.setAttribute('aria-label', s === 'rec' ? 'Parar' : s === 'count' ? 'Cancelar contagem' : 'Gravar');
    document.querySelectorAll('.tool').forEach((b) => { b.disabled = (s === 'rec' || s === 'count'); });
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
  function stopCam() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; camReady = false;
  }
  async function startCam() {
    if (state === 'rec' || state === 'count') return;
    stopCam();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCamMsg('Este navegador não abre a câmera aqui. Use o Safari ou o Chrome, numa página https.', false);
      return;
    }
    showCamMsg('Abrindo a câmera…', false);
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const tries = [
      { video: { facingMode: { ideal: S.facing }, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 9 / 16 }, frameRate: { ideal: 30 } }, audio },
      { video: { facingMode: { ideal: S.facing } }, audio: true },
    ];
    let lastErr = null;
    for (const c of tries) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch (e) {
        lastErr = e;
        if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) break;
      }
    }
    if (!stream) { showCamMsg(camError(lastErr), true); return; }
    const vt = stream.getVideoTracks()[0];
    const st = (vt && vt.getSettings && vt.getSettings()) || {};
    facingNow = st.facingMode || (S.facing === 'environment' && videoInputs > 1 ? 'environment' : 'user');
    el.cam.srcObject = stream;
    try { const p = el.cam.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* autoplay cuida */ }
    applyMirror();
    await waitDims(el.cam);
    camReady = true;
    showCamMsg(null);
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
  el.cam.addEventListener('resize', updateInfo);
  el.camRetry.addEventListener('click', startCam);
  el.flipBtn.addEventListener('click', () => {
    S.facing = S.facing === 'user' ? 'environment' : 'user'; save(); startCam();
  });
  function mirrored() { return facingNow !== 'environment' && S.mirrorFront; }
  function applyMirror() {
    el.cam.classList.toggle('mirror', mirrored());
    applyGhost();
  }
  function camDims() { return [el.cam.videoWidth || 0, el.cam.videoHeight || 0]; }
  function direct() {
    if (S.recorte) return false;
    const [w, h] = camDims();
    return !!(w && h && Math.abs(w / h - 9 / 16) < 0.02);
  }
  function outDims() {
    const [w, h] = camDims();
    if (!w || !h) return [0, 0];
    if (direct()) return [w, h];
    let sw = w, sh = h;
    if (w / h > 9 / 16) sw = h * 9 / 16; else sh = w * 16 / 9;
    const k = Math.min(1, 1920 / sh);
    return [Math.round(sw * k / 2) * 2, Math.round(sh * k / 2) * 2];
  }
  function updateInfo() {
    const [w, h] = camDims();
    const [ow, oh] = outDims();
    const mime = pickMime();
    el.resTag.textContent = ow ? ow + '×' + oh + ' · ' + extOf(mime) : '';
    const rows = [
      ['Câmera', w ? w + '×' + h + (facingNow === 'environment' ? ' (traseira)' : ' (frontal)') : '—'],
      ['Arquivo', ow ? ow + '×' + oh : '—'],
      ['Rota', w ? (direct() ? 'direta (a câmera já é 9:16)' : 'recorte 9:16 do centro') : '—'],
      ['Formato', mime || (window.MediaRecorder ? 'padrão do navegador' : 'este navegador não grava')],
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
  async function keepAwake() {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch (e) { /* sem suporte */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      keepAwake();
      if (!stream || stream.getVideoTracks().every((t) => t.readyState === 'ended')) startCam();
    }
  });

  /* ---------- Roteiros ---------- */
  function roteiros() {
    return S.texto.replace(/\r/g, '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  }
  function splitLabel(t) {
    const m = t.match(/^#\s*([^\n]*)\n?/);
    return m ? { label: m[1].trim(), body: t.slice(m[0].length).trim() } : { label: '', body: t };
  }
  function atual() {
    const l = roteiros();
    if (!l.length) return null;
    const i = Math.min(Math.max(0, S.idx | 0), l.length - 1);
    return Object.assign({ i }, splitLabel(l[i]));
  }
  function termo() {
    const r = atual();
    const src = r ? (r.label || r.body) : '';
    const m = src.normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[A-Za-z0-9]+/);
    return m ? m[0].toUpperCase() : 'TAKE';
  }
  function palavras(t) { return (t.match(/\S+/g) || []).length; }
  function renderLista() {
    const l = roteiros();
    el.lista.textContent = '';
    el.listHint.hidden = l.length < 1;
    el.listHint.textContent = l.length > 1 ? l.length + ' roteiros. Toque no que vai gravar.' : 'Um roteiro. Para vários, separe com uma linha em branco.';
    const cur = atual();
    l.forEach((raw, i) => {
      const { label, body } = splitLabel(raw);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'item'; b.dataset.i = i;
      b.setAttribute('aria-pressed', String(!!cur && cur.i === i));
      const n = document.createElement('span'); n.className = 'n'; n.textContent = String(i + 1);
      const w = document.createElement('span');
      const t = document.createElement('span'); t.className = 't'; t.textContent = (label ? label + ' · ' : '') + body.replace(/\s+/g, ' ');
      const m = document.createElement('span'); m.className = 'm';
      const p = palavras(body);
      m.textContent = p + ' palavras · ~' + Math.max(1, Math.round(p / 2.5)) + ' s';
      w.append(t, m); b.append(n, w);
      el.lista.append(b);
    });
  }
  el.lista.addEventListener('click', (e) => {
    const b = e.target.closest('.item'); if (!b) return;
    S.idx = +b.dataset.i; save(); renderLista(); renderPrompter();
  });
  el.txt.value = S.texto;
  el.txt.addEventListener('input', () => {
    S.texto = el.txt.value;
    const n = roteiros().length;
    if (S.idx >= n) S.idx = Math.max(0, n - 1);
    save(); renderLista(); renderPrompter();
  });
  document.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { S.tipo = b.dataset.tipo; save(); renderTipo(); }));
  function renderTipo() {
    document.querySelectorAll('[data-tipo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tipo === S.tipo)));
  }

  /* ---------- Teleprompter ---------- */
  let pOff = 0, pPlay = false, pLast = 0, pRaf = 0;
  const pps = () => S.speed * 3.5 * (S.fs / 30); // px por segundo
  function renderPrompter() {
    const r = atual();
    el.ptext.classList.toggle('empty', !r);
    el.ptext.textContent = r ? r.body : 'Toque em Texto e cole o roteiro.';
    el.app.style.setProperty('--fs', S.fs + 'px');
    el.spdOut.textContent = S.speed; el.fsOut.textContent = S.fs;
    prompterClamp(); paintPrompter();
  }
  function pMax() { return Math.max(0, el.ptext.scrollHeight - el.prompter.clientHeight * 0.45); }
  function prompterClamp() { pOff = Math.min(Math.max(0, pOff), pMax()); }
  function paintPrompter() {
    el.ptext.style.transform = 'translate3d(0,' + (-pOff).toFixed(1) + 'px,0)';
    let tag = '';
    if (!pPlay && atual()) {
      if (state === 'rec') tag = 'pausado · toque para seguir';
      else if (pOff === 0) tag = 'toque para testar a rolagem';
      else if (pOff >= pMax() - 0.5) tag = 'fim do texto';
      else tag = 'pausado';
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
  function pStart() { if (!atual()) return; if (pOff >= pMax() - 0.5) pOff = 0; pPlay = true; pLast = 0; cancelAnimationFrame(pRaf); pRaf = requestAnimationFrame(tick); paintPrompter(); }
  function pPause() { pPlay = false; cancelAnimationFrame(pRaf); paintPrompter(); }
  function pTop() { pPause(); pOff = 0; paintPrompter(); }
  // Toque = pausa/continua; arrastar = mover o texto à mão.
  let drag = null;
  el.prompter.addEventListener('pointerdown', (e) => {
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
  el.prompter.addEventListener('pointercancel', () => { drag = null; paintPrompter(); });
  el.prompter.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pPlay ? pPause() : pStart(); } });

  document.querySelector('.quick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'spd-') S.speed = Math.max(1, S.speed - 1);
    if (a === 'spd+') S.speed = Math.min(25, S.speed + 1);
    if (a === 'fs-') S.fs = Math.max(18, S.fs - 2);
    if (a === 'fs+') S.fs = Math.min(64, S.fs + 2);
    if (a === 'top') pTop();
    save(); renderPrompter();
  });

  /* ---------- Fantasma ---------- */
  let ghostURL = '', ghostKind = '';
  function applyGhost() {
    const show = !!ghostKind && S.ghostOn;
    el.ghostImg.hidden = !(show && ghostKind === 'image');
    el.ghostVid.hidden = !(show && ghostKind === 'video');
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
  function clearGhost() {
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
    el.optGrid.checked = S.grid; el.optEye.checked = S.eye; el.optMirror.checked = S.mirrorFront; el.optCrop.checked = S.recorte;
  }
  el.optGrid.addEventListener('change', () => { S.grid = el.optGrid.checked; save(); applyGuides(); });
  el.optEye.addEventListener('change', () => { S.eye = el.optEye.checked; save(); applyGuides(); });
  el.optMirror.addEventListener('change', () => { S.mirrorFront = el.optMirror.checked; save(); applyMirror(); });
  el.optCrop.addEventListener('change', () => { S.recorte = el.optCrop.checked; save(); updateInfo(); });
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
    if (openSheet) openSheet.hidden = true;
    openSheet = name ? $('#sheet-' + name) : null;
    el.scrim.hidden = !openSheet;
    if (openSheet) {
      openSheet.hidden = false;
      if (name === 'texto') renderLista();
      if (name === 'ajustes') updateInfo();
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

  let rec = null, chunks = [], tStart = 0, tStop = 0, startedAt = null, recTimer = 0, countTimer = 0;
  let canvas = null, drawing = false, route = '';
  function canvasStream() {
    const [w, h] = camDims();
    let sw = w, sh = h;
    if (w / h > 9 / 16) sw = Math.round(h * 9 / 16); else sh = Math.round(w * 16 / 9);
    const sx = Math.round((w - sw) / 2), sy = Math.round((h - sh) / 2);
    const [ow, oh] = outDims();
    if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'rec-canvas'; canvas.setAttribute('aria-hidden', 'true'); document.body.append(canvas); }
    canvas.width = ow; canvas.height = oh;
    const ctx = canvas.getContext('2d', { alpha: false });
    drawing = true;
    const draw = () => {
      if (!drawing) return;
      try { ctx.drawImage(el.cam, sx, sy, sw, sh, 0, 0, ow, oh); } catch (e) { /* quadro ainda não pronto */ }
      requestAnimationFrame(draw);
    };
    draw();
    const cs = canvas.captureStream(30);
    return new MediaStream([...cs.getVideoTracks(), ...stream.getAudioTracks()]);
  }
  function beginRecording() {
    if (!window.MediaRecorder) { toast('Este navegador não grava vídeo. Atualize o iOS ou use o Chrome.'); return false; }
    route = direct() ? 'direta' : 'recorte';
    let src;
    try { src = route === 'direta' ? stream : canvasStream(); } catch (e) { route = 'direta'; src = stream; }
    const mime = pickMime();
    const opts = { videoBitsPerSecond: 8000000, audioBitsPerSecond: 128000 };
    if (mime) opts.mimeType = mime;
    try { rec = new MediaRecorder(src, opts); } catch (e) {
      try { rec = new MediaRecorder(src); } catch (e2) { drawing = false; toast('Não deu para gravar: ' + (e2.message || e2.name)); return false; }
    }
    chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = finishRecording;
    rec.onerror = (e) => { toast('Erro na gravação: ' + ((e.error && e.error.name) || 'desconhecido')); };
    startedAt = new Date();
    tStart = performance.now(); tStop = 0;
    rec.onstart = () => { tStart = performance.now(); };
    try { rec.start(); } catch (e) { drawing = false; toast('Não deu para gravar: ' + (e.message || e.name)); return false; }
    return true;
  }
  function countdown() {
    sheet(null);
    setState('count');
    pTop();
    let n = 3;
    el.countN.textContent = n; el.count.hidden = false;
    const restart = () => { el.countN.style.animation = 'none'; void el.countN.offsetWidth; el.countN.style.animation = ''; };
    countTimer = setInterval(() => {
      n -= 1;
      if (n > 0) { el.countN.textContent = n; restart(); return; }
      clearInterval(countTimer); el.count.hidden = true;
      if (!beginRecording()) { setState('idle'); return; }
      setState('rec');
      pStart();
      el.recPill.hidden = false;
      el.recTime.textContent = fmtS(0);
      recTimer = setInterval(() => { el.recTime.textContent = fmtS(performance.now() - tStart); }, 100);
    }, 1000);
  }
  function cancelCount() { clearInterval(countTimer); el.count.hidden = true; setState('idle'); paintPrompter(); }
  function stopRecording() {
    clearInterval(recTimer);
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
    const base = S.tipo + '-' + termo() + '-' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
    usados[base] = (usados[base] || 0) + 1;
    return base + (usados[base] > 1 ? '-' + usados[base] : '') + '.' + ext;
  }
  function finishRecording() {
    drawing = false;
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
    el.rvTip.hidden = true;
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
    el.review.hidden = true; setState('idle'); pTop();
  }
  el.redoBtn.addEventListener('click', () => { discardTake(); closeReview(); countdown(); });
  el.nextBtn.addEventListener('click', () => { closeReview(); });
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
  renderTipo(); applyGuides(); applyGhost(); layout(); renderPrompter(); setState('idle');
  keepAwake();
  startCam();
})();
