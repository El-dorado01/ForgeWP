import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { buildFunctionsPhp } from '../../lib/functions/index.js';
import { loadConfig } from '../../lib/load-config.js';

let root;
beforeEach(() => {
  root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'forgewp-content-registration-')
  );
  fs.mkdirSync(path.join(root, 'cms'));
});
afterEach(() => {
  if (
    !path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(root).startsWith('forgewp-content-registration-')
  )
    throw Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
const base = {
  name: 'Registration test',
  slug: 'registration-test',
  version: '1.0.0',
  description: 'Test',
  textDomain: 'test',
  configVersion: 1,
};
const fixtures = {
  project: [
    {
      title: 'Project',
      _terms: {
        category: ['News'],
        region: [{ name: 'North', slug: 'north' }],
      },
    },
  ],
};
function generate(options = {}, mock = fixtures) {
  fs.writeFileSync(path.join(root, 'cms/mock-data.json'), JSON.stringify(mock));
  return buildFunctionsPhp(
    { ...base, ...options },
    { cssFile: 'assets/app.css' },
    [],
    root
  );
}
function registrations(options = {}, mock = fixtures, existing = []) {
  const full = generate(options, mock);
  const fragment = full.match(
    /function forgewp_register_custom_post_types\(\) \{[\s\S]*?\n\}\nadd_action\('init', 'forgewp_register_custom_post_types'\);/
  )?.[0];
  expect(fragment).toBeTruthy();
  const file = path.join(root, 'registration.php');
  fs.writeFileSync(
    file,
    `<?php
$types = array(); $taxes = array(); $associations = array();
$existing = json_decode(base64_decode('${Buffer.from(JSON.stringify(existing)).toString('base64')}'), true);
function __($text, $domain) { return $text; }
function add_action(...$args) {}
function post_type_exists($key) { global $existing; return in_array($key, $existing, true); }
function taxonomy_exists($key) { global $existing; return in_array($key, $existing, true); }
function register_post_type($key, $args) { global $types; $types[$key] = $args; }
function register_taxonomy($key, $objects, $args) { global $taxes; $taxes[$key] = array('objects' => $objects, 'args' => $args); }
function register_taxonomy_for_object_type($tax, $type) { global $associations; $associations[] = array($tax, $type); }
${fragment}
forgewp_register_custom_post_types();
echo json_encode(array('types' => $types, 'taxes' => $taxes, 'associations' => $associations));
`
  );
  const lint = spawnSync('php', ['-l', file], { encoding: 'utf8' });
  expect(lint.status, lint.stderr).toBe(0);
  const result = spawnSync('php', [file], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe('generated CPT/taxonomy configuration', () => {
  it('retains existing defaults for inferred content types and taxonomies', () => {
    const { types, taxes, associations } = registrations();
    expect(types.project.public).toBe(true);
    expect(types.project.show_in_rest).toBe(true);
    expect(types.project.supports).toEqual([
      'title',
      'editor',
      'thumbnail',
      'custom-fields',
      'excerpt',
    ]);
    expect(taxes.region.objects).toEqual(['project']);
    expect(taxes.region.args).toMatchObject({
      public: true,
      show_ui: true,
      show_in_rest: true,
      hierarchical: true,
    });
    expect(associations).toEqual([['category', 'project']]);
  });
  it('honors explicit false flags, archive/rewrite settings and selected features', () => {
    const result = registrations({
      postTypes: {
        project: {
          public: false,
          showInRest: false,
          supports: ['title'],
          hasArchive: false,
          rewrite: false,
        },
      },
      taxonomies: {
        region: {
          public: false,
          showUi: false,
          showInRest: false,
          hierarchical: false,
        },
      },
    });
    expect(result.types.project).toMatchObject({
      public: false,
      show_in_rest: false,
      supports: ['title'],
      has_archive: false,
      rewrite: false,
    });
    expect(result.taxes.region.args).toMatchObject({
      public: false,
      show_ui: false,
      show_in_rest: false,
      hierarchical: false,
    });
  });
  it('keeps explicit true options and custom rewrite settings', () => {
    const { types, taxes } = registrations({
      postTypes: {
        project: {
          public: true,
          showInRest: true,
          rewrite: { slug: 'work', withFront: false },
        },
      },
      taxonomies: { region: { public: true, showUi: true, showInRest: true } },
    });
    expect(types.project).toMatchObject({
      public: true,
      show_in_rest: true,
      rewrite: { slug: 'work', with_front: false },
    });
    expect(taxes.region.args).toMatchObject({
      public: true,
      show_ui: true,
      show_in_rest: true,
    });
  });
  it('preserves empty supports and safely renders string feature names', () => {
    expect(
      registrations({ postTypes: { project: { supports: [] } } }).types.project
        .supports
    ).toBe(false);
    expect(
      registrations({
        postTypes: {
          project: { supports: ["custom'feature", 'path\\feature'] },
        },
      }).types.project.supports
    ).toEqual(["custom'feature", 'path\\feature']);
  });
  it('registers config-only CPTs without mock entries', () => {
    expect(
      registrations(
        { postTypes: { portfolio: { public: false, supports: [] } } },
        {}
      ).types.portfolio
    ).toMatchObject({ public: false, supports: false });
  });
  it('leaves already registered plugin types and taxonomies untouched', () => {
    const result = registrations(
      {
        postTypes: { project: { public: false } },
        taxonomies: { region: { public: false } },
      },
      fixtures,
      ['project', 'region']
    );
    expect(result.types).toEqual([]);
    expect(result.taxes).toEqual([]);
  });
  it('associates a shared inferred taxonomy with each relevant CPT', () => {
    const result = registrations(
      {},
      {
        ...fixtures,
        event: [{ title: 'Event', _terms: { region: ['North'] } }],
      }
    );
    expect(result.taxes.region.objects).toEqual(['project', 'event']);
  });
  it.each([
    { postTypes: { project: { public: 'false' } } },
    { postTypes: { project: { showInRest: 0 } } },
    { postTypes: { project: { hasArchive: 'no' } } },
    { postTypes: { project: { supports: 'title' } } },
    { postTypes: { project: { supports: [1] } } },
    { taxonomies: { region: { showUi: 'false' } } },
    { taxonomies: { region: { hierarchical: 0 } } },
    { taxonomies: [] },
    { postTypes: { project: null } },
  ])('rejects invalid registration configuration: %j', async (options) => {
    fs.writeFileSync(
      path.join(root, 'wp.config.ts'),
      'export default ' + JSON.stringify({ ...base, ...options })
    );
    await expect(loadConfig(root)).rejects.toThrow(/postTypes|taxonomies/);
  });
});
