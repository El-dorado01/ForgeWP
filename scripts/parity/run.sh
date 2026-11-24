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
# One approved comment so the R2 comments loop is compared (before the decoupled build).
FIRST_POST="$("$SANDBOX" wp post list --post_type=post --name=first-parity-post --field=ID)"
if [ -n "$FIRST_POST" ] && [ "$("$SANDBOX" wp comment list --post_id="$FIRST_POST" --format=count)" = "0" ]; then
  "$SANDBOX" wp comment create --comment_post_ID="$FIRST_POST" --comment_author="Parity Reader" \
    --comment_author_email=reader@example.test --comment_content="Native and decoupled agree." --comment_approved=1 >/dev/null
fi
# R5: stored editable values on /about/ (not just schema defaults), before the decoupled build.
ABOUT="$("$SANDBOX" wp post list --post_type=page --name=about --field=ID)"
if [ -n "$ABOUT" ]; then
  "$SANDBOX" wp eval "
    update_post_meta($ABOUT, 'about_tagline', 'Seeded tagline from WordPress');
    update_post_meta($ABOUT, 'about_intro', \"First paragraph.\n\nSecond paragraph with <strong>markup</strong>.\");
    update_post_meta($ABOUT, 'about_founded', '1999');
    update_post_meta($ABOUT, 'about_team', 2);
    update_post_meta($ABOUT, 'about_team_0_name', 'Ada'); update_post_meta($ABOUT, 'about_team_0_role', 'Engineering');
    update_post_meta($ABOUT, 'about_team_1_name', 'Grace'); update_post_meta($ABOUT, 'about_team_1_role', 'Compilers');
  " >/dev/null
fi
# Forms rate-limit counters from earlier local runs.
"$SANDBOX" wp transient delete --all >/dev/null

step "Settle WordPress before the decoupled build"
# Run jobs WooCommerce and core queue after install, then wait until every
# endpoint the build reads answers 200 with JSON. The decoupled runtime still
# falls back silently on a failed fetch (status §9c/§9d, Gemini), and a
# prerendered page would keep that empty fallback.
"$SANDBOX" wp cron event run --due-now >/dev/null 2>&1 || true
for endpoint in site-settings menus/primary menus forms routes i18n; do
  ok=0
  for _ in $(seq 1 20); do
    if curl -fsS -H 'Accept: application/json' "$WP_URL/wp-json/forgewp/v1/$endpoint" | head -c 1 | grep -q '[{[]'; then ok=1; break; fi
    sleep 1
  done
  [ "$ok" = 1 ] || echo "warning: /forgewp/v1/$endpoint did not answer with JSON before the build"
done

step "Decoupled: next build && next start (port $NEXT_PORT)"
rm -rf "$FIXTURE/.next"
(cd "$FIXTURE" && FORGEWP_DEPLOYMENT_MODE=decoupled FORGEWP_WP_URL="$WP_URL" pnpm exec next build) 2>&1 | tee "$(dirname "$REPORT")/next-build.log"
[ "${PIPESTATUS[0]}" = 0 ] || exit 1
(cd "$FIXTURE" && FORGEWP_DEPLOYMENT_MODE=decoupled FORGEWP_WP_URL="$WP_URL" exec pnpm exec next start -p "$NEXT_PORT") \
  > "$(dirname "$REPORT")/next.log" 2>&1 &
NEXT_PID=$!
trap 'kill $NEXT_PID 2>/dev/null || true; pkill -f "next start -p $NEXT_PORT" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do curl -fsS -o /dev/null "http://localhost:$NEXT_PORT/" && break; sleep 1; done

step "Compare"
status=0
PARITY_WP_URL="$WP_URL" PARITY_NEXT_URL="http://localhost:$NEXT_PORT" \
  node "$REPO/scripts/parity/run-parity.mjs" --report "$REPORT" || status=$?

# Web server access/error log for the CI artifact (REST status codes during the build).
sudo docker logs forgewp-e2e-wordpress-1 > "$(dirname "$REPORT")/wordpress-access.log" 2>&1 || true

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
