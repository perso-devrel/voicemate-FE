import { View, Text, StyleSheet, Alert } from 'react-native';
import { Redirect } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, isAuthenticated, hasProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      handleLogin(idToken);
    }
  }, [response]);

  const handleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      await login(idToken);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Redirect href={hasProfile ? '/(main)/(tabs)/discover' : '/(main)/setup/profile'} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VoiceMate</Text>
        <Text style={styles.subtitle}>Connect beyond language barriers</Text>
      </View>

      <View style={styles.bottom}>
        <Button
          title="Continue with Google"
          onPress={() => promptAsync()}
          loading={loading}
          disabled={!request}
          style={styles.googleBtn}
        />
        {__DEV__ && (
          <Button
            title="[DEV] Skip Login"
            variant="outline"
            onPress={async () => await useAuthStore.getState().devSkipLogin()}
          />
        )}
      </View>
    </View>
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
  googleBtn: {
    backgroundColor: colors.text,
  },
});
