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
import * as Location from 'expo-location';

import { BACKEND_URL } from '../constants/api';

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

      if (!refreshing) {
        setLoading(true);
      }

      console.log('================================');
      console.log('Fetching hospitals...');
      console.log('URL:', url);
      console.log('================================');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      console.log('Hospital API status:', response.status);

      const responseText = await response.text();

      console.log('Hospital API response:', responseText);

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      let data: unknown;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          'Server returned invalid JSON'
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          'Hospital API did not return an array'
        );
      }

      console.log(
        `Successfully loaded ${data.length} hospitals`
      );

      setHospitals(data as Hospital[]);
    } catch (err) {
      console.error(
        'fetchHospitals error:',
        err
      );

      setHospitals([]);

      setError(
        'Could not load hospital data. Tap to retry.'
      );
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
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Location access is required to send SOS.'
        );
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      const { latitude, longitude } =
        location.coords;

      const payload = {
        userId: DEMO_USER_ID,
        lat: latitude,
        lng: longitude,
      };

      const url =
        `${BACKEND_URL}/api/sos/trigger`;

      console.log('Sending SOS:', url);
      console.log('SOS payload:', payload);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        console.error(
          'Invalid SOS response:',
          responseText
        );
      }

      if (!response.ok) {
        Alert.alert(
          'Error',
          data?.message ||
            `Server returned ${response.status}`
        );
        return;
      }

      Alert.alert(
        'SOS Sent',
        `Contacts notified: ${
          data.contactsNotified ?? 0
        }`
      );
    } catch (error) {
      console.error(
        'SOS network error:',
        error
      );

      Alert.alert(
        'Network error',
        'Could not reach server. Check your internet connection.'
      );
    }
  };

  // --------------------------------------------------
  // SOS CONFIRMATION
  // --------------------------------------------------

  const triggerSOS = () => {
    Alert.alert(
      'Trigger SOS',
      'Are you sure you want to alert your emergency contacts?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          style: 'destructive',
          onPress: sendSOS,
        },
      ]
    );
  };

  // --------------------------------------------------
  // HOSPITAL CARD
  // --------------------------------------------------

  const renderHospital = ({
    item,
  }: {
    item: Hospital;
  }) => {
    const availableBeds =
      item.availableBeds ?? 0;

    const icuAvailable =
      item.icuAvailable ?? 0;

    const generalColor =
      availableBeds > 5
        ? '#2ecc71'
        : availableBeds > 0
        ? '#f39c12'
        : '#e74c3c';

    const icuColor =
      icuAvailable > 2
        ? '#2ecc71'
        : icuAvailable > 0
        ? '#f39c12'
        : '#e74c3c';

    return (
      <Pressable
        style={styles.hospitalCard}
        onPress={() =>
          router.push(
            `./beds?id=${item.id}`
          )
        }
      >
        <View style={styles.hospitalInfo}>
          <View style={styles.nameRow}>
            <Text
              style={styles.hospitalName}
              numberOfLines={1}
            >
              {item.name}
            </Text>

            {item.isTraumaCenter && (
              <View style={styles.traumaBadge}>
                <Text style={styles.traumaText}>
                  TRAUMA
                </Text>
              </View>
            )}
          </View>

          {item.address ? (
            <Text
              style={styles.hospitalAddress}
              numberOfLines={2}
            >
              {item.address}
            </Text>
          ) : null}

          <View style={styles.bedsRow}>
            <View style={styles.bedPill}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      generalColor,
                  },
                ]}
              />

              <Text style={styles.bedText}>
                Beds: {availableBeds}
              </Text>
            </View>

            <View style={styles.bedPill}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      icuColor,
                  },
                ]}
              />

              <Text style={styles.bedText}>
                ICU: {icuAvailable}
              </Text>
            </View>

            {item.rating !== undefined && (
              <View style={styles.rating}>
                <Ionicons
                  name="star"
                  size={13}
                  color="#f1c40f"
                />

                <Text style={styles.ratingText}>
                  {item.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#999"
        />
      </Pressable>
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}

      <View style={styles.headerRow}>
        <Text style={styles.title}>
          LifeLink
        </Text>
      </View>

      {/* SOS */}

      <View
        style={[
          styles.sosContainer,
          {
            width: windowW - 32,
          },
        ]}
      >
        <Text style={styles.sosTitle}>
          Emergency
        </Text>

        <Text style={styles.sosSubtitle}>
          One tap to alert your emergency contacts
        </Text>

        <Pressable
          style={styles.sosButton}
          onPress={triggerSOS}
        >
          <Ionicons
            name="warning"
            size={28}
            color="#fff"
          />

          <Text style={styles.sosButtonText}>
            Send SOS
          </Text>
        </Pressable>
      </View>

      {/* HOSPITAL HEADER */}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Nearby Hospitals
        </Text>

        <Text style={styles.sectionSub}>
          Live bed availability
        </Text>
      </View>

      {/* LOADING */}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color="#2e86de"
          />

          <Text style={styles.loadingText}>
            Loading hospitals…
          </Text>
        </View>
      ) : error ? (
        <Pressable
          style={styles.empty}
          onPress={onRefresh}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={42}
            color="#c0392b"
          />

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Text style={styles.tapToRetry}>
            Tap to retry
          </Text>
        </Pressable>
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(item) => item.id}
          renderItem={renderHospital}
          contentContainerStyle={{
            paddingBottom: 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="business-outline"
                size={42}
                color="#999"
              />

              <Text style={styles.emptyText}>
                No hospital data available
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },

  sosContainer: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 6,
  },

  sosTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  sosSubtitle: {
    color: '#555',
    marginTop: 4,
    marginBottom: 12,
  },

  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
  },

  sosButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  sectionHeader: {
    marginTop: 18,
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  sectionSub: {
    color: '#6b6b6b',
    fontSize: 12,
  },

  loader: {
    marginTop: 36,
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 8,
    color: '#555',
  },

  empty: {
    alignItems: 'center',
    marginTop: 36,
    paddingHorizontal: 20,
  },

  emptyText: {
    color: '#666',
    marginTop: 10,
  },

  errorText: {
    color: '#c0392b',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    textAlignVertical: 'center',
  },

  tapToRetry: {
    color: '#666',
    marginTop: 8,
  },

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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowRadius: 4,
  },

  hospitalInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  hospitalName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111',
    flexShrink: 1,
  },

  hospitalAddress: {
    color: '#777',
    fontSize: 12,
    marginTop: 4,
  },

  bedsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },

  bedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    marginRight: 6,
  },

  bedText: {
    color: '#333',
    fontSize: 13,
  },

  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },

  ratingText: {
    marginLeft: 3,
    fontSize: 12,
    color: '#555',
  },

  traumaBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#fdecea',
  },

  traumaText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#c0392b',
  },
});