import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { submitWpForm, useWpForm } from '../../../react/src/hooks.ts';
import { buildFormsPreviewData, formsPreviewScript } from '../../lib/forms-preview.js';

const contract = {
  forms: { contact: {
    fields: {
      name: { type: 'text', required: true },
      email: { type: 'email', required: true },
      consent: { type: 'checkbox', required: true },
      topic: { type: 'select', options: ['Support', 'Other'] },
    },
    clientFields: { enabled: true, seed: { en: [], de: [{ name: 'company', type: 'text', required: true }] } },
  } },
  i18n: { locales: ['en', 'de'], defaultLocale: 'en' },
};
const valid = { name: 'Example', email: 'person@example.test', consent: 'on', topic: 'Support' };
function install(config = contract) {
  const win = { location: { pathname: '/en/contact' } };
  vm.runInNewContext(formsPreviewScript(buildFormsPreviewData(config)), { window: win });
  vi.stubGlobal('window', win);
  return win;
}
async function settle(promise) { await vi.runAllTimersAsync(); return promise; }
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected network request')));
  install();
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('opt-in local native form validation', () => {
  it('preserves fast simulation unless opted in', async () => {
    expect(await settle(submitWpForm('contact', { email: 'invalid' }))).toMatchObject({ ok: true, message: 'Simulated (dev)' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns field errors for required values, invalid email, and invalid select choices', async () => {
    const result = await submitWpForm('contact', { name: ' ', email: 'invalid', consent: false, topic: 'Unlisted' }, { validateLocal: true });
    expect(result).toMatchObject({ ok: false, errors: {
      name: 'This field is required.', email: 'Please enter a valid email address.',
      consent: 'This field is required.', topic: 'Please choose a valid option.',
    } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts valid FormData and object payloads without calling WordPress', async () => {
    const data = new FormData();
    for (const [key, value] of Object.entries(valid)) data.append(key, value);
    expect(await settle(submitWpForm('contact', data, { validateLocal: true }))).toMatchObject({ ok: true });
    expect(await settle(submitWpForm('contact', { ...valid, name: 0 }, { validateLocal: true }))).toMatchObject({ ok: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('permits empty optional email/select fields', async () => {
    install({ forms: { contact: { fields: { email: { type: 'email' }, topic: { type: 'select', options: ['Support'] } } } } });
    expect(await settle(submitWpForm('contact', { email: '', topic: '' }, { validateLocal: true }))).toMatchObject({ ok: true });
  });
  it('rejects a non-scalar select value rather than coercing it into an allowed option', async () => {
    expect(await submitWpForm('contact', { ...valid, topic: ['Support'] }, { validateLocal: true })).toMatchObject({ ok: false, errors: { topic: 'Please choose a valid option.' } });
  });
  it.each([undefined, null, false, 0, '0', 'false', []])('rejects unchecked required checkboxes: %j', async (consent) => {
    expect(await submitWpForm('contact', { ...valid, consent }, { validateLocal: true })).toMatchObject({ ok: false, errors: { consent: 'This field is required.' } });
  });
  it('combines developer rules with the current locale client-field seed', async () => {
    const win = install();
    win.location.pathname = '/de/contact';
    expect(await submitWpForm('contact', valid, { validateLocal: true })).toMatchObject({ ok: false, errors: { company: 'This field is required.' } });
    expect(await settle(submitWpForm('contact', { ...valid, company: 'Example Ltd' }, { validateLocal: true }))).toMatchObject({ ok: true });
    win.location.pathname = '/en/contact';
    expect(await settle(submitWpForm('contact', valid, { validateLocal: true }))).toMatchObject({ ok: true });
  });
  it('reports unavailable contracts and refuses shortcode contracts', async () => {
    expect(await submitWpForm('missing', valid, { validateLocal: true })).toMatchObject({ ok: false, message: expect.stringContaining('contract unavailable') });
    install({ forms: { contact: { mode: 'shortcode', shortcode: '[plugin]' } } });
    expect(await submitWpForm('contact', valid, { validateLocal: true })).toMatchObject({ ok: false, message: expect.stringContaining('contract unavailable') });
  });
  it('retains the existing explicit failure sentinel after valid contract checks', async () => {
    expect(await settle(submitWpForm('contact', { ...valid, note: '__fail__' }, { validateLocal: true }))).toMatchObject({ ok: false, errors: { note: 'Simulated error (dev)' } });
  });
  it('defers to WordPress when a real REST runtime exists, regardless of validateLocal', async () => {
    vi.stubGlobal('window', { forgeWpHydration: { restUrl: '/wp-json/forgewp/v1' } });
    fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'Server validation', errors: { email: 'Server email error' } }) });
    expect(await submitWpForm('contact', { email: 'invalid' }, { validateLocal: true })).toMatchObject({ ok: false, message: 'Server validation', errors: { email: 'Server email error' } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('/wp-json/forgewp/v1/forms/contact/submit');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('validateLocal');
  });
  it('forwards the hook option and preserves form values on validation failure', async () => {
    let handleSubmit;
    function Probe() {
      handleSubmit = useWpForm('contact', { validateLocal: true, resetOnSuccess: true }).handleSubmit;
      return null;
    }
    renderToStaticMarkup(React.createElement(Probe));
    const NativeFormData = FormData;
    vi.stubGlobal('FormData', class extends NativeFormData {
      constructor() { super(); this.append('email', 'invalid'); }
    });
    const target = { reset: vi.fn() };
    const event = { preventDefault: vi.fn(), currentTarget: target };
    const result = await settle(handleSubmit(event));
    expect(result).toMatchObject({ ok: false, errors: { email: 'Please enter a valid email address.' } });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(target.reset).not.toHaveBeenCalled();
  });
});
