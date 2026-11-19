/**
 * Listicles (Hotelvergleiche) directory page — single editable contract.
 *
 * Source of truth for:
 *  - ACF field group (page-listicles-page.php)
 *  - useWpMeta defaults on ListiclesHero
 */
import {
  defineEditable,
  getEditableDefaults,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  hero_badge: text({
    label: 'Hero Badge',
    default: 'Redaktionelles Magazin',
  }),
  hero_title: text({
    label: 'Hero Title',
    default: 'Hotelvergleiche',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default: 'Handverlesene Hotelvergleiche, Destinations-Guides und Insider-Tipps — verfasst von unserer Reiseredaktion.',
  }),
});

export const defaults = getEditableDefaults(editable);
