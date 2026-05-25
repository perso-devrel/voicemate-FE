import { useTranslations } from 'next-intl';

/**
 * The core differentiator: slowness as design. Three stacked steps mirror
 * the README "비효율과 느림의 미학" idea — listen-first discovery,
 * voice-before-text in chat, photo unlock via roundtrip count. All three
 * rows share the same layout (copy left / visual right) so the eye doesn't
 * have to zigzag between sections.
 */
export default function SlowDatingSection() {
  const t = useTranslations('slowDating');

  const rows = [
    { key: 'discover', visual: <DiscoverVisual /> },
    { key: 'message', visual: <MessageVisual /> },
    { key: 'photo', visual: <PhotoVisual /> },
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--color-primary-dark)]">
          {t('eyebrow')}
        </span>
        <h2 className="mt-4 break-keep text-3xl font-semibold leading-tight text-[color:var(--color-text)] md:text-4xl lg:text-5xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl break-keep text-base leading-relaxed text-[color:var(--color-text-secondary)] md:text-lg">
          {t('subtitle')}
        </p>
      </div>

      <div className="mt-16 flex flex-col gap-10">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="grid items-center gap-8 md:grid-cols-2 md:gap-16"
          >
            {/* Copy — always on the left on desktop */}
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--color-primary-light)] px-3 py-1 text-xs font-semibold text-[color:var(--color-primary-dark)]">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[color:var(--color-primary)] text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {t(`${row.key}.label`)}
              </span>
              <h3 className="break-keep text-2xl font-semibold leading-snug text-[color:var(--color-text)] md:text-3xl">
                {t(`${row.key}.title`)}
              </h3>
              <p className="break-keep text-base leading-relaxed text-[color:var(--color-text-secondary)]">
                {t(`${row.key}.body`)}
              </p>
            </div>

            {/* Visual — always on the right on desktop */}
            <div className="relative flex justify-center">{row.visual}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------- Visuals (CSS-only, no images) ------- */

function DiscoverVisual() {
  return (
    <div className="relative h-72 w-64 overflow-hidden rounded-3xl shadow-glow ring-1 ring-black/5">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 40% 30%, #FFCBA4 0%, #F6B5C8 40%, #B8A1C8 80%)',
          filter: 'blur(22px)',
        }}
      />
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <span className="absolute -inset-4 animate-ping rounded-full bg-white/40" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full bg-white shadow-lg">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="var(--color-primary-dark)"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-2.5 text-center backdrop-blur">
        <p className="text-xs font-medium text-[color:var(--color-text-secondary)]">
          0:00 / 0:12
        </p>
      </div>
    </div>
  );
}

function MessageVisual() {
  return (
    <div className="flex w-72 flex-col gap-3">
      {/* Locked letter card */}
      <div className="rounded-3xl border border-[color:var(--color-border)] bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-primary-light)]">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="var(--color-primary-dark)"
            >
              <path d="M4 6l8 6 8-6v12H4z" />
              <path d="M4 6h16v2l-8 6-8-6z" opacity="0.4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[color:var(--color-text)]">
              새 메시지
            </p>
            <p className="text-xs text-[color:var(--color-text-secondary)]">
              탭하여 듣기
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--color-primary)] px-2 py-1 text-[10px] font-bold text-white">
            ▶
          </span>
        </div>
      </div>
      {/* After-listen reveal */}
      <div className="rounded-3xl bg-primary-gradient p-4 text-white shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          청취 완료 후 공개
        </p>
        <p className="mt-1 text-sm leading-snug">
          오늘 날씨 너무 좋네요, 산책하실래요?
        </p>
        <p className="mt-2 text-xs opacity-80">
          今日は天気がいいですね、散歩しませんか?
        </p>
      </div>
    </div>
  );
}

function PhotoVisual() {
  const stages = [
    { round: 0, blur: 24, label: '0회' },
    { round: 5, blur: 8, label: '5회' },
    { round: 10, blur: 0, label: '10회' },
  ];
  return (
    <div className="flex w-72 items-end justify-center gap-3">
      {stages.map((s) => (
        <div key={s.round} className="flex flex-col items-center gap-2">
          <div className="relative h-28 w-20 overflow-hidden rounded-2xl shadow-card ring-1 ring-black/5">
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, #FFCBA4 0%, #F6B5C8 50%, #B8A1C8 100%)',
                filter: `blur(${s.blur}px)`,
                transform: 'scale(1.2)',
              }}
            />
            <div className="absolute inset-0 bg-black/5" />
          </div>
          <p className="text-xs font-semibold text-[color:var(--color-text-secondary)]">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
