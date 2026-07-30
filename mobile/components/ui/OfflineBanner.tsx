import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { lightTheme } from '@/constants/Colors';

/**
 * R15 — bannière hors-ligne mobile.
 *
 * S'appuie sur NetInfo (qui alimente aussi l'onlineManager de React Query via
 * _layout). Affichée en surposition quand l'app perd la connectivité, pour
 * prévenir que les données affichées sont en cache et seront resynchronisées
 * au retour réseau. Rien ne s'affiche tant que NetInfo n'a pas déterminé l'état
 * (isConnected undefined au tout premier rendu) pour éviter un flash.
 */
export function OfflineBanner() {
  const netInfo = useNetInfo();

  const offline =
    netInfo.isConnected === false ||
    netInfo.isInternetReachable === false;

  if (!offline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Text style={styles.text}>
        Mode hors-ligne — les données sont en cache.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: lightTheme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 9999,
    elevation: 4,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default OfflineBanner;