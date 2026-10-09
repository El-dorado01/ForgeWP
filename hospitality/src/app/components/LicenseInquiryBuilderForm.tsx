import {
  useWpForm,
  useWpFormFieldLabels,
  useWpPageLink,
  WpFormSubmitButton,
  WpLink,
} from '@forgewp/react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { form as teamLicenseForm } from '../../../cms/forms/team-license-inquiry';
import { form as corporateLicenseForm } from '../../../cms/forms/corporate-license-inquiry';
import {
  buildLicenseInquiryFields,
  LicenseInquiryFields,
  type LicenseInquiryField,
} from './LicenseInquiryFields';

type LicenseInquiryFormName =
  | 'team-license-inquiry'
  | 'corporate-license-inquiry';

type LicenseInquiryFormAttributes = {
  formName: LicenseInquiryFormName;
  heading: string;
  submitLabel: string;
  showSubmitIcon?: boolean;
};

const commonFieldPresentation: Record<
  string,
  Pick<
    LicenseInquiryField,
    'autoComplete' | 'min' | 'max' | 'placeholder' | 'wide'
  >
> = {
  firstName: { autoComplete: 'given-name' },
  lastName: { autoComplete: 'family-name' },
  company: { autoComplete: 'organization', wide: true },
  street: { autoComplete: 'street-address', wide: true },
  postalCode: { autoComplete: 'postal-code' },
  city: { autoComplete: 'address-level2' },
  country: { autoComplete: 'country-name' },
  email: { autoComplete: 'email', wide: true },
  phone: { autoComplete: 'tel' },
};

export default function LicenseInquiryBuilderForm({
  formName,
  heading,
  submitLabel,
  showSubmitIcon = true,
}: LicenseInquiryFormAttributes) {
  const { status, message, errors, isSubmitting, handleSubmit } = useWpForm(
    formName,
    { resetOnSuccess: true },
  );
  const fieldLabels = useWpFormFieldLabels(formName);
  const privacyHref = useWpPageLink('datenschutz-page', '/datenschutz');
  const form =
    formName === 'team-license-inquiry'
      ? teamLicenseForm
      : corporateLicenseForm;
  const fields = buildLicenseInquiryFields(form.fields ?? {}, {
    ...commonFieldPresentation,
    userCount: formName === 'team-license-inquiry' ? { min: 1, max: 10 } : { min: 11 },
  });
  const clientFields = Array.isArray(form.clientFields?.seed)
    ? form.clientFields.seed.map((field) => ({
        name: field.name,
        label: field.label ?? field.name,
        type: field.type,
        required: field.required === true,
        options: field.options,
        placeholder: field.placeholder,
      }))
    : [];

  return (
    <section className='text-brand'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
        Lizenzanfrage
      </p>
      <h2 className='mt-3 font-heading text-3xl font-bold text-brand sm:text-4xl'>
        {heading}
      </h2>
      <p className='mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base'>
        {formName === 'team-license-inquiry'
          ? 'Teilen Sie uns Ihre Kontaktdaten und den geplanten Nutzerkreis mit. DICON meldet sich mit den nächsten Schritten zur Bestellung und Rechnungsstellung.'
          : 'Beschreiben Sie kurz Ihre Organisation und den vorgesehenen Einsatz der Studie. DICON stimmt den passenden Lizenzumfang und das Angebot anschließend direkt mit Ihnen ab.'}
      </p>
      <form
        onSubmit={handleSubmit}
        className='mt-9'
      >
        <LicenseInquiryFields
          formName={formName}
          fields={fields}
          clientFields={clientFields}
          fieldLabels={fieldLabels}
          errors={errors}
        />
        <p className='mt-6 max-w-2xl text-xs leading-relaxed text-slate-500'>
          Ihre Angaben werden an DICON übermittelt und zur Bearbeitung der
          Anfrage gespeichert. Informationen zur Verarbeitung finden Sie in der{' '}
          <WpLink
            href={privacyHref}
            className='font-semibold text-brand underline decoration-accent underline-offset-4 hover:text-accent'
          >
            Datenschutzerklärung
          </WpLink>
          .
        </p>
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
        <WpFormSubmitButton
          pending={isSubmitting}
          showIcon={showSubmitIcon}
          icon={<ArrowRight size={16} />}
          className='mt-6 inline-flex min-h-12 w-full items-center justify-between gap-4 whitespace-nowrap bg-brand px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:gap-8 sm:px-5'
        >
          {isSubmitting ? (
            <>
              <LoaderCircle
                size={16}
                className='motion-safe:animate-spin'
                aria-hidden='true'
              />
              Anfrage wird übermittelt…
            </>
          ) : (
            submitLabel
          )}
        </WpFormSubmitButton>
      </form>
    </section>
  );
}
