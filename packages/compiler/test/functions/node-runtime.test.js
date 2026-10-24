import fs from 'node:fs';
import path from 'node:path';
import { it, expect } from 'vitest';
import { isSupportedNode, SUPPORTED_NODE_RANGE } from '../../lib/node-runtime.js';

it('enforces exact dependency version boundaries, excluding Node 23', () => {
  for (const version of ['18.20.0', '20.19.0', '22.17.9', '23.9.0', '24.10.9', '22.18.0-rc.1', 'bad']) expect(isSupportedNode(version)).toBe(false);
  for (const version of ['22.18.0', '22.21.1', '24.11.0', '25.0.0']) expect(isSupportedNode(version)).toBe(true);
});

it('keeps workspace, compiler, creator and both starter copies aligned with dependency engines', () => {
  for (const file of ['../../package.json', 'package.json', '../create-forgewp/package.json', '../starter/package.json', '../html-starter/package.json', '../create-forgewp/template/package.json', '../create-forgewp/template-html/package.json']) {
    expect(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')).engines.node).toBe(SUPPORTED_NODE_RANGE);
  }
  expect(JSON.parse(fs.readFileSync('node_modules/@babel/parser/package.json', 'utf8')).engines.node).toBe(SUPPORTED_NODE_RANGE);
});
