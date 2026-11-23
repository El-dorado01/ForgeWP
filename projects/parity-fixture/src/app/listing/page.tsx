import { wpClient } from '@/lib/content';

export default async function ListingPage() {
  const posts = await wpClient.getPosts('post', { perPage: 2 });
  const terms = await wpClient.getTerms('category');
  const term = await wpClient.getTerm('category', 'uncategorized');
  return (
    <main className="fwp-content">
      <ul data-parity="posts">{(Array.isArray(posts) ? posts : (posts as any).items ?? []).map((p: any) => <li key={p.id}>{p.title} → {p.path}</li>)}</ul>
      <p data-parity="term-list">{(Array.isArray(terms) ? terms : (terms as any)?.items ?? []).map((t: any) => `${t.name}(${t.count})`).join(', ')}</p>
      <p data-parity="term">{term ? `${term.name} ${term.path}` : 'none'}</p>
    </main>
  );
}
