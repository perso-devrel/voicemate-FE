import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useDiscover } from '@/hooks/useDiscover';
import { colors } from '@/constants/colors';

export default function DiscoverScreen() {
  const { candidates, loading, error, loadCandidates, handleSwipe } = useDiscover();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const onSwipe = async (direction: 'like' | 'pass') => {
    const candidate = candidates[currentIndex];
    if (!candidate) return;

    const res = await handleSwipe(candidate.id, direction);

    if (res?.match) {
      Alert.alert('Match!', `You matched with ${candidate.display_name}!`);
    }

    setCurrentIndex((prev) => prev + 1);

    // Prefetch more when running low
    if (currentIndex >= candidates.length - 3) {
      loadCandidates();
      setCurrentIndex(0);
    }
  };

  if (loading && candidates.length === 0) {
    return <LoadingScreen />;
  }

  const current = candidates[currentIndex];

  if (!current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No more profiles</Text>
        <Text style={styles.emptyText}>Check back later for new people</Text>
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
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
