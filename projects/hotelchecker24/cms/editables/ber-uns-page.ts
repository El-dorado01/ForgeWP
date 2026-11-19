/**
 * About page (BerUns) — single editable contract.
 *
 * Source of truth for:
 *  - ACF field group (page-ber-uns-page.php)
 *  - useWpMeta defaults on BerUnsPage
 *  - optional prop fallbacks on About* UI components
 *
 * Section components do NOT define their own schemas; they receive props.
 */
import {
  defineEditable,
  getEditableDefaults,
  text,
  richText,
  image,
  repeater,
} from '@forgewp/react';

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Seit 2019 — Das unabhängige Luxushotel-Magazin',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Wir kuratieren Ihr Reiseerlebnis',
  }),
  hero_subtitle: richText({
    label: 'Hero Subtitle',
    default:
      'Hotelchecker24 ist Österreichs führendes unabhängiges Magazin für Luxus- und Boutique-Hotels. Unser Redaktionsteam bereist die Welt, bewertet Hotels nach strengen Kriterien und teilt ehrliche, fundierte Empfehlungen.',
  }),
  hero_image_1: image({
    label: 'Hero Image 1 (Back)',
    default: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=500&q=80',
  }),
  hero_image_2: image({
    label: 'Hero Image 2 (Front)',
    default: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
  }),
  hero_primary_label: text({ label: 'Hero Primary Button', default: 'Hotels entdecken' }),
  hero_secondary_label: text({ label: 'Hero Secondary Button', default: 'Kontakt aufnehmen' }),

  stats: repeater({
    label: 'Stats',
    mode: 'fixed',
    fields: {
      value: text({ label: 'Value' }),
      label: text({ label: 'Label' }),
    },
    default: [
      { value: '500+', label: 'Hotels bewertet' },
      { value: '40', label: 'Länder' },
      { value: '80k', label: 'Leser / Monat' },
      { value: '6', label: 'Jahre Erfahrung' },
    ],
  }),

  mission_badge: text({ label: 'Mission Badge', default: 'Unsere Mission' }),
  mission_title: text({
    label: 'Mission Title',
    default: 'Ehrliche Empfehlungen.\nKeine Kompromisse.',
  }),
  mission_content: richText({
    label: 'Mission Content',
    default:
      '<p>Hotelchecker24 wurde 2019 in Wien gegründet, mit einem einfachen Versprechen: Hotels so zu bewerten, wie es eine gute Freundin mit Insider-Wissen tun würde — offen, ehrlich und ohne Werbeauftrag.</p><p>Wir lehnen bezahlte Platzierungen und gesponserte Inhalte konsequent ab. Jedes Hotel, das wir empfehlen, hat unsere Redakteure persönlich überzeugt. Dafür nehmen wir uns die Zeit, die andere nicht aufwenden.</p><p>Das Ergebnis: Eine kuratierte Auswahl an Unterkünften, der Sie vertrauen können — ob Stadtreise, Alpenerholung oder fernöstliches Abenteuer.</p>',
  }),
  mission_cta_label: text({ label: 'Mission CTA Label', default: 'Unsere Berichte lesen' }),

  values: repeater({
    label: 'Values',
    mode: 'fixed',
    fields: {
      icon: text({ label: 'Icon (award, shield, globe, users, …)' }),
      title: text({ label: 'Title' }),
      description: text({ label: 'Description' }),
      color: text({ label: 'Accent classes' }),
    },
    default: [
      {
        icon: 'award',
        title: 'Unabhängige Bewertung',
        description:
          'Alle Hotels werden anonym von unseren Redakteuren besucht — keine bezahlten Platzierungen.',
        color: 'text-primary bg-primary/10',
      },
      {
        icon: 'shield',
        title: 'Vertrauen & Transparenz',
        description:
          'Unsere Kriterien sind öffentlich einsehbar. Wir legen offen, nach welchen Maßstäben wir urteilen.',
        color: 'text-blue-600 bg-blue-50',
      },
      {
        icon: 'globe',
        title: 'Globale Reichweite',
        description:
          'Über 500 Hotels in 40 Ländern bewertet — von Stadthotels bis zu abgelegenen Luxusresorts.',
        color: 'text-[#929f5d] bg-[#929f5d]/10',
      },
      {
        icon: 'users',
        title: 'Community-First',
        description:
          'Mehr als 80.000 monatliche Leser vertrauen unseren Empfehlungen für ihre Reiseentscheidungen.',
        color: 'text-amber-600 bg-amber-50',
      },
    ],
  }),

  team_badge: text({ label: 'Team Badge', default: 'Das Team' }),
  team_title: text({ label: 'Team Title', default: 'Unsere Redaktion' }),
  team_subtitle: text({
    label: 'Team Subtitle',
    default:
      'Ein kleines, leidenschaftliches Team von Reiseexperten, Journalisten und Hotelbewertungsprofis.',
  }),
  team_members: repeater({
    label: 'Team Members',
    mode: 'dynamic',
    min: 1,
    max: 12,
    fields: {
      name: text({ label: 'Name' }),
      role: text({ label: 'Role' }),
      bio: text({ label: 'Biography' }),
      avatar: image({ label: 'Avatar Image' }),
    },
    default: [
      {
        name: 'Isabella von Habsburg',
        role: 'Chefredakteurin',
        bio: 'Über 15 Jahre Erfahrung in der Luxushotellerie. Spezialisiert auf alpinen Wellness-Tourismus.',
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Matteo Bianchi',
        role: 'Reiseredakteur',
        bio: 'Kenner des mediterranen Raums. Hat über 200 Hotels in Italien, Griechenland und Spanien bewertet.',
        avatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Sophie Lehmann',
        role: 'Destinations-Expertin',
        bio: 'Spezialistin für City-Hotels und Boutique-Unterkünfte im deutschsprachigen Raum.',
        avatar:
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
      },
      {
        name: 'Lars Eriksson',
        role: 'Nordeuropa-Korrespondent',
        bio: 'Reist für uns durch Skandinavien und berichtet über Design-Hotels und Naturresorts.',
        avatar:
          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
      },
    ],
  }),

  latest_listicles_badge: text({ label: 'Latest Listicles Badge', default: 'Aus der Redaktion' }),
  latest_listicles_heading: text({ label: 'Latest Listicles Heading', default: 'Aktuelle Berichte' }),
  latest_listicles_link_label: text({ label: 'Latest Listicles Link Label', default: 'Alle anzeigen' }),
  latest_listicles_mobile_link_label: text({
    label: 'Latest Listicles Mobile Link Label',
    default: 'Alle Berichte',
  }),

  cta_heading: text({ label: 'CTA Heading', default: 'Ihr nächstes' }),
  cta_heading_colored: text({ label: 'CTA Heading Colored', default: 'Traumhotel' }),
  cta_heading_end: text({ label: 'CTA Heading End', default: 'wartet auf Sie' }),
  cta_subtitle: text({
    label: 'CTA Subtitle',
    default:
      'Entdecken Sie unsere kuratierte Auswahl an Luxushotels, Boutique-Resorts und einzigartigen Unterkünften weltweit.',
  }),
  cta_primary_label: text({ label: 'CTA Primary Button', default: 'Hotels entdecken' }),
  cta_secondary_label: text({ label: 'CTA Secondary Button', default: 'Kontakt aufnehmen' }),
});

/** Defaults for useWpMeta and UI prop fallbacks — derived once from the schema. */
export const defaults = getEditableDefaults(editable);
