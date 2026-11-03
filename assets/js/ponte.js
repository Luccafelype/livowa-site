/* Ponte da bio (03/11/2026, pedido do Lucca: "pode fazer a ponte, mas tem que ser rastreável").
   A bio promete "Descubra sua idade biológica em 2 minutos" e o /comece sorteia um teste (pele, pernas, braço,
   emagrecimento). Quem veio da bio vê, na 1ª tela do teste, UMA linha que liga o teste à idade.
   A/B 50/50 por aparelho (localStorage livowa_ponte_ab = sim | nao); ?ponte=sim|nao força sem gravar.
   Só vale para quem veio da bio: ?canal=bio (o /comece passa) ou utm_source=ig_bio (links antigos).
   Medição: cada página põe props.ponte ('sim' = viu a linha, 'nao' = veio da bio e não viu) em TODOS os eventos;
   quem não veio da bio fica sem props.ponte. SQL em livowa-empresa/OPERACOES/funis.md ("Ponte da bio").
   Script clássico com defer: roda antes dos módulos da página (mesma ordem do documento), sem esperar rede.
   Fontes conferidas no PubMed em 03/11/2026: Christensen 2009 (PMID 20008378), Cooper 2010 (PMID 20829298),
   Zou 2019 (PMID 31787929). Sem promessa: as frases dizem associação, não efeito do teste. */
(function(){
  var q = new URLSearchParams(location.search);
  var daBio = q.get('canal') === 'bio' || q.get('utm_source') === 'ig_bio';
  var estado = null;
  if (daBio){
    var f = q.get('ponte');
    if (f === 'sim' || f === 'nao') estado = f;
    else {
      try {
        estado = localStorage.getItem('livowa_ponte_ab');
        if (estado !== 'sim' && estado !== 'nao'){ estado = Math.random() < .5 ? 'sim' : 'nao'; localStorage.setItem('livowa_ponte_ab', estado); }
      } catch (e) { estado = Math.random() < .5 ? 'sim' : 'nao'; }
    }
  }
  var TEXTO = {
    pele:  ['A pele mostra a idade por fora. Em gêmeos de 70 anos ou mais, o irmão que parecia mais velho na foto tendia a viver menos. Veja o que a sua foto mostra.',
            'Christensen 2009, BMJ', 'https://doi.org/10.1136/bmj.b5262'],
    pernas:['A força das pernas é um dos sinais da idade do corpo.',
            'Cooper 2010, BMJ', 'https://doi.org/10.1136/bmj.c4467'],
    braco: ['A força dos músculos é um dos sinais da idade do corpo.',
            'Cooper 2010, BMJ', 'https://doi.org/10.1136/bmj.c4467'],
    emag:  ['O peso que vai e volta também pesa na idade do corpo: em 23 estudos, ele andou junto com mais risco para o coração.',
            'Zou 2019, Front Endocrinol', 'https://doi.org/10.3389/fendo.2019.00728']
  };
  var CSS = '.ponte{margin:0;padding:10px 12px;border-left:3px solid var(--accent,#0d6a4d);background:var(--accent-2,#d9efe5);border-radius:0 12px 12px 0;color:var(--fg,#141c17);font-size:.98rem;line-height:1.4;text-align:left}' +
            '.ponte small{display:block;margin-top:4px;font-size:.74rem;color:var(--muted,#5f6d65)}.ponte small a{color:inherit}';
  function pintar(antesDe, teste){
    try {
      if (estado !== 'sim' || !antesDe || !TEXTO[teste]) return false;
      var sec = antesDe.parentNode;
      if (sec.querySelector('.ponte')) return true;
      if (!document.getElementById('ponte-css')){ var s = document.createElement('style'); s.id = 'ponte-css'; s.textContent = CSS; document.head.appendChild(s); }
      var t = TEXTO[teste], p = document.createElement('p');
      p.className = 'ponte'; p.setAttribute('data-ponte', teste);
      p.appendChild(document.createTextNode(t[0]));
      var sm = document.createElement('small'), a = document.createElement('a');
      a.href = t[2]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t[1];
      sm.appendChild(document.createTextNode('Fonte: ')); sm.appendChild(a); p.appendChild(sm);
      sec.insertBefore(p, antesDe);
      return true;
    } catch (e) { return false; }
  }
  // props para juntar em todo evento: {} quando a pessoa não veio da bio
  function props(){ return estado ? { ponte: estado } : {}; }
  window.lvPonte = { estado: estado, pintar: pintar, props: props };
})();
