import React from 'react';

export interface WpFormFieldDescriptor {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface WpFormFieldsProps {
  /** The form name declared in wp.config.ts's `forms` key. */
  form: string;
  /** Renders one client-owned field. Called once per field, in stored order. */
  render: (field: WpFormFieldDescriptor) => React.ReactNode;
}

function getClientFields(form: string): WpFormFieldDescriptor[] | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;

  // Node SSR (compile-time prerender) has neither mock nor hydration data —
  // render nothing rather than crash the build. Matches useWpQuery's
  // compile-time "loading" precedent in the wordpress.tsx template.
  if (win._forgeWpCompileTime) return null;

  const mockFields = win._forgeWpMockForms?.[form]?.fields;
  if (Array.isArray(mockFields)) return mockFields;

  const hydratedFields = win.forgeWpHydration?.forms?.[form]?.fields;
  if (Array.isArray(hydratedFields)) return hydratedFields;

  return null;
}

/**
 * Renders the client-owned fields of a form (added/removed/reordered by the
 * site editor in wp-admin) through developer-supplied markup via a render
 * prop. Renders nothing besides an automatic honeypot input if field data
 * isn't available yet (SSR, or a form with no clientFields configured).
 *
 * The dev owns 100% of the visible markup — this component contributes no
 * styling and no wrapper element of its own.
 */
export function WpFormFields({ form, render }: WpFormFieldsProps) {
  const fields = getClientFields(form);

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
      <input
        type="text"
        name="_forgewp_hp"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
      />
    </>
  );
}
