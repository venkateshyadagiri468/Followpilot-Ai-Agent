import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-700 text-white shadow-lg shadow-brand-900/25 hover:bg-brand-800 hover:-translate-y-px active:translate-y-0',
        secondary:
          'bg-white text-neutral-800 border border-neutral-200 shadow-sm hover:bg-neutral-50 hover:border-neutral-300 hover:-translate-y-px active:translate-y-0',
        ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
        danger: 'bg-danger-500 text-white shadow-md hover:bg-danger-600',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      loading = false,
      icon,
      iconPosition = 'left',
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size }), className)}
        {...rest}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
