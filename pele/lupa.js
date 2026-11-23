// =====================================================================
// LUPA (23/11/2026; pedido do Lucca de 15/11, ponto 7 da tela 16 do lote l-mwhz04rg): o cartão "O que a sua foto mostra"
// mais amplo e interativo.
//  1. Uma câmera dá zoom na foto DELA e anda pelos pontos destacados (os mesmos recortes de antes), sozinha uma vez quando o
//     cartão aparece; cada ponto da lista leva a câmera até ele.
//  2. "A mesma região em outras idades": a área ativa nos rostos de exemplo do mesmo sexo (os 8 rostos de IA do rosto que
//     envelhece, assets/rosto-idade), em ordem de idade, com o recorte dela no meio.
//  3. O exemplo de fora: a mesma área num rosto de exemplo MAIS VELHO que ela, nas duas pontas daquele sinal ("quando a causa
//     de dentro pesa" × "quando é cuidada"; frase proposta em 16/11 na marca m-mwhbbgbot5ah). Só quando o sinal dela aparece
//     (nível 1 a 3). Nunca "tratamento": o acompanhamento dele é do corpo todo. O porquê fica com o Dr. Lucca (o botão do fim).
// A foto não sai do aparelho: tudo é desenhado aqui, a partir do quadro já alinhado (com a tarja nos olhos).
// Recortes dos exemplos: livowa-empresa/tarefas/pele-cartao-zoom/montar-recortes.py → pele/img/exemplo/*.webp (160×160).
// =====================================================================
import { contorno, caixa, REGIOES, recorteRegiao } from './rosto.js?v=2';

const IMG = n => `/pele/img/exemplo/${n}.webp?v=20261123b`;
// rostos de exemplo por sexo, com a idade (a mesma do assets/rosto-idade/rosto-idade.js)
const EX = { f:[['nina', 25], ['julia', 33], ['helena', 40], ['carla', 48], ['rosa', 60]], m:[['rafael', 30], ['marcos', 49], ['jose', 60]] };
// quem tem a ponta "Menos" de cada área (contorno = firmeza: só a Carla)
const TEM_MELHOR = { testa:() => true, olhos:() => true, sulco:() => true, bochecha:() => true, contorno:id => id === 'carla' };
const OUT = 900;   // largura da foto da câmera, em px

// a mesma conta do fotoTopo() de rosto.js: onde cada área cai na foto (espelhada)
function quadroTopo(g){
  const b = caixa(contorno(g.R, 0)), w = b.x1 - b.x0, h = b.y1 - b.y0;
  const W = w*1.5, H = Math.max(h*1.28, W*1.1), cx = (b.x0 + b.x1)/2, cy = (b.y0 + b.y1)/2 + h*.03;
  return { x0:cx - W/2, y0:cy - H/2, W, H, k:OUT / W };
}
function fotoCamera(al, g, q){
  const cv = document.createElement('canvas'); cv.width = OUT; cv.height = Math.round(q.H * q.k);
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#1b1f1d'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(-q.k, 0, 0, q.k, cv.width + q.x0*q.k, -q.y0*q.k); ctx.drawImage(al, 0, 0);
  return cv;
}
const pesoTexto = s => s.toLocaleLowerCase('pt-BR');

/**
 * Monta o cartão. o = { bloco, al, g, sel (ids dos sinais, na ordem), SINAL, nivel(id), txt(id), dorId, sexo, idade, track }.
 * Precisa do quadro alinhado (al) aberto: chamar antes de liberar o canvas.
 */
let anterior = null;   // refez a foto: o cartão de antes para de andar e solta o resize
export function montarLupa(o){
  anterior?.soltar();
  const { bloco, al, g, sel, SINAL, nivel, txt, dorId, idade, track } = o;
  // 23/11: o passeio (ordem) e onde a câmera para (fim = o ponto mais diferente da idade dela); vêm do app.js (seção 2)
  const ordem = o.ordem || sel, fim = o.fim || sel[sel.length - 1];
  const sexo = o.sexo === 'm' ? 'm' : 'f';
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const q = quadroTopo(g), foto = fotoCamera(al, g, q);
  const area = id => SINAL[id].recorte;
  // onde cada área fica na foto da câmera
  const pos = Object.fromEntries(sel.map(id => { const { c, s } = REGIOES[area(id)](g); return [id, { x:OUT - q.k*(c.x - q.x0), y:q.k*(c.y - q.y0), s:s*q.k }]; }));
  // os recortes dela em tamanho maior (para as idades e o exemplo de fora)
  const dela = Object.fromEntries(sel.map(id => [id, recorteRegiao(al, g, area(id), 240)]));

  bloco.innerHTML = `<h3>O que a sua foto mostra</h3>
    <div class="lupa" role="img" aria-label="A sua foto, com zoom em cada ponto destacado">
      <div class="lupa-cam">${sel.map(id => `<i class="lupa-anel" data-id="${id}" style="left:${(pos[id].x - pos[id].s/2).toFixed(1)}px;top:${(pos[id].y - pos[id].s/2).toFixed(1)}px;width:${pos[id].s.toFixed(1)}px;height:${pos[id].s.toFixed(1)}px"></i>`).join('')}</div>
      <p class="lupa-rot" aria-live="polite"></p>
    </div>
    <ul class="recortes">${sel.map(id => `<li data-id="${id}"${id === dorId ? ' data-dor="1"' : ''}><button type="button" class="rec-bt" aria-pressed="false"><canvas data-r="${area(id)}" role="img" aria-label="Recorte da sua foto: ${pesoTexto(SINAL[id].nome)}"></canvas>
      <div><b>${SINAL[id].nome}${id === fim ? ' <small class="selo">o que mais aparece</small>' : ''}</b><span>${txt(id)}</span></div></button></li>`).join('')}</ul>
    <div class="lupa-mais"></div>`;
  const cam = bloco.querySelector('.lupa-cam'), vis = bloco.querySelector('.lupa'), rot = bloco.querySelector('.lupa-rot'), mais = bloco.querySelector('.lupa-mais');
  foto.className = 'lupa-foto'; cam.prepend(foto);
  bloco.querySelectorAll('canvas[data-r]').forEach(c => { const r = recorteRegiao(al, g, c.dataset.r, 128); c.width = r.width; c.height = r.height; c.getContext('2d').drawImage(r, 0, 0); r.width = 0; });

  // ---------- a câmera ----------
  let ativo = null;
  const V = () => vis.clientWidth || 300;
  function enquadrar(id, desvio = 0, ms = 1100, curva = 'cubic-bezier(.45,.05,.25,1)'){
    const v = V(), H = foto.height;
    let z, tx, ty;
    if (!id){ z = v / OUT; tx = 0; ty = (v - H*z) / 2; }
    else {
      const p = pos[id]; z = Math.min(3, .6 * v / p.s);
      tx = v/2 - (p.x + desvio*p.s)*z; ty = v/2 - p.y*z;
      tx = Math.min(0, Math.max(v - OUT*z, tx)); ty = Math.min(0, Math.max(v - H*z, ty));
    }
    cam.style.transition = reduzir || !ms ? 'none' : `transform ${ms}ms ${curva}`;
    cam.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${z.toFixed(4)})`;
    cam.dataset.z = z.toFixed(3);
  }
  // a legenda (só no passeio): o nome do ponto; no ponto final, o selo (o que a foto mostra está na lista, logo abaixo)
  function rotulo(id){ rot.innerHTML = id ? `<b>${SINAL[id].nome}</b>${id === fim ? ' · o que mais aparece na sua foto' : ''}` : 'A sua foto'; }
  function ativar(id, quem){
    ativo = id;
    bloco.querySelectorAll('.recortes li').forEach(li => li.querySelector('.rec-bt').setAttribute('aria-pressed', String(li.dataset.id === id)));
    bloco.querySelectorAll('.lupa-anel').forEach(a => a.classList.toggle('on', a.dataset.id === id));   // um anel por vez (CSS: o antigo sai, depois o novo entra)
    rotulo(id); pintarMais(id);
    if (quem === 'toque') track('answer', { stepId:'resultado-lupa', valueText:id, props:{ nivel:nivel(id) } });
  }

  // ---------- a mesma região em outras idades + o exemplo de fora ----------
  // 23/11 (prévia aprovada pelo Lucca): o exemplo de fora é a versão A da prévia, a MESMA pessoa mais velha nas duas pontas do
  // sinal ("quando a causa de dentro pesa" × "quando é cuidada"). A versão B (você × a mais velha cuidada) saiu ao contrário na
  // prévia: a imagem de IA é mais nítida que a selfie e a textura dela pesa mais de perto. Rosto: o mais velho que ela (5 anos ou
  // mais) que tem as duas pontas daquela área. Textos curtos: o resultado tem até 200 palavras antes do botão.
  function pintarMais(id){
    const a = area(id), n = nivel(id), lista = EX[sexo];
    const itens = lista.map(([r, i]) => ({ r, i })); let k = itens.findIndex(x => x.i > idade); if (k < 0) k = itens.length;
    itens.splice(k, 0, { voce:true, i:idade });
    const fora = n >= 1 ? lista.filter(([r, i]) => i >= idade + 5 && TEM_MELHOR[a](r)).pop() || null : null;
    const quem = sexo === 'm' ? 'Homem' : 'Mulher';
    mais.innerHTML = `<p class="nota lupa-tit">Em outras idades</p>
      <div class="idades">${itens.map(x => x.voce
        ? `<figure class="voce"><canvas width="96" height="96" aria-label="A sua foto"></canvas><figcaption>Você</figcaption></figure>`
        : `<figure><img src="${IMG(`${x.r}-base-${a}`)}" alt="${quem} de ${x.i} anos (exemplo)" width="160" height="160" decoding="async"><figcaption>${x.i}</figcaption></figure>`).join('')}</div>
      ${fora ? `<div class="fora">
        <p><b>${quem} de ${fora[1]} anos</b></p>
        <div class="fora-par"><figure><img src="${IMG(`${fora[0]}-pior-${a}`)}" alt="${quem} de ${fora[1]} anos (exemplo), mais marcada" width="160" height="160" decoding="async"><figcaption>quando a causa de dentro pesa</figcaption></figure>
          <figure><img src="${IMG(`${fora[0]}-melhor-${a}`)}" alt="${quem} de ${fora[1]} anos (exemplo), mais lisa" width="160" height="160" decoding="async"><figcaption>quando é cuidada</figcaption></figure></div>
      </div>` : ''}
      <p class="nota">Rostos de IA${fora ? ', sem promessa de resultado' : ''}.</p>`;
    mais.querySelectorAll('canvas').forEach(c => c.getContext('2d').drawImage(dela[id], 0, 0, c.width, c.height));
    mais.querySelectorAll('img').forEach(im => im.addEventListener('error', () => { im.closest('figure').hidden = true; }, { once:true }));
    mais.dataset.id = id; mais.dataset.fora = fora ? fora[0] : '';
  }

  // ---------- o passeio: sozinho, uma vez, quando o cartão aparece ----------
  const timers = []; let passeando = false;
  const depois = (ms, f) => timers.push(setTimeout(f, ms));
  const parar = () => { timers.splice(0).forEach(clearTimeout); passeando = false; vis.classList.remove('passeando'); };
  // 23/11: o incômodo dela → os outros em ordem crescente de diferença → PARA no mais diferente (fim); a legenda fica nele
  function passeio(){
    parar(); passeando = true; vis.classList.add('passeando');
    enquadrar(null, 0, 0); rotulo(null);
    bloco.querySelectorAll('.lupa-anel').forEach(a => a.classList.remove('on')); ativo = null;   // rosto inteiro: nenhum anel
    let t = 700;
    ordem.forEach((id, k) => {
      const ultimo = k === ordem.length - 1;
      depois(t, () => { ativar(id); enquadrar(id, ultimo ? 0 : -.14); }); t += 1100;
      if (!ultimo){ depois(t, () => enquadrar(id, .14, 1900, 'linear')); t += 2000; }   // anda pela área (as partes dela)
    });
    depois(t + 1600, () => { passeando = false; vis.classList.remove('passeando'); track('answer', { stepId:'resultado-lupa', valueText:'passeio-fim', props:{ fim } }); });
  }
  bloco.querySelectorAll('.rec-bt').forEach(b => b.addEventListener('click', () => { const id = b.closest('li').dataset.id; parar(); ativar(id, 'toque'); enquadrar(id); }));
  vis.addEventListener('click', () => { if (passeando) return; const i = sel.indexOf(ativo); const id = sel[(i + 1) % sel.length]; ativar(id, 'toque'); enquadrar(id); });
  const aoMudar = () => { if (!passeando) enquadrar(ativo, 0, 0); };
  addEventListener('resize', aoMudar);

  // começa no rosto inteiro, já marcando o ponto mais diferente; o passeio roda quando o cartão aparece na tela
  ativar(fim); enquadrar(null, 0, 0); rotulo(null);
  let io = null;
  const soltar = () => { parar(); io?.disconnect(); removeEventListener('resize', aoMudar); };
  const estado = () => ({ ativo, passeando, ordem, fim, z:+cam.dataset.z, aneis:[...bloco.querySelectorAll('.lupa-anel')].map(a => +getComputedStyle(a).opacity), rot:rot.textContent });
  if (reduzir){ enquadrar(fim, 0, 0); rotulo(fim); return (anterior = { parar, soltar, estado }); }
  io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)){ io.disconnect(); passeio(); } }, { threshold:.6 });
  requestAnimationFrame(() => io.observe(vis));
  return (anterior = { parar, soltar, passeio, estado });
}
