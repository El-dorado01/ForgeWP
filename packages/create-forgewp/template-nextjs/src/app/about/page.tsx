import Link from 'next/link';
import { BlockArea } from '@forgewp/react/server';
import { getPageContent } from '@/lib/content';

export default async function AboutPage() {
  const page = await getPageContent('about');

  return (
    <main className="site-main">
      <h1>{page.title}</h1>
      <BlockArea name="about-content" content={page.content} />
      <p>
        <Link href="/">Back to Home</Link>
      </p>
    </main>
  );
}
