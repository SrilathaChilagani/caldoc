import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { API_BASE } from '../config/env';

type RootStackParamList = {
  Visit: { appointmentId: string; role?: 'patient' | 'provider'; name?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Visit'>;

export default function VisitScreen({ route }: Props) {
  const { appointmentId, role = 'patient', name = 'Patient' } = route.params;
  const visitUrl = `${API_BASE}/room/${appointmentId}?role=${role}&name=${encodeURIComponent(name)}`;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView source={{ uri: visitUrl }} />
    </SafeAreaView>
  );
}
