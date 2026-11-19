import { defineBlock, WpEditable } from '@forgewp/react';

type SingleLicensePriceDetailsAttributes = {
  netPrice?: string;
  taxText?: string;
  totalPrice?: string;
  deliveryNote?: string;
  setAttributes?: (
    attributes: Partial<SingleLicensePriceDetailsAttributes>,
  ) => void;
};

function SingleLicensePriceDetails({
  netPrice = '249,00 €',
  taxText = 'zzgl. gesetzlicher Umsatzsteuer',
  totalPrice = '249,00 € netto',
  deliveryNote = 'Die anfallende Umsatzsteuer wird im finalen Checkout ausgewiesen. Die digitale Bereitstellung erfolgt nach erfolgreicher Zahlung.',
  setAttributes,
}: SingleLicensePriceDetailsAttributes) {
  return (
    <div>
      <dl className='space-y-4 border-b border-brand/15 py-5 text-sm'>
        <div className='flex justify-between gap-4'>
          <dt className='text-slate-600'>Nettopreis</dt>
          <WpEditable
            tagName='dd'
            value={netPrice}
            onChange={(value) => setAttributes?.({ netPrice: value })}
            className='font-semibold text-brand'
          />
        </div>
        <div className='flex justify-between gap-4'>
          <dt className='text-slate-600'>Umsatzsteuer</dt>
          <WpEditable
            tagName='dd'
            value={taxText}
            onChange={(value) => setAttributes?.({ taxText: value })}
            className='text-right text-slate-600'
          />
        </div>
      </dl>
      <p className='flex justify-between gap-4 py-5 font-heading text-lg font-bold text-brand'>
        <span>Gesamtbetrag</span>
        <WpEditable
          tagName='span'
          value={totalPrice}
          onChange={(value) => setAttributes?.({ totalPrice: value })}
        />
      </p>
      <WpEditable
        tagName='p'
        value={deliveryNote}
        onChange={(value) => setAttributes?.({ deliveryNote: value })}
        className='text-xs leading-relaxed text-slate-500'
      />
    </div>
  );
}

export default defineBlock({
  name: 'single-license-price-details',
  title: 'Single License Price Details',
  category: 'theme',
  icon: 'money-alt',
  description:
    'Editable net price, VAT note, total and delivery information for the purchase panel.',
  attributes: {
    netPrice: { type: 'string', default: '249,00 €' },
    taxText: {
      type: 'string',
      default: 'zzgl. gesetzlicher Umsatzsteuer',
    },
    totalPrice: { type: 'string', default: '249,00 € netto' },
    deliveryNote: {
      type: 'string',
      default:
        'Die anfallende Umsatzsteuer wird im finalen Checkout ausgewiesen. Die digitale Bereitstellung erfolgt nach erfolgreicher Zahlung.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <SingleLicensePriceDetails
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <SingleLicensePriceDetails {...attributes} />,
});
