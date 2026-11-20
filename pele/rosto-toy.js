// livowa.com/pele · "Enquanto analisa" (20/11/2026, pedido do Lucca): na tela de carregamento, um rosto de exemplo do mesmo sexo,
// realista, com a idade estimada em cima; ela escolhe o sinal (Manchas · Linhas · Firmeza) e arrasta, e o número sobe ou desce
// pela MESMA conta da análise (assets/rosto-idade/rosto-idade.js, porte do calcularIdade da edge). Uma etapa por vez: um sinal
// à vista, um controle grande. Sem texto longo; "Rosto de exemplo, criado por IA. Simulação." fixo embaixo (zero promessa).
// Regra da espera (pedido dele): se o resultado fica pronto enquanto ela mexe (tocou nos últimos 5 s), a tela NÃO troca
// sozinha: aparece "Ver o meu resultado". Sem toque recente, segue como antes.
// Medição: track('answer', { stepId:'rosto_toy', valueText }) no padrão das outras respostas: viu · mexeu (1ª vez) · sinal
// (cada troca de sinal) · esperou (resultado pronto com ela mexendo) · ver_resultado (tocou no botão) · resumo (ao sair).
// Tudo nesta tela: o cartão é criado aqui dentro da seção 'carregando' (o index.html e o pele.css não mudam).
const SRC = new URL('../assets/rosto-idade/rosto-idade.js?v=20261120a', import.meta.url).href;
const MEXENDO_MS = 5000;
let modulo = null, el = null, rosto = null, cont = null, sinal = null, laco = 0, ultToque = 0, toques = 0, mexidos = new Set(), trk = () => {}, esperando = null, abriu = false, vez = 0;

function carregaModulo(){
  if (window.RostoIdade) return Promise.resolve(window.RostoIdade);
  if (!modulo) modulo = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = SRC; s.async = true; s.onload = () => window.RostoIdade ? ok(window.RostoIdade) : ko(new Error('sem módulo')); s.onerror = () => { modulo = null; ko(new Error('módulo')); }; document.head.append(s); });
  return modulo;
}
const CSS = `
.screen.c.com-rosto{justify-content:flex-start;gap:10px;padding-top:4px}
.com-rosto .prog{width:96px}
.com-rosto .prog b{font-size:var(--t2)}
.com-rosto #prog-tit{font-size:var(--t2);line-height:1.3;min-height:2.6em;display:flex;align-items:center;justify-content:center}
.com-rosto #prog-etapa{font-size:var(--t3);color:var(--muted);margin-top:-6px}
.com-rosto .dots,.com-rosto>.nota,.com-rosto.pronto #prog-etapa{display:none}
.rt{width:100%;text-align:left;gap:12px;padding:14px;margin-top:2px}
.rt-tit{font-size:var(--t2);font-weight:700;line-height:1.3}
.rt-quadro{position:relative;height:clamp(220px,40svh,300px);border-radius:12px;overflow:hidden;background:var(--accent-2)}
.rt-quadro canvas{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 16%}
.rt-num{position:absolute;left:50%;top:10px;transform:translateX(-50%);display:flex;align-items:baseline;gap:6px;padding:4px 14px 6px;border-radius:999px;background:rgba(15,22,18,.78);color:#fff;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.rt-num b{font-size:var(--t1);font-variant-numeric:tabular-nums;line-height:1.1}
.rt-num span{font-size:var(--t3);font-weight:600}
.rt-num small{font-size:var(--t3);color:rgba(255,255,255,.72);border-left:1px solid rgba(255,255,255,.3);padding-left:7px;margin-left:2px}
.rt-chips{display:flex;gap:6px}
.rt-chip{flex:1;min-height:44px;border:1.5px solid var(--line);background:var(--surface);color:var(--fg);border-radius:12px;font:600 var(--t2)/1.1 var(--font);cursor:pointer;-webkit-tap-highlight-color:transparent;padding:6px 4px}
.rt-chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.rt-faixa{-webkit-appearance:none;appearance:none;width:100%;height:44px;background:transparent;margin:0;touch-action:pan-y;font-size:var(--t3)}
.rt-faixa::-webkit-slider-runnable-track{height:10px;border-radius:99px;background:linear-gradient(90deg,var(--accent-2),#c8a27a)}
.rt-faixa::-moz-range-track{height:10px;border-radius:99px;background:linear-gradient(90deg,var(--accent-2),#c8a27a)}
.rt-faixa::-webkit-slider-thumb{-webkit-appearance:none;width:34px;height:34px;margin-top:-12px;border-radius:50%;background:var(--surface);border:3px solid var(--accent);box-shadow:0 2px 6px rgba(0,0,0,.2)}
.rt-faixa::-moz-range-thumb{width:28px;height:28px;border-radius:50%;background:var(--surface);border:3px solid var(--accent)}
.rt-faixa:focus-visible{outline:2px solid var(--accent);outline-offset:4px;border-radius:8px}
.rt-pontas{display:flex;justify-content:space-between;font-size:var(--t3);color:var(--muted);margin-top:-8px}
.rt-ver{margin-top:2px}
.rt-pe{font-size:var(--t3);color:var(--muted)}
`;
function monta(sec){
  if (el) return el;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  el = document.createElement('div'); el.className = 'cartao rt'; el.id = 'rt'; el.hidden = true;
  el.innerHTML = `<p class="rt-tit">Enquanto analisa: veja o que muda a idade de um rosto</p>
    <div class="rt-quadro"><canvas id="rt-tela" width="447" height="720" aria-label="Rosto de exemplo, com a idade estimada em cima"></canvas>
      <div class="rt-num" aria-live="polite"><b id="rt-idade">--</b><span>anos</span><small>simulação</small></div></div>
    <div class="rt-chips" id="rt-chips" role="group" aria-label="O que mudar no rosto"></div>
    <input class="rt-faixa" id="rt-faixa" type="range" min="0" max="3" step="1" value="0" aria-label="Quanto">
    <div class="rt-pontas" aria-hidden="true"><span>Menos</span><span>Mais</span></div>
    <button class="btn rt-ver" id="rt-ver" type="button" hidden>Ver o meu resultado</button>
    <p class="rt-pe">Rosto de exemplo, criado por IA. Simulação.</p>`;
  sec.append(el);
  const fx = el.querySelector('#rt-faixa');
  const toque = () => { ultToque = performance.now(); };
  ['pointerdown', 'touchstart', 'keydown'].forEach(n => el.addEventListener(n, toque, { passive:true }));
  fx.addEventListener('input', () => { toque(); if (!rosto || !sinal) return; rosto.por(sinal, +fx.value); mexeu(); });
  el.querySelector('#rt-chips').addEventListener('click', ev => { const b = ev.target.closest('button[data-k]'); if (!b) return; toque(); escolhe(b.dataset.k, true); });
  el.querySelector('#rt-ver').addEventListener('click', () => { trk('ver_resultado', { espera_ms:esperando ? Math.round(performance.now() - esperando.t0) : null }); const e = esperando; esperando = null; if (e) e.ok(); });
  return el;
}
function escolhe(k, porToque){
  const c = rosto.ctrl.find(x => x.k === k); if (!c) return;
  sinal = k;
  el.querySelectorAll('.rt-chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
  const fx = el.querySelector('#rt-faixa'); fx.min = c.min; fx.max = c.max; fx.value = rosto.pos[k];
  fx.setAttribute('aria-label', c.nome + ': quanto');
  if (porToque) trk('sinal', { sinal:k });
}
function mexeu(){
  toques++;
  if (!mexidos.size) trk('mexeu', { sinal });
  mexidos.add(sinal);
  if (cont) cont.alvo(rosto.idade().idade);
}
function anda(){
  laco = 0;
  if (!el || !rosto || el.hidden || !el.isConnected || el.closest('[hidden]')) return;   // saiu da tela: para
  const agora = performance.now();
  rosto.anda(agora, 420, 40);   // a tela do rosto é o próprio canvas do módulo (posto no quadro em iniciar)
  const n = cont.anda(agora), b = el.querySelector('#rt-idade');
  if (b.textContent !== String(n)) b.textContent = n;
  laco = requestAnimationFrame(anda);
}

/** Chamado quando a tela 'carregando' abre. sexo 'f'|'m', idade = a que ela marcou, track(tipo, opts) = o do app. */
export async function iniciar(o){
  o = o || {};
  const meu = ++vez;
  trk = (v, props) => { try { o.track && o.track('answer', { stepId:'rosto_toy', valueText:v, props:{ rosto:rosto ? rosto.id : null, ...(props || {}) } }); } catch (e) { /* medição nunca quebra */ } };
  const sec = document.querySelector('.screen[data-s="carregando"]'); if (!sec) return false;
  monta(sec);
  esperando = null; el.querySelector('#rt-ver').hidden = true; ultToque = 0; toques = 0; mexidos = new Set(); abriu = false;
  try {
    const M = await carregaModulo();
    const id = M.escolher(o.sexo === 'm' ? 'm' : 'f', o.idade, { jovem:true });
    if (!rosto || rosto.id !== id) rosto = await M.criar(id);
    else rosto.hoje();
  } catch (e) { return false; }
  if (meu !== vez || sec.hidden) return false;   // a análise acabou antes de o rosto ficar pronto
  const ch = el.querySelector('#rt-chips');
  ch.innerHTML = rosto.ctrl.filter(c => c.max > c.min).map(c => `<button type="button" class="rt-chip" data-k="${c.k}" aria-pressed="false">${c.curto}</button>`).join('');
  cont = window.RostoIdade.contador(rosto.idade().idade);
  el.querySelector('#rt-idade').textContent = cont.valor();
  escolhe(rosto.ctrl.find(c => c.max > c.min).k, false);
  rosto.anda(performance.now(), 0);
  const q = el.querySelector('.rt-quadro'), cv = q.querySelector('canvas');
  if (cv !== rosto.canvas){ rosto.canvas.id = 'rt-tela'; rosto.canvas.setAttribute('aria-label', 'Rosto de exemplo, com a idade estimada em cima'); cv.replaceWith(rosto.canvas); }
  el.hidden = false; sec.classList.add('com-rosto'); abriu = true;
  trk('viu', { idade:cont.valor() });
  if (!laco) laco = requestAnimationFrame(anda);
  return true;
}
/** Mexeu no rosto nos últimos 5 s? */
export function mexendo(){ return !!ultToque && performance.now() - ultToque < MEXENDO_MS; }
/** Antes de trocar para o resultado: se ela está mexendo, mostra "Ver o meu resultado" e espera o toque; senão, segue na hora. */
export function antesDoResultado(){
  vez++;   // um rosto ainda carregando não aparece mais
  const sai = () => { if (abriu) trk('resumo', { toques, sinais:[...mexidos].join(',') || null, idade:cont ? cont.valor() : null, esperou:!!el && !el.querySelector('#rt-ver').hidden }); limpar(); };
  if (!el || el.hidden || !mexendo()){ sai(); return Promise.resolve(); }
  const b = el.querySelector('#rt-ver'); b.hidden = false;
  const h = document.getElementById('prog-tit'); if (h) h.textContent = 'O seu resultado está pronto';
  el.closest('.screen')?.classList.add('pronto');
  requestAnimationFrame(() => { try { b.scrollIntoView({ block:'nearest', behavior:'smooth' }); } catch (e) { /* ok */ } });
  trk('esperou', { toques });
  return new Promise(ok => { esperando = { t0:performance.now(), ok:() => { sai(); ok(); } }; });
}
function limpar(){ if (laco) cancelAnimationFrame(laco); laco = 0; if (el){ el.hidden = true; el.querySelector('#rt-ver').hidden = true; } document.querySelector('.screen[data-s="carregando"]')?.classList.remove('com-rosto', 'pronto'); abriu = false; }
/** Para tudo (erro de rede, refazer). */
export function parar(){ vez++; esperando = null; limpar(); }
// para o teste: o estado à vista
export const _estado = () => ({ rosto:rosto && rosto.id, sinal, pos:rosto && { ...rosto.pos }, idade:rosto && rosto.idade(), mostrado:cont && cont.valor(), notas:rosto && rosto.notas(), toques, aberto:!!el && !el.hidden, esperando:!!esperando, ctrl:rosto && rosto.ctrl.map(c => ({ k:c.k, min:c.min, hoje:c.hoje, max:c.max })) });
