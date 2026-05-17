import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
