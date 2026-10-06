import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  defineBlock,
  useWpCustomField,
  useWpFeaturedImage,
  useWpPermalink,
  useWpTitle,
  WpEditable,
  WpImage,
  WpLink,
  WpQueryLoop,
} from '@forgewp/react';

type EventsArchiveHeroAttributes = {
  eyebrow?: string;
  heading?: string;
  description?: string;
  actionLabel?: string;
  setAttributes?: (attributes: Partial<EventsArchiveHeroAttributes>) => void;
};

function FeaturedEventTile() {
  const title = useWpTitle();
  const label = useWpCustomField('city_label', title);
  const image = useWpFeaturedImage() || '/assets/hospitality-cover.png';
  const permalink = useWpPermalink();

  return (
    <WpLink
      href={permalink}
      className='group relative min-h-90 overflow-hidden sm:min-h-115 lg:min-h-full'
    >
      <WpImage
        src={image}
        alt={label}
        className='absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]'
      />
      <div className='absolute inset-0 bg-linear-to-t from-brand/80 via-brand/5 to-transparent' />
      <span className='absolute bottom-6 left-5 flex items-center gap-2 font-heading text-2xl font-bold text-white sm:bottom-9 sm:left-8 sm:text-3xl'>
        {label}
        <ArrowUpRight
          size={19}
          aria-hidden='true'
        />
      </span>
    </WpLink>
  );
}

function EventsArchiveHero({
  eyebrow = 'Hospitality 2035 / Study & Executive Events',
  heading = 'Die Zukunft der Hotellerie im Gespräch.',
  description = 'Veranstaltungen bringen die Erkenntnisse aus Hospitality 2035 mit Entscheiderinnen und Entscheidern aus Hotellerie, Technologie und Immobilienwirtschaft zusammen.',
  actionLabel = 'Veranstaltungen entdecken',
  setAttributes,
}: EventsArchiveHeroAttributes) {
  return (
    <header className='overflow-hidden bg-brand text-white'>
      <div className='mx-auto grid max-w-360 lg:min-h-155 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='flex flex-col items-start justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24'>
          <WpEditable
            tagName='p'
            value={eyebrow}
            onChange={(value) => setAttributes?.({ eyebrow: value })}
            className='text-xs font-bold uppercase tracking-[0.18em] text-accent'
          />
          <WpEditable
            tagName='h1'
            value={heading}
            onChange={(value) => setAttributes?.({ heading: value })}
            className='mt-8 max-w-2xl font-heading text-5xl font-black leading-[0.98] sm:text-6xl lg:text-7xl'
          />
          <WpEditable
            tagName='p'
            value={description}
            onChange={(value) => setAttributes?.({ description: value })}
            className='mt-7 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg'
          />
          <a
            href='#termine'
            className='mt-9 inline-flex items-center gap-3 border-b border-accent pb-2 text-sm font-semibold text-white transition-colors hover:text-accent'
          >
            <WpEditable
              tagName='span'
              value={actionLabel}
              onChange={(value) => setAttributes?.({ actionLabel: value })}
            />
            <ArrowDownRight
              size={17}
              aria-hidden='true'
            />
          </a>
        </div>
        <div className='grid min-h-90 grid-cols-2 lg:min-h-full'>
          <WpQueryLoop
            postType='hospitality_event'
            postsPerPage={2}
          >
            <FeaturedEventTile />
          </WpQueryLoop>
        </div>
      </div>
    </header>
  );
}

export default defineBlock({
  name: 'events-archive-hero',
  title: 'Hospitality Events Archive Hero',
  category: 'theme',
  icon: 'calendar-alt',
  description: 'Editable events introduction with live featured events.',
  attributes: {
    eyebrow: {
      type: 'string',
      default: 'Hospitality 2035 / Study & Executive Events',
    },
    heading: {
      type: 'string',
      default: 'Die Zukunft der Hotellerie im Gespräch.',
    },
    description: {
      type: 'string',
      default:
        'Veranstaltungen bringen die Erkenntnisse aus Hospitality 2035 mit Entscheiderinnen und Entscheidern aus Hotellerie, Technologie und Immobilienwirtschaft zusammen.',
    },
    actionLabel: {
      type: 'string',
      default: 'Veranstaltungen entdecken',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <EventsArchiveHero
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <EventsArchiveHero {...attributes} />,
});
