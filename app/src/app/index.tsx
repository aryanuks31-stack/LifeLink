import { BACKEND_URL } from '../constants/api';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppColors, Radius, Spacing } from '@/constants/theme';

const DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f';

type Hospital = {
  id: string;
  name: string;
  address?: string;
  availableBeds?: number;
  icuAvailable?: number;
  totalBeds?: number;
  icuTotal?: number;
  lat?: number;
  lng?: number;
  phone?: string;
  isTraumaCenter?: boolean;
  rating?: number;
  // older/dashboard-style field names, kept as a fallback — same as beds.tsx
  generalBeds?: number;
  icuBeds?: number;
};

export default function IndexScreen() {
  const router = useRouter();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const windowW = Dimensions.get('window').width;

  // --------------------------------------------------
  // FETCH HOSPITALS
  // --------------------------------------------------

  const fetchHospitals = useCallback(async () => {
    const url = `${BACKEND_URL}/api/hospitals`;

    try {
      setError(null);
      if (!refreshing) setLoading(true);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('Server returned invalid JSON');
      }

      if (!Array.isArray(data)) {
        throw new Error('Hospital API did not return an array');
      }

      setHospitals(data as Hospital[]);
    } catch (err) {
      console.error('fetchHospitals error:', err);
      setHospitals([]);
      setError('Could not load hospital data. Tap to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchHospitals();
  }, [fetchHospitals]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHospitals();
  }, [fetchHospitals]);

  // --------------------------------------------------
  // SEND SOS
  // --------------------------------------------------

  const sendSOS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to send SOS.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const payload = { userId: DEMO_USER_ID, lat: latitude, lng: longitude };
      const url = `${BACKEND_URL}/api/sos/trigger`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error('Invalid SOS response:', responseText);
      }

      if (!response.ok) {
        Alert.alert('Error', data?.message || `Server returned ${response.status}`);
        return;
      }

      Alert.alert('SOS Sent', `Contacts notified: ${data.contactsNotified ?? 0}`);
    } catch (error) {
      console.error('SOS network error:', error);
      Alert.alert('Network error', 'Could not reach server. Check your internet connection.');
    }
  };

  const triggerSOS = () => {
    Alert.alert(
      'Trigger SOS',
      'Are you sure you want to alert your emergency contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'destructive', onPress: sendSOS },
      ],
    );
  };

  // --------------------------------------------------
  // HOSPITAL CARD
  // --------------------------------------------------

  const renderHospital = ({ item }: { item: Hospital }) => {
    // Fallback to older field names, same as beds.tsx — this is what fixes
    // the "always shows 0" bug: the API sometimes returns generalBeds/icuBeds
    // instead of availableBeds/icuAvailable, and this screen wasn't checking them.
    const availableBeds = item.availableBeds ?? item.generalBeds ?? 0;
    const icuAvailable = item.icuAvailable ?? item.icuBeds ?? 0;

    const generalColor = availableBeds > 5 ? '#2ecc71' : availableBeds > 0 ? '#f39c12' : '#e74c3c';
    const icuColor = icuAvailable > 2 ? '#2ecc71' : icuAvailable > 0 ? '#f39c12' : '#e74c3c';

    return (
      <Pressable style={styles.hospitalCard} onPress={() => router.push(`./beds?id=${item.id}`)}>
        <View style={styles.hospitalInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.hospitalName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isTraumaCenter && (
              <View style={styles.traumaBadge}>
                <Text style={styles.traumaText}>TRAUMA</Text>
              </View>
            )}
          </View>

          {item.address ? (
            <Text style={styles.hospitalAddress} numberOfLines={2}>
              {item.address}
            </Text>
          ) : null}

          <View style={styles.bedsRow}>
            <View style={styles.bedPill}>
              <View style={[styles.dot, { backgroundColor: generalColor }]} />
              <Text style={styles.bedText}>Beds: {availableBeds}</Text>
            </View>

            <View style={styles.bedPill}>
              <View style={[styles.dot, { backgroundColor: icuColor }]} />
              <Text style={styles.bedText}>ICU: {icuAvailable}</Text>
            </View>

            {item.rating !== undefined && (
              <View style={styles.rating}>
                <Ionicons name="star" size={13} color="#f1c40f" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={22} color={AppColors.textSecondary} />
      </Pressable>
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>LifeLink</Text>
        </View>

        {/* SOS */}
        <View style={[styles.sosContainer, { width: windowW - Spacing.four * 2 }]}>
          <Text style={styles.sosTitle}>Emergency</Text>
          <Text style={styles.sosSubtitle}>One tap to alert your emergency contacts</Text>

          <Pressable style={styles.sosButton} onPress={triggerSOS}>
            <Ionicons name="warning" size={28} color="#fff" />
            <Text style={styles.sosButtonText}>Send SOS</Text>
          </Pressable>
        </View>

        {/* HOSPITAL HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Hospitals</Text>
          <Text style={styles.sectionSub}>Live bed availability</Text>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={AppColors.emergency} />
            <Text style={styles.loadingText}>Loading hospitals…</Text>
          </View>
        ) : error ? (
          <Pressable style={styles.empty} onPress={onRefresh}>
            <Ionicons name="cloud-offline-outline" size={42} color={AppColors.emergency} />
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.tapToRetry}>Tap to retry</Text>
          </Pressable>
        ) : (
          <FlatList
            data={hospitals}
            keyExtractor={(item) => item.id}
            renderItem={renderHospital}
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: Spacing.four }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="business-outline" size={42} color={AppColors.textSecondary} />
                <Text style={styles.emptyText}>No hospital data available</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  title: { fontSize: 22, fontWeight: '700', color: AppColors.text },

  sosContainer: {
    marginTop: Spacing.four,
    borderRadius: Radius.medium,
    padding: Spacing.four,
    backgroundColor: AppColors.backgroundElement,
  },
  sosTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  sosSubtitle: { color: AppColors.textSecondary, marginTop: Spacing.one, marginBottom: Spacing.three },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.emergency,
    paddingVertical: Spacing.three + 2,
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  sosButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  sectionHeader: { marginTop: Spacing.four + 2, marginBottom: Spacing.two, paddingHorizontal: Spacing.four },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  sectionSub: { color: AppColors.textSecondary, fontSize: 12 },

  loader: { marginTop: Spacing.six, alignItems: 'center' },
  loadingText: { marginTop: Spacing.two, color: AppColors.textSecondary },

  empty: { alignItems: 'center', marginTop: Spacing.six, paddingHorizontal: Spacing.four },
  emptyText: { color: AppColors.textSecondary, marginTop: Spacing.two },
  errorText: { color: AppColors.emergency, fontWeight: '600', textAlign: 'center', marginTop: Spacing.two },
  tapToRetry: { color: AppColors.textSecondary, marginTop: Spacing.two },

  hospitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: AppColors.backgroundElement,
  },
  hospitalInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  hospitalName: { fontWeight: '700', fontSize: 15, color: AppColors.text, flexShrink: 1 },
  hospitalAddress: { color: AppColors.textSecondary, fontSize: 12, marginTop: Spacing.one },

  bedsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two, gap: Spacing.two },
  bedPill: { flexDirection: 'row', alignItems: 'center', marginRight: Spacing.one },
  dot: { width: 10, height: 10, borderRadius: 10, marginRight: Spacing.one },
  bedText: { color: AppColors.textSecondary, fontSize: 13 },

  rating: { flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.one },
  ratingText: { marginLeft: 3, fontSize: 12, color: AppColors.textSecondary },

  traumaBadge: {
    marginLeft: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
    backgroundColor: AppColors.emergencyGlow,
  },
  traumaText: { fontSize: 9, fontWeight: '700', color: AppColors.emergency },
});
