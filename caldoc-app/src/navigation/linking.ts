import * as Linking from 'expo-linking';

const config = {
  screens: {
    Login: 'login',
    Dashboard: 'dashboard',
    Web: 'web',
    Visit: 'visit/:appointmentId',
  },
};

export const linking = {
  prefixes: [Linking.createURL('/'), 'caldoc://', 'https://www.caldoc.in/app'],
  config,
};
