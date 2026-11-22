#!/usr/bin/env bash
# ForgeWP cloud E2E sandbox: WordPress (latest) + MariaDB + Mailpit in Docker.
# Replaces LocalWP when running in a Linux cloud container (no desktop app).
#
#   scripts/cloud-e2e/sandbox.sh up      # start dockerd + stack, install WP, write .env.localwp
#   scripts/cloud-e2e/sandbox.sh reset   # wipe DB + WP files and reinstall from scratch
#   scripts/cloud-e2e/sandbox.sh down    # stop the stack (data kept)
#   scripts/cloud-e2e/sandbox.sh wp ...  # run WP-CLI, e.g. `sandbox.sh wp plugin list`
#
# URLs: WordPress http://localhost:8080 (admin/admin) · Mailpit http://localhost:8025
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
export FORGEWP_E2E_DATA="${FORGEWP_E2E_DATA:-/home/user/e2e}"
DC=(sudo -E docker compose -p forgewp-e2e -f "$HERE/docker-compose.yml")
wpcli() { "${DC[@]}" --profile cli run --rm -T cli wp "$@" 2>&1 | grep -v '^ Container '; }

ensure_docker() {
  docker info >/dev/null 2>&1 && return
  sudo sh -c 'nohup dockerd > /var/log/dockerd.log 2>&1 &'
  for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && return; sleep 1; done
  echo "dockerd failed to start; see /var/log/dockerd.log" >&2; exit 1
}

up() {
  ensure_docker
  mkdir -p "$FORGEWP_E2E_DATA/wp"
  "${DC[@]}" up -d
  for _ in $(seq 1 60); do [ -f "$FORGEWP_E2E_DATA/wp/wp-config.php" ] && break; sleep 2; done
  sudo mkdir -p "$FORGEWP_E2E_DATA/wp/wp-content/mu-plugins"
  sudo cp "$HERE/e2e-mailpit.php" "$FORGEWP_E2E_DATA/wp/wp-content/mu-plugins/"
  if ! wpcli core is-installed >/dev/null 2>&1; then
    wpcli core install --url=http://localhost:8080 --title="ForgeWP E2E" \
      --admin_user=admin --admin_password=admin --admin_email=admin@example.test --skip-email
    wpcli rewrite structure '/%postname%/' --hard
  fi
  sudo chown -R "$(id -u):$(id -g)" "$FORGEWP_E2E_DATA/wp/wp-content/themes"
  if [ ! -f "$REPO/.env.localwp" ]; then
    cat > "$REPO/.env.localwp" <<ENV
# Cloud E2E sandbox (scripts/cloud-e2e). Throwaway local credentials.
FORGEWP_LOCALWP_URL=http://localhost:8080
FORGEWP_LOCALWP_ADMIN_URL=http://localhost:8080/wp-admin
FORGEWP_LOCALWP_USERNAME=admin
FORGEWP_LOCALWP_PASSWORD=admin
FORGEWP_LOCALWP_SITE_PATH=$FORGEWP_E2E_DATA/wp
FORGEWP_LOCALWP_THEMES_PATH=$FORGEWP_E2E_DATA/wp/wp-content/themes
FORGEWP_MAILPIT_URL=http://localhost:8025
ENV
  fi
  echo "WordPress $(wpcli core version) at http://localhost:8080 (admin/admin) · Mailpit at http://localhost:8025"
  echo "Browser: export CHROME_PATH=$(ls /opt/pw-browsers/chromium-*/chrome-linux64/chrome 2>/dev/null | head -1)"
}

case "${1:-up}" in
  up) up ;;
  down) ensure_docker; "${DC[@]}" down ;;
  reset) ensure_docker; "${DC[@]}" down -v; sudo rm -rf "$FORGEWP_E2E_DATA/wp"; up ;;
  wp) shift; ensure_docker; wpcli "$@" ;;
  *) echo "usage: $0 up|down|reset|wp <args>" >&2; exit 2 ;;
esac
