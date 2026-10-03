import { defineBlock } from '@forgewp/react';
import { EventOverviewSection } from '../app/components/EventPageSections';

export default defineBlock({
  name: 'hospitality-event-overview',
  title: 'Hospitality Event Information',
  category: 'theme',
  icon: 'info-outline',
  description: 'Editable date, venue, and panel details.',
  attributes: {
    timing: { type: 'string', default: 'Termin wird bekannt gegeben' },
    location: { type: 'string', default: 'Veranstaltungsort folgt' },
    participants: { type: 'string', default: 'Weitere Angaben folgen' },
  },
  edit: ({ attributes, setAttributes }) => (
    <EventOverviewSection
      {...attributes}
      setAttributes={setAttributes}
    />
  ),
  save: ({ attributes }) => <EventOverviewSection {...attributes} />,
});
