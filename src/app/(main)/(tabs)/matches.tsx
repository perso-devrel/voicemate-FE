import { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MatchItem } from '@/components/matches/MatchItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhotoBackground } from '@/components/ui/PhotoBackground';
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
        iconName="sparkles-outline"
        title={t('matches.noMatches')}
        subtitle={t('matches.startSwiping')}
        ctaLabel={t('matches.goToDiscover')}
        onCtaPress={() => router.push('/(main)/(tabs)/discover')}
      />
    );
  };

  return (
    <PhotoBackground variant="app">
      <FlatList
        data={matches}
        renderItem={renderItem}
        keyExtractor={(item) => item.match_id}
        contentContainerStyle={
          matches.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={renderEmpty}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadMatches}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.list}
      />
    </PhotoBackground>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    flex: 1,
  },
});
