import {
  WpHead,
  WpQueryLoop,
  useRoute,
  useWpCustomField,
  useWpPageLink,
  WpLink,
  useWpQuery,
} from '@forgewp/react';
import {
  EventHeroSection,
  EventOverviewSection,
  EventProgramSection,
} from './EventPageSections';

function EventBySlug({ slug }: { slug: string }) {
  const eventsHref = useWpPageLink('events-page', '/events');
  const { posts, loading } = useWpQuery({
    postType: 'hospitality_event',
    postsPerPage: 100,
  });
  const event = posts.find((post) => post.slug === slug);

  if (loading) {
    return (
      <main
        className='min-h-[50vh] bg-white'
        aria-busy='true'
      />
    );
  }

  if (!event) {
    return (
      <main className='mx-auto min-h-[50vh] max-w-4xl px-5 py-20'>
        <h1 className='font-heading text-3xl font-bold text-brand'>
          Veranstaltung nicht gefunden
        </h1>
        <WpLink
          className='mt-6 inline-block underline'
          href={eventsHref}
        >
          Alle Veranstaltungen
        </WpLink>
      </main>
    );
  }

  return (
    <>
      <WpHead
        title={`${event.title} | Hospitality 2035 – DICON`}
        description={event.excerpt}
        ogType='article'
      />
      <WpQueryLoop
        postType='hospitality_event'
        postId={event.id}
        postsPerPage={1}
      >
        <EventPagePreview />
      </WpQueryLoop>
    </>
  );
}

function EventPagePreview() {
  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <EventHeroSection
        cityLabel={useWpCustomField('city_label', 'Hospitality 2035')}
      />
      <div className='mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-12 lg:py-24'>
        <EventOverviewSection
          timing={useWpCustomField('timing', 'Termin wird bekannt gegeben')}
          location={useWpCustomField('location', 'Veranstaltungsort folgt')}
          participants={useWpCustomField(
            'participants',
            'Weitere Angaben folgen',
          )}
        />
        <EventProgramSection
          program={useWpCustomField(
            'program',
            'Weitere Programminformationen folgen.',
          )}
        />
      </div>
    </main>
  );
}

export function SingleHospitalityEventPreview() {
  const [, params] = useRoute('/events/:slug');
  return <EventBySlug slug={params?.slug ?? ''} />;
}
