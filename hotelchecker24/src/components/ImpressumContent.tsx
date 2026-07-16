import { MapPin, Mail, Landmark, ShieldCheck } from 'lucide-react';
import { useWpMeta } from '../.forgewp/wordpress';
import { pickEditable, WpEditable } from '@forgewp/react';
import { editable as impressumPageEditable, defaults } from '../../cms/editables/impressum-page';

export const editable = pickEditable(impressumPageEditable, {
    companyHeading: 'company_heading',
    companyName: 'company_name',
    companyLegalForm: 'company_legal_form',
    addressHeading: 'address_heading',
    addressLine1: 'address_line_1',
    addressLine2: 'address_line_2',
    addressCountry: 'address_country',
    contactHeading: 'contact_heading',
    contactEmail: 'contact_email',
    contactWebsiteLabel: 'contact_website_label',
    contactWebsiteUrl: 'contact_website_url',
    contactWebsiteDisplay: 'contact_website_display',
    registerHeading: 'register_heading',
    registerNumberLabel: 'register_number_label',
    registerNumber: 'register_number',
    vatLabel: 'vat_label',
    vatId: 'vat_id',
    courtLabel: 'court_label',
    courtName: 'court_name',
    legalHeading: 'legal_heading',
    businessPurposeLabel: 'business_purpose_label',
    businessPurpose: 'business_purpose',
    authorityLabel: 'authority_label',
    authority: 'authority',
    trademarkLabel: 'trademark_label',
    trademark: 'trademark',
  });


type FieldKey = keyof typeof defaults;

export interface ImpressumContentProps {
  companyHeading?: string;
  companyName?: string;
  companyLegalForm?: string;
  addressHeading?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCountry?: string;
  contactHeading?: string;
  contactEmail?: string;
  contactWebsiteLabel?: string;
  contactWebsiteUrl?: string;
  contactWebsiteDisplay?: string;
  registerHeading?: string;
  registerNumberLabel?: string;
  registerNumber?: string;
  vatLabel?: string;
  vatId?: string;
  courtLabel?: string;
  courtName?: string;
  legalHeading?: string;
  businessPurposeLabel?: string;
  businessPurpose?: string;
  authorityLabel?: string;
  authority?: string;
  trademarkLabel?: string;
  trademark?: string;
  setAttributes?: (attrs: Partial<ImpressumContentProps>) => void;
}

function useDual(prop: string | undefined, metaKey: FieldKey) {
  const meta = useWpMeta(metaKey, defaults[metaKey] as string);
  return prop ?? meta;
}

/**
 * @forgewp-block
 * title: Impressum Content
 * category: theme
 * icon: media-document
 * description: Legal impressum details and regulatory sidebar.
 */
export function ImpressumContent({
  companyHeading: companyHeadingProp,
  companyName: companyNameProp,
  companyLegalForm: companyLegalFormProp,
  addressHeading: addressHeadingProp,
  addressLine1: addressLine1Prop,
  addressLine2: addressLine2Prop,
  addressCountry: addressCountryProp,
  contactHeading: contactHeadingProp,
  contactEmail: contactEmailProp,
  contactWebsiteLabel: contactWebsiteLabelProp,
  contactWebsiteUrl: contactWebsiteUrlProp,
  contactWebsiteDisplay: contactWebsiteDisplayProp,
  registerHeading: registerHeadingProp,
  registerNumberLabel: registerNumberLabelProp,
  registerNumber: registerNumberProp,
  vatLabel: vatLabelProp,
  vatId: vatIdProp,
  courtLabel: courtLabelProp,
  courtName: courtNameProp,
  legalHeading: legalHeadingProp,
  businessPurposeLabel: businessPurposeLabelProp,
  businessPurpose: businessPurposeProp,
  authorityLabel: authorityLabelProp,
  authority: authorityProp,
  trademarkLabel: trademarkLabelProp,
  trademark: trademarkProp,
  setAttributes,
}: ImpressumContentProps) {
  const companyHeading = useDual(companyHeadingProp, 'company_heading');
  const companyName = useDual(companyNameProp, 'company_name');
  const companyLegalForm = useDual(companyLegalFormProp, 'company_legal_form');
  const addressHeading = useDual(addressHeadingProp, 'address_heading');
  const addressLine1 = useDual(addressLine1Prop, 'address_line_1');
  const addressLine2 = useDual(addressLine2Prop, 'address_line_2');
  const addressCountry = useDual(addressCountryProp, 'address_country');
  const contactHeading = useDual(contactHeadingProp, 'contact_heading');
  const contactEmail = useDual(contactEmailProp, 'contact_email');
  const contactWebsiteLabel = useDual(
    contactWebsiteLabelProp,
    'contact_website_label',
  );
  const contactWebsiteUrl = useDual(
    contactWebsiteUrlProp,
    'contact_website_url',
  );
  const contactWebsiteDisplay = useDual(
    contactWebsiteDisplayProp,
    'contact_website_display',
  );
  const registerHeading = useDual(registerHeadingProp, 'register_heading');
  const registerNumberLabel = useDual(
    registerNumberLabelProp,
    'register_number_label',
  );
  const registerNumber = useDual(registerNumberProp, 'register_number');
  const vatLabel = useDual(vatLabelProp, 'vat_label');
  const vatId = useDual(vatIdProp, 'vat_id');
  const courtLabel = useDual(courtLabelProp, 'court_label');
  const courtName = useDual(courtNameProp, 'court_name');
  const legalHeading = useDual(legalHeadingProp, 'legal_heading');
  const businessPurposeLabel = useDual(
    businessPurposeLabelProp,
    'business_purpose_label',
  );
  const businessPurpose = useDual(businessPurposeProp, 'business_purpose');
  const authorityLabel = useDual(authorityLabelProp, 'authority_label');
  const authority = useDual(authorityProp, 'authority');
  const trademarkLabel = useDual(trademarkLabelProp, 'trademark_label');
  const trademark = useDual(trademarkProp, 'trademark');


  const editText = (
    value: string,
    key: keyof ImpressumContentProps,
    className: string,
    tagName: 'span' | 'p' | 'h2' | 'h3' | 'div' = 'span',
  ) =>
    setAttributes ? (
      <WpEditable
        tagName={tagName}
        value={value}
        onChange={(val) => setAttributes({ [key]: val } as Partial<ImpressumContentProps>)}
        className={className}
      />
    ) : tagName === 'div' ? (
      <div className={className} dangerouslySetInnerHTML={{ __html: value }} />
    ) : tagName === 'p' ? (
      <p className={className}>{value}</p>
    ) : tagName === 'h2' ? (
      <h2 className={className}>{value}</h2>
    ) : tagName === 'h3' ? (
      <h3 className={className}>{value}</h3>
    ) : (
      <span className={className}>{value}</span>
    );

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12 sm:py-16'>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            {editText(
              companyHeading,
              'companyHeading',
              'text-xs font-mono font-bold uppercase tracking-widest text-[#929f5d] mb-2 block',
              'h2',
            )}
            {editText(
              companyName,
              'companyName',
              'text-lg font-black text-slate-900 uppercase tracking-tight block',
              'p',
            )}
            {editText(
              companyLegalForm,
              'companyLegalForm',
              'text-slate-500 text-sm mt-1 block',
              'p',
            )}
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#929f5d]/10 flex items-center justify-center shrink-0 text-[#929f5d]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              {editText(
                addressHeading,
                'addressHeading',
                'text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1 block',
                'h3',
              )}
              {editText(addressLine1, 'addressLine1', 'text-sm font-bold text-slate-800 block', 'p')}
              {editText(addressLine2, 'addressLine2', 'text-sm font-bold text-slate-800 block', 'p')}
              {editText(
                addressCountry,
                'addressCountry',
                'text-sm font-semibold text-slate-500 mt-0.5 block',
                'p',
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              {editText(
                contactHeading,
                'contactHeading',
                'text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1 block',
                'h3',
              )}
              {setAttributes ? (
                <WpEditable
                  tagName="span"
                  value={contactEmail}
                  onChange={(val) => setAttributes({ contactEmail: val })}
                  className="text-sm font-bold text-slate-800 block"
                />
              ) : (
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-sm font-bold text-slate-800 hover:text-primary transition-colors"
                >
                  {contactEmail}
                </a>
              )}
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {setAttributes ? (
                  <>
                    <WpEditable
                      tagName="span"
                      value={contactWebsiteLabel}
                      onChange={(val) => setAttributes({ contactWebsiteLabel: val })}
                    />{' '}
                    <WpEditable
                      tagName="span"
                      value={contactWebsiteDisplay}
                      onChange={(val) => setAttributes({ contactWebsiteDisplay: val })}
                      className="underline"
                    />
                  </>
                ) : (
                  <>
                    {contactWebsiteLabel}{' '}
                    <a
                      href={contactWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary"
                    >
                      {contactWebsiteDisplay}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 text-slate-600">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="space-y-2 w-full">
              {editText(
                registerHeading,
                'registerHeading',
                'text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-1 block',
                'h3',
              )}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                <div>
                  {editText(
                    registerNumberLabel,
                    'registerNumberLabel',
                    'text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5',
                    'span',
                  )}
                  {editText(registerNumber, 'registerNumber', 'block', 'span')}
                </div>
                <div>
                  {editText(
                    vatLabel,
                    'vatLabel',
                    'text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5',
                    'span',
                  )}
                  {editText(vatId, 'vatId', 'block', 'span')}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-700 pt-1">
                {editText(
                  courtLabel,
                  'courtLabel',
                  'text-slate-400 block font-normal uppercase tracking-wider text-[10px] mb-0.5',
                  'span',
                )}
                {editText(courtName, 'courtName', 'block', 'span')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-100/60 rounded-2xl p-6 shadow-xs h-fit space-y-5">
          <h2 className="text-sm font-black uppercase text-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            {editText(legalHeading, 'legalHeading', '', 'span')}
          </h2>

          <div className="space-y-4">
            <div>
              {editText(
                businessPurposeLabel,
                'businessPurposeLabel',
                'text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block',
                'h3',
              )}
              {setAttributes ? (
                <WpEditable
                  tagName="div"
                  value={businessPurpose}
                  onChange={(val) => setAttributes({ businessPurpose: val })}
                  className="text-xs font-semibold text-slate-700 leading-relaxed"
                />
              ) : (
                <div
                  className="text-xs font-semibold text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: businessPurpose }}
                />
              )}
            </div>

            <div>
              {editText(
                authorityLabel,
                'authorityLabel',
                'text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block',
                'h3',
              )}
              {setAttributes ? (
                <WpEditable
                  tagName="div"
                  value={authority}
                  onChange={(val) => setAttributes({ authority: val })}
                  className="text-xs font-semibold text-slate-700 leading-relaxed"
                />
              ) : (
                <div
                  className="text-xs font-semibold text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: authority }}
                />
              )}
            </div>

            <div>
              {editText(
                trademarkLabel,
                'trademarkLabel',
                'text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1 block',
                'h3',
              )}
              {setAttributes ? (
                <WpEditable
                  tagName="div"
                  value={trademark}
                  onChange={(val) => setAttributes({ trademark: val })}
                  className="text-xs font-semibold text-slate-700 leading-relaxed"
                />
              ) : (
                <div
                  className="text-xs font-semibold text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: trademark }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImpressumContent;
