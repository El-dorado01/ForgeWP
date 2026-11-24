import { WpQueryLoop, WpTermsLoop } from '@forgewp/react';
import { wpClient } from '@/lib/content';

export default async function ListingPage() {
  const posts = await wpClient.getPosts('post', { perPage: 2 });
  const terms = await wpClient.getTerms('category');
  const term = await wpClient.getTerm('category', 'uncategorized');
  return (
    <main className="fwp-content">
      <ul data-parity="posts">
        <WpQueryLoop
          postType="post"
          useMainQuery={false}
          postsPerPage={2}
          posts={posts}
          renderItem={(p) => (
            <li key={p.id}>
              {p.title} → {p.path}
            </li>
          )}
        />
      </ul>
      <p data-parity="term-list">
        <WpTermsLoop
          taxonomy="category"
          terms={terms}
          separator=", "
          renderItem={(t) => (
            <span key={t.id}>
              {`${t.name}(${t.count})`}
            </span>
          )}
        />
      </p>
      <p data-parity="term">{term ? `${term.name} ${term.path}` : 'none'}</p>
    </main>
  );
}
