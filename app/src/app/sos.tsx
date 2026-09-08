import { useRef, useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, Alert, Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Spacing } from '@/constants/theme';

const BACKEND_URL = 'http://172.28.56.178:5000'; // ⚠️ replace with your actual IP (hostname -I)
const DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f'; // real seeded user

const HOLD_DURATION = 1500;

type DispatchInfo = {
  ambulance: {
    id: string;
    vehicleNumber: string;
    type: string;
    currentLat: number;
    currentLng: number;
  } | null;
  driver: {
    id: string;
    name: string;
    phone: string;
    licenseNumber: string;
    rating: number;
  } | null;
  hospital: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone: string;
  } | null;
  etaSeconds: number;
  etaDisplay: string;
  distanceToHospitalMeters: number;
};

export default function SOSScreen() {
  const [loading, setLoading] = useState(false);
  const [holding, setHolding] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dispatch = useRef<DispatchInfo | null>(null);

  const triggerSOS = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to send SOS.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const response = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, lat: latitude, lng: longitude }),
      });

      const data = await response.json();

      if (response.ok && data.message?.includes('help is on the way')) {
        Alert.alert(
          'Help is on the way',
          data.etaDisplay
            ? `An ambulance is being dispatched.\n\nETA: ${data.etaDisplay}\n\nTap OK to see driver & hospital details.`
            : 'An ambulance is being dispatched. Tap OK to see details.',
        );
        dispatch.current = data as DispatchInfo;
      } else {
        Alert.alert('SOS failed', data.message || 'Something went wrong');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('SOS failed', 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  const startHold = () => {
    if (loading) return;
    setHolding(true);
    Animated.timing(scale, { toValue: 0.92, duration: HOLD_DURATION, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      setHolding(false);
      scale.setValue(1);
      triggerSOS();
    }, HOLD_DURATION);
  };

  const cancelHold = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  const openMaps = (lat: number, lng: number, label: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps not available', `Could not open Maps for ${label}.`);
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Emergency" />
        <View style={styles.locationBanner}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.locationText}>Location shared automatically on trigger</Text>
        </View>

        <View style={styles.center}>
          {/* Hold-to-trigger SOS button */}
          <Pressable onPressIn={startHold} onPressOut={cancelHold} disabled={loading}>
            <View style={styles.ring}>
              <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
                <Text style={styles.warningIcon}>{loading ? '…' : '⚠️'}</Text>
                <Text style={styles.sosText}>SOS</Text>
              </Animated.View>
            </View>
          </Pressable>

          <Text style={styles.hint}>
            {loading ? 'Sending alert…' : holding ? 'Keep holding…' : 'Hold for 1.5 seconds to trigger'}
          </Text>

          {/* Dispatch result card */}
          {dispatch.current && (
            <View style={styles.dispatchCard}>
              <Text style={styles.dispatchTitle}>🚑 Help is on the way</Text>

              {/* ETA + distance badges */}
              <View style={styles.etaRow}>
                <View style={styles.etaBadge}>
                  <Text style={styles.etaLabel}>ESTIMATED ARRIVAL</Text>
                  <Text style={styles.etaValue}>{dispatch.current.etaDisplay}</Text>
                </View>
                <View style={styles.etaBadgeSecondary}>
                  <Text style={styles.etaLabel}>DISTANCE</Text>
                  <Text style={styles.etaValue}>
                    {dispatch.current.distanceToHospitalMeters >= 1000
                      ? `${(dispatch.current.distanceToHospitalMeters / 1000).toFixed(1)} km`
                      : `${dispatch.current.distanceToHospitalMeters} m`}
                  </Text>
                </View>
              </View>

              {/* Driver card */}
              {dispatch.current?.driver && (
                <TouchableOpacity
                  style={styles.infoCard}
                  onPress={() =>
                    openMaps(
                      dispatch.current!.ambulance?.currentLat ?? dispatch.current!.hospital!.lat,
                      dispatch.current!.ambulance?.currentLng ?? dispatch.current!.hospital!.lng,
                      'Driver location',
                    )
                  }
                >
                  <View style={styles.infoCardHeader}>
                    <Text style={styles.infoCardTitle}>👨‍⚕️ DRIVER</Text>
                    <Text style={styles.rating}>★ {dispatch.current!.driver!.rating?.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.infoName}>{dispatch.current!.driver!.name}</Text>
                  <Text style={styles.infoMeta}>License: {dispatch.current!.driver!.licenseNumber}</Text>
                  {dispatch.current!.ambulance && (
                    <View style={styles.vehicleRow}>
                      <Text style={styles.vehicleIcon}>🚑</Text>
                      <Text style={styles.vehicleText}>
                        {dispatch.current!.ambulance.vehicleNumber} • {dispatch.current!.ambulance.type}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.mapHint}>Tap to view driver location on map</Text>
                </TouchableOpacity>
              )}

              {/* Hospital card */}
              {dispatch.current?.hospital && (
                <TouchableOpacity
                  style={[styles.infoCard, styles.hospitalCard]}
                  onPress={() =>
                    openMaps(
                      dispatch.current!.hospital!.lat,
                      dispatch.current!.hospital!.lng,
                      'Hospital',
                    )
                  }
                >
                  <View style={styles.infoCardHeader}>
                    <Text style={styles.infoCardTitle}>🏥 HOSPITAL</Text>
                  </View>
                  <Text style={styles.infoName}>{dispatch.current!.hospital!.name}</Text>
                  <Text style={styles.infoMeta}>{dispatch.current!.hospital!.address}</Text>
                  <Text style={styles.infoMeta}>📞 {dispatch.current!.hospital!.phone}</Text>
                  <Text style={styles.mapHint}>Tap to open hospital in Maps</Text>
                </TouchableOpacity>
              )}

              {/* Pickup location link */}
              <View style={styles.pinCard}>
                <Text style={styles.pinLabel}>📍 YOUR LOCATION</Text>
                <Text style={styles.pinUrl}>
                  Live location shared with emergency contacts via SMS
                </Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const CIRCLE_SIZE = 200;
const RING_SIZE = 240;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Spacing.three, paddingHorizontal: Spacing.three },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: AppColors.backgroundElement,
    borderRadius: 16,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pin: { fontSize: 14 },
  locationText: { color: AppColors.textSecondary, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: 'rgba(229, 72, 77, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: AppColors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  warningIcon: { fontSize: 30 },
  sosText: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  hint: { color: AppColors.textSecondary, marginTop: Spacing.three, fontSize: 13 },

  // Dispatch card
  dispatchCard: {
    width: '100%',
    marginTop: Spacing.four,
    backgroundColor: AppColors.backgroundElement,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dispatchTitle: {
    color: AppColors.success,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  etaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  etaBadge: {
    backgroundColor: AppColors.success + '22',
    borderRadius: 12,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.success + '44',
  },
  etaBadgeSecondary: {
    backgroundColor: AppColors.backgroundSelected,
    borderRadius: 12,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  etaLabel: {
    color: AppColors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  etaValue: {
    color: AppColors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // Info cards (driver / hospital)
  infoCard: {
    backgroundColor: AppColors.background,
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  hospitalCard: {
    borderColor: AppColors.success + '44',
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  infoCardTitle: {
    color: AppColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rating: {
    color: AppColors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  infoName: {
    color: AppColors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.half,
  },
  infoMeta: {
    color: AppColors.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.half,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  vehicleIcon: { fontSize: 14 },
  vehicleText: {
    color: AppColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  mapHint: {
    color: AppColors.success,
    fontSize: 11,
    fontWeight: '600',
    marginTop: Spacing.half,
    opacity: 0.85,
  },

  // Pin card
  pinCard: {
    backgroundColor: AppColors.emergency + '15',
    borderRadius: 12,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: AppColors.emergency + '33',
    alignItems: 'center',
  },
  pinLabel: {
    color: AppColors.emergency,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.half,
  },
  pinUrl: {
    color: AppColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
