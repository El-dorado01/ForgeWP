import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgewpVirtualPlugin } from '../../lib/virtual-plugin.js';
import { buildFormsPreviewData, formsPreviewScript } from '../../lib/forms-preview.js';
import { WpFormFields } from '../../../react/src/components/WpFormFields.tsx';

let root;
const field = (name) => ({ name, type: 'text', label: name });
function config(forms = {}, extra = {}) {
  fs.writeFileSync(path.join(root, 'wp.config.ts'), 'export default ' + JSON.stringify({ name: 'Forms', slug: 'forms', version: '1', description: '', textDomain: 'forms', configVersion: 1, forms, ...extra }));
}
function execute(code, pathname = '/') {
  const win = { location: { pathname } };
  // Fixture has no CMS runtime imports; execute the exact generated module body.
  vm.runInNewContext(code.replace('export default {', 'globalThis.runtime = {'), { window: win });
  return win;
}
function render(win, fallback) {
  vi.stubGlobal('window', win);
  return renderToStaticMarkup(React.createElement(WpFormFields, { form: 'contact', fallback, render: (entry) => React.createElement('label', null, entry.label) }));
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'forgewp-forms-preview-'));
  fs.mkdirSync(path.join(root, 'cms/forms'), { recursive: true });
});
afterEach(() => {
  vi.unstubAllGlobals(); vi.restoreAllMocks();
  if (path.dirname(root) !== path.resolve(os.tmpdir()) || !path.basename(root).startsWith('forgewp-forms-preview-')) throw new Error('Unsafe cleanup');
  fs.rmSync(root, { recursive: true, force: true });
});
async function plugin() {
  const instance = forgewpVirtualPlugin({ projectRoot: root });
  instance.configResolved({ command: 'serve' });
  await instance.buildStart();
  return instance;
}
describe('native form field preview injection', () => {
  it('projects only public Auth signup policy during development', async () => {
    config({}, { auth: { defaultRole: 'subscriber', registrationMetaFields: ['first_name'], features: { registration: false, autoLoginAfterSignup: false, emailVerification: true }, emails: { verification: { subject: 'Private mail subject', body: 'Private mail text' } } } });
    const instance = await plugin();
    const code = instance.load('\0virtual:forgewp-runtime');
    const win = execute(code);
    expect(win._forgeWpAuthPreview).toMatchObject({ registration: false, autoLoginAfterSignup: false, emailVerification: true, registrationMetaFields: ['first_name'] });
    expect(code).not.toContain('Private mail subject');
    expect(code).not.toContain('Private mail text');
  });
  it('merges discovered/inline forms with inline precedence and exposes only public descriptors', async () => {
    fs.writeFileSync(path.join(root, 'cms/forms/contact.ts'), `export const form = defineWpForm({clientFields:{enabled:true,seed:[{name:'discovered',type:'text'}]}});`);
    fs.writeFileSync(path.join(root, 'cms/forms/enquiry.ts'), `export const form = defineWpForm({clientFields:{enabled:true,seed:[{name:'question',type:'textarea'}]}});`);
    config({ contact: { mailTo: 'private@example.test', subject: 'Private subject', fields: { internal: { type: 'email' } }, clientFields: { enabled: true, seed: [{ ...field('topic'), privateConfig: 'never copy' }] } } });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const instance = await plugin();
    const code = instance.load('\0virtual:forgewp-runtime');
    expect(code).not.toContain('private@example.test');
    expect(code).not.toContain('Private subject');
    expect(code).not.toContain('never copy');
    const win = execute(code);
    expect(win._forgeWpMockForms.contact.fields[0].name).toBe('topic');
    expect(win._forgeWpMockForms.enquiry.fields[0]).toMatchObject({ name: 'question', label: 'question', required: false });
    expect(render(win)).toContain('<label>topic</label>');
  });
  it('selects the current configured locale on each render, including regional prefixes', async () => {
    config({ contact: { clientFields: { enabled: true, seed: { en: [field('English')], 'pt-BR': [field('Portuguese')] } } } }, { i18n: { locales: ['en', 'pt-BR', 'de'], defaultLocale: 'en' } });
    const instance = await plugin();
    const win = execute(instance.load('\0virtual:forgewp-runtime'), '/pt-BR/contact');
    expect(render(win)).toContain('Portuguese');
    win.location.pathname = '/en/contact';
    expect(render(win)).toContain('English');
    win.location.pathname = '/de/contact';
    expect(render(win)).not.toContain('English');
    win.location.pathname = '/unknown/contact';
    expect(render(win)).toContain('English');
  });
  it('uses explicit empty data for disabled client fields, preserving fallback only when runtime data is absent', () => {
    const win = { location: { pathname: '/' } };
    vm.runInNewContext(formsPreviewScript(buildFormsPreviewData({ forms: { contact: { clientFields: { enabled: false, seed: [field('Hidden')] } } } })), { window: win });
    expect(render(win, [field('Fallback')])).not.toContain('Fallback');
    expect(render({ location: { pathname: '/' } }, [field('Fallback')])).toContain('Fallback');
  });
  it('does not load or inject form seeds for production builds', async () => {
    config({ contact: { clientFields: { enabled: true, seed: [field('Private preview seed')] } } });
    const instance = forgewpVirtualPlugin({ projectRoot: root });
    instance.configResolved({ command: 'build' });
    await instance.buildStart();
    expect(instance.load('\0virtual:forgewp-runtime')).not.toContain('_forgeWpMockForms');
    expect(instance.load('\0virtual:forgewp-runtime')).not.toContain('window._forgeWpAuthPreview =');
  });
  it('keeps WordPress hydration fields authoritative over local seeds and fallback', async () => {
    config({ contact: { clientFields: { enabled: true, seed: [field('Local seed')] } } });
    const instance = await plugin();
    const win = execute(instance.load('\0virtual:forgewp-runtime'));
    win.forgeWpHydration = { forms: { contact: { fields: [field('Saved WordPress value')] } } };
    const html = render(win, [field('Fallback')]);
    expect(html).toContain('Saved WordPress value');
    expect(html).not.toContain('Local seed');
    expect(html).not.toContain('Fallback');
  });
  it('refreshes changed config without stale jiti values and requests a development reload', async () => {
    config({ contact: { clientFields: { enabled: true, seed: [field('Before')] } } });
    const instance = await plugin();
    const server = { moduleGraph: { getModuleById: vi.fn(() => ({})), invalidateModule: vi.fn() }, ws: { send: vi.fn() } };
    config({ contact: { clientFields: { enabled: true, seed: [field('After')] } } });
    await instance.handleHotUpdate({ file: path.join(root, 'wp.config.ts'), server });
    expect(execute(instance.load('\0virtual:forgewp-runtime'))._forgeWpMockForms.contact.fields[0].name).toBe('After');
    expect(server.moduleGraph.invalidateModule).toHaveBeenCalled();
    expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload' });
  });
  it('reloads added/deleted form files and releases watcher listeners when the server closes', async () => {
    config(); const instance = await plugin();
    const watcher = new EventEmitter(); watcher.add = vi.fn();
    const server = { watcher, httpServer: new EventEmitter(), moduleGraph: { getModuleById: () => null }, ws: { send: vi.fn() } };
    instance.configureServer(server);
    const file = path.join(root, 'cms/forms/contact.ts');
    fs.writeFileSync(file, `export const form=defineWpForm({clientFields:{enabled:true,seed:[{name:'New',type:'text'}]}});`);
    await watcher.listeners('add')[0](file);
    expect(execute(instance.load('\0virtual:forgewp-runtime'))._forgeWpMockForms.contact.fields[0].name).toBe('New');
    fs.unlinkSync(file);
    await watcher.listeners('unlink')[0](file);
    expect(execute(instance.load('\0virtual:forgewp-runtime'))._forgeWpMockForms.contact).toBeUndefined();
    server.httpServer.emit('close');
    expect(watcher.listenerCount('add')).toBe(0);
    expect(watcher.listenerCount('unlink')).toBe(0);
  });
});
