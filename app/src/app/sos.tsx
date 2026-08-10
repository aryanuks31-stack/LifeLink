import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  Pressable,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

// Replace with your backend or config import
const BACKEND_URL = 'http://10.0.2.2:5000';
const HOLD_MS = 2000;
const DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f'; // real seeded user for demo

export default function SOSScreen() {
  const router = useRouter();
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const progressRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const ringAnim = useRef(new Animated.Value(0)).current;
  const windowW = Dimensions.get('window').width;

  // Mocked auxiliary info (replace with real state from API)
  const [driverEta] = useState('2 min away');
  const [nearestHospital] = useState('1.4 km, trauma');
  const [liveBeds] = useState(6);

  useEffect(() => {
    Animated.timing(ringAnim, {
      toValue: holding ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [holding, ringAnim]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startHold = () => {
    setHolding(true);
    progressRef.current = 0;
    setProgress(0);

    const start = Date.now();
    intervalRef.current = global.setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / HOLD_MS);
      progressRef.current = p;
      setProgress(p);
    }, 16);

    timerRef.current = global.setTimeout(() => {
      completeHold();
    }, HOLD_MS);
  };

  const cancelHold = () => {
    setHolding(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    progressRef.current = 0;
    setProgress(0);
  };

  const completeHold = async () => {
    cancelHold();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to send SOS.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const payload = { userId: DEMO_USER_ID, lat: latitude, lng: longitude };
      const res = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error('SOS error', json);
        Alert.alert('Error', json?.message ?? 'Failed to send SOS');
        return;
      }
      Alert.alert('SOS sent', `Contacts notified: ${json.contactsNotified ?? 0}`);
      // Optionally navigate to a confirmation screen
    } catch (err) {
      console.error('Network error', err);
      Alert.alert('Network error', 'Could not reach server. Check your connection.');
    }
  };

  // Animated styles
  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.35] });

  // Progress as circle stroke — approximate using scale and overlay
  const outerSize = Math.min(360, windowW - 48);
  const innerSize = outerSize * 0.62;

  // Dark theme colors
  const bg = '#0f1113';
  const cardBg = '#161718';
  const chipBg = '#1f2224';
  const textMuted = '#9aa0a6';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emergency</Text>
          <Pressable onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={26} color="#e6e6e6" />
          </Pressable>
        </View>

        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Ionicons name="location-outline" size={18} color="#cfcfcf" style={{ marginRight: 10 }} />
          <Text style={[styles.chipText, { color: textMuted }]}>Location shared automatically on tap</Text>
        </View>

        <View style={[styles.center, { marginTop: 28 }]}>
          <Animated.View
            style={[
              styles.ring,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: outerSize / 2,
                transform: [{ scale: ringScale }],
                backgroundColor: `rgba(231, 76, 60, ${0.16 + progress * 0.25})`,
                opacity: ringOpacity,
              },
            ]}
            pointerEvents="none"
          />

          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Pressable
              onPressIn={startHold}
              onPressOut={cancelHold}
              android_ripple={{ color: 'rgba(255,255,255,0.06)', radius: innerSize / 2 }}
              style={({ pressed }) => [
                styles.sosButton,
                {
                  width: innerSize,
                  height: innerSize,
                  borderRadius: innerSize / 2,
                  backgroundColor: '#e74c3c',
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={innerSize * 0.18} color="#fff" />
              <Text style={styles.sosText}>SOS</Text>
            </Pressable>

            <View style={{ marginTop: 16 }}>
              <Text style={styles.holdHint}>Hold for 2 seconds to trigger</Text>
            </View>

            {/* progress indicator ring (small arc approximation) */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
            <Ionicons name="car-outline" size={20} color="#5da9ff" />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.infoTitle, { color: '#cfd6d9' }]}>Driver status</Text>
              <Text style={styles.infoValue}>{driverEta}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
            <Ionicons name="medkit-outline" size={20} color="#7fd6a3" />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.infoTitle, { color: '#cfd6d9' }]}>Nearest hospital</Text>
              <Text style={styles.infoValue}>{nearestHospital}</Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={[styles.bottomPill, { backgroundColor: cardBg }]}
          onPress={() => router.push('/beds')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="bed-outline" size={18} color="#6ee7b7" />
            <Text style={[styles.pillText, { marginLeft: 12, color: '#cfeee0' }]}>Live bed count</Text>
          </View>

          <View style={styles.pillRight}>
            <Ionicons name="chevron-down" size={18} color="#999" />
            <Text style={[styles.bedsAvailable, { color: '#6ee7b7' }]}>{liveBeds} available</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 18 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  chip: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: { fontSize: 14 },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sosButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  sosText: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 8 },

  holdHint: { color: '#a6a6a6', textAlign: 'center', fontSize: 13 },

  progressTrack: {
    marginTop: 10,
    width: 220,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#222425',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff8b80',
  },

  infoRow: {
    flexDirection: 'row',
    marginTop: 26,
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  infoTitle: { fontSize: 13 },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 6 },

  bottomPill: {
    height: 62,
    borderRadius: 12,
    marginBottom: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillText: { fontSize: 15, fontWeight: '600' },
  pillRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bedsAvailable: { fontWeight: '800', marginLeft: 8 },
});