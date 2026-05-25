import { useTranslations } from 'next-intl';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.voicemate.app';

export default function AppStoreCTA() {
  const t = useTranslations('cta');
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 md:pb-32">
      <div className="relative overflow-hidden rounded-[40px] border border-[color:var(--color-border)] bg-white p-10 text-center shadow-glow md:p-16">
        <span className="aura" aria-hidden />
        <h2 className="break-keep text-3xl font-semibold text-[color:var(--color-text)] md:text-4xl lg:text-5xl">
          {t('title')}
        </h2>
        <div className="mt-8 flex justify-center">
          <a
            href={PLAY_STORE_URL}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-8 py-3.5 font-semibold text-white shadow-[0_12px_30px_-10px_rgba(226,122,160,0.6)] transition hover:scale-[1.02]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 20.5V3.5a1 1 0 011.5-.87l13 7.5a1 1 0 010 1.74l-13 7.5A1 1 0 013 20.5z" />
            </svg>
            {t('playStore')}
          </a>
        </div>
        <p className="mt-6 text-xs text-[color:var(--color-text-light)]">
          {t('disclaimer')}
        </p>
      </div>
    </section>
  );
}
