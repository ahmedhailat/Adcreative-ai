import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

export default function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) return Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
    setLoading(true);
    try {
      let user;
      if (tab === 'login') {
        user = await api.login(email, password);
      } else {
        if (!name) return Alert.alert('خطأ', 'يرجى إدخال الاسم');
        user = await api.register(name, email, password);
      }
      onLogin(user);
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.logoText}>NeonAd AI</Text>
          <Text style={styles.logoSub}>منصة الإعلانات المدعومة بالذكاء الاصطناعي</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
            onPress={() => setTab('login')}
          >
            <Text style={[styles.tabBtnText, tab === 'login' && styles.tabBtnTextActive]}>تسجيل الدخول</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
            onPress={() => setTab('register')}
          >
            <Text style={[styles.tabBtnText, tab === 'register' && styles.tabBtnTextActive]}>إنشاء حساب</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {tab === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="الاسم الكامل"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="البريد الإلكتروني"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {tab === 'login' ? 'دخول' : 'إنشاء الحساب'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  logoIcon: { fontSize: 32 },
  logoText: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  logoSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: 14, padding: 4, marginBottom: 24,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: '#fff' },
  form: { gap: 12 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 18,
    paddingVertical: 14, fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'right',
  },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
