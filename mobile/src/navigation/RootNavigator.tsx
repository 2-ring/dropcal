import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { useTheme } from '../theme';
import { Sidebar } from './Sidebar';
import { linking } from './linking';
import { EventEditScreen, SettingsScreen, HomeScreen } from '../screens';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { fonts } from '../utils/fonts';

// Placeholder screens - will be implemented by other agents
const PlansScreen = () => null;
const SignInScreen = () => null;

export type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  Plans: undefined;
  EventEdit: { eventId?: string };
  SignIn: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  isAuthenticated: boolean;
}

export default function RootNavigator({ isAuthenticated }: RootNavigatorProps) {
  const { theme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fontsLoaded] = useFonts(fonts);

  // Show loading indicator while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            cardStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="SignIn" component={SignInScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      {/* Sidebar Overlay */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSessionClick={(sessionId) => {
          // Navigate to session
          setIsSidebarOpen(false);
        }}
        onSettings={() => {
          setIsSidebarOpen(false);
          // Navigate to settings
        }}
        onSignOut={() => {
          setIsSidebarOpen(false);
          // Sign out logic
        }}
      />

      <View style={{ flex: 1 }}>
        {/* Hamburger Menu Button (Fixed Position) */}
        {!isSidebarOpen && (
          <Pressable
            style={[styles.menuButton, { backgroundColor: 'transparent' }]}
            onPress={() => setIsSidebarOpen(true)}
          >
            <Logo size={32} />
          </Pressable>
        )}

        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            cardStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {/* Main Screen (Home) */}
          <Stack.Screen name="Main" component={HomeScreen} />

          {/* Modal Screens */}
          <Stack.Group
            screenOptions={{
              presentation: 'modal',
              cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
              headerShown: true,
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTintColor: theme.colors.textPrimary,
              headerTitleStyle: {
                fontWeight: '600',
              },
            }}
          >
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="Plans"
              component={PlansScreen}
              options={{ title: 'Plans' }}
            />
            <Stack.Screen
              name="EventEdit"
              component={EventEditScreen}
              options={({ route }) => ({
                title: route.params?.eventId ? 'Edit Event' : 'New Event',
              })}
            />
          </Stack.Group>
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1001,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});