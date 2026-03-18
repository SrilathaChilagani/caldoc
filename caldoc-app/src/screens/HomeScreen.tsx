import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

const { width } = Dimensions.get('window');

const SERVICES = [
  { icon: 'videocam' as const, color: '#2f6ea5', bg: '#e7edf3', title: 'Video Consultation', desc: 'See a doctor from home — same-day slots available.' },
  { icon: 'flask' as const, color: '#7C3AED', bg: '#F5F3FF', title: 'Labs at Home', desc: 'Sample collection at your doorstep, reports online.' },
  { icon: 'medical' as const, color: '#059669', bg: '#ECFDF5', title: 'Rx Delivery', desc: 'Genuine medicines delivered fast — no markup.' },
];

const SPECIALTIES = [
  { label: 'General\nMedicine', icon: 'body' as const },
  { label: 'Dermatology', icon: 'sunny' as const },
  { label: 'Cardiology', icon: 'heart' as const },
  { label: 'Pediatrics', icon: 'happy' as const },
  { label: 'Psychiatry', icon: 'brain' as const },
  { label: 'ENT', icon: 'ear' as const },
];

const TRUST = [
  { value: '500+', label: 'Consults' },
  { value: '12+', label: 'Doctors' },
  { value: '4.8★', label: 'Rating' },
];

const CARD_W = (width - 40 - 20) / 3;

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Image source={require('../../assets/images/icon.png')} style={styles.logoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.brandName}>CalDoc</Text>
              <Text style={styles.brandSub}>Telemedicine</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.signinPill} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signinPillText}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEyebrow}>HEALTHCARE · ANYTIME · ANYWHERE</Text>
          <Text style={styles.heroTitle}>A doctor in{'\n'}your pocket</Text>
          <Text style={styles.heroSub}>
            Consult certified doctors, order lab tests, and get medicines delivered — all from your phone.
          </Text>
          <View style={styles.trustRow}>
            {TRUST.map((t, i) => (
              <View key={t.label} style={[styles.trustItem, i > 0 && styles.trustBorder]}>
                <Text style={styles.trustValue}>{t.value}</Text>
                <Text style={styles.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Services */}
        <Text style={styles.sectionTitle}>Our services</Text>
        <View style={styles.serviceList}>
          {SERVICES.map((s) => (
            <TouchableOpacity key={s.title} style={styles.serviceCard} onPress={() => navigation.navigate('Login')} activeOpacity={0.75}>
              <View style={[styles.serviceIconBox, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={26} color={s.color} />
              </View>
              <View style={styles.serviceText}>
                <Text style={styles.serviceTitle}>{s.title}</Text>
                <Text style={styles.serviceDesc}>{s.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Specialties */}
        <Text style={styles.sectionTitle}>Specialties</Text>
        <View style={styles.specGrid}>
          {SPECIALTIES.map((sp) => (
            <TouchableOpacity key={sp.label} style={styles.specCard} onPress={() => navigation.navigate('Login')} activeOpacity={0.75}>
              <View style={styles.specIconBox}>
                <Ionicons name={sp.icon} size={22} color="#2f6ea5" />
              </View>
              <Text style={styles.specLabel}>{sp.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Ready to get started?</Text>
          <Text style={styles.ctaSub}>Sign in with your WhatsApp number — no password needed.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={styles.ctaBtnText}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>MoHFW Telemedicine Guidelines 2020 compliant · caldoc.in</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f2ea' },
  scroll: { paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#2f6ea5', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  logoImg: { width: 36, height: 36 },
  brandName: { fontSize: 20, fontWeight: '800', color: '#2f6ea5', letterSpacing: -0.3 },
  brandSub: { fontSize: 11, color: '#7a9ab8', fontWeight: '500' },
  signinPill: { borderWidth: 1.5, borderColor: '#2f6ea5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  signinPillText: { color: '#2f6ea5', fontWeight: '700', fontSize: 13 },

  heroBanner: { marginHorizontal: 20, marginTop: 16, marginBottom: 28, backgroundColor: '#2f6ea5', borderRadius: 24, padding: 24, shadowColor: '#2f6ea5', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  heroEyebrow: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.8, marginBottom: 10 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#fff', lineHeight: 42, marginBottom: 12, letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 21, marginBottom: 20 },
  trustRow: { flexDirection: 'row' },
  trustItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  trustBorder: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.25)' },
  trustValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  trustLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginTop: 1 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e3a52', marginHorizontal: 20, marginBottom: 12 },

  serviceList: { paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(47,110,165,0.1)', shadowColor: '#2f6ea5', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  serviceIconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  serviceText: { flex: 1 },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  serviceDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  specGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 28 },
  specCard: { width: CARD_W, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(47,110,165,0.1)', shadowColor: '#2f6ea5', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  specIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#e7edf3', alignItems: 'center', justifyContent: 'center' },
  specLabel: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center', lineHeight: 15 },

  ctaBox: { marginHorizontal: 20, marginBottom: 24, backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(47,110,165,0.15)', shadowColor: '#2f6ea5', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#1e3a52', marginBottom: 6 },
  ctaSub: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 18 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2f6ea5', borderRadius: 14, paddingVertical: 15, shadowColor: '#2f6ea5', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 11, color: '#94A3B8', paddingHorizontal: 24 },
});
