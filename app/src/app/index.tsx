import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryCard } from '@/components/category-card';
import { AppColors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.greeting, { color: AppColors.textSecondary }]}>Welcome back</Text>
          <Text style={[styles.appName, { color: AppColors.text }]}>LifeLink</Text>

          <CategoryCard
            icon="🚨"
            title="SOS Emergency"
            subtitle="Get help immediately"
            featured
            accentColor="#E5484D"
            onPress={() => router.push('/sos')}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <CategoryCard
                icon="💊"
                title="Medicines"
                subtitle="Order & refill"
                accentColor="#5AC8FA"
                onPress={() => router.push('/medicines')}
              />
            </View>
            <View style={styles.half}>
              <CategoryCard
                icon="🏥"
                title="Bed Availability"
                subtitle="Live hospital beds"
                accentColor="#30D158"
                onPress={() => router.push('/beds')}
              />
            </View>
          </View>

          <CategoryCard
            icon="🩸"
            title="Blood Donation"
            subtitle="Donate through partner NGOs"
            accentColor="#FF9F0A"
            onPress={() => router.push('/blood-donation')}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  greeting: { fontSize: 14 },
  appName: { fontSize: 30, fontWeight: '800', marginBottom: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.three },
  half: { flex: 1 },
});