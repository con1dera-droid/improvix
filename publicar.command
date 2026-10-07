#!/bin/bash
# Publica o IMPROVIX: manda o que mudou para o GitHub, e o Vercel republica
# o site sozinho em cerca de um minuto.
# Dois cliques neste arquivo.
cd "$(dirname "$0")"
echo "=============================================="
echo "  IMPROVIX — publicando em improvix.vercel.app"
echo "=============================================="
echo

if [ -n "$(git status --porcelain)" ]; then
  echo "Há mudanças ainda não gravadas. Gravando..."
  git add -A
  git commit -m "Ajustes feitos no Mac" || true
  echo
fi

echo "Enviando para o GitHub..."
if git push; then
  echo
  echo "✅ Enviado. O Vercel está republicando — em cerca de 1 minuto"
  echo "   recarregue https://improvix.vercel.app"
  echo
  echo "Abrindo o site em 60 segundos... (feche esta janela para cancelar)"
  sleep 60
  open "https://improvix.vercel.app"
else
  echo
  echo "❌ Não deu para enviar. Copie a mensagem acima e mande para o Claude."
fi

echo
echo "Pode fechar esta janela."
