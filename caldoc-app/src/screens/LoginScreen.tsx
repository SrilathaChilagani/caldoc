import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { requestOtp, login } from '../lib/auth';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handlePhoneNext() {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid number', 'Enter a valid mobile number with country code (e.g. +91 98765 43210).');
      return;
    }
    setLoading(true);
    try {
      const result = await requestOtp(trimmed);
      setMaskedPhone(result.masked || trimmed);
      startCooldown(result.cooldown || 60);
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      Alert.alert(
        'Could not send OTP',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;
    setOtp('');
    setLoading(true);
    try {
      const result = await requestOtp(phone.trim());
      setMaskedPhone(result.masked || phone.trim());
      startCooldown(result.cooldown || 60);
    } catch (err) {
      Alert.alert(
        'Could not resend OTP',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!otp.trim() || otp.trim().length < 4) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code sent to your WhatsApp.');
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim());
      navigation.replace('Main');
    } catch (err) {
      Alert.alert(
        'Verification failed',
        err instanceof Error ? err.message : 'Check your OTP and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {step === 'otp' && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (cooldownRef.current) clearInterval(cooldownRef.current);
                setStep('phone');
                setOtp('');
                setCooldown(0);
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#0F62FE" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}

          <View style={styles.logoCircle}>
            <Ionicons name="medkit" size={32} color="#0F62FE" />
          </View>

          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Sign in to CalDoc</Text>
              <Text style={styles.subtitle}>Enter your registered mobile number</Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  value={phone}
                  onChangeText={setPhone}
                  onSubmitEditing={handlePhoneNext}
                  autoFocus
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (!phone.trim() || loading) && styles.btnDisabled]}
                onPress={handlePhoneNext}
                disabled={!phone.trim() || loading}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Sending OTP…' : 'Continue'}
                </Text>
                {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter OTP</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to your WhatsApp{'\n'}
                <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={styles.inputIcon} />
                <TextInput
                  ref={otpRef}
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  onSubmitEditing={handleVerify}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (loading || !otp.trim()) && styles.btnDisabled]}
                onPress={handleVerify}
                disabled={loading || !otp.trim()}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Verifying…' : 'Verify & Sign in'}
                </Text>
                {!loading && <Ionicons name="checkmark" size={18} color="#fff" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResend}
                disabled={cooldown > 0 || loading}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
                  {cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : "Didn't receive it? Resend OTP"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.hint}>
            By continuing, you agree to CalDoc's Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFF' },
  flex: { flex: 1 },
  container: {
    flex: 1, paddingHorizontal: 24, paddingTop: 32,
    justifyContent: 'center', gap: 16,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    position: 'absolute', top: 16, left: 16,
  },
  backText: { color: '#0F62FE', fontWeight: '500', fontSize: 15 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 8 },
  phoneHighlight: { color: '#0F172A', fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', paddingVertical: 14 },
  otpInput: { fontSize: 22, letterSpacing: 4, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#0F62FE', borderRadius: 14, paddingVertical: 15,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendBtn: { alignItems: 'center', paddingVertical: 4 },
  resendText: { color: '#0F62FE', fontSize: 14, fontWeight: '500' },
  resendDisabled: { color: '#9CA3AF' },
  hint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18, marginTop: 8 },
});
