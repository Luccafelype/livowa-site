/* livowa.com/gravar — lógica de texto, sem DOM (roda no navegador e no Node para teste).
   - blocos(texto): parágrafos (linha em branco) viram roteiros; uma linha sozinha tipo "Corpo", "Gancho 2",
     "G1", "Hook", "Lead", "CTA", "Fim" ou "#PALAVRA" (com ou sem ":") é o TÍTULO do bloco seguinte.
     Gancho sem título = um roteiro por parágrafo. Corpo/Lead/CTA/Fim/#X juntam os parágrafos sem título
     que vêm depois, até o próximo título (o corpo fica um item só). Cada item traz bStart/bEnd: onde o
     corpo dele está no texto (para as edições de tela voltarem ao texto guardado).
   - telas(corpo, max): o que aparece de cada vez no frase a frase. Regras, nesta ordem:
       1. quebra de linha digitada = tela nova, sempre;
       2. . ? ! … fecham a tela; , ; : e travessão abrem tela nova (pausa natural);
       3. pedaço com menos de 3 palavras junta com o seguinte da mesma frase (o último, com o anterior);
       4. só pedaço que ainda passe de max palavras é quebrado no limite, sem terminar em número ou
          palavra de ligação e sem sobra de 1-2 palavras.
     Espaço não separável (U+00A0) entre duas palavras = "juntar" manual: ali nunca há corte, e um pedaço
     juntado à mão não é quebrado pelo limite.
   - duracao(tela, ppm, próxima): segundos que a tela fica no ar no "passar sozinho".
   - juntar(corpo, telas, k) / dividir(corpo, tela, i): edições manuais, devolvem o corpo novo.
   - editar(texto, item, corpoNovo): devolve o texto inteiro com o corpo trocado. */
(function (root) {
  'use strict';

  const ROTULO = /^\s*(?:#\s*(\S.*?)|((?:gancho|hook|g)\s*\d+|gancho|hook|lead|corpo|body|cta|fim|final))\s*:?\s*$/i;
  const SEGUE = /^(corpo|body|lead|cta|fim|final)$/i; // títulos que juntam os parágrafos seguintes
  const NB = ' ';

  function rotulo(linha) {
    const m = String(linha).match(ROTULO);
    if (!m) return null;
    if (m[1] !== undefined) return { titulo: m[1].trim(), hash: true, segue: true };
    const t = m[2].replace(/\s+/g, ' ').trim();
    return { titulo: t.charAt(0).toUpperCase() + t.slice(1), hash: false, segue: SEGUE.test(t) };
  }

  const norm = (texto) => String(texto || '').replace(/\r/g, '');

  function blocos(texto) {
    const txt = norm(texto);
    const pars = [];
    const re = /\n[ \t ]*\n\s*/g;
    let pos = 0, m;
    while ((m = re.exec(txt))) { pars.push([pos, m.index]); pos = m.index + m[0].length; }
    pars.push([pos, txt.length]);
    const out = [];
    let pend = null, aberto = null;
    for (let [a, b] of pars) {
      while (a < b && /\s/.test(txt[a])) a++;
      while (b > a && /\s/.test(txt[b - 1])) b--;
      if (a >= b) continue;
      let nl = txt.indexOf('\n', a); if (nl < 0 || nl > b) nl = b;
      const r = rotulo(txt.slice(a, nl));
      let bs = r ? nl : a;
      while (bs < b && /\s/.test(txt[bs])) bs++;
      if (r && bs >= b) { pend = r; aberto = null; continue; }
      const tit = r || pend;
      pend = null;
      if (!tit && aberto) { aberto.bEnd = b; aberto.body = txt.slice(aberto.bStart, b); continue; }
      const item = { titulo: tit ? tit.titulo : '', hash: !!(tit && tit.hash), body: txt.slice(bs, b), bStart: bs, bEnd: b };
      out.push(item);
      aberto = tit && tit.segue ? item : null;
    }
    return out;
  }

  const palavras = (t) => (String(t).match(/\S+/g) || []);
  const nPal = (tok) => tok.w.split(NB).filter(Boolean).length; // palavras de um token (juntado à mão = várias)

  // Não terminar pedaço nestas palavras (ligação, artigo, número): elas puxam a seguinte.
  const LIGA = new Set(('a o as os um uma uns umas de da do das dos em na no nas nos ao aos à às por pela pelo pelas pelos ' +
    'para pra com sem sob sobre entre até que e ou nem se mas como mais menos muito muita muitos muitas tão ' +
    'seu sua seus suas meu minha teu tua nosso nossa esse essa este esta isso isto aquele aquela cada todo toda ' +
    'não já é são foi era tem têm vai').split(' '));
  const NUM = /^(\d[\d.,]*%?|zero|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|mil|milhão|milhões|bilhão|bilhões|meio|meia)$/i;
  const limpa = (w) => w.toLowerCase().replace(/^[("“'«]+|[)"”'»,;:.!?…]+$/g, '');
  const prende = (w) => { const c = limpa(w.split(NB).pop()); return LIGA.has(c) || NUM.test(c); };
  const FECHA = /[.!?…]+["'”»)\]]*$/;   // fim de frase
  const PAUSA = /[,;:]["'”»)\]]*$/;       // pausa natural
  const TRACO = /^[—–-]$/;                // travessão solto: pausa antes dele

  // Tokens de uma linha com posição no corpo. Só espaço comum/tab separa (o U+00A0 cola).
  function tokens(body, a, b) {
    const out = [];
    const re = /[^ \t\n]+/g;
    re.lastIndex = a;
    let m;
    while ((m = re.exec(body)) && m.index < b) out.push({ w: m[0], s: m.index, e: m.index + m[0].length });
    return out;
  }

  // Corte por palavras: n pedaços equilibrados; o corte foge de palavra que "prende" a seguinte. Devolve índices.
  function porPalavras(toks, max) {
    const len = toks.length;
    if (len <= max) return [[0, len]];
    const n = Math.ceil(len / max), alvo = len / n, out = [];
    let i = 0;
    while (len - i > max) {
      const ideal = Math.round(i + alvo);
      let melhor = -1, dist = 1e9;
      for (let b = i + Math.min(3, max); b <= Math.min(i + max, len - 1); b++) { // pedaço com 3+ palavras
        if (prende(toks[b - 1].w)) continue;
        const d = Math.abs(b - ideal) + (len - b <= 2 ? 50 : 0);
        if (d < dist) { dist = d; melhor = b; }
      }
      if (melhor < 0) melhor = Math.min(i + max, len - 1);
      out.push([i, melhor]); i = melhor;
    }
    out.push([i, len]);
    if (out.length > 1 && out[out.length - 1][1] - out[out.length - 1][0] <= 2) { const u = out.pop(); out[out.length - 1][1] = u[1]; }
    return out;
  }

  function telas(body, max) {
    body = String(body || '');
    max = Math.max(3, Math.round(+max) || 10);
    const out = [];
    const peca = (ts) => ({ texto: body.slice(ts[0].s, ts[ts.length - 1].e), s: ts[0].s, e: ts[ts.length - 1].e });
    let a = 0;
    while (a <= body.length) {
      let b = body.indexOf('\n', a); if (b < 0) b = body.length;
      const toks = tokens(body, a, b);
      // frases (fecham em . ? ! …) → orações (abrem em , ; : e travessão)
      let frase = [], oracao = [];
      const fechaOracao = () => { if (oracao.length) frase.push(oracao); oracao = []; };
      const fechaFrase = () => {
        fechaOracao();
        if (!frase.length) return;
        // oração com < 3 palavras junta com a seguinte (a última, com a anterior)
        const ps = []; let acc = [];
        frase.forEach((o) => { acc = acc.concat(o); if (acc.reduce((n, t) => n + nPal(t), 0) >= 3) { ps.push(acc); acc = []; } });
        if (acc.length) { if (ps.length) ps[ps.length - 1] = ps[ps.length - 1].concat(acc); else ps.push(acc); }
        ps.forEach((p) => {
          const manual = p.some((t) => t.w.indexOf(NB) >= 0);
          if (manual || p.length <= max) out.push(peca(p));
          else porPalavras(p, max).forEach(([i, j]) => out.push(peca(p.slice(i, j))));
        });
        frase = [];
      };
      toks.forEach((t) => {
        if (TRACO.test(t.w)) fechaOracao();
        oracao.push(t);
        if (FECHA.test(t.w)) fechaFrase();
        else if (PAUSA.test(t.w)) fechaOracao();
      });
      fechaFrase();
      a = b + 1;
    }
    return out;
  }

  // Juntar a tela k com a k+1: o espaço (ou quebra de linha) entre elas vira U+00A0.
  function juntar(body, ts, k) {
    if (!ts[k] || !ts[k + 1]) return body;
    return body.slice(0, ts[k].e) + NB + body.slice(ts[k + 1].s);
  }
  // Dividir a tela antes da palavra i (i ≥ 1): o espaço antes dela vira quebra de linha.
  function dividir(body, t, i) {
    const re = /[ \t ]+/g;
    const trecho = body.slice(t.s, t.e);
    let m, n = 0;
    while ((m = re.exec(trecho))) {
      n++;
      if (n === i) return body.slice(0, t.s + m.index) + '\n' + body.slice(t.s + m.index + m[0].length);
    }
    return body;
  }
  const palavrasDaTela = (t) => t.texto.split(/[ \t ]+/).filter(Boolean);
  function editar(texto, item, corpo) {
    const txt = norm(texto);
    return txt.slice(0, item.bStart) + corpo + txt.slice(item.bEnd);
  }

  // Tempo de leitura de uma tela (s): palavras ÷ ritmo (palavras/min) + pausa curta no fim:
  // 0,6 s depois de . ? ! …; 0,35 s depois de , ; : (ou antes de um travessão na tela seguinte); 0 no corte por limite.
  function duracao(texto, ppm, proximo) {
    const n = palavras(texto).length;
    const t = String(texto || '').trim();
    let pausa = 0;
    if (FECHA.test(t)) pausa = 0.6;
    else if (PAUSA.test(t) || /^[—–-]\s/.test(String(proximo || '').trim())) pausa = 0.35;
    return Math.round((n / (Math.max(30, +ppm || 150) / 60) + pausa) * 100) / 100;
  }

  const api = { rotulo, blocos, telas, juntar, dividir, editar, palavrasDaTela, duracao, palavras: (t) => palavras(t).length };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GravarTexto = api;
})(typeof self !== 'undefined' ? self : this);
