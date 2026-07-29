import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors, { lightTheme } from '@/constants/Colors';

interface ScreenLoaderProps {
  backgroundColor?: string;
  testID?: string;
}

export function ScreenLoader({
  backgroundColor = Colors.background.primary,
  testID = 'screen-loader',
}: ScreenLoaderProps) {
  return (
    <View style={[styles.container, { backgroundColor }]} testID={testID}>
      <ActivityIndicator
        size="large"
        color={lightTheme.colors.primary}
        testID="activity-indicator"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ScreenLoader;
