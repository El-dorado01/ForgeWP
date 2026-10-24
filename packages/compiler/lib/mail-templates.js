import fs from 'node:fs';
import path from 'node:path';

/** Resolve plain data into existing mail defaults; never ship source files to the browser. */
export function resolveMailTemplates(forms, themeRoot) {
  if (!forms) return;
  for (const [name, form] of Object.entries(forms)) {
    if (form.mode === 'shortcode') continue;
    const resolve = (template, target, subjectKey, bodyKey, allowClient = false) => {
      if (template === undefined) return;
      if (typeof template !== 'string' || !/^[a-z][a-z0-9-]*$/.test(template)) {
        throw new Error(`[ForgeWP Mail] forms.${name}: template must be a lowercase name such as "contact-receipt".`);
      }
      const file = path.join(themeRoot, 'cms/mail', `${template}.json`);
      let data;
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
      catch (error) { throw new Error(`[ForgeWP Mail] Cannot read template cms/mail/${template}.json for form "${name}": ${error.message}`); }
      if (!data || typeof data.subject !== 'string' || typeof data.body !== 'string') {
        throw new Error(`[ForgeWP Mail] ${template}.json requires plain-text subject and body strings.`);
      }
      for (const [key, value] of [[subjectKey, data.subject], [bodyKey, data.body]]) {
        // Explicit per-form text takes priority over the reusable source default.
        if (target[key] !== undefined) continue;
        for (const [, field] of value.matchAll(/\{([a-zA-Z0-9_-]+)\}/g)) {
          const seed = form.clientFields?.enabled ? form.clientFields.seed || [] : [];
          const clientFields = Array.isArray(seed) ? seed : Object.values(seed).flat();
          if (!Object.hasOwn(form.fields || {}, field) && !(allowClient && clientFields.some((entry) => entry.name === field))) {
            throw new Error(`[ForgeWP Mail] ${template}.json references undeclared ${allowClient ? '' : 'developer-owned '}field "${field}" in form "${name}".`);
          }
        }
        target[key] = value;
      }
    };
    resolve(form.notificationTemplate, form, 'subject', 'notificationBody', true);
    if (form.confirmation?.enabled) resolve(form.confirmation.template, form.confirmation, 'subject', 'body');
  }
}
