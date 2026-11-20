import NextLink from 'next/link';
import { getPage } from '@/lib/content';
import { IntroPreview } from '@/components/IntroPreview';
export default async function Home() {
  const page = await getPage('home');
  return <main><h1>{page?.title ?? 'No page yet'}</h1>
    <p>{page?.content ?? 'Add local CMS content to get started.'}</p>
    <IntroPreview />
    <NextLink href="/about/?from=home#details">About this fixture</NextLink>
  </main>;
}
