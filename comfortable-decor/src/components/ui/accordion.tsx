import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccordionContextValue = {
  openItems: Set<string>;
  toggle: (value: string) => void;
  type: 'single' | 'multiple';
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

type AccordionProps = {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

function Accordion({
  type = 'single',
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (!defaultValue) return new Set();
    return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
  });

  const toggle = React.useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          next.delete(value);
        } else {
          if (type === 'single') next.clear();
          next.add(value);
        }
        return next;
      });
    },
    [type],
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggle, type }}>
      <div className={cn('divide-y divide-border', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

const ItemContext = React.createContext<string>('');

function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ItemContext.Provider value={value}>
      <div className={cn('border-border', className)} data-state={value}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  const value = React.useContext(ItemContext);
  if (!ctx) throw new Error('AccordionTrigger must be used within Accordion');

  const open = ctx.openItems.has(value);

  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => ctx.toggle(value)}
      className={cn(
        'flex w-full items-center justify-between py-4 text-left font-heading text-sm font-medium transition-all hover:text-accent',
        className,
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
          open && 'rotate-180',
        )}
      />
    </button>
  );
}

function AccordionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  const value = React.useContext(ItemContext);
  if (!ctx) throw new Error('AccordionContent must be used within Accordion');

  const open = ctx.openItems.has(value);
  if (!open) return null;

  return (
    <div
      className={cn(
        'overflow-hidden pb-4 text-sm text-muted-foreground leading-relaxed',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
