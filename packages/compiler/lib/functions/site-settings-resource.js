/**
 * `site-settings` resource (docs/resource-contracts.md §1, §4.1).
 *
 * Emits forgewp_site_settings_resource(), the single builder used by both
 * GET /wp-json/forgewp/v1/site-settings and the native
 * forgeWpHydration.resources['site-settings'] payload, so the two can never
 * drift. Only declared, non-private options and declared theme mods are
 * exposed; empty maps encode as {} (not []) in both paths.
 */

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function phpScalar(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined) return "''";
  if (typeof value === 'object') return "''";
  return phpString(value);
}

/**
 * @param {Array<{ name: string, defaultValue?: string, private?: boolean }>} wpOptions
 * @param {Record<string, unknown>} themeMods declared theme mods and their defaults
 */
export function buildSiteSettingsResourcePhp(wpOptions = [], themeMods = {}) {
  const publicOptions = wpOptions.filter((o) => o && o.name && o.private !== true);
  const optionLines = publicOptions
    .map((o) => `        ${phpString(o.name)} => get_option(${phpString(o.name)}, ${phpScalar(o.defaultValue ?? '')}),`)
    .join('\n');
  const themeModLines = Object.entries(themeMods || {})
    .filter(([key]) => key !== 'custom_logo')
    .map(([key, def]) => `        ${phpString(key)} => get_theme_mod(${phpString(key)}, ${phpScalar(def)}),`)
    .join('\n');
  const includesLogo = Object.prototype.hasOwnProperty.call(themeMods || {}, 'custom_logo');

  return `
/**
 * ── Resource: site-settings (docs/resource-contracts.md §1) ──
 * One builder for REST and native hydration (byte-identical JSON).
 */
if (!function_exists('forgewp_site_settings_resource')) {
    function forgewp_site_settings_resource() {
        $options = array(
${optionLines}
        );
        $theme_mods = array(
${themeModLines}
        );
        $logo_id = (int) get_theme_mod('custom_logo');
        $logo_url = $logo_id ? (string) wp_get_attachment_image_url($logo_id, 'full') : '';
${includesLogo ? "        $theme_mods['custom_logo'] = $logo_url;\n" : ''}        $home_url = home_url('/');
        return array(
            'options'   => (object) $options,
            'themeMods' => (object) $theme_mods,
            'site'      => array(
                'name'        => html_entity_decode((string) get_bloginfo('name'), ENT_QUOTES, 'UTF-8'),
                'description' => html_entity_decode((string) get_bloginfo('description'), ENT_QUOTES, 'UTF-8'),
                'url'         => $home_url,
                'homeUrl'     => $home_url,
                'language'    => (string) get_bloginfo('language'),
                'logoUrl'     => $logo_url,
            ),
        );
    }
}

if (!function_exists('forgewp_register_site_settings_route')) {
    function forgewp_register_site_settings_route() {
        register_rest_route('forgewp/v1', '/site-settings', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function () {
                $response = rest_ensure_response(forgewp_site_settings_resource());
                $response->header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
                $response->header('X-ForgeWP-Cache-Tags', 'site-settings,options');
                return $response;
            },
        ));
    }
    add_action('rest_api_init', 'forgewp_register_site_settings_route');
}
`;
}
