/* Rosto que envelhece (20/11/2026, pedido do Lucca): um rosto de exemplo, realista (feito por IA, pessoa que não existe), com a
   IDADE ESTIMADA em cima, que sobe e desce conforme os sinais (manchas, linhas, firmeza...). Um módulo só, usado em dois lugares:
     - no gravador da Caixa (consulta/gravar-analise.js), no bloco da idade, com os controles só no painel dele;
     - no /pele/, na espera da análise (pele/rosto-toy.js), para a lead brincar enquanto a foto dela é analisada.
   Script clássico (window.RostoIdade), carregado sob demanda pelos dois.

   AS IMAGENS: as do Simulador do Rosto (livowa-empresa/tarefas/simulador-rosto/img, alinhadas pelo alinhar.py), em webp 447×720
   (livowa-empresa/tarefas/rosto-idade-interativo/montar-imagens.py). Por sinal, duas pontas: <rosto>-cN-melhor (menos) e
   <rosto>-cN-pior (mais). A MISTURA é a do simulador aprovado em 15/11 (simulador-rosto.src.html): cada diferença vira parte
   lenta (cor, sombra: SOMA entre sinais) e parte fina (textura, ruga: em cada ponto vale SÓ a do sinal mais forte). Somar as
   texturas inteiras granulava o rosto (v4/v5 de 15/11); alisar a foto embaçava (v6, reprovado). Não mudar sem refazer o teste
   de aspereza (tarefas/simulador-rosto.md, "Não fazer").

   A IDADE: a MESMA conta da análise da foto, porte de calcularIdade da edge analisar-pele
   (livowa-empresa/paginas/isca-idade/edge-analisar-pele/supabase/functions/analisar-pele/logica.ts, TABELA_IDADE,
   faixasDoSexo, idadeDaNota, calcularIdade; régua-2026-11-17). Se a tabela de lá mudar, mude aqui junto. Cada controle vira a
   nota 0–3 do sinal correspondente: Manchas e tom → manchas; Linhas → linhas_testa, olhos e sulco_nasolabial (a imagem da IA
   mexe nos três juntos); Firmeza e contorno → flacidez; Olheiras → olheira e Viço → textura_poros, que ficam FORA da conta,
   como na edge (peso 0): mexem no rosto e não no número. "Hoje" = as notas típicas da idade do rosto (a faixa da tabela que
   contém a idade dele); Menos = 0; Mais = 3. O número é o centro da conta, arredondado. É simulação: não é previsão nem
   promessa de resultado. */
(function (g) {
'use strict';
const VERSAO = '20261120a';
const BASE = (() => { try { return new URL('./', document.currentScript.src).href; } catch (e) { return '/assets/rosto-idade/'; } })();

// ---------------------------------------------------------------- a régua (porte de logica.ts, régua-2026-11-17)
const TABELA_IDADE = {
  linhas_testa:{ peso:.15, media:[[null, 32], [33, 42], [43, 55], [56, null]], se_cuida:[[null, 35], [36, 46], [47, 59], [60, null]], homem:[[null, 30], [31, 40], [41, 53], [54, null]] },
  olhos:{ peso:.20, media:[[null, 32], [33, 44], [45, 56], [57, null]], se_cuida:[[null, 35], [36, 48], [49, 60], [61, null]] },
  sulco_nasolabial:{ peso:.20, media:[[null, 29], [30, 42], [43, 56], [57, null]], se_cuida:[[null, 31], [32, 45], [46, 59], [60, null]], homem:[[null, 29], [30, 42], [43, 53], [54, null]] },
  manchas:{ peso:.10, media:[[null, 29], [30, 42], [43, 55], [56, null]], se_cuida:[[null, 40], [41, 52], [53, 64], [65, null]] },
  textura_poros:{ peso:0, media:[[null, 34], [35, 46], [47, 58], [59, null]], se_cuida:[[null, 37], [38, 50], [51, 62], [63, null]] },
  flacidez:{ peso:.25, media:[[null, 36], [37, 48], [49, 60], [61, null]], se_cuida:[[null, 37], [38, 50], [51, 62], [63, null]], homem:[[null, 38], [39, 50], [51, 62], [63, null]] },
  olheira:{ peso:0, media:[[null, null], [null, null], [null, null], [null, null]], se_cuida:[[null, null], [null, null], [null, null], [null, null]] },
};
const SINAIS = ['linhas_testa', 'olhos', 'sulco_nasolabial', 'manchas', 'textura_poros', 'flacidez', 'olheira'];
const NA_CONTA = SINAIS.filter(id => TABELA_IDADE[id].peso > 0);
function faixasDoSexo(id, sexo){
  const t = TABELA_IDADE[id];
  if (sexo !== 'm' || !t.homem) return { media:t.media, se_cuida:t.se_cuida };
  const h = t.homem, desl = (n, k) => { const v = h[n][k], m = t.media[n][k], c = t.se_cuida[n][k]; return v === null || m === null || c === null ? null : v + (c - m); };
  return { media:h, se_cuida:[0, 1, 2, 3].map(n => [desl(n, 0), desl(n, 1)]) };
}
function idadeDaNota(f, nota){
  const n = Math.max(0, Math.min(3, Math.round(nota))), lo = f[n][0], hi = f[n][1];
  if (n === 0) return hi === null ? null : 28;
  if (n === 3) return lo === null ? null : lo + 4;
  return lo === null || hi === null ? null : (lo + hi) / 2;
}
function calcularIdade(notas, sexo){
  let soma = 0, pesos = 0; const usados = [];
  for (const id of NA_CONTA){
    const v = notas[id]; if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const ponto = idadeDaNota(faixasDoSexo(id, sexo).media, v); if (ponto === null) continue;
    soma += TABELA_IDADE[id].peso * ponto; pesos += TABELA_IDADE[id].peso; usados.push(id);
  }
  if (!pesos) return null;
  const centro = soma / pesos, largura = usados.length >= 3 ? 4 : 6;
  let min = Math.round(centro - largura / 2), max = min + largura;
  if (min < 18){ max += 18 - min; min = 18; }
  if (max > 90){ min -= max - 90; max = 90; }
  return { faixa:{ min, max }, centro:Math.round(centro * 10) / 10, sexo:sexo === 'm' ? 'm' : 'f', na_conta:usados };
}
/** A nota típica de um sinal numa idade: a faixa da tabela (média) que contém a idade. */
function notaTipica(id, idade, sexo){
  const f = faixasDoSexo(id, sexo).media;
  if (f[0][0] === null && f[0][1] === null) return 1;   // olheira: não acompanha a idade (fica no meio)
  for (let n = 0; n < 4; n++){ const lo = f[n][0], hi = f[n][1]; if ((lo === null || idade >= lo) && (hi === null || idade <= hi)) return n; }
  return idade < 30 ? 0 : 3;
}

// ---------------------------------------------------------------- os rostos e os controles
// controle: k, nome, sinais da régua que ele move, c = índice da imagem (cN), melhor = tem a ponta "menos"
// fina: o sinal tem textura fina de verdade. No alinhar.py só manchas e linhas guardam textura (modos "tudo" e "fino"); as outras
// pontas são só a parte lenta (GaussianBlur 2,83). Aqui a parte fina delas seria só ruído da compressão e do tamanho, e somá-lo
// granulava a Carla (20/11: tudo Menos 1,42× a aspereza de hoje; sem ele, 1,02×). Então a parte fina delas é zero, como na origem.
const CONTROLES = {
  manchas:{ nome:'Manchas e tom', curto:'Manchas', sinais:['manchas'], fina:true },
  linhas:{ nome:'Linhas', curto:'Linhas', sinais:['linhas_testa', 'olhos', 'sulco_nasolabial'], fina:true },
  firmeza:{ nome:'Firmeza e contorno', curto:'Firmeza', sinais:['flacidez'], fina:false },
  olheiras:{ nome:'Olheiras', curto:'Olheiras', sinais:['olheira'], fina:false },
  vico:{ nome:'Viço', curto:'Viço', sinais:['textura_poros'], fina:false },
};
const ROSTOS = {
  carla:{ sexo:'f', idade:48, nome:'Mulher, 45 a 52 anos', c:[['manchas', true], ['linhas', true], ['firmeza', true], ['olheiras', true], ['vico', true]] },
  marcos:{ sexo:'m', idade:49, nome:'Homem, 45 a 53 anos', c:[['manchas', true], ['linhas', true], ['firmeza', false]] },
  nina:{ sexo:'f', idade:25, nome:'Mulher, 25 anos', c:[['manchas', true], ['linhas', true], ['firmeza', false]] },
  helena:{ sexo:'f', idade:40, nome:'Mulher, 40 anos', c:[['manchas', true], ['linhas', true], ['firmeza', false]] },
};
/** O rosto do mesmo sexo e da idade mais perto (homem → marcos; mulher < 33 → nina; 33–44 → helena; ≥ 45 → carla).
 *  jovem (o /pele/): mulher < 33 → nina; senão helena (o rosto começa novo e a idade sobe com os sinais). */
function escolher(sexo, idade, o){
  if (sexo === 'm') return 'marcos';
  const i = Number(idade);
  if (o && o.jovem) return Number.isFinite(i) && i >= 33 ? 'helena' : 'nina';
  if (!Number.isFinite(i)) return 'carla';
  return i < 33 ? 'nina' : i < 45 ? 'helena' : 'carla';
}
/** Os controles de um rosto: { k, nome, curto, i (imagem cN-1), hoje, min, max, na_conta }. */
function controles(id){
  const R = ROSTOS[id];
  return R.c.map(([k, melhor], i) => {
    const C = CONTROLES[k], hoje = Math.max(...C.sinais.map(s => notaTipica(s, R.idade, R.sexo)));
    return { k, nome:C.nome, curto:C.curto, sinais:C.sinais, fina:C.fina, i, hoje, min:melhor ? 0 : hoje, max:3, na_conta:C.sinais.some(s => TABELA_IDADE[s].peso > 0) };
  });
}
/** Notas da régua a partir da posição de cada controle (pos[k] = nota 0–3; sem pos, a de hoje). */
function notasDe(id, pos){
  const out = {};
  for (const c of controles(id)){ const n = pos && pos[c.k] != null ? pos[c.k] : c.hoje; c.sinais.forEach(s => { out[s] = n; }); }
  return out;
}
function idadeDe(id, pos){ const r = calcularIdade(notasDe(id, pos), ROSTOS[id].sexo); return r ? { ...r, idade:Math.round(r.centro) } : null; }

// ---------------------------------------------------------------- a mistura (a do simulador aprovado, só RGB)
const W = 447, H = 720, P = W * H;
function carregar(src){
  return new Promise((ok, erro) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => erro(new Error('imagem ' + src)); i.src = src; });
}
let lerCv = null, lerCtx = null;
function rgb(img){
  if (!lerCv){ lerCv = document.createElement('canvas'); lerCv.width = W; lerCv.height = H; lerCtx = lerCv.getContext('2d', { willReadFrequently:true }); }
  lerCtx.clearRect(0, 0, W, H); lerCtx.drawImage(img, 0, 0, W, H);
  const d = lerCtx.getImageData(0, 0, W, H).data, o = new Uint8Array(P * 3);
  for (let i = 0, j = 0; j < o.length; i += 4, j += 3){ o[j] = d[i]; o[j + 1] = d[i + 1]; o[j + 2] = d[i + 2]; }
  return o;
}
const tA = new Float32Array(P * 3), tB = new Float32Array(P * 3);
function caixa(src, dst, r, passo, linhas, compr, linhaPasso){
  const q = 2 * r + 1;
  for (let y = 0; y < linhas; y++) for (let c = 0; c < 3; c++){
    const o = y * linhaPasso + c, at = k => src[o + (k < 0 ? 0 : k >= compr ? compr - 1 : k) * passo];
    let s = 0; for (let k = -r; k <= r; k++) s += at(k);
    for (let x = 0; x < compr; x++){ dst[o + x * passo] = s / q; s += at(x + r + 1) - at(x - r); }
  }
}
/** diferença ponta − base → { L: parte lenta (Int16), F: parte fina (Int8), M: força da fina por pixel (luminância) } */
function separar(ponta, base, fina){
  for (let i = 0; i < tA.length; i++) tA[i] = ponta[i] - base[i];
  const d = Int16Array.from(tA);
  for (let k = 0; k < 2; k++){ caixa(tA, tB, 3, 3, H, W, W * 3); caixa(tB, tA, 3, W * 3, W, H, 3); }
  const L = new Int16Array(P * 3);
  if (!fina){ for (let i = 0; i < L.length; i++) L[i] = Math.round(tA[i]); return { L, F:null, M:null }; }
  const F = new Int8Array(P * 3), M = new Uint8Array(P);
  for (let i = 0; i < L.length; i++){ const l = Math.round(tA[i]), f = d[i] - l; L[i] = l; F[i] = f > 127 ? 127 : f < -127 ? -127 : f; }
  for (let p = 0, i = 0; p < P; p++, i += 3) M[p] = Math.min(255, Math.round(Math.abs(.299 * F[i] + .587 * F[i + 1] + .114 * F[i + 2])));
  return { L, F, M };
}
const espera = () => new Promise(r => setTimeout(r, 0));

/** Cria o rosto: baixa as imagens e prepara as diferenças (uma por vez, cedendo a vez à página). o.melhor=false não baixa as
 *  pontas "menos" de quem começa no mínimo. Devolve { id, canvas, ctrl, pos, por(k, nota), hoje(), anda(agora) → mudou, idade() }. */
async function criar(id, o){
  o = o || {};
  const R = ROSTOS[id]; if (!R) throw new Error('rosto ' + id);
  const ctrl = controles(id), url = n => BASE + 'img/' + id + '-' + n + '.webp?v=' + VERSAO;
  // o.pode(): false = agora não (o gravador gravando); a leitura de pixels espera, para não mexer no vídeo que está sendo gravado
  const vez = async () => { await espera(); while (o.pode && !o.pode()) await new Promise(r => setTimeout(r, 300)); };
  const imgBase = await carregar(url('base'));
  await vez(); const base = rgb(imgBase);
  const d = [];
  for (const c of ctrl){
    const quer = (o.so ? o.so.includes(c.k) : true);
    const [m, p] = await Promise.all([quer && c.min < c.hoje ? carregar(url('c' + (c.i + 1) + '-melhor')) : null, quer ? carregar(url('c' + (c.i + 1) + '-pior')) : null]);
    await vez(); const melhor = m ? separar(rgb(m), base, c.fina) : null;
    await vez(); const pior = p ? separar(rgb(p), base, c.fina) : null;
    d.push({ melhor, pior });
    if (!melhor) c.min = c.hoje;
    if (!pior) c.max = c.hoje;
  }
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  // a tela do rosto fica na CPU (willReadFrequently): o gravador do iPhone/Chrome não gosta de quadro que volta da GPU no meio
  // da gravação (lição da pele interativa, 18/11)
  const cx = canvas.getContext('2d', { willReadFrequently:true }), saida = cx.createImageData(W, H);
  for (let i = 3; i < saida.data.length; i += 4) saida.data[i] = 255;
  const pos = {}, t = {}, alvo = {};
  ctrl.forEach(c => { pos[c.k] = c.hoje; t[c.k] = 0; alvo[c.k] = 0; });
  // nota → peso na imagem: abaixo de hoje vai para a ponta "melhor"; acima, para a "pior" (Menos = −1, Hoje = 0, Mais = +1)
  const peso = (c, n) => n < c.hoje ? (c.hoje > c.min ? -(c.hoje - n) / (c.hoje - c.min) : 0) : n > c.hoje ? (c.max > c.hoje ? (n - c.hoje) / (c.max - c.hoje) : 0) : 0;
  let chave = null, ult = 0, ultPinta = -1e9;
  // uma passada só por pixel (20/11: 5 sinais em passadas separadas levavam ~36 ms, mais que um quadro do gravador a 30 fps)
  function pinta(){
    const at = [];
    ctrl.forEach((c, j) => { const w = t[c.k]; if (Math.abs(w) < .004) return; const x = w < 0 ? d[j].melhor : d[j].pior; if (x) at.push({ w:Math.abs(w), x }); });
    const n = at.length, Ls = at.map(a => a.x.L), ws = at.map(a => a.w);
    const fi = at.filter(a => a.x.F), nf = fi.length, Fs = fi.map(a => a.x.F), Ms = fi.map(a => a.x.M), wf = fi.map(a => a.w);   // a parte fina: só manchas e linhas
    const o = saida.data;
    for (let p = 0, i = 0, q = 0; p < P; p++, i += 3, q += 4){
      let r = base[i], g = base[i + 1], b = base[i + 2];
      for (let j = 0; j < n; j++){ const L = Ls[j], w = ws[j]; r += w * L[i]; g += w * L[i + 1]; b += w * L[i + 2]; }
      if (nf){
        let k = 0;
        if (nf > 1){ let mx = -1; for (let j = 0; j < nf; j++){ const v = wf[j] * Ms[j][p]; if (v > mx){ mx = v; k = j; } } if (mx <= 0) k = -1; }
        if (k >= 0){ const F = Fs[k], w = wf[k]; r += w * F[i]; g += w * F[i + 1]; b += w * F[i + 2]; }
      }
      o[q] = r; o[q + 1] = g; o[q + 2] = b;
    }
    cx.putImageData(saida, 0, 0);
  }
  pinta();
  const api = {
    id, sexo:R.sexo, idadeRosto:R.idade, nome:R.nome, canvas, ctrl, pos, w:W, h:H,
    /** muda a nota de um controle (limitada ao que o rosto tem); a imagem anda até lá em ~0,45 s em anda() */
    por(k, nota){ const c = ctrl.find(x => x.k === k); if (!c) return false; const n = Math.max(c.min, Math.min(c.max, Math.round(nota))); pos[k] = n; alvo[k] = peso(c, n); return true; },
    hoje(){ ctrl.forEach(c => api.por(c.k, c.hoje)); },
    idade(){ return idadeDe(id, pos); },
    notas(){ return notasDe(id, pos); },
    parado(){ return ctrl.every(c => t[c.k] === alvo[c.k]); },
    /** avança a transição e repinta se mudou; ms = duração de 0 a 1 (0 = na hora); cada = intervalo mínimo entre pinturas no meio da
     *  transição (o gravador usa 66 ms: a imagem anda a ~15 quadros/s e o vídeo segue a 30; a pintura final sempre sai). Devolve true se repintou. */
    anda(agora, ms, cada){
      const dt = ult ? Math.min(100, Math.max(0, agora - ult)) : 16; ult = agora;
      const v = ms === 0 ? 9 : dt / (ms || 450);
      ctrl.forEach(c => { const a = alvo[c.k], w = t[c.k]; t[c.k] = w < a ? Math.min(a, w + v) : Math.max(a, w - v); });
      const k = ctrl.map(c => t[c.k].toFixed(3)).join('|');
      if (k === chave) return false;
      if (cada && agora - ultPinta < cada && !api.parado()) return false;
      chave = k; ultPinta = agora; pinta(); return true;
    },
    _t:t,
  };
  return api;
}

/** O número que conta até o alvo (contagem rápida: a diferença inteira em ~0,6 s, nunca mais lento que 14 anos/s). */
function contador(inicial){
  let v = inicial, alvo = inicial, ult = 0;
  return {
    alvo(n){ if (Number.isFinite(n)) alvo = n; },
    anda(agora){ const dt = ult ? Math.min(100, agora - ult) : 16; ult = agora; const dif = alvo - v; if (!dif) return Math.round(v);
      const vel = Math.max(Math.abs(dif) / 600, 14 / 1000) * dt; v = Math.abs(dif) <= vel ? alvo : v + Math.sign(dif) * vel; return Math.round(v); },
    valor(){ return Math.round(v); },
    fim(){ return v === alvo; },
  };
}

g.RostoIdade = { versao:VERSAO, W, H, ROSTOS, CONTROLES, escolher, controles, notasDe, idadeDe, calcularIdade, notaTipica, faixasDoSexo, idadeDaNota, criar, contador, TABELA_IDADE };
})(window);
