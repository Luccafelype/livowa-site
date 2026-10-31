// ============================================================
// LIVOWA — Motor do quiz de longevidade
// Herdado do livowa-quiz (r11): flow declarativo com condition, saveAnswer com
// fan-out de analytics, captura com normalização de telefone, loading, persistência
// local. Visual reescrito no padrão do livowa.com/idade.
// Conteúdo: config.js. Este arquivo não precisa mudar para trocar textos.
// ============================================================

import { CONFIG } from './config.js?v=lg2';
import * as Analytics from './funnel-analytics.js?v=lg3';

const FLOW = CONFIG.flow;
const N = FLOW.length;
const LOADING_STEP = N + 1;
const RESULT_STEP = N + 2;

const state = {
  step: 0,            // 0 = capa · 1..N = flow · N+1 = loading · N+2 = resultado
  answers: {},        // { id: value | [values] }
  startedAt: null,
  lead: { nome: '', whatsapp: '', consent: false },
  codigo: null        // LV-XXXX, gerado no fim do loading (vai na mensagem e no evento 'complete')
};

const $ = (id) => document.getElementById(id);
const screensEl = $('screens');

// ------------------------------------------------------------
// DOM util (mesma assinatura do motor antigo)
// ------------------------------------------------------------
function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v);
  });
  children.flat(Infinity).forEach(c => {
    if (c == null || c === false) return;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return e;
}
function haptic() { try { if ('vibrate' in navigator) navigator.vibrate(8); } catch (e) {} }
function shake(n) { n.classList.remove('shake'); void n.offsetWidth; n.classList.add('shake'); }
function ctaBar(...nodes) { return el('div', { class: 'cta' }, el('div', {}, ...nodes)); }
function ctaInline(...nodes) { return el('div', { class: 'cta-inline' }, ...nodes); }
// marcação do config: *cor* · ==marca-texto== · **negrito** (escapa o texto antes)
function fmt(t) {
  const esc = String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/\*(.+?)\*/g, '<em class="hl">$1</em>');
}
const pill = (t, extra = '') => el('div', { class: 'pill' + extra, html: fmt(t) });
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}

// ------------------------------------------------------------
// Respostas texto (perfil, loading, mensagens)
// ------------------------------------------------------------
function item(id) { return FLOW.find(f => f.id === id); }
function op(id) {
  const q = item(id), v = state.answers[id];
  return q && q.options ? q.options.find(o => o.value === v) : undefined;
}
function juntar(lista) {
  if (lista.length <= 1) return lista[0] || '';
  return lista.slice(0, -1).join(', ') + ' e ' + lista[lista.length - 1];
}
function curto(id) {
  const q = item(id), v = state.answers[id];
  if (!q || v == null) return '';
  if (Array.isArray(v)) return juntar(q.options.filter(o => v.includes(o.value)).map(o => o.curto || o.label));
  const o = q.options && q.options.find(x => x.value === v);
  return o ? (o.curto || o.label) : String(v);
}
const txt = (v) => typeof v === 'function' ? v(state, curto, op) : v;

// ------------------------------------------------------------
// Navegação (pula itens com condition = false)
// ------------------------------------------------------------
const isVisible = (it) => !it.condition || it.condition(state);
function nextVisibleStep(from) {
  let s = from + 1;
  while (s >= 1 && s <= N && !isVisible(FLOW[s - 1])) s++;
  return s;
}
function prevVisibleStep(from) {
  let s = from - 1;
  while (s >= 1 && s <= N && !isVisible(FLOW[s - 1])) s--;
  return Math.max(0, s);
}
function stepId(step) {
  if (step === 0) return 'capa';
  if (step >= 1 && step <= N) return FLOW[step - 1].id;
  return step === LOADING_STEP ? 'loading' : 'resultado';
}
function updateTop() {
  const visiveis = FLOW.filter(isVisible);
  const total = visiveis.length + 1;                       // +1 = resultado
  let pos = 0;
  if (state.step >= 1 && state.step <= N) pos = visiveis.indexOf(FLOW[state.step - 1]) + 1;
  if (state.step >= LOADING_STEP) pos = total;
  $('top').hidden = state.step === 0;
  $('back').style.visibility = state.step === LOADING_STEP ? 'hidden' : 'visible';
  $('progress').style.width = Math.round(pos / total * 100) + '%';
}

function show(step, { push = true } = {}) {
  state.step = step;
  screensEl.innerHTML = '';
  let screen;
  if (step === 0) screen = renderHero();
  else if (step <= N) screen = renderItem(FLOW[step - 1]);
  else if (step === LOADING_STEP) screen = renderLoading();
  else screen = renderResult();
  screensEl.appendChild(screen);
  updateTop();
  window.scrollTo({ top: 0, behavior: 'instant' });
  try {
    if (push) history.pushState({ s: step }, '');
    else history.replaceState({ s: step }, '');
  } catch (e) {}
  Analytics.track('step_view', { stepId: stepId(step), stepIndex: step });
}
function next() {
  const s = nextVisibleStep(state.step);
  show(s > N && state.step <= N ? LOADING_STEP : s);
}
window.addEventListener('popstate', (e) => {
  let s = e.state && typeof e.state.s === 'number' ? e.state.s : 0;
  if (s === LOADING_STEP) s = prevVisibleStep(LOADING_STEP);
  show(s, { push: false });
});
// voltar = histórico do navegador (o botão do Android faz o mesmo); o resultado volta para a última pergunta
$('back').addEventListener('click', () => { haptic(); history.back(); });

// ------------------------------------------------------------
// Respostas + analytics (fan-out de 1 evento por opção no multi)
// ------------------------------------------------------------
function saveAnswer(id, value) {
  state.answers[id] = value;
  const vals = Array.isArray(value) ? value : [value];
  vals.forEach(v => Analytics.track('answer', { stepId: id, stepIndex: state.step, valueText: String(v) }));
}

// ------------------------------------------------------------
// Tela 1: capa
// ------------------------------------------------------------
function renderHero() {
  const h = CONFIG.hero;
  return el('section', { class: 'screen hero no-cta' },
    pill(h.pill),
    el('h1', { html: fmt(h.title) }),
    el('p', { class: 'sub', html: fmt(temVideo() ? h.subtitle : (h.subtitleSemVideo || h.subtitle)) }),
    ctaInline(el('button', { class: 'btn', id: 'go', type: 'button', onclick: () => {
      haptic(); state.startedAt = state.startedAt || Date.now(); next();
    } }, h.cta)),
    el('p', { class: 'who', html: fmt(h.who) })
  );
}

// ------------------------------------------------------------
// Itens do flow
// ------------------------------------------------------------
function renderItem(it) {
  if (it.type === 'info') return renderInfo(it);
  if (it.type === 'capture') return renderCapture(it);
  const screen = el('section', { class: 'screen', 'data-id': it.id });
  screen.classList.add('q');
  screen.appendChild(el('h2', { html: fmt(txt(it.title)) }));
  if (it.subtitle) screen.appendChild(el('p', { class: 'sub hint' }, txt(it.subtitle)));
  const box = el('div', { class: 'opts' });
  const saved = state.answers[it.id];

  if (it.type === 'single') {
    it.options.forEach(o => {
      const b = el('button', { class: 'opt' + (o.desc ? ' big' : '') + (saved === o.value ? ' on' : ''), type: 'button', 'data-v': o.value,
        onclick: () => {
          haptic();
          box.querySelectorAll('.opt').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          saveAnswer(it.id, o.value);
          setTimeout(next, 260);
        } },
        o.emoji ? el('span', { class: 'em', 'aria-hidden': 'true' }, o.emoji) : null,
        el('span', { class: 'rd', 'aria-hidden': 'true' }),
        el('span', { class: 'tx' }, o.label, o.desc ? el('small', {}, o.desc) : null));
      box.appendChild(b);
    });
    screen.appendChild(box);
    screen.classList.add('no-cta');
    return screen;
  }

  // multi: toca para marcar; "Continuar" só com algo marcado
  const sel = new Set(Array.isArray(saved) ? saved : []);
  const go = el('button', { class: 'btn', type: 'button', id: 'go', disabled: sel.size ? null : 'disabled', onclick: () => {
    if (!sel.size) { shake(go); return; }
    saveAnswer(it.id, it.options.filter(o => sel.has(o.value)).map(o => o.value));   // ordem da tela
    next();
  } }, 'Continuar');
  const sync = () => {
    box.querySelectorAll('.opt').forEach(b => b.classList.toggle('on', sel.has(b.dataset.v)));
    if (sel.size) go.removeAttribute('disabled'); else go.setAttribute('disabled', 'disabled');
  };
  it.options.forEach(o => {
    const b = el('button', { class: 'opt', type: 'button', 'data-v': o.value, onclick: () => {
      haptic();
      if (sel.has(o.value)) sel.delete(o.value);
      else {
        if (o.exclusiva) sel.clear();
        else it.options.filter(x => x.exclusiva).forEach(x => sel.delete(x.value));
        sel.add(o.value);
      }
      sync();
    } },
      o.emoji ? el('span', { class: 'em', 'aria-hidden': 'true' }, o.emoji) : null,
      el('span', { class: 'ck', 'aria-hidden': 'true' }, ''),
      el('span', { class: 'tx' }, o.label));
    box.appendChild(b);
  });
  sync();
  screen.appendChild(box);
  screen.appendChild(ctaBar(go));
  return screen;
}

function renderInfo(it) {
  const screen = el('section', { class: 'screen info no-cta', 'data-id': it.id });

  if (it.view === 'autoridade') {
    screen.append(
      pill(it.pill),
      el('h2', { html: fmt(txt(it.title)) }),
      el('div', { class: 'card doc' },
        el('div', { class: 'avatar', 'aria-hidden': 'true' }, it.medico.iniciais),
        el('div', {}, el('b', {}, it.medico.nome), el('span', {}, it.medico.linha))),
      el('div', { class: 'bignum' },
        el('b', {}, it.estudo.numero),
        el('p', {}, it.estudo.texto),
        el('span', { class: 'src' }, it.estudo.fonte))
    );
  } else if (it.view === 'demo') {
    screen.append(
      ...[it.emoji ? el('div', { class: 'big-emoji', 'aria-hidden': 'true' }, it.emoji) : null,
      el('h2', { html: fmt(txt(it.title)) }),
      el('p', { class: 'sub', html: fmt(txt(it.texto)) }),
      demoPernas(it.demo)].filter(Boolean)   // append(null) escreveria "null" na tela
    );
  } else if (it.view === 'ciencia') {
    screen.append(
      pill(it.pill, ' muted'),
      el('figure', { class: 'quote' },
        el('span', { class: 'qmark', 'aria-hidden': 'true' }, '\u201C'),
        el('blockquote', { html: fmt(txt(it.citacao)) }),
        el('figcaption', { class: 'src' }, it.fonte))
    );
  }
  screen.appendChild(ctaInline(el('button', { class: 'btn', type: 'button', id: 'go', onclick: () => { haptic(); next(); } }, it.cta || 'Continuar')));
  return screen;
}

// Demo viva do teste das pernas (o produto real em livowa.com/idade): conta 5 levantadas,
// o cronômetro corre e a barra mede. Repete em loop. Sem número de resultado, sem seta.
function demoPernas(d) {
  const cont = el('b', { class: 'dn' }, '0'), tempo = el('span', { class: 'dt' }, '0,0 s');
  const fill = el('i'), estado = el('span', { class: 'ds' }, d.medindo);
  const box = el('div', { class: 'card demo' },
    el('div', { class: 'chart-head' }, el('b', {}, d.titulo), el('span', { class: 'tag' }, d.tag)),
    el('div', { class: 'drow' },
      el('div', { class: 'dcount' }, cont, el('small', {}, '/5'), el('span', {}, d.contagem, ' · ', tempo)),
      el('div', { class: 'dchair', 'aria-hidden': 'true' }, el('span', {}, ''), el('span', { class: 'dman' }, ''))),
    el('div', { class: 'dbar' }, el('div', { class: 'lhead' }, el('span', {}, d.barra), estado), el('div', { class: 'lbar' }, fill)));
  const ciclo = 5200, t0 = performance.now();
  requestAnimationFrame(function tick(now) {
    if (!box.isConnected && now - t0 > 300) return;
    const t = (now - t0) % ciclo, ativo = Math.min(t, 4200);
    const n = Math.min(5, Math.floor(ativo / 840));
    cont.textContent = String(n);
    tempo.textContent = (ativo / 1000 * 2.1).toFixed(1).replace('.', ',') + ' s';
    fill.style.width = Math.min(100, ativo / 4200 * 100) + '%';
    const pronto = t >= 4200;
    estado.textContent = pronto ? d.pronto : d.medindo;
    box.classList.toggle('ok', pronto);
    box.classList.toggle('up', !pronto && (Math.floor(ativo / 420) % 2 === 1));
    requestAnimationFrame(tick);
  });
  return box;
}

// ------------------------------------------------------------
// Contato antes do resultado (opcional) — validação herdada do motor antigo
// ------------------------------------------------------------
function normalizarTelefone(raw) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) { const ddd = +d.slice(0, 2); if (ddd >= 11 && ddd <= 99 && d[2] === '9') return '55' + d; }
  if (d.length === 10) { const ddd = +d.slice(0, 2); if (ddd >= 11 && ddd <= 99 && /[2-5]/.test(d[2])) return '55' + d; }
  return null;
}
function validateWhatsApp(raw) {
  const c = normalizarTelefone(raw);
  if (!c || /^(.)\1+$/.test(c.slice(2))) return 'Confira o número: DDD + número (ex.: 62 99999-9999).';
  return null;
}
function formatPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function renderCapture(it) {
  const screen = el('section', { class: 'screen', 'data-id': it.id });
  screen.classList.add('q');
  screen.append(el('h2', { html: fmt(it.title) }), el('p', { class: 'sub' }, it.subtitle));
  const inputs = {};
  it.fields.forEach(f => {
    const isPhone = f.mask === 'phone';
    const input = el('input', { type: f.type, name: f.name, placeholder: f.placeholder, inputmode: isPhone ? 'tel' : null,
      autocomplete: isPhone ? 'tel' : 'name', id: 'f-' + f.name });
    if (state.lead[f.name]) input.value = isPhone ? formatPhone(state.lead[f.name]) : state.lead[f.name];
    if (isPhone) { const m = e => { e.target.value = formatPhone(e.target.value); }; input.addEventListener('input', m); input.addEventListener('change', m); }
    input.addEventListener('input', () => input.classList.remove('err'));
    inputs[f.name] = input;
    screen.appendChild(el('div', { class: 'field' }, el('label', { for: 'f-' + f.name }, f.label), input));
  });
  const cb = el('input', { type: 'checkbox', id: 'f-consent' });
  if (state.lead.consent) cb.checked = true;
  const consent = el('label', { class: 'consent', for: 'f-consent' }, cb,
    el('span', { html: it.consent + (CONFIG.links.politica ? ` <a href="${CONFIG.links.politica}" target="_blank" rel="noopener">Política de privacidade</a>.` : '') }));
  screen.appendChild(consent);
  const err = el('p', { class: 'erro', hidden: 'hidden' });
  cb.addEventListener('change', () => { if (cb.checked) { consent.classList.remove('err'); err.hidden = true; } });
  const go = el('button', { class: 'btn', type: 'button', id: 'go', onclick: () => {
    const nome = inputs.nome.value.trim(), w = inputs.whatsapp.value.trim();
    let msg = null;
    if (!nome) { inputs.nome.classList.add('err'); msg = 'Escreva seu nome.'; }
    const we = validateWhatsApp(w);
    if (we) { inputs.whatsapp.classList.add('err'); msg = msg || we; }
    if (!cb.checked) { consent.classList.add('err'); msg = msg || it.consentErro; }
    if (msg) { err.textContent = msg; err.hidden = false; shake(go); return; }
    state.lead = { nome, whatsapp: normalizarTelefone(w), consent: true };
    Analytics.linkLead(state.lead);
    Analytics.track('lead_capture', { stepId: it.id, stepIndex: state.step });
    next();
  } }, it.cta);
  screen.appendChild(ctaBar(err, go));
  return screen;
}

// ------------------------------------------------------------
// Tela 10: loading (repete 3 respostas; não fala em IA)
// ------------------------------------------------------------
function renderLoading() {
  const L = CONFIG.loading;
  const linhas = txt(L.linhas).filter(Boolean);
  const ul = el('ul', {}, linhas.map(t => el('li', {}, el('i', {}, ''), el('span', {}, t.charAt(0).toUpperCase() + t.slice(1)))));
  const bar = el('i'), fin = el('p', { class: 'lfinal' }), pct = el('span', { class: 'pct' }, '0%');
  const screen = el('section', { class: 'screen info no-cta loading', 'data-id': 'loading' },
    null,
    el('h2', {}, L.title),
    L.texto ? el('p', { class: 'sub', html: fmt(txt(temVideo() ? L.texto : (L.textoSemVideo || L.texto))) }) : null,
    el('div', { class: 'load' },
      el('div', { class: 'lhead' }, el('span', {}, L.barra || ''), pct),
      el('div', { class: 'lbar' }, bar),
      fin, ul));
  const lis = [...ul.children], passo = L.durationMs / (lis.length + 2);
  lis.forEach((li, i) => setTimeout(() => { li.classList.add('on'); bar.style.width = ((i + 1) / (lis.length + 1) * 100) + '%'; }, passo * (i + 0.4)));
  setTimeout(() => { fin.textContent = txt(L.final); bar.style.width = '100%'; }, passo * (lis.length + 0.4));
  // % acompanha a barra
  const t0 = performance.now();
  requestAnimationFrame(function tick() {
    if (!pct.isConnected && performance.now() - t0 > 300) return;   // saiu da tela
    const w = bar.getBoundingClientRect().width, tot = bar.parentElement.getBoundingClientRect().width || 1;
    pct.textContent = Math.min(100, Math.round(w / tot * 100)) + '%';
    if (performance.now() - t0 < L.durationMs + 500) requestAnimationFrame(tick);
  });
  const meu = state.step;
  setTimeout(() => {
    if (state.step !== meu) return;                          // a pessoa voltou no meio
    state.codigo = state.codigo || gerarCodigo();
    Analytics.track('complete', { stepId: 'complete', valueText: state.answers.ajuda || null, props: {
      durationMs: Date.now() - (state.startedAt || Date.now()),
      codigo: state.codigo, vsl: escolherVsl().id, respostas: state.answers } });
    persistLocal();
    show(RESULT_STEP, { push: false });                      // o "voltar" do resultado pula o loading
  }, L.durationMs);
  return screen;
}
function persistLocal() {
  try {
    localStorage.setItem('livowa_longevidade_' + Date.now(), JSON.stringify({
      ts: new Date().toISOString(), codigo: state.codigo, answers: state.answers, variant: CONFIG.analytics.variant,
      lead: state.lead.consent ? state.lead : null
    }));
  } catch (e) {}
}

// ------------------------------------------------------------
// Tela 11: resultado
// ------------------------------------------------------------
// Código curto e legível (LV-XXXX). Busca no Supabase: props->>'codigo'.
function gerarCodigo() {
  const C = CONFIG.codigo, A = C.alfabeto;
  let out = '';
  try {
    const r = new Uint32Array(C.tamanho); crypto.getRandomValues(r);
    r.forEach(v => { out += A[v % A.length]; });
  } catch (e) { for (let i = 0; i < C.tamanho; i++) out += A[Math.floor(Math.random() * A.length)]; }
  return C.prefixo + out;
}

// VSL do perfil: a primeira cujo `quando` casa; senão a padrão.
function casa(cond) {
  if (Array.isArray(cond)) return cond.some(casa);
  return Object.entries(cond || {}).every(([id, vals]) => {
    const v = state.answers[id];
    return Array.isArray(v) ? v.some(x => vals.includes(x)) : vals.includes(v);
  });
}
function escolherVsl() {
  const L = CONFIG.vsls || [];
  return L.find(v => !v.padrao && v.quando && casa(v.quando)) || L.find(v => v.padrao) || L[0] || { id: 'nenhuma' };
}
const temVideo = () => (CONFIG.vsls || []).some(v => v.video);

// Player simples: YouTube (não listado) por iframe sem cookie, ou .mp4 próprio. Vazio = nada.
function playerVsl(vsl) {
  const url = (vsl.video || '').trim();
  if (!url) return null;
  const box = el('div', { class: 'vsl', style: `aspect-ratio:${vsl.formato || CONFIG.vslFormato || '9/16'}` });
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{6,})/);
  if (yt) {
    box.appendChild(el('iframe', { src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1&playsinline=1`,
      title: vsl.titulo || 'Vídeo do Dr. Lucca', allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: '', loading: 'lazy' }));
  } else {
    box.appendChild(el('video', { src: url, controls: '', playsinline: '', preload: 'metadata' }));
  }
  return box;
}

function copiar(texto) {
  let ok = false;
  try {
    const ta = document.createElement('textarea');
    ta.value = texto; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, texto.length);
    ok = document.execCommand('copy'); ta.remove();
  } catch (e) {}
  try { if (navigator.clipboard) navigator.clipboard.writeText(texto).catch(() => {}); } catch (e) {}
  return ok;
}
const wa = (msg) => `https://wa.me/${CONFIG.whatsapp.number}?text=${encodeURIComponent(msg)}`;
function clique(valor) {
  Analytics.track('cta_click', { stepId: 'resultado', stepIndex: RESULT_STEP, valueText: valor, props: { ajuda: state.answers.ajuda || null } });
}

function renderResult() {
  const R = CONFIG.resultado, medico = state.answers.ajuda === 'medico';
  const vsl = escolherVsl();
  state.codigo = state.codigo || gerarCodigo();
  const cod = state.codigo;

  let main, alt;
  if (medico) {
    const msg = CONFIG.whatsapp.msgMedico(state, curto, op, cod);
    main = el('a', { class: 'btn', id: 'cta-main', href: wa(msg), target: '_blank', rel: 'noopener', 'data-cta': 'whatsapp_medico', onclick: () => clique('whatsapp_medico') }, R.medico.cta);
    alt = el('a', { class: 'btn ghost', id: 'cta-alt', href: CONFIG.links.direct, 'data-cta': 'direct',   // sem _blank: o toque abre o app do Instagram (universal link)
      onclick: () => { copiar(msg); clique('direct'); toast(R.medico.copiado); } }, R.medico.alt);
  } else {
    const msg = CONFIG.whatsapp.msgPlano(state, curto, op, cod);
    main = el('a', { class: 'btn', id: 'cta-main', href: wa(msg), target: '_blank', rel: 'noopener', 'data-cta': 'whatsapp_plano', onclick: () => clique('whatsapp_plano') }, R.sozinho.cta);
    alt = el('a', { class: 'btn ghost', id: 'cta-alt', href: CONFIG.links.instagram, target: '_blank', rel: 'noopener', 'data-cta': 'seguir_instagram', onclick: () => clique('seguir_instagram') }, R.sozinho.alt);
  }
  // link marcado (?lv=, 31/10/2026): quem veio do Direct não precisa de código; Direct em destaque, WhatsApp pequeno
  const lv = Analytics.getLv();
  if (lv) {
    const msgWa = medico ? CONFIG.whatsapp.msgMedico(state, curto, op, cod) : CONFIG.whatsapp.msgPlano(state, curto, op, cod);
    main = el('a', { class: 'btn', id: 'cta-main', href: CONFIG.links.direct, 'data-cta': 'direct-lv', onclick: () => clique('direct-lv') }, 'Voltar ao Instagram');
    alt = el('a', { class: 'btn ghost', id: 'cta-alt', href: wa(msgWa), target: '_blank', rel: 'noopener', 'data-cta': 'whatsapp', onclick: () => clique('whatsapp') }, 'Prefere WhatsApp?');
  }
  const video = playerVsl(vsl);
  return el('section', { class: 'screen info no-cta result' + (video ? ' com-video' : ''), 'data-id': 'resultado', 'data-vsl': vsl.id },
    pill(R.pill),
    el('h2', { html: fmt(vsl.titulo || '') }),
    vsl.frase ? el('p', { class: 'sub', html: fmt(vsl.frase) }) : null,
    video,
    lv ? ctaInline(
      el('p', { class: 'linha' }, 'Pronto! O Dr. Lucca já recebeu o seu teste e te responde aqui no Direct.'),
      main, alt) : ctaInline(
      el('div', { class: 'codigo' }, el('span', {}, R.codigoRotulo), el('b', { id: 'codigo' }, cod)),
      el('p', { class: 'linha' }, R.codigoLinha),
      main, alt),
    el('a', { class: 'link-teste', id: 'cta-teste', href: CONFIG.links.teste, onclick: () => clique('teste_idade') }, R.teste)
  );
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
function init() {
  Analytics.init(CONFIG.analytics);
  Analytics.track('view', { stepId: 'capa', stepIndex: 0 });
  show(0, { push: false });
}
init();
