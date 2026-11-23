import { defineWpForm } from '@forgewp/react/config';

export const form = defineWpForm({
  mailTo: 'admin',
  subject: 'New contact message from {name}',
  successMessage: 'Thanks! Your message was received.',
  storeSubmissions: true,
  fields: {
    name: { type: 'text', label: 'Name', required: true },
    email: { type: 'email', label: 'Email', required: true },
    message: { type: 'textarea', label: 'Message', required: true },
  },
});
