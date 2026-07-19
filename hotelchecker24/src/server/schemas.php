<?php
/**
 * ── PHASE 3: GEO & SCHEMA ARCHITECTURE LAYER ──
 * Custom JSON-LD Schema Generator
 */

// 1. Output custom JSON-LD schemas inside wp_head
// Stash for schemas to print in wp_head if Yoast/RankMath are not active
global $forgewp_custom_schemas;
$forgewp_custom_schemas = array();

function forgewp_init_custom_json_ld_schema() {
    global $post, $forgewp_custom_schemas;
    
    // Determine active locale dynamically (multilingual/locale agnostic)
    $current_lang = '';
    if (function_exists('pll_current_language')) {
        $current_lang = pll_current_language();
    } elseif (defined('ICL_LANGUAGE_CODE')) {
        $current_lang = ICL_LANGUAGE_CODE;
    }
    if (empty($current_lang)) {
        $current_lang = get_locale();
        if (strpos($current_lang, '_') !== false) {
            $parts = explode('_', $current_lang);
            $current_lang = $parts[0];
        }
    }
    $current_lang = strtolower($current_lang);
    
    $schemas = array();
    $seo_active = defined('WPSEO_VERSION') || class_exists('RankMath') || defined('AIOSEO_VERSION') || class_exists('All_in_One_SEO_Pack');
    
    // A. BreadcrumbList Schema (Sitewide except Home)
    if (!is_front_page() && !$seo_active) {
        $breadcrumbs = array();
        
        // Add Home
        $home_url = function_exists('pll_home_url') ? pll_home_url($current_lang) : home_url('/');
        $breadcrumbs[] = array(
            'name' => ($current_lang === 'de' || strpos($current_lang, 'de') !== false) ? 'Startseite' : 'Home',
            'url' => $home_url
        );
        
        if (is_singular('hotel')) {
            // Path: Home -> Country -> Category (optional) -> Hotel
            $countries = get_the_terms($post->ID, 'country');
            if (!empty($countries) && !is_wp_error($countries)) {
                $country = array_shift($countries);
                // Parent country path
                if ($country->parent) {
                    $parent_country = get_term($country->parent, 'country');
                    if ($parent_country && !is_wp_error($parent_country)) {
                        $breadcrumbs[] = array(
                            'name' => $parent_country->name,
                            'url' => get_term_link($parent_country)
                        );
                    }
                }
                $breadcrumbs[] = array(
                    'name' => $country->name,
                    'url' => get_term_link($country)
                );
            }
            
            $categories = get_the_terms($post->ID, 'category');
            if (!empty($categories) && !is_wp_error($categories)) {
                $category = array_shift($categories);
                $breadcrumbs[] = array(
                    'name' => $category->name,
                    'url' => get_term_link($category)
                );
            }
            
            $breadcrumbs[] = array(
                'name' => get_the_title(),
                'url' => get_permalink()
            );
            
        } elseif (is_singular('listicle')) {
            // Path: Home -> Comparisons Archive -> Listicle
            $listicles_page = get_pages(array(
                'meta_key' => '_wp_page_template',
                'meta_value' => 'page-listicles.php',
                'number' => 1
            ));
            if (!empty($current_lang) && !empty($listicles_page)) {
                $listicles_page_args = array(
                    'meta_key' => '_wp_page_template',
                    'meta_value' => 'page-listicles.php',
                    'number' => 1,
                    'lang' => $current_lang
                );
                $listicles_page = get_pages($listicles_page_args);
            }
            $listicles_archive_url = !empty($listicles_page) ? get_permalink($listicles_page[0]->ID) : home_url('/hotelvergleiche/');
            
            $breadcrumbs[] = array(
                'name' => ($current_lang === 'de' || strpos($current_lang, 'de') !== false) ? 'Hotelvergleiche' : 'Hotel Comparisons',
                'url' => $listicles_archive_url
            );
            $breadcrumbs[] = array(
                'name' => get_the_title(),
                'url' => get_permalink()
            );
            
        } elseif (is_tax()) {
            // Path: Home -> Taxonomy Term
            $term = get_queried_object();
            if ($term) {
                if (isset($term->parent) && $term->parent) {
                    $parent_term = get_term($term->parent, $term->taxonomy);
                    if ($parent_term && !is_wp_error($parent_term)) {
                        $breadcrumbs[] = array(
                            'name' => $parent_term->name,
                            'url' => get_term_link($parent_term)
                        );
                    }
                }
                $breadcrumbs[] = array(
                    'name' => $term->name,
                    'url' => get_term_link($term)
                );
            }
        } elseif (is_page()) {
            // Path: Home -> Parent Pages -> Current Page
            $ancestors = get_post_ancestors($post->ID);
            if (!empty($ancestors)) {
                $ancestors = array_reverse($ancestors);
                foreach ($ancestors as $ancestor_id) {
                    $breadcrumbs[] = array(
                        'name' => get_the_title($ancestor_id),
                        'url' => get_permalink($ancestor_id)
                    );
                }
            }
            $breadcrumbs[] = array(
                'name' => get_the_title(),
                'url' => get_permalink()
            );
        }
        
        if (!empty($breadcrumbs)) {
            $list_items = array();
            foreach ($breadcrumbs as $index => $crumb) {
                $list_items[] = array(
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => $crumb['name'],
                    'item' => esc_url($crumb['url'])
                );
            }
            $schemas[] = array(
                '@context' => 'https://schema.org',
                '@type' => 'BreadcrumbList',
                'itemListElement' => $list_items
            );
        }
    }
    
    // B. Organization Schema (Homepage)
    if (is_front_page() && !$seo_active) {
        $logo_id = get_theme_mod('custom_logo');
        $logo_url = $logo_id ? wp_get_attachment_image_url($logo_id, 'full') : get_template_directory_uri() . '/Logo/hotelchecker24-logo_farbe.svg';
        
        $same_as = array();
        $socials = array('facebook', 'instagram', 'twitter', 'youtube', 'linkedin');
        foreach ($socials as $social) {
            $link = get_option('social_' . $social);
            if (!empty($link)) {
                $same_as[] = esc_url($link);
            }
        }
        
        $org_schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => get_bloginfo('name'),
            'url' => home_url('/'),
            'logo' => esc_url($logo_url),
            'description' => get_bloginfo('description'),
        );
        if (!empty($same_as)) {
            $org_schema['sameAs'] = $same_as;
        }
        $schemas[] = $org_schema;
    }
    
    // C. Hotel Schema (Hotel post type)
    if (is_singular('hotel')) {
        $post_id = $post->ID;
        $rating = get_post_meta($post_id, 'rating', true);
        $price_range = get_post_meta($post_id, 'price_range', true);
        $location = get_post_meta($post_id, 'location', true);
        $stars = intval(get_post_meta($post_id, 'stars', true));
        $website = get_post_meta($post_id, 'website', true);
        $contact_email = get_post_meta($post_id, 'contact_email', true);
        $city = get_post_meta($post_id, 'city', true);
        
        // Categories
        $categories = get_the_terms($post_id, 'category');
        $category_name = (!empty($categories) && !is_wp_error($categories)) ? $categories[0]->name : '';
        
        $hotel_schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'Hotel',
            'name' => get_the_title(),
            'description' => get_the_excerpt(),
            'image' => get_the_post_thumbnail_url($post_id, 'full'),
            'url' => get_permalink()
        );
        
        if (!empty($location)) {
            $country_code = '';
            $countries = get_the_terms($post_id, 'country');
            if (!empty($countries) && !is_wp_error($countries)) {
                $country_slug = $countries[0]->slug;
                if (strpos($country_slug, 'oesterreich') !== false || strpos($country_slug, 'austria') !== false || strpos($country_slug, 'at') !== false) {
                    $country_code = 'AT';
                } elseif (strpos($country_slug, 'deutschland') !== false || strpos($country_slug, 'germany') !== false || strpos($country_slug, 'de') !== false) {
                    $country_code = 'DE';
                } elseif (strpos($country_slug, 'schweiz') !== false || strpos($country_slug, 'switzerland') !== false || strpos($country_slug, 'ch') !== false) {
                    $country_code = 'CH';
                } elseif (strpos($country_slug, 'italien') !== false || strpos($country_slug, 'italy') !== false || strpos($country_slug, 'it') !== false) {
                    $country_code = 'IT';
                } else {
                    $country_code = strtoupper(substr($country_slug, 0, 2));
                }
            }
            $hotel_schema['address'] = array(
                '@type' => 'PostalAddress',
                'streetAddress' => $location,
                'addressLocality' => !empty($city) ? $city : '',
                'addressCountry' => $country_code
            );
        }
        
        if (!empty($contact_email)) {
            $hotel_schema['email'] = sanitize_email($contact_email);
        }
        if (!empty($website)) {
            $hotel_schema['url'] = esc_url($website);
        }
        if (!empty($category_name)) {
            $hotel_schema['category'] = esc_html($category_name);
        }
        if (!empty($price_range)) {
            $hotel_schema['priceRange'] = esc_html($price_range);
        }
        
        if ($stars > 0) {
            $hotel_schema['starRating'] = array(
                '@type' => 'Rating',
                'ratingValue' => $stars
            );
        }
        
        // Removed aggregateRating to prevent policy violations since rating count is 1 for editorial scores.
        
        $lat = get_post_meta($post_id, 'latitude', true);
        $lng = get_post_meta($post_id, 'longitude', true);
        if (!empty($lat) && !empty($lng)) {
            $hotel_schema['geo'] = array(
                '@type' => 'GeoCoordinates',
                'latitude' => floatval($lat),
                'longitude' => floatval($lng)
            );
        }
        
        $schemas[] = $hotel_schema;
    }
    
    // D. ItemList Schema (Listicle/Comparison post type)
    if (is_singular('listicle')) {
        $post_id = $post->ID;
        
        $related = get_post_meta($post_id, 'related_hotels', true);
        $ids_arr = array();
        if (is_array($related)) {
            $ids_arr = $related;
        } elseif (is_string($related) && !empty($related)) {
            $ids_arr = array_filter(array_map('intval', explode(',', $related)));
        }
        
        $list_items = array();
        if (!empty($ids_arr)) {
            $position = 1;
            foreach ($ids_arr as $hotel_id) {
                $hotel_post = get_post($hotel_id);
                if ($hotel_post && $hotel_post->post_status === 'publish') {
                    $list_items[] = array(
                        '@type' => 'ListItem',
                        'position' => $position,
                        'url' => get_permalink($hotel_id),
                        'name' => get_the_title($hotel_id),
                        'description' => get_the_excerpt($hotel_id)
                    );
                    $position++;
                }
            }
        }
        
        $schemas[] = array(
            '@context' => 'https://schema.org',
            '@type' => 'ItemList',
            'name' => get_the_title(),
            'description' => get_the_excerpt(),
            'itemListElement' => $list_items
        );
    }
    
    // E. FAQPage Schema (auto-generated from <dl><dt>/<dd> Q&A content in
    // listicle posts, so it can never go stale/forgotten the way manually
    // maintained schema would). The client's FAQ sections are authored as
    // plain <dl> definition lists (question = <dt>, answer = <dd>) with no
    // special block or class — matching visible text 1:1 by construction,
    // since it's extracted directly from what's rendered.
    if (is_singular('listicle')) {
        $rendered_content = apply_filters('the_content', $post->post_content);
        $faq_items = array();

        if (preg_match_all('/<dl[^>]*>(.*?)<\/dl>/is', $rendered_content, $dl_matches)) {
            foreach ($dl_matches[1] as $dl_inner) {
                if (preg_match_all('/<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/is', $dl_inner, $qa_matches, PREG_SET_ORDER)) {
                    foreach ($qa_matches as $qa) {
                        $question = trim(wp_strip_all_tags(html_entity_decode($qa[1], ENT_QUOTES, 'UTF-8')));
                        $answer = trim(wp_strip_all_tags(html_entity_decode($qa[2], ENT_QUOTES, 'UTF-8')));
                        if ($question !== '' && $answer !== '') {
                            $faq_items[] = array(
                                '@type' => 'Question',
                                'name' => $question,
                                'acceptedAnswer' => array(
                                    '@type' => 'Answer',
                                    'text' => $answer,
                                ),
                            );
                        }
                    }
                }
            }
        }

        if (!empty($faq_items)) {
            $schemas[] = array(
                '@context' => 'https://schema.org',
                '@type' => 'FAQPage',
                'mainEntity' => $faq_items,
            );
        }
    }

    // F. Hook into Yoast or RankMath to merge if active,
    // otherwise stash them for printing in wp_head.
    if (!empty($schemas)) {
        $forgewp_custom_schemas = $schemas;
        
        if (defined('WPSEO_VERSION')) {
            add_filter('wpseo_schema_graph', function($graph) use ($schemas) {
                if (is_array($graph)) {
                    foreach ($schemas as $s) {
                        $graph[] = $s;
                    }
                }
                return $graph;
            }, 99);
        }
        
        if (class_exists('RankMath')) {
            add_filter('rank_math/json_ld', function($data, $jsonld) use ($schemas) {
                if (is_array($data)) {
                    foreach ($schemas as $s) {
                        $data[] = $s;
                    }
                }
                return $data;
            }, 99, 2);
        }
    }
}
add_action('template_redirect', 'forgewp_init_custom_json_ld_schema');

// Print fallback custom schemas if Yoast/RankMath are NOT active
function forgewp_print_custom_json_ld_schema() {
    global $forgewp_custom_schemas;
    
    if (!empty($forgewp_custom_schemas) && !defined('WPSEO_VERSION') && !class_exists('RankMath')) {
        echo "\n<!-- ForgeWP Custom JSON-LD Schema -->\n";
        foreach ($forgewp_custom_schemas as $s) {
            echo '<script type="application/ld+json">' . wp_json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>' . "\n";
        }
        echo "<!-- /ForgeWP Custom JSON-LD Schema -->\n";
    }
}
add_action('wp_head', 'forgewp_print_custom_json_ld_schema', 20);
