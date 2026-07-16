import { pickEditable, WpEditable } from '@forgewp/react';
import { useWpMeta } from '../.forgewp/wordpress';
import { editable as kontaktPageEditable, defaults } from '../../cms/editables/kontakt-page';
import ContactForm from './ContactForm';

export const editable = pickEditable(kontaktPageEditable, {
    formTitle: 'form_title',
    formDescription: 'form_description',
  });


export interface ContactFormSectionProps {
  formTitle?: string;
  formDescription?: string;
  setAttributes?: (attrs: Partial<ContactFormSectionProps>) => void;
}

/**
 * @forgewp-block
 * title: Contact Form
 * category: theme
 * icon: feedback
 * description: Contact form with editable title and description.
 */
export function ContactFormSection({
  formTitle: titleProp,
  formDescription: descProp,
  setAttributes,
}: ContactFormSectionProps) {
  const titleMeta = useWpMeta('form_title', defaults.form_title);
  const descMeta = useWpMeta('form_description', defaults.form_description);

  const formTitle = titleProp ?? titleMeta;
  const formDescription = descProp ?? descMeta;

  return (
    <div className='w-full min-w-0'>
      {setAttributes && (
        <div className="mb-3 space-y-1">
          <WpEditable
            tagName="div"
            value={formTitle}
            onChange={(val) => setAttributes({ formTitle: val })}
            className="text-xs font-mono text-slate-400"
          />
          <WpEditable
            tagName="div"
            value={formDescription}
            onChange={(val) => setAttributes({ formDescription: val })}
            className="text-xs font-mono text-slate-400"
          />
        </div>
      )}
      <ContactForm formTitle={formTitle} formDescription={formDescription} />
    </div>
  );
}

export default ContactFormSection;
