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
  editorPreview: ({ attributes, setAttributes }) => (
    <header className='bg-brand text-white'>
      <div className='mx-auto grid max-w-360 lg:min-h-147.5 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='flex flex-col items-start justify-center px-5 py-12 sm:px-8 sm:py-16 lg:px-14 lg:py-20'>
          <span className='inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-300'>
            ← Alle Veranstaltungen
          </span>
          <label className='mt-10 block text-xs font-semibold text-slate-300'>
            Standort / Format
            <input
              className='mt-2 block w-full border border-white/30 bg-transparent px-3 py-2 text-accent'
              value={attributes.cityLabel || ''}
              onChange={(event) =>
                setAttributes({ cityLabel: event.currentTarget.value })
              }
            />
          </label>
          <h1 className='mt-5 max-w-2xl font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'>
            Hospitality 2035 – Veranstaltung
          </h1>
          <p className='mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg'>
            Titel, Beschreibung und Bild werden im Frontend aus den
            Veranstaltungsdaten übernommen.
          </p>
          <span className='mt-8 inline-flex items-center gap-3 border-b border-accent pb-2 text-sm font-semibold'>
            Programm &amp; Informationen ↓
          </span>
        </div>
        <div className='relative min-h-75 bg-slate-700 sm:min-h-105 lg:min-h-full'>
          <img
            src='/assets/hospitality-cover.png'
            alt='Hospitality 2035 Veranstaltung'
            className='absolute inset-0 h-full w-full object-cover'
          />
          <div className='absolute inset-0 bg-linear-to-t from-brand/30 to-transparent' />
        </div>
      </div>
    </header>
  ),
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
