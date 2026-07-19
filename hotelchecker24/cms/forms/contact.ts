/**
 * Contact form — server-side contract for submitWpForm('contact', ...).
 *
 * Source of truth for:
 *  - REST endpoint (/forgewp/v1/forms/contact/submit)
 *  - mail delivery + submission storage (wp-admin > Forms Submissions)
 *
 * Discovered automatically from this file — nothing else needs to reference
 * it. See src/components/ContactForm.tsx for the matching UI.
 */
import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: 'admin',
  subject: 'Neue Kontaktanfrage — {subject}',
  fields: {
    name: { type: 'text', label: 'Ihr Name', required: true },
    email: { type: 'email', label: 'E-Mail-Adresse', required: true },
  },
  clientFields: {
    enabled: true,
    // Per-locale seed — client-owned labels/options are runtime content
    // (typed in wp-admin), not compiled strings, so they can't go through
    // __()/translations.json like the rest of the theme's text. EN copy
    // matches the existing translations already in cms/translations.json
    // (Betreff→Subject, Ihre Nachricht→Your Message, etc.) so both
    // languages stay consistent with the site's other content.
    seed: {
      de: [
        {
          name: 'subject',
          label: 'Betreff',
          type: 'select',
          required: true,
          options: [
            'Hotelanfrage / Empfehlung',
            'Kooperationsanfrage',
            'Redaktionelle Anfrage',
            'Technischer Support',
            'Sonstiges',
          ],
        },
        { name: 'message', label: 'Ihre Nachricht', type: 'textarea', required: true },
      ],
      en: [
        {
          name: 'subject',
          label: 'Subject',
          type: 'select',
          required: true,
          options: [
            'Hotel inquiry / Recommendation',
            'Partnership inquiry',
            'Editorial inquiry',
            'Technical support',
            'Other',
          ],
        },
        { name: 'message', label: 'Your Message', type: 'textarea', required: true },
      ],
    },
  },
  storeSubmissions: true,
});
