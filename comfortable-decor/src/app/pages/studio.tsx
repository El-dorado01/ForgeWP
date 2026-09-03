import * as React from 'react';
import { Link } from '@/components/ui/link';
import { ArrowRight, ArrowUpRight, Play, Plus, Minus } from 'lucide-react';
import { Button, ButtonLabel } from '@/components/ui/button';
import { TiltCard } from '@/components/motion/tilt-card';
import { Marquee } from '@/components/ui/marquee';
import { getFeaturedPosts } from '@/data/blog';
import {
  Reveal,
  CountUp,
  Float,
  slideLeft,
  slideRight,
  motion,
  HeroMotion,
  HeroItem,
} from '@/components/motion/reveal';
import { WpHead, WpImage } from '@forgewp/react';

/**
 * Ohio Demo 34 Master Architectural Studio Experience
 * Full-scale architectural layout, monumental Space Grotesk typography,
 * interactive department accordions, asymmetrical masonry, and rich micro-interactions.
 */

const architecturalProjects = [
  {
    id: 1,
    title: 'Modern terracotta business center with geometric facade',
    location: 'BÉZIERS, FRANCE',
    area: '23.220 M2',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
    span: 'col-span-1',
  },
  {
    id: 2,
    title: 'Scandinavian summer house with huge windows in Denmark',
    location: 'TROLDHEDE, DENMARK',
    area: '265 M2',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=85',
    span: 'col-span-1 lg:col-span-2',
  },
  {
    id: 3,
    title: 'Modern multi-story residential building with a lush courtyard',
    location: 'NÜRNBERG, GERMANY',
    area: '12.700 M2',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1400&q=85',
    span: 'col-span-1 lg:col-span-2',
  },
  {
    id: 4,
    title: 'Mountain minimalist living space integrated with natural boulders',
    location: 'GRANDE TÊTE, FRANCE',
    area: '225 M2',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85',
    span: 'col-span-1',
  },
  {
    id: 5,
    title: 'Schüco® systems central commercial building with glass facades',
    location: 'MALMÖ, SWEDEN',
    area: '26.376 M2',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200&q=85',
    span: 'col-span-1',
  },
  {
    id: 6,
    title: 'Modern renovation of Foshan Guanyao museum, culture and art center',
    location: 'DÜSSELDORF, GERMANY',
    area: '18.256 M2',
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1200&q=85',
    span: 'col-span-1',
  },
  {
    id: 7,
    title: 'Clean and sunny private residential apartments with a wooden terrace',
    location: 'VALENCIA, SPAIN',
    area: '195 M2',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85',
    span: 'col-span-1',
  },
  {
    id: 8,
    title: 'Bristol International High School with geometric, minimalistic shapes',
    location: 'BRISTOL, ENGLAND',
    area: '23.560 M2',
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1400&q=85',
    span: 'col-span-1 lg:col-span-2',
  },
  {
    id: 9,
    title: 'Kinetic timber pavilion & botanical conservatory',
    location: 'KYOTO, JAPAN',
    area: '14.800 M2',
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200&q=85',
    span: 'col-span-1',
  },
];

const processCards = [
  {
    n: '01.',
    title: 'Insights & creative approach',
    body: 'To develop a clear vision of the project’s needs, market position, and audience to align with strategic goals.',
    bg: 'bg-[#ebe8e1] text-ink',
  },
  {
    n: '02.',
    title: 'Integrated design engineering',
    body: 'Developing detailed concept schemes, structural specifications, material palettes, and 3D architectural visualisations.',
    bg: 'bg-[#c4d1bc] text-ink',
  },
  {
    n: '03.',
    title: 'Execution & craftsmanship',
    body: 'Coordinating fabrication, sustainable procurement, artisan joinery, and on-site construction oversight.',
    bg: 'bg-[#d08c7f] text-ink',
  },
  {
    n: '04.',
    title: 'Post-occupancy evaluation',
    body: 'Ensuring long-term functional excellence, spatial acoustics, lighting tuning, and lifecycle environmental performance.',
    bg: 'bg-[#181816] text-cream',
  },
];

const departments = [
  {
    id: 1,
    name: 'Architecture',
    body: 'We design functional, aesthetic, and context-sensitive buildings ranging from private residences to cultural institutions and mixed-use urban complexes.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85',
  },
  {
    id: 2,
    name: 'Interior Design',
    body: 'Sculptural, tactile interiors crafted with natural materials, intentional daylighting, and custom bespoke furnishings designed to endure.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85',
  },
  {
    id: 3,
    name: 'Urban Planning',
    body: 'Holistic masterplans and civic environments that enrich local communities, restore ecological corridors, and cultivate human connection.',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200&q=85',
  },
  {
    id: 4,
    name: 'Landscape Architecture',
    body: 'Integrating architecture with the living earth through native flora, sustainable drainage systems, and mindful outdoor living spaces.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85',
  },
  {
    id: 5,
    name: 'Lighting & Acoustic Engineering',
    body: 'Precision architectural lighting and acoustic harmony engineered to elevate wellbeing, atmosphere, and everyday focus.',
    image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1200&q=85',
  },
];

export default function StudioPage() {
  const [activeDept, setActiveDept] = React.useState<number>(1);
  const activeDeptObj = departments.find((d) => d.id === activeDept) || departments[0];
  const insights = getFeaturedPosts().slice(0, 4);

  return (
    <>
      <WpHead
        title="Architectural Studio — Design for Life, Built to Last | Comfortable Decor"
        description="Comprehensive architectural, interior design, and masterplanning services. Exploring 24+ award-winning projects across Europe."
      />

      {/* 1. MONUMENTAL HERO */}
      <section className="relative min-h-[75vh] sm:min-h-[85vh] lg:min-h-[92vh] flex flex-col justify-end pt-16 sm:pt-28 md:pt-36 pb-10 sm:pb-14 md:pb-20 bg-[#181816] text-cream overflow-hidden">
        {/* Cinematic Backdrop Image with Fine Grain Texture */}
        <div className="absolute inset-0 z-0">
          <WpImage
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=85"
            alt="Monumental Architecture"
            className="h-full w-full object-cover opacity-45 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181816] via-[#181816]/60 to-transparent" />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#181816]/30 to-[#181816]/80" />
        </div>

        <div className="container-wide relative z-10 w-full">
          <HeroMotion className="max-w-5xl">
            <HeroItem>
              <div className="flex flex-wrap items-center gap-2.5 mb-4 sm:mb-6">
                <span className="inline-block rounded-full bg-cream px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink font-semibold">
                  (01) // Architecture & Design Studio
                </span>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-cream/10 px-4 py-1.5 backdrop-blur-md text-cream text-xs font-mono">
                  <Play className="h-3 w-3 fill-cream" />
                  <span>More videos</span>
                </div>
              </div>
            </HeroItem>

            <HeroItem>
              <h1 className="font-heading font-semibold text-cream uppercase leading-[0.92] tracking-tighter text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] max-w-6xl">
                Design for
                <br />
                life, built
                <br />
                to last
              </h1>
            </HeroItem>

            <HeroItem>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Button asChild shape="pill" size="xl" className="w-full sm:w-auto bg-cream text-ink hover:bg-white shadow-xl px-7">
                  <Link href="/shop" className="group/btn inline-flex items-center justify-center gap-2.5">
                    <ButtonLabel mode="slide">Our Services</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </Link>
                </Button>
                <Button asChild variant="outline" shape="pill" size="xl" className="w-full sm:w-auto border-cream/50 text-cream hover:bg-cream hover:text-ink px-7">
                  <Link href="/contact" className="group/btn inline-flex items-center justify-center gap-2.5">
                    <ButtonLabel mode="slide">Drop us a line</ButtonLabel>
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                      <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                    </span>
                  </Link>
                </Button>
              </div>
            </HeroItem>
          </HeroMotion>
        </div>
      </section>

      {/* 2. INTRO — Monumental Statement + Offset Dual Image Gallery */}
      <section className="section-y bg-cream">
        <div className="container-wide grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: Sage Statement Box */}
          <Reveal className="lg:col-span-6" variants={slideRight}>
            <div className="bg-[#c4d1bc] p-8 md:p-12 lg:p-14 border border-border/50">
              <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-4">
                We help to achieve goals
              </p>
              <h2 className="display-section text-ink font-medium leading-[1.04]">
                Comfortable Decor® is an architecture and design studio that partners
                with clients worldwide to build iconic buildings, landscapes, interior
                and digital experiences.
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild shape="pill" size="lg" className="bg-ink text-cream hover:bg-ink/90">
                  <Link href="/shop" className="group/btn">
                    <ButtonLabel mode="cube">Our Services</ButtonLabel>
                  </Link>
                </Button>
                <Button asChild variant="outline" shape="pill" size="lg" className="border-ink/40 text-ink hover:bg-ink hover:text-cream">
                  <Link href="/contact" className="group/btn">
                    <ButtonLabel mode="slide">Drop us a line</ButtonLabel>
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>

          {/* Right: Editorial Narrative + Staggered Photos */}
          <Reveal className="lg:col-span-6" variants={slideLeft}>
            <div className="space-y-6">
              <p className="text-sm md:text-base text-ink-muted leading-relaxed font-light">
                From the first sketch, our team immerses itself in the soul of the project — the initial
                concepts and ideas that shape everything from the structure to the product design. We embrace
                the creative challenge of every assignment, preparing several distinct design proposals that
                honor the client’s vision.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="aspect-[3/4] overflow-hidden bg-stone group">
                  <WpImage
                    src="https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=85"
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-108"
                  />
                </div>
                <div className="aspect-[3/4] overflow-hidden bg-stone mt-8 group">
                  <WpImage
                    src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=85"
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-108"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. SELECTED WORKS — 3-Column Asymmetric Masonry Grid */}
      <section className="section-y !pt-0 bg-cream">
        <div className="container-wide">
          {/* Header with Project Counter */}
          <Reveal className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-5 md:pb-6">
            <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
              <h2 className="display-section text-ink">Selected works</h2>
              <span className="font-mono text-xs text-ink-muted">(24) 2002–2026</span>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 sm:px-6 sm:py-2.5 font-heading text-xs sm:text-sm uppercase tracking-wider font-semibold text-cream transition-colors hover:bg-sage-deep self-start sm:self-auto shadow-sm"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>

          {/* Asymmetric Staggered Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {architecturalProjects.map((project) => (
              <div key={project.id} className={project.span}>
                <TiltCard maxTilt={4} className="h-full">
                  <article className="group relative flex h-full flex-col overflow-hidden bg-stone">
                    <div className="relative aspect-[16/11] overflow-hidden">
                      <WpImage
                        src={project.image}
                        alt={project.title}
                        className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-108"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-ink/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream/90 text-ink shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                          <Play className="h-4 w-4 fill-ink ml-0.5" />
                        </span>
                      </div>
                    </div>

                    <div className="p-6 bg-cream border border-t-0 border-border/60 flex-1 flex flex-col justify-between">
                      <h3 className="font-heading text-lg md:text-xl font-medium text-ink group-hover:text-sage-deep transition-colors leading-snug">
                        {project.title}
                      </h3>
                      <p className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-muted">
                        {project.location} · {project.area}
                      </p>
                    </div>
                  </article>
                </TiltCard>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MONOCHROME PRESS LOGOS STRIP */}
      <div className="border-y border-border/80 bg-[#f4f1ea] py-8">
        <Marquee speed={28}>
          {['stir', 'archdaily', 'designboom', 'dezeen', 'GLOBAL ARCHITECTURE AWARDS', 'FRAME'].map(
            (press, i) => (
              <span
                key={`${press}-${i}`}
                className="flex items-center font-heading text-lg md:text-xl uppercase tracking-[0.2em] font-bold text-ink/40 whitespace-nowrap px-8"
              >
                <span>{press}</span>
                <span className="ml-16 text-border font-normal">/</span>
              </span>
            ),
          )}
        </Marquee>
      </div>

      {/* 5. 4-COLOR PROCESS CARDS ARRAY + PANORAMIC PHOTO STRIP */}
      <section className="section-y bg-cream">
        <div className="container-wide">
          <Reveal className="mb-12 md:mb-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-3">
                A Tailored Approach
              </p>
              <h2 className="display-section text-ink max-w-2xl leading-tight">
                We understand that your project is one-of-a-kind. We adopt a flexible approach, allowing us to create a plan and a budget that fits your specific needs.
              </h2>
            </div>
            <div className="lg:col-span-5 flex items-end">
              <p className="text-sm md:text-base text-ink-muted leading-relaxed font-light">
                Our integrated, interdisciplinary approach covers all architectural disciplines and allows us to work closely with external partners. This collaboration ensures we deliver a seamless process and a high-quality product that brings value to everyone involved.
              </p>
            </div>
          </Reveal>

          {/* 4 Full-Height Colored Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-10">
            {processCards.map((card) => (
              <TiltCard key={card.n} maxTilt={5}>
                <div
                  className={`group relative flex h-full min-h-[320px] flex-col justify-between p-7 md:p-8 ${card.bg} border border-border/40`}
                >
                  <div>
                    <span className="font-mono text-xs tracking-widest block mb-4 text-inherit opacity-80">
                      {card.n}
                    </span>
                    <h3 className="font-heading text-xl md:text-2xl font-medium tracking-tight leading-snug text-inherit">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-xs md:text-sm text-inherit opacity-80 leading-relaxed font-light">
                      {card.body}
                    </p>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-current opacity-70 transition-transform group-hover:scale-110 group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>

          {/* Panoramic Photo Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=85',
              'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=85',
              'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=85',
              'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&q=85',
            ].map((img, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden bg-stone group">
                <WpImage
                  src={img}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-108"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DECADE OF EXPERIENCE PARALLAX BANNER */}
      <section className="relative min-h-[65vh] flex items-center bg-ink overflow-hidden select-none">
        <motion.img
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=2000&q=85"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/75 to-transparent" />

        <div className="container-wide relative z-10 py-20 md:py-28">
          <Reveal className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-widest text-cream/70 mb-4">
              We help to achieve goals
            </p>
            <h2 className="display-section text-cream font-medium leading-tight">
              After more than a decade in the industry, we’re proud to completed over 340+ projects that have helped shape our local landscape.
            </h2>
            <p className="mt-5 text-sm md:text-base text-cream/75 max-w-xl font-light leading-relaxed">
              We’ve tackled projects of all sizes, from small-scale residential renovations to large-scale commercial developments, always with the same dedication to exceeding your expectations.
            </p>
            <div className="mt-8">
              <Button asChild shape="pill" size="lg" className="bg-cream text-ink hover:bg-white shadow-xl">
                <Link href="/shop" className="group/btn">
                  <ButtonLabel mode="cube">Our Services</ButtonLabel>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. INTERACTIVE DEPARTMENT ACCORDION WITH LIVE PHOTO CROSSFADE */}
      <section className="section-y bg-cream border-b border-border/80">
        <div className="container-wide grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left: Department List */}
          <div className="lg:col-span-7">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-3">
              What we do
            </p>
            <h2 className="display-section text-ink mb-10 leading-tight">
              We develop unique design languages and offer fresh perspectives on established methods and solutions for every project.
            </h2>

            <div className="divide-y divide-border/80">
              {departments.map((dept) => {
                const isActive = activeDept === dept.id;
                return (
                  <div
                    key={dept.id}
                    className="py-5 transition-colors cursor-pointer"
                    onClick={() => setActiveDept(dept.id)}
                    onMouseEnter={() => setActiveDept(dept.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-heading text-xl md:text-2xl font-medium transition-colors ${
                          isActive ? 'text-sage-deep pl-2' : 'text-ink hover:text-sage-deep'
                        }`}
                      >
                        {isActive ? '— ' : '+ '}
                        {dept.name}
                      </span>
                      <span className="text-xs font-mono text-ink-muted">
                        {isActive ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                    </div>

                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-4 text-xs md:text-sm text-ink/75 leading-relaxed font-light max-w-xl pl-4 border-l-2 border-sage-deep">
                          {dept.body}
                        </p>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Sticky Photo that swaps seamlessly */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="aspect-[3/4] overflow-hidden bg-stone border border-border/60 shadow-xl">
              <motion.img
                key={activeDeptObj.image}
                src={activeDeptObj.image}
                alt={activeDeptObj.name}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOUNDER STATEMENT & DESIGNER PORTRAIT */}
      <section className="section-y bg-[#f4f1ea]">
        <div className="container-wide grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left: Designer Portrait */}
          <div className="lg:col-span-5 aspect-[3/4] overflow-hidden bg-stone">
            <WpImage
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1000&q=85"
              alt="Architect and Founder Jonas Müller"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Right: Big Quote */}
          <div className="lg:col-span-7">
            <p className="text-xs md:text-sm text-ink-muted leading-relaxed font-light mb-6">
              We manage every project from the early phases to completion, whether it’s urban planning, real estate, or product development. From the first sketch, our team immerses itself in the soul of the project — the initial concepts and ideas that shape everything from the structure to the product design.
            </p>

            <blockquote className="font-heading text-2xl md:text-3xl font-medium text-ink leading-snug tracking-tight">
              “We start by uncovering the essential elements of your project to guide our process. We use four main steps to steer the work, built on a foundation of transparency, collaboration, and iterative feedback to ensure a successful partnership.”
            </blockquote>

            <footer className="mt-8 pt-6 border-t border-border/80 flex items-center justify-between">
              <div>
                <p className="font-heading text-base font-semibold text-ink">Jonas Müller</p>
                <p className="text-xs font-mono text-ink-muted">Founder & CEO</p>
              </div>
            </footer>
          </div>
        </div>
      </section>

      {/* 9. MONUMENTAL TERRACOTTA STATS BANNER */}
      <section className="relative overflow-hidden bg-[#d08c7f] text-ink select-none">
        <div className="container-wide section-y relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <Reveal className="lg:col-span-7">
              <Float amplitude={4} duration={5} className="inline-flex mb-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-ink/30 bg-cream/40 backdrop-blur-sm">
                  <Play className="h-4 w-4 fill-ink ml-0.5" />
                </span>
              </Float>

              <h2 className="display-monument uppercase tracking-tight text-ink leading-[0.92] max-w-2xl">
                Solutions
                <br />
                for today,
                <br />
                thinking for
                <br />
                tomorrow
              </h2>

              <div className="mt-10 flex flex-wrap gap-4">
                <Button asChild shape="pill" size="lg" className="bg-ink text-cream hover:bg-ink/90">
                  <Link href="/shop" className="group/btn">
                    <ButtonLabel mode="cube">Our Services</ButtonLabel>
                  </Link>
                </Button>
                <Button asChild variant="outline" shape="pill" size="lg" className="border-ink text-ink hover:bg-ink hover:text-cream">
                  <Link href="/contact" className="group/btn">
                    <ButtonLabel mode="slide">Drop us a line</ButtonLabel>
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal className="lg:col-span-5" delay={0.12}>
              <div className="grid grid-cols-3 gap-6 pt-8 border-t lg:border-t-0 border-ink/20">
                {[
                  { n: 23, s: '+', label: 'years of experience' },
                  { n: 340, s: '+', label: 'projects brought to the market' },
                  { n: 98, s: '+', label: 'honored for excellence' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-heading text-4xl md:text-5xl font-bold tabular-nums text-ink">
                      <CountUp to={stat.n} suffix={stat.s} />
                    </p>
                    <p className="mt-2 text-xs text-ink/75 leading-snug font-light">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 10. RECENT INSIGHTS / JOURNAL */}
      <section className="section-y bg-cream">
        <div className="container-wide">
          <Reveal className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/80 pb-5 md:pb-6">
            <div className="flex flex-wrap items-baseline gap-3 sm:gap-4">
              <h2 className="display-section text-ink">Recent insights</h2>
              <span className="font-mono text-xs text-ink-muted">(04) 2002–2026</span>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 sm:px-6 sm:py-2.5 font-heading text-xs sm:text-sm uppercase tracking-wider font-semibold text-cream transition-colors hover:bg-sage-deep self-start sm:self-auto shadow-sm"
            >
              <span>Read All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {insights.map((post) => (
              <article key={post.id} className="group flex flex-col">
                <Link
                  href={`/blog/${post.slug}`}
                  className="aspect-[4/3] overflow-hidden bg-stone mb-4 block"
                >
                  <WpImage
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-108"
                    loading="lazy"
                  />
                </Link>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  {post.date} · {post.readTime}
                </p>
                <h3 className="mt-2 font-heading text-base font-medium text-ink group-hover:text-sage-deep transition-colors leading-snug">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="mt-2 text-xs text-ink-muted line-clamp-2 leading-relaxed font-light">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-stone/70 px-2.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-ink">
                    Case Study
                  </span>
                  <span className="rounded-full bg-stone/70 px-2.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-ink">
                    Perspectives
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 11. MONUMENTAL CLOSING CTA ("SAY HI" / "DROP US A LINE") */}
      <section className="border-t border-border/80 bg-[#ebe7df] py-20 md:py-28 select-none">
        <div className="container-wide grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted mb-2">
              We would love to hear from you
            </p>
            <h2 className="font-heading text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-ink uppercase leading-none">
              Say Hi
            </h2>
          </div>

          <div className="lg:col-span-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <p className="text-sm md:text-base text-ink-muted max-w-xs font-light leading-relaxed">
              Tell us about your project. Let’s collaborate and make some great stuff together.
            </p>
            <Button asChild shape="pill" size="xl" className="bg-ink text-cream hover:bg-ink/90 shadow-xl px-7">
              <Link href="/contact" className="group/btn inline-flex items-center gap-2.5">
                <ButtonLabel mode="slide">Drop us a line</ButtonLabel>
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-5" />
                  <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/btn:translate-x-0" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
