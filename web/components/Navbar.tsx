import Link from 'next/link';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import LangSwitcher from './LangSwitcher';

/**
 * Fully fixed header — pinned to the viewport top for the entire page,
 * not just until the scroll region ends. No background fill or blur:
 * the wordmark + switcher float directly on the page so the hero behind
 * them stays visible.
 *
 * Because the header is now `position: fixed` it leaves no flow space,
 * so the page wrapper in app/[locale]/layout.tsx adds matching top
 * padding to prevent the hero from disappearing under it.
 */
export default function Navbar() {
  const locale = useLocale();
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href={`${prefix}/`}
          className="transition hover:opacity-85"
          aria-label="haru — home"
        >
          <span
            className="text-3xl font-extrabold tracking-tight md:text-4xl"
            style={{
              backgroundImage:
                'linear-gradient(135deg, #FFC1A6 0%, #E27AA0 50%, #B85478 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            HARU 春
          </span>
        </Link>
        <LangSwitcher />
      </div>
    </header>
  );
}
