/**
 * SameSite on WordPress login cookies (security review, 2026-11-23).
 *
 * WordPress sets its auth cookies (wordpress_logged_in_*, wordpress_sec_*,
 * wordpress_*) without a SameSite attribute, so some browsers still send them
 * on cross-site requests. Core offers no setting for it, so on responses that
 * set those cookies ForgeWP appends the attribute to their Set-Cookie headers
 * right before headers are sent.
 *
 * Default Lax. Override per deployment in wp-config.php:
 *   define('FORGEWP_AUTH_COOKIE_SAMESITE', 'Strict'); // or 'None' (adds Secure), or 'off'
 * or with the forgewp_auth_cookie_samesite filter.
 */
export function buildAuthCookieSameSitePhp() {
  return `
/**
 * ── SameSite on WordPress login cookies ──
 */
if (!function_exists('forgewp_auth_cookie_samesite')) {
    function forgewp_auth_cookie_samesite() {
        $value = defined('FORGEWP_AUTH_COOKIE_SAMESITE') ? (string) FORGEWP_AUTH_COOKIE_SAMESITE : 'Lax';
        $value = (string) apply_filters('forgewp_auth_cookie_samesite', $value);
        $map = array('lax' => 'Lax', 'strict' => 'Strict', 'none' => 'None');
        $key = strtolower(trim($value));
        return isset($map[$key]) ? $map[$key] : '';
    }

    /** Adds SameSite (and Secure for None) to WordPress auth Set-Cookie headers lacking it. */
    function forgewp_apply_auth_cookie_samesite() {
        $samesite = forgewp_auth_cookie_samesite();
        if ($samesite === '' || headers_sent()) {
            return;
        }
        $cookies = array();
        $changed = false;
        foreach (headers_list() as $header) {
            if (stripos($header, 'Set-Cookie:') !== 0) {
                continue;
            }
            $line = trim(substr($header, strlen('Set-Cookie:')));
            if (preg_match('/^wordpress_(?:logged_in_|sec_)?[a-f0-9]{32}=/i', $line) && stripos($line, 'samesite=') === false) {
                $line .= '; SameSite=' . $samesite;
                if ($samesite === 'None' && stripos($line, '; secure') === false) {
                    $line .= '; Secure';
                }
                $changed = true;
            }
            $cookies[] = $line;
        }
        if (!$changed) {
            return;
        }
        header_remove('Set-Cookie');
        foreach ($cookies as $line) {
            header('Set-Cookie: ' . $line, false);
        }
    }

    function forgewp_schedule_auth_cookie_samesite() {
        static $scheduled = false;
        if (!$scheduled && forgewp_auth_cookie_samesite() !== '') {
            $scheduled = true;
            header_register_callback('forgewp_apply_auth_cookie_samesite');
        }
    }
    // Fire just before core calls setcookie() for each auth cookie.
    add_action('set_auth_cookie', 'forgewp_schedule_auth_cookie_samesite');
    add_action('set_logged_in_cookie', 'forgewp_schedule_auth_cookie_samesite');
}
`;
}
