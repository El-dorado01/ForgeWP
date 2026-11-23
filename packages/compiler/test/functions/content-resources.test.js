/**
 * Phase C posts / terms / comments PHP (docs/resource-contracts.md §10–§12,
 * §12a). Verified live in the cloud sandbox: list/single/protected/draft
 * privacy, terms, comment posting (held, duplicate 409, trap, 400, closed
 * 403), and native resources.post / .posts / .term deep-equal to REST.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildContentResourcesPhp } from '../../lib/functions/content-resources.js';

const php = buildContentResourcesPhp('demo');

describe('content resources PHP', () => {
  it('is valid PHP', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-content-'));
    try {
      const f = path.join(dir, 'c.php');
      writeFileSync(f, '<?php\n' + php);
      const r = spawnSync('php', ['-l', f], { encoding: 'utf8' });
      expect(r.status, r.stdout + r.stderr).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('registers the contract routes', () => {
    for (const route of ["'/posts'", "'/posts/(?P<type>[a-z0-9_-]+)/(?P<slug>[^/]+)'", "'/terms/(?P<taxonomy>[a-z0-9_-]+)'", "'/terms/(?P<taxonomy>[a-z0-9_-]+)/(?P<slug>[^/]+)'", "'/comments'"]) {
      expect(php).toContain(`register_rest_route('forgewp/v1', ${route}`);
    }
  });

  it('only exposes published content of public types and taxonomies', () => {
    expect(php).toContain("'post_status'         => 'publish'");
    expect(php).toContain("'post_status' => 'publish', 'posts_per_page' => 1");
    expect(php).toContain("return $object && !empty($object->public) && $type !== 'attachment';");
    expect(php).toContain("'FORGEWP_POST_TYPE_NOT_PUBLIC'");
    expect(php).toContain("'FORGEWP_TAXONOMY_NOT_PUBLIC'");
    expect(php).toContain("$excerpt = $protected ? '' :");
  });

  it('includes blocks and plain-text titles on singles (§12a)', () => {
    expect(php).toContain("forgewp_serialize_rest_blocks(parse_blocks($post->post_content))");
    expect(php).toContain("'title'         => forgewp_content_plain(get_the_title($post))");
  });

  it('never exposes commenter email or IP', () => {
    const item = php.slice(php.indexOf('function forgewp_comment_item('), php.indexOf('function forgewp_comments_resource('));
    expect(item).not.toMatch(/comment_author_email|comment_author_IP/);
  });

  it('protects comment posting like forms (§4.3, §12a)', () => {
    for (const needle of ["forgewp_origin_allowed($origin)", "$params['_forgewp_hp']", "$params['_forgewp_elapsed']", 'forgewp_client_ip()', 'wp_handle_comment_submission(', "'FORGEWP_COMMENT_DUPLICATE', 409", "'FORGEWP_COMMENTS_CLOSED'", "'FORGEWP_RATE_LIMITED'"]) {
      expect(php).toContain(needle);
    }
  });
});
