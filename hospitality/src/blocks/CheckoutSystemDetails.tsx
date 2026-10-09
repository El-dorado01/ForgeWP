import { defineBlock, WpEditable } from '@forgewp/react';

export default defineBlock({
  name: 'checkout-system-details',
  title: 'Checkout System Details',
  category: 'theme',
  icon: 'info',
  description: 'Editable legal and system notes for the checkout section.',
  attributes: {
    liveSystemLabel: {
      type: 'string',
      default: 'Vorgesehen im Live-System',
    },
    requirements: {
      type: 'array',
      default: [
        { text: 'AGB & Lizenzbedingungen direkt erreichbar' },
        { text: 'Widerrufsbelehrung vor Bestellabschluss verlinkt' },
        { text: 'Vertragsbestätigung auf dauerhaftem Datenträger' },
        { text: 'Elektronische Funktion „Vertrag widerrufen“' },
      ],
    },
  },
  editorPreview: ({ attributes, setAttributes }) => (
    <div className='border border-slate-200 bg-brand p-6 text-white sm:p-10 lg:p-12'>
      <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
        <WpEditable
          tagName='span'
          value={attributes.liveSystemLabel || 'Vorgesehen im Live-System'}
          onChange={(value) => setAttributes({ liveSystemLabel: value })}
        />
      </p>
      <div className='mt-8 space-y-5'>
        {(attributes.requirements || [
          { text: 'AGB & Lizenzbedingungen direkt erreichbar' },
          { text: 'Widerrufsbelehrung vor Bestellabschluss verlinkt' },
          { text: 'Vertragsbestätigung auf dauerhaftem Datenträger' },
          { text: 'Elektronische Funktion „Vertrag widerrufen“' },
        ]).map(
          (item: { text: string }, index: number) => (
            <p
              key={index}
              className='border-b border-white/20 pb-5 text-sm leading-relaxed text-slate-300 last:border-b-0'
            >
              <WpEditable
                tagName='span'
                value={item.text}
                onChange={(value) =>
                  setAttributes({
                    requirements: (
                      attributes.requirements || [
                        { text: 'AGB & Lizenzbedingungen direkt erreichbar' },
                        { text: 'Widerrufsbelehrung vor Bestellabschluss verlinkt' },
                        { text: 'Vertragsbestätigung auf dauerhaftem Datenträger' },
                        { text: 'Elektronische Funktion „Vertrag widerrufen“' },
                      ]
                    ).map((entry: { text: string }, itemIndex: number) =>
                      itemIndex === index ? { text: value } : entry,
                    ),
                  })
                }
              />
            </p>
          ),
        )}
      </div>
    </div>
  ),
  save: ({ attributes }) => (
    <aside className='border border-slate-200 bg-brand p-6 text-white sm:p-10 lg:p-12'>
      <p className='text-[10px] font-bold uppercase tracking-[0.18em] text-accent'>
        {attributes.liveSystemLabel || 'Vorgesehen im Live-System'}
      </p>
      <div className='mt-8 space-y-5'>
        {(attributes.requirements || [
          { text: 'AGB & Lizenzbedingungen direkt erreichbar' },
          { text: 'Widerrufsbelehrung vor Bestellabschluss verlinkt' },
          { text: 'Vertragsbestätigung auf dauerhaftem Datenträger' },
          { text: 'Elektronische Funktion „Vertrag widerrufen“' },
        ]).map(
          (item: { text: string }, index: number) => (
            <p
              key={index}
              className='border-b border-white/20 pb-5 text-sm leading-relaxed text-slate-300 last:border-b-0'
            >
              {item.text}
            </p>
          ),
        )}
      </div>
    </aside>
  ),
  edit: () => null,
});
