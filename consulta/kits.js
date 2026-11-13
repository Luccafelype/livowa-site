/* Kit de resposta da consulta privada (01/11/2026). Script clássico: define REF e window.KITS (funções puras, sem rede).
   Roda só na página; nada daqui vai para servidor.
   Textos copiados dos dois .md do kit (só ajuste de formato; não reescrever copy aqui sem mudar a fonte):
     livowa-empresa/tarefas/escada-isca/pesquisa/kit-resposta-movimento.md  (braço e pernas, atalhos)
     livowa-empresa/tarefas/escada-isca/pesquisa/kit-resposta-pele.md       (pele: perfis, react, atalhos)
   Cortes do braço = os de interpretaBraco() em consulta/index.html (o .md diz que copiou de lá; conferido em 01/11:
   batem, inclusive mulher × 0,9; a página tem ainda "sexo não informado" × 0,95, que o .md não cita e aqui vale). */

// Vídeo de referência jovem. Enquanto for null, o braço usa o atalho bsemvideo e as pernas avisam que falta gravar.
// Preencher assim: braco: { nome:'Ana', idade:24, roscas:15, video:'(nome do arquivo no celular)' }
//                  pernas: { nome:'Ana', idade:24, tempo:5.1, video:'...' }
const REF = { braco:null, pernas:null };

window.KITS = (function(){
'use strict';
const T = /* gerado dos .md em 01/11 */ {
 "braco": {
  "1": {
   "titulo": "dentro ou acima do esperado",
   "audio": [
    {
     "quando": "",
     "texto": "Oi, {nome}, aqui é o Lucca. Abri o seu teste do braço agora.\nVocê fez {roscas} movimentos em 10 segundos. E a velocidade do seu braço ficou dentro do que a gente espera para quem tem {idade} anos. A idade muscular estimada deu {faixa}.\nDeixa eu te explicar o que esse teste olha. Ele mede a velocidade do cotovelo dobrando e esticando o mais rápido que dá. Isso é potência, força com velocidade. E a potência costuma ser das primeiras coisas que o músculo perde com os anos, antes até da força.\nEntão o seu resultado é uma notícia boa.\nSó uma ressalva honesta: é uma estimativa. O sensor do celular compara o seu movimento com estudos de população. Não substitui uma avaliação.\nVou te mandar agora um vídeo de como fica esse movimento numa pessoa de 20 e poucos anos, pra você comparar. E logo depois um estudo curto sobre por que isso importa lá na frente."
    }
   ],
   "ref": "[vídeo] Esse é o mesmo teste, feito por {ref_nome}, {ref_idade} anos, medido pelo próprio site: {ref_roscas} movimentos em 10 segundos. Repara no cotovelo parado junto do corpo e no braço indo até o fim, nos dois sentidos. Você fez {roscas}. Ficou perto.",
   "estudo": "Por que isso importa: no Rio, 3.889 pessoas de 46 a 75 anos foram acompanhadas por quase 11 anos. Quem tinha mais potência nos braços morreu menos nesse período, e a força pura pesou menos que a potência (Araújo, Mayo Clinic Proceedings, 2025; lá a medida foi num aparelho de remada, não no celular). Estudo de população, que mostra associação. Pra você, serve como ponto de partida pra manter.",
   "convite": "Se você quiser cuidar disso de perto, eu tenho o Programa 90 dias. É uma consulta comigo, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz este mesmo teste e compara com o de hoje. Quer que eu te explique como funciona e o valor?"
  },
  "2": {
   "titulo": "um pouco abaixo do esperado",
   "audio": [
    {
     "quando": "",
     "texto": "Oi, {nome}, aqui é o Lucca. Vi o seu teste do braço.\nVocê fez {roscas} movimentos em 10 segundos. A velocidade ficou um pouco abaixo do que a gente espera para {idade} anos, e a idade muscular estimada deu {faixa}.\nAntes de qualquer coisa: isso é bem comum. Até uns 50 anos a velocidade do braço quase não muda com a idade. O que derruba esse número, na maioria das vezes, é rotina. Muito tempo sentado, pouco treino de força, sono curto. E a velocidade é justamente a parte que some primeiro quando o músculo fica parado.\nTem também o lado do teste. Ele é novo, feito com o celular na mão, e pequenos detalhes mudam o número: segurar o celular frouxo, soltar o cotovelo do corpo, começar devagar. Se quiser, refaz com calma e me manda o código novo.\nVou te mandar um vídeo de como fica esse movimento numa pessoa de 20 e poucos anos. E um estudo curto sobre por que vale cuidar disso agora."
    }
   ],
   "ref": "[vídeo] Esse é o mesmo teste, feito por {ref_nome}, {ref_idade} anos, medido pelo próprio site: {ref_roscas} movimentos em 10 segundos. Você fez {roscas}. Repara no ritmo: a diferença costuma estar mais na velocidade de virar o movimento do que na força.",
   "estudo": "No Rio, 3.889 pessoas de 46 a 75 anos foram acompanhadas por quase 11 anos. Quem tinha mais potência nos braços morreu menos nesse período (Araújo, Mayo Clinic Proceedings, 2025; medido em aparelho de remada). E numa revisão de 16 estudos, fazer força de 30 a 60 minutos por semana apareceu ligado a 10 a 20% menos morte por qualquer causa (Momma, British Journal of Sports Medicine, 2022). São associações de população, e mostram que o assunto tem jeito de ser trabalhado.",
   "convite": "Se fizer sentido olhar isso junto comigo, eu tenho o Programa 90 dias. É uma consulta, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz este teste e vê como ficou. Quer que eu te explique como funciona e o valor?"
  },
  "3": {
   "titulo": "bem abaixo do esperado",
   "audio": [
    {
     "quando": "",
     "texto": "Oi, {nome}, aqui é o Lucca. Abri o seu teste do braço.\nVocê fez {roscas} movimentos em 10 segundos, e a velocidade ficou bem abaixo do que a gente espera para {idade} anos.\nCalma, que isso é um ponto de partida e tem várias explicações possíveis.\nA primeira é o próprio teste. Com o celular na mão, se o punho gira ou o cotovelo sai do lugar, o número cai. Então vale refazer uma vez, com calma: celular firme, cotovelo colado no corpo, braço indo até o fim.\nA segunda é o dia a dia. Dor no ombro ou no punho, cansaço, noite mal dormida, muito tempo parado. Tudo isso pesa.\nSe o número vier parecido de novo, eu gostaria de olhar com calma: força, exames e rotina. Sem susto. É uma estimativa comparada com estudos de população, e serve pra gente saber de onde você parte.\nVou te mandar o vídeo de referência e um estudo curto."
    }
   ],
   "ref": "[vídeo] O mesmo teste, feito por {ref_nome}, {ref_idade} anos, medido pelo próprio site: {ref_roscas} movimentos em 10 segundos. Você fez {roscas}. Se for refazer, copia o jeito: cotovelo parado, celular firme, ida e volta completas.",
   "estudo": "Um estudo no Havaí mediu a força da mão de 6.089 homens de 45 a 68 anos e esperou 25 anos. Quem estava no terço mais fraco teve quase 3 vezes mais chance de andar muito devagar na velhice do que o terço mais forte (Rantanen, JAMA, 1999; força da mão, outro teste do braço). É associação. O que esse estudo mostra é que o braço na meia-idade conversa com a independência lá na frente, e a meia-idade é quando dá pra agir.",
   "convite": "Eu gostaria de entender o que está por trás desse número. É pra isso que serve o Programa 90 dias: uma consulta comigo, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste e compara. Quer que eu te explique como funciona e o valor?"
  },
  "4": {
   "titulo": "pede avaliação",
   "audio": [
    {
     "quando": "menos de 60 anos",
     "texto": "Oi, {nome}, aqui é o Lucca. Vi o seu teste do braço.\nA velocidade veio bem baixa, e na sua idade isso é incomum. Então a primeira coisa que eu penso é na medição.\nCom o celular na mão, se ele escorrega, se o punho gira ou se o movimento começa devagar, o sensor lê menos do que você fez.\nPor isso eu te peço: refaz uma vez, com calma. Celular bem firme na mão, cotovelo colado do lado do corpo, e já começa rápido quando ouvir o bip. Depois me manda o código novo.\nSe vier parecido, a gente conversa e eu te examino com calma, olhando força, ombro, punho e exames. E se no teste você sentiu dor no peito, falta de ar ou tontura, me avisa por aqui, tá?"
    },
    {
     "quando": "60 anos ou mais",
     "texto": "Oi, {nome}, aqui é o Lucca. Abri o seu teste do braço.\nVocê fez {roscas} movimentos em 10 segundos, e a velocidade ficou numa faixa que os estudos com pessoas acima de 65 anos ligam a mais fragilidade. Calma: isso descreve o movimento de hoje, e ninguém vai tirar conclusão de um teste de celular.\nO que eu proponho é olhar com calma. Força, equilíbrio, exames de sangue e os remédios que você toma. Muita coisa pesa nesse número: dor no ombro, sono, cansaço, um período mais parado.\nSe quiser, refaz o teste uma vez, celular firme e cotovelo colado no corpo, e me manda o código novo.\nE se no teste você sentiu dor no peito, falta de ar ou tontura, me avisa por aqui.\nVou te mandar um vídeo de referência e um estudo curto."
    }
   ],
   "ref": "[vídeo] Esse é o mesmo teste feito por {ref_nome}, {ref_idade} anos. Mando só pra você ver o jeito do movimento: cotovelo parado, celular firme, ida e volta completas. A comparação que vale pra você é com você mesmo, no próximo teste.",
   "estudo": "Esse mesmo movimento, com sensor no punho, é usado em hospitais dos Estados Unidos para identificar fragilidade em idosos (Toosizadeh, BMC Geriatrics, 2017). E em Taiwan, entre 13.423 pessoas acima de 65 anos, quem fazia mais flexões do cotovelo em 30 segundos morreu menos em 7 anos (Wu, JAMA Network Open, 2026). Por isso eu prefiro olhar com calma, sem pressa.",
   "convite": "Antes de pensar em qualquer treino, eu queria te ver numa consulta. É assim que começa o Programa 90 dias: a consulta, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste. Quer que eu te explique como funciona e o valor?"
  }
 },
 "pernas": {
  "1": {
   "titulo": "na metade de cima",
   "audio": [
    {
     "quando": "",
     "texto": "Oi, {nome}, aqui é o Lucca. Abri o seu teste das pernas agora.\nVocê levantou da cadeira 5 vezes em {tempo} segundos. Com o seu peso e a sua altura, isso dá {potencia} watts por quilo. Parece complicado, mas é simples: é quanta força com velocidade as suas pernas fazem pra tirar o seu corpo da cadeira.\nE o seu número ficou na metade de cima das pessoas da sua idade e do seu sexo. A potência das suas pernas ficou parecida com a de quem tem {faixa}.\nA régua que eu uso é um estudo com quase 13 mil pessoas que fizeram exatamente esse teste. Então é uma comparação com população, uma estimativa, e não um diagnóstico.\nPotência de perna é o que te levanta da cadeira, te faz subir escada e te segura quando você tropeça. Vale manter.\nTe mando agora um vídeo de referência de uma pessoa de 20 e poucos anos, e um estudo curto."
    }
   ],
   "ref": "[vídeo] Esse é o mesmo teste, feito por {ref_nome}, {ref_idade} anos, medido pelo próprio site: {ref_tempo} segundos. Num levantamento com mais de 55 mil pessoas, quem tem de 20 a 29 anos faz as 5 levantadas em cerca de 5 segundos (homens) e 6 segundos (mulheres). Você fez em {tempo}.",
   "estudo": "Num estudo europeu com 43.605 pessoas a partir de 50 anos, quem fazia as 5 levantadas em 7 segundos morreu menos nos 7 anos seguintes do que quem levava 11 (Núñez-Cortés, Brazilian Journal of Physical Therapy, 2025). É associação de população. Pra você, é motivo pra manter o que está funcionando.",
   "convite": "Se você quiser cuidar disso de perto, eu tenho o Programa 90 dias. É uma consulta comigo, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz este mesmo teste e compara. Quer que eu te explique como funciona e o valor?"
  },
  "2": {
   "titulo": "na média, metade de baixo",
   "audio": [
    {
     "quando": "",
     "texto": "Oi, {nome}, aqui é o Lucca. Vi o seu teste das pernas.\nVocê levantou 5 vezes em {tempo} segundos, o que dá {potencia} watts por quilo. Ficou na média das pessoas da sua idade, um pouco abaixo do meio. A potência das suas pernas ficou parecida com a de quem tem {faixa}.\nDuas coisas que eu quero que você saiba. A primeira: feito em casa, esse teste costuma sair mais lento do que no laboratório. Num estudo de Stanford, a diferença foi de quase 4 segundos. A segunda: a régua que eu uso é de um grupo italiano bem ativo, então ela é exigente.\nAté os 50 anos essa curva quase não cai. O que mais mexe nela é treino de força e rotina, e é aí que dá pra trabalhar.\nÉ uma estimativa, comparada com estudo de população, e serve pra saber de onde você parte.\nTe mando agora o vídeo de referência e um estudo curto."
    }
   ],
   "ref": "[vídeo] O mesmo teste, feito por {ref_nome}, {ref_idade} anos, medido pelo próprio site: {ref_tempo} segundos. Em mais de 55 mil pessoas, quem tem de 20 a 29 anos faz em cerca de 5 segundos (homens) e 6 (mulheres). Você fez em {tempo}. Repara que ela levanta sem pausa lá em cima e sem jogar o tronco.",
   "estudo": "Numa revisão de 16 estudos, fazer força de 30 a 60 minutos por semana apareceu ligado a 10 a 20% menos morte por qualquer causa (Momma, British Journal of Sports Medicine, 2022). E a potência é a qualidade do músculo que a gente mede nesse teste. É associação de população; mostra que esse número tem jeito de ser trabalhado.",
   "convite": "Se fizer sentido olhar isso junto comigo, eu tenho o Programa 90 dias. É uma consulta, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste e vê como ficou. Quer que eu te explique como funciona e o valor?"
  },
  "3": {
   "titulo": "abaixo da média para a idade",
   "audio": [
    {
     "quando": "",
     "texto": "Oi, {nome}, aqui é o Lucca. Abri o seu teste das pernas.\nVocê levantou 5 vezes em {tempo} segundos, o que dá {potencia} watts por quilo. Ficou abaixo da média das pessoas da sua idade. A potência ficou parecida com a de quem tem {faixa}.\nCalma, porque tem bastante coisa aí. Em casa o teste costuma sair mais lento: cadeira fofa, uma pausa em pé, o celular mal posicionado. Vale refazer uma vez com calma, braços cruzados, sem parar lá em cima.\nE tem o dia a dia: dor no joelho ou nas costas, peso, sono, muito tempo sentado. Tudo isso aparece aqui.\nSe vier parecido de novo, eu gostaria de olhar com calma, com exames e um exame físico. É uma estimativa comparada com população. Ela mostra de onde você parte, e a meia-idade é a melhor hora pra mexer nisso.\nTe mando o vídeo de referência e um estudo curto."
    }
   ],
   "ref": "[vídeo] O mesmo teste, feito por {ref_nome}, {ref_idade} anos, medido pelo próprio site: {ref_tempo} segundos. Se for refazer, copia o jeito: braços cruzados no peito, levanta inteiro, senta sem cair, e sem parar entre uma e outra. Você fez em {tempo}.",
   "estudo": "Nos Estados Unidos, 1.122 pessoas acima de 70 anos, todas independentes, fizeram esse teste junto com marcha e equilíbrio. Quatro anos depois, o grupo que tinha ido pior precisou de ajuda no dia a dia de 4 a 5 vezes mais do que o grupo que foi melhor (Guralnik, New England Journal of Medicine, 1995). Na meia-idade o sinal é bem mais fraco: aos 53 anos, num estudo britânico, a diferença quase sumia quando se levava em conta o resto da saúde (Cooper, BMJ, 2014). Ou seja, você está no tempo de agir.",
   "convite": "Eu gostaria de entender o que está por trás desse número. É pra isso que serve o Programa 90 dias: uma consulta comigo, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste e compara. Quer que eu te explique como funciona e o valor?"
  },
  "4": {
   "titulo": "pede avaliação",
   "audio": [
    {
     "quando": "menos de 60 anos",
     "texto": "Oi, {nome}, aqui é o Lucca. Vi o seu teste das pernas.\nVocê levou {tempo} segundos pras 5 levantadas. Esse número veio bem abaixo do que se vê na sua idade, então a primeira coisa que eu penso é na gravação.\nÀs vezes a câmera perde o quadril, a cadeira é baixa ou fofa demais, ou a pessoa para um pouco em pé. Tudo isso aumenta o tempo.\nRefaz uma vez, com calma: cadeira firme encostada na parede, braços cruzados, o celular de lado pegando do ombro ao joelho, e alguém por perto. Depois me manda o código novo.\nSe vier parecido, eu quero te examinar com calma, joelho, quadril, força e exames.\nE se durante o teste você sentiu dor no peito, falta de ar, tontura ou dor forte no joelho, não repete. Me avisa por aqui."
    },
    {
     "quando": "60 anos ou mais",
     "texto": "Oi, {nome}, aqui é o Lucca. Abri o seu teste das pernas.\nVocê levantou 5 vezes em {tempo} segundos, o que dá {potencia} watts por quilo. Esse número fica numa faixa que, em estudos com pessoas acima de 65 anos, aparece junto de mais fragilidade e passo mais lento.\nCalma. Isso descreve o seu movimento de hoje e pede uma coisa só: olhar com cuidado. Joelho, quadril, equilíbrio, exames de sangue e os remédios que você toma. Muita coisa entra nesse número.\nSe quiser, refaz uma vez com a cadeira firme encostada na parede, braços cruzados e alguém do lado.\nSe durante o teste você sentiu dor no peito, falta de ar, tontura ou dor forte no joelho, não repete. Me avisa por aqui.\nTe mando um vídeo de referência e um estudo curto."
    }
   ],
   "ref": "[vídeo] Esse é o mesmo teste feito por {ref_nome}, {ref_idade} anos. Mando só pra você ver o jeito: braços cruzados, levantar inteiro, sentar devagar. A comparação que vale pra você é com você mesmo, no próximo teste.",
   "estudo": "Em pessoas acima de 60 anos, potência de perna nessa faixa apareceu junto de mais fragilidade e de passo mais lento, e nas mulheres também de pior qualidade de vida (Baltasar-Fernandez, Scientific Reports, 2021). É associação de população. Por isso eu quero olhar com calma, sem pressa e sem susto.",
   "convite": "Antes de qualquer treino, eu queria te ver numa consulta. É assim que começa o Programa 90 dias: a consulta, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste. Quer que eu te explique como funciona e o valor?"
  }
 },
 "atalhos": {
  "braco": [
   {
    "id": "refazer",
    "texto": "Antes de eu te explicar, refaz o teste uma vez com calma? No do braço: celular bem firme na mão, cotovelo colado do lado do corpo, e já começa rápido no bip. Depois me manda o código novo que aparece no fim."
   },
   {
    "id": "seguranca",
    "texto": "Se durante o teste você sentiu dor no peito, falta de ar, tontura ou dor forte em alguma articulação, não repete, tá? Me conta aqui o que sentiu."
   },
   {
    "id": "bjovem",
    "texto": "[vídeo] Esse é o mesmo teste do braço, feito por uma pessoa real de 20 e poucos anos e medido pelo próprio site. Repara no cotovelo parado junto do corpo e no braço indo até o fim, nos dois sentidos."
   },
   {
    "id": "bsemvideo",
    "texto": "Ainda não existe número publicado de gente jovem nesse teste do celular. O que os estudos têm é de pessoas de 65 a 76 anos com boa saúde: perto de 12 movimentos em 10 segundos, com sensor no punho. Estou gravando pessoas de 20 a 30 anos fazendo o mesmo teste e te mando quando ficar pronto."
   },
   {
    "id": "bestudo1",
    "texto": "No Rio, 3.889 pessoas de 46 a 75 anos foram acompanhadas por quase 11 anos. Quem tinha mais potência nos braços morreu menos nesse período, e a força pura pesou menos que a potência (Araújo, Mayo Clinic Proceedings, 2025; medido em aparelho de remada). É associação de população. Pra você, é ponto de partida pra manter."
   },
   {
    "id": "bestudo2",
    "texto": "No Rio, 3.889 pessoas de 46 a 75 anos foram acompanhadas por quase 11 anos, e quem tinha mais potência nos braços morreu menos (Araújo, Mayo Clinic Proceedings, 2025). E fazer força de 30 a 60 minutos por semana apareceu ligado a 10 a 20% menos morte por qualquer causa (Momma, British Journal of Sports Medicine, 2022). São associações, e mostram que isso tem jeito de ser trabalhado."
   },
   {
    "id": "bestudo3",
    "texto": "Um estudo no Havaí mediu a força da mão de 6.089 homens de 45 a 68 anos e esperou 25 anos. O terço mais fraco teve quase 3 vezes mais chance de andar muito devagar na velhice (Rantanen, JAMA, 1999). É associação. O braço na meia-idade conversa com a independência lá na frente, e a meia-idade é quando dá pra agir."
   },
   {
    "id": "bestudo4",
    "texto": "Esse mesmo movimento, com sensor no punho, é usado em hospitais dos Estados Unidos para identificar fragilidade em idosos (Toosizadeh, BMC Geriatrics, 2017). Em Taiwan, entre 13.423 pessoas acima de 65, quem fazia mais flexões do cotovelo em 30 segundos morreu menos em 7 anos (Wu, JAMA Network Open, 2026). Por isso eu prefiro olhar com calma."
   },
   {
    "id": "convite",
    "texto": "Se fizer sentido olhar isso junto comigo, eu tenho o Programa 90 dias. É uma consulta comigo, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz este mesmo teste e compara. Quer que eu te explique como funciona e o valor?"
   },
   {
    "id": "avaliar",
    "texto": "Antes de qualquer treino, eu queria te ver numa consulta. É assim que começa o Programa 90 dias: a consulta, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste. Quer que eu te explique como funciona e o valor?"
   },
   {
    "id": "preco",
    "texto": "Te falo, sim. Antes, me conta rapidinho: o que te fez fazer o teste? Quero entender se o Programa faz sentido pra você."
   },
   {
    "id": "pensar",
    "texto": "Claro. Pra gente pensar junto: qual é a sua principal preocupação?"
   },
   {
    "id": "exames",
    "texto": "Os exames são de sangue, pedidos por mim na consulta. Você faz no laboratório que preferir e paga direto lá. Eu leio junto com você no retorno."
   },
   {
    "id": "estimativa",
    "texto": "Esse número é uma estimativa: o teste compara o seu movimento com estudos de milhares de pessoas. Serve pra saber de onde você parte e pra comparar com você mesmo depois. Não substitui uma avaliação."
   }
  ],
  "pernas": [
   {
    "id": "refazerp",
    "texto": "Antes de eu te explicar, refaz o teste uma vez com calma? Cadeira firme encostada na parede, braços cruzados no peito, o celular de lado pegando do ombro ao joelho, e sem parar quando estiver em pé. Tenha alguém por perto. Depois me manda o código novo."
   },
   {
    "id": "seguranca",
    "texto": "Se durante o teste você sentiu dor no peito, falta de ar, tontura ou dor forte em alguma articulação, não repete, tá? Me conta aqui o que sentiu."
   },
   {
    "id": "pjovem",
    "texto": "[vídeo] Esse é o mesmo teste das pernas, feito por uma pessoa real de 20 e poucos anos e medido pelo próprio site. Num levantamento com mais de 55 mil pessoas, quem tem de 20 a 29 anos faz as 5 levantadas em cerca de 5 segundos (homens) e 6 (mulheres)."
   },
   {
    "id": "pestudo1",
    "texto": "Num estudo europeu com 43.605 pessoas a partir de 50 anos, quem fazia as 5 levantadas em 7 segundos morreu menos nos 7 anos seguintes do que quem levava 11 (Núñez-Cortés, 2025). É associação de população. Pra você, é motivo pra manter o que está funcionando."
   },
   {
    "id": "pestudo2",
    "texto": "Numa revisão de 16 estudos, fazer força de 30 a 60 minutos por semana apareceu ligado a 10 a 20% menos morte por qualquer causa (Momma, British Journal of Sports Medicine, 2022). É associação de população, e mostra que esse número tem jeito de ser trabalhado."
   },
   {
    "id": "pestudo3",
    "texto": "Nos EUA, 1.122 pessoas acima de 70 anos, todas independentes, fizeram esse teste. Quatro anos depois, o grupo que foi pior precisou de ajuda no dia a dia de 4 a 5 vezes mais do que o que foi melhor (Guralnik, NEJM, 1995). Na meia-idade o sinal é bem mais fraco (Cooper, BMJ, 2014). Você está no tempo de agir."
   },
   {
    "id": "pestudo4",
    "texto": "Em pessoas acima de 60 anos, potência de perna nessa faixa apareceu junto de mais fragilidade e passo mais lento, e nas mulheres de pior qualidade de vida (Baltasar-Fernandez, Scientific Reports, 2021). É associação de população. Por isso eu quero olhar com calma, sem pressa e sem susto."
   },
   {
    "id": "convite",
    "texto": "Se fizer sentido olhar isso junto comigo, eu tenho o Programa 90 dias. É uma consulta comigo, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz este mesmo teste e compara. Quer que eu te explique como funciona e o valor?"
   },
   {
    "id": "avaliar",
    "texto": "Antes de qualquer treino, eu queria te ver numa consulta. É assim que começa o Programa 90 dias: a consulta, os exames de sangue (você paga direto no laboratório), 3 retornos e o meu WhatsApp durante os 90 dias. No fim a gente refaz o teste. Quer que eu te explique como funciona e o valor?"
   },
   {
    "id": "preco",
    "texto": "Te falo, sim. Antes, me conta rapidinho: o que te fez fazer o teste? Quero entender se o Programa faz sentido pra você."
   },
   {
    "id": "pensar",
    "texto": "Claro. Pra gente pensar junto: qual é a sua principal preocupação?"
   },
   {
    "id": "exames",
    "texto": "Os exames são de sangue, pedidos por mim na consulta. Você faz no laboratório que preferir e paga direto lá. Eu leio junto com você no retorno."
   },
   {
    "id": "estimativa",
    "texto": "Esse número é uma estimativa: o teste compara o seu movimento com estudos de milhares de pessoas. Serve pra saber de onde você parte e pra comparar com você mesmo depois. Não substitui uma avaliação."
   }
  ],
  "pele": [
   {
    "id": "peleoi",
    "quando": "chegou o código, antes do vídeo",
    "texto": "Oi, {nome}! Recebi o seu código. Vou olhar a sua foto com calma e te mando um vídeo explicando o que eu vi, ainda hoje."
   },
   {
    "id": "pelevideo",
    "quando": "junto com o vídeo, perfil A",
    "texto": "{nome}, gravei esse vídeo olhando a sua foto. Spoiler: a sua pele está bem para {idade} anos. O que mais aparece é {achado1}, e isso é leve. Assiste quando puder e me fala o que achou."
   },
   {
    "id": "pelesol",
    "quando": "junto com o vídeo, perfil B",
    "texto": "{nome}, aqui está o vídeo da sua pele. O que mais aparece é {achado1} e {achado2}, e as duas coisas têm muito de sol acumulado. Te explico no vídeo de onde vem cada uma."
   },
   {
    "id": "pelevolume",
    "quando": "junto com o vídeo, perfil C",
    "texto": "{nome}, gravei o vídeo da sua foto. O que mais aparece é {achado1}, e isso é muito mais tempo e peso do que sol. Te mostro onde e por quê."
   },
   {
    "id": "pelemedir",
    "quando": "junto com o vídeo, perfil D",
    "texto": "{nome}, olhei a sua foto com calma e gravei o vídeo. Quase tudo é o esperado para {idade} anos. Uma coisa eu queria te mostrar com mais atenção, que é {achado1}. Não é motivo de susto. É só algo que vale medir."
   },
   {
    "id": "peleponte",
    "quando": "ligar pele a saúde, genérica",
    "texto": "O que aparece por fora conversa com o que os exames medem por dentro. A pele é a parte que dá para ver; o resto a gente só sabe medindo. Você já fez algum exame este ano?"
   },
   {
    "id": "pelepescoco",
    "quando": "pergunta que a foto não responde",
    "texto": "Uma pergunta que a foto não responde, porque o pescoço fica de fora: você nota a pele do pescoço ou da axila mais escura ou aveludada, ou muitas bolinhas de pele ali?"
   },
   {
    "id": "peleprograma",
    "quando": "ela abriu espaço",
    "texto": "São 90 dias comigo: consulta, exames de sangue (pagos direto ao laboratório), um reteste no fim e três retornos, com WhatsApp no meio. Quer que eu te explique como funciona?"
   },
   {
    "id": "pelevalor",
    "quando": "ela perguntou o preço",
    "texto": "O programa sai por {valor}. Antes de você decidir, me conta o que você mais quer resolver, para eu ver se faz sentido para você.",
    "nota": "{valor} em aberto na página de pendências"
   },
   {
    "id": "pelerefazer",
    "quando": "foto ruim",
    "texto": "{nome}, a sua foto ficou {escura / tremida / com muita coisa coberta} e eu prefiro não te falar nada com base nela. Se quiser, refaz em livowa.com/idade com a luz de uma janela na frente do rosto, e me manda o código novo."
   },
   {
    "id": "pelemancha",
    "quando": "mancha que mudou, ou dúvida de lesão",
    "texto": "Essa mancha eu prefiro que você mostre a um dermatologista ao vivo. Mancha que é nova, cresce, muda de cor, coça ou sangra precisa ser vista de perto, e foto não resolve."
   },
   {
    "id": "peleidade",
    "quando": "ela pediu o número",
    "texto": "A ferramenta estimou a sua pele entre {min} e {max} anos. É uma estimativa, com erro de uns 4 a 5 anos para cada lado, e o que mais pesou foi {achado1}."
   },
   {
    "id": "peleapagar",
    "quando": "pediu para apagar a foto",
    "texto": "Pode deixar, apaguei a sua foto agora. Ela ficaria guardada no máximo 7 dias, e só eu via.",
    "nota": "só mandar depois de apagar de fato; ver seção 5"
   },
   {
    "id": "pelevolta",
    "quando": "sem resposta em 48 h",
    "texto": "{nome}, conseguiu ver o vídeo da sua pele? Se ficou alguma dúvida, me fala."
   }
  ]
 },
 "pele": {
  "perfis": {
   "A": {
    "titulo": "poucos achados",
    "msgs": [
     [
      {
       "quando": "",
       "texto": "{nome}, gravei esse vídeo olhando a sua foto. Spoiler: a sua pele está bem para {idade} anos. O que mais aparece é {achado1}, e isso é leve. Assiste quando puder e me fala o que achou."
      }
     ],
     [
      {
       "quando": "",
       "texto": "O que a gente vê no rosto é uma parte pequena da história. Em estudo, parecer mais velho que a idade anda junto com a saúde do resto do corpo, e o seu rosto não mostra isso. Mas a pele não conta como está o açúcar, o colesterol ou o músculo. Isso só exame mostra. Você já fez algum exame este ano?"
      }
     ],
     [
      {
       "quando": "",
       "texto": "Se quiser ir além da foto, eu acompanho pessoas por 90 dias: consulta, exames de sangue (pagos direto ao laboratório), um reteste no fim e três retornos comigo, com WhatsApp no meio. A ideia é saber o que está por dentro e cuidar disso com calma. Quer que eu te explique como funciona e o valor?"
      }
     ]
    ]
   },
   "B": {
    "titulo": "mais sol",
    "msgs": [
     [
      {
       "quando": "",
       "texto": "{nome}, aqui está o vídeo da sua pele. O que mais aparece é {achado1} e {achado2}, e as duas coisas têm muito de sol acumulado. Te explico no vídeo de onde vem cada uma."
      }
     ],
     [
      {
       "quando": "",
       "texto": "O sol é o fator com a melhor prova que existe para pele: num estudo australiano, quem usou protetor todo dia teve 24% menos envelhecimento da pele em quatro anos e meio. É o tipo de coisa que eu gosto, simples e medida. E o que pesa na pele (sol, cigarro, sono, açúcar) costuma pesar no resto também. Me conta: você usa protetor no dia a dia? E fuma ou já fumou?"
      }
     ],
     [
      {
       "quando": "",
       "texto": "No meu programa de 90 dias eu olho o conjunto: a gente faz consulta, pede os exames (você paga direto ao laboratório), repete o teste no fim e você tem três retornos comigo e o WhatsApp. Não é tratamento de pele, é cuidar da saúde como um todo, e a pele entra na conversa. Faz sentido para você agora?"
      }
     ]
    ]
   },
   "C": {
    "titulo": "mais volume e contorno",
    "msgs": [
     [
      {
       "quando": "",
       "texto": "{nome}, gravei o vídeo da sua foto. O que mais aparece é {achado1}, e isso é muito mais tempo e peso do que sol. Te mostro onde e por quê."
      }
     ],
     [
      {
       "quando": "se perdeu peso",
       "texto": "Você me contou que perdeu peso, né? Quem perde bastante, por qualquer método, perde um pouco de volume no rosto também. Em estudo, o que mais pesou foi quanto se perdeu, e não o remédio. O que dá para cuidar é o ritmo e o músculo: perder peso sem perder músculo pede proteína e treino de força, e isso a gente mede."
      },
      {
       "quando": "se não perdeu",
       "texto": "Contorno depende de pele, gordura e osso, e todos mudam com a idade. A parte que a gente consegue acompanhar é o corpo por baixo: músculo, peso e exames. Você treina força hoje?"
      }
     ],
     [
      {
       "quando": "",
       "texto": "Esse é exatamente o tipo de coisa que eu acompanho no programa de 90 dias: consulta, exames (pagos ao laboratório), reteste no fim, três retornos e WhatsApp comigo. A gente olha composição do corpo, força e exames, e ajusta o plano. Quer que eu te explique como funciona e o valor?"
      }
     ]
    ]
   },
   "D": {
    "titulo": "um sinal para medir",
    "msgs": [
     [
      {
       "quando": "",
       "texto": "{nome}, olhei a sua foto com calma e gravei o vídeo. Quase tudo é o esperado para {idade} anos. Uma coisa eu queria te mostrar com mais atenção, que é {achado1}. Não é motivo de susto. É só algo que vale medir."
      }
     ],
     [
      {
       "quando": "amarelado na pálpebra",
       "texto": "Essas bolinhas amareladas na pálpebra às vezes andam junto com o colesterol, até em quem tem o colesterol normal. Pela foto não dá para saber nada; quem responde é um exame de sangue simples."
      },
      {
       "quando": "pescoço, depois do sim dela",
       "texto": "Essa pele mais escura e aveludada no pescoço às vezes acompanha a forma como o corpo lida com o açúcar. Pela foto não dá para dizer; um exame de sangue responde."
      },
      {
       "quando": "acne e pelo com ciclo irregular",
       "texto": "Espinha depois dos 25 com pelo no queixo e ciclo irregular é uma combinação comum e que tem explicação. Vale olhar alguns hormônios."
      }
     ],
     [
      {
       "quando": "",
       "texto": "Esses exames eu peço dentro da consulta, que é o primeiro passo do programa de 90 dias: consulta, exames (pagos direto ao laboratório), reteste no fim, três retornos e WhatsApp comigo. Assim você não fica com a dúvida. Quer que eu te passe como funciona?"
      }
     ]
    ]
   }
  },
  "pescoco": "Uma pergunta que a foto não responde, porque o pescoço fica de fora: você nota a pele do pescoço ou da axila mais escura ou aveludada, ou muitas bolinhas de pele ali?",
  "fotoRuim": "{nome}, a sua foto ficou {escura / tremida / com muita coisa coberta} e eu prefiro não te falar nada com base nela. Se quiser, refaz em livowa.com/idade com a luz de uma janela na frente do rosto, e me manda o código novo.",
  "seguranca": "Qualquer mancha nova, que cresce, muda de cor, coça ou sangra é para mostrar a um médico ao vivo, não para foto."
 }
};

// ---------- utilidades ----------
const temValor = v => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && isNaN(v));
const n1 = (v, d = 1) => temValor(v) && !isNaN(+v) ? (+v).toLocaleString('pt-BR', { maximumFractionDigits:d }) : null;
/** Troca {chave} pelo valor; o que não tiver valor fica entre chaves, à vista. */
function preencher(tpl, vars){
  return String(tpl).replace(/\{([a-z0-9_]+)\}/g, (m, k) => temValor(vars && vars[k]) ? String(vars[k]) : m);
}
/** Pedaços para desenhar: [{falta:boolean, s}] — falta = sobrou entre chaves (sem dado ou para ele escolher). */
function pedacos(tpl, vars){
  const s = preencher(tpl, vars), out = []; let i = 0, m; const re = /\{[^{}\n]+\}/g;
  while ((m = re.exec(s))){ if (m.index > i) out.push({ falta:false, s:s.slice(i, m.index) }); out.push({ falta:true, s:m[0] }); i = m.index + m[0].length; }
  if (i < s.length) out.push({ falta:false, s:s.slice(i) });
  return out;
}
const semVideo = s => s.replace(/^\[vídeo\]\s*/, '');
const temVideo = s => /^\[vídeo\]/.test(s);

// ---------- BRAÇO ----------
/** Mesma conta de interpretaBraco(): v corrigida, réguas por sexo, idade muscular estimada e o texto da faixa. */
function medidaBraco(d){
  d = d || {};
  const curto10 = d.protocolo === '10s';
  const v = d.velMedia ? Math.round(d.velMedia * (curto10 ? 0.97 : 1)) : 0;
  const f = d.sexo === 'f' ? 0.9 : d.sexo === 'n' ? 0.95 : 1;
  const VREF = 1390 * f, ROB = 1099 * f, PRE = 955 * f, FRA = 673 * f;
  let idadeM = null, faixaTxt = null;
  if (v){
    if (v >= VREF) faixaTxt = 'até 50 anos';
    else if (v >= ROB){ idadeM = Math.round(50 + (1 - v / VREF) / 0.008); faixaTxt = idadeM + ' anos'; }
    else if (v >= PRE) faixaTxt = 'acima de 76 anos (ainda robusto)';
    else if (v >= FRA) faixaTxt = 'faixa pré-frágil';
    else faixaTxt = 'faixa frágil';
  }
  // roscas em 10 s: no protocolo de 10 s é o próprio reps; no antigo de 20 s, proporcional à duração
  const roscas = d.reps == null ? null : curto10 ? d.reps : d.dur ? Math.round(d.reps * 10 / Math.max(d.dur, 1)) : null;
  return { curto10, v, f, VREF, ROB, PRE, FRA, idadeM, faixaTxt, roscas };
}
function classificaBraco(d){
  d = d || {};
  const m = medidaBraco(d), idade = temValor(d.idade) ? +d.idade : null, motivos = [];
  if (!m.v) return { teste:'braco', faixa:null, refazer:true, motivo:'O resultado veio sem velocidade gravada.', medida:m, vars:varsBraco(d, m), atalhoRefazer:'refazer' };
  let faixa;
  if (m.v >= m.VREF) faixa = 1;
  else if (m.v >= m.ROB) faixa = idade != null && m.idadeM - idade > 5 ? 2 : 1;
  else if (m.v >= m.FRA) faixa = idade != null && idade < 60 ? 3 : m.v >= m.PRE ? 2 : 3;   // sem idade: régua de 60+
  else faixa = 4;
  if (d.dur != null && d.dur < (m.curto10 ? 7 : 15)) motivos.push(`Medição curta: ${n1(d.dur)} s de ${m.curto10 ? 10 : 20}.`);
  if (m.roscas != null && m.roscas < 5) motivos.push(`Só ${m.roscas} movimentos em 10 s (menos de 5).`);
  if (faixa === 4 && m.roscas != null && m.roscas >= 12) motivos.push(`Velocidade muito baixa com ${m.roscas} movimentos em 10 s: ritmo bom e velocidade baixa não combinam (celular frouxo ou punho girando?).`);
  if (faixa === 4 && idade != null && idade < 60) motivos.push(`Faixa 4 com ${idade} anos é rara nessa idade: primeiro descartar erro de medição.`);
  const titulo = T.braco[faixa].titulo;
  let simples = `Idade muscular estimada: ${m.faixaTxt}`;
  if (idade != null) simples += m.idadeM != null ? ` (tem ${idade})` : `; tem ${idade} anos`;
  if (idade == null) simples += '. Sem idade no resultado: usei a régua de 60 anos ou mais.';
  return { teste:'braco', faixa, titulo, simples, refazer:motivos.length > 0, motivo:motivos.join(' '), medida:m, vars:varsBraco(d, m), atalhoRefazer:'refazer' };
}
function varsBraco(d, m){
  const r = REF.braco || {};
  return { idade:d.idade, roscas:m.roscas, velocidade:m.v ? n1(m.v, 0) : null, faixa:m.faixaTxt, ref_nome:r.nome, ref_idade:r.idade, ref_roscas:r.roscas };
}

// ---------- PERNAS ----------
function classificaPernas(d){
  d = d || {};
  const t = temValor(d.t) ? +d.t : null, rel = temValor(d.rel) ? +d.rel : null, pc = temValor(d.pc) ? +d.pc : null;
  const corte = d.sexo === 'm' ? 2.5 : 1.9, motivos = [];
  const avisoSexo = d.sexo === 'm' || d.sexo === 'f' ? '' : ' Sexo não informado: usei o corte da mulher (1,9 W/kg).';
  let faixa = null;
  if ((rel != null && rel < corte) || (t != null && t > 15)) faixa = 4;
  else if (pc != null) faixa = pc >= 50 ? 1 : pc >= 25 ? 2 : 3;
  if (t != null && t < 3.5) motivos.push(`Tempo de ${n1(t)} s: mais rápido que os 5% mais rápidos de homens de 20 a 24 anos (3,9 s). Provável erro de contagem.`);
  if (d.reps != null && +d.reps !== 5) motivos.push(`Contou ${d.reps} subidas; o cálculo da potência supõe 5.`);
  if (t == null) motivos.push('O resultado veio sem o tempo das 5 levantadas.');
  const vars = { idade:d.idade, tempo:n1(t), potencia:n1(rel), percentil:pc, faixa:d.faixa };
  const r = REF.pernas || {};
  Object.assign(vars, { ref_nome:r.nome, ref_idade:r.idade, ref_tempo:n1(r.tempo) });
  let simples = faixa == null ? 'Sem percentil no resultado: não dá para achar a faixa.' :
    `${n1(t)} s nas 5 levantadas · ${n1(rel) ?? '?'} W/kg · percentil ${pc ?? '?'} na idade${d.faixa ? ` · parecida com quem tem ${d.faixa}` : ''}${d.idade ? ` (tem ${d.idade})` : ''}.`;
  if (faixa === 4) simples += (rel != null && rel < corte ? ` Potência abaixo de ${n1(corte)} W/kg.` : '') + (t != null && t > 15 ? ' Mais de 15 s.' : '');
  simples += avisoSexo;
  return { teste:'pernas', faixa, titulo:faixa ? T.pernas[faixa].titulo : null, simples, refazer:motivos.length > 0, motivo:motivos.join(' '), vars, atalhoRefazer:'refazerp' };
}

/** As 4 mensagens de braço/pernas na ordem do kit. Cada uma: {ordem, rotulo, quando, texto, video, nota}. */
function mensagensMov(teste, faixa, idade){
  const f = T[teste][faixa]; if (!f) return [];
  const out = [];
  const idadeN = temValor(idade) ? +idade : null;
  let audios = f.audio;
  if (audios.length > 1 && idadeN != null) audios = audios.filter(a => idadeN < 60 ? /menos de 60/.test(a.quando) : /60 anos ou mais/.test(a.quando));
  audios.forEach(a => out.push({ ordem:1, rotulo:'Para gravar o áudio', quando:a.quando ? `Texto para ler (${a.quando})` : 'Texto para ler', texto:a.texto, audio:true }));
  const ref = REF[teste];
  if (teste === 'braco' && !ref) out.push({ ordem:2, rotulo:'Referência jovem', quando:'Ainda sem vídeo gravado: versão do atalho /bsemvideo', texto:T.atalhos.braco.find(a => a.id === 'bsemvideo').texto });
  else out.push({ ordem:2, rotulo:'Referência jovem', quando:temVideo(f.ref) ? (ref ? `Anexe o vídeo: ${ref.video || '(vídeo da referência)'}` : 'Mandar com o vídeo') : '', texto:semVideo(f.ref),
    nota: ref ? '' : 'Ainda não há vídeo de referência das pernas gravado (preencher REF.pernas no kits.js). Sem o vídeo, tire a primeira frase antes de mandar.' });
  out.push({ ordem:3, rotulo:'Por que importa', quando:'', texto:f.estudo });
  out.push({ ordem:4, rotulo:'Convite', quando:'Mandar depois que a pessoa responder', texto:f.convite });
  return out;
}

// ---------- PELE ----------
const ORDEM_PELE = ['linhas_testa', 'olhos', 'manchas', 'textura_poros', 'sulco_nasolabial', 'flacidez'];
// no singular, para caber em "o que mais aparece é {achado1} e {achado2}"; ele troca no WhatsApp se quiser
const ACHADO = { linhas_testa:'a linha da testa', olhos:'a linha no canto do olho', manchas:'a mancha na bochecha', textura_poros:'a textura da pele', sulco_nasolabial:'o sulco do nariz à boca', flacidez:'o contorno do rosto' };
const GRUPO = { B:['manchas', 'textura_poros', 'linhas_testa', 'olhos'], C:['sulco_nasolabial', 'flacidez'] };
const PERFIL_TXT = { A:'A · poucos achados', B:'B · mais sol', C:'C · mais volume e contorno', D:'D · um sinal para medir' };
const sinalPor = d => Object.fromEntries((d.sinais || []).map(s => [s.id, s]));
const visivel = s => s && s.visivel !== false && s.nivel != null;
/** Intensidade da região: o maior entre repouso e expressão; null = sem dado ou coberto. */
const intens = s => visivel(s) ? Math.max(+s.nivel || 0, +(s.expressao ?? 0) || 0) : null;
const repouso = s => visivel(s) ? +(s.repouso ?? s.nivel) || 0 : null;
/** Para escolher o achado que "mais aparece": vale o nível parado; a expressão só desempata. */
const peso = s => (repouso(s) || 0) + 0.4 * (+(s && s.expressao) || 0);
const CURTO = { linhas_testa:'testa', olhos:'olhos', manchas:'manchas', textura_poros:'textura', sulco_nasolabial:'sulco', flacidez:'contorno' };
function faixaPele(d){ const m = String(d.faixa || '').match(/(\d+)\D+(\d+)/); return m ? { min:+m[1], max:+m[2] } : { min:null, max:null }; }
function achados(d, perfil){
  const S = sinalPor(d), pri = GRUPO[perfil] || [];
  return ORDEM_PELE.filter(id => (intens(S[id]) || 0) >= 1)
    .sort((a, b) => (pri.includes(b) - pri.includes(a)) || (peso(S[b]) - peso(S[a])) || (ORDEM_PELE.indexOf(a) - ORDEM_PELE.indexOf(b)))
    .map(id => ACHADO[id]);
}
function classificaPele(d, forcar){
  d = d || {};
  const S = sinalPor(d), motivos = [];
  const cobertos = ORDEM_PELE.filter(id => S[id] && !visivel(S[id])).length;
  if (d.qualidade === 'ruim') motivos.push('A análise marcou a foto como ruim.');
  if (cobertos >= 3) motivos.push(`${cobertos} das 6 áreas ficaram cobertas ou sem dar para ver.`);
  if (d.qualidade === 'regular' && d.confianca === 'baixa') motivos.push('Foto regular com confiança baixa.');
  if (!(d.sinais || []).length) motivos.push('O resultado veio sem os sinais da pele.');
  const n = id => repouso(S[id]) || 0, x = id => intens(S[id]) || 0;
  let perfil = x('sulco_nasolabial') >= 2 || x('flacidez') >= 2 ? 'C'
    : x('manchas') >= 2 || x('textura_poros') >= 2 || n('linhas_testa') >= 2 || n('olhos') >= 2 ? 'B' : 'A';
  const calculado = perfil;
  if (forcar && PERFIL_TXT[forcar]) perfil = forcar;
  const { min, max } = faixaPele(d), ach = achados(d, perfil);
  const vars = { idade:d.idade, min, max, achado1:perfil === 'D' ? null : ach[0], achado2:perfil === 'D' ? null : ach[1] };
  const lista = ORDEM_PELE.filter(id => S[id]).map(id => `${CURTO[id]} ${visivel(S[id]) ? x(id) : 'coberto'}`).join(' · ');
  return { teste:'pele', perfil, calculado, titulo:PERFIL_TXT[perfil], simples:`Níveis de 0 a 3: ${lista}.`, refazer:motivos.length > 0, motivo:motivos.join(' '), vars,
    idadeFaixa:regraIdade(d), atalhoRefazer:'pelerefazer' };
}
/** 2.3 do kit da pele: quando falar a faixa de idade no vídeo (regra do .md, NC como norma). Usa o meio da faixa. */
function regraIdade(d){
  const { min, max } = faixaPele(d), idade = temValor(d.idade) ? +d.idade : null;
  if (min == null) return { dizer:false, txt:'Sem faixa de idade no resultado.' };
  if (d.confianca === 'baixa' || d.qualidade === 'regular') return { dizer:false, txt:'Não diga o número no vídeo: confiança baixa ou foto regular. Se ela perguntar, responda por escrito com a faixa e o erro.' };
  // 03/11: a pele2 mostra a "idade aparente do rosto" no topo do resultado (sem pedir a idade real): ela já viu o número
  if (idade == null && d.angulos) return { dizer:true, aparente:true, txt:'Pode dizer como "idade aparente do rosto" (ela já viu na página): é estimativa, erra uns 4 a 5 anos; sem a idade real, não compare.' };
  if (idade == null) return { dizer:false, txt:'Sem a idade real: não dá para comparar. Melhor não dizer o número no vídeo.' };
  const acima = (min + max) / 2 - idade;
  if (min <= idade || acima <= 0) return { dizer:true, txt:`Pode dizer: a faixa (${min} a ${max}) contém a idade real (${idade}) ou fica abaixo. É alívio de verdade.` };
  if (acima <= 5) return { dizer:true, txt:`Pode dizer, junto com o erro de 4 a 5 anos e o achado que mais puxou: a faixa fica até 5 anos acima da idade real (${idade}).` };
  return { dizer:false, txt:`Não diga o número no vídeo: a faixa fica mais de 5 anos acima da idade real (${idade}). Se ela perguntar, responda por escrito com a faixa e o erro.` };
}
const ROT_PELE = ['Junto com o vídeo', 'Depois que a pessoa responder', 'Convite'];
const QUANDO_PELE = ['Mandar junto com o vídeo do react', 'Liga pele a hábito e saúde', 'Só quando ela der abertura'];
function mensagensPele(perfil){
  const p = T.pele.perfis[perfil]; if (!p) return [];
  const out = [];
  p.msgs.forEach((vs, i) => vs.forEach(v => out.push({ ordem:i + 1, rotulo:ROT_PELE[i], quando:[QUANDO_PELE[i], v.quando].filter(Boolean).join(' · '), texto:v.texto })));
  return out;
}

/** Sequência do modo react (roteiro 2.2 do kit da pele), pulando região com intensidade 0 ou sem dado.
    foto = tipo pedido (repouso | sorriso | sobrancelhas). */
function reactPele(d, perfil){
  d = d || {};
  const S = sinalPor(d), x = id => intens(S[id]), passos = [];
  const testa = S.linhas_testa, olhos = S.olhos;
  passos.push({ bloco:'Abertura', foto:'repouso', tempo:'8-10 s', tela:'Foto parada inteira',
    fala:'{nome}, aqui é o Lucca. Olhei a sua foto com calma e vou te mostrar o que eu vi, parte por parte. Não é diagnóstico, é o que dá para ver numa selfie.' });
  if (x('linhas_testa') > 0) passos.push({ bloco:'Testa', foto:'sobrancelhas', tempo:'10-12 s', tela:'Foto com as sobrancelhas levantadas', nivel:x('linhas_testa'),
    fala: repouso(testa) >= 2 ? 'Na testa as linhas já ficam um pouco marcadas mesmo parada. Isso é músculo mais tempo mais sol.'
      : 'Na testa, com a sobrancelha levantada, as linhas aparecem leves e somem quando você relaxa. Isso é o esperado.' });
  if (repouso(testa) >= 2) passos.push({ bloco:'Glabela', foto:'repouso', tempo:'8-10 s', tela:'Foto parada, entre as sobrancelhas', nivel:repouso(testa),
    fala:'Essa linha do meio vem do franzir. Num estudo com alemães ela não apareceu parada antes dos 40.',
    nota:'A análise junta testa e glabela num número só. Se a linha do meio não aparece na foto, pule este cartão.' });
  if (x('olhos') > 0){
    passos.push({ bloco:'Olhos · canto', foto:'sorriso', tempo:'6-8 s', tela:'Foto do sorriso, canto do olho', nivel:x('olhos'),
      fala:'No sorriso aparecem as linhas do canto do olho, que são as primeiras que a gente ganha.' });
    passos.push({ bloco:'Olhos · olheira', foto:'repouso', tempo:'6-8 s', tela:'Foto parada, abaixo do olho', nivel:repouso(olhos),
      fala:'A olheira, aqui embaixo, quase sempre vem de família; num estudo com brasileiros foi o fator que mais pesou.',
      nota:'A análise junta pé de galinha e olheira num número só. Se não houver olheira, pule este cartão.' });
  }
  if (Math.max(x('manchas') || 0, x('textura_poros') || 0) > 0){
    const p = { bloco:'Bochecha: manchas e textura', foto:'repouso', tempo:'12-15 s', tela:'Foto parada, bochechas', nivel:Math.max(x('manchas') || 0, x('textura_poros') || 0),
      fala:'Na bochecha aparecem algumas manchas. Na foto parece mancha de sol, mas pela foto eu não consigo dizer o tipo. O que tem a melhor prova para frear mancha e textura é o protetor todo dia; num estudo com brasileiras a mancha piorou de 30 a 50% menos em um ano.' };
    if ((x('manchas') || 0) >= 2){ p.seguranca = T.pele.seguranca; }
    passos.push(p);
  }
  if (Math.max(x('sulco_nasolabial') || 0, x('flacidez') || 0) > 0) passos.push({ bloco:'Sulco e contorno', foto:'repouso', tempo:'12-15 s', tela:'Foto parada, sulco e borda da mandíbula',
    nivel:Math.max(x('sulco_nasolabial') || 0, x('flacidez') || 0),
    fala:'Esse sulco todo mundo tem. O que muda com os anos é a profundidade, porque o osso e a gordura da bochecha mudam de lugar. E o contorno depende muito mais de tempo e de peso do que de sol.',
    extra:'Se perdeu peso: "quem perde bastante peso perde um pouco de volume no rosto, seja qual for o método."' });
  const ri = regraIdade(d);
  if (faixaPele(d).min != null) passos.push({ bloco:'Faixa de idade (opcional)', foto:'repouso', tempo:'6-8 s', tela:'Foto parada com a faixa', opcional:true, dizer:ri.dizer, nota:ri.txt,
    fala:'A ferramenta estimou a sua pele entre {min} e {max}. É uma estimativa, com erro de uns 4 a 5 anos para mais ou para menos.' });
  passos.push({ bloco:'Fecho', foto:'repouso', tempo:'10-12 s', tela:'Foto parada inteira',
    fala:'Resumindo: o que mais aparece na sua foto é {achado1} e {achado2}, e as duas coisas têm explicação. A pele é a parte que dá para ver. O resto a gente só sabe medindo, e é isso que eu faço no programa. Te mando uma mensagem aqui embaixo.' });
  return passos;
}

// ---------- PELE 2 (02/11): 3 fotos de ângulo (frente, esquerda, direita) e os sinais de acne ----------
// Mesmo kit da pele (perfis, mensagens, atalhos). Muda: as fotos do roteiro (não há sorriso nem sobrancelha levantada,
// há os dois lados), duas falas que citavam essas expressões, e os cartões de espinhas/cravos e marcas de acne.
// Falas novas: kit-resposta-pele.md §2.5 (texto da biblioteca da pele2, pele2/biblioteca.json, com fonte conferida).
const T2 = {
  testaLeve:'Na testa aparecem linhas leves. Isso é o esperado.',
  olhoCanto:'No canto do olho aparecem as linhas, que são as primeiras que a gente ganha.',
  espinhas:'Aqui aparecem {acne_o_que}, mais {acne_onde}. A espinha nasce dentro do poro: o hormônio aumenta o óleo, a pele do poro descama errado e entope, e aí vêm a bactéria da pele e a inflamação.',
  cravo:'Cravo é o poro entupido; quando inflama, vira a bolinha vermelha ou com ponta branca.',
  marcas:'Aqui aparecem marcas de espinhas antigas, mais {marca_onde}. Foto de frente costuma esconder o relevo, então pela tela não dá para saber a profundidade nem o tipo.',
  marcaCor:'Essa marca parece ser de cor, e não de relevo. Esse tipo costuma clarear com os meses.',
  notaD:'Espinha com mais de 25 anos, pelo no queixo e ciclo irregular: use o perfil D (a mensagem da acne). Se ela não contou, pergunte na conversa.',
};
const REG_ACNE_TXT = { testa:'na testa', nariz:'no nariz', bochechas:'nas bochechas', queixo:'no queixo', mandibula:'na mandíbula' };
const listaE = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : (a[0] || '');
const regioesDe = s => !s ? [] : Array.isArray(s.regioes) ? s.regioes : typeof s.regioes === 'string' && s.regioes ? s.regioes.split('+') : [];
/** O que a pele2 grava (props.sinais) → o formato que classificaPele entende; acne fica ao lado. */
function normPele2(d){
  d = d || {};
  const sinais = (d.sinais || []).map(s => ({ ...s, visivel:s.visivel !== false && s.nivel != null, regioes:regioesDe(s) }));
  return { ...d, sinais };
}
function acnePele2(d){
  const S = sinalPor(d), a = S.acne_ativa, m = S.cicatriz_acne;
  const esp = visivel(a) ? +a.nivel || 0 : null, cra = visivel(a) && a.comedoes != null ? +a.comedoes || 0 : null, mar = visivel(m) ? +m.nivel || 0 : null;
  return { esp, cra, mar, tipoMarca:m && m.tipo || null, regAcne:regioesDe(a), regMarca:regioesDe(m), tem:!!(a || m) };
}
function classificaPele2(d, forcar){
  d = normPele2(d);
  const c = classificaPele(d, forcar), A = acnePele2(d), S = sinalPor(d);
  // achados: os 6 de sempre + espinhas, cravos e marcas, pelo grau; o grupo do perfil vem primeiro (igual à pele)
  const pri = GRUPO[c.perfil] || [];
  const itens = ORDEM_PELE.filter(id => (intens(S[id]) || 0) >= 1).map(id => ({ id, p:peso(S[id]), txt:ACHADO[id] }));
  if (A.esp >= 1) itens.push({ id:'acne_ativa', p:A.esp, txt:'as espinhas' });
  if (A.cra >= 1) itens.push({ id:'comedoes', p:A.cra - 0.1, txt:'os cravos' });
  if (A.mar >= 1) itens.push({ id:'cicatriz_acne', p:A.mar - 0.05, txt:'as marcas de espinhas antigas' });
  itens.sort((a, b) => (pri.includes(b.id) - pri.includes(a.id)) || (b.p - a.p));
  if (c.perfil !== 'D'){ c.vars.achado1 = itens[0] ? itens[0].txt : null; c.vars.achado2 = itens[1] ? itens[1].txt : null; }
  const nv = v => v == null ? 'sem dado' : v;
  if (A.tem) c.simples += ` Espinhas ${nv(A.esp)} · cravos ${nv(A.cra)} · marcas ${nv(A.mar)}${A.regAcne.length ? ` (espinhas ${listaE(A.regAcne.map(r => REG_ACNE_TXT[r] || r))})` : ''}.`;
  c.notaAcne = (A.esp || 0) >= 2 || (A.cra || 0) >= 2 ? T2.notaD : '';
  c.teste = 'pele2';
  return c;
}
/** Atalhos da pele, com o link da pele2 no lugar do /idade. */
const atalhosPele2 = T.atalhos.pele.map(a => Object.defineProperty({ ...a }, 'texto', { get:() => a.texto.replace('livowa.com/idade', 'livowa.com/pele2'), enumerable:true }));   // 13/11: segue o texto editado nos Ajustes
/** Roteiro da pele trocado para os 3 ângulos; foto = frente | esquerda | direita. regiao = áreas para o destaque aproximado. */
function reactPele2(d, perfil){
  d = normPele2(d);
  const A = acnePele2(d), FOTO = { 'Olhos · canto':'esquerda', 'Bochecha: manchas e textura':'esquerda', 'Sulco e contorno':'direita' };
  const TELA = { Testa:'Foto de frente, testa', 'Olhos · canto':'Foto de lado, canto do olho', 'Bochecha: manchas e textura':'Foto de lado, bochecha', 'Sulco e contorno':'Foto de lado, sulco e borda da mandíbula' };
  const passos = reactPele(d, perfil).map(p => {
    const q = { ...p, foto:FOTO[p.bloco] || 'frente', tela:TELA[p.bloco] || p.tela.replace('Foto parada', 'Foto de frente'), regiao:REGIAO_PASSO[p.bloco] || null };
    if (p.bloco === 'Testa' && !/mesmo parada/.test(p.fala)) q.fala = T2.testaLeve;
    if (p.bloco === 'Olhos · canto') q.fala = T2.olhoCanto;
    return q;
  });
  const extra = [];
  if ((A.esp || 0) >= 1 || (A.cra || 0) >= 1){
    const oque = (A.esp || 0) >= 1 && (A.cra || 0) >= 1 ? 'espinhas e cravos' : (A.esp || 0) >= 1 ? 'espinhas' : 'cravos';
    extra.push({ bloco:'Espinhas e cravos', foto:'frente', tempo:'12-15 s', tela:'Foto de frente, onde a análise viu as espinhas', nivel:Math.max(A.esp || 0, A.cra || 0),
      fala:T2.espinhas, vars:{ acne_o_que:oque, acne_onde:A.regAcne.length ? listaE(A.regAcne.map(r => REG_ACNE_TXT[r] || r)) : null },
      regiao:A.regAcne.length ? A.regAcne : ['bochecha'], extra:[(A.esp || 0) === 0 ? T2.cravo : '', (A.esp || 0) >= 2 || (A.cra || 0) >= 2 ? T2.notaD : ''].filter(Boolean).join('\n') });
  }
  if ((A.mar || 0) >= 1) extra.push({ bloco:'Marcas de acne', foto:'frente', tempo:'8-10 s', tela:'Foto de frente (o lado ajuda a ver relevo)', nivel:A.mar,
    fala:T2.marcas, vars:{ marca_onde:A.regMarca.length ? listaE(A.regMarca.map(r => REG_ACNE_TXT[r] || r)) : null }, regiao:A.regMarca.length ? A.regMarca : ['bochecha'],
    extra:A.tipoMarca === 'cor' ? T2.marcaCor : '' });
  // espinhas e marcas entram antes do sulco/contorno (ou antes da faixa de idade / do fecho)
  let i = passos.findIndex(p => /^(Sulco|Faixa|Fecho)/.test(p.bloco)); if (i < 0) i = passos.length;
  passos.splice(i, 0, ...extra);
  return passos;
}
// destaque aproximado por cartão (a análise não devolve coordenada; as caixas são da foto de frente recortada no oval)
const REGIAO_PASSO = { Testa:['testa'], Glabela:['glabela'], 'Olhos · canto':['olhos_canto'], 'Olhos · olheira':['olheira'],
  'Bochecha: manchas e textura':['bochecha'], 'Sulco e contorno':['sulco', 'mandibula'] };
// reaproveita o roteiro da pele antiga também com regiao (para o destaque nas fotos de frente)
const reactPeleComRegiao = (d, perfil) => reactPele(d, perfil).map(p => ({ ...p, regiao:REGIAO_PASSO[p.bloco] || null }));

// ---------- PELE: IDADE E VITALIDADE (04/11): livowa.com/pele, funnelId 'pele-idade' ----------
// O resultado é a idade que o rosto aparenta ao lado da idade real, e a vitalidade pelas respostas (cigarro, sol,
// pressão e glicose, movimento, sono). Não é análise de pele: sem perfil de cuidado, sem produto, sem convite (regras 4,
// 5 e 23 do roteiro). As falas do vídeo saem do estoque (roteiros-estoque.json, bloco 'pele-idade') pelo roteiro.js;
// aqui ficam a leitura (classifica), as mensagens curtas e os atalhos. Fonte das frases com número:
// livowa-empresa/tarefas/pele-idade-vitalidade/evidencia.md (conferidas no PubMed em 04/11).
const CASO_PI = { mais_novo:'rosto aparenta menos que a idade', igual:'rosto acompanha a idade', mais_velho:'rosto aparenta um pouco mais que a idade', sem_numero:'sem número na página' };
const FUTURO_PI = { disposicao:'ter a mesma disposição de hoje', parecer:'parecer a idade que você sente', aos70:'chegar bem aos 70, com força e memória',
  entender:'entender o que o seu corpo já está mostrando', cuidar:'cuidar agora, antes que apareça',
  chegar10:'chegar daqui a 10 anos com força e memória', antes:'cuidar da saúde antes de aparecer problema',   // v2 (04/11): chegar10 usa a idade (d.desejo)
  reconhecer:'se reconhecer no espelho', independente:'não depender de ninguém', devagar:'envelhecer mais devagar' };   // 11/11: devagar. v3 (04/11 noite): no lugar de parecer e antes (que seguem para leads antigos)
// v3: o que mais incomoda no espelho (R.espelho), na voz do Lucca para ela; 'nada' = sem dor (não entra no roteiro)
const ESPELHO_PI = { cansada:'a cara de cansada, mesmo quando você dorme', caindo:'o rosto caindo, a bochecha e o bigode chinês', pescoco:'o pescoço e a papada',
  palpebra:'a pálpebra pesando', manchas:'as manchas e as rugas', velho:'parecer mais velha do que é' };   // 11/11: velho; outro = o texto dela
const espelhoPI = (d, r) => r.espelho === 'outro' ? (r.espelho_texto ? `“${r.espelho_texto}”` : null)
  : (r.espelho === 'cansada' || r.espelho === 'velho') && (r.sexo || d.sexo) === 'm' ? ESPELHO_PI[r.espelho].replace(/cansada|velha/, x => x.slice(0, -1) + 'o') : ESPELHO_PI[r.espelho] || null;
const futuroPI = (d, r) => r.futuro === 'chegar10' ? d.desejo || (temValor(d.idade) ? `chegar aos ${+d.idade + 10} com força e memória` : FUTURO_PI.chegar10) : FUTURO_PI[r.futuro] || null;
function casoPeleIdade(d){
  const { min, max } = faixaPele(d), idade = temValor(d.idade) ? +d.idade : null;
  if (CASO_PI[d.caso]) return d.caso;
  if (min == null || idade == null) return 'sem_numero';
  const dif = (min + max) / 2 - idade;
  return dif <= -3 ? 'mais_novo' : dif >= 3 ? 'mais_velho' : 'igual';   // mesmo corte ±3 da página (pele/app.js)
}
function classificaPeleIdade(d){
  d = d || {};
  const { min, max } = faixaPele(d), idade = temValor(d.idade) ? +d.idade : null, r = d.respostas || {};
  const caso = casoPeleIdade(d), motivos = [], conf = { alta:'alta', media:'média', baixa:'baixa' }[d.confianca] || d.confianca || '?';
  // 12/11: o 'complete' do limite (sem_analise) não tem foto: não é foto ruim, é análise que não rodou
  if (d.sem_analise) return { teste:'pele-idade', caso:'sem_numero', perfil:null, semAnalise:true, titulo:'análise automática não rodou (limite do dia)',
    simples:`Sem foto e sem número${idade != null ? ` · tem ${idade}` : ''}: peça a foto no WhatsApp.`, refazer:false, motivo:'', cor:'meh', atalhoRefazer:'pirefazer',
    idadeFaixa:{ dizer:false, aparente:false, txt:'A análise não rodou: no vídeo, nenhum número.' }, vars:{ idade, min:null, max:null, futuro:futuroPI(d, r), espelho:espelhoPI(d, r) } };
  if (d.qualidade === 'ruim') motivos.push('A análise marcou a foto como ruim; a página não mostrou número.');
  if (min == null && !(d.sinais || []).length) motivos.push('O resultado veio sem faixa e sem os sinais da foto.');
  const acima = min != null && idade != null ? (min + max) / 2 - idade : null;
  let idadeFaixa;
  if (min == null) idadeFaixa = { dizer:false, aparente:true, txt:`A página não mostrou número (confiança ${conf}, foto ${d.qualidade || '?'}). No vídeo, nenhum número.` };
  else if (acima != null && acima > 5) idadeFaixa = { dizer:false, aparente:true, txt:`Ela viu a faixa na página, mas o meio ficou mais de 5 anos acima da idade real (${idade}). No vídeo, sem o número (regra 25); se ela perguntar, por escrito, com a faixa e o erro.` };
  else idadeFaixa = { dizer:true, aparente:true, txt:'Pode dizer a faixa (ela já viu na página), sempre como estimativa que erra alguns anos para cada lado.' };
  const simples = min != null
    ? `Rosto ${min} a ${max} anos${idade != null ? ` · tem ${idade}` : ''} · confiança ${conf} · foto ${d.qualidade || '?'}.`
    : `Sem faixa na página${idade != null ? ` · tem ${idade}` : ''} · confiança ${conf} · foto ${d.qualidade || '?'}.`;
  return { teste:'pele-idade', caso, perfil:null, titulo:CASO_PI[caso], simples, refazer:motivos.length > 0, motivo:motivos.join(' '),
    cor:caso === 'mais_novo' || caso === 'igual' ? 'ok' : 'meh', idadeFaixa, atalhoRefazer:'pirefazer',
    vars:{ idade, min, max, futuro:futuroPI(d, r), espelho:espelhoPI(d, r) } };
}
const T_PI = {
  video:'{nome}, gravei esse vídeo olhando a sua foto e as suas respostas. Assiste quando puder e me fala o que achou.',
  videoFuturo:'{nome}, gravei esse vídeo olhando a sua foto e o que você me contou: daqui a 10 anos, você quer {futuro}. Assiste quando puder e me fala o que achou.',
  depois:'O rosto é a parte da idade que dá para ver numa foto. Força, sono, pressão e glicose só se sabe medindo. Isso bate com o que você sente no dia a dia?',
};
function mensagensPeleIdade(c){
  if (c.refazer) return [];
  return [
    { ordem:1, rotulo:'Junto com o vídeo', quando:'Mandar junto com o vídeo do react', texto:c.vars.futuro ? T_PI.videoFuturo : T_PI.video },
    { ordem:2, rotulo:'Depois que a pessoa responder', quando:'Liga o rosto ao que só se mede', texto:T_PI.depois,
      nota:'Sem convite pronto aqui: este teste não fala de programa, valor nem produto.' },
  ];
}
const PI_ATALHOS = ['peleoi', 'pelerefazer', 'pelemancha', 'peleapagar', 'pelevolta'];
const atalhosPeleIdade = PI_ATALHOS.map(id => T.atalhos.pele.find(a => a.id === id)).filter(Boolean).map(a => {
  if (a.id === 'pelerefazer') return { ...a, id:'pirefazer', texto:'{nome}, a sua foto ficou {escura / tremida / com muita coisa coberta} e eu prefiro não te dar um número com base nela. Se quiser, refaz em livowa.com/pele com a luz de uma janela na frente do rosto, e me manda o código novo.' };
  if (a.id === 'pelevolta') return { ...a, id:'pivolta', texto:'{nome}, conseguiu ver o vídeo do seu resultado? Se ficou alguma dúvida, me fala.' };
  return a;
});

// ---------- 12/11 (v3): o que o Lucca manda em cada etapa da pele nova ----------
// Texto de tarefas/venda-pele-conversa/roteiro-v3-1211.md (livowa-empresa), como está; a Caixa só encaixa as variáveis.
// Regras: sem promessa, sem "consulta", sem "grátis", sem preço por escrito, sem prometer vídeo nem prazo.
const V3_PI = {
  audioTexto:'{nome}, recebi o seu teste ({lv}). Nas próximas horas eu te mando a sua análise.',   // 13/11: texto do Lucca ("Confirmar recebimento")
  audioFala:'Oi! Aqui é o doutor Lucca Marques. Recebi o seu teste e eu mesmo vou olhar com calma o seu resultado e o que você respondeu. Enquanto isso, me conta: o que te fez fazer o teste agora?',   // 13/11: o nome decidido; sem "foto" (vale para todos os testes)
  audioDica:'Grave uma vez (uns 15 s, sem nome), deixe salvo e reenvie sempre o mesmo: grave na conversa "Eu" (você mesmo) do WhatsApp Business e encaminhe.',
  depoisVideo:'Pode me responder sim ou não.',   // 13/11 (v4, d-20261113-fio-narrativo-fecho-investimento): a pergunta agora é a do fim do vídeo
  convite:'Que bom, {nome}. Vamos conversar 15 minutos por vídeo: eu entendo melhor o seu caso e te mostro como funciona. Tenho {h1} ou {h2}. Qual fica melhor? Se preferir outro horário, escolha aqui: {link}',
  conviteAgora:'Se ela disser que pode agora: ligue agora ("show rate de agora é 100%", LN pdf 21).',
  preco:'Depende do que você precisa, por isso eu prefiro te mostrar na conversa. São 15 minutos e você decide com calma. Tenho {h1} ou {h2}.',
  nutrir:'Tudo bem, {nome}. Você já tem a sua análise. Se quiser ver mais um pedaço do quadro, tem um teste de 2 minutos {tema}: {teste}. Depois eu te conto o que ele mostrou.',
  naoQuis:'Obrigado por me contar, {nome}. A análise é sua. Se um dia quiser retomar, é só me chamar.',
  toque1:'{nome}, conseguiu ver a sua análise?',
  toque3:'Áudio curto seu: retome 1 coisa da análise e repita a pergunta.',
  toque7:'{nome}, você ainda quer {desejo}?',
  // 13/11 (CRM, botão "Pedir a foto" de quem bateu no limite da análise): texto do Claude, sem promessa de vídeo nem prazo
  pedirFoto:'{nome}, recebi o seu teste ({lv}). A análise automática da foto não rodou. Pode me mandar aqui uma foto do seu rosto, de frente, com a luz de uma janela?',
  // 13/11 (CRM v3, lembretes da conversa: véspera e 1 h antes, LN pdf 35-36, à mão). Texto do Claude; o Lucca pode trocar.
  lembreteVespera:'{nome}, passando para lembrar da nossa conversa {quando}. Se precisar mudar o horário, me avisa aqui.',   // {quando} = "amanhã às 19:00"
  lembreteHora:'{nome}, daqui a pouco, às {hora}, é a nossa conversa. Até já!',
  // não compareceu: remarcar na hora (LN pdf 36: nunca "a gente se fala depois")
  faltou:'{nome}, não consegui falar com você no horário de hoje. Se ainda fizer sentido, escolha outro horário aqui: {link}',
};
// Agora não → o próximo teste pelo desejo dela (v3, proposta do Claude). 'entender' não está no mapa da v3: vai ao quiz.
const NUTRIR_PI = { braco:{ teste:'livowa.com/braco', tema:'sobre a sua idade muscular' }, longevidade:{ teste:'livowa.com/longevidade', tema:'sobre o que pesa nos seus próximos 10 anos' } };
const NUTRIR_DE = { chegar10:'braco', aos70:'braco', independente:'braco', disposicao:'braco', reconhecer:'longevidade', parecer:'longevidade', devagar:'longevidade', cuidar:'longevidade', antes:'longevidade', entender:'longevidade' };
const nutrirPI = d => NUTRIR_PI[NUTRIR_DE[(d && d.respostas || {}).futuro] || 'longevidade'];
// A conversa de 15 min (v3, etapa 4; os minutos 1-12 e o "não" são do v2, B1 e B4). Só para ele ler; nada disto vai por escrito.
const CONVERSA_PI = [
  { min:'antes', titulo:'Abra a ficha dela', itens:['Desejo de 10 anos: {desejo}', 'O que mais incomoda: {incomodo}', 'Idade: {idade}', 'Resposta ao áudio: {resposta}'] },
  { min:'0-1', titulo:'O combinado', fala:'Obrigado por separar esse tempo, {nome}. Um combinado antes: eu vou te fazer umas perguntas e te mostrar como eu acompanho. Se não fizer sentido para você, me diz não, sem problema nenhum. Se fizer, a gente já decide hoje. Pode ser?' },
  { min:'1-4', titulo:'Por que agora', fala:'Você me disse que daqui a 10 anos quer {desejo}. Por que isso importa agora?', itens:['O que te fez fazer o teste agora?', 'Há quanto tempo isso te incomoda?'] },
  { min:'4-6', titulo:'Onde pesa no dia', fala:'Hoje, onde isso aparece no seu dia: na disposição, no sono, no espelho de manhã?', itens:['E os exames: quando você mediu pressão e glicose pela última vez?'] },
  { min:'6-8', titulo:'O que já tentou', fala:'O que você já tentou para {desejo}? Por quanto tempo? Como foi? E além disso, o que mais?', nota:'Depois tire a culpa: "Pelo que você contou, não faltou esforço. Faltou olhar o conjunto."' },
  { min:'8-9', titulo:'Resumo', fala:'Deixa eu ver se entendi: você quer {desejo}, já tentou {x e y}, e o que mais pesa é {incomodo}. É isso?', nota:'Sem o "é isso", não seguir. Depois: "Então cuidar disso agora é prioridade para você. É justo dizer isso?"' },
  { min:'9-12', titulo:'Como eu acompanho', fala:'Posso te contar como eu acompanho?', nota:'Até 3 minutos, ligando cada parte ao que ela contou. Sem promessa: "a ideia é você saber o que pesa por dentro e ter alguém olhando isso com você, todo mês".' },
  // 12/11 19h40 (d-20261112-oferta-online-1000-ancora-12mil): o valor do online NÃO está decidido (lacuna destacada para ele
  // preencher); a âncora presencial de Goiânia vale para todos na conversa (âncora real, MM pdf 88); garantia em decisão
  { min:'12-14', titulo:'A oferta', itens:[
    'Âncora, para todos, só falada por você (nunca por escrito): "O mais completo é o presencial, aqui em Goiânia: eu vou até a sua casa e organizo toda a sua saúde comigo. Fica em R$ 12 mil por mês." Pausa.',
    'Online: {valor do online: ainda não decidido}: acompanhamento e, se for indicado, reposição hormonal; exames e medicação ela paga direto aos fornecedores, nunca a você.',
    'Pedir: "Você prefere começar esta semana ou na próxima?"',
    'Garantia e duração: em decisão (cartão da oferta na Central).',
    'Objeção ao valor: "Qual é a sua principal preocupação?" Nunca baixar o preço.',
    'Downsell: o app anual, sem o acompanhamento ao vivo (valor exato e prescrição pelo app ainda não decididos).'] },
  { min:'14-15', titulo:'Fechar', itens:[
    'Sim: "Antes de eu te mandar o próximo passo: você quer fazer só você, ou você e mais alguém da sua casa?" (a segunda pessoa sai por 60% do valor) e o próximo passo em 48 h.',
    'Não: "Sem problema nenhum. Só para eu aprender: o que pesou?" e depois "Você já tem a análise e pode seguir com ela. Posso te chamar no dia {data}? Fica bom?"',
    '"Vou pensar": "Claro. Para a gente pensar junto: qual é a sua principal preocupação?"',
    '"Preciso falar com meu marido / minha esposa": "Faz sentido. Ele já sabe que isso te incomoda? E concorda que vale cuidar?"'] },
];

const NOME_TESTE = { braco:'Idade muscular (braço)', pernas:'Pernas', pele:'Pele', pele2:'Pele 2', 'pele-idade':'Pele: idade e vitalidade' };

// ---------- 13/11 (regra do Lucca: toda frase que o CRM copia ou mostra é editável nos Ajustes; nenhuma fica só no código) ----------
// Cada texto daqui vira uma chave (braco_1_audio_0, at_braco_refazer, pele_A_0_0, p2_cravo, pi_video, conv_2_fala…) com o
// teste dono (o funil). O CRM liga KITS.ligar((chave, padrão, dono) => texto) aos Ajustes (crm_config, escopo teste:<dono>);
// sem isso, vale o texto de hoje. As frases da v3 (V3_PI) e o combinado já têm chave própria no CRM.
const TEXTOS = [], POR_CHAVE = new Map();
let ler = (chave, padrao) => padrao;
const chaveOk = c => { c = String(c).replace(/[^A-Za-z0-9_]/g, '_'); if (c.length <= 40) return c;
  let h = 5381; for (const ch of c) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return c.slice(0, 34) + '_' + h.toString(36).slice(0, 5); };
function editavel(obj, prop, chave, dono, grupo, rotulo, extra){   // extra.porTeste (13/11 v4): texto comum que um teste pode ter o seu
  const padrao = obj && obj[prop]; if (typeof padrao !== 'string') return;
  chave = chaveOk(chave); if (POR_CHAVE.has(chave)) return;
  const t = { chave, dono, grupo, rotulo, padrao, ...(extra || {}) }; TEXTOS.push(t); POR_CHAVE.set(chave, t);
  Object.defineProperty(obj, prop, { get(){ return ler(chave, padrao, dono); }, enumerable:true, configurable:true });
}
for (const [t, dono] of [['braco', 'teste-braco'], ['pernas', 'teste-pernas']]) for (const [f, x] of Object.entries(T[t])){
  const g = `Faixa ${f} · ${x.titulo}`;
  editavel(x, 'titulo', `${t}_${f}_titulo`, dono, g, 'Nome da faixa');
  // 13/11 (d-20261113-narrativa-analise-todas-iscas): o áudio e o convite da faixa saíram de uso (vídeo em 6 blocos e o convite do
  // passo a passo, editável em "convite" no teste): não vão aos Ajustes, para nenhuma frase morta aparecer lá
  editavel(x, 'ref', `${t}_${f}_ref`, dono, g, 'Referência jovem');
  editavel(x, 'estudo', `${t}_${f}_estudo`, dono, g, 'Por que importa');
}
for (const [t, dono] of [['braco', 'teste-braco'], ['pernas', 'teste-pernas'], ['pele', 'pele']]) T.atalhos[t].forEach(a => {
  editavel(a, 'texto', `at_${t}_${a.id}`, dono, 'Atalhos do WhatsApp', '/' + a.id + (a.quando ? ` · ${a.quando}` : ''));
  editavel(a, 'nota', `at_${t}_${a.id}_nota`, dono, 'Atalhos do WhatsApp', '/' + a.id + ' · nota');
});
for (const [p, x] of Object.entries(T.pele.perfis)){
  editavel(x, 'titulo', `pele_${p}_titulo`, 'pele', `Perfil ${p}`, 'Nome do perfil');
  x.msgs.forEach((vs, i) => vs.forEach((m, j) => editavel(m, 'texto', `pele_${p}_${i}_${j}`, 'pele', `Perfil ${p}`, (ROT_PELE[i] || 'Mensagem') + (vs.length > 1 ? ` (${j + 1})` : '') + (m.quando ? ` · ${m.quando}` : ''))));
}
for (const [c, r] of [['pescoco', 'Pergunta do pescoço'], ['fotoRuim', 'Foto ruim'], ['seguranca', 'Segurança']]) editavel(T.pele, c, `pele_${c}`, 'pele', 'Outras', r);
for (const c of Object.keys(T2)) editavel(T2, c, `p2_${c}`, 'pele2', 'Frases do react', c);
for (const [c, r] of [['video', 'Junto com o vídeo'], ['videoFuturo', 'Junto com o vídeo (com o desejo)'], ['depois', 'Depois que ela responder']]) editavel(T_PI, c, `pi_${c}`, 'pele-idade', 'Mensagens do resultado', r);
atalhosPeleIdade.forEach(a => { if (!T.atalhos.pele.includes(a)) editavel(a, 'texto', `at_pi_${a.id}`, 'pele-idade', 'Atalhos do WhatsApp', '/' + a.id); });
CONVERSA_PI.forEach((x, i) => {
  const r = `${x.min === 'antes' ? 'antes' : x.min + ' min'} · ${x.titulo}`;
  if (x.titulo !== 'O combinado') editavel(x, 'fala', `conv_${i}_fala`, 'pele-idade', 'A conversa de 15 min', r);
  editavel(x, 'nota', `conv_${i}_nota`, 'pele-idade', 'A conversa de 15 min', r + ' · nota');
  (x.itens || []).forEach((t, j) => editavel(x.itens, j, `conv_${i}_item_${j}`, 'pele-idade', 'A conversa de 15 min', `${r} · item ${j + 1}`));
});

return {
  T, T2, REF, preencher, pedacos, NOME_TESTE,
  textos:TEXTOS, texto:c => POR_CHAVE.get(c), ligar:f => { ler = f; }, editavel,
  braco:{ medida:medidaBraco, classifica:classificaBraco, mensagens:(c) => mensagensMov('braco', c.faixa, c.vars.idade), atalhos:T.atalhos.braco },
  pernas:{ classifica:classificaPernas, mensagens:(c) => mensagensMov('pernas', c.faixa, c.vars.idade), atalhos:T.atalhos.pernas },
  pele:{ classifica:classificaPele, mensagens:(c) => mensagensPele(c.perfil), react:reactPeleComRegiao, atalhos:T.atalhos.pele, perfis:PERFIL_TXT },
  pele2:{ classifica:classificaPele2, mensagens:(c) => mensagensPele(c.perfil), react:reactPele2, atalhos:atalhosPele2, perfis:PERFIL_TXT, norm:normPele2, acne:d => acnePele2(normPele2(d)) },
  // react: os passos vêm do roteiro do estoque (ROTEIRO.passosReact, em roteiro.js), para a fala ser uma só
  // 13/11 (d-20261113-narrativa-analise-todas-iscas): os quizzes ganham o mesmo passo a passo (sem mensagens próprias)
  'quiz-longevidade':{ classifica:() => ({ teste:'quiz-longevidade', faixa:null, titulo:'Quiz da longevidade', simples:'As respostas dela', refazer:false, cor:'ok', vars:{} }), mensagens:() => [], atalhos:[] },
  'quiz-emagrecimento':{ classifica:() => ({ teste:'quiz-emagrecimento', faixa:null, titulo:'Teste do emagrecimento', simples:'As respostas dela', refazer:false, cor:'ok', vars:{} }), mensagens:() => [], atalhos:[] },
  'pele-idade':{ classifica:classificaPeleIdade, mensagens:mensagensPeleIdade, atalhos:atalhosPeleIdade, caso:CASO_PI, futuro:FUTURO_PI, v3:V3_PI, nutrir:nutrirPI, conversa:CONVERSA_PI },
};
})();
