'use client';

import { useState } from 'react';
import { submitWpComment } from '@forgewp/react';

export function CommentForm({ postId }: { postId: number }) {
  const [status, setStatus] = useState('');
  return (
    <form
      className="fwp-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const result = await submitWpComment({
          post: postId,
          content: String(data.get('content') || ''),
          authorName: String(data.get('authorName') || ''),
          authorEmail: String(data.get('authorEmail') || ''),
        });
        setStatus(result.ok ? `ok:${result.status}${result.message ? ':' + result.message : ''}` : `error:${result.message || ''}`);
      }}
    >
      <input name="authorName" placeholder="Name" />
      <input name="authorEmail" type="email" placeholder="Email" />
      <textarea name="content" placeholder="Comment" />
      <button type="submit">Post comment</button>
      <p role="status" data-parity="comment-status">{status}</p>
    </form>
  );
}
