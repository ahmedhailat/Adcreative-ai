import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../constants/colors';
import { api } from '../lib/api';

interface Message { id: string; role: 'user' | 'ai'; text: string }

const SUGGESTIONS = [
  'كيف أحسّن أداء إعلاناتي؟',
  'ما أفضل وقت للنشر على إنستغرام؟',
  'اقترح أفكاراً لحملة رمضان',
  'كيف أستهدف الجمهور الصحيح؟',
  'ما الفرق بين الـ CPC والـ CPM؟',
];

export default function CopilotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'ai',
      text: 'أهلاً! أنا مساعدك الذكي في NeonAd. يمكنني مساعدتك في تحسين حملاتك الإعلانية وتحليل أداء إعلاناتك. كيف يمكنني مساعدتك اليوم؟ 🚀',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send(question?: string) {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await api.copilotAsk(q);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: res.answer };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: 'عذراً، حدث خطأ. يرجى المحاولة مجدداً.' };
      setMessages((prev) => [...prev, errMsg]);
    }
    setLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        style={styles.list}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubble, styles.aiBubble]}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            {item.role === 'ai' && <Text style={styles.aiLabel}>⚡ NeonAd AI</Text>}
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>
              {item.text}
            </Text>
          </View>
        )}
      />

      {/* Suggestions (only when 1 message) */}
      {messages.length === 1 && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} style={styles.suggestion} onPress={() => send(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="اسأل مساعدك الذكي..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          textAlign="right"
          onSubmitEditing={() => send()}
        />
        <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={() => send()}>
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { flex: 1 },
  bubble: {
    borderRadius: 18, padding: 14, maxWidth: '85%',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  aiBubble: { alignSelf: 'flex-start' },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  aiLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  bubbleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22, textAlign: 'right' },
  userBubbleText: { color: '#fff', textAlign: 'right' },
  suggestions: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  suggestion: {
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-end',
  },
  suggestionText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  inputRow: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 12, fontSize: 14, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.surfaceAlt },
  sendIcon: { fontSize: 18, color: '#fff', fontWeight: '700' },
});
