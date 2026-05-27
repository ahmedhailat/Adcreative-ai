import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

const PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Snapchat', 'Google', 'Twitter'];
const FORMATS: Record<string, { name: string; size: string }[]> = {
  Facebook: [{ name: 'Post', size: '1080x1080' }, { name: 'Story', size: '1080x1920' }],
  Instagram: [{ name: 'Post', size: '1080x1080' }, { name: 'Reel', size: '1080x1920' }],
  TikTok: [{ name: 'Video', size: '1080x1920' }],
  Snapchat: [{ name: 'Snap Ad', size: '1080x1920' }],
  Google: [{ name: 'Banner', size: '728x90' }, { name: 'Display', size: '300x250' }],
  Twitter: [{ name: 'Post', size: '1200x675' }],
};

type Step = 1 | 2 | 3;

export default function StudioScreen() {
  const [step, setStep] = useState<Step>(1);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [platform, setPlatform] = useState('Instagram');
  const [format, setFormat] = useState(FORMATS['Instagram'][0]);
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [creative, setCreative] = useState<any>(null);

  useEffect(() => {
    api.brands().then((b: any) => {
      setBrands(b);
      if (b.length > 0) setBrandId(b[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fmts = FORMATS[platform] || FORMATS['Instagram'];
    setFormat(fmts[0]);
  }, [platform]);

  async function generate() {
    if (!brandId || !productName) {
      return Alert.alert('تنبيه', 'يرجى اختيار علامة تجارية وإدخال اسم المنتج');
    }
    setGenerating(true);
    setStep(3);
    try {
      const c = await api.generateCreative({
        brandId, platform, formatSize: format.size, formatName: format.name,
        productName, productDescription: productDesc,
        targetAudience: audience, goal, mediaType: 'image',
      });
      // Poll until ready
      let result = c;
      while (result.status === 'generating') {
        await new Promise((r) => setTimeout(r, 2500));
        result = await api.creative(c.id);
      }
      setCreative(result);
    } catch (e: any) {
      Alert.alert('خطأ', e.message);
      setStep(2);
    }
    setGenerating(false);
  }

  function reset() {
    setStep(1); setCreative(null); setProductName('');
    setProductDesc(''); setAudience(''); setGoal('');
  }

  // Step 1 — Brand & Platform
  if (step === 1) return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepLabel}>الخطوة 1 من 2</Text>
      <Text style={styles.title}>اختر العلامة التجارية والمنصة</Text>

      <Text style={styles.label}>العلامة التجارية</Text>
      {brands.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>أضف علامة تجارية أولاً من الموقع</Text>
        </View>
      ) : (
        brands.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.selectCard, brandId === b.id && styles.selectCardActive]}
            onPress={() => setBrandId(b.id)}
          >
            <View style={[styles.colorDot, { backgroundColor: b.primaryColor || Colors.primary }]} />
            <Text style={styles.selectCardText}>{b.name}</Text>
            {brandId === b.id && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))
      )}

      <Text style={styles.label}>المنصة</Text>
      <View style={styles.platformGrid}>
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.platformBtn, platform === p && styles.platformBtnActive]}
            onPress={() => setPlatform(p)}
          >
            <Text style={[styles.platformText, platform === p && styles.platformTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>الحجم</Text>
      <View style={styles.platformGrid}>
        {(FORMATS[platform] || []).map((f) => (
          <TouchableOpacity
            key={f.size}
            style={[styles.platformBtn, format.size === f.size && styles.platformBtnActive]}
            onPress={() => setFormat(f)}
          >
            <Text style={[styles.platformText, format.size === f.size && styles.platformTextActive]}>{f.name}</Text>
            <Text style={[styles.platformSub, format.size === f.size && { color: '#fff' }]}>{f.size}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
        <Text style={styles.nextBtnText}>التالي ←</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // Step 2 — Product details
  if (step === 2) return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepLabel}>الخطوة 2 من 2</Text>
      <Text style={styles.title}>تفاصيل المنتج</Text>

      {[
        { label: 'اسم المنتج *', value: productName, set: setProductName, placeholder: 'مثال: عطر الورد' },
        { label: 'وصف المنتج', value: productDesc, set: setProductDesc, placeholder: 'اكتب وصفاً مختصراً...', multi: true },
        { label: 'الجمهور المستهدف', value: audience, set: setAudience, placeholder: 'مثال: نساء 25-40 سنة' },
        { label: 'هدف الإعلان', value: goal, set: setGoal, placeholder: 'مثال: زيادة المبيعات' },
      ].map((f) => (
        <View key={f.label}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={[styles.input, f.multi && { height: 90, textAlignVertical: 'top' }]}
            placeholder={f.placeholder}
            placeholderTextColor={Colors.textMuted}
            value={f.value}
            onChangeText={f.set}
            multiline={f.multi}
            textAlign="right"
          />
        </View>
      ))}

      <View style={styles.row}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
          <Text style={styles.backBtnText}>→ رجوع</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.generateBtn} onPress={generate}>
          <Text style={styles.generateBtnText}>✨ توليد الإعلان</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Step 3 — Result
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{generating ? 'جارٍ التوليد...' : 'الإعلان جاهز! 🎉'}</Text>
      {generating ? (
        <View style={styles.generatingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.generatingText}>الذكاء الاصطناعي يصمم إعلانك...</Text>
        </View>
      ) : creative ? (
        <>
          {creative.imageData && (
            <Image
              source={{ uri: `data:image/png;base64,${creative.imageData}` }}
              style={styles.resultImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{creative.title}</Text>
            {creative.adCopy?.headline && (
              <Text style={styles.resultHeadline}>{creative.adCopy.headline}</Text>
            )}
            {creative.adCopy?.body && (
              <Text style={styles.resultBody}>{creative.adCopy.body}</Text>
            )}
            {creative.performanceScore && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>نقاط الأداء</Text>
                <Text style={styles.scoreValue}>{creative.performanceScore}/100</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={reset}>
            <Text style={styles.nextBtnText}>✨ إنشاء إعلان جديد</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  stepLabel: { fontSize: 12, color: Colors.primary, fontWeight: '600', marginBottom: 4, textAlign: 'right' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 24, textAlign: 'right' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textAlign: 'right' },
  input: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  selectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  selectCardActive: { borderColor: Colors.primary },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  selectCardText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  checkmark: { fontSize: 16, color: Colors.primary },
  platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  platformBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  platformBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  platformText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  platformTextActive: { color: '#fff' },
  platformSub: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  generateBtn: {
    flex: 2, backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  generatingBox: { alignItems: 'center', padding: 48, gap: 20 },
  generatingText: { fontSize: 16, color: Colors.textSecondary },
  resultImage: { width: '100%', height: 280, borderRadius: 20, marginBottom: 20 },
  resultCard: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  resultTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, textAlign: 'right' },
  resultHeadline: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginBottom: 8, textAlign: 'right' },
  resultBody: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, textAlign: 'right' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  scoreLabel: { fontSize: 13, color: Colors.textSecondary },
  scoreValue: { fontSize: 20, fontWeight: '800', color: Colors.success },
});
