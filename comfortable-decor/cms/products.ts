import { defineProducts } from '@forgewp/woocommerce';

export const products = defineProducts([
  {
    id: 1,
    slug: "about-a-chair-aa51",
    name: "About A Chair AA51",
    title: "About A Chair AA51",
    price: 276,
    regular_price: 276,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85",
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85",
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating", "Dining"],
    reviews: [
      {
        id: 1,
        author: "Henrik M.",
        rating: 5,
        content: "The moulded shell is surprisingly supple and comfortable for long dining sessions.",
        date: "2026-01-14",
        verified: true,
      },
      {
        id: 2,
        author: "Sofia L.",
        rating: 5,
        content: "Minimalist, sturdy, and the steel legs have a smooth satin powdercoat.",
        date: "2026-01-22",
        verified: true,
      },
      {
        id: 3,
        author: "Oliver K.",
        rating: 5,
        content: "Delivered in pristine condition with white-glove setup.",
        date: "2026-02-03",
        verified: true,
      },
    ],
    badge: "featured",
    shortDescription: "Moulded polypropylene shell with solid oak legs.",
    excerpt: "Moulded polypropylene shell with solid oak legs.",
    description: "The About A Chair collection is the result of a close collaboration with Hee Welling. A gently curved shell paired with solid oak legs offers an organic yet understated silhouette for contemporary dining or studio workspaces.",
    content: "<p>The About A Chair collection is the result of a close collaboration with Hee Welling. A gently curved shell paired with solid oak legs offers an organic yet understated silhouette for contemporary dining or studio workspaces.</p>",
    materials: ["Polypropylene shell", "Solid oak frame"],
    dimensions: { length: 59, width: 52, height: 79, unit: "cm" },
    weight: 6.5,
    care: "Wipe clean with a damp cloth.",
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "white", label: "White", value: "white", color: "#f0ece1" },
          { id: "charcoal", label: "Charcoal", value: "charcoal", color: "#343230" },
          { id: "terracotta", label: "Terracotta", value: "terracotta", color: "#c98a7c" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "white", label: "White", value: "white", color: "#f0ece1", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85" },
          { id: "charcoal", label: "Charcoal", value: "charcoal", color: "#343230", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85" },
          { id: "terracotta", label: "Terracotta", value: "terracotta", color: "#c98a7c", image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=1000&q=85" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    manage_stock: false,
    sku: "CD-AAC-51",
    brand: "Comfortable Decor",
    featured: true,
    isNew: false,
    upsell_ids: [4, 6],
    cross_sell_ids: [3, 7],
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 2,
    slug: "form-barstool-65-steel",
    name: "Form Barstool 65 Steel",
    title: "Form Barstool 65 Steel",
    price: 115,
    regular_price: 285,
    sale_price: 115,
    on_sale: true,
    compareAtPrice: 285,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1503602642458-232111445657?w=1000&q=85",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1503602642458-232111445657?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating", "Bar & Counter"],
    rating: 4.8,
    average_rating: 4.8,
    reviewCount: 29,
    rating_count: 29,
    badge: "sale",
    shortDescription: "Seamless moulded shell on slender powder-coated steel.",
    excerpt: "Seamless moulded shell on slender powder-coated steel.",
    description: "With a mission to create a shell stool with a unified look, Form combines a soft plastic seat with a slender steel base for kitchen islands and bar counters.",
    content: "<p>With a mission to create a shell stool with a unified look, Form combines a soft plastic seat with a slender steel base for kitchen islands and bar counters.</p>",
    materials: ["Polypropylene", "Powder-coated steel"],
    dimensions: { length: 42.5, width: 42.5, height: 77, unit: "cm" },
    weight: 4.8,
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "ochre", label: "Ochre", value: "ochre", color: "#d4af37" },
          { id: "black", label: "Black", value: "black", color: "#1a1816" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "ochre", label: "Ochre", value: "ochre", color: "#d4af37", image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=1000&q=85" },
          { id: "black", label: "Black", value: "black", color: "#1a1816", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    manage_stock: false,
    sku: "CD-FORM-65",
    brand: "Comfortable Decor",
    featured: true,
    isNew: true,
    upsell_ids: [1, 4],
    cross_sell_ids: [3],
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 3,
    slug: "nelson-bubble-pendant",
    name: "Nelson Bubble Pendant",
    title: "Nelson Bubble Pendant",
    price: 590,
    regular_price: 590,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1000&q=85",
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1000&q=85",
    category: "Lighting",
    categorySlug: "lighting",
    categories: ["Lighting", "Pendant Lamps"],
    rating: 5.0,
    average_rating: 5.0,
    reviewCount: 42,
    rating_count: 42,
    badge: "bestseller",
    shortDescription: "Classic spherical polymer webbing over steel wire skeleton.",
    excerpt: "Classic spherical polymer webbing over steel wire skeleton.",
    description: "Designed in 1952, this iconic pendant lamp provides an even, warm luminescence. Its taut plastic skin floats effortlessly overhead.",
    content: "<p>Designed in 1952, this iconic pendant lamp provides an even, warm luminescence. Its taut plastic skin floats effortlessly overhead.</p>",
    materials: ["Polymer webbing", "Steel wire framework"],
    dimensions: { length: 48, width: 48, height: 39, unit: "cm" },
    weight: 2.1,
    attributes: [
      {
        name: "Finish",
        variation: true,
        options: [
          { id: "cream", label: "Warm Cream", value: "cream", color: "#f5efe6" },
          { id: "white", label: "Pure White", value: "white", color: "#ffffff" }
        ]
      }
    ],
    variants: [
      {
        id: "finish",
        name: "Finish",
        options: [
          { id: "cream", label: "Warm Cream", value: "cream", color: "#f5efe6" },
          { id: "white", label: "Pure White", value: "white", color: "#ffffff" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-NEL-01",
    brand: "Comfortable Decor",
    featured: true,
    isNew: true,
    upsell_ids: [5, 7],
    _terms: {
      product_cat: [
        { id: 2, slug: "lighting", name: "Lighting" }
      ]
    }
  },
  {
    id: 4,
    slug: "form-armchair-oak",
    name: "Form Armchair Oak",
    title: "Form Armchair Oak",
    price: 290,
    regular_price: 490,
    sale_price: 290,
    on_sale: true,
    compareAtPrice: 490,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85",
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating", "Dining"],
    rating: 4.7,
    average_rating: 4.7,
    reviewCount: 21,
    rating_count: 21,
    badge: "sale",
    shortDescription: "Ergonomic supportive armrests with solid oak legs.",
    excerpt: "Ergonomic supportive armrests with solid oak legs.",
    description: "Designed with great attention to detail, the Form Armchair incorporates subtle armrests that flow naturally from the shell into the solid oak legs.",
    content: "<p>Designed with great attention to detail, the Form Armchair incorporates subtle armrests that flow naturally from the shell into the solid oak legs.</p>",
    materials: ["Polypropylene shell", "Lacquered oak"],
    dimensions: { length: 56, width: 52, height: 80, unit: "cm" },
    weight: 7.2,
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "terracotta", label: "Deep Terracotta", value: "terracotta", color: "#8b3a3a" },
          { id: "ink", label: "Charcoal Ink", value: "ink", color: "#22201e" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "terracotta", label: "Deep Terracotta", value: "terracotta", color: "#8b3a3a", image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85" },
          { id: "ink", label: "Charcoal Ink", value: "ink", color: "#22201e", image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-FARM-04",
    brand: "Comfortable Decor",
    featured: true,
    upsell_ids: [1, 6],
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 5,
    slug: "rime-pendant-lamp",
    name: "Rime Pendant Lamp",
    title: "Rime Pendant Lamp",
    price: 450,
    regular_price: 590,
    sale_price: 450,
    on_sale: true,
    compareAtPrice: 590,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&q=85",
      "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&q=85",
    category: "Lighting",
    categorySlug: "lighting",
    categories: ["Lighting", "Pendant Lamps"],
    rating: 4.9,
    average_rating: 4.9,
    reviewCount: 16,
    rating_count: 16,
    badge: "sale",
    shortDescription: "Semi-transparent mouth-blown frosted glass sphere.",
    excerpt: "Semi-transparent mouth-blown frosted glass sphere.",
    description: "Inspired by the shape of acorns, the Rime Pendant Lamp brings an elegant perspective to glass lighting with its sandblasted matte finish.",
    content: "<p>Inspired by the shape of acorns, the Rime Pendant Lamp brings an elegant perspective to glass lighting with its sandblasted matte finish.</p>",
    materials: ["Mouth-blown glass", "Powder-coated aluminium"],
    dimensions: { length: 37, width: 37, height: 45.5, unit: "cm" },
    weight: 3.4,
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "white", label: "Opal White", value: "white", color: "#fafafa" },
          { id: "grey", label: "Smoke Grey", value: "grey", color: "#9e9992" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "white", label: "Opal White", value: "white", color: "#fafafa" },
          { id: "grey", label: "Smoke Grey", value: "grey", color: "#9e9992" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-RIME-05",
    brand: "Comfortable Decor",
    featured: true,
    upsell_ids: [3, 7],
    _terms: {
      product_cat: [
        { id: 2, slug: "lighting", name: "Lighting" }
      ]
    }
  },
  {
    id: 6,
    slug: "form-chair-steel",
    name: "Form Chair Steel",
    title: "Form Chair Steel",
    price: 290,
    regular_price: 290,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=1000&q=85",
      "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating", "Dining"],
    rating: 4.8,
    average_rating: 4.8,
    reviewCount: 34,
    rating_count: 34,
    shortDescription: "Minimalist tubular steel frame with matte moulded seat.",
    excerpt: "Minimalist tubular steel frame with matte moulded seat.",
    description: "A light and flexible dining chair that balances industrial strength with a warm tactile touch.",
    content: "<p>A light and flexible dining chair that balances industrial strength with a warm tactile touch.</p>",
    materials: ["Steel tube", "Polypropylene"],
    dimensions: { length: 48, width: 52, height: 80, unit: "cm" },
    weight: 5.4,
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "black", label: "Black", value: "black", color: "#2b2927" },
          { id: "sage", label: "Sage Green", value: "sage", color: "#8b9b82" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "black", label: "Black", value: "black", color: "#2b2927" },
          { id: "sage", label: "Sage Green", value: "sage", color: "#8b9b82" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-FCS-06",
    brand: "Comfortable Decor",
    featured: true,
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 7,
    slug: "grain-pendant-lamp",
    name: "Grain Pendant Lamp",
    title: "Grain Pendant Lamp",
    price: 199,
    regular_price: 199,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=1000&q=85",
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?w=1000&q=85",
    category: "Lighting",
    categorySlug: "lighting",
    categories: ["Lighting", "Pendant Lamps", "Eco-Friendly"],
    rating: 4.6,
    average_rating: 4.6,
    reviewCount: 27,
    rating_count: 27,
    shortDescription: "Composite material with natural bamboo grain fibers.",
    excerpt: "Composite material with natural bamboo grain fibers.",
    description: "The Grain Pendant Lamp brings a new perspective to the pendant lamp category through its innovative composite of bamboo fibers and polypropylene.",
    content: "<p>The Grain Pendant Lamp brings a new perspective to the pendant lamp category through its innovative composite of bamboo fibers and polypropylene.</p>",
    materials: ["Bamboo composite", "Rubber cord"],
    dimensions: { length: 21, width: 21, height: 18.5, unit: "cm" },
    weight: 1.6,
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "nature", label: "Nature", value: "nature", color: "#a68058" },
          { id: "dusty-green", label: "Dusty Green", value: "dusty-green", color: "#7a8c78" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "nature", label: "Nature", value: "nature", color: "#a68058" },
          { id: "dusty-green", label: "Dusty Green", value: "dusty-green", color: "#7a8c78" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-GRAIN-07",
    brand: "Comfortable Decor",
    featured: true,
    _terms: {
      product_cat: [
        { id: 2, slug: "lighting", name: "Lighting" },
        { id: 7, slug: "eco-friendly", name: "Eco-Friendly" }
      ]
    }
  },
  {
    id: 8,
    slug: "layout-chair-a132",
    name: "Layout Chair A132",
    title: "Layout Chair A132",
    price: 276,
    regular_price: 276,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=1000&q=85",
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating"],
    rating: 4.9,
    average_rating: 4.9,
    reviewCount: 19,
    rating_count: 19,
    badge: "new",
    shortDescription: "Scandinavian beech frame with tailored linen-wrapped cushion.",
    excerpt: "Scandinavian beech frame with tailored linen-wrapped cushion.",
    description: "A refined, quiet chair designed for flexible living. Perfect as an accent bedroom chair or grouped around a low coffee table.",
    content: "<p>A refined, quiet chair designed for flexible living. Perfect as an accent bedroom chair or grouped around a low coffee table.</p>",
    materials: ["Beech wood", "Linen upholstery"],
    dimensions: { length: 54, width: 58, height: 76, unit: "cm" },
    weight: 6.8,
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "linen", label: "Natural Linen", value: "linen", color: "#e8e0d5" },
          { id: "charcoal", label: "Charcoal", value: "charcoal", color: "#33312e" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "linen", label: "Natural Linen", value: "linen", color: "#e8e0d5" },
          { id: "charcoal", label: "Charcoal", value: "charcoal", color: "#33312e" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-LAY-08",
    brand: "Comfortable Decor",
    featured: true,
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 9,
    slug: "linen-lounge-sofa",
    name: "Linen Lounge Sofa",
    title: "Linen Lounge Sofa",
    price: 1890,
    regular_price: 2290,
    sale_price: 1890,
    on_sale: true,
    compareAtPrice: 2290,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&q=85",
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating", "Living Room"],
    rating: 4.9,
    average_rating: 4.9,
    reviewCount: 45,
    rating_count: 45,
    badge: "sale",
    shortDescription: "Deep seat comfort in washed Belgian linen with solid oak legs.",
    excerpt: "Deep seat comfort in washed Belgian linen with solid oak legs.",
    description: "A generous three-seater designed for everyday living. Soft washed linen upholstery, resilient foam cushions, and solid oak legs create a piece that feels both refined and inviting.",
    content: "<p>A generous three-seater designed for everyday living. Soft washed linen upholstery, resilient foam cushions, and solid oak legs create a piece that feels both refined and inviting.</p>",
    materials: ["Belgian linen", "Solid oak", "Feather down cushions"],
    dimensions: { length: 220, width: 95, height: 82, unit: "cm" },
    weight: 58.0,
    care: "Professional clean recommended. Removable cushion covers.",
    attributes: [
      {
        name: "Color",
        variation: true,
        options: [
          { id: "forest", label: "Forest Velvet", value: "forest", color: "#314436" },
          { id: "sand", label: "Warm Sand", value: "sand", color: "#e0d8cc" }
        ]
      }
    ],
    variants: [
      {
        id: "color",
        name: "Color",
        options: [
          { id: "forest", label: "Forest Velvet", value: "forest", color: "#314436" },
          { id: "sand", label: "Warm Sand", value: "sand", color: "#e0d8cc" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-SOFA-09",
    brand: "Comfortable Decor",
    featured: true,
    upsell_ids: [11, 10],
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 10,
    slug: "sculptural-oak-armchair",
    name: "Sculptural Oak Armchair",
    title: "Sculptural Oak Armchair",
    price: 640,
    regular_price: 640,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85",
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Seating"],
    rating: 4.9,
    average_rating: 4.9,
    reviewCount: 31,
    rating_count: 31,
    badge: "bestseller",
    shortDescription: "Hand-finished solid white oak with organic curved backrest.",
    excerpt: "Hand-finished solid white oak with organic curved backrest.",
    description: "Curved solid oak with a wool-blend padded seat. A sculptural accent that brings architectural presence to any living area.",
    content: "<p>Curved solid oak with a wool-blend padded seat. A sculptural accent that brings architectural presence to any living area.</p>",
    materials: ["Solid white oak", "Virgin wool blend"],
    dimensions: { length: 72, width: 78, height: 80, unit: "cm" },
    weight: 14.5,
    attributes: [
      {
        name: "Wood Finish",
        variation: true,
        options: [
          { id: "natural-oak", label: "Natural Oak", value: "natural-oak", color: "#cfb584" },
          { id: "smoked-oak", label: "Smoked Oak", value: "smoked-oak", color: "#4a3c2c" }
        ]
      }
    ],
    variants: [
      {
        id: "wood",
        name: "Wood Finish",
        options: [
          { id: "natural-oak", label: "Natural Oak", value: "natural-oak", color: "#cfb584" },
          { id: "smoked-oak", label: "Smoked Oak", value: "smoked-oak", color: "#4a3c2c" }
        ]
      }
    ],
    inStock: true,
    stock_status: "instock",
    sku: "CD-OAK-10",
    brand: "Comfortable Decor",
    featured: true,
    upsell_ids: [9, 11],
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" },
        { id: 3, slug: "seating", name: "Seating" }
      ]
    }
  },
  {
    id: 11,
    slug: "travertine-minimalist-table",
    name: "Travertine Minimalist Table",
    title: "Travertine Minimalist Table",
    price: 840,
    regular_price: 840,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=1000&q=85",
      "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=1000&q=85",
    category: "Furniture",
    categorySlug: "furniture",
    categories: ["Furniture", "Tables", "Living Room"],
    rating: 4.8,
    average_rating: 4.8,
    reviewCount: 14,
    rating_count: 14,
    badge: "featured",
    shortDescription: "Honed Italian travertine stone with monolithic slab legs.",
    excerpt: "Honed Italian travertine stone with monolithic slab legs.",
    description: "A low, monolithic coffee table crafted from solid Italian travertine. The natural porous texture is hand-filled and honed to a soft silky finish.",
    content: "<p>A low, monolithic coffee table crafted from solid Italian travertine. The natural porous texture is hand-filled and honed to a soft silky finish.</p>",
    materials: ["Italian travertine stone"],
    dimensions: { length: 110, width: 60, height: 35, unit: "cm" },
    weight: 42.0,
    inStock: true,
    stock_status: "instock",
    sku: "CD-TRAV-11",
    brand: "Comfortable Decor",
    featured: true,
    upsell_ids: [9, 12],
    _terms: {
      product_cat: [
        { id: 1, slug: "furniture", name: "Furniture" }
      ]
    }
  },
  {
    id: 12,
    slug: "fluted-glass-sideboard",
    name: "Fluted Glass Sideboard",
    title: "Fluted Glass Sideboard",
    price: 1450,
    regular_price: 1450,
    currency: "USD",
    images: [
      "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1000&q=85",
      "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1000&q=85"
    ],
    featuredImage: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1000&q=85",
    category: "Storage",
    categorySlug: "storage",
    categories: ["Storage", "Furniture"],
    rating: 4.9,
    average_rating: 4.9,
    reviewCount: 23,
    rating_count: 23,
    badge: "new",
    shortDescription: "Solid oak frame with reeded glass sliding doors.",
    excerpt: "Solid oak frame with reeded glass sliding doors.",
    description: "Reeded glass panels gently obscure the contents while allowing ambient light to pass through. Solid oak cabinetry with internal brass hardware.",
    content: "<p>Reeded glass panels gently obscure the contents while allowing ambient light to pass through. Solid oak cabinetry with internal brass hardware.</p>",
    materials: ["Solid oak", "Fluted reeded glass", "Solid brass"],
    dimensions: { length: 160, width: 45, height: 75, unit: "cm" },
    weight: 38.0,
    inStock: true,
    stock_status: "instock",
    sku: "CD-SIDE-12",
    brand: "Comfortable Decor",
    featured: true,
    upsell_ids: [11, 1],
    _terms: {
      product_cat: [
        { id: 5, slug: "storage", name: "Storage" },
        { id: 1, slug: "furniture", name: "Furniture" }
      ]
    }
  }
]);

export const categoriesTaxonomy = [
  {
    id: 1,
    slug: "furniture",
    name: "Furniture",
    description: "From lounge seating to handcrafted dining tables, pieces designed to anchor your living space with a timeless sense of calm.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=85",
    productCount: 12
  },
  {
    id: 2,
    slug: "lighting",
    name: "Lighting",
    description: "Discover a collection of pendants and lamps crafted to transform the mood and character of every room in your home.",
    image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=1200&q=85",
    productCount: 8
  },
  {
    id: 3,
    slug: "seating",
    name: "Seating",
    description: "Ergonomic armchairs, dining chairs, and sculptural stools designed for comfort and crafted to last.",
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=85",
    productCount: 9
  },
  {
    id: 4,
    slug: "outdoor",
    name: "Outdoor",
    description: "With a vivid palette and climate-proof finishes, our collection anchors your exterior spaces in refined Nordic comfort.",
    image: "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200&q=85",
    productCount: 6
  },
  {
    id: 5,
    slug: "storage",
    name: "Storage",
    description: "Exploring the essential elements with a series of wood-crafted systems that prioritize clean lines and structural clarity.",
    image: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=1200&q=85",
    productCount: 5
  },
  {
    id: 6,
    slug: "decor",
    name: "Decor",
    description: "Accent pieces, ceramic vessels, and tactile objects that complete a considered interior narrative.",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85",
    productCount: 7
  },
  {
    id: 7,
    slug: "eco-friendly",
    name: "Eco-Friendly",
    description: "Responsibly sourced materials and low-impact finishes for a lighter footprint at home.",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85",
    productCount: 6
  }
];

export const _taxonomy_product_cat = categoriesTaxonomy;

export default products;
