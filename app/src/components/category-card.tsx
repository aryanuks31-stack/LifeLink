import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppColors, Radius, Spacing } from '@/constants/theme';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  featured?: boolean;
  accentColor?: string;
};

export function CategoryCard({ icon, title, subtitle, onPress, featured, accentColor }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        featured && styles.featuredCard,
        { borderColor: AppColors.cardBorder },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          featured && styles.featuredIconWrap,
          { backgroundColor: accentColor ? `${accentColor}22` : AppColors.backgroundSelected },
        ]}
      >
        <Text style={featured ? styles.iconFeatured : styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, featured && styles.titleFeatured]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.backgroundElement,
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  featuredCard: {
    paddingVertical: Spacing.five,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  featuredIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.large,
  },
  icon: { fontSize: 22 },
  iconFeatured: { fontSize: 30 },
  title: { color: AppColors.text, fontSize: 16, fontWeight: '700' },
  titleFeatured: { fontSize: 20 },
  subtitle: { color: AppColors.textSecondary, fontSize: 13 },
});