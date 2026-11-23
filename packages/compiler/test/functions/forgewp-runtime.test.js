import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FORGEWP_RESOURCES,
  ForgeWpRuntimeError,
  configureForgeWpRuntime,
  createForgeWpRuntime,
  createRestSource,
  createWpServerClient,
  defineResource,
  getResourceDefinition,
  normalizeSiteSettings,
  resetForgeWpRuntime,
} from '../../../react/src/server.ts';
import {
  submitWpForm,
  useWpI18n,
  useWpLanguage,
  useWpOption,
  useWpThemeMod,
} from '../../../react/src/hooks.ts';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  delete process.env.FORGEWP_NATIVE_EXPORT;
  delete process.env.FORGEWP_WP_URL;
  delete process.env.NEXT_PUBLIC_FORGEWP_WP_URL;
  delete process.env.FORGEWP_MODE;
  delete globalThis._forgeWpCompileTime;
  resetForgeWpRuntime();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Phase A: ForgeWpRuntime, fail-loud production, and site-settings pilot', () => {
  it('exposes the lean resource registry with cache tags and auth classification', () => {
    expect(getResourceDefinition('site-settings')).toMatchObject({
      name: 'site-settings',
      restPath: '/site-settings',
      auth: 'public',
      cacheTags: ['site-settings', 'options'],
    });
    expect(getResourceDefinition('forms')).toMatchObject({
      name: 'forms',
      restPath: '/forms',
      auth: 'public',
    });
    expect(Object.keys(FORGEWP_RESOURCES)).toContain('auth-me');

    const custom = defineResource({
      name: 'custom-widget',
      restPath: '/custom-widget',
      cacheTags: ['widgets'],
      auth: 'public',
    });
    expect(Object.isFrozen(custom)).toBe(true);
    expect(() => getResourceDefinition('non-existent')).toThrow(ForgeWpRuntimeError);
  });

  it('normalizes canonical and legacy site-settings shapes identically', () => {
    const canonical = normalizeSiteSettings({
      options: { contact_phone: '+1 555-0100' },
      themeMods: { footer_text: 'Copyright 2026' },
      site: { name: 'Studio', description: 'Desc', url: 'https://a.test', homeUrl: 'https://a.test', language: 'en' },
    });
    const legacy = normalizeSiteSettings({
      options: { contact_phone: { _type: 'text', default: '+1 555-0100' } },
      theme_mods: { footer_text: 'Copyright 2026' },
    });
    expect(canonical?.options.contact_phone).toBe('+1 555-0100');
    expect(canonical?.themeMods.footer_text).toBe('Copyright 2026');
    expect(legacy?.options.contact_phone).toBe('+1 555-0100');
    expect(legacy?.themeMods.footer_text).toBe('Copyright 2026');
  });

  it('fails loudly in production when no native or decoupled REST source is configured', () => {
    vi.stubGlobal('window', {});
    expect(() => createForgeWpRuntime({ isProduction: true })).toThrowError(
      ForgeWpRuntimeError,
    );
    try {
      createForgeWpRuntime({ isProduction: true });
    } catch (err) {
      expect(err.code).toBe('FORGEWP_RUNTIME_UNCONFIGURED');
    }
  });

  it('submitWpForm throws FORGEWP_RUNTIME_UNCONFIGURED in production without REST URL (no silent Simulated dev)', async () => {
    process.env.NODE_ENV = 'production';
    vi.stubGlobal('window', {});

    await expect(submitWpForm('contact', { email: 'a@b.test' })).rejects.toMatchObject({
      name: 'ForgeWpRuntimeError',
      code: 'FORGEWP_RUNTIME_UNCONFIGURED',
    });
  });

  it('submitWpForm posts to decoupled FORGEWP_WP_URL even when window.forgeWpHydration is absent', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FORGEWP_WP_URL = 'https://wp.example.test';
    vi.stubGlobal('window', {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Received' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await submitWpForm('contact', { name: 'Ada' });
    expect(res).toEqual({ ok: true, message: 'Received' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://wp.example.test/wp-json/forgewp/v1/forms/contact/submit',
    );
  });

  it('useWpI18n and useWpLanguage never default to hardcoded "de" and fail loudly in production when unconfigured', () => {
    // 1. In dev/test without translations: neutral "en" fallback, never "de"
    vi.stubGlobal('window', {});
    function Probe() {
      const { currentLanguage, urls } = useWpLanguage();
      const { __ } = useWpI18n();
      return React.createElement('div', null, `${currentLanguage}|${Object.keys(urls).join(',')}|${__('Hello')}`);
    }
    const devHtml = renderToStaticMarkup(React.createElement(Probe));
    expect(devHtml).toBe('<div>en|en|Hello</div>');

    // 2. In production without locale source: fails loudly with FORGEWP_LOCALE_UNCONFIGURED
    process.env.NODE_ENV = 'production';
    vi.stubGlobal('window', { forgeWpHydration: { restUrl: '/wp-json/forgewp/v1' } });
    expect(() => renderToStaticMarkup(React.createElement(Probe))).toThrowError(
      ForgeWpRuntimeError,
    );
    try {
      renderToStaticMarkup(React.createElement(Probe));
    } catch (err) {
      expect(err.code).toBe('FORGEWP_LOCALE_UNCONFIGURED');
    }

    // 3. In production with canonical hydrated resources.i18n: works cleanly
    vi.stubGlobal('window', {
      forgeWpHydration: {
        restUrl: '/wp-json/forgewp/v1',
        resources: {
          i18n: {
            currentLanguage: 'fr',
            defaultLocale: 'fr',
            locales: ['fr', 'en'],
            translations: { fr: { Hello: 'Bonjour' } },
            urls: { fr: '/', en: '/en/' },
          },
        },
      },
    });
    expect(renderToStaticMarkup(React.createElement(Probe))).toBe(
      '<div>fr|fr,en|Bonjour</div>',
    );
  });

  it('site-settings pilot: useWpOption and useWpThemeMod work identically across canonical native, legacy native, primed rest, and dev fixture sources', async () => {
    function SettingsProbe() {
      const phone = useWpOption('contact_phone', 'fallback-phone');
      const footer = useWpThemeMod('footer_text', 'fallback-footer');
      return React.createElement('div', null, `${phone}|${footer}`);
    }

    // 1. Canonical native hydration (`resources['site-settings']`)
    vi.stubGlobal('window', {
      forgeWpHydration: {
        resources: {
          'site-settings': {
            options: { contact_phone: '+44 20 1234' },
            themeMods: { footer_text: 'Canonical Footer' },
          },
        },
      },
    });
    expect(renderToStaticMarkup(React.createElement(SettingsProbe))).toBe(
      '<div>+44 20 1234|Canonical Footer</div>',
    );

    // 2. Legacy native hydration (`siteSettings.theme_mods`) is no longer read (resources.* only)
    vi.stubGlobal('window', {
      forgeWpHydration: {
        siteSettings: {
          options: { contact_phone: '+1 555-9999' },
          theme_mods: { footer_text: 'Legacy Footer' },
        },
      },
    });
    expect(renderToStaticMarkup(React.createElement(SettingsProbe))).toBe(
      '<div>fallback-phone|fallback-footer</div>',
    );

    // 3. Decoupled REST source (fetched & cached)
    vi.stubGlobal('window', {});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        options: { contact_phone: '+49 30 9999' },
        themeMods: { footer_text: 'REST Footer' },
        site: { name: 'REST Site', description: '', url: 'https://wp.test', homeUrl: 'https://wp.test', language: 'en' },
      }),
    });
    const runtime = configureForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://wp.test',
      fetch: fetchMock,
    });
    const fetched = await runtime.get('site-settings');
    expect(fetched?.options.contact_phone).toBe('+49 30 9999');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://wp.test/wp-json/forgewp/v1/site-settings',
      expect.objectContaining({
        method: 'GET',
        next: expect.objectContaining({ tags: ['site-settings', 'options'] }),
      }),
    );
    expect(renderToStaticMarkup(React.createElement(SettingsProbe))).toBe(
      '<div>+49 30 9999|REST Footer</div>',
    );

    // 4. Dev fixture source with option descriptor object
    resetForgeWpRuntime();
    vi.stubGlobal('window', {
      _forgeWpMockSiteSettings: {
        options: { contact_phone: { _type: 'text', default: '+33 1 2233' } },
        theme_mods: { footer_text: 'Mock Footer' },
      },
    });
    expect(renderToStaticMarkup(React.createElement(SettingsProbe))).toBe(
      '<div>+33 1 2233|Mock Footer</div>',
    );
  });

  it('site-settings pilot: createWpServerClient fetches GET /wp-json/forgewp/v1/site-settings in decoupled mode and emits tokens in native mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        options: { contact_phone: '+1 800-FORGEWP' },
        themeMods: { footer_text: 'Live WP Footer' },
        site: { name: 'Live Site', description: 'Tagline', url: 'https://cms.test', homeUrl: 'https://cms.test', language: 'en_US' },
      }),
    });

    const decoupledClient = createWpServerClient({
      wpUrl: 'https://cms.test',
      fetch: fetchMock,
    });
    const settings = await decoupledClient.getSiteSettings();
    expect(settings.options.contact_phone).toBe('+1 800-FORGEWP');
    expect(settings.themeMods.footer_text).toBe('Live WP Footer');
    // Sync getters now read from the populated cache too
    expect(decoupledClient.getOption('contact_phone', 'fallback')).toBe('+1 800-FORGEWP');
    expect(decoupledClient.getThemeMod('footer_text', 'fallback')).toBe('Live WP Footer');
    expect(await decoupledClient.getLiveOption('contact_phone')).toBe('+1 800-FORGEWP');
    expect(await decoupledClient.getLiveThemeMod('footer_text')).toBe('Live WP Footer');

    // Native export mode emits PHP compile tokens
    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const nativeClient = createWpServerClient({
      siteOptions: { contact_phone: '+1 555-0000' },
      themeMods: { footer_text: 'Default Footer' },
    });
    expect(await nativeClient.getLiveOption('contact_phone', 'Fallback')).toBe(
      '__FORGEWP_OPTION_contact_phone_DEFAULT_Fallback__',
    );
    expect(await nativeClient.getLiveThemeMod('footer_text', 'Fallback')).toBe(
      '__FORGEWP_THEME_MOD_footer_text_DEFAULT_Fallback__',
    );
  });

  it('restSource throws FORGEWP_RESOURCE_FETCH_FAILED on HTTP error status', async () => {
    const rest = createRestSource({
      baseUrl: 'https://wp.test',
      fetch: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    });
    await expect(rest.get('site-settings')).rejects.toMatchObject({
      name: 'ForgeWpRuntimeError',
      code: 'FORGEWP_RESOURCE_FETCH_FAILED',
      status: 503,
    });
  });
});
