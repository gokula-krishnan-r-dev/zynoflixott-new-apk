import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import SplashScreenComponent from '../components/SplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [appReady, setAppReady] = useState(false);
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);

  useEffect(() => {
    if (loaded) {
      // Hide the native splash screen
      SplashScreen.hideAsync();
      // Mark app as ready after resources are loaded
      setAppReady(true);
    }
  }, [loaded]);

  const onSplashAnimationComplete = () => {
    setSplashAnimationComplete(true);
  };

  // If the app is not fully ready, or the splash animation is still showing
  if (!appReady || !splashAnimationComplete) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {appReady && <SplashScreenComponent onFinish={onSplashAnimationComplete} />}
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
