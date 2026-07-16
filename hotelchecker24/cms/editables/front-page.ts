/**
 * Front page — single ACF / editable contract (gold standard).
 *
 * Location: page_type == front_page (cms/editables/front-page.ts → slug front-page)
 * Home sections read these keys via useWpMeta; blocks pick/from this schema.
 */
import {
  defineEditable,
  getEditableDefaults,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  // ── Hero ──────────────────────────────────────────────────────────────
  hero_title: text({ label: 'Hero Title', default: 'Handverlesene' }),
  hero_title_colored: text({
    label: 'Hero Title Colored',
    default: 'Boutique- & Luxushotels',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default:
      'Hotelchecker24 ist Ihre unabhängige Magazin-Plattform für außergewöhnliche Aufenthalte. Entdecken Sie handverlesene Empfehlungen, redaktionelle Berichte und versteckte Juwelen in ganz Europa.',
  }),
  hero_search_placeholder: text({
    label: 'Hero Search Placeholder',
    default: 'Hotelname oder Stadt suchen...',
  }),

  // ── Trust strip ───────────────────────────────────────────────────────
  trust_stat1_value: text({ label: 'Trust Stat 1 Value', default: '500+' }),
  trust_stat1_label: text({ label: 'Trust Stat 1 Label', default: 'Kuratierte Hotels' }),
  trust_stat2_value: text({ label: 'Trust Stat 2 Value', default: '4' }),
  trust_stat2_label: text({ label: 'Trust Stat 2 Label', default: 'Länder abgedeckt' }),
  trust_stat3_value: text({ label: 'Trust Stat 3 Value', default: '100%' }),
  trust_stat3_label: text({
    label: 'Trust Stat 3 Label',
    default: 'Unabhängig & redaktionell',
  }),
  trust_stat4_value: text({ label: 'Trust Stat 4 Value', default: 'DE / EN' }),
  trust_stat4_label: text({
    label: 'Trust Stat 4 Label',
    default: 'Deutsch & Englisch',
  }),

  // ── Featured hotels ───────────────────────────────────────────────────
  featured_badge: text({ label: 'Featured Badge', default: 'Empfohlen' }),
  featured_heading: text({ label: 'Featured Heading', default: 'Ausgewählte Hotels' }),
  featured_subtitle: text({
    label: 'Featured Subtitle',
    default:
      'Von unserer Redaktion handverlesen — außergewöhnliche Aufenthalte in ganz Europa.',
  }),
  featured_link_label: text({ label: 'Featured Link Label', default: 'Alle Hotels' }),

  // ── Editorial strip ───────────────────────────────────────────────────
  editorial_badge: text({
    label: 'Editorial Badge',
    default: 'Redaktionell & Unabhängig',
  }),
  editorial_heading: text({ label: 'Editorial Heading', default: 'Kuratiert von' }),
  editorial_heading_colored: text({
    label: 'Editorial Heading Colored',
    default: 'echten Reisenden',
  }),
  editorial_description: text({
    label: 'Editorial Description',
    default:
      'Kein bezahltes Ranking. Kein Algorithmus. Nur ehrliche, redaktionell geprüfte Empfehlungen von unserem Team, das die Hotels selbst besucht hat.',
  }),
  editorial_cta_label: text({
    label: 'Editorial CTA Label',
    default: 'Alle Hotelvergleiche lesen',
  }),
  editorial_feature1_label: text({
    label: 'Editorial Feature 1 Label',
    default: 'Vor-Ort-Besuche',
  }),
  editorial_feature1_desc: text({
    label: 'Editorial Feature 1 Description',
    default: 'Jedes Hotel wird persönlich getestet',
  }),
  editorial_feature2_label: text({
    label: 'Editorial Feature 2 Label',
    default: 'Keine Werbung',
  }),
  editorial_feature2_desc: text({
    label: 'Editorial Feature 2 Description',
    default: 'Vollständig redaktionell unabhängig',
  }),
  editorial_feature3_label: text({ label: 'Editorial Feature 3 Label', default: 'DE & EN' }),
  editorial_feature3_desc: text({
    label: 'Editorial Feature 3 Description',
    default: 'Inhalte auf Deutsch und Englisch',
  }),
  editorial_feature4_label: text({
    label: 'Editorial Feature 4 Label',
    default: 'Laufend aktuell',
  }),
  editorial_feature4_desc: text({
    label: 'Editorial Feature 4 Description',
    default: 'Regelmäßige neue Empfehlungen',
  }),

  // ── Latest listicles ──────────────────────────────────────────────────
  listicles_badge: text({ label: 'Listicles Badge', default: 'Magazin' }),
  listicles_heading: text({
    label: 'Listicles Heading',
    default: 'Aktuelle Hotelvergleiche',
  }),
  listicles_subtitle: text({
    label: 'Listicles Subtitle',
    default: 'Tiefgehende Reiseberichte und Empfehlungen von unserer Redaktion.',
  }),
  listicles_link_label: text({
    label: 'Listicles Link Label',
    default: 'Alle Vergleiche',
  }),

  // ── Destinations ──────────────────────────────────────────────────────
  destinations_heading: text({
    label: 'Destinations Heading',
    default: 'Nach Reiseziel entdecken',
  }),
  destinations_subtitle: text({
    label: 'Destinations Subtitle',
    default: 'Handverlesene Hotels in den schönsten Reisezielen Europas.',
  }),
});

export const defaults = getEditableDefaults(editable);
