// livowa.com/tipos (22/11/2026) · teste dos 4 TIPOS DE ENGORDAR, a isca dos vídeos QD73 V1 ("comenta TESTE") e do carrinho
// ("comenta TIPO"). Base: Acosta A, Camilleri M et al. Obesity 2021;29(4):662 (Mayo Clinic, PMID 33759389): 4 tipos
// (hungry brain, hungry gut, emotional hunger, slow burn) com os nomes e as segundas linhas da tela do vídeo.
// O teste é uma ESTIMATIVA POR AUTORRELATO: a Mayo mediu cada tipo em exame (refeição livre, esvaziamento do estômago,
// questionários, gasto de repouso). As frases seguem a ideia de escalas de autorrelato (AEBQ e TFEQ) e não são validadas:
// ver livowa-empresa/tarefas/teste-4-tipos/pesquisa.md. Na tela: "Estimativa pelas suas respostas, não é diagnóstico".
// v2 (22/11, resposta B do Lucca): capa diz que é o teste; "já tentou" no meio das frases; o fim sem estudo e sem barras:
// as frases dela → "Isso tem cara de" + o tipo → "não se resolve só com [o que ela tentou]" → cartão verde.
// Regras (as mesmas dos outros testes): sem promessa de resultado e sem número sem fonte; nada de diagnóstico; não indica
// remédio; sem "grátis" nem "consulta" (o "sem custo" do prazo é a regra de 09/11); fim sem "vídeo", "um por um" ou "24 h".
// Molde visual e de fechamento: /pele/ v2 (barra log, capa = 1ª pergunta, interstício com fonte, resultado = tela final,
// cartão verde com WhatsApp, Direct e prazo real de 30 min). funnel_id 'teste-tipos'; a Caixa lê o 'complete'.
// Texto: sem aspas retas dentro de frase; quando precisar, aspas tipográficas.
import * as Analytics from '/idade/funnel-analytics.js';
import { dicaDirect } from '/assets/js/dica-direct.js?v=3';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const Q = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

const SUPA_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SUPA_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública
const PONTE = window.lvPonte?.props?.() || {};
const track = (tipo, o = {}) => Analytics.track(tipo, { ...o, props:{ ...(o.props || {}), versao:'v2', ...PONTE } });
Analytics.init({ enabled:true, funnelId:'teste-tipos', variant:Q.get('v') || 'direto', supabaseUrl:SUPA_URL, supabaseKey:SUPA_KEY });
track('view');
const WHATSAPP = '5562991774809';

const R = { tentou:[] };   // respostas
let codigo = null, RES = null;
const ALFA = 'ACDEFGHJKMNPQRTUVWXY34679';
function meuCodigo(){ if (!codigo){ const a = crypto.getRandomValues(new Uint8Array(4)); codigo = 'LV-' + [...a].map(x => ALFA[x % ALFA.length]).join(''); } return codigo; }
const nome1 = () => (R.nome || '').trim().split(/\s+/)[0] || '';
function nomeBonito(){ const n = nome1(); return n ? n[0].toLocaleUpperCase('pt-BR') + n.slice(1) : ''; }
const fem = () => R.sexo !== 'm';
const g = (f, m) => fem() ? f : m;
const lista = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1];
const cap = t => t ? t[0].toLocaleUpperCase('pt-BR') + t.slice(1) : '';

// =====================================================================
// OS 4 TIPOS (nome e 2ª linha = os da tela do vídeo QD73 V1). "o que é" em 1 frase, pela definição do estudo.
// =====================================================================
const TIPOS = {
  cb:{ nome:'CÉREBRO FAMINTO', linha2:'saciedade tardia', curto:'Cérebro faminto', art:'o',
       oque:'O aviso de “já chega” demora a chegar: você precisa comer mais do que a maioria para se sentir satisfeit@.' },
  ef:{ nome:'ESTÔMAGO FAMINTO', linha2:'esvazia rápido', curto:'Estômago faminto', art:'o',
       oque:'O estômago esvazia rápido: a saciedade dura pouco e a vontade de comer volta cedo depois da refeição.' },
  em:{ nome:'FOME EMOCIONAL', linha2:'come por emoção', curto:'Fome emocional', art:'a',
       oque:'A ansiedade puxa a vontade de comer: a comida vira o jeito de aliviar a tensão, mesmo sem fome de verdade.' },
  gl:{ nome:'GASTO LENTO', linha2:'queima menos', curto:'Gasto lento', art:'o',
       oque:'O corpo gasta menos energia em repouso do que o esperado para o seu tamanho, e costuma vir com menos músculo e menos movimento.' },
};
// 22/11 v2: o porquê de "não se resolve só com [o que ela tentou]", 1 frase por tipo, pela definição do estudo (sem promessa)
const PQ = {
  cb:'Se o aviso de “já chega” demora, comer menos na força de vontade vira uma briga todo dia.',
  ef:'Se o estômago esvazia rápido, a vontade de comer volta cedo, mesmo comendo direito.',
  em:'Se quem puxa a comida é a ansiedade, cortar comida não tira a ansiedade: a vontade volta junto com a tensão.',
  gl:'Se o corpo gasta menos em repouso, comer cada vez menos não devolve o gasto nem o músculo que faltam.',
};
const ORDEM_TIPOS = ['cb', 'ef', 'em', 'gl'];
// 3 frases por tipo, em 1ª pessoa, com a palavra do público ("vontade de comer"; VOZ-DO-PUBLICO.md). @ = a|o pelo sexo.
// Cada frase segue o que a Mayo mediu ou relatou do tipo (pesquisa.md §1 e §3): cérebro = precisa de mais comida para
// encerrar a refeição; estômago = a saciedade dura pouco; emocional = ansiedade (HADS-A, ideia parafraseada) e comer
// emocional; gasto lento = menos ativo e menos músculo. 'Como pouco e o peso não desce' é dedução (não está na fonte).
// Comer rápido NÃO entra: não foi medido em nenhum tipo.
// Intercaladas (cb, ef, em, gl, cb, ...) para o teste não parecer 4 blocos. Pontos: 0 quase nunca · 1 às vezes ·
// 2 muitas vezes · 3 quase sempre; cada tipo vai de 0 a 9.
const ITENS = [
  ['cb1', 'cb', 'Preciso comer bastante para me sentir satisfeit@.'],
  ['ef1', 'ef', 'Pouco tempo depois de comer, a vontade de comer já volta.'],
  ['em1', 'em', 'Quando fico ansios@ ou preocupad@, a vontade de comer aumenta.'],
  ['gl1', 'gl', 'Como pouco e, mesmo assim, o peso não desce.'],
  ['cb2', 'cb', 'Mesmo de barriga cheia, ainda cabe mais um pouco.'],
  ['ef2', 'ef', 'Entre uma refeição e outra, preciso beliscar alguma coisa.'],
  ['em2', 'em', 'Fico tens@ ou nervos@ durante o dia.'],
  ['gl2', 'gl', 'Passo a maior parte do dia sentad@.'],
  ['cb3', 'cb', 'Para ficar satisfeit@, preciso de um prato maior que o das pessoas à minha volta.'],
  ['ef3', 'ef', 'Uma refeição completa me segura só por pouco tempo.'],
  ['em3', 'em', 'Num dia ruim, a comida é o que me acalma.'],
  ['gl3', 'gl', 'Sinto que perdi força ou músculo nos últimos anos.'],
];
const ESCALA = [['0', 'Quase nunca'], ['1', 'Às vezes'], ['2', 'Muitas vezes'], ['3', 'Quase sempre']];
const ESCALA_TXT = Object.fromEntries(ESCALA);
const frase = t => t.replace(/@/g, fem() ? 'a' : 'o');

// telas das 12 frases, geradas aqui (mesmo molde de .screen q); o interstício 2 e o "já tentou" entram depois da 6ª
(function montarItens(){
  const ancora = $('itens'), mais1 = document.querySelector('[data-s="mais1"]'), tentou = document.querySelector('[data-s="tentou"]'), frag = [];
  ITENS.forEach(([id], k) => {
    const s = document.createElement('section');
    s.className = 'screen q'; s.dataset.s = id; s.hidden = true;
    s.innerHTML = `<p class="nota">Quanto isso parece com você?</p><h2 class="frase" data-frase="${id}"></h2>
      <div class="opts escala" data-q="${id}">${ESCALA.map(([v, t]) => `<button type="button" class="opt" data-v="${v}">${t}</button>`).join('')}</div>`;
    frag.push(s);
    if (k === 5) frag.push(mais1, tentou);
  });
  ancora.replaceWith(...frag);
})();

const ROT = {
  tentou:{ dieta:'dieta da internet', low_carb:'cortar carboidrato', jejum:'jejum', academia:'academia ou corrida', nutri:'nutricionista', cha:'chá, shake ou suplemento', remedio:'remédio ou caneta', nenhum:'nenhum destes' },
  // para a frase "não se resolve só com …" (sem vírgula dentro do item, para a lista ler bem)
  so:{ dieta:'dieta da internet', low_carb:'cortar carboidrato', jejum:'jejum', academia:'academia', nutri:'dieta de nutricionista', cha:'chá ou shake', remedio:'remédio ou caneta' },
  objetivo:{ roupas:'voltar a usar as roupas que você gosta', nao_voltar:'parar de engordar tudo de novo', disposicao:'ter mais disposição no dia a dia', saude:'cuidar da saúde e dos exames', corpo:'se sentir bem com o seu corpo' },
  objetivoEu:{ roupas:'voltar a usar as roupas que eu gosto', nao_voltar:'parar de engordar tudo de novo', disposicao:'ter mais disposição no dia a dia', saude:'cuidar da saúde e dos exames', corpo:'me sentir bem com o meu corpo' },
};

// ---------- telas ----------
const ITEM_IDS = ITENS.map(([id]) => id);
const ORDEM = ['capa', 'idade', 'nome', 'medidas', 'mayo', ...ITEM_IDS.slice(0, 6), 'mais1', 'tentou', ...ITEM_IDS.slice(6), 'objetivo', 'carregando', 'resultado'];
const UM = [...ITEM_IDS, 'objetivo'];   // uma escolha (avança sozinho; o sexo está na capa)
// barra: todas as telas da capa ao resultado; valor = log(passo)/log(total) (Conrad 2010; Villar 2013; o mesmo do /pele/)
const BARRA = ORDEM.slice(0, ORDEM.indexOf('resultado') + 1);
const pBarra = s => { const i = BARRA.indexOf(s); return i < 0 ? null : Math.log(i + 2) / Math.log(BARRA.length + 1); };
const LIMITE = [0, (pBarra('mayo') + pBarra(ITEM_IDS[0])) / 2, (pBarra(ITEM_IDS[11]) + pBarra('objetivo')) / 2, 1];
(function montarBarra(){ [...$('barra').querySelectorAll('.b-trilho i')].forEach((el, k) => { el.style.flex = `${LIMITE[k + 1] - LIMITE[k]} 1 0`; }); })();
function pintarBarra(s){
  const p = pBarra(s); if (p == null) return;
  [...$('barra').querySelectorAll('.b-trilho i')].forEach((el, k) => {
    el.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, (p - LIMITE[k]) / (LIMITE[k + 1] - LIMITE[k]))) * 100) + '%';
  });
  window.__barra = Math.round(p * 100);
}

let cur = 'capa';
function show(s){
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.dataset.s !== s);
  cur = s;
  track('step_view', { stepId:s, stepIndex:ORDEM.indexOf(s) });
  $('back').classList.toggle('some', ['capa', 'carregando', 'resultado'].includes(s));
  pintarBarra(s);
  const cta = $('cta'), c2 = $('cta-2');
  $('cta-bar').hidden = ['capa', 'carregando', 'resultado'].includes(s);
  cta.hidden = false; c2.hidden = true; cta.classList.remove('off');
  cta.textContent = 'Continuar';
  document.querySelectorAll('.nm').forEach(el => { el.textContent = nome1() ? nomeBonito() + ', ' : ''; ajustarMaiuscula(el); });
  document.querySelectorAll('[data-frase]').forEach(el => { const it = ITENS.find(([id]) => id === el.dataset.frase); el.textContent = frase(it[2]); });
  if (s === 'idade') posicionar('idade');
  if (s === 'medidas') posicionar('peso', 'altura');
  if (s === 'nome'){ cta.classList.toggle('off', nome1().length < 2); c2.hidden = false; c2.textContent = 'Pular'; }
  if (UM.includes(s)) cta.classList.toggle('off', R[s] == null);
  if (s === 'tentou') cta.classList.toggle('off', !R.tentou.length);
  if (s === 'resultado'){ iniciarPrazo(); prepararFechamento(); }
  pintarPrazo();
  window.scrollTo(0, 0);
  requestAnimationFrame(medirBarra);
}
// "Ana, metade feita." com nome; "Metade feita." sem nome
function ajustarMaiuscula(el){
  const t = el.nextSibling; if (!t || t.nodeType !== 3) return;
  const s = t.textContent; if (!s) return;
  t.textContent = (nome1() ? s[0].toLocaleLowerCase('pt-BR') : s[0].toLocaleUpperCase('pt-BR')) + s.slice(1);
}
function medirBarra(){ const b = $('cta-bar'); document.documentElement.style.setProperty('--cta-h', (b.hidden ? 0 : b.offsetHeight) + 'px'); }
addEventListener('resize', medirBarra);
// com o teclado aberto (iPhone), o Continuar fica logo acima dele (o mesmo do /pele/, 09/11)
function acimaDoTeclado(){
  const vv = window.visualViewport; if (!vv) return;
  const a = document.activeElement, digitando = !!a && a.tagName === 'INPUT' && a.type === 'text';
  const kb = digitando ? Math.max(0, Math.round(document.documentElement.clientHeight - (vv.height + vv.offsetTop))) : 0;
  const on = kb > 60;
  document.documentElement.style.setProperty('--kb', (on ? kb : 0) + 'px');
  document.body.classList.toggle('teclado', on);
}
if (window.visualViewport){ visualViewport.addEventListener('resize', acimaDoTeclado); visualViewport.addEventListener('scroll', acimaDoTeclado); }
addEventListener('focusin', () => setTimeout(acimaDoTeclado, 60));
addEventListener('focusout', () => setTimeout(acimaDoTeclado, 60));
if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe($('cta-bar'));
function proxima(){ const s = ORDEM[ORDEM.indexOf(cur) + 1]; if (s === 'carregando') return calcular(); show(s); }
$('back').addEventListener('click', () => { const i = ORDEM.indexOf(cur) - 1; if (i >= 0) show(ORDEM[i]); });

// ---------- rodas de rolar (o mesmo componente do /pele/, /emagrecimento e /braco) ----------
// Começam num valor comum (ponto de partida, não é dado da pessoa) e não travam o Continuar; o evento diz se ela rolou.
const H = 44;
const como = {};   // chave → 'rolou' | 'confirmou'
function roda(id, de, ate){
  const w = $(id), itens = [], key = id.slice(2);
  for (let v = de; v <= ate; v++){
    const d = document.createElement('div'); d.textContent = v; d.id = `${id}-${v}`;
    d.setAttribute('role', 'option'); d.setAttribute('aria-selected', 'false'); w.appendChild(d); itens.push(d);
  }
  let mao = false, valor = null;
  const pick = () => {
    const i = Math.max(0, Math.min(itens.length - 1, Math.round(w.scrollTop / H)));
    if (valor === de + i) return;
    if (valor != null){ const a = itens[valor - de]; a.classList.remove('sel'); a.setAttribute('aria-selected', 'false'); }
    valor = de + i; itens[i].classList.add('sel'); itens[i].setAttribute('aria-selected', 'true');
    w.setAttribute('aria-activedescendant', itens[i].id);
    R[key] = valor;
    if (mao) como[key] = como[key] || 'rolou';
  };
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(ev => w.addEventListener(ev, () => { mao = true; }, { passive:true }));
  w.addEventListener('scroll', pick, { passive:true });
  w.addEventListener('keydown', e => {
    const passo = { ArrowDown:1, ArrowUp:-1, PageDown:10, PageUp:-10 }[e.key];
    if (passo){ e.preventDefault(); w.scrollTo({ top:(Math.max(de, Math.min(ate, valor + passo)) - de) * H, behavior:'smooth' }); }
    else if (e.key === 'Enter'){ e.preventDefault(); if (!como[key]) como[key] = 'confirmou'; $('cta').click(); }
  });
  itens.forEach((d, j) => d.addEventListener('click', () => {
    mao = true;
    if (de + j === valor){ if (!como[key]) como[key] = 'confirmou'; }
    else w.scrollTo({ top:j * H, behavior:'smooth' });
  }));
  return {
    get valor(){ return valor; },
    set(v){ mao = false; w.scrollTop = (Math.max(de, Math.min(ate, v)) - de) * H; pick(); },
    pronta: () => w.clientHeight > 0,
  };
}
const RODA = { idade:roda('w-idade', 18, 90), peso:roda('w-peso', 35, 250), altura:roda('w-altura', 130, 215) };
const PADRAO = { f:{ idade:40, peso:72, altura:162 }, m:{ idade:40, peso:88, altura:175 } };
function posicionar(...ks){
  const p = PADRAO[R.sexo] || PADRAO.f;
  requestAnimationFrame(() => ks.forEach(k => { if (RODA[k].pronta()) RODA[k].set(como[k] && R[k] != null ? R[k] : p[k]); }));
}

// ---------- nome (com Pular) ----------
$('nome').addEventListener('input', () => { R.nome = $('nome').value.replace(/[<>]/g, '').slice(0, 40); $('cta').classList.toggle('off', nome1().length < 2); });
$('nome').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('cta').click(); } });

// ---------- opções: uma escolha (avança sozinho) e várias (data-x = exclusiva, como "Ainda nenhum destes") ----------
function ligarOpcoes(box){
  const tela = box.closest('.screen')?.dataset.s;
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const q = box.dataset.q, v = b.dataset.v;
    if (box.dataset.tipo === 'varias'){
      const so = !!b.dataset.x, i = R[q].indexOf(v);
      if (i >= 0) R[q].splice(i, 1);
      else if (so) R[q] = [v];
      else { const fora = [...box.querySelectorAll('[data-x]')].map(x => x.dataset.v); R[q] = R[q].filter(x => !fora.includes(x)); R[q].push(v); }
      box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(R[q].includes(x.dataset.v))));
      $('cta').classList.toggle('off', !R[q].length);
      return;
    }
    R[q] = v;
    box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    track('answer', { stepId:q, valueText:v });
    $('cta').classList.remove('off');
    setTimeout(() => { if (cur === tela) proxima(); }, 260);
  });
}

// ---------- botões principais ----------
$('cta').addEventListener('click', () => {
  if ($('cta').classList.contains('off')){ if (cur === 'nome') $('nome').focus(); return; }
  if (cur === 'nome'){ R.nome = nomeBonito(); track('answer', { stepId:'nome', valueText:'ok' }); return proxima(); }
  if (cur === 'idade'){ track('answer', { stepId:'idade', valueText:String(R.idade), props:{ como:como.idade || 'padrao' } }); return proxima(); }
  if (cur === 'medidas'){ track('answer', { stepId:'medidas', valueText:'ok', props:{ peso:R.peso, altura:R.altura, como:{ peso:como.peso || 'padrao', altura:como.altura || 'padrao' } } }); return proxima(); }
  if (cur === 'tentou'){ track('answer', { stepId:'tentou', valueText:R.tentou.join('+') }); return proxima(); }
  if (UM.includes(cur) || ['mayo', 'mais1'].includes(cur)) return proxima();
});
$('cta-2').addEventListener('click', () => { if (cur === 'nome'){ R.nome = ''; $('nome').value = ''; track('answer', { stepId:'nome', valueText:'pulou' }); proxima(); } });

// =====================================================================
// PONTOS E RESULTADO. Regra de produto (não vem do estudo; não confirmado): cada tipo soma 0 a 9; "marcado" = 5 ou mais
// (média acima de "às vezes"). Principal = o de mais pontos. Dois tipos quando o 2º também está marcado e a 1 ponto do 1º
// (na Mayo, 27% tinham 2 ou mais). Nenhum marcado = "nenhum apareceu forte" e mostra o que mais apareceu (15% na Mayo).
// Empate no topo: os dois entram.
// =====================================================================
const CORTE = 5;
function pontuar(){
  const P = Object.fromEntries(ORDEM_TIPOS.map(t => [t, 0]));
  ITENS.forEach(([id, t]) => { P[t] += +(R[id] ?? 0); });
  const ord = [...ORDEM_TIPOS].sort((a, b) => P[b] - P[a] || ORDEM_TIPOS.indexOf(a) - ORDEM_TIPOS.indexOf(b));
  const top = P[ord[0]];
  let seus = ord.filter(t => P[t] >= CORTE && P[t] >= top - 1).slice(0, 2);
  const forte = seus.length > 0;
  if (!forte) seus = [ord[0]];
  const menor = ord[ord.length - 1];
  return { P, ord, seus, forte, menor };
}
// as frases dela que mais pesaram no tipo (para citar no resultado): as de "muitas vezes" ou "quase sempre", até n;
// se nenhuma chega a isso (nenhum tipo forte), as de "às vezes"
function frasesDela(t, n, min = 2){
  return ITENS.filter(([, tt]) => tt === t).map(([id, , f]) => ({ id, f, v:+(R[id] ?? 0) }))
    .filter(x => x.v >= min).sort((a, b) => b.v - a.v).slice(0, n);
}
function imc(){ return R.peso && R.altura ? Math.round(R.peso / (R.altura / 100) ** 2 * 10) / 10 : null; }

const PERIM = 326.7;
function progresso(p){ $('prog-c').style.strokeDashoffset = (PERIM * (1 - p / 100)).toFixed(1); $('prog-pct').textContent = `${Math.round(p)}%`; }
async function calcular(){
  const TIT = ['Lendo as suas respostas…', 'Somando o Cérebro faminto…', 'Somando o Estômago faminto…', 'Somando a Fome emocional…', 'Somando o Gasto lento…'];
  show('carregando'); progresso(0);
  const RAPIDO = Q.has('rapido') && LOCAL;   // teste automático
  let pct = 0, k = -1;
  await new Promise(res => { const t = setInterval(() => {
    pct = Math.min(100, pct + (RAPIDO ? 25 : 1.6)); progresso(pct);
    const kk = Math.min(TIT.length - 1, Math.floor(pct / (100 / TIT.length)));
    if (kk !== k){ k = kk; const el = $('prog-tit'); el.textContent = TIT[k]; el.classList.remove('troca'); void el.offsetWidth; el.classList.add('troca');
      [...$('prog-dots').children].forEach((d, i) => d.classList.toggle('on', i === k)); }
    if (pct >= 100){ clearInterval(t); res(); }
  }, RAPIDO ? 40 : 100); });
  await new Promise(res => setTimeout(res, RAPIDO ? 50 : 350));
  montarResultado();
  show('resultado');
}

function montarResultado(){
  RES = pontuar();
  const { P, seus, forte } = RES, nome = nomeBonito(), T = seus.map(t => TIPOS[t]), dois = seus.length === 2;
  const zero = P[seus[0]] === 0;
  // 1) as frases que ela marcou mais alto → "Isso tem cara de" + o tipo (22/11 v2, pedido do Lucca: "X mais Y mais Z tem cara de ser [tipo]")
  let fs = dois ? [...frasesDela(seus[0], 2), ...frasesDela(seus[1], 1)] : frasesDela(seus[0], 3);
  if (!fs.length && !zero) fs = frasesDela(seus[0], 2, 1);
  const lis = fs.map(x => `<li><q>${esc(frase(x.f))}</q> <em>${esc(ESCALA_TXT[R[x.id]].toLowerCase())}</em></li>`).join('');
  const abre = fs.length ? `<p class="nota">${nome ? esc(nome) + ', você' : 'Você'} marcou:</p><ul class="marcou">${lis}</ul>` : '';
  const cara = !forte ? (zero ? 'Nenhum dos 4 tipos apareceu nas suas respostas.' : 'Nenhum dos 4 apareceu forte. O que mais apareceu foi')
    : (fs.length ? 'Isso tem cara de' : 'O que mais apareceu foi');
  const nomes = dois ? `${esc(T[0].nome)} <span class="junto">junto com</span> ${esc(T[1].nome)}` : esc(T[0].nome);
  $('r-tipo').innerHTML = `${abre}<p class="cara">${cara}</p>
    ${zero ? '' : `<p class="nome${dois ? ' dois' : ''}">${nomes}</p><p class="linha2">${T.map(x => esc(x.linha2)).join(' · ')}</p>
    <p>${esc(frase(T[0].oque))}${dois ? ' ' + esc(frase(T[1].oque)) : ''}</p>`}`;

  // 2) não se resolve só com [o que ela já tentou] ou, se não tentou nada, com dieta e treino comuns
  const tent = R.tentou.filter(x => x !== 'nenhum').map(x => ROT.so[x]).filter(Boolean);
  const com = tent.length ? lista(tent) : 'dieta e treino comuns';
  const quem = cap(T[0].art + ' ' + T[0].curto.toLowerCase());
  $('r-caminho').innerHTML = zero || !forte
    ? `<p><b>Quando nenhum tipo aparece forte, vale olhar o seu caso com calma:</b> emagrecer não se resolve só com ${esc(com)}.</p>`
    : dois ? `<p><b>Cada um pede uma coisa diferente, e nenhum dos dois se resolve só com ${esc(com)}.</b></p>`
    : `<p><b>${esc(quem)} não se resolve só com ${esc(com)}.</b> ${esc(PQ[seus[0]])}</p>`;
  $('r-fonte').textContent = 'Estimativa pelas suas respostas, não é diagnóstico.';

  track('complete', { stepId:'resultado', stepIndex:ORDEM.indexOf('resultado'), valueText:seus.join('+'),
    props:{ codigo:meuCodigo(), tipo:seus[0], tipos:seus.join('+'), forte, pontos:P, imc:imc(), respostas:respostasLimpa() } });
}
function respostasLimpa(){ const { nome, ...r } = R; return { ...r, tentou:R.tentou.join('+'), nome:nomeBonito().slice(0, 40) }; }

// =====================================================================
// FECHAMENTO (molde do /pele/, 11/11 23h): o resultado é a tela final; o cartão verde tem UM botão (WhatsApp com a
// mensagem pronta e o código), o Direct embaixo e o prazo real de 30 min (decisão de 09/11).
// =====================================================================
const sou = () => nomeBonito() ? `Sou ${g('a', 'o')} ${nomeBonito()}. ` : '';
function mensagem(){
  const t = RES ? RES.seus.map(x => TIPOS[x].nome).join(' + ') : '';
  const obj = R.objetivo ? ` Meu objetivo é ${ROT.objetivoEu[R.objetivo]}.` : '';
  // nenhum forte: a mensagem diz o mesmo que a tela (v2, 22/11)
  const deu = !t ? '' : RES.forte ? ` Deu ${t}.` : RES.P[RES.seus[0]] === 0 ? ' Nenhum tipo apareceu forte.' : ` Nenhum tipo deu forte; o que mais apareceu foi ${t}.`;
  return `Oi, Dr. Lucca! ${sou()}Fiz o teste dos 4 tipos, código ${meuCodigo()}.${deu}${obj} Quero entender o meu tipo.\n${linhaPrazo()}`;
}
const linkWA = () => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem())}`;
function prepararFechamento(){
  const nome = nomeBonito(), dois = RES?.seus.length === 2;
  const tit = `quer uma estratégia para ${dois ? 'os seus dois tipos' : 'o seu tipo'}?`;
  $('r-ponte-tit').textContent = nome ? `${nome}, ${tit}` : cap(tit);
  const obj = R.objetivo ? ` para ${ROT.objetivo[R.objetivo]}` : '';
  $('r-ponte-txt').textContent = `Mande a mensagem pronta no WhatsApp. O Dr. Lucca analisa as suas respostas e te diz por onde começar${obj}.`;
  $('r-cta').href = linkWA();
}
const fimProps = () => ({ escolha:'explicar', codigo:meuCodigo(), tipo:RES?.seus.join('+') || null });

// PRAZO: o mesmo da pele, do braço e do emagrecimento (livowa_prazo pelo código LV; refazer em 24 h herda o início)
const PRAZO_MS = 30 * 60 * 1000, PRAZO_CHAVE = 'livowa_prazo', PRAZO_TESTE = 'tipos', PRAZO_HERDA = 24 * 3600 * 1000, PRAZO_GUARDA = 7 * 24 * 3600 * 1000;
function lerPrazos(){ try { const m = JSON.parse(localStorage.getItem(PRAZO_CHAVE) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; } }
function gravarPrazos(m){ try { localStorage.setItem(PRAZO_CHAVE, JSON.stringify(m)); } catch {} }
let prazoT0 = null, prazoIv = null;
function iniciarPrazo(){
  const m = lerPrazos(), c = meuCodigo(), agora = Date.now();
  if (+m[c]?.t) prazoT0 = +m[c].t;
  else {
    if (prazoT0 == null){
      const ult = Object.values(m).filter(x => x && x.teste === PRAZO_TESTE && +x.t && agora - x.t < PRAZO_HERDA).sort((a, b) => b.t - a.t)[0];
      prazoT0 = ult ? +ult.t : agora;
    }
    for (const k of Object.keys(m)) if (!(agora - (+m[k]?.t || 0) < PRAZO_GUARDA)) delete m[k];
    m[c] = { t:prazoT0, teste:PRAZO_TESTE }; gravarPrazos(m);
  }
  clearInterval(prazoIv); prazoIv = setInterval(pintarPrazo, 1000);
}
function prazoResta(){ const t = +lerPrazos()[codigo]?.t || prazoT0; return t ? Math.max(0, t + PRAZO_MS - Date.now()) : null; }
function noPrazo(){ const r = prazoResta(); return r == null || r > 0; }
function linhaPrazo(){ return noPrazo() ? '(enviado no prazo da análise sem custo)' : '(enviado depois do prazo)'; }
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function pintarPrazo(){
  const r = prazoResta(), ok = r == null || r > 0;
  $('r-prazo').hidden = cur !== 'resultado' || r == null;
  if (r == null) return;
  $('r-prazo').classList.toggle('acabou', !ok);
  const txt = ok ? 'Análise sem custo se enviar nos próximos' : 'O prazo da análise sem custo acabou. Você ainda pode enviar: o Dr. Lucca te responde como fica.';
  if ($('r-prazo-txt').textContent !== txt) $('r-prazo-txt').textContent = txt;
  $('r-prazo-rel').hidden = !ok; $('r-prazo-rel').textContent = ok ? mmss(r) : '';
  if (cur === 'resultado') $('r-cta').href = linkWA();
}
$('r-cta').addEventListener('click', () => { $('r-cta').href = linkWA(); track('cta_click', { stepId:'resultado', valueText:'explicar', props:{ canal:'whatsapp', noPrazo:noPrazo(), ...fimProps() } }); });
$('cta-dm').addEventListener('click', e => abrirDirect(e));

// Direct: o Instagram não aceita texto pronto. Copia DENTRO do toque (exigência do iOS), avisa e deixa o link abrir o app.
function copiar(txt){
  let ok = false;
  try { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(t); t.select(); t.setSelectionRange(0, txt.length); ok = document.execCommand('copy'); t.remove(); } catch {}
  try { navigator.clipboard?.writeText(txt).catch(() => {}); } catch {}
  return ok;
}
let toastT = null;
const NO_INSTAGRAM = /Instagram/i.test(navigator.userAgent);
function abrirDirect(e){
  const txt = mensagem(), copiou = copiar(txt);
  track('cta_click', { stepId:'resultado', valueText:'explicar', props:{ canal:'direct', copiou, noInstagram:NO_INSTAGRAM, noPrazo:noPrazo(), ...fimProps() } });
  if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem:txt, copiou, voz:false }); return; }
  if (copiou){ $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 6000); return; }
  e.preventDefault();
  $('aviso-msg').textContent = txt; $('aviso-link').href = $('cta-dm').href; $('aviso-dm').hidden = false;
}
$('aviso-dm').addEventListener('click', ev => { if (ev.target === $('aviso-dm')) $('aviso-dm').hidden = true; });
$('aviso-link').addEventListener('click', () => { track('cta_click', { stepId:'resultado', valueText:'explicar|abrir', props:{ canal:'direct', ...fimProps() } }); setTimeout(() => { $('aviso-dm').hidden = true; }, 800); });

// ---------- início ----------
document.querySelectorAll('.opts[data-q]').forEach(ligarOpcoes);
// capa: o sexo avança sozinho (como no /pele/)
show('capa');
// ganchos do teste automático (headless)
window.__tipos = { R, estado:() => ({ cur, codigo, res:RES, barra:window.__barra }), show, mensagem, pontuar, ORDEM };
