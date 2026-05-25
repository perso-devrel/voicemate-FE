import { useTranslations } from 'next-intl';
import PhoneFrame from './PhoneFrame';

export default function Hero() {
  const t = useTranslations('hero');

  return (
    <section className="relative overflow-hidden bg-dawn">
      <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-28">
        {/* Brand wordmark — sets the identity before any pitch copy. */}
        <h1 className="text-center text-6xl font-bold tracking-tight text-[color:var(--color-primary-dark)] md:text-8xl lg:text-9xl">
          하루{' '}
          <span className="text-[color:var(--color-primary)]">(春)</span>
        </h1>
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-12 pb-20 md:grid-cols-2 md:gap-8 md:pb-28 md:pt-16">
        {/* Left — copy */}
        <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
          <span className="rounded-full border border-[color:var(--color-primary)]/30 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary-dark)] backdrop-blur">
            {t('eyebrow')}
          </span>
          <h2 className="max-w-xl break-keep text-4xl font-semibold leading-[1.2] text-[color:var(--color-text)] md:text-5xl lg:text-6xl">
            {t('title')}
          </h2>
        </div>

        {/* Right — phone mockup with the discover card */}
        <div className="relative flex justify-center md:justify-end">
          <PhoneFrame>
            <DiscoverCardMockup />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/**
 * Mirrors the real discover screen (haru_FE/src/components/discover/SwipeCard).
 * Background photo is blurred until the user listens to the voice intro — the
 * "slow dating" core value is visible here, before reading any copy below.
 */
function DiscoverCardMockup() {
  const t = useTranslations('hero.mockup');
  return (
    <div className="relative h-full w-full">
      {/* Blurred photo stand-in — abstract gradient so we don't ship a stock
         portrait that implies a real user. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, #FFCBA4 0%, #F6B5C8 35%, #B8A1C8 70%, #8A5A8C 100%)',
          filter: 'blur(18px)',
        }}
      />
      <div className="absolute inset-0 bg-black/15" />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-7 flex items-center justify-between px-5">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/90">
          haru
        </span>
        <span className="rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          {t('cardLabel')}
        </span>
      </div>

      {/* Big play button — the visual anchor for "listen first" */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute -inset-4 animate-ping rounded-full bg-white/40" />
          <button
            type="button"
            aria-label="play voice intro"
            className="relative grid h-20 w-20 place-items-center rounded-full bg-white text-[color:var(--color-primary-dark)] shadow-[0_18px_40px_-12px_rgba(58,35,64,0.5)]"
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom info card */}
      <div className="absolute inset-x-4 bottom-6 rounded-2xl bg-white/95 p-4 shadow-[0_10px_30px_-10px_rgba(58,35,64,0.35)] backdrop-blur">
        <div className="flex items-baseline justify-between">
          <p className="text-base font-semibold text-[color:var(--color-text)]">
            {t('name')}
          </p>
          <p className="text-xs text-[color:var(--color-text-secondary)]">
            {t('distance')}
          </p>
        </div>
        <p className="mt-1 break-keep text-sm leading-snug text-[color:var(--color-text-secondary)]">
          {t('intro')}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-1.5 flex-1 rounded-full bg-[color:var(--color-border)]">
            <span className="block h-full w-1/3 rounded-full bg-[color:var(--color-primary)]" />
          </span>
          <span className="text-[10px] font-medium text-[color:var(--color-text-secondary)]">
            0:04 / 0:12
          </span>
        </div>
      </div>
    </div>
  );
}
