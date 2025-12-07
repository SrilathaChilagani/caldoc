import type { ConfigContext, ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appJson = require('./app.json');

export default function createExpoConfig(_: ConfigContext): ExpoConfig {
  const baseConfig: ExpoConfig = appJson.expo;
  const appEnv = process.env.APP_ENV ?? 'production';

  const fallbackProdBase = baseConfig.extra?.EXPO_PUBLIC_API_BASE ?? 'https://www.caldoc.in';
  const fallbackDevBase = baseConfig.extra?.EXPO_PUBLIC_DEV_API_BASE ?? 'http://10.0.2.2:3000';
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE;
  const apiBase = appEnv === 'development' ? explicitBase ?? fallbackDevBase : explicitBase ?? fallbackProdBase;

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra ?? {}),
      APP_ENV: appEnv,
      EXPO_PUBLIC_API_BASE: apiBase,
      EXPO_PUBLIC_DEV_API_BASE: fallbackDevBase,
    },
  };
}
