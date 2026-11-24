/**
 * R7 commerce resources (docs/resource-contracts.md §15): money helpers,
 * `commerce-settings`, `products` / `product`, and the contract cart with the
 * cross-origin guest cart token. Backend code (Companion Plugin + theme
 * fallback). Every function is inert unless WooCommerce is active.
 *
 * The contract shape is the only shape (the legacy routes and shapes were
 * removed on 2026-11-24). A `?contract=2` parameter or `X-ForgeWP-Contract`
 * header from older clients is accepted and ignored.
 *
 * Note: PHP lives in a JS template literal. No backslashes, no `${`.
 */
export function buildCommerceResourcesPhp() {
  return `
/**
 * ── Commerce resources (R7, resource-contracts.md §15) ──
 */
if (!function_exists('forgewp_commerce_available')) {
    function forgewp_commerce_available() {
        return class_exists('WooCommerce') && function_exists('WC');
    }

    // ── Money (§15.1): integers in minor units + one currency object ──────────

    function forgewp_commerce_currency($code = null) {
        $code = $code ? (string) $code : get_woocommerce_currency();
        $symbol = html_entity_decode(get_woocommerce_currency_symbol($code), ENT_QUOTES, 'UTF-8');
        $prefix = '';
        $suffix = '';
        switch ((string) get_option('woocommerce_currency_pos', 'left')) {
            case 'right':
                $suffix = $symbol;
                break;
            case 'left_space':
                $prefix = $symbol . ' ';
                break;
            case 'right_space':
                $suffix = ' ' . $symbol;
                break;
            default:
                $prefix = $symbol;
        }
        return array(
            'code'              => $code,
            'symbol'            => $symbol,
            'minorUnit'         => (int) wc_get_price_decimals(),
            'decimalSeparator'  => (string) wc_get_price_decimal_separator(),
            'thousandSeparator' => (string) wc_get_price_thousand_separator(),
            'prefix'            => $prefix,
            'suffix'            => $suffix,
        );
    }

    /** Decimal amount (string|float) to an integer in minor units, without float drift. */
    function forgewp_commerce_money($amount) {
        if ($amount === null || $amount === '') {
            return 0;
        }
        $decimals = max(0, (int) wc_get_price_decimals());
        $fixed = number_format((float) $amount, $decimals, '.', '');
        $negative = strpos($fixed, '-') === 0;
        $digits = str_replace(array('-', '.'), '', $fixed);
        $value = (int) ltrim($digits, '0');
        return $negative ? -$value : $value;
    }

    // ── Shared pieces ─────────────────────────────────────────────────────────

    function forgewp_commerce_path($url) {
        $url = (string) $url;
        if ($url === '') {
            return '';
        }
        if (function_exists('forgewp_resource_path')) {
            return forgewp_resource_path($url);
        }
        return wp_make_link_relative($url);
    }

    function forgewp_commerce_image($attachment_id) {
        $attachment_id = (int) $attachment_id;
        if ($attachment_id > 0) {
            $src = wp_get_attachment_image_src($attachment_id, 'woocommerce_single');
            if (is_array($src) && !empty($src[0])) {
                return array(
                    'id'     => $attachment_id,
                    'src'    => (string) $src[0],
                    'srcset' => (string) wp_get_attachment_image_srcset($attachment_id, 'woocommerce_single'),
                    'alt'    => (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
                    'width'  => (int) $src[1],
                    'height' => (int) $src[2],
                );
            }
        }
        return array(
            'id'     => 0,
            'src'    => (string) wc_placeholder_img_src('woocommerce_single'),
            'srcset' => '',
            'alt'    => '',
            'width'  => 0,
            'height' => 0,
        );
    }

    function forgewp_commerce_term_ref($term) {
        $link = get_term_link($term);
        return array(
            'id'   => (int) $term->term_id,
            'slug' => (string) $term->slug,
            'name' => html_entity_decode((string) $term->name, ENT_QUOTES, 'UTF-8'),
            'path' => is_wp_error($link) ? '' : forgewp_commerce_path($link),
        );
    }

    function forgewp_commerce_stock($product) {
        return array(
            'status'     => (string) $product->get_stock_status(),
            'quantity'   => $product->managing_stock() ? (int) $product->get_stock_quantity() : null,
            'backorders' => (string) $product->get_backorders(),
        );
    }

    /** Display prices (shop tax display), as the shop shows them. */
    function forgewp_commerce_prices($product) {
        $price = wc_get_price_to_display($product);
        $regular_raw = $product->get_regular_price();
        $sale_raw = $product->get_sale_price();
        $on_sale = $product->is_on_sale();
        return array(
            'price'        => forgewp_commerce_money($price),
            'regularPrice' => $regular_raw !== '' ? forgewp_commerce_money(wc_get_price_to_display($product, array('price' => $regular_raw))) : forgewp_commerce_money($price),
            'salePrice'    => ($on_sale && $sale_raw !== '') ? forgewp_commerce_money(wc_get_price_to_display($product, array('price' => $sale_raw))) : null,
            'onSale'       => (bool) $on_sale,
        );
    }

    // ── commerce-settings (§15.2) ─────────────────────────────────────────────

    function forgewp_commerce_page_path($page) {
        $id = (int) wc_get_page_id($page);
        return $id > 0 ? forgewp_commerce_path(get_permalink($id)) : '';
    }

    function forgewp_commerce_settings_resource() {
        if (!forgewp_commerce_available()) {
            return null;
        }
        return array(
            'currency'         => forgewp_commerce_currency(),
            'pricesIncludeTax' => (bool) wc_prices_include_tax(),
            'taxDisplay'       => array(
                'shop' => (string) get_option('woocommerce_tax_display_shop', 'excl'),
                'cart' => (string) get_option('woocommerce_tax_display_cart', 'excl'),
            ),
            'couponsEnabled'   => (bool) wc_coupons_enabled(),
            'guestCheckout'    => get_option('woocommerce_enable_guest_checkout', 'yes') === 'yes',
            'accountCreation'  => array(
                'atCheckout'       => get_option('woocommerce_enable_signup_and_login_from_checkout', 'no') === 'yes',
                'generatePassword' => get_option('woocommerce_registration_generate_password', 'yes') === 'yes',
            ),
            'pages'            => array(
                'shop'     => forgewp_commerce_page_path('shop'),
                'cart'     => forgewp_commerce_page_path('cart'),
                'checkout' => forgewp_commerce_page_path('checkout'),
                'account'  => forgewp_commerce_page_path('myaccount'),
                'terms'    => forgewp_commerce_page_path('terms'),
            ),
        );
    }

    // ── products / product (§15.2) ────────────────────────────────────────────

    function forgewp_commerce_product_summary($product) {
        $id = (int) $product->get_id();
        $image_ids = array_filter(array_merge(array((int) $product->get_image_id()), array_map('intval', $product->get_gallery_image_ids())));
        $images = array();
        foreach ($image_ids as $image_id) {
            $images[] = forgewp_commerce_image($image_id);
        }
        if (empty($images)) {
            $images[] = forgewp_commerce_image(0);
        }
        $categories = array();
        $terms = get_the_terms($id, 'product_cat');
        if (is_array($terms)) {
            usort($terms, function ($a, $b) { return $a->term_id - $b->term_id; });
            foreach ($terms as $term) {
                $categories[] = forgewp_commerce_term_ref($term);
            }
        }
        $prices = forgewp_commerce_prices($product);
        $range = null;
        if ($product->is_type('variable')) {
            $range = array(
                'min' => forgewp_commerce_money($product->get_variation_price('min', true)),
                'max' => forgewp_commerce_money($product->get_variation_price('max', true)),
            );
        }
        $prices['range'] = $range;
        $permalink = (string) get_permalink($id);
        return array(
            'id'               => $id,
            'slug'             => (string) $product->get_slug(),
            'type'             => (string) $product->get_type(),
            'name'             => html_entity_decode((string) $product->get_name(), ENT_QUOTES, 'UTF-8'),
            'path'             => forgewp_commerce_path($permalink),
            'permalink'        => $permalink,
            'shortDescription' => wc_format_content((string) $product->get_short_description()),
            'prices'           => $prices,
            'images'           => $images,
            'categories'       => $categories,
            'stock'            => forgewp_commerce_stock($product),
            'purchasable'      => (bool) $product->is_purchasable(),
            'featured'         => (bool) $product->is_featured(),
            'rating'           => array(
                'average' => (float) $product->get_average_rating(),
                'count'   => (int) $product->get_review_count(),
            ),
        );
    }

    function forgewp_commerce_attributes($product) {
        $out = array();
        foreach ($product->get_attributes() as $attribute) {
            if (!is_object($attribute) || !method_exists($attribute, 'get_name')) {
                continue;
            }
            $name = (string) $attribute->get_name();
            $options = array();
            if ($attribute->is_taxonomy()) {
                $terms = wc_get_product_terms($product->get_id(), $name, array('fields' => 'all'));
                foreach ((array) $terms as $term) {
                    $options[] = array('slug' => (string) $term->slug, 'name' => html_entity_decode((string) $term->name, ENT_QUOTES, 'UTF-8'));
                }
            } else {
                foreach ((array) $attribute->get_options() as $option) {
                    $options[] = array('slug' => sanitize_title($option), 'name' => (string) $option);
                }
            }
            $out[] = array(
                'name'      => wc_attribute_label($name, $product),
                // Same key the variations use: pa_size for global attributes, size for custom ones.
                'slug'      => $attribute->is_taxonomy() ? $name : sanitize_title($name),
                'variation' => (bool) $attribute->get_variation(),
                'options'   => $options,
            );
        }
        return $out;
    }

    function forgewp_commerce_variations($product) {
        if (!$product->is_type('variable')) {
            return array();
        }
        $parent_image = (int) $product->get_image_id();
        $out = array();
        $children = array_map('intval', $product->get_children());
        sort($children);
        foreach ($children as $child_id) {
            $variation = wc_get_product($child_id);
            if (!$variation || !$variation->exists() || !$variation->variation_is_visible()) {
                continue;
            }
            $attributes = array();
            foreach ($variation->get_variation_attributes() as $key => $value) {
                $attributes[preg_replace('/^attribute_/', '', (string) $key)] = (string) $value;
            }
            $image_id = (int) $variation->get_image_id();
            $out[] = array(
                'id'          => (int) $child_id,
                'attributes'  => (object) $attributes,
                'prices'      => forgewp_commerce_prices($variation),
                'stock'       => forgewp_commerce_stock($variation),
                'image'       => ($image_id > 0 && $image_id !== $parent_image) ? forgewp_commerce_image($image_id) : null,
                'purchasable' => (bool) $variation->is_purchasable(),
            );
        }
        return $out;
    }

    function forgewp_commerce_product_resource($product) {
        if (!forgewp_commerce_available() || !$product || !is_object($product)) {
            return null;
        }
        $id = (int) $product->get_id();
        // wc_get_related_products() shuffles; sort so native and REST agree.
        $related = array_map('intval', wc_get_related_products($id, 8));
        sort($related);
        $upsells = array_map('intval', $product->get_upsell_ids());
        $cross = array_map('intval', $product->get_cross_sell_ids());
        return array_merge(forgewp_commerce_product_summary($product), array(
            'description'    => wc_format_content((string) $product->get_description()),
            'sku'            => (string) $product->get_sku(),
            'attributes'     => forgewp_commerce_attributes($product),
            'variations'     => forgewp_commerce_variations($product),
            'related'        => $related,
            'upsells'        => $upsells,
            'crossSells'     => $cross,
            'reviewsAllowed' => (bool) $product->get_reviews_allowed(),
            'currency'       => forgewp_commerce_currency(),
        ));
    }

    /** Public, published, catalog-visible product by slug (null otherwise). */
    function forgewp_commerce_find_product($slug) {
        $post = get_page_by_path(sanitize_title((string) $slug), OBJECT, 'product');
        if (!$post || $post->post_status !== 'publish' || post_password_required($post)) {
            return null;
        }
        $product = wc_get_product($post->ID);
        if (!$product || $product->get_catalog_visibility() === 'hidden') {
            return null;
        }
        return $product;
    }

    function forgewp_commerce_default_per_page() {
        $per_page = (int) apply_filters('loop_shop_per_page', wc_get_default_products_per_row() * wc_get_default_product_rows_per_page());
        return max(1, min(100, $per_page));
    }

    function forgewp_commerce_default_orderby() {
        $orderby = (string) apply_filters('woocommerce_default_catalog_orderby', get_option('woocommerce_default_catalog_orderby', 'menu_order'));
        return $orderby !== '' ? $orderby : 'menu_order';
    }

    function forgewp_commerce_products_resource($args = array()) {
        if (!forgewp_commerce_available()) {
            return null;
        }
        $page = max(1, (int) ($args['page'] ?? 1));
        $per_page = isset($args['perPage']) && (int) $args['perPage'] > 0 ? min(100, (int) $args['perPage']) : forgewp_commerce_default_per_page();
        $allowed_orderby = array('date', 'price', 'popularity', 'rating', 'title', 'menu_order');
        $orderby = in_array((string) ($args['orderby'] ?? ''), $allowed_orderby, true) ? (string) $args['orderby'] : forgewp_commerce_default_orderby();
        $order = strtoupper((string) ($args['order'] ?? '')) === 'DESC' ? 'DESC' : (strtoupper((string) ($args['order'] ?? '')) === 'ASC' ? 'ASC' : '');

        $ordering = WC()->query->get_catalog_ordering_args($orderby, $order);
        $tax_query = WC()->query->get_tax_query(array(), false);
        if (!empty($args['category'])) {
            $tax_query[] = array('taxonomy' => 'product_cat', 'field' => 'slug', 'terms' => sanitize_title($args['category']));
        }
        if (!empty($args['tag'])) {
            $tax_query[] = array('taxonomy' => 'product_tag', 'field' => 'slug', 'terms' => sanitize_title($args['tag']));
        }
        if (!empty($args['featured'])) {
            $tax_query[] = array('taxonomy' => 'product_visibility', 'field' => 'name', 'terms' => 'featured');
        }
        $query_args = array(
            'post_type'           => 'product',
            'post_status'         => 'publish',
            'posts_per_page'      => $per_page,
            'paged'               => $page,
            'orderby'             => $ordering['orderby'],
            'order'               => $ordering['order'],
            'tax_query'           => $tax_query,
            'ignore_sticky_posts' => true,
            'has_password'        => false,
        );
        if (!empty($ordering['meta_key'])) {
            $query_args['meta_key'] = $ordering['meta_key'];
        }
        if (!empty($args['search'])) {
            $query_args['s'] = sanitize_text_field($args['search']);
        }
        if (!empty($args['onSale'])) {
            $on_sale = array_map('intval', wc_get_product_ids_on_sale());
            $query_args['post__in'] = !empty($on_sale) ? $on_sale : array(0);
        }
        $lang = (string) ($args['lang'] ?? '');
        if ($lang !== '' && function_exists('pll_languages_list')) {
            $query_args['lang'] = $lang;
        }
        $query = new WP_Query($query_args);
        WC()->query->remove_ordering_args();

        $items = array();
        foreach ($query->posts as $post) {
            $product = wc_get_product($post);
            if ($product) {
                $items[] = forgewp_commerce_product_summary($product);
            }
        }
        return array(
            'lang'       => $lang !== '' ? $lang : (function_exists('forgewp_resource_lang') ? forgewp_resource_lang(null) : ''),
            'page'       => $page,
            'perPage'    => $per_page,
            'total'      => (int) $query->found_posts,
            'totalPages' => (int) $query->max_num_pages,
            'currency'   => forgewp_commerce_currency(),
            'items'      => $items,
        );
    }

    function forgewp_commerce_products_args_from_request($request) {
        $bool = function ($v) { return in_array(strtolower((string) $v), array('1', 'true', 'yes'), true); };
        return array(
            'page'     => $request->get_param('page'),
            'perPage'  => $request->get_param('perPage'),
            'category' => (string) $request->get_param('category'),
            'tag'      => (string) $request->get_param('tag'),
            'search'   => (string) $request->get_param('search'),
            'orderby'  => (string) $request->get_param('orderby'),
            'order'    => (string) $request->get_param('order'),
            'onSale'   => $bool($request->get_param('onSale')),
            'featured' => $bool($request->get_param('featured')),
            'lang'     => (string) $request->get_param('lang'),
        );
    }

    /** Native hydration: added to resources only when WooCommerce is active. */
    function forgewp_commerce_native_resources() {
        if (!forgewp_commerce_available()) {
            return array();
        }
        $out = array('commerce-settings' => forgewp_commerce_settings_resource());
        if (function_exists('is_product') && is_product()) {
            $out['product'] = forgewp_commerce_product_resource(wc_get_product(get_queried_object_id()));
        } elseif (function_exists('is_shop') && (is_shop() || is_product_category() || is_product_tag())) {
            $term = get_queried_object();
            $out['products'] = forgewp_commerce_products_resource(array(
                'page'     => max(1, (int) get_query_var('paged')),
                'category' => is_product_category() && $term instanceof WP_Term ? $term->slug : '',
                'tag'      => is_product_tag() && $term instanceof WP_Term ? $term->slug : '',
            ));
        }
        return $out;
    }

    // ── cart (§15.3) ──────────────────────────────────────────────────────────

    function forgewp_commerce_cart_item_variation($item, $product) {
        $out = array();
        if (empty($item['variation']) || !is_array($item['variation'])) {
            return $out;
        }
        foreach ($item['variation'] as $key => $value) {
            $taxonomy = preg_replace('/^attribute_/', '', (string) $key);
            $label = $value;
            if (taxonomy_exists($taxonomy)) {
                $term = get_term_by('slug', $value, $taxonomy);
                if ($term && !is_wp_error($term)) {
                    $label = $term->name;
                }
            }
            $out[] = array(
                'attribute' => wc_attribute_label($taxonomy, $product),
                'value'     => html_entity_decode((string) $label, ENT_QUOTES, 'UTF-8'),
            );
        }
        return $out;
    }

    function forgewp_commerce_cart_resource() {
        if (!forgewp_commerce_available() || !function_exists('forgewp_ensure_wc_cart') || !forgewp_ensure_wc_cart()) {
            return null;
        }
        $cart = WC()->cart;
        // Validity checks may add notices (removed products, expired coupons); report them as errors.
        $cart->check_cart_items();
        $cart->calculate_shipping();
        $cart->calculate_totals();
        $errors = array();
        foreach ((array) wc_get_notices('error') as $notice) {
            $errors[] = array('code' => 'cart_error', 'message' => trim(html_entity_decode(wp_strip_all_tags(is_array($notice) ? (string) $notice['notice'] : (string) $notice), ENT_QUOTES, 'UTF-8')));
        }
        wc_clear_notices();

        $incl_tax = $cart->display_prices_including_tax();
        $items = array();
        foreach ($cart->get_cart() as $key => $item) {
            $product = $item['data'] ?? null;
            if (!$product || !is_object($product)) {
                continue;
            }
            $parent_id = (int) $product->get_parent_id();
            $main_id = $parent_id ?: (int) $product->get_id();
            $image_id = (int) $product->get_image_id();
            if (!$image_id && $parent_id) {
                $parent = wc_get_product($parent_id);
                $image_id = $parent ? (int) $parent->get_image_id() : 0;
            }
            $price = $incl_tax ? wc_get_price_including_tax($product) : wc_get_price_excluding_tax($product);
            $regular_raw = $product->get_regular_price();
            $regular = $regular_raw === '' ? $price : ($incl_tax ? wc_get_price_including_tax($product, array('price' => $regular_raw)) : wc_get_price_excluding_tax($product, array('price' => $regular_raw)));
            $max = (int) $product->get_max_purchase_quantity();
            $quantity = (int) $item['quantity'];
            $permalink = (string) get_permalink($main_id);
            $items[] = array(
                'key'            => (string) $key,
                'productId'      => $main_id,
                'variationId'    => $parent_id ? (int) $product->get_id() : 0,
                'slug'           => (string) get_post_field('post_name', $main_id),
                'path'           => forgewp_commerce_path($permalink),
                'name'           => html_entity_decode((string) $product->get_name(), ENT_QUOTES, 'UTF-8'),
                'quantity'       => $quantity,
                'quantityLimits' => array(
                    'min'  => max(1, (int) $product->get_min_purchase_quantity()),
                    'max'  => $max > 0 ? $max : null,
                    'step' => 1,
                ),
                'variation'      => forgewp_commerce_cart_item_variation($item, $product),
                'image'          => forgewp_commerce_image($image_id),
                'prices'         => array(
                    'price'        => forgewp_commerce_money($price),
                    'regularPrice' => forgewp_commerce_money($regular),
                ),
                'totals'         => array(
                    'subtotal'    => forgewp_commerce_money($item['line_subtotal'] ?? 0),
                    'subtotalTax' => forgewp_commerce_money($item['line_subtotal_tax'] ?? 0),
                    'total'       => forgewp_commerce_money($item['line_total'] ?? 0),
                    'totalTax'    => forgewp_commerce_money($item['line_tax'] ?? 0),
                ),
                'backordered'    => (bool) ($product->backorders_require_notification() && $product->is_on_backorder($quantity)),
            );
        }

        $coupons = array();
        foreach ($cart->get_applied_coupons() as $code) {
            $coupons[] = array(
                'code'        => (string) $code,
                'discount'    => forgewp_commerce_money($cart->get_coupon_discount_amount($code, true)),
                'discountTax' => forgewp_commerce_money($cart->get_coupon_discount_tax_amount($code)),
            );
        }
        $fees = array();
        foreach ($cart->get_fees() as $fee) {
            $fees[] = array(
                'id'     => (string) $fee->id,
                'name'   => (string) $fee->name,
                'amount' => forgewp_commerce_money($fee->amount),
                'tax'    => forgewp_commerce_money($fee->tax),
            );
        }

        $packages = array();
        if ($cart->needs_shipping()) {
            $chosen = WC()->session ? (array) WC()->session->get('chosen_shipping_methods', array()) : array();
            foreach (WC()->shipping()->get_packages() as $index => $package) {
                $rates = array();
                foreach ((array) ($package['rates'] ?? array()) as $rate_id => $rate) {
                    $rates[] = array(
                        'id'       => (string) $rate_id,
                        'label'    => html_entity_decode((string) $rate->get_label(), ENT_QUOTES, 'UTF-8'),
                        'cost'     => forgewp_commerce_money($rate->get_cost()),
                        'selected' => isset($chosen[$index]) && (string) $chosen[$index] === (string) $rate_id,
                    );
                }
                $destination = (array) ($package['destination'] ?? array());
                $packages[] = array(
                    'id'          => (int) $index,
                    'destination' => array(
                        'country'  => (string) ($destination['country'] ?? ''),
                        'state'    => (string) ($destination['state'] ?? ''),
                        'postcode' => (string) ($destination['postcode'] ?? ''),
                        'city'     => (string) ($destination['city'] ?? ''),
                    ),
                    'rates'       => $rates,
                );
            }
        }

        return array(
            'items'            => $items,
            'itemCount'        => (int) $cart->get_cart_contents_count(),
            'coupons'          => $coupons,
            'fees'             => $fees,
            'needsShipping'    => (bool) $cart->needs_shipping(),
            'shippingPackages' => $packages,
            'totals'           => array(
                'subtotal' => forgewp_commerce_money($cart->get_subtotal()),
                'discount' => forgewp_commerce_money($cart->get_discount_total()),
                'shipping' => forgewp_commerce_money($cart->get_shipping_total()),
                'fees'     => forgewp_commerce_money($cart->get_fee_total()),
                'tax'      => forgewp_commerce_money($cart->get_total_tax()),
                'total'    => forgewp_commerce_money($cart->get_total('edit')),
            ),
            'needsPayment'     => (bool) $cart->needs_payment(),
            'errors'           => $errors,
            'currency'         => forgewp_commerce_currency(),
        );
    }

    // ── Cross-origin guest cart token (§15.3 session transport) ───────────────
    //
    // The token is WooCommerce's own signed guest-session cookie value, wrapped.
    // A request that carries the token but no session cookie gets the cookie
    // restored before WooCommerce starts its session, and WooCommerce verifies
    // the signature and expiry itself. It refuses a token whose session belongs
    // to a registered customer unless that customer is logged in, so the token
    // only ever selects a guest cart and never authenticates anyone.

    function forgewp_commerce_cart_cookie_name() {
        return (string) apply_filters('woocommerce_cookie', 'wp_woocommerce_session_' . COOKIEHASH);
    }

    function forgewp_commerce_apply_cart_token() {
        $token = isset($_SERVER['HTTP_X_FORGEWP_CART_TOKEN']) ? trim((string) $_SERVER['HTTP_X_FORGEWP_CART_TOKEN']) : '';
        if ($token === '' || strpos($token, 'v1.') !== 0 || strlen($token) > 400) {
            return;
        }
        $uri = isset($_SERVER['REQUEST_URI']) ? rawurldecode((string) $_SERVER['REQUEST_URI']) : '';
        if (strpos($uri, 'forgewp/v1/') === false) {
            return;
        }
        if (!defined('COOKIEHASH')) {
            return;
        }
        $name = forgewp_commerce_cart_cookie_name();
        if (!empty($_COOKIE[$name])) {
            return; // A real session cookie always wins.
        }
        $raw = base64_decode(strtr(substr($token, 3), '-_', '+/'), true);
        if (!is_string($raw) || !preg_match('/^[A-Za-z0-9_]{1,64}[|][0-9]{1,12}[|][0-9]{1,12}[|][^|]{1,200}$/', $raw)) {
            return;
        }
        $_COOKIE[$name] = $raw;
    }
    forgewp_commerce_apply_cart_token();

    /** The current guest session as a token (empty for logged-in users or without a session). */
    function forgewp_commerce_current_cart_token() {
        if (is_user_logged_in() || !defined('COOKIEHASH')) {
            return '';
        }
        $name = forgewp_commerce_cart_cookie_name();
        $value = '';
        foreach (headers_list() as $header) {
            if (stripos($header, 'Set-Cookie: ' . $name . '=') === 0) {
                $pair = substr($header, strlen('Set-Cookie: '));
                $pair = explode(';', $pair, 2)[0];
                $value = urldecode(substr($pair, strlen($name) + 1));
            }
        }
        if ($value === '' && !empty($_COOKIE[$name])) {
            $value = (string) $_COOKIE[$name];
        }
        if ($value === '' || $value === 'deleted') {
            return '';
        }
        return 'v1.' . rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    add_filter('rest_allowed_cors_headers', function ($headers) {
        $headers[] = 'X-ForgeWP-Cart-Token';
        $headers[] = 'X-ForgeWP-Contract';
        return $headers;
    });
    add_filter('rest_exposed_cors_headers', function ($headers) {
        $headers[] = 'X-ForgeWP-Cart-Token';
        return $headers;
    });

    function forgewp_commerce_private_response($data, $status = 200) {
        $response = new WP_REST_Response($data, $status);
        $response->header('Cache-Control', 'private, no-store');
        $response->header('Vary', 'Cookie, Authorization, X-ForgeWP-Cart-Token');
        $token = forgewp_commerce_current_cart_token();
        if ($token !== '') {
            $response->header('X-ForgeWP-Cart-Token', $token);
        }
        return $response;
    }

    function forgewp_commerce_cart_response() {
        if (function_exists('forgewp_save_wc_cart')) {
            forgewp_save_wc_cart();
        }
        $cart = forgewp_commerce_cart_resource();
        if ($cart === null) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        return forgewp_commerce_private_response($cart);
    }

    /** Notice HTML to plain text (messages are shown by the client, not as HTML). */
    function forgewp_commerce_plain($text) {
        return trim(html_entity_decode(wp_strip_all_tags((string) $text), ENT_QUOTES, 'UTF-8'));
    }

    function forgewp_commerce_error_from_notices($code, $fallback, $status) {
        $notices = (array) wc_get_notices('error');
        wc_clear_notices();
        $message = !empty($notices[0]) ? forgewp_commerce_plain(is_array($notices[0]) ? $notices[0]['notice'] : $notices[0]) : $fallback;
        return new WP_Error($code, $message, array('status' => $status));
    }

    function forgewp_commerce_params($request) {
        $params = $request->get_json_params();
        return is_array($params) && !empty($params) ? $params : (array) $request->get_params();
    }

    // ── cart routes ───────────────────────────────────────────────────────────

    function forgewp_commerce_rest_add_item($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $p = forgewp_commerce_params($request);
        $product_id = (int) ($p['productId'] ?? 0);
        $variation_id = (int) ($p['variationId'] ?? 0);
        $quantity = isset($p['quantity']) ? (int) $p['quantity'] : 1;
        if ($quantity < 1) {
            return new WP_Error('invalid_quantity', 'Quantity must be at least 1.', array('status' => 400));
        }
        $product = wc_get_product($variation_id ?: $product_id);
        if (!$product || get_post_status($product->get_parent_id() ?: $product->get_id()) !== 'publish') {
            return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
        }
        if ($product->is_type('variation')) {
            $product_id = (int) $product->get_parent_id();
            $variation_id = (int) $product->get_id();
        } elseif ($product->is_type('variable')) {
            return new WP_Error('invalid_variation', 'Choose product options before adding to the cart.', array('status' => 400));
        }
        $variation = array();
        foreach ((array) ($p['variation'] ?? array()) as $key => $value) {
            $key = (string) $key;
            $variation[strpos($key, 'attribute_') === 0 ? $key : 'attribute_' . sanitize_title($key)] = sanitize_text_field((string) $value);
        }
        if ($variation_id && empty($variation)) {
            $variation = $product->get_variation_attributes();
        }
        $key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $variation);
        if (!$key) {
            $stock_ok = $product->is_in_stock() && $product->has_enough_stock($quantity);
            return forgewp_commerce_error_from_notices($stock_ok ? 'cart_error' : 'out_of_stock', 'This product cannot be added to the cart.', $stock_ok ? 400 : 409);
        }
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_update_item($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $key = (string) $request['key'];
        $item = WC()->cart->get_cart_item($key);
        if (empty($item)) {
            return new WP_Error('cart_item_not_found', 'Cart item not found.', array('status' => 404));
        }
        $p = forgewp_commerce_params($request);
        $quantity = (int) ($p['quantity'] ?? -1);
        if ($quantity < 0) {
            return new WP_Error('invalid_quantity', 'Quantity is required.', array('status' => 400));
        }
        if ($quantity === 0) {
            WC()->cart->remove_cart_item($key);
            return forgewp_commerce_cart_response();
        }
        $product = $item['data'];
        $max = (int) $product->get_max_purchase_quantity();
        if (!$product->has_enough_stock($quantity) || ($max > 0 && $quantity > $max)) {
            return new WP_Error('out_of_stock', 'Not enough stock for that quantity.', array('status' => 409));
        }
        WC()->cart->set_quantity($key, $quantity, true);
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_remove_item($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $key = (string) $request['key'];
        if (empty(WC()->cart->get_cart_item($key))) {
            return new WP_Error('cart_item_not_found', 'Cart item not found.', array('status' => 404));
        }
        WC()->cart->remove_cart_item($key);
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_clear($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        WC()->cart->empty_cart();
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_apply_coupon($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $p = forgewp_commerce_params($request);
        $code = wc_format_coupon_code((string) ($p['code'] ?? ''));
        if ($code === '') {
            return new WP_Error('coupon_error', 'Coupon code is required.', array('status' => 400));
        }
        if (!WC()->cart->apply_coupon($code)) {
            return forgewp_commerce_error_from_notices('coupon_error', 'Invalid coupon code.', 400);
        }
        wc_clear_notices();
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_remove_coupon($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        WC()->cart->remove_coupon(wc_format_coupon_code(rawurldecode((string) $request['code'])));
        wc_clear_notices();
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_shipping_rate($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $p = forgewp_commerce_params($request);
        $package_id = (int) ($p['packageId'] ?? 0);
        $rate_id = (string) ($p['rateId'] ?? '');
        WC()->cart->calculate_shipping();
        $packages = WC()->shipping()->get_packages();
        if (!isset($packages[$package_id]['rates'][$rate_id])) {
            return new WP_Error('invalid_shipping_rate', 'That shipping option is not available.', array('status' => 400));
        }
        $chosen = (array) WC()->session->get('chosen_shipping_methods', array());
        $chosen[$package_id] = $rate_id;
        WC()->session->set('chosen_shipping_methods', $chosen);
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_customer($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $p = forgewp_commerce_params($request);
        $map = array('firstName' => 'first_name', 'lastName' => 'last_name', 'company' => 'company', 'address1' => 'address_1', 'address2' => 'address_2', 'city' => 'city', 'state' => 'state', 'postcode' => 'postcode', 'country' => 'country', 'phone' => 'phone', 'email' => 'email');
        $customer = WC()->customer;
        foreach (array('billing' => 'billingAddress', 'shipping' => 'shippingAddress') as $type => $param) {
            if (empty($p[$param]) || !is_array($p[$param])) {
                continue;
            }
            foreach ($map as $in => $field) {
                if (!array_key_exists($in, $p[$param]) || ($field === 'email' && $type !== 'billing')) {
                    continue;
                }
                $setter = 'set_' . $type . '_' . $field;
                if (method_exists($customer, $setter)) {
                    $value = (string) $p[$param][$in];
                    $customer->{$setter}($field === 'email' ? sanitize_email($value) : sanitize_text_field($value));
                }
            }
        }
        $customer->save();
        return forgewp_commerce_cart_response();
    }

    /** After login: WooCommerce merges the guest session (cookie or token) into the user's cart. */
    function forgewp_commerce_rest_get_cart($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        return forgewp_commerce_cart_response();
    }

    function forgewp_commerce_rest_merge($request) {
        if (!forgewp_ensure_wc_cart()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        return forgewp_commerce_cart_response();
    }

    // ── checkout (§15.4): camelCase front door to the gateway-safe checkout ──

    function forgewp_commerce_rest_checkout($request) {
        $p = forgewp_commerce_params($request);
        $map = array('firstName' => 'first_name', 'lastName' => 'last_name', 'company' => 'company', 'address1' => 'address_1', 'address2' => 'address_2', 'city' => 'city', 'state' => 'state', 'postcode' => 'postcode', 'country' => 'country', 'phone' => 'phone', 'email' => 'email');
        $convert = function ($address) use ($map) {
            $out = array();
            foreach ((array) $address as $key => $value) {
                $out[$map[$key] ?? $key] = $value;
            }
            return $out;
        };
        $inner = new WP_REST_Request('POST', '/forgewp/v1/checkout/process');
        $inner->set_header('content-type', 'application/json');
        $inner->set_body(wp_json_encode(array(
            'billing_address'  => $convert($p['billingAddress'] ?? array()),
            'shipping_address' => !empty($p['shippingAddress']) ? $convert($p['shippingAddress']) : $convert($p['billingAddress'] ?? array()),
            'payment_method'   => (string) ($p['paymentMethod'] ?? ''),
            'customer_note'    => (string) ($p['customerNote'] ?? ''),
        )));
        // Gateways read their extra fields from the posted form, as on WooCommerce's own checkout.
        foreach ((array) ($p['paymentData'] ?? array()) as $entry) {
            if (is_array($entry) && isset($entry['key']) && is_scalar($entry['value'] ?? null)) {
                $_POST[sanitize_key((string) $entry['key'])] = wc_clean((string) $entry['value']);
            }
        }
        $result = forgewp_rest_process_checkout($inner);
        if (is_wp_error($result)) {
            return $result;
        }
        $data = $result instanceof WP_REST_Response ? $result->get_data() : (array) $result;
        $order = wc_get_order((int) ($data['orderId'] ?? 0));
        return forgewp_commerce_private_response(array(
            'orderId'       => (int) ($data['orderId'] ?? 0),
            'orderKey'      => (string) ($data['orderKey'] ?? ''),
            'orderNumber'   => (string) ($data['orderNumber'] ?? ''),
            'status'        => (string) ($data['status'] ?? ''),
            'paymentMethod' => (string) ($data['paymentMethod'] ?? ''),
            'total'         => $order ? forgewp_commerce_money($order->get_total()) : 0,
            'currency'      => forgewp_commerce_currency(),
            'needsRedirect' => (bool) ($data['needsRedirect'] ?? false),
            'redirectUrl'   => (string) ($data['redirectUrl'] ?? ''),
        ));
    }

    // ── public routes ─────────────────────────────────────────────────────────

    function forgewp_commerce_public_response($data) {
        $response = new WP_REST_Response($data, 200);
        $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        return $response;
    }

    function forgewp_commerce_rest_settings($request) {
        $settings = forgewp_commerce_settings_resource();
        if ($settings === null) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        return forgewp_commerce_public_response($settings);
    }

    function forgewp_commerce_rest_products($request) {
        if (!forgewp_commerce_available()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        return forgewp_commerce_public_response(forgewp_commerce_products_resource(forgewp_commerce_products_args_from_request($request)));
    }

    function forgewp_commerce_rest_product($request) {
        if (!forgewp_commerce_available()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $product = forgewp_commerce_find_product((string) $request['slug']);
        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
        }
        return forgewp_commerce_public_response(forgewp_commerce_product_resource($product));
    }

    // ── customer + wishlist (§15.5), session only ─────────────────────────────

    function forgewp_commerce_user($request) {
        if (function_exists('forgewp_auth_resolve_session_user')) {
            return (int) forgewp_auth_resolve_session_user($request);
        }
        return (int) get_current_user_id();
    }

    function forgewp_commerce_unauthorized() {
        return new WP_Error('unauthorized', 'Log in to continue.', array('status' => 401));
    }

    function forgewp_commerce_address_fields() {
        return array('firstName' => 'first_name', 'lastName' => 'last_name', 'company' => 'company', 'address1' => 'address_1', 'address2' => 'address_2', 'city' => 'city', 'state' => 'state', 'postcode' => 'postcode', 'country' => 'country', 'phone' => 'phone', 'email' => 'email');
    }

    /** WooCommerce address array (snake_case) to the contract's camelCase keys. */
    function forgewp_commerce_address_out($address, $with_email) {
        $out = array();
        foreach (forgewp_commerce_address_fields() as $key => $field) {
            if ($field === 'email' && !$with_email) {
                continue;
            }
            $out[$key] = (string) ($address[$field] ?? '');
        }
        return $out;
    }

    function forgewp_commerce_order_summary($order) {
        $created = $order->get_date_created();
        return array(
            'id'          => (int) $order->get_id(),
            'number'      => (string) $order->get_order_number(),
            'date'        => $created ? $created->date('c') : '',
            'status'      => (string) $order->get_status(),
            'statusLabel' => (string) wc_get_order_status_name($order->get_status()),
            'total'       => forgewp_commerce_money($order->get_total()),
            'itemCount'   => (int) $order->get_item_count(),
            'path'        => forgewp_commerce_path($order->get_view_order_url()),
        );
    }

    function forgewp_commerce_order_detail($order) {
        $items = array();
        foreach ($order->get_items() as $item_id => $item) {
            $product = $item->get_product();
            $image_id = 0;
            if ($product) {
                $image_id = (int) $product->get_image_id();
                if (!$image_id && $product->get_parent_id()) {
                    $parent = wc_get_product($product->get_parent_id());
                    $image_id = $parent ? (int) $parent->get_image_id() : 0;
                }
            }
            $items[] = array(
                'id'           => (int) $item_id,
                'productId'    => (int) $item->get_product_id(),
                'variationId'  => (int) $item->get_variation_id(),
                'name'         => html_entity_decode((string) $item->get_name(), ENT_QUOTES, 'UTF-8'),
                'quantity'     => (int) $item->get_quantity(),
                'totals'       => array(
                    'subtotal' => forgewp_commerce_money($item->get_subtotal()),
                    'total'    => forgewp_commerce_money($item->get_total()),
                    'tax'      => forgewp_commerce_money($item->get_total_tax()),
                ),
                'image'        => forgewp_commerce_image($image_id),
                'downloadable' => (bool) ($product && $product->is_downloadable()),
            );
        }
        $actions = array();
        foreach ((array) wc_get_account_orders_actions($order) as $key => $action) {
            if (!empty($action['url'])) {
                $actions[(string) $key] = (string) $action['url'];
            }
        }
        return array_merge(forgewp_commerce_order_summary($order), array(
            'items'              => $items,
            'totals'             => array(
                'subtotal' => forgewp_commerce_money($order->get_subtotal()),
                'discount' => forgewp_commerce_money($order->get_total_discount()),
                'shipping' => forgewp_commerce_money($order->get_shipping_total()),
                'fees'     => forgewp_commerce_money($order->get_total_fees()),
                'tax'      => forgewp_commerce_money($order->get_total_tax()),
                'total'    => forgewp_commerce_money($order->get_total()),
            ),
            'billingAddress'     => forgewp_commerce_address_out($order->get_address('billing'), true),
            'shippingAddress'    => forgewp_commerce_address_out($order->get_address('shipping'), false),
            'paymentMethodTitle' => (string) $order->get_payment_method_title(),
            'customerNote'       => (string) $order->get_customer_note(),
            'actions'            => (object) $actions,
            'currency'           => forgewp_commerce_currency($order->get_currency()),
        ));
    }

    function forgewp_commerce_rest_customer_orders($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $page = max(1, (int) $request->get_param('page'));
        $per_page = max(1, min(100, (int) ($request->get_param('perPage') ?: 10)));
        $result = wc_get_orders(array('customer_id' => $user_id, 'limit' => $per_page, 'page' => $page, 'paginate' => true, 'orderby' => 'date', 'order' => 'DESC'));
        $items = array();
        foreach ($result->orders as $order) {
            $items[] = forgewp_commerce_order_summary($order);
        }
        return forgewp_commerce_private_response(array(
            'page'       => $page,
            'perPage'    => $per_page,
            'total'      => (int) $result->total,
            'totalPages' => (int) $result->max_num_pages,
            'currency'   => forgewp_commerce_currency(),
            'items'      => $items,
        ));
    }

    function forgewp_commerce_rest_customer_order($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $order = wc_get_order((int) $request['id']);
        // Someone else's order is indistinguishable from a missing one.
        if (!$order || (int) $order->get_customer_id() !== $user_id) {
            return new WP_Error('order_not_found', 'Order not found.', array('status' => 404));
        }
        return forgewp_commerce_private_response(forgewp_commerce_order_detail($order));
    }

    /** Order-received view for whoever holds the order key (guests included). */
    function forgewp_commerce_rest_checkout_order($request) {
        if (!forgewp_commerce_available()) {
            return new WP_Error('wc_unavailable', 'WooCommerce is not available', array('status' => 503));
        }
        $order = wc_get_order((int) $request->get_param('id'));
        $key = (string) $request->get_param('key');
        if (!$order || $key === '' || !hash_equals((string) $order->get_order_key(), $key)) {
            return new WP_Error('order_not_found', 'Order not found.', array('status' => 404));
        }
        $detail = forgewp_commerce_order_detail($order);
        $detail['actions'] = (object) array(); // account actions are for the signed-in owner
        return forgewp_commerce_private_response($detail);
    }

    function forgewp_commerce_rest_customer_downloads($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $items = array();
        foreach ((array) wc_get_customer_available_downloads($user_id) as $download) {
            $remaining = $download['downloads_remaining'] ?? '';
            $expires = $download['access_expires'] ?? null;
            $items[] = array(
                'productId'    => (int) ($download['product_id'] ?? 0),
                'name'         => html_entity_decode((string) ($download['product_name'] ?? ''), ENT_QUOTES, 'UTF-8'),
                'downloadName' => (string) ($download['download_name'] ?? ''),
                'url'          => (string) ($download['download_url'] ?? ''),
                'remaining'    => ($remaining === '' || $remaining === null) ? null : (int) $remaining,
                'expires'      => $expires ? (is_object($expires) && method_exists($expires, 'date') ? $expires->date('c') : (string) $expires) : null,
            );
        }
        return forgewp_commerce_private_response(array('items' => $items));
    }

    function forgewp_commerce_profile($user_id) {
        $user = get_userdata($user_id);
        return array(
            'firstName'   => (string) get_user_meta($user_id, 'first_name', true),
            'lastName'    => (string) get_user_meta($user_id, 'last_name', true),
            'displayName' => $user ? (string) $user->display_name : '',
            'email'       => $user ? (string) $user->user_email : '',
        );
    }

    function forgewp_commerce_rest_get_profile($request) {
        $user_id = forgewp_commerce_user($request);
        return $user_id ? forgewp_commerce_private_response(forgewp_commerce_profile($user_id)) : forgewp_commerce_unauthorized();
    }

    function forgewp_commerce_rest_update_profile($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $p = forgewp_commerce_params($request);
        $data = array('ID' => $user_id);
        foreach (array('firstName' => 'first_name', 'lastName' => 'last_name', 'displayName' => 'display_name') as $in => $field) {
            if (isset($p[$in]) && is_scalar($p[$in])) {
                $data[$field] = sanitize_text_field((string) $p[$in]);
            }
        }
        if (isset($p['email'])) {
            $email = sanitize_email((string) $p['email']);
            if (!is_email($email)) {
                return new WP_Error('invalid_email', 'Enter a valid email address.', array('status' => 400));
            }
            $owner = email_exists($email);
            if ($owner && (int) $owner !== $user_id) {
                return new WP_Error('email_exists', 'That email address is already in use.', array('status' => 409));
            }
            $data['user_email'] = $email;
        }
        $updated = wp_update_user($data);
        if (is_wp_error($updated)) {
            return new WP_Error('update_failed', forgewp_commerce_plain($updated->get_error_message()), array('status' => 400));
        }
        return forgewp_commerce_private_response(forgewp_commerce_profile($user_id));
    }

    function forgewp_commerce_addresses($user_id) {
        $customer = new WC_Customer($user_id);
        return array(
            'billing'  => forgewp_commerce_address_out($customer->get_billing(), true),
            'shipping' => forgewp_commerce_address_out($customer->get_shipping(), false),
        );
    }

    function forgewp_commerce_rest_get_address($request) {
        $user_id = forgewp_commerce_user($request);
        return $user_id ? forgewp_commerce_private_response(forgewp_commerce_addresses($user_id)) : forgewp_commerce_unauthorized();
    }

    function forgewp_commerce_rest_update_address($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $p = forgewp_commerce_params($request);
        $customer = new WC_Customer($user_id);
        foreach (array('billing', 'shipping') as $type) {
            if (empty($p[$type]) || !is_array($p[$type])) {
                continue;
            }
            foreach (forgewp_commerce_address_fields() as $in => $field) {
                if (!array_key_exists($in, $p[$type]) || ($field === 'email' && $type !== 'billing')) {
                    continue;
                }
                $value = (string) $p[$type][$in];
                if ($field === 'email' && $value !== '' && !is_email($value)) {
                    return new WP_Error('invalid_email', 'Enter a valid email address.', array('status' => 400));
                }
                $setter = 'set_' . $type . '_' . $field;
                if (method_exists($customer, $setter)) {
                    $customer->{$setter}($field === 'email' ? sanitize_email($value) : sanitize_text_field($value));
                }
            }
        }
        $customer->save();
        return forgewp_commerce_private_response(forgewp_commerce_addresses($user_id));
    }

    function forgewp_commerce_wishlist_ids($user_id) {
        $saved = get_user_meta($user_id, '_forgewp_wishlist', true);
        return is_array($saved) ? array_values(array_unique(array_map('intval', $saved))) : array();
    }

    /** Only published products may enter a wishlist. */
    function forgewp_commerce_valid_product_ids($ids) {
        $out = array();
        foreach ((array) $ids as $id) {
            $id = (int) $id;
            if ($id > 0 && get_post_type($id) === 'product' && get_post_status($id) === 'publish' && !in_array($id, $out, true)) {
                $out[] = $id;
            }
        }
        return $out;
    }

    function forgewp_commerce_wishlist_response($user_id) {
        return forgewp_commerce_private_response(array('items' => forgewp_commerce_wishlist_ids($user_id)));
    }

    function forgewp_commerce_rest_wishlist($request) {
        $user_id = forgewp_commerce_user($request);
        return $user_id ? forgewp_commerce_wishlist_response($user_id) : forgewp_commerce_unauthorized();
    }

    function forgewp_commerce_rest_wishlist_add($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $p = forgewp_commerce_params($request);
        $valid = forgewp_commerce_valid_product_ids(array($p['productId'] ?? 0));
        if (empty($valid)) {
            return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
        }
        $ids = forgewp_commerce_wishlist_ids($user_id);
        if (!in_array($valid[0], $ids, true)) {
            $ids[] = $valid[0];
            update_user_meta($user_id, '_forgewp_wishlist', $ids);
        }
        return forgewp_commerce_wishlist_response($user_id);
    }

    function forgewp_commerce_rest_wishlist_remove($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $remove = (int) $request['id'];
        update_user_meta($user_id, '_forgewp_wishlist', array_values(array_filter(forgewp_commerce_wishlist_ids($user_id), function ($id) use ($remove) { return $id !== $remove; })));
        return forgewp_commerce_wishlist_response($user_id);
    }

    function forgewp_commerce_rest_wishlist_merge($request) {
        $user_id = forgewp_commerce_user($request);
        if (!$user_id) {
            return forgewp_commerce_unauthorized();
        }
        $p = forgewp_commerce_params($request);
        $incoming = forgewp_commerce_valid_product_ids(array_slice((array) ($p['items'] ?? array()), 0, 200));
        update_user_meta($user_id, '_forgewp_wishlist', array_values(array_unique(array_merge(forgewp_commerce_wishlist_ids($user_id), $incoming))));
        return forgewp_commerce_wishlist_response($user_id);
    }

    add_action('rest_api_init', function () {
        $public = array('permission_callback' => '__return_true');
        register_rest_route('forgewp/v1', '/commerce/settings', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_settings') + $public));
        register_rest_route('forgewp/v1', '/products', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_products') + $public));
        register_rest_route('forgewp/v1', '/cart', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_get_cart') + $public));
        register_rest_route('forgewp/v1', '/customer/orders', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_customer_orders') + $public));
        register_rest_route('forgewp/v1', '/customer/orders/(?P<id>[0-9]+)', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_customer_order') + $public));
        register_rest_route('forgewp/v1', '/customer/downloads', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_customer_downloads') + $public));
        register_rest_route('forgewp/v1', '/wishlist', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_wishlist') + $public));
        register_rest_route('forgewp/v1', '/products/(?P<slug>[a-z0-9_%-]+)', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_product') + $public));
        register_rest_route('forgewp/v1', '/cart/items', array(
            array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_add_item') + $public,
            array('methods' => 'DELETE', 'callback' => 'forgewp_commerce_rest_clear') + $public,
        ));
        register_rest_route('forgewp/v1', '/cart/items/(?P<key>[a-zA-Z0-9]+)', array(
            array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_update_item') + $public,
            array('methods' => 'DELETE', 'callback' => 'forgewp_commerce_rest_remove_item') + $public,
        ));
        register_rest_route('forgewp/v1', '/cart/coupons', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_apply_coupon') + $public));
        register_rest_route('forgewp/v1', '/cart/coupons/(?P<code>[^/]+)', array(array('methods' => 'DELETE', 'callback' => 'forgewp_commerce_rest_remove_coupon') + $public));
        register_rest_route('forgewp/v1', '/cart/shipping-rate', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_shipping_rate') + $public));
        register_rest_route('forgewp/v1', '/cart/customer', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_customer') + $public));
        register_rest_route('forgewp/v1', '/cart/merge', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_merge') + $public));
        register_rest_route('forgewp/v1', '/checkout', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_checkout') + $public));
        register_rest_route('forgewp/v1', '/checkout/order', array(array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_checkout_order') + $public));
        register_rest_route('forgewp/v1', '/customer/profile', array(
            array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_get_profile') + $public,
            array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_update_profile') + $public,
        ));
        register_rest_route('forgewp/v1', '/customer/address', array(
            array('methods' => 'GET', 'callback' => 'forgewp_commerce_rest_get_address') + $public,
            array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_update_address') + $public,
        ));
        register_rest_route('forgewp/v1', '/wishlist/items', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_wishlist_add') + $public));
        register_rest_route('forgewp/v1', '/wishlist/items/(?P<id>[0-9]+)', array(array('methods' => 'DELETE', 'callback' => 'forgewp_commerce_rest_wishlist_remove') + $public));
        register_rest_route('forgewp/v1', '/wishlist/merge', array(array('methods' => 'POST', 'callback' => 'forgewp_commerce_rest_wishlist_merge') + $public));
    });
}
`;
}
