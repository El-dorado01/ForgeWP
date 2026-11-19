import { defineBlock, WpEditable } from '@forgewp/react';

const defaultTitle = 'Was Sie aus Hospitality 2035 mitnehmen';
const defaultItems = [
  'Welche Kosten- und Betriebsstrukturen bis 2035 unter Druck geraten',
  'Wo KI und Automatisierung tatsächlich wirtschaftliche Wirkung entfalten können',
  'Wie sich Hotelkonzepte und Flächenbedarfe verändern',
  'Welche Geschäftsmodelle an Bedeutung gewinnen',
  'Wie sich Hotels auf zunehmende Automatisierung vorbereiten können',
  'Welche strategischen Konsequenzen sich für Betreiber, Eigentümer und Investoren ergeben',
];

type BenefitItem = { text: string };
type CheckoutBenefitsAttributes = {
  title?: string;
  items?: BenefitItem[];
};

export default defineBlock({
  name: 'checkout-benefits',
  title: 'Hospitality Study Benefits',
  category: 'theme',
  icon: 'list-view',
  description: 'Key strategic takeaways presented before the study price.',
  attributes: {
    title: {
      type: 'string',
      default: 'Was Sie aus Hospitality 2035 mitnehmen',
    },
    items: {
      type: 'array',
      default: [
        {
          text: 'Welche Kosten- und Betriebsstrukturen bis 2035 unter Druck geraten',
        },
        {
          text: 'Wo KI und Automatisierung tatsächlich wirtschaftliche Wirkung entfalten können',
        },
        {
          text: 'Wie sich Hotelkonzepte und Flächenbedarfe verändern',
        },
        {
          text: 'Welche Geschäftsmodelle an Bedeutung gewinnen',
        },
        {
          text: 'Wie sich Hotels auf zunehmende Automatisierung vorbereiten können',
        },
        {
          text: 'Welche strategischen Konsequenzen sich für Betreiber, Eigentümer und Investoren ergeben',
        },
      ],
    },
  },
  shell: {
    className: 'block',
    gridClassName: 'block',
  },
  editorPreview: ({
    attributes,
    setAttributes,
  }: {
    attributes: CheckoutBenefitsAttributes & Record<string, any>;
    setAttributes: (attributes: Partial<Record<string, any>>) => void;
  }) => (
    <section className='border-y border-slate-300 py-8 sm:py-10'>
      <WpEditable
        tagName='h3'
        value={attributes.title || defaultTitle}
        onChange={(value) => setAttributes({ title: value })}
        className='font-heading text-2xl font-bold text-brand sm:text-3xl'
      />
      <ul className='mt-6 grid gap-x-10 sm:grid-cols-2'>
        {(attributes.items || defaultItems.map((text) => ({ text }))).map(
          (item, index) => (
            <li
              key={`${index}-${item.text}`}
              className='border-b border-slate-200 py-4 text-sm leading-relaxed text-slate-600'
            >
              <span className='mr-3 font-bold text-accent' aria-hidden='true'>
                —
              </span>
              <WpEditable
                tagName='span'
                value={item.text}
                onChange={(text) =>
                  setAttributes({
                    items: (
                      attributes.items ||
                      defaultItems.map((text) => ({ text }))
                    ).map(
                      (entry, itemIndex) =>
                        itemIndex === index ? { text } : entry,
                    ),
                  })
                }
              />
            </li>
          ),
        )}
      </ul>
    </section>
  ),
  editorPreviewMode: 'override',
  save: ({ attributes }) => {
    const items = attributes.items || defaultItems.map((text) => ({ text }));
    return (
      <section
        aria-labelledby='hospitality-study-benefits'
        className='border-y border-slate-300 py-8 sm:py-10'
      >
        <h3
          id='hospitality-study-benefits'
          className='font-heading text-2xl font-bold text-brand sm:text-3xl'
        >
          {attributes.title || defaultTitle}
        </h3>
        <ul className='mt-6 grid gap-x-10 sm:grid-cols-2'>
          {items.map((item: { text: string }, index: number) => (
            <li
              key={`${index}-${item.text}`}
              className='border-b border-slate-200 py-4 text-sm leading-relaxed text-slate-600'
            >
              <span className='mr-3 font-bold text-accent' aria-hidden='true'>
                —
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </section>
    );
  },
  edit: () => null,
});
