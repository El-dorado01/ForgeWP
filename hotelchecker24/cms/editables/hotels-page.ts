/**
 * Hotels directory page — single editable contract.
 *
 * Source of truth for:
 *  - ACF field group (page-hotels-page.php)
 *  - useWpMeta defaults on HotelsHero
 */
import {
  defineEditable,
  getEditableDefaults,
  text,
} from '@forgewp/react';

export const editable = defineEditable({
  hero_title: text({
    label: 'Hero Title',
    default: 'Hotelverzeichnis',
  }),
  hero_subtitle: text({
    label: 'Hero Subtitle',
    default: 'Kuratierte Auswahl an Luxushotels, Boutique-Resorts und Stadthotels in den schönsten Reisezielen der Welt.',
  }),
});

export const defaults = getEditableDefaults(editable);
