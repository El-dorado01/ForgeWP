import { defineBlock } from '@forgewp/react';
import { EventHeroSection } from '../app/components/EventPageSections';

export default defineBlock({
  name: 'hospitality-event-hero',
  title: 'Hospitality Event Hero',
  category: 'theme',
  icon: 'cover-image',
  description: 'Event title and featured image from the current event post.',
  attributes: {
    cityLabel: { type: 'string', default: 'Hospitality 2035 / Event' },
  },
  edit: ({ attributes, setAttributes }) => (
    <div className='border border-brand/20 p-5'>
      <label className='block text-sm font-semibold text-brand'>
        Standort / Format
        <input
          className='mt-2 block w-full border border-brand/20 px-3 py-2'
          value={attributes.cityLabel || ''}
          onChange={(event) =>
            setAttributes({ cityLabel: event.currentTarget.value })
          }
        />
      </label>
      <p className='mt-3 text-sm text-slate-600'>
        Titel, Kurzbeschreibung und Bild werden aus den Veranstaltungsdaten
        übernommen.
      </p>
    </div>
  ),
  save: ({ attributes }) => <EventHeroSection {...attributes} />,
});
