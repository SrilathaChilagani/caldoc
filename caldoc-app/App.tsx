import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import UnauthTabNavigator from './src/navigation/UnauthTabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import VisitScreen from './src/screens/VisitScreen';
import BookVisitScreen from './src/screens/BookVisitScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { getToken } from './src/lib/auth';
import { CalDocTheme } from './src/theme';
import { linking } from './src/navigation/linking';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('UnauthHome');
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        setInitialRoute(token ? 'Main' : 'UnauthHome');
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0F62FE" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer theme={CalDocTheme} linking={linking}>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          {/* Unauthenticated tab hub */}
          <Stack.Screen name="UnauthHome" component={UnauthTabNavigator} />
          <Stack.Screen name="Login" component={LoginScreen} />

          {/* Authenticated — bottom tab hub */}
          <Stack.Screen name="Main" component={MainTabNavigator} />

          {/* Full-screen video visit, reachable from Appointments tab */}
          <Stack.Screen
            name="Visit"
            component={VisitScreen}
            options={{ presentation: 'fullScreenModal' }}
          />

          {/* Booking flow via WebView */}
          <Stack.Screen
            name="BookVisit"
            component={BookVisitScreen}
            options={{
              headerShown: true,
              title: 'Book Appointment',
              headerTintColor: '#2f6ea5',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </>
  );
}
