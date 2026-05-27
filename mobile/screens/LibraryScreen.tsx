import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

const PLATFORMS = ['الكل', 'Facebook', 'Instagram', 'TikTok', 'Snapchat', 'Google'];

export default function LibraryScreen() {
  const [creatives, setCreatives] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [platform, setPlatform] = useState('الكل');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await api.creatives();
      setCreatives(data as any[]);
      setFiltered(data as any[]);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (platform === 'الكل') setFiltered(creatives);
    else setFiltered(creatives.filter((c) => c.platform === platform));
  }, [platform, creatives]);

  async function handleDelete(id: number) {
    Alert.alert('حذف الإعلان', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive',
        onPress: async () => {
          try { await api.deleteCreative(id); load(); } catch {}
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Platform filter */}
      <FlatList
        horizontal
        data={PLATFORMS}
        keyExtractor={(p) => p}
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, platform === item && styles.filterChipActive]}
            onPress={() => setPlatform(item)}
          >
            <Text style={[styles.filterChipText, platform === item && styles.filterChipTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyText}>لا توجد إعلانات</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id.toString()}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onLongPress={() => handleDelete(item.id)}
              activeOpacity={0.85}
            >
              {item.imageData ? (
                <Image
                  source={{ uri: `data:image/png;base64,${item.imageData}` }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Text style={{ fontSize: 32 }}>
                    {item.status === 'generating' ? '⏳' : '🎨'}
                  </Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.badge, { backgroundColor: platformColor(item.platform) + '22' }]}>
                    <Text style={[styles.badgeText, { color: platformColor(item.platform) }]}>{item.platform}</Text>
                  </View>
                  {item.isFavorite && <Text style={styles.star}>⭐</Text>}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function platformColor(p: string) {
  const map: Record<string, string> = {
    Facebook: '#1877F2', Instagram: '#E1306C', TikTok: '#000000',
    Snapchat: '#FFFC00', Google: '#4285F4', Twitter: '#1DA1F2',
  };
  return map[p] || Colors.primary;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: { maxHeight: 56, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  card: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: {
    width: '100%', height: 120,
    backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6, textAlign: 'right' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  star: { fontSize: 12 },
});
