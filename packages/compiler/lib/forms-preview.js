// Only public field descriptors cross into the local browser runtime.
export function buildFormsPreviewData(config) {
  const types = new Set([
    'text',
    'email',
    'tel',
    'number',
    'textarea',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'hidden',
  ]);
  const fields = (seed) =>
    Array.isArray(seed)
      ? seed
          .filter((field) => field && typeof field.name === 'string' && types.has(field.type))
          .map((field) => ({
            name: field.name,
            label: typeof field.label === 'string' ? field.label : field.name,
            type: field.type,
            required: field.required === true,
            ...(Array.isArray(field.options)
              ? { options: field.options.filter((option) => typeof option === 'string') }
              : {}),
            ...(field.type === 'multiselect' || (field.type === 'select' && field.multiple === true)
              ? { multiple: true }
              : {}),
            ...(field.type === 'number' && typeof field.min === 'number' && Number.isFinite(field.min)
              ? { min: field.min }
              : {}),
            ...(field.type === 'number' && typeof field.max === 'number' && Number.isFinite(field.max)
              ? { max: field.max }
              : {}),
            ...(field.type === 'number' &&
            typeof field.step === 'number' &&
            Number.isFinite(field.step) &&
            field.step > 0
              ? { step: field.step }
              : {}),
            ...(typeof field.defaultValue === 'string' ? { defaultValue: field.defaultValue } : {}),
            ...(typeof field.placeholder === 'string' ? { placeholder: field.placeholder } : {}),
          }))
      : [];
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
