import { buildPageEditable, getEditableDefaults } from '@forgewp/react';
import { editable as studyEditable } from './sections/study';
import { editable as previewEditable } from './sections/preview';
import { editable as partnersEditable } from './sections/partners';

export const pageEditableSections = [
  { section: 'study', prefix: 'study_' },
  {
    section: 'preview',
    prefix: 'preview_',
    rename: {
      scopeLabel: 'scope_label',
      scopeValue: 'scope_value',
      formatLabel: 'format_label',
      formatValue: 'format_value',
      sampleLabel: 'sample_label',
      sampleValue: 'sample_value',
      previewLabel: 'preview_label',
      pendingNote: 'pending_note',
      coverAlt: 'cover_alt',
    },
  },
  { section: 'partners', prefix: 'partners_' },
];

export const editable = buildPageEditable([
  { schema: studyEditable, prefix: 'study_' },
  {
    schema: previewEditable,
    prefix: 'preview_',
    rename: {
      scopeLabel: 'scope_label',
      scopeValue: 'scope_value',
      formatLabel: 'format_label',
      formatValue: 'format_value',
      sampleLabel: 'sample_label',
      sampleValue: 'sample_value',
      previewLabel: 'preview_label',
      pendingNote: 'pending_note',
      coverAlt: 'cover_alt',
    },
  },
  { schema: partnersEditable, prefix: 'partners_' },
]);

export const defaults = getEditableDefaults(editable);
