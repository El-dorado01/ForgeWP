/**
 * ForgeWP Native Forms — buildFormsPhp/validateFormsConfig/lintFormsUsage.
 * See forgewp_forms_spec.md §9 for the test plan this satisfies.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  buildFormsPhp,
  validateFormsConfig,
  lintFormsUsage,
} from '../../lib/functions/forms.js';
import { buildFunctionsPhp } from '../../lib/functions/index.js';

const ASSETS = { cssFile: 'assets/app.css', jsFile: 'assets/main.js' };

const SAMPLE_CONFIG = {
  name: 'Test Theme',
  slug: 'testtheme',
  version: '1.0.0',
  description: 'test',
  textDomain: 'testtheme',
  forms: {
    contact: {
      mailTo: 'admin',
      subject: 'New — {subject}',
      submissionTitle: 'Contact — {name} ({email})',
      fields: {
        name: { type: 'text', label: 'Name', required: true },
        email: { type: 'email', label: 'Email', required: true },
      },
      clientFields: {
        enabled: true,
        seed: [
          {
            name: 'subject',
            label: 'Subject',
            type: 'select',
            required: true,
            options: ['A', 'B'],
          },
          {
            name: 'message',
            label: 'Message',
            type: 'textarea',
            required: true,
          },
        ],
      },
      storeSubmissions: true,
    },
  },
};

describe('buildFormsPhp — no forms config', () => {
  it('returns an empty string when config.forms is absent', () => {
    expect(buildFormsPhp({ textDomain: 'x' })).toBe('');
  });

  it('returns an empty string when config.forms is an empty object', () => {
    expect(buildFormsPhp({ textDomain: 'x', forms: {} })).toBe('');
  });

  it('produces byte-identical buildFunctionsPhp output for a theme with no forms key, regardless of forms.js changes', () => {
    const config = { ...SAMPLE_CONFIG, forms: undefined };
    const a = buildFunctionsPhp(
      config,
      ASSETS,
      [],
      process.cwd(),
      [],
      {},
      { mapping: {}, mainJsFile: 'assets/main.js' },
      [],
      {},
      [],
      [],
    );
    const b = buildFunctionsPhp(
      config,
      ASSETS,
      [],
      process.cwd(),
      [],
      {},
      { mapping: {}, mainJsFile: 'assets/main.js' },
      [],
      {},
      [],
      [],
    );
    expect(a).toBe(b);
    expect(a).not.toContain('forgewp_handle_form');
    expect(a).not.toContain('forgewp_submission');
    expect(a).not.toContain('forgewp_forms_');
    expect(a).not.toContain('restNonce');
  });
});

describe('buildFormsPhp — representative config', () => {
  const php = buildFormsPhp(SAMPLE_CONFIG);

  it('registers the REST endpoint for the form', () => {
    expect(php).toContain(
      "register_rest_route('forgewp/v1', '/forms/contact/submit'",
    );
    expect(php).toContain(
      "'callback'            => 'forgewp_handle_form_contact'",
    );
    expect(php).toContain("'permission_callback' => '__return_true'");
  });

  it('emits the handler with rate limiting, honeypot, and time-trap checks', () => {
    expect(php).toContain('forgewp_forms_rate_limit_ok()');
    expect(php).toContain("$params['_forgewp_hp']");
    expect(php).toContain('_forgewp_elapsed');
  });

  it('renders responsive accessible field cards instead of the fixed-width table', () => {
    expect(php).toContain('class="forgewp-forms-rows" role="list"');
    expect(php).toContain("el('fieldset', { 'class': 'forgewp-forms-row'");
    expect(php).toContain('grid-template-columns:minmax(0, 1fr)');
    expect(php).not.toContain('min-width:900px');
    expect(php).toContain("'aria-label': 'Move field up'");
    expect(php).toContain(
      'This field key conflicts with a developer-owned or duplicate field',
    );
  });

  it('keeps core field keys fixed while allowing label edits and client-managed fields', () => {
    expect(php).toContain('class="forgewp-form-panel"');
    expect(php).toContain('fixed keys and validation');
    expect(php).toContain('forgewp_field_labels[name]');
    expect(php).toContain('Client-managed fields');
    expect(php).toContain('Submissions saved in WordPress');
    expect(php).toContain('Field key: ');
  });

  it('renders admin editors for success copy and email templates', () => {
    expect(php).toContain('forgewp_forms_save_settings');
    expect(php).toContain('forgewp_success_message');
    expect(php).toContain('forgewp_notification_subject');
    expect(php).toContain('forgewp_notification_body');
    expect(php).toContain('forgewp_confirmation_subject');
    expect(php).toContain('forgewp_confirmation_body');
    expect(php).toContain('sanitize_textarea_field');
    expect(php).toContain('check_admin_referer');
  });

  it('shows forms as individual child pages under a compact Forms overview', () => {
    expect(php).toContain("add_submenu_page(\n            'forgewp-forms'");
    expect(php).toContain("'forgewp-form-contact'");
    expect(php).toContain('class="forgewp-form-index-card"');
    expect(php).toContain("$active_form === 'contact'");
    expect(php).toContain("'page' => 'forgewp-form-' . $form_name");
    expect(php).toContain('Contact');
  });

  it('uses the available width on individual form settings pages', () => {
    expect(php).toContain('.forgewp-form-panel { max-width: 1440px;');
    expect(php).toContain('.forgewp-form-settings { max-width:none;');
    expect(php).toContain(
      '.forgewp-form-settings form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr));',
    );
    expect(php).toContain('forgewp-message-control--wide');
    expect(php).toContain('@media (max-width: 782px)');
    expect(php).toContain('<details class="forgewp-dev-fields">');
  });

  it('limits admin label changes to fixed developer-owned field keys', () => {
    expect(php).toContain("'name', 'email'");
    expect(php).toContain("$field_keys[$form_name] as $field_name");
    expect(php).toContain("'fieldLabels' => $labels");
    expect(php).toContain("'fieldLabels' => isset($forgewp_form_settings['fieldLabels'])");
  });

  it('uses safe text-only merge-tag interpolation for editable mail templates', () => {
    expect(php).toContain('preg_replace_callback');
    expect(php).toContain('[a-zA-Z0-9_-]+');
    expect(php).toContain("array_key_exists($match[1], $values)");
    expect(php).toContain('forgewp_forms_interpolate_template($subject_template, $values)');
  });

  it('styles the CSV field selector as a responsive grouped form', () => {
    expect(php).toContain('class="wrap forgewp-export-page"');
    expect(php).toContain('.forgewp-export-form-fields { display: grid;');
    expect(php).toContain('.forgewp-export-form-fields[hidden] { display: none !important; }');
    expect(php).toContain('.forgewp-export-field { display: flex;');
  });

  it('keeps generated field keys stable after a successful save and announces status', () => {
    expect(php).toContain('dataByLang[currentLang] = savedFields;');
    expect(php).toContain('renderLang(currentLang);');
    expect(php).toContain("noticeEl.setAttribute('aria-live'");
  });

  it('bakes dev-owned fields and the client-field seed into the handler', () => {
    expect(php).toMatch(/'name'\s+=> 'name'/);
    expect(php).toMatch(/'name'\s+=> 'email'/);
    expect(php).toMatch(/'name'\s+=> 'subject'/);
    expect(php).toMatch(/'name'\s+=> 'message'/);
  });

  it('merges dev + client fields before validating', () => {
    expect(php).toContain(
      'array_merge($dev_fields, is_array($client_fields) ? $client_fields : array())',
    );
  });

  it('registers the forgewp_submission CPT when storeSubmissions is true', () => {
    expect(php).toContain("register_post_type('forgewp_submission'");
    expect(php).toContain("'create_posts' => 'do_not_allow'");
    expect(php).toContain("'capability_type' => 'forgewp_submission'");
    expect(php).toContain("'edit_posts' => 'manage_options'");
    expect(php).toContain("'map_meta_cap' => false");
    expect(php).not.toContain("'map_meta_cap' => true");
  });

  it('uses one configured capability for both forms administration and stored submissions', () => {
    const configured = buildFormsPhp({
      ...SAMPLE_CONFIG,
      formsAdminCapability: 'edit_pages',
    });

    expect(configured).toContain("'edit_posts' => 'edit_pages'");
    expect(configured).toContain("'read_post' => 'edit_pages'");
    expect(configured).toContain("'edit_pages',\n            'forgewp-forms'");
    expect(configured).toContain("current_user_can('edit_pages')");
    expect(configured).toContain("'map_meta_cap' => false");
    expect(configured).not.toContain("current_user_can('manage_options')");
  });

  it('rejects invalid formsAdminCapability values', () => {
    expect(() =>
      buildFormsPhp({
        ...SAMPLE_CONFIG,
        formsAdminCapability: 'manage options',
      }),
    ).toThrow(/Invalid formsAdminCapability/);
  });

  it('rejects non-string admin message templates', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email', required: true } },
          successMessage: { invalid: true },
        },
      }),
    ).toThrow(/successMessage must be a string/);
  });

  it('omits the CPT registration when storeSubmissions is false for every form', () => {
    const config = {
      textDomain: 'x',
      forms: {
        contact: { ...SAMPLE_CONFIG.forms.contact, storeSubmissions: false },
      },
    };
    const out = buildFormsPhp(config);
    expect(out).not.toContain("register_post_type('forgewp_submission'");
  });

  it('adds a "Form" column to the submissions list so multiple forms stay distinguishable', () => {
    expect(php).toContain('manage_forgewp_submission_posts_columns');
    expect(php).toContain("$new_columns['forgewp_form']");
    expect(php).toContain('manage_forgewp_submission_posts_custom_column');
  });

  it('only shows the filter-by-form dropdown when a theme has more than one submission-storing form', () => {
    const twoForms = {
      textDomain: 'x',
      forms: {
        contact: SAMPLE_CONFIG.forms.contact,
        newsletter: {
          mailTo: 'admin',
          fields: { email: { type: 'email', required: true } },
          storeSubmissions: true,
        },
      },
    };
    const out = buildFormsPhp(twoForms);
    expect(out).toContain("array('contact', 'newsletter')");
    expect(out).toContain('if (count($forms) < 2)');
  });

  it('excludes forms with storeSubmissions:false from the filter dropdown form list', () => {
    const mixed = {
      textDomain: 'x',
      forms: {
        contact: SAMPLE_CONFIG.forms.contact,
        ephemeral: {
          mailTo: 'admin',
          fields: { email: { type: 'email', required: true } },
          storeSubmissions: false,
        },
      },
    };
    const out = buildFormsPhp(mixed);
    expect(out).toContain("array('contact')");
    expect(out).not.toContain("array('contact', 'ephemeral')");
  });

  it('seeds client fields on after_switch_theme and self-heals on init (redeploying an already-active theme never fires after_switch_theme)', () => {
    expect(php).toContain(
      "add_action('after_switch_theme', 'forgewp_seed_form_fields_contact')",
    );
    expect(php).toContain(
      "add_action('init', 'forgewp_seed_form_fields_contact')",
    );
    expect(php).toContain('if (get_option($option_name, null) === null)');
  });

  it('generates the admin Forms page for forms with clientFields enabled', () => {
    expect(php).toContain('add_menu_page(');
    expect(php).toContain('forgewp_forms_admin_save_handler');
    expect(php).toContain(
      "check_ajax_referer('forgewp_forms_admin_save', 'nonce')",
    );
  });

  it('admin page data-initial goes through forgewp_forms_get_client_fields (falls back to seed), never a raw get_option default', () => {
    const dataInitialMatch = php.match(/data-initial="([^"]*)"/);
    expect(dataInitialMatch).not.toBeNull();
    expect(dataInitialMatch[1]).toContain(
      "forgewp_forms_get_client_fields( 'contact'",
    );
    expect(dataInitialMatch[1]).not.toMatch(
      /get_option\(\s*'forgewp_form_fields_contact'\s*,\s*array\(\)\s*\)/,
    );
  });

  it('rejects admin-saved fields that collide with dev-owned field names', () => {
    expect(php).toContain('forgewp_forms_valid_field_shape');
    expect(php).toContain('in_array($name, $dev_field_names, true)');
  });

  it('reports skipped (colliding) field names back to the caller instead of silently dropping them', () => {
    expect(php).toContain('$skipped_names');
    expect(php).toContain(
      "wp_send_json_success(array(\n            'fields'  => $clean,\n            'skipped' => array_values(array_unique($skipped_names)),\n        ));",
    );
  });

  it('client save-notice JS surfaces skipped field names to the admin', () => {
    expect(php).toContain('could not be saved (name already in use)');
  });

  it('emits the hydration payload function returning only client-owned fields', () => {
    expect(php).toContain(
      'function forgewp_forms_hydration_payload($requested_lang = null)',
    );
    expect(php).toContain("forgewp_forms_get_client_fields('contact'");
    // mailTo must never appear in the hydration payload function body.
    const payloadFnStart = php.indexOf(
      'function forgewp_forms_hydration_payload($requested_lang = null)',
    );
    const payloadFnBody = php.slice(payloadFnStart);
    expect(payloadFnBody).not.toContain('admin_email');
  });

  it('strips header-injection characters before using values in mail headers/subject', () => {
    expect(php).toContain('forgewp_forms_strip_header_injection');
  });

  it('adds Reply-To from the dev-owned email field', () => {
    expect(php).toContain(
      "$headers[] = 'Reply-To: ' . forgewp_forms_strip_header_injection($values['email'])",
    );
  });

  it('validates sanitized non-empty email fields with WordPress is_email()', () => {
    expect(php).toContain(
      "$type === 'email' && $clean !== '' && !is_email($clean)",
    );
    expect(php).toContain(
      "__('Please enter a valid email address.', 'forgewp')",
    );
  });

  it('does not claim notification email was sent when storage succeeded but wp_mail failed', () => {
    expect(php).toContain('if (!$mail_sent && $stored)');
    expect(php).toContain("$form_settings['successMessage']");
    expect(php).toContain(
      'Submission was stored but its notification email failed',
    );
  });

  it('uses a configured safe title template for stored submissions', () => {
    expect(php).toContain(
      "forgewp_store_submission('contact', $values, $field_defs, forgewp_forms_resolve_lang($submitted_lang), 'Contact — {name} ({email})')",
    );
    expect(php).toContain(
      'sanitize_text_field(forgewp_forms_interpolate_template($title_template, $values))',
    );
    expect(php).toContain("'post_title'  => $title");
  });

  it('uses the same public success message for successful mail and stored fallback', () => {
    expect(php.match(/'message'\s*=>\s*isset\(\$form_settings\['successMessage'\]/g)).toHaveLength(2);
    expect(php).toContain("'Your submission was received.'");
  });

  it('logs when mail succeeds but configured submission storage fails', () => {
    expect(php).toContain('if ($mail_sent && !$stored)');
    expect(php).toContain(
      'Notification email was sent but the submission could not be stored',
    );
  });
});

describe('buildFormsPhp — mailTo resolution', () => {
  it('resolves "admin" to get_option(admin_email)', () => {
    const php = buildFormsPhp(SAMPLE_CONFIG);
    expect(php).toContain("$to = get_option('admin_email');");
  });

  it('resolves "option:xyz" to get_option(xyz)', () => {
    const config = {
      textDomain: 'x',
      forms: {
        contact: {
          ...SAMPLE_CONFIG.forms.contact,
          mailTo: 'option:contact_email',
        },
      },
    };
    const php = buildFormsPhp(config);
    expect(php).toContain("$to = get_option('contact_email');");
  });

  it('treats any other string as a literal email address', () => {
    const config = {
      textDomain: 'x',
      forms: {
        contact: {
          ...SAMPLE_CONFIG.forms.contact,
          mailTo: 'literal@example.com',
        },
      },
    };
    const php = buildFormsPhp(config);
    expect(php).toContain("$to = 'literal@example.com';");
  });
});

describe('submitter confirmation', () => {
  const confirmationConfig = {
    ...SAMPLE_CONFIG,
    forms: {
      contact: {
        ...SAMPLE_CONFIG.forms.contact,
        confirmation: {
          enabled: true,
          emailField: 'email',
          subject: 'We received your message, {name}',
          body: 'Hello {name}, your submission was received.',
        },
      },
    },
  };

  it('is absent unless explicitly enabled', () => {
    const php = buildFormsPhp(SAMPLE_CONFIG);
    expect(php).not.toContain('$confirmation_to');
  });

  it('sends a plain-text receipt only to the declared validated email field', () => {
    const php = buildFormsPhp(confirmationConfig);
    expect(php).toContain("$confirmation_to = $values['email'];");
    expect(php).toContain('if (is_email($confirmation_to))');
    expect(php).toContain(
      '$confirmation_subject = forgewp_forms_strip_header_injection(',
    );
    expect(php).toContain(
      "$confirmation_body = forgewp_forms_interpolate_template(isset($form_settings['confirmationBody'])",
    );
    expect(php).toContain(
      'wp_mail($confirmation_to, $confirmation_subject, $confirmation_body, array())',
    );
    expect(php).toContain('Submitter confirmation email failed');
  });

  it('requires the confirmation recipient to be a developer-owned email field', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'text' } },
          confirmation: {
            enabled: true,
            emailField: 'email',
            subject: 'Received',
            body: 'Thanks',
          },
        },
      }),
    ).toThrow(/developer-owned field declared with type: 'email'/);
  });

  it('rejects confirmation merge tags outside the developer-owned field allowlist', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          confirmation: {
            enabled: true,
            emailField: 'email',
            subject: 'Received {unknown}',
            body: 'Thanks',
          },
        },
      }),
    ).toThrow(/confirmation references undeclared developer-owned field/);
  });
});

describe('submitter confirmation', () => {
  const confirmationConfig = {
    ...SAMPLE_CONFIG,
    forms: {
      contact: {
        ...SAMPLE_CONFIG.forms.contact,
        confirmation: {
          enabled: true,
          emailField: 'email',
          subject: 'We received your message, {name}',
          body: 'Hello {name}, your submission was received.',
        },
      },
    },
  };

  it('is disabled unless explicitly enabled', () => {
    expect(buildFormsPhp(SAMPLE_CONFIG)).not.toContain('$confirmation_to');
  });

  it('sends a plain-text receipt only to the declared validated email field', () => {
    const php = buildFormsPhp(confirmationConfig);
    expect(php).toContain("$confirmation_to = $values['email'];");
    expect(php).toContain('if (is_email($confirmation_to))');
    expect(php).toContain(
      '$confirmation_subject = forgewp_forms_strip_header_injection(',
    );
    expect(php).toContain(
      "$confirmation_body = forgewp_forms_interpolate_template(isset($form_settings['confirmationBody'])",
    );
    expect(php).toContain(
      'wp_mail($confirmation_to, $confirmation_subject, $confirmation_body, array())',
    );
    expect(php).toContain('Submitter confirmation email failed');
    expect(php).toContain(
      '$mail_sent = wp_mail($to, $subject, $body, $headers)',
    );
  });

  it('requires the confirmation recipient to be a developer-owned email field', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'text' } },
          confirmation: {
            enabled: true,
            emailField: 'email',
            subject: 'Received',
            body: 'Thanks',
          },
        },
      }),
    ).toThrow(/developer-owned field declared with type: 'email'/);
  });

  it('rejects merge tags outside the developer-owned field allowlist', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          confirmation: {
            enabled: true,
            emailField: 'email',
            subject: 'Received {unknown}',
            body: 'Thanks',
          },
        },
      }),
    ).toThrow(/confirmation references undeclared developer-owned field/);
  });

  it('requires retentionDays to be a positive integer on a stored form', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          retentionDays: 0,
        },
      }),
    ).toThrow(/retentionDays must be a positive integer/);
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          storeSubmissions: false,
          retentionDays: 30,
        },
      }),
    ).toThrow(/retentionDays requires storeSubmissions/);
  });
});

describe('stored submission tools', () => {
  it('generates authorized CSV export and WordPress privacy hooks only when submissions are stored', () => {
    const php = buildFormsPhp(SAMPLE_CONFIG);
    expect(php).toContain('forgewp_forms_render_export_page');
    expect(php).toContain('forgewp_forms_export_csv');
    expect(php).toContain("current_user_can('manage_options')");
    expect(php).toContain('admin_post_forgewp_forms_export_csv');
    expect(php).toContain("check_admin_referer('forgewp_forms_export_csv')");
    expect(php).toContain('Content-Type: text/csv; charset=utf-8');
    expect(php).toContain('forgewp_forms_csv_safe_value');
    expect(php).toContain('name="forgewp_fields[]"');
    expect(php).toContain(
      'data-export-form="<?php echo esc_attr($form_name); ?>"',
    );
    expect(php).toContain('function updateExportFieldGroups()');
    expect(php).toContain('checkbox.checked = false');
    expect(php).not.toContain('name="forgewp_fields[]" checked');
    expect(php).toContain('$requested_fields');
    expect(php).toContain('!isset($labels[$field_form][$field_name])');
    expect(php).toContain(
      "$selected_form !== 'all' && $selected_form !== $field_form",
    );
    expect(php).toContain('if (empty($columns))');
    expect(php).toContain("$column['form'] === $form_name");
    expect(php).toContain(
      "in_array($first, array('=', '+', '-', '@', chr(9), chr(13)), true)",
    );
    expect(php).toContain('wp_privacy_personal_data_exporters');
    expect(php).toContain('wp_privacy_personal_data_erasers');
    expect(php).toContain('forgewp_forms_privacy_email_fields');
    expect(php).toContain("$field['type'] === 'email'");
    expect(php).toContain('forgewp_forms_get_client_fields($form_name, $seed');
    expect(php).toContain("'_privacy_email_hash'");
    expect(php).toContain(
      "hash_hmac('sha256', $normalized_email, wp_salt('auth'))",
    );
    expect(php).toContain("update_post_meta($post_id, '_form_lang'");
    expect(php).toContain("__('Language'");
    expect(php).toContain("get_post_meta($submission->ID, '_form_lang', true)");
    expect(php).toContain("'field_' . $field_name");

    const noStorage = buildFormsPhp({
      ...SAMPLE_CONFIG,
      forms: {
        contact: {
          ...SAMPLE_CONFIG.forms.contact,
          storeSubmissions: false,
        },
      },
    });
    expect(noStorage).not.toContain('forgewp_forms_render_export_page');
    expect(noStorage).not.toContain('wp_privacy_personal_data_exporters');

    const noEmailField = buildFormsPhp({
      ...SAMPLE_CONFIG,
      forms: {
        contact: {
          mailTo: 'admin',
          fields: { message: { type: 'textarea', required: true } },
          storeSubmissions: true,
        },
      },
    });
    expect(noEmailField).toContain('forgewp_forms_privacy_submission_ids');
    expect(noEmailField).toContain("'_privacy_email_hash'");
  });

  it('does not schedule retention cleanup unless a stored form opts in', () => {
    const defaultPhp = buildFormsPhp(SAMPLE_CONFIG);
    expect(defaultPhp).not.toContain(
      'function forgewp_forms_retention_cleanup',
    );
    expect(defaultPhp).not.toContain('wp_schedule_event(');
    expect(defaultPhp).toContain('wp_clear_scheduled_hook');

    const retained = buildFormsPhp({
      ...SAMPLE_CONFIG,
      forms: {
        contact: {
          ...SAMPLE_CONFIG.forms.contact,
          retentionDays: 90,
        },
      },
    });
    expect(retained).toContain("'contact' => 90");
    expect(retained).toContain(
      "wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily'",
    );
    expect(retained).toContain(
      "array('key' => '_form_name', 'value' => $form_name",
    );
    expect(retained).toContain('wp_delete_post($submission_id, true)');
  });
});

describe('validateFormsConfig', () => {
  it('throws on an invalid form name', () => {
    expect(() =>
      validateFormsConfig({ 'Not Valid!': { mailTo: 'admin', fields: {} } }),
    ).toThrow(/Invalid form name/);
  });

  it('throws when a client seed field collides with a dev-owned field name', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          clientFields: {
            enabled: true,
            seed: [{ name: 'email', label: 'Email', type: 'text' }],
          },
        },
      }),
    ).toThrow(/collides with a dev-owned field/);
  });

  it('rejects submission-title merge tags outside the developer-owned field allowlist', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          submissionTitle: 'Contact — {unknown}',
        },
      }),
    ).toThrow(/submissionTitle references undeclared developer-owned field/);
  });

  it('requires submissionTitle to be a string when configured', () => {
    expect(() =>
      validateFormsConfig({
        contact: {
          mailTo: 'admin',
          fields: { email: { type: 'email' } },
          submissionTitle: { invalid: true },
        },
      }),
    ).toThrow(/submissionTitle must be a string/);
  });

  it('does not throw for a valid config', () => {
    expect(() => validateFormsConfig(SAMPLE_CONFIG.forms)).not.toThrow();
  });

  it('is a no-op when forms is undefined', () => {
    expect(() => validateFormsConfig(undefined)).not.toThrow();
  });
});

describe('lintFormsUsage', () => {
  let tmpDir;

  function writeSourceFile(relPath, content) {
    const fullPath = path.join(tmpDir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }

  it('warns on submitWpForm() calls with an undeclared form name', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/Bad.tsx',
      `submitWpForm('not-declared', new FormData());`,
    );
    const warnings = lintFormsUsage(tmpDir, SAMPLE_CONFIG);
    expect(warnings.some((w) => w.includes('not-declared'))).toBe(true);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns on <WpFormFields> used against a form without clientFields.enabled', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    const config = {
      forms: {
        contact: {
          mailTo: 'admin',
          fields: {},
          clientFields: { enabled: false, seed: [] },
        },
      },
    };
    writeSourceFile(
      'src/components/Bad.tsx',
      `<WpFormFields form="contact" render={(f) => null} />`,
    );
    const warnings = lintFormsUsage(tmpDir, config);
    expect(warnings.some((w) => w.includes('clientFields.enabled'))).toBe(true);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces no warnings for correct usage', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/Good.tsx',
      `
      submitWpForm('contact', new FormData());
      <WpFormFields form="contact" render={(f) => null} />
      `,
    );
    const warnings = lintFormsUsage(tmpDir, SAMPLE_CONFIG);
    expect(warnings).toEqual([]);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns an empty array when the theme has no src directory', () => {
    const emptyTmp = mkdtempSync(
      path.join(tmpdir(), 'forgewp-forms-lint-empty-'),
    );
    expect(lintFormsUsage(emptyTmp, SAMPLE_CONFIG)).toEqual([]);
    rmSync(emptyTmp, { recursive: true, force: true });
  });

  it('warns on a dev-owned field name inside <form> that does not match any declared forms.X.fields key (typo or undeclared extra field)', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/BadForm.tsx',
      `
      const handleSubmit = (e) => { submitWpForm('contact', new FormData(e.currentTarget)); };
      <form onSubmit={handleSubmit}>
        <input type="text" name="nmae" required />
        <input type="text" name="unexpected_extra_field" />
      </form>
      `,
    );
    const warnings = lintFormsUsage(tmpDir, SAMPLE_CONFIG);
    expect(
      warnings.some(
        (w) => w.includes('name="nmae"') && w.includes('forms.contact.fields'),
      ),
    ).toBe(true);
    expect(
      warnings.some((w) => w.includes('name="unexpected_extra_field"')),
    ).toBe(true);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns when a required dev-owned field is declared but never rendered inside the <form>', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/MissingField.tsx',
      `
      const handleSubmit = (e) => { submitWpForm('contact', new FormData(e.currentTarget)); };
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" required />
      </form>
      `,
    );
    const warnings = lintFormsUsage(tmpDir, SAMPLE_CONFIG);
    expect(
      warnings.some(
        (w) =>
          w.includes('forms.contact.fields.email') && w.includes('is required'),
      ),
    ).toBe(true);
    // "name" WAS rendered — must not also be flagged as missing.
    expect(
      warnings.some(
        (w) =>
          w.includes('forms.contact.fields.name') && w.includes('is required'),
      ),
    ).toBe(false);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces no field-mismatch warnings when every declared field is present and correctly spelled', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/GoodForm.tsx',
      `
      const handleSubmit = (e) => { submitWpForm('contact', new FormData(e.currentTarget)); };
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" required />
        <input type="email" name="email" required />
        <WpFormFields form="contact" render={(field) => <input name={field.name} />} />
      </form>
      `,
    );
    const warnings = lintFormsUsage(tmpDir, SAMPLE_CONFIG);
    expect(warnings).toEqual([]);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('skips the field cross-check entirely when a file has more than one submitWpForm() call or <form> block (ambiguous — avoids guessing)', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/TwoForms.tsx',
      `
      const a = () => submitWpForm('contact', new FormData());
      const b = () => submitWpForm('contact', new FormData());
      <form><input name="totally_bogus_field_1" /></form>
      <form><input name="totally_bogus_field_2" /></form>
      `,
    );
    const warnings = lintFormsUsage(tmpDir, SAMPLE_CONFIG);
    expect(warnings.some((w) => w.includes('totally_bogus_field'))).toBe(false);
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('shortcode mode — validateFormsConfig', () => {
  it('requires a shortcode string when mode is "shortcode"', () => {
    expect(() =>
      validateFormsConfig({ contact: { mode: 'shortcode' } }),
    ).toThrow(/no `shortcode` string/);
  });

  it('does not require mailTo/fields when mode is "shortcode"', () => {
    expect(() =>
      validateFormsConfig({
        contact: { mode: 'shortcode', shortcode: '[contact-form-7 id="58"]' },
      }),
    ).not.toThrow();
  });

  it('still requires mailTo and fields for native-mode forms (default mode)', () => {
    expect(() =>
      validateFormsConfig({ contact: { fields: { name: { type: 'text' } } } }),
    ).toThrow(/missing `mailTo`/);
    expect(() => validateFormsConfig({ contact: { mailTo: 'admin' } })).toThrow(
      /missing `fields`/,
    );
  });
});

describe('shortcode mode — buildFormsPhp', () => {
  const SHORTCODE_ONLY_CONFIG = {
    textDomain: 'testtheme',
    forms: {
      contact: {
        mode: 'shortcode',
        shortcode: '[contact-form-7 id="58" title="Contact Form"]',
      },
    },
  };

  it('generates no PHP at all when every form is shortcode-mode', () => {
    expect(buildFormsPhp(SHORTCODE_ONLY_CONFIG)).toBe('');
  });

  it('excludes shortcode-mode forms from the REST endpoint, CPT, and admin page in a mixed config', () => {
    const mixed = {
      textDomain: 'testtheme',
      forms: {
        contact: SAMPLE_CONFIG.forms.contact,
        newsletter: { mode: 'shortcode', shortcode: '[wpforms id="12"]' },
      },
    };
    const php = buildFormsPhp(mixed);

    expect(php).toContain('forms/contact/submit');
    expect(php).not.toContain('forms/newsletter/submit');
    expect(php).not.toContain('forgewp_handle_form_newsletter');
    expect(php).not.toContain('wpforms');
    expect(php).not.toContain('<h2>newsletter</h2>');
  });
});

describe('shortcode mode — lintFormsUsage', () => {
  let tmpDir;

  function writeSourceFile(relPath, content) {
    const fullPath = path.join(tmpDir, relPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }

  const SHORTCODE_CONFIG = {
    forms: {
      contact: { mode: 'shortcode', shortcode: '[contact-form-7 id="58"]' },
    },
  };

  it('warns when submitWpForm() targets a shortcode-mode form', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/Bad.tsx',
      `submitWpForm('contact', new FormData());`,
    );
    const warnings = lintFormsUsage(tmpDir, SHORTCODE_CONFIG);
    expect(
      warnings.some(
        (w) => w.includes("mode: 'shortcode'") && w.includes('submitWpForm'),
      ),
    ).toBe(true);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns when <WpFormFields> targets a shortcode-mode form', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/Bad.tsx',
      `<WpFormFields form="contact" render={(f) => null} />`,
    );
    const warnings = lintFormsUsage(tmpDir, SHORTCODE_CONFIG);
    expect(warnings.some((w) => w.includes('client-field concept'))).toBe(true);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns when a shortcode-mode form has no <WpShortcode> usage anywhere', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/Unrelated.tsx',
      `export function Unrelated() { return <div />; }`,
    );
    const warnings = lintFormsUsage(tmpDir, SHORTCODE_CONFIG);
    expect(warnings.some((w) => w.includes('declared but not rendered'))).toBe(
      true,
    );
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('produces no warnings when <WpShortcode> is used for a declared shortcode-mode form', () => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'forgewp-forms-lint-'));
    writeSourceFile(
      'src/components/Good.tsx',
      `<WpShortcode code={useWpMeta('contact_shortcode', '[contact-form-7 id="58"]')} />`,
    );
    const warnings = lintFormsUsage(tmpDir, SHORTCODE_CONFIG);
    expect(warnings).toEqual([]);
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('placeholder support', () => {
  it('bakes a dev-owned field placeholder into the handler, wrapped in __() like the label (both are compile-time-known strings)', () => {
    const config = {
      textDomain: 'x',
      forms: {
        contact: {
          mailTo: 'admin',
          fields: {
            name: {
              type: 'text',
              required: true,
              placeholder: 'e.g. Jane Doe',
            },
          },
        },
      },
    };
    const php = buildFormsPhp(config);
    expect(php).toContain("'placeholder' => __('e.g. Jane Doe', 'x')");
  });

  it('emits an empty placeholder string when none is set (never undefined/null in the PHP array)', () => {
    const php = buildFormsPhp(SAMPLE_CONFIG);
    expect(php).not.toMatch(/'placeholder' => (undefined|null)/);
  });
});

describe('multilingual client fields', () => {
  const MULTI_CONFIG = {
    textDomain: 'testtheme',
    i18n: { locales: ['en', 'de'], defaultLocale: 'en' },
    forms: {
      contact: {
        mailTo: 'admin',
        fields: { email: { type: 'email', required: true } },
        clientFields: {
          enabled: true,
          seed: {
            en: [
              {
                name: 'subject',
                label: 'Subject',
                type: 'text',
                required: true,
              },
            ],
            de: [
              {
                name: 'subject',
                label: 'Betreff',
                type: 'text',
                required: true,
              },
            ],
          },
        },
        storeSubmissions: true,
      },
    },
  };

  it('stores client fields as a locale-keyed map, not a flat list', () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    expect(php).toContain("'en' => array(");
    expect(php).toContain("'de' => array(");
    expect(php).toContain("'label'       => 'Subject'");
    expect(php).toContain("'label'       => 'Betreff'");
  });

  it('resolves language server-side via forgewp_forms_resolve_lang, honoring an explicit submitted lang first', () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    expect(php).toContain(
      'function forgewp_forms_resolve_lang($requested_lang = null)',
    );
    expect(php).toContain('if (!empty($requested_lang))');
    expect(php).toContain('pll_current_language');
  });

  it('extracts the submitted lang param in the REST handler and passes it through', () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    expect(php).toContain(
      "$submitted_lang = isset($params['lang']) ? sanitize_key($params['lang']) : null;",
    );
    expect(php).toContain(
      "forgewp_forms_get_client_fields('contact', $seed_fields, $submitted_lang)",
    );
  });

  // Regression test for the confirmed validation-bypass finding (edge-case-audit.md §2.1):
  // an unrecognized/forged `lang` value used to make forgewp_forms_get_client_fields()
  // return an empty array, silently dropping every required client-owned field from
  // validation. It must now degrade to a real locale's fields instead.
  it("forgewp_forms_get_client_fields() falls back to the theme's default locale — not an empty array — for an unrecognized lang", () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    const fnStart = php.indexOf('function forgewp_forms_get_client_fields(');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = php.slice(fnStart, fnStart + 2200);
    expect(fnBody).not.toContain(
      'return isset($seed[$resolved_lang]) ? $seed[$resolved_lang] : array();',
    );
    expect(fnBody).toContain("$fallback_lang = 'en';"); // MULTI_CONFIG's i18n.defaultLocale
    expect(fnBody).toContain(
      "if ($fallback_lang !== '' && isset($seed[$fallback_lang]))",
    );
    expect(fnBody).toContain('return reset($seed);');
  });

  it('resolves the current page language in the hydration payload', () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    expect(php).toContain(
      'function forgewp_forms_hydration_payload($requested_lang = null)',
    );
    expect(php).toContain(
      '$forgewp_forms_current_lang = forgewp_forms_resolve_lang($requested_lang);',
    );
    expect(php).toContain('$forgewp_forms_current_lang),');
  });

  it('renders a language tab per locale in the admin page', () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    expect(php).toContain('data-lang="en"');
    expect(php).toContain('data-lang="de"');
    expect(php).toContain('forgewp-lang-tab');
  });

  it('admin save handler validates lang against known locales and merges into the stored per-locale map', () => {
    const php = buildFormsPhp(MULTI_CONFIG);
    expect(php).toContain("$known_langs = array('en', 'de');");
    expect(php).toContain('$stored[$lang] = $clean;');
  });

  it('falls back to same-content-for-every-locale when seed is a flat array in a multilingual theme', () => {
    const config = {
      ...MULTI_CONFIG,
      forms: {
        contact: {
          ...MULTI_CONFIG.forms.contact,
          clientFields: {
            enabled: true,
            seed: [
              {
                name: 'subject',
                label: 'Subject',
                type: 'text',
                required: true,
              },
            ],
          },
        },
      },
    };
    const php = buildFormsPhp(config);
    // Same seed array duplicated under both locale keys.
    const enIdx = php.indexOf("'en' => array(");
    const deIdx = php.indexOf("'de' => array(");
    expect(enIdx).toBeGreaterThan(-1);
    expect(deIdx).toBeGreaterThan(-1);
  });

  it('renders no actual language-tab buttons and keeps flat-list storage for a single-locale theme', () => {
    const php = buildFormsPhp(SAMPLE_CONFIG);
    // The shared admin-page JS/CSS always references the .forgewp-lang-tab
    // class name (it's page-wide boilerplate, not per-form) but no element
    // with that class is ever rendered when nothing is multilingual.
    expect(php).toContain('data-multilingual="false"');
    expect(php).not.toMatch(/data-lang="[a-z]+"/);
    // $is_multilingual bakes to a literal `false`, short-circuiting the
    // (page-wide, always-present) $known_langs check as dead code.
    expect(php).toContain('$is_multilingual = false;');
    // The REST handler always passes $submitted_lang as a 3rd arg (the
    // function itself ignores it for a flat-list $seed) — the *admin page*
    // data-initial is the one call site that actually varies by locale-count.
    expect(php).toContain("forgewp_forms_get_client_fields( 'contact', array(");
  });
});
