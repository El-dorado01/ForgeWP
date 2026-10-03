import { BlockArea, WpHead, useWpExcerpt, useWpTitle } from '@forgewp/react';

export default function SingleHospitalityEvent() {
  const title = useWpTitle();
  const excerpt = useWpExcerpt();

  return (
    <main className='min-h-screen bg-[#f5f3ee] text-brand'>
      <WpHead
        title={`${title} | Hospitality 2035 – DICON`}
        description={excerpt}
        ogType='article'
      />
      <BlockArea name='hospitality-event-content' />
    </main>
  );
}
