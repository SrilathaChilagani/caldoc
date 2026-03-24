import { useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, UnauthTabParamList } from '../types/navigation';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<UnauthTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SPECIALTIES = [
  'Specialty (optional)',
  'General Medicine',
  'Dermatology',
  'Cardiology',
  'Pediatrics',
  'Psychiatry',
  'ENT',
  'Orthopedics',
  'Gynecology',
  'Neurology',
];

const TRUST = [
  'WhatsApp confirmations',
  'UPI / cards',
  'Instant video links',
];

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [specialtyOpen, setSpecialtyOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  function handleFindDoctor() {
    navigation.navigate('FindDoctor', selectedSpecialty ? { specialty: selectedSpecialty } : undefined);
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/images/logo-mark.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View style={styles.brandTextRow}>
            <Text style={styles.brandCal}>CAL</Text>
            <Text style={styles.brandDoc}>D</Text>
            <View style={styles.brandOCircle}><Text style={styles.brandOPlus}>+</Text></View>
            <Text style={styles.brandDoc}>C</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.menuBtn}>
          <Ionicons name="menu" size={26} color="#1e3a52" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <ImageBackground
          source={require('../../assets/images/hero-doctor.jpg')}
          style={styles.heroBg}
          imageStyle={styles.heroBgImg}
        >
        <View style={styles.heroOverlay} />
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            Book your{'\n'}
            <Text style={styles.heroAccent}>teleconsultations</Text>
            {'\n'}today.
          </Text>
          <Text style={styles.heroSub}>
            Search by specialty, doctor name, or diagnosis to find the right care.
          </Text>

          {/* Search bar */}
          <View style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search doctors, specialties"
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={handleFindDoctor}
              />
            </View>

            {/* Specialty picker */}
            <TouchableOpacity
              style={styles.specialtyRow}
              onPress={() => setSpecialtyOpen((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.specialtyText, selectedSpecialty && styles.specialtySelected]}>
                {selectedSpecialty || 'Specialty (optional)'}
              </Text>
              <Ionicons name={specialtyOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94A3B8" />
            </TouchableOpacity>

            {specialtyOpen && (
              <View style={styles.dropdown}>
                {SPECIALTIES.slice(1).map((sp) => (
                  <TouchableOpacity
                    key={sp}
                    style={[styles.dropdownItem, selectedSpecialty === sp && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedSpecialty(sp);
                      setSpecialtyOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, selectedSpecialty === sp && styles.dropdownTextActive]}>
                      {sp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.findBtn} onPress={handleFindDoctor} activeOpacity={0.85}>
              <Text style={styles.findBtnText}>Find a doctor</Text>
            </TouchableOpacity>
          </View>

          {/* Trust dots */}
          <View style={styles.trustRow}>
            {TRUST.map((t, i) => (
              <View key={t} style={styles.trustItem}>
                {i > 0 && <Text style={styles.trustSep}>·</Text>}
                <View style={styles.trustDot} />
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Quick links */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Login', { returnTab: 'Pharmacy' })} activeOpacity={0.8}>
              <Text style={styles.quickBtnText}>Pharmacy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Login', { returnTab: 'Labs' })} activeOpacity={0.8}>
              <Text style={styles.quickBtnText}>Labs</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ImageBackground>

        {/* Services */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionLabel}>Our services</Text>
          {[
            { icon: 'videocam' as const, title: 'Video Consultation', desc: 'See a doctor from home — same-day slots available.', color: '#2f6ea5', bg: '#e7edf3' },
            { icon: 'flask' as const, title: 'Labs at Home', desc: 'Sample collection at your doorstep, reports online.', color: '#7C3AED', bg: '#F5F3FF' },
            { icon: 'medical' as const, title: 'Rx Delivery', desc: 'Genuine medicines delivered fast — no markup.', color: '#059669', bg: '#ECFDF5' },
          ].map((s) => (
            <TouchableOpacity key={s.title} style={styles.serviceCard} onPress={handleFindDoctor} activeOpacity={0.75}>
              <View style={[styles.serviceIconBox, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={24} color={s.color} />
              </View>
              <View style={styles.serviceText}>
                <Text style={styles.serviceTitle}>{s.title}</Text>
                <Text style={styles.serviceDesc}>{s.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsBar}>
          {[
            { value: '500+', label: 'Consults' },
            { value: '12+', label: 'Doctors' },
            { value: '4.8★', label: 'Rating' },
            { value: '<2 min', label: 'Avg. Wait' },
          ].map((s, i) => (
            <View key={s.label} style={[styles.statItem, i > 0 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>MoHFW Telemedicine Guidelines 2020 compliant · caldoc.in</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f2ea' },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    backgroundColor: '#f7f2ea',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoImg: { width: 44, height: 44 },
  brandTextRow: { flexDirection: 'row', alignItems: 'center' },
  brandCal: { fontSize: 22, fontWeight: '800', color: '#22a045', letterSpacing: 0.5 },
  brandDoc: { fontSize: 22, fontWeight: '800', color: '#1a5bcc', letterSpacing: 0.5 },
  brandOCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2.5, borderColor: '#1a5bcc',
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 0,
  },
  brandOPlus: { fontSize: 11, fontWeight: '900', color: '#1a5bcc', lineHeight: 14 },
  menuBtn: { padding: 4 },

  // Hero
  heroBg: { width: '100%' },
  heroBgImg: { opacity: 0.55, resizeMode: 'cover' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#f7f2ea', opacity: 0.25 },
  hero: { paddingHorizontal: 20, paddingTop: 144, paddingBottom: 8 },
  heroTitle: { fontSize: 38, fontWeight: '800', color: '#1e3a52', lineHeight: 46, marginBottom: 14, letterSpacing: -0.5 },
  heroAccent: { color: '#2f6ea5' },
  heroSub: { fontSize: 15, color: '#475569', lineHeight: 23, marginBottom: 24 },

  // Search card
  searchCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#1e3a52', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 4, marginBottom: 20, overflow: 'visible',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e3a52', fontWeight: '500', padding: 0 },
  specialtyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  specialtyText: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  specialtySelected: { color: '#1e3a52' },
  dropdown: {
    position: 'absolute', top: 112, left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 16, zIndex: 99,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8, maxHeight: 220,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemActive: { backgroundColor: 'rgba(47,110,165,0.07)' },
  dropdownText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  dropdownTextActive: { color: '#2f6ea5', fontWeight: '700' },
  findBtn: {
    backgroundColor: '#2f6ea5', margin: 12, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  findBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Trust
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustSep: { color: '#CBD5E1', marginRight: 2, fontSize: 16 },
  trustDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2f6ea5' },
  trustText: { fontSize: 12, color: '#475569', fontWeight: '500' },

  // Quick links
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  quickBtn: {
    borderRadius: 24, borderWidth: 1.5, borderColor: '#CBD5E1',
    backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 10,
  },
  quickBtnText: { fontSize: 14, fontWeight: '700', color: '#1e3a52' },

  // Services
  servicesSection: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#2f6ea5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(47,110,165,0.08)',
    shadowColor: '#2f6ea5', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1, marginBottom: 10,
  },
  serviceIconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceText: { flex: 1 },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  serviceDesc: { fontSize: 12, color: '#64748B', lineHeight: 17 },

  // Stats
  statsBar: {
    flexDirection: 'row', backgroundColor: '#2f6ea5',
    marginTop: 28, paddingVertical: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: '500' },

  footer: { textAlign: 'center', fontSize: 11, color: '#94A3B8', paddingHorizontal: 24, paddingTop: 24 },
});
