import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import FindDoctorScreen from '../screens/FindDoctorScreen';
import SpecialtiesScreen from '../screens/SpecialtiesScreen';
import type { UnauthTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<UnauthTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function UnauthTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const icons: Record<string, [IoniconName, IoniconName]> = {
          Home: ['home', 'home-outline'],
          FindDoctor: ['search', 'search-outline'],
          Specialties: ['grid', 'grid-outline'],
        };
        const [active, inactive] = icons[route.name] ?? ['home', 'home-outline'];
        return {
          headerShown: false,
          tabBarActiveTintColor: '#2f6ea5',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#E2E8F0',
            height: 58,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? active : inactive} size={size} color={color} />
          ),
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="FindDoctor"
        component={FindDoctorScreen}
        options={{ tabBarLabel: 'Find Doctor' }}
      />
      <Tab.Screen
        name="Specialties"
        component={SpecialtiesScreen}
        options={{ tabBarLabel: 'Specialties' }}
      />
    </Tab.Navigator>
  );
}
