/**
 * Cloud E2E finding: submissions faster than a hardcoded 3 s were discarded
 * with a fake "Thank you." and no trace, so real fast visitors (autofill,
 * one-field forms) could lose messages invisibly. The threshold is now
 * configurable per form (minSubmitMs, 0 disables, filterable) and discards
 * are counted and logged under WP_DEBUG. Bots still see a success response.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { buildFormsPhp, validateFormsConfig } from '../../lib/functions/forms.js';

const config = (form = {}) => ({
  textDomain: 'demo',
  forms: {
    contact: {
      mailTo: 'admin',
      subject: 'New message',
      fields: { email: { type: 'email', label: 'Email', required: true } },
      ...form,
    },
  },
});

describe('forms time trap', () => {
  it('defaults to 3000 ms, passes the threshold through a filter, and counts + logs discards', () => {
    const php = buildFormsPhp(config());
    expect(php).toContain("apply_filters('forgewp_forms_min_submit_ms', 3000, 'contact')");
    expect(php).toContain("if ($min_submit_ms > 0 && $elapsed < $min_submit_ms)");
    expect(php).toContain("update_option('forgewp_forms_trapped_contact'");
    expect(php).toContain("error_log('[ForgeWP Forms] contact: submission discarded by ' . $forgewp_trap . ' trap.');");
  });

  it('uses the configured minSubmitMs, including 0 to disable', () => {
    expect(buildFormsPhp(config({ minSubmitMs: 1200 }))).toContain("apply_filters('forgewp_forms_min_submit_ms', 1200, 'contact')");
    expect(buildFormsPhp(config({ minSubmitMs: 0 }))).toContain("apply_filters('forgewp_forms_min_submit_ms', 0, 'contact')");
  });

  it('rejects negative or non-integer minSubmitMs', () => {
    expect(() => validateFormsConfig(config({ minSubmitMs: -1 }).forms)).toThrow(/minSubmitMs/);
    expect(() => validateFormsConfig(config({ minSubmitMs: 1.5 }).forms)).toThrow(/minSubmitMs/);
  });

  it('emits syntactically valid PHP', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'forgewp-trap-'));
    try {
      const file = path.join(dir, 'forms.php');
      writeFileSync(file, '<?php\n' + buildFormsPhp(config({ minSubmitMs: 1500 })));
      const lint = spawnSync('php', ['-l', file], { encoding: 'utf8' });
      expect(lint.status, lint.stdout + lint.stderr).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
