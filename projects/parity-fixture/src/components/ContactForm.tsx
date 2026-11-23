'use client';

import { useWpForm } from '@forgewp/react';

export function ContactForm() {
  const { handleSubmit, isSubmitting, status, message, errors } = useWpForm('contact', {
    resetOnSuccess: true,
  });
  return (
    <form className="fwp-form" onSubmit={handleSubmit} noValidate>
      <label>
        Name
        <input name="name" required />
        {errors.name && <span className="fwp-error">{errors.name}</span>}
      </label>
      <label>
        Email
        <input name="email" type="email" required />
        {errors.email && <span className="fwp-error">{errors.email}</span>}
      </label>
      <label>
        Message
        <textarea name="message" rows={4} required />
        {errors.message && <span className="fwp-error">{errors.message}</span>}
      </label>
      <button type="submit" className="fwp-button" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send'}
      </button>
      {message && (
        <p role="status" data-status={status} className="fwp-form-status" data-parity="form-status">
          {message}
        </p>
      )}
    </form>
  );
}
