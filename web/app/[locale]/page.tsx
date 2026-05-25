import { setRequestLocale } from 'next-intl/server';
import Hero from '@/components/Hero';
import CrossLanguageSection from '@/components/CrossLanguageSection';
import SlowDatingSection from '@/components/SlowDatingSection';
import AppStoreCTA from '@/components/AppStoreCTA';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <Hero />
      <CrossLanguageSection />
      <SlowDatingSection />
      <AppStoreCTA />
    </main>
  );
}
