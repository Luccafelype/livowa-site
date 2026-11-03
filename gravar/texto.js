/* livowa.com/gravar — lógica de texto, sem DOM (roda no navegador e no Node para teste).
   - blocos(texto): parágrafos (linha em branco) viram roteiros; uma linha sozinha tipo "Corpo", "Gancho 2",
     "G1", "Hook", "Lead", "CTA", "Fim" ou "#PALAVRA" (com ou sem ":") é o TÍTULO do bloco seguinte.
     Gancho sem título = um roteiro por parágrafo. Corpo/Lead/CTA/Fim/#X juntam os parágrafos sem título
     que vêm depois, até o próximo título (o corpo fica um item só). Cada item traz bStart/bEnd: onde o
     corpo dele está no texto (para as edições de tela voltarem ao texto guardado).
   - telas(corpo, max): o que aparece de cada vez no frase a frase. Regras, nesta ordem:
       1. quebra de linha digitada = tela nova, sempre;
       2. . ? ! … fecham a tela;
       3. dentro de cada frase, n = ceil(palavras/max) telas de tamanho parecido (programação dinâmica:
          (palavras − alvo)², bônus para quebrar em , ; : ou travessão, penalidade para terminar em número ou
          palavra de ligação; maior − menor ≤ 3 quando possível; teto = max, +1 se a tela termina numa pausa).
          Vírgula sozinha não abre tela.
     Espaço não separável (U+00A0) = "juntar" manual: a frase que o contém vira uma tela só.
   - duracao(tela, ppm, próxima): segundos que a tela fica no ar no "passar sozinho".
   - juntar(corpo, telas, k) / dividir(corpo, telas, tela, i): edições manuais; fixam as outras quebras da
     linha (viram quebra de linha) para o equilíbrio não desfazer a edição; devolvem o corpo novo.
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

  // Telas equilibradas (02/11, pedido do Lucca: "umas com muito texto, outras com pouco").
  // Dentro de cada frase: n = ceil(palavras/max) telas de tamanho parecido, por programação dinâmica:
  // custo = (palavras − alvo)², alvo = palavras/n; bônus para quebrar logo depois de , ; : ou antes de travessão
  // quando o desvio é de até 2 palavras; penalidade para terminar em número ou palavra de ligação. Tenta primeiro
  // com desvio máximo de 1,5 palavra (maior − menor ≤ 3); se não houver jeito, sem limite.
  function equilibra(toks, max) {
    const w = toks.map(nPal);
    const W = w.reduce((a, b) => a + b, 0);
    const n = Math.ceil(W / max);
    if (n <= 1 || toks.length < 2) return [[0, toks.length]];
    const alvo = W / n;
    const pre = [0]; w.forEach((x, i) => pre.push(pre[i] + x));
    const custo = (a, b, ultimo, estrito) => { // tela = toks[a..b)
      const p = pre[b] - pre[a], d = Math.abs(p - alvo);
      let c = d * d;
      const fim = toks[b - 1].w;
      const pausa = PAUSA.test(fim) || (b < toks.length && TRACO.test(toks[b].w));
      if (!ultimo && pausa && d <= 2) c -= 5;
      if (!ultimo && prende(fim)) { if (estrito) return { c, d: Infinity }; c += 6; }
      // teto: o máximo; +1 só quando a tela termina numa pausa natural (vírgula etc.)
      if (p > max + ((pausa || ultimo && FECHA.test(fim)) ? 1 : 0)) return { c, d: Infinity };
      return { c, d };
    };
    // 1º sem terminar em número/ligação e com maior − menor ≤ 3; depois aceitando (com penalidade); depois folgando.
    for (const [lim, estrito] of [[1.5, true], [1.5, false], [3, false], [1e9, false]]) {
      // f[m][j]: melhor custo para j tokens em m telas
      const f = Array.from({ length: n + 1 }, () => new Array(toks.length + 1).fill(Infinity));
      const de = Array.from({ length: n + 1 }, () => new Array(toks.length + 1).fill(-1));
      f[0][0] = 0;
      for (let m = 1; m <= n; m++) {
        for (let j = 1; j <= toks.length; j++) {
          for (let a = m - 1; a < j; a++) {
            if (f[m - 1][a] === Infinity) continue;
            const { c, d } = custo(a, j, m === n, estrito);
            if (d > lim) continue;
            if (f[m - 1][a] + c < f[m][j]) { f[m][j] = f[m - 1][a] + c; de[m][j] = a; }
          }
        }
      }
      if (f[n][toks.length] === Infinity) continue;
      const cortes = []; let j = toks.length;
      for (let m = n; m >= 1; m--) { const a = de[m][j]; cortes.unshift([a, j]); j = a; }
      return cortes;
    }
    return [[0, toks.length]];
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
      let frase = [];
      const fecha = () => {
        if (!frase.length) return;
        // juntado à mão (U+00A0) = uma tela só; senão, telas equilibradas
        if (frase.some((t) => t.w.indexOf(NB) >= 0)) out.push(peca(frase));
        else equilibra(frase, max).forEach(([i, j]) => out.push(peca(frase.slice(i, j))));
        frase = [];
      };
      toks.forEach((t) => { frase.push(t); if (FECHA.test(t.w)) fecha(); }); // ponto final sempre fecha a tela
      fecha();
      a = b + 1;
    }
    return out;
  }

  // Edição manual: reconstrói o corpo a partir das telas atuais. Nas linhas tocadas, as quebras automáticas
  // viram quebras de linha digitadas (ficam fixas), para a edição não ser desfeita pelo equilíbrio.
  const linhaDe = (body, pos) => (body.slice(0, pos).match(/\n/g) || []).length;
  function reconstroi(body, ts, linhas, sepDe, textoDe) {
    let r = body.slice(0, ts[0].s);
    ts.forEach((t, i) => {
      r += textoDe ? textoDe(i, body.slice(t.s, t.e)) : body.slice(t.s, t.e);
      if (i === ts.length - 1) { r += body.slice(t.e); return; }
      const sep = body.slice(t.e, ts[i + 1].s);
      const fixo = sepDe && sepDe(i, sep);
      if (fixo !== undefined && fixo !== null) r += fixo;
      else if (sep.indexOf('\n') < 0 && linhas.has(linhaDe(body, t.s))) r += '\n';
      else r += sep;
    });
    return r;
  }
  // Juntar a tela k com a k+1: o espaço (ou quebra) entre elas vira U+00A0 (nunca corta ali; vira uma tela só).
  function juntar(body, ts, k) {
    if (!ts[k] || !ts[k + 1]) return body;
    const linhas = new Set([linhaDe(body, ts[k].s), linhaDe(body, ts[k + 1].s)]);
    return reconstroi(body, ts, linhas, (i) => (i === k ? NB : undefined));
  }
  // Dividir a tela t antes da palavra i (i ≥ 1): o espaço antes dela vira quebra de linha.
  function dividir(body, ts, t, i) {
    if (Array.isArray(ts) === false) { i = t; t = ts; ts = [t]; } // compatível com dividir(body, tela, i)
    const k = ts.indexOf(t);
    const linhas = new Set([linhaDe(body, t.s)]);
    return reconstroi(body, ts, linhas, null, (j, txt) => {
      if (j !== k) return txt;
      const re = /[ \t ]+/g; let m, n = 0;
      while ((m = re.exec(txt))) { n++; if (n === i) return txt.slice(0, m.index) + '\n' + txt.slice(m.index + m[0].length); }
      return txt;
    });
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

  // Sequência do "passar sozinho": no fim da última tela de um roteiro, segue para o próximo quando ele é um
  // Gancho (Gancho, Gancho 2, G1, Hook) ou quando "Gravar ganchos em sequência" está ligado; entre um e outro,
  // pausa de 1,5 s. Devolve as telas na ordem, com tempos, e as pausas.
  const ehGancho = (b) => /^(gancho|hook|g\s*\d)/i.test((b && b.titulo) || '');
  const continua = (bl, i, seq) => i < bl.length - 1 && (!!seq || ehGancho(bl[i]));
  const PAUSA_ENTRE = 1.5;
  function sequencia(bl, i0, max, ppm, seq) {
    const out = [];
    for (let i = i0; i < bl.length; i++) {
      const ts = telas(bl[i].body, max).map((t) => t.texto);
      ts.forEach((t, k) => out.push({ roteiro: i, titulo: bl[i].titulo, tela: k + 1, de: ts.length, texto: t, dur: duracao(t, ppm, ts[k + 1]) }));
      if (!continua(bl, i, seq)) break;
      out.push({ pausa: PAUSA_ENTRE });
    }
    return out;
  }

  const api = { rotulo, blocos, telas, juntar, dividir, editar, palavrasDaTela, duracao, ehGancho, continua, sequencia, PAUSA_ENTRE, palavras: (t) => palavras(t).length };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GravarTexto = api;
})(typeof self !== 'undefined' ? self : this);
