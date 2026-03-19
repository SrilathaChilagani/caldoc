import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UnauthTabParamList, RootStackParamList } from '../types/navigation';
import { API_BASE } from '../config/env';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<UnauthTabParamList, 'FindDoctor'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type RouteProps = RouteProp<UnauthTabParamList, 'FindDoctor'>;

type Provider = {
  id: string;
  name: string;
  slug: string;
  speciality: string | null;
  qualification: string | null;
  languages: string[] | null;
  defaultFeePaise: number | null;
  profilePhotoKey: string | null;
};

const SPECIALTY_PILLS = [
  'All',
  'General Medicine',
  'Dermatology',
  'Cardiology',
  'Pediatrics',
  'Psychiatry',
  'ENT',
  'Orthopedics',
  'Gynecology',
  'Neurology',
  'Ophthalmology',
  'Endocrinology',
  'Gastroenterology',
];

function formatFee(feePaise: number | null): string {
  if (feePaise == null || feePaise === 0) return '';
  return `₹${Math.round(feePaise / 100).toLocaleString('en-IN')} per consult`;
}

function DoctorCard({ provider, onBook }: { provider: Provider; onBook: () => void }) {
  return (
    <View style={styles.doctorCard}>
      <View style={styles.doctorAvatar}>
        <Ionicons name="person" size={28} color="#2f6ea5" />
      </View>
      <View style={styles.doctorInfo}>
        <Text style={styles.doctorName}>{provider.name}</Text>
        {provider.speciality ? (
          <Text style={styles.doctorSpecialty}>{provider.speciality}</Text>
        ) : null}
        {provider.qualification ? (
          <Text style={styles.doctorQual}>{provider.qualification}</Text>
        ) : null}
        <View style={styles.doctorMeta}>
          {provider.languages && provider.languages.length > 0 ? (
            <View style={styles.metaPill}>
              <Ionicons name="language-outline" size={11} color="#2f6ea5" />
              <Text style={styles.metaText}>{provider.languages.join(', ')}</Text>
            </View>
          ) : null}
          {provider.defaultFeePaise ? (
            <View style={styles.metaPill}>
              <Ionicons name="cash-outline" size={11} color="#059669" />
              <Text style={[styles.metaText, { color: '#059669' }]}>{formatFee(provider.defaultFeePaise)}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={styles.bookBtn} onPress={onBook} activeOpacity={0.8}>
        <Text style={styles.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FindDoctorScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();

  const initialSpecialty = route.params?.specialty || '';

  const [selectedSpecialty, setSelectedSpecialty] = useState(
    initialSpecialty || 'All'
  );
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchProviders = useCallback(async (specialty: string) => {
    try {
      setError(null);
      const q = specialty === 'All' ? '' : specialty;
      const url = `${API_BASE}/api/app/providers${q ? `?specialty=${encodeURIComponent(q)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch providers');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (e) {
      setError('Could not load doctors. Please try again.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProviders(selectedSpecialty).finally(() => setLoading(false));
  }, [selectedSpecialty, fetchProviders]);

  // Sync specialty from route params (e.g., navigated from SpecialtiesScreen)
  useEffect(() => {
    if (route.params?.specialty && route.params.specialty !== selectedSpecialty) {
      setSelectedSpecialty(route.params.specialty);
    }
  }, [route.params?.specialty]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders(selectedSpecialty);
    setRefreshing(false);
  }, [selectedSpecialty, fetchProviders]);

  const filteredProviders = providers.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.speciality || '').toLowerCase().includes(q)
    );
  });

  const handleBook = (provider: Provider) => {
    navigation.navigate('BookVisit', {
      providerId: provider.id,
      providerName: provider.name,
      slug: provider.slug,
    });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Find a Doctor</Text>
        <Text style={styles.subtitle}>Browse and filter by specialty</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or specialty..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Specialty pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}
      >
        {SPECIALTY_PILLS.map((pill) => {
          const active = selectedSpecialty === pill;
          return (
            <TouchableOpacity
              key={pill}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setSelectedSpecialty(pill)}
              activeOpacity={0.75}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {pill}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2f6ea5" />
          <Text style={styles.loadingText}>Finding doctors...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setLoading(true);
              fetchProviders(selectedSpecialty).finally(() => setLoading(false));
            }}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2f6ea5']}
              tintColor="#2f6ea5"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="person-outline" size={52} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No doctors found</Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? 'Try a different search term.'
                  : selectedSpecialty === 'All'
                  ? 'No providers are currently available.'
                  : `No doctors listed for ${selectedSpecialty} yet.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DoctorCard provider={item} onBook={() => handleBook(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f2ea' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e3a52',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(47,110,165,0.15)',
    shadowColor: '#2f6ea5',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e3a52',
    fontWeight: '500',
    padding: 0,
  },

  pillsScroll: { flexGrow: 0 },
  pillsRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(47,110,165,0.2)',
  },
  pillActive: {
    backgroundColor: '#2f6ea5',
    borderColor: '#2f6ea5',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2f6ea5',
  },
  pillTextActive: {
    color: '#fff',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#2f6ea5',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e3a52',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },

  doctorCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(47,110,165,0.1)',
    shadowColor: '#2f6ea5',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  doctorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#e7edf3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  doctorInfo: { flex: 1 },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e3a52',
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2f6ea5',
    marginBottom: 1,
  },
  doctorQual: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  doctorMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2f6ea5',
  },
  bookBtn: {
    backgroundColor: '#2f6ea5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  bookBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
