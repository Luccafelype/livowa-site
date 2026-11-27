#!/usr/bin/env python3
"""Gera /comece/<id>/index.html: a mesma passagem do /comece/ (roteador.js), com título e imagem próprios para a
prévia do link no Instagram/WhatsApp (27/11, Lucca: a prévia mostrava "Livowa" e sem foto).
Rodar de novo ao mudar título de teste ou imagem: python3 comece/gerar_entradas.py"""
import os, re, html
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(AQUI)
SITE = 'https://livowa.com'
# id do roteador → (pasta do teste, descrição, imagem em comece/img/ ou None)
ENTRADAS = {
    'tipos': ('tipos', '12 frases, 2 minutos. Dr. Lucca Marques', 'tipos.jpg'),
    'braco': ('braco', 'Teste rápido com o celular na mão. Dr. Lucca Marques', None),
    'emag': ('emagrecimento', 'Teste rápido. Dr. Lucca Marques', None),
    'pelenova': ('pele', 'Teste rápido pela foto do rosto. Dr. Lucca Marques', None),
    'pele2': ('pele2', 'Teste rápido. Dr. Lucca Marques', None),
    'quiz': ('longevidade', 'Quiz rápido. Dr. Lucca Marques', None),
}
base = open(os.path.join(AQUI, 'index.html'), encoding='utf-8').read()
for id_, (pasta, desc, img) in ENTRADAS.items():
    t = open(os.path.join(RAIZ, pasta, 'index.html'), encoding='utf-8').read()
    titulo = html.unescape(re.search(r'<title>([^<]*)</title>', t).group(1)).replace(' · Dr. Lucca', '').strip()
    e = lambda x: html.escape(x, quote=True)
    meta = (f'<title>{e(titulo)}</title>\n<meta property="og:title" content="{e(titulo)}">\n'
            f'<meta property="og:description" content="{e(desc)}">\n<meta property="og:type" content="website">\n'
            f'<meta property="og:url" content="{SITE}/comece/{id_}/">\n')
    if img:
        meta += (f'<meta property="og:image" content="{SITE}/comece/img/{img}">\n'
                 '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
                 '<meta name="twitter:card" content="summary_large_image">\n')
    pag = re.sub(r'<title>[^<]*</title>\n', meta, base, count=1)
    os.makedirs(os.path.join(AQUI, id_), exist_ok=True)
    open(os.path.join(AQUI, id_, 'index.html'), 'w', encoding='utf-8').write(pag)
    print(id_, '→', titulo)
