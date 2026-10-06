import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import {
  defineBlock,
  useWpCustomField,
  useWpExcerpt,
  useWpFeaturedImage,
  useWpPermalink,
  useWpTitle,
  WpEditable,
  WpImage,
  WpLink,
  WpQueryLoop,
} from '@forgewp/react';

type EventsArchiveListingAttributes = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  setAttributes?: (attributes: Partial<EventsArchiveListingAttributes>) => void;
};

function EventListingItem() {
  const title = useWpTitle();
  const cityLabel = useWpCustomField('city_label', title);
  const image = useWpFeaturedImage() || '/assets/hospitality-cover.png';
  const permalink = useWpPermalink();

  return (
    <article className='grid gap-6 border-b border-brand/20 py-8 last:border-b-0 sm:grid-cols-[220px_0.34fr_0.66fr] sm:gap-8 sm:py-10'>
      <WpImage
        src={image}
        alt={title}
        className='aspect-video w-full object-cover sm:aspect-4/3'
      />
      <div className='flex flex-col gap-3'>
        <p className='font-heading text-3xl font-bold text-brand sm:text-4xl'>
          {cityLabel}
        </p>
        <p className='flex items-center gap-2 text-sm font-medium text-slate-600'>
          <CalendarDays
            size={16}
            aria-hidden='true'
          />
          {useWpCustomField('timing', 'Termin wird bekannt gegeben')}
        </p>
        <p className='flex items-center gap-2 text-sm text-slate-600'>
          <MapPin
            size={16}
            aria-hidden='true'
          />
          {useWpCustomField('location', 'Veranstaltungsort folgt')}
        </p>
      </div>
      <div className='flex flex-col items-start'>
        <h3 className='font-heading text-2xl font-bold text-brand sm:text-3xl'>
          {title}
        </h3>
        <p className='mt-3 max-w-2xl text-base leading-relaxed text-slate-600'>
          {useWpExcerpt()}
        </p>
        <WpLink
          href={permalink}
          className='mt-6 inline-flex items-center gap-2 border-b border-brand pb-2 text-xs font-bold uppercase text-brand transition-colors hover:border-accent hover:text-accent'
        >
          Veranstaltungsdetails
          <ArrowUpRight
            size={16}
            aria-hidden='true'
          />
        </WpLink>
      </div>
    </article>
  );
}

function EventsArchiveListing({
  eyebrow = 'Nächste Termine',
  heading = 'Termine & Formate',
  description = 'Informationen zu Termin, Veranstaltungsort und Programm werden hier laufend ergänzt.',
  setAttributes,
}: EventsArchiveListingAttributes) {
  return (
    <section
      id='termine'
      className='mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28'
    >
      <div className='mb-10 flex flex-col justify-between gap-5 border-b border-brand/20 pb-7 sm:flex-row sm:items-end'>
        <div>
          <WpEditable
            tagName='p'
            value={eyebrow}
            onChange={(value) => setAttributes?.({ eyebrow: value })}
            className='text-xs font-bold uppercase tracking-[0.18em] text-accent'
          />
          <WpEditable
            tagName='h2'
            value={heading}
            onChange={(value) => setAttributes?.({ heading: value })}
            className='mt-3 font-heading text-3xl font-bold sm:text-4xl'
          />
        </div>
        <WpEditable
          tagName='p'
          value={description}
          onChange={(value) => setAttributes?.({ description: value })}
          className='max-w-md text-sm leading-relaxed text-slate-600'
        />
      </div>
      <WpQueryLoop
        postType='hospitality_event'
        postsPerPage={10}
      >
        <EventListingItem />
      </WpQueryLoop>
    </section>
  );
}

export default defineBlock({
  name: 'events-archive-listing',
  title: 'Hospitality Events Listing',
  category: 'theme',
  icon: 'list-view',
  description: 'Editable event listing section backed by Hospitality events.',
  attributes: {
    eyebrow: { type: 'string', default: 'Nächste Termine' },
    heading: { type: 'string', default: 'Termine & Formate' },
    description: {
      type: 'string',
      default:
        'Informationen zu Termin, Veranstaltungsort und Programm werden hier laufend ergänzt.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <EventsArchiveListing
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <EventsArchiveListing {...attributes} />,
});
