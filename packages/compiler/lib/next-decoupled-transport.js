/**
 * Experimental server-side WordPress content transport and deployment-switch verifier
 * for Next.js App Router decoupled mode and native <-> decoupled round-trip verification.
 *
 * NOT a public adapter API yet. Keeps server-only credentials out of browser bundles,
 * supports zero-WordPress local fixture mode when `wpUrl` is omitted, and reads the
 * exact same WordPress pages, durable route IDs, and Gutenberg block attributes used
 * by native WordPress themes.
 */

function decodeHtmlEntitiesBasic(str) {
  return String(str || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'");
}

/**
 * Parse serialized Gutenberg block comments into a normalized block tree matching
 * WordPress's `parse_blocks()` / `forgewp_blocks` structure.
 *
 * @param {string} rawContent
 * @returns {Array<{ blockName: string | null, attrs: Record<string, any>, innerHTML: string, innerBlocks: any[] }>}
 */
export function parseSerializedBlocks(rawContent) {
  const input = String(rawContent || '');
  if (!input.trim()) return [];

  const tokenRe =
    /<!--\s*(\/)?wp:([a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)?)(?:\s+(\{[\s\S]*?\}))?\s*(\/)?-->/g;
  const root = { innerBlocks: [], innerHTML: '' };
  const stack = [root];
  let cursor = 0;

  for (const match of input.matchAll(tokenRe)) {
    const [full, isClosing, rawName, rawAttrs, isSelfClosing] = match;
    const index = match.index ?? 0;
    const leadingText = input.slice(cursor, index);
    if (leadingText) {
      const current = stack[stack.length - 1];
      if (stack.length === 1) {
        if (leadingText.trim()) {
          root.innerBlocks.push({
            blockName: null,
            attrs: {},
            innerHTML: leadingText,
            innerBlocks: [],
          });
        }
      } else {
        current.innerHTML += leadingText;
      }
    }

    const blockName = rawName.includes('/') ? rawName : `core/${rawName}`;
    if (isClosing) {
      if (stack.length > 1 && stack[stack.length - 1].blockName === blockName) {
        stack.pop();
      }
    } else {
      let attrs = {};
      if (rawAttrs) {
        try {
          const parsed = JSON.parse(rawAttrs);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            attrs = parsed;
          }
        } catch {
          attrs = {};
        }
      }
      const node = {
        blockName,
        attrs,
        innerHTML: '',
        innerBlocks: [],
      };
      stack[stack.length - 1].innerBlocks.push(node);
      if (!isSelfClosing) {
        stack.push(node);
      }
    }

    cursor = index + full.length;
  }

  const trailing = input.slice(cursor);
  if (trailing) {
    const current = stack[stack.length - 1];
    if (stack.length === 1) {
      if (trailing.trim()) {
        root.innerBlocks.push({
          blockName: null,
          attrs: {},
          innerHTML: trailing,
          innerBlocks: [],
        });
      }
    } else {
      current.innerHTML += trailing;
    }
  }

  return root.innerBlocks;
}

/**
 * Normalize and validate a WordPress site base URL (supporting root and subdirectory installs).
 * @param {string} wpUrl
 */
export function normalizeWpBaseUrl(wpUrl) {
  const raw = String(wpUrl || '').trim();
  if (!raw) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`FORGEWP_INVALID_WP_URL: "${raw}" is not a valid HTTP(S) URL.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `FORGEWP_INVALID_WP_URL: WordPress URL must use http: or https:, received "${parsed.protocol}".`,
    );
  }
  const basePath = parsed.pathname.replace(/\/+$/, '');
  const baseUrl = `${parsed.origin}${basePath}`;
  return {
    origin: parsed.origin,
    basePath,
    baseUrl,
  };
}

/**
 * Convert an absolute WordPress permalink into an app-relative path, safely stripping
 * any subdirectory install prefix (e.g. `/blog/about/` -> `/about/`).
 * @param {string} permalink
 * @param {{ origin: string, basePath: string }} baseInfo
 */
export function stripWpBasePath(permalink, baseInfo) {
  if (!permalink) return '/';
  try {
    const parsed = new URL(permalink, `${baseInfo.origin}/`);
    if (parsed.search && parsed.pathname.replace(/\/+$/, '') === baseInfo.basePath) {
      return `/${parsed.search}`;
    }
    let relPath = parsed.pathname || '/';
    if (
      baseInfo.basePath &&
      (relPath === baseInfo.basePath || relPath.startsWith(`${baseInfo.basePath}/`))
    ) {
      relPath = relPath.slice(baseInfo.basePath.length) || '/';
    }
    if (!relPath.startsWith('/')) relPath = `/${relPath}`;
    return relPath;
  } catch {
    return '/';
  }
}

function buildAuthHeaders(auth) {
  if (!auth) return {};
  if (typeof window !== 'undefined') {
    throw new Error(
      'FORGEWP_CLIENT_BUNDLE_CREDENTIAL_GUARD: WordPress server credentials must never be passed in a browser runtime.',
    );
  }
  if (auth.bearerToken) {
    return { Authorization: `Bearer ${auth.bearerToken}` };
  }
  if (auth.username && auth.applicationPassword) {
    const token = Buffer.from(`${auth.username}:${auth.applicationPassword}`, 'utf8').toString(
      'base64',
    );
    return { Authorization: `Basic ${token}` };
  }
  throw new Error(
    'FORGEWP_INVALID_AUTH: Provide either { username, applicationPassword } or { bearerToken }.',
  );
}

function normalizeFixturePost(entry, postType) {
  const slug = String(entry.slug || '').replace(/^\/+|\/+$/g, '');
  const routeId = String(entry.routeId || slug);
  const rawContent = typeof entry.content === 'string' ? entry.content : '';
  const path = slug === '' || slug === 'home' ? '/' : `/${slug}/`;
  return {
    id: entry.id ?? null,
    postType,
    slug,
    routeId,
    title: String(entry.title || ''),
    contentHtml: rawContent,
    rawContent,
    blocks: parseSerializedBlocks(rawContent),
    permalink: path,
    path,
    status: entry.status || 'publish',
    source: 'fixture',
  };
}

function normalizeWordPressPost(post, postType, baseInfo) {
  const titleRaw =
    typeof post.title === 'object' && post.title !== null
      ? (post.title.raw ?? post.title.rendered ?? '')
      : String(post.title || '');
  const contentHtml =
    typeof post.content === 'object' && post.content !== null
      ? String(post.content.rendered ?? '')
      : String(post.content || '');
  const rawContent =
    typeof post.content === 'object' && post.content !== null && typeof post.content.raw === 'string'
      ? post.content.raw
      : null;

  let blocks = [];
  if (Array.isArray(post.forgewp_blocks) && post.forgewp_blocks.length > 0) {
    blocks = post.forgewp_blocks.map((block) => ({
      blockName: block.blockName ?? null,
      attrs:
        block.attrs && typeof block.attrs === 'object' && !Array.isArray(block.attrs)
          ? block.attrs
          : {},
      innerHTML: typeof block.innerHTML === 'string' ? block.innerHTML : '',
      innerBlocks: Array.isArray(block.innerBlocks) ? block.innerBlocks : [],
    }));
  } else if (rawContent) {
    blocks = parseSerializedBlocks(rawContent);
  }

  const permalink = typeof post.link === 'string' ? post.link : '';
  const relPath = stripWpBasePath(permalink, baseInfo);

  return {
    id: typeof post.id === 'number' ? post.id : null,
    postType,
    slug: String(post.slug || ''),
    routeId:
      typeof post.forgewp_route_id === 'string' && post.forgewp_route_id
        ? post.forgewp_route_id
        : String(post.slug || ''),
    title: decodeHtmlEntitiesBasic(titleRaw),
    contentHtml,
    rawContent,
    blocks,
    permalink,
    path: relPath,
    status: String(post.status || 'publish'),
    template: typeof post.template === 'string' ? post.template : '',
    source: 'wordpress',
  };
}

function appendQueryAndFragment(basePath, { query = '', fragment = '' } = {}) {
  let out = basePath;
  const cleanQuery = String(query || '').replace(/^[?&]+/, '');
  if (cleanQuery) {
    out += (out.includes('?') ? '&' : '?') + cleanQuery;
  }
  const cleanFragment = String(fragment || '').replace(/^#+/, '');
  if (cleanFragment) {
    out += `#${cleanFragment}`;
  }
  return out;
}

/**
 * Create a server-side ForgeWP content client that reads local `cms/mock-data` fixtures
 * when `wpUrl` is not configured, and live WordPress REST API + ForgeWP REST bridge data
 * when running in decoupled mode.
 *
 * @param {{
 *   wpUrl?: string,
 *   auth?: { username: string, applicationPassword: string } | { bearerToken: string },
 *   fetch?: typeof globalThis.fetch,
 *   cache?: RequestCache,
 *   next?: { revalidate?: number | false, tags?: string[] },
 *   fixtures?: Record<string, Array<Record<string, any>>>,
 * }} [options]
 */
export function createWordPressContentClient(options = {}) {
  const baseInfo = normalizeWpBaseUrl(options.wpUrl);
  const authHeaders = buildAuthHeaders(options.auth);
  const hasAuth = Object.keys(authHeaders).length > 0;
  const fetchImpl = options.fetch || globalThis.fetch;
  const cacheMode = options.cache ?? 'no-store';
  const nextOptions = options.next;
  const fixtures = options.fixtures || {};

  async function wpJson(endpointPath, { authenticated = false } = {}) {
    if (!baseInfo) {
      throw new Error('FORGEWP_WP_URL_REQUIRED: wpUrl is not configured.');
    }
    if (authenticated && !hasAuth) {
      throw new Error(
        'FORGEWP_AUTH_REQUIRED: Authenticated WordPress REST access requires server-side credentials.',
      );
    }
    const url = `${baseInfo.baseUrl}${endpointPath}`;
    const headers = {
      Accept: 'application/json',
      ...(authenticated ? authHeaders : {}),
    };
    const init = {
      method: 'GET',
      headers,
      cache: cacheMode,
      ...(nextOptions ? { next: nextOptions } : {}),
    };
    const response = await fetchImpl(url, init);
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: response.ok, status: response.status, json, text, url };
  }

  return {
    getMode() {
      return baseInfo ? 'decoupled' : 'fixture';
    },

    async getRoutes() {
      if (!baseInfo) {
        const pages = Array.isArray(fixtures.page) ? fixtures.page : [];
        return {
          homeUrl: '/',
          basePath: '',
          source: 'fixture',
          routes: pages.map((p, idx) => {
            const slug = String(p.slug || '').replace(/^\/+|\/+$/g, '');
            const relPath = slug === '' || slug === 'home' ? '/' : `/${slug}/`;
            return {
              routeId: String(p.routeId || slug || '__home__'),
              id: p.id ?? idx + 1,
              slug,
              title: String(p.title || ''),
              path: relPath,
              permalink: relPath,
            };
          }),
        };
      }

      const bridge = await wpJson('/wp-json/forgewp/v1/routes');
      if (bridge.ok && bridge.json && Array.isArray(bridge.json.routes)) {
        return {
          homeUrl: bridge.json.homeUrl || `${baseInfo.baseUrl}/`,
          basePath: bridge.json.basePath ?? baseInfo.basePath,
          source: 'wordpress-bridge',
          routes: bridge.json.routes,
        };
      }

      // Graceful fallback on stock WordPress without the ForgeWP theme REST bridge.
      const fallback = await wpJson('/wp-json/wp/v2/pages?per_page=100');
      if (!fallback.ok || !Array.isArray(fallback.json)) {
        throw new Error(
          `FORGEWP_ROUTES_FETCH_FAILED: HTTP ${fallback.status} from ${fallback.url}`,
        );
      }
      return {
        homeUrl: `${baseInfo.baseUrl}/`,
        basePath: baseInfo.basePath,
        source: 'wordpress-rest',
        routes: fallback.json.map((page) => ({
          routeId:
            typeof page.forgewp_route_id === 'string' && page.forgewp_route_id
              ? page.forgewp_route_id
              : String(page.slug || ''),
          id: page.id,
          slug: String(page.slug || ''),
          title: decodeHtmlEntitiesBasic(page.title?.rendered || ''),
          path: stripWpBasePath(page.link, baseInfo),
          permalink: page.link || '',
        })),
      };
    },

    async resolveRouteHref(routeSlug, fallbackPath = '/', opts = {}) {
      const normalizedSlug = String(routeSlug || '').replace(/^\/+|\/+$/g, '');
      if (normalizedSlug === '__home__' || normalizedSlug === '') {
        return appendQueryAndFragment('/', opts);
      }
      const routeInfo = await this.getRoutes();
      const match = routeInfo.routes.find(
        (r) => r.routeId === normalizedSlug || r.slug === normalizedSlug,
      );
      const targetPath = match ? match.path : fallbackPath;
      return appendQueryAndFragment(targetPath, opts);
    },

    async getPageBySlug(slug, { preview = false } = {}) {
      const cleanSlug = String(slug || '').replace(/^\/+|\/+$/g, '');
      if (!baseInfo) {
        const pages = Array.isArray(fixtures.page) ? fixtures.page : [];
        const found = pages.find(
          (p) =>
            String(p.slug || '').replace(/^\/+|\/+$/g, '') === cleanSlug ||
            String(p.routeId || '') === cleanSlug,
        );
        return found ? normalizeFixturePost(found, 'page') : null;
      }

      if (preview && !hasAuth) {
        throw new Error(
          'FORGEWP_PREVIEW_AUTH_REQUIRED: Draft/preview WordPress reads require server-side auth credentials.',
        );
      }

      const queryParams = new URLSearchParams({ slug: cleanSlug });
      if (preview) {
        queryParams.set('status', 'any');
        queryParams.set('context', 'edit');
      }

      const res = await wpJson(`/wp-json/wp/v2/pages?${queryParams.toString()}`, {
        authenticated: preview,
      });
      if (!res.ok) {
        throw new Error(`FORGEWP_PAGE_FETCH_FAILED: HTTP ${res.status} from ${res.url}`);
      }
      if (Array.isArray(res.json) && res.json.length > 0) {
        return normalizeWordPressPost(res.json[0], 'page', baseInfo);
      }

      // Slug may have been renamed in wp-admin: fall back to durable forgewp_route_id lookup.
      const routeInfo = await this.getRoutes();
      const byRoute = routeInfo.routes.find((r) => r.routeId === cleanSlug);
      if (!byRoute || !byRoute.id) {
        return null;
      }
      const byIdPath = preview
        ? `/wp-json/wp/v2/pages/${byRoute.id}?context=edit`
        : `/wp-json/wp/v2/pages/${byRoute.id}`;
      const byIdRes = await wpJson(byIdPath, { authenticated: preview });
      if (!byIdRes.ok || !byIdRes.json) {
        return null;
      }
      return normalizeWordPressPost(byIdRes.json, 'page', baseInfo);
    },

    async getPosts(postType = 'posts', { perPage = 20, page = 1, preview = false } = {}) {
      if (!baseInfo) {
        const key = postType === 'posts' ? 'post' : postType === 'pages' ? 'page' : postType;
        const list = Array.isArray(fixtures[key])
          ? fixtures[key]
          : Array.isArray(fixtures[postType])
            ? fixtures[postType]
            : [];
        return list.map((entry) => normalizeFixturePost(entry, key));
      }

      if (preview && !hasAuth) {
        throw new Error(
          'FORGEWP_PREVIEW_AUTH_REQUIRED: Draft/preview WordPress reads require server-side auth credentials.',
        );
      }

      const queryParams = new URLSearchParams({
        per_page: String(perPage),
        page: String(page),
      });
      if (preview) {
        queryParams.set('status', 'any');
        queryParams.set('context', 'edit');
      }
      const res = await wpJson(
        `/wp-json/wp/v2/${encodeURIComponent(postType)}?${queryParams.toString()}`,
        { authenticated: preview },
      );
      if (!res.ok || !Array.isArray(res.json)) {
        throw new Error(`FORGEWP_POSTS_FETCH_FAILED: HTTP ${res.status} from ${res.url}`);
      }
      return res.json.map((item) => normalizeWordPressPost(item, postType, baseInfo));
    },

    async getRegisteredBlocks(namespace = 'forgewp') {
      if (!baseInfo) {
        return [];
      }
      const res = await wpJson(
        `/wp-json/wp/v2/block-types?namespace=${encodeURIComponent(namespace)}`,
        { authenticated: true },
      );
      if (!res.ok || !Array.isArray(res.json)) {
        throw new Error(`FORGEWP_BLOCKS_FETCH_FAILED: HTTP ${res.status} from ${res.url}`);
      }
      return res.json.filter((b) =>
        namespace ? String(b.name || '').startsWith(`${namespace}/`) : true,
      );
    },
  };
}

/**
 * Match WordPress block trees against shared ForgeWP `defineBlock()` definitions,
 * merging declared attribute defaults with saved WordPress attributes.
 *
 * @param {Array<{ blockName: string | null, attrs?: Record<string, any>, innerHTML?: string, innerBlocks?: any[] }>} blocks
 * @param {Record<string, { name: string, attributes?: Record<string, { default?: any }>, save?: Function, edit?: Function }>} blockDefinitions
 */
export function resolveBlockRenderNodes(blocks, blockDefinitions = {}) {
  const list = Array.isArray(blocks) ? blocks : [];
  return list.map((block) => {
    const name = block.blockName || null;
    const definition =
      name &&
      (Object.hasOwn(blockDefinitions, name)
        ? blockDefinitions[name]
        : name.startsWith('forgewp/') && Object.hasOwn(blockDefinitions, name.slice(8))
          ? blockDefinitions[name.slice(8)]
          : null);

    if (definition) {
      const mergedAttrs = {};
      for (const [key, schema] of Object.entries(definition.attributes || {})) {
        if (schema && schema.default !== undefined) {
          mergedAttrs[key] = schema.default;
        }
      }
      Object.assign(mergedAttrs, block.attrs || {});
      return {
        kind: 'registered',
        blockName: name,
        definition,
        attributes: mergedAttrs,
        innerBlocks: resolveBlockRenderNodes(block.innerBlocks || [], blockDefinitions),
      };
    }

    return {
      kind: 'html',
      blockName: name,
      html: typeof block.innerHTML === 'string' ? block.innerHTML : '',
      innerBlocks: resolveBlockRenderNodes(block.innerBlocks || [], blockDefinitions),
    };
  });
}

/**
 * Validate deployment-switch preconditions (WordPress REST reachability, route availability,
 * and Gutenberg block identity/schema parity) BEFORE changing traffic between native and
 * decoupled frontends. Read-only: never modifies WordPress content.
 *
 * @param {{
 *   wpUrl: string,
 *   auth?: { username: string, applicationPassword: string } | { bearerToken: string },
 *   expectedBlocks?: Array<{ name: string, attributes?: Record<string, { type?: string }> }>,
 *   expectedRoutes?: string[],
 *   probePageSlug?: string,
 *   fetch?: typeof globalThis.fetch,
 * }} options
 */
export async function verifyDeploymentSwitch({
  wpUrl,
  auth,
  expectedBlocks = [],
  expectedRoutes = [],
  probePageSlug,
  fetch: fetchImpl = globalThis.fetch,
}) {
  const checks = [];
  const errors = [];

  let baseInfo;
  try {
    baseInfo = normalizeWpBaseUrl(wpUrl);
    if (!baseInfo) {
      throw new Error('FORGEWP_WP_URL_REQUIRED: wpUrl must be provided.');
    }
  } catch (err) {
    errors.push(err.message);
    return {
      ok: false,
      checks,
      errors,
      rollback: {
        required: true,
        action:
          'Abort deployment switch and keep the active frontend serving traffic; WordPress content was not modified.',
      },
    };
  }

  // 1. Check WordPress REST API root reachability.
  try {
    const rootRes = await fetchImpl(`${baseInfo.baseUrl}/wp-json/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!rootRes.ok) {
      throw new Error(`HTTP ${rootRes.status}`);
    }
    const rootJson = await rootRes.json();
    if (!rootJson || typeof rootJson !== 'object' || !Array.isArray(rootJson.namespaces)) {
      throw new Error('Response is not a WordPress REST API index');
    }
    checks.push({
      id: 'wordpress-rest',
      ok: true,
      detail: `WordPress REST reachable (${rootJson.namespaces.length} namespaces)`,
    });
  } catch (err) {
    const msg = `WordPress REST unreachable at ${baseInfo.baseUrl}/wp-json/: ${err.message}`;
    checks.push({ id: 'wordpress-rest', ok: false, detail: msg });
    errors.push(msg);
    return {
      ok: false,
      checks,
      errors,
      rollback: {
        required: true,
        action:
          'Abort deployment switch and keep the active frontend serving traffic; WordPress content was not modified.',
      },
    };
  }

  const client = createWordPressContentClient({
    wpUrl: baseInfo.baseUrl,
    auth,
    fetch: fetchImpl,
  });

  // 2. Check expected fixed routes via /wp-json/forgewp/v1/routes (or pages fallback).
  if (expectedRoutes.length > 0) {
    try {
      const routeInfo = await client.getRoutes();
      const missingRoutes = expectedRoutes.filter(
        (slug) => !routeInfo.routes.some((r) => r.routeId === slug || r.slug === slug),
      );
      if (missingRoutes.length > 0) {
        const msg = `Missing expected WordPress routes: ${missingRoutes.join(', ')}`;
        checks.push({ id: 'routes', ok: false, detail: msg });
        errors.push(msg);
      } else {
        checks.push({
          id: 'routes',
          ok: true,
          detail: `Verified ${expectedRoutes.length} route(s) via ${routeInfo.source}`,
        });
      }
    } catch (err) {
      const msg = `Route verification failed: ${err.message}`;
      checks.push({ id: 'routes', ok: false, detail: msg });
      errors.push(msg);
    }
  }

  // 3. Check Gutenberg block identity and attribute schema parity in WordPress.
  if (expectedBlocks.length > 0) {
    try {
      const registered = await client.getRegisteredBlocks('forgewp');
      const byName = new Map(registered.map((b) => [b.name, b]));
      const blockIssues = [];
      for (const expected of expectedBlocks) {
        const live = byName.get(expected.name);
        if (!live) {
          blockIssues.push(`Missing registered Gutenberg block "${expected.name}"`);
          continue;
        }
        const liveAttrs = live.attributes || {};
        for (const [attrName, attrSchema] of Object.entries(expected.attributes || {})) {
          if (!Object.hasOwn(liveAttrs, attrName)) {
            blockIssues.push(
              `Block "${expected.name}" is missing attribute "${attrName}" in WordPress`,
            );
          } else if (attrSchema?.type && liveAttrs[attrName]?.type !== attrSchema.type) {
            blockIssues.push(
              `Block "${expected.name}" attribute "${attrName}" type mismatch (expected ${attrSchema.type}, got ${liveAttrs[attrName]?.type})`,
            );
          }
        }
      }
      if (blockIssues.length > 0) {
        checks.push({ id: 'blocks', ok: false, detail: blockIssues.join('; ') });
        errors.push(...blockIssues);
      } else {
        checks.push({
          id: 'blocks',
          ok: true,
          detail: `Verified ${expectedBlocks.length} Gutenberg block definition(s) match WordPress registry`,
        });
      }
    } catch (err) {
      const msg = `Block registry verification failed: ${err.message}`;
      checks.push({ id: 'blocks', ok: false, detail: msg });
      errors.push(msg);
    }
  }

  // 4. Optional live page content probe.
  if (probePageSlug) {
    try {
      const page = await client.getPageBySlug(probePageSlug);
      if (!page) {
        const msg = `Probe page "${probePageSlug}" not found in WordPress`;
        checks.push({ id: 'probe-page', ok: false, detail: msg });
        errors.push(msg);
      } else {
        checks.push({
          id: 'probe-page',
          ok: true,
          detail: `Probe page "${probePageSlug}" resolved (id=${page.id}, blocks=${page.blocks.length})`,
        });
      }
    } catch (err) {
      const msg = `Probe page "${probePageSlug}" fetch failed: ${err.message}`;
      checks.push({ id: 'probe-page', ok: false, detail: msg });
      errors.push(msg);
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    checks,
    errors,
    rollback: {
      required: !ok,
      action: ok
        ? 'No rollback needed; preflight checks passed.'
        : 'Abort deployment switch and keep the active frontend serving traffic; WordPress content was not modified.',
    },
  };
}
