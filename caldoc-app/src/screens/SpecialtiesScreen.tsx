import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UnauthTabParamList, RootStackParamList } from '../types/navigation';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<UnauthTabParamList, 'Specialties'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width } = Dimensions.get('window');
const CARD_W = (width - 20 * 2 - 12) / 2;

const SPECIALTIES = [
  { name: 'General Medicine', icon: 'body' as const, desc: 'Comprehensive primary care for adults covering common illnesses, preventive care, and chronic conditions.' },
  { name: 'Dermatology', icon: 'sunny' as const, desc: 'Skin, hair, and nail experts who can evaluate rashes, acne, allergies, and prescribe treatment plans.' },
  { name: 'Cardiology', icon: 'heart' as const, desc: 'Remote heart health consults with cardiologists who can review ECGs, labs, and advise on follow-ups.' },
  { name: 'Pediatrics', icon: 'happy' as const, desc: 'Child-friendly pediatricians for growth concerns, vaccinations, and routine health queries.' },
  { name: 'Psychiatry', icon: 'brain' as const, desc: 'Licensed psychiatrists for therapy, medication reviews, and mental wellness support.' },
  { name: 'ENT', icon: 'ear' as const, desc: 'Ear, nose, and throat conditions including sinus issues and post-operative follow-up care.' },
  { name: 'Orthopedics', icon: 'fitness' as const, desc: 'Assessments for joint pain, sports injuries, and physical rehabilitation guidance.' },
  { name: 'Gynecology', icon: 'female' as const, desc: "Women's health including reproductive health, pregnancy, and hormonal care." },
  { name: 'Neurology', icon: 'flash' as const, desc: 'Neurological conditions including headaches, vertigo, and chronic neurological disorders.' },
  { name: 'Ophthalmology', icon: 'eye' as const, desc: 'Eye health consultations including vision issues, infections, and post-surgery follow-ups.' },
  { name: 'Endocrinology', icon: 'analytics' as const, desc: 'Hormonal and metabolic disorders including diabetes, thyroid, and adrenal conditions.' },
  { name: 'Gastroenterology', icon: 'nutrition' as const, desc: 'Digestive system health including IBS, GERD, liver conditions, and bowel disorders.' },
];

export default function SpecialtiesScreen() {
  const navigation = useNavigation<Nav>();

  const handleSpecialtyPress = (specialty: string) => {
    navigation.navigate('FindDoctor', { specialty });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Specialties</Text>
        <Text style={styles.subtitle}>Browse our medical specialties</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {SPECIALTIES.map((sp) => (
            <TouchableOpacity
              key={sp.name}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => handleSpecialtyPress(sp.name)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={sp.icon} size={26} color="#2f6ea5" />
              </View>
              <Text style={styles.cardName}>{sp.name}</Text>
              <Text style={styles.cardDesc} numberOfLines={3}>{sp.desc}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.findLink}>Find doctors</Text>
                <Ionicons name="arrow-forward" size={13} color="#2f6ea5" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f2ea' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f7f2ea',
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

  scroll: { paddingHorizontal: 20 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(47,110,165,0.1)',
    shadowColor: '#2f6ea5',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#e7edf3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a52',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto' as any,
  },
  findLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2f6ea5',
  },

  bottomPad: { height: 32 },
});
