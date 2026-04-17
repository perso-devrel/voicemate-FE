import { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MatchItem } from '@/components/matches/MatchItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMatches } from '@/hooks/useMatches';
import { colors } from '@/constants/colors';
import type { MatchListItem } from '@/types';

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { matches, loading, hasMore, loadMatches, loadMore } = useMatches();

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const renderItem = useCallback(({ item }: { item: MatchListItem }) => (
    <MatchItem
      item={item}
      onPress={() => router.push(`/(main)/chat/${item.match_id}`)}
    />
  ), []);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <EmptyState
        iconName="people-outline"
        title={t('matches.noMatches')}
        subtitle={t('matches.startSwiping')}
        ctaLabel={t('matches.goToDiscover')}
        onCtaPress={() => router.push('/(main)/(tabs)/discover')}
      />
    );
  };

  return (
    <FlatList
      data={matches}
      renderItem={renderItem}
      keyExtractor={(item) => item.match_id}
      contentContainerStyle={matches.length === 0 ? styles.emptyContainer : undefined}
      ListEmptyComponent={renderEmpty}
      onEndReached={hasMore ? loadMore : undefined}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadMatches} />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
  },
});
