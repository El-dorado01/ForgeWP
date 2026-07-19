import React from 'react';
import { useWpI18n, submitWpForm, WpFormFields } from '../.forgewp/wordpress';
import { Send } from 'lucide-react';

const inputClassName =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all';

function getUrlPrefill(__: (key: string) => string): { subject: string; message: string } {
  if (typeof window === 'undefined') {
    return { subject: '', message: '' };
  }
  const params = new URLSearchParams(window.location.search);
  const subjectParam = params.get('subject');
  const hotelParam = params.get('inquiry_hotel');
  return {
    subject: subjectParam || '',
    message: hotelParam ? `${__('Anfrage zu Hotel:')} ${hotelParam}\n\n` : '',
  };
}

/**
 * ContactForm — hydration island
 *
 * Extracted from KontaktPage so ForgeWP detects it as an interactive
 * island and hydrates it in the browser. This ensures React's onSubmit
 * fires instead of the browser falling back to a native GET form submit.
 *
 * Name/email are dev-owned fields; subject/message are client-owned
 * (editable in wp-admin under Forms) and render through <WpFormFields>.
 */
export default function ContactForm({
  formTitle,
  formDescription,
}: {
  formTitle: string;
  formDescription: string;
}) {
  const { __ } = useWpI18n();
  const [status, setStatus] = React.useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  const prefill = getUrlPrefill(__);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    const result = await submitWpForm('contact', new FormData(e.currentTarget));

    if (result.ok) {
      setStatus('success');
      e.currentTarget.reset();
    } else {
      setErrorMsg(
        result.message ||
          __('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'),
      );
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className='bg-white border border-slate-100 rounded-2xl shadow-xs p-6 sm:p-8 flex flex-col items-center justify-center py-16 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20'>
          <Send className='w-7 h-7 text-primary' />
        </div>
        <h2 className='text-xl font-black uppercase tracking-tight text-slate-900 mb-2'>
          {__('Nachricht gesendet!')}
        </h2>
        <p className='text-slate-500 text-sm max-w-sm'>
          {__(
            'Vielen Dank für Ihre Anfrage. Wir melden uns in der Regel innerhalb von 24 Stunden bei Ihnen.',
          )}
        </p>
        <button
          onClick={() => setStatus('idle')}
          className='mt-6 bg-primary text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl cursor-pointer hover:bg-primary/90 transition-all'
        >
          {__('Neue Nachricht')}
        </button>
      </div>
    );
  }

  return (
    <div className='bg-white border border-slate-100 rounded-2xl shadow-xs p-6 sm:p-8'>
      <h2 className='text-lg font-black uppercase tracking-tight text-slate-900 mb-1 pl-3 border-l-4 border-primary'>
        {formTitle}
      </h2>
      <p className='text-slate-400 text-xs mb-6 pl-3'>{formDescription}</p>
      <form onSubmit={handleSubmit} className='space-y-5'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
          <div>
            <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5'>
              {__('Ihr Name')}
            </label>
            <input
              type='text'
              name='name'
              required
              placeholder='Max Mustermann'
              className={inputClassName}
            />
          </div>
          <div>
            <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5'>
              {__('E-Mail-Adresse')}
            </label>
            <input
              type='email'
              name='email'
              required
              placeholder='max@beispiel.at'
              className={inputClassName}
            />
          </div>
        </div>

        <WpFormFields
          form='contact'
          render={(field) => (
            <div>
              <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5'>
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  required={field.required}
                  rows={6}
                  defaultValue={field.name === 'message' ? prefill.message : undefined}
                  placeholder={field.placeholder || __('Schreiben Sie uns Ihr Anliegen…')}
                  className={`${inputClassName} resize-none`}
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  required={field.required}
                  defaultValue={
                    field.name === 'subject'
                      ? (prefill.subject === 'hotel-inquiry'
                          ? (field.options?.[0] || '')
                          : prefill.subject)
                      : ''
                  }
                  className={`${inputClassName} bg-white`}
                >
                  <option value=''>{__('Bitte wählen…')}</option>
                  {(field.options || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input type='checkbox' name={field.name} required={field.required} />
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  className={inputClassName}
                />
              )}
            </div>
          )}
        />

        {status === 'error' && (
          <div className='flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl px-4 py-3'>
            <span className='shrink-0 mt-0.5'>⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type='submit'
          disabled={status === 'sending'}
          className='w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-xl transition-all duration-300 cursor-pointer active:scale-95 shadow-xs shadow-primary/20'
        >
          {status === 'sending' ? (
            <>
              <span className='w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin' />
              {__('Wird gesendet…')}
            </>
          ) : (
            <>
              <Send className='w-4 h-4' />
              {__('Nachricht absenden')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
