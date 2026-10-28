// ============================================================
// LIVOWA — Motor do quiz de longevidade
// Herdado do livowa-quiz (r11): flow declarativo com condition, saveAnswer com
// fan-out de analytics, captura com normalização de telefone, loading, persistência
// local. Visual reescrito no padrão do livowa.com/idade.
// Conteúdo: config.js. Este arquivo não precisa mudar para trocar textos.
// ============================================================

import { CONFIG } from './config.js?v=lg1';
import * as Analytics from './funnel-analytics.js?v=lg1';

const FLOW = CONFIG.flow;
const N = FLOW.length;
const LOADING_STEP = N + 1;
const RESULT_STEP = N + 2;

const state = {
  step: 0,            // 0 = capa · 1..N = flow · N+1 = loading · N+2 = resultado
  answers: {},        // { id: value | [values] }
  startedAt: null,
  lead: { nome: '', whatsapp: '', consent: false }
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
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}

// ------------------------------------------------------------
// Respostas → texto (perfil, loading, mensagens)
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
  const cards = h.cards.map(c => el('div', { class: 'mini' }, el('b', {}, c.big), el('span', {}, c.small)));
  if (CONFIG.pedirContatoAntes) cards[1].querySelector('span').textContent = 'e o resumo sai na hora';
  return el('section', { class: 'screen' },
    el('div', { class: 'who', style: 'margin-top:28px' }, el('span', { class: 'dot' }), el('span', { html: h.who })),
    el('h1', {}, h.title),
    el('p', { class: 'sub' }, h.subtitle),
    el('div', { class: 'hero-card' }, cards),
    el('ol', { class: 'steps' },
      el('li', {}, el('em', {}, '1'), el('span', {}, 'Você responde, tocando na opção.')),
      el('li', {}, el('em', {}, '2'), el('span', {}, 'Suas respostas são cruzadas com estudos publicados.')),
      el('li', {}, el('em', {}, '3'), el('span', {}, 'Você vê o resumo e escolhe o próximo passo.'))
    ),
    ctaBar(el('button', { class: 'btn', id: 'go', type: 'button', onclick: () => {
      haptic(); state.startedAt = state.startedAt || Date.now(); next();
    } }, h.cta))
  );
}

// ------------------------------------------------------------
// Itens do flow
// ------------------------------------------------------------
function renderItem(it) {
  if (it.type === 'info') return renderInfo(it);
  if (it.type === 'capture') return renderCapture(it);
  const screen = el('section', { class: 'screen', 'data-id': it.id });
  if (it.eyebrow) screen.appendChild(el('div', { class: 'eyebrow' }, txt(it.eyebrow)));
  screen.appendChild(el('h2', {}, txt(it.title)));
  if (it.subtitle) screen.appendChild(el('p', { class: 'sub' }, txt(it.subtitle)));
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
      el('span', { class: 'tx' }, o.label),
      el('span', { class: 'ck', 'aria-hidden': 'true' }, '✓'));
    box.appendChild(b);
  });
  sync();
  screen.appendChild(box);
  screen.appendChild(ctaBar(go));
  return screen;
}

function renderInfo(it) {
  const screen = el('section', { class: 'screen', 'data-id': it.id });
  if (it.eyebrow) screen.appendChild(el('div', { class: 'eyebrow' }, txt(it.eyebrow)));

  if (it.view === 'autoridade') {
    screen.append(
      el('h2', {}, txt(it.title)),
      el('div', { class: 'card' },
        el('div', { class: 'doc' }, el('div', { class: 'avatar', 'aria-hidden': 'true' }, it.medico.iniciais),
          el('div', {}, el('b', {}, it.medico.nome), el('span', {}, it.medico.linha))),
        el('p', {}, it.texto)),
      el('div', { class: 'stat' }, el('b', {}, it.estudo.numero), el('p', {}, it.estudo.texto), el('span', { class: 'src' }, it.estudo.fonte))
    );
  } else if (it.view === 'grafico') {
    screen.append(
      el('h2', {}, txt(it.title)),
      el('p', { class: 'sub' }, txt(it.texto)),
      el('div', { class: 'card' },
        grafico(),
        el('div', { class: 'legend' },
          el('span', {}, el('i', { style: 'background:var(--accent)' }), 'homens'),
          el('span', {}, el('i', { style: 'background:var(--f-line)' }), 'mulheres'),
          op('idade') ? el('span', {}, el('i', { style: 'background:var(--accent);opacity:.25;height:10px' }), 'sua idade') : null),
        el('p', {}, it.legenda),
        el('span', { class: 'src' }, it.fonte))
    );
  } else if (it.view === 'ciencia') {
    screen.append(
      el('p', { class: 'big-quote' }, txt(it.title)),
      el('p', { class: 'sub' }, txt(it.texto)),
      it.nota ? el('p', { class: 'note' }, it.nota) : null,
      el('span', { class: 'src' }, it.fonte)
    );
  }
  screen.appendChild(ctaBar(el('button', { class: 'btn', type: 'button', id: 'go', onclick: () => { haptic(); next(); } }, it.cta || 'Continuar')));
  return screen;
}

// Mini gráfico: potência mediana das pernas por idade (homens e mulheres), com a faixa da pessoa marcada
function grafico() {
  const W = 320, H = 190, L = 24, R = 10, T = 14, B = 22, X0 = 18, X1 = 90, Y1 = 7;
  const x = a => L + (a - X0) / (X1 - X0) * (W - L - R);
  const y = v => T + (1 - v / Y1) * (H - T - B);
  const path = rows => rows.map((r, i) => (i ? 'L' : 'M') + x(r[0]).toFixed(1) + ' ' + y(r[1]).toFixed(1)).join(' ');
  let g = '';
  for (const v of [0, 2, 4, 6]) g += `<line class="ax" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  for (const a of [20, 40, 60, 80]) g += `<text x="${x(a)}" y="${H - 6}" text-anchor="middle">${a}</text>`;
  g += `<text x="${W - R}" y="${H - 6}" text-anchor="end" dy="-12">idade</text>`;
  const f = op('idade')?.faixa;
  if (f) {
    g += `<rect class="band" x="${x(f[0])}" y="${T - 6}" width="${x(f[1] + 1) - x(f[0])}" height="${y(0) - T + 6}" rx="4"/>`;
    g += `<text class="bandl" x="${(x(f[0]) + x(f[1] + 1)) / 2}" y="${T + 4}" text-anchor="middle">você</text>`;
  }
  const { homens, mulheres } = CONFIG.norma;
  g += `<path class="lm" d="${path(homens)}"/><path class="lf" d="${path(mulheres)}"/>`;
  homens.forEach(r => { g += `<circle class="pm" cx="${x(r[0])}" cy="${y(r[1])}" r="2.6"/>`; });
  mulheres.forEach(r => { g += `<circle class="pf" cx="${x(r[0])}" cy="${y(r[1])}" r="2.6"/>`; });
  const box = document.createElement('div');   // innerHTML cria o <svg> no namespace certo
  box.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Potência mediana das pernas por idade: cai devagar até os 50 e mais rápido depois, em homens e mulheres">${g}</svg>`;
  return box.firstElementChild;
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
  screen.append(el('h2', {}, it.title), el('p', { class: 'sub' }, it.subtitle));
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
  const ul = el('ul', {}, linhas.map(t => el('li', {}, el('i', {}, '✓'), el('span', {}, t.charAt(0).toUpperCase() + t.slice(1)))));
  const bar = el('i'), fin = el('p', { class: 'lfinal' });
  const screen = el('section', { class: 'screen no-cta', 'data-id': 'loading' },
    el('h2', {}, L.title),
    el('div', { class: 'load' }, ul, el('div', { class: 'lbar' }, bar), fin));
  const lis = [...ul.children], passo = L.durationMs / (lis.length + 2);
  lis.forEach((li, i) => setTimeout(() => { li.classList.add('on'); bar.style.width = ((i + 1) / (lis.length + 1) * 100) + '%'; }, passo * (i + 0.4)));
  setTimeout(() => { fin.textContent = L.final; bar.style.width = '100%'; }, passo * (lis.length + 0.4));
  const meu = state.step;
  setTimeout(() => {
    if (state.step !== meu) return;                          // a pessoa voltou no meio
    Analytics.track('complete', { stepId: 'complete', valueText: state.answers.ajuda || null, props: { durationMs: Date.now() - (state.startedAt || Date.now()) } });
    persistLocal();
    show(RESULT_STEP, { push: false });                      // o "voltar" do resultado pula o loading
  }, L.durationMs);
  return screen;
}
function persistLocal() {
  try {
    localStorage.setItem('livowa_longevidade_' + Date.now(), JSON.stringify({
      ts: new Date().toISOString(), answers: state.answers, variant: CONFIG.analytics.variant,
      lead: state.lead.consent ? state.lead : null
    }));
  } catch (e) {}
}

// ------------------------------------------------------------
// Tela 11: resultado
// ------------------------------------------------------------
function estudosDoPerfil() {
  const E = CONFIG.estudos, a = state.answers, out = [];
  if (E.idade[a.idade]) out.push(E.idade[a.idade]);
  const atr = a.atrapalha || [];
  if (atr.includes('tempo') || a.rotina === 'empresario') out.push(E.tempo);
  if (atr.includes('comecar') || atr.includes('constancia') || a.ajuda === 'medico') out.push(E.supervisao);
  if (out.length < 2) out.push(E.tempo);
  return out.slice(0, 3);
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
  const linhas = txt(R.linhas).filter(l => l[1]);
  const screen = el('section', { class: 'screen', 'data-id': 'resultado' },
    el('div', { class: 'perfil' },
      el('div', { class: 'eyebrow' }, R.eyebrow),
      el('h2', {}, txt(R.titulo)),
      el('dl', {}, linhas.map(([k, v]) => [el('dt', {}, k), el('dd', {}, v.charAt(0).toUpperCase() + v.slice(1) + '.')]))),
    el('div', { class: 'card' },
      el('h3', {}, R.estudosTitulo),
      el('ul', { class: 'facts' }, estudosDoPerfil().map(f => el('li', {}, f.txt, el('small', {}, f.fonte))))),
    el('div', { class: 'card' },
      el('h3', {}, R.teste.titulo),
      el('p', {}, R.teste.texto),
      el('a', { class: 'btn outline', id: 'cta-teste', href: CONFIG.links.teste, onclick: () => clique('teste_idade') }, R.teste.cta)),
    el('p', { class: 'aviso' }, R.aviso)
  );

  let bar;
  if (medico) {
    const msg = CONFIG.whatsapp.msgMedico(state, curto, op);
    bar = ctaBar(
      el('a', { class: 'btn', id: 'cta-main', href: wa(msg), target: '_blank', rel: 'noopener', 'data-cta': 'whatsapp_medico', onclick: () => clique('whatsapp_medico') }, R.medico.cta),
      el('p', { class: 'linha' }, R.medico.linha),
      el('a', { class: 'btn ghost', id: 'cta-alt', href: CONFIG.links.direct, target: '_blank', rel: 'noopener', 'data-cta': 'direct',
        onclick: () => { copiar(msg); clique('direct'); toast(R.medico.copiado); } }, R.medico.alt));
  } else {
    const msg = CONFIG.whatsapp.msgPlano(state, curto, op);
    bar = ctaBar(
      el('a', { class: 'btn', id: 'cta-main', href: wa(msg), target: '_blank', rel: 'noopener', 'data-cta': 'whatsapp_plano', onclick: () => clique('whatsapp_plano') }, R.sozinho.cta),
      el('p', { class: 'linha' }, R.sozinho.linha),
      el('a', { class: 'btn ghost', id: 'cta-alt', href: CONFIG.links.instagram, target: '_blank', rel: 'noopener', 'data-cta': 'seguir_instagram', onclick: () => clique('seguir_instagram') }, R.sozinho.alt));
  }
  screen.appendChild(bar);
  screen.style.paddingBottom = '190px';
  return screen;
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
