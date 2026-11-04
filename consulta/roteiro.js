/* Roteiro do react por lead e "Parecido com isto" (03/11/2026). Carregado depois de kits.js, só na Caixa privada.
   1. Botão "Gerar roteiro" em cada resultado (pele, pele2, pernas, braço, quiz da longevidade, emagrecimento): manda à
      edge gerar-roteiro só o necessário (respostas com o texto da opção, números do resultado, classificação do kit).
      NÃO vão: nome, telefone, @, código LV (vai à parte, para gravar no nosso banco), foto. A edge chama o Claude e grava;
      abrir de novo mostra o gravado sem pagar. "Gerar de novo" pede um segundo toque.
   2. "Parecido com isto" ao lado das fotos da pele: lê comparativas/indice.json; sem o arquivo, o espaço some. */
window.ROTEIRO = (() => {
const API = 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co/functions/v1/gerar-roteiro';
const chaveCaixa = () => new URLSearchParams(location.hash.slice(1)).get('k') || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const post = corpo => fetch(API, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ k:chaveCaixa(), ...corpo }) });

// ---------- rótulos das respostas (texto da opção como aparece na tela) ----------
const SEXO = { f:'mulher', m:'homem', n:'não informou' };
// Quiz da longevidade (longevidade/config.js, 03/11)
const LONG = {
  objetivo:['Daqui a 10 anos, o que quer continuar fazendo', { escada:'Subir escada e carregar as compras sem pensar duas vezes', familia:'Ter disposição pra acompanhar filho e neto, sem ficar de fora', trabalho:'Trabalhar no meu ritmo sem chegar no fim do dia no limite', viajar:'Viajar e andar o dia inteiro sem procurar banco pra sentar', esporte:'Continuar no futebol, na corrida ou no tênis sem me machucar', independente:'Não depender de ninguém pra levantar, sair e resolver minhas coisas' }],
  idade:['Idade', { ate39:'Até 39 anos', '40-49':'40 a 49 anos', '50-59':'50 a 59 anos', '60-69':'60 a 69 anos', '70+':'70 anos ou mais' }],
  rotina:['Como é a semana', { empresario:'Cuido de empresa ou equipe, e a agenda não para', liberal:'Sou profissional liberal', fixo:'Trabalho com hora pra entrar e pra sair', aposentado:'Já me aposentei' }],
  incomoda:['O que mais incomoda hoje', { cansaco:'Cansaço que não passa nem depois de dormir', peso:'A barriga que só cresce, mesmo comendo igual', dor:'Dor nas costas ou no joelho que atrapalha o dia', exame:'Exame que veio alterado: pressão, glicose ou colesterol', forca:'Não consigo fazer as mesmas coisas que antes', nada:'Nada por enquanto, quero me cuidar antes' }],
  atrapalha:['O que trava para cuidar disso', { tempo:'Não tenho tempo nem pra cuidar da saúde', comecar:'Não sei por onde começar', constancia:'Começo bem e largo na segunda semana', clinica:'Perder meio dia em clínica e laboratório', dor:'Medo de me machucar ou piorar uma dor' }],
  ajuda:['Prefere fazer', { sozinho:'Por conta própria, no meu ritmo', medico:'Com um médico do lado' }],
};
// Emagrecimento v2 (emagrecimento/index.html e app.js, 03/11)
const EMAG = {
  sexo:['Sexo', SEXO],
  fase:['Fase', { nenhuma:'nenhuma', gravida:'grávida', amamentando:'amamentando', pos_parto:'bebê há menos de 1 ano', menopausa:'menopausa' }],
  idade:['Idade', { '18a29':'18 a 29 anos', '30a39':'30 a 39 anos', '40a49':'40 a 49 anos', '50a59':'50 a 59 anos', '60mais':'60 anos ou mais' }],
  acontece:['O que mais acontece quando tenta emagrecer', { volta:'Eu emagreço, mas depois engordo tudo de novo', vontade:'A vontade de comer vence, principalmente de doce', balanca:'Faço tudo certo e a balança não desce', constancia:'Começo e paro em poucas semanas', comeco:'Ainda não sei por onde começar' }],
  tentou:['O que já tentou', { dieta:'Dieta da internet ou de revista', low_carb:'Cortar carboidrato', jejum:'Jejum intermitente', academia:'Academia ou corrida', nutri:'Nutricionista', cha:'Chá, shake ou suplemento', remedio:'Remédio para emagrecer', nenhum:'Ainda nenhum destes' }],
  ciclo:['Menstruação', { regular:'Vem todo mês, mais ou menos no mesmo intervalo', irregular:'Falha meses, atrasa muito ou vem fora de hora', hormonio:'Uso anticoncepcional ou DIU hormonal', outro:'Não menstruo por outro motivo' }],
  pele:['Tem algum destes', { pelos:'Pelos grossos no rosto, no queixo ou na barriga', espinhas:'Espinhas que não passam', cabelo:'Cabelo afinando no alto da cabeça', nenhum:'Nenhum destes' }],
  tireoide:['No dia a dia sente', { cansaco:'Cansaço que não passa, mesmo dormindo', frio:'Frio quando os outros não sentem', intestino:'Intestino preso', pele_seca:'Pele muito seca', nenhum:'Nenhum destes' }],
  exames:['Algum médico ou exame já disse que tem', { pressao:'Pressão alta', glicose:'Glicose alta, pré-diabetes ou diabetes', gordura:'Triglicerídeo alto ou colesterol bom (HDL) baixo', nada:'Nada disso', sem_exames:'Faz tempo que não faço exames' }],
  remedios:['Remédio todo dia', { humor:'Para depressão ou ansiedade', diabetes:'Para diabetes', outro:'Outro remédio de uso contínuo', nenhum:'Nenhum remédio todo dia' }],
  vontade:['Quando a vontade de comer aparece mais forte', { noite:'À noite', tarde:'À tarde', ansiedade:'Quando fico ansiosa ou preocupada', fim_semana:'No fim de semana', dia_todo:'O dia todo', pouco:'Ela quase não me atrapalha' }],
  sono:['Horas de sono', { '5menos':'5 h ou menos', '6':'6 horas', '7':'7 horas', '8':'8 horas', '9mais':'9 ou mais' }],
  ronco:['O sono', { ronco_cansa:'Ronco e acordo cansada', ronco:'Ronco, mas acordo bem', cansa:'Não ronco, mas acordo cansada', bem:'Durmo e acordo bem', nao_sei:'Não sei se ronco' }],
  forca:['Exercício de força por semana', { '0':'Ainda não faço', '1':'1 vez por semana', '2mais':'2 vezes ou mais' }],
  objetivo:['Objetivo', { roupas:'Voltar a usar as roupas que eu gosto', nao_voltar:'Parar de engordar tudo de novo', disposicao:'Ter mais disposição no dia a dia', saude:'Cuidar da saúde e dos exames', corpo:'Me sentir bem com o meu corpo', outro:'o que você me contar' }],
};
// Sem nome de doença na entrada (regra 24 do prompt): o sinal vai como o que ela marcou e o que pede exame.
const SINAL_EMAG = { sop:'Hormônios: marcou ciclo irregular e/ou pelos grossos; vale olhar os hormônios com exame', menopausa:'Menopausa ou chegando nela',
  tireoide:'Marcou cansaço, frio, intestino preso ou pele seca; só exame de sangue decide a causa', metabolica:'Já ouviu de médico ou exame que tem pressão, glicose ou gordura no sangue alta',
  sem_exames:'Faz tempo que não faz exames', remedio:'Toma remédio de uso contínuo (não parar nem trocar por conta própria)', ronco:'Ronca e acorda cansada(o); vale olhar o sono com exame' };
// Pele 2 (rótulos de pele2/app.js, iguais aos da Caixa)
const P2 = {
  sexo:['Sexo', SEXO],
  seguranca:['Gestação/amamentação', { nenhuma:'nenhuma', gravida:'grávida', amamentando:'amamentando', tentando:'tentando engravidar' }],
  alergia:['Alergia', { nao:'sem alergia', sensivel:'pele sensível', reacao:'já teve reação', nao_sei:'não sabe' }],
  incomoda:['O que incomoda', { acne:'Acne / espinhas', manchas:'Manchas', cravos:'Cravos', oleosidade:'Oleosidade', rugas:'Rugas e linhas', poros:'Poros dilatados', olheiras:'Olheiras', ressecamento:'Ressecamento', textura:'Textura irregular', outro:'Outro' }],
  tipo:['Tipo de pele', { oleosa:'oleosa', seca:'seca', mista:'mista', normal:'normal', nao_sei:'não sabe' }],
  sol:['Sol por dia', { quase_nada:'quase nada', menos_1h:'menos de 1 h', '1a3h':'1 a 3 h', mais_3h:'mais de 3 h' }],
  agua:['Água por dia', { menos_1l:'menos de 1 L', '1a2l':'1 a 2 L', '2a3l':'2 a 3 L', mais_3l:'mais de 3 L' }],
  sono:['Sono', { '4a5':'4 a 5 h', '6':'6 h', '7':'7 h', '8':'8 h', '9mais':'9 h ou mais' }],
  rotina:['Rotina de cuidados', { nenhuma:'sem rotina', funciona:'rotina que funciona', receitada:'produtos receitados', nao_sei:'não sabe se funciona' }],
  objetivo:['Objetivo', { confianca:'Me sentir bem e confiante com a minha pele', sem_maquiagem:'Sair sem maquiagem nem filtro, sem me preocupar', sem_filtro:'Sair sem filtro na foto', fotos:'Gostar de me ver em foto de perto', prevenir:'Cuidar agora, antes que piore', parar_gastar:'Parar de gastar com o que não funciona', outro:'O que você me contar' }],
};
/** {pergunta: resposta} com o texto da tela; multi ('a+b' ou lista) vira lista. Pergunta sem resposta fica de fora. */
function rotular(r, mapa){
  const out = {};
  for (const [k, [perg, ops]] of Object.entries(mapa)){
    const v = r?.[k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    const vs = Array.isArray(v) ? v : String(v).includes('+') ? String(v).split('+') : [v];
    const t = vs.map(x => ops[x] ?? String(x));
    out[perg] = t.length > 1 || Array.isArray(v) ? t : t[0];
  }
  return out;
}

// ---------- pele: achados por região, em texto (nenhuma foto vai à API) ----------
const NOME_SIN = { linhas_testa:['Linhas da testa', 'testa'], olhos:['Ao redor dos olhos (canto e olheira)', 'olhos'], textura_poros:['Textura e poros', 'zona T e nariz'],
  manchas:['Manchas', 'bochechas'], sulco_nasolabial:['Sulco do nariz à boca', 'nariz à boca'], flacidez:['Firmeza do contorno', 'mandíbula e contorno'],
  acne_ativa:['Espinhas', null], comedoes:['Cravos', null], cicatriz_acne:['Marcas de espinhas antigas', null] };
const REG_ACNE = { testa:'testa', nariz:'zona T e nariz', bochechas:'bochechas', queixo:'queixo', mandibula:'mandíbula e contorno' };
const GRAU = ['sem achado', 'leve', 'moderado', 'marcado'];
const FOTO_P2 = { linhas_testa:'foto de frente', olhos:'foto de lado', manchas:'foto de lado', textura_poros:'foto de frente', sulco_nasolabial:'foto de lado', flacidez:'foto de lado',
  acne_ativa:'foto de frente', comedoes:'foto de frente', cicatriz_acne:'foto de frente (o lado ajuda a ver relevo)' };
const regioesDe = s => Array.isArray(s?.regioes) ? s.regioes : typeof s?.regioes === 'string' && s.regioes ? s.regioes.split('+') : [];
/** Lista de sinais com grau (0-3) ou null (coberto); espinhas e cravos separados. Igual ao cartão da Pele 2. */
function sinaisPele(d, p2){
  const out = [];
  for (const s of d.sinais || []){
    if (!NOME_SIN[s.id]) continue;
    const ver = s.visivel !== false && s.nivel != null;
    const regs = NOME_SIN[s.id][1] ? [NOME_SIN[s.id][1]] : regioesDe(s).map(r => REG_ACNE[r] || r);
    const base = { regioes:regs, foto:p2 ? FOTO_P2[s.id] : (s.expressao != null ? (s.id === 'olhos' ? 'foto parada e do sorriso' : 'foto parada e das sobrancelhas levantadas') : 'foto parada') };
    if (s.id === 'acne_ativa'){
      out.push({ id:'acne_ativa', ...base, grau:ver ? +s.nivel || 0 : null });
      if (s.comedoes != null) out.push({ id:'comedoes', ...base, grau:ver ? +s.comedoes || 0 : null });
    } else {
      const g = ver ? Math.max(+s.nivel || 0, +(s.expressao ?? 0) || 0) : null;
      out.push({ id:s.id, ...base, grau:g, parado:s.expressao != null && ver ? +(s.repouso ?? s.nivel) || 0 : undefined, na_expressao:ver && s.expressao != null ? +s.expressao : undefined,
        tipo:s.id === 'cicatriz_acne' && s.tipo ? (s.tipo === 'cor' ? 'marca de cor' : 'marca com relevo') : undefined, obs:s.obs || undefined });
    }
  }
  return out;
}
function entradaPele(d, t, c){
  const sin = sinaisPele(d, t === 'pele2');
  const ach = sin.filter(s => s.grau >= 1).sort((a, b) => b.grau - a.grau).map(s => ({
    sinal:NOME_SIN[s.id][0], grau:`${GRAU[s.grau]} (${s.grau} de 3)`, regiao:s.regioes.join(', ') || 'rosto', onde_circular:s.foto,
    ...(s.parado != null ? { parado:`${s.parado} de 3`, na_expressao:`${s.na_expressao} de 3` } : {}), ...(s.tipo ? { tipo:s.tipo } : {}), ...(s.obs ? { observacao_da_analise:s.obs } : {}) }));
  const e = {
    idade_informada:d.idade ?? undefined,
    faixa_de_idade_estimada_da_pele:d.faixa || undefined,
    regra_da_faixa_para_o_video:c?.idadeFaixa?.txt,
    confianca_da_analise:d.confianca, qualidade_da_foto:d.qualidade, sobre_a_foto:d.qualidade_motivo || undefined,
    fotos:t === 'pele2' ? `${d.enviadas ?? '?'} (${(Array.isArray(d.angulos) ? d.angulos : String(d.angulos || '').split(',')).filter(Boolean).join(', ') || 'frente'})` : `${d.enviadas ?? d.fotos ?? 1} (parada${(d.enviadas ?? d.fotos) >= 3 ? ', sorriso, sobrancelhas levantadas' : ''})`,
    areas_cobertas_na_foto:d.ocultas || undefined,
    achados:ach,
    sem_achado:sin.filter(s => s.grau === 0).map(s => NOME_SIN[s.id][0].toLowerCase()),
    nao_deu_para_ver:sin.filter(s => s.grau == null).map(s => NOME_SIN[s.id][0].toLowerCase()),
    respostas:t === 'pele2' ? rotular(d.respostas, P2) : (d.sexo ? { Sexo:SEXO[d.sexo] || d.sexo } : {}),
    leitura_do_kit:c ? { perfil:c.titulo, foto_duvidosa_refazer:!!c.refazer, motivo:c.motivo || undefined } : undefined,
  };
  return e;
}
function entradaPernas(d, c){
  return { idade:d.idade, sexo:SEXO[d.sexo] || d.sexo, tempo_das_5_levantadas_s:d.t, repeticoes_contadas:d.reps, potencia_w_por_kg:d.rel, percentil_na_idade:d.pc,
    parecida_com_quem_tem:d.faixa, leitura_do_kit:c ? { faixa:c.faixa ? `${c.faixa} de 4 · ${c.titulo}` : 'não calculada', resumo:c.simples, medicao_duvidosa_refazer:!!c.refazer, motivo:c.motivo || undefined } : undefined };
}
function entradaBraco(d, c){
  const m = c?.medida || {};
  return { idade:d.idade, sexo:SEXO[d.sexo] || d.sexo, protocolo:d.protocolo === '10s' ? '10 segundos' : '20 segundos', duracao_medida_s:d.dur, roscas_em_10_s:m.roscas,
    velocidade_media_graus_por_s:m.v || d.velMedia, idade_muscular_estimada:m.faixaTxt, queda_do_comeco_ao_fim_pct:d.protocolo === '10s' ? undefined : d.queda,
    leitura_do_kit:c ? { faixa:c.faixa ? `${c.faixa} de 4 · ${c.titulo}` : 'não calculada', resumo:c.simples, medicao_duvidosa_refazer:!!c.refazer, motivo:c.motivo || undefined } : undefined };
}
function entradaEmag(d){
  const r = d.respostas || {};
  const s = String(d.sinais || '').split('+').filter(x => x && x !== 'nenhum');
  return { imc:d.imc ?? undefined, faixa_do_imc:d.faixa || undefined, perfil_principal:EMAG.acontece[1][d.perfil] || d.perfil,
    sinais_de_saude_que_o_resultado_mostrou:s.map(x => SINAL_EMAG[x] || x), respostas:rotular(r, EMAG) };
}
const ENTRADA = {
  pele:(d, c) => entradaPele(d, 'pele', c), pele2:(d, c) => entradaPele(d, 'pele2', c), pernas:entradaPernas, braco:entradaBraco,
  'quiz-emagrecimento':entradaEmag, 'quiz-longevidade':d => ({ respostas:rotular(d.respostas, LONG) }),
};
const testeDe = e => e.etapa === 'pele-resultado' ? 'pele' : e.funil === 'pele2' ? 'pele2' : e.funil === 'teste-pernas' ? 'pernas' : e.funil === 'teste-braco' ? 'braco'
  : e.funil === 'teste-emagrecimento' ? 'quiz-emagrecimento' : e.funil === 'quiz-longevidade' ? 'quiz-longevidade' : null;
const KIT_DE = { pele:'pele', pele2:'pele2', pernas:'pernas', braco:'braco' };
/** {teste, chave, entrada} de um resultado da Caixa, ou null se o teste não tem roteiro. */
function montar(e){
  const t = testeDe(e); if (!t) return null;
  const d = e.dados || {};
  let c = null;
  try { if (KIT_DE[t] && window.KITS) c = KITS[KIT_DE[t]].classifica(d); } catch (err) { console.error(err); }
  const tira = o => JSON.parse(JSON.stringify(o));   // some com os undefined
  return { teste:t, chave:`${String(e.funil || t).toLowerCase().replace(/[^a-z0-9-]/g, '')}|${e.quando}`, entrada:tira(ENTRADA[t](d, c)) };
}

// ---------- bloco na tela ----------
let B = [], CODIGO = '', USO = null;   // B = blocos da tela (um por resultado)
const NOME = { pele:'Pele', pele2:'Pele 2', pernas:'Pernas', braco:'Idade muscular', 'quiz-longevidade':'Quiz da longevidade', 'quiz-emagrecimento':'Emagrecimento' };
function bloco(e){
  let m = null; try { m = montar(e); } catch (err) { console.error(err); }
  if (!m) return '';
  const i = B.push({ ...m, roteiro:null, estado:'' }) - 1;
  return `<section class="rot" data-rot="${i}" aria-label="Roteiro do react">${corpo(i)}</section>`;
}
/** Texto do roteiro com marcações: tempos em negrito, [CIRCULAR] destacado, avisos separados. */
function formata(txt){
  const [fala, avisos] = String(txt).split(/^AVISOS PARA O LUCCA\s*$/m);
  const linhas = fala.split('\n').filter(l => l.trim() && !/^ROTEIRO\s*$/.test(l.trim()));
  const h = linhas.map(l => {
    if (/^TESTE:/.test(l)) return `<p class="rot-meta">${esc(l.replace(/^TESTE:\s*/, ''))}</p>`;
    const m = l.match(/^\s*\[(\d+-\d+ s)\]\s*(.*)$/);
    const corpoL = esc(m ? m[2] : l).replace(/\[CIRCULAR:([^\]]*)\]/g, '<mark class="rot-c">circular:$1</mark>').replace(/\{nome\}/g, '<b class="rot-n">{nome}</b>');
    return m ? `<p class="rot-l"><span class="rot-t">${esc(m[1])}</span><span>${corpoL}</span></p>` : `<p class="rot-l"><span></span><span>${corpoL}</span></p>`;
  }).join('');
  const av = (avisos || '').split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return h + (av.length ? `<div class="rot-av"><b>Avisos para você</b><ul>${av.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '');
}
const dinheiro = v => v == null ? '' : 'US$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:3, maximumFractionDigits:3 });
const quandoCurto = d => new Date(d).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
function corpo(i){
  const b = B[i], r = b.roteiro;
  let h = `<div class="rot-h"><h3>Roteiro do react</h3><small>escrito pelo Claude para você conferir e falar do seu jeito</small></div>`;
  if (r){
    h += `<div class="rot-txt" id="rot-txt-${i}">${formata(r.roteiro)}</div>`;
    if (r.avisos?.length) h += `<div class="rot-conf"><b>Conferir antes de gravar</b><ul>${r.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
    h += `<p class="rot-info">${esc(r.modelo || '')}${r.custo_usd != null ? ' · ' + esc(dinheiro(r.custo_usd)) : ''} · ${esc(quandoCurto(r.criado_em))}${r.palavras ? ` · ${r.palavras} palavras faladas` : ''}</p>`;
  } else if (b.estado !== 'gerando') h += `<p class="rot-vazio">${b.estado === 'lendo' ? 'Procurando roteiro já feito…' : 'Ainda sem roteiro. O Claude lê as respostas e o resultado (sem nome, telefone nem foto) e escreve o react de 1 minuto.'}</p>`;
  if (b.estado === 'gerando') h += '<p class="rot-vazio rot-espera">Escrevendo o roteiro… (uns 20 a 60 s)</p>';
  if (b.erro) h += `<p class="rot-erro" role="alert">${esc(b.erro)}</p>`;
  const ocupado = b.estado === 'gerando' || b.estado === 'lendo';
  h += `<div class="rot-acoes">${r ? `<button type="button" class="rot-copiar" data-rot="${i}">Copiar roteiro</button><button type="button" class="rot-gerar sec${b.conf ? ' conf' : ''}" data-rot="${i}" ${ocupado ? 'disabled' : ''}>${b.conf ? 'Toque de novo: gasta 1 chamada' : 'Gerar de novo'}</button>`
    : `<button type="button" class="rot-gerar" data-rot="${i}" ${ocupado ? 'disabled' : ''}>${b.estado === 'gerando' ? 'Gerando…' : 'Gerar roteiro'}</button>`}</div>`;
  if (USO) h += `<p class="rot-info">Hoje: ${USO.hoje} de ${USO.teto} roteiros pagos</p>`;
  return h;
}
const redesenha = i => { const s = document.querySelector(`.rot[data-rot="${i}"]`); if (s) s.innerHTML = corpo(i); };
const redesenhaTodos = () => B.forEach((_, i) => redesenha(i));
const ERRO = { teto:'Chegou no teto de roteiros de hoje. Amanhã libera de novo (ou peça para subir o teto).', recusa:'O Claude recusou este pedido. Tente "Gerar de novo" mais tarde ou escreva à mão.',
  ocupado:'A API está ocupada agora. Tente de novo em 1 minuto.', sem_chave:'A função ainda está sem a chave da Anthropic (falta rodar o script de ligar).', grande:'Resultado grande demais para mandar.',
  vazio:'O Claude não devolveu texto. Tente de novo.', banco:'Não consegui gravar no banco. Tente de novo.' };
async function gerar(i, novo){
  const b = B[i]; b.estado = 'gerando'; b.erro = ''; b.conf = false; redesenha(i);
  try {
    const r = await post({ acao:'gerar', c:CODIGO, chave:b.chave, teste:b.teste, entrada:b.entrada, novo:!!novo });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404) throw new Error('Link sem acesso. Use o link do arquivo privado.');
    if (!j.ok) throw new Error(ERRO[j.erro] || `Não gerou (${j.erro || r.status}).`);
    b.roteiro = j.roteiro;
    if (j.hoje != null) USO = { hoje:j.hoje, teto:j.teto };
  } catch (err) { b.erro = err.message || 'Sem conexão.'; }
  b.estado = ''; redesenhaTodos();
}
async function lerGravados(c){
  if (!B.length) return;
  B.forEach(b => b.estado = 'lendo'); redesenhaTodos();
  try {
    const r = await post({ acao:'ler', c });
    const j = await r.json().catch(() => ({}));
    if (c !== CODIGO) return;   // trocou de código no meio
    if (j.ok){
      USO = { hoje:j.hoje, teto:j.teto };
      for (const b of B){ const g = (j.roteiros || []).find(x => x.chave === b.chave); if (g) b.roteiro = g; }
    }
  } catch { /* sem conexão: segue com o botão */ }
  B.forEach(b => { if (b.estado === 'lendo') b.estado = ''; }); redesenhaTodos();
}
function copiar(btn){
  const i = +btn.dataset.rot, txt = B[i]?.roteiro?.roteiro || '';
  const feito = m => { btn.textContent = m; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = 'Copiar roteiro'; }, 1500); };
  try { navigator.clipboard.writeText(txt).then(() => feito('Copiado'), () => feito('Não copiou')); } catch { feito('Não copiou'); }
}
document.addEventListener('click', ev => {
  const cp = ev.target.closest('.rot-copiar'); if (cp){ copiar(cp); return; }
  const g = ev.target.closest('.rot-gerar'); if (!g || g.disabled) return;
  const i = +g.dataset.rot, b = B[i]; if (!b) return;
  if (!b.roteiro){ gerar(i, false); return; }
  if (!b.conf){ b.conf = true; redesenha(i); setTimeout(() => { if (b.conf){ b.conf = false; redesenha(i); } }, 4000); return; }
  gerar(i, true);
});

// ---------- "Parecido com isto" (comparativas/indice.json; sem o arquivo, some) ----------
let INDICE = null;   // null = não carregado; [] = sem arquivo ou vazio
const ALIAS = { acne:'acne_ativa', espinhas:'acne_ativa', espinha:'acne_ativa', cravos:'comedoes', cravo:'comedoes', cicatriz:'cicatriz_acne', marcas:'cicatriz_acne',
  rugas_testa:'linhas_testa', testa:'linhas_testa', pe_de_galinha:'olhos', olheira:'olhos', olheiras:'olhos', poros:'textura_poros', textura:'textura_poros',
  mancha:'manchas', sulco:'sulco_nasolabial', bigode_chines:'sulco_nasolabial', contorno:'flacidez' };
const GRAU_TXT = { leve:1, moderado:2, moderada:2, marcado:3, marcada:3, intenso:3 };
const normAchado = a => { const x = String(a || '').toLowerCase().trim().replace(/[\s-]+/g, '_'); return ALIAS[x] || x; };
const normGrau = g => typeof g === 'number' ? g : GRAU_TXT[String(g || '').toLowerCase().trim()] ?? (+g || null);
async function carregaIndice(){
  if (INDICE) return INDICE;
  try {
    const r = await fetch('comparativas/indice.json', { cache:'no-cache' });
    const j = r.ok ? await r.json() : [];
    const lista = Array.isArray(j) ? j : Array.isArray(j?.imagens) ? j.imagens : [];
    INDICE = lista.filter(x => x && x.arquivo && x.achado && x.licenca && (x.autor || x.fonte_url)).map(x => ({ ...x, achado:normAchado(x.achado), grau:normGrau(x.grau) }));
  } catch { INDICE = []; }
  return INDICE;
}
function parecido(e){
  const t = testeDe(e); if (t !== 'pele' && t !== 'pele2') return '';
  const sin = sinaisPele(e.dados || {}, t === 'pele2').filter(s => s.grau >= 1).sort((a, b) => b.grau - a.grau);
  if (!sin.length) return '';
  return `<div class="parecido" hidden data-sin="${esc(JSON.stringify(sin.map(s => [s.id, s.grau])))}"></div>`;
}
const urlOk = u => /^https:\/\//i.test(String(u || ''));
async function preencheParecidos(){
  const els = [...document.querySelectorAll('.parecido[data-sin]')]; if (!els.length) return;
  const ind = await carregaIndice();
  for (const el of els){
    let sin = []; try { sin = JSON.parse(el.dataset.sin); } catch { /* nada */ }
    let esc1 = null;
    for (const [id, g] of sin){
      const xs = ind.filter(x => x.achado === id); if (!xs.length) continue;
      esc1 = { id, g, imgs:xs.sort((a, b) => Math.abs((a.grau ?? g) - g) - Math.abs((b.grau ?? g) - g)).slice(0, 3) }; break;
    }
    if (!esc1){ el.remove(); continue; }
    el.innerHTML = `<h4>Parecido com isto <small>${esc(NOME_SIN[esc1.id]?.[0] || esc1.id)}, ${esc(GRAU[esc1.g] || '')} na análise</small></h4>
      <div class="par-lista">${esc1.imgs.map(x => `<figure><img src="comparativas/${esc(String(x.arquivo).replace(/^\/+|\.\.\//g, ''))}" alt="${esc(x.descricao || x.titulo_original || '')}" loading="lazy">
        <figcaption>${x.descricao ? `<span>${esc(x.descricao)}</span>` : ''}<small>${esc(x.autor || 'autor não informado')} · ${esc(x.licenca)}${urlOk(x.fonte_url) ? ` · <a href="${esc(x.fonte_url)}" target="_blank" rel="noopener noreferrer">fonte</a>` : ''}</small></figcaption></figure>`).join('')}</div>
      <p class="par-nota">Imagens de terceiros, para comparar; não são da pessoa. Não mostrar no react sem conferir a licença.</p>`;
    el.hidden = false;
    el.querySelectorAll('img').forEach(im => im.addEventListener('error', () => { im.closest('figure')?.remove(); if (!el.querySelector('figure')) el.remove(); }));
  }
}

/** Chamado pela Caixa depois de desenhar os cartões de um código. */
function depois(c){ CODIGO = c; lerGravados(c); preencheParecidos(); }
/** Chamado pela Caixa antes de desenhar um código novo. */
function zerar(c){ B = []; CODIGO = c; USO = null; }

const css = document.createElement('style');
css.textContent = `.rot{margin-top:14px;padding-top:12px;border-top:2px solid var(--l);display:flex;flex-direction:column;gap:8px}
.rot-h h3{margin:0;font-size:1.05rem}.rot-h small{color:var(--m);font-size:.82rem}
.rot-txt{background:var(--bg);border:1px solid var(--l);border-radius:12px;padding:10px 12px;font-size:1rem;line-height:1.5}
.rot-meta{margin:0 0 6px;color:var(--m);font-size:.82rem}
.rot-l{display:grid;grid-template-columns:4.6em 1fr;gap:8px;margin:0 0 8px}
.rot-t{font:700 .78rem ui-monospace,monospace;color:var(--a);padding-top:.25em}
.rot-c{background:#ffe1dc;color:#8a1c0c;border-radius:6px;padding:0 4px;font-size:.9em;font-weight:600}
.rot-n{color:var(--a)}
.rot-av{margin-top:6px;font-size:.88rem;color:var(--m)}.rot-av ul{margin:4px 0 0;padding-left:1.1em}
.rot-conf{background:var(--w2);color:var(--w);border-radius:10px;padding:8px 12px;font-size:.88rem}.rot-conf ul{margin:4px 0 0;padding-left:1.1em}
.rot-info{margin:0;color:var(--m);font-size:.8rem}
.rot-vazio{margin:0;color:var(--m);font-size:.92rem}
.rot-espera::after{content:'';display:inline-block;width:.9em;height:.9em;margin-left:6px;border:2px solid var(--a);border-right-color:transparent;border-radius:50%;vertical-align:-2px;animation:rotgira .8s linear infinite}
@keyframes rotgira{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.rot-espera::after{animation:none}}
.rot-erro{margin:0;color:var(--r);font-size:.9rem}
.rot-acoes{display:flex;gap:8px;flex-wrap:wrap}
.rot-acoes button{flex:1;min-width:140px}
.rot-acoes button.sec{background:var(--s);color:var(--a);border:1.5px solid var(--l)}
.rot-acoes button.conf{background:var(--w);color:#fff;border-color:var(--w)}
.rot-acoes button:disabled{opacity:.55}
.parecido{margin:4px 0 8px;padding:10px;border:1px dashed var(--l);border-radius:12px}
.parecido h4{margin:0 0 6px;font-size:.95rem}.parecido h4 small{color:var(--m);font-weight:500}
.par-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.par-lista figure{margin:0;display:flex;flex-direction:column;gap:4px}
.par-lista img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--bg)}
.par-lista figcaption{font-size:.78rem;line-height:1.3;display:flex;flex-direction:column;gap:2px}
.par-lista figcaption small{color:var(--m)}.par-lista a{color:var(--a)}
.par-nota{margin:6px 0 0;font-size:.75rem;color:var(--m)}`;
document.head.appendChild(css);

return { montar, bloco, parecido, depois, zerar, testeDe, _indice:() => INDICE };
})();
