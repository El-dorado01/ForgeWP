import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import LicensingSection from '../app/components/LicensingSection';
export { editable } from '../app/components/LicensingSection';
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};
export default defineBlock({
  name: 'licensing-section',
  title: 'Hospitality Licensing Section',
  category: 'theme',
  icon: 'tickets-alt',
  description: 'Editable Hospitality 2035 licensing presentation.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='buy'
      className='border-t border-slate-200 bg-[#f8fafc] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {attributes.eyebrow || '05 / Lizenzen'}
            </p>
            <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
              {attributes.intro ||
                'Der passende Zugang für Einzelpersonen, Teams und Unternehmen'}
            </p>
          </div>
          <div>
            <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
              {attributes.title || 'Die passende Lizenz für Ihren Bedarf.'}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
              {attributes.description ||
                'Sichern Sie sich den vollständigen strategischen Blick auf die wirtschaftliche Zukunft der Hotellerie.'}
            </p>
          </div>
        </div>
        <div className='mt-20 grid gap-5 lg:grid-cols-3'>
          {(attributes.licenses || [
            {
              label: 'Einzellizenz',
              scope: 'Für eine einzelne Person',
              description:
                'Direkter digitaler Zugang zur Studie für die persönliche strategische Arbeit.',
              action: 'Einzellizenz kaufen',
            },
            {
              label: 'Teamlizenz',
              scope: 'Bis zu 10 Nutzer in einem Unternehmen',
              description:
                'Gemeinsame Nutzung für Teams, Abteilungen und interne Strategieprozesse.',
              action: 'Teamlizenz anfragen',
            },
            {
              label: 'Unternehmenslizenz',
              scope: 'Für größere Teams und Hotelgruppen',
              description:
                'Individueller Umfang für mehrere Standorte und große Organisationen.',
              action: 'Unternehmenslizenz anfragen',
            },
          ]).map((license: { label: string; scope: string; description: string; action: string }, index: number) => (
            <article
              key={`${license.label}-${index}`}
              className={`flex min-h-[350px] flex-col border p-6 sm:p-8 ${index === 0 ? 'border-accent bg-brand text-white' : 'border-slate-200 bg-white text-brand'}`}
            >
              <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
                {license.scope}
              </p>
              <h3 className='mt-5 font-heading text-2xl font-bold'>
                {license.label}
              </h3>
              <p className='mt-6 text-sm leading-relaxed text-slate-500'>
                {license.description}
              </p>
              <span className='mt-auto inline-flex border border-current px-4 py-3 text-[10px] font-bold uppercase tracking-[0.1em]'>
                {license.action}
              </span>
            </article>
          ))}
        </div>
        <p className='mt-5 text-xs text-slate-500'>
          {attributes.vatNote ||
            'Alle Preise verstehen sich zuzüglich der gesetzlich anwendbaren Umsatzsteuer.'}
        </p>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <LicensingSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
