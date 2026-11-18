import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export async function openChrome() {
  const executable = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ].find((candidate) => fs.existsSync(candidate));
  if (!executable) throw new Error('Set CHROME_PATH to a Chrome/Chromium executable.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-browser-'));
  const child = spawn(executable, ['--headless', '--disable-gpu', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
  let socket;
  const pending = new Map();
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const wait = async (check, label, timeout = 15000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const value = await check();
      if (value) return value;
      await delay(100);
    }
    throw new Error(`Timed out: ${label}`);
  };
  const close = async () => {
    socket?.close();
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await Promise.race([exited, delay(3000)]);
    }
    // Remove only this newly created, absolute temporary Chrome profile.
    if (path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('forgewp-browser-')) {
      try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
    }
  };
  try {
    await wait(() => fs.existsSync(path.join(profile, 'DevToolsActivePort')), 'Chrome startup');
    const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const events = [];
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) { events.push(message); return; }
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
    });
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const key = ++id;
      const timer = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timed out: ${method}`)); }, 30000);
      pending.set(key, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: key, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    };
    const click = async (selector) => {
      const point = await evaluate(`(() => {
        const matches = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(e => e.getClientRects().length);
        if (matches.length !== 1) throw new Error('Expected one visible click target: ' + ${JSON.stringify(selector)} + '; got ' + matches.length);
        const el = matches[0]; el.scrollIntoView({block:'center'});
        const box = el.getBoundingClientRect(); return {x:box.x + box.width/2,y:box.y + box.height/2};
      })()`);
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    };
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Log.enable');
    return { call, evaluate, click, wait, events, close,
      screenshot: async (file) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const shot = await call('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      },
    };
  } catch (error) { await close(); throw error; }
}
