import * as Linking from 'expo-linking';

const config = {
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
};

export const linking = {
  prefixes: [Linking.createURL('/'), 'caldoc://', 'https://www.caldoc.in/app'],
  config,
};
