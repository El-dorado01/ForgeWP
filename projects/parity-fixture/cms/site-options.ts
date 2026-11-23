import { defineWpOptions, optionText, optionEmail } from '@forgewp/react/config';

export const siteOptions = defineWpOptions({
  contact_phone: optionText({ label: 'Contact Phone', default: '+1 (555) 010-2000' }),
  contact_email: optionEmail({ label: 'Contact Email', default: 'hello@example.test' }),
  crm_api_key: optionText({ label: 'CRM API key', default: 'secret-default', private: true }),
});
export default siteOptions;
