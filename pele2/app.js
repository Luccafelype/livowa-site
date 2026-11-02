// livowa.com/pele2 · funil de análise da pele, tela por tela no formato do NIKS (teardown v1 de 01/11/2026),
// com as regras da Livowa: sem número sem fonte, sem promessa, sem depoimento, sem marca; textos de mecanismo só da
// biblioteca (biblioteca.json, gerado de paginas/consulta-codigo/web/sinais.json); nada de texto livre da IA na tela.
import * as Analytics from '/idade/funnel-analytics.js';
import { dicaDirect } from '/assets/js/dica-direct.js?v=3';
import * as Scan from './scan.js?v=3';
import { montarEnvio, alinhar, fotoTopo, recorteRegiao, criarFace, geometria, medir, pose, caixa, OVAL, NITIDEZ_MIN } from './rosto.js?v=2';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const Q = new URLSearchParams(location.search);
const LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);

// ---------- medição (mesmo Supabase de /idade; em localhost só loga no console) ----------
const SUPA_URL = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co', SUPA_KEY = 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K';   // chave pública
Analytics.init({ enabled:true, funnelId:'pele2', variant:Q.get('v') || 'direto', supabaseUrl:SUPA_URL, supabaseKey:SUPA_KEY });
// Teste A/B do fim (02/11, pedido do Lucca): A = "vai explicar o seu resultado em vídeo"; B = sem falar em vídeo (o vídeo
// é surpresa). Sorteio 50/50 uma vez por aparelho; ?fim=A|B força. O variant do Analytics fica como está (Pele × Pele 2):
// a variante vai em props.fim de TODOS os eventos e no valueText do cta_click da tela final ('explicar|fimB').
const FIM = (() => {
  const q = (Q.get('fim') || '').toUpperCase(); if (q === 'A' || q === 'B') return q;
  try { let v = localStorage.getItem('livowa_pele2_fim'); if (v !== 'A' && v !== 'B'){ v = Math.random() < .5 ? 'A' : 'B'; localStorage.setItem('livowa_pele2_fim', v); } return v; }
  catch { return Math.random() < .5 ? 'A' : 'B'; }
})();
const track = (tipo, o = {}) => Analytics.track(tipo, { ...o, props:{ ...(o.props || {}), fim:FIM } });
track('view');

// ---------- análise: a MESMA edge de /idade (analisar-pele), mesmo corpo, mesmo freio ----------
// Em localhost dá para apontar para um mock com ?pele=<url>.
const PELE_PRODUCAO = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co/functions/v1/analisar-pele';
const PELE_ENDPOINT = (LOCAL && Q.get('pele')) || PELE_PRODUCAO;
// Fotos de lado: a edge publicada em 01/11 (proposta-pele2) entende {angulos:['frente','esquerda','direita']}.
const LATERAIS_NA_EDGE = true;
// v2: pede também espinhas/cravos/marcas (extras:['acne']). A edge antiga ignora o campo; a página funciona com e sem.
const EXTRAS = ['acne'];
const WHATSAPP = '5562991774809';

// ---------- dados ----------
const R = { incomoda:[] };          // respostas
let BIB = null, codigo = null, fotos = null, resultado = null;
const bibPronta = fetch('biblioteca.json?v=2').then(r => r.json()).then(j => (BIB = j)).catch(() => null);
const ALFA = 'ACDEFGHJKMNPQRTUVWXY34679';
function meuCodigo(){ if (!codigo){ const a = crypto.getRandomValues(new Uint8Array(4)); codigo = 'LV-' + [...a].map(x => ALFA[x % ALFA.length]).join(''); } return codigo; }

const GRADE = [
  ['acne', 'Acne / espinhas'], ['manchas', 'Manchas'], ['cravos', 'Cravos'], ['oleosidade', 'Oleosidade'],
  ['rugas', 'Rugas e linhas'], ['poros', 'Poros dilatados'], ['olheiras', 'Olheiras'], ['ressecamento', 'Ressecamento'],
  ['textura', 'Textura irregular'], ['outro', 'Outro'],
];
const ROT = {   // rótulos curtos das respostas (tela e analytics)
  sexo:{ f:'mulher', m:'homem' },
  seguranca:{ nenhuma:'nenhuma', gravida:'grávida', amamentando:'amamentando', tentando:'tentando engravidar' },
  alergia:{ nao:'sem alergia', sensivel:'pele sensível', reacao:'já teve reação', nao_sei:'não sabe' },
  tipo:{ oleosa:'oleosa', seca:'seca', mista:'mista', normal:'normal', nao_sei:'não sabe' },
  sol:{ quase_nada:'quase nada de sol', menos_1h:'menos de 1 h de sol', '1a3h':'1 a 3 h de sol', mais_3h:'mais de 3 h de sol' },
  agua:{ menos_1l:'menos de 1 L', '1a2l':'1 a 2 L', '2a3l':'2 a 3 L', mais_3l:'mais de 3 L' },
  sono:{ '4a5':'4 a 5 h', '6':'6 h', '7':'7 h', '8':'8 h', '9mais':'9 h ou mais' },
  rotina:{ nenhuma:'sem rotina', funciona:'rotina que funciona', receitada:'produtos receitados', nao_sei:'não sabe se funciona' },
  objetivo:{ confianca:'Me sentir bem e confiante com a minha pele', sem_maquiagem:'Sair sem maquiagem nem filtro, sem me preocupar', sem_filtro:'Sair sem filtro na foto', fotos:'Gostar de me ver em foto de perto', prevenir:'Cuidar agora, antes que piore', parar_gastar:'Parar de gastar com o que não funciona', outro:'O que você me contar' },
  incomoda:Object.fromEntries(GRADE),
};
const nome1 = () => (R.nome || '').trim().split(/\s+/)[0] || '';

// ---------- telas ----------
// ordem do NIKS (teardown v1), sem as telas que ele não tem. 02/11: a 1ª tela é a capa (promessa + botão) e o nome vem
// depois das primeiras perguntas de toque (pesquisa-fim-do-teste.md, C); as telas antes do nome não usam o nome.
const ORDEM = ['capa','sexo','seguranca','alergia','nome','incomoda','tipo','sol','agua','sono','rotina','objetivo','instrucao','scan','carregando','resultado','fechar','erro'];
const QUIZ = ['sexo','seguranca','alergia','incomoda','tipo','sol','agua','sono','rotina','objetivo'];
const VOLTA = { scan:'instrucao', erro:'instrucao', fechar:'resultado' };
let cur = 'nome';
function show(s){
  if (cur === 'scan' && s !== 'scan') Scan.parar();
  document.querySelectorAll('.screen').forEach(el => el.hidden = el.dataset.s !== s);
  cur = s;
  track('step_view', { stepId:s, stepIndex:ORDEM.indexOf(s) });
  document.body.classList.toggle('scan-on', s === 'scan');
  $('top').hidden = ['capa','scan','carregando','resultado'].includes(s);
  const cta = $('cta'), c2 = $('cta-2');
  $('cta-bar').hidden = ['scan','carregando','fechar'].includes(s);   // tela final: cada cartão tem o próprio botão
  cta.hidden = false; c2.hidden = true; cta.classList.remove('off');
  cta.textContent = 'Continuar';
  if (s === 'capa') cta.textContent = 'Começar a análise';
  if (s === 'nome'){ cta.classList.toggle('off', nome1().length < 2); }
  if (s === 'objetivo') objetivoPorSexo();
  if (QUIZ.includes(s)) cta.classList.toggle('off', !respondida(s));
  if (s === 'instrucao'){ cta.textContent = 'Abrir a câmera'; cta.classList.toggle('off', !$('aceite').checked); animarIlustracao(); }
  if (s === 'erro'){ cta.textContent = erroRede ? 'Tentar de novo' : 'Tirar de novo'; c2.hidden = false; c2.textContent = 'Escolher uma foto'; }
  if (s === 'resultado') cta.textContent = 'Quero que o Dr. Lucca me explique';   // um botão só (02/11: o link "seguir sozinho + lembrete em 4 semanas" saiu)
  if (s === 'fechar') prepararFechamento();
  document.querySelectorAll('.nm').forEach(el => { el.textContent = nome1() ? nome1() + ', ' : ''; });
  window.scrollTo(0, 0);
  requestAnimationFrame(medirBarra);
}
function medirBarra(){ const b = $('cta-bar'); document.documentElement.style.setProperty('--cta-h', (b.hidden ? 0 : b.offsetHeight) + 'px'); }
addEventListener('resize', medirBarra);
// a barra muda de altura sem trocar de tela (fonte que chega, texto que quebra, barra do Safari): o espaço no fim acompanha
if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe($('cta-bar'));
// homem não vê a pergunta de gestação: segurança fica "nenhuma" sozinha; se voltar e trocar para mulher, a pergunta volta
const pula = s => s === 'seguranca' && R.sexo === 'm';
function ajustarSeguranca(){
  if (R.sexo === 'm'){ if (R.seguranca == null){ R.seguranca = 'nenhuma'; R.segAuto = true; track('answer', { stepId:'seguranca', valueText:'nenhuma' }); } }
  else if (R.segAuto){ delete R.seguranca; delete R.segAuto; document.querySelectorAll('[data-q="seguranca"] [data-v]').forEach(x => x.setAttribute('aria-pressed', 'false')); }
}
// "Sair sem maquiagem nem filtro" vira, para homem, "Sair sem filtro na foto" (valor próprio, sem_filtro); se a pessoa
// voltou e trocou o sexo depois de marcar, a resposta passa para a versão do outro sexo
function objetivoPorSexo(){
  const op = v => document.querySelector(`[data-q="objetivo"] [data-v="${v}"]`), h = R.sexo === 'm';
  op('sem_maquiagem').hidden = h; op('sem_filtro').hidden = !h;
  const de = h ? 'sem_maquiagem' : 'sem_filtro', para = h ? 'sem_filtro' : 'sem_maquiagem';
  if (R.objetivo === de){ R.objetivo = para; op(de).setAttribute('aria-pressed', 'false'); op(para).setAttribute('aria-pressed', 'true'); }
}
function proxima(){ ajustarSeguranca(); let i = ORDEM.indexOf(cur) + 1; while (pula(ORDEM[i])) i++; show(ORDEM[i]); }
function respondida(q){ return q === 'incomoda' ? R.incomoda.length > 0 : R[q] != null; }

$('back').addEventListener('click', () => {
  if (VOLTA[cur]) return show(VOLTA[cur]);
  let i = ORDEM.indexOf(cur) - 1; while (i > 0 && pula(ORDEM[i])) i--; if (i >= 0) show(ORDEM[i]);
});

// ---------- nome ----------
$('nome').addEventListener('input', () => { R.nome = $('nome').value.replace(/[<>]/g, '').slice(0, 40); $('cta').classList.toggle('off', nome1().length < 2); });
$('nome').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); $('cta').click(); } });
function nomeBonito(){ const n = nome1(); return n ? n[0].toLocaleUpperCase('pt-BR') + n.slice(1) : ''; }

// ---------- perguntas de uma escolha (avança sozinho) e de até 3 ----------
function ligarOpcoes(box){
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
    const q = box.dataset.q, v = b.dataset.v;
    if (box.dataset.tipo === 'ate3'){
      const i = R.incomoda.indexOf(v);
      if (i >= 0) R.incomoda.splice(i, 1); else if (R.incomoda.length < 3) R.incomoda.push(v);
      box.querySelectorAll('[data-v]').forEach(x => { const on = R.incomoda.includes(x.dataset.v); x.setAttribute('aria-pressed', String(on)); x.disabled = !on && R.incomoda.length >= 3; });
      $('cta').classList.toggle('off', !R.incomoda.length);
      return;
    }
    R[q] = v; if (q === 'seguranca') delete R.segAuto;
    box.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    track('answer', { stepId:q, valueText:v });
    $('cta').classList.remove('off');
    setTimeout(() => { if (cur === q) proxima(); }, 260);
  });
}
function montarGrade(){
  $('grade').innerHTML = GRADE.map(([id, rot]) => `<button type="button" class="cel" data-v="${id}" aria-pressed="false">
    ${id === 'outro' ? '<span class="outro" aria-hidden="true">✦</span>' : `<img src="img/${id}.jpg?v=1" alt="" width="320" height="320" loading="eager">`}
    <span class="ck" aria-hidden="true"></span>${esc(rot)}</button>`).join('');
  fetch('img/creditos.json?v=1').then(r => r.json()).then(c => {
    const fonte = u => /commons/.test(u) ? 'Wikimedia Commons' : 'PMC';
    const itens = Object.values(c).filter((x, i, a) => a.findIndex(y => y.autor === x.autor) === i)
      .map(x => `${esc(x.autor)}, ${esc(x.licenca)}, <a href="${esc(x.fonte)}" target="_blank" rel="noopener">${fonte(x.fonte)}</a>`);
    $('creditos').innerHTML = `Fotos: ${itens.join(' · ')}. Recortadas e reduzidas; os recortes de fotos CC BY-SA seguem a mesma licença.`;
  }).catch(() => {});
}
// ilustração da instrução: um rosto que vira para a esquerda e para a direita, e o anel acende junto (mesmo ciclo do CSS)
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
    const f = ((performance.now() - t0) % 4800) / 4800;   // 0-0,14 frente · 0,3-0,44 esquerda · 0,6-0,74 direita
    tks.forEach((tk, k) => { const a = k*7.5, topo = (a > 60 && a < 120) || (a > 240 && a < 300), esq = a >= 120 && a <= 240;
      const on = f < .95 && ((topo && f > .06) || (esq && f > .2 + Math.abs(a - 180)/60*.12) || (!topo && !esq && f > .5 + Math.min(Math.abs(a), Math.abs(a - 360))/60*.12));
      tk.classList.toggle('on', on); });
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
  if (cur === 'nome'){ R.nome = nomeBonito(); track('answer', { stepId:'nome', valueText:'ok' }); return proxima(); }
  if (cur === 'incomoda'){ track('answer', { stepId:'incomoda', valueText:R.incomoda.join('+') }); return proxima(); }
  if (QUIZ.includes(cur)) return proxima();
  if (cur === 'instrucao') return abrirScan();
  if (cur === 'erro') return erroRede && fotos ? enviar(fotos) : abrirScan();
  if (cur === 'resultado'){ track('cta_click', { stepId:'resultado', valueText:'explicar' }); return show('fechar'); }
});
$('cta-2').addEventListener('click', () => {
  if (cur === 'erro') $('arquivo').click();
});
$('galeria').addEventListener('click', () => { if (!$('aceite').checked) return apontarAceite(); $('arquivo').click(); });
$('aceite').addEventListener('change', () => { $('aceite').closest('.consent').classList.remove('alerta'); if (cur === 'instrucao') $('cta').classList.toggle('off', !$('aceite').checked); });
function apontarAceite(){ const l = $('aceite').closest('.consent'); l.classList.add('alerta'); l.scrollIntoView({ block:'center', behavior:'smooth' }); }

// ---------- scan ----------
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

// ---------- galeria (só a foto de frente) ----------
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

// ---------- envio e carregamento em etapas ----------
let erroRede = false;
function erro(txt, rede){ erroRede = !!rede; $('erro-tit').textContent = rede ? 'Não consegui analisar agora' : 'Essa foto não deu para ler'; $('erro-txt').textContent = txt; show('erro'); }
const PERIM = 326.7;
function progresso(p, etapa){
  $('prog-c').style.strokeDashoffset = (PERIM * (1 - p/100)).toFixed(1);
  $('prog-pct').innerHTML = `${Math.round(p)}<small>%</small>`;
  if (etapa != null){ $('prog-etapa').textContent = etapa.txt; [...$('prog-dots').children].forEach((d, i) => d.classList.toggle('on', i === etapa.i)); }
}
async function enviar(f){
  fotos = f;
  await bibPronta;
  const tipo = R.tipo && R.tipo !== 'nao_sei' ? `pele ${ROT.tipo[R.tipo]}` : 'seu tipo de pele';
  const queixa = R.incomoda[0] ? ROT.incomoda[R.incomoda[0]].toLowerCase() : 'o que você marcou';
  const ETAPAS = [{ i:0, ate:22, txt:Object.keys(f).length > 1 ? 'Lendo suas fotos' : 'Lendo sua foto' }, { i:1, ate:52, txt:'Mapeando as áreas do rosto' },
                  { i:2, ate:84, txt:`Cruzando com o que você contou: ${tipo}, ${queixa}` }, { i:3, ate:100, txt:'Montando seu resultado' }];
  show('carregando'); progresso(0, ETAPAS[0]);
  const angulos = LATERAIS_NA_EDGE ? ['frente','esquerda','direita'].filter(a => f[a]) : ['frente'];
  const imagens = angulos.map(a => { const cv = montarEnvio(f[a].src, f[a].g), d = cv.toDataURL('image/jpeg', angulos.length > 1 ? .85 : .9).split(',')[1]; cv.width = cv.height = 0; return d; });
  const corpo = { imagens, modo:'rosto', ocultas:['olhos'], codigo:meuCodigo(), extras:EXTRAS, ...(angulos.length > 1 ? { angulos } : {}) };
  window.__ultimoEnvio = { n:imagens.length, angulos, kb:Math.round(imagens.reduce((s, x) => s + x.length, 0)*3/4/1024), capturadas:Object.keys(f) };
  // a barra anda sozinha até 92% enquanto a edge responde; o mínimo de ~8 s dá tempo de ler as etapas
  const t0 = performance.now(), MIN = 8000;
  let pct = 0, fim = false;
  const etapaDe = p => ETAPAS.find(e => p <= e.ate) || ETAPAS[3];
  const tick = setInterval(() => { if (fim) return; pct = Math.min(92, pct + (pct < 50 ? 2.6 : pct < 80 ? 1.6 : .6)); progresso(pct, etapaDe(pct)); }, 220);
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await fetch(PELE_ENDPOINT, { method:'POST', signal:ctl.signal, headers:{ 'Content-Type':'application/json', apikey:SUPA_KEY }, body:JSON.stringify(corpo) });
    const j = await r.json().catch(() => null);
    if (r.status === 429){ clearInterval(tick); return erro('Você já fez algumas análises agora. Espere uns minutos e tente de novo.', false); }
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
// RESULTADO (v2): achados por região → "sua preocupação faz sentido" → o que fazer (3 linhas) → botão do médico.
// Pontos fortes, recomendações completas, condição geral, evitar e plano ficam em "Ver relatório completo".
// =====================================================================
const GRAU = ['', 'Leve', 'Moderado', 'Marcado'];
const TEMA = { acne:'Espinhas', linhas:'Linhas', manchas:'Manchas', textura:'Poros e textura', contorno:'Contorno' };
const REG_ACNE = { testa:'testa', nariz:'zonaT', bochechas:'bochecha', queixo:'queixo', mandibula:'contorno' };
const NOME_REG = { testa:'testa', nariz:'nariz', bochechas:'bochechas', queixo:'queixo', mandibula:'mandíbula' };
const CRAVOS = ['Sem cravos', 'Poucos cravos', 'Vários cravos', 'Muitos cravos'];
const FORTE = {
  linhas_testa:'A foto não mostra linhas marcadas na testa.',
  olhos:'Sem linhas marcadas no canto dos olhos, na foto.',
  sulco_nasolabial:'O vinco do nariz à boca aparece pouco.',
  manchas:'A foto não mostra manchas importantes.',
  textura_poros:'Poros e relevo discretos na foto.',
  flacidez:'O contorno do rosto e da mandíbula está bem definido.',
  acne_ativa:'A foto não mostra espinhas inflamadas.',
  cicatriz_acne:'A foto não mostra marcas de espinhas antigas.',
};
// queixa marcada → sinais que falam dela. mede=false só onde a foto de fato não mede (brilho, ressecamento, "outro").
// Sem os campos de acne (edge antiga), espinha e cravo voltam ao que dá para dizer pela textura.
function mapa(temAcne){
  return {
    acne:temAcne ? { sinais:['acne_ativa'], mede:true } : { sinais:['textura_poros'], mede:false },
    manchas:{ sinais:['manchas'], mede:true },
    cravos:{ sinais:temAcne ? ['comedoes'] : ['textura_poros'], mede:true },
    oleosidade:{ sinais:['textura_poros'], mede:false },
    rugas:{ sinais:['linhas_testa','olhos','sulco_nasolabial'], mede:true },
    poros:{ sinais:['textura_poros'], mede:true },
    olheiras:{ sinais:['olhos'], mede:true },
    ressecamento:{ sinais:[], mede:false },
    textura:{ sinais:temAcne ? ['textura_poros', 'cicatriz_acne'] : ['textura_poros'], mede:true },
    outro:{ sinais:[], mede:false },
  };
}
const NAO_MEDE = {
  acne:'Esta análise ainda não leu espinhas nesta foto.',
  oleosidade:'O brilho muda com a hora do dia e com a luz, então a foto não mede oleosidade direito.',
  ressecamento:'Ressecamento se vê melhor de perto e ao toque; a foto não mede.',
  outro:'Conte na conversa o que é: o Dr. Lucca olha junto com a sua foto.',
};
const lower1 = s => s ? s[0].toLocaleLowerCase('pt-BR') + s.slice(1) : s;
const lista = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a.at(-1) : (a[0] || '');
const fmtData = d => d.toLocaleDateString('pt-BR', { day:'numeric', month:'short' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

// ---------- personalização (02/11): toda frase que depende de uma resposta cita a resposta DELA ----------
// gestação: só a condição que ela marcou, nunca a lista das três
const GEST = { gravida:['Como você está grávida', 'na gestação', 'fica para depois da gestação'],
               amamentando:['Como você está amamentando', 'na amamentação', 'fica para depois da amamentação'],
               tentando:['Como você está tentando engravidar', 'para quem está tentando engravidar', 'fica de fora enquanto você tenta engravidar'] };
const SENS = { sensivel:'Como a sua pele reage fácil', reacao:'Como você já teve reação a um produto' };
const comoTipo = () => ['oleosa','mista','seca'].includes(R.tipo) ? `Como você marcou pele ${ROT.tipo[R.tipo]}` : '';
const QX = { acne:'espinhas', manchas:'manchas', cravos:'cravos', oleosidade:'oleosidade', rugas:'rugas e linhas', poros:'poros dilatados', olheiras:'olheiras', ressecamento:'ressecamento', textura:'textura irregular' };
const marcou = ids => { const m = R.incomoda.filter(x => ids.includes(x)).map(x => QX[x]);   // na ordem em que ela marcou
  return m.length ? `Como você marcou ${lista(m)}` : ''; };
function poroOleo(){
  const t = ['oleosa','mista'].includes(R.tipo) ? `pele ${ROT.tipo[R.tipo]}` : '';
  if (R.sexo === 'm' || t) return `Como você ${R.sexo === 'm' ? 'é homem' + (t ? ` e marcou ${t}` : '') : `marcou ${t}`}, o poro tende a aparecer mais: ele tem muito de óleo e de hormônio.`;
  return BIB.frases.poro_oleo;
}
const juntar = (...xs) => xs.filter(Boolean).join(' ');
// Água e sono (02/11, regra do Lucca): hábito bom NUNCA é causa; entra como contrapartida ("Apesar de beber bastante água e
// dormir bem, …" + causa ligada ao achado da foto). Lacuna entra como conclusão ("Como você ainda não tem uma rotina…").
// Água tem evidência fraca para a pele: só aparece como contrapartida, nunca como causa nem como promessa (pouca água não
// é citada). Sono curto (≤ 5 h) tem estudo: Oyetakin-White 2015 (conferido no PubMed em 02/11, resumo).
const SONO_EV = { evidencia:'Em 60 mulheres, quem dormia mal (5 h ou menos) teve mais sinais de envelhecimento intrínseco e barreira da pele que se recuperou mais devagar; é associação, não prova de causa.',
  fonte:'Oyetakin-White 2015, Clin Exp Dermatol 40(1):17-22 — https://doi.org/10.1111/ced.12455 (conferido no PubMed, resumo)' };
const CAUSA = {   // causa plausível de cada achado, nas palavras da biblioteca (mecanismo)
  acne_ativa:'as espinhas podem vir de dentro do poro: o hormônio aumenta o óleo e o poro entope',
  textura_poros:'a textura e o poro aparente podem vir mais do óleo e do hormônio',
  manchas:'as manchas podem vir, em boa parte, do sol acumulado ao longo dos anos',
  linhas_testa:'as linhas podem vir do movimento da expressão e do sol', olhos:'as linhas podem vir do movimento da expressão e do sol',
  sulco_nasolabial:'o vinco do nariz à boca pode vir da idade, que muda o apoio do rosto',
  flacidez:'o contorno pode mudar com a idade, que diminui o apoio do osso',
  cicatriz_acne:'as marcas podem vir de espinhas antigas, que destruíram colágeno',
};
function textoHabitos(principal){
  const aguaBoa = ['2a3l','mais_3l'].includes(R.agua), sonoBom = ['7','8','9mais'].includes(R.sono), sonoCurto = R.sono === '4a5';
  const inf = [aguaBoa && 'beber bastante água', sonoBom && 'dormir bem'].filter(Boolean), ger = [aguaBoa && 'bebendo bastante água', sonoBom && 'dormindo bem'].filter(Boolean);
  const causa = CAUSA[principal] || '', Causa = causa ? causa[0].toUpperCase() + causa.slice(1) + '.' : '';
  const fr = [];
  if (R.rotina === 'nenhuma') fr.push(ger.length ? `Mesmo ${lista(ger)}, sem uma rotina de cuidados a pele fica sem a limpeza, a hidratação e o protetor de todo dia. ${Causa}`
                                                 : `Como você ainda não tem uma rotina de cuidados, a base (limpador suave, hidratante e protetor) é o primeiro passo. ${Causa}`);
  else if (inf.length && causa) fr.push(`Apesar de ${lista(inf)}, ${causa}.`);
  if (sonoCurto) fr.push('Como você dorme 4 a 5 h por noite, vale cuidar do sono também: dormir pouco aparece ligado a mais sinais de envelhecimento na pele e a uma barreira que se recupera mais devagar.');
  return { txt:fr.map(x => x.trim()).join(' '), ev:sonoCurto ? SONO_EV : null };
}

function montarResultado(j, f){
  const B = BIB.sinais, fr = f.frente, al = alinhar(fr.src, fr.g);
  const sinais = Object.fromEntries((j.sinais || []).map(s => [s.id, { visivel:s.visivel !== false && s.nivel != null, nivel:Math.max(0, Math.min(3, +s.nivel || 0)),
    comedoes:s.comedoes != null ? Math.max(0, Math.min(3, +s.comedoes || 0)) : null, regioes:Array.isArray(s.regioes) ? s.regioes.filter(r => REG_ACNE[r]) : [], tipo:s.tipo || null }]));
  const temAcne = !!sinais.acne_ativa;
  const nivel = id => id === 'comedoes' ? (sinais.acne_ativa?.visivel ? sinais.acne_ativa.comedoes ?? 0 : null) : sinais[id]?.visivel ? sinais[id].nivel : null;
  const grauDe = id => id === 'acne_ativa' ? Math.max(nivel('acne_ativa') ?? 0, nivel('comedoes') ?? 0) : nivel(id);   // espinhas OU cravos
  const titulo = (id, n) => id === 'comedoes' ? CRAVOS[n] : id === 'acne_ativa' && (nivel('acne_ativa') ?? 0) === 0 ? CRAVOS[nivel('comedoes')] :
    id === 'acne_ativa' && nivel('comedoes') > 0 ? B[id].titulos[nivel(id)] + ' e cravos' : B[id].titulos[n];
  const recorteDe = id => { const s = sinais[id === 'comedoes' ? 'acne_ativa' : id]; return s?.regioes?.length ? REG_ACNE[s.regioes[0]] : B[id === 'comedoes' ? 'acne_ativa' : id].recorte; };
  const regiaoDe = id => { const s = sinais[id]; return (id === 'acne_ativa' || id === 'cicatriz_acne') && s?.regioes?.length ? lista(s.regioes.slice(0, 3).map(r => NOME_REG[r])) : B[id].regiao; };
  const corte = (reg, w = 140) => recorteRegiao(al, fr.g, reg, w);
  const MAPA = mapa(temAcne);
  resultado = { sinais, faixa:j.faixa, confianca:j.confianca, qualidade:j.qualidade?.nota, foto:j.foto || null };

  // topo: a foto de frente com tarja nos olhos, data e as miniaturas das laterais
  const topo = fotoTopo(al, fr.g, 720); $('r-foto').src = topo.toDataURL('image/jpeg', .86); topo.width = topo.height = 0;
  $('r-data').textContent = fmtData(new Date());
  $('r-lat').innerHTML = '';
  for (const a of ['esquerda','direita']) if (f[a]){ const al2 = alinhar(f[a].src, f[a].g), c = fotoTopo(al2, f[a].g, 160); const im = new Image(); im.alt = `Foto de lado (${a})`; im.src = c.toDataURL('image/jpeg', .8); $('r-lat').appendChild(im); c.width = al2.width = 0; }

  // achados por região: grau ≥ 1, os que ela marcou primeiro entre os de mesmo grau
  const marcados = new Set(R.incomoda.flatMap(q => MAPA[q]?.sinais || []).map(id => id === 'comedoes' ? 'acne_ativa' : id));
  const ids = Object.keys(B).filter(id => sinais[id]);
  const achados = ids.filter(id => grauDe(id) >= 1).sort((a, b) => (grauDe(b) - grauDe(a)) || (marcados.has(b) - marcados.has(a)));
  const naoViu = ids.filter(id => nivel(id) == null);
  const temas = [...new Set(achados.map(id => B[id].tema))];
  $('r-abas').innerHTML = ['todos', ...temas].map((t, i) => `<button type="button" role="tab" data-t="${t}" aria-selected="${i === 0}">${t === 'todos' ? 'Todos' : TEMA[t]}</button>`).join('');
  $('r-abas').hidden = temas.length < 2;
  $('r-n').textContent = achados.length === 1 ? '1 ponto' : `${achados.length} pontos`;
  const box = $('r-achados'); box.innerHTML = '';
  if (!achados.length) box.innerHTML = '<p class="sub" style="padding:8px 0">Nenhum sinal aparece marcado na foto.</p>';
  for (const id of achados){
    const s = B[id], n = grauDe(id), el = document.createElement('div');
    const soCravo = id === 'acne_ativa' && !(nivel('acne_ativa') > 0);
    const mec = soCravo ? s.mais[0] : s.mecanismo;
    const mais = id === 'cicatriz_acne' ? [sinais[id].tipo === 'cor' ? s.mais[1] : s.mais[0]] : s.mais.filter(x => x !== mec);
    el.className = 'achado'; el.dataset.tema = s.tema; el.dataset.id = id;
    el.innerHTML = `<div class="rc"></div><div><div class="rg"><span>${esc(regiaoDe(id)[0].toUpperCase() + regiaoDe(id).slice(1))}</span><b class="grau g${n}">${GRAU[n]}</b></div>
      <h4>${esc(titulo(id, n))}</h4>
      <details><summary>${esc(mec)}</summary>${mais.map(x => `<p>${esc(x)}</p>`).join('')}<p class="fonte">Fonte: ${s.fontes.map(esc).join('; ')}</p></details>
      ${s.seguranca ? `<p class="seg-m">${esc(s.seguranca)}</p>` : ''}</div>`;
    const c = corte(recorteDe(id), 128); c.setAttribute('role', 'img'); c.setAttribute('aria-label', `Recorte da sua foto: ${regiaoDe(id)}`);
    el.querySelector('.rc').replaceWith(c); box.appendChild(el);
  }
  if (naoViu.length) box.insertAdjacentHTML('beforeend', `<p class="nao-viu">Não deu para ver na foto: ${naoViu.map(id => lower1(B[id].nome)).join(', ')}.</p>`);
  $('r-abas').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return;
    $('r-abas').querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    box.querySelectorAll('.achado').forEach(a => { a.hidden = b.dataset.t !== 'todos' && a.dataset.tema !== b.dataset.t; });
    track('answer', { stepId:'resultado-aba', valueText:b.dataset.t }); };

  // "Sua preocupação faz sentido?": uma linha por queixa marcada, com o recorte da área
  let vh = `<h3>${esc(nomeBonito())}, sua preocupação faz sentido?</h3>`;
  for (const q of R.incomoda){
    const m = MAPA[q], ns = m.sinais.map(nivel).filter(x => x != null), max = ns.length ? Math.max(...ns) : null;
    const top = m.sinais.find(id => nivel(id) === max);
    const nomeTop = top ? lower1(titulo(top, max)) : '';
    const onde = top === 'acne_ativa' || top === 'comedoes' ? (sinais.acne_ativa.regioes.length ? ` (${lista(sinais.acne_ativa.regioes.slice(0, 3).map(r => NOME_REG[r]))})` : '') : '';
    let selo, cls = '', txt;
    if (!m.mede){
      selo = 'A foto não mede isso'; cls = 'nao';
      txt = NAO_MEDE[q] + (top && max ? ` Na mesma área, a foto mostra: ${nomeTop} (${GRAU[max].toLowerCase()}).` : '');
      if (q === 'oleosidade' && top) txt += ` ${poroOleo()}`;
      if (q === 'ressecamento' && R.tipo) txt += ` Você marcou pele ${ROT.tipo[R.tipo]}.`;
    } else if (max == null){ selo = 'Não deu para ver'; cls = 'nao'; txt = 'Essa área não apareceu bem na foto. Vale tirar de novo, com mais luz.'; }
    else if (max >= 2){ selo = 'Bate com a análise'; txt = `Faz sentido: a foto mostra ${nomeTop}${onde}, grau ${GRAU[max].toLowerCase()}.`; }
    else if (max === 1){ selo = 'Bate em parte'; cls = 'parcial'; txt = `Faz sentido: a foto mostra ${nomeTop}${onde}, grau leve.`; }
    else { selo = 'A foto não mostra'; cls = 'nao'; txt = `A foto não mostra isso marcado, e é boa notícia. Se no espelho incomoda, vale olhar na conversa.`; }
    const reg = top ? recorteDe(top) : 'bochecha';
    vh += `<div class="valida" data-q="${q}"><canvas data-r="${reg}" role="img" aria-label="Recorte da sua foto"></canvas><div>
      <div class="vt"><h4>${esc(ROT.incomoda[q])}</h4><span class="selo ${cls}">${esc(selo)}</span></div><p>${esc(txt)}</p></div></div>`;
  }
  const hab = textoHabitos(achados[0]);   // água e sono: contrapartida ou conclusão, nunca causa
  if (hab.txt) vh += `<p class="meta-obj"><b>Sobre os seus hábitos.</b> ${esc(hab.txt)}${hab.ev ? `<br><small>Evidência: ${esc(hab.ev.evidencia)} <i>(${esc(hab.ev.fonte.split(' — ')[0])})</i></small>` : ''}</p>`;
  $('r-valida').innerHTML = vh;
  $('r-valida').querySelectorAll('canvas[data-r]').forEach(cv => { const c = corte(cv.dataset.r, 112); cv.width = c.width; cv.height = c.height; cv.getContext('2d').drawImage(c, 0, 0); c.width = 0; });

  // o que fazer agora: 3 linhas, por classe (sem marca, sem concentração), cada uma citando a resposta dela
  const grav = R.seguranca && R.seguranca !== 'nenhuma', G = GEST[R.seguranca], sens = ['sensivel','reacao'].includes(R.alergia), qx = new Set(R.incomoda);
  const comCor = nivel('manchas') >= 1 || qx.has('manchas');
  const porqueCor = qx.has('manchas') ? 'Como você marcou manchas' : 'Como a foto mostra manchas';
  const espinha = (grauDe('acne_ativa') ?? 0) >= 1 || (!temAcne && qx.has('acne'));
  const oleosa = ['oleosa','mista'].includes(R.tipo);
  const solMuito = ['1a3h','mais_3h'].includes(R.sol);
  const quais = espinha && (qx.has('cravos') || nivel('comedoes') >= 1) ? 'as espinhas e os cravos' : espinha ? 'as espinhas' : 'os cravos';
  const hidr = oleosa ? 'leve' : R.tipo === 'seca' ? 'mais encorpado' : 'simples';
  const fazer = [
    juntar('Protetor solar todo dia, no rosto inteiro.', comCor ? `${porqueCor}, de preferência com cor.` : '', solMuito ? `Como você fica ${ROT.sol[R.sol].replace(' de sol', '')} no sol por dia, reaplique enquanto estiver nele.` : ''),
    juntar(comoTipo() ? `${comoTipo()}: limpador suave e hidratante ${hidr}, de manhã e à noite.` : `Limpador suave e hidratante ${hidr}, de manhã e à noite.`, sens ? `${SENS[R.alergia]}, um produto novo por vez.` : ''),
    espinha || qx.has('cravos') ? juntar(`Para ${quais}: um ativo que desobstrui o poro, escolhido com o médico. Sem espremer.`, grav ? `${G[0]}, sem retinoide: o médico escolhe um ativo seguro ${G[1]}.` : '')
    : qx.has('manchas') || nivel('manchas') >= 2 ? juntar('Para as manchas: clareador só com orientação médica, depois do protetor.', grav ? `${G[0]}, o médico escolhe um clareador seguro ${G[1]}.` : '')
    : qx.has('rugas') || ['linhas_testa','olhos'].some(id => nivel(id) >= 2) ? juntar('Para as linhas finas: retinoide tópico é a classe com melhor evidência, com orientação.', grav ? `${G[0]}, ele ${G[2]}.` : '')
    : ['poros','oleosidade'].some(x => qx.has(x)) ? juntar(`${marcou(['poros','oleosidade'])}: um ativo que desobstrui o poro, escolhido com o médico, depois que a base estiver em dia.`, grav ? `${G[0]}, sem retinoide: o médico escolhe um ativo seguro ${G[1]}.` : '')
    : 'Nova foto em 4 semanas, na mesma luz, para comparar.',
  ];
  const obj = R.objetivo && R.objetivo !== 'outro' ? ROT.objetivo[R.objetivo] : '';
  $('r-fazer').innerHTML = `<h3>O que fazer agora</h3>${obj ? `<p>Para o seu objetivo, “${esc(lower1(obj))}”, comece por aqui:</p>` : ''}<ol class="fazer">${fazer.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol>`;

  // ---------- relatório completo (recolhido) ----------
  const fortes = [];   // primeiro o que ela contou, depois o que a foto mostra
  if (['quase_nada','menos_1h'].includes(R.sol)) fortes.push(['Pouco sol no dia a dia', `Você contou que fica ${ROT.sol[R.sol].replace(' de sol', '')} no sol por dia. ${BIB.frases.sol}`]);
  if (['7','8','9mais'].includes(R.sono)) fortes.push(['Sono em dia', `Você contou que dorme ${ROT.sono[R.sono]} por noite. ${BIB.frases.sono}`]);
  if (R.alergia === 'nao') fortes.push(['Sem reação conhecida a produtos', 'Como você não tem reação conhecida, fica mais fácil testar um produto novo de cada vez.']);
  fortes.push(...ids.filter(id => nivel(id) === 0 && (id !== 'acne_ativa' || nivel('comedoes') === 0)).map(id => [B[id].titulos[0], FORTE[id]]));
  $('r-fortes').innerHTML = fortes.length ? `<h3>Pontos fortes da sua pele</h3>${fortes.slice(0, 4).map(([t, d]) => `<div class="forte"><i>✓</i><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('')}` : '';

  const recs = [], fonteCurta = x => esc(x.split(' — ')[0]);
  recs.push({ cls:'Fotoproteção', t:'Protetor solar todo dia', d:juntar('Amplo espectro, no rosto inteiro, mesmo em casa perto de janela.',
    solMuito ? `Como você fica ${ROT.sol[R.sol].replace(' de sol', '')} no sol por dia, reaplique enquanto estiver nele.` : 'Reaplique se ficar no sol.',
    comCor ? `${porqueCor}, de preferência com cor: ela barra também a luz visível, que escurece mancha.` : ''), ev:BIB.classes.protetor });
  const limpSuave = R.tipo === 'seca' || sens;
  recs.push({ cls:'Limpeza', t:limpSuave ? 'Limpador suave, sem espuma forte' : 'Limpador suave',
    d:juntar(R.tipo === 'seca' ? `${comoTipo()}: à noite; de manhã, só água basta.` : sens ? `${SENS[R.alergia]}: à noite; de manhã, só água basta.` : oleosa ? `${comoTipo()}: de manhã e à noite, em gel.` : 'Uma a duas vezes ao dia.', 'Sem bucha nem esfoliante de grânulos.') });
  recs.push({ cls:'Hidratação', t:R.tipo === 'seca' ? 'Hidratante mais encorpado' : oleosa ? 'Hidratante leve, em gel ou fluido' : 'Hidratante simples',
    d:R.tipo === 'seca' ? `${comoTipo()}: logo depois do banho, com a pele ainda úmida.` : oleosa ? `${comoTipo()}: ela também precisa de hidratante, principalmente quando entrar um ativo, que costuma ressecar.` : sens ? `${SENS[R.alergia]}: fórmula simples, sem perfume, de manhã e à noite.` : 'Fórmula simples, de manhã e à noite.' });
  const ativos = [];
  if (espinha || ['acne','cravos','poros','oleosidade'].some(x => qx.has(x)) || nivel('textura_poros') >= 2)
    ativos.push({ cls:'Ativo (classe)', t:'Um ativo que desobstrui o poro', d:juntar(marcou(['acne','cravos','poros','oleosidade']) ? marcou(['acne','cravos','poros','oleosidade']) + ':' : '', 'da classe dos retinoides, do peróxido de benzoíla ou dos ácidos que agem dentro do poro. Qual e em que dose, o médico escolhe com você.').replace(/^da/, 'Da'),
      ev:espinha ? BIB.classes.acne_topicos : BIB.classes.poro, gest:G ? `${G[0]}, retinoide fica de fora: o médico escolhe com você um ativo seguro ${G[1]}.` : '' });
  if (qx.has('rugas') || ['linhas_testa','olhos'].some(id => nivel(id) >= 2)) ativos.push({ cls:'Ativo (classe)', t:'Retinoide tópico, para as linhas finas', d:juntar(marcou(['rugas']) ? marcou(['rugas']) + ':' : '', 'é a classe com melhor evidência para linha fina do sol. Irrita no começo e precisa de orientação.').replace(/^é/, 'É'), ev:BIB.classes.retinoide_linhas,
      gest:G ? `${G[0]}, ele ${G[2]}.` : '' });
  if (qx.has('manchas') || nivel('manchas') >= 2) ativos.push({ cls:'Ativo (classe)', t:'Clareador, só com orientação médica', d:juntar(marcou(['manchas']) ? marcou(['manchas']) + ':' : '', 'antes dele, o protetor com cor todo dia; sem isso, a mancha volta.').replace(/^antes/, 'Antes'),
      gest:G ? `${G[0]}, o médico escolhe um clareador seguro ${G[1]}.` : '' });
  for (const a of ativos.slice(0, 2)) recs.push({ ...a, d:juntar(a.d, a.gest) });
  if (sens) recs.push({ cls:'Cuidado', t:'Um produto novo por vez', d:`${SENS[R.alergia]}: teste antes numa área pequena, por alguns dias, antes de passar no rosto todo.` });
  if (R.rotina === 'receitada') recs.push({ cls:'Cuidado', t:'Os produtos que você já usa', d:'Como você usa produtos receitados por médico, mostre-os ao Dr. Lucca antes de trocar ou somar qualquer coisa.' });
  $('r-recs').innerHTML = `<h3>Recomendações para você</h3>${recs.map((r, i) => `<div class="rec"><em>${i + 1}</em><div><small>${esc(r.cls)}</small><b>${esc(r.t)}</b><span>${esc(r.d)}</span>${r.ev ? `<span class="ev">Evidência: ${esc(r.ev.evidencia)} <i>(${fonteCurta(r.ev.fonte)})</i></span>` : ''}</div></div>`).join('')}`;

  // condição geral + correção do autodiagnóstico só quando a foto sustenta
  const tx = nivel('textura_poros'), principal = achados[0];
  let corr = '';
  if (['seca','normal'].includes(R.tipo) && tx >= 2) corr = `Você marcou pele ${ROT.tipo[R.tipo]}, mas a foto mostra ${lower1(B.textura_poros.titulos[tx])} na zona T. ${BIB.frases.poro_oleo} Pode ser pele mista: o Dr. Lucca confere na conversa.`;
  else if (R.tipo === 'nao_sei' && tx >= 2) corr = `Você não sabia o seu tipo de pele. A foto mostra ${lower1(B.textura_poros.titulos[tx])} na zona T. ${BIB.frases.poro_oleo}`;
  $('r-cond').innerHTML = `<h3>Condição geral</h3><div class="cond">
    <div><small>Tipo de pele</small><b>${esc(R.tipo ? ROT.tipo[R.tipo][0].toUpperCase() + ROT.tipo[R.tipo].slice(1) : '—')}</b><span>você contou</span></div>
    <div><small>Sensibilidade</small><b>${R.alergia === 'nao' ? 'Sem reação' : R.alergia === 'nao_sei' ? 'Não sabe' : 'Sensível'}</b><span>${esc(ROT.alergia[R.alergia] || '')}</span></div>
    <div><small>Sol por dia</small><b>${esc((ROT.sol[R.sol] || '—').replace(' de sol', ''))}</b><span>você contou</span></div>
    <div><small>Mais visível na foto</small><b>${principal ? esc(B[principal].nome) : 'Nada marcado'}</b><span>${principal ? GRAU[grauDe(principal)].toLowerCase() : ''}</span></div></div>
    ${corr ? `<p class="correcao"><b>Sobre o seu tipo de pele</b>${esc(corr)}</p>` : ''}`;

  const ev = [];
  if (espinha || ['acne','cravos'].some(x => qx.has(x))) ev.push(['Espremer espinhas e cravos', 'Pode deixar mancha e marca no lugar.']);
  if (grav) ev.push(['Começar retinoide ou ácido por conta própria', `${G[0]}, o médico escolhe o que é seguro ${G[1]}.`]);
  ev.push(['Trocar vários produtos ao mesmo tempo', 'Se a pele reagir, você não sabe qual foi.']);
  if (oleosa || espinha || qx.has('oleosidade')) ev.push(['Bucha e esfoliante de grânulos no rosto', `${oleosa ? `${comoTipo()}: eles` : 'Eles'} agridem a barreira da pele e não tiram o óleo de dentro do poro.`]);
  if (sens) ev.push(['Produto com perfume forte', `${SENS[R.alergia]}: perfume é uma causa comum de ardência.`]);
  ev.push(['Receita caseira com limão, bicarbonato ou pasta de dente', 'Irrita a pele; limão no rosto com sol pode manchar.']);
  $('r-evitar').innerHTML = `<h3>Evitar para a sua pele</h3><ul class="evitar">${ev.slice(0, 4).map(([t, d]) => `<li><div>${esc(t)}<span>${esc(d)}</span></div></li>`).join('')}</ul>`;

  const BASE = { nenhuma:'Como você ainda não tem rotina, comece só por estes três: limpador suave, hidratante e protetor, todo dia.',
    funciona:'Como você já tem uma rotina que funciona, mantenha o que dá certo e confira se ela tem limpador suave, hidratante e protetor todo dia.',
    receitada:'Como você usa produtos receitados, mantenha-os como o médico orientou e confira se a rotina tem limpador suave, hidratante e protetor.',
    nao_sei:'Como você não sabe se a sua rotina funciona, simplifique: limpador suave, hidratante e protetor todo dia, para a pele se acostumar.' };
  const S = [
    ['A base', juntar(BASE[R.rotina] || 'Limpador suave, hidratante e protetor todo dia. Só isso, para a pele se acostumar.', espinha || qx.has('cravos') ? 'Sem espremer.' : '')],
    ['Constância', juntar('A mesma rotina, todo dia. Anote o que arde, coça ou descama: isso guia o próximo passo.', sens ? `${SENS[R.alergia]}, anote também o produto de cada dia.` : '')],
    ativos.length ? ['Um passo a mais', grav ? `Se o médico indicar, entra um ativo seguro ${G[1]}, à noite, em dias alternados. Um de cada vez.` : 'Se o médico indicar, entra um ativo, à noite, em dias alternados. Um de cada vez.']
                  : ['Proteção reforçada', solMuito ? `Como você fica ${ROT.sol[R.sol].replace(' de sol', '')} no sol por dia, protetor também nos dias nublados, e reaplicado enquanto estiver nele.` : 'Protetor também nos dias nublados, e reaplicado se ficar no sol.'],
    ['Nova foto', obj ? `Refaça esta análise na mesma luz e compare com a foto de hoje, pensando no seu objetivo: “${lower1(obj)}”.` : 'Refaça esta análise na mesma luz e compare com a foto de hoje.'],
  ];
  $('r-plano').innerHTML = `<h3>Seu plano para as próximas 4 semanas</h3>
    <p class="meta-obj">Seu objetivo: <b>${esc(ROT.objetivo[R.objetivo] || '—')}</b></p>
    ${S.map(([t, d], i) => `<div class="semana"><em>Sem.<br>${i + 1}</em><div><b>${esc(t)}</b><span>${esc(d)}</span></div></div>`).join('')}`;
  $('r-completo').open = false;
  $('r-completo').ontoggle = () => { if ($('r-completo').open) track('answer', { stepId:'resultado-completo', valueText:'abriu' }); };

  al.width = al.height = 0;
  track('complete', { stepId:'resultado', stepIndex:ORDEM.indexOf('resultado'), valueText:achados.join('+') || 'nenhum',
    props:{ codigo:meuCodigo(), respostas:respostasLimpa(), angulos:Object.keys(f), origem:fr.origem, enviadas:window.__ultimoEnvio?.n || 1, acne:temAcne,
            faixa:j.faixa ? `${j.faixa.min} a ${j.faixa.max} anos` : null, confianca:j.confianca, qualidade:j.qualidade?.nota, foto:j.foto || null,
            sinais:Object.entries(sinais).map(([id, s]) => ({ id, visivel:s.visivel, nivel:s.visivel ? s.nivel : null, ...(s.comedoes != null ? { comedoes:s.comedoes } : {}), ...(s.regioes.length ? { regioes:s.regioes.join('+') } : {}), ...(s.tipo ? { tipo:s.tipo } : {}) })) } });
  if (window.__pele2Resultado) window.__pele2Resultado(j);
}
function respostasLimpa(){ const { nome, ...r } = R; return { ...r, incomoda:R.incomoda.join('+') }; }

// =====================================================================
// FECHAMENTO (02/11, v2): o resultado tem um botão só (o Dr. Lucca explica); o link do lembrete de 4 semanas saiu (02/11).
// A tela final tem um passo só, em 3ª pessoa: título, 1 frase, botão, "abre o WhatsApp com a mensagem pronta", rodapé.
// O Dr. Lucca explica (WhatsApp ou Direct); o texto muda com o A/B do fim (A = vídeo, B = ele olha e responde).
// Medição igual: cta_click com props.canal whatsapp/direct (conta como conversa no Funil e na Caixa) + props.escolha ('explicar').
// =====================================================================
const souA = () => R.sexo === 'm' ? 'o' : 'a';
const sou = () => nomeBonito() ? `Sou ${souA()} ${nomeBonito()}` : '';
function mensagem(){ const s = sou(); return `Oi, Dr. Lucca! ${s ? s + '. ' : ''}Fiz a análise da pele, código ${meuCodigo()}. Quero que você me explique o meu resultado.`; }
const escolha = () => 'explicar';
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
const fimProps = esc_ => ({ escolha:esc_, codigo:meuCodigo() });
const fimValor = (esc_ = escolha()) => `${esc_}|fim${FIM}`;   // valueText do cta_click final: 'explicar|fimA' ou 'explicar|fimB'
$('cta-wa').addEventListener('click', () => { track('cta_click', { stepId:'fechar', valueText:fimValor(), props:{ canal:'whatsapp', ...fimProps(escolha()) } }); });
$('cta-dm').addEventListener('click', e => { if (LV) return direto_lv(e, escolha()); abrirDirect(e); });

// Direct: o Instagram não aceita texto pronto. Um toque só: copia DENTRO do toque (exigência do iOS), avisa e deixa o
// link abrir o app. Se o navegador não deixou copiar, mostra a mensagem para copiar à mão (mesma lógica de /idade).
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
  track('cta_click', { stepId:'fechar', valueText:fimValor('explicar'), props:{ canal:'direct', copiou, noInstagram:NO_INSTAGRAM, ...fimProps('explicar') } });
  if (NO_INSTAGRAM){ e.preventDefault(); dicaDirect({ mensagem:txt, copiou, voz:true }); return; }   // animação X → Mensagem → colar
  if (copiou){ $('toast').hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { $('toast').hidden = true; }, 6000); return; }   // o link segue e abre o app
  e.preventDefault();
  $('aviso-msg').textContent = txt; $('aviso-link').href = $('cta-dm').href; $('aviso-dm').hidden = false;
}
$('aviso-dm').addEventListener('click', ev => { if (ev.target === $('aviso-dm')) $('aviso-dm').hidden = true; });
$('aviso-link').addEventListener('click', () => { track('cta_click', { stepId:'fechar', valueText:fimValor('explicar') + '|abrir', props:{ canal:'direct', ...fimProps('explicar') } }); setTimeout(() => { $('aviso-dm').hidden = true; }, 800); });
// link marcado (?lv=): quem veio do Direct pelo link do Dr. Lucca não precisa de código. Mesmo molde: "Voltar ao
// Instagram" (ele já recebeu a análise) e "ou pelo WhatsApp"; a escolha ('explicar') vai no evento.
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
function direto_lv(e, esc_){
  track('cta_click', { stepId:'fechar', valueText:fimValor(esc_), props:{ canal:'direct', noInstagram:NO_INSTAGRAM, ...fimProps(esc_) } });
  if (!NO_INSTAGRAM) return;
  e.preventDefault(); dicaDirect({ lv:true, voz:true });
}

// ---------- início ----------
document.querySelectorAll('.opts[data-q], .grade[data-q]').forEach(ligarOpcoes);
montarGrade();
show('capa');
// ganchos do teste automático (headless): estado e resultado sem câmera
window.__pele2 = { R, textoHabitos, estado:() => ({ cur, codigo, envio:window.__ultimoEnvio || null }), show, montarResultado:(j, f) => { montarResultado(j, f); show('resultado'); } };
