import { SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView source={{ uri: 'https://www.caldoc.in' }} />
    </SafeAreaView>
  );
}
