import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sos" />
        <Stack.Screen name="medicines" />
        <Stack.Screen name="beds" />
        <Stack.Screen name="blood-donation" />
      </Stack>
    </ThemeProvider>
  );
}
