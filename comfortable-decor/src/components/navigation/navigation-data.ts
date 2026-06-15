export interface SubmenuData {
  title: string;
  collections: {
    name: string;
    items: string[];
  }[];
  featured: {
    title: string;
    description: string;
    image: string;
    tag: string;
  };
}

export const CATEGORY_DATA: Record<string, SubmenuData> = {
  living: {
    title: 'Living Room',
    collections: [
      {
        name: 'Furniture',
        items: [
          'Sofas & Sectionals',
          'Accent Chairs',
          'Coffee Tables',
          'Console Tables',
          'Bookcases',
        ],
      },
      {
        name: 'Lighting & Accents',
        items: [
          'Table Lamps',
          'Floor Lamps',
          'Pendant Lights',
          'Area Rugs',
          'Decorative Pillows',
        ],
      },
    ],
    featured: {
      title: 'The Bouclé Lounge Chair',
      description:
        'A sculptural form crafted for ultimate repose, upholstered in premium organic wool bouclé.',
      image:
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
      tag: 'Best Seller',
    },
  },
  bedroom: {
    title: 'Bedroom',
    collections: [
      {
        name: 'Beds & Storage',
        items: [
          'Platform Beds',
          'Nightstands',
          'Dressers & Chests',
          'Wardrobes',
          'Bed Benches',
        ],
      },
      {
        name: 'Bedding & Linens',
        items: [
          'Linen Sheets',
          'Duvet Covers',
          'Quilts & Blankets',
          'Pillowcases',
          'Mattress Protectors',
        ],
      },
    ],
    featured: {
      title: 'Washed Belgian Linen',
      description:
        'Pre-washed for heirloom softness and a relaxed, laid-back drape that gets better with time.',
      image:
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
      tag: 'New Arrival',
    },
  },
  dining: {
    title: 'Dining & Kitchen',
    collections: [
      {
        name: 'Dining Furniture',
        items: [
          'Dining Tables',
          'Dining Chairs',
          'Bar & Counter Stools',
          'Sideboards & Buffets',
          'Shelving',
        ],
      },
      {
        name: 'Tableware',
        items: [
          'Ceramic Plates',
          'Stoneware Bowls',
          'Glassware',
          'Flatware Set',
          'Table Linens',
        ],
      },
    ],
    featured: {
      title: 'Solid Oak Dining Table',
      description:
        'Honoring clean lines and robust joinery, designed to anchor family dinners for generations.',
      image:
        'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80',
      tag: 'Artisanal',
    },
  },
  accents: {
    title: 'Decor & Accents',
    collections: [
      {
        name: 'Vases & Objects',
        items: [
          'Ceramic Vases',
          'Decorative Bowls',
          'Sculptural Objects',
          'Candle Holders',
          'Wall Mirrors',
        ],
      },
      {
        name: 'Textiles & Art',
        items: [
          'Organic Throw Rugs',
          'Wall Tapestries',
          'Fine Art Prints',
          'Storage Baskets',
          'Botanicals',
        ],
      },
    ],
    featured: {
      title: 'Hand-Thrown Ceramic Vases',
      description:
        'Individual stoneware vessels created by local potters, showcasing natural clay textures.',
      image:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
      tag: 'Handcrafted',
    },
  },
};
