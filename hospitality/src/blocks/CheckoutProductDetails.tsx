import {
  defineBlock,
  resolveWpAsset,
  WpEditable,
} from '@forgewp/react';

const scopeDescription =
  'Wie sich die wirtschaftliche Logik der Hotellerie verändert – eine strategische Analyse auf rund 90 Seiten.';

export default defineBlock({
  name: 'checkout-product-details',
  title: 'Checkout Product Details',
  category: 'theme',
  icon: 'media-document',
  description: 'Study summary and preview link above the EDD purchase button.',
  attributes: {
    productLabel: { type: 'string', default: 'Single License' },
    productName: { type: 'string', default: 'Hospitality 2035' },
    scopeDescription: {
      type: 'string',
      default:
        'Wie sich die wirtschaftliche Logik der Hotellerie verändert – eine strategische Analyse auf rund 90 Seiten.',
    },
    priceLabel: { type: 'string', default: '249 € netto' },
    previewLabel: { type: 'string', default: 'Vorschau ansehen' },
    previewUrl: {
      type: 'string',
      default: '/assets/client-assets/Studie_Hospitality_2035_08102026_Kurz.pdf',
    },
    consentText: {
      type: 'string',
      default:
        'Ich stimme ausdrücklich zu, dass DICON vor Ablauf der 14-tägigen Widerrufsfrist mit der Bereitstellung der digitalen Studie beginnt. Mir ist bekannt, dass ich mit Beginn der Bereitstellung der Studie mein Widerrufsrecht verliere.',
    },
    consentNote: {
      type: 'string',
      default:
        'Die Zustimmung wird im finalen Checkout mit Datum und Uhrzeit dokumentiert und in der Bestellbestätigung ausgewiesen.',
    },
  },
  editorPreview: ({ attributes, setAttributes }) => (
    <div className='min-w-0 flex-1'>
      <div className='hospitality-checkout-product-details-copy'>
        <p className='hospitality-checkout-product-label text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
          <WpEditable
            tagName='span'
            value={attributes.productLabel || 'Single License'}
            onChange={(value) => setAttributes({ productLabel: value })}
          />
        </p>
        <h3 className='hospitality-checkout-product-title mt-3 font-heading text-3xl font-black text-brand sm:text-4xl'>
          <WpEditable
            tagName='span'
            value={attributes.productName || 'Hospitality 2035'}
            onChange={(value) => setAttributes({ productName: value })}
          />
        </h3>
        <p className='hospitality-checkout-product-description mt-3 max-w-2xl text-sm leading-relaxed text-slate-600'>
          <WpEditable
            tagName='span'
            value={attributes.scopeDescription || scopeDescription}
            onChange={(value) => setAttributes({ scopeDescription: value })}
          />
        </p>
        <p className='hospitality-checkout-product-price mt-4 font-heading text-xl font-bold text-brand'>
          <WpEditable
            tagName='span'
            value={attributes.priceLabel || '249 € netto'}
            onChange={(value) => setAttributes({ priceLabel: value })}
          />
        </p>
      </div>
      <a
        href={resolveWpAsset(
          attributes.previewUrl ||
            '/assets/client-assets/Studie_Hospitality_2035_08102026_Kurz.pdf',
        )}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-5 inline-flex min-h-11 items-center justify-center border border-brand px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-brand transition-colors hover:border-accent hover:text-accent'
      >
        <WpEditable
          tagName='span'
          value={attributes.previewLabel || 'Vorschau ansehen'}
          onChange={(value) => setAttributes({ previewLabel: value })}
        />
      </a>
    </div>
  ),
  editorPreviewMode: 'override',
  save: ({ attributes }) => (
    <div className='min-w-0 flex-1'>
      <div className='hospitality-checkout-product-details-copy'>
        <p className='hospitality-checkout-product-label text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
          {attributes.productLabel || 'Single License'}
        </p>
        <h3 className='hospitality-checkout-product-title mt-3 font-heading text-3xl font-black text-brand sm:text-4xl'>
          {attributes.productName || 'Hospitality 2035'}
        </h3>
        <p className='hospitality-checkout-product-description mt-3 max-w-2xl text-sm leading-relaxed text-slate-600'>
          {attributes.scopeDescription || scopeDescription}
        </p>
        <p className='hospitality-checkout-product-price mt-4 font-heading text-xl font-bold text-brand'>
          {attributes.priceLabel || '249 € netto'}
        </p>
      </div>
      <a
        href={resolveWpAsset(
          attributes.previewUrl ||
            '/assets/client-assets/Studie_Hospitality_2035_08102026_Kurz.pdf',
        )}
        target='_blank'
        rel='noopener noreferrer'
        className='mt-5 inline-flex min-h-11 items-center justify-center border border-brand px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-brand transition-colors hover:border-accent hover:text-accent'
      >
        {attributes.previewLabel || 'Vorschau ansehen'}
      </a>
    </div>
  ),
  edit: () => null,
});
