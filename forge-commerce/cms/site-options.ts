import {
  defineWpOptions,
  optionText,
  optionUrl,
  optionEmail,
} from '@forgewp/react/config';

export const siteOptions = defineWpOptions({
  blogname: optionText({
    label: 'Site Title',
    default: 'Forge Commerce',
  }),
  blogdescription: optionText({
    label: 'Tagline',
    default: 'Premium headless WooCommerce experiences built with React.',
  }),
  admin_email: optionEmail({
    label: 'Admin Email',
    default: 'admin@forgewp.local',
  }),
  contact_phone: optionText({
    label: 'Contact Phone',
    default: '+1 (555) 019-9000',
  }),
  contact_email: optionEmail({
    label: 'Contact Email',
    default: 'support@forgecommerce.local',
  }),
  social_facebook: optionUrl({
    label: 'Facebook URL',
    default: 'https://facebook.com',
  }),
  social_instagram: optionUrl({
    label: 'Instagram URL',
    default: 'https://instagram.com',
  }),
  social_twitter: optionUrl({
    label: 'Twitter URL',
    default: 'https://twitter.com',
  }),
  social_pinterest: optionUrl({
    label: 'Pinterest URL',
    default: 'https://pinterest.com',
  }),
  social_tiktok: optionUrl({
    label: 'TikTok URL',
    default: '',
  }),
  social_youtube: optionUrl({
    label: 'YouTube URL',
    default: '',
  }),
  social_linkedin: optionUrl({
    label: 'LinkedIn URL',
    default: '',
  }),
});

export { siteOptions as options };
export default siteOptions;
