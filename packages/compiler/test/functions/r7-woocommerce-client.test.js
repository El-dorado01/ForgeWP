import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const wooHooksPath = new URL('../../../woocommerce/src/hooks.ts', import.meta.url).href;
const {
  formatMoney,
  getCommerceApiBaseUrl,
  commerceFetch,
  getCartToken,
  setCartToken,
  clearGuestCartToken,
  mergeGuestCart,
  fetchCheckoutOrder,
  submitCheckoutOrder,
  normalizeContractCart,
  DEFAULT_COMMERCE_CURRENCY,
} = await import(wooHooksPath);

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
  };
}

describe('R7 WooCommerce client (§15.1–§15.5, §15.7)', () => {
  const prevWindow = globalThis.window;
  const prevFetch = globalThis.fetch;
  const prevWpUrl = process.env.FORGEWP_WP_URL;
  const prevNextWpUrl = process.env.NEXT_PUBLIC_FORGEWP_WP_URL;
  const prevLegacyUrl = process.env.NEXT_PUBLIC_WP_API_URL;

  beforeEach(() => {
    clearGuestCartToken();
    delete process.env.FORGEWP_WP_URL;
    delete process.env.NEXT_PUBLIC_FORGEWP_WP_URL;
    delete process.env.NEXT_PUBLIC_WP_API_URL;
    (globalThis).window = {
      localStorage: createMemoryStorage(),
      forgeWpHydration: {
        restNonce: 'wp_nonce_123',
        resources: {
          'commerce-settings': {
            currency: DEFAULT_COMMERCE_CURRENCY,
          },
        },
      },
    };
  });

  afterEach(() => {
    clearGuestCartToken();
    globalThis.window = prevWindow;
    globalThis.fetch = prevFetch;
    if (prevWpUrl === undefined) delete process.env.FORGEWP_WP_URL;
    else process.env.FORGEWP_WP_URL = prevWpUrl;
    if (prevNextWpUrl === undefined) delete process.env.NEXT_PUBLIC_FORGEWP_WP_URL;
    else process.env.NEXT_PUBLIC_FORGEWP_WP_URL = prevNextWpUrl;
    if (prevLegacyUrl === undefined) delete process.env.NEXT_PUBLIC_WP_API_URL;
    else process.env.NEXT_PUBLIC_WP_API_URL = prevLegacyUrl;
  });

  it('has zero /wc/store/v1 or forgewp-store-nonce references in @forgewp/woocommerce', () => {
    const pkgRoot = path.resolve(import.meta.dirname, '../../../woocommerce/src');
    const hooksSrc = readFileSync(path.join(pkgRoot, 'hooks.ts'), 'utf8');
    const componentsSrc = readFileSync(path.join(pkgRoot, 'components.tsx'), 'utf8');
    expect(hooksSrc).not.toContain('wc/store/v1');
    expect(hooksSrc).not.toContain('forgewp-store-nonce');
    expect(hooksSrc).not.toContain('/cart/sync');
    expect(componentsSrc).not.toContain('wc/store/v1');
    expect(componentsSrc).not.toContain('fetchStoreApi');
  });

  it('formatMoney matches wc_price across 0, 2, and 3 decimal currencies + negative amounts', () => {
    expect(
      formatMoney(2550, {
        code: 'USD',
        symbol: '$',
        minorUnit: 2,
        decimalSeparator: '.',
        thousandSeparator: ',',
        prefix: '$',
        suffix: '',
      }),
    ).toBe('$25.50');

    expect(
      formatMoney(123456, {
        code: 'EUR',
        symbol: '€',
        minorUnit: 2,
        decimalSeparator: ',',
        thousandSeparator: '.',
        prefix: '',
        suffix: ' €',
      }),
    ).toBe('1.234,56 €');

    expect(
      formatMoney(3, {
        code: 'JPY',
        symbol: '¥',
        minorUnit: 0,
        decimalSeparator: '.',
        thousandSeparator: ',',
        prefix: '¥',
        suffix: '',
      }),
    ).toBe('¥3');

    expect(
      formatMoney(1250, {
        code: 'KWD',
        symbol: 'KD',
        minorUnit: 3,
        decimalSeparator: '.',
        thousandSeparator: ',',
        prefix: 'KD ',
        suffix: '',
      }),
    ).toBe('KD 1.250');

    expect(formatMoney(-505, DEFAULT_COMMERCE_CURRENCY)).toBe('-$5.05');
  });

  it('prioritizes FORGEWP_WP_URL / NEXT_PUBLIC_FORGEWP_WP_URL over legacy env vars (A6)', () => {
    process.env.NEXT_PUBLIC_WP_API_URL = 'https://legacy.example.test';
    expect(getCommerceApiBaseUrl()).toBe('https://legacy.example.test');

    process.env.NEXT_PUBLIC_FORGEWP_WP_URL = 'https://runtime-public.example.test/';
    expect(getCommerceApiBaseUrl()).toBe('https://runtime-public.example.test');

    process.env.FORGEWP_WP_URL = 'https://runtime-server.example.test/';
    expect(getCommerceApiBaseUrl()).toBe('https://runtime-server.example.test');
  });

  it('sends ?contract=2, X-WP-Nonce, and persists/forwards X-ForgeWP-Cart-Token across requests', async () => {
    process.env.FORGEWP_WP_URL = 'https://shop.example.test';
    const seen = [];

    globalThis.fetch = async (url, init) => {
      const headers = new Headers(init?.headers || {});
      seen.push({
        url: String(url),
        method: init?.method || 'GET',
        nonce: headers.get('X-WP-Nonce'),
        cartToken: headers.get('X-ForgeWP-Cart-Token'),
        auth: headers.get('Authorization'),
      });
      const respHeaders = new Headers({ 'Content-Type': 'application/json' });
      if (seen.length === 1) {
        respHeaders.set('X-ForgeWP-Cart-Token', 'v1.guest_session_abc');
      }
      return new Response(
        JSON.stringify({
          items: [],
          itemCount: 0,
          coupons: [],
          fees: [],
          needsShipping: false,
          shippingPackages: [],
          totals: { subtotal: 0, discount: 0, shipping: 0, fees: 0, tax: 0, total: 27230 },
          needsPayment: false,
          errors: [],
          currency: DEFAULT_COMMERCE_CURRENCY,
        }),
        { status: 200, headers: respHeaders },
      );
    };

    const res1 = await commerceFetch('/cart', { method: 'GET', contractV2: true, includeCartToken: true });
    expect(res1.ok).toBe(true);
    expect(seen[0].url).toBe('https://shop.example.test/wp-json/forgewp/v1/cart?contract=2');
    expect(seen[0].nonce).toBe('wp_nonce_123');
    expect(seen[0].cartToken).toBeNull();
    expect(getCartToken()).toBe('v1.guest_session_abc');
    expect(globalThis.window.localStorage.getItem('forgewp_cart_token')).toBe('v1.guest_session_abc');

    // Second request must send the persisted X-ForgeWP-Cart-Token back
    await mergeGuestCart();
    expect(seen[1].url).toBe('https://shop.example.test/wp-json/forgewp/v1/cart/merge');
    expect(seen[1].method).toBe('POST');
    expect(seen[1].cartToken).toBe('v1.guest_session_abc');
    expect(seen[1].nonce).toBe('wp_nonce_123');

    // Checkout order view query string works cleanly
    await fetchCheckoutOrder(42, 'wc_order_xyz');
    expect(seen[2].url).toBe(
      'https://shop.example.test/wp-json/forgewp/v1/checkout/order?id=42&key=wc_order_xyz',
    );
  });

  it('normalizes §15.3 cart payload including minor-unit totals and coupons', () => {
    const normalized = normalizeContractCart({
      items: [
        {
          key: 'abc123',
          productId: 28,
          variationId: 31,
          slug: 'blazer',
          path: '/product/blazer/',
          name: 'Wool Blazer',
          quantity: 2,
          quantityLimits: { min: 1, max: 5, step: 1 },
          variation: [{ attribute: 'Size', value: 'M' }],
          image: { id: 10, src: 'https://shop.test/blazer.jpg', srcset: '', alt: 'Blazer', width: 800, height: 800 },
          prices: { price: 15000, regularPrice: 18000 },
          totals: { subtotal: 30000, subtotalTax: 0, total: 30000, totalTax: 0 },
          backordered: false,
        },
      ],
      itemCount: 2,
      coupons: [{ code: 'save10', discount: 3000, discountTax: 0 }],
      fees: [],
      needsShipping: true,
      shippingPackages: [
        {
          id: 0,
          destination: { country: 'DE', postcode: '10115', city: 'Berlin', state: '' },
          rates: [{ id: 'flat_rate:1', label: 'Flat rate', cost: 500, selected: true }],
        },
      ],
      totals: { subtotal: 30000, discount: 3000, shipping: 500, fees: 0, tax: 0, total: 27500 },
      needsPayment: true,
      errors: [],
      currency: DEFAULT_COMMERCE_CURRENCY,
    });

    expect(normalized.itemCount).toBe(2);
    expect(normalized.totals.total).toBe(27500);
    expect(normalized.couponCodes).toEqual(['SAVE10']);
    expect(normalized.shippingMethod).toBe('flat_rate:1');
    expect(formatMoney(normalized.totals.total, normalized.currency)).toBe('$275.00');
  });

  it('checkout keeps cart on needsRedirect: true, clears on false, and surfaces 402 payment_failed message', async () => {
    process.env.FORGEWP_WP_URL = 'https://shop.example.test';
    let postedBody = null;
    let clearedCount = 0;

    globalThis.fetch = async (_url, init) => {
      postedBody = JSON.parse(String(init?.body || '{}'));
      if (postedBody.paymentMethod === 'paypal_redirect') {
        return new Response(
          JSON.stringify({
            orderId: 91,
            orderKey: 'wc_order_red',
            orderNumber: '91',
            status: 'pending',
            paymentMethod: 'paypal_redirect',
            total: 2500,
            currency: DEFAULT_COMMERCE_CURRENCY,
            needsRedirect: true,
            redirectUrl: 'https://pay.example.test/checkout?token=abc',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (postedBody.paymentMethod === 'failing_gw') {
        return new Response(
          JSON.stringify({
            code: 'payment_failed',
            message: 'Card declined by issuer.',
          }),
          { status: 402, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          orderId: 92,
          orderKey: 'wc_order_bacs',
          orderNumber: '92',
          status: 'on-hold',
          paymentMethod: 'bacs',
          total: 2500,
          currency: DEFAULT_COMMERCE_CURRENCY,
          needsRedirect: false,
          redirectUrl: 'https://shop.example.test/checkout/order-received/92/',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    // 1. Redirect gateway: must NOT clear cart
    const redirectRes = await submitCheckoutOrder(
      {
        billingAddress: { first_name: 'Ada', last_name: 'L', address_1: '1 Main', email: 'ada@example.test', city: 'Berlin', postcode: '10115', country: 'DE' },
        paymentMethod: 'paypal_redirect',
      },
      async () => { clearedCount++; },
    );
    expect(redirectRes.success).toBe(true);
    expect(redirectRes.needsRedirect).toBe(true);
    expect(redirectRes.redirectUrl).toBe('https://pay.example.test/checkout?token=abc');
    expect(postedBody.billingAddress.firstName).toBe('Ada');
    expect(postedBody.billingAddress.address1).toBe('1 Main');
    expect(clearedCount).toBe(0);

    // 2. Offline gateway: clears cart
    const offlineRes = await submitCheckoutOrder(
      {
        billingAddress: { firstName: 'Ada', lastName: 'L', address1: '1 Main', email: 'ada@example.test', city: 'Berlin', postcode: '10115', country: 'DE' },
        paymentMethod: 'bacs',
      },
      async () => { clearedCount++; },
    );
    expect(offlineRes.success).toBe(true);
    expect(offlineRes.needsRedirect).toBe(false);
    expect(clearedCount).toBe(1);

    // 3. 402 payment_failed: surfaces message and keeps cart
    const failRes = await submitCheckoutOrder(
      {
        billingAddress: { firstName: 'Ada', lastName: 'L', address1: '1 Main', email: 'ada@example.test', city: 'Berlin', postcode: '10115', country: 'DE' },
        paymentMethod: 'failing_gw',
      },
      async () => { clearedCount++; },
    );
    expect(failRes.success).toBe(false);
    expect(failRes.code).toBe('payment_failed');
    expect(failRes.error).toBe('Card declined by issuer.');
    expect(clearedCount).toBe(1);
  });

  it('contains no sample Stripe gateway fallback or GET /cart/clear calls, and uses DELETE /cart/items + isDevFallbackMode() in useWpCheckout', () => {
    const src = readFileSync(
      path.resolve(import.meta.dirname, '../../../woocommerce/src/hooks.ts'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(src).not.toContain('Credit Card (Stripe)');
    expect(src).not.toContain('fetchForgeWpCart');
    expect(src).not.toContain('/cart/clear');
    expect(src).toContain('commerceFetch<ContractCart>("/cart/items"');
    expect(src).toContain('method: "DELETE"');
    expect(src).toContain('useState<PaymentGateway[]>(\n    isDevFallbackMode()');
    expect(src).toContain('if (!isDevFallbackMode() && typeof window !== "undefined") {\n      commerceFetch<{ gateways?: PaymentGateway[] }>("/checkout/gateways"');
  });
});
