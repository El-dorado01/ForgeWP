import LicenseInquiryBuilderForm from '../app/components/LicenseInquiryBuilderForm';
import { defineBlock } from '@forgewp/react';

type LicenseInquiryFormName =
  | 'team-license-inquiry'
  | 'corporate-license-inquiry';

type LicenseInquiryFormAttributes = {
  formName: LicenseInquiryFormName;
  heading: string;
  submitLabel: string;
};

const inputClassName =
  'mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm text-brand';

export default defineBlock({
  name: 'license-inquiry-form',
  title: 'Hospitality License Inquiry Form',
  category: 'theme',
  icon: 'email',
  description:
    'A working license inquiry form connected to the native ForgeWP form contract.',
  attributes: {
    formName: { type: 'string', default: 'team-license-inquiry' },
    heading: {
      type: 'string',
      default: 'Lassen Sie uns Ihren Bedarf besprechen.',
    },
    submitLabel: { type: 'string', default: 'Anfrage absenden' },
  },
  edit: () => null,
  editorPreview: ({ attributes, setAttributes }) => (
    <section className='border border-brand/15 bg-white p-6 sm:p-8'>
      <label className='block text-xs font-bold uppercase text-slate-600'>
        Formular
        <select
          value={attributes.formName}
          onChange={(event) =>
            setAttributes({
              formName: event.currentTarget.value as LicenseInquiryFormName,
            })
          }
          className='mt-2 block min-h-10 max-w-full border border-brand/20 bg-white px-3 text-sm font-normal normal-case text-brand'
        >
          <option value='team-license-inquiry'>Teamlizenz</option>
          <option value='corporate-license-inquiry'>Unternehmenslizenz</option>
        </select>
      </label>
      <h2 className='mt-6 font-heading text-2xl font-bold text-brand'>
        {attributes.heading}
      </h2>
      <div className='mt-5 grid gap-4 sm:grid-cols-2'>
        <label className='text-xs font-bold uppercase text-slate-600'>
          Vorname
          <input
            disabled
            className={inputClassName}
          />
        </label>
        <label className='text-xs font-bold uppercase text-slate-600'>
          Geschäftliche E-Mail-Adresse
          <input
            disabled
            type='email'
            className={inputClassName}
          />
        </label>
        <label className='text-xs font-bold uppercase text-slate-600 sm:col-span-2'>
          Nachricht
          <textarea
            disabled
            rows={3}
            className={inputClassName}
          />
        </label>
      </div>
      <button
        disabled
        className='mt-6 min-h-12 bg-brand px-5 py-3 text-xs font-bold uppercase text-white opacity-70'
      >
        {attributes.submitLabel}
      </button>
      <p className='mt-3 text-xs text-slate-500'>
        Vorschau. Das Formular ist im Editor deaktiviert.
      </p>
    </section>
  ),
  save: ({ attributes }) => (
    <LicenseInquiryBuilderForm
      {...(attributes as LicenseInquiryFormAttributes)}
    />
  ),
});
