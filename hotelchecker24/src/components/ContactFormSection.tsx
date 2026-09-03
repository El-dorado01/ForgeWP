import { pickEditable, WpEditable } from '@forgewp/react';
import { useWpMeta } from '@forgewp/react';
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
      {setAttributes ? (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Form settings</div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Form Title:</div>
            <WpEditable
              tagName="div"
              value={formTitle}
              onChange={(val) => setAttributes({ formTitle: val })}
              className="text-sm text-slate-800 font-bold"
            />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Form Description:</div>
            <WpEditable
              tagName="div"
              value={formDescription}
              onChange={(val) => setAttributes({ formDescription: val })}
              className="text-xs text-slate-600"
            />
          </div>
          <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/60">
            Form fields (subject, message) are managed under Appearance → Forms.
          </p>
        </div>
      ) : (
        <ContactForm formTitle={formTitle} formDescription={formDescription} />
      )}
    </div>
  );
}

export default ContactFormSection;
