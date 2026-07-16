import {
  WpEditable,
  defineEditable,
  text,
  richText,
  color,
  url,
  image,
  boolean,
  number,
  select,
} from '@forgewp/react';

export const editable = defineEditable({
  heading: text({
    label: 'Heading',
    default: 'Welcome to Hotelchecker24',
  }),
  body: richText({
    label: 'Body Text',
    default: 'This is a simple static block generated automatically using JSDoc annotations to verify rendering.',
  }),
  bgColor: color({
    label: 'Background Color',
    default: '#0f172a',
  }),
  buttonText: text({
    label: 'Button Text',
    default: 'Explore Now',
  }),
  buttonUrl: url({
    label: 'Button URL',
    default: '#',
  }),
  buttonBgColor: color({
    label: 'Button Background Color',
    default: '#f59e0b',
  }),
  bgImage: image({
    label: 'Background Image',
  }),
  showButton: boolean({
    label: 'Show CTA Button',
    default: true,
  }),
  paddingTop: number({
    label: 'Padding Top',
    min: 20,
    max: 160,
    default: 64,
  }),
  paddingBottom: number({
    label: 'Padding Bottom',
    min: 20,
    max: 160,
    default: 64,
  }),
  textAlign: select({
    label: 'Text Alignment',
    options: ['left', 'center', 'right'],
    default: 'center',
  }),
});

export interface SimpleBannerProps {
  heading: string;
  body: string;
  bgColor?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonBgColor?: string;
  bgImage?: { url: string; alt?: string; id?: number };
  showButton?: boolean;
  paddingTop?: number;
  paddingBottom?: number;
  textAlign?: 'left' | 'center' | 'right';
  setAttributes?: (attrs: any) => void;
}

/**
 * @forgewp-block
 * title: Simple Banner Block
 * category: design
 * icon: welcome-widgets-menus
 * description: A customizable dynamic banner block with background image, alignment, padding, and CTA controls.
 */
export function SimpleBanner({
  heading = 'Welcome to Hotelchecker24',
  body = 'This is a simple static block generated automatically using JSDoc annotations to verify rendering.',
  bgColor = '#0f172a',
  buttonText = 'Explore Now',
  buttonUrl = '#',
  buttonBgColor = '#f59e0b',
  bgImage,
  showButton = true,
  paddingTop = 64,
  paddingBottom = 64,
  textAlign = 'center',
  setAttributes,
}: SimpleBannerProps) {
  const alignClass = textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center';
  const containerClass = `w-full text-white border-t-4 border-amber-500 transition-all duration-300 relative overflow-hidden ${alignClass}`;
  
  const contentWrapperClass = textAlign === 'left' ? 'max-w-3xl mr-auto space-y-6 relative z-10 px-6' : textAlign === 'right' ? 'max-w-3xl ml-auto space-y-6 relative z-10 px-6' : 'max-w-3xl mx-auto space-y-6 relative z-10 px-6';
  const bodyTextClass = textAlign === 'left' ? 'text-white/80 text-sm md:text-base max-w-xl mr-auto leading-relaxed' : textAlign === 'right' ? 'text-white/80 text-sm md:text-base max-w-xl ml-auto leading-relaxed' : 'text-white/80 text-sm md:text-base max-w-xl mx-auto leading-relaxed';
  const buttonWrapperClass = textAlign === 'left' ? 'pt-4 flex justify-start' : textAlign === 'right' ? 'pt-4 flex justify-end' : 'pt-4 flex justify-center';

  return (
    <div
      className={containerClass}
      style={{
        backgroundColor: bgColor,
        paddingTop: paddingTop + 'px',
        paddingBottom: paddingBottom + 'px',
      }}
    >
      {bgImage && bgImage.url && (
        <img
          src={bgImage.url}
          alt={heading}
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none mix-blend-overlay"
        />
      )}
      <div className={contentWrapperClass}>
        <WpEditable
          tagName="h2"
          value={heading}
          onChange={(val) => setAttributes && setAttributes({ heading: val })}
          className="text-3xl md:text-5xl font-heading font-bold uppercase tracking-tight"
        />
        <WpEditable
          tagName="p"
          value={body}
          onChange={(val) => setAttributes && setAttributes({ body: val })}
          className={bodyTextClass}
        />
        {showButton && (
          <div className={buttonWrapperClass}>
            <a
              href={buttonUrl}
              className="inline-flex items-center justify-center font-sans font-black text-[11px] uppercase tracking-widest px-8 py-4 shadow-lg hover:brightness-105 active:scale-95 transition-all duration-200"
              style={{ backgroundColor: buttonBgColor, color: '#0f172a' }}
              onClick={(e) => {
                if (buttonUrl === '#') e.preventDefault();
              }}
            >
              <WpEditable
                tagName="span"
                value={buttonText}
                onChange={(val) => setAttributes && setAttributes({ buttonText: val })}
              />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}



