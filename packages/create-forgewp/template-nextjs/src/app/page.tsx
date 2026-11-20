import Link from 'next/link';
import { BlockArea } from '@forgewp/react/server';
import { getPageContent } from '@/lib/content';

export default async function HomePage() {
  const page = await getPageContent('home');

  return (
    <main className="site-main">
      <h1>{page.title}</h1>
      <BlockArea name="home-content" content={page.content} />
      <p>
        <Link href="/about">Learn more on the About page</Link>
      </p>
    </main>
  );
}
