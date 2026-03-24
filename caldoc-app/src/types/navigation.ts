import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root stack — screens outside the tabs
export type RootStackParamList = {
  UnauthHome: undefined;   // unauthenticated tab navigator
  Login: { returnTab?: keyof MainTabParamList } | undefined;
  Main: undefined;
  Visit: { appointmentId: string; role?: 'patient' | 'provider'; name?: string };
  BookVisit: { providerId: string; providerName: string; slug: string };
};

// Unauthenticated bottom tab screens
export type UnauthTabParamList = {
  Home: undefined;
  FindDoctor: { specialty?: string } | undefined;
  Specialties: undefined;
};

// Bottom tab screens (all authenticated)
export type MainTabParamList = {
  Appointments: undefined;
  Labs: undefined;
  Pharmacy: undefined;
  Profile: undefined;
};

// Tab screens that can also navigate to root stack screens (e.g. Visit)
export type AppointmentsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Appointments'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type LabsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Labs'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type PharmacyScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Pharmacy'>,
  NativeStackScreenProps<RootStackParamList>
>;
export type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;
