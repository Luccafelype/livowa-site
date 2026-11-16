#!/usr/bin/env python3
"""Gera g/cartao/convite.png: a imagem da prévia do link de convite (livowa.com/g/?c=...).

Cartão fixo aprovado em 15/11/2026 (T266): fundo preto do site, a marca "Livowa" como a
página inicial escreve (Fraunces 600, cor --ink) e "Você foi chamado para um grupo" em branco.
1200 x 630, até 300 KB (limite para o WhatsApp montar o cartão). Sem nome de pessoa.

Rodar:  python3 g/cartao/gerar.py      (precisa de Pillow; a fonte está ao lado)
Conferir: bash g/cartao/conferir.sh
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

AQUI = Path(__file__).resolve().parent
FONTE = AQUI / "fraunces-latin-600-normal.woff2"
SAIDA = AQUI / "convite.png"

LARGURA, ALTURA = 1200, 630
FUNDO = "#070A10"   # --bg do styles.css
TINTA = "#F3F6F9"   # --ink do styles.css (cor do .logo)
BRANCO = "#FFFFFF"
VERDE = "#00D9A6"   # verde da marca (o L do ícone)

FRASE = ["Você foi chamado", "para um grupo"]


def main() -> None:
    img = Image.new("RGB", (LARGURA, ALTURA), FUNDO)
    d = ImageDraw.Draw(img)
    marca = ImageFont.truetype(str(FONTE), 64)
    frase = ImageFont.truetype(str(FONTE), 92)

    x = 96
    d.text((x, 92), "Livowa", font=marca, fill=TINTA)
    d.rectangle((x, 196, x + 72, 202), fill=VERDE)

    y = 270
    for linha in FRASE:
        d.text((x, y), linha, font=frase, fill=BRANCO)
        y += 118

    img.save(SAIDA, "PNG", optimize=True)
    print(f"{SAIDA} {SAIDA.stat().st_size} bytes")


if __name__ == "__main__":
    main()
