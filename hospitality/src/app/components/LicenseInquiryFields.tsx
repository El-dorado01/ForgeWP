import {
  WpFormFields,
  type WpFormFieldDescriptor,
} from '@forgewp/react';

export type LicenseInquiryField = WpFormFieldDescriptor & {
  autoComplete?: string;
  min?: number;
  max?: number;
  wide?: boolean;
};

type LicenseInquiryFieldPresentation = Pick<
  LicenseInquiryField,
  'autoComplete' | 'min' | 'max' | 'placeholder' | 'wide'
>;

type LicenseInquirySchemaField = Partial<WpFormFieldDescriptor> & {
  type: WpFormFieldDescriptor['type'];
};

export function buildLicenseInquiryFields(
  schemaFields: Record<string, LicenseInquirySchemaField>,
  presentation: Record<string, LicenseInquiryFieldPresentation> = {},
): LicenseInquiryField[] {
  return Object.entries(schemaFields).map(([name, field]) => ({
    name,
    label: field.label ?? name,
    type: field.type,
    required: field.required === true,
    options: field.options,
    placeholder: field.placeholder,
    ...presentation[name],
  }));
}

const inputClassName =
  'mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent';

type LicenseInquiryFieldsProps = {
  formName: 'team-license-inquiry' | 'corporate-license-inquiry';
  fields: LicenseInquiryField[];
  clientFields: WpFormFieldDescriptor[];
  fieldLabels: Record<string, string>;
  errors?: Record<string, string>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <span className='mt-1 block text-xs font-normal normal-case text-red-700'>
      {message}
    </span>
  );
}

export function LicenseInquiryFields({
  formName,
  fields,
  clientFields,
  fieldLabels,
  errors = {},
}: LicenseInquiryFieldsProps) {
  return (
    <div className='grid gap-x-6 gap-y-5 sm:grid-cols-2'>
      {fields.map((field) => (
        <label
          key={field.name}
          htmlFor={field.name}
          className={`text-xs font-bold uppercase tracking-[0.06em] text-slate-600 ${field.wide ? 'sm:col-span-2' : ''}`}
        >
          {fieldLabels[field.name] || field.label}
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              rows={4}
              required={field.required}
              placeholder={field.placeholder}
              className={inputClassName}
              aria-invalid={Boolean(errors[field.name])}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.name}
              name={field.name}
              required={field.required}
              className={inputClassName}
              aria-invalid={Boolean(errors[field.name])}
            >
              <option value=''>Bitte auswählen</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <input
              id={field.name}
              name={field.name}
              type='checkbox'
              required={field.required}
              className='mt-3'
              aria-invalid={Boolean(errors[field.name])}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required={field.required}
              min={field.min}
              max={field.max}
              placeholder={field.placeholder}
              className={inputClassName}
              aria-invalid={Boolean(errors[field.name])}
            />
          )}
          <FieldError message={errors[field.name]} />
        </label>
      ))}
      <WpFormFields
        form={formName}
        fallback={clientFields}
        render={(field) => (
          <label
            key={field.name}
            htmlFor={field.name}
            className={`text-xs font-bold uppercase tracking-[0.06em] text-slate-600 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
          >
            {field.label}
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                rows={4}
                required={field.required}
                placeholder={field.placeholder}
                className={inputClassName}
                aria-invalid={Boolean(errors[field.name])}
              />
            ) : field.type === 'select' ? (
              <select
                id={field.name}
                name={field.name}
                required={field.required}
                className={inputClassName}
                aria-invalid={Boolean(errors[field.name])}
              >
                <option value=''>Bitte auswählen</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input
                id={field.name}
                name={field.name}
                type='checkbox'
                required={field.required}
                className='mt-3'
                aria-invalid={Boolean(errors[field.name])}
              />
            ) : (
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                required={field.required}
                placeholder={field.placeholder}
                className={inputClassName}
                aria-invalid={Boolean(errors[field.name])}
              />
            )}
            <FieldError message={errors[field.name]} />
          </label>
        )}
      />
    </div>
  );
}
