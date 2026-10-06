import { defineBlock, WpEditable } from '@forgewp/react';

type LegalDocumentSectionAttributes = {
  heading?: string;
  body?: string;
  setAttributes?: (attributes: Partial<LegalDocumentSectionAttributes>) => void;
};

function LegalDocumentSection({
  heading = 'Abschnittsüberschrift',
  body = 'Absatztext. Ergänzen Sie weitere Absätze, Listen und Links mit den WordPress-Inhaltsblöcken.',
  setAttributes,
}: LegalDocumentSectionAttributes) {
  return (
    <section className='mx-auto max-w-6xl px-6 py-6 sm:px-8 lg:px-12'>
      <WpEditable
        tagName='h2'
        value={heading}
        onChange={(value) => setAttributes?.({ heading: value })}
        className='font-heading text-xl font-bold leading-tight text-brand sm:text-2xl'
      />
      <WpEditable
        tagName='p'
        value={body}
        onChange={(value) => setAttributes?.({ body: value })}
        className='mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base'
      />
    </section>
  );
}

export default defineBlock({
  name: 'legal-document-section',
  title: 'Hospitality Legal Document Section',
  category: 'theme',
  icon: 'text',
  description:
    'Reusable legal heading and copy section; combine with core list and paragraph blocks for longer documents.',
  attributes: {
    heading: { type: 'string', default: 'Abschnittsüberschrift' },
    body: {
      type: 'string',
      default:
        'Absatztext. Ergänzen Sie weitere Absätze, Listen und Links mit den WordPress-Inhaltsblöcken.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <LegalDocumentSection
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <LegalDocumentSection {...attributes} />,
});
