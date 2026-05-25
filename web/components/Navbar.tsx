import Link from 'next/link';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import LangSwitcher from './LangSwitcher';

/**
 * Bumble-style fixed header. Wordmark left, language switcher right.
 * Stays pinned to the viewport top while the user scrolls (sticky +
 * translucent backdrop). Both child slots are intentionally minimal so
 * the header never competes with the hero copy below.
 */
export default function Navbar() {
  const locale = useLocale();
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--color-border-soft)]/60 bg-[color:var(--color-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link
          href={`${prefix}/`}
          className="flex items-baseline gap-2 transition hover:opacity-80"
        >
          <span className="text-2xl font-bold tracking-tight text-[color:var(--color-primary-dark)] md:text-3xl">
            하루
          </span>
          <span className="text-lg font-medium text-[color:var(--color-primary)]/80 md:text-xl">
            春
          </span>
        </Link>
        <LangSwitcher />
      </div>
    </header>
  );
}
