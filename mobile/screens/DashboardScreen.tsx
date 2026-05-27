import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

interface StatCard { label: string; value: string | number; icon: string; color: string }

export default function DashboardScreen({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [s, c] = await Promise.all([api.stats(), api.creatives()]);
      setStats(s);
      setCreatives((c as any[]).slice(0, 4));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const statCards: StatCard[] = [
    { label: 'الإعلانات', value: stats?.totalCreatives ?? '—', icon: '🎨', color: Colors.primary },
    { label: 'العلامات التجارية', value: stats?.totalBrands ?? '—', icon: '🏷️', color: '#EC4899' },
    { label: 'المفضلة', value: stats?.favoriteCreatives ?? '—', icon: '⭐', color: '#F59E0B' },
    { label: 'الخطة', value: user?.plan?.toUpperCase() ?? 'FREE', icon: '✨', color: Colors.success },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>أهلاً،</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <View style={styles.planBadge}>
          <Text style={styles.planText}>{(user?.plan ?? 'free').toUpperCase()}</Text>
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.sectionTitle}>الإحصائيات</Text>
      <View style={styles.statsGrid}>
        {statCards.map((s, i) => (
          <View key={i} style={[styles.statCard, { borderTopColor: s.color }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Creatives */}
      <Text style={styles.sectionTitle}>أحدث الإعلانات</Text>
      {creatives.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyText}>لم تنشئ أي إعلانات بعد</Text>
          <Text style={styles.emptySubText}>ابدأ من تبويب الاستوديو</Text>
        </View>
      ) : (
        creatives.map((c) => (
          <View key={c.id} style={styles.creativeRow}>
            <View style={[styles.creativeDot, { backgroundColor: statusColor(c.status) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.creativeTitle} numberOfLines={1}>{c.title}</Text>
              <Text style={styles.creativeSub}>{c.platform} · {c.formatName}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(c.status) + '22' }]}>
              <Text style={[styles.statusText, { color: statusColor(c.status) }]}>{statusLabel(c.status)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function statusColor(s: string) {
  return s === 'ready' ? Colors.success : s === 'generating' ? Colors.warning : Colors.error;
}
function statusLabel(s: string) {
  return s === 'ready' ? 'جاهز' : s === 'generating' ? 'يُنشأ...' : 'خطأ';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, gap: 12 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  greeting: { fontSize: 13, color: Colors.textSecondary },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  planBadge: {
    backgroundColor: Colors.primary + '22', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary + '44',
  },
  planText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14, textAlign: 'right' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surface,
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 32,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  emptySubText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  creativeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  creativeDot: { width: 10, height: 10, borderRadius: 5 },
  creativeTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  creativeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, textAlign: 'right' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
