#!/usr/bin/env python3
"""Gera as páginas estáticas livowa.com/c/<apelido>/ de cada criadora publicada.

Por quê: o GitHub Pages não tem rota dinâmica. Sem um arquivo em c/<apelido>/,
o endereço responde HTTP 404 e só quem roda JavaScript chega à página (o 404.html
redireciona para /c/?h=<apelido>). Leitor de prévia (WhatsApp, Instagram, TikTok)
e navegador interno de rede social viam "Página não encontrada".

Cada página gerada é uma cópia de c/index.html (mesmo corpo e mesmos scripts; o
criadora.js lê o apelido do caminho) com título, descrição e foto dela nas tags
Open Graph/Twitter.

A lista vem do banco pela chave pública do site (a mesma de assets/js/criadora.js):
criadoras com ativa = true. Cadastro de teste (nome começando por "[TESTE]") fica
de fora; o /c/?h=<apelido> continua servindo qualquer apelido.

Uso (na raiz do repositório do site):
    python3 scripts/gerar_paginas_criadoras.py            # gera/atualiza e remove as de quem saiu
    python3 scripts/gerar_paginas_criadoras.py --conferir # só confere; sai com 1 se algo está velho
    python3 scripts/gerar_paginas_criadoras.py --lista lista.json  # sem rede: [{"handle","nome","titulo","foto_url"}]

Criadora nova = rodar o script, commitar c/<apelido>/ e publicar o site.
"""
import argparse
import html
import json
import os
import re
import shutil
import sys
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELO = os.path.join(RAIZ, 'c', 'index.html')
JS_CRIADORA = os.path.join(RAIZ, 'assets', 'js', 'criadora.js')
SITE = 'https://livowa.com'
MARCA = 'Gerado por scripts/gerar_paginas_criadoras.py'
FOTO_PADRAO = SITE + '/assets/app/capturar.jpg'
HANDLE_VALIDO = re.compile(r'^[a-z0-9_.]{2,40}$')  # a mesma regra de criadora.js
RESERVADOS = {'painel', 'index.html', 'assets'}     # pastas que já existem em c/


def ler_chave():
    js = open(JS_CRIADORA, encoding='utf-8').read()
    url = re.search(r"var SUPABASE_URL = '([^']+)'", js).group(1)
    chave = re.search(r"var SUPABASE_ANON_KEY = '([^']+)'", js).group(1)
    return url, chave


def buscar_criadoras():
    url, chave = ler_chave()
    req = urllib.request.Request(
        url + '/rest/v1/criadoras?select=handle,nome,titulo,foto_url&ativa=eq.true&order=criada_em',
        headers={'apikey': chave, 'Authorization': 'Bearer ' + chave, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def filtrar(criadoras):
    boas = []
    for c in criadoras:
        h = (c.get('handle') or '').strip().lower()
        nome = (c.get('nome') or '').strip()
        if nome.startswith('[TESTE]'):
            continue
        if not HANDLE_VALIDO.match(h) or h in RESERVADOS:
            print('  pulei apelido inválido ou reservado: %r' % h, file=sys.stderr)
            continue
        boas.append(dict(c, handle=h, nome=nome or '@' + h))
    return boas


def primeiro_nome(nome):
    return (nome.split() or [nome])[0]


def pagina(modelo, c):
    h = c['handle']
    nome = c['nome']
    titulo = (c.get('titulo') or '').strip()
    foto = (c.get('foto_url') or '').strip() or FOTO_PADRAO
    url = '%s/c/%s/' % (SITE, h)
    t = '%s (@%s) no Livowa' % (nome, h)
    d = ('%s. ' % titulo if titulo else '') + (
        'A rotina que %s compartilha no Livowa: dieta e treino com as quantidades '
        'ajustadas às suas metas.' % primeiro_nome(nome))
    e = lambda s: html.escape(s, quote=True)

    s = modelo
    s, n1 = re.subn(r'<title>[^<]*</title>', '<title>%s</title>' % e(t), s, count=1)
    meta = ('<meta name="description" content="%s">\n'
            '    <link rel="canonical" href="%s">\n'
            '    <meta property="og:type" content="profile">\n'
            '    <meta property="og:site_name" content="Livowa">\n'
            '    <meta property="og:locale" content="pt_BR">\n'
            '    <meta property="og:url" content="%s">\n'
            '    <meta property="og:title" content="%s">\n'
            '    <meta property="og:description" content="%s">\n'
            '    <meta property="og:image" content="%s">\n'
            '    <meta property="og:image:alt" content="Foto de %s">\n'
            '    <meta name="twitter:card" content="summary">\n'
            '    <meta name="twitter:title" content="%s">\n'
            '    <meta name="twitter:description" content="%s">\n'
            '    <meta name="twitter:image" content="%s">'
            ) % (e(d), e(url), e(url), e(t), e(d), e(foto), e(nome), e(t), e(d), e(foto))
    s, n2 = re.subn(r'<meta name="description" content="[^"]*">', lambda _: meta, s, count=1)
    # O comentário de explicação do modelo vira o aviso de arquivo gerado.
    s, n3 = re.subn(r'<!--\s*\n\s*livowa\.com/c/<apelido>.*?-->',
                    lambda _: '<!-- %s a partir de c/index.html para @%s. Não editar à mão:\n'
                              '         editar c/index.html e rodar o script de novo. -->' % (MARCA, h),
                    s, count=1, flags=re.S)
    if (n1, n2, n3) != (1, 1, 1):
        sys.exit('c/index.html mudou de formato (título %d, descrição %d, comentário %d): ajustar o gerador.' % (n1, n2, n3))
    return s


def geradas_hoje():
    """Pastas em c/ que este script criou (têm a marca)."""
    base = os.path.join(RAIZ, 'c')
    achadas = {}
    for nome in sorted(os.listdir(base)):
        arq = os.path.join(base, nome, 'index.html')
        if os.path.isdir(os.path.join(base, nome)) and os.path.isfile(arq):
            if MARCA in open(arq, encoding='utf-8').read():
                achadas[nome] = arq
    return achadas


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--conferir', action='store_true', help='não grava; sai com 1 se alguma página está velha')
    ap.add_argument('--lista', help='JSON com as criadoras, em vez de buscar no banco')
    a = ap.parse_args()

    criadoras = filtrar(json.load(open(a.lista, encoding='utf-8')) if a.lista else buscar_criadoras())
    modelo = open(MODELO, encoding='utf-8').read()
    existentes = geradas_hoje()
    velhas = []

    for c in criadoras:
        arq = os.path.join(RAIZ, 'c', c['handle'], 'index.html')
        novo = pagina(modelo, c)
        atual = open(arq, encoding='utf-8').read() if os.path.isfile(arq) else None
        if atual == novo:
            print('  igual     c/%s/' % c['handle'])
            continue
        if atual is not None and MARCA not in atual:
            sys.exit('c/%s/index.html existe e não foi gerado por este script: não sobrescrevo.' % c['handle'])
        velhas.append(c['handle'])
        if not a.conferir:
            os.makedirs(os.path.dirname(arq), exist_ok=True)
            open(arq, 'w', encoding='utf-8').write(novo)
        print('  %s c/%s/' % ('VELHA    ' if a.conferir else 'gravada  ', c['handle']))

    ativos = {c['handle'] for c in criadoras}
    for h in sorted(set(existentes) - ativos):
        velhas.append(h)
        if not a.conferir:
            shutil.rmtree(os.path.dirname(existentes[h]))
        print('  %s c/%s/ (não está mais publicada)' % ('SOBRANDO ' if a.conferir else 'removida ', h))

    print('%d criadora(s) publicada(s); %d página(s) %s.' % (
        len(criadoras), len(velhas), 'fora do lugar' if a.conferir else 'mudada(s)'))
    if a.conferir and velhas:
        sys.exit(1)


if __name__ == '__main__':
    main()
