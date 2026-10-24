import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { it, expect } from 'vitest';
import { loadConfig } from '../../lib/load-config.js';
import { buildFormsPhp } from '../../lib/functions/forms.js';
import { resolveMailTemplates } from '../../lib/mail-templates.js';

it('resolves named defaults into mail/admin output, preserves overrides, and validates templates', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-mail-'));
  try {
    fs.mkdirSync(path.join(root, 'cms/mail'), { recursive: true });
    fs.writeFileSync(path.join(root, 'wp.config.ts'), `export default {configVersion:1,name:'Test',slug:'test',forms:{contact:{mailTo:'admin',fields:{name:{type:'text'},email:{type:'email'}},clientFields:{enabled:true,seed:[]},notificationTemplate:'receipt',confirmation:{enabled:true,emailField:'email',template:'receipt'}}}}`);
    const file = path.join(root, 'cms/mail/receipt.json');
    fs.writeFileSync(file, JSON.stringify({ subject: 'Hello {name}', body: "It's received, {name}. <?php no_execution(); ?>" }));
    const config = await loadConfig(root);
    expect(config.forms.contact.confirmation.subject).toBe('Hello {name}');
    const php = buildFormsPhp({ ...config, textDomain: 'test' });
    expect(php).toContain("isset($form_settings['notificationBody'])");
    expect(php).toContain('esc_textarea(');
    expect(php).toContain("It\\'s received");
    const helperStart = php.indexOf("        if (!function_exists('forgewp_forms_interpolate_template'))");
    const helperEnd = php.indexOf('        return str_replace', helperStart);
    const helper = php.slice(helperStart, helperEnd);
    const runtime = spawnSync('php', ['-r', `${helper}\necho json_encode(forgewp_forms_interpolate_template('Hello {name}, {missing} {array}', array('name' => 'A & B', 'array' => array('x'))));`], { encoding: 'utf8' });
    expect(runtime.status, runtime.stderr).toBe(0);
    expect(JSON.parse(runtime.stdout)).toBe('Hello A & B,  ');
    const generatedFile = path.join(root, 'forms.php');
    fs.writeFileSync(generatedFile, `<?php\n${php}`);
    const lint = spawnSync('php', ['-l', generatedFile], { encoding: 'utf8' });
    expect(lint.status, lint.stdout + lint.stderr).toBe(0);
    const forms = { contact: { fields: { name: {} }, subject: 'Custom', notificationTemplate: 'receipt' } };
    resolveMailTemplates(forms, root);
    expect(forms.contact.subject).toBe('Custom');
    expect(forms.contact.notificationBody).toContain('received');
    for (const template of ['missing', '../receipt']) {
      expect(() => resolveMailTemplates({ contact: { notificationTemplate: template } }, root)).toThrow();
    }
    fs.writeFileSync(file, JSON.stringify({ subject: '{message}', body: 'Text' }));
    const clientForm = { fields: { email: { type: 'email' } }, clientFields: { enabled: true, seed: { en: [{ name: 'message', type: 'text' }] } }, notificationTemplate: 'receipt' };
    resolveMailTemplates({ contact: clientForm }, root);
    expect(clientForm.subject).toBe('{message}');
    expect(() => resolveMailTemplates({ contact: { ...clientForm, confirmation: { enabled: true, template: 'receipt' } } }, root)).toThrow('undeclared developer-owned field');
    fs.writeFileSync(file, '{');
    expect(() => resolveMailTemplates(forms, root)).toThrow('Cannot read template');
    fs.writeFileSync(file, JSON.stringify({ subject: '{unknown}', body: 'Text' }));
    expect(() => resolveMailTemplates({ contact: { notificationTemplate: 'receipt' } }, root)).toThrow('undeclared field');
    const cli = path.resolve('bin/cli.js');
    const run = (name) => spawnSync(process.execPath, [cli, 'make:mail', name], { cwd: root, encoding: 'utf8' });
    expect(run('welcome').status).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'cms/mail/welcome.json'), 'utf8')).body).toBeTypeOf('string');
    expect(run('welcome').status).toBe(1);
    expect(run('../escape').status).toBe(1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
