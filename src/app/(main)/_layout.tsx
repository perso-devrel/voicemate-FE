import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function MainLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup/profile" />
      <Stack.Screen name="setup/voice" />
      <Stack.Screen
        name="chat/[matchId]"
        options={{ headerShown: true, headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
