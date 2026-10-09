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
      previewUrl: 'preview_url',
      buyLabel: 'buy_label',
      buyUrl: 'buy_url',
      scrollLabel: 'scroll_label',
      scrollUrl: 'scroll_url',
      coverImage: 'cover_image',
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
      downloadUrl: 'download_url',
      previewImage: 'image',
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
      primaryImage: 'primary_image',
      detailTitle: 'detail_title',
      detailDescription: 'detail_description',
      secondImageAlt: 'second_image_alt',
      secondaryImage: 'secondary_image',
    },
  },
  {
    section: 'about',
    prefix: 'about_',
    rename: {
      companyDescription: 'company_description',
      companyLogo: 'company_logo',
      cityLabel: 'city_label',
      foundedLabel: 'founded_label',
      authorLabel: 'author_label',
      authorName: 'author_name',
      authorRole: 'author_role',
      authorDescription: 'author_description',
      contactLabel: 'contact_label',
      contactUrl: 'contact_url',
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
      mediaLogo: 'media_logo',
      mediaName: 'media_name',
      mediaDescription: 'media_description',
      ihaLogo: 'iha_logo',
      ihaUrl: 'iha_url',
    },
  },
  {
    section: 'licensing',
    prefix: 'licensing_',
    rename: {
      vatNote: 'vat_note',
      singleLicenseUrl: 'single_license_url',
      teamLicenseUrl: 'team_license_url',
      companyLicenseUrl: 'company_license_url',
    },
  },
  {
    section: 'checkout',
    prefix: 'checkout_',
    rename: {
      takeawaysTitle: 'takeaways_title',
      previewButtonLabel: 'preview_button_label',
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
      previewUrl: 'preview_url',
      buyLabel: 'buy_label',
      buyUrl: 'buy_url',
      scrollLabel: 'scroll_label',
      scrollUrl: 'scroll_url',
      coverImage: 'cover_image',
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
      downloadUrl: 'download_url',
      previewImage: 'image',
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
      primaryImage: 'primary_image',
      detailTitle: 'detail_title',
      detailDescription: 'detail_description',
      secondImageAlt: 'second_image_alt',
      secondaryImage: 'secondary_image',
    },
  },
  {
    schema: aboutEditable,
    prefix: 'about_',
    rename: {
      companyDescription: 'company_description',
      companyLogo: 'company_logo',
      cityLabel: 'city_label',
      foundedLabel: 'founded_label',
      authorLabel: 'author_label',
      authorName: 'author_name',
      authorRole: 'author_role',
      authorDescription: 'author_description',
      contactLabel: 'contact_label',
      contactUrl: 'contact_url',
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
      mediaLogo: 'media_logo',
      mediaName: 'media_name',
      mediaDescription: 'media_description',
      ihaLogo: 'iha_logo',
      ihaUrl: 'iha_url',
    },
  },
  {
    schema: licensingEditable,
    prefix: 'licensing_',
    rename: {
      vatNote: 'vat_note',
      singleLicenseUrl: 'single_license_url',
      teamLicenseUrl: 'team_license_url',
      companyLicenseUrl: 'company_license_url',
    },
  },
  {
    schema: checkoutEditable,
    prefix: 'checkout_',
    rename: {
      takeawaysTitle: 'takeaways_title',
      previewButtonLabel: 'preview_button_label',
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
