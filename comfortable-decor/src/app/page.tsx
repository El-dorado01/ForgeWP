import { useState } from 'react';
import { WpHead } from '../.forgewp/wordpress';
import { ArrowRight, CheckCircle, Mail } from 'lucide-react';
import heroImage from '../assets/comfortable_decor_hero.png';
import footerChair from '../assets/comfortable_decor_footer_chair.png';
import categoryLighting from '../assets/category_lighting.png';
import categorySeating from '../assets/category_seating.png';
import categoryTextiles from '../assets/category_textiles.png';
import categoryAccents from '../assets/category_accents.png';

export default function HomePage() {
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
    <div className='min-h-screen bg-[#fafafa] text-slate-900 selection:bg-slate-900 selection:text-white relative overflow-x-hidden font-sans scroll-smooth'>
      <WpHead
        title='Comfortable Decor — Curating Modern Spaces'
        description='Premium home decor, minimalist lighting, and handcrafted textiles. Launching Summer 2026.'
        ogType='website'
      />

      {/* ── BACKGROUND GRADIENTS & GLOWS ── */}
      <div className='absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(245,158,11,0.06)_0%,transparent_75%)] blur-3xl pointer-events-none z-0' />
      <div className='absolute top-[400px] -left-20 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,0,12,0.04)_0%,transparent_70%)] blur-3xl pointer-events-none z-0' />

      {/* ── FLOATING NAVBAR ── */}
      <header className='sticky top-0 z-50 w-full px-6 py-3 md:px-12 flex justify-between items-center backdrop-blur-md bg-white/70 border-b border-slate-100'>
        <div className='flex items-center gap-12'>
          <span className='font-heading font-extrabold text-2xl tracking-tight uppercase'>
            CD<span className='text-[#965c40]'>.</span>
          </span>

          {/* Desktop Navigation Links */}
          <nav className='hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-600'>
            <a
              href='#collections'
              className='hover:text-slate-900 transition-colors'
            >
              Collections
            </a>
            <a
              href='#about'
              className='hover:text-slate-900 transition-colors'
            >
              About Us
            </a>
            <a
              href='#features'
              className='hover:text-slate-900 transition-colors'
            >
              Why Us
            </a>
            <a
              href='#contact'
              className='hover:text-slate-900 transition-colors'
            >
              Join Launch
            </a>
          </nav>
        </div>

        {/* Action Button */}
        <div>
          <a
            href='#notify'
            className='group relative inline-flex items-center justify-center border border-brand hover:border-[#965c40] text-brand hover:text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full overflow-hidden select-none cursor-pointer shadow-sm hover:shadow-lg transition-colors duration-500'
          >
            {/* Fill effect background */}
            <div className='absolute inset-y-0 left-0 bg-[#965c40] w-0 group-hover:w-full transition-all duration-500 ease-out z-0' />
            {/* Text content */}
            <span className='relative z-10'>Notify Me</span>
          </a>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <main className='relative max-w-7xl mx-auto px-6 md:px-12 pt-3 md:pt-10 pb-20 z-10 min-h-[420px] flex items-center'>
        {/* Absolute Background Image aligned to the right, sized and aligned with hero texts */}
        <div
          className='absolute right-0 lg:right-12 top-1/2 -translate-y-1/2 w-full lg:w-[58%] aspect-4/3 max-w-[700px] pointer-events-none z-0 select-none overflow-hidden hidden lg:block'
          style={{ outline: '4px solid #fafafa', outlineOffset: '-4px' }}
        >
          <img
            src={heroImage}
            alt='Modern living room decor background'
            className='w-full h-full object-cover opacity-85'
          />
          {/* Edge Blending Gradients (using smooth multi-stop CSS gradients for natural feathering) */}
          {/* Left blend */}
          <div
            className='absolute inset-y-0 left-0 w-[45%] z-10'
            style={{
              background:
                'linear-gradient(to right, #fafafa 0%, rgba(250, 250, 250, 0.9) 25%, rgba(250, 250, 250, 0.4) 65%, rgba(250, 250, 250, 0) 100%)',
            }}
          />
          {/* Right blend */}
          <div
            className='absolute inset-y-0 right-0 w-[15%] z-10'
            style={{
              background:
                'linear-gradient(to left, #fafafa 0%, rgba(250, 250, 250, 0.9) 25%, rgba(250, 250, 250, 0.4) 65%, rgba(250, 250, 250, 0) 100%)',
            }}
          />
          {/* Bottom blend */}
          <div
            className='absolute bottom-0 inset-x-0 h-[25%] z-10'
            style={{
              background:
                'linear-gradient(to top, #fafafa 0%, rgba(250, 250, 250, 0.9) 25%, rgba(250, 250, 250, 0.4) 65%, rgba(250, 250, 250, 0) 100%)',
            }}
          />
          {/* Top blend */}
          <div
            className='absolute top-0 inset-x-0 h-[20%] z-10'
            style={{
              background:
                'linear-gradient(to bottom, #fafafa 0%, rgba(250, 250, 250, 0.9) 25%, rgba(250, 250, 250, 0.4) 65%, rgba(250, 250, 250, 0) 100%)',
            }}
          />
          {/* Soft amber/brown radial glow overlay */}
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(150,92,64,0.04)_0%,transparent_70%)] z-10' />
        </div>

        {/* Soft Animated Circles & Sparkles in the gap between text and image */}
        <div className='absolute inset-0 pointer-events-none z-5 overflow-hidden hidden lg:block'>
          {/* Floating glowing circles */}
          <div className='absolute left-[44%] top-[12%] w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(150,92,64,0.09)_0%,transparent_70%)] blur-xl animate-float-slow' />
          <div className='absolute left-[52%] bottom-[18%] w-36 h-36 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.05)_0%,transparent_70%)] blur-xl animate-float-slower' />

          {/* Intermediate Circle 1: soft filled dot */}
          <div
            className='absolute left-[47%] top-[24%] w-2.5 h-2.5 rounded-full bg-[#965c40]/50 animate-twinkle'
            style={{ animationDelay: '0.4s', animationDuration: '4.2s' }}
          />

          {/* Intermediate Circle 2: soft warm dot */}
          <div
            className='absolute left-[54%] top-[45%] w-2 h-2 rounded-full bg-amber-500/40 animate-twinkle'
            style={{ animationDelay: '1.8s', animationDuration: '3.6s' }}
          />

          {/* Intermediate Circle 3: hollow ring */}
          <div
            className='absolute left-[45%] bottom-[28%] w-4 h-4 rounded-full border border-[#965c40]/30 bg-transparent animate-twinkle'
            style={{ animationDelay: '1.2s', animationDuration: '4.8s' }}
          />
        </div>

        {/* Foreground Content Grid */}
        <div className='w-full grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10'>
          {/* Left Side: Content Box (occupies left half on large screens, floats over the background blend) */}
          <div className='lg:col-span-7 flex flex-col justify-center text-left relative'>
            {/* Circles embedded around the text context */}
            <div
              className='absolute -left-6 top-[8%] w-2 h-2 rounded-full bg-slate-400/35 animate-twinkle hidden sm:block'
              style={{ animationDelay: '0.8s', animationDuration: '5.2s' }}
            />

            <div
              className='absolute right-4 top-[4%] w-3 h-3 rounded-full border border-[#965c40]/50 bg-transparent animate-twinkle'
              style={{ animationDelay: '0s', animationDuration: '4s' }}
            />

            <div
              className='absolute right-[18%] bottom-[42%] w-2 h-2 rounded-full bg-amber-500/50 animate-twinkle hidden md:block'
              style={{ animationDelay: '2.4s', animationDuration: '3.2s' }}
            />
            {/* Headline */}
            <h1 className='text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-[1.05] text-slate-900 mb-6 uppercase'>
              Spaces That
              <br />
              <span className='text-[#965c40]'>Inspire Living.</span>
            </h1>

            {/* Description */}
            <p className='text-slate-600 text-sm md:text-base leading-relaxed font-normal max-w-lg mb-8 bg-[#fafafa]/50 backdrop-blur-xs p-1 rounded-lg'>
              A curated dropship collection of minimal home goods, hand-loomed
              textiles, and custom ambient lighting designed to turn your space
              into a peaceful sanctuary. Sign up now for exclusive early access
              and a{' '}
              <span className='font-semibold text-slate-900'>
                15% off coupon
              </span>{' '}
              on our launch day.
            </p>

            {/* Email Subscription Box */}
            <div
              id='notify'
              className='w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-100 p-2.5 rounded-2xl shadow-xl shadow-slate-200/50 mb-8 relative'
            >
              {submitted ? (
                <div className='py-3 px-4 flex items-center gap-3 text-emerald-600 font-medium text-sm'>
                  <CheckCircle className='w-5 h-5 shrink-0' />
                  <span>
                    You're on the list! We will send you your 15% discount code
                    soon.
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className='flex flex-col sm:flex-row gap-2'
                >
                  <div className='relative flex-1'>
                    <Mail className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                    <input
                      type='email'
                      required
                      placeholder='Enter your email address'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className='w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-slate-300 focus:bg-white transition-all'
                    />
                  </div>
                  <button
                    type='submit'
                    className='group relative inline-flex items-center justify-center border border-brand hover:border-brand text-brand hover:text-white text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl overflow-hidden select-none cursor-pointer shadow-md hover:shadow-lg transition-colors duration-500'
                  >
                    {/* Fill effect background */}
                    <div className='absolute inset-y-0 left-0 bg-brand w-0 group-hover:w-full transition-all duration-500 ease-out z-0' />
                    {/* Text content */}
                    <span className='relative z-10 flex items-center justify-center gap-2'>
                      Get Early Access
                      <ArrowRight className='w-3.5 h-3.5' />
                    </span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── CATEGORY TEASER CARDS SECTION ── */}
      <section
        id='collections'
        className='bg-white border-t border-slate-100 py-24 relative z-10'
      >
        <div className='max-w-7xl mx-auto px-6 md:px-12'>
          <div className='flex flex-col md:flex-row md:items-end justify-between mb-12'>
            <div>
              <span className='text-[#965c40] font-mono text-xs font-bold uppercase tracking-wider'>
                Preview Collections
              </span>
              <h2 className='text-3xl md:text-4xl font-heading font-extrabold uppercase mt-2 tracking-tight'>
                Designed for Harmony
              </h2>
            </div>
            <p className='text-slate-500 text-sm max-w-md mt-4 md:mt-0 leading-relaxed'>
              Explore the carefully chosen product niches that will form our
              launch catalogue. Each piece is chosen to maximize comfort and
              modern aesthetics.
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
            {/* Card 1: Ambient Lighting */}
            <div className='group bg-[#fafafa]/50 hover:bg-white border border-slate-100 p-5 rounded-[32px] transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[#965c40]/20 hover:shadow-2xl hover:shadow-stone-200/40 flex flex-col justify-between min-h-[380px] relative overflow-hidden'>
              {/* Subtle hover gradient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(150,92,64,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div>
                <div className='relative w-full aspect-4/3 rounded-[24px] overflow-hidden mb-6 bg-slate-50'>
                  <img 
                    src={categoryLighting} 
                    alt="Ambient Lighting" 
                    className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-slate-900/10 via-transparent to-transparent opacity-60' />
                  <span className='absolute top-3.5 left-3.5 font-mono text-[10px] font-bold tracking-widest text-white bg-slate-900/80 px-2.5 py-1 rounded-full backdrop-blur-sm select-none'>
                    01
                  </span>
                </div>
                
                <div className='px-2'>
                  <h3 className='font-heading font-extrabold text-lg tracking-tight text-slate-900 mb-2 group-hover:text-[#965c40] transition-colors duration-300 uppercase'>
                    Ambient Lighting
                  </h3>
                  <p className='text-slate-500 text-[11px] leading-relaxed'>
                    Sculptural lamps, smart ambient fixtures, and warm lighting to
                    create a soothing evening mood.
                  </p>
                </div>
              </div>

              <div className='px-2 pt-6 flex items-center gap-1.5 text-[#965c40] text-[10px] font-black uppercase tracking-widest transition-colors duration-300'>
                <span>Explore Teaser</span>
                <ArrowRight className='w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300' />
              </div>
            </div>

            {/* Card 2: Minimalist Seating */}
            <div className='group bg-[#fafafa]/50 hover:bg-white border border-slate-100 p-5 rounded-[32px] transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[#965c40]/20 hover:shadow-2xl hover:shadow-stone-200/40 flex flex-col justify-between min-h-[380px] relative overflow-hidden'>
              {/* Subtle hover gradient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(150,92,64,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div>
                <div className='relative w-full aspect-4/3 rounded-[24px] overflow-hidden mb-6 bg-slate-50'>
                  <img 
                    src={categorySeating} 
                    alt="Minimalist Seating" 
                    className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-slate-900/10 via-transparent to-transparent opacity-60' />
                  <span className='absolute top-3.5 left-3.5 font-mono text-[10px] font-bold tracking-widest text-white bg-slate-900/80 px-2.5 py-1 rounded-full backdrop-blur-sm select-none'>
                    02
                  </span>
                </div>
                
                <div className='px-2'>
                  <h3 className='font-heading font-extrabold text-lg tracking-tight text-slate-900 mb-2 group-hover:text-[#965c40] transition-colors duration-300 uppercase'>
                    Minimalist Seating
                  </h3>
                  <p className='text-slate-500 text-[11px] leading-relaxed'>
                    Accent chairs, ergonomic stools, and sleek cushions balancing
                    structural design with soft materials.
                  </p>
                </div>
              </div>

              <div className='px-2 pt-6 flex items-center gap-1.5 text-[#965c40] text-[10px] font-black uppercase tracking-widest transition-colors duration-300'>
                <span>Explore Teaser</span>
                <ArrowRight className='w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300' />
              </div>
            </div>

            {/* Card 3: Organic Textiles */}
            <div className='group bg-[#fafafa]/50 hover:bg-white border border-slate-100 p-5 rounded-[32px] transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[#965c40]/20 hover:shadow-2xl hover:shadow-stone-200/40 flex flex-col justify-between min-h-[380px] relative overflow-hidden'>
              {/* Subtle hover gradient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(150,92,64,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div>
                <div className='relative w-full aspect-4/3 rounded-[24px] overflow-hidden mb-6 bg-slate-50'>
                  <img 
                    src={categoryTextiles} 
                    alt="Organic Textiles" 
                    className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-slate-900/10 via-transparent to-transparent opacity-60' />
                  <span className='absolute top-3.5 left-3.5 font-mono text-[10px] font-bold tracking-widest text-white bg-slate-900/80 px-2.5 py-1 rounded-full backdrop-blur-sm select-none'>
                    03
                  </span>
                </div>
                
                <div className='px-2'>
                  <h3 className='font-heading font-extrabold text-lg tracking-tight text-slate-900 mb-2 group-hover:text-[#965c40] transition-colors duration-300 uppercase'>
                    Organic Textiles
                  </h3>
                  <p className='text-slate-500 text-[11px] leading-relaxed'>
                    Throws, organic linen pillow covers, and rugs woven from
                    premium eco-friendly materials.
                  </p>
                </div>
              </div>

              <div className='px-2 pt-6 flex items-center gap-1.5 text-[#965c40] text-[10px] font-black uppercase tracking-widest transition-colors duration-300'>
                <span>Explore Teaser</span>
                <ArrowRight className='w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300' />
              </div>
            </div>

            {/* Card 4: Ceramics & Accents */}
            <div className='group bg-[#fafafa]/50 hover:bg-white border border-slate-100 p-5 rounded-[32px] transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[#965c40]/20 hover:shadow-2xl hover:shadow-stone-200/40 flex flex-col justify-between min-h-[380px] relative overflow-hidden'>
              {/* Subtle hover gradient glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(150,92,64,0.03),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div>
                <div className='relative w-full aspect-4/3 rounded-[24px] overflow-hidden mb-6 bg-slate-50'>
                  <img 
                    src={categoryAccents} 
                    alt="Ceramics & Accents" 
                    className='w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-slate-900/10 via-transparent to-transparent opacity-60' />
                  <span className='absolute top-3.5 left-3.5 font-mono text-[10px] font-bold tracking-widest text-white bg-slate-900/80 px-2.5 py-1 rounded-full backdrop-blur-sm select-none'>
                    04
                  </span>
                </div>
                
                <div className='px-2'>
                  <h3 className='font-heading font-extrabold text-lg tracking-tight text-slate-900 mb-2 group-hover:text-[#965c40] transition-colors duration-300 uppercase'>
                    Ceramics & Accents
                  </h3>
                  <p className='text-slate-500 text-[11px] leading-relaxed'>
                    Minimalist vases, sculptural bowls, and stone accents that
                    elevate shelves and sideboards.
                  </p>
                </div>
              </div>

              <div className='px-2 pt-6 flex items-center gap-1.5 text-[#965c40] text-[10px] font-black uppercase tracking-widest transition-colors duration-300'>
                <span>Explore Teaser</span>
                <ArrowRight className='w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform duration-300' />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER / ABOUT (Full-width Aether Option A layout) ── */}
      <footer
        id='about'
        className='bg-[#f2f0ec] pt-20 pb-24 relative z-10 overflow-hidden'
      >
        <div className='max-w-7xl mx-auto px-6 md:px-12 relative'>
          {/* Giant watermark text "Comfortable Decor" in background */}
          <div className='absolute left-6 md:left-12 right-0 bottom-[-10%] md:bottom-[-20%] select-none pointer-events-none z-0 translate-y-1/4'>
            <span className='block text-left text-[9vw] font-heading font-black uppercase tracking-tighter text-white/55 leading-none'>
              Comfortable Decor
            </span>
          </div>

          {/* Content Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12 relative z-20'>
            {/* Left Column: Collaborate & CTA */}
            <div className='lg:col-span-6 flex flex-col gap-12 min-h-[260px] md:min-h-[300px]'>
              <div>
                <h2 className='text-3xl md:text-4xl lg:text-5xl font-heading font-extrabold text-slate-900 tracking-tight leading-[1.1] max-w-md'>
                  We're excited to curate with you.
                </h2>
                <a
                  href='#notify'
                  className='inline-flex items-center justify-center border border-slate-900 hover:bg-slate-900 hover:text-white text-slate-900 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-full transition-all duration-300 w-fit mt-8 cursor-pointer shadow-sm hover:shadow'
                >
                  Get Started
                </a>
              </div>

              <p className='text-slate-400 text-xs mt-12 lg:mt-0 font-medium'>
                &copy; Comfortable Decor. 2026
              </p>
            </div>

            {/* Right Column: 2x2 Info Grid */}
            <div className='lg:col-span-6 grid grid-cols-2 gap-8 text-left self-start lg:pl-6'>
              {/* Location column */}
              <div>
                <span className='block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3'>
                  Location
                </span>
                <p className='text-sm text-slate-600 font-medium leading-relaxed'>
                  London, UK
                  <span className='block text-slate-400 text-xs font-normal mt-0.5'>
                    Working worldwide
                  </span>
                </p>
              </div>

              {/* Contact column */}
              <div>
                <span className='block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3'>
                  Contact
                </span>
                <p className='text-sm text-slate-600 font-medium leading-relaxed'>
                  +44 20 7946 0958
                  <a
                    href='mailto:hello@comfortabledecor.com'
                    className='block text-slate-400 hover:text-[#965c40] text-xs font-normal mt-0.5 transition-colors'
                  >
                    hello@comfortabledecor.com
                  </a>
                </p>
              </div>

              {/* Social column */}
              <div>
                <span className='block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3'>
                  Social
                </span>
                <div className='grid grid-cols-2 gap-2 text-sm text-slate-600 font-medium'>
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

              {/* Boucle Chair Card */}
              <div className='flex items-start'>
                <div className='bg-white/60 hover:bg-white border border-slate-200/40 rounded-tr-2xl rounded-bl-2xl shadow-xs hover:shadow-md transition-all duration-300 ease-out hover:rotate-3 hover:scale-[1.03] w-full max-w-[180px] aspect-square flex items-center justify-center relative select-none'>
                  <img
                    src={footerChair}
                    alt='Minimalist design chair decoration'
                    className='w-[92%] h-[92%] object-contain select-none rounded-tr-2xl rounded-bl-2xl'
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
