import { useWpForm } from '@forgewp/react';
import { form as teamLicenseForm } from '../../../cms/forms/team-license-inquiry';
import { form as corporateLicenseForm } from '../../../cms/forms/corporate-license-inquiry';

type LicenseInquiryFormName =
  | 'team-license-inquiry'
  | 'corporate-license-inquiry';

type LicenseInquiryFormAttributes = {
  formName: LicenseInquiryFormName;
  heading: string;
  submitLabel: string;
};

const inputClassName =
  'mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm text-brand outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent';

export default function LicenseInquiryBuilderForm({
  formName,
  heading,
  submitLabel,
}: LicenseInquiryFormAttributes) {
  const { status, message, errors, isSubmitting, handleSubmit } =
    useWpForm(formName);
  const form =
    formName === 'team-license-inquiry'
      ? teamLicenseForm
      : corporateLicenseForm;

  return (
    <section className='text-brand'>
      <p className='text-xs font-bold uppercase text-accent'>Lizenzanfrage</p>
      <h2 className='mt-3 font-heading text-3xl font-bold'>{heading}</h2>
      <form
        onSubmit={handleSubmit}
        className='mt-8'
      >
        <div className='grid gap-x-6 gap-y-5 sm:grid-cols-2'>
          {Object.entries(form.fields ?? {}).map(([name, field]) => (
            <label
              key={name}
              htmlFor={`license-${formName}-${name}`}
              className='text-xs font-bold uppercase text-slate-600'
            >
              {field.label ?? name}
              {field.type === 'textarea' ? (
                <textarea
                  id={`license-${formName}-${name}`}
                  name={name}
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={4}
                  className={inputClassName}
                  aria-invalid={Boolean(errors[name])}
                />
              ) : (
                <input
                  id={`license-${formName}-${name}`}
                  name={name}
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  className={inputClassName}
                  aria-invalid={Boolean(errors[name])}
                />
              )}
              {errors[name] && (
                <span className='mt-1 block text-xs font-normal normal-case text-red-700'>
                  {errors[name]}
                </span>
              )}
            </label>
          ))}
        </div>
        <button
          type='submit'
          disabled={isSubmitting}
          className='mt-6 inline-flex min-h-12 items-center justify-between gap-8 bg-brand px-5 py-3 text-left text-xs font-bold uppercase text-white transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60'
        >
          {isSubmitting ? 'Anfrage wird übermittelt…' : submitLabel}
        </button>
        {status === 'success' && (
          <p
            className='mt-4 text-sm text-emerald-800'
            role='status'
            aria-live='polite'
          >
            {message || 'Vielen Dank. Ihre Anfrage wurde übermittelt.'}
          </p>
        )}
        {status === 'error' && (
          <p
            className='mt-4 text-sm text-red-700'
            role='alert'
            aria-live='polite'
          >
            {message || 'Ihre Anfrage konnte nicht übermittelt werden.'}
          </p>
        )}
      </form>
    </section>
  );
}
