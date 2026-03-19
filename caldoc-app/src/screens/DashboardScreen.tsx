import { useCallback, useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import { API_BASE } from '../config/env';
import { getToken, logout } from '../lib/auth';

type Appointment = {
  id: string;
  providerName: string;
  startsAt: string;
};

type RootStackParamList = {
  Dashboard: undefined;
  Login: undefined;
  Web: undefined;
  Visit: { appointmentId: string; role?: 'patient' | 'provider'; name?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      navigation.replace('Login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/patient/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setAppointments(
        (data?.appointments || []).map((appt: any) => ({
          id: appt.id,
          providerName: appt.provider?.name ?? 'Doctor',
          startsAt: appt.slot?.startsAt ?? appt.createdAt,
        }))
      );
    } catch {
      // swallow for now
    }
  }, [navigation]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  async function handleLogout() {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Web' }],
    });
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 24, gap: 16, flex: 1 }}>
        <Text style={{ fontSize: 28, fontWeight: '600' }}>Welcome to CalDoc</Text>
        <Text style={{ color: '#6b7280' }}>Upcoming appointments</Text>
        {appointments.length === 0 ? (
          <Text>No appointments yet.</Text>
        ) : (
          appointments.map((appt) => {
            const deepLink = Linking.createURL(
              `visit/${appt.id}?role=patient&name=${encodeURIComponent(appt.providerName)}`
            );
            return (
              <View
                key={appt.id}
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 16,
                  padding: 16,
                  gap: 8,
                }}>
                <Text style={{ fontWeight: '600' }}>{appt.providerName}</Text>
                <Text>{new Date(appt.startsAt).toLocaleString()}</Text>
                <Button
                  title="Join visit"
                  onPress={() =>
                    navigation.push('Visit', {
                      appointmentId: appt.id,
                      role: 'patient',
                      name: appt.providerName,
                    })
                  }
                />
                <Button title="Open via deep link" onPress={() => Linking.openURL(deepLink)} />
              </View>
            );
          })
        )}
        <Button title="Open full site" onPress={() => navigation.push('Web')} />
        <Button title="Sign out" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}
