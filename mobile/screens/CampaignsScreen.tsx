import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

export default function CampaignsScreen() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [phones, setPhones] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const data = await api.campaigns();
      setCampaigns(data as any[]);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function createCampaign() {
    if (!name || !message || !phones) {
      return Alert.alert('تنبيه', 'يرجى ملء جميع الحقول المطلوبة');
    }
    const contacts = phones.split('\n').map((p) => p.trim()).filter(Boolean).map((phone) => ({ phone }));
    if (contacts.length === 0) return Alert.alert('تنبيه', 'أضف على الأقل رقماً واحداً');
    setCreating(true);
    try {
      await api.createCampaign({ name, message, type, contacts });
      setShowModal(false);
      setName(''); setMessage(''); setPhones('');
      load();
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
    }
    setCreating(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.newBtnText}>+ حملة جديدة</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>الحملات</Text>
      </View>

      {campaigns.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.emptyText}>لا توجد حملات بعد</Text>
          <Text style={styles.emptySubText}>أنشئ حملتك الأولى الآن</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(c) => c.id.toString()}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.typeBadge, { backgroundColor: item.type === 'whatsapp' ? Colors.whatsapp + '22' : Colors.sms + '22' }]}>
                  <Text style={[styles.typeText, { color: item.type === 'whatsapp' ? Colors.whatsapp : Colors.sms }]}>
                    {item.type === 'whatsapp' ? '💬 واتساب' : '📱 SMS'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                </View>
              </View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
              <View style={styles.cardStats}>
                <Stat icon="👥" label={`${item.totalContacts || 0} جهة اتصال`} />
                <Stat icon="✅" label={`${item.sentCount || 0} مُرسل`} />
                {item.failedCount > 0 && <Stat icon="❌" label={`${item.failedCount} فشل`} color={Colors.error} />}
              </View>
            </View>
          )}
        />
      )}

      {/* New Campaign Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>إلغاء</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>حملة جديدة</Text>
              <TouchableOpacity onPress={createCampaign} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.saveText}>إنشاء</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>نوع الحملة</Text>
            <View style={styles.typeRow}>
              {(['whatsapp', 'sms'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                    {t === 'whatsapp' ? '💬 واتساب' : '📱 SMS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>اسم الحملة *</Text>
            <TextInput style={styles.input} placeholder="مثال: حملة العيد 2025" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} textAlign="right" />

            <Text style={styles.fieldLabel}>نص الرسالة *</Text>
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="اكتب رسالتك هنا..." placeholderTextColor={Colors.textMuted} value={message} onChangeText={setMessage} multiline textAlign="right" />

            <Text style={styles.fieldLabel}>أرقام الهواتف * (رقم في كل سطر)</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
              placeholder={'+962799000000\n+9665000000000'}
              placeholderTextColor={Colors.textMuted}
              value={phones}
              onChangeText={setPhones}
              multiline
              keyboardType="phone-pad"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Stat({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: 12 }}>{icon}</Text>
      <Text style={{ fontSize: 12, color: color || Colors.textSecondary }}>{label}</Text>
    </View>
  );
}

function statusColor(s: string) {
  return s === 'sent' ? Colors.success : s === 'sending' ? Colors.warning : s === 'failed' ? Colors.error : Colors.textMuted;
}
function statusLabel(s: string) {
  return s === 'sent' ? 'مُرسلة' : s === 'sending' ? 'جارٍ الإرسال' : s === 'scheduled' ? 'مجدولة' : s === 'failed' ? 'فشلت' : 'مسودة';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  heading: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  newBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySubText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, textAlign: 'right' },
  cardMessage: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, textAlign: 'right', lineHeight: 20 },
  cardStats: { flexDirection: 'row', gap: 16 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  cancelText: { fontSize: 16, color: Colors.textSecondary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textAlign: 'right' },
  input: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 18,
  },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  typeBtnTextActive: { color: '#fff' },
});
