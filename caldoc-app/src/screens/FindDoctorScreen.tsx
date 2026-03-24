import { useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import type WebViewType from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE } from '../config/env';

const BASE = API_BASE || 'https://www.caldoc.in';
const BASE_HOST = new URL(BASE).host;

const INJECT_PADDING = `
  (function(){
    var s = document.body.style;
    s.paddingTop = '16px';
  })();
  true;
`;

export default function FindDoctorScreen() {
  const webRef = useRef<WebViewType>(null);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Brand bar sits below status bar, above the WebView */}
      <View style={[styles.brand, { paddingTop: insets.top + 8 }]}>
        <Image
          source={require('../../assets/images/logo-mark.png')}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <View style={styles.brandTextRow}>
          <Text style={styles.brandCal}>CAL</Text>
          <Text style={styles.brandDoc}>D</Text>
          <View style={styles.brandOCircle}><Text style={styles.brandOPlus}>+</Text></View>
          <Text style={styles.brandDoc}>C</Text>
        </View>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: `${BASE}/providers?embed=1` }}
        style={styles.web}
        injectedJavaScript={INJECT_PADDING}
        onNavigationStateChange={(nav) => {
          const url = nav.url;
          if (url.includes(BASE_HOST) && !url.includes('embed=1')) {
            const sep = url.includes('?') ? '&' : '?';
            webRef.current?.injectJavaScript(
              `window.location.replace(${JSON.stringify(url + sep + 'embed=1')});true;`
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  logoImg: { width: 32, height: 32 },
  brandTextRow: { flexDirection: 'row', alignItems: 'center' },
  brandCal: { fontSize: 18, fontWeight: '800', color: '#22a045' },
  brandDoc: { fontSize: 18, fontWeight: '800', color: '#1a5bcc' },
  brandOCircle: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#1a5bcc',
    alignItems: 'center', justifyContent: 'center',
  },
  brandOPlus: { fontSize: 9, fontWeight: '800', color: '#1a5bcc', lineHeight: 12 },
  web: { flex: 1 },
});
