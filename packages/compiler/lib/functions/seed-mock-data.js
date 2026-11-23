import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseSource, traverse } from '../blocks/ast-parser.js';

export function validateMockSeedStrategy(value) {
  const valid = (strategy) => [true, false, 'once', 'upsert', 'force'].includes(strategy);
  if (value === undefined || valid(value)) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid seed.mockData: expected a seed strategy or a post-type strategy map.');
  }
  for (const [postType, strategy] of Object.entries(value)) {
    if (!/^[a-z0-9_-]{1,20}$/.test(postType) || !valid(strategy)) {
      throw new Error(`Invalid seed.mockData entry "${postType}": expected a post-type key and false, true, "once", "upsert", or "force".`);
    }
  }
}

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
      // Handles defineWpPosts({...}) wrapper
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
 * Loads mock content from cms/mock-data.{ts,mjs,js} or cms/mock-data.json.
 * @param {string} themeRoot
 * @returns {Record<string, Array<any>>}
 */
export function loadMockData(themeRoot) {
  const scriptPath = ['.ts', '.mjs', '.js']
    .map((ext) => path.join(themeRoot, 'cms', `mock-data${ext}`))
    .find((p) => fs.existsSync(p));
  const jsonPath = path.join(themeRoot, 'cms', 'mock-data.json');

  if (scriptPath) {
    try {
      const code = fs.readFileSync(scriptPath, 'utf8');
      const ast = parseSource(code);
      let extracted = null;

      traverse(ast, {
        ExportNamedDeclaration(astPath) {
          const decl = astPath.node.declaration;
          if (decl && decl.declarations) {
            for (const d of decl.declarations) {
              if (d.id?.name === 'mockData' && d.init) {
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

      if (extracted && typeof extracted === 'object' && !Array.isArray(extracted)) return extracted;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP Seed] Could not load ${scriptPath}: ${e.message}`);
    }
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    } catch (e) {
      console.warn(`⚠️  [ForgeWP Seed] Could not parse ${jsonPath}: ${e.message}`);
    }
  }

  return {};
}

const BLOCK_TAGS = {
  p: (html) => `<!-- wp:paragraph -->\n${html}\n<!-- /wp:paragraph -->`,
  h1: (html) => heading(1, html), h2: (html) => heading(2, html), h3: (html) => heading(3, html),
  h4: (html) => heading(4, html), h5: (html) => heading(5, html), h6: (html) => heading(6, html),
  ul: (html) => list(false, html),
  ol: (html) => list(true, html),
  blockquote: (html) => `<!-- wp:quote -->\n${withClass(html, 'blockquote', 'wp-block-quote')}\n<!-- /wp:quote -->`,
  hr: () => '<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->',
};
function heading(level, html) {
  const attrs = level === 2 ? '' : ` {"level":${level}}`;
  return `<!-- wp:heading${attrs} -->\n${withClass(html, `h${level}`, 'wp-block-heading')}\n<!-- /wp:heading -->`;
}
function list(ordered, html) {
  const tag = ordered ? 'ol' : 'ul';
  const items = html.replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, (_m, a = '', inner) =>
    `<!-- wp:list-item -->\n<li${a}>${inner}</li>\n<!-- /wp:list-item -->`);
  return `<!-- wp:list${ordered ? ' {"ordered":true}' : ''} -->\n${withClass(items, tag, 'wp-block-list')}\n<!-- /wp:list -->`;
}
function withClass(html, tag, cls) {
  return html.replace(new RegExp(`^<${tag}(\\s[^>]*)?>`, 'i'), (_m, attrs = '') => {
    if (/\sclass\s*=/.test(attrs)) return `<${tag}${attrs.replace(/(\sclass\s*=\s*["'])/, `$1${cls} `)}>`;
    return `<${tag} class="${cls}"${attrs}>`;
  });
}

/**
 * Converts seeded HTML into Gutenberg block markup so it opens as native blocks
 * (paragraph, heading, list, quote, separator) instead of one Classic block.
 * Top-level elements outside that set, and stray text, become core/html blocks.
 * Content that already contains block markup, or cannot be split cleanly, is
 * returned unchanged.
 */
export function htmlToBlockMarkup(input) {
  const html = String(input || '').trim();
  if (!html || html.includes('<!-- wp:')) return input || '';
  const blocks = [];
  let i = 0;
  const pushHtml = (chunk) => {
    const c = chunk.trim();
    if (c) blocks.push(`<!-- wp:html -->\n${c}\n<!-- /wp:html -->`);
  };
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) { pushHtml(html.slice(i)); break; }
    if (lt > i) pushHtml(html.slice(i, lt));
    const open = /^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/.exec(html.slice(lt));
    if (!open) return input; // comments, doctype or malformed markup: leave as-is
    const tag = open[1].toLowerCase();
    const selfClosing = open[2] === '/' || ['hr', 'br', 'img'].includes(tag);
    let end;
    if (selfClosing) {
      end = lt + open[0].length;
    } else {
      // Find the matching close tag, counting nested same-name tags.
      const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
      re.lastIndex = lt + open[0].length;
      let depth = 1; let m;
      while (depth > 0 && (m = re.exec(html))) depth += m[1] ? -1 : 1;
      if (depth !== 0) return input;
      end = re.lastIndex;
    }
    const element = html.slice(lt, end);
    // Only attribute-free elements map to core blocks: attributes (class, id,
    // style) would need block attributes to pass Gutenberg's validation.
    const plainOpen = new RegExp(`^<${tag}\\s*/?>`, 'i').test(open[0]);
    if (BLOCK_TAGS[tag] && plainOpen) blocks.push(BLOCK_TAGS[tag](element));
    else pushHtml(element);
    i = end;
  }
  return blocks.join('\n\n');
}

/**
 * Shared fixture normalization for generated PHP and the read-only CLI preview.
 */
export function normalizeMockSeedData(rawMockData, mockStrategy) {
  const postTypesToSeed = Object.keys(rawMockData);
  const strategyMap = mockStrategy && typeof mockStrategy === 'object' ? mockStrategy : null;
  if (!mockStrategy) return {};
  const normalizedData = {};

  for (const postType of postTypesToSeed) {
    // Maps opt in explicitly: omitted/disabled types never enter the payload,
    // including when the WordPress command is run with --force.
    if (strategyMap && (!Object.hasOwn(strategyMap, postType) || strategyMap[postType] === false)) continue;
    const items = rawMockData[postType];
    if (!Array.isArray(items) || items.length === 0) continue;

    normalizedData[postType] = items.map((item, idx) => {
      const title = item.title || item.name || `Sample ${postType} ${idx + 1}`;
      const slug = item.slug || `sample-${postType}-${item.id || idx + 1}`;
      const content = htmlToBlockMarkup(item.content || '');
      const excerpt = item.excerpt || item.description || '';
      const date = item.date || '';
      const featuredImage = item.featuredImage || (Array.isArray(item.images) ? item.images[0] : '');
      const customFields = item.customFields || item.meta || {};

      // Terms
      let terms = {};
      if (item._terms && typeof item._terms === 'object') {
        terms = item._terms;
      } else {
        if (item.category) {
          terms.category = [item.category];
        } else if (Array.isArray(item.categories)) {
          terms.category = item.categories;
        }
        if (Array.isArray(item.tags)) {
          terms.post_tag = item.tags;
        }
      }

      return {
        title,
        slug,
        content,
        excerpt,
        date,
        featuredImage,
        customFields,
        terms,
      };
    });
  }

  return normalizedData;
}

/** Build configured WordPress seed routines without connecting to a database. */
export function buildSeedMockDataPhp(config, themeRoot) {
  const seedConfig = config.seed;
  validateMockSeedStrategy(seedConfig?.mockData);
  if (!seedConfig || !seedConfig.mockData) {
    return '';
  }

  const rawMockData = loadMockData(themeRoot);
  const postTypesToSeed = Object.keys(rawMockData);

  if (postTypesToSeed.length === 0) {
    return '';
  }

  const defaultStrategy = typeof seedConfig.mockData === 'string' ? seedConfig.mockData : 'once';
  const strategyMap = typeof seedConfig.mockData === 'object' ? seedConfig.mockData : null;
  const developmentOnly = seedConfig.developmentOnly !== false;
  const sideloadImages = seedConfig.sideloadImages !== false;

  const normalizedData = normalizeMockSeedData(rawMockData, seedConfig.mockData);

  if (Object.keys(normalizedData).length === 0) {
    return '';
  }

  const mockDataJson = JSON.stringify(normalizedData, null, 2);
  const dataHash = crypto.createHash('sha256').update(mockDataJson).digest('hex');
  const typeState = {};
  if (strategyMap) {
    for (const [postType, posts] of Object.entries(normalizedData)) {
      const strategy = strategyMap[postType] === true ? 'once' : strategyMap[postType];
      typeState[postType] = {
        strategy,
        hash: crypto.createHash('sha256').update(JSON.stringify({ strategy, posts })).digest('hex'),
      };
    }
  }

  return `
/**
 * ==============================================================================
 * ForgeWP Mock Content Data Seeder
 * Post Types: ${Object.keys(normalizedData).join(', ')} | Hash: ${dataHash.substring(0, 12)}
 * ==============================================================================
 */
function forgewp_seed_mock_content($force = false) {
${developmentOnly ? `
    // Production Safety Guard: only run in WP_DEBUG mode unless forced
    if (!$force && (!defined('WP_DEBUG') || !WP_DEBUG)) {
        return;
    }
` : ''}
    $current_hash = '${dataHash}';
    $saved_hash = get_option('forgewp_seeded_mock_data_hash', '');
    $default_strategy = '${defaultStrategy}';

    // Scalar strategies retain their existing global marker semantics.
    if (${strategyMap ? 'false' : 'true'} && !$force && $default_strategy === 'once' && !empty($saved_hash)) {
        return;
    }

    // In 'upsert' mode, skip if content hash matches
    if (${strategyMap ? 'false' : 'true'} && !$force && $default_strategy === 'upsert' && $saved_hash === $current_hash) {
        return;
    }

    $raw_json = <<<'FORGEWP_MOCK_DATA_JSON'
${mockDataJson}
FORGEWP_MOCK_DATA_JSON;

    $mock_data = json_decode($raw_json, true);
    if (!is_array($mock_data)) {
        return;
    }
    $type_state = json_decode(base64_decode('${Buffer.from(JSON.stringify(typeState)).toString('base64')}'), true);
    $saved_type_hashes = get_option('forgewp_seeded_mock_data_type_hashes', array());
    if (!is_array($saved_type_hashes)) $saved_type_hashes = array();

    // Ensure media handling helpers exist if sideloading images
    if (${sideloadImages ? 'true' : 'false'} && !function_exists('media_sideload_image')) {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
    }

    // Determine default author (administrator)
    $default_author_id = 1;
    $admin_users = get_users(array('role' => 'administrator', 'number' => 1));
    if (!empty($admin_users) && isset($admin_users[0]->ID)) {
        $default_author_id = $admin_users[0]->ID;
    }

    foreach ($mock_data as $post_type => $posts) {
        if (!is_array($posts)) {
            continue;
        }
        $strategy = isset($type_state[$post_type]) ? $type_state[$post_type]['strategy'] : $default_strategy;
        $type_hash = isset($type_state[$post_type]) ? $type_state[$post_type]['hash'] : '';
        $saved_type_hash = isset($saved_type_hashes[$post_type]) ? $saved_type_hashes[$post_type] : '';
        if (!$force && $type_hash !== '' && (($strategy === 'once' && $saved_type_hash !== '') || ($strategy === 'upsert' && $saved_type_hash === $type_hash))) continue;
        $type_succeeded = true;

        // In 'once' mode, check if any posts of this post_type already exist in WP.
        // Exception: for 'page', routing.js auto-creates empty template stubs on theme
        // activation, so skip per-item when a page already has non-empty content instead
        // of skipping the entire 'page' post type.
        if (!$force && $strategy === 'once' && $post_type !== 'page') {
            $existing_count = wp_count_posts($post_type);
            $published = !empty($existing_count->publish) ? intval($existing_count->publish) : 0;
            // WordPress core's own sample post ("Hello world!") exists on every fresh
            // install; it is not user content and must not block first-time seeding.
            if ($post_type === 'post' && $published > 0) {
                $core_sample = get_page_by_path('hello-world', OBJECT, 'post');
                if ($core_sample && $core_sample->post_status === 'publish') {
                    $published--;
                }
            }
            if ($published > 0) {
                continue;
            }
        }

        foreach ($posts as $item) {
            $title = !empty($item['title']) ? sanitize_text_field($item['title']) : '';
            $slug = !empty($item['slug']) ? sanitize_title($item['slug']) : '';
            if (empty($title)) {
                continue;
            }

            // Check if post already exists. For 'page', check forgewp_route_id first so
            // compiled template pages auto-created by routing.js are updated in place
            // without creating duplicate pages (even if their slug was renamed in WP).
            $existing_post = null;
            $post_id = 0;
            $item_route_id = '';
            if ($post_type === 'page') {
                if (!empty($item['routeId'])) {
                    $item_route_id = sanitize_key((string) $item['routeId']);
                } elseif (!empty($item['customFields']['forgewp_route_id'])) {
                    $item_route_id = sanitize_key((string) $item['customFields']['forgewp_route_id']);
                } elseif ($slug !== '') {
                    $item_route_id = ($slug === 'home') ? 'front-page' : ($slug . '-page');
                }
                if ($item_route_id !== '' && function_exists('forgewp_resolve_route_page_id')) {
                    $resolved_id = intval(forgewp_resolve_route_page_id($item_route_id));
                    if ($resolved_id > 0) {
                        $existing_post = get_post($resolved_id);
                    }
                }
            }
            if (!$existing_post && $slug !== '') {
                $existing_post = get_page_by_path($slug, OBJECT, $post_type);
            }
            $post_id = $existing_post ? intval($existing_post->ID) : 0;

            if ($post_id && $strategy === 'once' && !$force) {
                // Allow first-time seeding into an empty auto-created template stub page,
                // but never overwrite a page that already has user or seeded content.
                $existing_content = isset($existing_post->post_content) ? trim((string) $existing_post->post_content) : '';
                if ($post_type !== 'page' || $existing_content !== '') {
                    continue;
                }
            }

            $preserved_template = ($post_type === 'page' && $post_id && function_exists('get_post_meta'))
                ? (string) get_post_meta($post_id, '_wp_page_template', true)
                : '';
            $preserved_route_id = ($post_type === 'page' && $post_id && function_exists('get_post_meta'))
                ? (string) get_post_meta($post_id, 'forgewp_route_id', true)
                : '';

            $post_args = array(
                'post_title'   => $title,
                'post_name'    => ($post_id && !empty($existing_post->post_name)) ? $existing_post->post_name : $slug,
                'post_type'    => $post_type,
                'post_status'  => 'publish',
                'post_content' => !empty($item['content']) ? $item['content'] : '',
                'post_excerpt' => !empty($item['excerpt']) ? $item['excerpt'] : '',
                'post_author'  => $default_author_id,
            );

            if ($preserved_template !== '') {
                $post_args['page_template'] = $preserved_template;
            }

            if (!empty($item['date'])) {
                $parsed_date = date('Y-m-d H:i:s', strtotime($item['date']));
                if ($parsed_date) {
                    $post_args['post_date'] = $parsed_date;
                }
            }

            if ($post_id) {
                $post_args['ID'] = $post_id;
                $saved_post_id = wp_update_post($post_args, true);
            } else {
                $saved_post_id = wp_insert_post($post_args, true);
            }

            if (!$saved_post_id || is_wp_error($saved_post_id)) {
                $type_succeeded = false;
                continue;
            }
            if ($saved_post_id && !is_wp_error($saved_post_id)) {
                // Preserve compiled template assignment and route identity on page upserts
                if ($preserved_template !== '' && function_exists('get_post_meta') && get_post_meta($saved_post_id, '_wp_page_template', true) !== $preserved_template) {
                    update_post_meta($saved_post_id, '_wp_page_template', $preserved_template);
                }
                if ($preserved_route_id !== '' && function_exists('get_post_meta') && get_post_meta($saved_post_id, 'forgewp_route_id', true) !== $preserved_route_id) {
                    update_post_meta($saved_post_id, 'forgewp_route_id', $preserved_route_id);
                }

                // Save custom fields
                if (!empty($item['customFields']) && is_array($item['customFields'])) {
                    foreach ($item['customFields'] as $meta_key => $meta_val) {
                        update_post_meta($saved_post_id, sanitize_key($meta_key), $meta_val);
                    }
                }

                // Assign Taxonomies and Terms
                if (!empty($item['terms']) && is_array($item['terms'])) {
                    foreach ($item['terms'] as $tax_name => $tax_terms) {
                        if (taxonomy_exists($tax_name) && !empty($tax_terms)) {
                            $term_names = array();
                            if (is_array($tax_terms)) {
                                foreach ($tax_terms as $t) {
                                    $term_names[] = is_array($t) ? ($t['name'] ?? $t['slug'] ?? '') : strval($t);
                                }
                            } else {
                                $term_names[] = strval($tax_terms);
                            }
                            $term_names = array_filter($term_names);
                            if (!empty($term_names)) {
                                wp_set_post_terms($saved_post_id, $term_names, $tax_name, false);
                            }
                        }
                    }
                }

                // Sideload Featured Image
                ${sideloadImages ? `
                if (!empty($item['featuredImage']) && filter_var($item['featuredImage'], FILTER_VALIDATE_URL) && !has_post_thumbnail($saved_post_id)) {
                    $attach_id = media_sideload_image($item['featuredImage'], $saved_post_id, $title, 'id');
                    if (!is_wp_error($attach_id) && is_numeric($attach_id)) {
                        set_post_thumbnail($saved_post_id, intval($attach_id));
                    }
                }
                ` : ''}
            }
        }
        if ($type_hash !== '' && $type_succeeded) {
            $saved_type_hashes[$post_type] = $type_hash;
        }
    }

    ${strategyMap ? "update_option('forgewp_seeded_mock_data_type_hashes', $saved_type_hashes);" : "update_option('forgewp_seeded_mock_data_hash', $current_hash);"}
}

// Hook into theme activation and admin initialization
add_action('after_switch_theme', function() {
    // WordPress passes the old theme name here; it must not become $force.
    forgewp_seed_mock_content();
});
add_action('admin_init', function() {
    if (current_user_can('edit_posts')) {
        forgewp_seed_mock_content();
    }
});

// WP-CLI command registration: wp forgewp seed-mock-data
if (defined('WP_CLI') && WP_CLI) {
    WP_CLI::add_command('forgewp seed-mock-data', function($args, $assoc_args) {
        $force = isset($assoc_args['force']);
        WP_CLI::log('🌱 Seeding mock content (posts, pages, CPTs) from ForgeWP CMS mock-data...');
        forgewp_seed_mock_content($force);
        WP_CLI::success('Mock content successfully synchronized!');
    });
}
`;
}
