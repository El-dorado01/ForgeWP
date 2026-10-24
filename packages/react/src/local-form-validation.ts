import type { WpFormResult } from './hooks.js';

interface LocalField {
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
}

/** Basic preview checks, deliberately separate from WordPress sanitization. */
export function validateLocalForm(name: string, values: Record<string, unknown>): WpFormResult | null {
  const fields: LocalField[] | undefined = typeof window === 'undefined'
    ? undefined : (window as any)._forgeWpMockForms?.[name]?.validationFields;
  if (!Array.isArray(fields)) {
    return { ok: false, message: `Local validation contract unavailable for "${name}". Enable the ForgeWP Vite runtime and declare a native form.` };
  }
  const errors: Record<string, string> = Object.create(null);
  for (const field of fields) {
    const raw = values[field.name];
    const scalar = ['string', 'number', 'boolean'].includes(typeof raw);
    const text = scalar ? String(raw).trim() : '';
    const empty = field.type === 'checkbox'
      ? !scalar || raw === false || raw === 0 || raw === '' || raw === '0' || raw === 'false'
      : !text;
    if (field.required && empty) {
      errors[field.name] = 'This field is required.';
    } else if (field.type === 'select' && raw !== undefined && raw !== null && raw !== '' && field.options?.length && (typeof raw !== 'string' || !field.options.includes(raw))) {
      errors[field.name] = 'Please choose a valid option.';
    } else if (field.type === 'email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      errors[field.name] = 'Please enter a valid email address.';
    }
  }
  return Object.keys(errors).length ? { ok: false, errors, message: 'Local validation failed (dev).' } : null;
}
