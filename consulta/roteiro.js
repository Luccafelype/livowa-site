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
  espelho:['Quando você se olha no espelho, o que mais te incomoda hoje?', { cansada:'Cara de cansada(o), mesmo quando eu durmo', caindo:'O rosto caindo: bochecha, bigode chinês', pescoco:'O pescoço e a papada', palpebra:'A pálpebra pesando', manchas:'Manchas e rugas', nada:'Nada em especial: quero saber a idade que o rosto mostra', velho:'Pareço mais velha(o) do que sou', outro:'Outro' }],
  espelho_texto:['Em poucas palavras, o que te incomoda?', null],   // 11/11: o texto do “Outro”
  cigarro:['Você fuma ou já fumou?', { nunca:'Nunca fumei', parou:'Já fumei e parei', parou_mais10:'Parei há mais de 10 anos', parou_menos10:'Parei há menos de 10 anos', as_vezes:'Fumo ou uso vape às vezes', hoje:'Fumo hoje / todo dia' }],
  sol:['Quanto sol o rosto pega (sem protetor)', { quase_nenhum:'Quase nenhum', fds:'Um pouco, ou só no fim de semana', todo_dia:'Quase todo dia' }],
  metabolico:['Já te disseram que a pressão ou a glicose estava alta?', { nao_medi:'Não, e medi no último ano', nunca:'Nunca medi ou não lembro', pressao:'Sim, a pressão', glicose:'Sim, a glicose', ambas:'Sim, as duas' }],
  movimento:['Quanto se mexe numa semana comum', { quase_nada:'Quase nada', ate2:'Até 2 horas', '2a5':'De 2 a 5 horas', mais5:'Mais de 5 horas' }],
  sono:['Como são as noites', { bem:'Durmo 7 horas ou mais e acordo bem', '6h':'Durmo umas 6 horas', curto:'Durmo 5 horas ou menos', cansado:'Durmo, mas acordo cansada(o)' }],
  futuro:['Daqui a 10 anos, o que mais quer', { disposicao:'Ter a mesma disposição de hoje', parecer:'Parecer a idade que eu sinto', chegar10:'Chegar aos (idade + 10) com força e memória', antes:'Cuidar da saúde antes de aparecer problema', reconhecer:'Me reconhecer no espelho', independente:'Não depender de ninguém', aos70:'Chegar bem aos 70, com força e memória', entender:'Entender o que o meu corpo já está mostrando', cuidar:'Cuidar agora, antes que apareça', devagar:'Envelhecer mais devagar' }],
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
    sexo:SEXO[d.respostas?.sexo || d.sexo] || undefined,   // 12/11: concordância (cansada/cansado)
    desejo_de_10_anos:c?.vars?.futuro || undefined, incomodo_no_espelho:c?.vars?.espelho || undefined,
    regiao_do_incomodo_que_a_pagina_mostrou:d.espelho_regiao ? NOME_SIN_PI[d.espelho_regiao] || d.espelho_regiao : undefined,
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
const CLAUDE_TESTES = new Set(['pele', 'pele2', 'pernas', 'braco', 'quiz-longevidade', 'quiz-emagrecimento', 'pele-idade']);   // 12/11: pele-idade
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
  const [est, imp] = await Promise.all([
    fetch('roteiros-estoque.json?v=20261113z', { cache:'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch('o-que-importa-idade.json?v=20261113', { cache:'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null)]);
  EST = est; IMP = imp;   // 13/11: o bloco 5 ("o que conserva na idade") sai do mesmo arquivo do cartão do gravador
  if (EST) estoqueEditavel(EST);
  return EST;
}
// 13/11 (regra do Lucca: toda frase que o CRM mostra ou copia é editável nos Ajustes): cada frase do estoque vira uma chave
// (e_<teste>_<caminho>) no teste dono; a fonte ('f') e as notas ('_sobre') ficam de fora. 'comum' vale para todos (geral).
const DONO_EST = { comum:['cm', ''], pele:['pl', 'pele'], pernas:['pe', 'teste-pernas'], braco:['br', 'teste-braco'],
  'quiz-emagrecimento':['qe', 'teste-emagrecimento'], 'quiz-longevidade':['ql', 'quiz-longevidade'], 'pele-idade':['pi', 'pele-idade'] };
function estoqueEditavel(e){
  const reg = window.KITS?.editavel; if (!reg) return;
  const rot = p => p.map(x => /^\d+$/.test(x) ? 'variação ' + (+x + 1) : x.replace(/_/g, ' ')).join(' › ');
  for (const [t, [ab, dono]] of Object.entries(DONO_EST)){
    const anda = (o, p) => { for (const [c, v] of Object.entries(o)){ if (c === 'f' || c.startsWith('_')) continue;
      const q = [...p, c];
      if (typeof v === 'string') reg(o, c, 'e_' + ab + '_' + q.join('_'), dono, 'Roteiro do react · ' + q[0].replace(/_/g, ' '), rot(q.slice(1)) || q[0]);
      else if (v && typeof v === 'object') anda(v, q); } };
    if (e[t]) anda(e[t], []);
  }
  window.dispatchEvent(new Event('kits-textos'));   // a aba Ajustes redesenha com as frases do estoque
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
// ---------- 13/11 (d-20261113-narrativa-analise-todas-iscas): UMA narrativa em 6 blocos para todos os testes ----------
// abertura · o resultado ao lado da referência da idade · o que está conservado e onde aparece · o que pesa · o que conserva
// na idade · desejo e pergunta de interesse. Muda só o que entra nas lacunas (video-analise-duracao-roteiro.md, 3A e 3B).
// Bloco sem dado fica de fora (não se inventa). Alvo: pele e emagrecimento 60-75 s; braço, pernas e longevidade 45-60 s.
const T6 = ['0-6 s', '6-16 s', '16-34 s', '34-48 s', '48-58 s', '58-72 s'], T6C = ['0-6 s', '6-16 s', '16-28 s', '28-38 s', '38-46 s', '46-60 s'];
let IMP = null;   // o-que-importa-idade.json (o mesmo do cartão "O que conserva" do gravador)
const FX_IMP = n => n <= 34 ? 'ate34' : n <= 49 ? '35a49' : n <= 64 ? '50a64' : '65mais';
const MOV_RE = /músculo|força/i;   // braço, pernas e longevidade: o item de músculo ou força, quando a faixa tem
// o item depois de "… o que mais conserva a sua saúde é": os que não cabem nessa frase, na ordem que cabe
const falaItem = t => !t ? t : t.replace(/^na menopausa, (.+)$/i, '$1, na menopausa').replace(/^perimenopausa: acompanhar as mudanças com calma$/i, 'acompanhar com calma as mudanças da perimenopausa');
const FORA_PELE = /músculo|força|pressão|glicose|sono/i;   // PROMPT-NARRATIVA: fora da pele, isso antes do protetor solar
/** O item da faixa e do sexo: o 1º que casa com pref (músculo/força nos testes de movimento; fora da pele, nada de protetor
    antes); sem sexo, só os comuns aos dois. Dorme mal a partir dos 35: o sono vai na frente (condicionais do arquivo). */
function itemImporta(fx, sexo, pref, o = {}){
  const L = IMP && IMP.idade && IMP.idade[fx]; if (!L) return null;
  const min = t => t ? t[0].toLowerCase() + t.slice(1) : null;
  if (o.dormeMal && fx !== 'ate34' && IMP.condicionais?.sono?.t) return min(IMP.condicionais.sono.t);
  const ts = s => (L[s] || []).map(x => x.t);
  const lista = sexo === 'f' || sexo === 'm' ? ts(sexo) : ts('f').filter(t => ts('m').includes(t));
  return falaItem(min((pref && lista.find(t => pref.test(t))) || (o.foraPele && lista.find(t => FORA_PELE.test(t))) || lista[0]));
}
/** Um bloco feito de frases (cada uma com as suas variações): as variações do bloco combinam as frases 1 a 1.
    Frase sem dado (alguma {chave} vazia) sai do bloco; bloco sem nenhuma frase sai do roteiro. */
function bloco6(id, tempo, partes, V, o = {}){
  const ls = partes.filter(Boolean).map(p => (Array.isArray(p) ? p : [p]).map(t => preenche(t, V)).filter(Boolean)).filter(l => l.length);
  if (!ls.length) return null;
  const n = Math.max(...ls.map(l => l.length));
  const opc = [...new Set(Array.from({ length:n }, (_, k) => ls.map(l => l[k % l.length]).join(' ')))];
  return { id, tempo, opcoes:opc, circular:o.circular || null, fonte:o.f || '', fixo:!!o.fixo, regiao:o.regiao || null };
}
/** Bloco 6: o desejo (se ela disse), "{o que o teste mostra} é uma parte", o rótulo do bloco 1 e a pergunta de interesse. */
/** Passou do alvo (150 palavras por minuto, média das variações, fora dos colchetes): troca o bloco pela versão menor, na
    ordem dada: o 2º item de um bloco (2º achado ou 2º hábito), o "acompanha", o exemplo. Nunca some um bloco: corte sem
    versão menor (null) não vale. Ainda acima do alvo: fica assim (o gravador corta só aos 105 s). */
const palavrasE = t => String(t).replace(/\[[A-Z]+:[^\]]*\]/g, '').split(/\s+/).filter(Boolean).length;
function cabe(out, maxS, cortes){
  const n = () => out.filter(Boolean).reduce((s, b) => s + b.opcoes.reduce((t, o) => t + palavrasE(o), 0) / b.opcoes.length, 0);
  for (const [id, bl] of cortes){
    if (n() / 2.5 <= maxS) return;
    const k = out.findIndex(b => b && b.id === id);
    if (k >= 0 && bl) out[k] = bl;
  }
}
const semExemplo = (N, V, T) => V.ex_id ? importa6(N, { ...V, ex_id:null }, T) : null;
// ---------- o exemplo por imagem (13/11, d-20261113-exemplos-por-imagem) ----------
// O catálogo vem da edge (consultar-codigo, ação "exemplos": id, testes, liga, idade, fala; nunca a imagem). Sem ele, sem exemplo.
let EXE = null;
const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// o que o lead tem, nas palavras do campo "liga" do kit
const LIGA_SINAL = { manchas:['manchas'], linhas_testa:['rugas'], olhos:['olhos', 'olheira'], sulco_nasolabial:['sulco'], flacidez:['flacidez', 'contorno'], textura_poros:[] };
const LIGA_QUEIXA = { manchas:['manchas'], rugas:['rugas'], olheiras:['olheira', 'olhos'], acne:[], cravos:[], oleosidade:[], poros:[], ressecamento:[], textura:[] };
const LIGA_EMAG = { volta:['peso'], vontade:['peso'], balanca:['peso', 'barriga'], constancia:['peso'], comeco:['peso'] };
const LIGA_LONG = { cansaco:['fôlego', 'exercício'], peso:['barriga'], dor:[], exame:[], forca:['força', 'exercício'], nada:['longevidade'] };
/** A imagem do teste que mais liga ao que ela tem (o "principal" desempata). Na pele, só se ligar a algo dela. */
function escolheExemplo(teste, termos, idade, exigeLiga){
  if (!Array.isArray(EXE) || !EXE.length) return null;
  const tm = new Set((termos || []).map(semAcento));
  const cand = EXE.filter(x => x && x.id && (!x.testes || !x.testes.length || x.testes.includes(teste)))
    .map((x, i) => ({ x, i, nota:(x.liga || []).filter(l => tm.has(semAcento(l))).length + (x.papel === 'principal' ? .5 : 0) }))
    .filter(c => !exigeLiga || c.nota >= 1).sort((a, b) => b.nota - a.nota || a.i - b.i);
  const ex = cand[0] && cand[0].x; if (!ex || !ex.fala) return null;
  const m = String(ex.idade || '').match(/(\d+)(?:\D+(\d+))?/), perto = m && idade != null && idade >= +m[1] && idade <= +(m[2] || m[1]);   // "18-31" ou "57"
  const fala = String(ex.fala).trim().replace(/[.\s]+$/, '');
  return { ex_id:ex.id, ex_fala:/^[A-ZÀ-Ú](?![A-ZÀ-Ú])/.test(fala) ? fala[0].toLowerCase() + fala.slice(1) : fala, ex_perto:!!perto };
}
const interesse6 = (N, V, T, desejo, f) => bloco6('interesse', T[5], [desejo, N.parte, N.trabalhar, N.interesse], V, { f:(f ? f + ' · ' : '') + N.f });
const importa6 = (N, V, T) => { if (!V.item){ V = { ...V, item:itemImporta('ate34', null, MOV_RE), geral:true }; } return bloco6('importa', T[4], [V.geral ? N.importa_geral : V.idade ? N.importa_idade : N.importa_faixa,
  V.ex_id ? (V.ex_perto ? N.exemplo_idade : N.exemplo).map(t => `[IMAGEM: ${V.ex_id}] ` + t) : null], V,
  { f:'o-que-importa-idade.json (idade e sexo; sem idade, o item de qualquer idade); fora da pele, só o item' + (V.ex_id ? '; o exemplo é a imagem ' + V.ex_id + ' do kit' : '') }); };

function rotPele(d, t, c, E){
  const P = E.pele, C = E.comum, N = C.narrativa, p2 = t === 'pele2', V = {}, out = [], avisos = [];
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
  Object.assign(V, { rotulo_curto:V.queixa, mostra:P.mostra });
  const idade = Number(d.idade ?? resp.idade);
  V.idade = isFinite(idade) && idade > 0 ? String(idade) : null;
  const principal = qs.map(q => com.find(s => s.id === q[1])).find(Boolean) || [...com].sort((a, b) => b.grau - a.grau)[0];
  const ordem = principal ? [principal, ...com.filter(s => s !== principal).sort((a, b) => b.grau - a.grau)] : [];
  // 1 · abertura: o que ela marcou, nas palavras dela
  out.push(bloco6('abertura', T6[0], [N.abertura, V.queixa ? P.contou : null], V, { f:N.f, circular:V.queixa ? 'a resposta "o que incomoda" na tela' : null }));
  // 2 · a idade aparente (pele2) ou a faixa (pele antiga), só quando a regra do kit deixa
  const mF = String(d.faixa || '').match(/(\d+)\D+(\d+)/), aparente = c?.idadeFaixa?.aparente;
  const temFaixa = !!(c?.idadeFaixa?.dizer && mF);
  if (temFaixa) out.push(bloco6('resultado', T6[1], [aparente ? P.idade_aparente.texto : P.faixa_idade.texto], { ...V, min:mF[1], max:mF[2] },
    { f:(aparente ? P.idade_aparente : P.faixa_idade).f, circular:aparente ? 'a idade aparente no topo do resultado' : 'a faixa de idade na tela' }));
  else if (d.faixa) avisos.push('Faixa de idade fora do vídeo: ' + (c?.idadeFaixa?.txt || 'regra do kit.'));
  // 3 · o que está conservado, onde aparece mais (até 2 achados) e o mecanismo do principal
  const bem = sin.filter(s => s.grau === 0 && P.achados[s.id]).map(s => P.achados[s.id].nome);
  V.bem = bem.length ? listaE(bem.slice(0, 2)) : null;
  const achados = ordem.slice(0, 2).map(s => {
    const A = P.achados[s.id], W = { ...V, onde:A.onde_fixo || listaE(s.regioes.map(r => REG_ACNE_TXT[Object.keys(REG_ACNE).find(k => REG_ACNE[k] === r)] || r)) || 'no rosto' };
    return (s.grau >= 2 ? A.forte : A.leve).map(x => preenche(x, W)).filter(Boolean).map(x => s.id === 'cicatriz_acne' && s.tipo === 'marca de cor' && A.cor ? x + ' ' + A.cor : x);
  });
  if (ordem.length > 2) avisos.push('Também apareceram (fora do vídeo, para 1 ideia só): ' + ordem.slice(2).map(s => P.achados[s.id].nome).join(', ') + '.');
  const seg = com.some(s => s.id === 'manchas' && s.grau >= 2) ? C.seguranca.pele : null;
  const s0 = ordem[0], mec = principal ? P.achados[principal.id].mecanismo : null;
  // sem a faixa, a âncora do bloco 2 é o achado principal (PROMPT-NARRATIVA); sem achado, "sem número"
  if (!temFaixa) out.push(bloco6('resultado', T6[1], [achados.length ? achados[0] : P.sem_numero], V, { f:P.bem.f, circular:s0 ? `${s0.foto}, ${REG_CURTA[s0.id] || 'rosto'}` : null }));
  const ach3 = temFaixa ? achados : achados.slice(1);
  const b3 = (as, m) => bloco6('conserva', T6[2], [V.bem ? P.bem.com_lista : P.bem.sem_lista, ...as, m, seg], V,
    { f:P.bem.f, circular:s0 ? `${s0.foto}, ${REG_CURTA[s0.id] || s0.regioes.join(' e ') || 'rosto'}` : null });
  out.push(b3(ach3, mec));
  // 4 · o que pesa: a pele não pergunta hábito (fica de fora)
  // 5 · o que conserva na idade dela
  V.item = V.idade ? itemImporta(FX_IMP(+V.idade), resp.sexo, null) : null;
  Object.assign(V, escolheExemplo(t, [...String(resp.incomoda || '').split('+').flatMap(q => LIGA_QUEIXA[q] || []), ...(principal ? LIGA_SINAL[principal.id] || [] : [])], V.idade ? +V.idade : null, true) || {});
  out.push(importa6(N, V, T6));
  // 6 · desejo e pergunta de interesse (a pele não pergunta o desejo de 10 anos)
  out.push(interesse6(N, V, T6, null));
  if (['gravida', 'amamentando', 'tentando'].includes(resp.seguranca)) avisos.push(`Ela marcou "${P2.seguranca[1][resp.seguranca]}": nada de produto, remédio ou procedimento, nem por escrito.`);
  if (['sensivel', 'reacao'].includes(resp.alergia)) avisos.push(`Alergia: "${P2.alergia[1][resp.alergia]}". Nada de nome de produto.`);
  cabe(out, 75, [['conserva', ach3.length > 1 ? b3(ach3.slice(0, 1), mec) : null], ['conserva', mec ? b3(ach3.slice(0, 1), null) : null], ['importa', semExemplo(N, V, T6)]]);
  if (c?.notaAcne) avisos.push(c.notaAcne);
  if (!principal) avisos.push('Nenhum achado com grau 1 ou mais: o vídeo pode ficar curto.');
  return { blocos:out.filter(Boolean), avisos, rotulo:V.queixa };
}
// Pele: idade e vitalidade (04/11). Ordem: abertura com o "daqui a 10 anos" → a idade do rosto ao lado da idade real →
// o que está bem → até 2 hábitos que pesam (o 1º com o sinal da foto, quando houver) → o mecanismo do 1º (o único número
// de estudo) → ponte → pergunta. Sem produto, rotina ou programa (regras 4, 5 e 23).
const ORDEM_HAB = ['cigarro', 'sol', 'metabolico', 'sono', 'movimento'];   // a mesma prioridade da página (pele/app.js)
const ATENCAO_PI = { cigarro:['hoje', 'as_vezes', 'parou', 'parou_menos10', 'parou_mais10'], sol:['todo_dia', 'fds'], metabolico:['pressao', 'glicose', 'ambas', 'nunca'], sono:['curto', 'cansado'], movimento:['quase_nada', 'ate2'] };
const FOTO_HAB = { cigarro:['sulco_nasolabial', 'flacidez', 'olhos'], sol:['manchas', 'linhas_testa'], sono:['olhos'] };
const ZONA_SIN = { linhas_testa:['testa'], olhos:['olhos_canto'], sulco_nasolabial:['sulco'], manchas:['bochecha'], flacidez:['mandibula'] };
const REG_PI = { linhas_testa:'testa', olhos:'canto dos olhos', sulco_nasolabial:'do nariz à boca', manchas:'bochechas', flacidez:'contorno do rosto' };
// 13/11: os 6 blocos do PROMPT-PELE-IDADE v3 (regras-ajuste-pele-idade.md): abertura · idade do rosto · foto (o conservado e
// onde a foto mostra mais) · por dentro (até 2 hábitos) · o que conserva aos {idade} (com o exemplo por imagem) · desejo e
// pergunta. Nenhum estudo falado; nada de "melhorar", "mais novo" ou "rejuvenescer". 150 a 185 palavras (60 a 75 s).
const DOR_PI_R = { cansada:['olhos', 'olheira'], caindo:['sulco_nasolabial', 'flacidez'], pescoco:['flacidez', 'papada'], palpebra:['olhos'], manchas:['manchas', 'linhas_testa', 'glabela', 'olhos'] };
const LIGA_ESPELHO = { cansada:['cansada', 'sono', 'olheira', 'olhos'], caindo:['caindo', 'sulco', 'flacidez', 'contorno'], pescoco:['papada', 'pescoco', 'flacidez'],
  palpebra:['palpebra', 'olhos'], manchas:['manchas', 'rugas', 'sol'] };
const ORDEM_DENTRO = ['metabolico', 'cigarro', 'sono', 'sol', 'movimento'];   // pressão ou glicose alta > fuma > sono > sol > movimento
const ALTO_PI = ['pressao', 'glicose', 'ambas'];
const PESA_PI = { metabolico:ALTO_PI, cigarro:['hoje', 'as_vezes'], sono:['curto', 'cansado'], sol:['todo_dia', 'fds'], movimento:['quase_nada', 'ate2'] };
const nomeSinal = id => (IMP && IMP.rotulos && IMP.rotulos[id] && IMP.rotulos[id].faixa) || REG_PI[id] || id;   // o nome da lupa
function rotPeleIdade(d, c, E){
  const P = E['pele-idade'], C = E.comum, N = C.narrativa, r = d.respostas || {}, out = [], avisos = [];
  if (!P) return { blocos:[], avisos:['O estoque não tem o bloco pele-idade.'] };
  if (c?.refazer){
    const V = { motivo:E.pele.refazer.motivo[d.qualidade === 'ruim' ? 'ruim' : 'padrao'] };
    out.push(blocoE('refazer', TEMPO[0] + ' a ' + TEMPO[2].split('-')[1], E.pele.refazer.texto, V, { f:E.pele.refazer.f }));
    out.push(blocoE('refazer-pergunta', TEMPO[4], C.refazer_pergunta, V, { f:E.pele.refazer.f, fixo:true }));
    avisos.push('Foto duvidosa: ' + (c.motivo || '') + ' Nenhum número nem sinal no vídeo (regra 16). Atalho /pirefazer (livowa.com/pele).');
    return { blocos:out.filter(Boolean), avisos };
  }
  const mF = String(d.faixa || '').match(/(\d+)\D+(\d+)/), idade = d.idade ?? r.idade;
  const iN = idade != null && idade !== '' && !isNaN(+idade) ? +idade : null;
  const V = { futuro:c?.vars?.futuro || window.KITS?.['pele-idade']?.futuro?.[r.futuro] || null, idade:iN != null ? String(iN) : null, min:mF ? mF[1] : null, max:mF ? mF[2] : null,
    espelho:c?.vars?.espelho || null, resposta:RESP[CODIGO] || null };
  // 1 · abertura: a resposta ao áudio (se ele colou no passo 2); senão, o incômodo do espelho nas palavras dela
  out.push(bloco6('abertura', '0-6 s', [P.abertura.texto, V.resposta ? P.abertura.com_resposta : V.espelho ? P.abertura.com_espelho : null], V,
    { f:P.abertura.f, circular:V.resposta ? null : V.espelho ? 'a resposta "o que mais incomoda no espelho" na tela' : null }));
  // 2 · a idade do rosto pela FAIXA (dentro = na sua idade; abaixo do mínimo = mostra um pouco mais; acima do máximo = mostra
  // menos); mais de 5 anos acima: sem número; sem análise: sem número
  const caso = c?.caso || 'sem_numero', dizer = !!(c?.idadeFaixa?.dizer && mF);
  const lido = caso === 'sem_numero' || !mF || iN == null ? caso : iN < +mF[1] ? 'mais_velho' : iN > +mF[2] ? 'mais_novo' : 'igual';
  const chave = d.sem_analise ? 'sem_foto' : lido === 'sem_numero' ? 'sem_numero' : lido === 'mais_velho' && !dizer ? 'mais_velho_sem_numero' : lido;
  out.push(bloco6('idade', '6-16 s', [P.idade[chave]], V, { f:P.idade.f, circular:dizer && !d.sem_analise ? 'a régua: a faixa do rosto e a sua idade' : null }));
  if (d.sem_analise) avisos.push('A análise automática não rodou (limite do dia): não há foto nem número. Peça a foto no WhatsApp; este roteiro usa só as respostas.');
  if (c?.idadeFaixa && !c.idadeFaixa.dizer) avisos.push(c.idadeFaixa.txt);
  // 3 · foto: o conservado antes; a região do incômodo primeiro (pouco = alívio); depois, onde a foto mostra mais
  const comFoto = !!mF && !d.sem_analise;   // a página só mostrou sinais quando mostrou número
  const sin = comFoto ? Object.fromEntries((d.sinais || []).filter(s => P.foto.sinal[s.id] && s.visivel !== false && s.nivel != null).map(s => [s.id, Math.max(0, Math.min(3, Math.round(+s.nivel) || 0))])) : {};
  const fr = id => P.foto.sinal[id][sin[id]];
  const dor = (DOR_PI_R[r.espelho] || []).filter(id => sin[id] != null).sort((a, b) => sin[b] - sin[a])[0] || null;
  const bonsResp = [r.cigarro === 'nunca' && P.bem.itens.cigarro, r.sol === 'quase_nenhum' && P.bem.itens.sol, r.metabolico === 'nao_medi' && P.bem.itens.metabolico,
    r.sono === 'bem' && P.bem.itens.sono, ['2a5', 'mais5'].includes(r.movimento) && P.bem.itens['movimento_' + r.movimento]].filter(Boolean);
  const lisos = Object.keys(sin).filter(id => sin[id] === 0 && id !== dor).map(fr);
  const bem3 = lisos.length ? lisos.slice(0, 2) : bonsResp.slice(0, 2), bemUsadoResp = !lisos.length && bonsResp.length > 0;
  const fortes = Object.keys(sin).filter(id => sin[id] >= 2 && id !== dor).sort((a, b) => sin[b] - sin[a]);
  const ach = [];   // [frase, id]
  if (dor) ach.push([sin[dor] <= 1 ? P.foto.alivio : P.foto.mais, dor]);
  else { const top = Object.keys(sin).filter(id => sin[id] >= 1).sort((a, b) => sin[b] - sin[a])[0]; if (top) ach.push([P.foto.mais, top]); }
  const seg2 = fortes.find(id => !ach.some(a => a[1] === id));
  if (seg2) ach.push([P.foto.tambem, seg2]);
  const seg = comFoto && (sin.manchas || 0) >= 2 ? C.seguranca.pele : null;   // nunca se corta
  const b3 = as => {
    const partes = [bem3.length ? P.foto.conservado : null, ...as.map(([t, id]) => t.map(x => preenche(x, { achado:fr(id) })))];
    if (!partes.some(Boolean)) partes.push(P.foto.sem_nada);
    const b = bloco6('foto', '16-34 s', [...partes, seg], { ...V, bem:listaE(bem3) }, { f:P.foto.f, circular:as.length ? 'foto de frente, ' + as.map(a => nomeSinal(a[1]).toLowerCase()).join(' e ') : null });
    if (b){ b.aponte = as.map(a => nomeSinal(a[1])); b.regiao = as.length ? ZONA_SIN[as[0][1]] || null : null; }
    return b;
  };
  out.push(b3(ach));
  // 4 · por dentro: até 2 hábitos que pesam; nenhum, a coisa a favor que ainda não foi dita
  const fem = r.sexo === 'f' ? 'cansado_f' : r.sexo === 'm' ? 'cansado_m' : 'cansado';
  const hab = ORDEM_DENTRO.filter(k => (PESA_PI[k] || []).includes(r[k]));   // só o que ela tem ("nunca fumou" e "parou" ficam de fora)
  const fh = k => P.dentro.frase[k][k === 'sono' && r.sono === 'cansado' ? fem : r[k]];
  const b4 = hs => hs.length ? bloco6('dentro', '34-48 s', [hs.length > 1 ? P.dentro.dois : P.dentro.um, hs.some(k => k === 'metabolico' && ALTO_PI.includes(r.metabolico)) ? P.dentro.exame : null],
      { ...V, h1:fh(hs[0]), h2:hs[1] ? fh(hs[1]) : null }, { f:P.dentro.f, circular:'as respostas na tela' })
    : !bemUsadoResp && bonsResp.length ? bloco6('dentro', '34-48 s', [P.dentro.a_favor, bonsResp[1] ? P.dentro.a_favor_2 : null], { ...V, b1:bonsResp[0], b2:bonsResp[1] || null }, { f:P.dentro.f }) : null;
  out.push(b4(hab.slice(0, 2)));
  if (hab.length > 2) avisos.push('Também pesam (fora do vídeo, uma ideia só): ' + hab.slice(2).map(fh).join('; ') + '.');
  // 5 · o que conserva aos {idade}: cigarro e sono ruim marcados na frente; o exemplo é a imagem do kit
  const fx = iN != null ? FX_IMP(iN) : null;
  V.item = ['hoje', 'as_vezes'].includes(r.cigarro) && IMP?.condicionais?.cigarro ? IMP.condicionais.cigarro.t[0].toLowerCase() + IMP.condicionais.cigarro.t.slice(1)
    : fx && fx !== 'ate34' && ['curto', 'cansado'].includes(r.sono) && IMP?.condicionais?.sono ? IMP.condicionais.sono.t[0].toLowerCase() + IMP.condicionais.sono.t.slice(1)
    : fx ? itemImporta(fx, r.sexo, r.espelho === 'manchas' ? /protetor/i : null) : null;
  if (!V.item) V.item = itemImporta('ate34', null, MOV_RE);
  Object.assign(V, escolheExemplo('pele-idade', [...(LIGA_ESPELHO[r.espelho] || []), ...ach.flatMap(a => LIGA_SINAL[a[1]] || [a[1]])], iN, true) || {});
  const b5 = W => bloco6('importa', '48-58 s', [W.idade ? P.importa.texto : P.importa.sem_idade, W.ex_id ? (W.ex_perto ? N.exemplo_idade : N.exemplo).map(t => `[IMAGEM: ${W.ex_id}] ` + t) : null], W,
    { f:P.importa.f + (W.ex_id ? '; o exemplo é a imagem ' + W.ex_id + ' do kit' : '') });
  out.push(b5(V));
  // 6 · desejo e pergunta: o desejo uma vez, o rótulo do incômodo volta, a pergunta de interesse
  const trab = !V.espelho ? P.interesse.trabalhar_sem : / e /.test(V.espelho) ? P.interesse.trabalhar.map(t => t.replace('{espelho} e ', '{espelho}, e ')) : P.interesse.trabalhar;   // sem "… e … e" colado
  out.push(bloco6('interesse', '58-72 s', [V.futuro ? P.interesse.desejo : null, P.interesse.parte, trab, N.interesse], V,
    { f:P.interesse.f }));
  // passou de 75 s: o 2º achado, o 2º hábito, o exemplo (regra 7); a segurança e a pergunta nunca saem
  cabe(out, 75, [['foto', ach.length > 1 ? b3(ach.slice(0, 1)) : null], ['dentro', hab.length > 1 ? b4(hab.slice(0, 1)) : null], ['importa', V.ex_id ? b5({ ...V, ex_id:null }) : null]]);
  if (ALTO_PI.includes(r.metabolico)) avisos.push(`Por escrito depois: "${{ pressao:'A pressão alta vale', glicose:'A glicose alta vale', ambas:'A pressão e a glicose altas valem' }[r.metabolico]} olhar com exame, com calma." (sem nome de doença nem de remédio)`);
  if (seg) avisos.push('Manchas visíveis: a frase de segurança está no bloco da foto e vai também por escrito.');
  if (r.cigarro === 'hoje') avisos.push('Fuma hoje: tom de alívio e explicação, sem cobrança (regra 22).');
  if (caso === 'sem_numero' && !c?.refazer) avisos.push('A página não mostrou número. Se ela quiser o número, mande o atalho /pirefazer.');
  avisos.push('Não é análise de pele: nada de produto, rotina, procedimento ou programa no vídeo (regras 4, 5 e 23).');
  return { blocos:out.filter(Boolean), avisos, rotulo:V.resposta || V.espelho || null };
}
function rotMov(t, d, c, E){
  const M = E[t], C = E.comum, N = C.narrativa, out = [], avisos = [], V = {};
  const m = c?.medida || {};
  if (t === 'pernas') Object.assign(V, { tempo:n1(d.t), pc:d.pc != null ? String(d.pc) : null, faixa_idade:d.faixa || null });
  else Object.assign(V, { roscas:m.roscas != null ? String(m.roscas) : null, idade_m:m.idadeM != null ? m.idadeM + ' anos' : m.v >= m.VREF ? 'até 50 anos' : m.v >= m.PRE ? 'acima de 76 anos, ainda robusto' : null });   // 3B: no vídeo, nunca "frágil"
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
  const idade = d.idade != null && d.idade !== '' && !isNaN(+d.idade) ? +d.idade : null, f = c?.faixa;
  // o rótulo: a resposta dela ao áudio de antes (colada no passo 2); sem ela, o do teste. No bloco 6 volta o do teste.
  Object.assign(V, { idade:idade != null ? String(idade) : null, resposta:RESP[CODIGO] || null, mostra:M.mostra, rotulo_curto:M.rotulo, conserva:M.conservado });
  // 1 · abertura
  out.push(bloco6('abertura', T6C[0], [N.abertura, V.resposta ? N.contou_resposta : N.quis], { ...V, rotulo:V.resposta || M.rotulo }, { f:N.f }));
  // 2 · o número dela ao lado da idade real; faixa 4 leva a frase de segurança (não se corta)
  if (f) out.push(bloco6('resultado', T6C[1], [M.resultado[f], t === 'pernas' && f < 4 ? M.parecida : null, f === 4 ? C.seguranca.movimento : null], V,
    { f:M.resultado.f, circular:t === 'pernas' ? 'o tempo das 5 levantadas e o percentil' : 'as roscas em 10 s e a idade muscular' }));
  // 3 · o que está conservado (faixa 1 no braço; 1 e 2 nas pernas) e o mecanismo (o "acompanha")
  const conservado = f === 1 || (f === 2 && (t === 'pernas' || M.conservado_2));
  out.push(bloco6('conserva', T6C[2], [conservado ? N.conservado : null, M.mecanismo.texto], { ...V, conserva:f === 2 && M.conservado_2 ? M.conservado_2 : M.conservado }, { f:M.mecanismo.f }));
  // 4 · o que pesa: o teste não pergunta hábito (fica de fora)
  // 5 · o que conserva na idade dela (o item de músculo ou força)
  V.item = idade != null ? itemImporta(FX_IMP(idade), d.sexo, MOV_RE) : null;
  Object.assign(V, escolheExemplo(t, ['força', 'músculo', 'potência', ...(t === 'pernas' ? ['pernas', 'cadeira'] : [])], idade, false) || {});
  out.push(importa6(N, V, T6C));
  // 6 · sem desejo (o teste não pergunta): "{o braço / as pernas} é uma parte…" e a pergunta de interesse
  out.push(interesse6(N, V, T6C, null));
  cabe(out, 60, [['conserva', conservado ? bloco6('conserva', T6C[2], [N.conservado], { ...V, conserva:f === 2 && M.conservado_2 ? M.conservado_2 : M.conservado }, { f:M.mecanismo.f }) : null],
    ['importa', semExemplo(N, V, T6C)]]);   // sem o conservado, o "acompanha" é o bloco 3 inteiro: fica
  if (c?.simples) avisos.push('Leitura do kit: ' + c.simples);
  if (f === 4) avisos.push('Faixa 4: fale com ela também por escrito (regra 17).');
  if (!V.resposta) avisos.push('Sem a resposta dela ao áudio: a abertura usa o rótulo do teste. Cole a resposta no campo do passo 2 para abrir com as palavras dela.');
  return { blocos:out.filter(Boolean), avisos, rotulo:V.resposta || M.rotulo };
}
// emagrecimento: idade do teste em faixas (18a29…60mais) → a faixa do arquivo "o que importa"
const FX_EMAG = { '18a29':'ate34', '30a39':'35a49', '40a49':'35a49', '50a59':'50a64', '60mais':'50a64' };
function rotEmag(d, E){
  const Q = E['quiz-emagrecimento'], C = E.comum, N = C.narrativa, r = d.respostas || {}, out = [], avisos = [];
  const lst = k => String(r[k] || '').split('+').filter(x => x && !['nenhum', 'nada'].includes(x));
  const rot = (k, x) => (EMAG[k][1][x] || x).toLowerCase();
  const perfil = r.acontece || d.perfil;
  const V = { acontece:EMAG.acontece[1][perfil] || null, sono:EMAG.sono[1][r.sono] || null,
    forca:{ '1':'1 vez por semana', '2mais':'2 vezes ou mais por semana' }[r.forca] || null, cansada:r.sexo === 'm' ? 'cansado' : 'cansada',
    rotulo:Q.rotulo[perfil] || null, mostra:Q.mostra, desejo:Q.objetivo[r.objetivo] || null };
  V.rotulo_curto = V.rotulo;
  const cp = [r.ciclo === 'irregular' ? 'a menstruação falhando ou atrasando' : null, lst('pele').includes('pelos') ? 'pelos grossos no rosto, no queixo ou na barriga' : null].filter(Boolean);
  V.ciclo_pelos = cp.length ? listaE(cp) : null;
  V.sintomas = lst('tireoide').length ? listaE(lst('tireoide').map(x => rot('tireoide', x))) : null;
  V.exames = lst('exames').filter(x => x !== 'sem_exames').length ? listaE(lst('exames').filter(x => x !== 'sem_exames').map(x => rot('exames', x))) : null;
  // 1 · abertura com a resposta dela entre aspas
  out.push(bloco6('abertura', T6[0], [N.abertura, V.acontece ? Q.contou : null], V, { f:Q.abertura.f, circular:'a resposta "o que mais acontece"' }));
  // 2 · a âncora é o perfil (sem régua de idade; o IMC fica fora da fala)
  out.push(bloco6('resultado', T6[1], [V.rotulo ? Q.resultado : Q.resultado_sem], V, { f:Q.rotulo.f, circular:'o perfil no topo do resultado' }));
  // 3 · o que está bem e o mecanismo do perfil
  const bemK = r.exames === 'nada' ? 'exames_ok' : ['7', '8', '9mais'].includes(r.sono) ? 'sono_ok' : ['1', '2mais'].includes(r.forca) ? 'forca_ok' : 'geral';
  out.push(bloco6('conserva', T6[2], [Q.bem[bemK], Q.mecanismo[perfil]], V, { f:Q.bem.f + ' · ' + Q.mecanismo.f, circular:bemK === 'geral' ? null : 'essa resposta na tela' }));
  // 4 · o que pesa: até 2 sinais (o remédio sempre entra, regra 23)
  let sin = String(d.sinais || '').split('+').filter(s => s && Q.sinais[s]);
  sin = [...sin.filter(s => s === 'remedio'), ...sin.filter(s => s !== 'remedio')];
  if (sin.length) out.push(bloco6('pesa', T6[3], sin.slice(0, 2).map(s => Q.sinais[s]), V, { f:Q.sinais.f, circular:'as respostas que ela marcou sobre isso' }));
  if (sin.length > 2) avisos.push('Outros sinais do resultado (fale por escrito, 1 ideia por vídeo): ' + sin.slice(2).map(s => SINAL_EMAG[s] || s).join('; ') + '.');
  // 5 · o que conserva na faixa de idade dela
  V.item = FX_EMAG[r.idade] ? itemImporta(FX_EMAG[r.idade], r.sexo, null, { foraPele:true, dormeMal:['5menos', '6'].includes(String(r.sono)) }) : null;
  Object.assign(V, escolheExemplo('quiz-emagrecimento', LIGA_EMAG[perfil] || ['peso'], null, false) || {});
  out.push(importa6(N, V, T6));
  // 6 · o objetivo dela (o teste não pergunta "daqui a 10 anos") e a pergunta de interesse
  out.push(interesse6(N, V, T6, N.desejo_agora));
  cabe(out, 75, [['pesa', sin.length > 1 ? bloco6('pesa', T6[3], [Q.sinais[sin[0]]], V, { f:Q.sinais.f }) : null], ['conserva', Q.mecanismo[perfil] ? bloco6('conserva', T6[2], [Q.bem[bemK]], V, { f:Q.bem.f }) : null],
    ['importa', semExemplo(N, V, T6)]]);
  if (d.imc) avisos.push(`IMC ${n1(d.imc)} (${d.faixa || 'sem faixa'}) fica fora da fala; só por escrito se ela perguntar (regra 22).`);
  if (r.fase === 'gravida') avisos.push('Grávida: peso não é meta agora; nada de dieta, nem por escrito.');
  return { blocos:out.filter(Boolean), avisos, rotulo:V.rotulo, desejo:V.desejo };
}
// longevidade: idade do quiz em faixas → a faixa do arquivo "o que importa" (as que caem em duas faixas ficam de fora)
const FX_LONG = { ate39:'ate34', '40-49':'35a49', '50-59':'50a64', '60-69':'50a64', '70+':'65mais' };
function rotLong(d, E){
  const Q = E['quiz-longevidade'], C = E.comum, N = C.narrativa, r = d.respostas || {}, out = [], avisos = [];
  const arr = v => Array.isArray(v) ? v : v ? String(v).split('+') : [];
  const inc = arr(r.incomoda).filter(x => Q.incomoda[x]), prin = inc.find(x => x !== 'nada') || inc[0];
  const V = { objetivo:arr(r.objetivo).length ? listaE(arr(r.objetivo).slice(0, 2).map(x => OBJ_CURTO[x] || x)) : null,
    rotulo:prin && Q.rotulo[prin] ? Q.rotulo[prin] : null, mostra:Q.mostra, idade_txt:r.idade && LONG.idade[1][r.idade] ? LONG.idade[1][r.idade].toLowerCase() : null };
  V.rotulo_curto = V.rotulo || V.objetivo; V.desejo = V.objetivo;
  // 1 · abertura: o incômodo dela (ou, sem incômodo, o que ela quer)
  out.push(bloco6('abertura', T6C[0], [N.abertura, V.rotulo ? Q.contou_incomoda : V.objetivo ? Q.contou_objetivo : null], V, { f:Q.abertura.f, circular:'essa resposta na tela' }));
  // 2 · sem número: a âncora é a idade e o objetivo dela
  const b2 = bloco6('resultado', T6C[1], [Q.resultado], V, { f:Q._resultado_f || Q.abertura.f, circular:'a idade e o "daqui a 10 anos" na tela' });
  out.push(b2);
  // 3 · o incômodo principal (ou "nada te incomoda hoje") e o mecanismo
  out.push(bloco6('conserva', T6C[2], [prin ? Q.incomoda[prin] : null, Q.acompanha.texto], V, { f:Q.incomoda.f + ' · ' + Q.acompanha.f }));
  // 4 · o que atrapalha
  const at = arr(r.atrapalha).find(x => Q.atrapalha[x]);
  if (at) out.push(bloco6('pesa', T6C[3], [Q.atrapalha[at]], V, { f:Q.atrapalha.f, circular:'essa resposta na tela' }));
  // 5 · o que conserva na idade dela (sem sexo no quiz: o item comum aos dois, de músculo ou força quando houver)
  V.item = FX_LONG[r.idade] ? itemImporta(FX_LONG[r.idade], r.sexo, MOV_RE, { foraPele:true }) : null;
  Object.assign(V, escolheExemplo('quiz-longevidade', [...(LIGA_LONG[prin] || []), 'longevidade'], null, false) || {});
  out.push(importa6(N, V, T6C));
  // 6 · daqui a 10 anos, o que ela quer, e a pergunta de interesse
  out.push(interesse6(N, V, T6C, N.desejo));
  cabe(out, 60, [['conserva', prin ? bloco6('conserva', T6C[2], [Q.incomoda[prin]], V, { f:Q.incomoda.f }) : null], ['importa', semExemplo(N, V, T6C)]]);
  if (inc.length > 1) avisos.push('Também marcou: ' + inc.filter(x => x !== prin).map(x => LONG.incomoda[1][x]).join('; ') + '.');
  if (r.ajuda) avisos.push(`Prefere fazer: ${LONG.ajuda[1][r.ajuda] || r.ajuda}.`);
  return { blocos:out.filter(Boolean), avisos, rotulo:V.rotulo || V.objetivo, desejo:V.objetivo };
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
  // 12/11 (v3): o vídeo da pele nova vai de 60 a 75 s com a pergunta de interesse (~190 palavras a 150 por minuto); os outros, ~1 min
  const teto = b.teste === 'pele-idade' ? 190 : 160;
  const p = palavras(b), alvo = R.blocos.some(bl => /^refazer/.test(bl.id)) ? '' : p < 70 ? ' (curto)' : p > teto ? ` (passa de ${teto})` : '';
  return `<div class="rot-txt">${linhas}</div><p class="rot-info">${p} palavras faladas${alvo} · montado do estoque, sem custo</p>
    ${R.avisos.length ? `<div class="rot-av"><b>Avisos para você</b><ul>${R.avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}`;
}
/** Texto do roteiro vindo do Claude: tempos, [CIRCULAR] destacado, avisos separados. */
function formata(txt){
  const [antes, avisos] = String(txt).split(/^AVISOS PARA O LUCCA\s*$/m);
  const [fala, escrito] = antes.split(/^POR ESCRITO DEPOIS\s*$/m);   // 12/11 (pele-idade): o que vai por escrito depois do vídeo
  const linhas = fala.split('\n').filter(l => l.trim() && !/^ROTEIRO\s*$/.test(l.trim()) && !/^TESTE:/.test(l));
  const h = linhas.map(l => {
    const m = l.match(/^\s*\[(\d+-\d+ s)\]\s*(.*)$/);
    const corpoL = destaca(m ? m[2] : l).replace(/\[CIRCULAR:([^\]]*)\]/g, '<mark class="rot-c">circular:$1</mark>').replace(/\[APONTE:([^\]]*)\]/gi, '<mark class="rot-c">aponte:$1</mark>');
    return `<div class="rot-l"><span class="rot-t">${m ? esc(m[1]) : ''}</span><span class="rot-f">${corpoL}</span><span></span></div>`;
  }).join('');
  const av = (avisos || '').split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  const pe = (escrito || '').split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean);
  return `<div class="rot-txt">${h}</div>` + (pe.length ? `<div class="rot-av"><b>Por escrito depois</b><ul>${pe.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '') + (av.length ? `<div class="rot-av"><b>Avisos do Claude</b><ul>${av.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '');
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
const redesenha = i => { const s = document.querySelector(`.rot[data-rot="${i}"]`); if (s) s.innerHTML = corpo(i); try { window.aoMudarClaude?.(B[i]?.e); } catch (err) { console.error(err); } };
const redesenhaTodos = () => B.forEach((_, i) => redesenha(i));
const ERRO = { teto:'Chegou no teto de ajustes de hoje. Amanhã libera de novo.', recusa:'O Claude recusou este pedido. Use o roteiro do estoque.',
  ocupado:'A API está ocupada agora. Tente de novo em 1 minuto.', sem_chave:'A função está sem a chave da Anthropic.', grande:'Resultado grande demais para mandar.',
  vazio:'O Claude não devolveu texto. Tente de novo.', banco:'Não consegui gravar no banco. Tente de novo.',
  teste:'A edge do Claude ainda não conhece este teste (falta publicar a nova).' };
async function gerar(i, o = {}){
  const b = B[i]; if (!b || b.estado === 'gerando') return;
  b.estado = 'gerando'; b.erro = ''; redesenha(i);
  let cod = '';
  try {
    // 12/11 (pele-idade): o Claude escreve o roteiro no formato próprio, sem a base do estoque; a resposta dela ao áudio vai no pedido
    const pi = b.teste === 'pele-idade', resp = pi ? (RESP[CODIGO] || '') : '';
    const base = pi ? '' : textoEstoque(b, '');   // vai com {nome}, nunca com o nome digitado
    const extra = (b.pedido || '').trim();
    const pedido = pi ? [resp ? 'Resposta dela ao áudio: ' + resp : '', extra].filter(Boolean).join(' · ').slice(0, 300) : extra;
    const r = await post({ acao:'gerar', c:CODIGO, chave:b.chave, teste:b.teste, entrada:b.entrada, base, pedido, novo:o.novo !== false });
    const j = await r.json().catch(() => ({}));
    if (r.status === 404) throw new Error('Link sem acesso. Use o link do arquivo privado.');
    cod = j.erro || '';
    if (!j.ok || !j.roteiro) throw new Error(ERRO[j.erro] || `Não ajustou (${j.erro || r.status}).`);
    b.roteiro = j.roteiro; b.respUsada = o.novo === false && !j.pago ? b.respUsada : resp;
    if (j.hoje != null) USO = { hoje:j.hoje, teto:j.teto };
  } catch (err) {
    b.erro = err.message || 'Sem conexão.';
    if (o.auto && !['teto', 'teste', 'recusa'].includes(cod)) AUTO.delete(o.auto);   // falha passageira: tenta de novo na próxima abertura
  }
  b.estado = ''; redesenhaTodos();
}
// 12/11: ao abrir um lead da pele nova sem roteiro do Claude guardado, pede UMA vez, sozinho (novo:false: se a edge já
// tiver um, devolve sem pagar). Foto ruim e sem análise ficam no estoque (o roteiro de refazer e o das respostas).
const AUTO = new Set();
function autoPI(c){
  B.forEach((b, i) => {
    if (c !== CODIGO || b.teste !== 'pele-idade' || b.roteiro || b.estado === 'gerando') return;
    let cc = null; try { cc = window.KITS?.['pele-idade']?.classifica(b.e.dados || {}); } catch (err) { console.error(err); }
    if (cc?.refazer || cc?.semAnalise || b.e?.dados?.sem_analise) return;
    const k = c + '|' + b.chave; if (AUTO.has(k)) return; AUTO.add(k);
    gerar(i, { novo:false, auto:k });
  });
}
async function lerGravados(c){
  if (!B.length) return;
  try {
    const r = await post({ acao:'ler', c });
    const j = await r.json().catch(() => ({}));
    if (c !== CODIGO) return;
    if (j.ok){
      USO = { hoje:j.hoje, teto:j.teto };
      for (const b of B){ const g = (j.roteiros || []).find(x => x.chave === b.chave); if (g) b.roteiro = g; }
      redesenhaTodos();
    }
  } catch { /* sem conexão: segue com o estoque */ }
  if (c === CODIGO){ B.forEach(b => { b.lido = true; }); autoPI(c); }   // 13/11: lido = já sabe se há roteiro guardado (o CRM espera isto para abrir o gravador)
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
const ROT_BLOCO = { foto:'Foto', dentro:'Por dentro', resultado:'O resultado', conserva:'O que está conservado', pesa:'O que pesa', importa:'O que conserva na idade', abertura:'Abertura', idade:'Idade do rosto', bem:'O que está bem', 'habito-cigarro':'Cigarro', 'habito-sol':'Sol', 'habito-metabolico':'Pressão e glicose',
  'habito-sono':'Sono', 'habito-movimento':'Movimento', seguranca:'Frase de segurança', mecanismo:'Por que pesa', ponte:'Ponte', pergunta:'Pergunta', interesse:'Desejo e pergunta', refazer:'Refazer a foto', 'refazer-pergunta':'Pergunta' };
// 12/11: o roteiro do Claude (pele-idade) em partes: blocos cortados pelos marcadores [a-b s], o [APONTE: …] de cada bloco,
// as linhas do POR ESCRITO DEPOIS e os AVISOS. null = não é do formato.
const TIT_CL = { 0:['Abertura', 'cl-abertura'], 8:['Idade do rosto', 'cl-idade'], 18:['Foto', 'cl-foto'], 32:['Por dentro', 'cl-dentro'], 48:['Desejo e pergunta', 'cl-desejo'] };
// 13/11 (v3): o bloco pelo que diz (as frases fixas do PROMPT-NARRATIVA e do PROMPT-PELE-IDADE); o 1º é a abertura e o último, o desejo
function idPelaFala(fala, j, n){
  if (j === 0) return ['Abertura', 'cl-abertura'];
  if (j === n - 1 || /se interessaria/i.test(fala)) return ['Desejo e pergunta', 'cl-desejo'];
  if (/\[IMAGEM:|o que mais conserva/i.test(fala)) return ['O que conserva', 'cl-importa'];
  if (/^Do que você me contou/i.test(fala)) return ['Por dentro', 'cl-dentro'];
  if (j === 1) return ['O resultado', 'cl-idade'];
  if (/conservado|\[APONTE:|onde a foto mostra/i.test(fala)) return ['Foto', 'cl-foto'];
  return ['Bloco ' + (j + 1), 'cl-' + (j + 1)];
}
function partesClaude(txt){
  const s = String(txt || ''), i = s.search(/^ROTEIRO\b/m), e = s.search(/^POR ESCRITO DEPOIS/m), f = s.search(/^AVISOS PARA O LUCCA/m);
  if (i < 0) return null;
  const fim = [e, f].filter(x => x > i).sort((a, b2) => a - b2)[0], corpo = s.slice(i + 7, fim);
  const re = /\[(\d+)\s*-\s*(\d+)\s*s\]/g, marcas = []; let m;
  while ((m = re.exec(corpo))) marcas.push({ a:+m[1], b:+m[2], ini:m.index, fim:m.index + m[0].length });
  const v3 = marcas.length >= 6 || marcas.some(k => !TIT_CL[k.a]);   // 13/11: a narrativa em 6 blocos ([0-6 s], [6-16 s]…)
  const blocos = marcas.map((k, j) => {
    const fala = corpo.slice(k.fim, j + 1 < marcas.length ? marcas[j + 1].ini : undefined).replace(/\s+/g, ' ').trim()
      .replace(/^(Abertura|Idade|Foto|Por dentro|O que conserva|Âncora|Desejo e pergunta)\s*:\s*/i, '');
    const [titulo, id] = TIT_CL[k.a] && !v3 ? TIT_CL[k.a] : idPelaFala(fala, j, marcas.length);
    return { id, titulo, tempo:`${k.a}-${k.b} s`, fala, aponte:[...fala.matchAll(/\[(?:APONTE|CIRCULAR):\s*([^\]]+)\]/gi)].map(x => x[1].trim()) };
  }).filter(x => x.fala);
  const linhas = (a, b2) => a < 0 ? [] : s.slice(a, b2 > a ? b2 : undefined).split('\n').slice(1).map(l => l.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);
  const aspas = l => { const q = l.match(/["“]([^"”]+)["”]/g); return q && q.length === 1 ? q[0].slice(1, -1) : l.replace(/^["“]|["”]$/g, ''); };
  return { blocos, porEscrito:linhas(e, f).map(aspas), avisos:linhas(f, -1).filter(l => !/^nenhum\.?$/i.test(l)) };
}
/** O estado do Claude para um resultado (a Caixa mostra no passo 2 e o gravador usa). */
function claude(e){
  const b = B.find(x => x.e === e); if (!b) return null;
  const partes = b.roteiro ? partesClaude(b.roteiro.roteiro) : null, ok = !!(partes && partes.blocos.length);
  return { estado:b.estado, erro:b.erro, lido:!!b.lido, tem:ok, usar:ok && !b.usarEstoque, usarEstoque:!!b.usarEstoque, partes, palavras:b.roteiro?.palavras ?? null,
    conferir:b.roteiro?.avisos || [], modelo:b.roteiro?.modelo || '', respUsada:b.respUsada ?? null, teto:USO };
}
function usarEstoque(e, sim){ const i = B.findIndex(x => x.e === e); if (i < 0) return; B[i].usarEstoque = !!sim; redesenha(i); }
function refazerComResposta(e){ const i = B.findIndex(x => x.e === e); if (i >= 0) gerar(i, { novo:true }); }
function passosReact(e){
  const b = B.find(x => x.e === e);
  const cl = b && b.teste === 'pele-idade' ? claude(e) : null;
  const rotulo = b?.est?.rotulo || null;   // 13/11: o rótulo do bloco 1, destacado no teleprompter
  if (cl && cl.usar) return cl.partes.blocos.map(x => ({ id:x.id, bloco:x.titulo, foto:'frente', tempo:x.tempo, tela:x.aponte.length ? 'Aponte: ' + x.aponte.join('; ') : 'Foto de frente inteira',
    fala:x.fala, aponte:x.aponte, regiao:null, nota:'', claude:true, rotulo }));
  if (!b || !b.est || !b.est.blocos.length) return [{ bloco:'Foto', foto:'frente', tempo:'', tela:'Foto de frente inteira', fala:'', nota:'O roteiro do estoque não carregou: use o cartão.' }];
  return b.est.blocos.map(bl => ({ id:bl.id, bloco:ROT_BLOCO[bl.id] || bl.id, foto:'frente', tempo:bl.tempo, tela:bl.circular ? 'Circular: ' + bl.circular : 'Foto de frente inteira',
    fala:bl.opcoes[idx(b, bl)], regiao:bl.regiao || null, aponte:bl.aponte || [], nota:bl.fixo ? 'Frase fixa: não cortar.' : '', rotulo }));
}
/** A resposta dela ao áudio antes (colada pelo Lucca no passo 2) abre o roteiro (pele-idade, braço e pernas). Só nesta tela. */
let RESP = {};
function resposta(c, txt){
  const t = String(txt || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (t) RESP[c] = t; else delete RESP[c];
  if (c !== CODIGO || !EST) return;
  B.forEach(b => { try { b.est = doEstoque(b.e); } catch (err) { console.error(err); } });   // 13/11: todos (braço e pernas abrem com ela)
  redesenhaTodos();
}
/** 13/11: o catálogo das imagens do exemplo (da edge, sem URL) chegou: o estoque de todos se refaz com o exemplo. */
function exemplos(lista){
  EXE = Array.isArray(lista) ? lista.filter(x => x && typeof x.id === 'string') : null;
  if (!EST) return;
  B.forEach(b => { try { b.est = doEstoque(b.e); } catch (err) { console.error(err); } });
  redesenhaTodos();
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

return { exemplos, carregar:carregaEstoque, montar, bloco, parecido, depois, zerar, testeDe, doEstoque, passosReact, resposta, respostaDe:c => RESP[c] || '', claude, usarEstoque, refazerComResposta, partesClaude, texto:i => B[i] ? textoEstoque(B[i], '') : '', _indice:() => INDICE, _estoque:() => EST };
})();
