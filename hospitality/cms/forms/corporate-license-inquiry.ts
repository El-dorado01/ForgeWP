import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: 'contact@dicon-beratung.de',
  subject: 'Neue Unternehmenslizenz-Anfrage – Hospitality 2035',
  storeSubmissions: true,
  retentionDays: 180,
  fields: {
    firstName: { type: 'text', label: 'Vorname', required: true },
    lastName: { type: 'text', label: 'Nachname', required: true },
    company: {
      type: 'text',
      label: 'Unternehmen / Hotelgruppe',
      required: true,
    },
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
    locations: { type: 'number', label: 'Anzahl der Standorte' },
    scope: {
      type: 'textarea',
      label: 'Gewünschter Nutzungsumfang',
      required: true,
    },
    message: { type: 'textarea', label: 'Weitere Informationen' },
  },
  confirmation: {
    enabled: true,
    emailField: 'email',
    subject: 'Eingangsbestätigung Ihrer Unternehmenslizenz-Anfrage',
    body: `Guten Tag {firstName},

vielen Dank für Ihre Anfrage zur Unternehmenslizenz von Hospitality 2035. Wir haben Ihre Anfrage erhalten und stimmen den passenden Lizenzumfang und das Angebot mit Ihnen ab.

Ihre Anfrage stellt noch keinen Vertragsschluss dar. Der Vertrag kommt erst durch ein gesondertes Angebot und dessen Annahme zustande.

Freundliche Grüße
DICON Marketing- und Beratungsgesellschaft mbH`,
  },
});
