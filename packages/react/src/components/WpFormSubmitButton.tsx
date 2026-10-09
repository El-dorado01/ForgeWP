import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface WpFormSubmitButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type'
> {
  icon?: ReactNode;
  showIcon?: boolean;
  pending?: boolean;
}

export function WpFormSubmitButton({
  children,
  disabled,
  icon,
  pending = false,
  showIcon = true,
  ...buttonProps
}: WpFormSubmitButtonProps) {
  return (
    <button
      {...buttonProps}
      type='submit'
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {children}
      {showIcon && !pending && icon != null && (
        <span aria-hidden='true'>{icon}</span>
      )}
    </button>
  );
}
