import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';
import type WebViewType from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BookVisit'>;

const BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://www.caldoc.in';
const BASE_HOST = new URL(BASE).host;

export default function BookVisitScreen({ route }: Props) {
  const { slug } = route.params;
  const url = `${BASE}/book/${slug}?embed=1`;
  const webRef = useRef<WebViewType>(null);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.web}
        onNavigationStateChange={(nav) => {
          const navUrl = nav.url;
          if (navUrl.includes(BASE_HOST) && !navUrl.includes('embed=1')) {
            const sep = navUrl.includes('?') ? '&' : '?';
            webRef.current?.injectJavaScript(
              `window.location.replace(${JSON.stringify(navUrl + sep + 'embed=1')});true;`
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  web: { flex: 1 },
});
