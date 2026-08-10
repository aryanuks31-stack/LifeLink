import { useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { ScreenHeader } from '@/components/screen-header';
import { AppColors, Radius, Spacing } from '@/constants/theme';

const BACKEND_URL = 'http://10.0.2.2:5000'; // ⚠️ replace with YOUR IP
const DEMO_USER_ID = 'cbab8131-96e5-4ea4-a580-c8db339ffc5f';
const HOLD_DURATION = 1500;

export default function SOSScreen() {
  const [loading, setLoading] = useState(false);
  const [holding, setHolding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; text: string } | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSOS = async () => {
    setLoading(true);
    setResult(null);

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

      if (response.ok) {
        setResult({ success: true, text: `Alert sent to ${data.contactsNotified} emergency contact(s)` });
      } else {
        setResult({ success: false, text: data.message || 'Something went wrong' });
      }
    } catch (e) {
      console.error(e);
      setResult({ success: false, text: 'Could not reach the server' });
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

  return (
    <View style={[styles.container, { backgroundColor: AppColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Emergency" />

        <View style={styles.locationBanner}>
          <Text style={styles.pin}>📍</Text>
          <Text style={styles.locationText}>Location shared automatically on trigger</Text>
        </View>

        <View style={styles.center}>
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

          {result && (
            <View style={[styles.resultBanner, { borderColor: result.success ? AppColors.success : AppColors.emergency }]}>
              <Text style={[styles.resultText, { color: result.success ? AppColors.success : AppColors.emergency }]}>
                {result.success ? '✅ ' : '❌ '}{result.text}
              </Text>
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
    borderRadius: Radius.medium,
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
  resultBanner: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    maxWidth: 300,
  },
  resultText: { fontSize: 13, textAlign: 'center' },
});