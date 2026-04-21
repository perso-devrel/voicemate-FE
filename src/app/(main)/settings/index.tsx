import { View, StyleSheet, Alert, Pressable, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { WizardHeader } from '@/components/setup/WizardHeader';
import { useAuthStore } from '@/stores/authStore';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

function MenuCardButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuShell, pressed && styles.menuPressed]}
    >
      <LinearGradient
        colors={[...gradients.blush]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.menuInner}
      >
        <Text style={styles.menuText}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </LinearGradient>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <WizardHeader
        step={1}
        total={1}
        title={t('settings.title')}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}>
        <MenuCardButton
          label={t('profile.blockedUsers')}
          onPress={() => router.push('/(main)/settings/blocked')}
        />
        <Button
          title={t('common.logout')}
          variant="danger"
          onPress={handleLogout}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 10 },
  menuShell: { borderRadius: radii.lg, ...shadows.soft },
  menuInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  menuText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.text,
    letterSpacing: 0.2,
  },
  menuPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
