import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Colors from '@/constants/Colors';

/**
 * R16 — primitive de squelette (placeholder gris) pour les états de chargement.
 *
 * Remplace les `ActivityIndicator` nus par des placeholders structurés qui
 * annoncent la forme du contenu à venir (meilleure perception de performance
 * que un spinner isolé). Volontairement statique (pas d'animation shimmer) pour
 * rester léger et éviter une boucle Animated dans les tests Jest.
 */
export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        styles.base,
        {
          width: width as any,
          height: height as any,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

/**
 * R16 — squelette d'une carte annonce, calqué sur le `renderListing` de
 * my-listings (vignette + titre + localisation + prix + actions). Utilisé en
 * lieu et place du spinner plein écran pendant le chargement de la liste.
 */
export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={80} height={80} borderRadius={12} />
      <View style={styles.content}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} style={styles.gap} />
        <Skeleton width="40%" height={16} style={styles.gap} />
      </View>
      <View style={styles.actions}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width={32} height={32} borderRadius={16} style={styles.gap} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.neutral[200],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 12,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gap: {
    marginTop: 8,
  },
});

export default Skeleton;