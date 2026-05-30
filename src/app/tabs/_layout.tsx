// src/app/tabs/_layout.tsx
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/constants/theme';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

type TabIconProps = {
  color: ColorValue;
  focused: boolean;
  name: TabIconName;
  selectedName: TabIconName;
};

function TabIcon({ color, focused, name, selectedName }: TabIconProps) {
  return <Ionicons color={color} name={focused ? selectedName : name} size={22} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.warmCream,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          lineHeight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="home-outline" selectedName="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="heart-outline" selectedName="heart" />
          ),
        }}
      />
      <Tabs.Screen
        name="couple"
        options={{
          title: 'Couple',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="people-outline" selectedName="people" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} focused={focused} name="settings-outline" selectedName="settings" />
          ),
        }}
      />
    </Tabs>
  );
}
