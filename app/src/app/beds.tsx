import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Radius, Spacing } from '@/constants/theme';

// ⚠️ Replace with your laptop's local IP when testing on a physical phone (same as sos.tsx)
const BACKEND_URL = 'http://10.0.2.2:5000';

type Hospital = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  totalBeds?: number;
  availableBeds?: number;
  icuTotal?: number;
  icuAvailable?: number;
  isTraumaCenter?: boolean;
  // older/dashboard-style field names, kept as a fallback
  generalBeds?: number;
  icuBeds?: number;
};

type UserLocation = { lat: number; lng: number };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function availabilityColor(available: number, threshold: number) {
  if (available > threshold) return '#2ecc71';
  if (available > 0) return '#f39c12';
  return '#e74c3c';
}

export default function BedsScreen() {
  const router = useRouter();
  const { id: highlightId } = useLocalSearchParams<{ id?: string }>();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  // Grab the user's GPS once so we can rank hospitals nearest-first
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setLocationNote('Location permission denied — showing all hospitals');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch (e) {
        if (!cancelled) {
          console.error('Location error:', e);
          setLocationNote('Could not get your location — showing all hospitals');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchHospitals = useCallback(async () => {
    setError(null);
    try {
      if (!refreshing) setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/hospitals`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchHospitals error:', err);
      setError('Could not load hospital data. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHospitals();
  }, [fetchHospitals]);

  // Nearest-first ordering when we have the user's location
  const sortedHospitals = useMemo(() => {
    if (!location) return hospitals;
    return [...hospitals].sort((a, b) => {
      if (a.lat == null || a.lng == null) return 1;
      if (b.lat == null || b.lng == null) return -1;
      return (
        haversineKm(location.lat, location.lng, a.lat, a.lng) -
        haversineKm(location.lat, location.lng, b.lat, b.lng)
      );
    });
  }, [hospitals, location]);

  const distanceTo = (h: Hospital) => {
    if (!location || h.lat == null || h.lng == null) return null;
    const km = haversineKm(location.lat, location.lng, h.lat, h.lng);
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  };

  const renderHospital = ({ item, index }: { item: Hospital; index: number }) => {
    const availGeneral = item.availableBeds ?? item.generalBeds ?? 0;
    const availIcu = item.icuAvailable ?? item.icuBeds ?? 0;
    const isNearest = index === 0 && sortedHospitals.length > 0 && !!location;
    const isHighlighted = !!highlightId && item.id === highlightId;

    return (
      <Pressable
        onPress={() => router.push(`/hospital-detail?id=${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.75 },
          isHighlighted && { borderWidth: 1, borderColor: AppColors.emergency },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.hospitalName}>{item.name}</Text>
              {isNearest ? (
                <View style={styles.nearestBadge}>
                  <Ionicons name="navigate" size={11} color="#0A0A0B" />
                  <Text style={styles.nearestBadgeText}>Nearest</Text>
                </View>
              ) : null}
            </View>
            {item.address ? <Text style={styles.hospitalAddress}>{item.address}</Text> : null}
          </View>
          <View style={styles.cardRight}>
            {distanceTo(item) ? <Text style={styles.distance}>{distanceTo(item)}</Text> : null}
            <Ionicons name="chevron-forward" size={18} color={AppColors.textSecondary} />
          </View>
        </View>

        <View style={styles.bedsRow}>
          <View style={styles.bedPill}>
            <View style={[styles.dot, { backgroundColor: availabilityColor(availGeneral, 5) }]} />
            <Text style={styles.bedText}>
              General: {availGeneral}
              {item.totalBeds ? ` / ${item.totalBeds}` : ''}
            </Text>
          </View>
          <View style={styles.bedPill}>
            <View style={[styles.dot, { backgroundColor: availabilityColor(availIcu, 2) }]} />
            <Text style={styles.bedText}>
              ICU: {availIcu}
              {item.icuTotal ? ` / ${item.icuTotal}` : ''}
            </Text>
          </View>
          {item.isTraumaCenter ? (
            <View style={styles.traumaPill}>
              <Text style={styles.traumaText}>Trauma</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Bed Availability" />

        {locationNote ? (
          <View style={styles.locationNote}>
            <Ionicons name="location-outline" size={14} color={AppColors.textSecondary} />
            <Text style={styles.locationNoteText}>{locationNote}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={AppColors.emergency} />
            <Text style={styles.stateText}>Loading hospitals…</Text>
          </View>
        ) : error ? (
          <Pressable style={styles.centerState} onPress={onRefresh}>
            <Ionicons name="cloud-offline-outline" size={28} color={AppColors.textSecondary} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.stateText}>Tap to retry</Text>
          </Pressable>
        ) : (
          <FlatList
            data={sortedHospitals}
            keyExtractor={(item) => item.id}
            renderItem={renderHospital}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.stateText}>No hospital data available</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three },

  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    backgroundColor: AppColors.backgroundElement,
  },
  locationNoteText: { color: AppColors.textSecondary, fontSize: 12, flex: 1 },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  stateText: { color: AppColors.textSecondary, marginTop: Spacing.two },
  errorText: { color: AppColors.emergency, fontWeight: '600', textAlign: 'center' },

  listContent: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },

  card: {
    backgroundColor: AppColors.backgroundElement,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hospitalName: { color: AppColors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  hospitalAddress: { color: AppColors.textSecondary, fontSize: 12, marginTop: Spacing.one },

  nearestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: AppColors.success,
    borderRadius: Radius.full,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  nearestBadgeText: { color: '#0A0A0B', fontSize: 11, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', gap: Spacing.one },
  distance: { color: AppColors.textSecondary, fontSize: 13, fontWeight: '600' },

  bedsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.three,
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  bedPill: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 10, marginRight: Spacing.two },
  bedText: { color: AppColors.textSecondary, fontSize: 13 },

  traumaPill: {
    backgroundColor: AppColors.emergencyGlow,
    borderRadius: Radius.full,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  traumaText: { color: AppColors.emergency, fontSize: 11, fontWeight: '700' },
});