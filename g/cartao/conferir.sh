#!/bin/bash
# Confere a prévia do convite do grupo (T266) servindo o site localmente.
# Sai com erro (1) se faltar meta do cartão, se a imagem não for PNG 1200x630 de até 300 KB,
# ou se o link da App Store da /g/ (assets/js/convite.js) for diferente do da página inicial.
# Uso: bash g/cartao/conferir.sh [porta]
set -u
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
# Porta livre escolhida pelo sistema (uma porta fixa pode estar ocupada por outro serviço).
PORTA="${1:-$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')}"
UA="WhatsApp/2.23.20.0"
TMP="$(mktemp -d)"
FALHAS=0
falha() { echo "FALHOU: $*"; FALHAS=$((FALHAS + 1)); }
ok() { echo "ok: $*"; }

python3 -m http.server "$PORTA" --bind 127.0.0.1 --directory "$RAIZ" >/dev/null 2>&1 &
SERVIDOR=$!
trap 'kill $SERVIDOR 2>/dev/null; rm -rf "$TMP"' EXIT
for _ in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null "http://127.0.0.1:$PORTA/" && break
  /bin/sleep 0.5
done
BASE="http://127.0.0.1:$PORTA"

# 1. A página do convite responde 200 para o robô do WhatsApp.
COD=$(curl -s -A "$UA" -o "$TMP/g.html" -w "%{http_code}" "$BASE/g/?c=ABC123&de=Ana")
[ "$COD" = "200" ] && ok "/g/?c=ABC123&de=Ana -> 200" || falha "/g/?c=ABC123&de=Ana -> $COD"

# 2. As metas do cartão fixo, com o texto exato.
TITULO="Você foi chamado para um grupo no Livowa"
IMG="https://livowa.com/g/cartao/convite.png"
while IFS='|' read -r ATR NOME VALOR; do
  if grep -qF "<meta $ATR=\"$NOME\" content=\"$VALOR\">" "$TMP/g.html"; then
    ok "$NOME"
  else
    falha "meta $NOME = \"$VALOR\" ausente"
  fi
done <<EOF
property|og:title|$TITULO
property|og:description|Toque para entrar.
property|og:type|website
property|og:url|https://livowa.com/g/
property|og:image|$IMG
property|og:image:width|1200
property|og:image:height|630
name|twitter:card|summary_large_image
name|twitter:title|$TITULO
name|twitter:description|Toque para entrar.
name|twitter:image|$IMG
EOF
grep -q '<meta name="robots" content="noindex' "$TMP/g.html" && ok "noindex" || falha "noindex ausente"

# 3. A imagem: servida como PNG, 1200x630, até 300 KB.
CAMINHO="${IMG#https://livowa.com}"
TIPO=$(curl -s -A "$UA" -o "$TMP/img" -w "%{http_code} %{content_type}" "$BASE$CAMINHO")
[ "$TIPO" = "200 image/png" ] && ok "imagem -> $TIPO" || falha "imagem -> $TIPO"
BYTES=$(wc -c < "$TMP/img" | tr -d ' ')
[ "$BYTES" -le 307200 ] && ok "imagem com $BYTES bytes" || falha "imagem com $BYTES bytes (> 300 KB)"
L=$(sips -g pixelWidth "$TMP/img" 2>/dev/null | awk '/pixelWidth/{print $2}')
A=$(sips -g pixelHeight "$TMP/img" 2>/dev/null | awk '/pixelHeight/{print $2}')
[ "$L" = "1200" ] && [ "$A" = "630" ] && ok "imagem ${L}x${A}" || falha "imagem ${L}x${A} (esperado 1200x630)"

# 4. O link da App Store da /g/ é o mesmo da página inicial.
LOJA_INICIO=$(grep -o 'class="store-chip" href="https://apps.apple.com[^"]*"' "$RAIZ/index.html" | head -1 | sed 's/.*href="//; s/"$//')
LOJA_G=$(grep -o "ios: *'https://apps.apple.com[^']*'" "$RAIZ/assets/js/convite.js" | sed "s/.*'\(.*\)'/\1/")
if [ -n "$LOJA_INICIO" ] && [ "$LOJA_INICIO" = "$LOJA_G" ]; then
  ok "App Store igual à da página inicial ($LOJA_G)"
else
  falha "App Store da /g/ ($LOJA_G) diferente da página inicial ($LOJA_INICIO)"
fi

echo "falhas: $FALHAS"
[ "$FALHAS" -eq 0 ]
