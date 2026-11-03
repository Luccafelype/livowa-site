/* livowa.com/gravar — lógica de texto, sem DOM (roda no navegador e no Node para teste).
   - blocos(texto): parágrafos (linha em branco) viram roteiros; uma linha sozinha tipo "Corpo", "Gancho 2",
     "G1", "Hook", "Lead", "CTA", "Fim" ou "#PALAVRA" (com ou sem ":") é o TÍTULO do bloco seguinte.
     Gancho sem título = um roteiro por parágrafo. Corpo/Lead/CTA/Fim/#X juntam os parágrafos sem título
     que vêm depois, até o próximo título (o corpo fica um item só).
   - frases(corpo): quebra de linha ou . ? ! …
   - pedacos(frase, max): frase maior que max palavras → pedaços: primeiro em , ; : ou travessão; se ainda
     passar, no limite de palavras, sem terminar pedaço em número ou palavra de ligação; sobra de 1-2
     palavras junta ao pedaço anterior.
   - telas(corpo, max): frases → pedaços. */
(function (root) {
  'use strict';

  const ROTULO = /^\s*(?:#\s*(\S.*?)|((?:gancho|hook|g)\s*\d+|gancho|hook|lead|corpo|body|cta|fim|final))\s*:?\s*$/i;
  const SEGUE = /^(corpo|body|lead|cta|fim|final)$/i; // títulos que juntam os parágrafos seguintes

  function rotulo(linha) {
    const m = String(linha).match(ROTULO);
    if (!m) return null;
    if (m[1] !== undefined) return { titulo: m[1].trim(), hash: true, segue: true };
    const t = m[2].replace(/\s+/g, ' ').trim();
    return { titulo: t.charAt(0).toUpperCase() + t.slice(1), hash: false, segue: SEGUE.test(t) };
  }

  function blocos(texto) {
    const pars = String(texto || '').replace(/\r/g, '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const out = [];
    let pend = null;   // título sozinho esperando o bloco seguinte
    let aberto = null; // item de Corpo/Lead/… que ainda junta parágrafos sem título
    for (const p of pars) {
      const linhas = p.split('\n');
      const r = rotulo(linhas[0]);
      const body = (r ? linhas.slice(1) : linhas).join('\n').trim();
      if (r && !body) { pend = r; aberto = null; continue; }
      const tit = r || pend;
      pend = null;
      if (!tit && aberto) { aberto.body += '\n' + body; continue; }
      const item = { titulo: tit ? tit.titulo : '', hash: !!(tit && tit.hash), body };
      out.push(item);
      aberto = tit && tit.segue ? item : null;
    }
    return out;
  }

  const palavras = (t) => (String(t).match(/\S+/g) || []);

  function frases(body) {
    const out = [];
    String(body || '').split(/\n+/).forEach((l) => {
      (l.match(/[^.!?…]+(?:[.!?…]+["'”»)\]]*|$)/g) || []).forEach((x) => { x = x.trim(); if (x) out.push(x); });
    });
    return out;
  }

  // Não terminar pedaço nestas palavras (ligação, artigo, número): elas puxam a seguinte.
  const LIGA = new Set(('a o as os um uma uns umas de da do das dos em na no nas nos ao aos à às por pela pelo pelas pelos ' +
    'para pra com sem sob sobre entre até que e ou nem se mas como mais menos muito muita muitos muitas tão ' +
    'seu sua seus suas meu minha teu tua nosso nossa esse essa este esta isso isto aquele aquela cada todo toda ' +
    'não já é são foi era tem têm vai').split(' '));
  const NUM = /^(\d[\d.,]*%?|zero|um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|mil|milhão|milhões|bilhão|bilhões|meio|meia)$/i;
  const limpa = (w) => w.toLowerCase().replace(/^[("“'«]+|[)"”'»,;:.!?…]+$/g, '');
  const prende = (w) => { const c = limpa(w); return LIGA.has(c) || NUM.test(c); };

  // Partes em , ; : ou travessão (o sinal fica no fim da parte).
  function oracoes(f) {
    // Sem lookbehind (iOS antigo não tem): marca os cortes com \u0001 e divide.
    return f.replace(/([,;:])\s+/g, '$1\u0001').replace(/\s+([—–-])\s+/g, '\u0001$1 ')
      .split('\u0001').map((s) => s.trim()).filter(Boolean);
  }

  // Corte por palavras: n pedaços equilibrados; o ponto de corte foge de palavra que "prende" a seguinte.
  function porPalavras(ws, max) {
    if (ws.length <= max) return [ws];
    const n = Math.ceil(ws.length / max);
    const alvo = ws.length / n;
    const out = [];
    let i = 0;
    while (ws.length - i > max) {
      const ideal = Math.round(i + alvo);
      let melhor = -1, dist = 1e9;
      for (let b = i + 2; b <= Math.min(i + max, ws.length - 1); b++) { // corte antes de ws[b]
        if (prende(ws[b - 1])) continue;
        const d = Math.abs(b - ideal) + (ws.length - b <= 2 ? 50 : 0);
        if (d < dist) { dist = d; melhor = b; }
      }
      if (melhor < 0) melhor = Math.min(i + max, ws.length - 1);
      out.push(ws.slice(i, melhor));
      i = melhor;
    }
    out.push(ws.slice(i));
    return out;
  }

  function pedacos(frase, max) {
    max = Math.max(3, max | 0 || 10);
    const total = palavras(frase);
    if (total.length <= max) return [frase.trim()];
    // 1) orações; junta vizinhas enquanto couber; oração de 1-2 palavras gruda na seguinte (ou na anterior)
    const ors = oracoes(frase).map(palavras);
    const grupos = [];
    let cur = [];
    for (const o of ors) {
      if (cur.length && cur.length + o.length > max && cur.length > 2) { grupos.push(cur); cur = []; }
      cur = cur.concat(o);
    }
    if (cur.length) {
      if (cur.length <= 2 && grupos.length) grupos[grupos.length - 1] = grupos[grupos.length - 1].concat(cur);
      else grupos.push(cur);
    }
    // 2) grupo ainda grande demais: corte por palavras
    let out = [];
    grupos.forEach((g) => { out = out.concat(porPalavras(g, max)); });
    // 3) sobra de 1-2 palavras no fim junta ao anterior
    if (out.length > 1 && out[out.length - 1].length <= 2) {
      const u = out.pop(); out[out.length - 1] = out[out.length - 1].concat(u);
    }
    return out.map((ws) => ws.join(' '));
  }

  function telas(body, max) {
    const out = [];
    frases(body).forEach((f) => { pedacos(f, max).forEach((p) => out.push(p)); });
    return out;
  }

  const api = { rotulo, blocos, frases, pedacos, telas, palavras: (t) => palavras(t).length };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GravarTexto = api;
})(typeof self !== 'undefined' ? self : this);
