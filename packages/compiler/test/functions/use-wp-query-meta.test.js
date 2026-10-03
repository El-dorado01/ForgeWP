import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFunctionsPhp } from '../../lib/functions/index.js';

describe('useWpQuery generated REST endpoints', () => {
  it('generates an endpoint that applies static meta filters for its queryId', () => {
    const themeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'forgewp-query-meta-'),
    );
    try {
      const php = buildFunctionsPhp(
        { textDomain: 'hospitality', version: '1.0.0' },
        { cssFile: 'assets/main.css' },
        [],
        themeRoot,
        [],
        {},
        null,
        [],
        {},
        [
          {
            queryId: 'berlin-events',
            postType: 'hospitality_event',
            postsPerPage: 10,
            taxQuery: [
              { taxonomy: 'event_region', terms: ['berlin', 'online'] },
            ],
            metaQuery: [
              { key: 'city', value: 'berlin' },
              { key: 'project_budget', compare: '>', value: 40000 },
            ],
          },
        ],
      );

      expect(php).toContain("'/query-berlin-events'");
      expect(php).toContain("'post_type' => 'hospitality_event'");
      expect(php).toContain("'key' => 'city'");
      expect(php).toContain("if ($raw_value === null) return 'berlin'");
      expect(php).toContain("'type' => 'NUMERIC'");
      expect(php).toContain("get_param('meta_0')");
      expect(php).toContain("get_param('tax_0')");
      expect(php).toContain("array_map('sanitize_text_field', $decoded_terms)");
    } finally {
      fs.rmSync(themeRoot, { recursive: true, force: true });
    }
  });
});
