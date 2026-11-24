import { BlockArea } from '@forgewp/react';
import { wpClient } from '@/lib/content';
import { editable } from '../../../cms/editables/about';

export const metadata = { title: 'About · Parity' };

export default async function AboutPage() {
  const page = await wpClient.getLivePage('about');
  const fields = await wpClient.getEditable(editable, { routeId: 'about' });
  return (
    <main className="fwp-content">
      <h1 className="fwp-page-title" data-parity="title">{page?.title ?? 'About'}</h1>
      <p data-parity="about-tagline">{fields.about_tagline}</p>
      <div data-parity="about-intro" dangerouslySetInnerHTML={{ __html: String(fields.about_intro ?? '') }} />
      <div data-parity="about-content"><BlockArea name="about-content" content={page?.content} /></div>
    </main>
  );
}
