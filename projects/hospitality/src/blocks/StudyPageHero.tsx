import { defineBlock, WpEditable } from '@forgewp/react';

type StudyPageHeroAttributes = {
  eyebrow?: string;
  heading?: string;
  summary?: string;
  setAttributes?: (attributes: Partial<StudyPageHeroAttributes>) => void;
};

function StudyPageHero({
  eyebrow = 'Hospitality 2035 / Die Studie',
  heading = 'Wie sich die wirtschaftliche Logik der Hotellerie verändert.',
  summary = 'Eine strategische Studie über Kosten, Technologie, Betreiber- und Raumkonzepte sowie die nächste Phase der Hospitality.',
  setAttributes,
}: StudyPageHeroAttributes) {
  return (
    <section className='border-b border-slate-200 bg-brand px-5 py-20 text-white sm:px-8 lg:px-12 lg:py-28'>
      <div className='mx-auto max-w-360'>
        <WpEditable
          tagName='p'
          value={eyebrow}
          onChange={(value) => setAttributes?.({ eyebrow: value })}
          className='text-xs font-bold uppercase tracking-[0.2em] text-accent'
        />
        <WpEditable
          tagName='h1'
          value={heading}
          onChange={(value) => setAttributes?.({ heading: value })}
          className='mt-8 max-w-5xl font-heading text-6xl font-black leading-[0.84] sm:text-8xl lg:text-[10rem]'
        />
        <WpEditable
          tagName='p'
          value={summary}
          onChange={(value) => setAttributes?.({ summary: value })}
          className='mt-10 max-w-2xl text-lg leading-relaxed text-slate-300'
        />
      </div>
    </section>
  );
}

export default defineBlock({
  name: 'study-page-hero',
  title: 'Hospitality Study Hero',
  category: 'theme',
  icon: 'cover-image',
  description: 'A fully editable hero section for the study page.',
  attributes: {
    eyebrow: { type: 'string', default: 'Hospitality 2035 / Die Studie' },
    heading: {
      type: 'string',
      default: 'Wie sich die wirtschaftliche Logik der Hotellerie verändert.',
    },
    summary: {
      type: 'string',
      default:
        'Eine strategische Studie über Kosten, Technologie, Betreiber- und Raumkonzepte sowie die nächste Phase der Hospitality.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <StudyPageHero
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <StudyPageHero {...attributes} />,
});
