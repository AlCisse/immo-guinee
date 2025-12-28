import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUnreadMessages } from '@/lib/hooks/useUnreadMessages';
import Colors, { lightTheme } from '@/constants/Colors';
import { haptics } from '@/lib/haptics';

export default function TabLayout() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Responsive: tablet has larger icons
  const isTablet = width >= 768;
  const iconSize = isTablet ? 26 : 22;
  const tabBarHeight = isTablet ? 70 : 60;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: lightTheme.colors.primary,
        tabBarInactiveTintColor: lightTheme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: lightTheme.colors.tabBar,
          borderTopWidth: 0,
          height: tabBarHeight + Math.max(insets.bottom, 10),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: isTablet ? 40 : 0,
          // Shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 15,
        },
        tabBarLabelStyle: {
          fontSize: isTablet ? 12 : 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tabs.favorites'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={iconSize}
              color={color}
            />
          ),
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <Ionicons
                name={focused ? 'chatbubble' : 'chatbubble-outline'}
                size={iconSize}
                color={color}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          href: isAuthenticated ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
