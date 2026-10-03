import { BlockArea, useWpContent, WpHead } from '@forgewp/react';
import type { ReactNode } from 'react';

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageTemplateProps = {
  slug: string;
  title: string;
  description: string;
  notice?: string;
  sections: LegalSection[];
  links?: { label: string; href: string }[];
  afterContent?: ReactNode;
};

const localPreviewContent =
  '<p>This is sample post content rendered locally so you can design your theme.</p>';

export function LegalPageTemplate({
  slug,
  title,
  description,
  notice,
  sections,
  links = [],
  afterContent,
}: LegalPageTemplateProps) {
  const postContent = useWpContent();
  const hasSavedPageContent =
    postContent.trim().length > 0 && !postContent.includes(localPreviewContent);

  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title={`${title} | Hospitality 2035 – DICON`}
        description={description}
      />

      <header className='bg-brand text-white'>
        <div className='mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20'>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-accent'>
            Hospitality 2035 <span className='px-2 text-white/40'>/</span>{' '}
            Rechtliches
          </p>
          <h1 className='mt-6 max-w-4xl break-words font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl'>
            {title}
          </h1>
          {notice && (
            <p className='mt-6 max-w-3xl border-l-2 border-accent pl-4 text-sm leading-relaxed text-slate-300'>
              {notice}
            </p>
          )}
        </div>
      </header>

      <div className='mx-auto grid max-w-6xl gap-12 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-20 lg:px-12 lg:py-20'>
        <article className='min-w-0'>
          {hasSavedPageContent ? (
            <div className='space-y-6 text-sm leading-7 text-slate-700 [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:decoration-accent [&_a]:underline-offset-4 [&_h2]:mt-12 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-brand [&_h3]:mt-8 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-brand [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:max-w-3xl [&_ul]:space-y-2'>
              <BlockArea name={`${slug}-legal-content`} />
            </div>
          ) : (
            <div className='space-y-10'>
              {sections.map((section) => (
                <section key={section.heading}>
                  <h2 className='font-heading text-xl font-bold leading-tight text-brand sm:text-2xl'>
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((paragraph, index) => (
                    <p
                      key={`${section.heading}-${index}`}
                      className='mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base'
                    >
                      {paragraph}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className='mt-4 max-w-3xl space-y-2 pl-5 text-sm leading-7 text-slate-700 sm:text-base'>
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className='list-disc'
                        >
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {afterContent}
        </article>

        {links.length > 0 && (
          <nav
            aria-label='Kontakt'
            className='h-fit border-l-2 border-accent pl-5 lg:sticky lg:top-28'
          >
            <p className='text-xs font-bold uppercase tracking-[0.14em] text-slate-500'>
              DICON
            </p>
            <div className='mt-4 flex flex-col items-start gap-3'>
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className='text-sm font-semibold text-brand underline decoration-accent underline-offset-4 transition-colors hover:text-accent'
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
