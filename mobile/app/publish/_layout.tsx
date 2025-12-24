import { Stack } from 'expo-router';
import Colors from '@/constants/Colors';

export default function PublishLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '',
        headerTintColor: Colors.secondary[800],
        headerStyle: { backgroundColor: Colors.background.primary },
        contentStyle: { backgroundColor: Colors.background.secondary },
      }}
    />
  );
}
