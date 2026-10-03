import {
  defineWpOptions,
  optionText,
  optionUrl,
  optionEmail,
} from '@forgewp/react/config';

export const siteOptions = defineWpOptions({
  contact_phone: optionText({
    label: 'Contact Phone',
    default: '+49 (0)30 300 132 500',
  }),
  contact_email: optionEmail({
    label: 'Contact Email',
    default: 'contact@dicon-beratung.de',
  }),
  social_facebook: optionUrl({
    label: 'Facebook URL',
    default: '',
  }),
  social_instagram: optionUrl({
    label: 'Instagram URL',
    default: '',
  }),
  social_twitter: optionUrl({
    label: 'Twitter URL',
    default: '',
  }),
  social_youtube: optionUrl({
    label: 'YouTube URL',
    default: '',
  }),
  social_tiktok: optionUrl({
    label: 'TikTok URL',
    default: '',
  }),
  social_linkedin: optionUrl({
    label: 'LinkedIn URL',
    default: '',
  }),
  social_pinterest: optionUrl({
    label: 'Pinterest URL',
    default: '',
  }),
});

export const options = siteOptions;
export default siteOptions;
