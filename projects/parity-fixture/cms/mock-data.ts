import { defineWpPosts } from '@forgewp/react/config';

export const mockData = defineWpPosts({
  page: [
    {
      id: 1,
      slug: 'home',
      title: 'Welcome to ForgeWP + Next.js',
      content:
        '<p>Author with ordinary Next.js App Router components and export to a native WordPress theme or run decoupled against WordPress REST.</p>',
    },
    {
      id: 2,
      slug: 'about',
      title: 'About Us',
      content:
        '<p>We are an Parity test studio. This paragraph is the About page content, editable in Gutenberg.</p>',
    },
  ],
  post: [
    {
      id: 11,
      slug: 'first-parity-post',
      title: 'First Parity Post',
      excerpt: 'The first seeded post used by the cloud Parity run.',
      content: '<p>Body of the first Parity post.</p>',
      date: '2026-11-01T09:00:00Z',
    },
    {
      id: 12,
      slug: 'second-parity-post',
      title: 'Second Parity Post',
      excerpt: 'The second seeded post, for archive ordering checks.',
      content: '<p>Body of the second Parity post.</p>',
      date: '2026-11-02T09:00:00Z',
    },
  ],
});

export default mockData;
