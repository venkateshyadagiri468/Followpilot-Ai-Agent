import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-200/70 bg-white shadow-xl shadow-neutral-900/5',
        className
      )}
      {...rest}
    />
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({ className, title, description, action, ...rest }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6 pb-0', className)} {...rest}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-xl font-bold tracking-tight text-neutral-900', className)}
      {...rest}
    />
  );
}

export function CardDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-neutral-500', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...rest} />;
}