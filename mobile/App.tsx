import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/theme';
import { RootNavigator } from './src/navigation';
import { ToastProvider } from './src/components';
import 'react-native-gesture-handler';

export default function App() {
  // TODO: Replace with actual authentication logic
  const [isAuthenticated] = useState(true);

  return (
    <ThemeProvider>
      <ToastProvider>
        <RootNavigator isAuthenticated={isAuthenticated} />
        <StatusBar style="auto" />
      </ToastProvider>
    </ThemeProvider>
  );
}
