import {
  defineWpOptions,
  optionPostPicker,
  optionText,
  optionUrl,
  optionEmail,
} from '@forgewp/react/config';

export const siteOptions = defineWpOptions({
  hotel_of_the_month: optionPostPicker({
    postType: 'hotel',
    label: 'Hotel of the Month',
    default: '6',
  }),
  contact_phone: optionText({
    label: 'Contact Phone',
    default: '+43 1 234 5678',
  }),
  contact_email: optionEmail({
    label: 'Contact Email',
    default: 'office@hotelchecker24.com',
  }),
  contact_address: optionText({
    label: 'Contact Address',
    default: 'Kärntner Ring 5-7, 1010 Wien, Österreich',
  }),
  business_hours: optionText({
    label: 'Business Hours',
    default: 'Mon - Fri: 9:00 - 18:00',
  }),
  social_facebook: optionUrl({
    label: 'Facebook URL',
    default: 'https://facebook.com/hotelchecker24',
  }),
  social_instagram: optionUrl({
    label: 'Instagram URL',
    default: 'https://instagram.com/hotelchecker24',
  }),
  social_twitter: optionUrl({
    label: 'Twitter URL',
    default: 'https://twitter.com/hotelchecker24',
  }),
  social_youtube: optionUrl({
    label: 'YouTube URL',
    default: '',
  }),
  social_tiktok: optionUrl({
    label: 'TikTok URL',
    default: '',
  }),
  social_linkedin: optionUrl({
    label: 'LinkedIn URL',
    default: '',
  }),
  social_pinterest: optionUrl({
    label: 'Pinterest URL',
    default: '',
  }),

  // Static section labels shared by every single-hotel/single-listicle post
  // (repeated UI chrome, not per-post content — edited once, applies to all).
  single_hotel_review_heading: optionText({
    label: 'Single Hotel: Review Section Heading',
    default: 'Redaktionelle Bewertung',
  }),
  single_hotel_gallery_heading: optionText({
    label: 'Single Hotel: Gallery Section Heading',
    default: 'Impressionen & Galerie',
  }),
  single_hotel_specs_heading: optionText({
    label: 'Single Hotel: Specifications Heading',
    default: 'Hotel Spezifikationen',
  }),
  single_hotel_contact_heading: optionText({
    label: 'Single Hotel: Contact Section Heading',
    default: 'Kontakt & Buchung',
  }),
  single_hotel_inquiry_cta: optionText({
    label: 'Single Hotel: Inquiry Button Label',
    default: 'Jetzt Aufenthalt anfragen',
  }),
  single_hotel_back_label: optionText({
    label: 'Single Hotel: Back Button Label',
    default: 'Zurück zum Verzeichnis',
  }),

  single_listicle_badge_label: optionText({
    label: 'Single Listicle: Eyebrow Badge Label',
    default: 'Redaktioneller Beitrag',
  }),
  single_listicle_back_label: optionText({
    label: 'Single Listicle: Back Button Label',
    default: 'Zurück zur Übersicht',
  }),
});
