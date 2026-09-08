import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Radius, Spacing } from '@/constants/theme';

// ⚠️ Replace with your laptop's local IP when testing on a physical phone (same as beds.tsx)
const BACKEND_URL = 'http://10.0.2.2:5000';

type HospitalDetail = {
  id: string;
  name?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  totalBeds?: number;
  availableBeds?: number;
  icuTotal?: number;
  icuAvailable?: number;
  isTraumaCenter?: boolean;
  rating?: number;
  lastUpdated?: unknown;
  // older/dashboard-style field names, kept as a fallback
  generalBeds?: number;
  icuBeds?: number;
};

function availabilityColor(available: number, threshold: number) {
  if (available > threshold) return '#2ecc71';
  if (available > 0) return '#f39c12';
  return '#e74c3c';
}

function formatUpdated(value: unknown) {
  if (!value) return null;
  let seconds: number | undefined;
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    seconds =
      typeof v.seconds === 'number' ? v.seconds : typeof v._seconds === 'number' ? v._seconds : undefined;
  }
  if (seconds != null) return new Date(seconds * 1000).toLocaleString();
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

function BedCard({
  label,
  available,
  total,
  color,
}: {
  label: string;
  available: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(100, (available / total) * 100) : 100;
  return (
    <View style={styles.bedCard}>
      <View style={styles.bedCardHeader}>
        <Text style={styles.bedLabel}>{label}</Text>
        <Text style={[styles.bedCount, { color }]}>
          {total > 0 ? `${available} of ${total} available` : `${available} available`}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [hospital, setHospital] = useState<HospitalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHospital = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/hospitals/${id}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setHospital(data);
    } catch (err) {
      console.error('fetchHospital error:', err);
      setError('Could not load hospital details. Tap to retry.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchHospital();
  }, [fetchHospital]);

  const updated = formatUpdated(hospital?.lastUpdated);

  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Hospital Details" />

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={AppColors.emergency} />
            <Text style={styles.stateText}>Loading hospital…</Text>
          </View>
        ) : error || !hospital ? (
          <Pressable style={styles.centerState} onPress={fetchHospital}>
            <Ionicons name="cloud-offline-outline" size={28} color={AppColors.textSecondary} />
            <Text style={styles.errorText}>{error ?? 'Hospital not found'}</Text>
            <Text style={styles.stateText}>Tap to retry</Text>
          </Pressable>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{hospital.name ?? 'Hospital'}</Text>
              {hospital.isTraumaCenter ? (
                <View style={styles.traumaPill}>
                  <Text style={styles.traumaText}>Trauma</Text>
                </View>
              ) : null}
            </View>

            {hospital.rating != null ? (
              <View style={styles.metaRow}>
                <Ionicons name="star" size={14} color="#f5b301" />
                <Text style={styles.metaText}>{hospital.rating.toFixed(1)} rating</Text>
              </View>
            ) : null}

            <View style={styles.infoCard}>
              {hospital.address ? (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color={AppColors.textSecondary} />
                  <Text style={styles.infoText}>{hospital.address}</Text>
                </View>
              ) : null}
              {hospital.phone ? (
                <Pressable
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`tel:${hospital.phone}`)}
                >
                  <Ionicons name="call-outline" size={18} color={AppColors.success} />
                  <Text style={[styles.infoText, { color: AppColors.success }]}>{hospital.phone}</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Bed Availability</Text>

            <BedCard
              label="General Beds"
              available={hospital.availableBeds ?? hospital.generalBeds ?? 0}
              total={hospital.totalBeds ?? 0}
              color={availabilityColor(hospital.availableBeds ?? hospital.generalBeds ?? 0, 5)}
            />
            <BedCard
              label="ICU Beds"
              available={hospital.icuAvailable ?? hospital.icuBeds ?? 0}
              total={hospital.icuTotal ?? 0}
              color={availabilityColor(hospital.icuAvailable ?? hospital.icuBeds ?? 0, 2)}
            />

            {updated ? <Text style={styles.updated}>Updated {updated}</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  stateText: { color: AppColors.textSecondary, marginTop: Spacing.two },
  errorText: { color: AppColors.emergency, fontWeight: '600', textAlign: 'center' },

  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name: { color: AppColors.text, fontSize: 20, fontWeight: '800', flexShrink: 1 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.two },
  metaText: { color: AppColors.textSecondary, fontSize: 13 },

  infoCard: {
    marginTop: Spacing.three,
    backgroundColor: AppColors.backgroundElement,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  infoText: { color: AppColors.textSecondary, fontSize: 14, flex: 1 },

  sectionTitle: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },

  bedCard: {
    backgroundColor: AppColors.backgroundElement,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  bedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  bedLabel: { color: AppColors.text, fontSize: 14, fontWeight: '600' },
  bedCount: { fontSize: 13, fontWeight: '700' },

  barTrack: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: AppColors.backgroundSelected,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.full },

  traumaPill: {
    backgroundColor: AppColors.emergencyGlow,
    borderRadius: Radius.full,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  traumaText: { color: AppColors.emergency, fontSize: 12, fontWeight: '700' },

  updated: { color: AppColors.textSecondary, fontSize: 12, marginTop: Spacing.two, textAlign: 'right' },
});