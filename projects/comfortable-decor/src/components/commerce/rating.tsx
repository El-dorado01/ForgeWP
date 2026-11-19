import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type RatingProps = {
  rating: number;
  reviewCount?: number;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md';
};

export function Rating({
  rating,
  reviewCount,
  className,
  showCount = true,
  size = 'sm',
}: RatingProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.round(rating);
          return (
            <Star
              key={i}
              className={cn(
                iconSize,
                filled
                  ? 'fill-ink text-ink'
                  : 'fill-transparent text-border',
              )}
            />
          );
        })}
      </div>
      {showCount && reviewCount != null && (
        <span className="text-xs text-muted-foreground">
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
