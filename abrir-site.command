#!/bin/bash
# Sobe o IMPROVIX em http://localhost:3000 e abre no navegador.
# Dois cliques neste arquivo. Para parar, feche esta janela do Terminal.
cd "$(dirname "$0")"
PORTA=3000
if lsof -nP -iTCP:$PORTA -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Já tem algo na porta $PORTA — abrindo o navegador."
else
  echo "Subindo o site em http://localhost:$PORTA ..."
  python3 -m http.server $PORTA &
  sleep 1
fi
open "http://localhost:$PORTA/"
echo
echo "Pronto. Deixe esta janela ABERTA enquanto estiver usando o site."
echo "Para parar: feche esta janela (ou aperte Control-C)."
wait
