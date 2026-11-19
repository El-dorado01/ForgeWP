import { defineBlock, useWpPageLink, WpEditable, WpLink } from '@forgewp/react';

type SingleLicenseCheckoutInfoAttributes = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  termsPrefix?: string;
  termsLabel?: string;
  termsBetweenLinks?: string;
  withdrawalLabel?: string;
  termsHref?: string;
  withdrawalHref?: string;
  termsSuffix?: string;
  setAttributes?: (
    attributes: Partial<SingleLicenseCheckoutInfoAttributes>,
  ) => void;
};

function SingleLicenseCheckoutInfo({
  eyebrow = '01 / Checkout',
  heading = 'Rechnungsdaten und Zahlung',
  description = 'Der sichere Checkout wird von Easy Digital Downloads bereitgestellt. Dort geben Sie die Rechnungsdaten ein und wählen die angebotene Zahlungsart. Die Umsatzsteuer wird anhand der Checkout-Einstellungen berechnet.',
  termsPrefix = 'Bitte lesen Sie vor dem Kauf die ',
  termsLabel = 'AGB & Lizenzbedingungen',
  termsBetweenLinks = ' und die ',
  withdrawalLabel = 'Widerrufsbelehrung',
  termsHref: termsHrefProp,
  withdrawalHref: withdrawalHrefProp,
  termsSuffix = '. Die erforderlichen Vertragsbestätigungen und eine gegebenenfalls notwendige Zustimmung zur sofortigen Bereitstellung müssen im EDD-Checkout eingerichtet und vor dem Live-Verkauf geprüft werden.',
  setAttributes,
}: SingleLicenseCheckoutInfoAttributes) {
  const termsPageHref = useWpPageLink(
    'agb-lizenzbedingungen-page',
    '/agb-lizenzbedingungen',
  );
  const withdrawalPageHref = useWpPageLink(
    'widerrufsbelehrung-page',
    '/widerrufsbelehrung',
  );
  const termsHref = termsHrefProp || termsPageHref;
  const withdrawalHref = withdrawalHrefProp || withdrawalPageHref;

  return (
    <section>
      <div>
        <WpEditable
          tagName='p'
          value={eyebrow}
          onChange={(value) => setAttributes?.({ eyebrow: value })}
          className='text-xs font-bold uppercase tracking-[0.16em] text-accent'
        />
        <WpEditable
          tagName='h2'
          value={heading}
          onChange={(value) => setAttributes?.({ heading: value })}
          className='mt-3 font-heading text-2xl font-bold text-brand sm:text-3xl'
        />
        <WpEditable
          tagName='p'
          value={description}
          onChange={(value) => setAttributes?.({ description: value })}
          className='mt-3 max-w-2xl text-sm leading-relaxed text-slate-600'
        />
      </div>
      <div className='mt-14 border-t border-brand/20 pt-10'>
        <p className='text-sm leading-relaxed text-slate-600'>
          <WpEditable
            tagName='span'
            value={termsPrefix}
            onChange={(value) => setAttributes?.({ termsPrefix: value })}
          />
          <WpLink
            href={termsHref}
            className='font-semibold text-brand underline decoration-accent underline-offset-4'
          >
            <WpEditable
              tagName='span'
              value={termsLabel}
              onChange={(value) => setAttributes?.({ termsLabel: value })}
            />
          </WpLink>
          <WpEditable
            tagName='span'
            value={termsBetweenLinks}
            onChange={(value) => setAttributes?.({ termsBetweenLinks: value })}
          />
          <WpLink
            href={withdrawalHref}
            className='font-semibold text-brand underline decoration-accent underline-offset-4'
          >
            <WpEditable
              tagName='span'
              value={withdrawalLabel}
              onChange={(value) => setAttributes?.({ withdrawalLabel: value })}
            />
          </WpLink>
          <WpEditable
            tagName='span'
            value={termsSuffix}
            onChange={(value) => setAttributes?.({ termsSuffix: value })}
          />
        </p>
      </div>
    </section>
  );
}

export default defineBlock({
  name: 'single-license-checkout-info',
  title: 'Single License Checkout Information',
  category: 'theme',
  icon: 'media-document',
  description: 'Editable license and checkout information with legal links.',
  attributes: {
    eyebrow: { type: 'string', default: '01 / Checkout' },
    heading: { type: 'string', default: 'Rechnungsdaten und Zahlung' },
    description: {
      type: 'string',
      default:
        'Der sichere Checkout wird von Easy Digital Downloads bereitgestellt. Dort geben Sie die Rechnungsdaten ein und wählen die angebotene Zahlungsart. Die Umsatzsteuer wird anhand der Checkout-Einstellungen berechnet.',
    },
    termsPrefix: {
      type: 'string',
      default: 'Bitte lesen Sie vor dem Kauf die ',
    },
    termsLabel: { type: 'string', default: 'AGB & Lizenzbedingungen' },
    termsBetweenLinks: { type: 'string', default: ' und die ' },
    withdrawalLabel: { type: 'string', default: 'Widerrufsbelehrung' },
    termsHref: {
      type: 'string',
      control: 'url',
      default: '',
      label: 'Terms URL',
    },
    withdrawalHref: {
      type: 'string',
      control: 'url',
      default: '',
      label: 'Withdrawal information URL',
    },
    termsSuffix: {
      type: 'string',
      default:
        '. Die erforderlichen Vertragsbestätigungen und eine gegebenenfalls notwendige Zustimmung zur sofortigen Bereitstellung müssen im EDD-Checkout eingerichtet und vor dem Live-Verkauf geprüft werden.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <SingleLicenseCheckoutInfo
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <SingleLicenseCheckoutInfo {...attributes} />,
});
