import { defineBlock } from '@forgewp/react';
import { EventProgramSection } from '../app/components/EventPageSections';

export default defineBlock({
  name: 'hospitality-event-program',
  title: 'Hospitality Event Programme',
  category: 'theme',
  icon: 'list-view',
  description: 'Editable event programme section.',
  attributes: {
    program: {
      type: 'string',
      default: 'Weitere Programminformationen folgen.',
    },
  },
  edit: ({ attributes, setAttributes }) => (
    <EventProgramSection
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <EventProgramSection {...attributes} />,
});
