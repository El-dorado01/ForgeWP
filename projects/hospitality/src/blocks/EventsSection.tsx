import {
  defineBlock,
  useWpPageLink,
  WpLink,
} from '@forgewp/react';
import { ArrowRight } from 'lucide-react';
export { editable } from '../app/components/EventsSection';

type EventsSectionAttributes = {
  eyebrow?: string;
  intro?: string;
  title?: string;
  description?: string;
};

function EventsSectionMarkup({
  attributes,
}: {
  attributes: EventsSectionAttributes;
}) {
  const eventsHref = useWpPageLink('events-page', '/events');

  return (
    <section
      id='events'
      className='border-t border-slate-200 bg-brand px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-32'
    >
      <div className='mx-auto max-w-[1440px]'>
        <div className='grid gap-10 lg:grid-cols-[0.55fr_1.45fr] lg:gap-16'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-accent sm:text-sm'>
              {attributes.eyebrow || '04 / Events 2026'}
            </p>
            <p className='mt-8 max-w-[220px] text-xs font-semibold uppercase leading-[1.5] tracking-[0.18em] text-slate-400 sm:text-sm'>
              {attributes.intro ||
                'Zwei Orte. Eine gemeinsame Frage nach der Zukunft der Hotellerie.'}
            </p>
          </div>
          <div>
            <h2 className='w-full font-heading text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl lg:text-8xl'>
              {attributes.title || 'Hospitality 2035 live.'}
            </h2>
            <p className='mt-8 max-w-3xl text-lg leading-relaxed text-slate-300'>
              {attributes.description ||
                'Die Veröffentlichung der Studie wird von zwei Gesprächen für Entscheider aus Hotellerie, Technologie, Immobilienwirtschaft und Finanzierung begleitet.'}
            </p>
          </div>
        </div>
        <div className='mt-20 border-t border-white/20 pt-8'>
          <WpLink
            href={eventsHref}
            className='inline-flex min-h-14 items-center justify-center gap-3 bg-accent px-7 py-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
          >
            Alle Veranstaltungen
            <ArrowRight
              size={16}
              aria-hidden='true'
            />
          </WpLink>
        </div>
      </div>
    </section>
  );
}

export default defineBlock({
  name: 'events-section',
  title: 'Hospitality Events Section',
  category: 'theme',
  icon: 'calendar-alt',
  description: 'Editable Hospitality 2035 events section.',
  attributes: {},
  save: ({ attributes }) => (
    <EventsSectionMarkup attributes={attributes} />
  ),
  edit: () => null,
});
