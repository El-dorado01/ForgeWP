import {
  defineWpOptions,
  optionText,
  optionUrl,
  optionEmail,
} from '@forgewp/react/config';

export const siteOptions = defineWpOptions({
  blogname: optionText({
    label: 'Site Title',
    default: 'ForgeWP Auth',
  }),
  blogdescription: optionText({
    label: 'Tagline',
    default: 'Enterprise headless authentication for WordPress & React.',
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
    default: 'admin@forgewp.local',
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
  social_linkedin: optionUrl({
    label: 'LinkedIn URL',
    default: 'https://linkedin.com',
  }),
});

export default siteOptions;
