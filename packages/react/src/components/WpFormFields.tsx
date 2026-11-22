import React from 'react';
import type { WpFormFieldType } from '../config';

export interface WpFormFieldDescriptor {
  name: string;
  label: string;
  type: WpFormFieldType;
  required: boolean;
  options?: string[];
  multiple?: boolean;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string;
  placeholder?: string;
}

export interface WpFormFieldsProps {
  /** The form name declared in wp.config.ts's `forms` key. */
  form: string;
  /** Initial client-owned fields for local preview before runtime data exists. */
  fallback?: WpFormFieldDescriptor[];
  /** Renders one client-owned field. Called once per field, in stored order. */
  render: (field: WpFormFieldDescriptor) => React.ReactNode;
}

const SSR_FIELD_TYPES: WpFormFieldType[] = [
  'text',
  'email',
  'tel',
  'number',
  'textarea',
  'select',
  'multiselect',
  'radio',
  'checkbox',
];
const OPTION_FIELD_TYPES = new Set<WpFormFieldType>([
  'select',
  'multiselect',
  'radio',
]);

function isCompileTimeFormsSsr(): boolean {
  if (typeof window !== 'undefined' && (window as any)._forgeWpCompileTime === true) {
    return true;
  }
  const proc = (globalThis as any).process;
  return Boolean(proc && proc.env?.FORGEWP_NATIVE_EXPORT === '1');
}

function getClientFields(form: string): WpFormFieldDescriptor[] | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;

  if (win._forgeWpCompileTime) return null;

  const hydratedFields = win.forgeWpHydration?.forms?.[form]?.fields;
  if (Array.isArray(hydratedFields)) return hydratedFields;

  const mockFields = win._forgeWpMockForms?.[form]?.fields;
  if (Array.isArray(mockFields)) return mockFields;

  return null;
}

function renderSafeProbe(
  render: (field: WpFormFieldDescriptor) => React.ReactNode,
  probe: WpFormFieldDescriptor,
): React.ReactNode {
  try {
    return render(probe);
  } catch {
    return null;
  }
}

/**
 * Renders the client-owned fields of a form (added/removed/reordered by the
 * site editor in wp-admin) through developer-supplied markup via a render
 * prop. During WordPress static export / SSR compilation, emits declarative
 * per-type templates compiled into live server-rendered PHP reading from
 * `forgewp_forms_get_registered_client_fields()`, matching client hydration
 * with zero duplicate fields or content swaps.
 *
 * The dev owns 100% of the visible markup — this component contributes no
 * styling and no wrapper element of its own.
 */
export function WpFormFields({ form, fallback, render }: WpFormFieldsProps) {
  const honeypot = (
    <input
      type="text"
      name="_forgewp_hp"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
    />
  );

  if (isCompileTimeFormsSsr()) {
    const templates: React.ReactElement[] = [];
    for (const type of SSR_FIELD_TYPES) {
      const hasOptions = OPTION_FIELD_TYPES.has(type);
      const isMulti = type === 'multiselect';
      const numericBounds =
        type === 'number'
          ? { min: -987654321, max: 987654321, step: 987654.321 }
          : {};
      const baseReq: WpFormFieldDescriptor = {
        name: '__FWP_FF_NAME__',
        label: '__FWP_FF_LABEL__',
        type,
        required: true,
        placeholder: '__FWP_FF_PLACEHOLDER__',
        ...(isMulti ? { multiple: true } : {}),
        ...numericBounds,
        ...(hasOptions ? { options: ['__FWP_FF_OPT_0__'] } : {}),
      };
      const baseOpt: WpFormFieldDescriptor = {
        name: '__FWP_FF_NAME__',
        label: '__FWP_FF_LABEL__',
        type,
        required: false,
        placeholder: '__FWP_FF_PLACEHOLDER__',
        ...(isMulti ? { multiple: true } : {}),
        ...numericBounds,
        ...(hasOptions ? { options: ['__FWP_FF_OPT_0__'] } : {}),
      };
      const baseNoAttr: WpFormFieldDescriptor = {
        name: '__FWP_FF_NAME__',
        label: '__FWP_FF_LABEL__',
        type,
        required: false,
        placeholder: '',
        ...(isMulti ? { multiple: true } : {}),
        ...(hasOptions ? { options: ['__FWP_FF_OPT_0__'] } : {}),
      };

      templates.push(
        React.createElement(
          'forgewp-form-field-tpl' as any,
          { key: `${type}-req`, 'data-type': type, 'data-variant': 'req' },
          renderSafeProbe(render, baseReq),
        ),
        React.createElement(
          'forgewp-form-field-tpl' as any,
          { key: `${type}-opt`, 'data-type': type, 'data-variant': 'opt' },
          renderSafeProbe(render, baseOpt),
        ),
        React.createElement(
          'forgewp-form-field-tpl' as any,
          { key: `${type}-noattr`, 'data-type': type, 'data-variant': 'noattr' },
          renderSafeProbe(render, baseNoAttr),
        ),
      );

      if (hasOptions) {
        templates.push(
          React.createElement(
            'forgewp-form-field-tpl' as any,
            { key: `${type}-req2`, 'data-type': type, 'data-variant': 'req2' },
            renderSafeProbe(render, {
              ...baseReq,
              options: ['__FWP_FF_OPT_0__', '__FWP_FF_OPT_1__'],
            }),
          ),
          React.createElement(
            'forgewp-form-field-tpl' as any,
            { key: `${type}-opt2`, 'data-type': type, 'data-variant': 'opt2' },
            renderSafeProbe(render, {
              ...baseOpt,
              options: ['__FWP_FF_OPT_0__', '__FWP_FF_OPT_1__'],
            }),
          ),
          React.createElement(
            'forgewp-form-field-tpl' as any,
            { key: `${type}-empty`, 'data-type': type, 'data-variant': 'empty' },
            renderSafeProbe(render, { ...baseOpt, options: [] }),
          ),
        );
      }
    }

    return React.createElement(
      'forgewp-form-fields' as any,
      { form },
      ...templates,
      honeypot,
    );
  }

  const fields = getClientFields(form) ?? fallback ?? null;

  if (!fields) {
    if (typeof window !== 'undefined' && !(window as any)._forgeWpCompileTime) {
      // eslint-disable-next-line no-console
      console.warn(
        `[forgewp] <WpFormFields form="${form}"> found no field data. Is "${form}" declared in wp.config.ts's \`forms\` key with clientFields.enabled?`,
      );
    }
    return null;
  }

  return (
    <>
      {fields.map((field) => (
        <React.Fragment key={field.name}>{render(field)}</React.Fragment>
      ))}
      {honeypot}
    </>
  );
}
