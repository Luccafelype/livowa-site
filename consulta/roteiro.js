/* Roteiro do react por lead e "Parecido com isto" (03/11/2026). Carregado depois de kits.js, só na Caixa privada.
   1. Roteiro MONTADO NA HORA a partir do estoque (roteiros-estoque.json, blocos escritos pelas regras-roteiro-v1), sem API e
      sem custo: abertura, o que o resultado mostra (com onde circular), mecanismo, ponte e pergunta de 1 toque. Cada bloco
      tem 2 ou 3 variações (botão Trocar; a escolha fica neste aparelho). O nome digitado no kit entra no texto, só na tela.
   2. "Ajustar com o Claude" (opcional, caso fora do estoque): manda à edge gerar-roteiro o roteiro montado (com {nome}),
      o pedido dele e a entrada mínima (respostas, números, classificação do kit). NÃO vão: nome, telefone, @, código LV
      (vai à parte, para gravar no nosso banco), foto.
   3. "Parecido com isto" ao lado das fotos da pele: lê comparativas/indice.json; sem o arquivo, o espaço some. */
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
// Pele: idade e vitalidade (04/11; rótulos de pele/index.html, a tela que ela viu)
const PI = {
  sexo:['Sexo', SEXO],
  idade:['Idade real', null],
  cigarro:['Você fuma ou já fumou?', { nunca:'Nunca fumei', parou:'Já fumei e parei', parou_mais10:'Parei há mais de 10 anos', parou_menos10:'Parei há menos de 10 anos', as_vezes:'Fumo ou uso vape às vezes', hoje:'Fumo hoje / todo dia' }],
  sol:['Quanto sol o rosto pega (sem protetor)', { quase_nenhum:'Quase nenhum', fds:'Um pouco, ou só no fim de semana', todo_dia:'Quase todo dia' }],
  metabolico:['Já te disseram que a pressão ou a glicose estava alta?', { nao_medi:'Não, e medi no último ano', nunca:'Nunca medi ou não lembro', pressao:'Sim, a pressão', glicose:'Sim, a glicose', ambas:'Sim, as duas' }],
  movimento:['Quanto se mexe numa semana comum', { quase_nada:'Quase nada', ate2:'Até 2 horas', '2a5':'De 2 a 5 horas', mais5:'Mais de 5 horas' }],
  sono:['Como são as noites', { bem:'Durmo 7 horas ou mais e acordo bem', '6h':'Durmo umas 6 horas', curto:'Durmo 5 horas ou menos', cansado:'Durmo, mas acordo cansada(o)' }],
  futuro:['Daqui a 10 anos, o que mais quer', { disposicao:'Ter a mesma disposição de hoje', parecer:'Parecer a idade que eu sinto', chegar10:'Chegar aos (idade + 10) com força e memória', antes:'Cuidar da saúde antes de aparecer problema', aos70:'Chegar bem aos 70, com força e memória', entender:'Entender o que o meu corpo já está mostrando', cuidar:'Cuidar agora, antes que apareça' }],
};
/** {pergunta: resposta} com o texto da tela; multi ('a+b' ou lista) vira lista. Pergunta sem resposta fica de fora. */
function rotular(r, mapa){
  const out = {};
  for (const [k, [perg, ops]] of Object.entries(mapa)){
    const v = r?.[k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    const vs = Array.isArray(v) ? v : String(v).includes('+') ? String(v).split('+') : [v];
    const t = vs.map(x => (ops && ops[x]) ?? String(x));
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
const NOME_SIN_PI = { linhas_testa:'Linhas da testa', olhos:'Canto dos olhos', sulco_nasolabial:'Vinco do nariz à boca', manchas:'Manchas nas bochechas', flacidez:'Firmeza do contorno' };
function entradaPeleIdade(d, c){
  const sin = (d.sinais || []).filter(s => NOME_SIN_PI[s.id] && s.visivel !== false && s.nivel != null && +s.nivel >= 1).sort((a, b) => b.nivel - a.nivel);
  return {
    idade_informada:d.idade ?? undefined,
    idade_que_o_rosto_aparenta:d.faixa || 'a página não mostrou número',
    leitura:c ? c.titulo : undefined,
    regra_da_faixa_para_o_video:c?.idadeFaixa?.txt,
    confianca_da_analise:d.confianca, qualidade_da_foto:d.qualidade,
    frases_de_vitalidade_na_pagina:d.frases ? String(d.frases).split('+') : undefined,
    sinais_da_foto_ligados_a_idade:d.faixa ? sin.map(s => ({ sinal:NOME_SIN_PI[s.id], grau:`${GRAU[+s.nivel]} (${+s.nivel} de 3)`, onde_circular:'foto de frente' })) : undefined,
    respostas:rotular(d.respostas, PI),
    foto_duvidosa_refazer:c ? !!c.refazer : undefined,
  };
}
const ENTRADA = {
  pele:(d, c) => entradaPele(d, 'pele', c), pele2:(d, c) => entradaPele(d, 'pele2', c), 'pele-idade':entradaPeleIdade, pernas:entradaPernas, braco:entradaBraco,
  'quiz-emagrecimento':entradaEmag, 'quiz-longevidade':d => ({ respostas:rotular(d.respostas, LONG) }),
};
const testeDe = e => e.etapa === 'pele-resultado' ? 'pele' : e.funil === 'pele2' ? 'pele2' : e.funil === 'pele-idade' ? 'pele-idade' : e.funil === 'teste-pernas' ? 'pernas' : e.funil === 'teste-braco' ? 'braco'
  : e.funil === 'teste-emagrecimento' ? 'quiz-emagrecimento' : e.funil === 'quiz-longevidade' ? 'quiz-longevidade' : null;
const KIT_DE = { pele:'pele', pele2:'pele2', 'pele-idade':'pele-idade', pernas:'pernas', braco:'braco' };
// testes que a edge gerar-roteiro já aceita (logica.ts, TESTES); os outros mostram só o roteiro do estoque
const CLAUDE_TESTES = new Set(['pele', 'pele2', 'pernas', 'braco', 'quiz-longevidade', 'quiz-emagrecimento']);
/** {teste, chave, entrada} de um resultado da Caixa, ou null se o teste não tem roteiro. */
function montar(e){
  const t = testeDe(e); if (!t) return null;
  const d = e.dados || {};
  let c = null;
  try { if (KIT_DE[t] && window.KITS) c = KITS[KIT_DE[t]].classifica(d); } catch (err) { console.error(err); }
  const tira = o => JSON.parse(JSON.stringify(o));   // some com os undefined
  return { teste:t, chave:`${String(e.funil || t).toLowerCase().replace(/[^a-z0-9-]/g, '')}|${e.quando}`, entrada:tira(ENTRADA[t](d, c)) };
}

// ---------- roteiro montado pelo ESTOQUE (roteiros-estoque.json): na hora, sem API e sem custo ----------
let EST = null;   // o estoque; null = não carregou (aí o bloco mostra só o botão do Claude)
async function carregaEstoque(){
  if (EST) return EST;
  try { const r = await fetch('roteiros-estoque.json?v=20261104', { cache:'no-cache' }); EST = r.ok ? await r.json() : null; } catch { EST = null; }
  return EST;
}
const TEMPO = ['0-8 s', '8-30 s', '30-45 s', '45-52 s', '52-60 s'];
const listaE = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : (a[0] || '');
const n1 = v => v == null || v === '' || isNaN(+v) ? null : (+v).toLocaleString('pt-BR', { maximumFractionDigits:1 });
const REG_ACNE_TXT = { testa:'na testa', nariz:'no nariz', bochechas:'nas bochechas', queixo:'no queixo', mandibula:'na mandíbula' };
const REG_CURTA = { linhas_testa:'testa', olhos:'canto do olho', manchas:'bochechas', textura_poros:'zona T e nariz', sulco_nasolabial:'do nariz à boca', flacidez:'borda da mandíbula' };
const OBJ_CURTO = { escada:'subir escada e carregar peso sem pensar', familia:'ter disposição com filhos e netos', trabalho:'trabalhar sem chegar no limite no fim do dia',
  viajar:'viajar e andar o dia inteiro', esporte:'continuar no esporte', independente:'não depender de ninguém' };
/** Preenche {chave} com V; devolve null se faltar algum valor (a variação não serve para este lead). {nome} fica. */
function preenche(t, V){
  let falta = false;
  const s = String(t).replace(/\{(\w+)\}/g, (m, k) => { if (k === 'nome') return m; const v = V[k]; if (v == null || v === '') { falta = true; return m; } return v; });
  return falta ? null : s;
}
/** Um bloco: as variações que servem para o lead, o tempo, onde circular e de onde veio. */
function blocoE(id, tempo, textos, V, o = {}){
  const opc = (Array.isArray(textos) ? textos : [textos]).map(t => preenche(t, V)).filter(Boolean).map(t => o.junta ? t + ' ' + o.junta : t);
  return opc.length ? { id, tempo, opcoes:opc, circular:o.circular ? preenche(o.circular, V) || o.circular : null, fonte:o.f || '', fixo:!!o.fixo } : null;
}
function rotPele(d, t, c, E){
  const P = E.pele, C = E.comum, p2 = t === 'pele2', V = {}, out = [], avisos = [];
  if (c?.refazer){
    const mot = /ruim/.test(c.motivo) ? 'ruim' : /cobert/.test(c.motivo) ? 'coberta' : 'padrao';
    V.motivo = P.refazer.motivo[mot];
    out.push(blocoE('refazer', TEMPO[0] + ' a ' + TEMPO[2].split('-')[1], P.refazer.texto, V, { f:P.refazer.f }));
    out.push(blocoE('refazer-pergunta', TEMPO[4], C.refazer_pergunta, V, { f:P.refazer.f, fixo:true }));
    avisos.push('Foto duvidosa: ' + (c.motivo || '') + ' Nenhum achado no vídeo (regra 16).');
    return { blocos:out.filter(Boolean), avisos };
  }
  const sin = sinaisPele(d, p2), com = sin.filter(s => s.grau >= 1 && P.achados[s.id]);
  const resp = d.respostas || {};
  const qs = String(resp.incomoda || '').split('+').filter(Boolean).map(q => P.queixa[q]).filter(q => q && q[0]);
  V.queixa = qs.length ? listaE(qs.slice(0, 2).map(q => q[0])) : null;
  const principal = qs.map(q => com.find(s => s.id === q[1])).find(Boolean) || [...com].sort((a, b) => b.grau - a.grau)[0];
  const ordem = principal ? [principal, ...com.filter(s => s !== principal).sort((a, b) => b.grau - a.grau)] : [];
  out.push(blocoE('abertura', TEMPO[0], V.queixa ? P.abertura.com_queixa : P.abertura.sem_queixa, V, { f:P.abertura.f }));
  const bem = sin.filter(s => s.grau === 0 && P.achados[s.id]).map(s => P.achados[s.id].nome);
  V.bem = bem.length ? listaE(bem.slice(0, 2)) : null;
  out.push(blocoE('bem', TEMPO[1], V.bem ? P.bem.com_lista : P.bem.sem_lista, V, { f:P.bem.f }));
  const mF = String(d.faixa || '').match(/(\d+)\D+(\d+)/), aparente = c?.idadeFaixa?.aparente;
  const nAch = aparente && c?.idadeFaixa?.dizer && mF ? 2 : 3;   // com a idade aparente no vídeo, 2 achados (cabe em 1 min)
  for (const s of ordem.slice(0, nAch)){
    const A = P.achados[s.id];
    const W = { ...V, onde:A.onde_fixo || listaE(s.regioes.map(r => REG_ACNE_TXT[Object.keys(REG_ACNE).find(k => REG_ACNE[k] === r)] || r)) || 'no rosto' };
    const reg = REG_CURTA[s.id] || s.regioes.join(' e ') || 'rosto';
    out.push(blocoE('achado-' + s.id, TEMPO[1], s.grau >= 2 ? A.forte : A.leve, W, { f:A.f, circular:`${s.foto}, ${reg}`, junta:s.id === 'cicatriz_acne' && s.tipo === 'marca de cor' ? A.cor : '' }));
  }
  if (ordem.length > nAch) avisos.push('Também apareceram (fora do vídeo, para 1 ideia só): ' + ordem.slice(nAch).map(s => P.achados[s.id].nome).join(', ') + '.');
  if (com.some(s => s.id === 'manchas' && s.grau >= 2)) out.push(blocoE('seguranca', TEMPO[1], C.seguranca.pele, V, { f:C.seguranca.f, fixo:true }));
  // a faixa: pele antiga só quando a regra do kit deixa (compara com a idade real); pele2 = "idade aparente do rosto",
  // que ela já viu no topo do resultado (03/11), e entra PRIMEIRO no que o resultado mostra
  if (c?.idadeFaixa?.dizer && mF){
    const bl = aparente ? blocoE('idade', TEMPO[1], P.idade_aparente.texto, { ...V, min:mF[1], max:mF[2] }, { f:P.idade_aparente.f, circular:'a idade aparente no topo do resultado' })
      : blocoE('faixa', TEMPO[1], P.faixa_idade.texto, { ...V, min:mF[1], max:mF[2] }, { f:P.faixa_idade.f, circular:'a faixa de idade na tela' });
    if (aparente) out.splice(out.findIndex(b => b && b.id === 'bem'), 0, bl); else out.push(bl);
  } else if (d.faixa) avisos.push('Faixa de idade fora do vídeo: ' + (c?.idadeFaixa?.txt || 'regra do kit.'));
  if (principal) out.push(blocoE('mecanismo', TEMPO[2], P.achados[principal.id].mecanismo, V, { f:P.achados[principal.id].f }));
  out.push(blocoE('ponte', TEMPO[3], aparente && c?.idadeFaixa?.dizer && mF ? P.idade_aparente.ponte : C.ponte.foto, V, { f:C.ponte.f }));
  out.push(blocoE('pergunta', TEMPO[4], C.pergunta.geral, V, { f:C.pergunta.f }));
  if (['gravida', 'amamentando', 'tentando'].includes(resp.seguranca)) avisos.push(`Ela marcou "${P2.seguranca[1][resp.seguranca]}": nada de produto, remédio ou procedimento, nem por escrito.`);
  if (['sensivel', 'reacao'].includes(resp.alergia)) avisos.push(`Alergia: "${P2.alergia[1][resp.alergia]}". Nada de nome de produto.`);
  if (c?.notaAcne) avisos.push(c.notaAcne);
  if (!principal) avisos.push('Nenhum achado com grau 1 ou mais: o vídeo pode ficar curto (70 a 130 palavras, regra 8).');
  return { blocos:out.filter(Boolean), avisos };
}
// Pele: idade e vitalidade (04/11). Ordem: abertura com o "daqui a 10 anos" → a idade do rosto ao lado da idade real →
// o que está bem → até 2 hábitos que pesam (o 1º com o sinal da foto, quando houver) → o mecanismo do 1º (o único número
// de estudo) → ponte → pergunta. Sem produto, rotina ou programa (regras 4, 5 e 23).
const ORDEM_HAB = ['cigarro', 'sol', 'metabolico', 'sono', 'movimento'];   // a mesma prioridade da página (pele/app.js)
const ATENCAO_PI = { cigarro:['hoje', 'as_vezes', 'parou', 'parou_menos10', 'parou_mais10'], sol:['todo_dia', 'fds'], metabolico:['pressao', 'glicose', 'ambas', 'nunca'], sono:['curto', 'cansado'], movimento:['quase_nada', 'ate2'] };
const FOTO_HAB = { cigarro:['sulco_nasolabial', 'flacidez', 'olhos'], sol:['manchas', 'linhas_testa'], sono:['olhos'] };
const ZONA_SIN = { linhas_testa:['testa'], olhos:['olhos_canto'], sulco_nasolabial:['sulco'], manchas:['bochecha'], flacidez:['mandibula'] };
const REG_PI = { linhas_testa:'testa', olhos:'canto dos olhos', sulco_nasolabial:'do nariz à boca', manchas:'bochechas', flacidez:'contorno do rosto' };
function rotPeleIdade(d, c, E){
  const P = E['pele-idade'], C = E.comum, r = d.respostas || {}, out = [], avisos = [];
  if (!P) return { blocos:[], avisos:['O estoque não tem o bloco pele-idade.'] };
  if (c?.refazer){
    const V = { motivo:E.pele.refazer.motivo[d.qualidade === 'ruim' ? 'ruim' : 'padrao'] };
    out.push(blocoE('refazer', TEMPO[0] + ' a ' + TEMPO[2].split('-')[1], E.pele.refazer.texto, V, { f:E.pele.refazer.f }));
    out.push(blocoE('refazer-pergunta', TEMPO[4], C.refazer_pergunta, V, { f:E.pele.refazer.f, fixo:true }));
    avisos.push('Foto duvidosa: ' + (c.motivo || '') + ' Nenhum número nem sinal no vídeo (regra 16). Atalho /pirefazer (livowa.com/pele).');
    return { blocos:out.filter(Boolean), avisos };
  }
  const mF = String(d.faixa || '').match(/(\d+)\D+(\d+)/), idade = d.idade ?? r.idade;
  const V = { futuro:c?.vars?.futuro || window.KITS?.['pele-idade']?.futuro?.[r.futuro] || null, idade:idade != null ? String(idade) : null, min:mF ? mF[1] : null, max:mF ? mF[2] : null };
  out.push(blocoE('abertura', TEMPO[0], V.futuro ? P.abertura.com_futuro : P.abertura.sem_futuro, V, { f:P.abertura.f, circular:V.futuro ? 'a resposta "daqui a 10 anos" na tela' : null }));
  // a idade do rosto: com número só se a página mostrou e a regra deixa (mais de 5 anos acima: sem número)
  const caso = c?.caso || 'sem_numero', dizer = !!(c?.idadeFaixa?.dizer && mF);
  const chave = caso === 'sem_numero' ? 'sem_numero' : caso === 'mais_velho' && !dizer ? 'mais_velho_sem_numero' : caso;
  const bi = blocoE('idade', TEMPO[1], P.idade[chave], V, { f:P.idade.f, circular:chave === 'sem_numero' ? null : dizer ? 'a régua: a faixa do rosto e a sua idade' : 'a foto de frente inteira' });
  if (bi) bi.regiao = null;
  out.push(bi);
  if (c?.idadeFaixa && !c.idadeFaixa.dizer) avisos.push(c.idadeFaixa.txt);
  // o que está bem
  const bons = [r.cigarro === 'nunca' && P.bem.itens.cigarro, r.sol === 'quase_nenhum' && P.bem.itens.sol, r.metabolico === 'nao_medi' && P.bem.itens.metabolico,
    r.sono === 'bem' && P.bem.itens.sono, ['2a5', 'mais5'].includes(r.movimento) && P.bem.itens['movimento_' + r.movimento]].filter(Boolean);
  if (bons.length) out.push(blocoE('bem', TEMPO[1], P.bem.texto, { ...V, bem:listaE(bons.slice(0, 2)) }, { f:P.bem.f }));
  // hábitos que pesam: até 2 no vídeo (uma ideia só); o 1º leva o sinal da foto e o mecanismo
  const hab = ORDEM_HAB.filter(k => (ATENCAO_PI[k] || []).includes(r[k]));
  const comFoto = !!mF;   // a página só mostrou sinais quando mostrou número
  const sin = Object.fromEntries((d.sinais || []).map(s => [s.id, s.visivel !== false && s.nivel != null ? +s.nivel || 0 : null]));
  const fem = r.sexo === 'f' ? 'cansado_f' : r.sexo === 'm' ? 'cansado_m' : 'cansado';
  hab.slice(0, 2).forEach((k, i) => {
    const frase = P.habito.frase[k][k === 'sono' && r.sono === 'cansado' ? fem : r[k]];
    const ids = comFoto && i === 0 ? (FOTO_HAB[k] || []).filter(id => sin[id] >= 1) : [];
    const top = ids.length ? ids.reduce((a, b) => sin[b] > sin[a] ? b : a) : null;
    const W = { ...V, habito:frase, nafoto:top ? P.habito.sinal[top][sin[top]] : null };
    const b = blocoE('habito-' + k, TEMPO[1], top ? P.habito.com_foto : P.habito.texto, W, { f:P.habito.f, circular:top ? `foto de frente, ${REG_PI[top]}` : P.habito.circular[k] });
    if (b) b.regiao = top ? ZONA_SIN[top] : null;
    out.push(b);
  });
  if (hab.length > 2) avisos.push('Também pesam (fora do vídeo, uma ideia só): ' + hab.slice(2).map(k => P.habito.frase[k][k === 'sono' && r.sono === 'cansado' ? fem : r[k]]).join('; ') + '.');
  if (comFoto && (sin.manchas || 0) >= 2) out.push(blocoE('seguranca', TEMPO[1], C.seguranca.pele, V, { f:C.seguranca.f, fixo:true }));
  const mec = hab[0] || 'gemeos';
  out.push(blocoE('mecanismo', TEMPO[2], P.mecanismo[mec], V, { f:P.mecanismo.f }));
  out.push(blocoE('ponte', TEMPO[3], P.ponte.texto, V, { f:P.ponte.f }));
  out.push(blocoE('pergunta', TEMPO[4], C.pergunta.geral, V, { f:C.pergunta.f }));
  if (['pressao', 'glicose', 'ambas'].includes(r.metabolico)) avisos.push('Ela marcou pressão ou glicose alta: sinal de saúde (regra 17). Vale olhar com exame; fale com ela também por escrito. Sem nome de doença nem de remédio.');
  if (r.cigarro === 'hoje') avisos.push('Fuma hoje: tom de alívio e explicação, sem cobrança (regra 22).');
  if (caso === 'sem_numero' && !c?.refazer) avisos.push('A página não mostrou número. Se ela quiser o número, mande o atalho /pirefazer.');
  avisos.push('Não é análise de pele: nada de produto, rotina, procedimento ou programa no vídeo (regras 4, 5 e 23).');
  return { blocos:out.filter(Boolean), avisos };
}
function rotMov(t, d, c, E){
  const M = E[t], C = E.comum, out = [], avisos = [], V = {};
  const m = c?.medida || {};
  if (t === 'pernas') Object.assign(V, { tempo:n1(d.t), pc:d.pc != null ? String(d.pc) : null, faixa_idade:d.faixa || null });
  else Object.assign(V, { roscas:m.roscas != null ? String(m.roscas) : null, idade_m:m.faixaTxt || null });
  if (c?.refazer){
    const k = t === 'pernas' ? (/mais rápido/.test(c.motivo) ? 'rapido' : /Contou/.test(c.motivo) ? 'reps' : 'padrao')
      : (/curta/.test(c.motivo) ? 'curto' : /Só \d+ movimentos/.test(c.motivo) ? 'poucas' : /não combinam|rara/.test(c.motivo) ? 'estranho' : 'padrao');
    V.motivo = M.refazer.motivo[k];
    out.push(blocoE('refazer', '0-45 s', M.refazer.texto, V, { f:M.refazer.f }));
    out.push(blocoE('seguranca', '45-52 s', C.seguranca.movimento, V, { f:C.seguranca.f, fixo:true }));
    out.push(blocoE('refazer-pergunta', TEMPO[4], C.refazer_pergunta, V, { f:M.refazer.f, fixo:true }));
    avisos.push('Medição duvidosa: ' + (c.motivo || '') + ' Nenhuma faixa no vídeo (regra 16).');
    return { blocos:out.filter(Boolean), avisos };
  }
  out.push(blocoE('abertura', TEMPO[0], M.abertura.texto, V, { f:M.abertura.f, circular:t === 'pernas' ? 'o tempo das 5 levantadas' : 'as roscas em 10 s' }));
  if (c?.faixa) out.push(blocoE('faixa', TEMPO[1], M.faixa[c.faixa], V, { f:M.faixa.f, circular:t === 'pernas' ? 'o percentil e o quadril no vídeo' : 'a idade muscular estimada' }));
  if (t === 'pernas' && V.faixa_idade && c?.faixa && c.faixa < 4) out.push(blocoE('parecida', TEMPO[1], M.faixa.parecida, V, { f:M.faixa.f, circular:'a faixa de idade na tela' }));
  if (c?.faixa === 4) out.push(blocoE('seguranca', TEMPO[1], C.seguranca.movimento, V, { f:C.seguranca.f, fixo:true }));
  out.push(blocoE('mecanismo', TEMPO[2], M.mecanismo.texto, V, { f:M.mecanismo.f }));
  out.push(blocoE('ponte', TEMPO[3], C.ponte.medida, V, { f:C.ponte.f }));
  out.push(blocoE('pergunta', TEMPO[4], C.pergunta.geral, V, { f:C.pergunta.f }));
  if (c?.simples) avisos.push('Leitura do kit: ' + c.simples);
  if (c?.faixa === 4) avisos.push('Faixa 4: fale com ela também por escrito (regra 17).');
  return { blocos:out.filter(Boolean), avisos };
}
function rotEmag(d, E){
  const Q = E['quiz-emagrecimento'], C = E.comum, r = d.respostas || {}, out = [], avisos = [];
  const lst = k => String(r[k] || '').split('+').filter(x => x && !['nenhum', 'nada'].includes(x));
  const rot = (k, x) => (EMAG[k][1][x] || x).toLowerCase();
  const V = { acontece:EMAG.acontece[1][r.acontece || d.perfil] || null, sono:EMAG.sono[1][r.sono] || null,
    forca:{ '1':'1 vez por semana', '2mais':'2 vezes ou mais por semana' }[r.forca] || null, cansada:r.sexo === 'm' ? 'cansado' : 'cansada' };
  const cp = [r.ciclo === 'irregular' ? 'a menstruação falhando ou atrasando' : null, lst('pele').includes('pelos') ? 'pelos grossos no rosto, no queixo ou na barriga' : null].filter(Boolean);
  V.ciclo_pelos = cp.length ? listaE(cp) : null;
  V.sintomas = lst('tireoide').length ? listaE(lst('tireoide').map(x => rot('tireoide', x))) : null;
  V.exames = lst('exames').filter(x => x !== 'sem_exames').length ? listaE(lst('exames').filter(x => x !== 'sem_exames').map(x => rot('exames', x))) : null;
  out.push(blocoE('abertura', TEMPO[0], Q.abertura.texto, V, { f:Q.abertura.f, circular:'a resposta "o que mais acontece"' }));
  const bemK = r.exames === 'nada' ? 'exames_ok' : ['7', '8', '9mais'].includes(r.sono) ? 'sono_ok' : ['1', '2mais'].includes(r.forca) ? 'forca_ok' : 'geral';
  out.push(blocoE('bem', TEMPO[1], Q.bem[bemK], V, { f:Q.bem.f, circular:bemK === 'geral' ? null : 'essa resposta na tela' }));
  let sin = String(d.sinais || '').split('+').filter(s => s && Q.sinais[s]);
  sin = [...sin.filter(s => s === 'remedio'), ...sin.filter(s => s !== 'remedio')];   // remédio sempre entra (regra 23)
  for (const s of sin.slice(0, 2)) out.push(blocoE('sinal-' + s, TEMPO[1], Q.sinais[s], V, { f:Q.sinais.f, circular:'as respostas que ela marcou sobre isso' }));
  if (sin.length > 2) avisos.push('Outros sinais do resultado (fale por escrito, 1 ideia por vídeo): ' + sin.slice(2).map(s => SINAL_EMAG[s] || s).join('; ') + '.');
  const perfil = r.acontece || d.perfil;
  if (Q.mecanismo[perfil]) out.push(blocoE('mecanismo', TEMPO[2], Q.mecanismo[perfil], V, { f:Q.mecanismo.f }));
  out.push(blocoE('ponte', TEMPO[3], C.ponte.respostas, V, { f:C.ponte.f }));
  out.push(blocoE('pergunta', TEMPO[4], C.pergunta.geral, V, { f:C.pergunta.f }));
  if (d.imc) avisos.push(`IMC ${n1(d.imc)} (${d.faixa || 'sem faixa'}) fica fora da fala; só por escrito se ela perguntar (regra 22).`);
  if (r.fase === 'gravida') avisos.push('Grávida: peso não é meta agora; nada de dieta, nem por escrito.');
  return { blocos:out.filter(Boolean), avisos };
}
function rotLong(d, E){
  const Q = E['quiz-longevidade'], C = E.comum, r = d.respostas || {}, out = [], avisos = [];
  const arr = v => Array.isArray(v) ? v : v ? String(v).split('+') : [];
  const V = { objetivo:arr(r.objetivo).length ? listaE(arr(r.objetivo).slice(0, 2).map(x => OBJ_CURTO[x] || x)) : null };
  out.push(blocoE('abertura', TEMPO[0], V.objetivo ? Q.abertura.texto : ['{nome}, aqui é o Lucca. Li todas as suas respostas com calma. Vou te contar o que eu vi.'], V, { f:Q.abertura.f, circular:'a resposta "daqui a 10 anos"' }));
  const inc = arr(r.incomoda).filter(x => Q.incomoda[x]);
  for (const x of inc.slice(0, 2)) out.push(blocoE('incomoda-' + x, TEMPO[1], Q.incomoda[x], V, { f:Q.incomoda.f, circular:'essa resposta na tela' }));
  const at = arr(r.atrapalha).find(x => Q.atrapalha[x]);
  if (at) out.push(blocoE('atrapalha-' + at, TEMPO[1], Q.atrapalha[at], V, { f:Q.atrapalha.f, circular:'essa resposta na tela' }));
  out.push(blocoE('mecanismo', TEMPO[2], Q.mecanismo.texto, V, { f:Q.mecanismo.f }));
  out.push(blocoE('ponte', TEMPO[3], C.ponte.respostas, V, { f:C.ponte.f }));
  out.push(blocoE('pergunta', TEMPO[4], C.pergunta.geral, V, { f:C.pergunta.f }));
  if (inc.length > 2) avisos.push('Também marcou: ' + inc.slice(2).map(x => LONG.incomoda[1][x]).join('; ') + '.');
  if (r.ajuda) avisos.push(`Prefere fazer: ${LONG.ajuda[1][r.ajuda] || r.ajuda}.`);
  if (r.idade) avisos.push(`Idade: ${LONG.idade[1][r.idade] || r.idade}.`);
  return { blocos:out.filter(Boolean), avisos };
}
/** O roteiro de um resultado montado pelo estoque: {blocos, avisos}, ou null sem estoque. */
function doEstoque(e){
  if (!EST) return null;
  const t = testeDe(e); if (!t) return null;
  const d = e.dados || {};
  let c = null; try { if (KIT_DE[t] && window.KITS) c = KITS[KIT_DE[t]].classifica(d); } catch (err) { console.error(err); }
  if (t === 'pele-idade') return rotPeleIdade(d, c, EST);
  if (t === 'pele' || t === 'pele2') return rotPele(t === 'pele2' ? (window.KITS ? KITS.pele2.norm(d) : d) : d, t, c, EST);
  if (t === 'pernas' || t === 'braco') return rotMov(t, d, c, EST);
  if (t === 'quiz-emagrecimento') return rotEmag(d, EST);
  return rotLong(d, EST);
}

// ---------- bloco na tela ----------
let B = [], CODIGO = '', USO = null;   // B = um por resultado da tela
const VAR_KEY = ch => 'livowa-rot-var:' + ch;
const lerVar = ch => { try { return JSON.parse(localStorage.getItem(VAR_KEY(ch)) || '{}'); } catch { return {}; } };
const gravaVar = (ch, v) => { try { localStorage.setItem(VAR_KEY(ch), JSON.stringify(v)); } catch { /* sem armazenamento: só nesta tela */ } };
/** Variação inicial: muda de lead para lead (não soa repetido) e fica igual para o mesmo lead. */
const semente = s => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const nomeAtual = () => { try { return (typeof KIT_NOME === 'string' ? KIT_NOME : '').trim(); } catch { return ''; } };
function bloco(e){
  let m = null; try { m = montar(e); } catch (err) { console.error(err); }
  if (!m) return '';
  const i = B.push({ ...m, e, est:null, vars:lerVar(m.chave), roteiro:null, estado:'' }) - 1;
  return `<section class="rot" data-rot="${i}" aria-label="Roteiro do react">${corpo(i)}</section>`;
}
const idx = (b, bl) => { const n = bl.opcoes.length; const v = b.vars[bl.id]; return ((v != null ? v : semente(b.chave + bl.id)) % n + n) % n; };
/** O roteiro em texto (formato da regra 26), com {nome} ou o nome digitado na tela. */
function textoEstoque(b, nome){
  const R = b.est; if (!R) return '';
  const linhas = R.blocos.map(bl => `[${bl.tempo}] ${bl.opcoes[idx(b, bl)]}${bl.circular ? ` [CIRCULAR: ${bl.circular}]` : ''}`);
  const t = `TESTE: ${b.teste} · ${palavras(b)} palavras faladas\nROTEIRO\n${linhas.join('\n')}\nAVISOS PARA O LUCCA\n${(R.avisos.length ? R.avisos : ['nenhum']).map(a => '- ' + a).join('\n')}`;
  return nome ? t.replace(/\{nome\}/g, nome) : t;
}
const palavras = b => (b.est?.blocos || []).reduce((s, bl) => s + (bl.opcoes[idx(b, bl)].replace(/\{nome\}/g, 'nome').match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || []).length, 0);
const destaca = s => esc(s).replace(/\{nome\}/g, '<b class="rot-n">{nome}</b>');
function htmlEstoque(i){
  const b = B[i], R = b.est, nome = nomeAtual();
  const linhas = R.blocos.map((bl, k) => {
    const n = bl.opcoes.length, j = idx(b, bl), txt = nome ? esc(bl.opcoes[j].replace(/\{nome\}/g, nome)) : destaca(bl.opcoes[j]);
    return `<div class="rot-l${bl.fixo ? ' fixo' : ''}"><span class="rot-t">${esc(bl.tempo)}</span><span class="rot-f">${txt}${bl.circular ? ` <mark class="rot-c">circular: ${esc(bl.circular)}</mark>` : ''}${bl.fixo ? ' <small class="rot-fix">frase fixa</small>' : ''}</span>${n > 1 ? `<button type="button" class="rot-trocar" data-rot="${i}" data-k="${k}" aria-label="Trocar variação (${j + 1} de ${n})">Trocar <small>${j + 1}/${n}</small></button>` : '<span></span>'}</div>`;
  }).join('');
  const p = palavras(b), alvo = R.blocos.some(bl => /^refazer/.test(bl.id)) ? '' : p < 70 ? ' (curto)' : p > 160 ? ' (passa de 160)' : '';
  return `<div class="rot-txt">${linhas}</div><p class="rot-info">${p} palavras faladas${alvo} · montado do estoque, sem custo</p>
    ${R.avisos.length ? `<div class="rot-av"><b>Avisos para você</b><ul>${R.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}`;
}
/** Texto do roteiro vindo do Claude: tempos, [CIRCULAR] destacado, avisos separados. */
function formata(txt){
  const [fala, avisos] = String(txt).split(/^AVISOS PARA O LUCCA\s*$/m);
  const linhas = fala.split('\n').filter(l => l.trim() && !/^ROTEIRO\s*$/.test(l.trim()) && !/^TESTE:/.test(l));
  const h = linhas.map(l => {
    const m = l.match(/^\s*\[(\d+-\d+ s)\]\s*(.*)$/);
    const corpoL = destaca(m ? m[2] : l).replace(/\[CIRCULAR:([^\]]*)\]/g, '<mark class="rot-c">circular:$1</mark>');
    return `<div class="rot-l"><span class="rot-t">${m ? esc(m[1]) : ''}</span><span class="rot-f">${corpoL}</span><span></span></div>`;
  }).join('');
  const av = (avisos || '').split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return `<div class="rot-txt">${h}</div>` + (av.length ? `<div class="rot-av"><b>Avisos do Claude</b><ul>${av.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '');
}
const dinheiro = v => v == null ? '' : 'US$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits:4, maximumFractionDigits:4 });
const quandoCurto = d => new Date(d).toLocaleString('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
function corpo(i){
  const b = B[i], r = b.roteiro;
  let h = `<div class="rot-h"><h3>Roteiro do react</h3><small>montado das suas regras; troque o bloco que não soar bem</small></div>`;
  h += b.est ? htmlEstoque(i) : `<p class="rot-vazio">${EST === null && b.estado === 'lendo' ? 'Montando o roteiro…' : 'Estoque de roteiros não carregou. Use o Claude abaixo.'}</p>`;
  if (b.est) h += `<div class="rot-acoes"><button type="button" class="rot-copiar" data-rot="${i}" data-de="estoque">Copiar roteiro</button></div>`;
  // Claude, opcional e barato (só nos testes que a edge gerar-roteiro já aceita)
  if (!CLAUDE_TESTES.has(b.teste)) return h + '<p class="rot-info">Ajustar com o Claude ainda não vale para este teste (falta a edge gerar-roteiro conhecer o teste). Use o roteiro do estoque.</p>';
  const ocupado = b.estado === 'gerando';
  h += `<details class="rot-aj"${r || b.erro || ocupado || b.aberto ? ' open' : ''}><summary>Ajustar com o Claude <small>opcional, caso fora do estoque · menos de 1 centavo</small></summary>
    <label class="rot-pedido"><span>O que mudar (opcional, sem nome nem telefone)</span><input type="text" maxlength="300" data-rot="${i}" value="${esc(b.pedido || '')}" placeholder="ex.: ela disse que a mancha apareceu depois da gravidez"></label>
    <div class="rot-acoes"><button type="button" class="rot-gerar sec" data-rot="${i}" ${ocupado ? 'disabled' : ''}>${ocupado ? 'Ajustando…' : r ? 'Ajustar de novo' : 'Ajustar com o Claude'}</button></div>`;
  if (ocupado) h += '<p class="rot-vazio rot-espera">O Claude está ajustando (uns 5 a 20 s)</p>';
  if (b.erro) h += `<p class="rot-erro" role="alert">${esc(b.erro)}</p>`;
  if (r){
    h += `<div class="rot-claude"><b>Versão do Claude</b>${formata(r.roteiro)}`;
    if (r.avisos?.length) h += `<div class="rot-conf"><b>Conferir antes de gravar</b><ul>${r.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>`;
    h += `<p class="rot-info">${esc(r.modelo || '')}${r.custo_usd != null ? ' · ' + esc(dinheiro(r.custo_usd)) : ''} · ${esc(quandoCurto(r.criado_em))}${r.palavras ? ` · ${r.palavras} palavras faladas` : ''}</p>
      <div class="rot-acoes"><button type="button" class="rot-copiar" data-rot="${i}" data-de="claude">Copiar versão do Claude</button></div></div>`;
  }
  if (USO) h += `<p class="rot-info">Hoje: ${USO.hoje} de ${USO.teto} ajustes pagos</p>`;
  return h + '</details>';
}
const redesenha = i => { const s = document.querySelector(`.rot[data-rot="${i}"]`); if (s) s.innerHTML = corpo(i); };
const redesenhaTodos = () => B.forEach((_, i) => redesenha(i));
const ERRO = { teto:'Chegou no teto de ajustes de hoje. Amanhã libera de novo.', recusa:'O Claude recusou este pedido. Use o roteiro do estoque.',
  ocupado:'A API está ocupada agora. Tente de novo em 1 minuto.', sem_chave:'A função está sem a chave da Anthropic.', grande:'Resultado grande demais para mandar.',
  vazio:'O Claude não devolveu texto. Tente de novo.', banco:'Não consegui gravar no banco. Tente de novo.' };
async function gerar(i){
  const b = B[i]; b.estado = 'gerando'; b.erro = ''; redesenha(i);
  try {
    const base = textoEstoque(b, '');   // vai com {nome}, nunca com o nome digitado
    const r = await post({ acao:'gerar', c:CODIGO, chave:b.chave, teste:b.teste, entrada:b.entrada, base, pedido:(b.pedido || '').trim(), novo:true });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404) throw new Error('Link sem acesso. Use o link do arquivo privado.');
    if (!j.ok) throw new Error(ERRO[j.erro] || `Não ajustou (${j.erro || r.status}).`);
    b.roteiro = j.roteiro;
    if (j.hoje != null) USO = { hoje:j.hoje, teto:j.teto };
  } catch (err) { b.erro = err.message || 'Sem conexão.'; }
  b.estado = ''; redesenhaTodos();
}
async function lerGravados(c){
  if (!B.length) return;
  try {
    const r = await post({ acao:'ler', c });
    const j = await r.json().catch(() => ({}));
    if (c !== CODIGO || !j.ok) return;
    USO = { hoje:j.hoje, teto:j.teto };
    for (const b of B){ const g = (j.roteiros || []).find(x => x.chave === b.chave); if (g) b.roteiro = g; }
    redesenhaTodos();
  } catch { /* sem conexão: segue com o estoque */ }
}
async function montarTodos(){
  B.forEach(b => { if (!b.est) b.estado = 'lendo'; }); redesenhaTodos();
  await carregaEstoque();
  B.forEach(b => { try { b.est = doEstoque(b.e); } catch (err) { console.error(err); b.est = null; } if (b.estado === 'lendo') b.estado = ''; });
  redesenhaTodos();
}
function copiar(btn){
  const i = +btn.dataset.rot, b = B[i]; if (!b) return;
  const txt = btn.dataset.de === 'claude' ? (b.roteiro?.roteiro || '').replace(/\{nome\}/g, nomeAtual() || '{nome}') : textoEstoque(b, nomeAtual());
  const volta = btn.textContent;
  const feito = m => { btn.textContent = m; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = volta; }, 1500); };
  try { navigator.clipboard.writeText(txt).then(() => feito('Copiado'), () => feito('Não copiou')); } catch { feito('Não copiou'); }
}
document.addEventListener('click', ev => {
  const cp = ev.target.closest('.rot-copiar'); if (cp){ copiar(cp); return; }
  const tr = ev.target.closest('.rot-trocar');
  if (tr){ const i = +tr.dataset.rot, b = B[i], bl = b?.est?.blocos[+tr.dataset.k]; if (!bl) return;
    b.vars[bl.id] = idx(b, bl) + 1; gravaVar(b.chave, b.vars); redesenha(i);
    document.querySelector(`.rot[data-rot="${i}"] .rot-trocar[data-k="${tr.dataset.k}"]`)?.focus(); return; }
  const g = ev.target.closest('.rot-gerar'); if (!g || g.disabled) return;
  gerar(+g.dataset.rot);
});
document.addEventListener('toggle', ev => { const d = ev.target; if (d.classList?.contains('rot-aj')){ const i = +d.closest('.rot')?.dataset.rot; if (B[i]) B[i].aberto = d.open; } }, true);
document.addEventListener('input', ev => {
  if (ev.target.matches('.rot-pedido input')){ const b = B[+ev.target.dataset.rot]; if (b) b.pedido = ev.target.value; return; }
  if (ev.target.classList.contains('kit-nome')) redesenhaTodos();   // o nome digitado entra no roteiro (só nesta tela)
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
        <figcaption>${x.descricao ? `<span>${esc(x.descricao)}</span>` : ''}<small>${esc(x.autor || 'autor não informado')} · ${esc(x.licenca)}${urlOk(x.fonte_url) ? ` · <a href="${esc(x.fonte_url)}" target="_blank" rel="noopener noreferrer">fonte</a>` : ''}${x.modificacao ? ` · ${esc(x.modificacao)}` : ''}</small></figcaption></figure>`).join('')}</div>
      <p class="par-nota">Imagens de terceiros, para comparar; não são da pessoa. Não mostrar no react sem conferir a licença.</p>`;
    el.hidden = false;
    el.querySelectorAll('img').forEach(im => im.addEventListener('error', () => { im.closest('figure')?.remove(); if (!el.querySelector('figure')) el.remove(); }));
  }
}

// Modo revisão da pele-idade: os passos são os blocos do roteiro montado, com a variação escolhida na tela.
const ROT_BLOCO = { abertura:'Abertura', idade:'Idade do rosto', bem:'O que está bem', 'habito-cigarro':'Cigarro', 'habito-sol':'Sol', 'habito-metabolico':'Pressão e glicose',
  'habito-sono':'Sono', 'habito-movimento':'Movimento', seguranca:'Frase de segurança', mecanismo:'Por que pesa', ponte:'Ponte', pergunta:'Pergunta', refazer:'Refazer a foto', 'refazer-pergunta':'Pergunta' };
function passosReact(e){
  const b = B.find(x => x.e === e);
  if (!b || !b.est || !b.est.blocos.length) return [{ bloco:'Foto', foto:'frente', tempo:'', tela:'Foto de frente inteira', fala:'', nota:'O roteiro do estoque não carregou: use o cartão.' }];
  return b.est.blocos.map(bl => ({ bloco:ROT_BLOCO[bl.id] || bl.id, foto:'frente', tempo:bl.tempo, tela:bl.circular ? 'Circular: ' + bl.circular : 'Foto de frente inteira',
    fala:bl.opcoes[idx(b, bl)], regiao:bl.regiao || null, nota:bl.fixo ? 'Frase fixa: não cortar.' : '' }));
}
/** Chamado pela Caixa depois de desenhar os cartões de um código. */
function depois(c){ CODIGO = c; montarTodos(); lerGravados(c); preencheParecidos(); }
/** Chamado pela Caixa antes de desenhar um código novo. */
function zerar(c){ B = []; CODIGO = c; USO = null; }

const css = document.createElement('style');
css.textContent = `.rot{margin-top:14px;padding-top:12px;border-top:2px solid var(--l);display:flex;flex-direction:column;gap:8px}
.rot-h h3{margin:0;font-size:1.05rem}.rot-h small{color:var(--m);font-size:.82rem}
.rot-txt{background:var(--bg);border:1px solid var(--l);border-radius:12px;padding:4px 10px;font-size:1rem;line-height:1.45}
.rot-meta{margin:0 0 6px;color:var(--m);font-size:.82rem}
.rot-l{display:grid;grid-template-columns:4.4em 1fr auto;gap:8px;align-items:start;padding:6px 0;border-bottom:1px solid var(--l)}
.rot-l:last-child{border-bottom:0}
.rot-l.fixo .rot-f{font-weight:600}
.rot-fix{color:var(--m);font-weight:500;font-size:.75rem}
.rot-trocar{background:var(--s);color:var(--a);border:1.5px solid var(--l);padding:6px 9px;font-size:.8rem;border-radius:9px;white-space:nowrap}
.rot-trocar small{color:var(--m);font-weight:500}
.rot-aj{border:1px solid var(--l);border-radius:12px;padding:8px 12px}
.rot-aj summary{cursor:pointer;font-weight:600;color:var(--a);font-size:.92rem}
.rot-aj summary small{color:var(--m);font-weight:500}
.rot-aj[open]{display:flex;flex-direction:column;gap:8px}
.rot-pedido{display:flex;flex-direction:column;gap:4px;font-size:.82rem;color:var(--m)}
.rot-pedido input{font:15px/1.4 system-ui;letter-spacing:0;text-transform:none;padding:9px 11px;border-radius:10px}
.rot-claude{display:flex;flex-direction:column;gap:6px;border-top:1px dashed var(--l);padding-top:8px}
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
/* tamanho natural (vários recortes têm 200 a 400 px): nunca estica; só encolhe se não couber (altura até 240 px) */
.par-lista{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}
.par-lista figure{margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:4px;flex:0 1 auto;max-width:100%}
.par-lista img{display:block;width:auto;height:auto;max-width:100%;max-height:240px;border-radius:8px;background:var(--bg)}
.par-lista figcaption{max-width:260px}
.par-lista figcaption{font-size:.78rem;line-height:1.3;display:flex;flex-direction:column;gap:2px}
.par-lista figcaption small{color:var(--m)}.par-lista a{color:var(--a)}
.par-nota{margin:6px 0 0;font-size:.75rem;color:var(--m)}`;
document.head.appendChild(css);

return { montar, bloco, parecido, depois, zerar, testeDe, doEstoque, passosReact, texto:i => B[i] ? textoEstoque(B[i], '') : '', _indice:() => INDICE, _estoque:() => EST };
})();
