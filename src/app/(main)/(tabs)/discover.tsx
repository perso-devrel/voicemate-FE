import { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { PhotoBackground } from '@/components/ui/PhotoBackground';
import { useDiscover } from '@/hooks/useDiscover';
import { useAuthStore } from '@/stores/authStore';
import { colors, gradients, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const {
    candidates,
    loading,
    loadCandidates,
    handleSwipe,
    dailyCountReady,
    dailyLimitReached,
  } = useDiscover();

  const voiceReady = profile?.voice_clone_status === 'ready';
  const voiceProcessing = profile?.voice_clone_status === 'processing';
  const bioReady = Boolean(profile?.voice_intro && profile.voice_intro.trim().length > 0);
  const gated = !voiceReady || !bioReady;

  // Wait for the daily count to hydrate before the first fetch so we don't
  // overshoot the quota by fetching against a stale count of 0.
  useEffect(() => {
    if (!gated && dailyCountReady) loadCandidates();
  }, [gated, dailyCountReady, loadCandidates]);

  if (gated) {
    return (
      <PhotoBackground variant="app">
        <GateScreen voiceReady={voiceReady} voiceProcessing={voiceProcessing} t={t} />
      </PhotoBackground>
    );
  }

  const onSwipe = async (direction: 'like' | 'pass') => {
    const candidate = candidates[0];
    if (!candidate) return;

    const res = await handleSwipe(candidate.id, direction);

    if (res?.match) {
      Alert.alert(t('discover.match'), t('discover.matchedWith', { name: candidate.display_name }));
    }
  };

  if (loading && candidates.length === 0) {
    return <LoadingScreen />;
  }

  const current = candidates[0];

  const refreshControl = (
    <RefreshControl
      refreshing={loading}
      onRefresh={() => loadCandidates()}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  if (!current) {
    const titleKey = dailyLimitReached ? 'discover.dailyLimitTitle' : 'discover.noMoreProfiles';
    const textKey = dailyLimitReached ? 'discover.dailyLimitText' : 'discover.checkBackLater';
    const iconName = dailyLimitReached ? 'time-outline' : 'sparkles';
    return (
      <PhotoBackground variant="app">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.empty}
          refreshControl={dailyLimitReached ? undefined : refreshControl}
        >
          <LinearGradient
            colors={[...gradients.glow]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.emptyHalo, shadows.glow]}
          >
            <Ionicons name={iconName} size={38} color={colors.white} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>{t(titleKey)}</Text>
          <Text style={styles.emptyText}>{t(textKey)}</Text>
        </ScrollView>
      </PhotoBackground>
    );
  }

  return (
    <PhotoBackground variant="app">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={refreshControl}
      >
        <SwipeCard
          key={current.id}
          candidate={current}
          onLike={() => onSwipe('like')}
          onPass={() => onSwipe('pass')}
        />
      </ScrollView>
    </PhotoBackground>
  );
}

function GateScreen({
  voiceReady,
  voiceProcessing,
  t,
}: {
  voiceReady: boolean;
  voiceProcessing: boolean;
  t: (key: string) => string;
}) {
  // Guide the user through the missing step in the natural signup order:
  // voice first, bio next.
  const goVoice = () => router.push('/(main)/setup/voice');
  const goBio = () => router.push('/(main)/setup/profile');

  if (voiceProcessing) {
    return (
      <View style={styles.empty}>
        <LinearGradient
          colors={[...gradients.glow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.emptyHalo, shadows.glow]}
        >
          <Ionicons name="hourglass-outline" size={38} color={colors.white} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>{t('discover.voiceProcessingTitle')}</Text>
        <Text style={styles.emptyText}>{t('discover.voiceProcessingHint')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <LinearGradient
        colors={[...gradients.glow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.emptyHalo, shadows.glow]}
      >
        <Ionicons
          name={voiceReady ? 'create-outline' : 'mic-outline'}
          size={38}
          color={colors.white}
        />
      </LinearGradient>
      <Text style={styles.emptyTitle}>{t('discover.lockedTitle')}</Text>
      <Text style={styles.emptyText}>
        {voiceReady ? t('discover.lockedBioHint') : t('discover.lockedVoiceHint')}
      </Text>
      <Button
        title={voiceReady ? t('discover.lockedGoBio') : t('discover.lockedGoVoice')}
        onPress={voiceReady ? goBio : goVoice}
        style={styles.ctaBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  empty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyHalo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 0.3,
    textAlign: 'center',
    textShadowColor: 'rgba(255,244,238,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 21,
    textShadowColor: 'rgba(255,244,238,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  ctaBtn: {
    marginTop: 28,
    paddingHorizontal: 36,
    borderRadius: radii.pill,
  },
});
