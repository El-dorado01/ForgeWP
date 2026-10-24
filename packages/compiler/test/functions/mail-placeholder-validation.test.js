import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { validateFormsConfig, buildFormsPhp } from '../../lib/functions/forms.js';

const form = {
  mailTo: 'admin', fields: { name: { type: 'text' }, email: { type: 'email' } },
  clientFields: { enabled: true, seed: [{ name: 'message', type: 'textarea' }] },
  subject: '{name}', notificationBody: '{message}',
  confirmation: { enabled: true, emailField: 'email', subject: '{name}', body: 'Received' },
};

it('checks inline notifications exactly, including client seeds and per-locale seeds', () => {
  expect(() => validateFormsConfig({ contact: form })).not.toThrow();
  for (const key of ['subject', 'notificationBody']) {
    for (const value of ['{mail}', '{Email}']) {
      expect(() => validateFormsConfig({ contact: { ...form, [key]: value } })).toThrow('undeclared field');
    }
  }
  expect(() => validateFormsConfig({ contact: { ...form, clientFields: { enabled: true, seed: { en: form.clientFields.seed, fr: [] } } } })).not.toThrow();
  expect(() => validateFormsConfig({ contact: { ...form, confirmation: { ...form.confirmation, body: '{message}' } } })).toThrow('undeclared developer-owned field');
});

function save(post, stored = [{ name: 'current', type: 'text' }], multilingual = false) {
  const php = buildFormsPhp({ textDomain: 'test', forms: { contact: form }, ...(multilingual ? { i18n: { locales: ['en', 'fr'], defaultLocale: 'en' } } : {}) });
  const start = php.indexOf("if (!function_exists('forgewp_forms_admin_save_settings_handler'))");
  const end = php.indexOf("if (!function_exists('forgewp_render_forms_admin_page'))", start);
  const data = Buffer.from(JSON.stringify({ post: { forgewp_form: 'contact', ...post }, stored })).toString('base64');
  const result = spawnSync('php', ['-r', `
    $input = json_decode(base64_decode('${data}'), true); $_POST = $input['post']; $saved = null;
    function current_user_can($cap) { return true; }
    function check_admin_referer($action) {}
    function sanitize_key($s) { return $s; }
    function wp_unslash($s) { return $s; }
    function sanitize_text_field($s) { return $s; }
    function sanitize_textarea_field($s) { return $s; }
    function __($s, $domain) { return $s; }
    function esc_html($s) { return htmlspecialchars($s, ENT_QUOTES); }
    function wp_die($s, $title = '', $args = array()) { throw new Exception($s); }
    function forgewp_forms_get_client_fields($name, $seed, $lang) { global $input; return $lang === 'fr' ? array(array('name' => 'french')) : $input['stored']; }
    function update_option($key, $value, $autoload) { global $saved; $saved = $value; }
    function admin_url($s) { return $s; }
    function add_query_arg($args, $url) { return $url; }
    function wp_safe_redirect($url) { throw new Exception('redirect'); }
    function add_action($name, $fn) {}
    ${php.slice(start, end)}
    try { forgewp_forms_admin_save_settings_handler(); } catch (Exception $e) { echo json_encode(array('message' => $e->getMessage(), 'saved' => $saved)); }
  `], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

it('rejects unknown admin placeholders before saving and explains allowed case-sensitive keys', () => {
  for (const key of ['forgewp_notification_subject', 'forgewp_notification_body', 'forgewp_confirmation_subject', 'forgewp_confirmation_body']) {
    const result = save({ [key]: '{mail}' });
    expect(result.saved).toBeNull();
    expect(result.message).toContain('Unknown email placeholders');
    expect(result.message).toContain('mail');
    expect(result.message).toContain('name, email');
    expect(result.message).toContain('case-sensitive');
  }
  expect(save({ forgewp_notification_body: '{Email}' }).saved).toBeNull();
  expect(save({ forgewp_notification_body: '{message}' }).saved).toBeNull(); // removed client field
  expect(save({ forgewp_notification_body: '{current}' }).saved.notificationBody).toBe('{current}');
  expect(save({ forgewp_confirmation_body: '{current}' }).saved).toBeNull();
  expect(save({ forgewp_confirmation_body: '{email}' }).saved.confirmationBody).toBe('{email}');
  expect(save({ forgewp_notification_body: '{french}' }, [], true).saved.notificationBody).toBe('{french}');
});
