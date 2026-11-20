import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from '../../../packages/compiler/test/browser/chrome.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'out');
assert(fs.existsSync(path.join(out, 'index.html')), 'Run the fixture build before browser checks.');
const artifacts = path.resolve(root, '../../.forgewp/nextjs-browser');
const missing = [];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(out, '.' + pathname);
    if (file !== out && !file.startsWith(out + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      const idx = path.join(file, req.headers.rsc ? 'index.txt' : 'index.html');
      const sibling = file + (req.headers.rsc ? '.txt' : '.html');
      file = fs.existsSync(idx) ? idx : fs.existsSync(sibling) ? sibling : idx;
    } else if (!fs.existsSync(file) && !path.extname(file)) {
      const ext = req.headers.rsc ? '.txt' : '.html';
      if (fs.existsSync(file + ext)) file = file + ext;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      missing.push(pathname); res.writeHead(404).end('Not found'); return;
    }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(400).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let chrome;
try {
  chrome = await openChrome();
  await chrome.call('Page.navigate', { url: origin });
  await chrome.wait(() => chrome.evaluate(`document.querySelector('[data-preview-ready="true"]') !== null`), 'preview hydration');
  assert.equal(await chrome.evaluate('document.querySelector("h1").textContent'), 'A standard Next.js app');
  await chrome.click('.intro h2');
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2 });
  await chrome.call('Input.insertText', { text: 'Edited locally' });
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await chrome.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await chrome.wait(() => chrome.evaluate(`document.querySelector('output').textContent === 'Preview heading: Edited locally'`), 'local edit callback');
  await chrome.screenshot(path.join(artifacts, 'edited-preview.png'));
  await chrome.click('a[href="/about?from=home#details"]');
  await chrome.wait(() => chrome.evaluate(`document.querySelector('h1')?.textContent === 'About the adapter fixture'`), 'Next link navigation');
  assert.equal(await chrome.evaluate('location.search + location.hash'), '?from=home#details');
  assert.equal(await chrome.evaluate(`document.querySelectorAll('[data-fixture="shared-layout"]').length`), 1);
  await chrome.click('nav a[href="/"]');
  await chrome.wait(() => chrome.evaluate(`document.querySelector('[data-preview-ready="true"]') !== null`), 'home after navigation');
  await chrome.click('[data-fixture="wordpress-link"]');
  await chrome.wait(() => chrome.evaluate(`document.querySelector('h1')?.textContent === 'About the adapter fixture'`), 'WordPress link fallback navigation');
  await chrome.call('Page.reload');
  await chrome.wait(() => chrome.evaluate(`document.querySelector('h1')?.textContent === 'About the adapter fixture'`), 'direct route reload');
  const errors = chrome.events.filter(event => event.method === 'Runtime.exceptionThrown' ||
    (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error'));
  fs.writeFileSync(path.join(artifacts, 'result.json'), JSON.stringify({ passed: errors.length === 0 && missing.length === 0, checks: ['local editing', 'Next navigation', 'query and fragment', 'content-link fallback', 'route reload'], errors, missing, wordpressVerified: false }, null, 2));
  assert.deepEqual(errors, [], 'Browser exceptions or hydration errors');
  assert.deepEqual(missing, [], 'Missing static assets or route payloads (see Next.js #85374 for Windows builds)');
  console.log('PASS: Next fixture browser checks. WordPress persistence is not tested.');
} finally {
  await chrome?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
