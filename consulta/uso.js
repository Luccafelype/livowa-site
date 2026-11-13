/* CRM (livowa.com/consulta) · registro de uso do próprio Lucca, 13/11/2026.
   Pedido dele: "ver como eu uso, quanto tempo fico em cada tela, se me ajuda, se me atrapalha, o que tenho dificuldade, o que
   poderia ser tirado ou juntado". Escolha do chefe: registro dentro da página (sem extensão e sem gravador de sessão de
   terceiros, que levaria nome, foto e respostas do lead para fora).
   Vai para analytics.funnel_events pela RPC log_funnel_event (o mesmo caminho do diagnóstico do /gravar), funnel_id 'crm-uso':
     - step_view: troca de tela (leads, codigo, portas, funil, lead, passo-N, gravador, revisao, conversa, revisao-ipad) com
       props {ms = tempo na anterior, de = a anterior}; sessao-inicio {aparelho, largura, altura} e sessao-fim {ms e de da
       última tela, sessao_ms};
     - answer: toque em botão (step_id = id do botão, montado da classe e de dados que são opções fixas: nunca o texto do botão
       nem o código do lead), etapa marcada (etapa:X), copiou, e os sinais de dificuldade: volta-rapida (saiu do lead em
       menos de 3 s), reabriu-lead (abriu o mesmo lead de novo), refazer, abrir-ate-gravar {ms}, gravacao-abandonada,
       erro {onde}.
   props também levam tela, tipo_lead (pele-idade, braco… no máximo) e treino:true|false. NUNCA vai código LV, nome, resposta,
   foto, texto copiado ou nota: tudo passa por limpa() (só chaves conhecidas e valores curtos de opção; nada com "LV-").
   Envio em lote: fila na memória, a cada 20 s e quando a página some (visibilitychange/pagehide), com fetch keepalive (o
   "sendBeacon" que aceita o apikey do Supabase; sendBeacon não manda cabeçalho). Não envia em localhost (só com
   window.__USO_FORCAR e __USO_URL, para o teste: um pedido keepalive no fechar da página escapa do interceptador do teste
   e chegou ao banco em 13/11, 2 linhas sessao-fim sem dado de lead). Nunca atrapalha a página: tudo em try/catch. */
window.USO = (() => {
'use strict';
const SB_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SB_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública dos funis
const FUNIL = 'crm-uso', LOTE_MS = 20000, MAX_FILA = 300;
const uuid = () => { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* ok */ } return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); };
const SID = (() => { try { let s = sessionStorage.getItem('livowa_crm_sid'); if (!s){ s = uuid(); sessionStorage.setItem('livowa_crm_sid', s); } return s; } catch (e) { return uuid(); } })();
let fila = [], tela = '', telaT = Date.now(), antesOverlay = '', lead = null, leadT = 0, sessaoT = Date.now(), visivel = true;
const abertos = new Map();   // lead → vezes aberto (só na memória desta aba; o código nunca sai daqui)

// ---------- limpeza: só chaves conhecidas, valores curtos de opção ----------
const CHAVES = new Set(['ms', 'sessao_ms', 'de', 'tela', 'tipo_lead', 'treino', 'aparelho', 'largura', 'altura', 'vezes', 'onde', 'estado', 'volta', 'n', 'anel', 'pinca', 'blocos', 'ms_blocos', 'bloco_fim', 'salto_fecho']);
const ok = v => typeof v === 'number' ? isFinite(v) : typeof v === 'boolean' ? true : typeof v === 'string' && v.length <= 40 && /^[A-Za-z0-9 _.:-]*$/.test(v) && !/LV-/i.test(v);
function limpa(p){
  const o = {};
  for (const [k, v] of Object.entries(p || {})){
    if (!CHAVES.has(k) || v == null) continue;
    if (Array.isArray(v)){ if (v.length <= 20 && v.every(x => typeof x === 'number' && isFinite(x))) o[k] = v.map(Math.round); continue; }   // 13/11: ms_blocos (só números)
    if (ok(v)) o[k] = typeof v === 'number' ? Math.round(v) : v;
  }
  return o;
}
const passo = s => typeof s === 'string' && /^[a-z0-9:_.-]{1,60}$/.test(s) && !/lv-/.test(s);

// ---------- fila e envio ----------
// teste: com __USO_FORCAR, manda para __USO_URL (no próprio servidor do teste), para nada escapar ao banco de verdade
const destino = () => (window.__USO_FORCAR && window.__USO_URL) || SB_URL + '/rest/v1/rpc/log_funnel_event';
const local = () => { const h = location.hostname; return (h === 'localhost' || h === '127.0.0.1' || location.protocol === 'file:') && !window.__USO_FORCAR; };
function poe(tipo, step, props){
  try {
    if (!passo(step)) return;
    const base = { tela:tela || null, ...(lead ? { tipo_lead:lead.tipo, treino:lead.treino } : {}) };
    fila.push({ p_event_id:uuid(), p_funnel_id:FUNIL, p_variant:'A', p_session_id:SID, p_event_type:tipo, p_step_id:step, p_step_index:null,
      p_value_text:null, p_props:limpa({ ...base, ...props }), p_client_ts:new Date().toISOString() });
    if (fila.length > MAX_FILA) fila.splice(0, fila.length - MAX_FILA);
  } catch (e) { /* nunca atrapalha */ }
}
function manda(){
  try {
    if (!fila.length || local()) return;
    const lote = fila; fila = [];
    for (const ev of lote){
      fetch(destino(), { method:'POST', keepalive:true, headers:{ 'Content-Type':'application/json', apikey:SB_KEY, Authorization:'Bearer ' + SB_KEY },
        body:JSON.stringify(ev) }).catch(() => {});
    }
  } catch (e) { /* ok */ }
}
setInterval(manda, LOTE_MS);

// ---------- telas ----------
const OVERLAY = new Set(['gravador', 'revisao', 'conversa', 'revisao-ipad', 'folha']);   // folha (13/11): a data ou o desfecho
function irPara(nova, extra){
  try {
    if (!nova || nova === tela) return;
    const agora = Date.now(), ms = agora - telaT, de = tela;
    if (OVERLAY.has(nova) && !OVERLAY.has(de)) antesOverlay = de;
    if (de === 'lead' && nova === 'leads' && ms < 3000) poe('answer', 'volta-rapida', { ms });
    if (de === 'lead' && !['lead', 'gravador', 'revisao', 'conversa', 'revisao-ipad', 'folha'].includes(nova) && !/^passo-/.test(nova)) lead = null;
    tela = nova; telaT = agora;
    poe('step_view', nova, { ms:de ? ms : 0, de:de || null, ...(extra || {}) });
  } catch (e) { /* ok */ }
}
// o lead aberto: tipo e treino (nada do lead em si); conta reaberturas só na memória
function abriuLead(chave, tipo, treino){
  try {
    lead = { tipo:String(tipo || '').slice(0, 30), treino:!!treino }; leadT = Date.now();
    const n = (abertos.get(chave) || 0) + 1; abertos.set(chave, n);
    irPara('lead');
    if (n >= 2) poe('answer', 'reabriu-lead', { vezes:n });
  } catch (e) { /* ok */ }
}
const volta = () => irPara(antesOverlay || 'lead');

// ---------- toques: o id do botão sai da classe e de dados que são opções fixas ----------
const DADOS = ['acao', 'f', 's', 'r3', 'et', 'a', 'copia', 'de', 'perfil', 'p'];
const CLASSE_IGNORA = /^(sec|feito|on|conf|agora|ga-b|g\d?)$/;
function idDoBotao(el){
  if (el.id && passo(el.id.toLowerCase())) return el.id.toLowerCase();
  const cls = [...el.classList].find(c => !CLASSE_IGNORA.test(c)) || el.tagName.toLowerCase();
  const d = DADOS.filter(k => el.dataset[k] != null && /^[a-z0-9_]{0,20}$/i.test(el.dataset[k])).map(k => el.dataset[k] || 'vazio');
  const pai = el.closest('#filtro') ? 'filtro' : el.closest('.st') ? 'etapa' : el.closest('.pi-r3') ? 'r3' : '';
  return [pai, cls, ...d].filter(Boolean).join(':').toLowerCase().replace(/[^a-z0-9:_.-]/g, '').slice(0, 60);
}
document.addEventListener('click', ev => {
  try {
    const s = ev.target.closest('summary');
    if (s){ const d = s.parentElement; const k = d.classList.contains('passo') ? 'passo-' + (d.dataset.p || '') : [...d.classList].find(c => /^sec-/.test(c)) || 'detalhe';
      poe('answer', 'abre:' + k.replace(/[^a-z0-9_-]/gi, '').toLowerCase(), {});
      if (d.classList.contains('passo') && !d.open) setTimeout(() => { if (d.open) irPara('passo-' + d.dataset.p); }, 0);
      return; }
    const b = ev.target.closest('button, a.ga-b, [role="tab"]'); if (!b) return;
    poe('answer', 'toque:' + idDoBotao(b), {});
  } catch (e) { /* ok */ }
}, true);

// ---------- sessão ----------
function aparelho(){
  const m = Math.min(screen.width, screen.height), toque = navigator.maxTouchPoints > 1;
  return m < 600 ? 'iPhone' : toque ? 'iPad' : 'Mac';
}
poe('step_view', 'sessao-inicio', { aparelho:aparelho(), largura:screen.width, altura:screen.height });
function some(){
  if (!visivel) return; visivel = false;
  poe('step_view', 'sessao-fim', { ms:Date.now() - telaT, de:tela || null, sessao_ms:Date.now() - sessaoT });   // ms/de = a última tela (igual às outras trocas)
  manda();
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') some();
  else if (!visivel){ visivel = true; sessaoT = Date.now(); telaT = Date.now(); poe('step_view', 'sessao-inicio', { aparelho:aparelho(), largura:screen.width, altura:screen.height, volta:true }); }
});
addEventListener('pagehide', () => { some(); manda(); });

return {
  tela:irPara, volta, abriuLead,
  acao:(id, p) => poe('answer', id, p),
  sinal:(id, p) => poe('answer', id, p),
  desdeLead:() => leadT ? Date.now() - leadT : null,
  flush:manda, _fila:() => fila.slice(), _tela:() => tela,
};
})();
