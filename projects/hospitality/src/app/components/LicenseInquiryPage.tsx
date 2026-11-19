import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  submitWpForm,
  useWpFormFieldLabels,
  useWpPageLink,
  WpFormSubmitButton,
  WpHead,
  WpLink,
  type WpFormFieldDescriptor,
} from '@forgewp/react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { LicenseInquiryHeroContent } from '../../blocks/LicenseInquiryHero';
import { LicenseInquiryOverviewContent } from './LicenseInquiryOverviewContent';
import {
  LicenseInquiryFields,
  type LicenseInquiryField,
} from './LicenseInquiryFields';

export { buildLicenseInquiryFields } from './LicenseInquiryFields';
export type { LicenseInquiryField } from './LicenseInquiryFields';

type LicenseInquiryPageProps = {
  title: string;
  pageTitle: string;
  description: string;
  eyebrow: string;
  price: string;
  overviewEyebrow: string;
  priceNote: string;
  scope: string;
  introduction: string;
  formIntroduction: string;
  features: string[];
  fields: LicenseInquiryField[];
  clientFields: WpFormFieldDescriptor[];
  formName: 'team-license-inquiry' | 'corporate-license-inquiry';
  otherLicense: { label: string; href: string };
};

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
  overviewEyebrow,
  priceNote,
  scope,
  introduction,
  formIntroduction,
  features,
  fields,
  clientFields,
  formName,
  otherLicense,
}: LicenseInquiryPageProps) {
  const privacyHref = useWpPageLink('datenschutz-page', '/datenschutz');
  const reduceMotion = useReducedMotion();
  const revealInitial = reduceMotion ? false : 'hidden';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    'success' | 'error' | null
  >(null);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const fieldLabels = useWpFormFieldLabels(formName);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSubmitting(true);
    setSubmissionStatus(null);
    setSubmissionMessage('');

    try {
      const result = await submitWpForm(formName, new FormData(formElement));
      if (!result.ok) {
        setSubmissionStatus('error');
        setSubmissionMessage(
          result.message ||
            'Ihre Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.',
        );
        return;
      }

      formElement.reset();
      setSubmissionStatus('success');
      setSubmissionMessage(
        result.message ||
          (import.meta.env.DEV
            ? 'Lokale Vorschau: Versand und Speicherung wurden simuliert.'
            : 'Vielen Dank. Ihre Anfrage wurde übermittelt.'),
      );
    } finally {
      setIsSubmitting(false);
    }
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
        <LicenseInquiryHeroContent
          eyebrow={eyebrow}
          pageTitle={pageTitle}
          introduction={introduction}
        />
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
            <LicenseInquiryFields
              formName={formName}
              fields={fields}
              clientFields={clientFields}
              fieldLabels={fieldLabels}
            />

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
            <WpFormSubmitButton
              pending={isSubmitting}
              icon={<ArrowRight size={16} />}
              className='mt-6 inline-flex min-h-12 w-full items-center justify-between gap-4 whitespace-nowrap bg-brand px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto sm:gap-8 sm:px-5'
            >
              {isSubmitting ? (
                <>
                  Anfrage wird übermittelt…
                  <LoaderCircle
                    size={16}
                    className='motion-safe:animate-spin'
                    aria-hidden='true'
                  />
                </>
              ) : (
                'Anfrage absenden'
              )}
            </WpFormSubmitButton>
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
          <LicenseInquiryOverviewContent
            eyebrow={overviewEyebrow}
            heading={title}
            price={price}
            priceNote={priceNote}
            scope={scope}
            featureOne={features[0] ?? ''}
            featureTwo={features[1] ?? ''}
            featureThree={features[2] ?? ''}
            otherLicenseLabel={otherLicense.label}
            otherLicenseHref={otherLicense.href}
          />
        </motion.aside>
      </div>
    </main>
  );
}
