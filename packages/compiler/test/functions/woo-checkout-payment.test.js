/**
 * R7 review finding: POST /forgewp/v1/checkout/process never ran the payment
 * gateway. It forced every order to "processing" whatever payment_method said,
 * defaulted to "cod", accepted gateway ids WooCommerce does not offer, and the
 * gateways endpoint listed fake Stripe/PayPal entries when none were enabled.
 * A shopper could pick "stripe" and get a paid-looking order without paying.
 *
 * Executes the generated PHP against small WooCommerce stand-ins.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildRestEndpointsPhp } from '../../lib/functions/rest-endpoints.js';

const hasPhp = spawnSync('php', ['-v']).status === 0;

let cached;
function checkoutPhp() {
  if (!cached) {
    const php = buildRestEndpointsPhp({ textDomain: 't', auth: true }, [], true, 'R', 'B', 'V', 'B', 'usernameAndEmail', '0', '1', '0', {});
    const a = php.indexOf('function forgewp_rest_get_checkout_gateways(');
    const b = php.indexOf('function forgewp_rest_get_customer_orders(', a);
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    cached = php.slice(a, b);
  }
  return cached;
}

const STUBS = `
class WP_Error { public $code; public $message; public $data; function __construct($c, $m, $d = array()) { $this->code = $c; $this->message = $m; $this->data = $d; } function get_error_message() { return $this->message; } }
function is_wp_error($v) { return $v instanceof WP_Error; }
function rest_ensure_response($v) { return $v; }
function sanitize_key($v) { return strtolower(preg_replace('/[^a-z0-9_\\-]/i', '', $v)); }
function sanitize_text_field($v) { return trim(strip_tags((string) $v)); }
function sanitize_textarea_field($v) { return trim(strip_tags((string) $v)); }
function sanitize_email($v) { return filter_var($v, FILTER_SANITIZE_EMAIL); }
function is_email($v) { return (bool) filter_var($v, FILTER_VALIDATE_EMAIL); }
function wp_strip_all_tags($v) { return strip_tags($v); }
function do_action(...$a) { global $log; $log[] = 'action:' . $a[0]; }
function wc_get_notices($t) { global $notices; return $notices; }
function apply_filters($n, $v) { return $v; }
function wc_clear_notices() { global $notices; $notices = array(); }
function forgewp_ensure_wc_cart() { return true; }
function forgewp_save_wc_cart() { global $log; $log[] = 'save'; }
class Req { public $p; function __construct($p) { $this->p = $p; } function get_json_params() { return $this->p; } function get_params() { return $this->p; } }
class Gateway { public $id; public $supports = array('products'); public $result; public $fields = false; function __construct($id, $result) { $this->id = $id; $this->result = $result; } function has_fields() { return $this->fields; }
  function get_title() { return strtoupper($this->id); } function get_method_title() { return $this->id; } function get_description() { return ''; } function get_icon() { return ''; }
  function process_payment($order_id) { global $log, $orders; $log[] = 'pay:' . $this->id; if (($this->result['result'] ?? '') === 'success') { $orders[$order_id]->status = $this->result['status']; } return $this->result; } }
class Order { public $id; public $status = 'pending'; public $pm; function __construct($id, $pm) { $this->id = $id; $this->pm = $pm; }
  function get_id() { return $this->id; } function get_order_key() { return 'wc_order_k'; } function get_order_number() { return (string) $this->id; } function get_status() { return $this->status; }
  function get_total() { return '25.00'; } function get_currency() { return 'USD'; } function get_payment_method() { return $this->pm; }
  function get_checkout_order_received_url() { return 'https://shop.test/checkout/order-received/' . $this->id . '/'; }
  function has_status($s) { return in_array($this->status, (array) $s, true); } function add_order_note($n) {} function payment_complete() { $this->status = 'processing'; }
  function update_status($s) { global $log; $log[] = 'FORCED_STATUS:' . $s; $this->status = $s; } }
function wc_get_order($id) { global $orders; return $orders[$id] ?? false; }
class Cart { public $items = array('k' => 1); public $needs = true; public $stock = true;
  function get_cart() { return $this->items; } function needs_payment() { return $this->needs; } function calculate_shipping() {} function calculate_totals() {}
  function check_cart_item_stock() { return $this->stock === true ? true : new WP_Error('stock', $this->stock); } function empty_cart() { global $log; $log[] = 'empty_cart'; $this->items = array(); } }
class Customer { function __call($m, $a) {} function save() {} }
class Checkout { function create_order($data) { global $orders, $log; $log[] = 'create_order:' . $data['payment_method'] . ':' . $data['billing_email'] . ':' . $data['shipping_city']; $orders[101] = new Order(101, $data['payment_method']); return 101; } }
class Gateways { public $available; function get_available_payment_gateways() { return $this->available; } }
class WCMain { public $cart; public $customer; public $session = null; public $gw; function payment_gateways() { return $this->gw; } function checkout() { return new Checkout(); } }
function get_current_user_id() { global $current_user_id; return $current_user_id; }
class WC_Customer { public $id; function __construct($id) { $this->id = $id; } function __call($m, $a) { global $saved_account; $saved_account[$m] = $a[0]; } function save() { global $log; $log[] = 'account_saved:' . $this->id; } }
$current_user_id = 0; $saved_account = array();
$log = array(); $orders = array(); $notices = array();
`;

function run(script) {
  const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-woo-checkout-'));
  try {
    const f = path.join(dir, 'run.php');
    writeFileSync(f, `<?php\n${STUBS}\n${checkoutPhp()}\n${script}`);
    const out = spawnSync('php', [f], { encoding: 'utf8' });
    expect(out.status, out.stderr + out.stdout).toBe(0);
    return JSON.parse(out.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const setup = ({ gateways = "array('cod' => new Gateway('cod', array('result' => 'success', 'status' => 'processing', 'redirect' => '')), 'bacs' => new Gateway('bacs', array('result' => 'success', 'status' => 'on-hold', 'redirect' => '')))", needs = true } = {}) => `
$wc = new WCMain(); $wc->cart = new Cart(); $wc->cart->needs = ${needs ? 'true' : 'false'}; $wc->customer = new Customer(); $wc->gw = new Gateways(); $wc->gw->available = ${gateways};
function WC() { global $wc; return $wc; }
`;
const body = (extra = {}) => JSON.stringify({
  billing_address: { first_name: 'Ada', email: 'ada@example.test', address_1: '1 Main', city: 'Berlin', country: 'DE' },
  ...extra,
});
const checkout = (payload) => `$r = forgewp_rest_process_checkout(new Req(json_decode(${JSON.stringify(payload)}, true)));
echo json_encode(array('r' => is_wp_error($r) ? array('error' => $r->code, 'status' => $r->data['status'] ?? null, 'message' => $r->message) : $r, 'log' => $log));`;

describe('checkout payment (R7 review)', () => {
  it.skipIf(!hasPhp)('rejects a gateway WooCommerce does not offer, and does not create an order', () => {
    const { r, log } = run(setup() + checkout(body({ payment_method: 'stripe' })));
    expect(r).toMatchObject({ error: 'invalid_payment_method', status: 400 });
    expect(log.some((l) => l.startsWith('create_order'))).toBe(false);
  });

  it.skipIf(!hasPhp)('has no default payment method', () => {
    const { r } = run(setup() + checkout(body()));
    expect(r).toMatchObject({ error: 'invalid_payment_method', status: 400 });
  });

  it.skipIf(!hasPhp)('lets the gateway decide the status (bacs → on-hold) and never forces one', () => {
    const { r, log } = run(setup() + checkout(body({ payment_method: 'bacs' })));
    expect(r).toMatchObject({ success: true, status: 'on-hold', paymentMethod: 'bacs', needsRedirect: false });
    expect(log).toContain('pay:bacs');
    expect(log.some((l) => l.startsWith('FORCED_STATUS'))).toBe(false);
    expect(log).toContain('empty_cart');
    expect(log).toContain('action:woocommerce_checkout_order_processed');
    // Shipping address falls back to billing.
    expect(log).toContain('create_order:bacs:ada@example.test:Berlin');
  });

  it.skipIf(!hasPhp)('keeps the cart and returns the gateway redirect for off-site payment', () => {
    const gw = "array('offsite' => new Gateway('offsite', array('result' => 'success', 'status' => 'pending', 'redirect' => 'https://pay.example/session/1')))";
    const { r, log } = run(setup({ gateways: gw }) + checkout(body({ payment_method: 'offsite' })));
    expect(r).toMatchObject({ success: true, status: 'pending', needsRedirect: true, redirectUrl: 'https://pay.example/session/1' });
    expect(log).not.toContain('empty_cart');
  });

  it.skipIf(!hasPhp)('returns 402 with the gateway notice when payment fails, cart kept', () => {
    const gw = "array('card' => new Gateway('card', array('result' => 'failure')))";
    const { r, log } = run(setup({ gateways: gw }) + `$notices = array(array('notice' => '<b>Card declined</b>'));` + checkout(body({ payment_method: 'card' })));
    expect(r).toMatchObject({ error: 'payment_failed', status: 402, message: 'Card declined' });
    expect(log).not.toContain('empty_cart');
  });

  it.skipIf(!hasPhp)('completes free orders without a gateway', () => {
    const { r, log } = run(setup({ needs: false }) + checkout(body()));
    expect(r).toMatchObject({ success: true, status: 'processing' });
    expect(log.some((l) => l.startsWith('pay:'))).toBe(false);
  });

  it.skipIf(!hasPhp)('saves a signed-in customer\'s addresses to the account, not for guests', () => {
    const guest = run(setup() + checkout(body({ payment_method: 'cod' })));
    expect(guest.log.some((l) => l.startsWith('account_saved'))).toBe(false);
    const user = run(setup() + '$current_user_id = 7;' + checkout(body({ payment_method: 'cod' })));
    expect(user.log).toContain('account_saved:7');
  });

  it.skipIf(!hasPhp)('requires a valid billing email and refuses out-of-stock carts', () => {
    expect(run(setup() + checkout(JSON.stringify({ payment_method: 'cod', billing_address: { email: 'nope' } }))).r).toMatchObject({ error: 'invalid_billing_email', status: 400 });
    expect(run(setup() + `$wc_stock = 1;` + checkout(body({ payment_method: 'cod' })).replace('$r = ', '$wc->cart->stock = "Only 1 left"; $r = ')).r).toMatchObject({ error: 'out_of_stock', status: 409, message: 'Only 1 left' });
  });

  it.skipIf(!hasPhp)('lists only real gateways, never invented ones', () => {
    const real = run(setup() + `echo json_encode(array('r' => forgewp_rest_get_checkout_gateways(null), 'log' => array()));`).r;
    expect(real.gateways.map((g) => g.id)).toEqual(['cod', 'bacs']);
    expect(real.gateways.map((g) => g.flow)).toEqual(['offline', 'offline']);
    const mixed = run(setup({ gateways: "array('paypal' => new Gateway('paypal', array()), 'card' => (function () { $g = new Gateway('card', array()); $g->fields = true; return $g; })())" }) + `echo json_encode(array('r' => forgewp_rest_get_checkout_gateways(null), 'log' => array()));`).r;
    expect(mixed.gateways.map((g) => [g.id, g.flow])).toEqual([['paypal', 'redirect'], ['card', 'client']]);
    const none = run(setup({ gateways: 'array()' }) + `echo json_encode(array('r' => forgewp_rest_get_checkout_gateways(null), 'log' => array()));`).r;
    expect(none.gateways).toEqual([]);
  });
});

describe('cart routes', () => {
  it('registers /cart/remove-coupon (called by useWpCart, previously 404)', () => {
    const php = buildRestEndpointsPhp({ textDomain: 't', auth: true }, [], true, 'R', 'B', 'V', 'B', 'usernameAndEmail', '0', '1', '0', {});
    expect(php).toMatch(/register_rest_route\( 'forgewp\/v1', '\/cart\/remove-coupon'[\s\S]{0,120}forgewp_rest_remove_coupon/);
  });
});
