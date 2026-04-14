import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import * as blockService from '@/services/block';
import type { BlockListItem } from '@/types';

export default function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState<BlockListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await blockService.getBlockList();
      setBlocked(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (item: BlockListItem) => {
    Alert.alert(
      'Unblock',
      `Unblock ${item.profile.display_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            await blockService.unblockUser(item.blocked_id);
            setBlocked((prev) => prev.filter((b) => b.blocked_id !== item.blocked_id));
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockListItem }) => (
    <View style={styles.row}>
      <Avatar uri={item.profile.photos[0]} size={44} />
      <Text style={styles.name}>{item.profile.display_name}</Text>
      <Pressable onPress={() => handleUnblock(item)} style={styles.unblockBtn}>
        <Text style={styles.unblockText}>Unblock</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Blocked Users' }} />
      <FlatList
        data={blocked}
        renderItem={renderItem}
        keyExtractor={(item) => item.blocked_id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No blocked users</Text>
            </View>
          )
        }
        contentContainerStyle={blocked.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        style={styles.list}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  unblockText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
