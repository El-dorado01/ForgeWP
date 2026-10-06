import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { submitWpForm, useWpPageLink, WpHead, WpLink } from '@forgewp/react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

export type LicenseInquiryField = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'textarea';
  autoComplete?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  wide?: boolean;
};

type LicenseInquiryFieldPresentation = Pick<
  LicenseInquiryField,
  'autoComplete' | 'min' | 'max' | 'placeholder' | 'wide'
>;

export function buildLicenseInquiryFields(
  schemaFields: Record<
    string,
    { type: string; label?: string; required?: boolean }
  >,
  presentation: Record<string, LicenseInquiryFieldPresentation> = {},
): LicenseInquiryField[] {
  return Object.entries(schemaFields).map(([name, field]) => ({
    name,
    label: field.label ?? name,
    type: field.type as LicenseInquiryField['type'],
    required: field.required,
    ...presentation[name],
  }));
}

type LicenseInquiryPageProps = {
  title: string;
  pageTitle: string;
  description: string;
  eyebrow: string;
  price: string;
  scope: string;
  introduction: string;
  formIntroduction: string;
  features: string[];
  fields: LicenseInquiryField[];
  formName: 'team-license-inquiry' | 'corporate-license-inquiry';
  otherLicense: { label: string; href: string };
};

const inputClassName =
  'mt-2 block w-full border border-brand/20 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal text-brand outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-1 focus:ring-accent';

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

export function LicenseInquiryPage({
  title,
  pageTitle,
  description,
  eyebrow,
  price,
  scope,
  introduction,
  formIntroduction,
  features,
  fields,
  formName,
  otherLicense,
}: LicenseInquiryPageProps) {
  const licensesHref = useWpPageLink('lizenzen-page', '/lizenzen');
  const privacyHref = useWpPageLink('datenschutz-page', '/datenschutz');
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : 'hidden';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    'success' | 'error' | null
  >(null);
  const [submissionMessage, setSubmissionMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus(null);
    setSubmissionMessage('');

    const result = await submitWpForm(
      formName,
      new FormData(event.currentTarget),
    );

    setIsSubmitting(false);
    if (!result.ok) {
      setSubmissionStatus('error');
      setSubmissionMessage(
        result.message ||
          'Ihre Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.',
      );
      return;
    }

    setSubmissionStatus('success');
    setSubmissionMessage(
      import.meta.env.DEV
        ? 'Lokale Vorschau: Versand und Speicherung wurden simuliert.'
        : 'Vielen Dank. Ihre Anfrage ist bei DICON eingegangen. Eine Eingangsbestätigung wird an Ihre E-Mail-Adresse versendet. Die Anfrage stellt noch keinen Vertragsschluss dar.',
    );
  }

  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title={`${title} | Hospitality 2035 – DICON`}
        description={description}
      />

      <motion.header
        className='bg-brand text-white'
        initial={revealInitial}
        whileInView='visible'
        viewport={{ once: true, amount: 0.15 }}
        variants={revealVariants}
      >
        <div className='mx-auto max-w-[1440px] px-6 py-10 sm:px-8 sm:py-14 lg:px-14 lg:py-16'>
          <WpLink
            href={licensesHref}
            className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-300 transition-colors hover:text-white'
          >
            <ArrowLeft
              size={15}
              aria-hidden='true'
            />{' '}
            Alle Lizenzen
          </WpLink>
          <div className='mt-9 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end'>
            <div>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
                Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
                {eyebrow}
              </p>
              <h1 className='mt-4 max-w-4xl break-words font-heading text-5xl font-black leading-[0.98] hyphens-auto sm:text-6xl lg:text-7xl'>
                {pageTitle}
              </h1>
            </div>
            <p className='max-w-xl border-l border-white/20 pl-5 text-base leading-relaxed text-slate-300 sm:pl-7 sm:text-lg'>
              {introduction}
            </p>
          </div>
        </div>
      </motion.header>

      <div className='mx-auto grid max-w-[1440px] gap-12 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-20 lg:px-14 lg:py-20'>
        <motion.section
          aria-labelledby='inquiry-heading'
          initial={revealInitial}
          whileInView='visible'
          viewport={{ once: true, amount: 0.1 }}
          variants={revealVariants}
          transition={{ delay: 0.08, duration: 0.65, ease: 'easeOut' }}
        >
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
            Lizenzanfrage
          </p>
          <h2
            id='inquiry-heading'
            className='mt-3 font-heading text-3xl font-bold text-brand sm:text-4xl'
          >
            Lassen Sie uns Ihren Bedarf besprechen.
          </h2>
          <p className='mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base'>
            {formIntroduction}
          </p>

          <form
            onSubmit={handleSubmit}
            className='mt-9'
          >
            <div className='grid gap-x-6 gap-y-5 sm:grid-cols-2'>
              {fields.map((field) => (
                <label
                  key={field.name}
                  htmlFor={field.name}
                  className={`text-xs font-bold uppercase tracking-[0.06em] text-slate-600 ${field.wide ? 'sm:col-span-2' : ''}`}
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
                    />
                  ) : (
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type ?? 'text'}
                      autoComplete={field.autoComplete}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder}
                      className={inputClassName}
                    />
                  )}
                </label>
              ))}
            </div>

            <p className='mt-6 max-w-2xl text-xs leading-relaxed text-slate-500'>
              Ihre Angaben werden an DICON übermittelt und zur Bearbeitung der
              Anfrage gespeichert. Informationen zur Verarbeitung finden Sie in
              der{' '}
              <WpLink
                href={privacyHref}
                className='font-semibold text-brand underline decoration-accent underline-offset-4 hover:text-accent'
              >
                Datenschutzerklärung
              </WpLink>
              .
            </p>
            {submissionStatus && (
              <p
                className={`mt-4 max-w-2xl text-sm leading-relaxed ${submissionStatus === 'success' ? 'text-emerald-800' : 'text-red-700'}`}
                role={submissionStatus === 'error' ? 'alert' : 'status'}
                aria-live='polite'
              >
                {submissionMessage}
              </p>
            )}
            <button
              type='submit'
              disabled={isSubmitting}
              className='mt-6 inline-flex min-h-12 w-full items-center justify-between gap-4 whitespace-nowrap bg-brand px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:gap-8 sm:px-5'
            >
              {isSubmitting ? 'Anfrage wird übermittelt…' : 'Anfrage absenden'}
              <ArrowRight
                size={16}
                aria-hidden='true'
              />
            </button>
          </form>
        </motion.section>

        <motion.aside
          className='h-fit border-l-2 border-accent pl-6 lg:sticky lg:top-28'
          initial={revealInitial}
          whileInView='visible'
          viewport={{ once: true, amount: 0.1 }}
          variants={revealVariants}
          transition={{ delay: 0.16, duration: 0.65, ease: 'easeOut' }}
        >
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-accent'>
            Lizenz im Überblick
          </p>
          <h2 className='mt-4 font-heading text-2xl font-bold text-brand'>
            {title}
          </h2>
          <p className='mt-5 font-heading text-3xl font-bold text-brand'>
            {price}
          </p>
          <p className='mt-1 text-sm text-slate-500'>
            netto zzgl. gesetzlicher MwSt.
          </p>
          <p className='mt-5 border-t border-brand/15 pt-5 text-sm leading-relaxed text-slate-600'>
            {scope}
          </p>
          <ul className='mt-6 space-y-3'>
            {features.map((feature) => (
              <li
                key={feature}
                className='flex gap-3 text-sm leading-relaxed text-slate-600'
              >
                <Check
                  size={17}
                  className='mt-0.5 shrink-0 text-accent'
                  aria-hidden='true'
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <WpLink
            href={otherLicense.href}
            className='mt-8 inline-flex items-center gap-2 border-b border-brand pb-1 text-xs font-bold uppercase tracking-[0.08em] text-brand transition-colors hover:border-accent hover:text-accent'
          >
            {otherLicense.label}
            <ArrowRight
              size={14}
              aria-hidden='true'
            />
          </WpLink>
        </motion.aside>
      </div>
    </main>
  );
}
