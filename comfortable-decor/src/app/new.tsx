import { useState } from 'react';
import { WpHead } from '../.forgewp/wordpress';
import { ArrowRight, Mail, CheckCircle } from 'lucide-react';
import newHeroImage from '../assets/new_design_hero.png';
import categorySeating from '../assets/category_seating.png';
import categoryLighting from '../assets/category_lighting.png';
import categoryTextiles from '../assets/category_textiles.png';
import categoryAccents from '../assets/category_accents.png';

export default function NewPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <div className='min-h-screen w-full bg-[#FAF8F5] text-slate-800 font-sans selection:bg-[#965c40] selection:text-white relative'>
      <WpHead
        title='Comfortable Decor — Coming Soon'
        description='A new design variant for curating modern spaces.'
        ogType='website'
      />

      {/* ── HERO & NAVBAR CONTAINER (Takes full viewport height) ── */}
      <div className='relative min-h-screen w-full flex flex-col justify-between overflow-hidden'>
        {/* ── BACKGROUND IMAGE COVERING HERO ── */}
        <div className='absolute inset-0 z-0 select-none pointer-events-none overflow-hidden bg-slate-950'>
          <img
            src={newHeroImage}
            alt='Atmospheric Living Space'
            className='w-full h-full object-cover opacity-85 transition-opacity duration-500'
          />
          {/* Smoky fade overlays */}
          {/* Layer 1: Left-to-right dark smoky fade (to support the giant left heading) */}
          <div className='absolute inset-y-0 left-0 w-full lg:w-[60%] bg-linear-to-r from-slate-950/90 via-slate-950/60 to-transparent' />

          {/* Layer 2: Right-to-left subtle dark fade (to support the right description and form) */}
          <div className='absolute inset-y-0 right-0 w-full lg:w-[50%] bg-linear-to-l from-slate-950/85 via-slate-950/45 to-transparent lg:block hidden' />

          {/* Layer 3: Bottom-to-top dark smoky fade for mobile view and general grounding */}
          <div className='absolute inset-x-0 bottom-0 h-[70%] bg-linear-to-t from-slate-950/95 via-slate-950/50 to-transparent lg:hidden' />
          <div className='absolute inset-x-0 bottom-0 h-[40%] bg-linear-to-t from-slate-950/80 via-transparent to-transparent hidden lg:block' />

          {/* Layer 4: Subtle warm terracotta ambient light leak */}
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(150,92,64,0.12),transparent_65%)]' />
        </div>

        {/* ── TRANSPARENT NAVBAR ── */}
        <header className='absolute top-0 left-0 z-20 w-full px-6 py-6 md:px-12 flex justify-between items-center bg-transparent'>
          {/* Logo */}
          <a
            href='/'
            className='font-heading font-extrabold text-2xl tracking-tight uppercase select-none text-white hover:text-[#965c40]/90 transition-colors duration-300'
          >
            CD<span className='text-[#965c40]'>.</span>
          </a>

          {/* Right Nav Links */}
          <nav className='flex items-center gap-6 md:gap-8 text-[10px] md:text-xs font-bold uppercase tracking-widest'>
            <a
              href='#join'
              className='text-white/80 hover:text-white transition-all duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#965c40] hover:after:w-full after:transition-all after:duration-300'
            >
              Join launch
            </a>
            <a
              href='#about'
              className='text-white/80 hover:text-white transition-all duration-300 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#965c40] hover:after:w-full after:transition-all after:duration-300'
            >
              Contact us
            </a>
          </nav>
        </header>

        {/* ── SPLIT HERO SECTION ── */}
        <main className='relative z-10 grow flex items-center justify-center w-full px-6 md:px-12 pt-28 pb-16 lg:py-0 animate-fade-in'>
          <div className='flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 max-w-5xl w-full'>
            {/* Left Column: Big text "we are coming soon" */}
            <div className='w-full lg:w-auto lg:min-w-[340px] flex flex-col justify-center text-center shrink-0'>
              <span className='text-[#965c40] font-mono text-xs font-bold uppercase tracking-widest mb-4 block text-center'>
                Comfortable Decor
              </span>
              <h1 className='flex flex-col items-center gap-1.5 text-white drop-shadow-lg select-none uppercase font-heading font-black leading-none text-center'>
                <span className='text-4xl md:text-5xl lg:text-7xl tracking-wide'>
                  We Are
                </span>
                <span className='text-3xl md:text-4xl lg:text-6xl tracking-normal text-white/90'>
                  Coming
                </span>
                <span className='text-2xl md:text-3xl lg:text-5xl tracking-[0.35em] pl-[0.35em] text-transparent bg-clip-text bg-linear-to-r from-[#965c40] to-[#b1765c]'>
                  Soon
                </span>
              </h1>
            </div>

            {/* Separator */}
            <div className='w-full lg:w-auto flex justify-center items-center shrink-0'>
              {/* Vertical line on desktop, horizontal on mobile */}
              <div className='hidden lg:block w-0.5 h-[72vh] bg-linear-to-b from-transparent via-white/65 to-transparent' />
              <div className='block lg:hidden w-full h-0.5 bg-linear-to-r from-transparent via-white/45 to-transparent my-6' />
            </div>

            {/* Right Column: Hero text, subheadline, and CTA form */}
            <div
              id='join'
              className='w-full lg:max-w-xl flex flex-col justify-center text-center gap-6'
            >
              <h2 className='text-2xl md:text-3xl lg:text-4xl font-heading font-extrabold text-white tracking-tight leading-snug drop-shadow-sm uppercase text-center'>
                Spaces Designed for Quiet Harmony.
              </h2>
              <p className='text-white/70 text-xs md:text-sm leading-relaxed max-w-md mx-auto'>
                We are curating a modern home catalogue featuring sculptural
                ambient lighting, ergonomic minimalist seating, and handcrafted
                organic textiles. Subscribe to join our launch mailing list and
                claim your early member privileges.
              </p>

              {/* Email Capture CTA */}
              <div className='mt-4 max-w-md w-full mx-auto'>
                {submitted ? (
                  <div className='flex items-center gap-3 bg-[#965c40]/20 border border-[#965c40]/30 px-5 py-4 rounded-2xl backdrop-blur-md animate-fade-in text-left'>
                    <CheckCircle className='w-5 h-5 text-[#965c40] shrink-0' />
                    <div>
                      <h4 className='font-bold text-sm text-white'>
                        You're on the list!
                      </h4>
                      <p className='text-white/60 text-xs mt-0.5'>
                        We will notify you the moment we launch.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className='flex flex-col sm:flex-row gap-3 w-full justify-center'
                  >
                    <div className='relative grow text-left'>
                      <input
                        type='email'
                        required
                        placeholder='Enter your email address'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='w-full px-5 py-3.5 bg-black/40 hover:bg-black/55 focus:bg-black/60 border border-white/10 focus:border-[#965c40]/50 rounded-xl text-xs text-white placeholder-white/40 focus:outline-hidden transition-all duration-300 backdrop-blur-md'
                      />
                      <Mail className='absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none' />
                    </div>
                    <button
                      type='submit'
                      className='group relative inline-flex items-center justify-center border border-white hover:border-[#965c40] text-white text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-xl overflow-hidden select-none cursor-pointer shadow-md transition-colors duration-500 shrink-0'
                    >
                      {/* Fill effect background */}
                      <div className='absolute inset-y-0 left-0 bg-[#965c40] w-0 group-hover:w-full transition-all duration-500 ease-out z-0' />
                      {/* Text content */}
                      <span className='relative z-10 flex items-center justify-center gap-2'>
                        Join Launch
                        <ArrowRight className='w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300' />
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Subtle spacing divider at the bottom of hero layout */}
        <div className='h-8 w-full z-10 bg-transparent shrink-0' />
      </div>

      {/* ── CURATED COLLECTIONS PREVIEW SECTION ── */}
      <section className='bg-[#FAF8F5] py-24 relative z-10 overflow-hidden border-t border-slate-200/50'>
        {/* Ambient warm light glow */}
        <div className='absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(150,92,64,0.03)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />

        <div className='max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center'>
          {/* Header */}
          <span className='block text-[#965c40] text-[10px] font-black uppercase tracking-[0.25em] mb-3'>
            Preview Curated Pieces
          </span>
          <h2 className='text-3xl md:text-4xl lg:text-5xl font-heading font-black text-slate-900 uppercase tracking-tight leading-tight max-w-2xl mx-auto mb-16'>
            Spaces defined by character
          </h2>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
            {/* Card 1: Seating */}
            <div className='group relative aspect-3/4 overflow-hidden rounded-2xl border border-slate-200/50 hover:border-[#965c40]/30 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 cursor-pointer'>
              {/* Image filling full width and height */}
              <img
                src={categorySeating}
                alt='Curated sculptural seating'
                className='absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out select-none z-0'
              />
              {/* Dark gradient overlay to ensure text contrast on the image */}
              <div className='absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/20 to-transparent z-10' />
              
              {/* Text content layered above the image */}
              <div className='absolute inset-0 p-6 flex flex-col justify-between z-20 text-left'>
                {/* Top Row: Index Badge */}
                <div className='flex justify-between items-start'>
                  <span className='bg-[#965c40] text-white text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-md shadow-xs border border-[#965c40]/20'>
                    01
                  </span>
                </div>
                {/* Bottom Row: Title and description */}
                <div>
                  <h3 className='text-white text-base font-heading font-extrabold uppercase tracking-wider group-hover:text-[#965c40] transition-colors duration-300 mb-1'>
                    Seating
                  </h3>
                  <p className='text-white/80 text-xs font-medium leading-relaxed max-w-[220px]'>
                    Sculptural comfort designed to anchor modern living spaces.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Lighting */}
            <div className='group relative aspect-3/4 overflow-hidden rounded-2xl border border-slate-200/50 hover:border-[#965c40]/30 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 cursor-pointer'>
              {/* Image filling full width and height */}
              <img
                src={categoryLighting}
                alt='Minimalist lighting fixtures'
                className='absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out select-none z-0'
              />
              {/* Dark gradient overlay to ensure text contrast on the image */}
              <div className='absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/20 to-transparent z-10' />
              
              {/* Text content layered above the image */}
              <div className='absolute inset-0 p-6 flex flex-col justify-between z-20 text-left'>
                {/* Top Row: Index Badge */}
                <div className='flex justify-between items-start'>
                  <span className='bg-[#965c40] text-white text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-md shadow-xs border border-[#965c40]/20'>
                    02
                  </span>
                </div>
                {/* Bottom Row: Title and description */}
                <div>
                  <h3 className='text-white text-base font-heading font-extrabold uppercase tracking-wider group-hover:text-[#965c40] transition-colors duration-300 mb-1'>
                    Lighting
                  </h3>
                  <p className='text-white/80 text-xs font-medium leading-relaxed max-w-[220px]'>
                    Soft ambient light fixtures that shape warm atmospheres.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Textiles */}
            <div className='group relative aspect-3/4 overflow-hidden rounded-2xl border border-slate-200/50 hover:border-[#965c40]/30 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 cursor-pointer'>
              {/* Image filling full width and height */}
              <img
                src={categoryTextiles}
                alt='Organic fabric textiles'
                className='absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out select-none z-0'
              />
              {/* Dark gradient overlay to ensure text contrast on the image */}
              <div className='absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/20 to-transparent z-10' />
              
              {/* Text content layered above the image */}
              <div className='absolute inset-0 p-6 flex flex-col justify-between z-20 text-left'>
                {/* Top Row: Index Badge */}
                <div className='flex justify-between items-start'>
                  <span className='bg-[#965c40] text-white text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-md shadow-xs border border-[#965c40]/20'>
                    03
                  </span>
                </div>
                {/* Bottom Row: Title and description */}
                <div>
                  <h3 className='text-white text-base font-heading font-extrabold uppercase tracking-wider group-hover:text-[#965c40] transition-colors duration-300 mb-1'>
                    Textiles
                  </h3>
                  <p className='text-white/80 text-xs font-medium leading-relaxed max-w-[220px]'>
                    Tactile throws and organic linens crafted for comfort.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Accents */}
            <div className='group relative aspect-3/4 overflow-hidden rounded-2xl border border-slate-200/50 hover:border-[#965c40]/30 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 cursor-pointer'>
              {/* Image filling full width and height */}
              <img
                src={categoryAccents}
                alt='Cozy home accents and ornaments'
                className='absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out select-none z-0'
              />
              {/* Dark gradient overlay to ensure text contrast on the image */}
              <div className='absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/20 to-transparent z-10' />
              
              {/* Text content layered above the image */}
              <div className='absolute inset-0 p-6 flex flex-col justify-between z-20 text-left'>
                {/* Top Row: Index Badge */}
                <div className='flex justify-between items-start'>
                  <span className='bg-[#965c40] text-white text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-md shadow-xs border border-[#965c40]/20'>
                    04
                  </span>
                </div>
                {/* Bottom Row: Title and description */}
                <div>
                  <h3 className='text-white text-base font-heading font-extrabold uppercase tracking-wider group-hover:text-[#965c40] transition-colors duration-300 mb-1'>
                    Accents
                  </h3>
                  <p className='text-white/80 text-xs font-medium leading-relaxed max-w-[220px]'>
                    Finely crafted accents that tell a story in detail.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER / ABOUT (Light Brownish layout matching page.tsx Option A) ── */}
      <footer
        id='about'
        className='bg-[#B5A59A] py-20 relative z-10 overflow-hidden border-t border-slate-200/30'
      >
        {/* Subtle terracotta radial glow in background of footer */}
        <div className='absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(150,92,64,0.04)_0%,transparent_75%)] blur-3xl pointer-events-none z-0' />

        <div className='w-full px-6 relative'>
          {/* Centered Watermark Header */}
          <div className='w-full text-center mb-16 select-none pointer-events-none z-20 relative'>
            <span className='block text-[9.5vw] font-heading font-black uppercase tracking-tighter text-white/60 leading-none'>
              Comfortable Decor
            </span>
          </div>

          {/* Content Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 relative z-20 items-start px-6 md:px-8'>
            {/* Left Column: Collaborate & CTA */}
            <div className='lg:col-span-6 flex flex-col justify-between gap-12 lg:min-h-[280px]'>
              <div>
                <h2 className='text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-md uppercase'>
                  We're excited to curate with you.
                </h2>
                <a
                  href='#join'
                  className='group relative inline-flex items-center justify-center border border-slate-900 hover:border-[#965c40] text-slate-900 hover:text-white text-xs font-bold uppercase tracking-widest px-8 py-3.5 rounded-full overflow-hidden transition-all duration-300 w-fit mt-8 cursor-pointer shadow-sm'
                >
                  {/* Fill effect background */}
                  <div className='absolute inset-y-0 left-0 bg-[#965c40] w-0 group-hover:w-full transition-all duration-500 ease-out z-0' />
                  {/* Text content */}
                  <span className='relative z-10 flex items-center justify-center gap-2'>
                    Get Started
                    <ArrowRight className='w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300' />
                  </span>
                </a>
              </div>

              <p className='text-slate-500/80 text-xs mt-12 lg:mt-0 font-mono tracking-widest uppercase'>
                &copy; Comfortable Decor. 2026
              </p>
            </div>

            {/* Right Column: 2x2 Info Grid */}
            <div className='lg:col-span-6 grid grid-cols-2 gap-8 text-left self-start lg:pl-6'>
              {/* Location column */}
              <div>
                <span className='block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3'>
                  Location
                </span>
                <p className='text-sm text-slate-700 font-semibold leading-relaxed'>
                  London, UK
                  <span className='block text-slate-500 text-xs font-normal mt-0.5'>
                    Working worldwide
                  </span>
                </p>
              </div>

              {/* Contact column */}
              <div>
                <span className='block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3'>
                  Contact
                </span>
                <p className='text-sm text-slate-700 font-semibold leading-relaxed'>
                  +44 20 7946 0958
                  <a
                    href='mailto:hello@comfortabledecor.com'
                    className='block text-slate-500 hover:text-[#965c40] text-xs font-normal mt-0.5 transition-colors'
                  >
                    hello@comfortabledecor.com
                  </a>
                </p>
              </div>

              {/* Social column */}
              <div className='col-span-2'>
                <span className='block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3'>
                  Social
                </span>
                <div className='grid grid-cols-2 gap-x-20 gap-y-2 text-sm text-slate-700 font-semibold w-fit'>
                  <a
                    href='https://twitter.com'
                    target='_blank'
                    rel='noreferrer'
                    className='hover:text-[#965c40] transition-colors'
                  >
                    X.com
                  </a>
                  <a
                    href='https://instagram.com'
                    target='_blank'
                    rel='noreferrer'
                    className='hover:text-[#965c40] transition-colors'
                  >
                    Instagram
                  </a>
                  <a
                    href='https://linkedin.com'
                    target='_blank'
                    rel='noreferrer'
                    className='hover:text-[#965c40] transition-colors'
                  >
                    LinkedIn
                  </a>
                  <a
                    href='https://pinterest.com'
                    target='_blank'
                    rel='noreferrer'
                    className='hover:text-[#965c40] transition-colors'
                  >
                    Pinterest
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
