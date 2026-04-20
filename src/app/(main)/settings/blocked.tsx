import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { colors, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import * as blockService from '@/services/block';
import type { BlockListItem } from '@/types';

export default function BlockedUsersScreen() {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState<BlockListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await blockService.getBlockList();
      setBlocked(data);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (item: BlockListItem) => {
    Alert.alert(
      t('blocked.unblock'),
      t('blocked.unblockConfirm', { name: item.profile.display_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('blocked.unblock'),
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
        <Text style={styles.unblockText}>{t('blocked.unblock')}</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('blocked.title') }} />
      <FlatList
        data={blocked}
        renderItem={renderItem}
        keyExtractor={(item) => item.blocked_id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t('blocked.noBlockedUsers')}</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginTop: 10,
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    ...shadows.soft,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.error,
  },
  unblockText: {
    fontSize: 13,
    color: colors.error,
    fontFamily: fonts.semibold,
  },
  separator: {
    height: 0,
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
