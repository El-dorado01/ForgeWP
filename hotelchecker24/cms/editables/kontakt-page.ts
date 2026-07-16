/**
 * Contact page (Kontakt) — single editable contract.
 *
 * Source of truth for:
 *  - ACF field group (page-kontakt-page.php)
 *  - useWpMeta defaults on Contact* sections
 *
 * Site contact details (phone, email, address, hours, socials) stay in
 * cms site options — not duplicated here.
 */
import {
  defineEditable,
  getEditableDefaults,
  text,
  image,
} from '@forgewp/react';

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Wir sind für Sie da',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Schreiben Sie uns',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default:
      'Fragen zu Hotels, Kooperationsanfragen oder Feedback — unsere Redaktion antwortet innerhalb von 24 Stunden.',
  }),
  card_image: image({
    label: 'Visual Card Image',
    default:
      'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80',
  }),
  card_badge: text({
    label: 'Visual Card Badge',
    default: 'Hauptredaktion Wien',
  }),
  form_title: text({
    label: 'Form Title',
    default: 'Kontaktformular',
  }),
  form_description: text({
    label: 'Form Description',
    default: 'Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.',
  }),
  details_heading: text({
    label: 'Details Card Heading',
    default: 'Kontaktdaten',
  }),
  social_heading: text({
    label: 'Social Card Heading',
    default: 'Social Media',
  }),
});

export const defaults = getEditableDefaults(editable);
