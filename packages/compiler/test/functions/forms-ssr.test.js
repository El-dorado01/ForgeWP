import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { WpFormFields } from '../../../react/src/components/WpFormFields.tsx';
import { buildFormsPhp } from '../../lib/functions/forms.js';
import { processMarkup } from '../../lib/markup-processor.js';

function SampleContactForm() {
  const formId = 'fwp_id';
  const fieldId = (name) => `${formId}-${name}`;
  return React.createElement(
    'form',
    { className: 'contact-form' },
    React.createElement(WpFormFields, {
      form: 'contact',
      render: (field) =>
        React.createElement(
          'div',
          { key: field.name, className: `field-wrap field-${field.name}` },
          React.createElement(
            'label',
            { htmlFor: fieldId(field.name), className: 'field-label' },
            field.label,
            field.required ? React.createElement('span', { className: 'req-star' }, ' *') : null,
          ),
          field.type === 'textarea'
            ? React.createElement('textarea', {
                id: fieldId(field.name),
                name: field.name,
                rows: 4,
                required: field.required,
                placeholder: field.placeholder || 'Default note',
                className: 'ctrl-textarea',
              })
            : field.type === 'select' || field.type === 'multiselect'
              ? React.createElement(
                  'select',
                  {
                    id: fieldId(field.name),
                    name: field.multiple ? `${field.name}[]` : field.name,
                    multiple: Boolean(field.multiple),
                    required: field.required,
                    className: 'ctrl-select',
                  },
                  React.createElement('option', { value: '' }, 'Please choose...'),
                  (field.options || []).map((opt) =>
                    React.createElement('option', { key: opt, value: opt }, opt),
                  ),
                )
              : field.type === 'radio'
                ? React.createElement(
                    'div',
                    { className: 'radio-group' },
                    (field.options || []).map((opt) =>
                      React.createElement(
                        'label',
                        { key: opt, className: 'radio-item' },
                        React.createElement('input', {
                          type: 'radio',
                          name: field.name,
                          value: opt,
                          required: field.required,
                        }),
                        opt,
                      ),
                    ),
                  )
                : field.type === 'checkbox'
                  ? React.createElement('input', {
                      id: fieldId(field.name),
                      type: 'checkbox',
                      name: field.name,
                      required: field.required,
                      className: 'ctrl-check',
                    })
                  : React.createElement('input', {
                      id: fieldId(field.name),
                      type: field.type,
                      name: field.name,
                      required: field.required,
                      min: field.min,
                      max: field.max,
                      step: field.step,
                      placeholder: field.placeholder,
                      className: 'ctrl-input',
                    }),
        ),
    }),
  );
}

describe('Server-rendered <WpFormFields> from saved WordPress definitions', () => {
  const prevWin = globalThis.window;
  const prevNative = process.env.FORGEWP_NATIVE_EXPORT;

  afterEach(() => {
    if (prevWin === undefined) delete globalThis.window;
    else globalThis.window = prevWin;
    if (prevNative === undefined) delete process.env.FORGEWP_NATIVE_EXPORT;
    else process.env.FORGEWP_NATIVE_EXPORT = prevNative;
  });

  it('compiles render-prop templates to valid PHP echoing saved WordPress locale fields, handles empty sets, and matches client hydration DOM', () => {
    const config = {
      textDomain: 'ssr-forms',
      i18n: { locales: ['en', 'de'], defaultLocale: 'en', provider: 'local' },
      forms: {
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email', required: true } },
          clientFields: {
            enabled: true,
            seed: {
              en: [
                { name: 'topic', label: 'Topic & <Scope>', type: 'select', required: true, options: ['Sales & "Ops"', 'Support'] },
                { name: 'tags', label: 'Tags', type: 'multiselect', required: false, options: ['Web', 'Mobile'] },
                { name: 'priority', label: 'Priority', type: 'radio', required: true, options: ['Normal', 'Urgent'] },
                { name: 'budget', label: 'Budget', type: 'number', required: false, min: 100, max: 5000, step: 50, placeholder: 'Enter amount' },
                { name: 'notes', label: 'Notes', type: 'textarea', required: false, placeholder: '' },
                { name: 'agree', label: 'Agree', type: 'checkbox', required: true },
              ],
              de: [],
            },
          },
        },
      },
    };

    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const rawSsr = renderToStaticMarkup(React.createElement(SampleContactForm));
    expect(rawSsr).toContain('<forgewp-form-fields form="contact">');
    expect(rawSsr).toContain('name="_forgewp_hp"');

    const compiledTemplate = processMarkup(rawSsr, 'ssr-forms');
    expect(compiledTemplate).toContain("forgewp_forms_get_registered_client_fields('contact')");
    expect(compiledTemplate).not.toContain('forgewp-form-field-tpl');
    expect(compiledTemplate).not.toContain('__FWP_FF_');

    const formsPhp = buildFormsPhp(config);
    const tmp = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-ssr-'));
    try {
      const tplFile = path.join(tmp, 'contact-form.php');
      const runtimeFile = path.join(tmp, 'runtime.php');
      writeFileSync(tplFile, compiledTemplate, 'utf8');
      writeFileSync(
        runtimeFile,
        `<?php
define('MINUTE_IN_SECONDS', 60);
function __($s, $d = 'default') { return $s; }
function esc_html__($s, $d = 'default') { return $s; }
function esc_html_e($s, $d = 'default') { echo $s; }
function esc_attr_e($s, $d = 'default') { echo $s; }
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_textarea($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_url($s) { return (string)$s; }
function home_url($p = '/') { return 'https://example.test/' . ltrim((string)$p, '/'); }
function sanitize_key($k) { return preg_replace('/[^a-z0-9_-]/', '', strtolower((string)$k)); }
function wp_unslash($v) { return $v; }
function get_locale() { return 'en_US'; }
function add_action($h, $cb, $p = 10, $a = 1) {}
function add_filter($h, $cb, $p = 10, $a = 1) {}
function get_option($k, $d = null) {
  if ($k === 'forgewp_form_fields_contact') {
    return array(
      'en' => array(
        array('name' => 'topic', 'label' => 'Topic & <Scope>', 'type' => 'select', 'required' => true, 'options' => array('Sales & "Ops"', 'Support')),
        array('name' => 'tags', 'label' => 'Tags', 'type' => 'multiselect', 'multiple' => true, 'required' => false, 'options' => array('Web', 'Mobile')),
        array('name' => 'priority', 'label' => 'Priority', 'type' => 'radio', 'required' => true, 'options' => array('Normal', 'Urgent')),
        array('name' => 'budget', 'label' => 'Budget', 'type' => 'number', 'required' => false, 'min' => 100, 'max' => 5000, 'step' => 50, 'placeholder' => 'Enter amount'),
        array('name' => 'notes', 'label' => 'Notes', 'type' => 'textarea', 'required' => false, 'placeholder' => ''),
        array('name' => 'agree', 'label' => 'Agree', 'type' => 'checkbox', 'required' => true),
      ),
      'de' => array(),
    );
  }
  return $d;
}
${formsPhp}
`,
      );

      for (const file of [tplFile, runtimeFile]) {
        const lint = spawnSync('php', ['-l', file], { encoding: 'utf8' });
        expect(lint.status, lint.stderr).toBe(0);
      }

      const driverFile = path.join(tmp, 'driver.php');
      writeFileSync(
        driverFile,
        `<?php
require ${JSON.stringify(runtimeFile)};

$_SERVER['REQUEST_URI'] = '/en/contact';
ob_start();
include ${JSON.stringify(tplFile)};
$en_html = ob_get_clean();
$en_payload = forgewp_forms_hydration_payload();

$_SERVER['REQUEST_URI'] = '/de/contact';
ob_start();
include ${JSON.stringify(tplFile)};
$de_html = ob_get_clean();
$de_payload = forgewp_forms_hydration_payload();

echo json_encode(array(
  'en_html' => $en_html,
  'en_fields' => $en_payload['contact']['fields'],
  'de_html' => $de_html,
  'de_fields' => $de_payload['contact']['fields'],
));
`,
      );
      const exec = spawnSync('php', [driverFile], { encoding: 'utf8' });
      expect(exec.status, exec.stderr).toBe(0);
      const { en_html, en_fields, de_html, de_fields } = JSON.parse(exec.stdout);

      // Escaped label & option quotes safely in SSR HTML
      expect(en_html).toContain('Topic &amp; &lt;Scope&gt;<span class="req-star"> *</span>');
      expect(en_html).toContain('value="Sales &amp; &quot;Ops&quot;"');
      expect(en_html).toContain('name="tags[]" multiple=""');
      expect(en_html).toMatch(/<input type="radio"[^>]*name="priority"[^>]*value="Urgent"/);
      expect(en_html).toContain('min="100" max="5000" step="50"');
      expect(en_html).toContain('placeholder="Enter amount"');
      expect(en_html).toContain('placeholder="Default note"');

      // Intentionally empty set for /de/ renders zero fields + exactly 1 honeypot input
      expect(de_fields).toEqual([]);
      expect(de_html).toContain('name="_forgewp_hp"');
      expect(de_html).not.toContain('field-wrap');

      // Now hydrate the exact same React component with the exact JSON payload emitted by PHP
      // and verify 1:1 markup parity with zero duplicate fields or content swaps!
      delete process.env.FORGEWP_NATIVE_EXPORT;
      globalThis.window = {
        forgeWpHydration: {
          resources: {
            forms: {
              lang: 'en',
              forms: { contact: { name: 'contact', mode: 'native', fieldLabels: {}, fields: en_fields } },
            },
          },
        },
      };
      const hydratedEn = renderToStaticMarkup(React.createElement(SampleContactForm));
      expect(en_html).toBe(hydratedEn);

      globalThis.window = {
        forgeWpHydration: {
          resources: {
            forms: {
              lang: 'de',
              forms: { contact: { name: 'contact', mode: 'native', fieldLabels: {}, fields: de_fields } },
            },
          },
        },
      };
      const hydratedDe = renderToStaticMarkup(React.createElement(SampleContactForm));
      expect(de_html).toBe(hydratedDe);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('collapses identical text/email/tel inputs into default branch, preserves i18n placeholder fallbacks, handles select+multiple, and honors Polylang active locale', () => {
    function SimpleFieldsForm() {
      return React.createElement(WpFormFields, {
        form: 'inquiry',
        render: (field) =>
          field.type === 'select' || field.type === 'multiselect' || field.multiple
            ? React.createElement(
                'select',
                { name: field.name, multiple: Boolean(field.multiple) },
                (field.options || []).map((o) =>
                  React.createElement('option', { key: o, value: o }, o),
                ),
              )
            : React.createElement('input', {
                type: field.type,
                name: field.name,
                required: field.required,
                placeholder: field.placeholder || '__FORGEWP_I18N_Fallback label__',
              }),
      });
    }

    process.env.FORGEWP_NATIVE_EXPORT = '1';
    const rawSsr = renderToStaticMarkup(React.createElement(SimpleFieldsForm));
    const compiled = processMarkup(rawSsr, 'my-theme');

    // text, email, tel share identical markup and collapse into a single default branch
    expect(compiled).not.toContain("case 'email':");
    expect(compiled).not.toContain("case 'tel':");
    expect(compiled).toContain('default:');
    // Select with multiple: true routes through $__fwp_ff_render_type === 'multiselect'
    expect(compiled).toContain("$__fwp_ff_render_type = ( $__fwp_ff_type === 'select' && ! empty( $__fwp_ff['multiple'] ) ) ? 'multiselect' : $__fwp_ff_type;");
    // i18n fallback preserved inside placeholder conditional
    expect(compiled).toContain("__('Fallback label', 'my-theme')");

    const config = {
      textDomain: 'my-theme',
      i18n: { locales: ['en', 'fr'], defaultLocale: 'en', provider: 'polylang' },
      forms: {
        inquiry: {
          mailTo: 'admin',
          fields: { email: { type: 'email', required: true } },
          clientFields: {
            enabled: true,
            seed: {
              en: [{ name: 'phone', label: 'Phone', type: 'tel', required: true }],
              fr: [{ name: 'choices', label: 'Choix', type: 'select', multiple: true, options: ['Un', 'Deux'] }],
            },
          },
        },
      },
    };
    const formsPhp = buildFormsPhp(config);
    const tmp = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-pll-'));
    try {
      const tplFile = path.join(tmp, 'tpl.php');
      const runFile = path.join(tmp, 'run.php');
      writeFileSync(tplFile, compiled, 'utf8');
      writeFileSync(
        runFile,
        `<?php
define('MINUTE_IN_SECONDS', 60);
$__pll_lang = 'fr';
function pll_current_language() { global $__pll_lang; return $__pll_lang; }
function pll_default_language() { return 'en'; }
function __($s, $d = 'default') { return $d === 'my-theme' ? '[FR]' . $s : $s; }
function esc_html__($s, $d = 'default') { return $s; }
function esc_html_e($s, $d = 'default') { echo $s; }
function esc_attr_e($s, $d = 'default') { echo $s; }
function esc_html($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_textarea($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_url($s) { return (string)$s; }
function home_url($p = '/') { return 'https://example.test/' . ltrim((string)$p, '/'); }
function sanitize_key($k) { return preg_replace('/[^a-z0-9_-]/', '', strtolower((string)$k)); }
function wp_unslash($v) { return $v; }
function get_locale() { return 'en_US'; }
function add_action($h, $cb, $p = 10, $a = 1) {}
function add_filter($h, $cb, $p = 10, $a = 1) {}
function get_option($k, $d = null) { return $d; }
${formsPhp}

ob_start();
include ${JSON.stringify(tplFile)};
$fr_out = ob_get_clean();

$__pll_lang = 'en';
ob_start();
include ${JSON.stringify(tplFile)};
$en_out = ob_get_clean();

echo json_encode(array('fr' => $fr_out, 'en' => $en_out));
`,
      );
      const lint = spawnSync('php', ['-l', tplFile], { encoding: 'utf8' });
      expect(lint.status, lint.stderr).toBe(0);
      const exec = spawnSync('php', [runFile], { encoding: 'utf8' });
      expect(exec.status, exec.stderr).toBe(0);
      const res = JSON.parse(exec.stdout);
      expect(res.fr).toContain('<select name="choices" multiple=""><option value="Un">Un</option><option value="Deux">Deux</option></select>');
      expect(res.en).toContain('type="tel"');
      expect(res.en).toContain('required');
      expect(res.en).toContain('placeholder="[FR]Fallback label"');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
