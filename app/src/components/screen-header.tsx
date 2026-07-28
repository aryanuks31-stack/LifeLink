import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, Spacing } from '@/constants/theme';

export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: AppColors.text, fontSize: 22, marginTop: -2 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: AppColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  spacer: { width: 36 },
});