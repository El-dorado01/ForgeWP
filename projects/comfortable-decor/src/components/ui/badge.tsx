import type * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-heading font-medium tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-ink text-cream',
        sale: 'bg-ink text-cream',
        new: 'bg-sage-deep text-cream',
        eco: 'bg-sage text-ink',
        featured: 'bg-stone-dark text-ink',
        bestseller: 'bg-ochre text-ink',
        outline: 'border border-border text-muted-foreground bg-cream/90',
        secondary: 'bg-secondary text-secondary-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
