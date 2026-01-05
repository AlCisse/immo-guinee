'use client';

import { forwardRef } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  onSearch?: () => void;
  showButton?: boolean;
  buttonText?: string;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ icon, onSearch, showButton = false, buttonText = 'Rechercher', className = '', ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch();
      }
      props.onKeyDown?.(e);
    };

    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-neutral-200 dark:border-dark-border p-2 shadow-sm focus-within:border-neutral-300 dark:focus-within:border-neutral-600 transition-colors">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 bg-neutral-50 dark:bg-dark-bg rounded-xl">
            {icon || <Search className="w-5 h-5 text-neutral-400" />}
            <input
              ref={ref}
              type="text"
              {...props}
              onKeyDown={handleKeyDown}
              className={`flex-1 py-3 sm:py-4 bg-transparent text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 border-none rounded-lg text-sm sm:text-base ${className}`}
            />
          </div>
          {showButton && (
            <button
              type="button"
              onClick={onSearch}
              className="p-4 md:px-8 md:py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors shrink-0"
            >
              <Search className="w-5 h-5 md:hidden" />
              <span className="hidden md:inline">{buttonText}</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput;
