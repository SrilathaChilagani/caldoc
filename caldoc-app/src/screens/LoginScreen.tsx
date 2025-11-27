import { useState } from 'react';
import { Alert, Button, SafeAreaView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { login } from '../lib/auth';

type Props = NativeStackScreenProps<
  {
    Login: undefined;
    Dashboard: undefined;
  },
  'Login'
>;

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!phone || !otp) {
      Alert.alert('Missing info', 'Enter your phone and OTP to continue.');
      return;
    }
    setLoading(true);
    try {
      await login(phone, otp);
      navigation.replace('Dashboard');
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '600' }}>Sign in to CalDoc</Text>
        <TextInput
          placeholder="+91 XXXXX XXXXX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={{
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
          }}
        />
        <TextInput
          placeholder="One-time password"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          style={{
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
          }}
        />
        <Button title={loading ? 'Signing in…' : 'Continue'} disabled={loading} onPress={handleSubmit} />
      </View>
    </SafeAreaView>
  );
}
