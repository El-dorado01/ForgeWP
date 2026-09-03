import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseSource, traverse } from '../blocks/ast-parser.js';

/**
 * Converts a Babel AST literal/object/array node to a JS value.
 */
function astToValue(node) {
  if (!node) return null;
  switch (node.type) {
    case 'StringLiteral':
      return node.value;
    case 'NumericLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'ArrayExpression':
      return node.elements.map((el) => astToValue(el));
    case 'ObjectExpression': {
      const obj = {};
      for (const prop of node.properties) {
        if (prop.type === 'ObjectProperty') {
          const key = prop.key.name || prop.key.value;
          obj[key] = astToValue(prop.value);
        }
      }
      return obj;
    }
    case 'UnaryExpression': {
      if (node.operator === '-' && node.argument?.type === 'NumericLiteral') {
        return -node.argument.value;
      }
      return null;
    }
    case 'CallExpression': {
      // Handles defineProducts([...]) wrapper
      if (node.arguments && node.arguments[0]) {
        return astToValue(node.arguments[0]);
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Loads products from cms/products.ts or cms/products.json.
 * @param {string} themeRoot
 * @returns {Array<any>}
 */
export function loadProductsData(themeRoot) {
  const tsPath = path.join(themeRoot, 'cms', 'products.ts');
  const jsonPath = path.join(themeRoot, 'cms', 'products.json');

  if (fs.existsSync(tsPath)) {
    try {
      const code = fs.readFileSync(tsPath, 'utf8');
      const ast = parseSource(code);
      let extracted = null;

      traverse(ast, {
        ExportNamedDeclaration(astPath) {
          const decl = astPath.node.declaration;
          if (decl && decl.declarations) {
            for (const d of decl.declarations) {
              if (d.id?.name === 'products' && d.init) {
                extracted = astToValue(d.init);
              }
            }
          }
        },
        ExportDefaultDeclaration(astPath) {
          if (!extracted && astPath.node.declaration) {
            extracted = astToValue(astPath.node.declaration);
          }
        },
      });

      if (Array.isArray(extracted)) return extracted;
      if (extracted && Array.isArray(extracted.products)) return extracted.products;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP Seed] Could not load ${tsPath}: ${e.message}`);
    }
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.products)) return raw.products;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP Seed] Could not parse ${jsonPath}: ${e.message}`);
    }
  }

  return [];
}

/**
 * Builds the PHP code for seeding WooCommerce products.
 * @param {import('../types.js').ForgeWPThemeConfig} config
 * @param {string} themeRoot
 * @returns {string}
 */
export function buildSeedProductsPhp(config, themeRoot) {
  const seedConfig = config.seed;
  if (!seedConfig || !seedConfig.products) {
    return '';
  }

  const strategy = seedConfig.products === true ? 'once' : seedConfig.products;
  const developmentOnly = seedConfig.developmentOnly !== false;
  const sideloadImages = seedConfig.sideloadImages !== false;

  const rawProducts = loadProductsData(themeRoot);
  if (!rawProducts || rawProducts.length === 0) {
    return '';
  }

  // Normalize product objects for PHP export
  const normalizedProducts = rawProducts.map((p, index) => {
    const slug = p.slug || `product-${p.id || index + 1}`;
    const name = p.name || p.title || `Product ${index + 1}`;
    const price = typeof p.price === 'number' ? p.price : parseFloat(p.price || '0');
    const salePrice = p.salePrice !== undefined ? (typeof p.salePrice === 'number' ? p.salePrice : parseFloat(p.salePrice || '0')) : null;
    const regularPrice = p.regular_price !== undefined ? (typeof p.regular_price === 'number' ? p.regular_price : parseFloat(p.regular_price || '0')) : price;
    const description = p.description || p.content || '';
    const shortDescription = p.shortDescription || p.excerpt || '';
    const sku = p.sku || `FWP-${slug.toUpperCase()}`;
    const images = Array.isArray(p.images) ? p.images : (p.featuredImage ? [p.featuredImage] : []);
    
    // Categories
    let categories = [];
    if (Array.isArray(p.categories)) {
      categories = p.categories;
    } else if (p.category) {
      categories = [p.category];
    }

    // Tags
    let tags = [];
    if (Array.isArray(p.tags)) {
      tags = p.tags;
    }

    // Dimensions & Weight
    const dimensions = p.dimensions || {};
    const weight = p.weight !== undefined ? String(p.weight) : '';

    const reviews = Array.isArray(p.reviews)
      ? p.reviews.map((r, rIdx) => ({
          id: r.id || rIdx + 1,
          author: r.author || 'Customer',
          email: r.email || `customer${rIdx + 1}@example.com`,
          content: r.content || r.comment || '',
          rating: typeof r.rating === 'number' ? r.rating : 5,
          date: r.date || new Date().toISOString().split('T')[0],
          verified: r.verified !== false,
        }))
      : [];

    return {
      sku,
      name,
      slug,
      regular_price: regularPrice > 0 ? String(regularPrice) : '',
      sale_price: salePrice && salePrice > 0 ? String(salePrice) : '',
      description,
      short_description: shortDescription,
      categories,
      tags,
      images,
      weight,
      length: dimensions.length !== undefined ? String(dimensions.length) : '',
      width: dimensions.width !== undefined ? String(dimensions.width) : '',
      height: dimensions.height !== undefined ? String(dimensions.height) : '',
      badge: p.badge || '',
      materials: Array.isArray(p.materials) ? p.materials : [],
      care: p.care || '',
      rating: p.rating || p.average_rating || null,
      rating_count: p.reviewCount || p.rating_count || null,
      reviews,
    };
  });

  const productsJson = JSON.stringify(normalizedProducts, null, 2);
  const dataHash = crypto.createHash('sha256').update(productsJson).digest('hex');

  return `
/**
 * ==============================================================================
 * ForgeWP WooCommerce Products Data Seeder
 * Strategy: ${strategy} | Hash: ${dataHash.substring(0, 12)}
 * ==============================================================================
 */
function forgewp_seed_woocommerce_products($force = false) {
    if (!class_exists('WooCommerce')) {
        return;
    }
${developmentOnly ? `
    // Production Safety Guard: only run in WP_DEBUG mode unless forced
    if (!$force && (!defined('WP_DEBUG') || !WP_DEBUG)) {
        return;
    }
` : ''}
    $current_hash = '${dataHash}';
    $saved_hash = get_option('forgewp_seeded_products_hash', '');
    $strategy = '${strategy}';

    // In 'once' mode, skip if already seeded or if any products already exist
    if (!$force && $strategy === 'once') {
        if (!empty($saved_hash)) {
            return;
        }
        $existing_count = wp_count_posts('product');
        if (!empty($existing_count->publish) && intval($existing_count->publish) > 0) {
            update_option('forgewp_seeded_products_hash', $current_hash);
            return;
        }
    }

    // In 'upsert' mode, skip if content hash matches
    if (!$force && $strategy === 'upsert' && $saved_hash === $current_hash) {
        return;
    }

    $raw_json = <<<'FORGEWP_PRODUCTS_JSON'
${productsJson}
FORGEWP_PRODUCTS_JSON;

    $products = json_decode($raw_json, true);
    if (!is_array($products)) {
        return;
    }

    // Ensure media handling helpers exist if sideloading images
    if (!function_exists('media_sideload_image')) {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
    }

    foreach ($products as $p) {
        $sku = !empty($p['sku']) ? sanitize_text_field($p['sku']) : '';
        $slug = !empty($p['slug']) ? sanitize_title($p['slug']) : '';
        $name = !empty($p['name']) ? sanitize_text_field($p['name']) : '';

        if (empty($name)) {
            continue;
        }

        // Find existing product by SKU or slug
        $product_id = 0;
        if (!empty($sku)) {
            $product_id = wc_get_product_id_by_sku($sku);
        }
        if (!$product_id && !empty($slug)) {
            $existing_post = get_page_by_path($slug, OBJECT, 'product');
            if ($existing_post) {
                $product_id = $existing_post->ID;
            }
        }

        if ($product_id && $strategy === 'once' && !$force) {
            continue;
        }

        $wc_product = $product_id ? wc_get_product($product_id) : new WC_Product_Simple();
        if (!$wc_product) {
            $wc_product = new WC_Product_Simple();
        }

        $wc_product->set_name($name);
        if (!empty($slug)) {
            $wc_product->set_slug($slug);
        }
        if (!empty($sku)) {
            $wc_product->set_sku($sku);
        }
        $wc_product->set_status('publish');
        $wc_product->set_catalog_visibility('visible');

        // Pricing
        if (!empty($p['regular_price'])) {
            $wc_product->set_regular_price($p['regular_price']);
            $wc_product->set_price($p['regular_price']);
        }
        if (!empty($p['sale_price'])) {
            $wc_product->set_sale_price($p['sale_price']);
            $wc_product->set_price($p['sale_price']);
        }

        // Descriptions
        if (!empty($p['description'])) {
            $wc_product->set_description($p['description']);
        }
        if (!empty($p['short_description'])) {
            $wc_product->set_short_description($p['short_description']);
        }

        // Dimensions & Specs
        if (!empty($p['weight'])) {
            $wc_product->set_weight($p['weight']);
        }
        if (!empty($p['length'])) {
            $wc_product->set_length($p['length']);
        }
        if (!empty($p['width'])) {
            $wc_product->set_width($p['width']);
        }
        if (!empty($p['height'])) {
            $wc_product->set_height($p['height']);
        }

        // Categories (product_cat)
        if (!empty($p['categories']) && is_array($p['categories'])) {
            $cat_ids = array();
            foreach ($p['categories'] as $cat_name) {
                $term = get_term_by('name', $cat_name, 'product_cat');
                if (!$term) {
                    $new_term = wp_insert_term($cat_name, 'product_cat');
                    if (!is_wp_error($new_term) && isset($new_term['term_id'])) {
                        $cat_ids[] = intval($new_term['term_id']);
                    }
                } else {
                    $cat_ids[] = intval($term->term_id);
                }
            }
            if (!empty($cat_ids)) {
                $wc_product->set_category_ids($cat_ids);
            }
        }

        // Tags (product_tag)
        if (!empty($p['tags']) && is_array($p['tags'])) {
            $tag_ids = array();
            foreach ($p['tags'] as $tag_name) {
                $term = get_term_by('name', $tag_name, 'product_tag');
                if (!$term) {
                    $new_term = wp_insert_term($tag_name, 'product_tag');
                    if (!is_wp_error($new_term) && isset($new_term['term_id'])) {
                        $tag_ids[] = intval($new_term['term_id']);
                    }
                } else {
                    $tag_ids[] = intval($term->term_id);
                }
            }
            if (!empty($tag_ids)) {
                $wc_product->set_tag_ids($tag_ids);
            }
        }

        // Stock status
        $wc_product->set_stock_status('instock');

        $saved_id = $wc_product->save();

        if ($saved_id && !is_wp_error($saved_id)) {
            // Save custom metadata
            if (!empty($p['badge'])) {
                update_post_meta($saved_id, '_forgewp_badge', sanitize_text_field($p['badge']));
            }
            if (!empty($p['materials'])) {
                update_post_meta($saved_id, '_forgewp_materials', $p['materials']);
            }
            if (!empty($p['care'])) {
                update_post_meta($saved_id, '_forgewp_care', sanitize_text_field($p['care']));
            }
            if (!empty($p['images']) && is_array($p['images'])) {
                update_post_meta($saved_id, '_forgewp_images', $p['images']);
                if (!empty($p['images'][0])) {
                    update_post_meta($saved_id, '_forgewp_image', esc_url_raw($p['images'][0]));
                }
            }
            // Seeding actual WooCommerce reviews into wp_comments
            if (!empty($p['reviews']) && is_array($p['reviews'])) {
                $existing_reviews = get_comments(array(
                    'post_id' => $saved_id,
                    'type'    => 'review',
                    'count'   => true,
                ));

                if (intval($existing_reviews) === 0) {
                    $total_rating = 0;
                    $rating_counts = array();
                    foreach ($p['reviews'] as $rev) {
                        $rev_rating = isset($rev['rating']) ? intval($rev['rating']) : 5;
                        $rev_author = !empty($rev['author']) ? sanitize_text_field($rev['author']) : 'Customer';
                        $rev_email = !empty($rev['email']) ? sanitize_email($rev['email']) : 'customer@example.com';
                        $rev_content = !empty($rev['content']) ? sanitize_textarea_field($rev['content']) : '';
                        $rev_date = !empty($rev['date']) ? $rev['date'] : current_time('mysql');

                        $comment_id = wp_insert_comment(array(
                            'comment_post_ID'      => $saved_id,
                            'comment_author'       => $rev_author,
                            'comment_author_email' => $rev_email,
                            'comment_content'      => $rev_content,
                            'comment_type'         => 'review',
                            'comment_approved'     => 1,
                            'comment_date'         => $rev_date,
                        ));

                        if ($comment_id && !is_wp_error($comment_id)) {
                            update_comment_meta($comment_id, 'rating', $rev_rating);
                            if (!empty($rev['verified'])) {
                                update_comment_meta($comment_id, 'verified', 1);
                            }
                            $total_rating += $rev_rating;
                            $rating_counts[$rev_rating] = isset($rating_counts[$rev_rating]) ? $rating_counts[$rev_rating] + 1 : 1;
                        }
                    }

                    $rev_count = count($p['reviews']);
                    $avg_rating = $rev_count > 0 ? round($total_rating / $rev_count, 2) : 0;
                    update_post_meta($saved_id, '_wc_review_count', $rev_count);
                    update_post_meta($saved_id, '_wc_rating_count', $rating_counts);
                    update_post_meta($saved_id, '_wc_average_rating', $avg_rating);
                }
            } else {
                $existing_reviews = get_comments(array(
                    'post_id' => $saved_id,
                    'type'    => 'review',
                    'count'   => true,
                ));
                if (intval($existing_reviews) === 0) {
                    update_post_meta($saved_id, '_wc_review_count', 0);
                    update_post_meta($saved_id, '_wc_rating_count', array());
                    update_post_meta($saved_id, '_wc_average_rating', 0);
                }
            }

            // Image Sideloading (if active and not already attached)
            ${sideloadImages ? `
            if (!empty($p['images']) && is_array($p['images']) && !has_post_thumbnail($saved_id)) {
                $gallery_ids = array();
                foreach ($p['images'] as $img_idx => $img_url) {
                    if (filter_var($img_url, FILTER_VALIDATE_URL)) {
                        $attach_id = media_sideload_image($img_url, $saved_id, $name, 'id');
                        if (!is_wp_error($attach_id) && is_numeric($attach_id)) {
                            if ($img_idx === 0) {
                                set_post_thumbnail($saved_id, intval($attach_id));
                            } else {
                                $gallery_ids[] = intval($attach_id);
                            }
                        }
                    }
                }
                if (!empty($gallery_ids)) {
                    update_post_meta($saved_id, '_product_image_gallery', implode(',', $gallery_ids));
                }
            }
            ` : ''}
        }
    }

    update_option('forgewp_seeded_products_hash', $current_hash);
}

// Hook into theme activation and admin initialization
add_action('after_switch_theme', 'forgewp_seed_woocommerce_products');
add_action('admin_init', function() {
    if (current_user_can('manage_woocommerce')) {
        forgewp_seed_woocommerce_products();
    }
});

// WP-CLI command registration: wp forgewp seed-products
if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('forgewp seed-products', function($args, $assoc_args) {
        $force = isset($assoc_args['force']);
        WP_CLI::log('🌱 Seeding WooCommerce products from ForgeWP CMS catalog...');
        forgewp_seed_woocommerce_products($force);
        WP_CLI::success('WooCommerce products successfully synchronized!');
    });
}
`;
}
