import { defineWpPosts } from '@forgewp/react';

export const mockData = defineWpPosts({
  portfolio: [
      {
          "id": 1,
          "title": "Sample Portfolio Item 1",
          "excerpt": "This is a custom portfolio post seeded dynamically via ForgeWP CLI.",
          "content": "<p>Welcome to your new custom <strong>portfolio</strong> post template! Edit this in cms/mock-data.ts.</p>",
          "date": "August 23, 2026",
          "author": "ForgeWP CLI",
          "featuredImage": "https://picsum.photos/seed/portfolio1/1200/630",
          "customFields": {
              "client": "[Seeded client 1]",
              "budget": "[Seeded budget 1]"
          }
      },
      {
          "id": 2,
          "title": "Sample Portfolio Item 2",
          "excerpt": "This is another custom portfolio post seeded dynamically via ForgeWP CLI.",
          "content": "<p>This is the second custom post for the portfolio post type.</p>",
          "date": "August 23, 2026",
          "author": "ForgeWP CLI",
          "featuredImage": "https://picsum.photos/seed/portfolio2/1200/630",
          "customFields": {
              "client": "[Seeded client 2]",
              "budget": "[Seeded budget 2]"
          }
      }
  ],

  post: [
    {
      id: 1,
      slug: "the-art-of-less-minimalist-interiors",
      title: "The Art of Less: Finding Beauty in Minimalist Interiors",
      excerpt: "Discover the core principles behind calm, considered interiors — and how restraint creates room for daily life.",
      content: "<p>Minimalism in the home is not emptiness. It is intentional selection: fewer objects, better materials, clearer light.</p><p>Start with circulation. Leave paths open so rooms feel larger than their footprint. Choose a restrained palette of warm neutrals and let texture — linen, oak, stone — carry visual interest.</p><p>Edit seasonally. Store what you do not need now. What remains should earn its place every day.</p>",
      date: "2026-05-11T09:00:00Z",
      author: "Comfortable Decor",
      featuredImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80",
      category: "Interior Design",
      categorySlug: "interior-design",
      readTime: "4 min read",
      featured: true,
      _terms: {
        category: [{ id: 1, slug: "interior-design", name: "Interior Design" }]
      }
    },
    {
      id: 2,
      slug: "blueprint-for-tomorrow-sustainable-materials",
      title: "A Blueprint for Tomorrow: Sustainable Materials Beyond the Basics",
      excerpt: "From reclaimed timber to organic textiles — how material choices shape both atmosphere and footprint.",
      content: "<p>Sustainability is more than a label. It is longevity, repairability, and honesty about supply chains.</p><p>We prioritise materials that age well: solid wood with oil finishes, natural fibres, ceramics without heavy coatings. When something lasts decades, its true cost of ownership falls.</p><p>Look for certifications where they matter, but also ask simpler questions: Can this be refinished? Can it be recycled? Does it need frequent replacement?</p>",
      date: "2026-05-05T14:30:00Z",
      author: "Comfortable Decor",
      featuredImage: "https://images.unsplash.com/photo-1615529328331-f8917597711f?w=1200&q=80",
      category: "Sustainability",
      categorySlug: "sustainability",
      readTime: "5 min read",
      _terms: {
        category: [{ id: 2, slug: "sustainability", name: "Sustainability" }]
      }
    },
    {
      id: 3,
      slug: "light-and-shadow-shape-the-home",
      title: "The Unseen Force: How Light and Shadow Shape the Home",
      excerpt: "A practical guide to layering ambient, task, and accent light for rooms that feel soft after dusk.",
      content: "<p>Architecture teaches us that light is a material. In the home, that means planning for morning glare, afternoon gold, and evening calm.</p><p>Layer three sources: ambient (overhead or reflected), task (reading, kitchen), and accent (art, texture). Dim where possible. Warm colour temperatures (2700–3000K) flatter natural materials.</p><p>Pendants and floor lamps do more than illuminate — they draw the eye and define zones in open plans.</p>",
      date: "2026-05-05T16:00:00Z",
      author: "Comfortable Decor",
      featuredImage: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200&q=80",
      category: "Lighting",
      categorySlug: "lighting",
      readTime: "4 min read",
      _terms: {
        category: [{ id: 3, slug: "lighting", name: "Lighting" }]
      }
    },
    {
      id: 4,
      slug: "from-humble-abode-to-iconic-spaces",
      title: "From Humble Abode to Iconic Spaces: The Evolution of Home Design",
      excerpt: "How domestic design moved from pure function to emotional atmosphere — and what that means for how we shop today.",
      content: "<p>Homes once prioritised durability and status. Today, many of us seek spaces that restore attention and support ritual: cooking, gathering, resting.</p><p>That shift rewards furniture with honest construction and flexible use. A console that works in the hall today may become a desk tomorrow. Pieces should adapt as life does.</p><p>Iconic design is not trend-chasing. It is clarity of form that still feels relevant years later.</p>",
      date: "2026-05-05T18:00:00Z",
      author: "Comfortable Decor",
      featuredImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80",
      category: "Editorial",
      categorySlug: "editorial",
      readTime: "6 min read",
      _terms: {
        category: [{ id: 4, slug: "editorial", name: "Editorial" }]
      }
    }
  ],
  review: [
    {
      id: 1,
      productId: 1,
      author: "Regina Sagana",
      location: "US",
      date: "2025-01-20",
      rating: 5,
      title: "Anchors the room",
      body: "The simple, elegant design is an absolute masterpiece — it anchors the room perfectly. Exceptional craftsmanship and a truly curated shopping experience.",
      source: "Trustpilot"
    },
    {
      id: 2,
      productId: 2,
      author: "Marcus Chen",
      location: "CA",
      date: "2025-02-04",
      rating: 5,
      title: "Quiet luxury",
      body: "Exactly the calm, considered piece we needed. Materials feel substantial and the finish is beautiful in natural light.",
      source: "Trustpilot"
    },
    {
      id: 3,
      productId: 3,
      author: "Elena Vogt",
      location: "DE",
      date: "2025-03-12",
      rating: 5,
      title: "Warm, sculptural light",
      body: "Transforms our living room in the evening. Packaging was careful and delivery was on time.",
      source: "Trustpilot"
    },
    {
      id: 4,
      productId: 4,
      author: "Colin Lucido",
      location: "UK",
      date: "2025-01-08",
      rating: 5,
      title: "Best practices",
      body: "Perfectly blending modern aesthetics with warmth and comfort. The attention to detail is remarkable.",
      source: "Trustpilot"
    },
    {
      id: 5,
      productId: 5,
      author: "Charlotte Weber",
      location: "NL",
      date: "2025-02-18",
      rating: 5,
      title: "Unique concept",
      body: "They listen to how you live and turn it into a cohesive, stunning reality — beautiful and incredibly livable.",
      source: "Trustpilot"
    },
    {
      id: 6,
      productId: 12,
      author: "James Porter",
      location: "US",
      date: "2025-04-02",
      rating: 4,
      title: "Solid dining set addition",
      body: "Great balance of form and comfort. We ordered four — consistent finish across the set.",
      source: "Site"
    }
  ],
  project: [
    {
      id: 1,
      title: "ForgeWP Scaffolding Platform",
      excerpt: "Building a custom compiler framework to transpile React elements into standard PHP themes.",
      content: "<p>Detailed description of the ForgeWP compiler pipeline project.</p>",
      date: "2026-05-15T12:00:00Z",
      author: "Lead Architect",
      featuredImage: "https://picsum.photos/seed/platform/1200/630",
      customFields: {
        client_name: "El Dorado",
        project_budget: "45000",
        status: "active"
      },
      _terms: {
        project_type: [{ id: 20, slug: "open-source", name: "Open Source" }],
        technology: [{ id: 30, slug: "react", name: "React" }]
      }
    },
    {
      id: 2,
      title: "Brutalist Starter Theme",
      excerpt: "A clean, responsive, and robust high-contrast interface leveraging Tailwind CSS v4.",
      content: "<p>A brutalist theme showcasing raw black borders and vivid accent colors.</p>",
      date: "2026-05-16T16:00:00Z",
      author: "Theme Engineer",
      featuredImage: "https://picsum.photos/seed/starter/1200/630",
      customFields: {
        client_name: "ForgeWP Community",
        project_budget: "0",
        status: "completed"
      },
      _terms: {
        project_type: [{ id: 20, slug: "open-source", name: "Open Source" }],
        technology: [{ id: 32, slug: "tailwind", name: "Tailwind CSS" }]
      }
    }
  ]
});

export default mockData;
