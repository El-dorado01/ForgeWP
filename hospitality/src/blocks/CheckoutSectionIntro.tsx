import { defineBlock, WpEditable } from '@forgewp/react';

export default defineBlock({
  name: 'checkout-section-intro',
  title: 'Checkout Section Intro',
  category: 'theme',
  icon: 'heading',
  description: 'Editable introduction for the Hospitality checkout section.',
  attributes: {
    eyebrow: { type: 'string', default: '09 / Checkout' },
    intro: {
      type: 'string',
      default: 'Die Studie für Entscheiderinnen und Entscheider',
    },
    title: {
      type: 'string',
      default: 'Hospitality 2035',
    },
    description: {
      type: 'string',
      default:
        'Wie sich die wirtschaftliche Logik der Hotellerie verändert. Eine strategische Analyse für Entscheiderinnen und Entscheider aus Hotellerie, Immobilien-, Finanz- und Technologiebranche – auf rund 90 Seiten.',
    },
  },
  editorPreview: ({ attributes, setAttributes }) => (
    <div
      id='checkout'
      className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'
    >
      <div>
        <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
          <WpEditable
            tagName='span'
            value={attributes.eyebrow || '09 / Checkout'}
            onChange={(value) => setAttributes({ eyebrow: value })}
          />
        </p>
        <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
          <WpEditable
            tagName='span'
            value={
              attributes.intro ||
              'Die Studie für Entscheiderinnen und Entscheider'
            }
            onChange={(value) => setAttributes({ intro: value })}
          />
        </p>
      </div>
      <div>
        <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
          <WpEditable
            tagName='span'
            value={attributes.title || 'Hospitality 2035'}
            onChange={(value) => setAttributes({ title: value })}
          />
        </h2>
        <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
          <WpEditable
            tagName='span'
            value={
              attributes.description ||
              'Wie sich die wirtschaftliche Logik der Hotellerie verändert. Eine strategische Analyse für Entscheiderinnen und Entscheider aus Hotellerie, Immobilien-, Finanz- und Technologiebranche – auf rund 90 Seiten.'
            }
            onChange={(value) => setAttributes({ description: value })}
          />
        </p>
      </div>
    </div>
  ),
  save: ({ attributes }) => (
    <section
      id='checkout'
      className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'
    >
      <div>
        <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
          {attributes.eyebrow || '09 / Checkout'}
        </p>
        <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
          {attributes.intro ||
            'Die Studie für Entscheiderinnen und Entscheider'}
        </p>
      </div>
      <div>
        <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
          {attributes.title || 'Hospitality 2035'}
        </h2>
        <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
          {attributes.description ||
            'Wie sich die wirtschaftliche Logik der Hotellerie verändert. Eine strategische Analyse für Entscheiderinnen und Entscheider aus Hotellerie, Immobilien-, Finanz- und Technologiebranche – auf rund 90 Seiten.'}
        </p>
      </div>
    </section>
  ),
  edit: () => null,
});
