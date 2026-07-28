import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Spacing } from '@/constants/theme';

export default function BloodDonationScreen() {
  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Blood Donation" />
        <Text style={styles.text}>Find nearby blood donation drives through partner NGOs.</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  text: { color: AppColors.textSecondary, paddingHorizontal: Spacing.three },
});