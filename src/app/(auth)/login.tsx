import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Redirect } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, emailLogin, emailSignup, isAuthenticated, hasProfile } = useAuthStore();
  const [loadingAction, setLoadingAction] = useState<'email' | 'google' | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      handleGoogleLogin(idToken);
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoadingAction('google');
    try {
      await login(idToken);
    } catch (e: any) {
      Alert.alert(t('auth.loginFailed'), e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGooglePress = () => {
    if (loadingAction) return;
    promptAsync();
  };

  const handleEmailAuth = async () => {
    if (loadingAction) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('auth.enterEmailAndPassword'));
      return;
    }
    setLoadingAction('email');
    try {
      if (isSignup) {
        await emailSignup(email.trim(), password);
      } else {
        await emailLogin(email.trim(), password);
      }
    } catch (e: any) {
      Alert.alert(isSignup ? t('auth.signupFailed') : t('auth.loginFailed'), e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  if (isAuthenticated) {
    return <Redirect href={hasProfile ? '/(main)/(tabs)/discover' : '/(main)/setup/profile'} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.appName')}</Text>
        <Text style={styles.subtitle}>{t('auth.tagline')}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button
            title={isSignup ? t('auth.signup') : t('auth.login')}
            onPress={handleEmailAuth}
            loading={loadingAction === 'email'}
          />
          <Pressable onPress={() => setIsSignup((v) => !v)}>
            <Text style={styles.toggleText}>
              {isSignup ? t('auth.toggleToLogin') : t('auth.toggleToSignup')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('auth.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title={t('auth.continueWithGoogle')}
          onPress={handleGooglePress}
          loading={loadingAction === 'google'}
          disabled={!request}
          style={styles.googleBtn}
        />
        {__DEV__ && (
          <Button
            title={t('auth.devSkipLogin')}
            variant="outline"
            onPress={async () => await useAuthStore.getState().devSkipLogin()}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  bottom: {
    gap: 12,
  },
  form: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  toggleText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  googleBtn: {
    backgroundColor: colors.text,
  },
});
