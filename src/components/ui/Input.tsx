import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...rest }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full rounded-md border bg-white px-3 py-2 text-sm text-neutral-900
              transition-colors duration-base
              placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed
              ${icon ? 'pl-9' : ''}
              ${error ? 'border-danger-500 focus:ring-danger-500' : 'border-neutral-300'}
              ${className}
            `.trim().replace(/\s+/g, ' ')}
            {...rest}
          />
        </div>
        {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';