import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8').replace(/\r\n/g, '\n');

describe('ts-to-js', () => {
  it('ships an identical converter in create-forgewp and the compiler', () => {
    expect(read('../../../create-forgewp/lib/ts-to-js.js')).toBe(read('../../lib/ts-to-js.js'));
  });
});
