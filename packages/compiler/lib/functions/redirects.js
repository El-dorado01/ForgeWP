/**
 * Declarative redirects (Phase B): `redirects` in wp.config.ts replaces
 * hand-written template_redirect PHP in src/server. Emitted into the
 * Companion backend so they keep working when the site runs decoupled (the
 * WordPress origin still serves old URLs) and for the Next.js side to read
 * the same list. Paths are relative to the site's home path, so WordPress
 * subdirectory installs work.
 *
 *   redirects: [
 *     { from: '/kontakt', to: '/contact/' },                    // 301, keeps ?query
 *     { from: '/studie', to: '/studie/hospitality-2035/', status: 302 },
 *     { from: '/old', to: 'https://example.org/new', ifNotFound: true },
 *   ]
 */
const STATUSES = new Set([301, 302, 307, 308]);

function normalizePath(p) {
  const clean = String(p).split(/[?#]/)[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

export function validateRedirects(redirects) {
  if (redirects === undefined) return [];
  if (!Array.isArray(redirects)) {
    throw new Error('[ForgeWP] redirects must be an array of { from, to, status?, ifNotFound? }.');
  }
  const seen = new Set();
  return redirects.map((r, i) => {
    const where = `redirects[${i}]`;
    if (!r || typeof r !== 'object') throw new Error(`[ForgeWP] ${where} must be an object.`);
    if (typeof r.from !== 'string' || !r.from.startsWith('/') || r.from.startsWith('//')) {
      throw new Error(`[ForgeWP] ${where}.from must be a site path starting with "/" (got ${JSON.stringify(r.from)}).`);
    }
    if (/[?#]/.test(r.from)) throw new Error(`[ForgeWP] ${where}.from must not contain a query or fragment.`);
    if (typeof r.to !== 'string' || !(r.to.startsWith('/') && !r.to.startsWith('//')) && !/^https?:\/\//i.test(r.to)) {
      throw new Error(`[ForgeWP] ${where}.to must be a site path starting with "/" or an http(s) URL.`);
    }
    const status = r.status ?? 301;
    if (!STATUSES.has(status)) throw new Error(`[ForgeWP] ${where}.status must be 301, 302, 307 or 308.`);
    const from = normalizePath(r.from);
    if (seen.has(from)) throw new Error(`[ForgeWP] ${where}.from "${r.from}" is listed twice.`);
    seen.add(from);
    if (!/^https?:\/\//i.test(r.to) && normalizePath(r.to) === from) {
      throw new Error(`[ForgeWP] ${where} redirects "${r.from}" to itself.`);
    }
    return { from, to: r.to, status, ifNotFound: r.ifNotFound === true };
  });
}

export function buildRedirectsPhp(redirects) {
  const list = validateRedirects(redirects);
  if (list.length === 0) return '';
  const json = JSON.stringify(list).replace(/'/g, "\\'");
  return `
/**
 * ── Declarative redirects (wp.config.ts \`redirects\`) ──
 */
if (!function_exists('forgewp_redirects')) {
    function forgewp_redirects() {
        return apply_filters('forgewp_redirects', json_decode('${json}', true));
    }

    function forgewp_apply_redirects() {
        if (is_admin() || wp_doing_ajax() || (defined('REST_REQUEST') && REST_REQUEST)) {
            return;
        }
        $request_uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '/';
        $path = (string) wp_parse_url($request_uri, PHP_URL_PATH);
        $home_path = (string) wp_parse_url(home_url('/'), PHP_URL_PATH);
        $home_path = rtrim($home_path, '/');
        if ($home_path !== '' && strpos($path, $home_path) === 0) {
            $path = substr($path, strlen($home_path));
        }
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }
        foreach (forgewp_redirects() as $rule) {
            if (!is_array($rule) || !isset($rule['from'], $rule['to']) || $rule['from'] !== $path) {
                continue;
            }
            if (!empty($rule['ifNotFound']) && !is_404()) {
                return;
            }
            $external = (bool) preg_match('#^https?://#i', $rule['to']);
            $target = $external ? $rule['to'] : home_url($rule['to']);
            $query = (string) wp_parse_url($request_uri, PHP_URL_QUERY);
            if ($query !== '') {
                $target .= (strpos($target, '?') === false ? '?' : '&') . $query;
            }
            $status = isset($rule['status']) ? (int) $rule['status'] : 301;
            if ($external) {
                wp_redirect($target, $status, 'ForgeWP');
            } else {
                wp_safe_redirect($target, $status, 'ForgeWP');
            }
            exit;
        }
    }
    add_action('template_redirect', 'forgewp_apply_redirects', 1);
}
`;
}
