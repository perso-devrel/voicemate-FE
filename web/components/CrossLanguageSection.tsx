import { useTranslations } from 'next-intl';
import PhoneFrame from './PhoneFrame';

/**
 * Core value 1: "언어의 벽은 없애되, 사람의 흔적은 지우지 않는다".
 * Visual = chat mockup with the sender writing in Korean and the receiver
 * seeing Japanese, with the same voice waveform attached. The mirrored
 * waveform under both bubbles is the visual claim that the audio identity
 * survives translation.
 */
export default function CrossLanguageSection() {
  const t = useTranslations('crossLanguage');

  return (
    <section className="relative overflow-hidden bg-dawn py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-2 md:gap-16">
        <div className="order-2 md:order-1">
          <PhoneFrame>
            <ChatMockup />
          </PhoneFrame>
        </div>
        <div className="order-1 flex flex-col gap-5 md:order-2">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--color-primary-dark)]">
            {t('eyebrow')}
          </span>
          <h2 className="break-keep text-3xl font-semibold leading-tight text-[color:var(--color-text)] md:text-4xl lg:text-5xl">
            {t('title')}
          </h2>
          <p className="break-keep text-base leading-relaxed text-[color:var(--color-text-secondary)] md:text-lg">
            {t('body')}
          </p>
        </div>
      </div>
    </section>
  );
}

function ChatMockup() {
  const t = useTranslations('crossLanguage.mockup');
  return (
    <div className="flex h-full w-full flex-col bg-[color:var(--color-bg)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[color:var(--color-border)] bg-white/90 px-4 py-3 pt-8 backdrop-blur">
        <div
          className="h-9 w-9 rounded-full"
          style={{
            background:
              'linear-gradient(135deg, #FFCBA4 0%, #F6B5C8 50%, #B8A1C8 100%)',
          }}
        />
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-text)]">
            {t('partnerName')}
          </p>
          <p className="text-[10px] text-[color:var(--color-text-secondary)]">
            {t('online')}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {/* My message (sent in KO) */}
        <div className="flex justify-end">
          <div className="max-w-[220px] rounded-2xl rounded-br-sm bg-primary-gradient px-4 py-3 text-white shadow-card">
            <p className="text-sm leading-snug">{t('mineText')}</p>
            <VoiceLine self />
            <p className="mt-1 text-right text-[10px] opacity-75">
              {t('mineLang')}
            </p>
          </div>
        </div>

        {/* Translation hint */}
        <div className="self-center rounded-full bg-white px-3 py-1 text-[10px] font-medium text-[color:var(--color-text-secondary)] shadow-sm">
          {t('translatedHint')}
        </div>

        {/* Same message — delivered to her in JA, my voice */}
        <div className="flex justify-end">
          <div className="max-w-[220px] rounded-2xl rounded-br-sm bg-white px-4 py-3 shadow-card ring-1 ring-[color:var(--color-border)]">
            <p className="text-sm leading-snug text-[color:var(--color-text)]">
              {t('translatedText')}
            </p>
            <VoiceLine />
            <p className="mt-1 text-right text-[10px] text-[color:var(--color-text-secondary)]">
              {t('translatedLang')}
            </p>
          </div>
        </div>

        {/* Caption */}
        <p className="mt-1 self-center text-center text-[10px] text-[color:var(--color-text-secondary)]">
          {t('caption')}
        </p>
      </div>
    </div>
  );
}

/**
 * Decorative waveform — 18 bars with varying heights, rendered identically
 * on both bubbles to visually claim "same voice across languages".
 */
function VoiceLine({ self = false }: { self?: boolean }) {
  const heights = [4, 8, 14, 10, 18, 22, 16, 12, 20, 14, 8, 16, 22, 18, 10, 14, 8, 4];
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill={self ? 'white' : 'var(--color-primary)'}
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <div className="flex flex-1 items-center gap-0.5">
        {heights.map((h, i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full ${
              self ? 'bg-white/80' : 'bg-[color:var(--color-primary)]'
            }`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className={`text-[9px] ${self ? 'text-white/80' : 'text-[color:var(--color-text-secondary)]'}`}>
        0:04
      </span>
    </div>
  );
}
