'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCharCount?: boolean;
  maxLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, hint, showCharCount, maxLength, id, value, ...props },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-gray-700">
            {label}
            {props.required && (
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            value={value}
            maxLength={maxLength}
            className={cn(
              'block w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400',
              'transition-colors duration-200',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
            {...props}
          />
        </div>
        <div className="mt-1.5 flex justify-between">
          <div>
            {error && (
              <p id={errorId} className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {hint && !error && (
              <p id={hintId} className="text-sm text-gray-500">
                {hint}
              </p>
            )}
          </div>
          {showCharCount && maxLength && (
            <p
              className={cn(
                'text-sm',
                charCount >= maxLength ? 'text-red-600' : 'text-gray-400'
              )}
              aria-live="polite"
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
