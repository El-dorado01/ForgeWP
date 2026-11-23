import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ForgeWpRuntimeError,
  configureForgeWpRuntime,
  createForgeWpRuntime,
  createWpServerClient,
  normalizeFormResource,
  normalizeFormsCollection,
  resetForgeWpRuntime,
} from '../../../react/src/server.ts';
import {
  submitWpForm,
  useWpFormFieldLabels,
} from '../../../react/src/hooks.ts';
import { WpFormFields } from '../../../react/src/components/WpFormFields.tsx';

function mockResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('Phase A Assignment 6: forms React pilot (contract, wpClient.getForm, WpFormFields, useWpFormFieldLabels, submitWpForm)', () => {
  const prevWin = globalThis.window;
  const prevFetch = globalThis.fetch;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevNativeExport = process.env.FORGEWP_NATIVE_EXPORT;
  const prevWpUrl = process.env.FORGEWP_WP_URL;

  afterEach(() => {
    resetForgeWpRuntime();
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
    if (prevFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = prevFetch;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevNativeExport === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
    else process.env.FORGEWP_NATIVE_EXPORT = prevNativeExport;
    if (prevWpUrl === undefined) delete process.env.FORGEWP_WP_URL;
    else process.env.FORGEWP_WP_URL = prevWpUrl;
  });

  it('normalizes canonical and legacy form payloads consistently', () => {
    const single = normalizeFormResource({
      name: 'contact',
      mode: 'native',
      lang: 'en',
      submitUrl: 'https://wp.example.com/wp-json/forgewp/v1/forms/contact/submit',
      fieldLabels: { email: 'Work Email' },
      fields: [
        { name: 'company', label: 'Company', type: 'text', required: true, placeholder: 'Acme' },
      ],
    });
    expect(single).toEqual({
      name: 'contact',
      mode: 'native',
      lang: 'en',
      submitUrl: 'https://wp.example.com/wp-json/forgewp/v1/forms/contact/submit',
      fieldLabels: { email: 'Work Email' },
      fields: [
        { name: 'company', label: 'Company', type: 'text', required: true, placeholder: 'Acme' },
      ],
    });

    const collection = normalizeFormsCollection({
      lang: 'de',
      forms: {
        contact: {
          fieldLabels: { email: 'E-Mail' },
          fields: [{ name: 'topic', label: 'Thema', type: 'select', required: false, options: ['A', 'B'] }],
        },
      },
    });
    expect(collection?.lang).toBe('de');
    expect(collection?.forms.contact.name).toBe('contact');
    expect(collection?.forms.contact.fields[0].options).toEqual(['A', 'B']);
  });

  it('wpClient.getForm() and getForms() fetch canonical REST endpoints with cache tags, handle 404 as null, and fail loud on 400 shortcode-only', async () => {
    const calls = [];
    const mockFetch = vi.fn(async (url, init) => {
      calls.push({ url, init });
      if (url === 'https://wp.example.com/wp-json/forgewp/v1/forms/contact?lang=de') {
        return mockResponse({
          name: 'contact',
          mode: 'native',
          lang: 'de',
          submitUrl: 'https://wp.example.com/wp-json/forgewp/v1/forms/contact/submit',
          fieldLabels: { name: 'Ihr Name', email: 'Geschäftliche E-Mail' },
          fields: [
            { name: 'company', label: 'Unternehmen', type: 'text', required: true },
          ],
        });
      }
      if (url === 'https://wp.example.com/wp-json/forgewp/v1/forms/missing') {
        return mockResponse({ code: 'FORGEWP_FORM_NOT_FOUND', message: 'Not found' }, 404);
      }
      if (url === 'https://wp.example.com/wp-json/forgewp/v1/forms/cf7') {
        return mockResponse(
          {
            code: 'FORGEWP_FORM_SHORTCODE_ONLY',
            message: 'Form "cf7" uses mode: shortcode and requires Native or Hybrid mode.',
          },
          400,
        );
      }
      if (url === 'https://wp.example.com/wp-json/forgewp/v1/forms?lang=en') {
        return mockResponse({
          lang: 'en',
          forms: {
            contact: {
              name: 'contact',
              mode: 'native',
              lang: 'en',
              submitUrl: 'https://wp.example.com/wp-json/forgewp/v1/forms/contact/submit',
              fieldLabels: { name: 'Your Name' },
              fields: [],
            },
          },
        });
      }
      return mockResponse({}, 404);
    });

    const wpClient = createWpServerClient({
      wpUrl: 'https://wp.example.com',
      fetch: mockFetch,
      next: { revalidate: 60 },
    });

    const contact = await wpClient.getForm('contact', { lang: 'de' });
    expect(contact?.name).toBe('contact');
    expect(contact?.lang).toBe('de');
    expect(contact?.fieldLabels.email).toBe('Geschäftliche E-Mail');
    expect(contact?.fields).toHaveLength(1);
    expect(calls[0].init.next.tags).toEqual(expect.arrayContaining(['forms', 'form:contact']));

    // Second call hits cache (no duplicate fetch)
    const cached = await wpClient.getForm('contact', { lang: 'de' });
    expect(cached).toEqual(contact);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // 404 -> null
    expect(await wpClient.getForm('missing')).toBeNull();

    // 400 shortcode-only -> throws typed ForgeWpRuntimeError
    await expect(wpClient.getForm('cf7')).rejects.toThrow(ForgeWpRuntimeError);

    // Collection endpoint populates cache for subsequent getForm()
    const allEn = await wpClient.getForms({ lang: 'en' });
    expect(allEn.forms.contact.fieldLabels.name).toBe('Your Name');
    const fromCollectionCache = await wpClient.getForm('contact', { lang: 'en' });
    expect(fromCollectionCache?.fieldLabels.name).toBe('Your Name');
  });

  it('wpClient.getForm() resolves fixtures in dev and native export modes', async () => {
    delete process.env.FORGEWP_WP_URL;
    const wpClient = createWpServerClient({
      forms: {
        contact: {
          fieldLabels: { email: 'Email Address' },
          fields: [{ name: 'phone', label: 'Phone', type: 'tel', required: false }],
        },
      },
    });

    const fixtureForm = await wpClient.getForm('contact');
    expect(fixtureForm?.name).toBe('contact');
    expect(fixtureForm?.fields[0].name).toBe('phone');
    expect(await wpClient.getForm('unknown')).toBeNull();

    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const nativeForm = await wpClient.getForm('contact', { lang: 'fr' });
    expect(nativeForm?.lang).toBe('fr');
    expect(nativeForm?.fields[0].name).toBe('phone');
  });

  it('ForgeWpRuntime restSource fetches single form with form:<name> cache tag and merges into collection cache', async () => {
    const fetchSpy = vi.fn(async (url, init) => {
      expect(url).toBe('https://cms.example.com/wp-json/forgewp/v1/forms/newsletter?lang=en');
      expect(init.next.tags).toEqual(expect.arrayContaining(['forms', 'form:newsletter']));
      return mockResponse({
        name: 'newsletter',
        mode: 'native',
        lang: 'en',
        submitUrl: 'https://cms.example.com/wp-json/forgewp/v1/forms/newsletter/submit',
        fieldLabels: { email: 'Newsletter Email' },
        fields: [{ name: 'consent', label: 'Opt in', type: 'checkbox', required: true }],
      });
    });

    const runtime = createForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://cms.example.com',
      fetch: fetchSpy,
    });

    const res = await runtime.get('forms', { slug: 'newsletter', query: { lang: 'en' } });
    expect(res?.forms.newsletter.fieldLabels.email).toBe('Newsletter Email');
    // Unscoped collection peek also sees the fetched form
    expect(runtime.peek('forms')?.forms.newsletter.fields[0].name).toBe('consent');
  });

  it('submitWpForm() uses canonical submitUrl from runtime, forwards lang, and parses canonical error envelopes', async () => {
    const requests = [];
    globalThis.fetch = vi.fn(async (url, init) => {
      requests.push({ url, init, body: JSON.parse(init.body) });
      if (requests.length === 1) {
        return mockResponse({ message: 'Submitted!' }, 200);
      }
      return mockResponse(
        {
          code: 'FORGEWP_VALIDATION_FAILED',
          message: 'Please fix the highlighted fields.',
          data: { status: 422, errors: { email: 'Invalid email' } },
        },
        422,
      );
    });

    const runtime = configureForgeWpRuntime({
      mode: 'decoupled',
      wpUrl: 'https://cms.example.com',
    });
    runtime.prime('forms', {
      lang: 'de',
      forms: {
        contact: {
          name: 'contact',
          mode: 'native',
          lang: 'de',
          submitUrl: 'https://edge.example.com/wp-json/forgewp/v1/forms/contact/submit',
          fieldLabels: {},
          fields: [],
        },
      },
    });

    const okRes = await submitWpForm('contact', { email: 'ada@example.com' });
    expect(okRes).toEqual({ ok: true, message: 'Submitted!' });
    expect(requests[0].url).toBe('https://edge.example.com/wp-json/forgewp/v1/forms/contact/submit');
    expect(requests[0].body.lang).toBe('de');

    const errRes = await submitWpForm('contact', { email: 'bad' }, { lang: 'fr' });
    expect(errRes).toEqual({
      ok: false,
      message: 'Please fix the highlighted fields.',
      errors: { email: 'Invalid email' },
    });
    expect(requests[1].body.lang).toBe('fr');
  });

  it('<WpFormFields> and useWpFormFieldLabels render identical DOM from RSC initialForm and native hydration', () => {
    const formContract = {
      name: 'contact',
      mode: 'native',
      lang: 'en',
      fieldLabels: { email: 'Work Email' },
      fields: [
        { name: 'company', label: 'Company', type: 'text', required: true, placeholder: 'Acme' },
      ],
    };

    const renderField = (field) =>
      React.createElement(
        'label',
        { key: field.name },
        field.label,
        React.createElement('input', {
          name: field.name,
          type: field.type,
          required: field.required,
          placeholder: field.placeholder,
        }),
      );

    function TestForm({ initialForm }) {
      const labels = useWpFormFieldLabels('contact', {
        initialLabels: initialForm?.fieldLabels,
      });
      return React.createElement(
        'form',
        null,
        React.createElement('span', { className: 'email-label' }, labels.email || 'Email'),
        React.createElement(WpFormFields, {
          form: 'contact',
          initialForm,
          render: renderField,
        }),
      );
    }

    // 1. Decoupled RSC render (no window, passed initialForm from wpClient.getForm())
    delete globalThis.window;
    const decoupledHtml = renderToStaticMarkup(
      React.createElement(TestForm, { initialForm: formContract }),
    );
    expect(decoupledHtml).toContain('Work Email');
    expect(decoupledHtml).toContain('name="company"');
    expect(decoupledHtml).toContain('placeholder="Acme"');

    // 2. Native WordPress hydration render (no initialForm prop, reads window.forgeWpHydration.resources.forms)
    globalThis.window = {
      forgeWpHydration: {
        restUrl: 'https://wp.example.com/wp-json/forgewp/v1',
        resources: {
          forms: {
            lang: 'en',
            forms: { contact: formContract },
          },
        },
      },
    };
    const nativeHtml = renderToStaticMarkup(
      React.createElement(TestForm, { initialForm: null }),
    );
    expect(nativeHtml).toBe(decoupledHtml);
  });
});
