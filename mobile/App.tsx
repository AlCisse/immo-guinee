import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Simple test screens
const TestScreen = ({ navigation }: any) => (
  <View style={styles.screen}>
    <Text style={styles.title}>ImmoGuinée</Text>
    <Text style={styles.subtitle}>SDK 54 - Navigation fonctionne!</Text>
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Second')}
    >
      <Text style={styles.buttonText}>Aller à Second</Text>
    </TouchableOpacity>
  </View>
);

const SecondScreen = ({ navigation }: any) => (
  <View style={styles.screen}>
    <Text style={styles.title}>Second Screen</Text>
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.goBack()}
    >
      <Text style={styles.buttonText}>Retour</Text>
    </TouchableOpacity>
  </View>
);

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={TestScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Second"
              component={SecondScreen}
              options={{ title: 'Second' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
