import { defineWpPosts } from '@forgewp/react';

export const mockData = defineWpPosts({
  "post": [
    {
      "id": 1,
      "title": "Welcome to ForgeWP: The Headless Revolution",
      "excerpt": "Discover how ForgeWP bridges standard WordPress themes with blistering fast React architectures.",
      "content": "<p>This is the first mock post. In local dev, you can modify <code>cms/mock-data.json</code> to test layout content changes.</p>",
      "date": "2026-05-10T09:00:00Z",
      "author": "Antigravity",
      "featuredImage": {
        "id": 101,
        "url": "https://picsum.photos/seed/forgewp/1200/630",
        "alt": "ForgeWP Logo and Brand Artwork",
        "title": "ForgeWP Logo",
        "caption": "A high-fidelity minimalist logo graphic.",
        "width": 1200,
        "height": 630,
        "sizes": {
          "thumbnail": {
            "url": "https://picsum.photos/seed/forgewp/150/150",
            "width": 150,
            "height": 150
          },
          "medium": {
            "url": "https://picsum.photos/seed/forgewp/300/300",
            "width": 300,
            "height": 300
          },
          "large": {
            "url": "https://picsum.photos/seed/forgewp/1024/768",
            "width": 1024,
            "height": 768
          }
        }
      },
      "customFields": {
        "read_time": "5"
      },
      "_terms": {
        "category": [
          {
            "id": 1,
            "slug": "tutorials",
            "name": "Tutorials"
          },
          {
            "id": 2,
            "slug": "framework",
            "name": "Framework"
          }
        ],
        "post_tag": [
          {
            "id": 10,
            "slug": "react",
            "name": "React"
          },
          {
            "id": 11,
            "slug": "wordpress",
            "name": "WordPress"
          }
        ]
      }
    },
    {
      "id": 2,
      "title": "Unlocking Brutalist Web Design Aesthetics",
      "excerpt": "A deep dive into high-contrast grids, sharp corners, and premium flat shadows in modern interfaces.",
      "content": "<p>This is the second mock post. Style these grids using beautiful Tailwind utilities.</p>",
      "date": "2026-05-12T14:30:00Z",
      "author": "DeepMind Partner",
      "featuredImage": "https://picsum.photos/seed/brutalist/1200/630",
      "customFields": {
        "read_time": "8"
      },
      "_terms": {
        "category": [
          {
            "id": 3,
            "slug": "design",
            "name": "Design"
          },
          {
            "id": 4,
            "slug": "css",
            "name": "CSS"
          }
        ],
        "post_tag": [
          {
            "id": 12,
            "slug": "brutalism",
            "name": "Brutalism"
          },
          {
            "id": 13,
            "slug": "tailwind",
            "name": "Tailwind"
          }
        ]
      }
    }
  ],
  "project": [
    {
      "id": 1,
      "title": "ForgeWP Scaffolding Platform",
      "excerpt": "Building a custom compiler framework to transpile React elements into standard PHP themes.",
      "content": "<p>Detailed description of the ForgeWP compiler pipeline project.</p>",
      "date": "2026-05-15T12:00:00Z",
      "author": "Lead Architect",
      "featuredImage": "https://picsum.photos/seed/platform/1200/630",
      "customFields": {
        "client_name": "El Dorado",
        "project_budget": "45000",
        "status": "active"
      },
      "_terms": {
        "project_type": [
          {
            "id": 20,
            "slug": "open-source",
            "name": "Open Source"
          }
        ],
        "technology": [
          {
            "id": 30,
            "slug": "react",
            "name": "React"
          }
        ]
      }
    },
    {
      "id": 2,
      "title": "Brutalist Starter Theme",
      "excerpt": "A clean, responsive, and robust high-contrast interface leveraging Tailwind CSS v4.",
      "content": "<p>A brutalist theme showcasing raw black borders and vivid accent colors.</p>",
      "date": "2026-05-16T16:00:00Z",
      "author": "Theme Engineer",
      "featuredImage": "https://picsum.photos/seed/starter/1200/630",
      "customFields": {
        "client_name": "ForgeWP Community",
        "project_budget": "0",
        "status": "completed"
      },
      "_terms": {
        "project_type": [
          {
            "id": 20,
            "slug": "open-source",
            "name": "Open Source"
          }
        ],
        "technology": [
          {
            "id": 32,
            "slug": "tailwind",
            "name": "Tailwind CSS"
          }
        ]
      }
    }
  ],
  "attachment": [
    {
      "id": 101,
      "url": "https://picsum.photos/seed/forgewp/1200/630",
      "alt": "ForgeWP Logo and Brand Artwork",
      "title": "ForgeWP Logo",
      "caption": "A high-fidelity minimalist logo graphic.",
      "width": 1200,
      "height": 630,
      "sizes": {
        "thumbnail": {
          "url": "https://picsum.photos/seed/forgewp/150/150",
          "width": 150,
          "height": 150
        },
        "medium": {
          "url": "https://picsum.photos/seed/forgewp/300/300",
          "width": 300,
          "height": 300
        },
        "large": {
          "url": "https://picsum.photos/seed/forgewp/1024/768",
          "width": 1024,
          "height": 768
        }
      }
    },
    {
      "id": 102,
      "url": "https://picsum.photos/seed/layout/1200/800",
      "alt": "Brutalist Layout Preview",
      "title": "Layout Preview",
      "width": 1200,
      "height": 800,
      "sizes": {
        "thumbnail": {
          "url": "https://picsum.photos/seed/layout/150/150",
          "width": 150,
          "height": 150
        },
        "medium": {
          "url": "https://picsum.photos/seed/layout/300/300",
          "width": 300,
          "height": 300
        }
      }
    }
  ]
});

export default mockData;
