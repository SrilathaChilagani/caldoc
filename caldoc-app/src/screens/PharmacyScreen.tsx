import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fetchRxOrders, rxItemNames, formatAmount, type RxOrder } from '../lib/api';
import { getToken, logout } from '../lib/auth';
import type { RootStackParamList } from '../types/navigation';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  AWAITING_PAYMENT: { bg: '#FFF7ED', text: '#F97316' },
  CONFIRMED:        { bg: '#EFF6FF', text: '#0F62FE' },
  PROCESSING:       { bg: '#EFF6FF', text: '#0F62FE' },
  DISPATCHED:       { bg: '#F0FDFA', text: '#0891B2' },
  DELIVERED:        { bg: '#F0FDF4', text: '#10B981' },
  COMPLETED:        { bg: '#F0FDF4', text: '#10B981' },
  CANCELLED:        { bg: '#FEF2F2', text: '#EF4444' },
};

function statusStyle(status: string) {
  return STATUS_COLORS[status.toUpperCase()] ?? { bg: '#F3F4F6', text: '#6B7280' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function PharmacyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<RxOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    try {
      setError(null);
      const data = await fetchRxOrders();
      setOrders(data.orders);
    } catch (e) {
      if (e instanceof Error && e.message === 'session_expired') {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError('Could not load pharmacy orders. Pull down to retry.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F62FE" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Pharmacy</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F62FE" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="medical-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No pharmacy orders yet</Text>
            <Text style={styles.emptySubtitle}>Your medication deliveries will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const items = rxItemNames(item.items);
          const { bg, text: textColor } = statusStyle(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <Ionicons name="medical" size={20} color="#0F62FE" />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.orderDate}>Ordered {formatDate(item.createdAt)}</Text>
                  <Text style={styles.amount}>{formatAmount(item.amountPaise)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: bg }]}>
                  <Text style={[styles.badgeText, { color: textColor }]}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              {items.length > 0 && (
                <View style={styles.itemsList}>
                  {items.map((med, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Ionicons name="ellipse" size={6} color="#6B7280" />
                      <Text style={styles.itemName}>{med}</Text>
                    </View>
                  ))}
                </View>
              )}

              {item.notes ? (
                <Text style={styles.notes}>{item.notes}</Text>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFF' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0F172A' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  emptyContainer: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#FEF2F2', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  orderDate: { fontSize: 12, color: '#6B7280' },
  amount: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  itemsList: { gap: 4, paddingLeft: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 14, color: '#374151', flex: 1 },
  notes: { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },
});
