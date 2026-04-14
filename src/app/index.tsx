import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const { isAuthenticated, hasProfile } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasProfile) {
    return <Redirect href="/(main)/setup/profile" />;
  }

  return <Redirect href="/(main)/(tabs)/discover" />;
}
