import { Hydrate } from '@forgewp/react';
import { ContactForm } from '@/components/ContactForm';

export const metadata = { title: 'Contact · Parity' };

export default function ContactPage() {
  return (
    <main className="fwp-content">
      <h1 className="fwp-page-title" data-parity="title">Contact</h1>
      <Hydrate id="contact-form" trigger="visible">
        <ContactForm />
      </Hydrate>
    </main>
  );
}
