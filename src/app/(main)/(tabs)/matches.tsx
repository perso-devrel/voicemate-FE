import { useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { MatchItem } from '@/components/matches/MatchItem';
import { useMatches } from '@/hooks/useMatches';
import { colors } from '@/constants/colors';
import type { MatchListItem } from '@/types';

export default function MatchesScreen() {
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
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptyText}>Start swiping to find your match!</Text>
      </View>
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
