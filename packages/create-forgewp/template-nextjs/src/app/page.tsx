import Link from 'next/link';
import { BlockArea, Hydrate } from '@forgewp/react/server';
import { CounterIsland } from '@/components/CounterIsland';
import { getPageContent } from '@/lib/content';

export default async function HomePage() {
  const page = await getPageContent('home');

  return (
    <main className="site-main">
      <h1>{page.title}</h1>
      <BlockArea name="home-content" content={page.content} />
      <Hydrate id="counter-island" trigger="visible">
        <CounterIsland initialCount={1} />
      </Hydrate>
      <p>
        <Link href="/about">Learn more on the About page</Link>
      </p>
    </main>
  );
}
