import {
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

type FeatureItem = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  desc: string;
};

const FEATURES: FeatureItem[] = [
  {
    icon: 'videocam',
    color: '#0F62FE',
    bg: '#EFF6FF',
    title: 'Video Consultations',
    desc: 'See a doctor from home — same-day appointments available.',
  },
  {
    icon: 'flask',
    color: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Labs at Home',
    desc: 'Sample collection at your doorstep, results online.',
  },
  {
    icon: 'medical',
    color: '#059669',
    bg: '#ECFDF5',
    title: 'Rx Delivery',
    desc: 'Genuine medicines delivered fast — no markup.',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + branding */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>CalDoc</Text>
          <Text style={styles.tagline}>Healthcare at your doorstep</Text>
        </View>

        {/* Feature cards */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={24} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.signInText}>Sign in to Patient Portal</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.footer}>
          CalDoc · Telemedicine · Labs · Pharmacy
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFF' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'center',
  },

  /* Hero */
  hero: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logo: { width: 72, height: 72 },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },

  /* Features */
  featureList: { gap: 12, marginBottom: 32 },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },

  /* Sign in */
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F62FE',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#0F62FE',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 24,
  },
});
