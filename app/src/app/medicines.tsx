import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Spacing } from '@/constants/theme';

export default function MedicinesScreen() {
  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Medicines" />
        <Text style={styles.text}>Order and refill medicines here.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  text: { color: AppColors.textSecondary, paddingHorizontal: Spacing.three },
})