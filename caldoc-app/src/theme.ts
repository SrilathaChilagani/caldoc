import { DefaultTheme, Theme } from '@react-navigation/native';

export const CalDocTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0F62FE',
    background: '#F8FAFF',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#F97316',
  },
};
