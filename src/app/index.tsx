import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { isAuthenticated, hasProfile } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Profile INSERT only happens at the new wizard position 2 (photos step,
  // file step5.tsx). Reloading anywhere before that → no row in BE → start
  // the wizard from scratch. Reloading anywhere after → row exists → enter
  // the app; voice clone / voice intro are skippable and have in-app nudges.
  if (!hasProfile) {
    return <Redirect href="/(main)/setup/step1" />;
  }

  return <Redirect href="/(main)/(tabs)/discover" />;
}
