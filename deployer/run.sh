#!/usr/bin/env bash
# ==============================================================================
# 🎮 Point d'Entrée Shell — Play.Sog.Re Deployer Runner
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Vérifier la présence de Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ [ERROR] Node.js n'est pas installé ou n'est pas dans le PATH." >&2
    exit 1
fi

# Exécution de l'orchestrateur de déploiement Node.js
exec node "$SCRIPT_DIR/index.mjs" "$@"
