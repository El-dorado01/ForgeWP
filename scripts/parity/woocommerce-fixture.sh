#!/usr/bin/env bash
# Installs WooCommerce from its GitHub release and creates the small store the
# parity "commerce" check expects. Idempotent: skips what already exists.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SANDBOX="$REPO/scripts/cloud-e2e/sandbox.sh"
export FORGEWP_E2E_DATA="${FORGEWP_E2E_DATA:-/home/user/e2e}"
WC_VERSION="${WC_VERSION:-11.0.1}"
PLUGINS="$FORGEWP_E2E_DATA/wp/wp-content/plugins"
wp() { "$SANDBOX" wp "$@"; }

if ! sudo test -f "$PLUGINS/woocommerce/woocommerce.php"; then
  TMP="$(mktemp -d)"
  curl -fsSL -o "$TMP/woocommerce.zip" "https://github.com/woocommerce/woocommerce/releases/download/$WC_VERSION/woocommerce.zip"
  (cd "$TMP" && unzip -q woocommerce.zip)
  sudo cp -r "$TMP/woocommerce" "$PLUGINS/"
  sudo chown -R 33:33 "$PLUGINS/woocommerce"
  rm -rf "$TMP"
fi
wp plugin activate woocommerce >/dev/null
wp option update woocommerce_coming_soon no >/dev/null
wp option update woocommerce_default_country DE >/dev/null
wp option update woocommerce_currency EUR >/dev/null

exists() { [ -n "$(wp post list --post_type="$1" --name="$2" --field=ID 2>/dev/null)" ]; }
CAT="$(wp term list product_cat --slug=clothing --field=term_id 2>/dev/null || true)"
[ -n "$CAT" ] || CAT="$(wp wc product_cat create --user=admin --name=Clothing --porcelain)"
exists product linen-shirt || wp wc product create --user=admin --name="Linen Shirt" --type=simple --regular_price=49.90 \
  --manage_stock=true --stock_quantity=3 --categories="[{\"id\":$CAT}]" --porcelain >/dev/null
exists product wool-scarf || wp wc product create --user=admin --name="Wool Scarf" --type=simple --regular_price=30 \
  --sale_price=24.50 --categories="[{\"id\":$CAT}]" --porcelain >/dev/null
if ! exists product canvas-jacket; then
  JACKET="$(wp wc product create --user=admin --name="Canvas Jacket" --type=variable --categories="[{\"id\":$CAT}]" \
    --attributes='[{"name":"Size","options":["S","M"],"variation":true,"visible":true}]' --porcelain)"
  wp wc product_variation create "$JACKET" --user=admin --regular_price=120 --attributes='[{"name":"Size","option":"S"}]' --porcelain >/dev/null
  wp wc product_variation create "$JACKET" --user=admin --regular_price=130 --attributes='[{"name":"Size","option":"M"}]' --porcelain >/dev/null
fi
if [ -z "$(wp wc shipping_zone list --user=admin --field=id 2>/dev/null | grep -v '^0$' || true)" ]; then
  ZONE="$(wp wc shipping_zone create --user=admin --name=Germany --porcelain)"
  wp wc shipping_zone_location update "$ZONE" --user=admin --body='[{"code":"DE","type":"country"}]' >/dev/null 2>&1 || true
  wp wc shipping_zone_method create "$ZONE" --user=admin --method_id=flat_rate --settings='{"cost":"5"}' --porcelain >/dev/null
  wp wc shipping_zone_method create "$ZONE" --user=admin --method_id=free_shipping --porcelain >/dev/null
fi
wp wc payment_gateway update bacs --user=admin --enabled=true >/dev/null
wp wc payment_gateway update cod --user=admin --enabled=true >/dev/null
exists shop_coupon save10 || wp wc shop_coupon create --user=admin --code=save10 --discount_type=percent --amount=10 --porcelain >/dev/null
# Two customers for the signed-in account checks (throwaway sandbox credentials).
wp user get parity-ada --field=ID >/dev/null 2>&1 || wp user create parity-ada parity-ada@example.test --role=customer --user_pass=parity-ada-pass --first_name=Ada --porcelain >/dev/null
wp user get parity-bob --field=ID >/dev/null 2>&1 || wp user create parity-bob parity-bob@example.test --role=customer --user_pass=parity-bob-pass --porcelain >/dev/null
# Stock may have been bought by an earlier local run.
SHIRT="$(wp post list --post_type=product --name=linen-shirt --field=ID)"
wp wc product update "$SHIRT" --user=admin --stock_quantity=3 >/dev/null
echo "WooCommerce $(wp plugin get woocommerce --field=version) store fixture ready"
