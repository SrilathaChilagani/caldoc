import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Web: undefined;
  Visit: { appointmentId: string; role?: 'patient' | 'provider'; name?: string };
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <WebView source={{ uri: 'https://www.caldoc.in' }} />
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('Login')}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 30,
            backgroundColor: '#0F62FE',
            borderRadius: 999,
            paddingHorizontal: 20,
            paddingVertical: 12,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Patient portal</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
