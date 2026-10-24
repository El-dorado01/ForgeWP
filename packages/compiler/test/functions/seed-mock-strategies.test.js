import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../lib/load-config.js';
import {
  buildSeedMockDataPhp,
  validateMockSeedStrategy,
} from '../../lib/functions/seed-mock-data.js';
let root;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-seed-strategies-'));
  fs.mkdirSync(path.join(root, 'cms'));
});
afterEach(() => {
  if (
    !path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(root).startsWith('forgewp-seed-strategies-')
  )
    throw Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
const data = (post = 'Post', project = 'Project') => ({
  post: [{ title: post, slug: 'post' }],
  project: [{ title: project, slug: 'project' }],
  page: [{ title: 'Private page fixture', slug: 'page' }],
});
function generate(strategy, mock = data(), developmentOnly = false) {
  fs.writeFileSync(path.join(root, 'cms/mock-data.json'), JSON.stringify(mock));
  return buildSeedMockDataPhp(
    { seed: { mockData: strategy, developmentOnly, sideloadImages: false } },
    root
  );
}
function run(steps, extra = {}) {
  const config = {
    steps: steps.map((step, i) => ({
      file: path.join(root, `seed-${i}.php`),
      force: !!step.force,
      edit: step.edit,
      activation: !!step.activation,
    })),
    debug: true,
    failFirst: false,
    initialOptions: {},
    initialPosts: [],
    ...extra,
  };
  steps.forEach((step, i) => {
    fs.writeFileSync(config.steps[i].file, '<?php\n' + step.php);
    const lint = spawnSync('php', ['-l', config.steps[i].file], {
      encoding: 'utf8',
    });
    expect(lint.status, lint.stderr).toBe(0);
  });
  const harness = path.join(root, 'harness.php');
  fs.writeFileSync(
    harness,
    `<?php
$c = json_decode(file_get_contents($argv[1]), true);
define('WP_DEBUG', $c['debug']); define('OBJECT', 'OBJECT');
$options = $c['initialOptions']; $posts = $c['initialPosts']; $writes = array(); $fail = $c['failFirst'];
$hooks = array();
function add_action($name, $callback) { global $hooks; $hooks[$name] = $callback; }
function get_option($key, $default = '') { global $options; return $options[$key] ?? $default; }
function update_option($key, $value) { global $options; $options[$key] = $value; }
function get_users($args) { return array((object)array('ID' => 1)); }
function wp_count_posts($type) { global $posts; return (object)array('publish' => count(array_filter($posts, fn($p) => $p['post_type'] === $type))); }
function sanitize_text_field($v) { return $v; } function sanitize_title($v) { return $v; }
function get_page_by_path($slug, $output, $type) { global $posts; foreach ($posts as $id => $p) if ($p['post_name'] === $slug && $p['post_type'] === $type) return (object)array('ID' => $id); return null; }
function wp_insert_post($args, $wp_error = false) { global $posts, $writes, $fail; if ($fail) { $fail = false; return (object)array('error' => true); } $id = count($posts) + 1; $posts[$id] = $args; $writes[] = $args['post_type']; return $id; }
function wp_update_post($args, $wp_error = false) { global $posts, $writes; $posts[$args['ID']] = $args; $writes[] = $args['post_type']; return $args['ID']; }
function is_wp_error($v) { return is_object($v) && isset($v->error); }
$history = array();
foreach ($c['steps'] as $i => $step) {
    if (!empty($step['edit'])) foreach ($posts as &$post) if ($post['post_type'] === $step['edit']) $post['post_title'] = 'Client edit';
    unset($post); $name = 'seed_version_' . $i;
    eval(str_replace(array('<?php', 'forgewp_seed_mock_content'), array('', $name), file_get_contents($step['file'])));
    if ($step['activation']) { $hooks['after_switch_theme']('Old theme name'); } else { $name($step['force']); }
    $history[] = array('writes' => $writes, 'posts' => $posts, 'options' => $options);
}
echo json_encode($history);
`
  );
  const input = path.join(root, 'input.json');
  fs.writeFileSync(input, JSON.stringify(config));
  const result = spawnSync('php', [harness, input], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}
describe('generated PHP per-type seed strategies', () => {
  it('excludes disabled and omitted types even with force', () => {
    const php = generate({ post: 'upsert', project: false });
    expect(php).not.toContain('Private page fixture');
    expect(run([{ php, force: true }])[0].writes).toEqual(['post']);
  });
  it('generates nothing when all types are disabled', () => {
    expect(generate({ post: false })).toBe('');
    expect(generate({})).toBe('');
    expect(generate(false)).toBe('');
  });
  it('preserves once edits while updating changed upsert data', () => {
    const strategy = { post: 'once', project: 'upsert' };
    const changed = generate(strategy, data('New post', 'New project'));
    const result = run([
      { php: generate(strategy) },
      { php: changed, edit: 'post' },
      { php: changed },
    ])[2];
    expect(result.writes).toEqual(['post', 'project', 'project']);
    expect(
      Object.values(result.posts).find((p) => p.post_type === 'post').post_title
    ).toBe('Client edit');
  });
  it('does not replay unchanged upsert types when another changes', () => {
    const strategy = { post: 'upsert', project: 'upsert' };
    const result = run([
      { php: generate(strategy) },
      { php: generate(strategy, data('Changed')), edit: 'project' },
    ])[1];
    expect(result.writes).toEqual(['post', 'project', 'post']);
    expect(
      Object.values(result.posts).find((p) => p.post_type === 'project')
        .post_title
    ).toBe('Client edit');
  });
  it('force strategy repeats while true is once', () => {
    const php = generate({ post: true, project: 'force' });
    expect(run([{ php }, { php }])[1].writes).toEqual([
      'post',
      'project',
      'project',
    ]);
  });
  it('CLI force bypasses markers and the development guard', () => {
    const php = generate({ post: 'once' }, data(), true);
    const result = run([{ php }, { php, force: true }, { php, force: true }], {
      debug: false,
    });
    expect(result[0].writes).toEqual([]);
    expect(result[2].writes).toEqual(['post', 'post']);
  });
  it('retries failed writes', () => {
    const php = generate({ post: 'upsert' });
    const history = run([{ php }, { php }], { failFirst: true });
    expect(history[0].options.forgewp_seeded_mock_data_type_hashes).toEqual([]);
    expect(history[1].writes).toEqual(['post']);
  });
  it('does not interpret the activation hook argument as CLI force', () => {
    const php = generate({ post: 'once' }, data(), true);
    expect(
      run([{ php, activation: true }], { debug: false })[0].writes
    ).toEqual([]);
  });
  it('validates maps through the public config loader', async () => {
    fs.writeFileSync(
      path.join(root, 'wp.config.ts'),
      "export default {name:'Test',slug:'test',configVersion:1,seed:{mockData:{post:'invalid'}}}"
    );
    await expect(loadConfig(root)).rejects.toThrow(/seed.mockData/);
  });
  it('honors legacy scalar once markers', () => {
    expect(
      run([{ php: generate('once') }], {
        initialOptions: { forgewp_seeded_mock_data_hash: 'legacy' },
      })[0].writes
    ).toEqual([]);
  });
  it('retains scalar upsert behavior', () => {
    const php = generate('upsert');
    const history = run([
      { php },
      { php },
      { php: generate('upsert', data('Changed')) },
    ]);
    expect(history[1].writes).toHaveLength(3);
    expect(history[2].writes).toHaveLength(6);
  });
  it('skips existing published content for once', () => {
    expect(
      run([{ php: generate({ post: 'once' }) }], {
        initialPosts: {
          7: { post_type: 'post', post_name: 'existing', post_title: 'Saved' },
        },
      })[0].writes
    ).toEqual([]);
  });
  it.each([[], null, 'invalid', { post: 'replace' }, { 'bad/key': 'once' }])(
    'rejects invalid strategy %j',
    (value) => {
      expect(() => validateMockSeedStrategy(value)).toThrow(/seed.mockData/);
    }
  );
});
