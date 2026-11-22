import type { WpFormResult } from './hooks.js';

interface LocalField {
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
  multiple?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

function validateNumberBounds(num: number, field: LocalField): string | null {
  if (typeof field.min === 'number' && Number.isFinite(field.min) && num < field.min) {
    return `Please enter a value of at least ${field.min}.`;
  }
  if (typeof field.max === 'number' && Number.isFinite(field.max) && num > field.max) {
    return `Please enter a value of at most ${field.max}.`;
  }
  if (typeof field.step === 'number' && Number.isFinite(field.step) && field.step > 0) {
    const base = typeof field.min === 'number' && Number.isFinite(field.min) ? field.min : 0;
    const ratio = (num - base) / field.step;
    if (Math.abs(ratio - Math.round(ratio)) > 1e-9) {
      return `Please enter a value matching step ${field.step}.`;
    }
  }
  return null;
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
    const isMulti = field.type === 'multiselect' || (field.type === 'select' && field.multiple === true);

    if (isMulti) {
      let items: string[] = [];
      let validShape = true;
      if (raw === undefined || raw === null || raw === '') {
        items = [];
      } else if (Array.isArray(raw)) {
        if (raw.some((v) => typeof v !== 'string' && typeof v !== 'number')) {
          validShape = false;
        } else {
          items = raw.map((v) => String(v).trim()).filter(Boolean);
        }
      } else if (typeof raw === 'string' || typeof raw === 'number') {
        const s = String(raw).trim();
        items = s ? [s] : [];
      } else {
        validShape = false;
      }

      if (!validShape || (field.options?.length && items.some((v) => !field.options!.includes(v)))) {
        errors[field.name] = 'Please choose valid options.';
      } else if (field.required && items.length === 0) {
        errors[field.name] = 'This field is required.';
      }
      continue;
    }

    const scalar = ['string', 'number', 'boolean'].includes(typeof raw);
    const text = scalar ? String(raw).trim() : '';
    const empty = field.type === 'checkbox'
      ? !scalar || raw === false || raw === 0 || raw === '' || raw === '0' || raw === 'false'
      : !text;
    if ((field.type === 'select' || field.type === 'radio') && raw !== undefined && raw !== null && raw !== '' && field.options?.length && (typeof raw !== 'string' || !field.options.includes(raw))) {
      errors[field.name] = 'Please choose a valid option.';
    } else if (field.required && empty) {
      errors[field.name] = 'This field is required.';
    } else if (field.type === 'email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      errors[field.name] = 'Please enter a valid email address.';
    } else if (field.type === 'number' && text) {
      const num = Number(text);
      if (!Number.isFinite(num)) {
        errors[field.name] = 'Please enter a valid number.';
      } else {
        const boundErr = validateNumberBounds(num, field);
        if (boundErr) errors[field.name] = boundErr;
      }
    }
  }
  return Object.keys(errors).length ? { ok: false, errors, message: 'Local validation failed (dev).' } : null;
}
