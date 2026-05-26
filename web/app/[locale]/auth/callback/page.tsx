import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isAppLocale } from '@/i18n/routing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'authCallback' });
  return {
    title: t('title'),
    description: t('body'),
    robots: { index: false, follow: false },
  };
}

export default async function AuthCallbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'authCallback' });

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <div className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
        {t('badge')}
      </div>
      <h1 className="break-keep text-2xl font-semibold md:text-4xl">{t('title')}</h1>
      <p className="max-w-md break-keep text-zinc-400">{t('body')}</p>
      <p className="break-keep text-xs text-zinc-500">{t('hint')}</p>
    </main>
  );
}
