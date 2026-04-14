import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/stores/authStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function RootLayout() {
  const { isLoading, tryAutoLogin } = useAuthStore();

  useEffect(() => {
    tryAutoLogin();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
