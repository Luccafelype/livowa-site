// ============================================================
// LIVOWA — Quiz de longevidade (livowa.com/longevidade/)
// Motor herdado de ~/Desktop/Code/livowa-quiz (flow declarativo + funnel-analytics).
// EDITAR AQUI: textos, perguntas, VSLs, mensagens de WhatsApp, links, analytics.
//
// Regras que este arquivo segue (não quebrar ao editar):
// - Sem promessa de resultado, sem "grátis" ligado a consulta, sem depoimento,
//   sem número de clientes, sem estrela (CFM 2.336/2023; regras da Livowa).
// - Nada diz o que a pessoa "tem". Estudo entra com uma frase e a fonte embaixo.
// - "6 perguntas" na capa é verdadeiro: objetivo, idade, rotina, incomoda,
//   atrapalha, sozinho/médico. Se mudar o número de perguntas, mude a capa.
// - value das opções = o que vai pro analytics. Não trocar (só label/curto).
//
// Marcação nos textos de tela (lida pelo quiz.js; o texto é escapado antes):
//   *trecho*    cor de destaque
//   ==trecho==  marca-texto
//   **trecho**  negrito
// Tom (lg2, 28/10): o do beconfident, falado, 2ª pessoa, frases curtas, desejo e dor
// com as palavras do público (VOZ-DO-PUBLICO.md, pesquisa/voz-do-empresario.md).
// Nada de explicar como o quiz funciona.
//
// lg2b (28/10, depois do teste do Lucca no celular): objetivo virou múltipla; saiu o
// gráfico (ele não entendeu) e entrou a demo do teste das pernas; ciência em 1 frase;
// resultado mínimo com VSL por perfil (tabela vsls); a mensagem leva só um CÓDIGO
// (as respostas vão no evento 'complete' do analytics, props.codigo + props.respostas).
// ============================================================

// variante do A/B lida da URL: livowa.com/longevidade/?v=B
function varianteDaUrl() {
  try {
    const v = new URLSearchParams(location.search).get('v');
    return v && /^[A-Za-z0-9_-]{1,20}$/.test(v) ? v : 'A';
  } catch (e) { return 'A'; }
}

export const CONFIG = {

  versao: 'lg2',

  // true = pede nome + WhatsApp (com consentimento LGPD) ANTES do resultado.
  // Padrão false: a pesquisa do projeto (quiz-pos-teste.md, CFM 2.336 art. 11 §4º "a")
  // indica mostrar o resultado sem exigir contato.
  pedirContatoAntes: false,

  links: {
    teste: '/idade/',                                       // teste das pernas (link pequeno no resultado)
    direct: 'https://ig.me/m/dr.luccamarques',              // DM do Instagram (não aceita texto pronto)
    instagram: 'https://www.instagram.com/dr.luccamarques/',
    politica: ''                                            // URL da política de privacidade (vazio = sem link)
  },

  // ---- Tela 1: capa ----
  // Desejo como processo ("pra chegar aos 70 subindo escada"), nunca prazo de resultado.
  hero: {
    pill: '6 perguntas · leva 1 minuto',
    title: 'Responda 6 perguntas e veja o que pesa pra chegar ==aos 70== *subindo escada sem pensar*',
    subtitle: 'No fim, tem *um vídeo do Dr. Lucca pra quem está na sua fase*.',
    subtitleSemVideo: 'No fim, você vê *o próximo passo pra quem está na sua fase*.',   // usado enquanto nenhuma VSL tiver vídeo
    cta: 'Responder quiz de 1 minuto',
    who: 'Feito pelo **Dr. Lucca Marques** · Médico · CRM-GO 33.990'
  },

  // ============================================================
  // FLOW — uma tela por item, na ordem.
  // type: info | single | multi | capture
  // condition: (state) => boolean  (false = tela pulada)
  // Opções: value (vai pro analytics), emoji, label (na tela), curto (no perfil/loading)
  // ============================================================
  flow: [

    // ---- Tela 2: autoridade (no lugar da prova social do beconfident: médico + estudo com fonte) ----
    {
      id: 'autoridade', type: 'info', view: 'autoridade',
      pill: 'Quem montou este quiz',
      title: 'Quem vai ler *as suas respostas*',
      medico: { nome: 'Dr. Lucca Marques', linha: 'Médico · CRM-GO 33.990', iniciais: 'LM' },
      estudo: {
        numero: '12.864',
        texto: 'pessoas fizeram o teste de pernas que ele usa como régua.',
        fonte: 'Coelho-Junior et al., J Cachexia Sarcopenia Muscle, 2024'
      },
      cta: 'Continuar'
    },

    // ---- Tela 3: objetivo (pergunta 1, MÚLTIPLA desde lg2b) ----
    {
      id: 'objetivo', type: 'multi',
      title: 'Daqui a 10 anos, o que você quer *continuar fazendo*?',
      subtitle: '(Marque tudo o que você quer)',
      options: [
        { value: 'escada',      emoji: '', label: 'Subir escada e carregar as compras sem pensar duas vezes', curto: 'subir escada e carregar peso sem pensar' },
        { value: 'familia',     emoji: '', label: 'Ter disposição pra acompanhar filho e neto, sem ficar de fora', curto: 'ter disposição com filhos e netos' },
        { value: 'trabalho',    emoji: '', label: 'Trabalhar no meu ritmo sem chegar no fim do dia no limite', curto: 'trabalhar sem chegar no limite no fim do dia' },
        { value: 'viajar',      emoji: '', label: 'Viajar e andar o dia inteiro sem procurar banco pra sentar', curto: 'viajar e andar o dia inteiro' },
        { value: 'esporte',     emoji: '', label: 'Continuar no futebol, na corrida ou no tênis sem me machucar', curto: 'continuar no esporte' },
        { value: 'independente',emoji: '', label: 'Não depender de ninguém pra levantar, sair e resolver minhas coisas', curto: 'não depender de ninguém' }
      ]
    },

    // ---- Pergunta 2: idade ----
    {
      id: 'idade', type: 'single',
      title: 'Quantos anos você tem?',
      options: [
        { value: 'ate39', emoji: '', label: 'Até 39 anos',     curto: 'até 39 anos' },
        { value: '40-49', emoji: '', label: '40 a 49 anos',    curto: 'entre 40 e 49 anos' },
        { value: '50-59', emoji: '', label: '50 a 59 anos',    curto: 'entre 50 e 59 anos' },
        { value: '60-69', emoji: '', label: '60 a 69 anos',    curto: 'entre 60 e 69 anos' },
        { value: '70+',   emoji: '', label: '70 anos ou mais', curto: '70 anos ou mais' }
      ]
    },

    // ---- Tela 4: "você está no lugar certo" + demo viva do teste das pernas ----
    // A demo mostra o produto real (livowa.com/idade): 5 levantadas, cronômetro, barra medindo.
    // Sem seta de resultado ("↑ subindo" seria promessa implícita).
    {
      id: 'lugar-certo', type: 'info', view: 'demo',
      emoji: '',
      title: 'Perfeito, você está no lugar certo!',
      texto: (s, curto) => {
        const n = (s.answers.objetivo || []).length;
        const quer = n === 1 ? curto('objetivo') : 'tudo isso';
        return `Pra ${quer || 'chegar bem aos próximos 10 anos'}, muita coisa passa pelas pernas. E a força delas *dá pra medir em 1 minuto*.`;
      },
      demo: {
        titulo: 'Teste das pernas',
        tag: 'câmera do celular',
        contagem: 'levantadas da cadeira',
        barra: 'Potência das pernas',
        medindo: 'medindo…',
        pronto: 'medida'
      },
      cta: 'Continuar'
    },

    // ---- Tela 5: rotina (pergunta 3) ----
    {
      id: 'rotina', type: 'single',
      title: 'E a sua semana, *como é hoje*?',
      options: [
        { value: 'empresario', emoji: '', label: 'Cuido de empresa ou equipe, e a agenda não para', curto: 'cuido de empresa ou equipe, com a agenda cheia', perfil: 'Agenda cheia' },
        { value: 'liberal',    emoji: '', label: 'Sou profissional liberal',                curto: 'sou profissional liberal',  perfil: 'Profissional liberal' },
        { value: 'fixo',       emoji: '', label: 'Trabalho com hora pra entrar e pra sair',  curto: 'trabalho em horário fixo',  perfil: 'Horário fixo' },
        { value: 'aposentado', emoji: '', label: 'Já me aposentei',                          curto: 'já me aposentei',           perfil: 'Aposentadoria' }
      ]
    },

    // ---- Tela 6: ciência — UMA frase + fonte pequena ----
    // Araújo 2025 (CLINIMEX, Rio): potência relativa, quartil mais baixo vs. mais alto, HR 5,88 (H) e 6,90 (M);
    // força relativa não significativa. Conferido no abstract (PMID 40304660); ver pesquisa/potencia-mortalidade.md.
    // Atenção: o estudo NÃO mediu pernas (não escrever "potência das pernas" aqui).
    {
      id: 'ciencia', type: 'info', view: 'ciencia',
      pill: 'Pesquisa · Mayo Clinic Proceedings',
      citacao: 'Na sobrevida, *a potência muscular pesou mais que a força*.',
      fonte: 'Araújo et al., 2025 · 3.889 pessoas no Rio, por quase 11 anos',
      cta: 'Continuar'
    },

    // ---- Tela 7: o que incomoda (pergunta 4, múltipla) ----
    {
      id: 'incomoda', type: 'multi',
      title: 'O que mais *te incomoda* hoje?',
      subtitle: '(Marque tudo o que vale pra você)',
      options: [
        { value: 'cansaco', emoji: '', label: 'Cansaço que não passa nem depois de dormir',         curto: 'o cansaço que não passa' },
        { value: 'peso',    emoji: '', label: 'A barriga que só cresce, mesmo comendo igual',        curto: 'a barriga que só cresce' },
        { value: 'dor',     emoji: '', label: 'Dor nas costas ou no joelho que atrapalha o dia',     curto: 'a dor nas costas ou no joelho' },
        { value: 'exame',   emoji: '', label: 'Exame que veio alterado: pressão, glicose ou colesterol', curto: 'um exame que veio alterado' },
        { value: 'forca',   emoji: '', label: 'Não consigo fazer as mesmas coisas que antes',        curto: 'não conseguir fazer as mesmas coisas que antes' },
        { value: 'nada',    emoji: '', label: 'Nada por enquanto, quero me cuidar antes',            curto: 'nada por enquanto, quero me cuidar antes', exclusiva: true }
      ]
    },

    // ---- Tela 8: o que atrapalha (pergunta 5, múltipla) ----
    {
      id: 'atrapalha', type: 'multi',
      title: 'E o que *te trava* pra cuidar disso?',
      subtitle: '(Marque tudo o que vale pra você)',
      options: [
        { value: 'tempo',      emoji: '', label: 'Não tenho tempo nem pra cuidar da saúde',      curto: 'a falta de tempo' },
        { value: 'comecar',    emoji: '', label: 'Não sei por onde começar',                    curto: 'não saber por onde começar' },
        { value: 'constancia', emoji: '', label: 'Começo bem e largo na segunda semana',        curto: 'começar e largar no meio' },
        { value: 'clinica',    emoji: '', label: 'Perder meio dia em clínica e laboratório',    curto: 'perder tempo em clínica e laboratório' },
        { value: 'dor',        emoji: '', label: 'Medo de me machucar ou piorar uma dor',       curto: 'o medo de me machucar' }
      ]
    },

    // ---- Tela 9: decoy (pergunta 6) — decide o CTA ----
    {
      id: 'ajuda', type: 'single',
      title: 'Você prefere fazer isso *por conta própria* ou com *um médico do lado*?',
      options: [
        { value: 'sozinho', emoji: '', label: 'Por conta própria, no meu ritmo',  desc: 'Um plano de 4 semanas pra fazer em casa.',  curto: 'por conta própria' },
        { value: 'medico',  emoji: '', label: 'Com um médico do lado',  desc: 'O Dr. Lucca acompanha e ajusta com você.',  curto: 'com médico acompanhando de perto' }
      ]
    },

    // ---- Contato antes do resultado (só se pedirContatoAntes = true) ----
    {
      id: 'contato', type: 'capture',
      condition: () => CONFIG.pedirContatoAntes,
      title: 'Quase lá. *Pra onde* o Dr. Lucca pode te chamar?',
      subtitle: 'Ele usa só pra falar com você sobre estas respostas.',
      fields: [
        { name: 'nome',     label: 'Nome',     placeholder: 'Como você se chama', type: 'text', required: true },
        { name: 'whatsapp', label: 'WhatsApp', placeholder: '(62) 99999-9999',    type: 'tel',  required: true, mask: 'phone' }
      ],
      consent: 'Autorizo o Dr. Lucca Marques e a Livowa a guardar meu nome, meu WhatsApp e minhas respostas deste quiz, que incluem informações de saúde, para falar comigo sobre elas. Posso pedir a exclusão quando quiser (LGPD, Lei 13.709/2018).',
      consentErro: 'Pra continuar, marque a autorização. Suas respostas falam de saúde, e a lei pede o seu consentimento.',
      cta: 'Ver meu resultado'
    }
  ],

  // ---- Tela 10: loading (repete 3 respostas; não fala em IA) ----
  loading: {
    emoji: '',
    title: 'Você chegou na melhor parte',
    texto: 'Estou separando *o vídeo certo pra quem está na sua fase*.',
    textoSemVideo: 'Estou juntando *o que você me contou*.',
    barra: 'Montando seu resultado…',
    linhas: (s, curto) => [
      curto('rotina'),
      'O que incomoda: ' + curto('incomoda'),
      'O que trava: ' + curto('atrapalha')
    ],
    final: 'Gerando o seu código…',
    durationMs: 3800
  },

  // ---- Tela 11: resultado (mínimo: perfil + 1 frase + vídeo + botão) ----
  // Título e frase vêm da VSL escolhida (tabela vsls abaixo).
  resultado: {
    pill: 'Seu resultado está pronto',
    codigoLinha: 'Seu código guarda suas respostas para o Dr. Lucca ver.',
    codigoRotulo: 'Seu código',
    teste: 'Ou meça suas pernas agora, em 1 minuto',
    medico: {
      cta: 'FALAR COM O DR. LUCCA',
      alt: 'Prefiro pelo Direct',
      copiado: 'Mensagem com o código copiada. No Direct, é só colar.'
    },
    sozinho: {
      cta: 'QUERO O PLANO DE 4 SEMANAS',
      alt: 'Seguir @dr.luccamarques'
    }
  },

  // ============================================================
  // VSLs POR PERFIL — o Lucca grava uma para cada perfil (roteiro em VSLS-PARA-GRAVAR.txt).
  // Escolha: a PRIMEIRA cujo `quando` casar; se nenhuma casar, a que tem `padrao: true`.
  // `quando`: { pergunta: [valores] } — todas as perguntas listadas precisam casar (E);
  //           numa pergunta de múltipla, basta marcar um dos valores (OU).
  //           Também aceita uma lista de objetos: casa se QUALQUER um casar.
  // `video`: link do YouTube (não listado) ou de um .mp4 próprio. Vazio = o bloco de vídeo
  //          não aparece (a tela fica só com título, frase e botão).
  // `titulo` e `frase` aparecem no resultado com ou sem vídeo: escritos como espelho da
  //          situação, sem prometer resultado.
  // ============================================================
  vslFormato: '9/16',          // proporção do player (9/16 = vertical de celular; 16/9 = deitado)
  vsls: [
    { id: 'exame-alterado',
      quando: { incomoda: ['exame'] },
      titulo: 'Exame alterado, e você quer agir antes',
      frase: 'Exame alterado assusta. Dá pra olhar com calma e escolher o primeiro passo.',
      video: '' },
    { id: 'dor-medo',
      quando: [{ incomoda: ['dor'] }, { atrapalha: ['dor'] }],
      titulo: 'Dor e medo de piorar',
      frase: 'Com dor, o primeiro passo é o que não machuca. Dá pra começar por aí.',
      video: '' },
    { id: 'prevencao-60',
      quando: { idade: ['60-69', '70+'] },
      titulo: 'Depois dos 60, sem depender de ninguém',
      frase: 'Depois dos 60, as pernas viram prioridade. E dá pra começar em qualquer idade.',
      video: '' },
    { id: 'agenda-cheia',
      quando: [{ atrapalha: ['tempo'] }, { rotina: ['empresario'] }],
      titulo: 'Agenda cheia, pouco tempo',
      frase: 'Você não precisa de duas horas por dia. Precisa de um plano que caiba na sua semana.',
      video: '' },
    { id: 'corpo-cobrando',
      quando: { incomoda: ['cansaco', 'peso', 'forca'] },
      titulo: 'O corpo começou a cobrar',
      frase: 'Dá pra começar pelas pernas, sem virar a sua rotina de cabeça pra baixo.',
      video: '' },
    { id: 'padrao', padrao: true,
      titulo: 'Quer chegar bem aos próximos 10 anos',
      frase: 'O caminho passa pelas pernas, e começa simples.',
      video: '' }
  ],

  // ============================================================
  // CÓDIGO — vai na mensagem no lugar do resumo das respostas.
  // Formato LV-XXXX, sem letras/números que se confundem (0/O, 1/I/L, 2/Z, 5/S, 8/B).
  // As respostas ficam no evento 'complete' do analytics (props.codigo + props.respostas).
  // Quem atende busca no Supabase:
  //   select created_at, props from analytics.funnel_events
  //   where funnel_id = 'quiz-longevidade' and event_type = 'complete' and props->>'codigo' = 'LV-7K3Q'
  //   order by created_at desc;
  // ============================================================
  codigo: { prefixo: 'LV-', alfabeto: 'ACDEFHJKMNPQRTUVWXY34679', tamanho: 4 },

  // ============================================================
  // WhatsApp — mesmo número do livowa.com/idade. Mensagem curta e humana, só com o código.
  // Assinatura: (state, curto, op, codigo)
  // ============================================================
  whatsapp: {
    number: '5562991774809',
    msgMedico: (s, curto, op, codigo) =>
      `Oi, Dr. Lucca! Fiz o quiz da longevidade. Meu código é ${codigo}.\n` +
      `Queria fazer isso com você acompanhando de perto.`,
    msgPlano: (s, curto, op, codigo) =>
      `Oi! Fiz o quiz da longevidade. Meu código é ${codigo}.\n` +
      `Quero o plano de 4 semanas pra fazer por conta própria.`
  },

  // ============================================================
  // ANALYTICS — mesmo Supabase do quiz antigo. Em localhost só loga no console.
  // Eventos: view, step_view (cada tela), answer, lead_capture, complete, cta_click.
  // complete: valueText = ajuda; props = { durationMs, codigo, vsl, respostas }.
  // ============================================================
  analytics: {
    enabled: true,
    funnelId: 'quiz-longevidade',
    variant: varianteDaUrl(),
    supabaseUrl: 'https://vfzbtnrqbdkfjzhqkiiu.supabase.co',
    supabaseKey: 'sb_publishable_YD3iJdsZlE3gjXM1DdmszA_G9mDNf-K'   // chave pública (anon), a mesma do quiz antigo
  }
};
