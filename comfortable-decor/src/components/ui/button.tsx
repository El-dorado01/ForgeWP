import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { RollText, Magnetic, ArrowSlide } from '@/components/motion/micro';

const buttonVariants = cva(
  [
    'group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden',
    'whitespace-nowrap font-heading text-[0.8125rem] font-medium tracking-[0.06em] uppercase',
    'transition-colors duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    'cursor-pointer select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90',
        accent: 'bg-sage-deep text-cream hover:bg-ink',
        outline:
          'border border-primary/70 bg-transparent text-primary before:absolute before:inset-0 before:origin-left before:scale-x-0 before:bg-primary before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:before:scale-x-100 hover:text-primary-foreground [&>span]:relative [&>span]:z-10',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-sage-soft',
        ghost:
          'hover:bg-muted text-foreground normal-case tracking-normal',
        link: 'text-foreground px-0 h-auto normal-case tracking-normal',
        soft: 'bg-cream text-ink hover:bg-white',
        blush: 'bg-blush text-ink hover:bg-blush-deep hover:text-cream',
        sage: 'bg-sage-muted text-ink hover:bg-sage',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        default: 'h-11 px-6',
        sm: 'h-9 px-4 text-[0.75rem]',
        lg: 'h-12 px-8',
        xl: 'h-12 px-8 md:h-14 md:px-10',
        icon: 'h-10 w-10',
      },
      shape: {
        default: 'rounded-sm',
        pill: 'rounded-full',
        sharp: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Enable cube/slide roll on string labels (default false) */
  roll?: boolean;
  rollMode?: 'slide' | 'cube';
  /** Subtle magnetic pull toward cursor (default false) */
  magnetic?: boolean;
  /** Subtle sheen sweep (default false) */
  sheen?: boolean;
}

function enhanceLabel(
  children: React.ReactNode,
  roll: boolean,
  rollMode: 'slide' | 'cube',
): React.ReactNode {
  if (!roll) return children;

  const parts = React.Children.toArray(children);
  return parts.map((child, i) => {
    if (typeof child === 'string' && child.trim()) {
      return (
        <RollText key={i} mode={rollMode}>
          {child.trim()}
        </RollText>
      );
    }
    // Icons slide slightly on hover
    if (React.isValidElement(child)) {
      return (
        <ArrowSlide key={i}>{child}</ArrowSlide>
      );
    }
    return child;
  });
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      asChild = false,
      roll = false,
      rollMode = 'slide',
      magnetic = false,
      sheen = true,
      children,
      ...props
    },
    ref,
  ) => {
    const content = enhanceLabel(children, roll, rollMode);
    const classes = cn(buttonVariants({ variant, size, shape, className }));

    // asChild (e.g. Link): Slot merges props onto child — wrap label inside child yourself if needed
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    const button = (
      <button className={classes} ref={ref} {...props}>
        {sheen && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full"
          />
        )}
        <span className="relative z-10 inline-flex items-center gap-2">
          {content}
        </span>
      </button>
    );

    if (magnetic && size !== 'icon') {
      return <Magnetic strength={0.22}>{button}</Magnetic>;
    }

    return button;
  },
);
Button.displayName = 'Button';

/**
 * Use inside <Button asChild><Link>…</Link></Button> so roll works with wouter Link.
 * Or wrap any custom link:
 *   <a className={buttonVariants() + ' group/btn'}><ButtonLabel>Shop</ButtonLabel></a>
 */
export function ButtonLabel({
  children,
  mode = 'slide',
}: {
  children: React.ReactNode;
  mode?: 'slide' | 'cube';
}) {
  return (
    <span className="relative z-10 inline-flex items-center gap-2">
      {enhanceLabel(children, true, mode)}
    </span>
  );
}

export { Button, buttonVariants };
