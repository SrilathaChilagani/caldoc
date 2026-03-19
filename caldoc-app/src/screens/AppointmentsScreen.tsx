import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fetchAppointments, type Appointment } from '../lib/api';
import { getToken, logout } from '../lib/auth';
import type { RootStackParamList } from '../types/navigation';

const STATUS_COLORS: Record<string, string> = {
  UPCOMING:  '#0F62FE',
  CONFIRMED: '#0F62FE',
  PENDING:   '#F97316',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  NO_SHOW:   '#9CA3AF',
};

function statusColor(status: string) {
  return STATUS_COLORS[status.toUpperCase()] ?? '#6B7280';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isUpcoming(iso: string | undefined) {
  if (!iso) return false;
  return new Date(iso) > new Date();
}

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function AppointmentsScreen() {
  const navigation = useNavigation<RootNav>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
      const data = await fetchAppointments();
      setAppointments(data.appointments);
    } catch (e) {
      if (e instanceof Error && e.message === 'session_expired') {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setError('Could not load appointments. Pull down to retry.');
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

  function joinVisit(appt: Appointment) {
    navigation.navigate('Visit', {
      appointmentId: appt.id,
      role: 'patient',
      name: appt.provider.name,
    });
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
        <Text style={styles.title}>My Visits</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F62FE" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No appointments yet</Text>
            <Text style={styles.emptySubtitle}>Your consultations will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const startsAt = item.slot?.startsAt;
          const upcoming = isUpcoming(startsAt);
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <Text style={styles.providerName}>{item.provider.name}</Text>
                  {startsAt ? (
                    <View style={styles.dateRow}>
                      <Ionicons name="time-outline" size={13} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {formatDate(startsAt)} · {formatTime(startsAt)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.dateText}>Date not set</Text>
                  )}
                </View>
                <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '20' }]}>
                  <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {upcoming && (
                <TouchableOpacity style={styles.joinBtn} onPress={() => joinVisit(item)}>
                  <Ionicons name="videocam-outline" size={16} color="#fff" />
                  <Text style={styles.joinBtnText}>Join Visit</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft: { flex: 1, gap: 4 },
  providerName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: '#6B7280' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#0F62FE', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  joinBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
