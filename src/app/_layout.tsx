import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { registerOnSessionExpired } from '@/services/api';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import '@/i18n';

// Wire the api.ts session-expired hook once at module load so the
// service can call logout() without importing the zustand store
// (avoids a circular dependency).
registerOnSessionExpired(() => useAuthStore.getState().logout());

export default function RootLayout() {
  const { isLoading, tryAutoLogin } = useAuthStore();

  useEffect(() => {
    tryAutoLogin();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}
