import { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(telegramId, backendUrl) {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return;
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;
  await fetch(`${backendUrl}/api/users/${telegramId}/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const TELEGRAM_ID = process.env.EXPO_PUBLIC_TELEGRAM_ID || '123456789';

const COLORS = {
  bg: '#05070f',
  card: '#141a2f',
  cardElevated: '#1a2138',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: '#e6e9f2',
  muted: '#8b91a8',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function App() {
  const [meals, setMeals] = useState([]);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch(`${BACKEND_URL}/api/meals?telegramId=${TELEGRAM_ID}`);
      const data = await r.json();
      if (Array.isArray(data)) setMeals(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    registerForPushNotifications(TELEGRAM_ID, BACKEND_URL).catch(console.warn);
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  async function save() {
    if (!name.trim()) return Alert.alert('Missing name', 'Please enter a meal name');
    const body = { name: name.trim(), calories: calories ? parseInt(calories, 10) : undefined };
    const url = editingId
      ? `${BACKEND_URL}/api/meals/${editingId}?telegramId=${TELEGRAM_ID}`
      : `${BACKEND_URL}/api/meals?telegramId=${TELEGRAM_ID}`;
    await fetch(url, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setName(''); setCalories(''); setEditingId(null);
    load();
  }

  async function remove(id) {
    await fetch(`${BACKEND_URL}/api/meals/${id}?telegramId=${TELEGRAM_ID}`, { method: 'DELETE' });
    load();
  }

  function startEdit(m) {
    setEditingId(m._id); setName(m.name); setCalories(m.calories?.toString() || '');
  }

  function cancelEdit() {
    setEditingId(null); setName(''); setCalories('');
  }

  // Stats for hero section
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayMeals = meals.filter((m) => new Date(m.loggedAt) >= today);
    const todayCals = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);
    return {
      todayCount: todayMeals.length,
      todayCals,
      total: meals.length,
    };
  }, [meals]);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.brand}>
              <View style={s.logo}>
                <Text style={s.logoText}>C</Text>
              </View>
              <View>
                <Text style={s.title}>CalorAI</Text>
                <Text style={s.subtitle}>Synced with Telegram</Text>
              </View>
            </View>
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>LIVE</Text>
            </View>
          </View>

          {/* Hero stats */}
          <View style={s.heroCard}>
            <View style={s.heroAccent} />
            <Text style={s.heroLabel}>TODAY</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }}>
              <Text style={s.heroValue}>{stats.todayCals}</Text>
              <Text style={s.heroUnit}>kcal</Text>
            </View>
            <View style={s.heroStatsRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{stats.todayCount}</Text>
                <Text style={s.heroStatLabel}>meals today</Text>
              </View>
              <View style={s.heroDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatValue}>{stats.total}</Text>
                <Text style={s.heroStatLabel}>all time</Text>
              </View>
            </View>
          </View>

          {/* Add/Edit form */}
          <View style={s.formCard}>
            <Text style={s.formTitle}>{editingId ? '✏️  Edit meal' : '➕  Add a meal'}</Text>
            <TextInput
              placeholder="What did you eat?"
              placeholderTextColor={COLORS.muted}
              style={s.input}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              placeholder="Calories (optional)"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              style={s.input}
              value={calories}
              onChangeText={setCalories}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={s.btnPrimary} onPress={save} activeOpacity={0.85}>
                <Text style={s.btnPrimaryText}>{editingId ? 'Update meal' : 'Add meal'}</Text>
              </TouchableOpacity>
              {editingId && (
                <TouchableOpacity style={s.btnSecondary} onPress={cancelEdit} activeOpacity={0.85}>
                  <Text style={s.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Meal list */}
          <View style={s.listHeader}>
            <Text style={s.listTitle}>Recent meals</Text>
            <Text style={s.listCount}>{meals.length}</Text>
          </View>

          {loading ? (
            <Text style={s.empty}>Loading…</Text>
          ) : meals.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>No meals yet</Text>
              <Text style={s.emptySubtitle}>Add your first meal above or log one in Telegram</Text>
            </View>
          ) : (
            meals.map((item) => (
              <View key={item._id} style={s.mealCard}>
                <View style={s.mealLeft}>
                  <View style={s.mealIcon}>
                    <Text style={{ fontSize: 18 }}>🍴</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mealName} numberOfLines={1}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                      {item.calories ? (
                        <View style={s.calChip}>
                          <Text style={s.calChipText}>{item.calories} kcal</Text>
                        </View>
                      ) : null}
                      <Text style={s.mealTime}>{timeAgo(item.loggedAt)}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.mealActions}>
                  <TouchableOpacity onPress={() => startEdit(item)} style={s.iconBtn} activeOpacity={0.7}>
                    <Text style={s.iconText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item._id)} style={s.iconBtn} activeOpacity={0.7}>
                    <Text style={s.iconText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 24 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12,
    elevation: 8,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveText: { color: COLORS.success, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  heroAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    backgroundColor: COLORS.primary,
  },
  heroLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroValue: { color: COLORS.text, fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  heroUnit: { color: COLORS.muted, fontSize: 16, marginLeft: 6, marginBottom: 10, fontWeight: '600' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 20 },
  heroStat: { flex: 1 },
  heroStatValue: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  heroStatLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  formTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 14 },
  input: {
    backgroundColor: COLORS.cardElevated,
    color: COLORS.text,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 10, marginBottom: 10,
    fontSize: 15,
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 10,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 10,
    backgroundColor: COLORS.cardElevated, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  listTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  listCount: {
    color: COLORS.muted, fontSize: 12, fontWeight: '600',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.border,
  },

  mealCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  mealLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  mealName: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  mealTime: { color: COLORS.muted, fontSize: 11 },
  calChip: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },
  calChipText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },

  mealActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8 },
  iconText: { fontSize: 16 },

  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 50 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
