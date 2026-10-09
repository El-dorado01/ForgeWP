import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: 'contact@dicon-beratung.de',
  subject: 'Neue Teamlizenz-Anfrage – Hospitality 2035',
  submissionTitle: 'Teamlizenz — {company} — {firstName} {lastName}',
  successMessage:
    'Vielen Dank. Ihre Anfrage ist bei DICON eingegangen. Eine Eingangsbestätigung wird an Ihre E-Mail-Adresse versendet. Die Anfrage stellt noch keinen Vertragsschluss dar.',
  notificationBody: `Neue Teamlizenz-Anfrage

Vorname: {firstName}
Nachname: {lastName}
Unternehmen: {company}
E-Mail: {email}
Telefon: {phone}
Geplante Nutzerzahl: {userCount}
Nachricht: {message}`,
  storeSubmissions: true,
  retentionDays: 180,
  fields: {
    firstName: { type: 'text', label: 'Vorname', required: true },
    lastName: { type: 'text', label: 'Nachname', required: true },
    company: { type: 'text', label: 'Unternehmen', required: true },
    street: {
      type: 'text',
      label: 'Straße und Hausnummer',
      required: true,
    },
    postalCode: { type: 'text', label: 'Postleitzahl', required: true },
    city: { type: 'text', label: 'Ort', required: true },
    country: { type: 'text', label: 'Land', required: true },
    email: {
      type: 'email',
      label: 'Geschäftliche E-Mail-Adresse',
      required: true,
    },
    phone: { type: 'tel', label: 'Telefonnummer', required: true },
    userCount: {
      type: 'number',
      label: 'Geplante Nutzerzahl',
      required: true,
    },
  },
  clientFields: {
    enabled: true,
    seed: [
      {
        name: 'message',
        type: 'textarea',
        label: 'Nachricht oder Rückrufhinweis',
        required: false,
      },
    ],
  },
  confirmation: {
    enabled: true,
    emailField: 'email',
    subject: 'Eingangsbestätigung Ihrer Teamlizenz-Anfrage',
    body: `Guten Tag {firstName},

vielen Dank für Ihre Anfrage zur Teamlizenz von Hospitality 2035. Wir haben Ihre Anfrage erhalten und melden uns mit den nächsten Informationen zu Bestellung und Rechnungsstellung.

Ihre Anfrage stellt noch keinen Vertragsschluss dar. Der Vertrag kommt erst durch ein gesondertes Angebot und dessen Annahme zustande.

Freundliche Grüße
DICON Marketing- und Beratungsgesellschaft mbH`,
  },
});
