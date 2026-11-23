import { BlockArea } from '@forgewp/react';
import { getPageContent } from '@/lib/content';

export default async function HomePage() {
  const page = await getPageContent('home');
  return (
    <main className="fwp-content">
      <h1 className="fwp-page-title" data-parity="title">Parity fixture home</h1>
      <div data-parity="home-content">
        <BlockArea name="home-content" content={page.content} />
      </div>
    </main>
  );
}
