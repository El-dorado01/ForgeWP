import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type LandingSectionProps = ComponentPropsWithoutRef<'section'>;

const LandingSection = forwardRef<HTMLElement, LandingSectionProps>(
  function LandingSection({ children, ...props }, ref) {
    return (
      <section
        ref={ref}
        {...props}
      >
        {children}
      </section>
    );
  },
);

export default LandingSection;
