import React from 'react';
import { useWpI18n } from '../.forgewp/wordpress';
import { Send } from 'lucide-react';

/**
 * ContactForm — hydration island
 *
 * Extracted from KontaktPage so ForgeWP detects it as an interactive
 * island and hydrates it in the browser. This ensures React's onSubmit
 * fires instead of the browser falling back to a native GET form submit.
 */
export default function ContactForm({
  formTitle,
  formDescription,
}: {
  formTitle: string;
  formDescription: string;
}) {
  const { __ } = useWpI18n();
  const [form, setForm] = React.useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const subjectParam = params.get('subject');
      const hotelParam = params.get('inquiry_hotel');
      if (subjectParam || hotelParam) {
        setForm((prev) => ({
          ...prev,
          subject: subjectParam || prev.subject,
          message: hotelParam ? `${__('Anfrage zu Hotel:')} ${hotelParam}\n\n` : prev.message,
        }));
      }
    }
  }, [__]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const body = new FormData();
      body.append('_wpcf7', '44');
      body.append('_wpcf7_version', '5.9');
      body.append('_wpcf7_locale', 'de_DE');
      body.append('_wpcf7_unit_tag', 'wpcf7-f44-o1');
      body.append('your-name', form.name);
      body.append('your-email', form.email);
      body.append('your-subject', form.subject);
      body.append('your-message', form.message);

      const res = await fetch(
        '/wp-json/contact-form-7/v1/contact-forms/44/feedback',
        { method: 'POST', body },
      );
      const data = await res.json();

      if (data.status === 'mail_sent') {
        setStatus('success');
      } else {
        setErrorMsg(data.message || __('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'));
        setStatus('error');
      }
    } catch {
      setErrorMsg(__('Netzwerkfehler. Bitte prüfen Sie Ihre Verbindung.'));
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6 sm:p-8 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
          <Send className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">{__('Nachricht gesendet!')}</h2>
        <p className="text-slate-500 text-sm max-w-sm">
          {__('Vielen Dank für Ihre Anfrage. Wir melden uns in der Regel innerhalb von 24 Stunden bei Ihnen.')}
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm({ name: '', email: '', subject: '', message: '' }); }}
          className="mt-6 bg-primary text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl cursor-pointer hover:bg-primary/90 transition-all"
        >
          {__('Neue Nachricht')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6 sm:p-8">
      <div className="hidden" aria-hidden="true">{__('Anfrage zu Hotel:')}</div>
      <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-1 pl-3 border-l-4 border-primary">
        {formTitle}
      </h2>
      <p className="text-slate-400 text-xs mb-6 pl-3">
        {formDescription}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {__('Ihr Name')}
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Max Mustermann"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {__('E-Mail-Adresse')}
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="max@beispiel.at"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            {__('Betreff')}
          </label>
          <select
            name="subject"
            value={form.subject}
            onChange={handleChange}
            required
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all bg-white"
          >
            <option value="">{__('Bitte wählen…')}</option>
            <option value="hotel-inquiry">{__('Hotelanfrage / Empfehlung')}</option>
            <option value="partnership">{__('Kooperationsanfrage')}</option>
            <option value="editorial">{__('Redaktionelle Anfrage')}</option>
            <option value="technical">{__('Technischer Support')}</option>
            <option value="other">{__('Sonstiges')}</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            {__('Ihre Nachricht')}
          </label>
          <textarea
            name="message"
            value={form.message}
            onChange={handleChange}
            required
            rows={6}
            placeholder={__('Schreiben Sie uns Ihr Anliegen…')}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none"
          />
        </div>

        {/* Error banner */}
        {status === 'error' && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl px-4 py-3">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-xl transition-all duration-300 cursor-pointer active:scale-95 shadow-xs shadow-primary/20"
        >
          {status === 'sending' ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {__('Wird gesendet…')}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {__('Nachricht absenden')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
