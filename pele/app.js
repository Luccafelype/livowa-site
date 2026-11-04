// livowa.com/pele (04/11/2026) · teste da IDADE APARENTE e da VITALIDADE pela pele do rosto. Não é análise
// dermatológica: nada de tipo de pele, rotina, produto ou classe de ativo. Pedido e ordem das telas:
// livowa-empresa/tarefas/pele-idade-vitalidade.md (passo 2). Frases com número só de
// tarefas/pele-idade-vitalidade/evidencia.md (conferidas no PubMed em 04/11). Base técnica copiada da pele2 (scan.js,
// rosto.js, fim de 1 passo); a pele2 fica intacta. Edge: a MESMA analisar-pele, só a foto de frente, sem extras.
// Regras: sem número sem fonte, sem promessa, sem depoimento; o número é "a idade que o rosto aparenta", nunca outra
// coisa; o que vem de estudo se diz "o que os estudos acharam". Confiança baixa ou foto ruim: sem número.
import * as Analytics from '/idade/funnel-analytics.js';
import { dicaDirect } from '/assets/js/dica-direct.js?v=3';
import * as Scan from './scan.js?v=1';
import { montarEnvio, alinhar, fotoTopo, recorteRegiao, criarFace, geometria, medir, pose, caixa, OVAL, NITIDEZ_MIN } from './rosto.js?v=1';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const Q = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

// ---------- medição (mesmo Supabase das outras páginas; em localhost só loga no console) ----------
const SUPA_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SUPA_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública
Analytics.init({ enabled:true, funnelId:'pele-idade', variant:Q.get('v') || 'direto', supabaseUrl:SUPA_URL, supabaseKey:SUPA_KEY });
// Fim A/B igual ao da pele2: A = "vai explicar o seu resultado em vídeo"; B = sem falar em vídeo. Sorteio 50/50 por
// aparelho (chave própria, livowa_pele_fim); ?fim=A|B força. Vai em props.fim de TODOS os eventos.
const FIM = (() => {
  const q = (Q.get('fim') || '').toUpperCase(); if (q === 'A' || q === 'B') return q;
  try { let v = localStorage.getItem('livowa_pele_fim'); if (v !== 'A' && v !== 'B'){ v = Math.random() < .5 ? 'A' : 'B'; localStorage.setItem('livowa_pele_fim', v); } return v; }
  catch { return Math.random() < .5 ? 'A' : 'B'; }
})();
const PONTE = window.lvPonte?.props?.() || {};   // ponte da bio (/assets/js/ponte.js): props.ponte sim|nao
const track = (tipo, o = {}) => Analytics.track(tipo, { ...o, props:{ ...(o.props || {}), fim:FIM, ...PONTE } });
track('view');
window.lvPonte?.pintar(document.querySelector('[data-s="capa"] .sub'), 'pele');

// ---------- análise: a MESMA edge analisar-pele (1 foto de frente, sem extras, sem ângulos) ----------
const PELE_PRODUCAO = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co/functions/v1/analisar-pele';
const PELE_ENDPOINT = (LOCAL && Q.get('pele')) || PELE_PRODUCAO;   // em localhost dá para apontar para um mock
const WHATSAPP = '5562991774809';

// ---------- dados ----------
const R = {};                  // respostas
let codigo = null, fotos = null, resultado = null;
const ALFA = 'ACDEFGHJKMNPQRTUVWXY34679';
function meuCodigo(){ if (!codigo){ const a = crypto.getRandomValues(new Uint8Array(4)); codigo = 'LV-' + [...a].map(x => ALFA[x % ALFA.length]).join(''); } return codigo; }
const ROT = {   // rótulos curtos (tela, carregamento, mensagem)
  sexo:{ f:'mulher', m:'homem' },
  cigarro:{ nunca:'nunca fumou', parou_mais10:'parou de fumar há mais de 10 anos', parou_menos10:'parou de fumar há menos de 10 anos', hoje:'fuma hoje' },
  sol:{ quase_nenhum:'quase nenhum sol sem protetor', fds:'sol sem protetor nos fins de semana', todo_dia:'sol sem protetor quase todo dia' },
  metabolico:{ nao_medi:'pressão e glicose normais', nunca:'nunca mediu pressão e glicose', pressao:'pressão alta', glicose:'glicose alta', ambas:'pressão e glicose altas' },
  movimento:{ quase_nada:'quase nada de movimento', ate2:'até 2 h de movimento por semana', '2a5':'2 a 5 h de movimento por semana', mais5:'mais de 5 h de movimento por semana' },
  sono:{ bem:'dorme bem', '6h':'dorme umas 6 h', curto:'dorme 5 h ou menos', cansado:'acorda cansado' },
  futuro:{ disposicao:'ter a mesma disposição de hoje', parecer:'parecer a idade que eu sinto', aos70:'chegar bem aos 70, com força e memória', entender:'entender o que o meu corpo já está mostrando', cuidar:'cuidar agora, antes que apareça' },
  futuroVoce:{ disposicao:'ter a mesma disposição de hoje', parecer:'parecer a idade que você sente', aos70:'chegar bem aos 70, com força e memória', entender:'entender o que o seu corpo já está mostrando', cuidar:'cuidar agora, antes que apareça' },
};
const nome1 = () => (R.nome || '').trim().split(/\s+/)[0] || '';
function nomeBonito(){ const n = nome1(); return n ? n[0].toLocaleUpperCase('pt-BR') + n.slice(1) : ''; }
const fem = () => R.sexo !== 'm';

// ---------- telas (ordem do passo 2 do dossiê) ----------
const ORDEM = ['capa','sexo','idade','reforco1','nome','cigarro','sol','reforco2','metabolico','movimento','sono','futuro','instrucao','scan','carregando','resultado','fechar','erro'];
const QUIZ = ['sexo','cigarro','sol','metabolico','movimento','sono','futuro'];          // uma escolha, avança sozinho
const PERGUNTAS = ['sexo','idade','cigarro','sol','metabolico','movimento','sono','futuro'];   // as 8 da capa (o nome é opcional e não conta)
const VOLTA = { scan:'instrucao', erro:'instrucao', fechar:'resultado' };
// contador honesto: quantas perguntas faltam até a foto, contando a da tela
function falta(s){
  let i = PERGUNTAS.indexOf(s);
  if (i < 0){ const prox = ORDEM.slice(ORDEM.indexOf(s) + 1).find(x => PERGUNTAS.includes(x)); i = PERGUNTAS.indexOf(prox); }
  const n = PERGUNTAS.length - i;
  return n <= 1 ? 'Última pergunta antes da foto' : `Faltam ${n} perguntas para a foto`;
}
let cur = 'capa';
function show(s){
  if (cur === 'scan' && s !== 'scan') Scan.parar();
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.dataset.s !== s);
  cur = s;
  track('step_view', { stepId:s, stepIndex:ORDEM.indexOf(s) });
  document.body.classList.toggle('scan-on', s === 'scan');
  $('top').hidden = ['capa','scan','carregando','resultado'].includes(s);
  const cta = $('cta'), c2 = $('cta-2');
  $('cta-bar').hidden = ['scan','carregando','fechar'].includes(s);
  cta.hidden = false; c2.hidden = true; cta.classList.remove('off');
  cta.textContent = 'Continuar';
  const el = document.querySelector(`[data-s="${s}"] .falta`); if (el) el.textContent = falta(s);
  if (s === 'capa') cta.textContent = 'Começar';
  if (s === 'idade') posicionarIdade();
  if (s === 'nome'){ cta.classList.toggle('off', nome1().length < 2); c2.hidden = false; c2.textContent = 'Pular'; }
  if (QUIZ.includes(s)) cta.classList.toggle('off', R[s] == null);
  if (s === 'instrucao'){ cta.textContent = 'Abrir a câmera'; cta.classList.toggle('off', !$('aceite').checked); animarIlustracao(); }
  if (s === 'erro'){ cta.textContent = erroRede ? 'Tentar de novo' : 'Tirar de novo'; c2.hidden = false; c2.textContent = 'Escolher uma foto'; }
  if (s === 'resultado') cta.textContent = 'Quero que o Dr. Lucca me explique';   // um botão só
  if (s === 'fechar') prepararFechamento();
  document.querySelectorAll('.nm').forEach(el => { el.textContent = nome1() ? nomeBonito() + ', ' : ''; el.nextSibling && ajustarMaiuscula(el); });
  document.querySelectorAll('.gen').forEach(el => { el.textContent = fem() ? el.dataset.f : el.dataset.m; });
  window.scrollTo(0, 0);
  requestAnimationFrame(medirBarra);
}
// "Ana, o cigarro…" com nome; "O cigarro…" sem nome: a 1ª letra do texto depois do .nm acompanha
function ajustarMaiuscula(el){
  const t = el.nextSibling; if (!t || t.nodeType !== 3) return;
  const s = t.textContent; if (!s) return;
  t.textContent = (nome1() ? s[0].toLocaleLowerCase('pt-BR') : s[0].toLocaleUpperCase('pt-BR')) + s.slice(1);
}
function medirBarra(){ const b = $('cta-bar'); document.documentElement.style.setProperty('--cta-h', (b.hidden ? 0 : b.offsetHeight) + 'px'); }
addEventListener('resize', medirBarra);
if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe($('cta-bar'));
function proxima(){ show(ORDEM[ORDEM.indexOf(cur) + 1]); }

$('back').addEventListener('click', () => {
  if (VOLTA[cur]) return show(VOLTA[cur]);
  const i = ORDEM.indexOf(cur) - 1; if (i >= 0) show(ORDEM[i]);
});

// ---------- idade real: roda de rolar (mesmo componente do /emagrecimento, /idade e /braco) ----------
// Começa em 40 (ponto de partida, não é dado da pessoa) e não trava o Continuar; o evento diz se ela rolou
// ('rolou'), tocou no número do meio ('confirmou') ou deixou como veio ('padrao').
const H = 44, IDADE_DE = 18, IDADE_ATE = 90, IDADE_PADRAO = 40;
let comoIdade = 'padrao';
const roda = (() => {
  const w = $('w-idade'), itens = [];
  for (let v = IDADE_DE; v <= IDADE_ATE; v++){
    const d = document.createElement('div'); d.textContent = v; d.id = `w-idade-${v}`;
    d.setAttribute('role', 'option'); d.setAttribute('aria-selected', 'false'); w.appendChild(d); itens.push(d);
  }
  let mao = false, valor = null;
  const pick = () => {
    const i = Math.max(0, Math.min(itens.length - 1, Math.round(w.scrollTop / H)));
    if (valor === IDADE_DE + i) return;
    if (valor != null){ const a = itens[valor - IDADE_DE]; a.classList.remove('sel'); a.setAttribute('aria-selected', 'false'); }
    valor = IDADE_DE + i; itens[i].classList.add('sel'); itens[i].setAttribute('aria-selected', 'true');
    w.setAttribute('aria-activedescendant', itens[i].id);
    R.idade = valor;
    if (mao) comoIdade = 'rolou';
  };
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(ev => w.addEventListener(ev, () => { mao = true; }, { passive:true }));
  w.addEventListener('scroll', pick, { passive:true });
  w.addEventListener('keydown', e => {
    const passo = { ArrowDown:1, ArrowUp:-1, PageDown:10, PageUp:-10 }[e.key];
    if (passo){ e.preventDefault(); w.scrollTo({ top:(Math.max(IDADE_DE, Math.min(IDADE_ATE, valor + passo)) - IDADE_DE) * H, behavior:'smooth' }); }
    else if (e.key === 'Home' || e.key === 'End'){ e.preventDefault(); w.scrollTo({ top:(e.key === 'Home' ? 0 : IDADE_ATE - IDADE_DE) * H, behavior:'smooth' }); }
    else if (e.key === 'Enter'){ e.preventDefault(); if (comoIdade === 'padrao') comoIdade = 'confirmou'; $('cta').click(); }
  });
  itens.forEach((d, j) => d.addEventListener('click', () => {
    mao = true;
    if (IDADE_DE + j === valor){ if (comoIdade === 'padrao') comoIdade = 'confirmou'; }
    else w.scrollTo({ top:j * H, behavior:'smooth' });
  }));
  return {
    get valor(){ return valor; },
    set(v){ mao = false; w.scrollTop = (Math.max(IDADE_DE, Math.min(IDADE_ATE, v)) - IDADE_DE) * H; pick(); },
    pronta: () => w.clientHeight > 0,
  };
})();
function posicionarIdade(){   // display:none perde a rolagem: ao mostrar a tela, a roda volta ao número
  requestAnimationFrame(() => { if (roda.pronta()) roda.set(R.idade ?? IDADE_PADRAO); });
}

// ---------- nome (com Pular) ----------
$('nome').addEventListener('input', () => { R.nome = $('nome').value.replace(/[<>]/g, '').slice(0, 40); $('cta').classList.toggle('off', nome1().length < 2); });
$('nome').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('cta').click(); } });

// ---------- perguntas de uma escolha (avança sozinho) ----------
function ligarOpcoes(box){
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
    const q = box.dataset.q, v = b.dataset.v;
    R[q] = v;
    box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    track('answer', { stepId:q, valueText:v });
    $('cta').classList.remove('off');
    setTimeout(() => { if (cur === q) proxima(); }, 260);
  });
}
// ilustração da instrução: rosto de frente; o anel acende do topo para os lados, como no scan
let ilustT = null;
function animarIlustracao(){
  const svg = $('rosto-ill');
  if (!svg.childElementCount){
    let h = '<g class="cabeca"><ellipse cx="100" cy="100" rx="50" ry="64" fill="#e7ece8"/></g><g class="traco"><circle cx="82" cy="92" r="5" fill="#5f6d65"/><circle cx="118" cy="92" r="5" fill="#5f6d65"/><path d="M100 98v16" stroke="#5f6d65" stroke-width="4" stroke-linecap="round"/><path d="M86 128q14 9 28 0" fill="none" stroke="#5f6d65" stroke-width="4" stroke-linecap="round"/></g>';
    for (let k = 0; k < 48; k++){ const a = k*7.5*Math.PI/180; h += `<line class="tk" x1="${(100 + 64*Math.cos(a)).toFixed(1)}" y1="${(100 - 79*Math.sin(a)).toFixed(1)}" x2="${(100 + 76*Math.cos(a)).toFixed(1)}" y2="${(100 - 92*Math.sin(a)).toFixed(1)}"/>`; }
    svg.innerHTML = h;
  }
  clearInterval(ilustT);
  const tks = [...svg.querySelectorAll('.tk')], t0 = performance.now();
  ilustT = setInterval(() => {
    if (cur !== 'instrucao') return clearInterval(ilustT);
    const f = ((performance.now() - t0) % 3600) / 3600;   // 0,1-0,7 acende do topo para os dois lados; 0,7-0,95 inteiro
    tks.forEach((tk, k) => { const a = k*7.5, d = Math.min(Math.abs(a - 90), 360 - Math.abs(a - 90));
      tk.classList.toggle('on', f < .95 && f > .1 && d <= 180*Math.min(1, (f - .1)/.6)); });
  }, 80);
}

// ---------- botões principais ----------
$('cta').addEventListener('click', () => {
  if ($('cta').classList.contains('off')){
    if (cur === 'instrucao') return apontarAceite();
    if (cur === 'nome') return $('nome').focus();
    return;
  }
  if (cur === 'capa') return proxima();
  if (cur === 'idade'){ R.idade = roda.valor ?? IDADE_PADRAO; track('answer', { stepId:'idade', valueText:String(R.idade), props:{ como:comoIdade } }); return proxima(); }
  if (cur === 'nome'){ R.nome = nomeBonito(); track('answer', { stepId:'nome', valueText:'ok' }); return proxima(); }
  if (QUIZ.includes(cur) || cur.startsWith('reforco')) return proxima();
  if (cur === 'instrucao') return abrirScan();
  if (cur === 'erro') return erroRede && fotos ? enviar(fotos) : abrirScan();
  if (cur === 'resultado'){ track('cta_click', { stepId:'resultado', valueText:'explicar' }); return show('fechar'); }
});
$('cta-2').addEventListener('click', () => {
  if (cur === 'nome'){ R.nome = ''; $('nome').value = ''; track('answer', { stepId:'nome', valueText:'pulou' }); return proxima(); }
  if (cur === 'erro') $('arquivo').click();
});
$('galeria').addEventListener('click', () => { if (!$('aceite').checked) return apontarAceite(); $('arquivo').click(); });
$('aceite').addEventListener('change', () => { $('aceite').closest('.consent').classList.remove('alerta'); if (cur === 'instrucao') $('cta').classList.toggle('off', !$('aceite').checked); });
function apontarAceite(){ const l = $('aceite').closest('.consent'); l.classList.add('alerta'); l.scrollIntoView({ block:'center', behavior:'smooth' }); }

// ---------- scan (só a frente) ----------
function abrirScan(){
  Scan.liberarVoz();   // iOS: a voz só sai se começar dentro do toque
  show('scan'); $('scan-help').hidden = true;
  Scan.abrir({ onPronto: f => { track('answer', { stepId:'scan', valueText:'frente' }); enviar(f); },
               onErro: e => track('answer', { stepId:'scan', valueText:'erro-camera', props:{ erro:e?.name || 'erro' } }) });
}
$('scan-fechar').addEventListener('click', () => { Scan.parar(); show('instrucao'); });
$('scan-ajuda').addEventListener('click', () => { $('scan-help').hidden = !$('scan-help').hidden; });
$('scan-help-ok').addEventListener('click', () => { $('scan-help').hidden = true; });
$('scan-galeria').addEventListener('click', () => { Scan.parar(); $('arquivo').click(); });

// ---------- galeria (foto de frente) ----------
let faceImagem = null;
$('arquivo').addEventListener('change', async e => {
  const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
  try {
    const url = URL.createObjectURL(f), img = new Image(); img.src = url; await img.decode(); URL.revokeObjectURL(url);
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth*k); cv.height = Math.round(img.naturalHeight*k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); img.src = '';
    faceImagem ??= await criarFace('IMAGE');
    const faces = faceImagem.detect(cv).faceLandmarks || [];
    let prob = null;
    if (!faces.length) prob = 'Não achei um rosto nessa foto. Escolha uma de frente, com o rosto bem visível.';
    else if (faces.length > 1) prob = 'Tem mais de uma pessoa nessa foto. Escolha uma só com você.';
    else {
      const lm = faces[0], b = caixa(OVAL.map(i => ({ x:lm[i].x*cv.width, y:lm[i].y*cv.height }))), p = pose(lm), m = medir(cv, lm, cv.width, cv.height);
      if (b.x1 - b.x0 < 160) prob = 'O rosto ficou pequeno nessa foto. Escolha uma mais de perto.';
      else if (Math.abs(p.yaw - .5) > .14 || Math.abs(p.roll) > 15) prob = 'Nessa foto o rosto está de lado. Escolha uma olhando reto para a câmera.';
      else if (p.pitch < .22 || p.pitch > .66) prob = 'Nessa foto a câmera está abaixo ou acima do rosto. Escolha uma com a câmera na altura dos olhos.';
      else if (m.lum < 60) prob = 'Essa foto está escura. Escolha uma com mais luz no rosto.';
      else if (m.nitidez < NITIDEZ_MIN*.6) prob = 'Essa foto está tremida. Escolha uma mais nítida.';
      else { track('answer', { stepId:'scan', valueText:'galeria' }); return enviar({ frente:{ angulo:'frente', src:cv, lm, g:geometria(lm, cv.width, cv.height), pose:p, lum:Math.round(m.lum), nitidez:Math.round(m.nitidez), origem:'galeria' } }); }
    }
    cv.width = 0; erro(prob, false);
  } catch (err) { console.error(err); erro('Não consegui abrir essa foto. Tente outra, ou use a câmera.', false); }
});

// ---------- envio e carregamento que repete as respostas ----------
let erroRede = false;
function erro(txt, rede, limite){ erroRede = !!rede; $('erro-tit').textContent = limite ? 'Muitas análises agora' : rede ? 'Não consegui analisar agora' : 'Essa foto não deu para ler'; $('erro-txt').textContent = txt;
  $('erro-contato').hidden = !limite;
  if (limite){ const s = sou(); $('erro-wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Oi, Dr. Lucca! ${s ? s + '. ' : ''}Tentei fazer o teste da idade da pele, código ${meuCodigo()}, mas deu muitas análises agora.`)}`; }
  show('erro'); }
$('erro-wa').addEventListener('click', () => track('cta_click', { stepId:'erro', valueText:'limite', props:{ canal:'whatsapp', codigo:meuCodigo() } }));
$('erro-dm').addEventListener('click', () => track('cta_click', { stepId:'erro', valueText:'limite', props:{ canal:'direct', codigo:meuCodigo() } }));
const PERIM = 326.7;
function progresso(p, etapa){
  $('prog-c').style.strokeDashoffset = (PERIM * (1 - p/100)).toFixed(1);
  $('prog-pct').innerHTML = `${Math.round(p)}<small>%</small>`;
  if (etapa != null){ $('prog-etapa').textContent = etapa.txt; [...$('prog-dots').children].forEach((d, i) => d.classList.toggle('on', i === etapa.i)); }
}
async function enviar(f){
  fotos = f;
  const contou = [R.cigarro && ROT.cigarro[R.cigarro], R.sol && ROT.sol[R.sol]].filter(Boolean).join(', ');
  const ETAPAS = [{ i:0, ate:22, txt:'Lendo a sua foto' }, { i:1, ate:52, txt:R.idade ? `Comparando com os seus ${R.idade} anos` : 'Comparando com a sua idade' },
                  { i:2, ate:84, txt:contou ? `Pesando o que você contou: ${contou}` : 'Pesando o que você contou' }, { i:3, ate:100, txt:'Montando o seu resultado' }];
  show('carregando'); progresso(0, ETAPAS[0]);
  const cv = montarEnvio(f.frente.src, f.frente.g), img = cv.toDataURL('image/jpeg', .9).split(',')[1]; cv.width = cv.height = 0;
  const corpo = { imagens:[img], modo:'rosto', ocultas:['olhos'], codigo:meuCodigo() };
  window.__ultimoEnvio = { n:1, kb:Math.round(img.length*3/4/1024) };
  const t0 = performance.now(), MIN = 8000;   // mínimo de ~8 s: dá tempo de ler as etapas
  let pct = 0, fim = false;
  const etapaDe = p => ETAPAS.find(e => p <= e.ate) || ETAPAS[3];
  const tick = setInterval(() => { if (fim) return; pct = Math.min(92, pct + (pct < 50 ? 2.6 : pct < 80 ? 1.6 : .6)); progresso(pct, etapaDe(pct)); }, 220);
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(PELE_ENDPOINT, { method:'POST', signal:ctl.signal, headers:{ 'Content-Type':'application/json', apikey:SUPA_KEY }, body:JSON.stringify(corpo) });
    const j = await r.json().catch(() => null);
    if (r.status === 429){ clearInterval(tick); return erro('Muita gente fez a análise agora. Tente de novo em alguns minutos, ou mande o seu código ao Dr. Lucca e fale com ele direto.', true, true); }
    if (!r.ok || !j){ clearInterval(tick); return erro('Pode ser a internet. É só tentar de novo.', true); }
    if (!j.ok){ clearInterval(tick); return erro('A foto não deu para ler direito. Tente de novo de frente para a luz, com o rosto inteiro no oval.', false); }
    const resta = MIN - (performance.now() - t0);
    if (resta > 0) await new Promise(res => setTimeout(res, resta));
    fim = true; clearInterval(tick);
    for (const p of [96, 100]){ progresso(p, ETAPAS[3]); await new Promise(res => setTimeout(res, 380)); }
    montarResultado(j, f);
    show('resultado');
  } catch (e) {
    console.error(e); clearInterval(tick); erro('Pode ser a internet. É só tentar de novo.', true);
  } finally { clearTimeout(to); }
}

// =====================================================================
// RESULTADO: régua (idade aparente × idade real) → frase de alívio → vitalidade (resposta + sinal da foto + estudo)
// → gêmeos (Christensen 2009) → ponte → 1 botão. Recolhido: os sinais da foto.
// =====================================================================
const CORTE = 3;   // ±3 anos entre o meio da faixa e a idade real: escolha de produto, não vem de estudo
const GRAU = ['', 'leve', 'moderado', 'marcado'];
// sinais da edge ligados à idade do rosto (a textura/poro fica de fora: não é o eixo deste teste)
const SINAL = {
  linhas_testa:{ nome:'Testa', recorte:'testa', t:['a testa aparece lisa', 'aparecem linhas leves na testa', 'aparecem linhas visíveis na testa', 'aparecem linhas bem marcadas na testa'],
    tit:['Testa lisa', 'Linhas leves na testa', 'Linhas visíveis na testa', 'Linhas bem marcadas na testa'] },
  olhos:{ nome:'Canto dos olhos', recorte:'olhos', t:['o canto dos olhos aparece liso', 'aparecem linhas leves no canto dos olhos', 'aparecem linhas visíveis no canto dos olhos', 'aparecem linhas bem marcadas no canto dos olhos'],
    tit:['Cantos dos olhos lisos', 'Linhas leves no canto dos olhos', 'Linhas visíveis no canto dos olhos', 'Linhas bem marcadas no canto dos olhos'] },
  sulco_nasolabial:{ nome:'Nariz à boca', recorte:'sulco', t:['o vinco do nariz à boca quase não aparece', 'o vinco do nariz à boca aparece leve', 'o vinco do nariz à boca aparece visível', 'o vinco do nariz à boca aparece bem marcado'],
    tit:['Vinco quase imperceptível', 'Vinco leve', 'Vinco visível', 'Vinco bem marcado'] },
  manchas:{ nome:'Bochechas', recorte:'bochecha', t:['o tom da pele aparece uniforme', 'aparecem poucas manchas, discretas', 'aparecem algumas manchas visíveis', 'aparecem manchas bem visíveis'],
    tit:['Tom uniforme', 'Poucas manchas, discretas', 'Algumas manchas visíveis', 'Manchas bem visíveis'] },
  flacidez:{ nome:'Contorno', recorte:'contorno', t:['o contorno do rosto aparece firme', 'o contorno do rosto aparece levemente menos firme', 'o contorno do rosto aparece menos firme', 'o contorno do rosto aparece bem menos firme'],
    tit:['Contorno firme', 'Contorno levemente menos firme', 'Contorno menos firme', 'Contorno bem menos firme'] },
};
// fontes (todas em evidencia.md, conferidas no PubMed em 04/11/2026)
const F = {
  christensen:['Christensen 2009, BMJ', 'https://doi.org/10.1136/bmj.b5262'],
  guyuron:['Guyuron 2009, Plast Reconstr Surg', 'https://doi.org/10.1097/PRS.0b013e31819c4d42'],
  okada:['Okada 2013, Plast Reconstr Surg', 'https://doi.org/10.1097/PRS.0b013e3182a4c20a'],
  gunn12:['Gunn 2012, J Gerontol A', 'https://doi.org/10.1093/gerona/gls154'],
  noordam:['Noordam 2011, Age', 'https://doi.org/10.1007/s11357-011-9339-9'],
  drielen:['van Drielen 2015, Age', 'https://doi.org/10.1007/s11357-015-9771-3'],
  mayes:['Mayes 2010, PLoS One', 'https://doi.org/10.1371/journal.pone.0015270'],
  wolff:['Wolffenbuttel 2025, Front Endocrinol', 'https://doi.org/10.3389/fendo.2025.1700892'],
  oyetakin:['Oyetakin-White 2015, Clin Exp Dermatol', 'https://doi.org/10.1111/ced.12455'],
  gunn09:['Gunn 2009, PLoS One', 'https://pubmed.ncbi.nlm.nih.gov/19956599/'],
};
const fmtData = d => d.toLocaleDateString('pt-BR', { day:'numeric', month:'short' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
const fontes = ids => ids.map(id => `<a href="${F[id][1]}" target="_blank" rel="noopener">${esc(F[id][0])}</a>`).join(' · ');

// caso da régua: mais novo / igual / mais velho (meio da faixa contra a idade real, corte ±3)
function casoDe(fx, idade){
  if (!fx || !idade) return 'sem_numero';
  const d = (fx.min + fx.max)/2 - idade;
  return d <= -CORTE ? 'mais_novo' : d >= CORTE ? 'mais_velho' : 'igual';
}

function regua(fx, idade){
  const lo = Math.max(15, Math.floor((Math.min(idade, fx.min) - 6)/5)*5), hi = Math.ceil((Math.max(idade, fx.max) + 6)/5)*5;
  const pc = v => ((v - lo)/(hi - lo)*100).toFixed(1) + '%';
  return `<div class="regua" role="img" aria-label="Régua: o rosto aparenta de ${fx.min} a ${fx.max} anos; a sua idade é ${idade}">
    <div class="rg-trilho"><i class="rg-faixa" style="left:${pc(fx.min)};width:calc(${pc(fx.max)} - ${pc(fx.min)})"></i><i class="rg-voce" style="left:${pc(idade)}"></i></div>
    <span class="rg-rot rg-rot-voce" style="left:${pc(idade)}">Você: ${idade}</span>
    <span class="rg-rot rg-rot-faixa" style="left:${pc((fx.min + fx.max)/2)}">Rosto: ${fx.min} a ${fx.max}</span>
    <span class="rg-ponta" style="left:0">${lo}</span><span class="rg-ponta fim" style="left:100%">${hi}</span>
  </div>`;
}

function montarResultado(j, f){
  const fr = f.frente, al = alinhar(fr.src, fr.g);
  const sinais = Object.fromEntries((j.sinais || []).map(s => [s.id, { visivel:s.visivel !== false && s.nivel != null, nivel:Math.max(0, Math.min(3, +s.nivel || 0)) }]));
  const fx = j.faixa && j.faixa.min != null && j.faixa.max != null ? { min:+j.faixa.min, max:+j.faixa.max } : null;
  const daParaDizer = !!fx && j.confianca !== 'baixa' && j.qualidade?.nota !== 'ruim';
  const idade = R.idade, nome = nomeBonito();
  const caso = daParaDizer ? casoDe(fx, idade) : 'sem_numero';
  resultado = { faixa:daParaDizer ? fx : null, caso, confianca:j.confianca, qualidade:j.qualidade?.nota, foto:j.foto || null };
  const nivel = id => daParaDizer && sinais[id]?.visivel ? sinais[id].nivel : null;
  // "Na foto, …": o sinal mais marcado entre os pedidos (empate: o primeiro da lista). Sem número, sem sinal.
  const naFoto = ids => { const vis = ids.filter(id => nivel(id) != null); if (!vis.length) return '';
    const top = vis.reduce((a, b) => nivel(b) > nivel(a) ? b : a); return `Na foto, ${SINAL[top].t[nivel(top)]}.`; };

  // topo: a foto de frente com tarja nos olhos e a data
  const topo = fotoTopo(al, fr.g, 720); $('r-foto').src = topo.toDataURL('image/jpeg', .86); topo.width = topo.height = 0;
  $('r-data').textContent = fmtData(new Date());

  // 1. a idade aparente ao lado da idade real, com a frase de alívio
  const ALIVIO = {
    mais_novo:`O seu rosto aparenta menos do que os seus ${idade} anos. Nos estudos, esse é o lado que anda junto com mais vitalidade.`,
    igual:`O seu rosto acompanha os seus ${idade} anos: a foto mostra a idade que você tem.`,
    mais_velho:`O seu rosto aparenta um pouco mais do que os seus ${idade} anos. Nos estudos, isso se liga a hábitos que dá para olhar com calma, e a genética pesa tanto quanto eles.`,
  };
  $('r-idade').innerHTML = daParaDizer
    ? `<small class="rot">Idade que o seu rosto aparenta</small>
       <h2>${nome ? esc(nome) + ', o' : 'O'} seu rosto aparenta <em>${fx.min} a ${fx.max} anos</em></h2>
       <p class="real">Você tem ${idade}.</p>
       ${regua(fx, idade)}
       <p class="alivio" data-caso="${caso}">${esc(ALIVIO[caso])}${caso === 'mais_velho' ? ` <small>${fontes(['gunn09'])}</small>` : ''}</p>
       <p class="miuda">Estimativa pela foto: erra alguns anos para cada lado e não é diagnóstico.${j.qualidade?.nota === 'regular' ? ' Com a foto regular, ela fica menos precisa.' : ''}</p>`
    : `<small class="rot">Idade que o seu rosto aparenta</small>
       <h2>Não deu para estimar</h2>
       <p class="real">A foto não deu segurança para estimar a idade do rosto, então aqui não vai número nenhum. Com a luz de uma janela na frente, a estimativa sai melhor.</p>
       <button type="button" class="link-alt" id="r-refazer">Tirar outra foto</button>`;
  $('r-refazer')?.addEventListener('click', () => { track('answer', { stepId:'resultado-refazer', valueText:'abriu' }); show('instrucao'); });

  // 2. vitalidade: frases que juntam a resposta, um sinal da foto e o que os estudos acharam
  const sono = { curto:'dorme 5 horas ou menos', cansado:`acorda ${fem() ? 'cansada' : 'cansado'} mesmo dormindo` };
  const atencao = [], bom = [];
  if (['hoje','parou_menos10','parou_mais10'].includes(R.cigarro)){
    const quem = R.cigarro === 'hoje' ? 'Você contou que fuma hoje.' : `Você contou que parou de fumar há ${R.cigarro === 'parou_mais10' ? 'mais' : 'menos'} de 10 anos.`;
    atencao.push({ id:'cigarro', txt:[quem, naFoto(['sulco_nasolabial','flacidez','olhos']), 'Em 186 pares de gêmeos idênticos, o que pesou foi o total de anos de cigarro: cada 10 anos a mais somou cerca de 2 anos à idade que o rosto aparentava, mais no meio e na parte de baixo do rosto.'], f:['guyuron','okada'] });
  } else if (R.cigarro === 'nunca') bom.push({ id:'cigarro', txt:['Você nunca fumou.', 'O cigarro é o hábito com o número mais claro sobre o rosto: em gêmeos idênticos, cada 10 anos de cigarro somou cerca de 2 anos à aparência.'], f:['guyuron'] });
  if (['todo_dia','fds'].includes(R.sol))
    atencao.push({ id:'sol', txt:[`Você contou que o seu rosto pega sol sem protetor ${R.sol === 'todo_dia' ? 'quase todo dia' : 'nos fins de semana'}.`, naFoto(['manchas','linhas_testa']), 'Nos gêmeos, mais sol andou junto com um rosto mais velho, e o efeito cresceu com a idade. Essa parte é pele por fora: não diz como o corpo está por dentro.'], f:['guyuron'] });
  else if (R.sol === 'quase_nenhum') bom.push({ id:'sol', txt:['Você contou que o seu rosto quase não pega sol sem protetor.', naFoto(['manchas']), 'Nos gêmeos, quem usava protetor aparentava menos idade.'], f:['guyuron'] });
  if (['pressao','glicose','ambas'].includes(R.metabolico)){
    const qual = { pressao:'a sua pressão estava alta', glicose:'a sua glicose estava alta', ambas:'a sua pressão e a sua glicose estavam altas' }[R.metabolico];
    const t = [`Você contou que já te disseram que ${qual}.`];
    const fs = [];
    if (R.metabolico !== 'glicose'){ t.push('Em 514 pessoas sem doença, a pressão foi o fator do coração mais ligado à idade que o rosto aparentava.'); fs.push('gunn12'); }
    if (R.metabolico !== 'pressao'){ t.push(naFoto(['linhas_testa','olhos']), 'Mesmo sem diabetes, a glicose mais alta andou junto com um rosto mais velho, e metade disso passou pelas linhas.'); fs.push('noordam', 'drielen'); }
    t.push('A foto não mede pressão nem glicose: isso se vê com aparelho e exame.');
    atencao.push({ id:'metabolico', txt:t, f:fs });
  } else if (R.metabolico === 'nunca')
    atencao.push({ id:'metabolico', txt:['Você contou que nunca mediu a pressão e a glicose, ou não lembra.', 'São dois números de dentro que os estudos ligaram à idade que o rosto aparenta, mesmo em quem não tem doença, e a foto não mede nenhum dos dois.'], f:['gunn12','noordam'] });
  else if (R.metabolico === 'nao_medi') bom.push({ id:'metabolico', txt:['Você mediu a pressão e a glicose no último ano, e estavam normais.', 'Em pessoas sem doença, pressão e glicose mais baixas andaram junto com um rosto mais novo.'], f:['gunn12','noordam'] });
  if (sono[R.sono])
    atencao.push({ id:'sono', txt:[`Você contou que ${sono[R.sono]}.`, naFoto(['olhos']), 'Num estudo com 60 mulheres, quem dormia mal tinha mais sinais de envelhecimento na pele, e a barreira da pele se recuperou 30% pior.'], f:['oyetakin'] });
  else if (R.sono === 'bem') bom.push({ id:'sono', txt:['Você dorme 7 horas ou mais e acorda bem.', naFoto(['olhos']), 'Num estudo com 60 mulheres, quem dormia mal tinha mais sinais de envelhecimento na pele que quem dormia bem.'], f:['oyetakin'] });
  if (['quase_nada','ate2'].includes(R.movimento))
    atencao.push({ id:'movimento', txt:[`Você contou que se mexe ${R.movimento === 'quase_nada' ? 'quase nada' : 'até 2 horas'} numa semana comum.`, 'Num estudo com 250 mulheres, a atividade moderada andou junto com um rosto mais novo, e em 82 mil pessoas a pele tinha menos marcas de glicação com 150 a 299 minutos de atividade por semana.'], f:['mayes','wolff'] });
  else if (['2a5','mais5'].includes(R.movimento)) bom.push({ id:'movimento', txt:[`Você se mexe ${R.movimento === '2a5' ? 'de 2 a 5 horas' : 'mais de 5 horas'} por semana.`, 'Em 82 mil pessoas, quem fazia de 150 a 299 minutos de atividade por semana tinha menos marcas de glicação na pele, e num estudo com 250 mulheres a atividade moderada andou junto com um rosto mais novo.'], f:['wolff','mayes'] });
  const frases = [...atencao, ...bom].slice(0, 3);
  const linha = x => `<li data-f="${x.id}"><p>${esc(x.txt.filter(Boolean).join(' '))}</p><small>${fontes(x.f)}</small></li>`;
  $('r-vital').innerHTML = `<h3>Vitalidade: o que os estudos acharam</h3>
    <p>${atencao.length ? 'Junta o que você contou com o que a foto mostra.' : 'Nas suas respostas não apareceu nenhum dos hábitos mais estudados.'} São médias de grupos de pessoas, não uma medida sua.</p>
    <ul class="vital">${frases.map(linha).join('')}</ul>`;

  // 3. os gêmeos (Christensen 2009)
  $('r-gemeos').innerHTML = `<h3>Por que a idade do rosto importa</h3>
    <p>Num estudo com 1.826 gêmeos dinamarqueses de 70 anos ou mais, a idade que outras pessoas davam olhando a foto acompanhou a força, a memória e o tempo de vida, mesmo descontando a idade real. Entre gêmeos idênticos, a diferença quase sumiu: boa parte vem de genes que mexem ao mesmo tempo no rosto e na saúde.</p>
    <small>${fontes(['christensen'])}</small>`;

  // 4. a ponte para a conversa (e o que ela quer daqui a 10 anos)
  $('r-ponte').innerHTML = `<p><b>O rosto é a parte que dá para ver.</b> Força, sono e exames o Dr. Lucca vê com você.</p>
    ${R.futuro ? `<p class="sub">Você disse que, daqui a 10 anos, quer ${esc(ROT.futuroVoce[R.futuro])}.</p>` : ''}`;

  // 5. recolhido: os sinais da foto ligados à idade, com o recorte de cada área
  const ids = Object.keys(SINAL).filter(id => nivel(id) != null);
  $('r-foto-det').hidden = !daParaDizer || !ids.length;
  $('r-sinais').innerHTML = ids.map(id => `<div class="achado" data-id="${id}"><canvas data-r="${SINAL[id].recorte}" role="img" aria-label="Recorte da sua foto: ${esc(SINAL[id].nome.toLowerCase())}"></canvas><div>
      <div class="rg"><span>${esc(SINAL[id].nome)}</span>${nivel(id) ? `<b class="grau g${nivel(id)}">${GRAU[nivel(id)][0].toUpperCase() + GRAU[nivel(id)].slice(1)}</b>` : ''}</div>
      <h4>${esc(SINAL[id].tit[nivel(id)])}</h4></div></div>`).join('') + '<p class="aviso">São os sinais da foto que mais pesam na idade que o rosto aparenta.</p>';
  $('r-sinais').querySelectorAll('canvas[data-r]').forEach(c => { const r = recorteRegiao(al, fr.g, c.dataset.r, 128); c.width = r.width; c.height = r.height; c.getContext('2d').drawImage(r, 0, 0); r.width = 0; });
  $('r-foto-det').open = false;
  $('r-foto-det').ontoggle = () => { if ($('r-foto-det').open) track('answer', { stepId:'resultado-sinais', valueText:'abriu' }); };
  al.width = al.height = 0;

  // complete: o que a Caixa lê no topo (codigo, idade, sexo, faixa, respostas) + o resto para a consulta
  track('complete', { stepId:'resultado', stepIndex:ORDEM.indexOf('resultado'), valueText:caso,
    props:{ codigo:meuCodigo(), idade, sexo:R.sexo || null, faixa:daParaDizer ? `${fx.min} a ${fx.max} anos` : null, caso, respostas:respostasLimpa(),
            confianca:j.confianca, qualidade:j.qualidade?.nota, foto:j.foto || null, origem:fr.origem, enviadas:1, angulos:['frente'],
            frases:frases.map(x => x.id).join('+'),
            sinais:Object.entries(sinais).map(([id, s]) => ({ id, visivel:s.visivel, nivel:s.visivel ? s.nivel : null })) } });
  if (window.__peleResultado) window.__peleResultado(j);
}
function respostasLimpa(){ const { nome, ...r } = R; return r; }

// =====================================================================
// FECHAMENTO: igual ao da pele2 (02/11, v2): um passo só, em 3ª pessoa; WhatsApp com o código na mensagem pronta,
// Direct como alternativa; link marcado (?lv=) volta ao Instagram. Medição: cta_click com props.canal whatsapp/direct.
// =====================================================================
const souA = () => R.sexo === 'm' ? 'o' : 'a';
const sou = () => nomeBonito() ? `Sou ${souA()} ${nomeBonito()}` : '';
function mensagem(){
  const s = sou(), fx = resultado?.faixa;
  const rosto = fx && R.idade ? ` Tenho ${R.idade} anos e o meu rosto deu ${fx.min} a ${fx.max}.` : '';
  const quer = R.futuro ? ` Daqui a 10 anos, quero ${ROT.futuro[R.futuro]}.` : '';
  return `Oi, Dr. Lucca! ${s ? s + '. ' : ''}Fiz o teste da idade da pele, código ${meuCodigo()}.${rosto}${quer} Quero que você me explique o meu resultado.`;
}
function prepararFechamento(){
  const nome = nomeBonito();
  $('cod').textContent = meuCodigo();
  const tit1 = FIM === 'B' ? 'o Dr. Lucca vai olhar o seu resultado' : 'o Dr. Lucca vai explicar o seu resultado em vídeo';
  $('f-tit').textContent = nome ? `${nome}, ${tit1}` : tit1[0].toUpperCase() + tit1.slice(1);
  const canal = LV ? 'Direct' : 'WhatsApp';
  $('f-sub').textContent = FIM === 'B' ? `Ele responde pessoalmente no seu ${canal}, em até 24 horas.` : `Um vídeo de 1 minuto sobre a sua foto, no seu ${canal}, em até 24 horas. Ele grava um por um.`;
  $('cta-wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem())}`;
  if (LV) return fimDirect();
  $('wa-txt').textContent = 'Enviar meu código pelo WhatsApp';
  $('cta-dm').hidden = false;
}
const fimProps = () => ({ escolha:'explicar', codigo:meuCodigo() });
const fimValor = () => `explicar|fim${FIM}`;
$('cta-wa').addEventListener('click', () => { track('cta_click', { stepId:'fechar', valueText:fimValor(), props:{ canal:'whatsapp', ...fimProps() } }); });
$('cta-dm').addEventListener('click', e => { if (LV) return direto_lv(e); abrirDirect(e); });

// Direct: o Instagram não aceita texto pronto. Copia DENTRO do toque (exigência do iOS), avisa e deixa o link abrir o app.
function copiar(txt){
  let ok = false;
  try { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(t); t.select(); t.setSelectionRange(0, txt.length); ok = document.execCommand('copy'); t.remove(); } catch {}
  try { navigator.clipboard?.writeText(txt).catch(() => {}); } catch {}
  return ok;
}
let toastT = null;
const NO_INSTAGRAM = /Instagram/i.test(navigator.userAgent);   // navegador de dentro do app: ig.me abre como página e pede login
function abrirDirect(e){
  const txt = mensagem(), copiou = copiar(txt);
  track('cta_click', { stepId:'fechar', valueText:fimValor(), props:{ canal:'direct', copiou, noInstagram:NO_INSTAGRAM, ...fimProps() } });
  if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem:txt, copiou, voz:true }); return; }
  if (copiou){ $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 6000); return; }
  e.preventDefault();
  $('aviso-msg').textContent = txt; $('aviso-link').href = $('cta-dm').href; $('aviso-dm').hidden = false;
}
$('aviso-dm').addEventListener('click', ev => { if (ev.target === $('aviso-dm')) $('aviso-dm').hidden = true; });
$('aviso-link').addEventListener('click', () => { track('cta_click', { stepId:'fechar', valueText:fimValor() + '|abrir', props:{ canal:'direct', ...fimProps() } }); setTimeout(() => { $('aviso-dm').hidden = true; }, 800); });
const LV = Analytics.getLv();
const IG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>';
function fimDirect(){
  const dm = $('cta-dm'), wa = $('cta-wa'), nota = $('f-nota');
  $('f-cod').hidden = true; dm.hidden = false;
  nota.textContent = 'O Dr. Lucca já recebeu a sua análise. É só voltar ao Direct.';
  dm.className = 'btn ico'; dm.innerHTML = IG_SVG + '<span>Voltar ao Instagram</span>';
  wa.className = 'link-alt'; wa.innerHTML = '<span>ou pelo WhatsApp</span>';
  if (nota.previousElementSibling !== dm) nota.before(dm);
  if (nota.nextElementSibling !== wa) nota.after(wa);
}
function direto_lv(e){
  track('cta_click', { stepId:'fechar', valueText:fimValor(), props:{ canal:'direct', noInstagram:NO_INSTAGRAM, ...fimProps() } });
  if (!NO_INSTAGRAM) return;
  e.preventDefault(); dicaDirect({ lv:true, voz:true });
}

// ---------- início ----------
document.querySelectorAll('.opts[data-q]').forEach(ligarOpcoes);
show('capa');
// ganchos do teste automático (headless): estado e resultado sem câmera
window.__pele = { R, estado:() => ({ cur, codigo, envio:window.__ultimoEnvio || null, resultado }), show, mensagem };
