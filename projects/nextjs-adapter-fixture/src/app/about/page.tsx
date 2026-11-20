import { getPage } from '@/lib/content';
export default async function About() {
  const page = await getPage('about');
  return <main id="details"><h1>{page?.title ?? 'No page yet'}</h1>
    <p>{page?.content ?? 'Add local CMS content to get started.'}</p>
  </main>;
}
