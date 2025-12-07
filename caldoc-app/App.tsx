import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VisitScreen from './src/screens/VisitScreen';
import { getToken } from './src/lib/auth';
import { CalDocTheme } from './src/theme';
import { linking } from './src/navigation/linking';

type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Web: undefined;
  Visit: { appointmentId: string; role?: 'patient' | 'provider'; name?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Web');
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          setInitialRoute('Dashboard');
        } else {
          setInitialRoute('Web');
        }
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer theme={CalDocTheme} linking={linking}>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Web" component={HomeScreen} />
          <Stack.Screen name="Visit" component={VisitScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </>
  );
}
