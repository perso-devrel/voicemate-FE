import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Alert,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MatchItem } from '@/components/matches/MatchItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhotoBackground } from '@/components/ui/PhotoBackground';
import { useMatches } from '@/hooks/useMatches';
import * as reportService from '@/services/report';
import { ApiRequestError } from '@/services/api';
import { colors, radii, shadows } from '@/constants/colors';
import { fonts } from '@/constants/fonts';
import type { MatchListItem, ReportReason } from '@/types';

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'inappropriate',
  'fake_profile',
  'voice_impersonation',
  'harassment',
  'underage',
  'other',
];

export default function MatchesScreen() {
  const { t } = useTranslation();
  const { matches, loading, hasMore, loadMatches, loadMore, handleBlock } = useMatches();
  const [actionTarget, setActionTarget] = useState<MatchListItem | null>(null);
  const [reportTarget, setReportTarget] = useState<MatchListItem | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const renderItem = useCallback(({ item }: { item: MatchListItem }) => (
    <MatchItem
      item={item}
      onPress={() =>
        router.push({
          pathname: '/(main)/chat/[matchId]',
          params: {
            matchId: item.match_id,
            partnerPhoto: item.partner?.photos[0] ?? '',
            partnerName: item.partner?.display_name ?? '',
          },
        })
      }
      onLongPress={() => setActionTarget(item)}
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

  const closeActions = () => setActionTarget(null);

  const closeReport = () => {
    setReportTarget(null);
    setReportReason(null);
    setReportDescription('');
    setReportSubmitting(false);
  };

  const handleMutePress = () => {
    closeActions();
    Alert.alert(t('matches.actions.mute'), t('matches.actions.muteComingSoon'));
  };

  const handleUnmatchPress = () => {
    const target = actionTarget;
    if (!target?.partner?.id) return;
    const partnerId = target.partner.id;
    const name = target.partner.display_name ?? t('matches.unknown');
    closeActions();
    Alert.alert(
      t('matches.actions.unmatch'),
      t('matches.actions.unmatchConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('matches.actions.unmatch'),
          style: 'destructive',
          onPress: async () => {
            try {
              await handleBlock(target.match_id, partnerId);
            } catch (e: any) {
              Alert.alert(t('common.error'), e.message);
            }
          },
        },
      ],
    );
  };

  const handleReportPress = () => {
    const target = actionTarget;
    if (!target?.partner?.id) return;
    closeActions();
    setReportTarget(target);
  };

  const handleReportSubmit = async () => {
    const target = reportTarget;
    if (!target?.partner?.id || !reportReason || reportSubmitting) return;
    const partnerId = target.partner.id;
    const matchId = target.match_id;
    const description = reportDescription.trim();
    setReportSubmitting(true);
    try {
      await reportService.reportUser({
        reported_id: partnerId,
        reason: reportReason,
        description: description.length > 0 ? description : undefined,
      });
      // BE auto-unmatches & blocks on report; mirror that locally.
      // (We intentionally don't re-call /api/block — the report route already
      // creates the block + soft-deletes the match in one go.)
      // Drop the match from the local list so it disappears immediately.
      // Direct setMatches isn't exposed by useMatches; reload is cheap here.
      closeReport();
      Alert.alert(t('matches.report.successTitle'), t('matches.report.successBody'));
      loadMatches();
    } catch (e: any) {
      const msg =
        e instanceof ApiRequestError && e.status === 409
          ? t('matches.report.alreadyReported')
          : e?.message ?? t('common.error');
      Alert.alert(t('common.error'), msg);
      setReportSubmitting(false);
    }
  };

  const partnerName = actionTarget?.partner?.display_name ?? t('matches.unknown');
  const reportPartnerName = reportTarget?.partner?.display_name ?? t('matches.unknown');

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

      <Modal
        visible={actionTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeActions}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeActions} />
          <View style={styles.sheet}>
            <Text style={styles.sheetHeader} numberOfLines={1}>
              {partnerName}
            </Text>
            <View style={styles.sheetDivider} />
            <Pressable
              style={({ pressed }) => [styles.sheetItem, pressed && styles.sheetItemPressed]}
              onPress={handleMutePress}
            >
              <Ionicons name="notifications-off-outline" size={20} color={colors.text} />
              <Text style={styles.sheetItemText}>{t('matches.actions.mute')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.sheetItem, pressed && styles.sheetItemPressed]}
              onPress={handleReportPress}
            >
              <Ionicons name="flag-outline" size={20} color={colors.text} />
              <Text style={styles.sheetItemText}>{t('matches.actions.report')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.sheetItem, pressed && styles.sheetItemPressed]}
              onPress={handleUnmatchPress}
            >
              <Ionicons name="heart-dislike-outline" size={20} color={colors.error} />
              <Text style={[styles.sheetItemText, styles.sheetItemDanger]}>
                {t('matches.actions.unmatch')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reportTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={closeReport}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeReport} />
          <View style={styles.reportCard}>
            <View style={styles.reportHeaderRow}>
              <Text style={styles.reportTitle}>{t('matches.report.title')}</Text>
              <Pressable
                onPress={closeReport}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.reportSubtitle}>
              {t('matches.report.subtitle', { name: reportPartnerName })}
            </Text>
            <ScrollView style={styles.reportReasonsScroll} keyboardShouldPersistTaps="handled">
              {REPORT_REASONS.map((reason) => {
                const selected = reportReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => setReportReason(reason)}
                    style={({ pressed }) => [
                      styles.reasonRow,
                      selected && styles.reasonRowSelected,
                      pressed && styles.reasonRowPressed,
                    ]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? colors.primary : colors.textLight}
                    />
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                      {t(`matches.report.reasons.${reason}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              style={styles.reportTextarea}
              placeholder={t('matches.report.descriptionPlaceholder')}
              placeholderTextColor={colors.textLight}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              maxLength={500}
            />
            <Text style={styles.reportNotice}>{t('matches.report.sideEffectNotice')}</Text>
            <Pressable
              onPress={handleReportSubmit}
              disabled={!reportReason || reportSubmitting}
              style={({ pressed }) => [
                styles.reportSubmit,
                (!reportReason || reportSubmitting) && styles.reportSubmitDisabled,
                pressed && reportReason && !reportSubmitting && styles.reportSubmitPressed,
              ]}
            >
              <Text style={styles.reportSubmitText}>{t('matches.report.submit')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  sheetHeader: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 0.3,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    textAlign: 'center',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sheetItemPressed: {
    backgroundColor: colors.surface,
  },
  sheetItemText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
    letterSpacing: 0.2,
  },
  sheetItemDanger: {
    color: colors.error,
  },
  reportCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: 18,
    ...shadows.card,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 0.3,
  },
  reportSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 18,
  },
  reportReasonsScroll: {
    maxHeight: 280,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.md,
  },
  reasonRowSelected: {
    backgroundColor: colors.surface,
  },
  reasonRowPressed: {
    opacity: 0.85,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    letterSpacing: 0.2,
  },
  reasonTextSelected: {
    color: colors.primaryDark,
  },
  reportTextarea: {
    marginTop: 10,
    minHeight: 64,
    maxHeight: 100,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text,
    textAlignVertical: 'top',
  },
  reportNotice: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  reportSubmit: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: radii.pill,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitDisabled: {
    opacity: 0.4,
  },
  reportSubmitPressed: {
    transform: [{ scale: 0.98 }],
  },
  reportSubmitText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: 0.3,
  },
});
