import * as React from 'react';
import { cn } from '@/lib/utils';

export function Label({
  className,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-[13px] font-medium leading-none text-neutral-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...rest}
    />
  );
}
