#!/usr/bin/env bash
# Met le VPS à jour avec la branche main de GitHub : git pull, puis reconstruction.
#   ./deploy.sh                          vers haut-tech@187.77.97.66:~/ndadiee
#   SSH_TARGET=user@hote ./deploy.sh     vers un autre serveur
# Seul ce qui est poussé sur main arrive sur le serveur. Le .env n'est pas versionné : il est copié à part.
# Les données (base, images envoyées) vivent dans des volumes Docker : un déploiement ne les touche pas.
set -euo pipefail

SSH_TARGET="${SSH_TARGET:-haut-tech@187.77.97.66}"
REMOTE_DIR="${REMOTE_DIR:-ndadiee}"
REPO_URL="https://github.com/gaye-00/ndadiee.git"
ENV_FILE=".env.production"
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$(dirname "$0")"
[ -f "$ENV_FILE" ] || { echo "Fichier $ENV_FILE introuvable" >&2; exit 1; }
APP_PORT="$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2)"
API_PORT="$(grep -E '^API_PORT=' "$ENV_FILE" | cut -d= -f2)"

git fetch -q origin main
if [ -n "$(git status --porcelain)" ] || [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Attention : votre copie locale diffère de origin/main ; seul origin/main sera déployé."
fi

echo "==> Vérification du serveur $SSH_TARGET"
# shellcheck disable=SC2029
ssh "$SSH_TARGET" "
  set -e
  docker compose version >/dev/null
  # Ports pris par une autre application (ceux de Ndadiee se libèrent au redémarrage de ses conteneurs)
  for port in $APP_PORT $API_PORT; do
    if ss -ltnpH 2>/dev/null | awk '{print \$4}' | grep -q \":\$port\$\" \
       && ! docker ps --filter name=^ndadiee-prod- --format '{{.Ports}}' | grep -q \":\$port->\"; then
      echo \"Le port \$port est déjà utilisé sur ce serveur : changer APP_PORT / API_PORT dans $ENV_FILE\" >&2
      exit 1
    fi
  done
"

echo "==> Récupération du code (git pull)"
# shellcheck disable=SC2029
ssh "$SSH_TARGET" "
  set -e
  [ -d '$REMOTE_DIR/.git' ] || git clone --branch main '$REPO_URL' '$REMOTE_DIR'
  cd '$REMOTE_DIR'
  git pull --ff-only origin main
  git log -1 --format='Version déployée : %h %s'
"

echo "==> Envoi de la configuration"
rsync -zp --chmod=F600 "$ENV_FILE" "$SSH_TARGET:$REMOTE_DIR/.env"

echo "==> Construction et démarrage"
# Une image après l'autre : le serveur est partagé avec d'autres applications
# shellcheck disable=SC2029
ssh "$SSH_TARGET" "
  set -e
  cd '$REMOTE_DIR'
  $COMPOSE build backend
  $COMPOSE build frontend
  $COMPOSE up -d --remove-orphans
"

echo "==> Attente du backend (les données de démonstration sont créées au premier démarrage)"
# shellcheck disable=SC2029
ssh "$SSH_TARGET" "
  cd '$REMOTE_DIR'
  for _ in \$(seq 1 60); do
    status=\$(docker inspect -f '{{.State.Health.Status}}' \"\$($COMPOSE ps -q backend)\")
    [ \"\$status\" = healthy ] && break
    sleep 5
  done
  $COMPOSE ps
  [ \"\$status\" = healthy ] || { $COMPOSE logs --tail=60 backend; exit 1; }
"

echo "==> En ligne : $(grep -E '^FRONTEND_URL=' "$ENV_FILE" | cut -d= -f2)"
