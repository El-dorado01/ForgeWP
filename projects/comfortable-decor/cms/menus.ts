import { defineWpMenus } from '@forgewp/react';

export const menus = defineWpMenus({
  primary: [
    {
      title: "Furniture",
      url: "/category/furniture",
      badge: "2026 ARCHIVE",
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=85",
      description: "Hand-shaped solid oak with Italian wool bouclé upholstery.",
      attrTitle: "Explore Collection",
      children: [
        {
          title: "Seating & Lounging",
          url: "/category/furniture?sub=lounge-chairs",
          children: [
            { title: "Lounge Chairs", url: "/category/furniture?sub=lounge-chairs", badge: "Popular" },
            { title: "Modular Sofas", url: "/category/furniture?sub=sofas" },
            { title: "Dining Chairs", url: "/category/furniture?sub=dining-chairs" },
            { title: "Benches & Ottomans", url: "/category/furniture?sub=benches" },
            { title: "Accent Armchairs", url: "/category/furniture?sub=armchairs" }
          ]
        },
        {
          title: "Tables & Desks",
          url: "/category/furniture?sub=tables",
          children: [
            { title: "Dining Tables", url: "/category/furniture?sub=dining-tables" },
            { title: "Coffee Tables", url: "/category/furniture?sub=coffee-tables" },
            { title: "Side & End Tables", url: "/category/furniture?sub=side-tables" },
            { title: "Work Desks", url: "/category/furniture?sub=desks" },
            { title: "Console Tables", url: "/category/furniture?sub=consoles" }
          ]
        },
        {
          title: "Storage & Shelving",
          url: "/category/storage",
          children: [
            { title: "Sideboards & Credenzas", url: "/category/storage?sub=sideboards" },
            { title: "Modular Bookcases", url: "/category/storage?sub=bookcases" },
            { title: "Shelving Systems", url: "/category/storage?sub=shelving" },
            { title: "Nightstands", url: "/category/storage?sub=nightstands" },
            { title: "Wardrobes & Cabinets", url: "/category/storage?sub=cabinets" }
          ]
        }
      ]
    },
    {
      title: "Lighting",
      url: "/category/lighting",
      badge: "BESTSELLER",
      image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=85",
      description: "Warm translucent stone with solid brushed brass fixture.",
      attrTitle: "View Fixtures",
      children: [
        {
          title: "Ceiling & Pendants",
          url: "/category/lighting?sub=pendants",
          children: [
            { title: "Architectural Pendants", url: "/category/lighting?sub=pendants", badge: "New" },
            { title: "Chandeliers", url: "/category/lighting?sub=chandeliers" },
            { title: "Flush Mount Lights", url: "/category/lighting?sub=flush-mount" },
            { title: "Linear Suspension", url: "/category/lighting?sub=linear" }
          ]
        },
        {
          title: "Floor & Table",
          url: "/category/lighting?sub=table-lamps",
          children: [
            { title: "Sculptural Floor Lamps", url: "/category/lighting?sub=floor-lamps" },
            { title: "Ceramic Table Lamps", url: "/category/lighting?sub=table-lamps" },
            { title: "Desk & Task Lights", url: "/category/lighting?sub=desk-lamps" },
            { title: "Portable & Dimmable", url: "/category/lighting?sub=portable", badge: "Trending" }
          ]
        },
        {
          title: "Wall & Accent",
          url: "/category/lighting?sub=sconces",
          children: [
            { title: "Wall Sconces", url: "/category/lighting?sub=sconces" },
            { title: "Art & Picture Lights", url: "/category/lighting?sub=picture-lights" },
            { title: "Ambient Uplighters", url: "/category/lighting?sub=uplighters" },
            { title: "Bathroom Vanity Lights", url: "/category/lighting?sub=vanity" }
          ]
        }
      ]
    },
    {
      title: "Decor & Eco",
      url: "/category/decor",
      badge: "MINERAL CRAFT",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=85",
      description: "Carved from Roman stone quarries with natural matte finish.",
      attrTitle: "Shop Objects",
      children: [
        {
          title: "Home Objects",
          url: "/category/decor?sub=vases",
          children: [
            { title: "Ceramic & Stoneware Vases", url: "/category/decor?sub=vases" },
            { title: "Sculptural Vessels", url: "/category/decor?sub=sculptures" },
            { title: "Marble Bowls & Trays", url: "/category/decor?sub=bowls", badge: "New" },
            { title: "Acoustic Wall Panels", url: "/category/decor?sub=panels" },
            { title: "Architectural Mirrors", url: "/category/decor?sub=mirrors" }
          ]
        },
        {
          title: "Rugs & Textiles",
          url: "/category/decor?sub=rugs",
          children: [
            { title: "Hand-Knotted Wool Rugs", url: "/category/decor?sub=rugs", badge: "Top Rated" },
            { title: "Belgian Linen Throws", url: "/category/decor?sub=throws" },
            { title: "Textured Cushions", url: "/category/decor?sub=cushions" },
            { title: "Raw Jute Runners", url: "/category/decor?sub=runners" },
            { title: "Organic Cotton Bedding", url: "/category/decor?sub=bedding" }
          ]
        },
        {
          title: "Eco & Circular",
          url: "/category/eco-friendly",
          children: [
            { title: "Reclaimed Wood Pieces", url: "/category/eco-friendly?sub=reclaimed" },
            { title: "Bamboo Fiber Series", url: "/category/eco-friendly?sub=bamboo" },
            { title: "Recycled Glassware", url: "/category/eco-friendly?sub=glassware", badge: "Zero Waste" },
            { title: "Natural Plant Wax Candles", url: "/category/eco-friendly?sub=candles" },
            { title: "Biodegradable Planters", url: "/category/eco-friendly?sub=planters" }
          ]
        }
      ]
    },
    {
      title: "Storage",
      url: "/category/storage"
    },
    {
      title: "Journal",
      url: "/blog"
    },
    {
      title: "Studio",
      url: "/about"
    }
  ],
  utility: [
    { title: "Shop", url: "/shop" },
    { title: "Studio", url: "/studio" },
    { title: "Journal", url: "/blog" },
    { title: "About", url: "/about" }
  ],
  footer_col_1: [
    { title: "About Us", url: "/about" },
    { title: "Sustainability", url: "/sustainability" },
    { title: "Design Philosophy", url: "/philosophy" },
    { title: "Press & Media", url: "/press" },
    { title: "Careers", url: "/careers" }
  ],
  footer_col_2: [
    { title: "Track Your Order", url: "/track-order" },
    { title: "Shipping & Delivery", url: "/shipping" },
    { title: "Returns & Exchanges", url: "/returns" },
    { title: "Care Instructions", url: "/care" },
    { title: "Warranty", url: "/warranty" }
  ],
  footer_col_3: [
    { title: "Trade Programme", url: "/trade" },
    { title: "Custom Orders", url: "/custom" },
    { title: "Store Locator", url: "/stores" },
    { title: "Contact Us", url: "/contact" }
  ],
  footer_bottom: [
    { title: "Privacy Policy", url: "/privacy" },
    { title: "Terms of Service", url: "/terms" },
    { title: "Cookie Settings", url: "#cookies" },
    { title: "Accessibility", url: "/accessibility" }
  ]
});

export default menus;
