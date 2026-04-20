import { useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useDiscover } from '@/hooks/useDiscover';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { candidates, loading, loadCandidates, handleSwipe } = useDiscover();

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const onSwipe = async (direction: 'like' | 'pass') => {
    const candidate = candidates[0];
    if (!candidate) return;

    const res = await handleSwipe(candidate.id, direction);

    if (res?.match) {
      Alert.alert(t('discover.match'), t('discover.matchedWith', { name: candidate.display_name }));
    }

    // handleSwipe removes the candidate from the array,
    // so the next candidate slides into the same index.
  };

  if (loading && candidates.length === 0) {
    return <LoadingScreen />;
  }

  const current = candidates[0];

  if (!current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('discover.noMoreProfiles')}</Text>
        <Text style={styles.emptyText}>{t('discover.checkBackLater')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SwipeCard
        candidate={current}
        onLike={() => onSwipe('like')}
        onPass={() => onSwipe('pass')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
