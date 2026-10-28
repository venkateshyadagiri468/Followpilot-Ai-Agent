import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './Label';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; icon?: React.ReactNode }>(
  ({ className, label, error, icon, id, ...rest }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <Label htmlFor={id} className="text-sm font-medium text-neutral-700">{label}</Label>}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-900 shadow-xs transition-all duration-200',
              'placeholder:text-neutral-400',
              'focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10',
              'disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100',
              icon && 'pl-10',
              'border-danger-500 focus:border-danger-500 focus:ring-danger-500/10',
              className
            )}
            {...rest}
          />
        </div>
        {error && <p className="text-xs text-danger-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';