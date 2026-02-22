import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AppointmentsScreen from '../screens/AppointmentsScreen';
import LabsScreen from '../screens/LabsScreen';
import PharmacyScreen from '../screens/PharmacyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, [IoniconName, IoniconName]> = {
  Appointments: ['calendar', 'calendar-outline'],
  Labs:         ['flask', 'flask-outline'],
  Pharmacy:     ['medical', 'medical-outline'],
  Profile:      ['person', 'person-outline'],
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const [active, inactive] = TAB_ICONS[route.name as keyof MainTabParamList];
        return {
          headerShown: false,
          tabBarActiveTintColor: '#0F62FE',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E2E8F0',
            paddingBottom: 4,
            height: 58,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? active : inactive} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{ title: 'Visits' }}
      />
      <Tab.Screen name="Labs" component={LabsScreen} />
      <Tab.Screen name="Pharmacy" component={PharmacyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
