#!/usr/bin/env bash
# Synchronise vendor/soliguide via sparse-checkout (uniquement packages/common
# de la branche develop de solinumasso/soliguide).
#
# Première exécution : clone le repo en mode blobless + sparse-checkout cone.
# Exécutions suivantes : git pull pour rafraîchir.

set -euo pipefail

REPO_URL="https://github.com/solinumasso/soliguide.git"
BRANCH="develop"
TARGET_DIR="vendor/soliguide"
SPARSE_PATHS=("packages/common")

cd "$(dirname "$0")/.."

if [ ! -d "$TARGET_DIR/.git" ]; then
  echo "→ Clone initial de $REPO_URL (branche $BRANCH, sparse: ${SPARSE_PATHS[*]})"
  mkdir -p "$(dirname "$TARGET_DIR")"
  git clone --no-checkout --depth 1 --branch "$BRANCH" --filter=blob:none "$REPO_URL" "$TARGET_DIR"
  cd "$TARGET_DIR"
  git sparse-checkout init --cone
  git sparse-checkout set "${SPARSE_PATHS[@]}"
  git checkout "$BRANCH"
else
  echo "→ Mise à jour de $TARGET_DIR (git pull origin $BRANCH)"
  cd "$TARGET_DIR"
  git pull origin "$BRANCH"
fi

echo "✓ vendor/soliguide synchronisé"
