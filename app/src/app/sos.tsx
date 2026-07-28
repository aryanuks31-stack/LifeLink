import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Spacing } from '@/constants/theme';

export default function SOSScreen() {
  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Emergency" />
        <View style={styles.center}>
          <Pressable style={styles.sosCircle}>
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
          <Text style={styles.hint}>Hold for 2 seconds to trigger</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sosCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: AppColors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  hint: { color: AppColors.textSecondary, marginTop: Spacing.three, fontSize: 13 },
});