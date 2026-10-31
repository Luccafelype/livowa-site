// ============================================================
// LIVOWA — Funnel Analytics (client, reutilizável por qualquer funil)
// ============================================================
// Observador puro: NUNCA altera o comportamento do funil. Toda chamada
// é best-effort (try/catch + keepalive + .catch) — se o Supabase cair,
// o quiz funciona igual. Em localhost NÃO envia (loga no console), pra
// não poluir os dados de produção.
//
// Uso:
//   import * as Analytics from './funnel-analytics.js?v=rN';
//   Analytics.init(CONFIG.analytics);          // 1x no boot
//   Analytics.track('step_view', { stepId:'q1', stepIndex:1 });
//   await Analytics.linkLead({ whatsapp, nome, email, consent });
// ============================================================

let cfg = { enabled: false, funnelId: 'unknown', variant: 'A', supabaseUrl: '', supabaseKey: '' };
let sid = null;
let leadKey = null;     // carimbado após linkLead
let contextSent = false;

function isLocal() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '' || location.protocol === 'file:';
}

function uuid() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getOrCreateSid() {
  // Prioridade: ?sid= na URL (resultado.html reusa a sessão do quiz) > sessionStorage > novo.
  try {
    const urlSid = new URLSearchParams(location.search).get('sid');
    if (urlSid) { try { sessionStorage.setItem('livowa_sid', urlSid); } catch (e) {} return urlSid; }
    const saved = sessionStorage.getItem('livowa_sid');
    if (saved) return saved;
    const fresh = uuid();
    sessionStorage.setItem('livowa_sid', fresh);
    return fresh;
  } catch (e) {
    // storage bloqueado (ex.: Safari privado): mantém um sid em memória pela vida da página
    return sid || uuid();
  }
}

export function init(config = {}) {
  cfg = { ...cfg, ...config };
  sid = getOrCreateSid();
  return sid;
}

export function getSessionId() {
  if (!sid) sid = getOrCreateSid();
  return sid;
}

export function getLeadKey() { return leadKey; }

// Link marcado por pessoa (31/10/2026): o link mandado no Direct pelo OpenReply traz ?lv=<marca de 22 caracteres>
// (hash da pessoa, nunca o @). Guarda na aba para sobreviver a recarga e vai no 'complete' e no 'cta_click',
// para a caixa de leads mostrar o @ sem a pessoa precisar mandar código.
export function getLv() {
  const ok = v => typeof v === 'string' && /^[A-Za-z0-9_-]{22}$/.test(v);
  try {
    const q = new URLSearchParams(location.search).get('lv');
    if (ok(q)) { try { sessionStorage.setItem('livowa_lv', q); } catch (e) {} return q; }
    const s = sessionStorage.getItem('livowa_lv'); return ok(s) ? s : null;
  } catch (e) { return null; }
}

function collectContext() {
  const p = new URLSearchParams(location.search);
  const ctx = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(k => {
    const v = p.get(k); if (v) ctx[k] = v;
  });
  if (document.referrer) ctx.referrer = document.referrer;
  if (navigator.userAgent) ctx.user_agent = navigator.userAgent;
  return ctx;
}

// Registra um evento do funil. eventType ∈ view|step_view|answer|lead_capture|complete|cta_click
export function track(eventType, opts = {}) {
  try {
    if (!cfg.enabled) return;
    const props = { ...(opts.props || {}) };
    if (!contextSent) { Object.assign(props, collectContext()); contextSent = true; }
    if ((eventType === 'complete' || eventType === 'cta_click') && !props.lv) { const lv = getLv(); if (lv) props.lv = lv; }
    send('log_funnel_event', {
      p_event_id: uuid(),
      p_funnel_id: cfg.funnelId,
      p_variant: cfg.variant,
      p_session_id: getSessionId(),
      p_event_type: eventType,
      p_step_id: opts.stepId ?? null,
      p_step_index: (opts.stepIndex === undefined ? null : opts.stepIndex),
      p_value_text: opts.valueText ?? null,
      p_props: props,
      p_client_ts: new Date().toISOString()
    });
  } catch (e) { /* nunca quebra o funil */ }
}

// Vincula o lead à sessão. Computa o hash local (pra propagar já) e manda pro servidor
// (que recomputa de forma autoritativa). Retorna o lead_key (sha256 hex) ou null.
export async function linkLead(lead = {}) {
  try {
    if (!cfg.enabled) return null;
    const whats = (lead.whatsapp || '').trim();
    if (!whats || !lead.consent) return null;
    leadKey = await sha256Hex(whats);   // imediato, sem depender da rede
    send('link_lead', {
      p_session_id: getSessionId(),
      p_funnel_id: cfg.funnelId,
      p_variant: cfg.variant,
      p_whatsapp: whats,
      p_nome: lead.nome || null,
      p_email: lead.email || null,
      p_consent: !!lead.consent
    });
    return leadKey;
  } catch (e) { return leadKey; }
}

async function sha256Hex(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

function send(rpc, body) {
  // No-op em localhost/dev ou sem URL válida: loga e não envia (não polui produção).
  if (isLocal() || !cfg.supabaseUrl || cfg.supabaseUrl.indexOf('http') !== 0) {
    try { console.log(`[analytics:${rpc}]`, body); } catch (e) {}
    return;
  }
  try {
    fetch(cfg.supabaseUrl + '/rest/v1/rpc/' + rpc, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.supabaseKey,
        'Authorization': 'Bearer ' + cfg.supabaseKey
      },
      body: JSON.stringify(body)
    }).catch(() => {});
  } catch (e) { /* best-effort */ }
}
