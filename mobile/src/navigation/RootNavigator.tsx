import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/config';

import MainTabNavigator from './MainTabNavigator';
import AuthNavigator from './AuthNavigator';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import ChatScreen from '../screens/ChatScreen';
import EditListingScreen from '../screens/EditListingScreen';
import VisitBookingScreen from '../screens/VisitBookingScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isAuthenticated === false ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ListingDetail"
              component={ListingDetailScreen}
              options={{
                title: '',
                headerBackTitle: 'Retour',
                headerTintColor: COLORS.primary[500],
              }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{
                title: 'Recherche',
                headerBackTitle: 'Retour',
                headerTintColor: COLORS.primary[500],
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{
                title: 'Messages',
                headerBackTitle: 'Retour',
                headerTintColor: COLORS.primary[500],
              }}
            />
            <Stack.Screen
              name="EditListing"
              component={EditListingScreen}
              options={{
                title: 'Publier une annonce',
                headerBackTitle: 'Retour',
                headerTintColor: COLORS.primary[500],
              }}
            />
            <Stack.Screen
              name="VisitBooking"
              component={VisitBookingScreen}
              options={{
                title: 'Réserver une visite',
                headerBackTitle: 'Retour',
                headerTintColor: COLORS.primary[500],
              }}
            />
            <Stack.Screen
              name="UserProfile"
              component={UserProfileScreen}
              options={{
                title: 'Profil',
                headerBackTitle: 'Retour',
                headerTintColor: COLORS.primary[500],
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
