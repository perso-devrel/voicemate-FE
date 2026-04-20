import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import { formatRelativeTime } from '@/utils/age';
import type { MatchListItem } from '@/types';

interface MatchItemProps {
  item: MatchListItem;
  onPress: () => void;
}

export function MatchItem({ item, onPress }: MatchItemProps) {
  const { t } = useTranslation();
  const partner = item.partner;

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Avatar uri={partner?.photos[0]} size={52} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {partner?.display_name ?? t('matches.unknown')}
          </Text>
          {item.last_message && (
            <Text style={styles.time}>
              {formatRelativeTime(item.last_message.created_at)}
            </Text>
          )}
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message?.original_text ?? t('matches.startConversation')}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: colors.text,
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.white,
  },
});
