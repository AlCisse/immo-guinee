'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { LanguageSelectorCompact } from '@/components/ui/LanguageSelector';

/**
 * Language + theme controls for the full-bleed auth screens (login / register /
 * OTP). Auth pages render outside the site Navbar, so they carry their own
 * controls in the top-right of the form panel — matching the design mockup.
 * Dark mode uses the same localStorage('darkMode') + `dark` class mechanism as
 * the Navbar, so the choice stays consistent across the app.
 */
export default function AuthTopControls({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const dark = localStorage.getItem('darkMode') === 'true';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('darkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LanguageSelectorCompact />
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        className="w-9 h-9 grid place-items-center rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-card text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  );
}
