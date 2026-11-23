import { BlockArea } from '@forgewp/react';
import { wpClient } from '@/lib/content';

export const metadata = { title: 'About · Parity' };

export default async function AboutPage() {
  const page = await wpClient.getLivePage('about');
  return (
    <main className="fwp-content">
      <h1 className="fwp-page-title" data-parity="title">{page?.title ?? 'About'}</h1>
      <div data-parity="about-content"><BlockArea name="about-content" content={page?.content} /></div>
    </main>
  );
}
