import * as Linking from 'expo-linking';
import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'caldoc://', 'https://www.caldoc.in/app'],
  config: {
    screens: {
      Web:   'web',
      Login: 'login',
      Main: {
        screens: {
          Appointments: 'appointments',
          Labs:         'labs',
          Pharmacy:     'pharmacy',
          Profile:      'profile',
        },
      },
      Visit: 'visit/:appointmentId',
    },
  },
};
