import {
  WpQueryLoop,
  useWpCustomField,
  useWpExcerpt,
  useWpTitle,
  useWpPermalink,
  WpLink,
} from '@forgewp/react';

type EventRecordProps = {
  tone?: 'dark' | 'light';
};

function EventCard({ tone = 'light' }: EventRecordProps) {
  const cityLabel = useWpCustomField('city_label', useWpTitle());
  const timing = useWpCustomField('timing', 'Termin wird bekannt gegeben');
  const title = useWpTitle();
  const permalink = useWpPermalink();
  const isDark = tone === 'dark';

  return (
    <article
      className={`grid gap-6 border-b py-8 last:border-b-0 sm:grid-cols-[0.3fr_0.7fr] sm:gap-10 ${isDark ? 'border-white/20' : 'border-slate-200'}`}
    >
      <div>
        <p
          className={`font-heading text-3xl font-black sm:text-4xl ${isDark ? 'text-accent' : 'text-brand'}`}
        >
          {cityLabel}
        </p>
        <p
          className={`mt-2 text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          {timing}
        </p>
      </div>
      <div>
        <h3
          className={`font-heading text-2xl font-bold sm:text-3xl ${isDark ? 'text-white' : 'text-brand'}`}
        >
          {title}
        </h3>
        <p
          className={`mt-3 max-w-2xl text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
        >
          {useWpExcerpt()}
        </p>
        <WpLink
          href={permalink}
          className={`mt-5 inline-flex border px-4 py-3 text-[10px] font-bold uppercase ${isDark ? 'border-accent text-white hover:bg-accent' : 'border-brand text-brand hover:bg-brand hover:text-white'}`}
        >
          Veranstaltungsdetails
        </WpLink>
      </div>
    </article>
  );
}

export function EventArchive({ tone = 'light' }: EventRecordProps) {
  return (
    <WpQueryLoop
      postType='hospitality_event'
      postsPerPage={10}
    >
      <EventCard tone={tone} />
    </WpQueryLoop>
  );
}
