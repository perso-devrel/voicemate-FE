import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

export default function MainLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup/step1" />
      <Stack.Screen name="setup/step2" />
      <Stack.Screen name="setup/step3" />
      <Stack.Screen name="setup/step4" />
      <Stack.Screen name="setup/step5" />
      <Stack.Screen name="setup/profile" />
      <Stack.Screen name="setup/voice" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/edit-profile" />
      <Stack.Screen name="settings/edit-interests" />
      <Stack.Screen name="settings/edit-bio" />
      <Stack.Screen
        name="chat/[matchId]"
        options={{
          headerShown: true,
          headerBackTitle: 'Back',
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontFamily: fonts.bold,
            color: colors.text,
            fontSize: 19,
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
