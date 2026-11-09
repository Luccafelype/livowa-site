// livowa.com/pele v2 (04/11/2026) · teste da IDADE QUE O ROSTO MOSTRA. Refeito depois da reprovação do Lucca (04/11),
// seguindo À RISCA livowa-empresa/tarefas/pele-idade-vitalidade/desenho-v2.md, tela a tela. Frases de saúde só de
// evidencia.md / desenho-v2.md (nenhuma nova). Câmera = a da pele2 (3 fotos: frente, esquerda, direita; ordem NO OVAL),
// mesma edge analisar-pele, com {angulos} quando chegam as 3. funnel_id 'pele-idade' e as chaves de resposta de antes
// (a Caixa lê); chaves novas: cigarro parou|as_vezes, futuro chegar10|antes, props.desejo (o desejo de 10 anos com a idade).
// v3 (04/11 noite, voz do público: livowa-empresa/pesquisa/voz-pele-potencia.md, tema A): pergunta nova 'espelho' depois do
// nome (R.espelho: cansada|caindo|pescoco|palpebra|manchas|nada); futuro troca parecer→reconhecer e antes→independente
// (os valores velhos seguem nos mapas, para leads antigos); no resultado, a região da dor dela vem primeiro.
// Barra: log(passo)/log(total) sobre as telas da capa ao resultado (Conrad 2010; Villar 2013; design-web.md).
// Texto: sem aspas retas dentro de frase (quebraram uma página antes); quando precisar, aspas tipográficas.
// 09/11 (alfinetes do Lucca): sem rótulos de seção na barra; tela 03 e 08 com frase no lugar do número solto e "Fonte:";
// Continuar acima do teclado (visualViewport); futuro ganha 'jovem'; carregamento troca o título; resultado sem
// "Por que isso importa" e com o CTA que liga o que ela marcou ao resultado; fim A sem o parágrafo do vídeo.
// 09/11 (Lucca): urgência real. Análise sem custo para quem enviar em 30 min contados da 1ª vez que vê o resultado (PRAZO,
// perto do fechamento); o título da tela final perde o "sem custo" e a mensagem pronta diz se saiu no prazo.
import * as Analytics from '/idade/funnel-analytics.js';
import { dicaDirect } from '/assets/js/dica-direct.js?v=3';
import * as Scan from './scan.js?v=3';
import { montarEnvio, alinhar, fotoTopo, recorteRegiao, criarFace, geometria, medir, pose, caixa, OVAL, NITIDEZ_MIN } from './rosto.js?v=2';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const Q = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

// ---------- medição (mesmo Supabase das outras páginas; em localhost só loga no console) ----------
const SUPA_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SUPA_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública
Analytics.init({ enabled:true, funnelId:'pele-idade', variant:Q.get('v') || 'direto', supabaseUrl:SUPA_URL, supabaseKey:SUPA_KEY });
// Fim A/B igual ao da pele2: A = "vai explicar o seu resultado em vídeo"; B = sem falar em vídeo. ?fim=A|B força.
const FIM = (() => {
  const q = (Q.get('fim') || '').toUpperCase(); if (q === 'A' || q === 'B') return q;
  try { let v = localStorage.getItem('livowa_pele_fim'); if (v !== 'A' && v !== 'B'){ v = Math.random() < .5 ? 'A' : 'B'; localStorage.setItem('livowa_pele_fim', v); } return v; }
  catch { return Math.random() < .5 ? 'A' : 'B'; }
})();
// Ponte da bio: só a medição (props.ponte). A capa do desenho-v2 não leva parágrafo nenhum, então a linha não é pintada.
const PONTE = window.lvPonte?.props?.() || {};
const track = (tipo, o = {}) => Analytics.track(tipo, { ...o, props:{ ...(o.props || {}), fim:FIM, ...PONTE } });
track('view');

// ---------- análise: a MESMA edge analisar-pele; com as 3 fotos vai {angulos} (como a pele2), sem extras ----------
const PELE_PRODUCAO = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co/functions/v1/analisar-pele';
const PELE_ENDPOINT = (LOCAL && Q.get('pele')) || PELE_PRODUCAO;   // em localhost dá para apontar para um mock
const WHATSAPP = '5562991774809';

// ---------- quadros da instrução (Codex, 04/11): troque aqui. O lado oposto é a mesma imagem espelhada pelo CSS. ----------
const QUADROS = { f:{ frente:'img/mulher-frente.webp', lado:'img/mulher-lado.webp' }, m:{ frente:'img/homem-frente.webp', lado:'img/homem-lado.webp' } };
// Vídeo do Google Flow: quando existir, ponha o caminho (ex.: 'img/instrucao.mp4') e ele entra no lugar do crossfade.
const VIDEO_INSTRUCAO = { f:'', m:'' };

// ---------- dados ----------
const R = {};                  // respostas
let codigo = null, fotos = null, resultado = null;
const ALFA = 'ACDEFGHJKMNPQRTUVWXY34679';
function meuCodigo(){ if (!codigo){ const a = crypto.getRandomValues(new Uint8Array(4)); codigo = 'LV-' + [...a].map(x => ALFA[x % ALFA.length]).join(''); } return codigo; }
const nome1 = () => (R.nome || '').trim().split(/\s+/)[0] || '';
function nomeBonito(){ const n = nome1(); return n ? n[0].toLocaleUpperCase('pt-BR') + n.slice(1) : ''; }
const fem = () => R.sexo !== 'm';
const idadeOu = () => R.idade ?? IDADE_PADRAO;
// o desejo de 10 anos: em 1ª pessoa (mensagem) e em 2ª (resultado); o "chegar aos" usa a idade + 10
const FUT_EU = { disposicao:'ter a mesma disposição de hoje', reconhecer:'me reconhecer no espelho', chegar10:i => `chegar aos ${i} com força e memória`, independente:'não depender de ninguém',
  jovem:'aparentar ser mais jovem',   // 09/11 (Lucca): 5ª opção
  parecer:'parecer a idade que eu sinto', antes:'cuidar da saúde antes de aparecer problema' };   // parecer e antes: v2, só para quem já respondeu
const FUT_VOCE = { ...FUT_EU, reconhecer:'você se reconhecer no espelho', parecer:'parecer a idade que você sente' };   // "para {…}" (tela final)
const FUT_QUER = { ...FUT_EU, reconhecer:'se reconhecer no espelho', parecer:'parecer a idade que sente' };              // "quer {…}" (CTA do resultado)
const desejo = (M = FUT_VOCE) => { const v = M[R.futuro]; return typeof v === 'function' ? v(idadeOu() + 10) : v || ''; };
// a resposta dela, curta (carregamento e resultado)
const RESP = {
  cigarro:{ nunca:'Nunca fumou', parou:'Já fumou e parou', as_vezes:'Fuma ou usa vape às vezes', hoje:'Fuma todo dia' },
  sol:{ quase_nenhum:'Quase nenhum sol', fds:'Um pouco de sol', todo_dia:'Sol quase todo dia' },
  metabolico:{ nao_medi:'Pressão e glicose normais', nunca:'Nunca mediu pressão e glicose', pressao:'Pressão alta', glicose:'Glicose alta', ambas:'Pressão e glicose altas' },
  movimento:{ quase_nada:'Quase nada de movimento', ate2:'Até 2 horas de movimento', '2a5':'De 2 a 5 horas de movimento', mais5:'Mais de 5 horas de movimento' },
  sono:{ bem:'Dorme bem', '6h':'Dorme umas 6 horas', curto:'Dorme 5 horas ou menos', cansado:'Acorda cansad@' },
};
const resp = (k, v = R[k]) => (RESP[k]?.[v] || '').replace('@', fem() ? 'a' : 'o');

// ---------- telas (ordem do desenho-v2) ----------
const ORDEM = ['capa','idade','reforco1','nome','espelho','sol','cigarro','reforco2','metabolico','movimento','sono','futuro','instrucao','scan','carregando','resultado','fechar','erro'];
const QUIZ = ['espelho','sol','cigarro','metabolico','movimento','sono','futuro'];   // uma escolha, avança sozinho (o sexo fica na capa)
const VOLTA = { scan:'instrucao', erro:'instrucao', fechar:'resultado' };
// barra: todas as telas da capa ao resultado; valor = log(passo)/log(total), com passo = posição + 1 e total = telas + 1
// (a capa já mostra um pouco, como em Conrad 2010: log(1) = 0 deixaria a 1ª tela vazia)
const BARRA = ORDEM.slice(0, ORDEM.indexOf('resultado') + 1);
const pBarra = s => { const i = BARRA.indexOf(s); return i < 0 ? null : Math.log(i + 2) / Math.log(BARRA.length + 1); };
const LIMITE = [0, (pBarra('espelho') + pBarra('sol'))/2, (pBarra('futuro') + pBarra('instrucao'))/2, 1];   // onde cada seção começa
(function montarBarra(){
  [...$('barra').querySelectorAll('.b-trilho i')].forEach((el, k) => { el.style.flex = `${LIMITE[k + 1] - LIMITE[k]} 1 0`; });
})();   // 09/11 (Lucca): sem os rótulos SOBRE VOCÊ / HÁBITOS / FOTO; os 3 trechos da barra ficam
function pintarBarra(s){
  const p = s === 'erro' ? pBarra('instrucao') : s === 'fechar' ? 1 : pBarra(s);
  if (p == null) return;
  [...$('barra').querySelectorAll('.b-trilho i')].forEach((el, k) => {
    el.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, (p - LIMITE[k])/(LIMITE[k + 1] - LIMITE[k])))*100) + '%';
  });
  window.__barra = Math.round(p*100);
}

let cur = 'capa';
function show(s){
  if (cur === 'scan' && s !== 'scan') Scan.parar();
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.dataset.s !== s);
  cur = s;
  track('step_view', { stepId:s, stepIndex:ORDEM.indexOf(s) });
  document.body.classList.toggle('scan-on', s === 'scan');
  $('back').classList.toggle('some', ['capa','carregando','resultado'].includes(s));
  pintarBarra(s);
  const cta = $('cta'), c2 = $('cta-2');
  $('cta-bar').hidden = ['capa','scan','carregando','resultado','fechar'].includes(s);
  cta.hidden = false; c2.hidden = true; cta.classList.remove('off');
  cta.textContent = 'Continuar';
  // textos que dependem das respostas
  document.querySelectorAll('.v-idade').forEach(el => { el.textContent = idadeOu(); });
  document.querySelectorAll('.v-i10').forEach(el => { el.textContent = idadeOu() + 10; });
  document.querySelectorAll('.nm').forEach(el => { el.textContent = nome1() ? nomeBonito() + ', ' : ''; ajustarMaiuscula(el); });
  document.querySelectorAll('.gen').forEach(el => { el.textContent = fem() ? el.dataset.f : el.dataset.m; });
  if (s === 'idade') posicionarIdade();
  if (s === 'reforco2') $('i2-tit').textContent = TIT_CIGARRO[R.cigarro === 'nunca' ? 'nunca' : R.cigarro === 'parou' ? 'parou' : 'fuma'];
  if (s === 'nome'){ cta.classList.toggle('off', nome1().length < 2); c2.hidden = false; c2.textContent = 'Pular'; }
  if (QUIZ.includes(s)) cta.classList.toggle('off', R[s] == null);
  if (s === 'instrucao'){ cta.textContent = 'Abrir a câmera'; cta.classList.toggle('off', !$('aceite').checked); prepararQuadro(); }
  else pararQuadro();
  if (s === 'erro'){ cta.textContent = erroRede ? 'Tentar de novo' : 'Tirar de novo'; c2.hidden = false; c2.textContent = 'Escolher uma foto'; }
  if (s === 'resultado') iniciarPrazo();
  if (s === 'fechar') prepararFechamento();
  pintarPrazo();
  window.scrollTo(0, 0);
  requestAnimationFrame(medirBarra);
}
// interstício 2: o título responde à resposta do cigarro (desenho-v2, tela 6)
const TIT_CIGARRO = {
  nunca:'Ponto para você: o cigarro é o hábito com o efeito mais claro no rosto.',
  parou:'Ter parado conta: o cigarro é o hábito com o efeito mais claro no rosto.',
  fuma:'Bom saber agora: o cigarro é o hábito com o efeito mais claro no rosto, e é dos que dá para mudar.',
};
// "Ana, quanto sol…" com nome; "Quanto sol…" sem nome: a 1ª letra do texto depois do .nm acompanha
function ajustarMaiuscula(el){
  const t = el.nextSibling; if (!t || t.nodeType !== 3) return;
  const s = t.textContent; if (!s) return;
  t.textContent = (nome1() ? s[0].toLocaleLowerCase('pt-BR') : s[0].toLocaleUpperCase('pt-BR')) + s.slice(1);
}
function medirBarra(){ const b = $('cta-bar'); document.documentElement.style.setProperty('--cta-h', (b.hidden ? 0 : b.offsetHeight) + 'px'); }
addEventListener('resize', medirBarra);
// 09/11 (Lucca): com o teclado aberto (iPhone), o Continuar sobe e fica logo acima dele. O position:fixed do iOS segue a
// janela de layout, que o teclado não encolhe; a visualViewport encolhe. Distância = fundo do layout − fundo do visível.
function acimaDoTeclado(){
  const vv = window.visualViewport; if (!vv) return;
  const a = document.activeElement, digitando = !!a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !['checkbox','radio','file','button'].includes(a.type)));
  const kb = digitando ? Math.max(0, Math.round(document.documentElement.clientHeight - (vv.height + vv.offsetTop))) : 0;
  const on = kb > 60;   // abaixo disso é barra do navegador mexendo, não teclado
  document.documentElement.style.setProperty('--kb', (on ? kb : 0) + 'px');
  document.body.classList.toggle('teclado', on);
}
if (window.visualViewport){ visualViewport.addEventListener('resize', acimaDoTeclado); visualViewport.addEventListener('scroll', acimaDoTeclado); }
addEventListener('focusin', () => setTimeout(acimaDoTeclado, 60));
addEventListener('focusout', () => setTimeout(acimaDoTeclado, 60));
if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe($('cta-bar'));
function proxima(){ show(ORDEM[ORDEM.indexOf(cur) + 1]); }

$('back').addEventListener('click', () => {
  if (VOLTA[cur]) return show(VOLTA[cur]);
  const i = ORDEM.indexOf(cur) - 1; if (i >= 0) show(ORDEM[i]);
});

// ---------- idade real: roda de rolar (mesmo componente do /emagrecimento, /idade e /braco) ----------
// Começa em 40 (ponto de partida, não é dado da pessoa); o evento diz se ela rolou, confirmou ou deixou como veio.
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
function posicionarIdade(){ requestAnimationFrame(() => { if (roda.pronta()) roda.set(R.idade ?? IDADE_PADRAO); }); }

// ---------- nome (com Pular) ----------
$('nome').addEventListener('input', () => { R.nome = $('nome').value.replace(/[<>]/g, '').slice(0, 40); $('cta').classList.toggle('off', nome1().length < 2); });
$('nome').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('cta').click(); } });

// ---------- perguntas de uma escolha (avança sozinho; o sexo está na capa) ----------
function ligarOpcoes(box){
  const tela = box.closest('.screen').dataset.s;
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
    const q = box.dataset.q, v = b.dataset.v;
    R[q] = v;
    box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    track('answer', { stepId:q, valueText:v });
    $('cta').classList.remove('off');
    setTimeout(() => { if (cur === tela) proxima(); }, 260);
  });
}

// ---------- instrução: quadro realista em crossfade (ou o vídeo, quando existir) ----------
function prepararQuadro(){
  const sx = R.sexo === 'm' ? 'm' : 'f', q = QUADROS[sx], box = $('quadro'), vid = $('q-video');
  box.querySelector('.q-f').src = q.frente; box.querySelector('.q-e').src = q.lado; box.querySelector('.q-d').src = q.lado;
  if (VIDEO_INSTRUCAO[sx]){
    box.classList.add('video'); box.classList.remove('anda'); vid.hidden = false;
    if (!vid.src.endsWith(VIDEO_INSTRUCAO[sx])) vid.src = VIDEO_INSTRUCAO[sx];
    vid.muted = true; vid.play?.().catch(() => {});
  } else {
    box.classList.remove('video', 'anda'); vid.hidden = true;
    void box.offsetWidth; box.classList.add('anda');   // recomeça o ciclo pela frente
  }
}
function pararQuadro(){ $('quadro').classList.remove('anda'); const v = $('q-video'); if (!v.hidden) try { v.pause(); } catch {} }

// ---------- botões principais ----------
$('cta').addEventListener('click', () => {
  if ($('cta').classList.contains('off')){
    if (cur === 'instrucao') return apontarAceite();
    if (cur === 'nome') return $('nome').focus();
    return;
  }
  if (cur === 'idade'){ R.idade = roda.valor ?? IDADE_PADRAO; track('answer', { stepId:'idade', valueText:String(R.idade), props:{ como:comoIdade } }); return proxima(); }
  if (cur === 'nome'){ R.nome = nomeBonito(); track('answer', { stepId:'nome', valueText:'ok' }); return proxima(); }
  if (QUIZ.includes(cur) || cur.startsWith('reforco')) return proxima();
  if (cur === 'instrucao') return abrirScan();
  if (cur === 'erro') return erroRede && fotos ? enviar(fotos) : abrirScan();
});
$('cta-2').addEventListener('click', () => {
  if (cur === 'nome'){ R.nome = ''; $('nome').value = ''; track('answer', { stepId:'nome', valueText:'pulou' }); return proxima(); }
  if (cur === 'erro') $('arquivo').click();
});
$('r-cta').addEventListener('click', () => { track('cta_click', { stepId:'resultado', valueText:'explicar' }); show('fechar'); });
$('galeria').addEventListener('click', () => { if (!$('aceite').checked) return apontarAceite(); $('arquivo').click(); });
$('aceite').addEventListener('change', () => { $('aceite').closest('.consent').classList.remove('alerta'); if (cur === 'instrucao') $('cta').classList.toggle('off', !$('aceite').checked); });
function apontarAceite(){ const l = $('aceite').closest('.consent'); l.classList.add('alerta'); l.scrollIntoView({ block:'center', behavior:'smooth' }); }

// ---------- câmera (a da pele2: frente, esquerda, direita) ----------
function abrirScan(){
  Scan.liberarVoz();   // iOS: a voz só sai se começar dentro do toque
  show('scan'); $('scan-help').hidden = true;
  Scan.abrir({ onPronto: f => { track('answer', { stepId:'scan', valueText:Object.keys(f).join('+'), props:{ angulos:Object.keys(f).length } }); enviar(f); },
               onErro: e => track('answer', { stepId:'scan', valueText:'erro-camera', props:{ erro:e?.name || 'erro' } }) });
}
$('scan-fechar').addEventListener('click', () => { Scan.parar(); show('instrucao'); });
$('scan-ajuda').addEventListener('click', () => { $('scan-help').hidden = !$('scan-help').hidden; });
$('scan-help-ok').addEventListener('click', () => { $('scan-help').hidden = true; });
$('scan-galeria').addEventListener('click', () => { Scan.parar(); $('arquivo').click(); });
$('scan-pular').addEventListener('click', () => { track('answer', { stepId:'scan', valueText:'pulou-lados' }); Scan.seguirComOQueTem(); });

// ---------- galeria (uma foto de frente) ----------
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
  if (limite){ const s = sou(); $('erro-wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Oi, Dr. Lucca! ${s ? s + '. ' : ''}Tentei fazer o teste da idade do rosto, código ${meuCodigo()}, mas deu muitas análises agora.`)}`; }
  show('erro'); }
$('erro-wa').addEventListener('click', () => track('cta_click', { stepId:'erro', valueText:'limite', props:{ canal:'whatsapp', codigo:meuCodigo() } }));
$('erro-dm').addEventListener('click', () => track('cta_click', { stepId:'erro', valueText:'limite', props:{ canal:'direct', codigo:meuCodigo() } }));
const PERIM = 326.7;
// 09/11 (Lucca): o título troca ao longo da barra (o que a análise está olhando), 5 frases em partes iguais
const TIT_ANALISE = () => ['Analisando a textura da pele…', 'Procurando linhas ao redor dos olhos…', 'Olhando as marcas ao redor da boca…', 'Medindo manchas e tom da pele…',
  R.idade ? `Comparando com os seus ${R.idade} anos…` : 'Comparando com a sua idade…'];
function progresso(p, etapa){
  $('prog-c').style.strokeDashoffset = (PERIM * (1 - p/100)).toFixed(1);
  $('prog-pct').textContent = `${Math.round(p)}%`;
  const T = TIT_ANALISE(), t = T[Math.min(T.length - 1, Math.floor(p / (100 / T.length)))], h = $('prog-tit');
  if (h.textContent !== t){ h.textContent = t; h.classList.remove('troca'); void h.offsetWidth; h.classList.add('troca'); }
  if (etapa != null){ $('prog-etapa').textContent = etapa.txt; [...$('prog-dots').children].forEach((d, i) => d.classList.toggle('on', i === etapa.i)); }
}
async function enviar(f){
  fotos = f;
  const n = Object.keys(f).length;
  const contou = [resp('cigarro'), resp('sol')].filter(Boolean).map(t => t.toLocaleLowerCase('pt-BR')).join(', ');
  // 09/11: a etapa "Comparando com os seus N anos" saiu daqui (agora é o último título); ficam 3 etapas
  const ETAPAS = [{ i:0, ate:30, txt:n > 1 ? `Lendo as suas ${n} fotos` : 'Lendo a sua foto' },
                  { i:1, ate:76, txt:contou ? `Pesando o que você contou: ${contou}` : 'Pesando o que você contou' }, { i:2, ate:100, txt:'Montando o seu resultado' }];
  show('carregando'); progresso(0, ETAPAS[0]);
  const angulos = ['frente','esquerda','direita'].filter(a => f[a]);
  const imagens = angulos.map(a => { const cv = montarEnvio(f[a].src, f[a].g), d = cv.toDataURL('image/jpeg', angulos.length > 1 ? .85 : .9).split(',')[1]; cv.width = cv.height = 0; return d; });
  const corpo = { imagens, modo:'rosto', ocultas:['olhos'], codigo:meuCodigo(), ...(angulos.length > 1 ? { angulos } : {}) };
  window.__ultimoEnvio = { n:imagens.length, angulos, kb:Math.round(imagens.reduce((s, x) => s + x.length, 0)*3/4/1024) };
  const t0 = performance.now(), MIN = 8000;   // mínimo de ~8 s: dá tempo de ler as etapas
  let pct = 0, fim = false;
  const etapaDe = p => ETAPAS.find(e => p <= e.ate) || ETAPAS[2];
  const tick = setInterval(() => { if (fim) return; pct = Math.min(92, pct + (pct < 50 ? 2.6 : pct < 80 ? 1.6 : .6)); progresso(pct, etapaDe(pct)); }, 220);
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(PELE_ENDPOINT, { method:'POST', signal:ctl.signal, headers:{ 'Content-Type':'application/json', apikey:SUPA_KEY }, body:JSON.stringify(corpo) });
    const j = await r.json().catch(() => null);
    if (r.status === 429){ clearInterval(tick); return erro('Muita gente fez a análise agora. Tente de novo em alguns minutos, ou mande o seu código ao Dr. Lucca e fale com ele direto.', true, true); }
    if (!r.ok || !j){ clearInterval(tick); return erro('Pode ser a internet. É só tentar de novo.', true); }
    if (!j.ok){ clearInterval(tick); return erro('A foto não deu para ler direito. Tente de novo de frente para uma janela, com o rosto inteiro no oval.', false); }
    const resta = MIN - (performance.now() - t0);
    if (resta > 0) await new Promise(res => setTimeout(res, resta));
    fim = true; clearInterval(tick);
    for (const p of [96, 100]){ progresso(p, ETAPAS[2]); await new Promise(res => setTimeout(res, 380)); }
    montarResultado(j, f);
    show('resultado');
  } catch (e) {
    console.error(e); clearInterval(tick); erro('Pode ser a internet. É só tentar de novo.', true);
  } finally { clearTimeout(to); }
}

// =====================================================================
// RESULTADO (desenho-v2, tela 14): 1. número + régua + foto pequena → 2. uma frase de leitura → 3. o que a foto mostra
// (recortes) → 4. o que das respostas pesa (↑/↓) → 5. CTA: o que ela marcou (espelho + 10 anos) + a faixa + 1 botão.
// 09/11 (Lucca): o cartão "Por que isso importa" saiu (os gêmeos já aparecem na tela 03).
// Fechado: "Ver os estudos". Sem número (confiança baixa / foto ruim): 1 frase + "Tirar outra foto"; botão igual.
// =====================================================================
const CORTE = 3;   // ±3 anos entre o meio da faixa e a idade real: escolha de produto (evidencia.md §4), não vem de estudo
const SINAL = {   // sinais da edge ligados à idade do rosto (a textura/poro fica de fora); c = o que a foto mostra, curto
  linhas_testa:{ nome:'Testa', recorte:'testa', c:['Lisa', 'Linhas leves', 'Linhas visíveis', 'Linhas bem marcadas'] },
  olhos:{ nome:'Canto dos olhos', recorte:'olhos', c:['Liso', 'Linhas leves', 'Linhas visíveis', 'Linhas bem marcadas'] },
  sulco_nasolabial:{ nome:'Do nariz à boca', recorte:'sulco', c:['Vinco quase imperceptível', 'Vinco leve', 'Vinco visível', 'Vinco bem marcado'] },
  manchas:{ nome:'Bochechas', recorte:'bochecha', c:['Tom uniforme', 'Poucas manchas, discretas', 'Algumas manchas visíveis', 'Manchas bem visíveis'] },
  flacidez:{ nome:'Contorno', recorte:'contorno', c:['Firme', 'Levemente menos firme', 'Menos firme', 'Bem menos firme'] },
};
const cap = t => t ? t[0].toLocaleUpperCase('pt-BR') + t.slice(1) : '';
// a dor do espelho como frase, depois de "você disse que" (CTA do resultado; 09/11); 'nada' fica de fora
const DOR_FRASE = {
  cansada:() => `se sente com cara de ${fem() ? 'cansada' : 'cansado'} mesmo dormindo`,
  caindo:() => 'o rosto caindo te incomoda',
  pescoco:() => 'o pescoço e a papada te incomodam',
  palpebra:() => 'a pálpebra pesando te incomoda',
  manchas:() => 'manchas e rugas te incomodam',
};
// a dor do espelho (v3): a região dela vem primeiro em "O que a sua foto mostra", com a frase dela e o que a análise devolveu.
// ids = sinais da edge que mostram essa região (o mais marcado entre eles); sem frase de saúde nova.
const DOR = {
  cansada:{ t:() => `a cara de ${fem() ? 'cansada' : 'cansado'}`, ids:['olhos'] },
  caindo:{ t:() => 'o rosto caindo', ids:['sulco_nasolabial', 'flacidez'] },
  pescoco:{ t:() => 'o pescoço e a papada', pl:true, ids:['flacidez'] },
  palpebra:{ t:() => 'a pálpebra pesando', ids:['olhos'] },
  manchas:{ t:() => 'as manchas e as rugas', pl:true, ids:['manchas', 'linhas_testa', 'olhos'] },
};
// fontes completas (todas em evidencia.md, conferidas no PubMed em 04/11/2026): só dentro de "Ver os estudos"
const ESTUDOS = [
  ['Christensen et al., BMJ 2009', 'https://doi.org/10.1136/bmj.b5262', '1.826 gêmeos dinamarqueses com 70 anos ou mais: quem aparentava mais idade na foto tinha, em média, menos força e memória.'],
  ['Guyuron et al., Plast Reconstr Surg 2009', 'https://doi.org/10.1097/PRS.0b013e31819c4d42', '186 pares de gêmeos idênticos: cada 10 anos de cigarro a mais somaram cerca de 2 anos ao rosto; mais sol andou junto com um rosto mais velho.'],
  ['Gunn et al., J Gerontol A 2012', 'https://doi.org/10.1093/gerona/gls154', '514 pessoas sem doença: a pressão foi o fator do coração mais ligado à idade que o rosto aparentava.'],
  ['Noordam et al., Age 2011', 'https://doi.org/10.1007/s11357-011-9339-9', '602 pessoas: glicose mais alta já aparece no rosto, mesmo sem diabetes.'],
  ['Oyetakin-White et al., Clin Exp Dermatol 2015', 'https://doi.org/10.1111/ced.12455', '60 mulheres: dormir mal se ligou a mais sinais de envelhecimento na pele.'],
  ['Mayes et al., PLoS One 2010', 'https://doi.org/10.1371/journal.pone.0015270', '250 mulheres: atividade moderada se ligou a um rosto mais novo.'],
];
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
    <span class="rg-rot" style="left:${pc(idade)}">Você: ${idade}</span>
    <span class="rg-ponta" style="left:0">${lo}</span><span class="rg-ponta fim" style="left:100%">${hi}</span>
  </div>`;
}
// o que das respostas pesa no rosto: frases só de evidencia.md §4 e do desenho-v2 (↑ pesa · ↓ a favor · ? a foto não mede)
function fatores(max = 3){
  const at = [], bom = [], M = R.metabolico;
  const CIG = 'o cigarro é o hábito com o efeito mais claro no rosto.';
  if (['hoje','as_vezes'].includes(R.cigarro)) at.push({ id:'cigarro', s:'↑', r:resp('cigarro'), t:cap(CIG) });
  else if (R.cigarro === 'parou') at.push({ id:'cigarro', s:'↑', r:resp('cigarro'), t:'Ter parado conta: ' + CIG });
  else if (R.cigarro === 'nunca') bom.push({ id:'cigarro', s:'↓', r:resp('cigarro'), t:cap(CIG) });
  if (M === 'pressao') at.push({ id:'metabolico', s:'↑', r:resp('metabolico'), t:'A pressão foi o fator do coração mais ligado ao rosto.' });
  else if (M === 'glicose') at.push({ id:'metabolico', s:'↑', r:resp('metabolico'), t:'Glicose mais alta já aparece no rosto, mesmo sem diabetes.' });
  else if (M === 'ambas') at.push({ id:'metabolico', s:'↑', r:resp('metabolico'), t:'A pressão foi o fator do coração mais ligado ao rosto.' });   // a glicose fica no rótulo; frase curta (evidencia.md §4)
  else if (M === 'nao_medi') bom.push({ id:'metabolico', s:'↓', r:resp('metabolico'), t:'Em quem não tem doença, pressão e glicose mais baixas andaram junto com um rosto mais novo.' });
  if (['todo_dia','fds'].includes(R.sol)) at.push({ id:'sol', s:'↑', r:resp('sol'), t:'Parte do que aparece na foto é sol: é pele por fora, não necessariamente o corpo por dentro.' });
  else if (R.sol === 'quase_nenhum') bom.push({ id:'sol', s:'↓', r:resp('sol'), t:'Nos gêmeos, quem usava protetor aparentava menos idade.' });   // Guyuron 2009 (evidencia.md §2)
  if (['curto','cansado'].includes(R.sono)) at.push({ id:'sono', s:'↑', r:resp('sono'), t:'Dormir mal se ligou a mais sinais de envelhecimento na pele.' });
  else if (R.sono === 'bem') bom.push({ id:'sono', s:'↓', r:resp('sono'), t:'Dormir mal se ligou a mais sinais de envelhecimento na pele.' });
  if (['quase_nada','ate2'].includes(R.movimento)) at.push({ id:'movimento', s:'↑', r:resp('movimento'), t:'Atividade moderada se ligou a um rosto mais novo.' });
  else if (['2a5','mais5'].includes(R.movimento)) bom.push({ id:'movimento', s:'↓', r:resp('movimento'), t:'Atividade moderada se ligou a um rosto mais novo.' });
  if (M === 'nunca') at.push({ id:'metabolico', s:'?', r:resp('metabolico'), t:'Os estudos ligaram as duas ao rosto, e a foto não mede nenhuma.' });
  // até 3; quando há os dois lados, 2 que pesam + 1 a favor (resposta construtiva, sem só cobrança)
  // com a dor do espelho no bloco da foto (v3), até 2 linhas: 1 que pesa + 1 a favor (as palavras antes do botão ficam em ~160)
  return at.length && bom.length ? [...at.slice(0, max - 1), bom[0]] : [...at, ...bom].slice(0, max);
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

  // 1 + 2. número, régua, foto pequena e a frase de leitura (a do "mais velho" é a aprovada em evidencia.md §4)
  const O = nome ? `${esc(nome)}, o` : 'O';
  const LEITURA = {
    mais_novo:`${O} seu rosto aparenta menos que os seus ${idade} anos: está do lado que os estudos associam a mais vitalidade.`,
    igual:`${O} seu rosto acompanha os seus ${idade} anos.`,
    mais_velho:`${O} seu rosto aparenta mais do que os seus ${idade} anos. Nos estudos, isso se liga a hábitos que dá para olhar com calma, e a genética pesa tanto quanto eles.`,
  };
  const cab = `<div class="r-cab"><img id="r-foto" alt="A sua foto de frente, com tarja nos olhos"><p class="nota">Idade que o seu rosto aparenta</p></div>`;
  $('r-num').innerHTML = daParaDizer
    ? `${cab}<p class="numero">${fx.min}–${fx.max}<span>anos</span></p>${regua(fx, idade)}
       <p class="r-leitura" data-caso="${caso}">${LEITURA[caso]}</p>
       <p class="nota">Estimativa pela foto, não é diagnóstico.</p>`
    : `${cab}<h2 data-caso="sem_numero">Não deu para estimar</h2>
       <p>A foto não deu segurança para dar um número. Com a luz de uma janela na frente, a estimativa sai melhor.</p>
       <button type="button" class="link-alt" id="r-refazer">Tirar outra foto</button>`;
  const topo = fotoTopo(al, fr.g, 240); $('r-foto').src = topo.toDataURL('image/jpeg', .86); topo.width = topo.height = 0;
  $('r-refazer')?.addEventListener('click', () => { track('answer', { stepId:'resultado-refazer', valueText:'abriu' }); show('instrucao'); });

  // 3. o que a foto mostra: até 2 sinais mais marcados + 1 a favor (o mais liso), com o recorte da própria foto
  const vis = Object.keys(SINAL).filter(id => nivel(id) != null).sort((a, b) => nivel(b) - nivel(a));
  const sel = vis.filter(id => nivel(id) >= 1).slice(0, 2);
  const liso = [...vis].reverse().find(id => !sel.includes(id) && nivel(id) === 0); if (liso) sel.push(liso);
  for (const id of vis) if (sel.length < 3 && !sel.includes(id)) sel.push(id);
  // a dor do espelho primeiro (se a região apareceu na foto); com ela, 2 recortes (cabe nas ~160 palavras antes do botão)
  const D = DOR[R.espelho], dorId = D ? D.ids.filter(id => nivel(id) != null).sort((a, b) => nivel(b) - nivel(a))[0] || null : null;
  if (dorId){ sel.splice(0, sel.length, dorId, ...sel.filter(id => id !== dorId)); sel.length = Math.min(sel.length, 2); }
  resultado.dor = dorId;
  const txtRecorte = id => id === dorId ? `Você disse que ${D.t()} te ${D.pl ? 'incomodam' : 'incomoda'}. Na sua foto: ${SINAL[id].c[nivel(id)].toLocaleLowerCase('pt-BR')}.` : SINAL[id].c[nivel(id)];
  $('r-foto-bloco').hidden = !daParaDizer || !sel.length;
  $('r-foto-bloco').innerHTML = `<h3>O que a sua foto mostra</h3><ul class="recortes">${sel.map(id => `<li data-id="${id}"${id === dorId ? ' data-dor="1"' : ''}><canvas data-r="${SINAL[id].recorte}" role="img" aria-label="Recorte da sua foto: ${esc(SINAL[id].nome.toLowerCase())}"></canvas>
    <div><b>${esc(SINAL[id].nome)}</b><span>${esc(txtRecorte(id))}</span></div></li>`).join('')}</ul>`;
  $('r-foto-bloco').querySelectorAll('canvas[data-r]').forEach(c => { const r = recorteRegiao(al, fr.g, c.dataset.r, 128); c.width = r.width; c.height = r.height; c.getContext('2d').drawImage(r, 0, 0); r.width = 0; });
  al.width = al.height = 0;

  // 4. o que das respostas pesa no rosto
  const fs = fatores(dorId ? 2 : 3);
  $('r-fatores').hidden = !daParaDizer;
  $('r-fatores').innerHTML = `<h3>O que das suas respostas pesa no rosto</h3>${fs.length
    ? `<ul class="fatores">${fs.map(x => `<li data-f="${x.id}"><i class="${x.s === '↓' ? 'bom' : ''}" aria-label="${x.s === '↑' ? 'pesa' : x.s === '↓' ? 'a favor' : 'a foto não mede'}">${x.s}</i><p><b>${esc(x.r)}.</b> ${esc(x.t)}</p></li>`).join('')}</ul>`
    : '<p>Nas suas respostas não apareceu nenhum dos fatores mais estudados.</p>'}`;
  // 5. CTA: liga o que ela marcou (espelho + daqui a 10 anos) ao resultado e dá o próximo passo; e, fechado, os estudos
  $('r-ponte-txt').textContent = textoCTA(daParaDizer ? fx : null);
  $('r-cta-nota').textContent = 'Abre o WhatsApp com o seu código';   // 08/11: WhatsApp em primeiro também com ?lv=
  $('r-estudos-txt').innerHTML = ESTUDOS.map(([t, u, x]) => `<p><b>${esc(t)}.</b> ${esc(x)} <a href="${u}" target="_blank" rel="noopener">Ver o estudo</a></p>`).join('')
    + '<p>Estimativa feita por inteligência artificial a partir de fotos. Não é exame nem diagnóstico. As associações citadas vêm de estudos com grupos de pessoas e não preveem a saúde de ninguém individualmente. As fotos são usadas só para a análise e apagadas depois. Dr. Lucca Marques, CRM-GO 33.990.</p>';
  $('r-estudos').open = false;
  $('r-estudos').ontoggle = () => { if ($('r-estudos').open) track('answer', { stepId:'resultado-estudos', valueText:'abriu' }); };

  // complete: o que a Caixa lê (codigo, idade, sexo, faixa, caso, respostas, angulos/enviadas para as 3 fotos, desejo)
  track('complete', { stepId:'resultado', stepIndex:ORDEM.indexOf('resultado'), valueText:caso,
    props:{ codigo:meuCodigo(), idade, sexo:R.sexo || null, faixa:daParaDizer ? `${fx.min} a ${fx.max} anos` : null, caso, respostas:respostasLimpa(),
            desejo:desejo() || null, espelho_regiao:dorId, confianca:j.confianca, qualidade:j.qualidade?.nota, foto:j.foto || null, origem:fr.origem,
            enviadas:window.__ultimoEnvio?.n || 1, angulos:window.__ultimoEnvio?.angulos || ['frente'],
            frases:daParaDizer ? fs.map(x => x.id).join('+') : '',
            sinais:Object.entries(sinais).map(([id, s]) => ({ id, visivel:s.visivel, nivel:s.visivel ? s.nivel : null })) } });
  if (window.__peleResultado) window.__peleResultado(j);
}
function respostasLimpa(){ const { nome, ...r } = R; return r; }
// "{Nome}, você disse que {incômodo} e que daqui a 10 anos quer {objetivo}. O seu rosto aparenta de X a Y anos. Mande o seu código: …"
// Sem nome: começa em "Você". Sem incômodo ('nada'): só o objetivo. Sem número: a frase da faixa sai. Fim B não fala em vídeo.
function textoCTA(fx){
  const nome = nomeBonito(), dor = DOR_FRASE[R.espelho]?.() || '', d = desejo(FUT_QUER);
  const disse = [dor, d ? `${dor ? 'que ' : ''}daqui a 10 anos quer ${d}` : ''].filter(Boolean).join(' e ');
  const partes = [];
  if (disse) partes.push(`${nome ? `${nome}, você` : 'Você'} disse que ${disse}.`);
  if (fx) partes.push(`O seu rosto aparenta de ${fx.min} a ${fx.max} anos.`);
  partes.push(FIM === 'B' ? 'Mande o seu código: o Dr. Lucca olha o seu caso e explica o que pesa e por onde começar.'
                          : 'Mande o seu código: o Dr. Lucca analisa o seu caso e te explica o que pesa e por onde começar.');
  return partes.join(' ');
}

// =====================================================================
// FECHAMENTO: igual ao de antes (1 passo, 3ª pessoa): WhatsApp com o código na mensagem pronta, Direct como alternativa;
// link marcado (?lv=) volta ao Instagram. Medição: cta_click com props.canal whatsapp/direct.
// =====================================================================
const souA = () => R.sexo === 'm' ? 'o' : 'a';
const sou = () => nomeBonito() ? `Sou ${souA()} ${nomeBonito()}` : '';
function mensagem(){
  const s = sou(), fx = resultado?.faixa;
  const rosto = fx && R.idade ? ` Tenho ${R.idade} anos e o meu rosto deu ${fx.min} a ${fx.max}.` : '';
  const d = desejo(FUT_EU), quer = d ? ` Daqui a 10 anos, quero ${d}.` : '';
  return `Oi, Dr. Lucca! ${s ? s + '. ' : ''}Fiz o teste da idade do rosto, código ${meuCodigo()}.${rosto}${quer} Quero que você me explique o meu resultado.\n${linhaPrazo()}`;
}
const linkWA = () => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem())}`;
function prepararFechamento(){
  const nome = nomeBonito();
  $('cod').textContent = meuCodigo();
  // 09/11 (Lucca): A = "vai te explicar por onde começar para {objetivo}", sem o parágrafo do vídeo; B = "vai olhar o seu
  // resultado". O "sem custo" saiu dos dois títulos: mora na frase do prazo, logo acima do botão. O código fica na última linha.
  const d = desejo();
  const tit1 = FIM === 'B' ? 'o Dr. Lucca vai olhar o seu resultado.' : `o Dr. Lucca vai te explicar por onde começar${d ? ` para ${d}` : ''}.`;
  $('f-tit').textContent = nome ? `${nome}, ${tit1}` : tit1[0].toUpperCase() + tit1.slice(1);
  $('f-sub').textContent = '';   // 09/11: decisão de 03/11 do Lucca, nada de "vídeo/grava um por um" nem "responde em até 24 h"
  $('f-sub').hidden = FIM !== 'B';
  $('cta-wa').href = linkWA();
  $('wa-txt').textContent = 'Enviar meu código pelo WhatsApp';
  $('cta-dm').hidden = false;
}
const fimProps = () => ({ escolha:'explicar', codigo:meuCodigo() });

// =====================================================================
// PRAZO (09/11, decisão do Lucca): análise sem custo para quem enviar em 30 min, contados da 1ª vez que a pessoa vê o
// resultado. Guardado no localStorage pelo código LV: livowa_prazo = { 'LV-XXXX': { t, teste } } (o mesmo objeto do braço).
// O código é novo a cada carregamento; quem recarrega e refaz o teste em até 24 h herda o início do último resultado
// deste teste, para o prazo não recomeçar. A mensagem diz se saiu no prazo, lido no toque do botão. Vale no fim A e no B.
// =====================================================================
const PRAZO_MS = 30 * 60 * 1000, PRAZO_CHAVE = 'livowa_prazo', PRAZO_TESTE = 'pele', PRAZO_HERDA = 24 * 3600 * 1000, PRAZO_GUARDA = 7 * 24 * 3600 * 1000;
function lerPrazos(){ try { const m = JSON.parse(localStorage.getItem(PRAZO_CHAVE) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch { return {}; } }
function gravarPrazos(m){ try { localStorage.setItem(PRAZO_CHAVE, JSON.stringify(m)); } catch {} }
let prazoT0 = null, prazoIv = null;   // prazoT0: cópia em memória (vale quando o navegador não deixa gravar)
function iniciarPrazo(){
  const m = lerPrazos(), c = meuCodigo(), agora = Date.now();
  if (+m[c]?.t) prazoT0 = +m[c].t;
  else {
    if (prazoT0 == null){
      const ult = Object.values(m).filter(x => x && x.teste === PRAZO_TESTE && +x.t && agora - x.t < PRAZO_HERDA).sort((a, b) => b.t - a.t)[0];
      prazoT0 = ult ? +ult.t : agora;
    }
    for (const k of Object.keys(m)) if (!(agora - (+m[k]?.t || 0) < PRAZO_GUARDA)) delete m[k];   // limpa os velhos
    m[c] = { t:prazoT0, teste:PRAZO_TESTE }; gravarPrazos(m);
  }
  clearInterval(prazoIv); prazoIv = setInterval(pintarPrazo, 1000);
}
function prazoResta(){   // ms que faltam (null = o resultado ainda não apareceu); relê o guardado a cada vez
  const t = +lerPrazos()[codigo]?.t || prazoT0;
  return t ? Math.max(0, t + PRAZO_MS - Date.now()) : null;
}
function noPrazo(){ const r = prazoResta(); return r == null || r > 0; }
function linhaPrazo(){ return noPrazo() ? '(enviado no prazo da análise sem custo)' : '(enviado depois do prazo)'; }
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
function pintarPrazo(){
  const r = prazoResta(), ok = r == null || r > 0;
  $('r-prazo').hidden = cur !== 'resultado' || r == null || !ok;
  if (r == null) return;
  if (ok) $('r-prazo').innerHTML = `Análise sem custo se enviar em <b>${mmss(r)}</b>`;
  $('f-prazo').classList.toggle('acabou', !ok);
  const txt = ok ? 'Envie a solicitação de análise para o Dr. Lucca. Se enviar nos próximos 30 minutos, será sem custo.'
                 : 'O prazo da análise sem custo acabou. Você ainda pode enviar: o Dr. Lucca te responde como fica.';
  if ($('f-prazo-txt').textContent !== txt) $('f-prazo-txt').textContent = txt;
  $('f-prazo-rel').hidden = !ok; $('f-prazo-rel').textContent = ok ? `Faltam ${mmss(r)}` : '';
  if (cur === 'fechar') $('cta-wa').href = linkWA();
}
const fimValor = () => `explicar|fim${FIM}`;
// o href é refeito no toque: a linha do prazo vale para o momento do envio, não para quando a tela abriu
$('cta-wa').addEventListener('click', () => { $('cta-wa').href = linkWA(); track('cta_click', { stepId:'fechar', valueText:fimValor(), props:{ canal:'whatsapp', noPrazo:noPrazo(), ...fimProps() } }); });
$('cta-dm').addEventListener('click', e => abrirDirect(e));   // com ou sem ?lv=: copia a mensagem com o código e abre o Direct

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
  track('cta_click', { stepId:'fechar', valueText:fimValor(), props:{ canal:'direct', copiou, noInstagram:NO_INSTAGRAM, noPrazo:noPrazo(), ...fimProps() } });
  if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem:txt, copiou, voz:true }); return; }
  if (copiou){ $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 6000); return; }
  e.preventDefault();
  $('aviso-msg').textContent = txt; $('aviso-link').href = $('cta-dm').href; $('aviso-dm').hidden = false;
}
$('aviso-dm').addEventListener('click', ev => { if (ev.target === $('aviso-dm')) $('aviso-dm').hidden = true; });
$('aviso-link').addEventListener('click', () => { track('cta_click', { stepId:'fechar', valueText:fimValor() + '|abrir', props:{ canal:'direct', ...fimProps() } }); setTimeout(() => { $('aviso-dm').hidden = true; }, 800); });
// 08/11 (Lucca): WhatsApp em primeiro em todos os fins, também para quem veio do Direct pelo link marcado (?lv=). Nada
// volta sozinho para o Direct; quem escolher o Direct manda a mensagem com o código (copiada), igual a quem não tem ?lv=.
// O lv continua indo nos eventos (props.lv, pelo funnel-analytics).

// ---------- início ----------
document.querySelectorAll('.opts[data-q]').forEach(ligarOpcoes);
show('capa');
// ganchos do teste automático (headless): estado e resultado sem câmera
window.__pele = { R, estado:() => ({ cur, codigo, envio:window.__ultimoEnvio || null, resultado, barra:window.__barra }), show, mensagem, pBarra, BARRA };
