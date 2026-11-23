#!/usr/bin/env bash
# ForgeWP Phase D parity (R6): one project, two deployments, one WordPress.
#
#   scripts/parity/run.sh            # reuse the running sandbox (scripts/cloud-e2e/sandbox.sh)
#   PARITY_RESET=1 scripts/parity/run.sh   # start from a fresh WordPress (what CI does)
#
# 1. WordPress + MariaDB + Mailpit via scripts/cloud-e2e/sandbox.sh
# 2. Native: export projects/parity-fixture, install and activate the theme
# 3. Decoupled: next build + next start of the same project against that WordPress
# 4. scripts/parity/run-parity.mjs compares them (report in .forgewp/parity/report.json)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SANDBOX="$REPO/scripts/cloud-e2e/sandbox.sh"
FIXTURE="$REPO/projects/parity-fixture"
export FORGEWP_E2E_DATA="${FORGEWP_E2E_DATA:-/home/user/e2e}"
WP_URL="${PARITY_WP_URL:-http://localhost:8080}"
NEXT_PORT="${PARITY_NEXT_PORT:-3100}"
REPORT="${PARITY_REPORT:-$REPO/.forgewp/parity/report.json}"
export WC_VERSION="${WC_VERSION:-11.0.1}"
mkdir -p "$(dirname "$REPORT")"

step() { echo; echo "── $*"; }

step "WordPress sandbox"
if [ "${PARITY_RESET:-0}" = "1" ]; then "$SANDBOX" reset; else "$SANDBOX" up; fi

if [ "${PARITY_WOOCOMMERCE:-0}" = "1" ]; then
  step "WooCommerce $WC_VERSION (GitHub release) + store fixture"
  "$REPO/scripts/parity/woocommerce-fixture.sh"
fi

step "Native: export and activate parity-fixture"
(cd "$FIXTURE" && pnpm forgewp export --no-zip)
THEMES="$FORGEWP_E2E_DATA/wp/wp-content/themes"
rm -rf "$THEMES/parity-fixture"
cp -r "$FIXTURE/.forgewp/out/parity-fixture" "$THEMES/"
"$SANDBOX" wp theme activate parity-fixture
# First requests run activation provisioning (pages, menus, seed) and the
# deferred rewrite refresh for /blog/ permalinks.
for path in / /blog/ /; do curl -fsS -o /dev/null "$WP_URL$path"; done
# Forms rate-limit counters from earlier local runs.
"$SANDBOX" wp transient delete --all >/dev/null

step "Decoupled: next build && next start (port $NEXT_PORT)"
rm -rf "$FIXTURE/.next"
(cd "$FIXTURE" && FORGEWP_DEPLOYMENT_MODE=decoupled FORGEWP_WP_URL="$WP_URL" pnpm exec next build)
(cd "$FIXTURE" && FORGEWP_DEPLOYMENT_MODE=decoupled FORGEWP_WP_URL="$WP_URL" exec pnpm exec next start -p "$NEXT_PORT") \
  > "$(dirname "$REPORT")/next.log" 2>&1 &
NEXT_PID=$!
trap 'kill $NEXT_PID 2>/dev/null || true; pkill -f "next start -p $NEXT_PORT" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do curl -fsS -o /dev/null "http://localhost:$NEXT_PORT/" && break; sleep 1; done

step "Compare"
status=0
PARITY_WP_URL="$WP_URL" PARITY_NEXT_URL="http://localhost:$NEXT_PORT" \
  node "$REPO/scripts/parity/run-parity.mjs" --report "$REPORT" || status=$?

step "WordPress debug.log"
LOG="$FORGEWP_E2E_DATA/wp/wp-content/debug.log"
if sudo test -f "$LOG"; then
  sudo cp "$LOG" "$(dirname "$REPORT")/debug.log" && sudo chown "$(id -u)" "$(dirname "$REPORT")/debug.log"
  if grep -E 'PHP (Fatal|Parse|Warning)|\[ForgeWP\]' "$(dirname "$REPORT")/debug.log"; then
    echo "✗ debug.log has PHP errors or ForgeWP warnings (above)"; status=1
  fi
fi
[ "$status" = 0 ] && echo "✓ debug.log clean"
exit "$status"
