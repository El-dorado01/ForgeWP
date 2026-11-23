import { BlockArea, Hydrate, WpComments, WpPostTerms } from '@forgewp/react';
import { wpClient } from '@/lib/content';
import { CommentForm } from '@/components/CommentForm';

export async function generateStaticParams() {
  return wpClient.getStaticParams('post');
}

export default async function SinglePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await wpClient.getPost('post', slug);
  const comments = post ? await wpClient.getComments(post.id) : null;
  const flatTerms = Object.values(post?.terms ?? {}).flat();
  return (
    <main className="fwp-content">
      <h1 className="fwp-page-title" data-parity="title">{post?.title}</h1>
      <p data-parity="terms">
        <WpPostTerms
          taxonomy="*"
          terms={flatTerms}
          renderItem={(t, idx) => (
            <span key={t.id}>
              {idx > 0 ? ', ' : ''}
              {t.name}
            </span>
          )}
        />
      </p>
      <div data-parity="post-content"><BlockArea name="post-content" content={post?.content} /></div>
      <section data-g4="comments">
        <h2 data-parity="comment-count">Comments ({comments?.total ?? 0})</h2>
        <WpComments
          comments={comments}
          renderItem={(c) => (
            <article key={c.id} data-parity="comment">
              <b>{c.author.name}</b>
              <div dangerouslySetInnerHTML={{ __html: c.content }} />
            </article>
          )}
        />
      </section>
      {post ? (
        <Hydrate id="comment-form" trigger="visible">
          <CommentForm postId={post.id} />
        </Hydrate>
      ) : null}
    </main>
  );
}
