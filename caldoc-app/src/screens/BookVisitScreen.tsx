import { SafeAreaView, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'BookVisit'>;

const BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://www.caldoc.in';

export default function BookVisitScreen({ route }: Props) {
  const { slug } = route.params;
  const url = `${BASE}/book/${slug}`;

  return (
    <SafeAreaView style={styles.root}>
      <WebView source={{ uri: url }} style={styles.web} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  web: { flex: 1 },
});
