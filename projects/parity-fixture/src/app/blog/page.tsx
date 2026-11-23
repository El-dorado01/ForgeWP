import { WpQueryLoop } from '@forgewp/react';
import { wpClient } from '@/lib/content';

export const metadata = { title: 'Blog · Parity' };

export default async function BlogArchivePage() {
  const posts = await wpClient.getPosts('post');
  return (
    <main className="fwp-content">
      <h1 className="fwp-page-title" data-parity="title">Blog</h1>
      <WpQueryLoop
        postType="post"
        posts={posts}
        renderItem={(post) => (
          <article key={post.id} className="fwp-card" data-parity="post-card">
            <h2>
              <a href={post.permalink}>{post.title}</a>
            </h2>
            <p>{post.excerpt}</p>
          </article>
        )}
      />
    </main>
  );
}
