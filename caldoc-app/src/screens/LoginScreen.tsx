import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { requestOtp, login, emailLogin, emailRegister, requestPasswordReset } from '../lib/auth';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type AuthTab = 'mobile' | 'email';
type EmailStep = 'signin' | 'signup' | 'forgot' | 'forgot_sent';
type OtpStep = 'phone' | 'otp';

export default function LoginScreen({ navigation, route }: Props) {
  const returnTab = route.params?.returnTab;

  // Tab
  const [authTab, setAuthTab] = useState<AuthTab>('mobile');

  // Mobile OTP state
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');
  const [phone, setPhone] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Email state
  const [emailStep, setEmailStep] = useState<EmailStep>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function goToMain() {
    navigation.reset({
      index: 0,
      routes: [{
        name: 'Main',
        state: returnTab ? { routes: [{ name: returnTab }] } : undefined,
      }],
    });
  }

  // ─── Mobile OTP ───────────────────────────────────────────────────

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
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
      setOtpStep('otp');
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err) {
      Alert.alert('Could not send OTP', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerify() {
    if (!otp.trim() || otp.trim().length < 4) {
      Alert.alert('Invalid OTP', 'Enter the 6-digit code sent to your WhatsApp.');
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), otp.trim());
      goToMain();
    } catch (err) {
      Alert.alert('Verification failed', err instanceof Error ? err.message : 'Check your OTP and try again.');
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
      Alert.alert('Could not resend OTP', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Email auth ───────────────────────────────────────────────────

  async function handleEmailSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await emailLogin(email.trim().toLowerCase(), password);
      goToMain();
    } catch (err) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignUp() {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Missing name', 'Enter your full name.');
      return;
    }
    if (!emailPhone.trim() || emailPhone.trim().replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid number', 'Enter a valid mobile number.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please re-enter your password.');
      return;
    }
    setLoading(true);
    try {
      await emailRegister(name.trim(), emailPhone.trim(), email.trim().toLowerCase(), password);
      goToMain();
    } catch (err) {
      Alert.alert('Registration failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid email', 'Enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setEmailStep('forgot_sent');
    } catch (err) {
      Alert.alert('Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  function renderMobileTab() {
    if (otpStep === 'phone') {
      return (
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
            <Text style={styles.primaryBtnText}>{loading ? 'Sending OTP…' : 'Continue'}</Text>
            {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <TouchableOpacity style={styles.backBtn} onPress={() => { if (cooldownRef.current) clearInterval(cooldownRef.current); setOtpStep('phone'); setOtp(''); setCooldown(0); }}>
          <Ionicons name="chevron-back" size={20} color="#2f6ea5" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to your WhatsApp{'\n'}
          <Text style={styles.highlight}>{maskedPhone}</Text>
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
            onSubmitEditing={handleOtpVerify}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, (loading || !otp.trim()) && styles.btnDisabled]}
          onPress={handleOtpVerify}
          disabled={loading || !otp.trim()}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Verifying…' : 'Verify & Sign in'}</Text>
          {!loading && <Ionicons name="checkmark" size={18} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || loading} style={styles.linkBtn}>
          <Text style={[styles.linkText, cooldown > 0 && styles.linkDisabled]}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive it? Resend OTP"}
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderEmailTab() {
    if (emailStep === 'forgot') {
      return (
        <>
          <TouchableOpacity style={styles.backBtn} onPress={() => setEmailStep('signin')}>
            <Ionicons name="chevron-back" size={20} color="#2f6ea5" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Enter your email and we'll send a reset link.</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="send"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleForgotPassword}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (!email.trim() || loading) && styles.btnDisabled]}
            onPress={handleForgotPassword}
            disabled={!email.trim() || loading}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
          </TouchableOpacity>
        </>
      );
    }

    if (emailStep === 'forgot_sent') {
      return (
        <>
          <View style={styles.successIcon}>
            <Ionicons name="mail-open-outline" size={40} color="#2f6ea5" />
          </View>
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.subtitle}>
            We sent a password reset link to{'\n'}
            <Text style={styles.highlight}>{email}</Text>
            {'\n\n'}Click the link in the email to set a new password. It expires in 1 hour.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setEmailStep('signin'); setEmail(''); }}>
            <Text style={styles.primaryBtnText}>Back to sign in</Text>
          </TouchableOpacity>
        </>
      );
    }

    // Sub-toggle: Sign In / Sign Up
    return (
      <>
        <View style={styles.subToggle}>
          <TouchableOpacity
            style={[styles.subToggleBtn, emailStep === 'signin' && styles.subToggleActive]}
            onPress={() => setEmailStep('signin')}
          >
            <Text style={[styles.subToggleText, emailStep === 'signin' && styles.subToggleTextActive]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subToggleBtn, emailStep === 'signup' && styles.subToggleActive]}
            onPress={() => setEmailStep('signup')}
          >
            <Text style={[styles.subToggleText, emailStep === 'signup' && styles.subToggleTextActive]}>Sign up</Text>
          </TouchableOpacity>
        </View>

        {emailStep === 'signin' ? (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleEmailSignIn}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { setEmail(''); setEmailStep('forgot'); }} style={styles.forgotBtn}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, (!email.trim() || !password || loading) && styles.btnDisabled]}
              onPress={handleEmailSignIn}
              disabled={!email.trim() || !password || loading}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                returnKeyType="next"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mobile number (e.g. +91 98765 43210)"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                returnKeyType="next"
                value={emailPhone}
                onChangeText={setEmailPhone}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 characters)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                returnKeyType="next"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                returnKeyType="done"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onSubmitEditing={handleEmailSignUp}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleEmailSignUp}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>{loading ? 'Creating account…' : 'Create account'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
          </>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>C</Text>
          </View>
          <Text style={styles.brand}>CalDoc</Text>

          {/* Main tab toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, authTab === 'mobile' && styles.tabBtnActive]}
              onPress={() => { setAuthTab('mobile'); setOtpStep('phone'); }}
            >
              <Ionicons name="logo-whatsapp" size={15} color={authTab === 'mobile' ? '#2f6ea5' : '#9CA3AF'} />
              <Text style={[styles.tabText, authTab === 'mobile' && styles.tabTextActive]}>Mobile OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, authTab === 'email' && styles.tabBtnActive]}
              onPress={() => { setAuthTab('email'); setEmailStep('signin'); }}
            >
              <Ionicons name="mail-outline" size={15} color={authTab === 'email' ? '#2f6ea5' : '#9CA3AF'} />
              <Text style={[styles.tabText, authTab === 'email' && styles.tabTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            {authTab === 'mobile' ? renderMobileTab() : renderEmailTab()}
          </View>

          <Text style={styles.hint}>
            By continuing, you agree to CalDoc's Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFF' },
  flex: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  logoCircle: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#2f6ea5', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  logoLetter: { fontSize: 28, fontWeight: '700', color: '#fff', fontStyle: 'italic' },
  brand: { fontSize: 22, fontWeight: '700', color: '#1e3a52', marginBottom: 20 },

  // Main tab
  tabRow: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    borderRadius: 12, padding: 4, marginBottom: 20,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 9,
  },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#2f6ea5' },

  // Form card
  formCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#1e3a52', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3, gap: 14,
  },

  // Sub-toggle for email (Sign In / Sign Up)
  subToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  subToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  subToggleActive: { backgroundColor: '#fff' },
  subToggleText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  subToggleTextActive: { color: '#1e3a52' },

  title: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 21 },
  highlight: { color: '#0F172A', fontWeight: '600' },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#0F172A', paddingVertical: 13 },
  otpInput: { fontSize: 22, letterSpacing: 6, fontWeight: '600' },
  eyeBtn: { padding: 4 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2f6ea5', borderRadius: 12, paddingVertical: 14,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: '#2f6ea5', fontWeight: '600', fontSize: 14 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  linkBtn: { alignItems: 'center' },
  linkText: { color: '#2f6ea5', fontSize: 13, fontWeight: '600' },
  linkDisabled: { color: '#9CA3AF' },

  successIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },

  hint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16, marginTop: 20 },
});
