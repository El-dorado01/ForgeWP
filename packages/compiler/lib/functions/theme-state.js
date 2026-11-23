/**
 * Theme-independent theme state (docs/resource-contracts.md §4.2).
 *
 * WordPress stores theme mods per theme (theme_mods_{stylesheet}); menu
 * locations and the custom logo live there too, so swapping the theme (e.g.
 * Native -> Decoupled stub theme) silently loses them. ForgeWP keeps its
 * managed keys in one option, forgewp_theme_state:
 *  - read:  theme_mod_{name} filters return the stored state value, so
 *           get_theme_mod() / get_nav_menu_locations() keep working;
 *  - write: pre_set_theme_mod_{name} mirrors every write into the state (the
 *           normal theme mod is still written, so nothing is lost if ForgeWP
 *           code is removed);
 *  - migrate: once, copy existing values from the active theme's mods.
 * Emitted into functions.php in Phase A; moves unchanged into the Companion
 * Plugin in Phase B.
 */

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function buildThemeStatePhp(themeMods = {}) {
  const keys = Array.from(
    new Set(['nav_menu_locations', 'custom_logo', ...Object.keys(themeMods || {})]),
  ).filter((k) => /^[A-Za-z0-9_-]+$/.test(k));

  return `
/**
 * ── Theme-independent theme state (docs/resource-contracts.md §4.2) ──
 */
if (!function_exists('forgewp_theme_state_keys')) {
    function forgewp_theme_state_keys() {
        return apply_filters('forgewp_theme_state_keys', array(${keys.map(phpString).join(', ')}));
    }

    function forgewp_theme_state_get() {
        $state = get_option('forgewp_theme_state', null);
        return is_array($state) ? $state : null;
    }

    /** One-time copy from the active theme's mods. Never overwrites existing state. */
    function forgewp_theme_state_migrate() {
        if (forgewp_theme_state_get() !== null) {
            return;
        }
        $mods = get_option('theme_mods_' . get_option('stylesheet'), array());
        $state = array('_migrated_from' => (string) get_option('stylesheet'));
        if (is_array($mods)) {
            foreach (forgewp_theme_state_keys() as $key) {
                if (array_key_exists($key, $mods)) {
                    $state[$key] = $mods[$key];
                }
            }
        }
        update_option('forgewp_theme_state', $state, true);
    }
    add_action('after_switch_theme', 'forgewp_theme_state_migrate', 1);
    add_action('init', 'forgewp_theme_state_migrate', 1);

    function forgewp_theme_state_register_filters() {
        foreach (forgewp_theme_state_keys() as $key) {
            add_filter('theme_mod_' . $key, function ($value) use ($key) {
                $state = forgewp_theme_state_get();
                return (is_array($state) && array_key_exists($key, $state)) ? $state[$key] : $value;
            });
            add_filter('pre_set_theme_mod_' . $key, function ($value) use ($key) {
                $state = forgewp_theme_state_get();
                if (!is_array($state)) {
                    $state = array();
                }
                // On a theme switch, core's _wp_menus_changed() remaps menu
                // locations to the new theme's registered locations (often
                // none) via set_theme_mod(), while theme_switch_menu_locations
                // still holds the old ones. Merge in that case so ForgeWP's
                // assignments survive the switch; any other write (Menus
                // screen, Customizer) replaces as usual.
                if ($key === 'nav_menu_locations' && get_option('theme_switch_menu_locations', null) !== null
                    && isset($state[$key]) && is_array($state[$key]) && is_array($value)) {
                    $state[$key] = array_merge($state[$key], $value);
                } else {
                    $state[$key] = $value;
                }
                update_option('forgewp_theme_state', $state, true);
                return $value;
            });
        }
    }
    forgewp_theme_state_register_filters();
}
`;
}
