import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Opens Chrome for a browser check. Shared CI machines are sometimes slow to
 * start a browser: startup gets 60 s (FORGEWP_CHROME_STARTUP_MS), and a failed
 * start is tried once more with a fresh profile before the check fails.
 */
export async function openChrome(options = {}) {
  try {
    return await openChromeOnce(options);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('Chrome startup')) throw error;
    console.warn(`[forgewp browser] ${error.message}; trying once more with a fresh profile.`);
    return openChromeOnce(options);
  }
}

async function openChromeOnce(options = {}) {
  const headed =
    typeof options.headed === 'boolean'
      ? options.headed
      : process.env.FORGEWP_BROWSER_HEADED === '1';
  const viewportWidth = Number(options.viewport?.width) || 1440;
  const viewportHeight = Number(options.viewport?.height) || 900;
  const slowMo =
    typeof options.slowMo === 'number'
      ? Math.max(0, options.slowMo)
      : Math.max(0, Number(process.env.FORGEWP_BROWSER_SLOWMO || 0));

  const executable =
    process.env.CHROME_PATH ||
    [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ].find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    throw new Error('Set CHROME_PATH to a Chrome/Chromium executable.');
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-browser-'));
  const args = [
    ...(headed
      ? [`--window-size=${viewportWidth},${viewportHeight}`, '--new-window']
      : ['--headless', '--disable-gpu']),
    // Chrome refuses to start as root without --no-sandbox (cloud/CI containers).
    ...(process.platform === 'linux' && process.getuid?.() === 0
      ? ['--no-sandbox']
      : []),
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ];
  const child = spawn(executable, args, {
    windowsHide: !headed,
    stdio: 'ignore',
  });
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
    throw new Error(label === 'Chrome startup' ? 'Chrome startup timed out' : `Timed out: ${label}`);
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
    const startupMs = Number(process.env.FORGEWP_CHROME_STARTUP_MS) || 60000;
    await wait(() => {
      if (child.exitCode !== null) {
        throw new Error(`Chrome startup failed: the browser exited with code ${child.exitCode}`);
      }
      return fs.existsSync(path.join(profile, 'DevToolsActivePort'));
    }, 'Chrome startup', startupMs);
    const port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let id = 0;
    const events = [];
    const loadWaiters = new Set();
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) {
        events.push(message);
        if (message.method === 'Page.loadEventFired') {
          for (const resolveLoad of loadWaiters) resolveLoad();
          loadWaiters.clear();
        }
        return;
      }
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
      if (slowMo > 0) await delay(slowMo);
    };
    const fill = async (selector, value) => {
      await evaluate(`(() => {
        const matches = [...document.querySelectorAll(${JSON.stringify(selector)})].filter(e => e.getClientRects().length);
        if (matches.length !== 1) throw new Error('Expected one visible input target: ' + ${JSON.stringify(selector)} + '; got ' + matches.length);
        const el = matches[0];
        el.scrollIntoView({ block: 'center' });
        el.focus();
        const proto =
          el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : el instanceof HTMLSelectElement
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor && descriptor.set) {
          descriptor.set.call(el, ${JSON.stringify(String(value))});
        } else {
          el.value = ${JSON.stringify(String(value))};
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      if (slowMo > 0) await delay(slowMo);
    };
    const goto = async (url, { timeout = 20000 } = {}) => {
      let loadTimer;
      let settled = false;
      const loadFired = new Promise((resolve, reject) => {
        const onLoad = () => {
          if (settled) return;
          settled = true;
          clearTimeout(loadTimer);
          resolve();
        };
        loadWaiters.add(onLoad);
        loadTimer = setTimeout(() => {
          loadWaiters.delete(onLoad);
          if (!settled) {
            settled = true;
            reject(new Error(`Timed out waiting for navigation load: ${url}`));
          }
        }, timeout);
      });
      const navResult = await call('Page.navigate', { url });
      if (navResult?.errorText) {
        settled = true;
        clearTimeout(loadTimer);
        throw new Error(`Navigation failed for ${url}: ${navResult.errorText}`);
      }
      await loadFired;
      await wait(async () => {
        try {
          return (await evaluate('document.readyState')) === 'complete';
        } catch {
          return false;
        }
      }, `document ready (${url})`, timeout);
      if (slowMo > 0) await delay(slowMo);
    };
    const setViewport = async (width, height, { mobile = false } = {}) => {
      await call('Emulation.setDeviceMetricsOverride', {
        width: Number(width),
        height: Number(height),
        deviceScaleFactor: 1,
        mobile: Boolean(mobile),
      });
    };
    const clearEvents = () => {
      events.length = 0;
    };
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Log.enable');
    await call('Network.enable');
    if (headed) {
      await setViewport(viewportWidth, viewportHeight, { mobile: false });
    }
    return { call, evaluate, click, fill, goto, setViewport, clearEvents, wait, events, close,
      screenshot: async (file) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const shot = await call('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      },
    };
  } catch (error) { await close(); throw error; }
}
