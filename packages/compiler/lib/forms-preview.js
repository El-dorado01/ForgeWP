// Only public field descriptors cross into the local browser runtime.
export function buildFormsPreviewData(config) {
  const types = new Set(['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox']);
  const fields = (seed) => Array.isArray(seed) ? seed.filter((field) => field && typeof field.name === 'string' && types.has(field.type)).map((field) => ({
    name: field.name,
    label: typeof field.label === 'string' ? field.label : field.name,
    type: field.type,
    required: field.required === true,
    ...(Array.isArray(field.options) ? { options: field.options.filter((option) => typeof option === 'string') } : {}),
    ...(typeof field.placeholder === 'string' ? { placeholder: field.placeholder } : {}),
  })) : [];
  const forms = Object.create(null);
  const validation = Object.create(null);
  for (const [name, form] of Object.entries(config.forms || {})) {
    const seed = form?.clientFields?.enabled ? form.clientFields.seed : [];
    forms[name] = Array.isArray(seed) ? fields(seed) : Object.fromEntries(Object.entries(seed || {}).map(([locale, entries]) => [locale, fields(entries)]));
    if (form.mode !== 'shortcode') {
      validation[name] = fields(Object.entries(form.fields || {}).map(([fieldName, field]) => ({ ...field, name: fieldName })));
    }
  }
  return { forms, validation, locales: config.i18n?.locales || [], defaultLocale: config.i18n?.defaultLocale || config.i18n?.locales?.[0] || '' };
}

// Kept self-contained so its exact source can be installed by the virtual module.
function installFormsPreview(win, data) {
  const forms = Object.create(null);
  for (const [name, seed] of Object.entries(data.forms)) {
    forms[name] = { get fields() {
      if (Array.isArray(seed)) return seed;
      const segment = win.location?.pathname?.split('/')[1] || '';
      const locale = data.locales.includes(segment) ? segment : data.defaultLocale;
      return seed[locale] || [];
    }, get validationFields() {
      return Object.prototype.hasOwnProperty.call(data.validation, name) ? [...data.validation[name], ...this.fields] : undefined;
    } };
  }
  win._forgeWpMockForms = forms;
}

export function formsPreviewScript(data) {
  return `(${installFormsPreview.toString()})(window, ${JSON.stringify(data)});`;
}
