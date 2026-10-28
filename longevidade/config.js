// ============================================================
// LIVOWA — Quiz de longevidade (livowa.com/longevidade/)
// Motor herdado de ~/Desktop/Code/livowa-quiz (flow declarativo + funnel-analytics).
// EDITAR AQUI: textos, perguntas, mensagens de WhatsApp, links, analytics.
//
// Regras que este arquivo segue (não quebrar ao editar):
// - Sem promessa de resultado, sem "grátis" ligado a consulta, sem depoimento,
//   sem número de clientes, sem estrela (CFM 2.336/2023; regras da Livowa).
// - Nada diz o que a pessoa "tem": o resultado é o relato dela + o que os estudos
//   mostram em populações, sempre com a fonte na tela.
// - "6 perguntas" na capa é verdadeiro: objetivo, idade, rotina, incomoda,
//   atrapalha, sozinho/médico. Se mudar o número de perguntas, mude a capa.
// ============================================================

// variante do A/B lida da URL: livowa.com/longevidade/?v=B
function varianteDaUrl() {
  try {
    const v = new URLSearchParams(location.search).get('v');
    return v && /^[A-Za-z0-9_-]{1,20}$/.test(v) ? v : 'A';
  } catch (e) { return 'A'; }
}

export const CONFIG = {

  versao: 'lg1',

  // true = pede nome + WhatsApp (com consentimento LGPD) ANTES do resultado.
  // Padrão false: a pesquisa do projeto (quiz-pos-teste.md, CFM 2.336 art. 11 §4º "a")
  // indica mostrar o resultado sem exigir contato.
  pedirContatoAntes: false,

  links: {
    teste: '/idade/',                                       // teste das pernas (botão secundário)
    direct: 'https://ig.me/m/dr.luccamarques',              // DM do Instagram (não aceita texto pronto)
    instagram: 'https://www.instagram.com/dr.luccamarques/',
    politica: ''                                            // URL da política de privacidade (vazio = sem link)
  },

  // ---- Tela 1: capa ----
  hero: {
    who: '<b>Dr. Lucca Marques</b> · Médico · CRM-GO 33.990',
    title: 'Seu perfil de longevidade em 1 minuto',
    subtitle: 'Você responde 6 perguntas, só com toques. No fim, vê o que os estudos mostram para pessoas com o seu perfil.',
    cards: [
      { big: '6 perguntas', small: 'só toque, sem digitar' },
      { big: '1 minuto', small: 'o resumo sai na hora' }
    ],
    cta: 'Começar'
  },

  // ============================================================
  // FLOW — uma tela por item, na ordem.
  // type: info | single | multi | capture
  // condition: (state) => boolean  (false = tela pulada)
  // Opções: value (vai pro analytics), emoji, label (na tela), curto (no perfil e na mensagem)
  // ============================================================
  flow: [

    // ---- Tela 2: autoridade ----
    {
      id: 'autoridade', type: 'info', view: 'autoridade',
      eyebrow: 'Quem fez este quiz',
      title: 'Feito por médico, com estudo publicado',
      medico: { nome: 'Dr. Lucca Marques', linha: 'Médico · CRM-GO 33.990', iniciais: 'LM' },
      texto: 'As perguntas e o resumo do fim usam estudos publicados. A fonte aparece na tela.',
      estudo: {
        numero: '12.864',
        texto: 'pessoas de 18 a 98 anos fizeram o mesmo teste de pernas que usamos como referência.',
        fonte: 'Coelho-Junior et al., J Cachexia Sarcopenia Muscle, 2024'
      },
      cta: 'Continuar'
    },

    // ---- Tela 3: objetivo (pergunta 1) ----
    {
      id: 'objetivo', type: 'single',
      title: 'Daqui a 10 anos, o que você quer estar fazendo?',
      options: [
        { value: 'escada',      emoji: '🪜', label: 'Subir escada e carregar peso sem pensar', curto: 'subir escada e carregar peso sem pensar' },
        { value: 'familia',     emoji: '👨‍👩‍👧', label: 'Ter disposição para filhos e netos',        curto: 'ter disposição para filhos e netos' },
        { value: 'trabalho',    emoji: '💼', label: 'Trabalhar no meu ritmo, sem me arrastar',  curto: 'trabalhar no meu ritmo, sem me arrastar' },
        { value: 'viajar',      emoji: '🧳', label: 'Viajar e andar o dia inteiro',             curto: 'viajar e andar o dia inteiro' },
        { value: 'esporte',     emoji: '🎾', label: 'Continuar no esporte que eu gosto',        curto: 'continuar no esporte que eu gosto' },
        { value: 'independente',emoji: '🧍', label: 'Não depender de ninguém',                  curto: 'não depender de ninguém' }
      ]
    },

    // ---- Pergunta 2: idade (marca a faixa no gráfico e escolhe o estudo do resultado) ----
    {
      id: 'idade', type: 'single',
      title: 'Quantos anos você tem?',
      subtitle: 'Para comparar com pessoas da sua idade.',
      options: [
        { value: 'ate39', label: 'Até 39 anos', curto: 'até 39 anos', faixa: [18, 39] },
        { value: '40-49', label: '40 a 49 anos', curto: '40 a 49 anos', faixa: [40, 49] },
        { value: '50-59', label: '50 a 59 anos', curto: '50 a 59 anos', faixa: [50, 59] },
        { value: '60-69', label: '60 a 69 anos', curto: '60 a 69 anos', faixa: [60, 69] },
        { value: '70+',   label: '70 anos ou mais', curto: '70 anos ou mais', faixa: [70, 88] }
      ]
    },

    // ---- Tela 4: "você está no lugar certo" + gráfico de potência por idade ----
    {
      id: 'lugar-certo', type: 'info', view: 'grafico',
      eyebrow: '🎯 Você está no lugar certo',
      title: 'Muito disso passa pelas pernas',
      texto: (s, curto) => `Você quer ${curto('objetivo') || 'chegar bem aos próximos 10 anos'}. A potência das pernas ajuda nisso, e ela dá para medir.`,
      legenda: 'Potência mediana das pernas por idade, em W/kg. 12.864 pessoas.',
      fonte: 'Coelho-Junior et al., J Cachexia Sarcopenia Muscle, 2024',
      cta: 'Continuar'
    },

    // ---- Tela 5: rotina (pergunta 3) ----
    {
      id: 'rotina', type: 'single',
      title: 'Como é a sua rotina?',
      options: [
        { value: 'empresario', emoji: '💼', label: 'Tenho empresa ou cargo de gestão, agenda cheia', curto: 'empresa ou gestão, agenda cheia', perfil: 'Agenda cheia' },
        { value: 'liberal',    emoji: '📋', label: 'Profissional liberal',               curto: 'profissional liberal',               perfil: 'Profissional liberal' },
        { value: 'fixo',       emoji: '🕘', label: 'Trabalho em horário fixo',           curto: 'trabalho em horário fixo',           perfil: 'Horário fixo' },
        { value: 'aposentado', emoji: '🌿', label: 'Já me aposentei', curto: 'já me aposentei', perfil: 'Aposentadoria' }
      ]
    },

    // ---- Tela 6: ciência (um estudo, uma frase, a fonte) ----
    // Araújo 2025 (CLINIMEX, Rio): potência relativa, quartil mais baixo vs. mais alto, HR 5,88 (H) e 6,90 (M);
    // força relativa não significativa. Conferido no abstract (PMID 40304660); ver pesquisa/potencia-mortalidade.md.
    {
      id: 'ciencia', type: 'info', view: 'ciencia',
      eyebrow: 'Um estudo brasileiro',
      title: 'Na sobrevida, a potência muscular pesou mais que a força',
      texto: 'Médicos no Rio acompanharam 3.889 pessoas de 46 a 75 anos por quase 11 anos. Quem tinha mais potência teve menos mortes no período.',
      nota: 'Potência é força com velocidade: levantar rápido, subir rápido.',
      fonte: 'Araújo et al., Mayo Clinic Proceedings, 2025',
      cta: 'Continuar'
    },

    // ---- Tela 7: o que incomoda (pergunta 4, múltipla) ----
    {
      id: 'incomoda', type: 'multi',
      title: 'O que mais te incomoda hoje?',
      subtitle: 'Pode marcar mais de uma.',
      options: [
        { value: 'cansaco', emoji: '😮‍💨', label: 'Cansaço no fim do dia',            curto: 'cansaço no fim do dia' },
        { value: 'peso',    emoji: '⚖️', label: 'Peso que não sai',                 curto: 'peso que não sai' },
        { value: 'dor',     emoji: '🦵', label: 'Dor nas costas ou no joelho',      curto: 'dor nas costas ou no joelho' },
        { value: 'exame',   emoji: '🧪', label: 'Exame alterado (glicose, colesterol, pressão)', curto: 'exame alterado' },
        { value: 'forca',   emoji: '🏋️', label: 'Sentir que perdi força ou fôlego', curto: 'sentir que perdi força ou fôlego' },
        { value: 'nada',    emoji: '🙂', label: 'Nada, quero me prevenir',          curto: 'nada, quero me prevenir', exclusiva: true }
      ]
    },

    // ---- Tela 8: o que atrapalha (pergunta 5, múltipla) ----
    {
      id: 'atrapalha', type: 'multi',
      title: 'O que mais atrapalha hoje?',
      subtitle: 'Pode marcar mais de uma.',
      options: [
        { value: 'tempo',      emoji: '⏱️', label: 'Falta de tempo',              curto: 'falta de tempo' },
        { value: 'comecar',    emoji: '🧭', label: 'Não sei por onde começar',    curto: 'não saber por onde começar' },
        { value: 'constancia', emoji: '🔁', label: 'Manter a constância',         curto: 'manter a constância' },
        { value: 'clinica',    emoji: '🏥', label: 'Ir a clínica e laboratório',  curto: 'ir a clínica e laboratório' },
        { value: 'dor',        emoji: '🩹', label: 'Dor ou medo de me machucar',  curto: 'dor ou medo de me machucar' }
      ]
    },

    // ---- Tela 9: decoy (pergunta 6) — decide o CTA ----
    {
      id: 'ajuda', type: 'single',
      title: 'Prefere fazer sozinho ou com médico acompanhando de perto?',
      options: [
        { value: 'sozinho', emoji: '🧭', label: 'Sozinho, com um plano',           desc: 'Um plano de 4 semanas para fazer em casa.', curto: 'fazer sozinho, com um plano' },
        { value: 'medico',  emoji: '🩺', label: 'Com médico acompanhando de perto', desc: 'O Dr. Lucca acompanha e ajusta com você.',  curto: 'com médico acompanhando de perto' }
      ]
    },

    // ---- Contato antes do resultado (só se pedirContatoAntes = true) ----
    {
      id: 'contato', type: 'capture',
      condition: () => CONFIG.pedirContatoAntes,
      title: 'Antes do resumo: seu nome e WhatsApp',
      subtitle: 'O Dr. Lucca usa só para falar com você sobre estas respostas.',
      fields: [
        { name: 'nome',     label: 'Nome',     placeholder: 'Como você se chama', type: 'text', required: true },
        { name: 'whatsapp', label: 'WhatsApp', placeholder: '(62) 99999-9999',    type: 'tel',  required: true, mask: 'phone' }
      ],
      consent: 'Autorizo o Dr. Lucca Marques e a Livowa a guardar meu nome, meu WhatsApp e minhas respostas deste quiz, que incluem informações de saúde, para falar comigo sobre elas. Posso pedir a exclusão quando quiser (LGPD, Lei 13.709/2018).',
      consentErro: 'Para continuar, marque a autorização. Suas respostas incluem informações de saúde, e a lei pede o seu consentimento.',
      cta: 'Ver meu resumo'
    }
  ],

  // ---- Tela 10: loading que repete 3 respostas ----
  loading: {
    title: 'Juntando suas respostas…',
    linhas: (s, curto) => [
      curto('rotina'),
      'Incomoda: ' + curto('incomoda'),
      'Atrapalha: ' + curto('atrapalha')
    ],
    final: 'Separando os estudos da sua faixa de idade…',
    durationMs: 3800
  },

  // ---- Tela 11: resultado ----
  resultado: {
    eyebrow: 'Seu perfil',
    titulo: (s, curto, op) => `${op('rotina')?.perfil || 'Seu perfil'}, ${op('idade')?.curto || ''}`.replace(/, $/, ''),
    linhas: (s, curto) => [
      ['Daqui a 10 anos', curto('objetivo')],
      ['Hoje incomoda', curto('incomoda')],
      ['O que atrapalha', curto('atrapalha')],
      ['Prefere', curto('ajuda')]
    ],
    estudosTitulo: 'O que os estudos mostram para esse perfil',
    aviso: 'Este resumo junta suas respostas com estudos feitos em grupos de pessoas. Não é diagnóstico.',
    teste: {
      titulo: 'Quer um número só seu?',
      texto: 'O teste das pernas mede a sua potência com a câmera do celular, em 1 minuto.',
      cta: 'Fazer o teste das pernas'
    },
    medico: {
      cta: 'Conversar com o Dr. Lucca',
      linha: 'Abre o WhatsApp com a mensagem pronta, com suas respostas.',
      alt: 'Prefiro pelo Direct',
      copiado: 'Mensagem copiada. No Direct, é só colar.'
    },
    sozinho: {
      cta: 'Quero o plano de 4 semanas',
      linha: 'Chega pelo WhatsApp. A mensagem já vai pronta.',
      alt: 'Seguir @dr.luccamarques'
    }
  },

  // Estudos do resultado. Cada um: texto curto + fonte. Todos conferidos na fonte:
  // - Alcazar 2021 (PMC8350203, texto completo): sem mudança 20–30, queda não significativa 30–50,
  //   queda de 0,10 (M) e 0,13 (H) W/kg/ano de 50 a 80. n=9.906, 20–103 anos.
  // - Coelho-Junior 2024 (Lookup 7+, tab. S3/S6): mediana H 5,4 (46 a) → 4,0 (75 a) = −26%;
  //   M 4,8 → 3,2 = −33%. "Um quarto" e "um terço" são conta sobre a tabela.
  // - Baltasar-Fernandez 2021 (Sci Rep, PMC8484545, texto completo): potência baixa (<2,5 H; <1,9 M)
  //   ligada a fragilidade (OR 5,6 e 6,9) e marcha lenta, em ≥60–65 anos.
  // - Momma 2022 (Br J Sports Med, doi 10.1136/bjsports-2021-105061, abstract): 16 coortes; 30–60 min/semana
  //   de exercício de força = maior redução (~10–20%) de mortalidade por todas as causas.
  // - Lacroix 2017 (Sports Med, doi 10.1007/s40279-017-0747-6, abstract): 11 estudos, ≥65 anos saudáveis;
  //   treino supervisionado > não supervisionado em força/potência (SMD 0,51).
  estudos: {
    idade: {
      'ate39': { txt: 'Até perto dos 50 anos, a potência das pernas muda pouco. A queda média começa depois dos 50.', fonte: 'Alcazar et al., J Cachexia Sarcopenia Muscle, 2021 · 9.906 pessoas' },
      '40-49': { txt: 'Antes dos 50, a potência das pernas cai pouco. Dos 50 aos 80 anos, ela cai um pouco a cada ano, em média.', fonte: 'Alcazar et al., J Cachexia Sarcopenia Muscle, 2021 · 9.906 pessoas' },
      '50-59': { txt: 'Dos 46 aos 75 anos, a potência mediana das pernas cai cerca de um quarto nos homens e um terço nas mulheres.', fonte: 'Coelho-Junior et al., J Cachexia Sarcopenia Muscle, 2024 · 12.864 pessoas' },
      '60-69': { txt: 'Dos 46 aos 75 anos, a potência mediana das pernas cai cerca de um quarto nos homens e um terço nas mulheres.', fonte: 'Coelho-Junior et al., J Cachexia Sarcopenia Muscle, 2024 · 12.864 pessoas' },
      '70+':   { txt: 'A partir dos 65 anos, potência baixa nas pernas aparece junto com mais fragilidade e passo mais lento.', fonte: 'Baltasar-Fernandez et al., Scientific Reports, 2021' }
    },
    tempo:      { txt: 'Numa revisão de 16 estudos, 30 a 60 minutos por semana de exercício de força estiveram ligados a 10% a 20% menos mortes por qualquer causa.', fonte: 'Momma et al., Br J Sports Med, 2022' },
    supervisao: { txt: 'Em pessoas com 65 anos ou mais, o treino de força com supervisão melhorou mais a força e a potência do que o treino feito sem supervisão.', fonte: 'Lacroix et al., Sports Medicine, 2017 · revisão de 11 estudos' }
  },

  // ============================================================
  // WhatsApp — mesmo número do livowa.com/idade
  // ============================================================
  whatsapp: {
    number: '5562992836713',
    msgMedico: (s, curto) =>
      `Oi, Dr. Lucca! Fiz o quiz de longevidade.\n` +
      `Daqui a 10 anos quero: ${curto('objetivo')}.\n` +
      `Hoje me incomoda: ${curto('incomoda')}.\n` +
      `O que atrapalha: ${curto('atrapalha')}.\n` +
      `Prefiro: ${curto('ajuda')}.\n` +
      `Tenho ${curto('idade')}; rotina: ${curto('rotina')}.\n` +
      `Queria conversar sobre isso.`,
    msgPlano: (s, curto) =>
      `Oi! Fiz o quiz de longevidade e quero o plano de 4 semanas para fazer sozinho.\n` +
      `Daqui a 10 anos quero: ${curto('objetivo')}.\n` +
      `Hoje me incomoda: ${curto('incomoda')}.\n` +
      `O que atrapalha: ${curto('atrapalha')}.\n` +
      `Tenho ${curto('idade')}; rotina: ${curto('rotina')}.`
  },

  // Potência relativa (W/kg) por idade, P50 — Coelho-Junior 2024, Lookup 7+, tab. S3 (H) e S6 (M).
  // [idade média da faixa, P50]. Só faixas medidas (sem extrapolação).
  norma: {
    homens:   [[24.4, 5.9], [36.1, 5.5], [46.0, 5.4], [55.6, 5.0], [65.6, 4.5], [74.8, 4.0], [84.2, 3.5]],
    mulheres: [[25.0, 5.3], [35.7, 5.1], [46.4, 4.8], [55.4, 4.3], [65.4, 3.8], [74.7, 3.2], [83.6, 2.8]]
  },

  // ============================================================
  // ANALYTICS — mesmo Supabase do quiz antigo. Em localhost só loga no console.
  // Eventos: view, step_view (cada tela), answer, lead_capture, complete, cta_click.
  // ============================================================
  analytics: {
    enabled: true,
    funnelId: 'quiz-longevidade',
    variant: varianteDaUrl(),
    supabaseUrl: 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co',
    supabaseKey: 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K'   // chave pública (anon), a mesma do quiz antigo
  }
};
