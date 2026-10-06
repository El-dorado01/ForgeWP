import { defineBlock } from '@forgewp/react';
import type { Variants } from 'framer-motion';
import PartnersSection from '../app/components/PartnersSection';
export { editable } from '../app/components/PartnersSection';
const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: 'easeOut' },
  },
};
export default defineBlock({
  name: 'partners-section',
  title: 'Hospitality Partners Section',
  category: 'theme',
  icon: 'groups',
  description: 'Editable Hospitality 2035 partner network.',
  attributes: {},
  editorPreview: ({ attributes }) => (
    <section
      id='partners'
      className='border-t border-slate-200 bg-[#f8fafc] px-5 py-20 sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {attributes.eyebrow || '07 / Netzwerk'}
            </p>
            <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
              {attributes.intro ||
                'Ein Branchenprojekt mit institutioneller und technologischer Perspektive'}
            </p>
          </div>
          <div>
            <h2 className='font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] text-brand sm:text-7xl lg:text-8xl'>
              {attributes.title || 'Mit Unterstützung aus der Branche.'}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-600'>
              {attributes.description ||
                'Hospitality 2035 ordnet den Wandel gemeinsam mit Partnern aus Hotellerie, Technologie, Verbänden und Medien ein.'}
            </p>
          </div>
        </div>
        <div className='mt-20 grid gap-5 lg:grid-cols-2'>
          <article className='border border-slate-200 bg-white p-6 sm:p-8'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {attributes.associationLabel ||
                'Studienunterstützer / Branchenpartner'}
            </p>
            <div className='mt-8 grid gap-3 sm:grid-cols-2'>
              {(attributes.associations || [
                { name: 'KNX Deutschland' },
                { name: 'HotellerieSuisse' },
              ]).map((partner: { name: string }, index: number) => (
                <div
                  key={`${partner.name}-${index}`}
                  className='flex min-h-24 items-center justify-center border border-slate-200 p-4 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-600'
                >
                  {partner.name}
                </div>
              ))}
            </div>
            <p className='mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400'>
              {attributes.associationNote ||
                'Weitere Logos werden nach verbindlicher Bestätigung ergänzt.'}
            </p>
          </article>
          <article className='border border-slate-200 bg-brand p-6 text-white sm:p-8'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {attributes.strategicLabel || 'Strategic Partners'}
            </p>
            <div className='mt-8 border-t border-white/20'>
              {(attributes.strategicPartners || [
                {
                  name: 'Accor',
                  role: 'Hospitality / Operator Partner',
                },
                {
                  name: 'Terra Robotics / UBTECH',
                  role: 'Robotics & Automation Partner',
                },
                {
                  name: 'Oracle Hospitality',
                  role: 'Technology & Software Partner',
                },
              ]).map((partner: { name: string; role: string }, index: number) => (
                <div
                  key={`${partner.name}-${index}`}
                  className='border-b border-white/20 py-4 last:border-b-0'
                >
                  <h3 className='font-heading text-lg font-bold'>
                    {partner.name}
                  </h3>
                  <p className='mt-1 text-xs uppercase tracking-[0.12em] text-slate-400'>
                    {partner.role}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
        <div className='mt-5 grid gap-5 sm:grid-cols-2'>
          <div className='border border-slate-200 bg-white p-6'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {attributes.innovationLabel || 'Industry & Innovation Partners'}
            </p>
            <p className='mt-4 font-heading text-xl font-bold text-brand'>
              {(attributes.innovationPartners || [
                { name: 'Häfele' },
                { name: 'DreamBoks' },
              ])
                .map((partner: { name: string }) => partner.name)
                .join(' · ')}
            </p>
          </div>
          <div className='border border-slate-200 bg-white p-6'>
            <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
              {attributes.mediaLabel || 'Media Partner'}
            </p>
            <p className='mt-4 font-heading text-xl font-bold text-brand'>
              {attributes.mediaName || 'hotelinside'}
            </p>
            <p className='mt-2 text-sm leading-relaxed text-slate-500'>
              {attributes.mediaDescription ||
                'Eventmoderation und redaktionelle Berichterstattung.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  ),
  edit: ({ attributes, setAttributes }) => (
    <PartnersSection
      {...attributes}
      setAttributes={setAttributes}
      reduceMotion={false}
      revealInitial={false}
      revealVariants={revealVariants}
    />
  ),
});
