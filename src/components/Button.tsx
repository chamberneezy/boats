import type { ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'sm';
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

// Lacus Button: solid sunline-gold is the only CTA treatment; secondary is text-only.
export function Button({ variant = 'primary', size = 'md', disabled = false, fullWidth = false, onClick, children }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const padding = isPrimary ? (size === 'sm' ? 'px-5 py-2.5' : 'px-7 py-3.5') : size === 'sm' ? 'px-2 py-2.5' : 'px-2 py-3.5';
  const tone = isPrimary
    ? disabled
      ? 'bg-cta-disabled text-cta-disabled-text'
      : 'bg-sunline-gold text-white active:bg-sunline-gold-pressed'
    : disabled
      ? 'bg-transparent text-stone-grey'
      : 'bg-transparent text-deep-lake';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[12px] border-0 font-display text-[15px] font-medium leading-5 transition-colors duration-100 ${padding} ${tone} ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      } ${fullWidth ? 'w-full' : ''}`}
    >
      {children}
    </button>
  );
}
