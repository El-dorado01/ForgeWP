import { buildPageEditable, getEditableDefaults } from '@forgewp/react';
import { editable as heroEditable } from './sections/hero';
import { editable as studyEditable } from './sections/study';
import { editable as audiencesEditable } from './sections/audiences';
import { editable as previewEditable } from './sections/preview';
import { editable as eventsEditable } from './sections/events';
import { editable as automationEditable } from './sections/automation';
import { editable as aboutEditable } from './sections/about';
import { editable as partnersEditable } from './sections/partners';
import { editable as licensingEditable } from './sections/licensing';
import { editable as checkoutEditable } from './sections/checkout';

export const pageEditableSections = [
  {
    section: 'hero',
    prefix: 'hero_',
    rename: {
      previewLabel: 'preview_label',
      buyLabel: 'buy_label',
      scrollLabel: 'scroll_label',
      coverAlt: 'cover_alt',
    },
  },
  {
    section: 'study',
    prefix: 'study_',
    rename: {
      frameworkLabel: 'framework_label',
      frameworkTitle: 'framework_title',
      frameworkDescription: 'framework_description',
    },
  },
  { section: 'audiences', prefix: 'audiences_' },
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
  { section: 'events', prefix: 'events_' },
  {
    section: 'automation',
    prefix: 'automation_',
    rename: {
      imageAlt: 'image_alt',
      detailTitle: 'detail_title',
      detailDescription: 'detail_description',
      secondImageAlt: 'second_image_alt',
    },
  },
  {
    section: 'about',
    prefix: 'about_',
    rename: {
      companyDescription: 'company_description',
      cityLabel: 'city_label',
      foundedLabel: 'founded_label',
      authorLabel: 'author_label',
      authorName: 'author_name',
      authorRole: 'author_role',
      authorDescription: 'author_description',
    },
  },
  {
    section: 'partners',
    prefix: 'partners_',
    rename: {
      associationLabel: 'association_label',
      associationNote: 'association_note',
      strategicLabel: 'strategic_label',
      strategicPartners: 'strategic_partners',
      innovationLabel: 'innovation_label',
      innovationPartners: 'innovation_partners',
      mediaLabel: 'media_label',
      mediaName: 'media_name',
      mediaDescription: 'media_description',
    },
  },
  {
    section: 'licensing',
    prefix: 'licensing_',
    rename: { vatNote: 'vat_note' },
  },
  {
    section: 'checkout',
    prefix: 'checkout_',
    rename: {
      consentText: 'consent_text',
      consentNote: 'consent_note',
      productLabel: 'product_label',
      productName: 'product_name',
      orderButtonLabel: 'order_button_label',
      integrationNote: 'integration_note',
      liveSystemLabel: 'live_system_label',
    },
  },
];

export const editable = buildPageEditable([
  {
    schema: heroEditable,
    prefix: 'hero_',
    rename: {
      previewLabel: 'preview_label',
      buyLabel: 'buy_label',
      scrollLabel: 'scroll_label',
      coverAlt: 'cover_alt',
    },
  },
  {
    schema: studyEditable,
    prefix: 'study_',
    rename: {
      frameworkLabel: 'framework_label',
      frameworkTitle: 'framework_title',
      frameworkDescription: 'framework_description',
    },
  },
  { schema: audiencesEditable, prefix: 'audiences_' },
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
  { schema: eventsEditable, prefix: 'events_' },
  {
    schema: automationEditable,
    prefix: 'automation_',
    rename: {
      imageAlt: 'image_alt',
      detailTitle: 'detail_title',
      detailDescription: 'detail_description',
      secondImageAlt: 'second_image_alt',
    },
  },
  {
    schema: aboutEditable,
    prefix: 'about_',
    rename: {
      companyDescription: 'company_description',
      cityLabel: 'city_label',
      foundedLabel: 'founded_label',
      authorLabel: 'author_label',
      authorName: 'author_name',
      authorRole: 'author_role',
      authorDescription: 'author_description',
    },
  },
  {
    schema: partnersEditable,
    prefix: 'partners_',
    rename: {
      associationLabel: 'association_label',
      associationNote: 'association_note',
      strategicLabel: 'strategic_label',
      strategicPartners: 'strategic_partners',
      innovationLabel: 'innovation_label',
      innovationPartners: 'innovation_partners',
      mediaLabel: 'media_label',
      mediaName: 'media_name',
      mediaDescription: 'media_description',
    },
  },
  {
    schema: licensingEditable,
    prefix: 'licensing_',
    rename: { vatNote: 'vat_note' },
  },
  {
    schema: checkoutEditable,
    prefix: 'checkout_',
    rename: {
      consentText: 'consent_text',
      consentNote: 'consent_note',
      productLabel: 'product_label',
      productName: 'product_name',
      orderButtonLabel: 'order_button_label',
      integrationNote: 'integration_note',
      liveSystemLabel: 'live_system_label',
    },
  },
]);

export const defaults = getEditableDefaults(editable);
