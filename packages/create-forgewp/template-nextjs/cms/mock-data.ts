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
      title: 'About This Theme',
      content:
        '<p>Edit this page inside WordPress Gutenberg and see changes reflected natively in PHP or live in decoupled Next.js.</p>',
    },
  ],
});

export default mockData;
