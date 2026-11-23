/**
 * Shared request helpers for ForgeWP REST endpoints (forms + auth):
 * origin allowlist (FORGEWP_FRONTEND_ORIGIN) and trusted-proxy client IP
 * (FORGEWP_TRUSTED_PROXIES / FORGEWP_PROXY_SECRET).
 * See docs/resource-contracts.md §4.3. Guarded by function_exists, so every
 * module that needs them can emit them.
 */
export function buildNetworkHelpersPhp() {
  return String.raw`
if (!function_exists('forgewp_origin_of')) {
    /** scheme://host[:port] of a URL, lowercased; '' when not a URL. */
    function forgewp_origin_of($url) {
        $p = wp_parse_url((string) $url);
        if (empty($p['scheme']) || empty($p['host'])) {
            return '';
        }
        return strtolower($p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : ''));
    }

    /** FORGEWP_FRONTEND_ORIGIN (constant or env), comma-separated list of origins. */
    function forgewp_frontend_origins() {
        $raw = defined('FORGEWP_FRONTEND_ORIGIN') ? FORGEWP_FRONTEND_ORIGIN : (string) getenv('FORGEWP_FRONTEND_ORIGIN');
        $origins = array();
        foreach (explode(',', (string) $raw) as $candidate) {
            $origin = forgewp_origin_of(trim($candidate));
            if ($origin !== '') {
                $origins[] = $origin;
            }
        }
        return $origins;
    }

    /**
     * WordPress REST already answers any Origin with CORS headers. When
     * FORGEWP_FRONTEND_ORIGIN is configured it becomes an allowlist (plus the
     * site's own origins); otherwise every origin is allowed, as in core.
     */
    function forgewp_origin_allowed($origin) {
        $configured = forgewp_frontend_origins();
        if (empty($configured)) {
            return true;
        }
        $allowed = array_merge($configured, array(forgewp_origin_of(home_url()), forgewp_origin_of(site_url())));
        return in_array(forgewp_origin_of($origin), $allowed, true);
    }

    function forgewp_ip_in_list($ip, $list) {
        $packed = @inet_pton($ip);
        if ($packed === false) {
            return false;
        }
        foreach ($list as $entry) {
            $entry = trim($entry);
            if ($entry === '') {
                continue;
            }
            $parts = explode('/', $entry, 2);
            $net = @inet_pton($parts[0]);
            if ($net === false || strlen($net) !== strlen($packed)) {
                continue;
            }
            $bits = isset($parts[1]) ? (int) $parts[1] : strlen($net) * 8;
            $bytes = intdiv($bits, 8);
            if (substr($packed, 0, $bytes) !== substr($net, 0, $bytes)) {
                continue;
            }
            $rest = $bits % 8;
            if ($rest === 0) {
                return true;
            }
            $mask = chr((0xff << (8 - $rest)) & 0xff);
            if ((ord($packed[$bytes]) & ord($mask)) === (ord($net[$bytes]) & ord($mask))) {
                return true;
            }
        }
        return false;
    }

    /**
     * Visitor IP for rate limiting and submission records. REMOTE_ADDR unless
     * the peer is a trusted proxy (FORGEWP_TRUSTED_PROXIES IPs/CIDRs, or a
     * matching X-ForgeWP-Proxy-Secret header); then the right-most
     * X-Forwarded-For address that is not itself a trusted proxy.
     */
    function forgewp_client_ip() {
        $remote = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
        $raw_list = defined('FORGEWP_TRUSTED_PROXIES') ? FORGEWP_TRUSTED_PROXIES : (string) getenv('FORGEWP_TRUSTED_PROXIES');
        $trusted = array_filter(array_map('trim', explode(',', (string) $raw_list)));
        $secret = defined('FORGEWP_PROXY_SECRET') ? (string) FORGEWP_PROXY_SECRET : (string) getenv('FORGEWP_PROXY_SECRET');
        $sent_secret = isset($_SERVER['HTTP_X_FORGEWP_PROXY_SECRET']) ? (string) $_SERVER['HTTP_X_FORGEWP_PROXY_SECRET'] : '';
        $peer_trusted = forgewp_ip_in_list($remote, $trusted) || ($secret !== '' && $sent_secret !== '' && hash_equals($secret, $sent_secret));
        if (!$peer_trusted || empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $remote;
        }
        $hops = array_reverse(array_map('trim', explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'])));
        foreach ($hops as $hop) {
            if (filter_var($hop, FILTER_VALIDATE_IP) && !forgewp_ip_in_list($hop, $trusted)) {
                return $hop;
            }
        }
        return $remote;
    }
}

if (!function_exists('forgewp_cookie_auth_request_allowed')) {
    /**
     * May this request be authenticated by the WordPress logged-in cookie
     * WITHOUT a REST nonce? Only when it cannot be a cross-site request
     * forged through a visitor's browser: an Origin of the site itself or of
     * FORGEWP_FRONTEND_ORIGIN, or no Origin and no browser "cross-site" mark
     * (server-to-server calls such as the Next.js server). Used by /auth/me
     * and every store/account route that falls back to the cookie.
     */
    function forgewp_cookie_auth_request_allowed() {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';
        if ($origin !== '') {
            $o = forgewp_origin_of($origin);
            return $o !== '' && (
                $o === forgewp_origin_of(home_url())
                || $o === forgewp_origin_of(site_url())
                || in_array($o, forgewp_frontend_origins(), true)
            );
        }
        $fetch_site = isset($_SERVER['HTTP_SEC_FETCH_SITE']) ? strtolower((string) $_SERVER['HTTP_SEC_FETCH_SITE']) : '';
        return $fetch_site !== 'cross-site';
    }
}
`;
}
