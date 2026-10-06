import { defineWpPosts } from '@forgewp/react';

export const mockData = defineWpPosts({
  post: [
    {
      id: 1,
      slug: 'welcome-to-forgewp',
      title: 'Welcome to ForgeWP: The Headless Revolution',
      excerpt:
        'Discover how ForgeWP bridges standard WordPress themes with blistering fast React architectures.',
      content:
        '<p>This is the first mock post. In local dev, you can modify <code>cms/mock-data.ts</code> to test layout content changes.</p>',
      date: '2026-05-10T09:00:00Z',
      author: 'Antigravity',
      featuredImage: 'https://picsum.photos/seed/forgewp/1200/630',
      customFields: { read_time: '5' },
      _terms: {
        category: [
          { id: 1, slug: 'tutorials', name: 'Tutorials' },
          { id: 2, slug: 'framework', name: 'Framework' },
        ],
        post_tag: [
          { id: 10, slug: 'react', name: 'React' },
          { id: 11, slug: 'wordpress', name: 'WordPress' },
        ],
      },
    },
    {
      id: 2,
      slug: 'unlocking-brutalist-web-design',
      title: 'Unlocking Brutalist Web Design Aesthetics',
      excerpt:
        'A deep dive into high-contrast grids, sharp corners, and premium flat shadows in modern interfaces.',
      content:
        '<p>This is the second mock post. Style these grids using beautiful Tailwind utilities.</p>',
      date: '2026-05-12T14:30:00Z',
      author: 'DeepMind Partner',
      featuredImage: 'https://picsum.photos/seed/brutalist/1200/630',
      customFields: { read_time: '8' },
      _terms: {
        category: [
          { id: 3, slug: 'design', name: 'Design' },
          { id: 4, slug: 'css', name: 'CSS' },
        ],
        post_tag: [
          { id: 12, slug: 'brutalism', name: 'Brutalism' },
          { id: 13, slug: 'tailwind', name: 'Tailwind' },
        ],
      },
    },
  ],
  hospitality_event: [
    {
      id: 301,
      slug: 'berlin-study-media-launch',
      permalink: '/events/berlin-study-media-launch',
      title: 'Hospitality 2035 – Study & Media Launch',
      excerpt:
        'Erste Novemberwoche 2026 · ca. 09:00–12:30 Uhr. Der offizielle Auftakt mit Präsentation ausgewählter Studienergebnisse und Paneldiskussion.',
      featuredImage: '/berlin.jpg',
      content:
        '<!-- wp:forgewp/hospitality-event-hero {"cityLabel":"Berlin"} /--><!-- wp:forgewp/hospitality-event-overview {"timing":"Erste Novemberwoche 2026 · ca. 09:00–12:30 Uhr","location":"Veranstaltungsort wird ergänzt","participants":"Accor · DICON · hotelinside (Moderation)"} /--><!-- wp:forgewp/hospitality-event-program {"program":"Präsentation ausgewählter Studienergebnisse; Impulse zu Technologie und Automatisierung; Paneldiskussion mit Vertretern aus Hotellerie, Technologie und Branchenorganisationen. Im Anschluss besteht Gelegenheit zum persönlichen Austausch."} /-->',
      customFields: {
        city: 'berlin',
        city_label: 'Berlin',
        timing: 'Erste Novemberwoche 2026 · ca. 09:00–12:30 Uhr',
        location: 'Veranstaltungsort wird ergänzt',
        participants: 'Accor · DICON · hotelinside (Moderation)',
        program:
          'Präsentation ausgewählter Studienergebnisse; Impulse zu Technologie und Automatisierung; Paneldiskussion mit Vertretern aus Hotellerie, Technologie und Branchenorganisationen. Im Anschluss besteht Gelegenheit zum persönlichen Austausch.',
      },
    },
    {
      id: 302,
      slug: 'zurich-executive-event-switzerland',
      permalink: '/events/zurich-executive-event-switzerland',
      title: 'Hospitality 2035 – Executive Event Switzerland',
      excerpt:
        'Zweite Novemberwoche 2026. Eine Executive-Diskussion mit Fokus auf die Schweizer Hotellerie.',
      featuredImage: '/zurich.jpg',
      content:
        '<!-- wp:forgewp/hospitality-event-hero {"cityLabel":"Zürich"} /--><!-- wp:forgewp/hospitality-event-overview {"timing":"Zweite Novemberwoche 2026","location":"Veranstaltungsort wird ergänzt","participants":"Ausgewählte Branchenvertreter"} /--><!-- wp:forgewp/hospitality-event-program {"program":"Präsentation zentraler Studienergebnisse und Executive-Diskussion zu den Konsequenzen für die Schweizer Hotellerie."} /-->',
      customFields: {
        city: 'zurich',
        city_label: 'Zürich',
        timing: 'Zweite Novemberwoche 2026',
        location: 'Veranstaltungsort wird ergänzt',
        participants: 'Ausgewählte Branchenvertreter',
        program:
          'Präsentation zentraler Studienergebnisse und Executive-Diskussion zu den Konsequenzen für die Schweizer Hotellerie.',
      },
    },
  ],
  attachment: [
    {
      id: 101,
      url: 'https://picsum.photos/seed/forgewp/1200/630',
      alt: 'ForgeWP Logo and Brand Artwork',
      title: 'ForgeWP Logo',
      caption: 'A high-fidelity minimalist logo graphic.',
      width: 1200,
      height: 630,
    },
    {
      id: 102,
      url: 'https://picsum.photos/seed/layout/1200/800',
      alt: 'Brutalist Layout Preview',
      title: 'Layout Preview',
      width: 1200,
      height: 800,
    },
  ],
});

export default mockData;
