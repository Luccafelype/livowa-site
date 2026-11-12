// livowa.com/emagrecimento · teste do emagrecimento no padrão da pele2 (02/11/2026).
// v2 (03/11/2026, pedidos do Lucca): sem a pergunta da cintura; bloco de saúde e hormônios (ciclo e sinais de SOP na mulher,
// sinais da tireoide, sinais da síndrome metabólica, remédios de uso contínuo, ronco); resultado em narrativa que leva ao
// botão, com as fontes só no rodapé recolhido. Pesquisa e fonte de cada critério: livowa-empresa/tarefas/emagrecimento-teste/pesquisa-v2.md.
// Regras: sem promessa de resultado e sem número sem fonte; nada de diagnóstico ("só consulta e exame confirmam");
// sem "grátis" nem "consulta"; não indica remédio nem marca; nunca mandar parar remédio.
// UMA pergunta decide o perfil ("acontece", VT p.92); o bloco de saúde decide os SINAIS que aparecem no resultado.
import * as A0 from '/idade/funnel-analytics.js';
import { dicaDirect } from '/assets/js/dica-direct.js?v=3';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const Q = new URLSearchParams(location.search);

// ---------- medição (mesmo Supabase dos outros testes; a Caixa lê o código no complete e o canal no cta_click) ----------
const SUPA_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SUPA_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública
// 03/11: ponte da bio (/assets/js/ponte.js): props.ponte sim|nao em todos os eventos de quem veio da bio; a linha entra na capa
const PONTE = window.lvPonte?.props?.() || {};
const Analytics = { ...A0, track:(tipo, o = {}) => A0.track(tipo, { ...o, props:{ ...(o.props || {}), versao:'v2', ...PONTE } }) };
Analytics.init({ enabled:true, funnelId:'teste-emagrecimento', variant:Q.get('v') || 'direto', supabaseUrl:SUPA_URL, supabaseKey:SUPA_KEY });
Analytics.track('view');
const WHATSAPP = '5562991774809';

const VARIAS = ['tentou', 'pele', 'tireoide', 'exames', 'remedios'];   // perguntas de várias respostas
const R = Object.fromEntries(VARIAS.map(k => [k, []]));               // respostas
let codigo = null;
const ALFA = 'ACDEFGHJKMNPQRTUVWXY34679';
function meuCodigo(){ if (!codigo){ const a = crypto.getRandomValues(new Uint8Array(4)); codigo = 'LV-' + [...a].map(x => ALFA[x % ALFA.length]).join(''); } return codigo; }

const ROT = {   // rótulos curtos das respostas (tela, analytics e Caixa)
  fase:{ nenhuma:'nenhuma', gravida:'grávida', amamentando:'amamentando', pos_parto:'bebê há menos de 1 ano', menopausa:'menopausa' },
  idade:{ '18a29':'18 a 29 anos', '30a39':'30 a 39 anos', '40a49':'40 a 49 anos', '50a59':'50 a 59 anos', '60mais':'60 anos ou mais' },
  acontece:{ volta:'Eu emagreço, mas depois engordo tudo de novo', vontade:'A vontade de comer vence, principalmente de doce', balanca:'Faço tudo certo e a balança não desce', constancia:'Começo e paro em poucas semanas', comeco:'Ainda não sei por onde começar' },
  tentou:{ dieta:'dieta da internet', low_carb:'cortar carboidrato', jejum:'jejum', academia:'academia ou corrida', nutri:'nutricionista', cha:'chá, shake ou suplemento', remedio:'remédio para emagrecer', nenhum:'nenhum destes' },
  tireoide:{ cansaco:'cansaço que não passa', frio:'frio fora de hora', intestino:'intestino preso', pele_seca:'pele muito seca' },
  exames:{ pressao:'pressão alta', glicose:'glicose alta', gordura:'triglicerídeo alto ou HDL baixo' },
  remedios:{ humor:'para depressão ou ansiedade', diabetes:'para diabetes', outro:'de uso contínuo' },
  vontade:{ noite:'à noite', tarde:'à tarde', ansiedade:'na ansiedade', fim_semana:'no fim de semana', dia_todo:'o dia todo', pouco:'quase não atrapalha' },
  sono:{ '5menos':'5 h ou menos', '6':'6 h', '7':'7 h', '8':'8 h', '9mais':'9 h ou mais' },
  objetivo:{ roupas:'Voltar a usar as roupas que eu gosto', nao_voltar:'Parar de engordar tudo de novo', disposicao:'Ter mais disposição no dia a dia', saude:'Cuidar da saúde e dos exames', corpo:'Me sentir bem com o meu corpo', outro:'o que você me contar' },
};
const nome1 = () => (R.nome || '').trim().split(/\s+/)[0] || '';
function nomeBonito(){ const n = nome1(); return n ? n[0].toLocaleUpperCase('pt-BR') + n.slice(1) : ''; }
const g = (fem, masc) => R.sexo === 'm' ? masc : fem;
const gravida = () => R.fase === 'gravida';
const lista = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' e ' + xs[xs.length - 1];
const num = (x, d = 1) => x.toLocaleString('pt-BR', { minimumFractionDigits:d, maximumFractionDigits:d });
const sem = (k, x) => R[k].filter(v => v !== x);

// ---------- telas ----------
const ORDEM = ['capa','sexo','fase','idade','nome','medidas','acontece','tentou','ciclo','pele','tireoide','exames','remedios','vontade','sono','ronco','forca','objetivo','carregando','resultado','fechar'];
const UM = ['sexo','fase','idade','acontece','ciclo','vontade','sono','ronco','forca','objetivo'];   // uma resposta (avança sozinho)
const VOLTA = { fechar:'resultado' };
let cur = 'capa';
// homem não vê fase, ciclo nem pelos; grávida não faz peso e altura; quem não menstrua pela fase não vê o ciclo
const pula = s => (['fase','ciclo','pele'].includes(s) && R.sexo === 'm') || (s === 'medidas' && gravida()) ||
                  (s === 'ciclo' && ['gravida','amamentando','pos_parto','menopausa'].includes(R.fase));
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
  if (VARIAS.includes(s)) cta.classList.toggle('off', !R[s].length);
  if (UM.includes(s)) cta.classList.toggle('off', R[s] == null);
  if (s === 'resultado') cta.textContent = 'Quero que o Dr. Lucca olhe o meu caso';   // um botão só (02/11); sem "explique em vídeo" (03/11)
  if (s === 'fechar') prepararFechamento();
  document.querySelectorAll('.nm').forEach(el => { el.textContent = nome1() ? nomeBonito() + ', ' : ''; });
  document.querySelectorAll('[data-g]').forEach(el => { const [f, m] = el.dataset.g.split('|'); el.textContent = g(f, m); });
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

// ---------- peso e altura: rodas de rolar (03/11; Lucca: "seria melhor ser de arrastar, não de digitar") ----------
// Mesmo componente das rodas de /idade e /braco (faixa do meio, snap a cada número), com teclado e leitor de tela.
// Começam num valor comum para o sexo marcado e NÃO travam o Continuar (decisão do Lucca nas pernas, 02/11); o evento
// diz se a pessoa rolou cada número ('rolou') ou deixou como veio ('padrao').
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
};
// ponto de partida das rodas (não é dado da pessoa): valores comuns de adulto por sexo
const PADRAO = { f:{ peso:70, altura:162 }, m:{ peso:85, altura:175 } };
function posicionar(chaves){   // display:none perde a rolagem: ao mostrar a tela, cada roda volta ao seu número
  const p = PADRAO[R.sexo] || PADRAO.f;
  requestAnimationFrame(() => chaves.forEach(k => {
    if (!RODA[k].pronta()) return;
    RODA[k].set(mexeu[k] && RODA[k].valor != null ? RODA[k].valor : p[k]);   // sem mexer: segue o sexo marcado
    R[k] = RODA[k].valor;
  }));
}

// ---------- opções: uma escolha (avança sozinho) e várias (data-x = exclusiva, como "Nenhum destes") ----------
function ligarOpcoes(box){
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
    R[q] = v; if (q === 'fase') delete R.faseAuto;
    box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    Analytics.track('answer', { stepId:q, valueText:v });
    $('cta').classList.remove('off');
    setTimeout(() => { if (cur === q) proxima(); }, 260);
  });
}

// ---------- botões principais ----------
$('cta').addEventListener('click', () => {
  if ($('cta').classList.contains('off')){ if (cur === 'nome') $('nome').focus(); return; }
  if (cur === 'capa') return proxima();
  if (cur === 'nome'){ R.nome = nomeBonito(); Analytics.track('answer', { stepId:'nome', valueText:'ok' }); return proxima(); }
  if (cur === 'medidas'){
    if (RODA.peso.valor != null) R.peso = RODA.peso.valor;
    if (RODA.altura.valor != null) R.altura = RODA.altura.valor;
    Analytics.track('answer', { stepId:'medidas', valueText:'ok', props:{ peso:R.peso, altura:R.altura, como:{ peso:mexeu.peso || 'padrao', altura:mexeu.altura || 'padrao' } } });
    return proxima();
  }
  if (VARIAS.includes(cur)){ Analytics.track('answer', { stepId:cur, valueText:R[cur].join('+') }); return proxima(); }
  if (UM.includes(cur)) return proxima();
  if (cur === 'resultado'){ Analytics.track('cta_click', { stepId:'resultado', valueText:'explicar' }); return show('fechar'); }
});

// =====================================================================
// IMC (OMS; classes da NICE NG246 rec. 1.9.10). Estimativa, não diagnóstico.
// =====================================================================
const FAIXAS = [   // [de, até, nome, zona da barra]
  [0, 18.5, 'abaixo do peso', 0], [18.5, 25, 'peso saudável', 1], [25, 30, 'sobrepeso', 2],
  [30, 35, 'obesidade grau 1', 3], [35, 40, 'obesidade grau 2', 4], [40, 99, 'obesidade grau 3', 5],
];
function medidas(){
  if (gravida() || !R.peso || !R.altura) return null;
  const imc = Math.round(R.peso / (R.altura / 100) ** 2 * 10) / 10, f = FAIXAS.find(([a, b]) => imc >= a && imc < b);   // a faixa sai do número mostrado
  return { imc, faixa:f[2], zona:f[3], de:f[0], ate:f[1] };
}

// =====================================================================
// FONTES (conferidas no PubMed ou no texto completo em 02 e 03/11/2026; ver pesquisa-v2.md §2). Na tela, só no rodapé.
// =====================================================================
const F = {
  oms:['OMS, “Obesity and overweight” (2026): faixas do IMC', 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight'],
  nice:['NICE, diretriz NG246: classes do IMC', 'https://www.nice.org.uk/guidance/ng246'],
  teede:['Teede 2023, diretriz internacional de SOP (J Clin Endocrinol Metab): ciclo irregular, pelos, apneia', 'https://doi.org/10.1210/clinem/dgad463'],
  chaker:['Chaker 2017, Lancet: sintomas do hipotireoidismo', 'https://doi.org/10.1016/S0140-6736(17)30703-1'],
  taylor:['Taylor 2024, Lancet: os sintomas não bastam, o diagnóstico é pelo exame de sangue', 'https://doi.org/10.1016/S0140-6736(24)01614-3'],
  alberti:['Alberti 2009, Circulation: os 5 sinais da síndrome metabólica (3 fecham o quadro)', 'https://doi.org/10.1161/CIRCULATIONAHA.109.192644'],
  apovian:['Apovian 2015, diretriz da Endocrine Society: remédios de uso contínuo que mexem no peso', 'https://doi.org/10.1210/jc.2014-3415'],
  chung:['Chung 2008, Anesthesiology: questionário STOP para apneia do sono', 'https://doi.org/10.1097/ALN.0b013e31816d83e4'],
  greendale:['Greendale 2019, JCI Insight: gordura e músculo na transição da menopausa', 'https://doi.org/10.1172/jci.insight.124865'],
  polidori:['Polidori 2016, Obesity: a vontade de comer depois de perder peso', 'https://doi.org/10.1002/oby.21653'],
  tasali:['Tasali 2022, JAMA Intern Med: dormir mais e comer menos', 'https://doi.org/10.1001/jamainternmed.2021.8098'],
  kreitzman:['Kreitzman 1992, Am J Clin Nutr: glicogênio e água', 'https://doi.org/10.1093/ajcn/56.1.292S'],
  turicchi:['Turicchi 2020, PLoS One: o peso oscila dentro da semana', 'https://doi.org/10.1371/journal.pone.0232152'],
  dansinger:['Dansinger 2005, JAMA: 4 dietas por 1 ano', 'https://doi.org/10.1001/jama.293.1.43'],
  bull:['Bull 2020, diretriz da OMS de atividade física', 'https://doi.org/10.1136/bjsports-2020-102955'],
  watson:['Watson 2015, Sleep: 7 horas ou mais', 'https://doi.org/10.5665/sleep.4716'],
};
const usadas = new Set();
const usa = (...ks) => ks.forEach(k => usadas.add(k));

// =====================================================================
// SINAIS: o que o bloco de saúde mostra. Cada sinal só aparece se a resposta pedir; nenhum é diagnóstico.
// =====================================================================
function sinais(){
  const S = [];   // { id, tit, txt, passo }
  const ex = sem('exames', 'nada').filter(x => x !== 'sem_exames'), tir = sem('tireoide', 'nenhum'), rem = sem('remedios', 'nenhum');
  // hormônios da mulher (SOP): ciclo irregular e pelos grossos são critérios; espinha e cabelo sozinhos são sinais fracos (Teede 2023, 1.1.1, 1.3.1, 1.3.2)
  if (R.sexo === 'f' && !gravida()){
    const irr = R.ciclo === 'irregular', pelos = R.pele.includes('pelos'), fracos = R.pele.filter(x => ['espinhas','cabelo'].includes(x));
    if (irr || pelos){
      const fortes = lista([irr && 'a menstruação falha ou atrasa', pelos && 'aparecem pelos grossos no rosto, no queixo ou na barriga'].filter(Boolean));
      const extra = fracos.length ? ` Você também marcou ${fracos.length === 2 ? 'espinhas e cabelo afinando' : fracos[0] === 'espinhas' ? 'espinhas que não passam' : 'cabelo afinando'}, que o médico olha junto.` : '';
      S.push({ id:'sop', tit:'Os seus hormônios', txt:`Você contou que ${fortes}. ${irr && pelos ? 'Esses dois sinais juntos estão entre os critérios' : 'Isso é um dos critérios'} que o médico usa para investigar a síndrome dos ovários policísticos (SOP), uma alteração de hormônio comum que muda o plano para o peso.${extra} Só consulta e exame confirmam, e descartam outras causas.`, passo:'Anote o primeiro dia de cada menstruação nos próximos 2 meses: é a primeira coisa que o Dr. Lucca vai querer ver.' });
      usa('teede');
    }
  }
  if (R.fase === 'menopausa'){
    S.push({ id:'menopausa', tit:'A menopausa', txt:'Você contou que está na menopausa ou chegando nela. É quando o ganho de gordura dobra de ritmo e o músculo começa a cair, mesmo que a balança mude pouco. Por isso, o que funcionava antes pode parar de funcionar.', passo:null });
    usa('greendale');
  }
  // tireoide: cansaço, frio, intestino preso e pele seca estão entre os sintomas mais comuns; são inespecíficos (Chaker 2017; Taylor 2024).
  // Regra de desenho (não é da fonte): o cartão aparece com 2 ou mais marcados.
  if (tir.length >= 2){
    S.push({ id:'tireoide', tit:'A tireoide', txt:`Você marcou ${lista(tir.map(x => ROT.tireoide[x]))}. Estão entre os sinais mais comuns da tireoide lenta, que também faz ganhar peso. Mas aparecem em muitas outras situações: quem decide é o exame de sangue, não o sintoma.`, passo:'Se tiver exames de sangue do último ano, separe uma foto deles.' });
    usa('chaker', 'taylor');
  }
  // síndrome metabólica: pressão, glicose, triglicerídeo, HDL e cintura; 3 de 5 fecham o quadro (Alberti 2009)
  if (ex.length){
    const n = ex.length;   // "triglicerídeo alto ou HDL baixo" conta como 1 (pode ser 2): conta por baixo
    S.push({ id:'metabolica', tit:'O metabolismo', txt:`Você já ouviu que tem ${lista(ex.map(x => ROT.exames[x]))}. Pressão, glicose, triglicerídeo, colesterol bom (HDL) e cintura são os 5 sinais da síndrome metabólica: quando 3 aparecem juntos, ela se confirma. Pelas suas respostas, você já tem ${n === 1 ? 'pelo menos 1' : `pelo menos ${n}`}.`, passo:'Separe uma foto dos seus últimos exames de sangue e da última medida de pressão.' });
    usa('alberti');
  } else if (R.exames.includes('sem_exames')){
    S.push({ id:'sem_exames', tit:'Os exames', txt:'Você contou que faz tempo que não faz exames. Pressão, glicose e gordura no sangue não doem quando sobem: só o exame mostra. São 3 dos 5 sinais da síndrome metabólica.', passo:null });
    usa('alberti');
  }
  // remédios: vários remédios de uso contínuo (diabetes, depressão e outros) mexem no peso (Apovian 2015)
  if (rem.length){
    S.push({ id:'remedio', tit:'Os remédios', txt:`Você toma remédio ${lista(rem.map(x => ROT.remedios[x]))}. Vários remédios de uso contínuo mexem no peso, para mais ou para menos. Não pare nem troque por conta própria: é uma das coisas que o Dr. Lucca olha com você.`, passo:'Tire uma foto da caixa de cada remédio que você toma todo dia.' });
    usa('apovian');
  }
  // ronco: ronco, cansaço de dia, parar de respirar dormindo e pressão alta são as 4 perguntas do STOP (Chung 2008);
  // na mulher com SOP, ronco + acordar cansada pede investigar apneia (Teede 2023, 1.10.2)
  if (R.ronco === 'ronco_cansa'){
    const pa = R.exames.includes('pressao');
    S.push({ id:'ronco', tit:'O sono', txt:`Você ronca e acorda ${g('cansada', 'cansado')}${pa ? ', e tem pressão alta' : ''}. Ronco, cansaço de dia, parar de respirar dormindo e pressão alta são as 4 perguntas que os médicos usam para rastrear apneia do sono. Você respondeu sim a ${pa ? '3' : '2'} delas.`, passo:'Pergunte a quem dorme perto de você se você para de respirar ou engasga dormindo.' });
    usa('chung');
  }
  return S;
}

// =====================================================================
// CARREGAMENTO em etapas que citam as respostas (VT p.91: "montando seu diagnóstico" repetindo as respostas)
// =====================================================================
const PERIM = 326.7;
function progresso(p, etapa){
  $('prog-c').style.strokeDashoffset = (PERIM * (1 - p/100)).toFixed(1);
  $('prog-pct').innerHTML = `${Math.round(p)}<small>%</small>`;
  if (etapa != null){ $('prog-etapa').textContent = etapa.txt; [...$('prog-dots').children].forEach((d, i) => d.classList.toggle('on', i === etapa.i)); }
}
const ACONTECE_CURTO = { volta:'emagrece e engorda de novo', vontade:'a vontade de comer vence', balanca:'a balança não desce', constancia:'começa e para', comeco:'ainda não sabe por onde começar' };
async function calcular(){
  const m = medidas();
  const saude = [R.sexo === 'f' && !gravida() && R.ciclo ? 'o ciclo' : null, 'a tireoide', 'os exames', 'os remédios'].filter(Boolean);
  const ETAPAS = [
    { i:0, ate:24, txt:m ? `Calculando seu IMC: ${num(R.altura / 100, 2)} m e ${num(R.peso, 0)} kg` : 'Lendo as suas respostas' },
    { i:1, ate:52, txt:`Cruzando ${lista(saude)}` },
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
// RESULTADO (v2, pesquisa-v2.md §3). Ordem da mini VSL de fim de quiz (VT p.91 e p.143): o que apareceu nas respostas
// → por que o que você tentou não segurou → a GUIA (03/11 ~23h, pedido do Lucca: sem promessa de vídeo nem "como ele
// trabalha"; o vídeo vira surpresa): o que está entre ela e o objetivo, o que isso costuma pedir (exame, hormônio, sono)
// e o custo de seguir no escuro → "é isso que você quer resolver?" (João Menna 28:57, vsl-joao-menna.md §5.1) → perguntas
// por objeção (42:04, §5.4). A urgência vem do problema dela; nenhuma escassez (§5.3: urgência inventada fica fora).
// Linguagem de conversa; nada de "Fonte:" no meio do texto: as fontes ficam no rodapé recolhido.
// =====================================================================
const PERFIL = {
  volta:'o peso que volta', vontade:'a vontade de comer', balanca:'a balança que não mostra tudo',
  constancia:'manter por mais de algumas semanas', comeco:'saber por onde começar',
};
const sonoCurto = () => ['5menos','6'].includes(R.sono);
// o que cada ponto costuma pedir (sem nome de doença, sem promessa); e, sem ponto de saúde, o que o perfil pede
const PEDE = { sop:'exame de hormônios', menopausa:'olhar a fase e o músculo, e não só o peso', tireoide:'exame de sangue',
  metabolica:'olhar glicose, pressão e gordura no sangue junto com o peso', sem_exames:'exames de rotina',
  remedio:'rever os remédios com o médico, sem parar nenhum por conta própria', ronco:'olhar o sono' };
const PEDE_PERFIL = { volta:'Isso pede um plano que conte com o corpo se defendendo, e não mais uma dieta.',
  vontade:'Isso pede olhar o sono e a hora em que a vontade aparece, antes de cortar comida.',
  balanca:'Isso pede medir o que a balança não mostra, em vez de olhar só o número.',
  constancia:'Isso pede um plano que caiba na sua rotina, e não o contrário.',
  comeco:'Isso pede começar pelo que está por trás do peso, e não pela dieta.' };
let ULT = { n:0, perfil:null };   // para a tela final
const NUM_TXT = ['nenhum', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis'];
function montarResultado(){
  usadas.clear();
  const m = medidas(), nome = nomeBonito(), tent = sem('tentou', 'nenhum'), S = sinais();
  $('r-data').textContent = new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
  const n = S.length; ULT = { n, perfil:R.acontece };
  $('r-tit').innerHTML = n
    ? `${nome ? esc(nome) + ', as' : 'As'} suas respostas mostram <em>${NUM_TXT[n] || n} ${n === 1 ? 'ponto' : 'pontos'}</em> que merecem o olhar de um médico`
    : `${nome ? esc(nome) + ', o' : 'O'} que mais pesa no seu caso: <em>${esc(PERFIL[R.acontece])}</em>`;
  $('r-lead').textContent = n
    ? `E o que mais acontece com você é ${PERFIL[R.acontece]}. Veja o que cada resposta mostra.`
    : 'Nas perguntas de saúde, nada chamou a atenção. Veja o que as outras respostas mostram.';

  // fase
  $('r-fase').innerHTML = gravida() ? '<p class="nota-fase">Você contou que está grávida. Na gestação, este teste não calcula IMC e não sugere dieta para emagrecer: cada mudança passa pelo seu pré-natal.</p>'
    : ['amamentando','pos_parto'].includes(R.fase) ? `<p class="nota-fase">Você contou que ${R.fase === 'amamentando' ? 'está amamentando' : 'teve bebê há menos de 1 ano'}. O corpo ainda está mudando: leia o número abaixo como ponto de partida, sem dieta apertada.</p>` : '';

  // IMC, curto
  let mh = '';
  if (m){
    const pos = Math.max(0, Math.min(100, (m.imc - 15) / 30 * 100));
    mh = `<div class="metrica"><div class="mt"><small>Seu IMC</small><span class="val">${num(m.imc)}<i>kg/m²</i></span></div>
      <div class="barra" aria-hidden="true"><span class="z0" style="flex:3.5"></span><span class="z1" style="flex:6.5"></span><span class="z2" style="flex:5"></span><span class="z3" style="flex:5"></span><span class="z4" style="flex:5"></span><span class="z5" style="flex:5"></span><i class="pino" style="left:${pos.toFixed(1)}%"></i><span class="rotulos">${[18.5, 25, 30, 35, 40].map(v => `<em style="left:${((v - 15) / 30 * 100).toFixed(1)}%">${num(v, v % 1 ? 1 : 0)}</em>`).join('')}</span></div>
      <p>Com ${num(R.peso, 0)} kg e ${num(R.altura / 100, 2)} m, você está na faixa <b>${esc(m.faixa)}</b>. É a conta do peso pela altura: não separa músculo de gordura, mas é por onde o médico começa.</p></div>`;
    usa('oms', 'nice');
  }
  $('r-metricas').innerHTML = mh;

  // os sinais de saúde
  $('r-sinais').innerHTML = n ? S.map(s => `<div class="sinal"><h4>${esc(s.tit)}</h4><p>${esc(s.txt)}</p></div>`).join('') : '';

  // o que mais acontece (o perfil), em uma fala simples
  const P = {
    volta:['Quando o peso cai, o corpo aumenta a vontade de comer para voltar ao peso de antes. Não é falta de força de vontade: é o corpo se defendendo.', ['polidori']],
    vontade:[`A vontade de comer não é só cabeça. O sono pesa nela: quem dormia pouco e passou a dormir cerca de 1 hora a mais por noite comeu menos, sem fazer dieta.${sonoCurto() ? ` Você dorme ${ROT.sono[R.sono]}.` : ''}${R.vontade && R.vontade !== 'pouco' ? ` E ela aparece mais ${ROT.vontade[R.vontade]}, você contou.` : ''}`, ['tasali']],
    balanca:['A balança pesa tudo junto: água, gordura e músculo. O peso sobe e desce sozinho dentro da semana, e a água guardada com o glicogênio muda o número de um dia para o outro. Ela sozinha não mostra o que está mudando por dentro.', ['kreitzman', 'turicchi']],
    constancia:['Comparando 4 dietas famosas por 1 ano, quem perdeu mais peso foi quem conseguiu manter, e não quem escolheu esta ou aquela dieta. O plano certo é o que cabe na sua rotina.', ['dansinger']],
    comeco:['O começo mais seguro é saber o que está por trás do peso antes de escolher a dieta. É por isso que as perguntas de saúde vieram antes.', []],
  }[R.acontece];
  usa(...P[1]);
  $('r-perfil').innerHTML = `<small>O que mais acontece com você</small><p>Você contou: “${esc(R.acontece === 'constancia' ? `Começo ${g('animada', 'animado')} e paro em poucas semanas` : ROT.acontece[R.acontece])}”.</p><p>${esc(P[0])}</p>`;

  // por que o que já tentou não segurou (VT p.91: "preciso explicar por que tudo que você tentou não funcionou")
  const fora = S.map(s => ({ sop:'os hormônios', menopausa:'a menopausa', tireoide:'a tireoide', metabolica:'o metabolismo', sem_exames:'os exames', remedio:'os remédios', ronco:'o sono' }[s.id]));
  let t = '';
  if (tent.length){
    t = `Você já tentou ${lista(tent.map(x => ROT.tentou[x]))}. `;
    t += fora.length ? `Tudo isso mexe no que você come e no que você gasta. ${lista(fora).replace(/^./, c => c.toUpperCase())} ${fora.length === 1 ? 'fica' : 'ficam'} de fora, e ${fora.length === 1 ? 'é justamente o que apareceu' : 'são justamente o que apareceu'} nas suas respostas.`
      : `Quando a mesma coisa não segura, o problema raramente é a sua força de vontade: é o plano que não foi feito para você.`;
    if (tent.includes('remedio')) t += ' Se algum remédio para emagrecer faz sentido no seu caso, é decisão do médico que te acompanha. Este teste não indica remédio.';
  } else t = fora.length ? `Você ainda não tentou nada para emagrecer. É a melhor hora para olhar ${lista(fora)} antes de escolher a dieta.` : 'Você ainda não tentou nada para emagrecer: dá para começar pelo caminho certo, sem tentativa frustrada pelo meio.';
  $('r-tentou').innerHTML = `<h3>Por que o que você tentou não segurou</h3><p>${esc(t)}</p>`;

  // a guia: o que está no caminho, o que pede, o custo do escuro, o que o teste não alcança e a pergunta (sem vídeo)
  const passo = (S.find(s => s.passo) || {}).passo || (sonoCurto() ? 'Deite 1 hora mais cedo nas próximas noites e repare na vontade de comer no dia seguinte.'
    : R.forca === '0' ? 'Comece com 2 treinos de força curtos por semana: é o que a OMS recomenda.' : 'Anote por uma semana a hora em que a vontade de comer aparece e o que veio antes.');
  if (!S.find(s => s.passo)){ if (sonoCurto()) usa('watson'); else if (R.forca === '0') usa('bull'); }
  const objTxt = R.objetivo && R.objetivo !== 'outro' ? ROT.objetivo[R.objetivo].replace(/^./, c => c.toLowerCase()) : '';
  const obj = objTxt ? ` e chegar ao seu objetivo (“${objTxt}”)` : '';
  const isso = n ? lista(fora) : 'isso';
  const caminho = n ? `Pelas suas respostas, o que pesa no seu caso ${n === 1 ? 'é' : 'são'} ${lista(fora)}. Nenhuma dieta enxerga isso: pede ${lista([...new Set(S.map(s => PEDE[s.id]).filter(Boolean))])}.`
    : `Pelas suas respostas, o que mais pesa é ${PERFIL[R.acontece]}. ${PEDE_PERFIL[R.acontece]}`;
  const escuro = tent.length ? `Cada nova tentativa sem olhar ${isso} tende a terminar como as outras.` : `Começar sem olhar ${isso} é escolher a dieta no escuro.`;
  $('r-proximo').innerHTML = `<h3>${objTxt ? `O que está entre você e “${esc(objTxt)}”` : 'O que está no seu caminho'}</h3>
    <p>${esc(caminho)}</p>
    <p class="escuro">${esc(escuro)} A boa notícia: isso se olha com calma, com exame e conversa, sem adivinhar.</p>
    <h3>O que este teste não consegue fazer</h3>
    <p>Um teste não pede exame, não examina você e não conhece a sua história. ${n ? `Para saber se ${n === 1 ? 'esse ponto pesa' : 'esses pontos pesam'} no seu caso` : 'Para saber o que pesa no seu caso'}${obj}, alguém precisa olhar as suas respostas com você.</p>
    <div class="quer"><b>É isso que você quer resolver?</b><p>Se for, mande o seu código para o Dr. Lucca. Ele lê as suas respostas${n ? `, começando ${n === 1 ? 'pelo ponto' : 'pelos pontos'} acima,` : ''} e responde você.</p></div>
    <details class="duvidas"><summary>Antes de mandar</summary>
      <p><b>Já tentei de tudo. Vale a pena?</b>${tent.length ? ` Você já tentou ${esc(lista(tent.map(x => ROT.tentou[x])))}.` : ''} As perguntas de saúde vieram antes justamente para mostrar o que as dietas deixam de fora.</p>
      <p><b>Preciso ter exames em mãos?</b> Não. Se tiver exames do último ano, separe uma foto: ajuda na conversa.</p>
      <p><b>Mandar o código me compromete?</b> Não. É uma mensagem com o seu código. O que fazer depois, você decide.</p>
    </details>
    <p class="enquanto"><b>Enquanto isso:</b> ${esc(passo)}</p>`;

  $('r-fontes').innerHTML = `<ol class="fontes">${[...usadas].map(k => `<li><a href="${esc(F[k][1])}" target="_blank" rel="noopener">${esc(F[k][0])}</a></li>`).join('')}</ol>`;
  $('r-completo').open = false;
  $('r-completo').ontoggle = () => { if ($('r-completo').open) Analytics.track('answer', { stepId:'resultado-fontes', valueText:'abriu' }); };

  Analytics.track('complete', { stepId:'resultado', stepIndex:ORDEM.indexOf('resultado'), valueText:R.acontece,
    props:{ codigo:meuCodigo(), perfil:R.acontece, imc:m?.imc ?? null, faixa:m?.faixa ?? null, sinais:S.map(s => s.id).join('+') || 'nenhum', respostas:respostasLimpa() } });
  window.__emagResultado?.({ m, perfil:R.acontece, sinais:S.map(s => s.id) });
}
// 12/11 (Lucca): o primeiro nome vai em respostas.nome, com a mesma proteção das respostas (só a Caixa lê, pela chave).
function respostasLimpa(){ const { nome, faseAuto, ...r } = R; const o = { ...r, nome:nomeBonito().slice(0, 40) }; VARIAS.forEach(k => { o[k] = R[k].join('+'); }); return o; }


// =====================================================================
// FECHAMENTO (mesmo molde da pele2, 02/11 v2): o resultado tem um botão só (o Dr. Lucca explica); o lembrete de 4 semanas saiu.
// Tela final de um passo só, em 3ª pessoa. Medição igual: cta_click com props.canal whatsapp/direct + props.escolha ('explicar').
// =====================================================================
const sou = () => nomeBonito() ? `Sou ${g('a', 'o')} ${nomeBonito()}` : '';
function mensagem(){ const s = sou(); return `Oi, Dr. Lucca! ${s ? s + '. ' : ''}Fiz o teste do emagrecimento, código ${meuCodigo()}. Quero que você olhe o meu caso.`; }
const escolha = () => 'explicar';
function prepararFechamento(){
  const nome = nomeBonito();
  $('cod').textContent = meuCodigo();
  // 03/11 ~23h (Lucca): sem promessa de vídeo nem de prazo; o título é o passo, a frase é o problema dela
  $('f-tit').textContent = nome ? `${nome}, mande o seu código para o Dr. Lucca` : 'Mande o seu código para o Dr. Lucca';
  $('f-sub').textContent = ULT.n ? `${NUM_TXT[ULT.n] ? NUM_TXT[ULT.n][0].toUpperCase() + NUM_TXT[ULT.n].slice(1) : ULT.n} ${ULT.n === 1 ? 'ponto das suas respostas merece' : 'pontos das suas respostas merecem'} o olhar de um médico.`
    : `O que mais pesa no seu caso, ${PERFIL[ULT.perfil] || 'o seu resultado'}, merece o olhar de um médico.`;
  $('cta-wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem())}`;
  $('wa-txt').textContent = 'Enviar meu código pelo WhatsApp';
  $('cta-dm').hidden = false;
}
const fimProps = e => ({ escolha:e, codigo:meuCodigo() });
$('cta-wa').addEventListener('click', () => { Analytics.track('cta_click', { stepId:'fechar', valueText:'whatsapp', props:{ canal:'whatsapp', ...fimProps(escolha()) } }); });
$('cta-dm').addEventListener('click', e => abrirDirect(e));   // com ou sem ?lv=: copia a mensagem com o código e abre o Direct

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
// 08/11 (Lucca): WhatsApp em primeiro em todos os fins, também para quem veio do Direct pelo link marcado (?lv=). Nada
// volta sozinho para o Direct; quem escolher o Direct manda a mensagem com o código (copiada), igual a quem não tem ?lv=.
// O lv continua indo nos eventos (props.lv, pelo funnel-analytics).


// ---------- início ----------
document.querySelectorAll('.opts[data-q]').forEach(ligarOpcoes);
window.lvPonte?.pintar(document.querySelector('[data-s="capa"] .sub'), 'emag');
show('capa');
// ganchos do teste automático (headless)
window.__emag = { R, estado:() => ({ cur, codigo, perfil:R.acontece }), show };
