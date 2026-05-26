import React from 'react';
import { WpHead, WpLink, useWpOption, useWpI18n } from '../../.forgewp/wordpress';
import {
  Mail, Phone, MapPin, Clock, Send, ChevronRight,
  MessageSquare, Globe, Instagram, Facebook, Twitter,
  ArrowRight,
} from 'lucide-react';

export function KontaktPage() {
  const phone = useWpOption('contact_phone', '+43 1 234 5678');
  const email = useWpOption('contact_email', 'office@hotelchecker24.com');
  const address = useWpOption('contact_address', 'Kärntner Ring 5–7, 1010 Wien, Österreich');
  const hours = useWpOption('business_hours', 'Mo–Fr 09:00–18:00 Uhr');

  const facebookUrl = useWpOption('social_facebook', 'https://facebook.com/hotelchecker24');
  const instagramUrl = useWpOption('social_instagram', 'https://instagram.com/hotelchecker24');
  const twitterUrl = useWpOption('social_twitter', 'https://twitter.com/hotelchecker24');
  const siteUrl = useWpOption('siteurl', 'https://hotelchecker24.com');

  const instagramHandle = instagramUrl ? `@${instagramUrl.replace(/\/$/, '').split('/').pop()}` : '@hotelchecker24';
  const facebookHandle = facebookUrl ? facebookUrl.replace(/\/$/, '').split('/').pop() : 'Hotelchecker24';
  const twitterHandle = twitterUrl ? `@${twitterUrl.replace(/\/$/, '').split('/').pop()}` : '@hotelchecker24';
  const siteHandle = siteUrl ? siteUrl.replace(/^https?:\/\/(www\.)?/, '') : 'hotelchecker24.com';

  const [form, setForm] = React.useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = React.useState(false);
  const { __ } = useWpI18n();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this integrates with WP Contact Form 7 or similar plugin
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[#fafaf8] font-sans select-none">
      <WpHead
        title={__('Kontakt — Hotelchecker24')}
        description={__('Kontaktieren Sie die Hotelchecker24-Redaktion. Wir helfen Ihnen bei Fragen zu Hotels, Reiseempfehlungen und Kooperationsanfragen.')}
      />

      {/* Hero — compact light editorial two-column */}
      <div className="relative overflow-hidden bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(109,155,174,0.13)_0%,transparent_70%)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(146,159,93,0.09)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto z-10">
          <nav className="flex items-center gap-2 text-sm font-semibold text-slate-400 mb-4">
            <WpLink href="/" className="hover:text-primary transition-colors">{__('Startseite')}</WpLink>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-700">{__('Kontakt')}</span>
          </nav>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
            {/* Left Column — Headings */}
            <div className="lg:col-span-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full mb-3">
                <MessageSquare className="w-3.5 h-3.5" />
                {__('Wir sind für Sie da')}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase leading-none text-slate-900 mb-2">
                {__('Schreiben Sie uns')}
              </h1>
              <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                {__('Fragen zu Hotels, Kooperationsanfragen oder Feedback — unsere Redaktion antwortet innerhalb von 24 Stunden.')}
              </p>
            </div>

            {/* Right Column — Editorial Vienna Visual Card */}
            <div className="lg:col-span-2 relative hidden lg:flex items-center justify-center h-[200px] select-none">
              {/* Photo Card */}
              <div className="relative w-72 h-44 rounded-2xl overflow-hidden shadow-xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500 ease-out">
                <img 
                  src="https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=400&q=80" 
                  alt="Wien Redaktion" 
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating Location Badge */}
                <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 shadow-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span>{__('Hauptredaktion Wien')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Contact Info Sidebar */}
          <aside className="lg:col-span-2 space-y-5">
            {/* Info cards */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                {__('Kontaktdaten')}
              </h2>

              {[
                { icon: Phone, label: 'Telefon', value: phone, href: `tel:${phone}`, color: 'text-primary bg-primary/10 border-primary/20' },
                { icon: Mail, label: 'E-Mail', value: email, href: `mailto:${email}`, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                { icon: MapPin, label: 'Adresse', value: address, href: undefined, color: 'text-[#929f5d] bg-[#929f5d]/10 border-[#929f5d]/20' },
                { icon: Clock, label: 'Öffnungszeiten', value: hours, href: undefined, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              ].map(({ icon: Icon, label, value, href, color }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500 mb-0.5">{label}</div>
                    {href ? (
                      <a href={href} className="text-sm font-bold text-slate-800 hover:text-primary transition-colors break-all">{value}</a>
                    ) : (
                      <p className="text-sm font-bold text-slate-800 leading-snug">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
              <h2 className="text-xs font-mono font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 mb-4">
                Social Media
              </h2>
              <div className="space-y-2">
                {[
                  { icon: Instagram, label: 'Instagram', handle: instagramHandle, href: instagramUrl },
                  { icon: Facebook, label: 'Facebook', handle: facebookHandle, href: facebookUrl },
                  { icon: Twitter, label: 'Twitter / X', handle: twitterHandle, href: twitterUrl },
                  { icon: Globe, label: 'Website', handle: siteHandle, href: siteUrl },
                ].map(({ icon: Icon, label, handle, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-slate-100 hover:border-primary rounded-xl transition-all duration-300 group hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-primary transition-all">
                        <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-white" />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">{label}</div>
                        <div className="text-xs font-bold text-slate-800">{handle}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </aside>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6 sm:p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Send className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 mb-2">{__('Nachricht gesendet!')}</h2>
                  <p className="text-slate-500 text-sm max-w-sm">
                    {__('Vielen Dank für Ihre Anfrage. Wir melden uns in der Regel innerhalb von 24 Stunden bei Ihnen.')}
                  </p>
                  <button
                    onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    className="mt-6 bg-primary text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl cursor-pointer hover:bg-primary/90 transition-all"
                  >
                    {__('Neue Nachricht')}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-1 pl-3 border-l-4 border-primary">
                    {__('Kontaktformular')}
                  </h2>
                  <p className="text-slate-400 text-xs mb-6 pl-3">
                    {__('Alle Felder sind Pflichtfelder, sofern nicht anders angegeben.')}
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

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-xl transition-all duration-300 cursor-pointer active:scale-95 shadow-xs shadow-primary/20"
                    >
                      <Send className="w-4 h-4" />
                      {__('Nachricht absenden')}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
