import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Replace with your backend URL or import from config
const BACKEND_URL = 'http://10.0.2.2:5000';

type Hospital = {
  id: string;
  name: string;
  address?: string;
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

  const fetchHospitals = useCallback(async () => {
    setError(null);
    try {
      if (!refreshing) setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/hospitals`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('fetchHospitals error:', err);
      setError('Could not load hospital data. Pull to retry.');
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

  const triggerSOS = async () => {
    Alert.alert(
      'Trigger SOS',
      'Are you sure you want to alert your emergency contacts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: replace userId and capture real GPS using expo-location in your app.
              const payload = { userId: 'REPLACE_WITH_REAL_USER_ID', lat: 26.9, lng: 75.8 };
              const res = await fetch(`${BACKEND_URL}/api/sos/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              const json = await res.json();
              if (!res.ok) {
                Alert.alert('Error', json?.message ?? 'Failed to send SOS');
                return;
              }
              Alert.alert('SOS Sent', `Contacts notified: ${json.contactsNotified ?? 0}`);
            } catch (err) {
              console.error('SOS network error', err);
              Alert.alert('Network error', 'Could not reach server. Check connection.');
            }
          },
        },
      ],
    );
  };

  const renderHospital = ({ item }: { item: Hospital }) => {
    const availGeneral = item.generalBeds ?? 0;
    const availIcu = item.icuBeds ?? 0;
    const generalColor = availGeneral > 5 ? '#2ecc71' : availGeneral > 0 ? '#f39c12' : '#e74c3c';
    const icuColor = availIcu > 2 ? '#2ecc71' : availIcu > 0 ? '#f39c12' : '#e74c3c';

    return (
      <Pressable
        style={styles.hospitalCard}
        onPress={() => router.push(`./beds?id=${item.id}`)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.hospitalName}>{item.name}</Text>
          {item.address ? <Text style={styles.hospitalAddress}>{item.address}</Text> : null}
          <View style={styles.bedsRow}>
            <View style={styles.bedPill}>
              <View style={[styles.dot, { backgroundColor: generalColor }]} />
              <Text style={styles.bedText}>General: {availGeneral}</Text>
            </View>
            <View style={styles.bedPill}>
              <View style={[styles.dot, { backgroundColor: icuColor }]} />
              <Text style={styles.bedText}>ICU: {availIcu}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#999" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>LifeLink</Text>
        <Pressable style={styles.profileButton} onPress={() => router.push('/profile')}>
          <Ionicons name="person-circle-outline" size={28} color="#333" />
        </Pressable>
      </View>

      <View style={[styles.sosContainer, { width: windowW - 32 }]}>
        <Text style={styles.sosTitle}>Emergency</Text>
        <Text style={styles.sosSubtitle}>One tap to alert your emergency contacts</Text>

        <Pressable style={styles.sosButton} onPress={triggerSOS}>
          <Ionicons name="warning" size={28} color="#fff" />
          <Text style={styles.sosButtonText}>Send SOS</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby Hospitals</Text>
        <Text style={styles.sectionSub}>Live bed availability</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2e86de" />
          <Text style={{ marginTop: 8 }}>Loading hospitals…</Text>
        </View>
      ) : error ? (
        <Pressable style={styles.empty} onPress={onRefresh}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.tapToRetry}>Tap to retry</Text>
        </Pressable>
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(i) => i.id}
          renderItem={renderHospital}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hospital data available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  profileButton: { padding: 6, borderRadius: 20 },

  sosContainer: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  sosTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  sosSubtitle: { color: '#555', marginTop: 4, marginBottom: 12 },

  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
  },
  sosButtonText: { color: '#fff', fontWeight: '700', marginLeft: 8, fontSize: 16 },

  sectionHeader: { marginTop: 18, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  sectionSub: { color: '#6b6b6b', fontSize: 12 },

  loader: { marginTop: 36, alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 36, paddingHorizontal: 20 },
  emptyText: { color: '#666' },
  errorText: { color: '#c0392b', fontWeight: '600', textAlign: 'center' },
  tapToRetry: { color: '#666', marginTop: 6 },

  hospitalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  hospitalName: { fontWeight: '700', fontSize: 15, color: '#111' },
  hospitalAddress: { color: '#777', fontSize: 12, marginTop: 4 },

  bedsRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  bedPill: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 10, marginRight: 8 },
  bedText: { color: '#333', fontSize: 13 },
});