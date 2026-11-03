// livowa.com/emagrecimento · teste do emagrecimento no padrão da pele2 (02/11/2026).
// Pesquisa, perguntas e fontes: livowa-empresa/tarefas/emagrecimento-teste/pesquisa.md.
// Regras: sem promessa de resultado e sem número sem fonte (todo estudo citado foi conferido no PubMed em 02/11);
// sem "grátis" nem "consulta"; não indica remédio nem marca; IMC e cintura/altura como estimativa (OMS e NICE NG246).
// UMA pergunta decide o perfil do resultado: "acontece" (VT p.92). As outras personalizam as linhas do resultado.
import * as A0 from '/idade/funnel-analytics.js';
import { dicaDirect } from '/assets/js/dica-direct.js?v=3';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const Q = new URLSearchParams(location.search);

// ---------- medição (mesmo Supabase dos outros testes; a Caixa lê o código no complete e o canal no cta_click) ----------
const SUPA_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SUPA_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública
// 03/11: ponte da bio (/assets/js/ponte.js): props.ponte sim|nao em todos os eventos de quem veio da bio; a linha entra na capa
const PONTE = window.lvPonte?.props?.() || {};
const Analytics = { ...A0, track:(tipo, o = {}) => A0.track(tipo, { ...o, props:{ ...(o.props || {}), ...PONTE } }) };
Analytics.init({ enabled:true, funnelId:'teste-emagrecimento', variant:Q.get('v') || 'direto', supabaseUrl:SUPA_URL, supabaseKey:SUPA_KEY });
Analytics.track('view');
const WHATSAPP = '5562991774809';

const R = { tentou:[] };   // respostas
let codigo = null;
const ALFA = 'ACDEFGHJKMNPQRTUVWXY34679';
function meuCodigo(){ if (!codigo){ const a = crypto.getRandomValues(new Uint8Array(4)); codigo = 'LV-' + [...a].map(x => ALFA[x % ALFA.length]).join(''); } return codigo; }

const ROT = {   // rótulos curtos das respostas (tela, analytics e Caixa)
  sexo:{ f:'mulher', m:'homem' },
  fase:{ nenhuma:'nenhuma', gravida:'grávida', amamentando:'amamentando', pos_parto:'bebê há menos de 1 ano' },
  idade:{ '18a29':'18 a 29 anos', '30a39':'30 a 39 anos', '40a49':'40 a 49 anos', '50a59':'50 a 59 anos', '60mais':'60 anos ou mais' },
  cintura:{ sei:'mediu', sem_fita:'sem fita' },
  acontece:{ volta:'Eu emagreço, mas depois engordo tudo de novo', vontade:'A vontade de comer vence, principalmente de doce', balanca:'Faço tudo certo e a balança não desce', constancia:'Começo e paro em poucas semanas', comeco:'Ainda não sei por onde começar' },
  tentou:{ dieta:'dieta da internet', low_carb:'cortar carboidrato', jejum:'jejum intermitente', academia:'academia ou corrida', nutri:'nutricionista', cha:'chá, shake ou suplemento', remedio:'remédio para emagrecer', nenhum:'nenhum destes' },
  vontade:{ noite:'à noite', tarde:'à tarde', ansiedade:'na ansiedade', fim_semana:'no fim de semana', dia_todo:'o dia todo', pouco:'quase não atrapalha' },
  sono:{ '5menos':'5 h ou menos', '6':'6 h', '7':'7 h', '8':'8 h', '9mais':'9 h ou mais' },
  forca:{ '0':'ainda não faz', '1':'1 vez por semana', '2mais':'2 vezes ou mais' },
  proteina:{ '1menos':'em 1 refeição ou menos', '2':'em 2 refeições', '3mais':'em 3 refeições ou mais' },
  objetivo:{ roupas:'Voltar a usar as roupas que eu gosto', nao_voltar:'Parar de engordar tudo de novo', disposicao:'Ter mais disposição no dia a dia', saude:'Cuidar da saúde e dos exames', corpo:'Me sentir bem com o meu corpo', outro:'O que você me contar' },
};
const nome1 = () => (R.nome || '').trim().split(/\s+/)[0] || '';
function nomeBonito(){ const n = nome1(); return n ? n[0].toLocaleUpperCase('pt-BR') + n.slice(1) : ''; }
const g = (fem, masc) => R.sexo === 'm' ? masc : fem;
const gravida = () => R.fase === 'gravida';
const lista = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1];
const num = (x, d = 1) => x.toLocaleString('pt-BR', { minimumFractionDigits:d, maximumFractionDigits:d });

// ---------- telas ----------
const ORDEM = ['capa','sexo','fase','idade','nome','medidas','cintura','acontece','tentou','vontade','sono','forca','proteina','objetivo','carregando','resultado','fechar'];
const QUIZ = ['sexo','fase','idade','acontece','vontade','sono','forca','proteina','objetivo'];
const VOLTA = { fechar:'resultado' };
let cur = 'capa';
// homem não vê a fase; grávida não faz peso/altura/cintura (o teste não calcula IMC na gestação)
const pula = s => (s === 'fase' && R.sexo === 'm') || (['medidas','cintura'].includes(s) && gravida());
function show(s){
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.dataset.s !== s);
  cur = s;
  Analytics.track('step_view', { stepId:s, stepIndex:ORDEM.indexOf(s) });
  $('top').hidden = ['capa','carregando','resultado'].includes(s);
  const cta = $('cta');
  $('cta-bar').hidden = ['carregando','fechar'].includes(s);
  cta.hidden = false; cta.classList.remove('off');
  cta.textContent = 'Continuar';
  if (s === 'capa') cta.textContent = 'Começar o teste';
  if (s === 'nome') cta.classList.toggle('off', nome1().length < 2);
  if (s === 'medidas') posicionar(['peso', 'altura']);
  if (s === 'cintura'){ posicionar(['cintura']); cta.classList.toggle('off', !mexeu.cintura); }
  if (s === 'tentou') cta.classList.toggle('off', !R.tentou.length);
  if (QUIZ.includes(s)) cta.classList.toggle('off', R[s] == null);
  if (s === 'resultado') cta.textContent = 'Quero que o Dr. Lucca me explique';   // um botão só (02/11: o link "seguir sozinho + lembrete em 4 semanas" saiu)
  if (s === 'fechar') prepararFechamento();
  document.querySelectorAll('.nm').forEach(el => { el.textContent = nome1() ? nomeBonito() + ', ' : ''; });
  $('txt-constancia').textContent = `Começo ${g('animada', 'animado')} e paro em poucas semanas`;
  $('txt-ansiosa').textContent = `Quando fico ${g('ansiosa', 'ansioso')} ou ${g('preocupada', 'preocupado')}`;
  window.scrollTo(0, 0);
  requestAnimationFrame(medirBarra);
}
function medirBarra(){ const b = $('cta-bar'); document.documentElement.style.setProperty('--cta-h', (b.hidden ? 0 : b.offsetHeight) + 'px'); }
addEventListener('resize', medirBarra);
if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe($('cta-bar'));
// homem: a fase fica "nenhuma" sozinha; se voltar e trocar para mulher, a pergunta volta
function ajustarFase(){
  if (R.sexo === 'm'){ if (R.fase == null){ R.fase = 'nenhuma'; R.faseAuto = true; Analytics.track('answer', { stepId:'fase', valueText:'nenhuma' }); } }
  else if (R.faseAuto){ delete R.fase; delete R.faseAuto; document.querySelectorAll('[data-q="fase"] [data-v]').forEach(x => x.setAttribute('aria-pressed', 'false')); }
}
function proxima(){ ajustarFase(); let i = ORDEM.indexOf(cur) + 1; while (pula(ORDEM[i])) i++; if (ORDEM[i] === 'carregando') return calcular(); show(ORDEM[i]); }
$('back').addEventListener('click', () => {
  if (VOLTA[cur]) return show(VOLTA[cur]);
  let i = ORDEM.indexOf(cur) - 1; while (i > 0 && pula(ORDEM[i])) i--; if (i >= 0) show(ORDEM[i]);
});

// ---------- nome ----------
$('nome').addEventListener('input', () => { R.nome = $('nome').value.replace(/[<>]/g, '').slice(0, 40); $('cta').classList.toggle('off', nome1().length < 2); });
$('nome').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('cta').click(); } });

// ---------- peso, altura e cintura: rodas de rolar (03/11) ----------
// Mesmo componente das rodas de /idade e /braco (faixa do meio, snap a cada número), com teclado e leitor de tela.
// Peso e altura: começam num valor comum para o sexo marcado e NÃO travam o Continuar (decisão do Lucca nas pernas,
// 02/11: "deixar como está"); o evento diz se a pessoa rolou cada número ('rolou') ou deixou como veio ('padrao').
// Cintura: é opcional, então só vale se a pessoa mexer na roda; senão o Continuar fica apagado e "Pular" segue com o IMC.
const H = 44;
const mexeu = {};   // chave → 'rolou' | 'confirmou'
function roda(id, de, ate, aoMexer){
  const w = $(id), itens = [], key = id.slice(2);
  for (let v = de; v <= ate; v++){
    const d = document.createElement('div'); d.textContent = v; d.id = `${id}-${v}`;
    d.setAttribute('role', 'option'); d.setAttribute('aria-selected', 'false'); w.appendChild(d); itens.push(d);
  }
  let mao = false, valor = null;   // mao: o rolar veio da pessoa (dedo, mouse, teclado), não do posicionamento inicial
  const pick = () => {
    const i = Math.max(0, Math.min(itens.length - 1, Math.round(w.scrollTop / H)));
    if (valor === de + i) return;
    if (valor != null){ const a = itens[valor - de]; a.classList.remove('sel'); a.setAttribute('aria-selected', 'false'); }
    valor = de + i; itens[i].classList.add('sel'); itens[i].setAttribute('aria-selected', 'true');
    w.setAttribute('aria-activedescendant', itens[i].id);
    if (mao){ mexeu[key] = mexeu[key] || 'rolou'; aoMexer?.(); }
  };
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(ev => w.addEventListener(ev, () => { mao = true; }, { passive:true }));
  w.addEventListener('scroll', pick, { passive:true });
  w.addEventListener('keydown', e => {
    const passo = { ArrowDown:1, ArrowUp:-1, PageDown:10, PageUp:-10 }[e.key];
    if (passo){ e.preventDefault(); w.scrollTo({ top:(Math.max(de, Math.min(ate, valor + passo)) - de) * H, behavior:'smooth' }); }
    else if (e.key === 'Home' || e.key === 'End'){ e.preventDefault(); w.scrollTo({ top:(e.key === 'Home' ? 0 : ate - de) * H, behavior:'smooth' }); }
    else if (e.key === 'Enter'){ e.preventDefault(); if (valor != null && !mexeu[key]){ mexeu[key] = 'confirmou'; aoMexer?.(); } $('cta').click(); }
  });
  // tocar num número leva até ele; tocar no número do meio confirma o valor que já está ali
  itens.forEach((d, j) => d.addEventListener('click', () => {
    mao = true;
    if (de + j === valor){ if (!mexeu[key]){ mexeu[key] = 'confirmou'; aoMexer?.(); } }
    else w.scrollTo({ top:j * H, behavior:'smooth' });
  }));
  return {
    get valor(){ return valor; },
    set(v){ mao = false; w.scrollTop = (Math.max(de, Math.min(ate, v)) - de) * H; pick(); },
    pronta: () => w.clientHeight > 0,
  };
}
const RODA = {
  peso: roda('w-peso', 35, 250, () => { R.peso = RODA.peso.valor; }),
  altura: roda('w-altura', 130, 215, () => { R.altura = RODA.altura.valor; }),
  cintura: roda('w-cintura', 50, 170, atualizarCintura),   // R.cinturaCm só no Continuar
};
// ponto de partida das rodas (não é dado da pessoa): valores comuns de adulto por sexo
const PADRAO = { f:{ peso:70, altura:162, cintura:85 }, m:{ peso:85, altura:175, cintura:95 } };
function posicionar(chaves){   // display:none perde a rolagem: ao mostrar a tela, cada roda volta ao seu número
  const p = PADRAO[R.sexo] || PADRAO.f;
  requestAnimationFrame(() => chaves.forEach(k => {
    if (!RODA[k].pronta()) return;
    RODA[k].set(mexeu[k] && RODA[k].valor != null ? RODA[k].valor : p[k]);   // sem mexer: segue o sexo marcado
    if (k !== 'cintura') R[k] = RODA[k].valor;
  }));
}
function atualizarCintura(){
  if (cur !== 'cintura') return;
  $('cta').classList.toggle('off', !mexeu.cintura);
  const d = $('dica-cintura'); d.classList.remove('erro');
  d.textContent = mexeu.cintura ? `Cintura: ${RODA.cintura.valor} cm` : 'Arraste até a sua medida.';
}
$('pular-cintura').addEventListener('click', () => {
  R.cintura = 'sem_fita'; delete R.cinturaCm;
  Analytics.track('answer', { stepId:'cintura', valueText:'sem_fita' });
  proxima();
});

// ---------- opções: uma escolha (avança sozinho) e várias ("tentou") ----------
function ligarOpcoes(box){
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const q = box.dataset.q, v = b.dataset.v;
    if (box.dataset.tipo === 'varias'){
      const i = R.tentou.indexOf(v);
      if (i >= 0) R.tentou.splice(i, 1);
      else if (v === 'nenhum') R.tentou = ['nenhum'];   // "Ainda nenhum destes" é exclusiva
      else { R.tentou = R.tentou.filter(x => x !== 'nenhum'); R.tentou.push(v); }
      box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(R.tentou.includes(x.dataset.v))));
      $('cta').classList.toggle('off', !R.tentou.length);
      return;
    }
    R[q] = v; if (q === 'fase') delete R.faseAuto;
    box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    Analytics.track('answer', { stepId:q, valueText:v });
    $('cta').classList.remove('off');
    setTimeout(() => { if (cur === q) proxima(); }, 260);
  });
}

// ---------- botões principais ----------
$('cta').addEventListener('click', () => {
  if ($('cta').classList.contains('off')){
    if (cur === 'nome') return $('nome').focus();
    if (cur === 'cintura'){ const d = $('dica-cintura'); d.textContent = 'Arraste a roda até a sua medida, ou toque em Pular.'; d.classList.add('erro'); return $('w-cintura').focus(); }
    return;
  }
  if (cur === 'capa') return proxima();
  if (cur === 'nome'){ R.nome = nomeBonito(); Analytics.track('answer', { stepId:'nome', valueText:'ok' }); return proxima(); }
  if (cur === 'medidas'){
    R.peso = RODA.peso.valor; R.altura = RODA.altura.valor;
    Analytics.track('answer', { stepId:'medidas', valueText:'ok', props:{ peso:R.peso, altura:R.altura, como:{ peso:mexeu.peso || 'padrao', altura:mexeu.altura || 'padrao' } } });
    return proxima();
  }
  if (cur === 'cintura'){
    R.cintura = 'sei'; R.cinturaCm = RODA.cintura.valor;
    Analytics.track('answer', { stepId:'cintura', valueText:'mediu', props:{ cintura:R.cinturaCm, como:mexeu.cintura } });
    return proxima();
  }
  if (cur === 'tentou'){ Analytics.track('answer', { stepId:'tentou', valueText:R.tentou.join('+') }); return proxima(); }
  if (QUIZ.includes(cur)) return proxima();
  if (cur === 'resultado'){ Analytics.track('cta_click', { stepId:'resultado', valueText:'explicar' }); return show('fechar'); }
});

// =====================================================================
// MEDIDAS: IMC (OMS; classes da NICE NG246 rec. 1.9.10) e cintura/altura (NICE NG246, 2022). Estimativa, não diagnóstico.
// =====================================================================
const FAIXAS = [   // [de, até, nome, zona da barra]
  [0, 18.5, 'abaixo do peso', 0], [18.5, 25, 'peso saudável', 1], [25, 30, 'sobrepeso', 2],
  [30, 35, 'obesidade classe 1', 3], [35, 40, 'obesidade classe 2', 4], [40, 99, 'obesidade classe 3', 5],
];
function medidas(){
  if (gravida() || !R.peso || !R.altura) return null;
  const imc = Math.round(R.peso / (R.altura / 100) ** 2 * 10) / 10, f = FAIXAS.find(([a, b]) => imc >= a && imc < b);   // a faixa sai do número mostrado (29,98 → 30,0 → classe 1)
  const rc = R.cinturaCm ? R.cinturaCm / R.altura : null;
  const rcFaixa = rc == null ? null : rc < .5 ? 0 : rc < .6 ? 1 : 2;
  return { imc, faixa:f[2], zona:f[3], de:f[0], ate:f[1], rc:rc == null ? null : Math.round(rc * 100) / 100, rcFaixa };
}

// =====================================================================
// FONTES (todas conferidas no PubMed ou no site oficial em 02/11/2026; ver pesquisa.md §4)
// =====================================================================
const F = {
  oms:['OMS, "Obesity and overweight" (2026)', 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight'],
  nice:['NICE, diretriz NG246 (2022/2025): IMC e cintura/altura', 'https://www.nice.org.uk/guidance/ng246'],
  ashwell:['Ashwell 2012, Obes Rev: cintura/altura × IMC', 'https://doi.org/10.1111/j.1467-789X.2011.00952.x'],
  polidori:['Polidori 2016, Obesity: a vontade de comer depois de perder peso', 'https://doi.org/10.1002/oby.21653'],
  tasali:['Tasali 2022, JAMA Intern Med: dormir mais e comer menos', 'https://doi.org/10.1001/jamainternmed.2021.8098'],
  nedeltcheva:['Nedeltcheva 2010, Ann Intern Med: sono curto na dieta', 'https://doi.org/10.7326/0003-4819-153-7-201010050-00006'],
  watson:['Watson 2015, Sleep: 7 horas ou mais (AASM e SRS)', 'https://doi.org/10.5665/sleep.4716'],
  oms_at:['Bull 2020, diretriz da OMS de atividade física', 'https://doi.org/10.1136/bjsports-2020-102955'],
  wewege:['Wewege 2022, Sports Med: força e gordura (58 estudos)', 'https://doi.org/10.1007/s40279-021-01562-2'],
  leidy:['Leidy 2015, Am J Clin Nutr: proteína no emagrecimento', 'https://doi.org/10.3945/ajcn.114.084038'],
  kreitzman:['Kreitzman 1992, Am J Clin Nutr: glicogênio e água', 'https://doi.org/10.1093/ajcn/56.1.292S'],
  turicchi:['Turicchi 2020, PLoS One: o peso dentro da semana', 'https://doi.org/10.1371/journal.pone.0232152'],
  franz:['Franz 2007, J Am Diet Assoc: 80 estudos de emagrecimento', 'https://doi.org/10.1016/j.jada.2007.07.017'],
  dansinger:['Dansinger 2005, JAMA: 4 dietas por 1 ano', 'https://doi.org/10.1001/jama.293.1.43'],
};
const usadas = new Set();
const fonte = (...ks) => { ks.forEach(k => usadas.add(k)); return `<p class="fonte">Fonte: ${ks.map(k => esc(F[k][0].split(':')[0])).join('; ')}</p>`; };

// =====================================================================
// CARREGAMENTO em etapas que citam as respostas
// =====================================================================
const PERIM = 326.7;
function progresso(p, etapa){
  $('prog-c').style.strokeDashoffset = (PERIM * (1 - p/100)).toFixed(1);
  $('prog-pct').innerHTML = `${Math.round(p)}<small>%</small>`;
  if (etapa != null){ $('prog-etapa').textContent = etapa.txt; [...$('prog-dots').children].forEach((d, i) => d.classList.toggle('on', i === etapa.i)); }
}
const FORCA_CURTA = { '0':'ainda sem treino de força', '1':'força 1 vez por semana', '2mais':'força 2 vezes ou mais' };
const ACONTECE_CURTO = { volta:'emagrece e engorda de novo', vontade:'a vontade de comer vence', balanca:'a balança não desce', constancia:'começa e para', comeco:'ainda não sabe por onde começar' };
async function calcular(){
  const m = medidas();
  const ETAPAS = [
    { i:0, ate:24, txt:m ? `Calculando seu IMC: ${num(R.altura / 100, 2)} m e ${num(R.peso, R.peso % 1 ? 1 : 0)} kg` : 'Lendo as suas respostas' },
    { i:1, ate:52, txt:`Cruzando com o que você contou: ${ROT.sono[R.sono]} de sono, ${FORCA_CURTA[R.forca]}` },
    { i:2, ate:82, txt:`Lendo o que mais acontece: ${ACONTECE_CURTO[R.acontece]}` },
    { i:3, ate:100, txt:'Montando seu resultado' },
  ];
  show('carregando'); progresso(0, ETAPAS[0]);
  const etapaDe = p => ETAPAS.find(e => p <= e.ate) || ETAPAS[3];
  let pct = 0;
  const RAPIDO = Q.has('rapido') && ['localhost', '127.0.0.1'].includes(location.hostname);   // teste automático
  await new Promise(res => { const t = setInterval(() => { pct = Math.min(100, pct + (RAPIDO ? 25 : 1.7)); progresso(pct, etapaDe(pct)); if (pct >= 100){ clearInterval(t); res(); } }, RAPIDO ? 40 : 110); });
  await new Promise(res => setTimeout(res, RAPIDO ? 50 : 350));
  montarResultado();
  show('resultado');
}

// =====================================================================
// RESULTADO: medidas → o que mais pesa (perfil) → o que as respostas mostram → o que fazer agora → botão do médico.
// Toda frase que depende de resposta cita a resposta ("Você contou…", "Você dorme…").
// =====================================================================
const PERFIL = {
  volta:'o peso que volta', vontade:'a vontade de comer', balanca:'a balança que não mostra tudo',
  constancia:'manter por mais de algumas semanas', comeco:'saber por onde começar',
};
const sonoCurto = () => ['5menos','6'].includes(R.sono);
function montarResultado(){
  usadas.clear();
  const m = medidas(), nome = nomeBonito(), tent = R.tentou.filter(x => x !== 'nenhum');
  const nDietas = tent.filter(x => ['dieta','low_carb','jejum'].includes(x)).length;
  $('r-data').textContent = new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
  $('r-tit').innerHTML = `${nome ? esc(nome) + ', o' : 'O'} que mais pesa no seu caso: <em>${esc(PERFIL[R.acontece])}</em>`;

  // fase
  $('r-fase').innerHTML = gravida() ? '<p class="nota-fase">Você contou que está grávida. Na gestação, este teste não calcula IMC nem cintura e não sugere dieta para emagrecer: cada mudança passa pelo seu pré-natal.</p>'
    : ['amamentando','pos_parto'].includes(R.fase) ? `<p class="nota-fase">Você contou que ${R.fase === 'amamentando' ? 'está amamentando' : 'teve bebê há menos de 1 ano'}. O corpo ainda está mudando: leia os números abaixo como ponto de partida, sem dieta apertada.</p>` : '';

  // medidas
  let mh = '';
  if (m){
    const pos = Math.max(0, Math.min(100, (m.imc - 15) / 30 * 100));
    const faixaTxt = m.zona === 0 ? 'abaixo de 18,5' : m.zona === 5 ? 'a partir de 40' : `de ${num(m.de)} a ${num(m.ate - .1)}`;
    mh += `<div class="metrica"><div class="mt"><small>Seu IMC</small><span class="val">${num(m.imc)}<i>kg/m²</i></span></div>
      <div class="barra" aria-hidden="true"><span class="z0" style="flex:3.5"></span><span class="z1" style="flex:6.5"></span><span class="z2" style="flex:5"></span><span class="z3" style="flex:5"></span><span class="z4" style="flex:5"></span><span class="z5" style="flex:5"></span><i class="pino" style="left:${pos.toFixed(1)}%"></i><span class="rotulos">${[18.5, 25, 30, 35, 40].map(v => `<em style="left:${((v - 15) / 30 * 100).toFixed(1)}%">${num(v, v % 1 ? 1 : 0)}</em>`).join('')}</span></div>
      <p>Com ${num(R.peso, R.peso % 1 ? 1 : 0)} kg e ${num(R.altura / 100, 2)} m, o seu IMC fica na faixa <b>${esc(m.faixa)}</b> (${faixaTxt}), pelas faixas da OMS e da NICE. O IMC não separa músculo de gordura: é um ponto de partida.</p>${fonte('oms', 'nice')}</div>`;
    if (m.rc != null){
      const t = ['abaixo de 0,5: dentro da meta', 'entre 0,5 e 0,59: risco aumentado para a saúde', '0,6 ou mais: risco mais aumentado para a saúde'][m.rcFaixa];
      mh += `<div class="metrica"><div class="mt"><small>Cintura ÷ altura</small><span class="val">${num(m.rc, 2)}</span></div>
        <p>Sua cintura de ${R.cinturaCm} cm dividida pela altura dá <b>${num(m.rc, 2)}</b>, ${esc(t)}. A meta da NICE é a cintura ficar abaixo da metade da altura (menos de 0,5); ela mostra risco melhor que o IMC sozinho.${m.imc >= 35 ? ' Com IMC a partir de 35, a NICE usa o IMC como régua principal.' : ''}</p>${fonte('nice', 'ashwell')}</div>`;
    } else {
      mh += `<div class="metrica"><div class="mt"><small>Cintura ÷ altura</small><span class="val" style="font-size:1.3rem">sem fita</span></div>
        <p>Você contou que está sem fita agora. Quando medir, divida pela altura (${R.altura} cm): a meta da NICE é ficar abaixo de 0,5, ou seja, cintura menor que ${Math.floor(R.altura / 2)} cm.</p>${fonte('nice')}</div>`;
    }
  }
  $('r-metricas').innerHTML = mh;

  // o que mais pesa (o perfil decidido pela pergunta "acontece")
  const fraco = [sonoCurto() && 'o sono', R.forca !== '2mais' && 'a força', R.proteina !== '3mais' && 'a proteína'].filter(Boolean);
  const cintH = m?.rc != null ? ` A sua hoje: ${R.cinturaCm} cm.` : gravida() ? '' : ' Vale medir a sua.';
  const P = {
    volta:[`Isso tem explicação. Quando o peso cai, o corpo aumenta a vontade de comer: cerca de 100 calorias a mais por dia para cada quilo perdido, mais de 3 vezes o quanto o gasto de energia cai. Não é falta de força de vontade: é o corpo puxando de volta para o peso de antes.`, ['polidori']],
    vontade:[`A vontade de comer não é só cabeça, e o sono pesa nela: adultos que dormiam menos de 6,5 h e passaram a dormir 1,2 h a mais por noite comeram 270 calorias a menos por dia, sem dieta.${sonoCurto() ? ` Você dorme ${ROT.sono[R.sono]}.` : ` Você dorme ${ROT.sono[R.sono]}, então o próximo passo é ver em que hora e depois de quê ela aparece.`}`, ['tasali']],
    balanca:[`A balança pesa tudo junto: água, gordura e músculo. O estoque de energia do músculo e do fígado (glicogênio) é guardado com 3 a 4 partes de água, e o peso oscila sozinho dentro da semana. Além disso, com dieta, o peso costuma parar de cair por volta do 6º mês. Por isso a cintura diz mais que a balança.${cintH}`, ['kreitzman', 'turicchi', 'franz']],
    constancia:[`Comparando 4 dietas famosas por 1 ano, o peso perdido acompanhou o quanto a pessoa conseguiu manter a dieta, e não o tipo de dieta. O melhor plano é o que cabe na sua rotina.${tent.length >= 2 ? ` Você já tentou ${tent.length} caminhos: o que faltou pode não ter sido o caminho.` : ''}`, ['dansinger']],
    comeco:[`O começo mais seguro é saber onde você está${m ? ` (o IMC${m.rc != null ? ' e a cintura' : ''} acima)` : ''} e mexer primeiro no que mais pesa nas suas respostas${fraco.length ? `: ${lista(fraco)}` : ''}. Uma coisa de cada vez.`, []],
  }[R.acontece];
  $('r-perfil').innerHTML = `<small>Por que isso acontece</small><p>Você contou: “${esc(R.acontece === 'constancia' ? `Começo ${g('animada', 'animado')} e paro em poucas semanas` : ROT.acontece[R.acontece])}”.</p><p>${esc(P[0])}</p>${P[1].length ? fonte(...P[1]) : ''}`;

  // o que as respostas mostram (uma linha por resposta, cada uma citando a resposta)
  const L = [];   // [titulo, selo, classe, texto, fontes]
  if (sonoCurto()) L.push(['Sono', 'Vale olhar', 'parcial', `Você dorme ${ROT.sono[R.sono]}. Dormir pouco atrapalha quem tenta emagrecer: numa dieta, quem dormiu 5 h e meia em vez de 8 h e meia perdeu 55% menos gordura e teve mais vontade de comer.`, ['nedeltcheva']]);
  else L.push(['Sono', 'A favor', 'forte', `Você dorme ${ROT.sono[R.sono]}: dentro das 7 horas ou mais por noite recomendadas para adultos.`, ['watson']]);
  if (R.forca === '0') L.push(['Força', 'Vale olhar', 'parcial', `Você contou que ainda não faz exercício de força. A OMS recomenda força em 2 dias ou mais por semana, e o treino de força reduz gordura, inclusive a da barriga.`, ['oms_at', 'wewege']]);
  else if (R.forca === '1') L.push(['Força', 'Vale olhar', 'parcial', `Você faz força 1 vez por semana. A OMS recomenda 2 dias ou mais: falta um.`, ['oms_at']]);
  else L.push(['Força', 'A favor', 'forte', `Você faz força 2 vezes ou mais por semana, como a OMS recomenda. O treino de força reduz gordura, inclusive a da barriga.`, ['oms_at', 'wewege']]);
  if (R.proteina === '3mais') L.push(['Proteína', 'A favor', 'forte', `Você contou que a proteína entra em 3 refeições ou mais. Na dieta para emagrecer, mais proteína dá mais saciedade e ajuda a manter o músculo.`, ['leidy']]);
  else L.push(['Proteína', 'Vale olhar', 'parcial', `Você contou que a proteína entra ${ROT.proteina[R.proteina]}. Na dieta para emagrecer, mais proteína dá mais saciedade e ajuda a manter o músculo; os estudos falam em cerca de 25 a 30 g por refeição.`, ['leidy']]);
  const vt = {
    noite:[`Você contou que a vontade de comer aparece mais à noite.${sonoCurto() ? ` E você dorme ${ROT.sono[R.sono]}: quem dormia pouco e passou a dormir 1,2 h a mais comeu 270 calorias a menos por dia.` : ' Vale anotar por uma semana o que vem antes dela.'}`, sonoCurto() ? ['tasali'] : []],
    tarde:['Você contou que a vontade de comer aparece mais à tarde. Vale anotar por uma semana o que você comeu antes e a que horas: ajuda a ver de onde ela vem.', []],
    ansiedade:[`Você contou que a vontade de comer aparece quando fica ${g('ansiosa', 'ansioso')} ou ${g('preocupada', 'preocupado')}. Conte isso ao Dr. Lucca: o caminho muda quando a vontade vem da ansiedade.`, []],
    fim_semana:['Você contou que a vontade de comer aparece no fim de semana. É comum: o peso sobe no fim de semana e desce nos dias úteis, cerca de 0,35% dentro da semana.', ['turicchi']],
    dia_todo:[`Você contou que a vontade de comer aparece o dia todo.${sonoCurto() ? ` Com ${ROT.sono[R.sono]} de sono, ela tende a ser maior.` : ''}${R.proteina !== '3mais' ? ' Mais proteína nas refeições dá mais saciedade.' : ''} Conte isso ao Dr. Lucca no vídeo.`, [...(sonoCurto() ? ['nedeltcheva'] : []), ...(R.proteina !== '3mais' ? ['leidy'] : [])]],
    pouco:['Você contou que a vontade de comer quase não te atrapalha. É um ponto a favor.', []],
  }[R.vontade];
  L.push(['Vontade de comer', R.vontade === 'pouco' ? 'A favor' : 'Vale olhar', R.vontade === 'pouco' ? 'forte' : 'parcial', vt[0], vt[1]]);
  if (!tent.length) L.push(['O que já tentou', 'A favor', 'forte', 'Você contou que ainda não tentou nenhum destes. Começar sem uma tentativa frustrada é um ponto a favor.', []]);
  else {
    let t = `Você já tentou ${lista(tent.map(x => ROT.tentou[x]))}.`, fs = [];
    if ((nDietas >= 2 || tent.length >= 3) && R.acontece !== 'constancia'){ t += ' Num estudo que comparou 4 dietas famosas por 1 ano, o peso perdido acompanhou o quanto a pessoa conseguiu manter a dieta, não o tipo de dieta.'; fs = ['dansinger']; }
    if (tent.includes('remedio')) t += ' Se algum remédio faz sentido para você, é decisão com o médico que te acompanha. Este teste não indica remédio.';
    L.push(['O que já tentou', tent.length >= 3 ? 'Já tentou de tudo' : 'Já tentou', 'nao', t, fs]);
  }
  $('r-respostas').innerHTML = `<h3>O que as suas respostas mostram</h3>` + L.map(([t, s, c, x, fs]) =>
    `<div class="linha"><div class="vt"><h4>${esc(t)}</h4><span class="selo ${c}">${esc(s)}</span></div><p>${esc(x)}</p>${fs.length ? fonte(...fs) : ''}</div>`).join('');

  // o que fazer agora: 3 passos, na ordem do perfil, só os que as respostas pedem
  const PASSO = {
    cintura: !gravida() && 'Meça a cintura uma vez por semana, no mesmo dia, além da balança.',
    pesar: !gravida() && 'Se for se pesar, faça no mesmo dia da semana e na mesma hora, e compare semana com semana.',
    sono: sonoCurto() && 'Deite 1 hora mais cedo, todas as noites, nas próximas 4 semanas.',
    forca: R.forca === '0' ? `Comece com 2 treinos de força por semana, mesmo curtos${gravida() ? ', se o pré-natal liberar' : R.idade === '60mais' || (m && m.imc >= 35) ? ', com orientação de quem acompanha o treino' : ''}.` : R.forca === '1' ? `Acrescente um 2º treino de força na semana${gravida() ? ', se o pré-natal liberar' : ''}.` : false,
    proteina: R.proteina === '1menos' ? 'Ponha uma fonte de proteína (ovo, frango, peixe, carne, queijo ou iogurte) no café da manhã e no almoço.' : R.proteina === '2' ? 'Ponha uma fonte de proteína em mais uma refeição do dia.' : false,
    anotar: R.vontade !== 'pouco' && `Anote por uma semana a hora em que a vontade de comer aparece (${ROT.vontade[R.vontade]}, você contou) e o que veio antes.`,
    uma: 'Escolha uma mudança só e mantenha por 2 semanas antes de somar a próxima.',
  };
  const ORD = { volta:['cintura','sono','proteina','forca','anotar','uma'], vontade:['anotar','sono','proteina','forca','uma'], balanca:['cintura','pesar','forca','sono','proteina'],
                constancia:['uma','sono','forca','proteina','anotar'], comeco:['sono','forca','proteina','cintura','uma'] }[R.acontece];
  const fazer = [...(gravida() ? ['Na gestação, nada de dieta para emagrecer: leve estas respostas ao seu pré-natal.'] : []), ...ORD.map(k => PASSO[k]).filter(Boolean)];
  if (fazer.length < 3) fazer.push(PASSO.uma);
  const tres = [...new Set(fazer)].slice(0, 3);
  $('r-fazer').innerHTML = `<h3>O que fazer agora</h3><ol class="fazer">${tres.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`;

  // ---------- relatório completo (recolhido) ----------
  const cel = (t, v, s) => `<div><small>${esc(t)}</small><b>${esc(v)}</b><span>${esc(s)}</span></div>`;
  $('r-cond').innerHTML = `<h3>Condição geral</h3><div class="cond">
    ${m ? cel('IMC', num(m.imc), m.faixa) : cel('IMC', '—', gravida() ? 'não calculado na gestação' : '')}
    ${m?.rc != null ? cel('Cintura ÷ altura', num(m.rc, 2), `${R.cinturaCm} cm de cintura`) : cel('Cintura ÷ altura', '—', gravida() ? 'não calculada na gestação' : 'sem fita hoje')}
    ${cel('Sono', ROT.sono[R.sono], 'você contou')}${cel('Força', ROT.forca[R.forca].replace('ainda não faz', 'ainda não'), 'você contou')}
    ${cel('Idade', ROT.idade[R.idade] || '—', 'você contou')}${cel('Proteína', ROT.proteina[R.proteina].replace('em ', ''), 'você contou')}</div>`;
  const fortes = L.filter(x => x[2] === 'forte').map(x => [x[0], x[3]]);
  if (m && m.zona === 1) fortes.unshift(['IMC na faixa de peso saudável', 'Pelas faixas da OMS e da NICE.']);
  if (m?.rcFaixa === 0) fortes.unshift(['Cintura abaixo da metade da altura', 'É a meta da NICE.']);
  $('r-fortes').innerHTML = fortes.length ? `<h3>Pontos a seu favor</h3>${fortes.slice(0, 4).map(([t, d]) => `<div class="forte"><i>✓</i><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('')}` : '';
  const S = [['O primeiro passo', tres[0]], ['Somar o segundo', tres[1] || PASSO.uma], ['Somar o terceiro', tres[2] || 'Manter os dois primeiros.'],
             ['Comparar', gravida() ? 'Refazer o teste e levar as respostas ao pré-natal.' : 'Refazer este teste e comparar a cintura e as respostas com as de hoje.']];
  $('r-plano').innerHTML = `<h3>Seu plano para as próximas 4 semanas</h3>
    <p class="meta-obj">Seu objetivo: <b>${esc(ROT.objetivo[R.objetivo] || '—')}</b></p>
    ${S.map(([t, d], i) => `<div class="semana"><em>Sem.<br>${i + 1}</em><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('')}`;
  const ev = [['Dieta muito apertada que você não consegue manter', 'O que pesa no resultado é conseguir manter.'], ['Se guiar pela balança de um dia só', 'O peso oscila sozinho dentro da semana.'],
              ['Remédio, chá ou suplemento para emagrecer por conta própria', 'Remédio é decisão com o médico que te acompanha.']];
  if (gravida()) ev.unshift(['Dieta para emagrecer na gestação', 'Cada mudança passa pelo pré-natal.']);
  usadas.add('dansinger'); usadas.add('turicchi');
  $('r-evitar').innerHTML = `<h3>Evitar</h3><ul class="evitar">${ev.map(([t, d]) => `<li><div>${esc(t)}<span>${esc(d)}</span></div></li>`).join('')}</ul>`;
  $('r-fontes').innerHTML = `<h3>Fontes</h3><ol class="fontes">${[...usadas].map(k => `<li><a href="${esc(F[k][1])}" target="_blank" rel="noopener">${esc(F[k][0])}</a></li>`).join('')}</ol>`;
  $('r-completo').open = false;
  $('r-completo').ontoggle = () => { if ($('r-completo').open) Analytics.track('answer', { stepId:'resultado-completo', valueText:'abriu' }); };

  Analytics.track('complete', { stepId:'resultado', stepIndex:ORDEM.indexOf('resultado'), valueText:R.acontece,
    props:{ codigo:meuCodigo(), perfil:R.acontece, imc:m?.imc ?? null, faixa:m?.faixa ?? null, rc:m?.rc ?? null, respostas:respostasLimpa() } });
  window.__emagResultado?.({ m, perfil:R.acontece, fazer:tres });
}
function respostasLimpa(){ const { nome, faseAuto, ...r } = R; return { ...r, tentou:R.tentou.join('+') }; }

// =====================================================================
// FECHAMENTO (mesmo molde da pele2, 02/11 v2): o resultado tem um botão só (o Dr. Lucca explica); o lembrete de 4 semanas saiu.
// Tela final de um passo só, em 3ª pessoa. Medição igual: cta_click com props.canal whatsapp/direct + props.escolha ('explicar').
// =====================================================================
const sou = () => nomeBonito() ? `Sou ${g('a', 'o')} ${nomeBonito()}` : '';
function mensagem(){ const s = sou(); return `Oi, Dr. Lucca! ${s ? s + '. ' : ''}Fiz o teste do emagrecimento, código ${meuCodigo()}. Quero que você me explique o meu resultado.`; }
const escolha = () => 'explicar';
function prepararFechamento(){
  const nome = nomeBonito();
  $('cod').textContent = meuCodigo();
  $('f-tit').textContent = nome ? `${nome}, o Dr. Lucca vai explicar o seu resultado em vídeo` : 'O Dr. Lucca vai explicar o seu resultado em vídeo';
  $('f-sub').textContent = `Um vídeo de 1 minuto sobre as suas respostas, no seu ${LV ? 'Direct' : 'WhatsApp'}, em até 24 horas. Ele grava um por um.`;
  $('cta-wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem())}`;
  if (LV) return fimDirect();
  $('wa-txt').textContent = 'Enviar meu código pelo WhatsApp';
  $('cta-dm').hidden = false;
}
const fimProps = e => ({ escolha:e, codigo:meuCodigo() });
$('cta-wa').addEventListener('click', () => { Analytics.track('cta_click', { stepId:'fechar', valueText:'whatsapp', props:{ canal:'whatsapp', ...fimProps(escolha()) } }); });
$('cta-dm').addEventListener('click', e => { if (LV) return direto_lv(e, escolha()); abrirDirect(e); });

// Direct: o Instagram não aceita texto pronto. Copia dentro do toque, avisa e deixa o link abrir o app (igual à pele2).
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
  Analytics.track('cta_click', { stepId:'fechar', valueText:'direct', props:{ canal:'direct', copiou, noInstagram:NO_INSTAGRAM, ...fimProps('explicar') } });
  if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem:txt, copiou, voz:false }); return; }
  if (copiou){ $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 6000); return; }
  e.preventDefault();
  $('aviso-msg').textContent = txt; $('aviso-link').href = $('cta-dm').href; $('aviso-dm').hidden = false;
}
$('aviso-dm').addEventListener('click', ev => { if (ev.target === $('aviso-dm')) $('aviso-dm').hidden = true; });
$('aviso-link').addEventListener('click', () => { Analytics.track('cta_click', { stepId:'fechar', valueText:'direct-abrir', props:{ canal:'direct' } }); setTimeout(() => { $('aviso-dm').hidden = true; }, 800); });
// link marcado (?lv=): quem veio do Direct pelo link do Dr. Lucca não precisa de código; "Voltar ao Instagram" + "ou pelo WhatsApp"
const LV = Analytics.getLv();
const IG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>';
function fimDirect(){
  const dm = $('cta-dm'), wa = $('cta-wa'), nota = $('f-nota');
  $('f-cod').hidden = true; dm.hidden = false;
  nota.textContent = 'O Dr. Lucca já recebeu o seu resultado. É só voltar ao Direct.';
  dm.className = 'btn ico'; dm.innerHTML = IG_SVG + '<span>Voltar ao Instagram</span>';
  wa.className = 'link-alt'; wa.innerHTML = '<span>ou pelo WhatsApp</span>';
  if (nota.previousElementSibling !== dm) nota.before(dm);
  if (nota.nextElementSibling !== wa) nota.after(wa);
}
function direto_lv(e, esc_){
  Analytics.track('cta_click', { stepId:'fechar', valueText:'direct-lv', props:{ canal:'direct', noInstagram:NO_INSTAGRAM, ...fimProps(esc_) } });
  if (!NO_INSTAGRAM) return;
  e.preventDefault(); dicaDirect({ lv:true, voz:false });
}

// ---------- início ----------
document.querySelectorAll('.opts[data-q]').forEach(ligarOpcoes);
window.lvPonte?.pintar(document.querySelector('[data-s="capa"] .sub'), 'emag');
show('capa');
// ganchos do teste automático (headless)
window.__emag = { R, estado:() => ({ cur, codigo, perfil:R.acontece }), show };
