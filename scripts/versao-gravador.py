#!/usr/bin/env python3
"""Sobe a versão do gravador num lugar só (18/11): o ?v= de gravar-analise.js no consulta/index.html e o consulta/versao.json
(que o gravador aberto confere para se atualizar sozinho). Uso: python3 scripts/versao-gravador.py 20261118v"""
import json, re, sys, os
v = sys.argv[1]
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'consulta')
p = os.path.join(raiz, 'index.html'); s = open(p, encoding='utf-8').read()
s2, n = re.subn(r'gravar-analise\.js\?v=[\w.-]+', 'gravar-analise.js?v=' + v, s)
if n != 1: sys.exit('esperava 1 gravar-analise.js?v= no index.html, achei %d' % n)
open(p, 'w', encoding='utf-8').write(s2)
json.dump({'v': v}, open(os.path.join(raiz, 'versao.json'), 'w'))
open(os.path.join(raiz, 'versao.json'), 'a').write('\n')
print('gravador na versão', v)
